"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ChevronUp, Columns3, Diff as DiffIcon,
  Eye, EyeOff, Filter, Group as GroupIcon, Maximize2, Search, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ColumnsSheet, MultiSortControl, type ManagedColumn, type SortLevel } from "@/components/table-kit"
import { SHEET_TABS, normalizedGrid, diffGrid, type DiffCell, type SheetGridTab } from "@/lib/sheet-preview-mock"

/* ────────────────────────────────────────────────────────────────────────────
   Sheet Preview — the core grid used across the ingestion wizard steps.
   Excel-like frozen indexes, find (Ctrl+F-style), per-column filter & sort,
   multi-level sort, group-by, diff (input → output), column manage/reorder/
   freeze, optional row selection with shift-ranges, Input/Output, fullscreen.
   ──────────────────────────────────────────────────────────────────────────── */

const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"

/** Spreadsheet column letter for a 0-based index (A, B, …, Z, AA…). */
function colLetter(i: number) {
  let s = ""
  let n = i
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

const displayVal = (v: string | number | null) => (v === null || v === "" ? "" : String(v))

/** Numeric-aware compare — "4,800,000" sorts as a number, text falls back to locale compare. */
function cmpVals(a: string | number | null, b: string | number | null) {
  const na = Number(String(a ?? "").replace(/,/g, ""))
  const nb = Number(String(b ?? "").replace(/,/g, ""))
  const aNum = a !== null && a !== "" && !Number.isNaN(na)
  const bNum = b !== null && b !== "" && !Number.isNaN(nb)
  if (aNum && bNum) return na - nb
  if (aNum) return -1
  if (bNum) return 1
  return displayVal(a).localeCompare(displayVal(b))
}

interface DataRow {
  /** Original spreadsheet row number — kept as-is through filter/sort/group */
  srcRow: number
  lead: DiffCell[]
  cells: DiffCell[]
  removed: boolean
}

interface TabState {
  order?: string[]
  hidden: string[]
  frozen: string[]
  filters: Record<string, string[]>
  sorts: SortLevel[]
  groupBy: string | null
  collapsed: string[]
}
const EMPTY_TS: TabState = { hidden: [], frozen: [], filters: {}, sorts: [], groupBy: null, collapsed: [] }

const asCells = (row: (string | number | null)[] | DiffCell[]): DiffCell[] =>
  row.map((c) => (c !== null && typeof c === "object" ? (c as DiffCell) : { v: c as string | number | null }))

export function SheetPreviewCard({
  tabs = SHEET_TABS,
  showTabs = true,
  title = "Sheet preview",
  selectable = false,
}: {
  tabs?: SheetGridTab[]
  /** Steps after preparation work on a single consolidated sheet — no tab strip. */
  showTabs?: boolean
  title?: string
  /** Row checkboxes with shift-range selection — off on steps without bulk actions. */
  selectable?: boolean
}) {
  const [mode, setMode] = useState<"input" | "output">("input")
  const [diff, setDiff] = useState(false)
  const [ignored, setIgnored] = useState<Set<string>>(() => new Set(tabs.filter((t) => !t.isUnits).map((t) => t.name)))
  const [activeName, setActiveName] = useState(tabs[0]?.name ?? "")
  const [full, setFull] = useState(false)
  const [colsOpen, setColsOpen] = useState(false)
  const [find, setFind] = useState("")
  const [findIdx, setFindIdx] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const anchorRef = useRef<number | null>(null)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({})
  const bodyRef = useRef<HTMLDivElement>(null)
  const fullBodyRef = useRef<HTMLDivElement>(null)
  const dragCol = useRef<string | null>(null)

  const active = tabs.find((t) => t.name === activeName) ?? tabs[0]
  const outputTabs = tabs.filter((t) => !ignored.has(t.name))
  const shownTab = (mode === "output" || diff) && ignored.has(active.name) ? outputTabs[0] ?? active : active
  const unitTotal = outputTabs.reduce((s, t) => s + t.unitRows, 0)

  const ts = tabStates[shownTab.name] ?? EMPTY_TS
  const patchTS = (patch: Partial<TabState>) =>
    setTabStates((prev) => ({ ...prev, [shownTab.name]: { ...(prev[shownTab.name] ?? EMPTY_TS), ...patch } }))

  /* ── Grid model for the shown tab ─────────────────────────────────────── */
  const isRawInput = mode === "input" && !diff
  const leadCols = isRawInput ? shownTab.headerCol : 0
  const headerRowIdx = isRawInput ? shownTab.headerRow : 0
  const raw: (DiffCell[] | (string | number | null)[])[] = diff
    ? diffGrid(shownTab)
    : isRawInput ? shownTab.grid : normalizedGrid(shownTab)

  const junkRows = useMemo(() => raw.slice(0, headerRowIdx).map(asCells), [raw, headerRowIdx])
  const headerCells = useMemo(() => asCells(raw[headerRowIdx] ?? []).slice(leadCols), [raw, headerRowIdx, leadCols])
  const cols: ManagedColumn[] = useMemo(
    () => headerCells.map((h, j) => ({ id: String(j), label: displayVal(h.v) || colLetter(leadCols + j) })),
    [headerCells, leadCols],
  )
  const order = ts.order ?? cols.map((c) => c.id)
  const hidden = new Set(ts.hidden)
  const frozen = new Set(ts.frozen)
  const visCols = order.filter((id) => !hidden.has(id) && cols.some((c) => c.id === id))
  const labelOf = (id: string) => cols.find((c) => c.id === id)?.label ?? id

  const dataRows: DataRow[] = useMemo(
    () => raw.slice(headerRowIdx + 1).map((r, i) => {
      const cells = asCells(r)
      return {
        srcRow: headerRowIdx + 2 + i,
        lead: cells.slice(0, leadCols),
        cells: cells.slice(leadCols),
        removed: cells.some((c) => c.status === "removed"),
      }
    }),
    [raw, headerRowIdx, leadCols],
  )

  /* filter → sort → group, always keeping srcRow */
  const visibleRows = useMemo(() => {
    let rows = dataRows
    for (const [colId, allowed] of Object.entries(ts.filters)) {
      if (!allowed.length) continue
      const set = new Set(allowed)
      rows = rows.filter((r) => set.has(displayVal(r.cells[Number(colId)]?.v ?? null) || "(blank)"))
    }
    if (ts.sorts.length) {
      rows = [...rows].sort((a, b) => {
        for (const s of ts.sorts) {
          const d = cmpVals(a.cells[Number(s.key)]?.v ?? null, b.cells[Number(s.key)]?.v ?? null)
          if (d !== 0) return s.dir === "asc" ? d : -d
        }
        return 0
      })
    }
    return rows
  }, [dataRows, ts.filters, ts.sorts])

  const groups = useMemo(() => {
    if (!ts.groupBy) return null
    const map = new Map<string, DataRow[]>()
    for (const r of visibleRows) {
      const k = displayVal(r.cells[Number(ts.groupBy)]?.v ?? null) || "(blank)"
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()]
  }, [visibleRows, ts.groupBy])

  const collapsed = new Set(ts.collapsed)
  const flatRows = useMemo(
    () => (groups ? groups.flatMap(([k, rows]) => (collapsed.has(k) ? [] : rows)) : visibleRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, visibleRows, ts.collapsed],
  )

  /* ── Find (Ctrl+F-like) over everything currently rendered ────────────── */
  const needle = find.trim().toLowerCase()
  const findMatches = useMemo(() => {
    if (!needle) return []
    const out: string[] = []
    junkRows.forEach((r, i) => r.forEach((c, ci) => {
      if (displayVal(c.v).toLowerCase().includes(needle)) out.push(`j${i}:${ci}`)
    }))
    headerCells.forEach((c, ci) => {
      if (displayVal(c.v).toLowerCase().includes(needle)) out.push(`h:${ci}`)
    })
    flatRows.forEach((r) => {
      r.lead.forEach((c, ci) => { if (displayVal(c.v).toLowerCase().includes(needle)) out.push(`d${r.srcRow}:l${ci}`) })
      visCols.forEach((id) => {
        const c = r.cells[Number(id)]
        if (c && displayVal(c.v).toLowerCase().includes(needle)) out.push(`d${r.srcRow}:${id}`)
      })
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, junkRows, headerCells, flatRows, order.join(","), ts.hidden.join(",")])
  const matchSet = useMemo(() => new Map(findMatches.map((k, i) => [k, i])), [findMatches])
  const curFind = findMatches.length ? ((findIdx % findMatches.length) + findMatches.length) % findMatches.length : 0

  useEffect(() => { setFindIdx(0) }, [needle, activeName, mode, diff])
  useEffect(() => {
    if (!findMatches.length) return
    const root = (full ? fullBodyRef : bodyRef).current
    root?.querySelector(`[data-fm="${curFind}"]`)?.scrollIntoView({ block: "center", inline: "center" })
  }, [curFind, findMatches.length, full])

  /* ── Selection (shift for ranges) ─────────────────────────────────────── */
  const keyOf = (r: DataRow) => `${shownTab.name}:${r.srcRow}`
  const clickRow = (r: DataRow, i: number, shift: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (shift && anchorRef.current !== null) {
        const [a, b] = [Math.min(anchorRef.current, i), Math.max(anchorRef.current, i)]
        const on = !n.has(keyOf(r))
        for (let k = a; k <= b; k++) { const rk = keyOf(flatRows[k]); on ? n.add(rk) : n.delete(rk) }
      } else {
        n.has(keyOf(r)) ? n.delete(keyOf(r)) : n.add(keyOf(r))
        anchorRef.current = i
      }
      return n
    })
  }
  const tabSelectedCount = flatRows.filter((r) => selected.has(keyOf(r))).length
  const allSelected = flatRows.length > 0 && tabSelectedCount === flatRows.length

  /* ── Column helpers ───────────────────────────────────────────────────── */
  const cycleSort = (id: string) => {
    const cur = ts.sorts.length === 1 && ts.sorts[0].key === id ? ts.sorts[0] : null
    patchTS({ sorts: !cur ? [{ key: id, dir: "asc" }] : cur.dir === "asc" ? [{ key: id, dir: "desc" }] : [] })
  }
  const distinctVals = (id: string) => {
    const set = new Set<string>()
    for (const r of dataRows) set.add(displayVal(r.cells[Number(id)]?.v ?? null) || "(blank)")
    return [...set].sort((a, b) => a.localeCompare(b))
  }
  const reorderCols = (from: string, to: string) => {
    if (from === to) return
    const next = order.filter((id) => id !== from)
    next.splice(next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0), 0, from)
    patchTS({ order: next })
  }

  const SEL_W = 36
  const IDX_W = 48
  const COL_W = 132
  const frozenLeft = (id: string) => {
    let left = IDX_W + (selectable ? SEL_W : 0)
    for (const cid of visCols) {
      if (cid === id) break
      if (frozen.has(cid)) left += COL_W
    }
    return left
  }

  const diffCounts = useMemo(() => {
    if (!diff) return null
    let added = 0, changed = 0, removed = 0
    dataRows.forEach((r) => {
      if (r.removed) { removed++; return }
      if (r.cells.some((c) => c.status === "added")) { added++; return }
      changed += r.cells.filter((c) => c.status === "changed").length
    })
    return { added, changed, removed }
  }, [diff, dataRows])

  /* ── Cell renderers ───────────────────────────────────────────────────── */
  const zebra = (i: number) => (i % 2 ? "bg-secondary" : "bg-card")
  const diffTone = (c?: DiffCell, rowRemoved?: boolean) =>
    rowRemoved ? "bg-red-50 text-red-700 line-through decoration-red-300" :
    c?.status === "added" ? "bg-emerald-50 text-emerald-800" :
    c?.status === "changed" ? "bg-amber-50" : ""

  const cellContent = (c: DiffCell | undefined, fmKey: string) => {
    const idx = matchSet.get(fmKey)
    const val = displayVal(c?.v ?? null)
    const body = c?.status === "changed" ? (
      <span className="inline-flex items-center gap-1">
        <span className="text-muted-foreground line-through decoration-amber-400">{displayVal(c.from ?? null)}</span>
        <span className="text-muted-foreground">→</span>
        <b className="font-semibold text-foreground">{val}</b>
      </span>
    ) : val === "" ? <span className="text-muted-foreground/30">·</span> : val
    if (idx === undefined) return body
    return (
      <span data-fm={idx} className={cn("rounded-sm px-0.5 -mx-0.5", idx === curFind ? "bg-amber-300 ring-1 ring-amber-500" : "bg-yellow-100")}>
        {body}
      </span>
    )
  }

  /* ── Grid ─────────────────────────────────────────────────────────────── */
  const grid = (inFull: boolean) => {
    const stickyLabels = junkRows.length === 0
    let renderIdx = -1
    const dataRowTr = (r: DataRow) => {
      renderIdx += 1
      const i = renderIdx
      const zb = zebra(i)
      return (
        <tr key={r.srcRow} className="group">
          {/* Frozen row number */}
          <td className={cn("sticky left-0 z-20 w-12 border-b border-r border-border bg-muted px-2 py-1 text-center text-[10px] text-muted-foreground")}>{r.srcRow}</td>
          {selectable && (
            <td className={cn("sticky z-20 w-9 border-b border-r border-border px-2 py-1 text-center", zb)} style={{ left: IDX_W }}>
              <Checkbox
                className="h-3.5 w-3.5 align-middle"
                checked={selected.has(keyOf(r))}
                onClick={(e) => clickRow(r, i, (e as React.MouseEvent).shiftKey)}
              />
            </td>
          )}
          {r.lead.map((c, ci) => (
            <td key={`l${ci}`} className={cn("whitespace-nowrap border-b border-r border-border px-3 py-1 text-[13px] tabular-nums group-hover:bg-muted", zb, diffTone(c, r.removed))}>
              {cellContent(c, `d${r.srcRow}:l${ci}`)}
            </td>
          ))}
          {visCols.map((id) => {
            const c = r.cells[Number(id)]
            return (
              <td
                key={id}
                className={cn(
                  "whitespace-nowrap border-b border-r border-border px-3 py-1 text-[13px] tabular-nums group-hover:bg-muted",
                  frozen.has(id) ? cn("sticky z-10", zb) : zb,
                  frozen.has(id) && "min-w-[132px] max-w-[132px] truncate",
                  diffTone(c, r.removed),
                )}
                style={frozen.has(id) ? { left: frozenLeft(id) } : undefined}
              >
                {cellContent(c, `d${r.srcRow}:${id}`)}
              </td>
            )
          })}
        </tr>
      )
    }

    const totalCols = 1 + (selectable ? 1 : 0) + leadCols + visCols.length
    return (
      <div ref={inFull ? fullBodyRef : bodyRef} className={cn("relative overflow-auto overscroll-contain", inFull ? "max-h-[calc(92vh-170px)]" : "max-h-[460px]")}>
        <table className="w-max border-separate border-spacing-0 text-[13px]">
          <thead>
            {/* Column letters — frozen top; drag to reorder; managed cols only */}
            <tr>
              <th className="sticky left-0 top-0 z-40 h-7 w-12 border-b border-r border-border bg-muted" />
              {selectable && (
                <th className="sticky top-0 z-30 h-7 w-9 border-b border-r border-border bg-muted" style={{ left: IDX_W }}>
                  <Checkbox
                    className="h-3.5 w-3.5 align-middle"
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected((prev) => {
                      const n = new Set(prev)
                      flatRows.forEach((r) => (v ? n.add(keyOf(r)) : n.delete(keyOf(r))))
                      return n
                    })}
                  />
                </th>
              )}
              {Array.from({ length: leadCols }, (_, c) => (
                <th key={`l${c}`} className="sticky top-0 z-30 h-7 min-w-[110px] border-b border-r border-border bg-muted px-3 text-center text-[10px] font-normal text-muted-foreground">{colLetter(c)}</th>
              ))}
              {visCols.map((id, pos) => (
                <th
                  key={id}
                  draggable
                  onDragStart={() => { dragCol.current = id }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragCol.current) reorderCols(dragCol.current, id); dragCol.current = null }}
                  title="Drag to reorder"
                  className={cn(
                    "sticky top-0 h-7 min-w-[132px] cursor-grab border-b border-r border-border bg-muted px-3 text-center text-[10px] font-normal text-muted-foreground active:cursor-grabbing",
                    frozen.has(id) ? "z-40" : "z-30",
                  )}
                  style={frozen.has(id) ? { left: frozenLeft(id) } : undefined}
                >
                  {colLetter(leadCols + pos)}
                </th>
              ))}
            </tr>
            {/* Header labels — filter + sort per column */}
            <tr>
              <th className={cn("left-0 z-40 w-12 border-b border-r border-border bg-muted px-2 py-1", stickyLabels && "sticky top-7", "sticky")} style={stickyLabels ? undefined : { position: "sticky", left: 0 }} />
              {selectable && <th className={cn("z-30 w-9 border-b border-r border-border bg-muted", stickyLabels && "sticky top-7")} style={{ position: "sticky", left: IDX_W }} />}
              {Array.from({ length: leadCols }, (_, c) => (
                <th key={`l${c}`} className={cn("border-b border-r border-border bg-muted px-3 py-1 text-left text-xs font-semibold text-foreground", stickyLabels && "sticky top-7 z-20")}>
                  {displayVal(asCells(raw[headerRowIdx] ?? [])[c]?.v ?? null)}
                </th>
              ))}
              {visCols.map((id) => {
                const s = ts.sorts.find((x) => x.key === id)
                const activeFilter = (ts.filters[id] ?? []).length > 0
                return (
                  <th
                    key={id}
                    className={cn(
                      "whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1 text-left text-xs font-semibold text-foreground",
                      stickyLabels && "sticky top-7", frozen.has(id) ? "z-40" : stickyLabels ? "z-20" : undefined,
                    )}
                    style={frozen.has(id) ? { left: frozenLeft(id), position: "sticky" } : undefined}
                  >
                    <span className="flex items-center gap-1">
                      <button onClick={() => cycleSort(id)} className="inline-flex items-center gap-1 hover:text-primary">
                        {labelOf(id)}
                        {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button title={`Filter ${labelOf(id)}`} className={cn("rounded p-0.5 hover:bg-secondary", activeFilter ? "text-primary" : "text-muted-foreground/50")}>
                            <Filter className={cn("h-3 w-3", activeFilter && "fill-primary/20")} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56 p-2">
                          <ColFilter
                            values={distinctVals(id)}
                            selected={ts.filters[id] ?? []}
                            onChange={(vals) => patchTS({ filters: { ...ts.filters, [id]: vals } })}
                          />
                        </PopoverContent>
                      </Popover>
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Raw junk rows above the header (input mode) — pinned out of table operations */}
            {junkRows.map((r, i) => (
              <tr key={`j${i}`}>
                <td className="sticky left-0 z-20 w-12 border-b border-r border-border bg-muted px-2 py-1 text-center text-[10px] text-muted-foreground">{i + 1}</td>
                {selectable && <td className="sticky z-20 w-9 border-b border-r border-border bg-card" style={{ left: IDX_W }} />}
                {Array.from({ length: leadCols + visCols.length }, (_, c) => (
                  <td key={c} className="whitespace-nowrap border-b border-r border-border bg-card px-3 py-1 text-[13px] italic text-muted-foreground">
                    {cellContent(r[c], `j${i}:${c}`)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Data rows — grouped or flat */}
            {groups ? (
              groups.map(([k, rows]) => (
                <Fragment key={k}>
                  <tr
                    className="cursor-pointer bg-secondary transition-colors hover:bg-muted"
                    onClick={() => patchTS({ collapsed: collapsed.has(k) ? ts.collapsed.filter((x) => x !== k) : [...ts.collapsed, k] })}
                  >
                    <td colSpan={totalCols} className="border-b border-border p-0">
                      <div className="sticky left-0 flex w-max items-center gap-1.5 px-3 py-1.5">
                        {collapsed.has(k) ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-xs font-semibold text-foreground">{labelOf(ts.groupBy!)}: {k}</span>
                        <span className="text-[11px] text-muted-foreground">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
                      </div>
                    </td>
                  </tr>
                  {!collapsed.has(k) && rows.map(dataRowTr)}
                </Fragment>
              ))
            ) : (
              visibleRows.map(dataRowTr)
            )}
            {visibleRows.length === 0 && (
              <tr><td colSpan={totalCols} className="px-4 py-10 text-center text-sm text-muted-foreground">No rows match the column filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  /* ── Toolbar ──────────────────────────────────────────────────────────── */
  const controls = (inFull: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Find — Ctrl+F-like with match nav */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in sheet…" className="h-8 w-40 pl-7 pr-2 text-sm" />
      </div>
      {needle && (
        <span className="flex items-center gap-0.5">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{findMatches.length ? curFind + 1 : 0}/{findMatches.length}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v - 1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v + 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
        </span>
      )}
      {selectable && tabSelectedCount > 0 && (
        <span className={cn(TAG, "border-primary/40 bg-primary/5 text-primary")}>
          {tabSelectedCount} selected
          <button onClick={() => setSelected(new Set())} className="hover:text-foreground"><X className="h-3 w-3" /></button>
        </span>
      )}

      <MultiSortControl fields={cols.map((c) => ({ key: c.id, label: c.label }))} sorts={ts.sorts} onChange={(s) => patchTS({ sorts: s })} />

      {/* Group by column */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={ts.groupBy ? "default" : "outline"} size="icon" className="h-8 w-8" title={ts.groupBy ? `Grouped by ${labelOf(ts.groupBy)}` : "Group by column"}>
            <GroupIcon className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-sm" onClick={() => patchTS({ groupBy: null, collapsed: [] })}>No grouping</DropdownMenuItem>
          {cols.map((c) => (
            <DropdownMenuItem key={c.id} className="text-sm" onClick={() => {
              const vals = new Set<string>()
              for (const r of visibleRows) vals.add(displayVal(r.cells[Number(c.id)]?.v ?? null) || "(blank)")
              patchTS({ groupBy: c.id, collapsed: [...vals].slice(1) })
            }}>
              {c.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diff input → output */}
      <Button
        variant={diff ? "default" : "outline"} size="icon" className="h-8 w-8" title="Show changes (input → output)"
        onClick={() => { setDiff((d) => !d); if (!diff) setMode("output") }}
      >
        <DiffIcon className="h-3.5 w-3.5" />
      </Button>

      {/* Columns manage */}
      <Button variant="outline" size="icon" className="h-8 w-8" title="Columns" onClick={() => setColsOpen(true)}>
        <Columns3 className="h-3.5 w-3.5" />
      </Button>

      <div className="flex rounded-lg border border-border p-0.5">
        {(["input", "output"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); if (m === "input") setDiff(false) }}
            className={cn("rounded-md px-3 py-1 text-sm font-medium capitalize", mode === m && !(m === "input" && diff) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {m}
          </button>
        ))}
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8" title={inFull ? "Close fullscreen" : "Fullscreen"} onClick={() => setFull(!inFull)}>
        {inFull ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  )

  const body = (inFull: boolean) => (
    <>
      {showTabs && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4">
          {((mode === "output" || diff) ? outputTabs : tabs).map((t) => {
            const off = ignored.has(t.name)
            return (
              <button
                key={t.name}
                onClick={() => setActiveName(t.name)}
                className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
                  shownTab.name === t.name ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                  off && "opacity-45")}
              >
                {t.name}
                <span className="rounded-full border border-border bg-muted px-1.5 text-[11px]">{t.unitRows || t.grid.length}</span>
                <span
                  role="button"
                  title={off ? "Include this tab" : "Ignore this tab"}
                  onClick={(e) => { e.stopPropagation(); setIgnored((prev) => { const n = new Set(prev); n.has(t.name) ? n.delete(t.name) : n.add(t.name); return n }) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {off ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {diff && diffCounts && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Changes vs input:</span>
          <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}>{diffCounts.added} rows added</span>
          <span className={cn(TAG, "border-amber-300 bg-amber-50 text-amber-700")}>{diffCounts.changed} cells changed</span>
          <span className={cn(TAG, "border-red-200 bg-red-50 text-red-600")}>{diffCounts.removed} rows removed</span>
        </div>
      )}
      {grid(inFull)}
    </>
  )

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{unitTotal.toLocaleString("en-US")} Units</span>
          </div>
          {controls(false)}
        </div>
        {body(false)}
      </div>

      <ColumnsSheet
        open={colsOpen}
        onClose={() => setColsOpen(false)}
        columns={cols}
        order={order}
        onOrderChange={(o) => patchTS({ order: o })}
        hidden={hidden}
        onHiddenChange={(h) => patchTS({ hidden: [...h] })}
        frozen={frozen}
        onFrozenChange={(f) => patchTS({ frozen: [...f] })}
      />

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent showCloseButton={false} className="flex h-[92vh] !w-[95vw] !max-w-[1560px] flex-col gap-0 overflow-hidden p-0">
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
              <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{unitTotal.toLocaleString("en-US")} Units</span>
            </div>
            {controls(true)}
          </div>
          {body(true)}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Excel-style value filter for one column — search + check the values to keep. */
function ColFilter({ values, selected, onChange }: { values: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("")
  const list = values.filter((v) => v.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40)
  const set = new Set(selected)
  return (
    <div className="space-y-1.5">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values…" className="h-7 text-xs" autoFocus />
      <div className="max-h-52 space-y-0.5 overflow-y-auto">
        {list.map((v) => (
          <button
            key={v}
            onClick={() => onChange(set.has(v) ? selected.filter((x) => x !== v) : [...selected, v])}
            className={cn("flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-secondary", set.has(v) && "bg-primary/5")}
          >
            <Checkbox className="h-3.5 w-3.5" checked={set.has(v)} />
            <span className="truncate">{v}</span>
          </button>
        ))}
        {list.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">No values</p>}
      </div>
      {selected.length > 0 && (
        <button onClick={() => onChange([])} className="w-full border-t border-border pt-1.5 text-center text-xs text-muted-foreground hover:text-foreground">
          Clear filter
        </button>
      )}
    </div>
  )
}

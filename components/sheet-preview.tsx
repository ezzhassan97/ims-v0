"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ChevronUp,
  Check, Columns3, Eye, EyeOff, Filter, GitCompareArrows, GripVertical, Group as GroupIcon, Maximize2, Search, X,
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
   Sheet Preview — the core grid reused by every ingestion step.

   Input is what the step received, Output what it hands to the next step, and
   Diff shows the cell-level delta between them. Row indexes are spreadsheet
   indexes and stay stable across input → output (removed rows keep their slot).
   ──────────────────────────────────────────────────────────────────────────── */

const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"

function colLetter(i: number) {
  let s = ""
  let n = i
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

const isEmpty = (v: string | number | null | undefined) => v === null || v === undefined || v === ""
const displayVal = (v: string | number | null | undefined) => (isEmpty(v) ? "" : String(v))

/** Numeric-aware compare — "4,800,000" sorts as a number, text falls back to locale compare. */
function cmpVals(a: string | number | null, b: string | number | null) {
  const na = Number(String(a ?? "").replace(/,/g, ""))
  const nb = Number(String(b ?? "").replace(/,/g, ""))
  const aNum = !isEmpty(a) && !Number.isNaN(na)
  const bNum = !isEmpty(b) && !Number.isNaN(nb)
  if (aNum && bNum) return na - nb
  if (aNum) return -1
  if (bNum) return 1
  return displayVal(a).localeCompare(displayVal(b))
}

type ViewKind = "input" | "output" | "diff"

interface PreviewRow {
  /** Spreadsheet row number — preserved through filter, sort, group and input → output */
  idx: number
  cells: DiffCell[]
  removed?: boolean
  added?: boolean
}
interface ViewModel {
  header: DiffCell[] | null
  headerIdx: number
  rows: PreviewRow[]
  colCount: number
  /** Header on the very first row — sort/filter/group need it */
  hasHeader: boolean
}

const asCells = (row: (string | number | null)[] | DiffCell[]): DiffCell[] =>
  row.map((c) => (c !== null && typeof c === "object" ? (c as DiffCell) : { v: c as string | number | null }))

/**
 * One tab, one view. Input keeps the raw sheet (junk rows and all); output and
 * diff are the normalized sheet, numbered so unchanged rows keep their index and
 * removed rows keep their slot (dropped from output, struck through in diff).
 */
function buildView(tab: SheetGridTab, view: ViewKind): ViewModel {
  if (view === "input") {
    const hasHeader = tab.headerRow === 0 && tab.headerCol === 0
    const grid = tab.grid.map(asCells)
    const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0)
    if (hasHeader) {
      return { header: grid[0] ?? [], headerIdx: 1, rows: grid.slice(1).map((cells, i) => ({ idx: i + 2, cells })), colCount, hasHeader }
    }
    return { header: null, headerIdx: 0, rows: grid.map((cells, i) => ({ idx: i + 1, cells })), colCount, hasHeader }
  }

  const d = diffGrid(tab)
  const header = d[0] ?? []
  const rows: PreviewRow[] = []
  d.slice(1).forEach((cells, i) => {
    const removed = cells.some((c) => c.status === "removed")
    const added = cells.some((c) => c.status === "added")
    // idx counts every original slot, so removed rows still consume their number
    rows.push({ idx: i + 2, cells, removed, added })
  })
  const shown = view === "diff" ? rows : rows.filter((r) => !r.removed)
  const colCount = d.reduce((m, r) => Math.max(m, r.length), 0)
  return { header, headerIdx: 1, rows: shown, colCount, hasHeader: true }
}

interface TabState {
  order: Record<string, string[]>
  hidden: Record<string, string[]>
  frozen: string[]
  filters: Record<string, string[]>
  sorts: SortLevel[]
  groupBy: string | null
  collapsed: string[]
}
const EMPTY_TS: TabState = { order: {}, hidden: {}, frozen: [], filters: {}, sorts: [], groupBy: null, collapsed: [] }

/** Rows left after this tab's column filters — drives the per-tab and total counts. */
function countRows(tab: SheetGridTab, view: ViewKind, st: TabState) {
  const vm = buildView(tab, view)
  const total = vm.rows.length
  const entries = Object.entries(st.filters).filter(([, v]) => v.length > 0)
  if (!entries.length) return { total, filtered: total, active: false }
  const filtered = vm.rows.filter((r) =>
    entries.every(([cid, allowed]) => new Set(allowed).has(displayVal(r.cells[Number(cid)]?.v) || "(blank)")),
  ).length
  return { total, filtered, active: true }
}

export function SheetPreviewCard({
  tabs = SHEET_TABS,
  showTabs = true,
  title = "Sheet preview",
  selectable = true,
}: {
  tabs?: SheetGridTab[]
  /** Steps after preparation work on one consolidated sheet — no tab strip. */
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

  const view: ViewKind = diff ? "diff" : mode
  const active = tabs.find((t) => t.name === activeName) ?? tabs[0]
  const outputTabs = tabs.filter((t) => !ignored.has(t.name))
  const shownTab = view !== "input" && ignored.has(active.name) ? outputTabs[0] ?? active : active

  const ts = tabStates[shownTab.name] ?? EMPTY_TS
  const patchTS = (patch: Partial<TabState>) =>
    setTabStates((prev) => ({ ...prev, [shownTab.name]: { ...(prev[shownTab.name] ?? EMPTY_TS), ...patch } }))

  const vm = useMemo(() => buildView(shownTab, view), [shownTab, view])
  const featuresOn = vm.hasHeader

  /* Column layout is shared between input and output; raw (header-less) input
     views have their own key space because their column indexes are shifted. */
  const space = view === "input" && !vm.hasHeader ? "raw" : "norm"
  const cols: ManagedColumn[] = useMemo(
    () => Array.from({ length: vm.colCount }, (_, j) => {
      const raw = displayVal(vm.header?.[j]?.v)
      return { id: String(j), label: raw ? `${colLetter(j)} · ${raw}` : `${colLetter(j)} · —` }
    }),
    [vm.colCount, vm.header],
  )
  const order = ts.order[space] ?? cols.map((c) => c.id)
  const hidden = new Set(ts.hidden[space] ?? [])
  const frozen = new Set(ts.frozen)
  const setOrder = (o: string[]) => patchTS({ order: { ...ts.order, [space]: o } })
  const setHidden = (h: Set<string>) => patchTS({ hidden: { ...ts.hidden, [space]: [...h] } })
  // Input dims hidden columns (still visible); output/diff drop them entirely
  const renderCols = order.filter((id) => cols.some((c) => c.id === id) && (view === "input" || !hidden.has(id)))
  const headLabel = (id: string) => displayVal(vm.header?.[Number(id)]?.v) || colLetter(Number(id))

  /* filter → sort → group, always keeping the spreadsheet row index */
  const activeFilters = Object.entries(ts.filters).filter(([, v]) => v.length > 0)
  const visibleRows = useMemo(() => {
    let rows = vm.rows
    for (const [cid, allowed] of activeFilters) {
      const set = new Set(allowed)
      rows = rows.filter((r) => set.has(displayVal(r.cells[Number(cid)]?.v) || "(blank)"))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.rows, JSON.stringify(ts.filters), ts.sorts])

  const groups = useMemo(() => {
    if (!ts.groupBy || !featuresOn) return null
    const map = new Map<string, PreviewRow[]>()
    for (const r of visibleRows) {
      const k = displayVal(r.cells[Number(ts.groupBy)]?.v) || "(blank)"
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()]
  }, [visibleRows, ts.groupBy, featuresOn])

  const collapsed = new Set(ts.collapsed)
  const flatRows = useMemo(
    () => (groups ? groups.flatMap(([k, rows]) => (collapsed.has(k) ? [] : rows)) : visibleRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, visibleRows, ts.collapsed],
  )

  /* ── Counts: per tab and across the sheet, before and after filters ────── */
  const tabCounts = useMemo(() => {
    const m: Record<string, { total: number; filtered: number; active: boolean }> = {}
    for (const t of tabs) m[t.name] = countRows(t, view, tabStates[t.name] ?? EMPTY_TS)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, view, JSON.stringify(tabStates)])
  const counted = (view === "input" ? tabs : outputTabs).filter((t) => showTabs || t.name === shownTab.name)
  const sheetTotal = counted.reduce((s, t) => s + (tabCounts[t.name]?.total ?? 0), 0)
  const sheetFiltered = counted.reduce((s, t) => s + (tabCounts[t.name]?.filtered ?? 0), 0)
  const anyFilter = sheetFiltered !== sheetTotal

  /* ── Find (Ctrl+F-like) ───────────────────────────────────────────────── */
  const needle = find.trim().toLowerCase()
  const findMatches = useMemo(() => {
    if (!needle) return []
    const out: string[] = []
    if (vm.header) vm.header.forEach((c, ci) => { if (displayVal(c.v).toLowerCase().includes(needle)) out.push(`h:${ci}`) })
    flatRows.forEach((r) => {
      renderCols.forEach((id) => {
        const c = r.cells[Number(id)]
        if (c && displayVal(c.v).toLowerCase().includes(needle)) out.push(`d${r.idx}:${id}`)
      })
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, vm.header, flatRows, renderCols.join(",")])
  const matchSet = useMemo(() => new Map(findMatches.map((k, i) => [k, i])), [findMatches])
  const curFind = findMatches.length ? ((findIdx % findMatches.length) + findMatches.length) % findMatches.length : 0

  useEffect(() => { setFindIdx(0) }, [needle, activeName, view])
  useEffect(() => {
    if (!findMatches.length) return
    const root = (full ? fullBodyRef : bodyRef).current
    root?.querySelector(`[data-fm="${curFind}"]`)?.scrollIntoView({ block: "center", inline: "center" })
  }, [curFind, findMatches.length, full])

  /* ── Selection (shift for ranges) ─────────────────────────────────────── */
  const keyOf = (r: PreviewRow) => `${shownTab.name}:${r.idx}`
  const clickRow = (r: PreviewRow, i: number, shift: boolean) => {
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
  const selCount = flatRows.filter((r) => selected.has(keyOf(r))).length
  const allSelected = flatRows.length > 0 && selCount === flatRows.length

  /* ── Column helpers ───────────────────────────────────────────────────── */
  const cycleSort = (id: string) => {
    if (!featuresOn) return
    const cur = ts.sorts.length === 1 && ts.sorts[0].key === id ? ts.sorts[0] : null
    patchTS({ sorts: !cur ? [{ key: id, dir: "asc" }] : cur.dir === "asc" ? [{ key: id, dir: "desc" }] : [] })
  }
  const distinctVals = (id: string) => {
    const set = new Set<string>()
    for (const r of vm.rows) set.add(displayVal(r.cells[Number(id)]?.v) || "(blank)")
    return [...set].sort((a, b) => a.localeCompare(b))
  }
  const reorderCols = (from: string, to: string) => {
    if (from === to) return
    const next = order.filter((id) => id !== from)
    next.splice(next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0), 0, from)
    setOrder(next)
  }
  const toggleHidden = (id: string) => {
    const n = new Set(hidden)
    n.has(id) ? n.delete(id) : n.add(id)
    setHidden(n)
  }

  const IDX_W = 48
  const SEL_W = 36
  const frozenLeft = (id: string) => {
    let left = IDX_W + (selectable ? SEL_W : 0)
    for (const cid of renderCols) {
      if (cid === id) break
      if (frozen.has(cid)) left += 132
    }
    return left
  }

  const diffCounts = useMemo(() => {
    if (view !== "diff") return null
    let added = 0, changed = 0, removed = 0
    vm.rows.forEach((r) => {
      if (r.removed) { removed++; return }
      if (r.added) { added++; return }
      changed += r.cells.filter((c) => c.status === "changed").length
    })
    return { added, changed, removed }
  }, [view, vm.rows])

  /* ── Footer metadata for the shown tab + view ─────────────────────────── */
  const meta = useMemo(() => {
    let filled = 0, empty = 0
    for (const r of visibleRows) for (const id of renderCols) (isEmpty(r.cells[Number(id)]?.v) ? empty++ : filled++)
    return { rows: visibleRows.length, cols: renderCols.length, filled, empty }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, renderCols.join(",")])

  /* ── Cell rendering ───────────────────────────────────────────────────── */
  const zebra = (i: number) => (i % 2 ? "bg-muted/20" : "bg-card")
  /** Amber for value → value, red when a value was cleared, green when one was added. */
  const cellTone = (c: DiffCell | undefined, rowRemoved?: boolean) => {
    if (rowRemoved) return "bg-red-50 text-red-700 line-through decoration-red-300"
    if (!c?.status) return ""
    if (c.status === "added") return "bg-emerald-50 text-emerald-800"
    if (c.status === "removed") return "bg-red-50 text-red-700"
    if (isEmpty(c.v) && !isEmpty(c.from)) return "bg-red-50"      // value → empty
    if (!isEmpty(c.v) && isEmpty(c.from)) return "bg-emerald-50"  // empty → value
    return "bg-amber-50"
  }
  const Dash = () => <span className="text-muted-foreground">—</span>

  const cellContent = (c: DiffCell | undefined, fmKey: string) => {
    const idx = matchSet.get(fmKey)
    const val = displayVal(c?.v)
    let body: React.ReactNode
    if (c?.status === "changed") {
      const gone = isEmpty(c.v) && !isEmpty(c.from)
      const born = !isEmpty(c.v) && isEmpty(c.from)
      body = (
        <span className="inline-flex items-center gap-1">
          {isEmpty(c.from)
            ? <Dash />
            : <span className={cn("line-through", gone ? "text-red-600 decoration-red-400" : "text-muted-foreground decoration-amber-400")}>{displayVal(c.from)}</span>}
          <span className="text-muted-foreground">→</span>
          {isEmpty(c.v) ? <Dash /> : <b className={cn("font-semibold", born ? "text-emerald-700" : "text-foreground")}>{val}</b>}
        </span>
      )
    } else {
      body = val === "" ? <span className="text-muted-foreground/30">·</span> : val
    }
    if (idx === undefined) return body
    return (
      <span data-fm={idx} className={cn("-mx-0.5 rounded-sm px-0.5", idx === curFind ? "bg-amber-300 ring-1 ring-amber-500" : "bg-yellow-100")}>{body}</span>
    )
  }

  /* ── Grid ─────────────────────────────────────────────────────────────── */
  const grid = (inFull: boolean) => {
    let renderIdx = -1
    const dataRowTr = (r: PreviewRow) => {
      renderIdx += 1
      const i = renderIdx
      const zb = zebra(i)
      return (
        <tr key={r.idx} className="group">
          <td className="sticky left-0 z-20 w-12 border-b border-r border-border bg-muted px-2 py-1.5 text-center text-[10px] text-muted-foreground">{r.idx}</td>
          {selectable && (
            <td className={cn("sticky z-20 w-9 border-b border-r border-border px-2 py-1.5 text-center", zb)} style={{ left: IDX_W }}>
              <Checkbox
                className="h-3.5 w-3.5 align-middle"
                checked={selected.has(keyOf(r))}
                onClick={(e) => clickRow(r, i, (e as React.MouseEvent).shiftKey)}
              />
            </td>
          )}
          {renderCols.map((id) => {
            const c = r.cells[Number(id)]
            const dim = view === "input" && hidden.has(id)
            return (
              <td
                key={id}
                className={cn(
                  "whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-[13px] tabular-nums group-hover:bg-muted/60",
                  frozen.has(id) ? cn("sticky z-10", zb) : zb,
                  frozen.has(id) && "min-w-[132px] max-w-[132px] truncate",
                  cellTone(c, r.removed),
                  dim && "opacity-35",
                )}
                style={frozen.has(id) ? { left: frozenLeft(id) } : undefined}
              >
                {cellContent(c, `d${r.idx}:${id}`)}
              </td>
            )
          })}
        </tr>
      )
    }

    const totalCols = 1 + (selectable ? 1 : 0) + renderCols.length
    return (
      <div ref={inFull ? fullBodyRef : bodyRef} className={cn("relative overflow-auto overscroll-contain", inFull ? "max-h-[calc(92vh-190px)]" : "max-h-[460px]")}>
        <table className="w-max border-separate border-spacing-0 text-[13px]">
          <thead>
            {/* Column letters — drag to reorder, eye to hide (input only) */}
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
              {renderCols.map((id) => {
                const dim = view === "input" && hidden.has(id)
                return (
                  <th
                    key={id}
                    draggable
                    onDragStart={() => { dragCol.current = id }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragCol.current) reorderCols(dragCol.current, id); dragCol.current = null }}
                    className={cn(
                      "sticky top-0 h-7 min-w-[132px] border-b border-r border-border bg-muted px-2 text-[10px] font-normal text-muted-foreground",
                      frozen.has(id) ? "z-40" : "z-30",
                    )}
                    style={frozen.has(id) ? { left: frozenLeft(id) } : undefined}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                      <span className={cn(dim && "opacity-40")}>{colLetter(Number(id))}</span>
                      {view === "input" ? (
                        <button
                          title={dim ? "Show column (kept in output)" : "Hide column (excluded from output)"}
                          onClick={() => toggleHidden(id)}
                          className="text-muted-foreground/60 hover:text-foreground"
                        >
                          {dim ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      ) : <span className="w-3" />}
                    </span>
                  </th>
                )
              })}
            </tr>
            {/* Header labels — sort + filter per column; only when the sheet has a top header */}
            {vm.header && (
              <tr>
                <th className="sticky left-0 top-7 z-40 w-12 border-b border-r border-border bg-muted px-2 py-1 text-center text-[10px] font-normal text-muted-foreground">{vm.headerIdx}</th>
                {selectable && <th className="sticky top-7 z-30 w-9 border-b border-r border-border bg-muted" style={{ left: IDX_W }} />}
                {renderCols.map((id) => {
                  const s = ts.sorts.find((x) => x.key === id)
                  const fActive = (ts.filters[id] ?? []).length > 0
                  const dim = view === "input" && hidden.has(id)
                  return (
                    <th
                      key={id}
                      className={cn(
                        "sticky top-7 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1 text-left text-xs font-semibold text-foreground",
                        frozen.has(id) ? "z-40" : "z-20", dim && "opacity-40",
                      )}
                      style={frozen.has(id) ? { left: frozenLeft(id) } : undefined}
                    >
                      <span className="flex items-center gap-1">
                        <button onClick={() => cycleSort(id)} disabled={!featuresOn} className="inline-flex items-center gap-1 hover:text-primary disabled:cursor-not-allowed">
                          {headLabel(id)}
                          {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                        <Popover>
                          <PopoverTrigger asChild disabled={!featuresOn}>
                            <button title={`Filter ${headLabel(id)}`} className={cn("rounded p-0.5 hover:bg-secondary disabled:opacity-30", fActive ? "text-primary" : "text-muted-foreground/50")}>
                              <Filter className={cn("h-3 w-3", fActive && "fill-primary/20")} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-60 p-2">
                            <ColFilter
                              label={headLabel(id)}
                              values={distinctVals(id)}
                              active={ts.filters[id]}
                              onChange={(vals) => patchTS({ filters: { ...ts.filters, [id]: vals } })}
                            />
                          </PopoverContent>
                        </Popover>
                      </span>
                    </th>
                  )
                })}
              </tr>
            )}
          </thead>
          <tbody>
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
                        <span className="text-xs font-semibold text-foreground">{headLabel(ts.groupBy!)}: {k}</span>
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

  /* ── Toolbar: Search · Input/Output · Diff · Filters · Sort · Group · Columns · Fullscreen ── */
  const controls = (inFull: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in sheet…" className="h-8 w-40 pl-7 pr-2 text-sm" />
      </div>
      {needle && (
        <span className="flex items-center gap-0.5">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{findMatches.length ? curFind + 1 : 0}/{findMatches.length}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Previous match" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v - 1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Next match" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v + 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
        </span>
      )}
      {selectable && selCount > 0 && (
        <span className={cn(TAG, "border-primary/40 bg-primary/5 text-primary")}>
          {selCount} selected
          <button title="Clear selection" onClick={() => setSelected(new Set())} className="hover:text-foreground"><X className="h-3 w-3" /></button>
        </span>
      )}

      <div className="flex rounded-lg border border-border p-0.5">
        {(["input", "output"] as const).map((m) => (
          <button
            key={m}
            title={m === "input" ? "Sheet as this step received it" : "Sheet this step hands to the next one"}
            onClick={() => { setMode(m); setDiff(false) }}
            className={cn("rounded-md px-3 py-1 text-sm font-medium capitalize", mode === m && !diff ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {m}
          </button>
        ))}
      </div>

      <Button
        variant={diff ? "default" : "outline"} size="icon" className="h-8 w-8" title="Compare input → output (cell changes)"
        onClick={() => { setDiff((d) => !d); if (!diff) setMode("output") }}
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
      </Button>

      {/* Applied filters — indicator + clear */}
      <Popover>
        <PopoverTrigger asChild disabled={!featuresOn}>
          <Button variant={activeFilters.length ? "default" : "outline"} size="icon" className="h-8 w-8 disabled:opacity-40" title={activeFilters.length ? `${activeFilters.length} column filter${activeFilters.length > 1 ? "s" : ""} applied` : "Column filters"}>
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Applied filters</p>
          {activeFilters.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No column filters on this tab.</p>
          ) : (
            <>
              <div className="space-y-1">
                {activeFilters.map(([cid, vals]) => (
                  <div key={cid} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">{headLabel(cid)}</span>
                      <span className="text-[10px] text-muted-foreground">{vals.length} of {distinctVals(cid).length} values</span>
                    </span>
                    <button title="Clear this filter" onClick={() => patchTS({ filters: { ...ts.filters, [cid]: [] } })} className="text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => patchTS({ filters: {} })} className="mt-2 w-full border-t border-border pt-1.5 text-center text-xs text-muted-foreground hover:text-foreground">Clear all filters</button>
            </>
          )}
        </PopoverContent>
      </Popover>

      <MultiSortControl
        iconOnly
        disabled={!featuresOn}
        title="Multi-level sort"
        fields={cols.map((c) => ({ key: c.id, label: headLabel(c.id) }))}
        sorts={ts.sorts}
        onChange={(s) => patchTS({ sorts: s })}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!featuresOn}>
          <Button variant={ts.groupBy ? "default" : "outline"} size="icon" className="h-8 w-8 disabled:opacity-40" title={ts.groupBy ? `Grouped by ${headLabel(ts.groupBy)}` : "Group rows by a column"}>
            <GroupIcon className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuItem className="text-sm" onClick={() => patchTS({ groupBy: null, collapsed: [] })}>No grouping</DropdownMenuItem>
          {cols.map((c) => (
            <DropdownMenuItem key={c.id} className="text-sm" onClick={() => {
              const vals = new Set<string>()
              for (const r of visibleRows) vals.add(displayVal(r.cells[Number(c.id)]?.v) || "(blank)")
              patchTS({ groupBy: c.id, collapsed: [...vals].slice(1) })
            }}>
              {headLabel(c.id)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="icon" className="h-8 w-8" title="Columns — reorder, show/hide, freeze" onClick={() => setColsOpen(true)}>
        <Columns3 className="h-3.5 w-3.5" />
      </Button>

      <Button variant="outline" size="icon" className="h-8 w-8" title={inFull ? "Close fullscreen" : "Fullscreen"} onClick={() => setFull(!inFull)}>
        {inFull ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  )

  /** Row count + expand/collapse — shown next to the title in both the card and fullscreen. */
  const headlineExtras = (
    <>
      <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>
        {anyFilter ? `${sheetFiltered.toLocaleString("en-US")} of ${sheetTotal.toLocaleString("en-US")} rows` : `${sheetTotal.toLocaleString("en-US")} rows`}
      </span>
      {groups && (
        <span className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => patchTS({ collapsed: [] })}>
            <ChevronsUpDown className="h-3.5 w-3.5" />Expand all
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => patchTS({ collapsed: groups.map(([k]) => k) })}>
            <ChevronsDownUp className="h-3.5 w-3.5" />Collapse all
          </Button>
        </span>
      )}
    </>
  )
  const headline = (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {headlineExtras}
    </div>
  )

  const footer = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
      <span><b className="text-foreground">{meta.rows.toLocaleString("en-US")}</b> rows</span>
      <span>·</span>
      <span><b className="text-foreground">{meta.cols}</b> columns</span>
      <span>·</span>
      <span>Count <b className="text-foreground">{meta.filled.toLocaleString("en-US")}</b></span>
      <span>·</span>
      <span>Empty <b className="text-foreground">{meta.empty.toLocaleString("en-US")}</b></span>
      {!featuresOn && <span className="ml-auto italic">No header row — sort, filter and group need a cleaned header.</span>}
    </div>
  )

  const tabStrip = showTabs && (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4">
      {(view === "input" ? tabs : outputTabs).map((t) => {
        const off = ignored.has(t.name)
        const c = tabCounts[t.name]
        return (
          <button
            key={t.name}
            onClick={() => setActiveName(t.name)}
            className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              shownTab.name === t.name ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              off && "opacity-45")}
          >
            {t.name}
            <span className={cn("rounded-full border px-1.5 text-[11px]", c?.active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted")}>
              {c?.active ? `${c.filtered}/${c.total}` : c?.total ?? 0}
            </span>
            <span
              role="button"
              title={off ? "Include this tab in the output" : "Ignore this tab (excluded from output)"}
              onClick={(e) => { e.stopPropagation(); setIgnored((prev) => { const n = new Set(prev); n.has(t.name) ? n.delete(t.name) : n.add(t.name); return n }) }}
              className="text-muted-foreground hover:text-foreground"
            >
              {off ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </span>
          </button>
        )
      })}
    </div>
  )

  const body = (inFull: boolean) => (
    <>
      {tabStrip}
      {view === "diff" && diffCounts && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Changes vs input:</span>
          <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}>{diffCounts.added} rows added</span>
          <span className={cn(TAG, "border-amber-300 bg-amber-50 text-amber-700")}>{diffCounts.changed} cells changed</span>
          <span className={cn(TAG, "border-red-200 bg-red-50 text-red-600")}>{diffCounts.removed} rows removed</span>
        </div>
      )}
      {grid(inFull)}
      {footer}
    </>
  )

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          {headline}
          {controls(false)}
        </div>
        {body(false)}
      </div>

      <ColumnsSheet
        open={colsOpen}
        onClose={() => setColsOpen(false)}
        columns={order.map((id) => cols.find((c) => c.id === id)!).filter(Boolean)}
        order={order}
        onOrderChange={setOrder}
        hidden={hidden}
        onHiddenChange={setHidden}
        frozen={frozen}
        onFrozenChange={(f) => patchTS({ frozen: [...f] })}
      />

      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent showCloseButton={false} className="flex h-[92vh] !w-[95vw] !max-w-[1560px] flex-col gap-0 overflow-hidden p-0">
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
              {headlineExtras}
            </div>
            {controls(true)}
          </div>
          {body(true)}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Excel-style value filter — opens with every value checked; unchecking filters. */
function ColFilter({ label, values, active, onChange }: {
  label: string
  values: string[]
  active?: string[]
  onChange: (v: string[]) => void
}) {
  const [q, setQ] = useState("")
  const current = active && active.length ? active : values
  const set = new Set(current)
  const list = values.filter((v) => v.toLowerCase().includes(q.trim().toLowerCase()))
  // All checked = nothing filtered
  const apply = (next: string[]) => onChange(next.length === values.length ? [] : next)

  return (
    <div className="space-y-1.5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values…" className="h-7 text-xs" autoFocus />
      <div className="flex items-center gap-2 text-[11px]">
        <button onClick={() => apply(values)} className="text-primary hover:underline">Select all</button>
        <span className="text-muted-foreground">·</span>
        <button onClick={() => apply([])} className="text-primary hover:underline">Unselect all</button>
        <span className="ml-auto text-muted-foreground">{set.size}/{values.length}</span>
      </div>
      <div className="max-h-52 space-y-0.5 overflow-y-auto">
        {list.map((v) => (
          <button
            key={v}
            onClick={() => apply(set.has(v) ? current.filter((x) => x !== v) : [...current, v])}
            className={cn("flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-secondary", set.has(v) && "bg-primary/5")}
          >
            {/* span, not <Checkbox> — Radix renders a button and buttons can't nest */}
            <span className={cn("flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border", set.has(v) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white")}>
              {set.has(v) && <Check className="h-2.5 w-2.5" />}
            </span>
            <span className="truncate">{v}</span>
          </button>
        ))}
        {list.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">No values</p>}
      </div>
      {active && active.length > 0 && (
        <button onClick={() => onChange([])} className="w-full border-t border-border pt-1.5 text-center text-xs text-muted-foreground hover:text-foreground">Clear filter</button>
      )}
    </div>
  )
}

"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ChevronUp,
  Columns3, Download, Eye, EyeOff, Filter, GitCompareArrows, GripVertical, Group as GroupIcon, Maximize2,
  PencilLine, Plus, Search, Trash2, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ColumnsSheet, MultiSortControl, type SortLevel } from "@/components/table-kit"
import { colLetter, isBlank, txt, type Cell, type FieldType, type GridTable } from "@/lib/bulk-ingestion"

/* ────────────────────────────────────────────────────────────────────────────
   Sheet Preview — the core grid every ingestion step renders.

   Input is what the step received, Output what it hands to the next step and
   Diff the cell-level delta between them (computed, not mocked). Row indexes
   are stable across steps: removed rows keep their slot, added rows continue
   the sequence. Output is inline-editable with typed editors when the step
   allows it.
   ──────────────────────────────────────────────────────────────────────────── */

export type ViewKind = "input" | "output" | "diff"
export interface GridSheet {
  name: string
  /** Absent when the step's input isn't tabular (e.g. extraction reads documents) */
  input?: GridTable
  output: GridTable
  /** Caption next to the tab name */
  badge?: string
}
export interface CellMark { tone: "error" | "warn" | "info" | "ok"; note?: string }

interface DiffCell { v: Cell; status?: "added" | "changed" | "removed"; from?: Cell }
interface VMCol { key: string; label: string; letter: string; type?: FieldType; options?: readonly string[]; readOnly?: boolean; status?: "added" | "removed" }
interface VMRow { id: string; idx: number; cells: Record<string, DiffCell>; removed?: boolean; added?: boolean }
interface ViewModel { cols: VMCol[]; rows: VMRow[]; hasHeader: boolean; headerIdx?: number }

const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const letterFor = (key: string, pos: number) => (/^\d+$/.test(key) ? colLetter(Number(key)) : colLetter(pos))

function tableVM(t: GridTable): ViewModel {
  return {
    cols: t.cols.map((c, i) => ({ ...c, letter: letterFor(c.key, i) })),
    rows: t.rows.map((r) => ({ id: r.id, idx: r.idx, cells: Object.fromEntries(t.cols.map((c) => [c.key, { v: r.cells[c.key] ?? null }])) })),
    hasHeader: t.hasHeader,
    headerIdx: t.headerIdx,
  }
}

/** Diff only makes sense when input and output share columns (raw → mapped fields don't). */
export const isDiffable = (s: GridSheet) => !!s.input && s.input.cols.some((c) => s.output.cols.some((o) => o.key === c.key))

function diffVM(input: GridTable, output: GridTable): ViewModel {
  const inKeys = new Set(input.cols.map((c) => c.key))
  const cols: VMCol[] = input.cols.map((c, i) => {
    const o = output.cols.find((x) => x.key === c.key)
    return { ...(o ?? c), letter: letterFor(c.key, i), status: o ? undefined : "removed" }
  })
  // Output-only columns land right after the column they follow in the output
  output.cols.forEach((c, i) => {
    if (inKeys.has(c.key)) return
    const prev = i > 0 ? cols.findIndex((x) => x.key === output.cols[i - 1].key) : -1
    cols.splice(prev + 1, 0, { ...c, letter: letterFor(c.key, input.cols.length + i), status: "added" })
  })
  const inRows = new Map(input.rows.map((r) => [r.id, r]))
  const outRows = new Map(output.rows.map((r) => [r.id, r]))
  const ids = [...new Set([...output.rows.map((r) => r.id), ...input.rows.map((r) => r.id)])]
  const rows: VMRow[] = ids.map((id) => {
    const a = inRows.get(id)
    const b = outRows.get(id)
    if (b && !a) return { id, idx: b.idx, added: true, cells: Object.fromEntries(cols.map((c) => [c.key, { v: b.cells[c.key] ?? null, status: isBlank(b.cells[c.key]) ? undefined : "added" as const }])) }
    if (a && !b) return { id, idx: a.idx, removed: true, cells: Object.fromEntries(cols.map((c) => [c.key, { v: a.cells[c.key] ?? null, status: "removed" as const }])) }
    const cells: Record<string, DiffCell> = {}
    for (const c of cols) {
      const va = a!.cells[c.key] ?? null
      const vb = b!.cells[c.key] ?? null
      if (c.status === "removed") cells[c.key] = { v: va, status: isBlank(va) ? undefined : "removed" }
      else if (c.status === "added") cells[c.key] = { v: vb, status: isBlank(vb) ? undefined : "added" }
      // Compare what a person sees — "4,800,000" and 4800000 are the same cell
      else cells[c.key] = displayCell(va, c.type) === displayCell(vb, c.type) ? { v: vb } : { v: vb, from: va, status: "changed" }
    }
    return { id, idx: b!.idx, cells }
  })
  rows.sort((x, y) => x.idx - y.idx)
  return { cols, rows, hasHeader: output.hasHeader, headerIdx: output.headerIdx }
}

function buildVM(s: GridSheet, view: ViewKind): ViewModel {
  if (view === "input" && s.input) return tableVM(s.input)
  if (view === "diff" && s.input && isDiffable(s)) return diffVM(s.input, s.output)
  return tableVM(s.output)
}

/** Display text for a value in a typed column — money gets separators, ISO dates read as 30 Sep 2027. */
export function displayCell(v: Cell | undefined, type?: FieldType): string {
  if (isBlank(v)) return ""
  if (typeof v === "number" && (type === "money" || type === "number")) return v.toLocaleString("en-US")
  if (type === "date" && typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
  }
  return String(v)
}

/** Numeric-aware compare — "4,800,000" sorts as a number, text falls back to locale compare. */
function cmpVals(a: Cell, b: Cell) {
  const na = typeof a === "number" ? a : Number(String(a ?? "").replace(/,/g, ""))
  const nb = typeof b === "number" ? b : Number(String(b ?? "").replace(/,/g, ""))
  const aNum = !isBlank(a) && !Number.isNaN(na)
  const bNum = !isBlank(b) && !Number.isNaN(nb)
  if (aNum && bNum) return na - nb
  if (aNum) return -1
  if (bNum) return 1
  return txt(a).localeCompare(txt(b))
}

interface ColPrefs { order: string[]; hidden: string[]; frozen: string[] }
interface TabState { filters: Record<string, string[]>; sorts: SortLevel[]; groupBy: string | null; collapsed: string[] }
const EMPTY_TS: TabState = { filters: {}, sorts: [], groupBy: null, collapsed: [] }
const EMPTY_PREFS: ColPrefs = { order: [], hidden: [], frozen: [] }

const MARK_TONE: Record<CellMark["tone"], string> = {
  error: "bg-red-50 text-red-700 after:border-r-red-500 after:border-t-red-500",
  warn: "bg-amber-50 text-amber-900 after:border-r-amber-500 after:border-t-amber-500",
  info: "bg-sky-50 after:border-r-sky-500 after:border-t-sky-500",
  ok: "bg-emerald-50 after:border-r-emerald-500 after:border-t-emerald-500",
}
const CORNER = "relative after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-0 after:w-0 after:border-[4px] after:border-b-transparent after:border-l-transparent after:content-['']"
const ROW_TONE: Record<CellMark["tone"], string> = { error: "bg-red-50", warn: "bg-amber-50", info: "bg-sky-50", ok: "bg-emerald-50" }
const GUTTER_TONE: Record<CellMark["tone"], string> = { error: "bg-red-100 text-red-700", warn: "bg-amber-100 text-amber-800", info: "bg-sky-100 text-sky-800", ok: "bg-emerald-100 text-emerald-800" }

export function SheetPreviewCard({
  sheets,
  title = "Sheet preview",
  showTabs = true,
  selectable = true,
  ignored = [],
  onToggleIgnore,
  onToggleColumn,
  excludedCols,
  initialView = "output",
  forceView,
  editable = false,
  onEdit,
  onDeleteRows,
  onAddRow,
  markCell,
  markRow,
  markCol,
  focus,
  onClearFocus,
  bulkActions,
  activeSheet,
  onActiveSheetChange,
  onRowClick,
  activeRowId,
  headerExtra,
  viewLabels,
  height = "max-h-[520px]",
}: {
  sheets: GridSheet[]
  title?: string
  showTabs?: boolean
  /** Row checkboxes with shift-range selection */
  selectable?: boolean
  /** Tabs dimmed in the strip and dropped from the output */
  ignored?: string[]
  onToggleIgnore?: (sheet: string) => void
  /** Input-view column eye — excludes the column from the step's output */
  onToggleColumn?: (sheet: string, colKey: string) => void
  excludedCols?: Record<string, string[]>
  initialView?: ViewKind
  /** Switch view from outside — bump `key` to re-apply (e.g. show the diff after AI runs) */
  forceView?: { view: ViewKind; key: number }
  editable?: boolean
  onEdit?: (sheet: string, rowId: string, colKey: string, value: Cell) => void
  onDeleteRows?: (sheet: string, rowIds: string[]) => void
  onAddRow?: (sheet: string) => void
  markCell?: (sheet: string, rowId: string, colKey: string, view: ViewKind) => CellMark | null | undefined
  markRow?: (sheet: string, rowId: string, view: ViewKind) => CellMark | null | undefined
  markCol?: (sheet: string, colKey: string, view: ViewKind) => CellMark | null | undefined
  /** Narrow the grid to a set of rows (e.g. "rows with duplicate unit codes") */
  focus?: { sheet?: string; rowIds: string[]; label: string } | null
  onClearFocus?: () => void
  bulkActions?: (ctx: { sheet: string; rowIds: string[]; clear: () => void }) => React.ReactNode
  activeSheet?: string
  onActiveSheetChange?: (name: string) => void
  onRowClick?: (sheet: string, rowId: string) => void
  activeRowId?: string | null
  headerExtra?: React.ReactNode
  viewLabels?: { input?: string; output?: string }
  height?: string
}) {
  const [view, setView] = useState<ViewKind>(initialView)
  const [internalSheet, setInternalSheet] = useState(sheets[0]?.name ?? "")
  const [full, setFull] = useState(false)
  const [colsOpen, setColsOpen] = useState(false)
  const [find, setFind] = useState("")
  const [findIdx, setFindIdx] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({})
  const [prefs, setPrefs] = useState<Record<string, ColPrefs>>({})
  const [editing, setEditing] = useState<{ rowId: string; col: string } | null>(null)
  const [draft, setDraft] = useState("")
  const anchorRef = useRef<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const fullBodyRef = useRef<HTMLDivElement>(null)
  const dragCol = useRef<string | null>(null)

  // Only a view request made after this grid mounted counts — a fresh grid opens on its initial view
  const lastForce = useRef(forceView?.key)
  useEffect(() => {
    if (!forceView || forceView.key === lastForce.current) return
    lastForce.current = forceView.key
    setView(forceView.view)
  }, [forceView?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const outputSheets = sheets.filter((s) => !ignored.includes(s.name))
  const wanted = activeSheet ?? internalSheet
  const setSheet = (n: string) => { setInternalSheet(n); onActiveSheetChange?.(n); setEditing(null) }
  const shown = (view !== "input" && ignored.includes(wanted) ? outputSheets[0] : sheets.find((s) => s.name === wanted)) ?? sheets[0]
  const hasInput = !!shown?.input
  const canDiff = !!shown && isDiffable(shown)
  const effView: ViewKind = !hasInput ? "output" : view === "diff" && !canDiff ? "output" : view
  const canEdit = editable && effView === "output" && !!onEdit

  const ts = (shown && tabStates[shown.name]) ?? EMPTY_TS
  const patchTS = (patch: Partial<TabState>) =>
    shown && setTabStates((prev) => ({ ...prev, [shown.name]: { ...(prev[shown.name] ?? EMPTY_TS), ...patch } }))
  const cp = (shown && prefs[shown.name]) ?? EMPTY_PREFS
  const patchPrefs = (patch: Partial<ColPrefs>) =>
    shown && setPrefs((prev) => ({ ...prev, [shown.name]: { ...(prev[shown.name] ?? EMPTY_PREFS), ...patch } }))

  const vm = useMemo(() => (shown ? buildVM(shown, effView) : { cols: [], rows: [], hasHeader: false }), [shown, effView])
  const featuresOn = vm.hasHeader

  /* Column prefs are keyed by column key, so raw and mapped key spaces coexist */
  const colByKey = useMemo(() => new Map(vm.cols.map((c) => [c.key, c])), [vm.cols])
  const order = [...cp.order.filter((k) => colByKey.has(k)), ...vm.cols.map((c) => c.key).filter((k) => !cp.order.includes(k))]
  const hidden = new Set(cp.hidden)
  const frozen = new Set(cp.frozen)
  const excluded = new Set((shown && excludedCols?.[shown.name]) ?? [])
  const renderCols = order.filter((k) => !hidden.has(k)).map((k) => colByKey.get(k)!).filter(Boolean)
  const headLabel = (key: string) => colByKey.get(key)?.label || colByKey.get(key)?.letter || key
  const typeOf = (key: string) => colByKey.get(key)?.type

  /* focus → filter → sort → group, always keeping the row index */
  const activeFilters = Object.entries(ts.filters).filter(([, v]) => v.length > 0)
  const focusSet = focus && (!focus.sheet || focus.sheet === shown?.name) ? new Set(focus.rowIds) : null
  const visibleRows = useMemo(() => {
    let rows = vm.rows
    if (focusSet) rows = rows.filter((r) => focusSet.has(r.id))
    for (const [key, allowed] of activeFilters) {
      const set = new Set(allowed)
      rows = rows.filter((r) => set.has(displayCell(r.cells[key]?.v, typeOf(key)) || "(blank)"))
    }
    if (ts.sorts.length) {
      rows = [...rows].sort((a, b) => {
        for (const s of ts.sorts) {
          const d = cmpVals(a.cells[s.key]?.v ?? null, b.cells[s.key]?.v ?? null)
          if (d !== 0) return s.dir === "asc" ? d : -d
        }
        return 0
      })
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.rows, JSON.stringify(ts.filters), ts.sorts, focus])

  const groups = useMemo(() => {
    if (!ts.groupBy || !featuresOn || !colByKey.has(ts.groupBy)) return null
    const map = new Map<string, VMRow[]>()
    for (const r of visibleRows) {
      const k = displayCell(r.cells[ts.groupBy]?.v, typeOf(ts.groupBy)) || "(blank)"
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, ts.groupBy, featuresOn, colByKey])

  const collapsed = new Set(ts.collapsed)
  const flatRows = useMemo(
    () => (groups ? groups.flatMap(([k, rows]) => (collapsed.has(k) ? [] : rows)) : visibleRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, visibleRows, ts.collapsed],
  )

  /* ── Counts: per tab and across the sheet, before and after filters ────── */
  const tabCounts = useMemo(() => {
    const m: Record<string, { total: number; filtered: number; active: boolean }> = {}
    for (const s of sheets) {
      const v = buildVM(s, effView)
      const st = tabStates[s.name] ?? EMPTY_TS
      const entries = Object.entries(st.filters).filter(([, x]) => x.length > 0)
      const colType = new Map(v.cols.map((c) => [c.key, c.type]))
      const filtered = entries.length
        ? v.rows.filter((r) => entries.every(([k, allowed]) => allowed.includes(displayCell(r.cells[k]?.v, colType.get(k)) || "(blank)"))).length
        : v.rows.length
      m[s.name] = { total: v.rows.length, filtered, active: entries.length > 0 }
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets, effView, JSON.stringify(tabStates)])
  const counted = (effView === "input" ? sheets : outputSheets).filter((s) => showTabs || s.name === shown?.name)
  const sheetTotal = counted.reduce((n, s) => n + (tabCounts[s.name]?.total ?? 0), 0)
  const sheetFiltered = counted.reduce((n, s) => n + (tabCounts[s.name]?.filtered ?? 0), 0)
  const anyFilter = sheetFiltered !== sheetTotal

  /* ── Find (Ctrl+F-like) ───────────────────────────────────────────────── */
  const needle = find.trim().toLowerCase()
  const findMatches = useMemo(() => {
    if (!needle) return []
    const out: string[] = []
    flatRows.forEach((r) => {
      renderCols.forEach((c) => {
        if (displayCell(r.cells[c.key]?.v, c.type).toLowerCase().includes(needle)) out.push(`${r.id}::${c.key}`)
      })
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, flatRows, renderCols.map((c) => c.key).join(",")])
  const matchSet = useMemo(() => new Map(findMatches.map((k, i) => [k, i])), [findMatches])
  const curFind = findMatches.length ? ((findIdx % findMatches.length) + findMatches.length) % findMatches.length : 0

  useEffect(() => { setFindIdx(0) }, [needle, shown?.name, effView])
  useEffect(() => {
    if (!findMatches.length) return
    const root = (full ? fullBodyRef : bodyRef).current
    root?.querySelector(`[data-fm="${curFind}"]`)?.scrollIntoView({ block: "center", inline: "center" })
  }, [curFind, findMatches.length, full])
  useEffect(() => { (full ? fullBodyRef : bodyRef).current?.scrollTo({ top: 0 }) }, [focus, full])

  /* ── Selection (shift for ranges) ─────────────────────────────────────── */
  const keyOf = (r: VMRow) => `${shown?.name}::${r.id}`
  const clickRow = (r: VMRow, i: number, shift: boolean) => {
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
  const selRows = flatRows.filter((r) => selected.has(keyOf(r)) && !r.removed)
  const selIds = selRows.map((r) => r.id)
  const allSelected = flatRows.length > 0 && selRows.length === flatRows.filter((r) => !r.removed).length
  const clearSel = () => setSelected(new Set())

  /* ── Column helpers ───────────────────────────────────────────────────── */
  const cycleSort = (key: string) => {
    if (!featuresOn) return
    const cur = ts.sorts.length === 1 && ts.sorts[0].key === key ? ts.sorts[0] : null
    patchTS({ sorts: !cur ? [{ key, dir: "asc" }] : cur.dir === "asc" ? [{ key, dir: "desc" }] : [] })
  }
  const distinctVals = (key: string) => {
    const set = new Set<string>()
    for (const r of vm.rows) set.add(displayCell(r.cells[key]?.v, typeOf(key)) || "(blank)")
    return [...set].sort((a, b) => a.localeCompare(b))
  }
  const reorderCols = (from: string, to: string) => {
    if (from === to) return
    const next = order.filter((k) => k !== from)
    next.splice(next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0), 0, from)
    patchPrefs({ order: next })
  }

  const FROZEN_EDGE = "shadow-[2px_0_5px_-2px_rgba(15,23,42,0.18)]"
  const IDX_W = 48
  const SEL_W = 36
  const COL_W = 132
  const lastFrozen = [...renderCols].reverse().find((c) => frozen.has(c.key))?.key
  const frozenLeft = (key: string) => {
    let left = IDX_W + (selectable ? SEL_W : 0)
    for (const c of renderCols) {
      if (c.key === key) break
      if (frozen.has(c.key)) left += COL_W
    }
    return left
  }

  const diffCounts = useMemo(() => {
    if (effView !== "diff") return null
    let added = 0, changed = 0, removed = 0, colsAdded = 0, colsRemoved = 0
    vm.rows.forEach((r) => {
      if (r.removed) { removed++; return }
      if (r.added) { added++; return }
      changed += Object.values(r.cells).filter((c) => c.status === "changed").length
    })
    vm.cols.forEach((c) => { if (c.status === "added") colsAdded++; if (c.status === "removed") colsRemoved++ })
    return { added, changed, removed, colsAdded, colsRemoved }
  }, [effView, vm])

  /* ── Footer metadata for the shown tab + view ─────────────────────────── */
  const meta = useMemo(() => {
    let filled = 0, empty = 0
    for (const r of visibleRows) for (const c of renderCols) (isBlank(r.cells[c.key]?.v) ? empty++ : filled++)
    return { rows: visibleRows.length, cols: renderCols.length, filled, empty }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, renderCols.map((c) => c.key).join(",")])

  /** Export the shown tab as it stands on either side of this step. */
  const downloadCsv = (which: "input" | "output") => {
    if (!shown) return
    const t = which === "input" && shown.input ? shown.input : shown.output
    const esc = (val: string) => `"${val.replace(/"/g, '""')}"`
    const lines = [
      ...(t.hasHeader ? [t.cols.map((c) => esc(c.label))] : []),
      ...t.rows.map((r) => t.cols.map((c) => esc(displayCell(r.cells[c.key], c.type)))),
    ].map((row) => row.join(",")).join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([lines], { type: "text/csv" }))
    a.download = `${shown.name.toLowerCase().replace(/\s+/g, "-")}-${which}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /* ── Editing (typed, Excel-like keyboard) ─────────────────────────────── */
  const editableCols = renderCols.filter((c) => c.status !== "removed" && !c.readOnly)
  const startEdit = (rowId: string, key: string) => {
    if (!canEdit || colByKey.get(key)?.readOnly) return
    const row = vm.rows.find((r) => r.id === rowId)
    const v = row?.cells[key]?.v
    const t = typeOf(key)
    setDraft(t === "number" || t === "money" ? (isBlank(v) ? "" : String(v)) : txt(v))
    setEditing({ rowId, col: key })
  }
  const commit = (move?: "next" | "prev" | "down") => {
    if (!editing || !shown || !onEdit) return
    const t = typeOf(editing.col)
    const raw = draft.trim()
    const num = Number(raw.replace(/,/g, ""))
    const value: Cell = raw === "" ? null : (t === "number" || t === "money") && Number.isFinite(num) ? num : raw
    const before = vm.rows.find((r) => r.id === editing.rowId)?.cells[editing.col]?.v ?? null
    if (txt(before) !== txt(value) || typeof before !== typeof value) onEdit(shown.name, editing.rowId, editing.col, value)
    const { rowId, col } = editing
    setEditing(null)
    if (!move) return
    const ci = editableCols.findIndex((c) => c.key === col)
    const ri = flatRows.findIndex((r) => r.id === rowId)
    if (move === "next" && ci < editableCols.length - 1) setTimeout(() => startEdit(rowId, editableCols[ci + 1].key), 0)
    if (move === "prev" && ci > 0) setTimeout(() => startEdit(rowId, editableCols[ci - 1].key), 0)
    if (move === "down" && ri < flatRows.length - 1) setTimeout(() => startEdit(flatRows[ri + 1].id, col), 0)
  }
  const onEditorKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setEditing(null) }
    if (e.key === "Enter") { e.preventDefault(); commit("down") }
    if (e.key === "Tab") { e.preventDefault(); commit(e.shiftKey ? "prev" : "next") }
  }
  const editor = (c: VMCol) => {
    const common = "h-7 w-full min-w-[110px] rounded border border-primary bg-white px-1.5 text-[13px] outline-none ring-2 ring-primary/20"
    if (c.type === "select") {
      const opts = c.options ?? []
      return (
        <select autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit()} onKeyDown={onEditorKey} className={common}>
          <option value="">—</option>
          {draft && !opts.includes(draft) && <option value={draft}>{draft} (current)</option>}
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    if (c.type === "date") {
      return <input autoFocus type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(draft) ? draft : ""} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit()} onKeyDown={onEditorKey} className={common} />
    }
    return (
      <input
        autoFocus
        value={draft}
        inputMode={c.type === "number" || c.type === "money" ? "decimal" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={onEditorKey}
        onFocus={(e) => e.currentTarget.select()}
        className={cn(common, (c.type === "number" || c.type === "money") && "text-right tabular-nums")}
      />
    )
  }

  /* ── Cell rendering ───────────────────────────────────────────────────── */
  // Solid, not alpha: sticky cells would otherwise show the rows scrolling underneath
  const zebra = (i: number) => (i % 2 ? "bg-slate-50" : "bg-card")
  /** Amber for value → value, red when a value was cleared, green when one was added. */
  const diffTone = (c: DiffCell | undefined, row: VMRow) => {
    if (effView !== "diff") return ""
    if (row.removed) return "bg-red-50 text-red-700 line-through decoration-red-300"
    if (!c?.status) return ""
    if (c.status === "added") return "bg-emerald-50 text-emerald-800"
    if (c.status === "removed") return "bg-red-50 text-red-700 line-through decoration-red-300"
    if (isBlank(c.v) && !isBlank(c.from)) return "bg-red-50"
    if (!isBlank(c.v) && isBlank(c.from)) return "bg-emerald-50"
    return "bg-amber-50"
  }
  const Dash = () => <span className="text-muted-foreground">—</span>

  const cellContent = (c: DiffCell | undefined, col: VMCol, fmKey: string) => {
    const idx = matchSet.get(fmKey)
    const val = displayCell(c?.v, col.type)
    let body: React.ReactNode
    if (effView === "diff" && c?.status === "changed") {
      const gone = isBlank(c.v) && !isBlank(c.from)
      const born = !isBlank(c.v) && isBlank(c.from)
      body = (
        <span className="inline-flex items-center gap-1">
          {isBlank(c.from)
            ? <Dash />
            : <span className={cn("line-through", gone ? "text-red-600 decoration-red-400" : "text-muted-foreground decoration-amber-400")}>{displayCell(c.from, col.type)}</span>}
          <span className="text-muted-foreground">→</span>
          {isBlank(c.v) ? <Dash /> : <b className={cn("font-semibold", born ? "text-emerald-700" : "text-foreground")}>{val}</b>}
        </span>
      )
    } else {
      body = val === "" ? <span className="text-muted-foreground/30">·</span> : val
    }
    if (idx === undefined) return body
    return <span data-fm={idx} className={cn("-mx-0.5 rounded-sm px-0.5", idx === curFind ? "bg-amber-300 ring-1 ring-amber-500" : "bg-yellow-100")}>{body}</span>
  }

  /* ── Grid ─────────────────────────────────────────────────────────────── */
  const grid = (inFull: boolean) => {
    let renderIdx = -1
    const dataRowTr = (r: VMRow) => {
      renderIdx += 1
      const i = renderIdx
      const rowMark = shown ? markRow?.(shown.name, r.id, effView) : null
      const zb = rowMark ? ROW_TONE[rowMark.tone] : zebra(i)
      const isActive = activeRowId === r.id
      return (
        <tr key={r.id} className={cn("group", onRowClick && "cursor-pointer")} onClick={() => shown && onRowClick?.(shown.name, r.id)}>
          <td
            title={rowMark?.note}
            className={cn("sticky left-0 z-20 w-12 border-b border-r border-border px-2 py-1.5 text-center text-[10px]",
              rowMark ? GUTTER_TONE[rowMark.tone] : "bg-muted text-muted-foreground",
              isActive && "bg-primary text-primary-foreground")}
          >
            {r.idx}
          </td>
          {selectable && (
            <td className={cn("sticky z-30 w-9 border-b border-r border-border px-2 py-1.5 text-center", zb)} style={{ left: IDX_W }} onClick={(e) => e.stopPropagation()}>
              {!r.removed && (
                <Checkbox
                  className="h-3.5 w-3.5 border-input bg-white align-middle data-[state=checked]:bg-primary"
                  checked={selected.has(keyOf(r))}
                  onClick={(e) => clickRow(r, i, (e as React.MouseEvent).shiftKey)}
                />
              )}
            </td>
          )}
          {renderCols.map((col) => {
            const c = r.cells[col.key]
            const isEditing = editing?.rowId === r.id && editing.col === col.key
            const mark = shown && !r.removed ? markCell?.(shown.name, r.id, col.key, effView) : null
            const colMark = shown ? markCol?.(shown.name, col.key, effView) : null
            const dim = effView === "input" && excluded.has(col.key)
            const numeric = col.type === "number" || col.type === "money"
            return (
              <td
                key={col.key}
                title={mark?.note}
                onDoubleClick={() => canEdit && !r.removed && startEdit(r.id, col.key)}
                onClick={() => { if (canEdit && !r.removed && !isEditing && !col.readOnly) startEdit(r.id, col.key) }}
                className={cn(
                  "whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-[13px] tabular-nums group-hover:bg-muted",
                  frozen.has(col.key) ? cn("sticky z-10", zb) : zb,
                  frozen.has(col.key) && "min-w-[132px] max-w-[132px] truncate",
                  col.key === lastFrozen && FROZEN_EDGE,
                  numeric && "text-right",
                  colMark && !mark && ROW_TONE[colMark.tone],
                  mark && cn(CORNER, MARK_TONE[mark.tone]),
                  diffTone(c, r),
                  isActive && "bg-primary/5",
                  canEdit && !r.removed && !col.readOnly && "cursor-text hover:ring-1 hover:ring-inset hover:ring-primary/40",
                  col.readOnly && effView !== "diff" && !mark && "text-muted-foreground",
                  isEditing && "p-0.5",
                  dim && "opacity-35",
                )}
                style={frozen.has(col.key) ? { left: frozenLeft(col.key) } : undefined}
              >
                {isEditing ? editor(col) : cellContent(c, col, `${r.id}::${col.key}`)}
              </td>
            )
          })}
        </tr>
      )
    }

    const totalCols = 1 + (selectable ? 1 : 0) + renderCols.length
    return (
      <div ref={inFull ? fullBodyRef : bodyRef} className={cn("relative overflow-auto overscroll-contain", inFull ? "max-h-[calc(92vh-190px)]" : height)}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            {/* Column letters — drag to reorder; eye excludes a column from the output where the step supports it */}
            <tr>
              <th className="sticky left-0 top-0 z-40 h-7 w-12 border-b border-r border-border bg-muted" />
              {selectable && (
                <th className="sticky top-0 z-40 h-7 w-9 border-b border-r border-border bg-muted" style={{ left: IDX_W }}>
                  <Checkbox
                    className="h-3.5 w-3.5 border-input bg-white align-middle data-[state=checked]:bg-primary"
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected((prev) => {
                      const n = new Set(prev)
                      flatRows.forEach((r) => { if (!r.removed) (v ? n.add(keyOf(r)) : n.delete(keyOf(r))) })
                      return n
                    })}
                  />
                </th>
              )}
              {renderCols.map((col) => {
                const dim = effView === "input" && excluded.has(col.key)
                const colMark = shown ? markCol?.(shown.name, col.key, effView) : null
                return (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={() => { dragCol.current = col.key }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragCol.current) reorderCols(dragCol.current, col.key); dragCol.current = null }}
                    title={colMark?.note}
                    className={cn(
                      "sticky top-0 h-7 min-w-[132px] border-b border-r border-border px-2 text-[10px] font-normal",
                      colMark ? GUTTER_TONE[colMark.tone] : "bg-muted text-muted-foreground",
                      effView === "diff" && col.status === "added" && "bg-emerald-100 text-emerald-800",
                      effView === "diff" && col.status === "removed" && "bg-red-100 text-red-700 line-through",
                      frozen.has(col.key) ? "z-40 max-w-[132px]" : "z-30",
                      col.key === lastFrozen && FROZEN_EDGE,
                    )}
                    style={frozen.has(col.key) ? { left: frozenLeft(col.key) } : undefined}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <GripVertical className="h-3 w-3 flex-shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                      <span className={cn("flex-1 text-center", dim && "opacity-40")}>{col.letter}</span>
                      {effView === "input" && onToggleColumn && shown ? (
                        <button
                          title={dim ? "Keep column in the output" : "Drop column from the output"}
                          onClick={() => onToggleColumn(shown.name, col.key)}
                          className="flex-shrink-0 text-muted-foreground/60 hover:text-foreground"
                        >
                          {dim ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      ) : <span className="w-3 flex-shrink-0" />}
                    </span>
                  </th>
                )
              })}
            </tr>
            {/* Header labels — sort + filter per column; only when the sheet has a real header */}
            {vm.hasHeader && (
              <tr>
                <th className="sticky left-0 top-7 z-40 w-12 border-b border-r border-border bg-muted px-2 py-1 text-center text-[10px] font-normal text-muted-foreground">{vm.headerIdx ?? ""}</th>
                {selectable && <th className="sticky top-7 z-40 w-9 border-b border-r border-border bg-muted" style={{ left: IDX_W }} />}
                {renderCols.map((col) => {
                  const s = ts.sorts.find((x) => x.key === col.key)
                  const fActive = (ts.filters[col.key] ?? []).length > 0
                  const dim = effView === "input" && excluded.has(col.key)
                  return (
                    <th
                      key={col.key}
                      className={cn(
                        "sticky top-7 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1 text-left text-xs font-semibold text-foreground",
                        frozen.has(col.key) ? "z-40 min-w-[132px] max-w-[132px]" : "z-20", dim && "opacity-40",
                        col.key === lastFrozen && FROZEN_EDGE,
                      )}
                      style={frozen.has(col.key) ? { left: frozenLeft(col.key) } : undefined}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <button onClick={() => cycleSort(col.key)} disabled={!featuresOn} className={cn("min-w-0 truncate text-left hover:text-primary disabled:cursor-not-allowed", !col.label && "font-normal italic text-muted-foreground")}>
                          {col.label || "—"}
                        </button>
                        <span className="flex flex-shrink-0 items-center gap-0.5">
                          <button onClick={() => cycleSort(col.key)} disabled={!featuresOn} title={`Sort by ${headLabel(col.key)}`} className="rounded p-0.5 hover:bg-secondary disabled:opacity-30">
                            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </button>
                          <Popover>
                            <PopoverTrigger asChild disabled={!featuresOn}>
                              <button title={`Filter ${headLabel(col.key)}`} className={cn("rounded p-0.5 hover:bg-secondary disabled:opacity-30", fActive ? "text-primary" : "text-muted-foreground/50")}>
                                <Filter className={cn("h-3 w-3", fActive && "fill-primary/20")} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-60 p-2">
                              <ColFilter
                                label={headLabel(col.key)}
                                values={distinctVals(col.key)}
                                active={ts.filters[col.key]}
                                onChange={(vals) => patchTS({ filters: { ...ts.filters, [col.key]: vals } })}
                              />
                            </PopoverContent>
                          </Popover>
                        </span>
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
              <tr><td colSpan={totalCols} className="px-4 py-10 text-center text-sm text-muted-foreground">{focusSet ? "No rows left in this selection." : "No rows match the column filters."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  /* ── Toolbar: Search · Input/Output · Diff · Filters · Sort · Group · Columns · Download · Fullscreen ── */
  const controls = (inFull: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search in sheet" className="h-8 w-48 pl-7 pr-2 text-sm" />
      </div>
      {needle && (
        <span className="flex items-center gap-0.5">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{findMatches.length ? curFind + 1 : 0}/{findMatches.length}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Previous match" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v - 1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Next match" disabled={!findMatches.length} onClick={() => setFindIdx((v) => v + 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
        </span>
      )}
      {hasInput && (
        <div className="flex rounded-lg border border-border p-0.5">
          {(["input", "output"] as const).map((m) => (
            <button
              key={m}
              title={m === "input" ? "What this step received" : "What this step hands to the next one"}
              onClick={() => { setView(m); setEditing(null) }}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                // In diff the sheet IS the output, so output stays selected and input greys out
                (effView === "diff" ? m === "output" : effView === m) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                effView === "diff" && m === "input" && "opacity-40",
              )}
            >
              {m === "input" ? viewLabels?.input ?? "Input" : viewLabels?.output ?? "Output"}
            </button>
          ))}
        </div>
      )}
      {hasInput && (
        <Button
          variant={effView === "diff" ? "default" : "outline"} size="icon" className="h-8 w-8 disabled:opacity-40"
          disabled={!canDiff}
          title={canDiff ? "Compare input → output (cell changes)" : "Input and output have different columns — nothing to compare cell by cell"}
          onClick={() => { setView(effView === "diff" ? "output" : "diff"); setEditing(null) }}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
        </Button>
      )}

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
                {activeFilters.map(([key, vals]) => (
                  <div key={key} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">{headLabel(key)}</span>
                      <span className="text-[10px] text-muted-foreground">{vals.length} of {distinctVals(key).length} values</span>
                    </span>
                    <button title="Clear this filter" onClick={() => patchTS({ filters: { ...ts.filters, [key]: [] } })} className="text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
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
        fields={vm.cols.map((c) => ({ key: c.key, label: headLabel(c.key) }))}
        sorts={ts.sorts}
        onChange={(s) => patchTS({ sorts: s })}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!featuresOn}>
          <Button variant={groups ? "default" : "outline"} size="icon" className="h-8 w-8 disabled:opacity-40" title={groups && ts.groupBy ? `Grouped by ${headLabel(ts.groupBy)}` : "Group rows by a column"}>
            <GroupIcon className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuItem className="text-sm" onClick={() => patchTS({ groupBy: null, collapsed: [] })}>No grouping</DropdownMenuItem>
          {vm.cols.map((c) => (
            <DropdownMenuItem key={c.key} className="text-sm" onClick={() => {
              const vals = new Set<string>()
              for (const r of visibleRows) vals.add(displayCell(r.cells[c.key]?.v, c.type) || "(blank)")
              patchTS({ groupBy: c.key, collapsed: [...vals].slice(1) })
            }}>
              {headLabel(c.key)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="icon" className="h-8 w-8" title="Columns — reorder, show/hide, freeze" onClick={() => setColsOpen(true)}>
        <Columns3 className="h-3.5 w-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Download this tab as CSV">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasInput && <DropdownMenuItem className="text-sm" onClick={() => downloadCsv("input")}>Download {viewLabels?.input ?? "Input"}</DropdownMenuItem>}
          <DropdownMenuItem className="text-sm" onClick={() => downloadCsv("output")}>Download {viewLabels?.output ?? "Output"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="icon" className="h-8 w-8" title={inFull ? "Close fullscreen" : "Fullscreen"} onClick={() => setFull(!inFull)}>
        {inFull ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  )

  /** Row count, selection with its bulk actions, expand/collapse — shown next to the title (card and fullscreen). */
  const headlineExtras = (
    <>
      <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>
        {anyFilter ? `${sheetFiltered.toLocaleString("en-US")} of ${sheetTotal.toLocaleString("en-US")} rows` : `${sheetTotal.toLocaleString("en-US")} rows`}
      </span>
      {selectable && selRows.length > 0 && shown && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={cn(TAG, "border-primary/40 bg-primary/5 text-primary")}>
            {selRows.length} selected
            <button title="Clear selection" onClick={clearSel} className="hover:text-foreground"><X className="h-3 w-3" /></button>
          </span>
          {canEdit && <BulkEdit cols={editableCols} onApply={(key, value) => { selIds.forEach((id) => onEdit?.(shown.name, id, key, value)) }} count={selRows.length} />}
          {bulkActions?.({ sheet: shown.name, rowIds: selIds, clear: clearSel })}
          {canEdit && onDeleteRows && (
            <Button variant="outline" size="sm" className="h-7 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { onDeleteRows(shown.name, selIds); clearSel() }}>
              <Trash2 className="h-3 w-3" />Delete
            </Button>
          )}
        </span>
      )}
      {canEdit && onAddRow && shown && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => onAddRow(shown.name)}>
          <Plus className="h-3.5 w-3.5" />Add row
        </Button>
      )}
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
      {headerExtra}
    </>
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
      {canEdit && <span className="ml-auto flex items-center gap-1"><PencilLine className="h-3 w-3" />Click a cell to edit · Tab / Enter to move · Esc to cancel</span>}
      {!featuresOn && <span className="ml-auto italic">No header row — sort, filter and group need a cleaned header.</span>}
    </div>
  )

  const tabStrip = showTabs && sheets.length > 0 && (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4">
      {(effView === "input" ? sheets : outputSheets).map((s) => {
        const off = ignored.includes(s.name)
        const c = tabCounts[s.name]
        return (
          <button
            key={s.name}
            onClick={() => setSheet(s.name)}
            className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              shown?.name === s.name ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              off && "opacity-45")}
          >
            {s.name}
            {s.badge && <span className="text-[10px] font-normal text-muted-foreground">{s.badge}</span>}
            <span className={cn("rounded-full border px-1.5 text-[11px]", c?.active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted")}>
              {c?.active ? `${c.filtered}/${c.total}` : c?.total ?? 0}
            </span>
            {onToggleIgnore && (
              <span
                role="button"
                title={off ? "Include this tab in the output" : "Ignore this tab (excluded from output)"}
                onClick={(e) => { e.stopPropagation(); onToggleIgnore(s.name) }}
                className="text-muted-foreground hover:text-foreground"
              >
                {off ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  const noChange = diffCounts && diffCounts.added + diffCounts.changed + diffCounts.removed + diffCounts.colsAdded + diffCounts.colsRemoved === 0
  const body = (inFull: boolean) => (
    <>
      {tabStrip}
      {focusSet && focus && (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-1.5 text-xs">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-primary">Showing {visibleRows.length} row{visibleRows.length !== 1 ? "s" : ""} · {focus.label}</span>
          {onClearFocus && <button onClick={onClearFocus} className="ml-auto text-muted-foreground hover:text-foreground">Show all rows</button>}
        </div>
      )}
      {effView === "diff" && diffCounts && noChange && (
        <div className="flex items-center gap-1.5 border-b border-border bg-emerald-50/60 px-4 py-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-800">No changes — this tab&apos;s output matches its input.</span>
        </div>
      )}
      {effView === "diff" && diffCounts && !noChange && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Changes vs {viewLabels?.input?.toLowerCase() ?? "input"}:</span>
          {diffCounts.added > 0 && <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}>{diffCounts.added} row{diffCounts.added === 1 ? "" : "s"} added</span>}
          <span className={cn(TAG, "border-amber-300 bg-amber-50 text-amber-700")}>{diffCounts.changed} cell{diffCounts.changed === 1 ? "" : "s"} changed</span>
          {diffCounts.removed > 0 && <span className={cn(TAG, "border-red-200 bg-red-50 text-red-600")}>{diffCounts.removed} row{diffCounts.removed === 1 ? "" : "s"} removed</span>}
          {diffCounts.colsAdded > 0 && <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}>{diffCounts.colsAdded} column{diffCounts.colsAdded === 1 ? "" : "s"} added</span>}
          {diffCounts.colsRemoved > 0 && <span className={cn(TAG, "border-red-200 bg-red-50 text-red-600")}>{diffCounts.colsRemoved} column{diffCounts.colsRemoved === 1 ? "" : "s"} removed</span>}
        </div>
      )}
      {grid(inFull)}
      {footer}
    </>
  )

  if (!shown) return null
  return (
    <>
      <div className="min-w-0 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {headlineExtras}
          </div>
          {controls(false)}
        </div>
        {body(false)}
      </div>

      <ColumnsSheet
        open={colsOpen}
        onClose={() => setColsOpen(false)}
        columns={order.map((k) => ({ id: k, label: `${colByKey.get(k)?.letter ?? ""} · ${colByKey.get(k)?.label || "—"}` }))}
        order={order}
        onOrderChange={(o) => patchPrefs({ order: o })}
        hidden={hidden}
        onHiddenChange={(h) => patchPrefs({ hidden: [...h] })}
        frozen={frozen}
        onFrozenChange={(f) => patchPrefs({ frozen: [...f] })}
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

/** Bulk edit — set one column to one value on every selected row. */
function BulkEdit({ cols, count, onApply }: { cols: VMCol[]; count: number; onApply: (key: string, value: Cell) => void }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(cols[0]?.key ?? "")
  const [value, setValue] = useState("")
  const col = cols.find((c) => c.key === key)
  const apply = () => {
    if (!col) return
    const num = Number(value.replace(/,/g, ""))
    onApply(key, value.trim() === "" ? null : (col.type === "number" || col.type === "money") && Number.isFinite(num) ? num : value.trim())
    setOpen(false)
    setValue("")
  }
  const field = "h-8 w-full rounded-md border border-input bg-white px-2 text-sm outline-none focus:border-primary"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"><PencilLine className="h-3 w-3" />Edit {count}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3">
        <p className="text-xs font-semibold text-foreground">Set a value on {count} row{count > 1 ? "s" : ""}</p>
        <select value={key} onChange={(e) => { setKey(e.target.value); setValue("") }} className={field}>
          {cols.map((c) => <option key={c.key} value={c.key}>{c.label || c.letter}</option>)}
        </select>
        {col?.type === "select" ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} className={field}>
            <option value="">— Clear —</option>
            {(col.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : col?.type === "date" ? (
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
        ) : (
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value (empty clears)" className={field} onKeyDown={(e) => e.key === "Enter" && apply()} />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
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

"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ClipboardCheck, Download, Eye, FileStack, Loader2, MoreHorizontal, User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, FiltersDrawer, FilterDrawerField,
  FloatingBulkBar, BulkBarButton, MultiSortControl, ColumnsSheet, IdTag, COL_SEP, type SortLevel,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { PROJECT_DEVELOPERS } from "@/lib/projects-mock"
import {
  SHEET_ENTRIES, MANUAL_ENTRIES, SHEET_STAGES, MANUAL_STAGES, SHEET_FILE_TYPES, MANUAL_FILE_TYPES,
  type IngestionEntry, type IngestionMode,
} from "@/lib/ingestion-mock"

const TAG = "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
const STAGE_TONE: Record<string, string> = {
  Finalized: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Review: "border-amber-200 bg-amber-50 text-amber-700",
  "Final Check": "border-amber-200 bg-amber-50 text-amber-700",
}
const SOURCE_TONE: Record<string, string> = {
  WhatsApp: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Device: "border-blue-200 bg-blue-50 text-blue-700",
}
const CATEGORY_TONE: Record<string, string> = {
  Residential: "border-purple-200 bg-purple-50 text-purple-700",
  Commercial: "border-cyan-200 bg-cyan-50 text-cyan-700",
}

const ENTRY_COLS = [
  { id: "fileName", label: "File", width: 260 },
  { id: "developer", label: "Developer", width: 200 },
  { id: "projects", label: "Projects", width: 240 },
  { id: "stage", label: "Stage", width: 160 },
  { id: "uploadedBy", label: "Uploaded By", width: 160 },
  { id: "fileType", label: "File Type", width: 110 },
  { id: "source", label: "Source", width: 120 },
  { id: "categories", label: "Property Categories", width: 190 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
  { id: "finalizedAt", label: "Finalized At", width: 170 },
]
const SORT_FIELDS = [
  { key: "createdAt", label: "Created at" },
  { key: "updatedAt", label: "Updated at" },
  { key: "finalizedAt", label: "Finalized at" },
]
const SORTABLE_COLS = new Set(SORT_FIELDS.map((f) => f.key))
function sortVal(e: IngestionEntry, k: string) {
  const v = k === "createdAt" ? e.createdAt : k === "updatedAt" ? e.updatedAt : e.finalizedAt
  return v ? new Date(v).getTime() : -1
}

function StatCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">{icon}<span className="truncate text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold leading-6 text-foreground">
        {value}{total !== undefined && <span className="text-sm font-medium text-muted-foreground">/{total}</span>}
      </p>
    </div>
  )
}

/** Projects cell — first chips + "+N", tooltip lists every project grouped by main project. */
function ProjectsCell({ projects }: { projects: IngestionEntry["projects"] }) {
  const mains = projects.filter((p) => p.main === null)
  const groups = mains.map((m) => ({ main: m, phases: projects.filter((p) => p.main === m.name) }))
  const shown = mains.slice(0, 2)
  const hidden = projects.length - shown.length
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default flex-wrap items-center gap-1">
            {shown.map((p) => <ColorTag key={p.id} value={p.name} />)}
            {hidden > 0 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>+{hidden}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            {groups.map(({ main, phases }) => (
              <div key={main.id}>
                <p className="text-xs font-semibold">{main.name}</p>
                {phases.map((p) => <p key={p.id} className="pl-3 text-xs opacity-80">{p.name}</p>)}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Shared Data Ingestion entries table — Automatic Sheets Entries & Manual Grouped
 * Entries are the same experience with different titles, stages and file types.
 */
export function IngestionEntriesPage({ mode }: { mode: IngestionMode }) {
  const rows = mode === "sheets" ? SHEET_ENTRIES : MANUAL_ENTRIES
  const stages = mode === "sheets" ? [...SHEET_STAGES] : [...MANUAL_STAGES]
  const fileTypes = mode === "sheets" ? [...SHEET_FILE_TYPES] : [...MANUAL_FILE_TYPES]
  const title = mode === "sheets" ? "Automatic Sheets Entries" : "Manual Grouped Entries"
  const subtitle = mode === "sheets"
    ? "Inventory entries ingested automatically from developer sheets"
    : "Inventory entries grouped and entered manually by the team"

  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [stageF, setStageF] = useState<string[]>([])
  const [fileTypeF, setFileTypeF] = useState("")
  const [sourceF, setSourceF] = useState("")
  const [categoryF, setCategoryF] = useState<string[]>([])
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(ENTRY_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())

  const activeFilterCount = [fileTypeF, sourceF].filter(Boolean).length + [developerF, stageF, categoryF].filter((a) => a.length > 0).length
  const clearAllFilters = () => { setDeveloperF([]); setStageF([]); setFileTypeF(""); setSourceF(""); setCategoryF([]); setPage(1) }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter((e) => {
      if (needle && !`${e.fileName} ${e.id}`.toLowerCase().includes(needle)) return false
      if (developerF.length > 0 && !developerF.includes(e.developer.id)) return false
      if (stageF.length > 0 && !stageF.includes(e.stage)) return false
      if (fileTypeF && e.fileType !== fileTypeF) return false
      if (sourceF && e.source !== sourceF) return false
      if (categoryF.length > 0 && !categoryF.some((c) => e.categories.includes(c as never))) return false
      return true
    })
    if (sorts.length > 0) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const d = sortVal(a, s.key) - sortVal(b, s.key)
          if (d !== 0) return s.dir === "asc" ? d : -d
        }
        return 0
      })
    }
    return out
  }, [rows, q, developerF, stageF, fileTypeF, sourceF, categoryF, sorts])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => ENTRY_COLS.find((c) => c.id === id)!).filter(Boolean)
  const frozenLeft = (colId: string) => {
    let left = 40
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }
  const cycleHeaderSort = (key: string) =>
    setSorts((prev) => {
      const cur = prev.length === 1 && prev[0].key === key ? prev[0] : null
      if (!cur) return [{ key, dir: "asc" }]
      return cur.dir === "asc" ? [{ key, dir: "desc" }] : []
    })
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id))
  const togglePageSelect = (v: boolean) =>
    setSelectedIds((prev) => { const n = new Set(prev); pageRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id))); return n })
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Analytics — dynamic: follow the applied filters
  const finalized = filtered.filter((e) => e.stage === "Finalized").length
  const inReview = filtered.filter((e) => e.stage === "Review" || e.stage === "Final Check").length
  const inProgress = filtered.length - finalized - inReview

  const cellContent = (colId: string, e: IngestionEntry) => {
    switch (colId) {
      case "fileName":
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{e.fileName}</p>
            <IdTag value={e.id} />
          </div>
        )
      case "developer":
        return (
          <div className="flex items-center gap-2.5" onClick={(ev) => ev.stopPropagation()}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{e.developer.logo}</span>
            <div className="min-w-0">
              <a href={`/developers/${e.developer.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-foreground hover:text-primary hover:underline">{e.developer.name}</a>
              <IdTag value={e.developer.id} />
            </div>
          </div>
        )
      case "projects": return <ProjectsCell projects={e.projects} />
      case "stage": return STAGE_TONE[e.stage] ? <span className={cn(TAG, STAGE_TONE[e.stage])}>{e.stage}</span> : <ColorTag value={e.stage} />
      case "uploadedBy":
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />{e.uploadedBy}
          </span>
        )
      case "fileType": return <ColorTag value={e.fileType} />
      case "source": return <span className={cn(TAG, SOURCE_TONE[e.source])}>{e.source}</span>
      case "categories": return <div className="flex flex-wrap gap-1">{e.categories.map((c) => <span key={c} className={cn(TAG, CATEGORY_TONE[c])}>{c}</span>)}</div>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.updatedAt)}</span>
      case "finalizedAt": return e.finalizedAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.finalizedAt)}</span> : <span className="text-sm text-muted-foreground">—</span>
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Analytics — dynamic with the applied filters */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<FileStack className="h-4 w-4 text-primary" />} label="Total Entries" value={filtered.length} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Finalized" value={finalized} total={filtered.length} />
          <StatCard icon={<ClipboardCheck className="h-4 w-4 text-amber-500" />} label="In Review" value={inReview} total={filtered.length} />
          <StatCard icon={<Loader2 className="h-4 w-4 text-blue-600" />} label="In Progress" value={inProgress} total={filtered.length} />
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="File name or ID"
          hideAdvanced
          hideGroup
          onAllFilters={() => setShowFilters(true)}
          onColumns={() => setShowColumns(true)}
          activeFilters={activeFilterCount}
          filters={
            <>
              <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />
              <FilterMultiSelect label="Stage" value={stageF} options={stages} onChange={(v) => { setStageF(v); setPage(1) }} className="w-44" />
              <FilterSelect label="File Type" value={fileTypeF} options={fileTypes} onChange={(v) => { setFileTypeF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Source" value={sourceF} options={["WhatsApp", "Device"]} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Property Category" value={categoryF} options={["Residential", "Commercial"]} onChange={(v) => { setCategoryF(v); setPage(1) }} className="w-44" />
            </>
          }
          sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
        />

        <TableCard>
          <TableCardHeader title={title} count={filtered.length} />
          <div className="overflow-x-auto">
            <table className={cn("w-max min-w-full text-sm", COL_SEP)}>
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-20 w-10 bg-muted/60 py-3 pl-4 pr-0">
                    <Checkbox className="h-4 w-4" checked={allPageSelected} onCheckedChange={(v) => togglePageSelect(!!v)} />
                  </th>
                  {visibleCols.map((c) => {
                    const s = sorts.find((x) => x.key === c.id)
                    return (
                      <th
                        key={c.id}
                        className={cn("whitespace-nowrap px-4 py-3 text-left", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                      >
                        {SORTABLE_COLS.has(c.id) ? (
                          <button onClick={() => cycleHeaderSort(c.id)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                            {c.label}
                            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </button>
                        ) : c.label}
                      </th>
                    )
                  })}
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((e) => (
                  <tr key={e.id} className="group transition-colors hover:bg-muted/40">
                    <td className="sticky left-0 z-10 w-10 bg-card py-3 pl-4 pr-0">
                      <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} className="h-4 w-4" />
                    </td>
                    {visibleCols.map((c) => (
                      <td
                        key={c.id}
                        className={cn("px-4 py-3", frozenCols.has(c.id) && "sticky z-10 bg-card")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                      >
                        {cellContent(c.id, e)}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => toast.info("Entry details page is coming soon")}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.success(`${e.fileName} exported`)}><Download className="mr-2 h-3.5 w-3.5" />Export</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={visibleCols.length + 2} className="px-5 py-16 text-center text-sm text-muted-foreground">No entries match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="entries" />
        </TableCard>

        <FloatingBulkBar
          count={selectedIds.size}
          total={filtered.length}
          onSelectAll={() => setSelectedIds(new Set(filtered.map((e) => e.id)))}
          onClear={() => setSelectedIds(new Set())}
        >
          <BulkBarButton icon={<Download className="h-4 w-4" />} onClick={() => { toast.success(`${selectedIds.size} entr${selectedIds.size > 1 ? "ies" : "y"} exported to CSV`); setSelectedIds(new Set()) }}>Export</BulkBarButton>
        </FloatingBulkBar>

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
          <FilterDrawerField label="Developer">
            <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Stage">
            <FilterMultiSelect label="Stage" value={stageF} options={stages} onChange={(v) => { setStageF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="File Type">
            <FilterSelect label="File Type" value={fileTypeF} options={fileTypes} onChange={(v) => { setFileTypeF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Source">
            <FilterSelect label="Source" value={sourceF} options={["WhatsApp", "Device"]} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Property Category">
            <FilterMultiSelect label="Property Category" value={categoryF} options={["Residential", "Commercial"]} onChange={(v) => { setCategoryF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
        </FiltersDrawer>

        <ColumnsSheet
          open={showColumns}
          onClose={() => setShowColumns(false)}
          columns={ENTRY_COLS}
          order={colOrder}
          onOrderChange={setColOrder}
          hidden={hiddenCols}
          onHiddenChange={setHiddenCols}
          frozen={frozenCols}
          onFrozenChange={setFrozenCols}
        />
      </div>
    </div>
  )
}

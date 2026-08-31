"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  Archive, ArrowDown, ArrowUp, ArrowUpDown, Boxes, Building2, CheckCircle2, ChevronDown, ChevronsDownUp,
  ChevronsUpDown, Clock, Download, Eye, FileSpreadsheet, FileStack, FileText, FolderTree, Group as GroupIcon,
  MoreHorizontal, Plus, Rows3, ScanSearch, Timer, Upload, User as UserIcon, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FilePreviewDialog, type PreviewFile } from "@/components/file-preview-dialog"
import { cn } from "@/lib/utils"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, DateRangeFilter, FiltersDrawer, FilterDrawerField,
  FloatingBulkBar, BulkBarButton, MultiSortControl, ColumnsSheet, IdTag, COL_SEP, ProjectTreeSelect,
  type SortLevel, type ProjectTreeNode,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { PROJECT_DEVELOPERS, PROJECTS } from "@/lib/projects-mock"
import {
  ENTRIES, SHEET_STAGES, MANUAL_STAGES, SHEET_FILE_TYPES, MANUAL_FILE_TYPES,
  type IngestionEntry,
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

const ENTRY_COLS = [
  { id: "fileName", label: "File", width: 260 },
  { id: "developer", label: "Developer", width: 200 },
  { id: "projects", label: "Projects", width: 240 },
  { id: "saleType", label: "Sale Type", width: 120 },
  { id: "dataType", label: "Data Type", width: 170 },
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

/** White (uncolored) value tag — Projects & Property Categories cells. */
const WHITE_TAG = "border-border bg-card text-foreground"

/** Shared searchable project tree — same ids the entry mocks link to. */
const PROJECT_TREE: ProjectTreeNode[] = PROJECTS.filter((p) => !p.isPhase).map((p) => ({
  id: p.id,
  name: p.name,
  phases: PROJECTS.filter((ph) => ph.isPhase && ph.mainProject?.id === p.id).map((ph) => ({ id: ph.id, name: ph.name })),
}))

type GroupByKey = "none" | "developer" | "stage" | "saleType" | "dataType" | "user" | "fileType" | "source"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", developer: "Developer", stage: "Stage", saleType: "Sale Type", dataType: "Data Type",
  user: "User", fileType: "File Type", source: "Source",
}
function groupKeyOf(e: IngestionEntry, k: GroupByKey): string {
  switch (k) {
    case "developer": return e.developer?.name ?? "No developer"
    case "stage": return e.stage
    case "saleType": return e.saleType
    case "dataType": return e.dataType
    case "user": return e.uploadedBy
    case "fileType": return e.fileType
    case "source": return e.source
    default: return ""
  }
}

function fmtDur(sec: number) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(Math.floor(sec / 3600))}:${p(Math.floor((sec % 3600) / 60))}:${p(Math.floor(sec % 60))}`
}

/** The uploaded entry file → shared FilePreviewDialog file. */
function entryPreviewFile(e: IngestionEntry): PreviewFile {
  const typeGroup: PreviewFile["typeGroup"] = e.fileType === "Sheet" ? "Sheet" : e.fileType === "Image" ? "Image" : "Document"
  return {
    id: e.id,
    name: e.fileName,
    ext: e.fileName.split(".").pop()?.toUpperCase() ?? "",
    typeGroup,
    url: e.fileType === "Image" ? "/aerial-view-masterplan-residential-development-blu.jpg" : undefined,
    size: 1_400_000,
  }
}

/** The finalized output sheet of a finalized entry. */
function finalizedPreviewFile(e: IngestionEntry): PreviewFile {
  return { id: e.id, name: `${e.fileName.replace(/\.[^.]+$/, "")}-finalized.xlsx`, ext: "XLSX", typeGroup: "Sheet", size: 2_100_000 }
}

function StatCard({ icon, label, value, total, className }: { icon: React.ReactNode; label: string; value: React.ReactNode; total?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <div className="mb-1 flex items-center gap-2">{icon}<span title={label} className="truncate text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold leading-6 text-foreground">
        {value}{total !== undefined && <span className="text-sm font-medium text-muted-foreground">/{total}</span>}
      </p>
    </div>
  )
}

/** Projects cell — first chips + "+N", tooltip lists every project grouped by main project. */
function ProjectsCell({ projects }: { projects: IngestionEntry["projects"] }) {
  if (projects.length === 0) return <span className="text-sm italic text-muted-foreground">Not selected yet</span>
  // Group by parent — a phase may be in the entry without its main project (implied parent)
  const mainNames = [...new Set(projects.map((p) => p.main ?? p.name))]
  const groups = mainNames.map((name) => ({
    name,
    direct: projects.find((p) => p.main === null && p.name === name) ?? null,
    phases: projects.filter((p) => p.main === name),
  }))
  const mains = projects.filter((p) => p.main === null)
  const shown = (mains.length > 0 ? mains : projects).slice(0, 2)
  const hidden = projects.length - shown.length
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default flex-wrap items-center gap-1">
            {shown.map((p) => <span key={p.id} className={cn(TAG, WHITE_TAG)}>{p.name}</span>)}
            {hidden > 0 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>+{hidden}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            {groups.map(({ name, direct, phases }) => (
              <div key={name}>
                <p className="text-xs font-semibold">{name}{!direct && <span className="ml-1 font-normal italic opacity-70">(not in entry)</span>}</p>
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
export function IngestionEntriesPage({ onView }: { onView?: (entry: IngestionEntry) => void }) {
  const [rows, setRows] = useState<IngestionEntry[]>(() => ENTRIES)
  const stages = [...new Set([...SHEET_STAGES, ...MANUAL_STAGES])]
  const fileTypes = [...new Set([...SHEET_FILE_TYPES, ...MANUAL_FILE_TYPES])]
  const title = "Properties Bulk Ingestion"
  const subtitle = "Properties Inventory bulk ingestion entries"

  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [projectF, setProjectF] = useState<string[]>([])
  const [saleTypeF, setSaleTypeF] = useState<string[]>([])
  const [dataTypeF, setDataTypeF] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [stageF, setStageF] = useState<string[]>([])
  const [fileTypeF, setFileTypeF] = useState("")
  const [sourceF, setSourceF] = useState("")
  const [categoryF, setCategoryF] = useState<string[]>([])
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [finalizedFrom, setFinalizedFrom] = useState("")
  const [finalizedTo, setFinalizedTo] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(ENTRY_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const [summaryEntry, setSummaryEntry] = useState<IngestionEntry | null>(null)
  const [projectsDrawer, setProjectsDrawer] = useState<IngestionEntry | null>(null)
  const [archiveDlg, setArchiveDlg] = useState<{ entries: IngestionEntry[]; ignored: number } | null>(null)

  const activeFilterCount =
    [fileTypeF, sourceF, createdFrom || createdTo, finalizedFrom || finalizedTo].filter(Boolean).length +
    [developerF, projectF, saleTypeF, dataTypeF, stageF, categoryF].filter((a) => a.length > 0).length
  const clearAllFilters = () => {
    setDeveloperF([]); setProjectF([]); setSaleTypeF([]); setDataTypeF([]); setStageF([]); setFileTypeF(""); setSourceF(""); setCategoryF([])
    setCreatedFrom(""); setCreatedTo(""); setFinalizedFrom(""); setFinalizedTo(""); setPage(1)
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter((e) => {
      if (needle && !`${e.fileName} ${e.id}`.toLowerCase().includes(needle)) return false
      if (developerF.length > 0 && (!e.developer || !developerF.includes(e.developer.id))) return false
      if (projectF.length > 0 && !e.projects.some((p) => projectF.includes(p.id))) return false
      if (saleTypeF.length > 0 && !saleTypeF.includes(e.saleType)) return false
      if (dataTypeF.length > 0 && !dataTypeF.includes(e.dataType)) return false
      if (stageF.length > 0 && !stageF.includes(e.stage)) return false
      if (fileTypeF && e.fileType !== fileTypeF) return false
      if (sourceF && e.source !== sourceF) return false
      if (categoryF.length > 0 && !categoryF.some((c) => e.categories.includes(c as never))) return false
      if (createdFrom && e.createdAt.slice(0, 10) < createdFrom) return false
      if (createdTo && e.createdAt.slice(0, 10) > createdTo) return false
      if (finalizedFrom && (!e.finalizedAt || e.finalizedAt.slice(0, 10) < finalizedFrom)) return false
      if (finalizedTo && (!e.finalizedAt || e.finalizedAt.slice(0, 10) > finalizedTo)) return false
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
  }, [rows, q, developerF, projectF, saleTypeF, dataTypeF, stageF, fileTypeF, sourceF, categoryF, createdFrom, createdTo, finalizedFrom, finalizedTo, sorts])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const groups = useMemo(() => {
    if (groupBy === "none") return null
    const map = new Map<string, IngestionEntry[]>()
    for (const e of filtered) {
      const k = groupKeyOf(e, groupBy)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()].map(([label, rs]) => ({ label, rows: rs }))
  }, [filtered, groupBy])
  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })

  // Grouping opens only the first group; the rest start collapsed
  useEffect(() => {
    setCollapsedGroups(new Set((groups ?? []).slice(1).map((g) => g.label)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy])

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
  // Header checkbox scope = rows currently rendered (page in flat mode, all groups when grouped)
  const renderedRows = groups ? filtered : pageRows
  const allPageSelected = renderedRows.length > 0 && renderedRows.every((r) => selectedIds.has(r.id))
  const togglePageSelect = (v: boolean) =>
    setSelectedIds((prev) => { const n = new Set(prev); renderedRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id))); return n })
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Analytics — dynamic with the applied filters; finalized-scoped metrics per spec
  const fin = filtered.filter((e) => e.stage === "Finalized")
  const finDevelopers = new Set(fin.map((e) => e.developer?.id).filter(Boolean)).size
  const finParents = new Set(fin.flatMap((e) => e.projects.map((p) => p.main ?? p.name))).size
  const groupedProps = fin.reduce((s, e) => s + e.groupedProperties, 0)
  const detailedProps = fin.reduce((s, e) => s + e.detailedProperties, 0)
  const avgOf = (get: (e: IngestionEntry) => number) => (fin.length ? Math.round(fin.reduce((s, e) => s + get(e), 0) / fin.length) : 0)

  const archiveConfirmed = () => {
    if (!archiveDlg) return
    const ids = new Set(archiveDlg.entries.map((e) => e.id))
    setRows((prev) => prev.filter((e) => !ids.has(e.id)))
    setSelectedIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n })
    setArchiveDlg(null)
    toast.success(`${ids.size} entr${ids.size > 1 ? "ies" : "y"} archived`)
  }

  const requestBulkArchive = () => {
    const sel = filtered.filter((e) => selectedIds.has(e.id))
    const targets = sel.filter((e) => e.stage !== "Finalized")
    if (targets.length === 0) { toast.info("All selected entries are finalized — nothing to archive"); return }
    setArchiveDlg({ entries: targets, ignored: sel.length - targets.length })
  }

  const exportCsv = () => {
    const sel = filtered.filter((e) => selectedIds.has(e.id))
    if (sel.length === 0) return
    const csvCell = (colId: string, e: IngestionEntry): string => {
      switch (colId) {
        case "fileName": return `${e.fileName} (${e.id})`
        case "developer": return e.developer?.name ?? ""
        case "projects": return e.projects.map((p) => p.name).join("; ")
        case "stage": return e.stage
        case "saleType": return e.saleType
        case "dataType": return e.dataType
        case "uploadedBy": return e.uploadedBy
        case "fileType": return e.fileType
        case "source": return e.source
        case "categories": return e.categories.join("; ")
        case "createdAt": return fmtDateTime(e.createdAt)
        case "updatedAt": return fmtDateTime(e.updatedAt)
        case "finalizedAt": return e.finalizedAt ? fmtDateTime(e.finalizedAt) : ""
        default: return ""
      }
    }
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [
      visibleCols.map((c) => esc(c.label)).join(","),
      ...sel.map((e) => visibleCols.map((c) => esc(csvCell(c.id, e))).join(",")),
    ].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-export.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`${sel.length} entr${sel.length > 1 ? "ies" : "y"} exported to CSV`)
  }

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
        if (!e.developer) return <span className="text-sm italic text-muted-foreground">Not selected yet</span>
        return (
          <div className="flex items-center gap-2.5" onClick={(ev) => ev.stopPropagation()}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{e.developer.logo}</span>
            <div className="min-w-0">
              <a href={`/developers/${e.developer.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-foreground hover:text-primary hover:underline">{e.developer.name}</a>
              <IdTag value={e.developer.id} />
            </div>
          </div>
        )
      case "projects":
        return (
          <div className="flex items-center justify-between gap-2">
            <ProjectsCell projects={e.projects} />
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 flex-shrink-0 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              title="View entry projects"
              onClick={(ev) => { ev.stopPropagation(); setProjectsDrawer(e) }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      case "saleType": return <ColorTag value={e.saleType} />
      case "dataType": return <ColorTag value={e.dataType} />
      case "stage": return STAGE_TONE[e.stage] ? <span className={cn(TAG, STAGE_TONE[e.stage])}>{e.stage}</span> : <ColorTag value={e.stage} />
      case "uploadedBy":
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />{e.uploadedBy}
          </span>
        )
      case "fileType": return <ColorTag value={e.fileType} />
      case "source": return <span className={cn(TAG, SOURCE_TONE[e.source])}>{e.source}</span>
      case "categories": return <div className="flex flex-wrap gap-1">{e.categories.map((c) => <span key={c} className={cn(TAG, WHITE_TAG)}>{c}</span>)}</div>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.updatedAt)}</span>
      case "finalizedAt": return e.finalizedAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(e.finalizedAt)}</span> : <span className="text-sm text-muted-foreground">—</span>
      default: return null
    }
  }

  const renderRow = (e: IngestionEntry) => {
    const isFin = e.stage === "Finalized"
    return (
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => (onView ? onView(e) : toast.info("Entry details page is coming soon"))}><Eye className="mr-2 h-3.5 w-3.5" />View Entry details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreview(entryPreviewFile(e))}><FileText className="mr-2 h-3.5 w-3.5" />View Original File</DropdownMenuItem>
              <DropdownMenuItem disabled={!isFin} onClick={() => setPreview(finalizedPreviewFile(e))}><FileSpreadsheet className="mr-2 h-3.5 w-3.5" />View Finalized Sheet</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSummaryEntry(e)}><ScanSearch className="mr-2 h-3.5 w-3.5" />View Entry Summary</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isFin} className="text-red-600 focus:text-red-600" onClick={() => setArchiveDlg({ entries: [e], ignored: 0 })}>
                <Archive className="mr-2 h-3.5 w-3.5" />Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Analytics — dynamic with the applied filters; property & time cards read finalized entries */}
        {/* One row on xl: 7 cards on sheets, 6 on manual (no Detailed Properties there) */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Finalized Entries" value={fin.length} />
          <StatCard icon={<Building2 className="h-4 w-4 text-blue-600" />} label="Developers" value={finDevelopers} />
          <StatCard icon={<FolderTree className="h-4 w-4 text-purple-600" />} label="Parent Projects" value={finParents} />
          <StatCard icon={<Boxes className="h-4 w-4 text-amber-500" />} label="Grouped Properties" value={groupedProps.toLocaleString("en-US")} />
          <StatCard icon={<Rows3 className="h-4 w-4 text-cyan-600" />} label="Detailed Properties" value={detailedProps.toLocaleString("en-US")} />
          <StatCard icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Avg Total Time" value={fmtDur(avgOf((e) => e.totalTimeSec))} />
          <StatCard icon={<Timer className="h-4 w-4 text-muted-foreground" />} label="Avg Active Time" value={fmtDur(avgOf((e) => e.activeTimeSec))} />
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="File name or ID"
          hideAdvanced
          groupControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(GROUP_LABEL) as GroupByKey[]).map((k) => (
                  <DropdownMenuItem key={k} className="text-sm" onClick={() => { setGroupBy(k); setCollapsedGroups(new Set()) }}>
                    {k === "none" ? "No grouping" : GROUP_LABEL[k]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
          onAllFilters={() => setShowFilters(true)}
          onColumns={() => setShowColumns(true)}
          activeFilters={activeFilterCount}
          filters={
            <>
              <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />
              <ProjectTreeSelect multi projects={PROJECT_TREE} values={projectF} onValuesChange={(v) => { setProjectF(v); setPage(1) }} className="w-48" />
              <FilterMultiSelect label="Sale Type" value={saleTypeF} options={["Primary", "Launch", "Resale", "Nawy Now"]} onChange={(v) => { setSaleTypeF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Data Type" value={dataTypeF} options={["Structured Detailed", "Unstructured Grouped"]} onChange={(v) => { setDataTypeF(v); setPage(1) }} className="w-48" />
              <FilterMultiSelect label="Stage" value={stageF} options={stages} onChange={(v) => { setStageF(v); setPage(1) }} className="w-44" />
              <FilterSelect label="File Type" value={fileTypeF} options={fileTypes} onChange={(v) => { setFileTypeF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Source" value={sourceF} options={["WhatsApp", "Device"]} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Property Category" value={categoryF} options={["Residential", "Commercial"]} onChange={(v) => { setCategoryF(v); setPage(1) }} className="w-44" />
              <DateRangeFilter label="Created At Range" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} />
              <DateRangeFilter label="Finalized At Range" dateFrom={finalizedFrom} dateTo={finalizedTo} onChangeFrom={(v) => { setFinalizedFrom(v); setPage(1) }} onChangeTo={(v) => { setFinalizedTo(v); setPage(1) }} />
            </>
          }
          sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
        />

        <TableCard>
          <TableCardHeader
            title="Properties ingestion entries"
            count={filtered.length}
            cta={
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />Add Entry
              </Button>
            }
            extra={groupBy !== "none" ? (
              <div className="ml-2 flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCollapsedGroups(new Set())}>
                  <ChevronsUpDown className="h-3.5 w-3.5" />Expand all
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCollapsedGroups(new Set((groups ?? []).map((g) => g.label)))}>
                  <ChevronsDownUp className="h-3.5 w-3.5" />Collapse all
                </Button>
              </div>
            ) : undefined}
          />
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
                {groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer border-y border-border bg-muted/40 transition-colors hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={visibleCols.length + 2} className="p-0">
                          <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                            <span className="text-sm font-semibold text-foreground">{g.label}</span>
                            <span className="text-xs text-muted-foreground">{g.rows.length} entr{g.rows.length !== 1 ? "ies" : "y"}</span>
                          </div>
                        </td>
                      </tr>
                      {!collapsedGroups.has(g.label) && g.rows.map(renderRow)}
                    </Fragment>
                  ))
                ) : (
                  pageRows.map(renderRow)
                )}
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
          <BulkBarButton icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export</BulkBarButton>
          <BulkBarButton icon={<Archive className="h-4 w-4" />} danger onClick={requestBulkArchive}>Archive</BulkBarButton>
        </FloatingBulkBar>

        {preview && <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />}
        <EntrySummarySheet entry={summaryEntry} onClose={() => setSummaryEntry(null)} />
        <EntryProjectsDrawer entry={projectsDrawer} onClose={() => setProjectsDrawer(null)} />
        <ArchiveDialog dlg={archiveDlg} onClose={() => setArchiveDlg(null)} onConfirm={archiveConfirmed} />
        <AddEntryDialog open={addOpen} onClose={() => setAddOpen(false)} />

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
          <FilterDrawerField label="Developer">
            <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Project">
            <ProjectTreeSelect multi projects={PROJECT_TREE} values={projectF} onValuesChange={(v) => { setProjectF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Sale Type">
            <FilterMultiSelect label="Sale Type" value={saleTypeF} options={["Primary", "Launch", "Resale", "Nawy Now"]} onChange={(v) => { setSaleTypeF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Data Type">
            <FilterMultiSelect label="Data Type" value={dataTypeF} options={["Structured Detailed", "Unstructured Grouped"]} onChange={(v) => { setDataTypeF(v); setPage(1) }} className="w-full" width="w-full" />
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
          <FilterDrawerField label="Created At Range">
            <DateRangeFilter label="Created At Range" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Finalized At Range">
            <DateRangeFilter label="Finalized At Range" dateFrom={finalizedFrom} dateTo={finalizedTo} onChangeFrom={(v) => { setFinalizedFrom(v); setPage(1) }} onChangeTo={(v) => { setFinalizedTo(v); setPage(1) }} className="w-full" />
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

/* ── Archive confirmation — lists the entries that will be archived ─────────── */

function ArchiveDialog({ dlg, onClose, onConfirm }: {
  dlg: { entries: IngestionEntry[]; ignored: number } | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!dlg) return null
  const n = dlg.entries.length
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-lg font-bold text-foreground">Archive {n} entr{n > 1 ? "ies" : "y"}?</DialogTitle>
        <p className="text-sm text-muted-foreground">Archived entries are removed from the active list. Uploaded files are kept and can be restored by an admin.</p>
        {dlg.ignored > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {dlg.ignored} finalized entr{dlg.ignored > 1 ? "ies were" : "y was"} ignored — finalized entries cannot be archived.
          </div>
        )}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {dlg.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{e.fileName}</p>
                <IdTag value={e.id} />
              </div>
              {STAGE_TONE[e.stage] ? <span className={cn(TAG, STAGE_TONE[e.stage])}>{e.stage}</span> : <ColorTag value={e.stage} />}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Archive</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Entry processing summary drawer (finalized entries) ────────────────────── */

function DistRow({ label, right, pct, color }: { label: string; right: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-medium text-foreground">{right}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const SUMMARY_BREAKDOWN = [
  { label: "New", pct: 42, units: 220, color: "bg-emerald-500" },
  { label: "Modified", pct: 28, units: 98, color: "bg-orange-400" },
  { label: "Unmodified", pct: 16, units: 134, color: "bg-slate-400" },
  { label: "Missing units", pct: 10, units: 16, color: "bg-red-500" },
  { label: "Returned units", pct: 4, units: 9, color: "bg-blue-500" },
]
const SUMMARY_TYPES = [
  { label: "Apartment", pct: 42, units: 21, color: "bg-blue-500" },
  { label: "Villa", pct: 28, units: 14, color: "bg-emerald-500" },
  { label: "Townhouse", pct: 16, units: 8, color: "bg-amber-500" },
  { label: "Studio", pct: 10, units: 5, color: "bg-purple-500" },
  { label: "Penthouse", pct: 4, units: 2, color: "bg-red-500" },
]

function EntrySummarySheet({ entry, onClose }: { entry: IngestionEntry | null; onClose: () => void }) {
  if (!entry) return null
  const mains = entry.projects.filter((p) => p.main === null)
  const projCounts = [149, 231, 171, 171]
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-lg font-bold text-foreground">Processing summary</SheetTitle>
          <SheetDescription className="truncate text-sm text-muted-foreground">{entry.fileName}</SheetDescription>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/60 px-4 py-3">
            <span className="text-2xl font-bold text-foreground">98%</span>
            <span className="text-sm font-semibold text-foreground">Data quality check</span>
          </div>
          <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50/50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-700">Warning issues <span className={cn(TAG, "border-amber-300 bg-white text-amber-700")}>33 issues</span></p>
            <p className="flex items-center gap-2 text-sm text-amber-800">Missing Building name <span className={cn(TAG, "border-amber-300 bg-white text-amber-700")}>23 Units</span></p>
            <p className="flex items-center gap-2 text-sm text-amber-800">Missing floor number <span className={cn(TAG, "border-amber-300 bg-white text-amber-700")}>10 Units</span></p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold text-foreground">Units Breakdown</p>
            <div className="space-y-3">
              {SUMMARY_BREAKDOWN.map((r) => <DistRow key={r.label} label={r.label} right={`${r.pct}% (${r.units} units)`} pct={r.pct} color={r.color} />)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold text-foreground">Projects Distribution</p>
            <div className="space-y-3">
              {mains.map((m, i) => (
                <DistRow key={m.id} label={m.name} right={`${projCounts[i % projCounts.length]} Units`} pct={30 + ((i * 20) % 60)} color="bg-blue-500" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold text-foreground">Property Types Distribution</p>
            <div className="space-y-3">
              {SUMMARY_TYPES.map((r) => <DistRow key={r.label} label={r.label} right={`${r.pct}% (${r.units} units)`} pct={r.pct} color={r.color} />)}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Entry projects drawer — projects & phases linked to one entry ──────────── */

const LISTING_TONE: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-600",
}
const PRIMARY_TONE: Record<string, string> = {
  Launch: "border-green-200 bg-green-50 text-green-700",
  "On-Sale": "border-emerald-200 bg-emerald-100 text-emerald-700",
  "On-Hold": "border-orange-200 bg-orange-50 text-orange-700",
  "Sold-Off": "border-red-200 bg-red-50 text-red-600",
}
const ENTRY_TYPE_TONE: Record<string, string> = {
  Automatic: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Manual: "border-blue-200 bg-blue-100 text-blue-700",
}
const ORG_TONE: Record<string, string> = {
  Nawy: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Partners: "border-blue-200 bg-blue-100 text-blue-700",
}

/** Status tags trio for a project/phase row, from the projects mock. */
function ProjStatusTags({ id, name }: { id?: string; name?: string }) {
  const row = (id ? PROJECTS.find((r) => r.id === id) : undefined) ?? (name ? PROJECTS.find((r) => !r.isPhase && r.name === name) : undefined)
  if (!row) return null
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
      <span className={cn(TAG, LISTING_TONE[row.listingStatus])}>{row.listingStatus}</span>
      <span className={cn(TAG, PRIMARY_TONE[row.primaryStatus])}>{row.primaryStatus}</span>
      <span className={cn(TAG, ENTRY_TYPE_TONE[row.entryType])}>{row.entryType}</span>
    </div>
  )
}

export function EntryProjectsDrawer({ entry, onClose }: { entry: IngestionEntry | null; onClose: () => void }) {
  if (!entry) return null
  const dev = entry.developer
  const devFull = dev ? PROJECT_DEVELOPERS.find((d) => d.id === dev.id) : undefined
  const devOrg = dev ? (Number(dev.id.replace(/\D/g, "")) % 2 === 0 ? "Partners" : "Nawy") : null

  // Group by parent project — mains not picked in the entry are only implied by their phases
  const mainNames = [...new Set(entry.projects.map((p) => p.main ?? p.name))]
  const groups = mainNames.map((name) => ({
    name,
    direct: entry.projects.find((p) => p.main === null && p.name === name) ?? null,
    phases: entry.projects.filter((p) => p.main === name),
  }))

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b border-border bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-bold text-foreground">Entry projects</SheetTitle>
            <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-100 text-blue-700")}>{entry.projects.length}</span>
          </div>
          <SheetDescription className="sr-only">Projects and phases linked to this entry</SheetDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Entry snippet — file+ID, user & created at, developer with org + status */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">File</p>
              <p className="truncate text-sm font-medium text-foreground" title={entry.fileName}>{entry.fileName}</p>
              <IdTag value={entry.id} />
            </div>
            <div className="grid grid-cols-2 gap-x-6 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Uploaded by</p>
                <p className="truncate text-sm font-medium text-foreground">{entry.uploadedBy}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created at</p>
                <p className="text-sm font-medium text-foreground">{fmtDateTime(entry.createdAt)}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Developer</p>
              {dev ? (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{dev.logo}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{dev.name}</p>
                    <IdTag value={dev.id} />
                  </div>
                  <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                    {devOrg && <span className={cn(TAG, ORG_TONE[devOrg])}>{devOrg}</span>}
                    {devFull?.status && <span className={cn(TAG, LISTING_TONE[devFull.status])}>{devFull.status}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">Not selected yet</p>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>

          {/* Projects grouped by main project */}
          {entry.projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <FolderTree className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold text-foreground">No projects selected yet</p>
              <p className="text-xs text-muted-foreground">This entry is still in its initial setup — projects appear here once selected.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* Main project row — subtly muted with a caption when it wasn't picked in this entry */}
                <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5", !g.direct && "bg-muted/20")}>
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-semibold", g.direct ? "text-foreground" : "text-muted-foreground")}>{g.name}</p>
                    <span className="flex items-center gap-1.5">
                      <IdTag value={g.direct?.id ?? PROJECTS.find((r) => !r.isPhase && r.name === g.name)?.id ?? "—"} />
                      {!g.direct && <span className="text-[11px] italic text-muted-foreground">Not in this entry</span>}
                    </span>
                  </div>
                  <ProjStatusTags id={g.direct?.id} name={g.name} />
                </div>
                {g.phases.length > 0 && (
                  <div className="divide-y divide-border">
                    {g.phases.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 pl-8 pr-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                          <IdTag value={p.id} />
                        </div>
                        <ProjStatusTags id={p.id} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Add Entry — upload the files that start a new ingestion entry ──────────── */

function AddEntryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([])
  const close = () => { setFiles([]); onClose() }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-lg font-bold text-foreground">Add Entry</DialogTitle>
        <p className="text-sm text-muted-foreground">Upload the sheet, PDF, image or text files for this entry. Setup continues inside the entry after upload.</p>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/30">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Drag &amp; drop files here, or click to browse</span>
          <span className="text-xs text-muted-foreground">XLSX, CSV, PDF, PNG, JPG, TXT — up to 25 MB each</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = [...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size }))
              if (picked.length) setFiles((prev) => [...prev, ...picked])
              e.target.value = ""
            }}
          />
        </label>
        {files.length > 0 && (
          <div className="max-h-44 space-y-1.5 overflow-y-auto">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">{f.name}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{f.size >= 1_000_000 ? `${(f.size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1_000))} KB`}</span>
                  <button className="text-muted-foreground hover:text-red-600" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={files.length === 0} onClick={() => { toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded — entry created`); close() }}>
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

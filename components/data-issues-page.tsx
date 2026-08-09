"use client"

import { Fragment, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsDownUp, ChevronsUpDown, CircleDot, Clock, Eye, LayoutGrid, Loader2, MoreHorizontal, Send, UserRound, Users, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterMultiSelect, DateRangeFilter, FiltersDrawer,
  FilterDrawerField, FloatingBulkBar, MultiSortControl, ColumnsSheet, GroupPager, IdTag, COL_SEP, type SortLevel,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { ViewPropertyDrawer, createRows } from "@/components/all-properties-page"
import {
  PROPERTY_ISSUES, PROP_ISSUE_STATUSES, STATUS_COLORS, SEVERITY_COLORS, SOURCE_COLORS, ISSUE_FIELDS, KIND_TAXONOMY,
  QUALITY_TEAM, ALL_PEOPLE, type PropertyIssue, type PropIssueStatus,
} from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

// ── Tags ──────────────────────────────────────────────────────────────────────
export function IssueStatusTag({ status, chevron }: { status: PropIssueStatus; chevron?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
      {status}
      {chevron && <ChevronDown className="h-3 w-3 opacity-60" />}
    </span>
  )
}
export function IssueSeverityTag({ severity }: { severity: PropertyIssue["severity"] }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[severity])}>{severity}</span>
}
export function IssueSourceTag({ source }: { source: PropertyIssue["source"] }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS[source])}>{source}</span>
}

const ALL_TYPES = Array.from(new Set(Object.values(KIND_TAXONOMY).flat().map((t) => t.type)))
const PROJECT_OPTIONS = ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"]
const PHASE_OPTIONS = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"]

const COLS = [
  { id: "id", label: "Issue ID", width: 130 },
  { id: "source", label: "Source", width: 100 },
  { id: "severity", label: "Severity", width: 110 },
  { id: "status", label: "Status", width: 140 },
  { id: "field", label: "Category (Field)", width: 150 },
  { id: "type", label: "Type", width: 150 },
  { id: "subtype", label: "Subtype", width: 190 },
  { id: "description", label: "Description", width: 260 },
  { id: "expected", label: "Expected", width: 170 },
  { id: "assignedTo", label: "Assigned To", width: 150 },
  { id: "reportedBy", label: "Reported By", width: 130 },
  { id: "developer", label: "Developer", width: 150 },
  { id: "project", label: "Project", width: 180 },
  { id: "phase", label: "Phase", width: 120 },
  { id: "propertyId", label: "Property ID", width: 130 },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 160 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
  { id: "resolvedAt", label: "Resolved At", width: 170 },
  { id: "closedAt", label: "Closed At", width: 170 },
]
const DEFAULT_HIDDEN = new Set(["subtype", "developer", "detailedPropertyId", "updatedAt"])

const SORT_FIELDS = [
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "resolvedAt", label: "Resolved At" },
  { key: "closedAt", label: "Closed At" },
  { key: "status", label: "Status" },
  { key: "severity", label: "Severity" },
  { key: "field", label: "Category (Field)" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "reportedBy", label: "Reported By" },
]
const SORTABLE_COLS = new Set(SORT_FIELDS.map((f) => f.key))

type GroupByKey = "none" | "status" | "severity" | "field" | "project" | "assignedTo" | "source"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", status: "Status", severity: "Severity", field: "Category (Field)", project: "Project", assignedTo: "Assigned To", source: "Source",
}

function getSortValue(r: PropertyIssue, key: string): string | number {
  switch (key) {
    case "createdAt": return r.createdAt
    case "updatedAt": return r.updatedAt
    case "resolvedAt": return r.resolvedAt ?? ""
    case "closedAt": return r.closedAt ?? ""
    case "status": return PROP_ISSUE_STATUSES.indexOf(r.status)
    case "severity": return r.severity === "Blocking" ? 0 : 1
    case "field": return r.fieldLabel
    case "assignedTo": return r.assignedTo ?? ""
    case "reportedBy": return r.reportedBy
    default: return ""
  }
}

function groupKeyOf(r: PropertyIssue, key: GroupByKey): string {
  switch (key) {
    case "status": return r.status
    case "severity": return r.severity
    case "field": return r.fieldLabel
    case "project": return r.project.name
    case "assignedTo": return r.assignedTo ?? "Unassigned"
    case "source": return r.source
    default: return ""
  }
}

function StatCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">{icon}<span className="truncate text-xs text-muted-foreground">{label}</span></div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-xl font-bold leading-6 text-foreground">{value.toLocaleString()}</p>
        {total != null && total > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">{Math.round((value / total) * 100)}%</span>
        )}
      </div>
    </div>
  )
}

/** Apply a status change with its timestamp side effects. */
export function statusPatch(next: PropIssueStatus): Partial<PropertyIssue> {
  const now = new Date().toISOString()
  return {
    status: next,
    updatedAt: now,
    ...(next === "Resolved" ? { resolvedAt: now, closedAt: null } : {}),
    ...(next === "Closed" ? { closedAt: now } : {}),
    ...(next === "To Do" || next === "In Progress" ? { resolvedAt: null, closedAt: null } : {}),
    ...(next === "Invalid" ? { resolvedAt: null, closedAt: null } : {}),
  }
}

export function DataIssuesPage() {
  // Local copy for rendering; edits are written back into the module store so
  // properties views see the same state during this session. (mock)
  const [issues, setIssues] = useState<PropertyIssue[]>(() => [...PROPERTY_ISSUES])
  const [tab, setTab] = useState<"Property" | "Project" | "Developer">("Property")

  // toolbar state
  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [severityF, setSeverityF] = useState<string[]>([])
  const [sourceF, setSourceF] = useState<string[]>([])
  const [fieldF, setFieldF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [reporterF, setReporterF] = useState<string[]>([])
  const [assigneeF, setAssigneeF] = useState<string[]>([])
  const [projectF, setProjectF] = useState<string[]>([])
  const [phaseF, setPhaseF] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([{ key: "createdAt", dir: "desc" }])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set(DEFAULT_HIDDEN))
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [trackIssue, setTrackIssue] = useState<PropertyIssue | null>(null)
  const [viewProperty, setViewProperty] = useState<PropertyIssue | null>(null)

  const propertyRows = useMemo(() => createRows(), [])
  const propertyById = useMemo(() => new Map(propertyRows.map((r) => [r.propertyId, r])), [propertyRows])

  const activeFilterCount =
    [statusF, severityF, sourceF, fieldF, typeF, reporterF, assigneeF, projectF, phaseF].filter((f) => f.length > 0).length +
    (dateFrom || dateTo ? 1 : 0)

  const clearAllFilters = () => {
    setStatusF([]); setSeverityF([]); setSourceF([]); setFieldF([]); setTypeF([]); setReporterF([]); setAssigneeF([])
    setProjectF([]); setPhaseF([]); setDateFrom(""); setDateTo(""); setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = issues
    const needle = q.trim().toLowerCase()
    if (needle) {
      rows = rows.filter((r) =>
        [r.id, r.description, r.fieldLabel, r.type, r.subtype, r.expected, r.project.name, r.phase?.name, r.developer.name, r.propertyId, r.detailedPropertyId, r.reportedBy, r.assignedTo]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      )
    }
    if (statusF.length) rows = rows.filter((r) => statusF.includes(r.status))
    if (severityF.length) rows = rows.filter((r) => severityF.includes(r.severity))
    if (sourceF.length) rows = rows.filter((r) => sourceF.includes(r.source))
    if (fieldF.length) rows = rows.filter((r) => fieldF.includes(r.fieldLabel))
    if (typeF.length) rows = rows.filter((r) => typeF.includes(r.type))
    if (reporterF.length) rows = rows.filter((r) => reporterF.includes(r.reportedBy))
    if (assigneeF.length) rows = rows.filter((r) => (r.assignedTo ? assigneeF.includes(r.assignedTo) : assigneeF.includes("Unassigned")))
    if (projectF.length) rows = rows.filter((r) => projectF.includes(r.project.name))
    if (phaseF.length) rows = rows.filter((r) => r.phase != null && phaseF.includes(r.phase.name))
    if (dateFrom) rows = rows.filter((r) => r.createdAt >= new Date(dateFrom).toISOString())
    if (dateTo) rows = rows.filter((r) => r.createdAt <= new Date(dateTo).toISOString())
    if (sorts.length) {
      rows = [...rows].sort((a, b) => {
        for (const s of sorts) {
          const av = getSortValue(a, s.key); const bv = getSortValue(b, s.key)
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp
        }
        return 0
      })
    }
    return rows
  }, [issues, q, statusF, severityF, sourceF, fieldF, typeF, reporterF, assigneeF, projectF, phaseF, dateFrom, dateTo, sorts])

  const groups = useMemo(() => {
    if (groupBy === "none") return null
    const map = new Map<string, PropertyIssue[]>()
    for (const r of filtered) {
      const k = groupKeyOf(r, groupBy)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return Array.from(map.entries()).map(([label, rows]) => ({ label, rows }))
  }, [filtered, groupBy])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const visibleCols = colOrder
    .filter((id) => !hiddenCols.has(id))
    .map((id) => COLS.find((c) => c.id === id)!)
    .filter(Boolean)

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

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const togglePageSelect = (v: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev)
      pageRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)))
      return n
    })
  const toggleRow = (id: string, v: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (v) n.add(id); else n.delete(id)
      return n
    })

  /** Patch issues by id — updates render state AND the shared module store. */
  const patchIssues = (ids: Set<string>, patch: (r: PropertyIssue) => Partial<PropertyIssue>) => {
    setIssues((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, ...patch(r) } : r)))
    for (const stored of PROPERTY_ISSUES) {
      if (ids.has(stored.id)) Object.assign(stored, patch(stored))
    }
    setTrackIssue((cur) => (cur && ids.has(cur.id) ? { ...cur, ...patch(cur) } : cur))
  }

  const setStatus = (ids: Set<string>, next: PropIssueStatus) => {
    patchIssues(ids, () => statusPatch(next))
    toast.success(`${ids.size > 1 ? `${ids.size} issues` : "Issue"} moved to ${next}`)
  }
  const setAssignee = (ids: Set<string>, person: string | null) => {
    patchIssues(ids, () => ({ assignedTo: person, updatedAt: new Date().toISOString() }))
    toast.success(person ? `Assigned to ${person}` : "Unassigned")
  }

  const count = (s: PropIssueStatus) => filtered.filter((r) => r.status === s).length

  const StatusCell = ({ r }: { r: PropertyIssue }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer"><IssueStatusTag status={r.status} chevron /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {PROP_ISSUE_STATUSES.filter((s) => s !== r.status).map((s) => (
          <DropdownMenuItem key={s} onClick={() => setStatus(new Set([r.id]), s)}>
            <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const AssigneeCell = ({ r }: { r: PropertyIssue }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 whitespace-nowrap text-sm hover:text-foreground">
          {r.assignedTo ?? <span className="text-muted-foreground">Unassigned</span>}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto">
        {ALL_PEOPLE.map((p) => (
          <DropdownMenuItem key={p} onClick={() => setAssignee(new Set([r.id]), p)}>{p}</DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setAssignee(new Set([r.id]), null)}>Unassigned</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderCell = (r: PropertyIssue, colId: string) => {
    switch (colId) {
      case "id": return <IdTag value={r.id} />
      case "source": return <IssueSourceTag source={r.source} />
      case "severity": return <IssueSeverityTag severity={r.severity} />
      case "status": return <StatusCell r={r} />
      case "field": return <ColorTag value={r.fieldLabel} />
      case "type": return <ColorTag value={r.type} />
      case "subtype": return <span className="block max-w-[190px] truncate text-sm" title={r.subtype}>{r.subtype}</span>
      case "description": return <span className="block max-w-[260px] truncate text-sm" title={r.description}>{r.description}</span>
      case "expected": return r.expected ? <span className="block max-w-[170px] truncate text-sm" title={r.expected}>{r.expected}</span> : <span className="text-muted-foreground">—</span>
      case "assignedTo": return <AssigneeCell r={r} />
      case "reportedBy": return <span className="whitespace-nowrap text-sm">{r.reportedBy}</span>
      case "developer": return <span className="whitespace-nowrap text-sm">{r.developer.name}</span>
      case "project": return (
        <div className="whitespace-nowrap">
          <p className="text-sm font-medium text-foreground">{r.project.name}</p>
          <IdTag value={r.project.id} />
        </div>
      )
      case "phase": return r.phase ? <span className="whitespace-nowrap text-sm">{r.phase.name}</span> : <span className="text-muted-foreground">—</span>
      case "propertyId": return <IdTag value={r.propertyId} />
      case "detailedPropertyId": return <IdTag value={r.detailedPropertyId} />
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.updatedAt)}</span>
      case "resolvedAt": return r.resolvedAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.resolvedAt)}</span> : <span className="text-muted-foreground">—</span>
      case "closedAt": return r.closedAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.closedAt)}</span> : <span className="text-muted-foreground">—</span>
      default: return null
    }
  }

  const renderRow = (r: PropertyIssue) => (
    <tr key={r.id} className={cn("hover:bg-muted/40", selected.has(r.id) && "bg-primary/5")}>
      <td className="sticky left-0 z-10 w-10 bg-card py-2.5 pl-4 pr-0">
        <Checkbox className="h-4 w-4" checked={selected.has(r.id)} onCheckedChange={(v) => toggleRow(r.id, !!v)} />
      </td>
      {visibleCols.map((c) => (
        <td
          key={c.id}
          className={cn("px-4 py-2.5 align-middle", frozenCols.has(c.id) && "sticky z-10 bg-card")}
          style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
        >
          {renderCell(r, c.id)}
        </td>
      ))}
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-full min-h-[40px] w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setTrackIssue(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewProperty(r)}><Building2 className="mr-2 h-3.5 w-3.5" />View Property</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setAssignee(new Set([r.id]), "Ezz H.")}><UserRound className="mr-2 h-3.5 w-3.5" />Assign to Me</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(new Set([r.id]), "Resolved")}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Mark Resolved</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(new Set([r.id]), "Closed")}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Close</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(new Set([r.id]), "Invalid")} className="text-red-600 focus:text-red-600"><XCircle className="mr-2 h-3.5 w-3.5" />Mark Invalid</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  const bulkBtnCls = "flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Issues</h1>
          <p className="text-sm text-muted-foreground">Issue tracking for property data — reported by the quality team or raised automatically by validation rules</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setSelected(new Set()); setPage(1) }} className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="Property" className="data-[state=active]:bg-card">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />Properties
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                {issues.length.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="Project" className="data-[state=active]:bg-card">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />Projects
              <span className="ml-1.5 inline-flex h-4 items-center justify-center rounded border border-gray-200 bg-gray-100 px-1 text-[10px] font-semibold text-gray-500">Soon</span>
            </TabsTrigger>
            <TabsTrigger value="Developer" className="data-[state=active]:bg-card">
              <Users className="mr-1.5 h-3.5 w-3.5" />Developers
              <span className="ml-1.5 inline-flex h-4 items-center justify-center rounded border border-gray-200 bg-gray-100 px-1 text-[10px] font-semibold text-gray-500">Soon</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab !== "Property" ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-24 text-center">
            <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{tab === "Project" ? "Project" : "Developer"} issues are coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">Property issues are live — project and developer issue tracking follows the same flow.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard icon={<AlertTriangle className="h-4 w-4 text-primary" />} label="Total Issues" value={filtered.length} />
              <StatCard icon={<CircleDot className="h-4 w-4 text-gray-500" />} label="To Do" value={count("To Do")} total={filtered.length} />
              <StatCard icon={<Loader2 className="h-4 w-4 text-amber-500" />} label="In Progress" value={count("In Progress")} total={filtered.length} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} label="Resolved" value={count("Resolved")} total={filtered.length} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Closed" value={count("Closed")} total={filtered.length} />
              <StatCard icon={<XCircle className="h-4 w-4 text-red-500" />} label="Invalid" value={count("Invalid")} total={filtered.length} />
            </div>

            <TableToolbar
              search={q}
              onSearch={(v) => { setQ(v); setPage(1) }}
              searchPlaceholder="Issue ID, field, description, property or project"
              hideAdvanced
              onAllFilters={() => setShowFilters(true)}
              onColumns={() => setShowColumns(true)}
              activeFilters={activeFilterCount}
              filters={
                <>
                  <FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-36" />
                  <FilterMultiSelect label="Severity" value={severityF} options={["Warning", "Blocking"]} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-32" />
                  <FilterMultiSelect label="Source" value={sourceF} options={["System", "User"]} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-32" />
                  <FilterMultiSelect label="Category (Field)" value={fieldF} options={ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-44" />
                  <FilterMultiSelect label="Type" value={typeF} options={ALL_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-36" />
                  <FilterMultiSelect label="Project" value={projectF} options={PROJECT_OPTIONS} onChange={(v) => { setProjectF(v); setPage(1) }} className="w-40" />
                  <FilterMultiSelect label="Phase" value={phaseF} options={PHASE_OPTIONS} onChange={(v) => { setPhaseF(v); setPage(1) }} className="w-32" />
                  <FilterMultiSelect label="Reported By" value={reporterF} options={["System", ...QUALITY_TEAM]} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-38" />
                  <FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-38" />
                  <DateRangeFilter label="Created At" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} withTime />
                </>
              }
              sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
              groupControl={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(GROUP_LABEL) as GroupByKey[]).map((k) => (
                      <DropdownMenuItem key={k} onClick={() => { setGroupBy(k); setCollapsedGroups(new Set()); setGroupPages({}) }} className="text-sm">
                        {k === "none" ? "No grouping" : GROUP_LABEL[k]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />

            <TableCard>
              <TableCardHeader
                title="Issues"
                count={filtered.length}
                extra={groupBy !== "none" ? (
                  <div className="ml-2 flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCollapsedGroups(new Set())}>
                      <ChevronsUpDown className="h-3.5 w-3.5" />Expand all
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCollapsedGroups(new Set(groups?.map((g) => g.label) ?? []))}>
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
                      groups.map((g) => {
                        const gPage = groupPages[g.label] ?? 1
                        const gRows = g.rows.slice((gPage - 1) * 10, gPage * 10)
                        return (
                          <Fragment key={g.label}>
                            <tr
                              className="cursor-pointer bg-muted/40 hover:bg-muted/60"
                              onClick={() => setCollapsedGroups((prev) => {
                                const n = new Set(prev)
                                if (n.has(g.label)) n.delete(g.label); else n.add(g.label)
                                return n
                              })}
                            >
                              <td colSpan={visibleCols.length + 2} className="p-0">
                                <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                                  <span className="text-sm font-semibold text-foreground">{g.label}</span>
                                  <span className="text-xs text-muted-foreground">{g.rows.length.toLocaleString()} issue{g.rows.length !== 1 ? "s" : ""}</span>
                                </div>
                              </td>
                            </tr>
                            {!collapsedGroups.has(g.label) && gRows.map(renderRow)}
                            {!collapsedGroups.has(g.label) && g.rows.length > 10 && (
                              <tr>
                                <td colSpan={visibleCols.length + 2} className="p-0">
                                  <div className="sticky left-0 w-max px-5">
                                    <GroupPager total={g.rows.length} page={gPage} pageSize={10} onPage={(p) => setGroupPages((prev) => ({ ...prev, [g.label]: p }))} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    ) : (
                      pageRows.map(renderRow)
                    )}
                    {filtered.length === 0 && (
                      <tr><td colSpan={visibleCols.length + 2} className="px-5 py-16 text-center text-sm text-muted-foreground">No issues match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {groups ? (
                <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length.toLocaleString()} issues in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
              ) : (
                <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="issues" />
              )}
            </TableCard>

            <FloatingBulkBar
              count={selected.size}
              total={filtered.length}
              onSelectAll={() => setSelected(new Set(filtered.map((r) => r.id)))}
              onClear={() => setSelected(new Set())}
            >
              <div className="h-8 w-px bg-zinc-700" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={bulkBtnCls}><CircleDot className="h-3.5 w-3.5" />Set Status<ChevronDown className="h-3 w-3" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-40">
                  {PROP_ISSUE_STATUSES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => { setStatus(selected, s); setSelected(new Set()) }}>
                      <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-8 w-px bg-zinc-700" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={bulkBtnCls}><UserRound className="h-3.5 w-3.5" />Assign<ChevronDown className="h-3 w-3" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="max-h-72 w-44 overflow-y-auto">
                  {ALL_PEOPLE.map((p) => (
                    <DropdownMenuItem key={p} onClick={() => { setAssignee(selected, p); setSelected(new Set()) }}>{p}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setAssignee(selected, null); setSelected(new Set()) }}>Unassigned</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </FloatingBulkBar>

            <ColumnsSheet
              open={showColumns}
              onClose={() => setShowColumns(false)}
              columns={COLS}
              order={colOrder}
              onOrderChange={setColOrder}
              hidden={hiddenCols}
              onHiddenChange={setHiddenCols}
              frozen={frozenCols}
              onFrozenChange={setFrozenCols}
            />

            <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
              <FilterDrawerField label="Status"><FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Severity"><FilterMultiSelect label="Severity" value={severityF} options={["Warning", "Blocking"]} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Source"><FilterMultiSelect label="Source" value={sourceF} options={["System", "User"]} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Category (Field)"><FilterMultiSelect label="Category (Field)" value={fieldF} options={ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Type"><FilterMultiSelect label="Type" value={typeF} options={ALL_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Project"><FilterMultiSelect label="Project" value={projectF} options={PROJECT_OPTIONS} onChange={(v) => { setProjectF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Phase"><FilterMultiSelect label="Phase" value={phaseF} options={PHASE_OPTIONS} onChange={(v) => { setPhaseF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Reported By"><FilterMultiSelect label="Reported By" value={reporterF} options={["System", ...QUALITY_TEAM]} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Assigned To"><FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Created At"><DateRangeFilter label="Created At" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
            </FiltersDrawer>

            <IssueTrackingDrawer
              issue={trackIssue}
              list={filtered}
              unit={trackIssue ? propertyById.get(trackIssue.propertyId) ?? null : null}
              onStep={setTrackIssue}
              onClose={() => setTrackIssue(null)}
              onViewProperty={(iss) => { setTrackIssue(null); setViewProperty(iss) }}
              onSetStatus={(iss, s) => setStatus(new Set([iss.id]), s)}
              onSetAssignee={(iss, p) => setAssignee(new Set([iss.id]), p)}
              onAddComment={(iss, text) => {
                const comment = { id: `CMT-${iss.id}-${iss.comments.length + 1}`, author: "Ezz H.", text, at: new Date().toISOString() }
                patchIssues(new Set([iss.id]), (r) => ({ comments: [...r.comments, comment], updatedAt: comment.at }))
              }}
            />

            <ViewPropertyDrawer
              row={viewProperty ? propertyById.get(viewProperty.propertyId) ?? null : null}
              defaultTab="unit-details"
              onClose={() => setViewProperty(null)}
              onUpdateRow={() => {}}
              highlightField={viewProperty?.fieldLabel}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ── Issue tracking drawer — details + unit snapshot + comments, side by side ──
function IssueTrackingDrawer({
  issue, list, unit, onStep, onClose, onViewProperty, onSetStatus, onSetAssignee, onAddComment,
}: {
  issue: PropertyIssue | null
  list: PropertyIssue[]
  unit: import("@/components/all-properties-page").PropertyRow | null
  onStep: (next: PropertyIssue) => void
  onClose: () => void
  onViewProperty: (issue: PropertyIssue) => void
  onSetStatus: (issue: PropertyIssue, s: PropIssueStatus) => void
  onSetAssignee: (issue: PropertyIssue, p: string | null) => void
  onAddComment: (issue: PropertyIssue, text: string) => void
}) {
  const [draft, setDraft] = useState("")
  if (!issue) return null
  const idx = list.findIndex((r) => r.id === issue.id)

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  )

  const fmtVal = (v: unknown): string => {
    if (v == null || v === "") return "—"
    if (typeof v === "boolean") return v ? "Yes" : "No"
    if (typeof v === "number") return v.toLocaleString()
    return String(v)
  }
  const snapshot: { label: string; fieldId: string; value: string }[] = unit ? [
    { label: "Unit Code", fieldId: "unitCode", value: fmtVal(unit.unitCode) },
    { label: "Unit Model", fieldId: "unitModel", value: fmtVal(unit.unitModel) },
    { label: "Category", fieldId: "propertyCategory", value: fmtVal(unit.propertyCategory) },
    { label: "Type", fieldId: "propertyType", value: fmtVal(unit.propertyType) },
    { label: "Building Number", fieldId: "buildingNumber", value: fmtVal(unit.buildingNumber) },
    { label: "Floor Number", fieldId: "floorNumber", value: fmtVal(unit.floorNumber) },
    { label: "Gross BUA", fieldId: "grossBua", value: unit.grossBua ? `${unit.grossBua} m²` : "—" },
    { label: "Net BUA", fieldId: "netBua", value: unit.netBua ? `${unit.netBua} m²` : "—" },
    { label: "Bedrooms", fieldId: "bedrooms", value: fmtVal(unit.bedrooms) },
    { label: "Bathrooms", fieldId: "bathrooms", value: fmtVal(unit.bathrooms) },
    { label: "Price", fieldId: "price", value: unit.price ? `${unit.price.toLocaleString()} EGP` : "No price set" },
    { label: "Availability", fieldId: "availability", value: fmtVal(unit.availability) },
    { label: "Delivery Date", fieldId: "deliveryDate", value: fmtVal(unit.deliveryDate) },
    { label: "Finishing Type", fieldId: "finishingType", value: fmtVal(unit.finishingType) },
    { label: "Payment Plans", fieldId: "paymentPlans", value: `${unit.paymentPlans} plan${unit.paymentPlans !== 1 ? "s" : ""}` },
    { label: "Floor Plans", fieldId: "floorPlans", value: `${unit.floorPlans.length} file${unit.floorPlans.length !== 1 ? "s" : ""}` },
    { label: "Render Images", fieldId: "images", value: `${unit.images.length} image${unit.images.length !== 1 ? "s" : ""}` },
  ] : []

  const hlCls = issue.severity === "Blocking" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
  const hlText = issue.severity === "Blocking" ? "text-red-700" : "text-amber-700"

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[1120px] !max-w-[96vw] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex min-w-0 items-center gap-2.5">
              <SheetTitle className="text-base font-semibold">Issue</SheetTitle>
              <IdTag value={issue.id} />
              <IssueSourceTag source={issue.source} />
              <IssueSeverityTag severity={issue.severity} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Fast status + assignee changes, right in the header */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button><IssueStatusTag status={issue.status} chevron /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {PROP_ISSUE_STATUSES.filter((s) => s !== issue.status).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => onSetStatus(issue, s)}>
                      <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <UserRound className="h-3 w-3" />{issue.assignedTo ?? "Unassigned"}<ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 w-44 overflow-y-auto">
                  {ALL_PEOPLE.map((p) => (
                    <DropdownMenuItem key={p} onClick={() => onSetAssignee(issue, p)}>{p}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSetAssignee(issue, null)}>Unassigned</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {idx >= 0 && list.length > 1 && (
                <div className="ml-1 flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => onStep(list[idx - 1])}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="px-1 text-xs tabular-nums text-muted-foreground">{idx + 1}/{list.length.toLocaleString()}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx >= list.length - 1} onClick={() => onStep(list[idx + 1])}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* 3 panes: details | unit | comments */}
        <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-border">
          {/* Pane 1 — issue details */}
          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <SectionTitle>Classification</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Category (Field)" value={<ColorTag value={issue.fieldLabel} />} />
                <Field label="Type" value={<ColorTag value={issue.type} />} />
                <Field label="Subtype" value={issue.subtype} />
                <Field label="Reported By" value={issue.reportedBy} />
              </dl>
            </div>

            <div className="space-y-3">
              <SectionTitle>Description</SectionTitle>
              <p className="text-sm leading-relaxed text-foreground">{issue.description}</p>
              {issue.linkedItems && issue.linkedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {issue.linkedItems.map((x) => <ColorTag key={x} value={x} />)}
                </div>
              )}
            </div>

            {(issue.expected || issue.current) && (
              <div className="space-y-3">
                <SectionTitle>Expected Result</SectionTitle>
                <div className="space-y-2">
                  {issue.current && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Current</p>
                      <p className="text-sm text-red-700">{issue.current}</p>
                    </div>
                  )}
                  {issue.expected && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Expected</p>
                      <p className="text-sm text-emerald-700">{issue.expected}</p>
                    </div>
                  )}
                  <p className="text-[11px] leading-snug text-muted-foreground">Issues auto-move to Resolved when the field value matches the expected result after an update.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <SectionTitle>Linked Records</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Developer" value={<div><p>{issue.developer.name}</p><IdTag value={issue.developer.id} /></div>} />
                <Field label="Project" value={<div><p>{issue.project.name}</p><IdTag value={issue.project.id} /></div>} />
                <Field label="Phase" value={issue.phase ? <div><p>{issue.phase.name}</p><IdTag value={issue.phase.id} /></div> : null} />
                <Field label="Property ID" value={<IdTag value={issue.propertyId} />} />
              </dl>
            </div>

            <div className="space-y-3">
              <SectionTitle>Timeline</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Created At" value={fmtDateTime(issue.createdAt)} />
                <Field label="Updated At" value={fmtDateTime(issue.updatedAt)} />
                <Field label="Resolved At" value={issue.resolvedAt ? fmtDateTime(issue.resolvedAt) : null} />
                <Field label="Closed At" value={issue.closedAt ? fmtDateTime(issue.closedAt) : null} />
              </dl>
            </div>
          </div>

          {/* Pane 2 — unit snapshot with the issue field highlighted */}
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Unit Snapshot</p>
                <IdTag value={issue.propertyId} />
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onViewProperty(issue)}>
                <Building2 className="h-3 w-3" />Full Details
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {unit ? (
                <dl className="space-y-1">
                  {snapshot.map((f) => {
                    const hl = f.fieldId === issue.fieldId
                    return (
                      <div key={f.fieldId} className={cn("flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1.5", hl && hlCls)}>
                        <dt className={cn("flex items-center gap-1 text-xs text-muted-foreground", hl && `font-semibold ${hlText}`)}>
                          {hl && <AlertTriangle className="h-3 w-3" />}{f.label}
                        </dt>
                        <dd className={cn("truncate text-sm text-foreground", hl && `font-medium ${hlText}`)}>{f.value}</dd>
                      </div>
                    )
                  })}
                </dl>
              ) : (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">Unit not found in the current mock rows.</p>
              )}
            </div>
          </div>

          {/* Pane 3 — comments thread */}
          <div className="flex min-h-0 flex-col">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold text-foreground">Comments</p>
              <p className="text-[11px] text-muted-foreground">{issue.comments.length} comment{issue.comments.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {issue.comments.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>
              )}
              {issue.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {c.author.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{c.author}</p>
                      <p className="shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(c.at)}</p>
                    </div>
                    <p className="mt-0.5 rounded-lg rounded-tl-none border border-border bg-muted/40 px-2.5 py-1.5 text-sm leading-snug text-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) { onAddComment(issue, draft.trim()); setDraft("") }
                }}
              />
              <Button size="sm" className="h-8 gap-1.5" disabled={!draft.trim()} onClick={() => { onAddComment(issue, draft.trim()); setDraft("") }}>
                <Send className="h-3.5 w-3.5" />Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

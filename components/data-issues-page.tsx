"use client"

import { Fragment, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsDownUp, ChevronsUpDown, CircleDot, Clock, Download, ExternalLink, Eye, FileDown, FileSpreadsheet, FileText,
  LayoutGrid, Loader2, MoreHorizontal, Send, UserRound, Users, XCircle,
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
import { Badge } from "@/components/ui/badge"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { ViewPropertyDrawer, createRows, BADGE_CLASS, AllPropertiesPage } from "@/components/all-properties-page"
import { IssueTrackingDrawer, statusPatch, assigneePatch } from "@/components/issue-tracking-drawer"
import {
  PROPERTY_ISSUES, PROP_ISSUE_STATUSES, PROP_ISSUE_SEVERITIES, PROP_ISSUE_SOURCES, STATUS_COLORS, SEVERITY_COLORS,
  SOURCE_COLORS, ISSUE_FIELDS, ALL_ISSUE_TYPES, ALL_ISSUE_SUBTYPES, QUALITY_TEAM, SALES_AGENTS, ALL_PEOPLE,
  ALL_REPORTERS, isCriticalSeverity, openIssuesByProperty, type PropertyIssue, type PropIssueStatus,
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

/** Initials avatar + name — Reported By / Assigned To cells. */
function PersonCell({ name, muted }: { name: string | null; muted?: boolean }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const initials = name === "System" ? "SYS" : name.split(" ").map((x) => x[0]).join("").slice(0, 2)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
        name === "System" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary",
      )}>
        {initials}
      </span>
      <span className={cn("text-sm", muted && "text-muted-foreground")}>{name}</span>
    </span>
  )
}

/** Unit tag with the shared properties palette; "Hold" reads as "On Hold". */
function UnitTag({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return <Badge variant="outline" className={cn("border text-xs whitespace-nowrap", BADGE_CLASS[value])}>{value === "Hold" ? "On Hold" : value}</Badge>
}

const PROJECT_OPTIONS = ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"]
const DEVELOPER_OPTIONS = ["Palm Hills", "Sodic", "Mountain View", "Emaar"]
const SALE_TYPE_OPTIONS = ["Launch", "Primary", "Resale", "Nawy Now", "Rental", "Financing"]
const ENTRY_TYPE_OPTIONS = ["Automatic", "Manual"]
const UNIT_STATUS_OPTIONS = ["Available", "On Hold", "Sold-Off", "Archived"]
const LISTING_STATUS_OPTIONS = ["Active", "Hidden"]
const PHASE_OPTIONS = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"]

const COLS = [
  { id: "id", label: "Issue ID", width: 120 },
  { id: "source", label: "Reported By Type", width: 130 },
  { id: "severity", label: "Severity", width: 100 },
  { id: "status", label: "Status", width: 130 },
  { id: "field", label: "Issue Category", width: 140 },
  { id: "type", label: "Issue Type", width: 140 },
  { id: "description", label: "Description", width: 240 },
  { id: "expected", label: "Expected", width: 150 },
  { id: "assignedTo", label: "Assigned To", width: 140 },
  { id: "reportedBy", label: "Reported By", width: 140 },
  { id: "developer", label: "Developer", width: 170 },
  { id: "project", label: "Project", width: 180 },
  { id: "phase", label: "Phase", width: 120 },
  { id: "entryType", label: "Entry Type", width: 110 },
  { id: "saleType", label: "Sale Type", width: 110 },
  { id: "propertyId", label: "Property ID", width: 145 },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 170 },
  { id: "unitStatus", label: "Property Status", width: 120 },
  { id: "listingStatus", label: "Listing Status", width: 115 },
  { id: "createdAt", label: "Created At", width: 160 },
  { id: "updatedAt", label: "Updated At", width: 160 },
  { id: "resolvedAt", label: "Resolved At", width: 160 },
  { id: "closedAt", label: "Closed At", width: 160 },
]
const DEFAULT_HIDDEN = new Set<string>()

// Header-click + multi-level sorting is limited to these columns
const SORT_FIELDS = [
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "resolvedAt", label: "Resolved At" },
  { key: "closedAt", label: "Closed At" },
  { key: "severity", label: "Severity" },
]
const SORTABLE_COLS = new Set(SORT_FIELDS.map((f) => f.key))

type GroupByKey =
  | "none" | "source" | "assignedTo" | "reportedBy" | "developer" | "project" | "phase"
  | "status" | "field" | "type" | "subtype" | "severity"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", source: "Reported By Type", assignedTo: "Assigned To", reportedBy: "Reported By",
  developer: "Developer", project: "Project", phase: "Phase", status: "Status", field: "Issue Category",
  type: "Issue Type", subtype: "Subtype", severity: "Severity",
}

function getSortValue(r: PropertyIssue, key: string): string | number {
  switch (key) {
    case "status": return PROP_ISSUE_STATUSES.indexOf(r.status)
    case "createdAt": return r.createdAt
    case "updatedAt": return r.updatedAt
    case "resolvedAt": return r.resolvedAt ?? ""
    case "closedAt": return r.closedAt ?? ""
    case "severity": return PROP_ISSUE_SEVERITIES.indexOf(r.severity)
    default: return ""
  }
}

function groupKeyOf(r: PropertyIssue, key: GroupByKey): string {
  switch (key) {
    case "source": return r.source
    case "assignedTo": return r.assignedTo ?? "Unassigned"
    case "reportedBy": return r.reportedBy
    case "developer": return r.developer.name
    case "project": return r.project.name
    case "phase": return r.phase?.name ?? "No phase"
    case "status": return r.status
    case "field": return r.fieldLabel
    case "type": return r.type
    case "subtype": return r.subtype ?? "No subtype"
    case "severity": return r.severity
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

type DateRange = { from: string; to: string }
const emptyRange: DateRange = { from: "", to: "" }
function inRange(value: string | null, r: DateRange): boolean {
  if (!r.from && !r.to) return true
  if (value == null) return false
  if (r.from && value < new Date(r.from).toISOString()) return false
  if (r.to && value > new Date(r.to).toISOString()) return false
  return true
}

export function DataIssuesPage() {
  // Local copy for rendering; edits are written back into the module store so
  // properties views see the same state during this session. (mock)
  const [issues, setIssues] = useState<PropertyIssue[]>(() => [...PROPERTY_ISSUES])
  const [tab, setTab] = useState<"issues" | "properties">("issues")

  // toolbar state — search is issue id / description only
  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [projectF, setProjectF] = useState<string[]>([])
  const [statusF, setStatusF] = useState<string[]>([])
  const [severityF, setSeverityF] = useState<string[]>([])
  const [sourceF, setSourceF] = useState<string[]>([])
  const [fieldF, setFieldF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [subtypeF, setSubtypeF] = useState<string[]>([])
  const [reporterF, setReporterF] = useState<string[]>([])
  const [assigneeF, setAssigneeF] = useState<string[]>([])
  const [saleTypeF, setSaleTypeF] = useState<string[]>([])
  const [entryTypeF, setEntryTypeF] = useState<string[]>([])
  const [unitStatusF, setUnitStatusF] = useState<string[]>([])
  const [listingStatusF, setListingStatusF] = useState<string[]>([])
  const [createdR, setCreatedR] = useState<DateRange>(emptyRange)
  const [updatedR, setUpdatedR] = useState<DateRange>(emptyRange)
  const [resolvedR, setResolvedR] = useState<DateRange>(emptyRange)
  const [closedR, setClosedR] = useState<DateRange>(emptyRange)
  // Default order: newest reported first
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
  // Properties tab: distinct properties that currently have open issues
  const issuedPropertyCount = useMemo(() => openIssuesByProperty().size, [issues])

  const rangeCount = [createdR, updatedR, resolvedR, closedR].filter((r) => r.from || r.to).length
  const activeFilterCount =
    [developerF, projectF, statusF, severityF, sourceF, fieldF, typeF, subtypeF, reporterF, assigneeF, saleTypeF, entryTypeF, unitStatusF, listingStatusF].filter((f) => f.length > 0).length + rangeCount

  const clearAllFilters = () => {
    setDeveloperF([]); setProjectF([]); setStatusF([]); setSeverityF([]); setSourceF([]); setFieldF([])
    setTypeF([]); setSubtypeF([]); setReporterF([]); setAssigneeF([])
    setSaleTypeF([]); setEntryTypeF([]); setUnitStatusF([]); setListingStatusF([])
    setCreatedR(emptyRange); setUpdatedR(emptyRange); setResolvedR(emptyRange); setClosedR(emptyRange)
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = issues
    const needle = q.trim().toLowerCase()
    if (needle)
      rows = rows.filter((r) =>
        r.id.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.propertyId.toLowerCase().includes(needle) ||
        r.detailedPropertyId.toLowerCase().includes(needle),
      )
    // Unit-context filters resolve through the linked property row
    const unitOf = (r: PropertyIssue) => propertyById.get(r.propertyId)
    if (saleTypeF.length) rows = rows.filter((r) => saleTypeF.includes(unitOf(r)?.saleType ?? ""))
    if (entryTypeF.length) rows = rows.filter((r) => entryTypeF.includes(unitOf(r)?.entryType ?? ""))
    if (unitStatusF.length) rows = rows.filter((r) => {
      const a = unitOf(r)?.availability
      return a != null && unitStatusF.includes(a === "Hold" ? "On Hold" : a)
    })
    if (listingStatusF.length) rows = rows.filter((r) => listingStatusF.includes(unitOf(r)?.listingStatus ?? ""))
    if (developerF.length) rows = rows.filter((r) => developerF.includes(r.developer.name))
    if (projectF.length) rows = rows.filter((r) => projectF.includes(r.project.name))
    if (statusF.length) rows = rows.filter((r) => statusF.includes(r.status))
    if (severityF.length) rows = rows.filter((r) => severityF.includes(r.severity))
    if (sourceF.length) rows = rows.filter((r) => sourceF.includes(r.source))
    if (fieldF.length) rows = rows.filter((r) => fieldF.includes(r.fieldLabel))
    if (typeF.length) rows = rows.filter((r) => typeF.includes(r.type))
    if (subtypeF.length) rows = rows.filter((r) => r.subtype != null && subtypeF.includes(r.subtype))
    if (reporterF.length) rows = rows.filter((r) => reporterF.includes(r.reportedBy))
    if (assigneeF.length) rows = rows.filter((r) => (r.assignedTo ? assigneeF.includes(r.assignedTo) : assigneeF.includes("Unassigned")))
    rows = rows.filter((r) => inRange(r.createdAt, createdR) && inRange(r.updatedAt, updatedR) && inRange(r.resolvedAt, resolvedR) && inRange(r.closedAt, closedR))
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
  }, [issues, q, developerF, projectF, statusF, severityF, sourceF, fieldF, typeF, subtypeF, reporterF, assigneeF, saleTypeF, entryTypeF, unitStatusF, listingStatusF, createdR, updatedR, resolvedR, closedR, sorts, propertyById])

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
    patchIssues(ids, (r) => statusPatch(r, next))
    toast.success(`${ids.size > 1 ? `${ids.size} issues` : "Issue"} moved to ${next}`)
  }
  const setAssignee = (ids: Set<string>, person: string | null) => {
    patchIssues(ids, (r) => assigneePatch(r, person))
    toast.success(person ? `Assigned to ${person}` : "Unassigned")
  }
  const exportSelected = (fmt: string) => {
    toast.success(`Exporting ${selected.size.toLocaleString()} issue${selected.size !== 1 ? "s" : ""} as ${fmt} (mock)`)
    setSelected(new Set())
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
        <button className="inline-flex items-center gap-1 whitespace-nowrap hover:opacity-80">
          <PersonCell name={r.assignedTo} muted={!r.assignedTo} />
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

  const ts = (v: string | null) =>
    v ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(v)}</span> : <span className="text-muted-foreground">—</span>

  const renderCell = (r: PropertyIssue, colId: string) => {
    switch (colId) {
      case "id": return <IdTag value={r.id} />
      case "source": return <IssueSourceTag source={r.source} />
      case "severity": return <IssueSeverityTag severity={r.severity} />
      case "status": return <StatusCell r={r} />
      case "field": return <ColorTag value={r.fieldLabel} />
      case "type": return <ColorTag value={r.type} />
      case "description": return <span className="block max-w-[240px] truncate text-sm" title={r.description}>{r.description}</span>
      case "expected": return r.expected ? <span className="block max-w-[150px] truncate text-sm" title={r.expected}>{r.expected}</span> : <span className="text-muted-foreground">—</span>
      case "assignedTo": return <AssigneeCell r={r} />
      case "reportedBy": return <PersonCell name={r.reportedBy} />
      case "developer": return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">
            {r.developer.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <button
              className="block text-sm font-medium text-foreground hover:underline"
              onClick={() => window.open(`/developers/${r.developer.id}`, "_blank", "noopener")}
            >
              {r.developer.name}
            </button>
            <IdTag value={r.developer.id} />
          </div>
        </div>
      )
      case "project": return (
        <div className="whitespace-nowrap">
          <button
            className="block text-sm font-medium text-foreground hover:underline"
            onClick={() => window.open(`/projects/${r.project.id}`, "_blank", "noopener")}
          >
            {r.project.name}
          </button>
          <IdTag value={r.project.id} />
        </div>
      )
      case "phase": return r.phase ? (
        <div className="whitespace-nowrap">
          <button
            className="block text-sm text-foreground hover:underline"
            onClick={() => window.open(`/projects/${r.project.id}/phases/${r.phase!.id}`, "_blank", "noopener")}
          >
            {r.phase.name}
          </button>
          <IdTag value={r.phase.id} />
        </div>
      ) : <span className="text-muted-foreground">—</span>
      case "entryType": return <UnitTag value={propertyById.get(r.propertyId)?.entryType} />
      case "saleType": return <UnitTag value={propertyById.get(r.propertyId)?.saleType} />
      case "propertyId": return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <IdTag value={r.propertyId} />
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Open grouped property details"
            onClick={() => window.open(`/properties/grouped/${r.propertyId}`, "_blank", "noopener")}
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </span>
      )
      case "detailedPropertyId": return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <IdTag value={r.detailedPropertyId} />
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="View detailed property"
            onClick={() => setViewProperty(r)}
          >
            <Eye className="h-3 w-3" />
          </button>
        </span>
      )
      case "unitStatus": return <UnitTag value={propertyById.get(r.propertyId)?.availability} />
      case "listingStatus": return <UnitTag value={propertyById.get(r.propertyId)?.listingStatus} />
      case "createdAt": return ts(r.createdAt)
      case "updatedAt": return ts(r.updatedAt)
      case "resolvedAt": return ts(r.resolvedAt)
      case "closedAt": return ts(r.closedAt)
      default: return null
    }
  }

  // Compact rows: py-1.5 instead of the default py-3
  const renderRow = (r: PropertyIssue) => (
    <tr key={r.id} className={cn("hover:bg-muted/40", selected.has(r.id) && "bg-primary/5")}>
      <td className="sticky left-0 z-10 w-10 bg-card py-1.5 pl-4 pr-0">
        <Checkbox className="h-4 w-4" checked={selected.has(r.id)} onCheckedChange={(v) => toggleRow(r.id, !!v)} />
      </td>
      {visibleCols.map((c) => (
        <td
          key={c.id}
          className={cn("px-3 py-1.5 align-middle", frozenCols.has(c.id) && "sticky z-10 bg-card")}
          style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
        >
          {renderCell(r, c.id)}
        </td>
      ))}
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-full min-h-[36px] w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
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
          <h1 className="text-2xl font-bold text-foreground">Properties Data Issues</h1>
          <p className="text-sm text-muted-foreground">Issue tracking for property data — reported by the quality team, sales agents, or raised automatically by validation rules</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setSelected(new Set()); setPage(1) }} className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="issues" className="data-[state=active]:bg-card">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Issues
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                {issues.length.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="data-[state=active]:bg-card">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />Properties
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                {issuedPropertyCount.toLocaleString()}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "properties" ? (
          <>
            {/* Same analytics, from the properties perspective */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard icon={<AlertTriangle className="h-4 w-4 text-primary" />} label="Total Issues" value={issues.length} />
              <StatCard icon={<CircleDot className="h-4 w-4 text-gray-500" />} label="To Do" value={issues.filter((r) => r.status === "To Do").length} total={issues.length} />
              <StatCard icon={<Loader2 className="h-4 w-4 text-amber-500" />} label="In Progress" value={issues.filter((r) => r.status === "In Progress").length} total={issues.length} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} label="Resolved" value={issues.filter((r) => r.status === "Resolved").length} total={issues.length} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Closed" value={issues.filter((r) => r.status === "Closed").length} total={issues.length} />
              <StatCard icon={<XCircle className="h-4 w-4 text-red-500" />} label="Invalid" value={issues.filter((r) => r.status === "Invalid").length} total={issues.length} />
            </div>
            {/* The All Properties experience, locked to properties with open issues */}
            <AllPropertiesPage embedded showIssuesMode />
          </>
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
              searchPlaceholder="Search by issue ID, description, property ID or detailed property ID"
              hideAdvanced
              onAllFilters={() => setShowFilters(true)}
              onColumns={() => setShowColumns(true)}
              activeFilters={activeFilterCount}
              filters={
                <>
                  <FilterMultiSelect label="Developer" value={developerF} options={DEVELOPER_OPTIONS} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-38" />
                  <FilterMultiSelect label="Project" value={projectF} options={PROJECT_OPTIONS} onChange={(v) => { setProjectF(v); setPage(1) }} className="w-38" />
                  <FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-32" />
                  <FilterMultiSelect label="Severity" value={severityF} options={PROP_ISSUE_SEVERITIES} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-32" />
                  <FilterMultiSelect label="Reported By Type" value={sourceF} options={PROP_ISSUE_SOURCES} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-40" />
                  <FilterMultiSelect label="Issue Category" value={fieldF} options={ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-38" />
                  <FilterMultiSelect label="Issue Type" value={typeF} options={ALL_ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-34" />
                  <FilterMultiSelect label="Subtype" value={subtypeF} options={ALL_ISSUE_SUBTYPES} onChange={(v) => { setSubtypeF(v); setPage(1) }} className="w-36" />
                  <FilterMultiSelect label="Reported By" value={reporterF} options={ALL_REPORTERS} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-36" />
                  <FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-36" />
                  <FilterMultiSelect label="Sale Type" value={saleTypeF} options={SALE_TYPE_OPTIONS} onChange={(v) => { setSaleTypeF(v); setPage(1) }} className="w-34" />
                  <FilterMultiSelect label="Entry Type" value={entryTypeF} options={ENTRY_TYPE_OPTIONS} onChange={(v) => { setEntryTypeF(v); setPage(1) }} className="w-34" />
                  <FilterMultiSelect label="Property Status" value={unitStatusF} options={UNIT_STATUS_OPTIONS} onChange={(v) => { setUnitStatusF(v); setPage(1) }} className="w-38" />
                  <FilterMultiSelect label="Listing Status" value={listingStatusF} options={LISTING_STATUS_OPTIONS} onChange={(v) => { setListingStatusF(v); setPage(1) }} className="w-36" />
                  <DateRangeFilter label="Created At" dateFrom={createdR.from} dateTo={createdR.to} onChangeFrom={(v) => { setCreatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setCreatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
                  <DateRangeFilter label="Updated At" dateFrom={updatedR.from} dateTo={updatedR.to} onChangeFrom={(v) => { setUpdatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setUpdatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
                  <DateRangeFilter label="Resolved At" dateFrom={resolvedR.from} dateTo={resolvedR.to} onChangeFrom={(v) => { setResolvedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setResolvedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
                  <DateRangeFilter label="Closed At" dateFrom={closedR.from} dateTo={closedR.to} onChangeFrom={(v) => { setClosedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setClosedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
                </>
              }
              sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
              groupControl={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
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
                      <th className="sticky left-0 z-20 w-10 bg-muted/60 py-2.5 pl-4 pr-0">
                        <Checkbox className="h-4 w-4" checked={allPageSelected} onCheckedChange={(v) => togglePageSelect(!!v)} />
                      </th>
                      {visibleCols.map((c) => {
                        const s = sorts.find((x) => x.key === c.id)
                        return (
                          <th
                            key={c.id}
                            className={cn("whitespace-nowrap px-3 py-2.5 text-left", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
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
              <div className="h-8 w-px bg-zinc-700" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={bulkBtnCls}><Download className="h-3.5 w-3.5" />Export<ChevronDown className="h-3 w-3" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="min-w-[140px]">
                  <DropdownMenuItem onClick={() => exportSelected("CSV")}><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelected("Excel")}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportSelected("PDF")}><FileDown className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
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
              <FilterDrawerField label="Developer"><FilterMultiSelect label="Developer" value={developerF} options={DEVELOPER_OPTIONS} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Project"><FilterMultiSelect label="Project" value={projectF} options={PROJECT_OPTIONS} onChange={(v) => { setProjectF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Status"><FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Severity"><FilterMultiSelect label="Severity" value={severityF} options={PROP_ISSUE_SEVERITIES} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Reported By Type"><FilterMultiSelect label="Reported By Type" value={sourceF} options={PROP_ISSUE_SOURCES} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Issue Category"><FilterMultiSelect label="Issue Category" value={fieldF} options={ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Issue Type"><FilterMultiSelect label="Issue Type" value={typeF} options={ALL_ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Subtype"><FilterMultiSelect label="Subtype" value={subtypeF} options={ALL_ISSUE_SUBTYPES} onChange={(v) => { setSubtypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Reported By"><FilterMultiSelect label="Reported By" value={reporterF} options={ALL_REPORTERS} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Assigned To"><FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Sale Type"><FilterMultiSelect label="Sale Type" value={saleTypeF} options={SALE_TYPE_OPTIONS} onChange={(v) => { setSaleTypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Entry Type"><FilterMultiSelect label="Entry Type" value={entryTypeF} options={ENTRY_TYPE_OPTIONS} onChange={(v) => { setEntryTypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Property Status"><FilterMultiSelect label="Property Status" value={unitStatusF} options={UNIT_STATUS_OPTIONS} onChange={(v) => { setUnitStatusF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Listing Status"><FilterMultiSelect label="Listing Status" value={listingStatusF} options={LISTING_STATUS_OPTIONS} onChange={(v) => { setListingStatusF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Created At"><DateRangeFilter label="Created At" dateFrom={createdR.from} dateTo={createdR.to} onChangeFrom={(v) => { setCreatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setCreatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Updated At"><DateRangeFilter label="Updated At" dateFrom={updatedR.from} dateTo={updatedR.to} onChangeFrom={(v) => { setUpdatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setUpdatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Resolved At"><DateRangeFilter label="Resolved At" dateFrom={resolvedR.from} dateTo={resolvedR.to} onChangeFrom={(v) => { setResolvedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setResolvedR((r) => ({ ...r, to: v })); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
              <FilterDrawerField label="Closed At"><DateRangeFilter label="Closed At" dateFrom={closedR.from} dateTo={closedR.to} onChangeFrom={(v) => { setClosedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setClosedR((r) => ({ ...r, to: v })); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
            </FiltersDrawer>

            <IssueTrackingDrawer
              issue={trackIssue}
              list={filtered}
              unit={trackIssue ? propertyById.get(trackIssue.propertyId) ?? null : null}
              onStep={setTrackIssue}
              onClose={() => setTrackIssue(null)}
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
              highlightFields={viewProperty ? { [viewProperty.fieldLabel]: viewProperty.severity } : undefined}
            />
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { Fragment, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsDownUp, ChevronsUpDown, CircleDot, Eye, LayoutGrid, Loader2, MoreHorizontal, Plus, UserRound, Users, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterMultiSelect, DateRangeFilter, FiltersDrawer,
  FilterDrawerField, FloatingBulkBar, BulkBarButton, MultiSortControl, ColumnsSheet, IdTag, COL_SEP, type SortLevel,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { ViewPropertyDrawer, createRows } from "@/components/all-properties-page"
import { DATA_ISSUES, ISSUE_CATEGORIES, ISSUE_PEOPLE, ISSUE_STATUSES, ISSUE_TYPES, type DataIssue, type IssueStatus } from "@/lib/data-issues-mock"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<IssueStatus, string> = {
  Open: "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Fixed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-gray-100 text-gray-600 border-gray-200",
}

function StatusTag({ status }: { status: IssueStatus }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>{status}</span>
}

const COLS = [
  { id: "id", label: "Issue ID", width: 120 },
  { id: "reportedBy", label: "Reported By", width: 130 },
  { id: "assignedTo", label: "Assigned To", width: 130 },
  { id: "status", label: "Status", width: 120 },
  { id: "category", label: "Category", width: 130 },
  { id: "type", label: "Type", width: 130 },
  { id: "description", label: "Description", width: 280 },
  { id: "developer", label: "Developer", width: 160 },
  { id: "project", label: "Project", width: 180 },
  { id: "phase", label: "Phase", width: 120 },
  { id: "propertyId", label: "Property ID", width: 130 },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 160 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
  { id: "fixedAt", label: "Fixed At", width: 170 },
]

const SORT_FIELDS = [
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "fixedAt", label: "Fixed At" },
  { key: "status", label: "Status" },
  { key: "category", label: "Category" },
  { key: "reportedBy", label: "Reported By" },
  { key: "assignedTo", label: "Assigned To" },
]
const SORTABLE_COLS = new Set(SORT_FIELDS.map((f) => f.key))

type GroupByKey = "none" | "status" | "category" | "type" | "developer" | "project"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", status: "Status", category: "Category", type: "Type", developer: "Developer", project: "Project",
}

type TabKey = "Property" | "Project" | "Developer"
// Columns that don't apply per entity tab (a project issue has no property id, etc.)
const HIDDEN_BY_TAB: Record<TabKey, Set<string>> = {
  Property: new Set(),
  Project: new Set(["propertyId", "detailedPropertyId", "phase"]),
  Developer: new Set(["propertyId", "detailedPropertyId", "phase", "project"]),
}

function getSortValue(r: DataIssue, key: string): string | number {
  switch (key) {
    case "createdAt": return r.createdAt
    case "updatedAt": return r.updatedAt
    case "fixedAt": return r.fixedAt ?? ""
    case "status": return ISSUE_STATUSES.indexOf(r.status)
    case "category": return r.category
    case "reportedBy": return r.reportedBy
    case "assignedTo": return r.assignedTo ?? ""
    default: return ""
  }
}

function groupKeyOf(r: DataIssue, key: GroupByKey): string {
  switch (key) {
    case "status": return r.status
    case "category": return r.category
    case "type": return r.type
    case "developer": return r.developer.name
    case "project": return r.project?.name ?? "No project"
    default: return ""
  }
}

/** Issue-count stat card (same flat card family as the projects coverage cards). */
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

export function DataIssuesPage() {
  const [issues, setIssues] = useState<DataIssue[]>(DATA_ISSUES)
  const [tab, setTab] = useState<TabKey>("Property")

  // toolbar state
  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [categoryF, setCategoryF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [reporterF, setReporterF] = useState<string[]>([])
  const [assigneeF, setAssigneeF] = useState<string[]>([])
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([{ key: "createdAt", dir: "desc" }])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())

  // table state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // drawers
  const [viewIssue, setViewIssue] = useState<DataIssue | null>(null)
  const [viewProperty, setViewProperty] = useState<DataIssue | null>(null)

  const propertyRows = useMemo(() => createRows(), [])
  const propertyById = useMemo(() => new Map(propertyRows.map((r) => [r.propertyId, r])), [propertyRows])

  const developers = useMemo(() => Array.from(new Map(issues.map((x) => [x.developer.id, x.developer])).values()), [issues])

  const activeFilterCount =
    [statusF, categoryF, typeF, reporterF, assigneeF, developerF].filter((f) => f.length > 0).length +
    (dateFrom || dateTo ? 1 : 0)

  const clearAllFilters = () => {
    setStatusF([]); setCategoryF([]); setTypeF([]); setReporterF([]); setAssigneeF([]); setDeveloperF([])
    setDateFrom(""); setDateTo(""); setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = issues.filter((r) => r.entity === tab)
    const needle = q.trim().toLowerCase()
    if (needle) {
      rows = rows.filter((r) =>
        [r.id, r.description, r.category, r.type, r.developer.name, r.project?.name, r.phase?.name, r.propertyId, r.detailedPropertyId, r.reportedBy, r.assignedTo]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      )
    }
    if (statusF.length) rows = rows.filter((r) => statusF.includes(r.status))
    if (categoryF.length) rows = rows.filter((r) => categoryF.includes(r.category))
    if (typeF.length) rows = rows.filter((r) => typeF.includes(r.type))
    if (reporterF.length) rows = rows.filter((r) => reporterF.includes(r.reportedBy))
    if (assigneeF.length) rows = rows.filter((r) => r.assignedTo != null && assigneeF.includes(r.assignedTo))
    if (developerF.length) rows = rows.filter((r) => developerF.includes(r.developer.id))
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
  }, [issues, tab, q, statusF, categoryF, typeF, reporterF, assigneeF, developerF, dateFrom, dateTo, sorts])

  const groups = useMemo(() => {
    if (groupBy === "none") return null
    const map = new Map<string, DataIssue[]>()
    for (const r of filtered) {
      const k = groupKeyOf(r, groupBy)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return Array.from(map.entries()).map(([label, rows]) => ({ label, rows }))
  }, [filtered, groupBy])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const visibleCols = colOrder
    .filter((id) => !hiddenCols.has(id) && !HIDDEN_BY_TAB[tab].has(id))
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

  const updateIssues = (ids: Set<string>, patch: (r: DataIssue) => Partial<DataIssue>) =>
    setIssues((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, ...patch(r), updatedAt: new Date().toISOString() } : r)))

  const markFixed = (ids: Set<string>) => {
    updateIssues(ids, () => ({ status: "Fixed", fixedAt: new Date().toISOString() }))
    toast.success(`${ids.size > 1 ? `${ids.size} issues` : "Issue"} marked as fixed`)
    setSelected(new Set())
  }
  const reject = (ids: Set<string>) => {
    updateIssues(ids, () => ({ status: "Rejected", fixedAt: null }))
    toast.success(`${ids.size > 1 ? `${ids.size} issues` : "Issue"} rejected`)
    setSelected(new Set())
  }
  const assignToMe = (ids: Set<string>) => {
    updateIssues(ids, (r) => ({ assignedTo: "Ezz H.", status: r.status === "Open" ? "In Progress" : r.status }))
    toast.success(`Assigned ${ids.size > 1 ? `${ids.size} issues` : "issue"} to you`)
    setSelected(new Set())
  }

  const openPropertyOf = (issue: DataIssue) => {
    if (!issue.propertyId) return
    setViewProperty(issue)
  }
  const propertyRowOf = (issue: DataIssue | null) =>
    issue?.propertyId ? propertyById.get(issue.propertyId) ?? propertyRows[0] ?? null : null

  const count = (s: IssueStatus) => filtered.filter((r) => r.status === s).length
  const tabCount = (t: TabKey) => issues.filter((r) => r.entity === t).length

  const renderCell = (r: DataIssue, colId: string) => {
    switch (colId) {
      case "id": return <IdTag value={r.id} />
      case "reportedBy": return <span className="whitespace-nowrap text-sm">{r.reportedBy}</span>
      case "assignedTo": return r.assignedTo ? <span className="whitespace-nowrap text-sm">{r.assignedTo}</span> : <span className="text-muted-foreground">—</span>
      case "status": return <StatusTag status={r.status} />
      case "category": return <ColorTag value={r.category} />
      case "type": return <ColorTag value={r.type} />
      case "description": return <span className="block max-w-[280px] truncate text-sm" title={r.description}>{r.description}</span>
      case "developer": return (
        <div className="whitespace-nowrap">
          <p className="text-sm font-medium text-foreground">{r.developer.name}</p>
          <IdTag value={r.developer.id} />
        </div>
      )
      case "project": return r.project ? (
        <div className="whitespace-nowrap">
          <p className="text-sm font-medium text-foreground">{r.project.name}</p>
          <IdTag value={r.project.id} />
        </div>
      ) : <span className="text-muted-foreground">—</span>
      case "phase": return r.phase ? (
        <div className="whitespace-nowrap">
          <p className="text-sm text-foreground">{r.phase.name}</p>
          <IdTag value={r.phase.id} />
        </div>
      ) : <span className="text-muted-foreground">—</span>
      case "propertyId": return r.propertyId ? <IdTag value={r.propertyId} /> : <span className="text-muted-foreground">—</span>
      case "detailedPropertyId": return r.detailedPropertyId ? <IdTag value={r.detailedPropertyId} /> : <span className="text-muted-foreground">—</span>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.updatedAt)}</span>
      case "fixedAt": return r.fixedAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.fixedAt)}</span> : <span className="text-muted-foreground">—</span>
      default: return null
    }
  }

  const renderRow = (r: DataIssue) => (
    <tr key={r.id} className={cn("hover:bg-muted/40", selected.has(r.id) && "bg-primary/5")}>
      <td className="sticky left-0 z-10 w-10 bg-card py-3 pl-4 pr-0">
        <Checkbox className="h-4 w-4" checked={selected.has(r.id)} onCheckedChange={(v) => toggleRow(r.id, !!v)} />
      </td>
      {visibleCols.map((c) => (
        <td
          key={c.id}
          className={cn("px-4 py-3 align-middle", frozenCols.has(c.id) && "sticky z-10 bg-card")}
          style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
        >
          {renderCell(r, c.id)}
        </td>
      ))}
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-full min-h-[44px] w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setViewIssue(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
            {r.propertyId && (
              <DropdownMenuItem onClick={() => openPropertyOf(r)}><Building2 className="mr-2 h-3.5 w-3.5" />View Property</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => assignToMe(new Set([r.id]))}><UserRound className="mr-2 h-3.5 w-3.5" />Assign to Me</DropdownMenuItem>
            <DropdownMenuItem onClick={() => markFixed(new Set([r.id]))}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Mark as Fixed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => reject(new Set([r.id]))} className="text-red-600 focus:text-red-600"><XCircle className="mr-2 h-3.5 w-3.5" />Reject</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Issues</h1>
          <p className="text-sm text-muted-foreground">All data issue tickets reported on properties, projects and developers</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabKey); setSelected(new Set()); setPage(1) }} className="w-full">
          <TabsList className="bg-secondary">
            {([
              { key: "Property" as TabKey, label: "Properties", icon: <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> },
              { key: "Project" as TabKey, label: "Projects", icon: <Building2 className="mr-1.5 h-3.5 w-3.5" /> },
              { key: "Developer" as TabKey, label: "Developers", icon: <Users className="mr-1.5 h-3.5 w-3.5" /> },
            ]).map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="data-[state=active]:bg-card">
                {t.icon}{t.label}
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                  {tabCount(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Issue analytics for the current tab + filters */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard icon={<AlertTriangle className="h-4 w-4 text-primary" />} label="Total Issues" value={filtered.length} />
          <StatCard icon={<CircleDot className="h-4 w-4 text-red-600" />} label="Open" value={count("Open")} total={filtered.length} />
          <StatCard icon={<Loader2 className="h-4 w-4 text-amber-500" />} label="In Progress" value={count("In Progress")} total={filtered.length} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Fixed" value={count("Fixed")} total={filtered.length} />
          <StatCard icon={<XCircle className="h-4 w-4 text-gray-500" />} label="Rejected" value={count("Rejected")} total={filtered.length} />
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Issue ID, description, property or project"
          hideAdvanced
          onAllFilters={() => setShowFilters(true)}
          onColumns={() => setShowColumns(true)}
          activeFilters={activeFilterCount}
          filters={
            <>
              <FilterMultiSelect label="Status" value={statusF} options={ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Category" value={categoryF} options={ISSUE_CATEGORIES} onChange={(v) => { setCategoryF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Type" value={typeF} options={ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Reported By" value={reporterF} options={ISSUE_PEOPLE} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Assigned To" value={assigneeF} options={ISSUE_PEOPLE} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Developer" value={developerF} options={developers.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />
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
                  <DropdownMenuItem key={k} onClick={() => { setGroupBy(k); setCollapsedGroups(new Set()) }} className="text-sm">
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
            cta={
              <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.info("Report Issue flow is coming soon")}>
                <Plus className="h-3.5 w-3.5" />Report Issue
              </Button>
            }
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
                            <span className="text-xs text-muted-foreground">{g.rows.length} issue{g.rows.length !== 1 ? "s" : ""}</span>
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
                  <tr><td colSpan={visibleCols.length + 2} className="px-5 py-16 text-center text-sm text-muted-foreground">No issues match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {groups ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} issues in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
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
          <BulkBarButton icon={<UserRound className="h-3.5 w-3.5" />} onClick={() => assignToMe(selected)}>Assign to Me</BulkBarButton>
          <BulkBarButton icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => markFixed(selected)}>Mark as Fixed</BulkBarButton>
          <BulkBarButton danger icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => reject(selected)}>Reject</BulkBarButton>
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

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
          <FilterDrawerField label="Status"><FilterMultiSelect label="Status" value={statusF} options={ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Category"><FilterMultiSelect label="Category" value={categoryF} options={ISSUE_CATEGORIES} onChange={(v) => { setCategoryF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Type"><FilterMultiSelect label="Type" value={typeF} options={ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Reported By"><FilterMultiSelect label="Reported By" value={reporterF} options={ISSUE_PEOPLE} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Assigned To"><FilterMultiSelect label="Assigned To" value={assigneeF} options={ISSUE_PEOPLE} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Developer"><FilterMultiSelect label="Developer" value={developerF} options={developers.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" /></FilterDrawerField>
          <FilterDrawerField label="Created At"><DateRangeFilter label="Created At" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} withTime className="w-full" /></FilterDrawerField>
        </FiltersDrawer>

        <IssueDetailsDrawer
          issue={viewIssue}
          list={filtered}
          onStep={(next) => setViewIssue(next)}
          onClose={() => setViewIssue(null)}
          onViewProperty={(iss) => { setViewIssue(null); openPropertyOf(iss) }}
          onMarkFixed={(iss) => markFixed(new Set([iss.id]))}
        />

        <ViewPropertyDrawer
          row={propertyRowOf(viewProperty)}
          defaultTab="unit-details"
          onClose={() => setViewProperty(null)}
          onUpdateRow={() => {}}
          highlightField={viewProperty?.field ?? undefined}
        />
      </div>
    </div>
  )
}

// ── Issue details side drawer ─────────────────────────────────────────────────
function IssueDetailsDrawer({
  issue, list, onStep, onClose, onViewProperty, onMarkFixed,
}: {
  issue: DataIssue | null
  list: DataIssue[]
  onStep: (next: DataIssue) => void
  onClose: () => void
  onViewProperty: (issue: DataIssue) => void
  onMarkFixed: (issue: DataIssue) => void
}) {
  if (!issue) return null
  const idx = list.findIndex((r) => r.id === issue.id)

  const Field = ({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: 1 | 2 }) => (
    <div className={cn("space-y-0.5", span === 2 && "col-span-2")}>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3">{children}</dl>
    </div>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[560px] !max-w-[93vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between pr-10">
            <div>
              <SheetTitle className="text-base font-semibold">Issue Details</SheetTitle>
              <IdTag value={issue.id} />
            </div>
            {idx >= 0 && list.length > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => onStep(list[idx - 1])}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="px-1 text-xs tabular-nums text-muted-foreground">{idx + 1}/{list.length}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx >= list.length - 1} onClick={() => onStep(list[idx + 1])}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="Classification">
            <Field label="Status" value={<StatusTag status={issue.status} />} />
            <Field label="Reported On" value={<ColorTag value={issue.entity} />} />
            <Field label="Category" value={<ColorTag value={issue.category} />} />
            <Field label="Type" value={<ColorTag value={issue.type} />} />
            {issue.field && (
              <Field span={2} label="Reported Field" value={
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />{issue.field}
                </span>
              } />
            )}
          </Section>

          <Section title="Description">
            <Field span={2} label="Issue" value={<p className="leading-relaxed">{issue.description}</p>} />
          </Section>

          <Section title="Linked Records">
            <Field label="Developer" value={
              <div><p className="font-medium">{issue.developer.name}</p><IdTag value={issue.developer.id} /></div>
            } />
            {issue.project && (
              <Field label="Project" value={
                <div><p className="font-medium">{issue.project.name}</p><IdTag value={issue.project.id} /></div>
              } />
            )}
            {issue.phase && (
              <Field label="Phase" value={
                <div><p>{issue.phase.name}</p><IdTag value={issue.phase.id} /></div>
              } />
            )}
            {issue.propertyId && <Field label="Property ID" value={<IdTag value={issue.propertyId} />} />}
            {issue.detailedPropertyId && <Field label="Detailed Property ID" value={<IdTag value={issue.detailedPropertyId} />} />}
          </Section>

          <Section title="People">
            <Field label="Reported By" value={issue.reportedBy} />
            <Field label="Assigned To" value={issue.assignedTo} />
          </Section>

          <Section title="Timeline">
            <Field label="Created At" value={fmtDateTime(issue.createdAt)} />
            <Field label="Updated At" value={fmtDateTime(issue.updatedAt)} />
            <Field label="Fixed At" value={issue.fixedAt ? fmtDateTime(issue.fixedAt) : null} />
          </Section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          {issue.propertyId && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onViewProperty(issue)}>
              <Building2 className="h-3.5 w-3.5" />View Property
            </Button>
          )}
          {issue.status !== "Fixed" && (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => { onMarkFixed(issue); onClose() }}>
              <CheckCircle2 className="h-3.5 w-3.5" />Mark as Fixed
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

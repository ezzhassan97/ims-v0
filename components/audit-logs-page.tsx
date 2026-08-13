"use client"

import { Fragment, useState, useMemo } from "react"
import {
  Copy,
  Check,
  Eye,
  X,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Group as GroupIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, DateRangeFilter, FilterSelect, FilterMultiSelect,
  FiltersDrawer, FilterDrawerField, ColumnsSheet, MultiSortControl, GroupPager, TabStrip, COL_SEP, type SortLevel,
} from "@/components/table-kit"

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionType = "Create" | "Edit" | "Delete"

type EntityType =
  | "Areas"
  | "Developers"
  | "Projects"
  | "Properties"
  | "Payment Plans"
  | "Brochures"
  | "Masterplans"
  | "Floor Plans"
  | "Render Images"
  | "Validation Rules"
  | "Property Categories"
  | "Property Types"
  | "Property Subtypes"
  | "Amenities"
  | "Services"

interface AuditLog {
  id: string
  entity: EntityType
  recordId: string
  action: ActionType
  user: { name: string; email: string; avatar: string }
  before: Record<string, string> | null
  after: Record<string, string> | null
  createdAt: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const USERS = [
  { name: "Ahmed Salah", email: "ahmed.salah@nawy.com", avatar: "AS" },
  { name: "Sara Karim", email: "sara.karim@nawy.com", avatar: "SK" },
  { name: "Mohamed Hassan", email: "m.hassan@nawy.com", avatar: "MH" },
  { name: "Nour Ashraf", email: "nour.ashraf@nawy.com", avatar: "NA" },
  { name: "Karim Nabil", email: "k.nabil@nawy.com", avatar: "KN" },
  { name: "Dina Fawzy", email: "dina.fawzy@nawy.com", avatar: "DF" },
]

const ENTITIES: EntityType[] = [
  "Areas",
  "Developers",
  "Projects",
  "Properties",
  "Payment Plans",
  "Brochures",
  "Masterplans",
  "Floor Plans",
  "Render Images",
  "Validation Rules",
  "Property Categories",
  "Property Types",
  "Property Subtypes",
  "Amenities",
  "Services",
]

function randomId() {
  return `LOG-${Math.random().toString(36).slice(2, 9).toUpperCase()}`
}

function randomRecordId(entity: EntityType) {
  const prefixes: Record<EntityType, string> = {
    Areas: "ARE",
    Developers: "DEV",
    Projects: "PRJ",
    Properties: "PRP",
    "Payment Plans": "PPL",
    Brochures: "BRC",
    Masterplans: "MST",
    "Floor Plans": "FLP",
    "Render Images": "RND",
    "Validation Rules": "VRL",
    "Property Categories": "PCA",
    "Property Types": "PTY",
    "Property Subtypes": "PST",
    Amenities: "AMN",
    Services: "SVC",
  }
  return `${prefixes[entity]}-${String(Math.floor(Math.random() * 90000) + 10000)}`
}

function isoDate(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(Math.floor(Math.random() * 22), Math.floor(Math.random() * 59), 0, 0)
  return d.toISOString()
}

const DEVELOPER_FIELDS = {
  name: "Emaar Misr",
  status: "Active",
  country: "Egypt",
  established: "2005",
  website: "emaar.com",
  contactEmail: "info@emaar.com",
  contactPhone: "+20 2 2510 0000",
  totalProjects: "14",
}

const PROJECT_FIELDS = {
  name: "Marassi",
  developer: "Emaar Misr",
  area: "North Coast",
  status: "Active",
  launchYear: "2012",
  totalUnits: "3200",
  deliveryYear: "2026",
  masterplanStatus: "Approved",
}

const PROPERTY_FIELDS = {
  type: "Apartment",
  area: "New Cairo",
  bedrooms: "3",
  bathrooms: "2",
  builtUpArea: "180",
  price: "4,500,000",
  currency: "EGP",
  status: "Available",
  floor: "5",
  finishing: "Semi-finished",
}

const LAUNCH_FIELDS = {
  title: "Palm Hills New Cairo Phase 3",
  developer: "Palm Hills",
  launchDate: "2024-03-15",
  status: "Published",
  unitsCount: "420",
  priceFrom: "3,200,000",
  priceTo: "8,500,000",
  currency: "EGP",
}

const ENTITY_FIELDS: Record<EntityType, Record<string, string>> = {
  Areas: { name: "New Cairo", governorate: "Cairo", zone: "East Cairo", polygon: "Defined", status: "Active" },
  Developers: DEVELOPER_FIELDS,
  Projects: PROJECT_FIELDS,
  Properties: PROPERTY_FIELDS,
  "Payment Plans": { name: "10% Down", installments: "24", downPayment: "10%", maintenance: "8%", currency: "EGP", status: "Active" },
  Brochures: { title: "Marassi Brochure 2024", project: "Marassi", language: "Arabic", pages: "32", fileSize: "12MB", status: "Published" },
  Masterplans: { title: "New Capital Masterplan v3", project: "Midtown Condo", scale: "1:5000", version: "3.0", status: "Approved" },
  "Floor Plans": { title: "Type A - 3BR", project: "Marassi", builtUpArea: "180sqm", bedrooms: "3", bathrooms: "2", status: "Active" },
  "Render Images": { title: "Pool View Render", project: "Marassi", angle: "Aerial", resolution: "4K", status: "Published" },
  "Validation Rules": { name: "Price Range Check", entity: "Properties", severity: "Error", status: "Active", field: "price", condition: "greater_than", value: "0" },
  "Property Categories": { name: "Residential", code: "RES", description: "Residential properties", status: "Active" },
  "Property Types": { name: "Apartment", category: "Residential", code: "APT", status: "Active" },
  "Property Subtypes": { name: "Studio", parentType: "Apartment", minArea: "30", maxArea: "60", status: "Active" },
  Amenities: { name: "Swimming Pool", icon: "pool", category: "Recreation", status: "Active" },
  Services: { name: "Concierge", category: "Building Services", availability: "24/7", status: "Active" },
}

function generateMockLogs(): AuditLog[] {
  const logs: AuditLog[] = []
  const actions: ActionType[] = ["Create", "Edit", "Delete", "Edit", "Edit", "Create"]

  for (let i = 0; i < 200; i++) {
    const entity = ENTITIES[i % ENTITIES.length]
    const action = actions[i % actions.length]
    const user = USERS[i % USERS.length]
    const baseFields = { ...ENTITY_FIELDS[entity] }

    let before: Record<string, string> | null = null
    let after: Record<string, string> | null = null

    if (action === "Create") {
      after = baseFields
    } else if (action === "Delete") {
      before = baseFields
    } else {
      // Edit — randomly change 1-3 fields
      before = { ...baseFields }
      after = { ...baseFields }
      const keys = Object.keys(baseFields)
      const numChanges = Math.min(3, Math.floor(Math.random() * 3) + 1)
      for (let c = 0; c < numChanges; c++) {
        const key = keys[(i + c) % keys.length]
        after[key] = before[key] + " (updated)"
      }
    }

    logs.push({
      id: randomId(),
      entity,
      recordId: randomRecordId(entity),
      action,
      user,
      before,
      after,
      createdAt: isoDate(Math.floor(i / 4)),
    })
  }

  return logs
}

const ALL_LOGS = generateMockLogs()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  )
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="flex items-center gap-1.5 group/id">
      <span className="font-mono text-[10px]">{id}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(id)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="opacity-0 group-hover/id:opacity-100 transition-opacity p-0.5 hover:bg-secondary rounded"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </span>
  )
}

const ACTION_CONFIG: Record<ActionType, { color: string; icon: React.ReactNode; bg: string }> = {
  Create: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <Plus className="h-3 w-3" />,
  },
  Edit: {
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <Pencil className="h-3 w-3" />,
  },
  Delete: {
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <Trash2 className="h-3 w-3" />,
  },
}

function ActionBadge({ action }: { action: ActionType }) {
  const cfg = ACTION_CONFIG[action]
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.bg, cfg.color)}>
      {cfg.icon}
      {action}
    </span>
  )
}

function UserAvatar({ user }: { user: AuditLog["user"] }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {user.avatar}
      </div>
      <span className="text-sm">{user.name}</span>
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function FieldDiff({
  label,
  before,
  after,
  changed,
}: {
  label: string
  before?: string
  after?: string
  changed: boolean
}) {
  return (
    <div className={cn("grid grid-cols-[160px_1fr] gap-x-4 gap-y-0.5 py-2 px-3 rounded-lg", changed && "bg-amber-50/60 border border-amber-100")}>
      <span className="text-xs font-medium text-muted-foreground self-start pt-0.5">{label}</span>
      {before != null && after != null ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm", changed ? "line-through text-muted-foreground" : "text-foreground")}>{before}</span>
            {changed && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-amber-700">{after}</span>
              </>
            )}
          </div>
        </div>
      ) : before != null ? (
        <span className="text-sm text-red-600">{before}</span>
      ) : (
        <span className="text-sm text-emerald-700">{after}</span>
      )}
    </div>
  )
}

function DetailDrawer({ log, open, onClose }: { log: AuditLog | null; open: boolean; onClose: () => void }) {
  if (!log) return null

  const allKeys = Array.from(
    new Set([...Object.keys(log.before ?? {}), ...Object.keys(log.after ?? {})])
  )

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Audit Log Detail</SheetTitle>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Meta info */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Log ID</p>
              <CopyableId id={log.id} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Record ID</p>
              <CopyableId id={log.recordId} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Entity</p>
              <span className="text-sm font-medium">{log.entity}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Action</p>
              <ActionBadge action={log.action} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">User</p>
              <UserAvatar user={log.user} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
              <span className="text-sm">{formatDateTime(log.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Field diff */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {log.action === "Create" ? "Created Fields" : log.action === "Delete" ? "Deleted Fields" : "Changed Fields"}
            {log.action === "Edit" && (
              <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                — highlighted rows changed
              </span>
            )}
          </p>
          <div className="space-y-0.5">
            {allKeys.map((key) => {
              const before = log.before?.[key]
              const after = log.after?.[key]
              const changed = log.action === "Edit" && before !== after
              return (
                <FieldDiff
                  key={key}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  before={before}
                  after={after}
                  changed={changed}
                />
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOG_COLS = [
  { id: "id", label: "Log ID", width: 150 },
  { id: "entity", label: "Entity", width: 170 },
  { id: "recordId", label: "Record ID", width: 140 },
  { id: "action", label: "Action", width: 120 },
  { id: "user", label: "User", width: 180 },
  { id: "before", label: "Before", width: 200 },
  { id: "after", label: "After", width: 200 },
  { id: "createdAt", label: "Created At", width: 170 },
]
const SORT_FIELDS = [{ key: "createdAt", label: "Created at" }]
type GroupByKey = "none" | "action" | "user" | "entity"
const GROUP_LABEL: Record<GroupByKey, string> = { none: "Group", action: "Action Type", user: "User", entity: "Entity" }
const GROUP_PAGE = 10

export function AuditLogsPage() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType | "all">("all")
  const [search, setSearch] = useState("")
  const [entityF, setEntityF] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState("")
  const [actionFilter, setActionFilter] = useState<ActionType | "">("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [drawerLog, setDrawerLog] = useState<AuditLog | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  const [colOrder, setColOrder] = useState<string[]>(LOG_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())

  const entityLogs = useMemo(
    () => (selectedEntity === "all" ? ALL_LOGS : ALL_LOGS.filter((l) => l.entity === selectedEntity)),
    [selectedEntity],
  )

  const filtered = useMemo(() => {
    let result = entityLogs
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) => l.id.toLowerCase().includes(q) || l.recordId.toLowerCase().includes(q))
    }
    if (entityF.length > 0) result = result.filter((l) => entityF.includes(l.entity))
    if (userFilter) result = result.filter((l) => l.user.name === userFilter)
    if (actionFilter) result = result.filter((l) => l.action === actionFilter)
    if (dateFrom) result = result.filter((l) => new Date(l.createdAt) >= new Date(dateFrom))
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      result = result.filter((l) => new Date(l.createdAt) <= end)
    }
    if (sorts.length > 0) {
      const dir = sorts[0].dir === "asc" ? 1 : -1
      result = [...result].sort((a, b) => dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
    }
    return result
  }, [entityLogs, search, entityF, userFilter, actionFilter, dateFrom, dateTo, sorts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const activeFilterCount =
    (entityF.length > 0 ? 1 : 0) + (userFilter ? 1 : 0) + (actionFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
  const clearFilters = () => { setEntityF([]); setUserFilter(""); setActionFilter(""); setDateFrom(""); setDateTo(""); setPage(1) }

  const uniqueUsers = Array.from(new Set(ALL_LOGS.map((l) => l.user.name))).sort()

  const entityCounts = useMemo(() => {
    const counts: Partial<Record<EntityType | "all", number>> = { all: ALL_LOGS.length }
    ENTITIES.forEach((e) => { counts[e] = ALL_LOGS.filter((l) => l.entity === e).length })
    return counts
  }, [])

  function openDrawer(log: AuditLog) {
    setDrawerLog(log)
    setDrawerOpen(true)
  }

  // ── Columns (order · visibility · freeze) ───────────────────────────────────
  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => LOG_COLS.find((c) => c.id === id)!).filter(Boolean)
  const stickyLeft = (id: string) => {
    let x = 0
    for (const c of visibleCols) {
      if (c.id === id) return x
      if (frozenCols.has(c.id)) x += c.width
    }
    return 0
  }

  /** Header-click sort — Created At only, cycling asc → desc → none (synced with the multi-sort control). */
  const cycleDateSort = () => setSorts((prev) => {
    const cur = prev.find((s) => s.key === "createdAt")
    if (!cur) return [{ key: "createdAt", dir: "asc" }]
    if (cur.dir === "asc") return [{ key: "createdAt", dir: "desc" }]
    return []
  })
  const dateDir = sorts.find((s) => s.key === "createdAt")?.dir

  // ── Grouping ────────────────────────────────────────────────────────────────
  const groupKeyOf = (l: AuditLog) => (groupBy === "action" ? l.action : groupBy === "user" ? l.user.name : l.entity)
  const groups = useMemo(() => {
    if (groupBy === "none") return []
    const m = new Map<string, AuditLog[]>()
    filtered.forEach((l) => {
      const k = groupKeyOf(l)
      m.set(k, [...(m.get(k) ?? []), l])
    })
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [filtered, groupBy])
  const toggleGroup = (k: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })

  const cellContent = (log: AuditLog, colId: string) => {
    switch (colId) {
      case "id": return <CopyableId id={log.id} />
      case "entity": return <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-md">{log.entity}</span>
      case "recordId": return <CopyableId id={log.recordId} />
      case "action": return <ActionBadge action={log.action} />
      case "user": return <UserAvatar user={log.user} />
      case "before": return log.before ? (
        <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
          {Object.entries(log.before).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          {Object.keys(log.before).length > 2 && " …"}
        </span>
      ) : <span className="text-xs text-muted-foreground/50 italic">—</span>
      case "after": return log.after ? (
        <span className="text-xs text-muted-foreground truncate block max-w-[180px]">
          {Object.entries(log.after).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          {Object.keys(log.after).length > 2 && " …"}
        </span>
      ) : <span className="text-xs text-muted-foreground/50 italic">—</span>
      case "createdAt": return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
      default: return null
    }
  }

  const logRow = (log: AuditLog) => (
    <tr
      key={log.id}
      className="group border-b border-border transition-colors hover:bg-muted/40 cursor-pointer"
      onClick={() => openDrawer(log)}
    >
      {visibleCols.map((c) => (
        <td
          key={c.id}
          className={cn("px-4 py-3", frozenCols.has(c.id) && "sticky z-10 bg-card")}
          style={frozenCols.has(c.id) ? { left: stickyLeft(c.id) } : undefined}
        >
          {cellContent(log, c.id)}
        </td>
      ))}
      <td className="sticky right-0 z-10 border-l border-border bg-card px-3 py-3 transition-colors group-hover:bg-muted/40" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDrawer(log)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )

  const filterControls = (drawer: boolean) => (
    <>
      <FilterMultiSelect label="Entity" value={entityF} options={ENTITIES} onChange={(v) => { setEntityF(v); setPage(1) }} className={drawer ? "w-full" : "w-44"} width={drawer ? "w-full" : undefined} />
      <FilterSelect label="Users" value={userFilter} options={uniqueUsers} onChange={(v) => { setUserFilter(v); setPage(1) }} className={drawer ? "w-full" : "w-40"} width={drawer ? "w-full" : undefined} />
      <FilterSelect label="Action Type" value={actionFilter} options={["Create", "Edit", "Delete"]} onChange={(v) => { setActionFilter(v as ActionType | ""); setPage(1) }} className={drawer ? "w-full" : "w-40"} width={drawer ? "w-full" : undefined} />
      <DateRangeFilter label="Date Range" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} />
    </>
  )

  return (
    <div className="p-6 space-y-5 bg-background min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track all database changes across entities</p>
      </div>

      {/* Entity tabs — the canonical grey pill strip, scrollable */}
      <TabStrip>
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {(["all", ...ENTITIES] as (EntityType | "all")[]).map((entity) => (
            <button
              key={entity} type="button"
              onClick={() => { setSelectedEntity(entity); setPage(1) }}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                selectedEntity === entity ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entity === "all" ? "All Entities" : entity}
              <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-medium text-blue-700">
                {entityCounts[entity] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </TabStrip>

      {/* Search + filters, divider, list controls */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by Log ID or Record ID..."
        activeFilters={activeFilterCount}
        onAllFilters={() => setFiltersOpen(true)}
        hideAdvanced
        filters={filterControls(false)}
        sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
        groupControl={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5">
                <GroupIcon className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(GROUP_LABEL) as GroupByKey[]).map((k) => (
                <DropdownMenuItem key={k} className="text-sm" onClick={() => { setGroupBy(k); setCollapsedGroups(new Set()); setGroupPages({}) }}>
                  {k === "none" ? "None" : GROUP_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        onColumns={() => setColumnsOpen(true)}
      />

      {/* Table */}
      <TableCard>
        <TableCardHeader
          title="Audit Logs"
          count={filtered.length}
          extra={groupBy !== "none" ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setCollapsedGroups(new Set())}>Expand all</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setCollapsedGroups(new Set(groups.map(([k]) => k)))}>Collapse all</Button>
            </div>
          ) : undefined}
        />
        <div className="overflow-x-auto">
          <table className={cn("w-max min-w-full text-sm border-collapse", COL_SEP)}>
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {visibleCols.map((c) => (
                  <th
                    key={c.id}
                    className={cn("text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide", frozenCols.has(c.id) && "sticky z-20 bg-muted")}
                    style={{ minWidth: c.width, ...(frozenCols.has(c.id) ? { left: stickyLeft(c.id) } : {}) }}
                  >
                    {c.id === "createdAt" ? (
                      <button type="button" onClick={cycleDateSort} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                        {c.label}
                        {dateDir === "asc" ? <ArrowUp className="h-3 w-3" /> : dateDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : c.label}
                  </th>
                ))}
                <th className="sticky right-0 z-10 bg-muted/60 border-l border-border px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="text-center py-16 text-muted-foreground text-sm">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : groupBy === "none" ? (
                paginated.map(logRow)
              ) : (
                groups.map(([k, logs]) => {
                  const collapsed = collapsedGroups.has(k)
                  const gPage = groupPages[k] ?? 1
                  const slice = logs.slice((gPage - 1) * GROUP_PAGE, gPage * GROUP_PAGE)
                  return (
                    <Fragment key={k}>
                      <tr className="border-b border-border bg-muted/40">
                        <td colSpan={visibleCols.length + 1} className="px-4 py-2">
                          <button type="button" onClick={() => toggleGroup(k)} className="sticky left-4 flex w-max items-center gap-2 text-sm font-medium text-foreground">
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
                            {groupBy === "action" ? <ActionBadge action={k as ActionType} /> : k}
                            <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-medium text-blue-700">{logs.length}</span>
                          </button>
                        </td>
                      </tr>
                      {!collapsed && slice.map(logRow)}
                      {!collapsed && logs.length > GROUP_PAGE && (
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={visibleCols.length + 1} className="px-4 py-1.5">
                            <div className="sticky left-4 w-max">
                              <GroupPager total={logs.length} page={gPage} pageSize={GROUP_PAGE} onPage={(p) => setGroupPages((prev) => ({ ...prev, [k]: p }))} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {groupBy === "none" && (
          <TableFooter page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="results" />
        )}
      </TableCard>

      {/* All Filters — same controls, same order, Apply / Clear pinned at the bottom */}
      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} activeCount={activeFilterCount} onClear={clearFilters}>
        <FilterDrawerField label="Search">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search by Log ID or Record ID..." className="h-8 text-sm" />
        </FilterDrawerField>
        <FilterDrawerField label="Entity">
          <FilterMultiSelect label="Entity" value={entityF} options={ENTITIES} onChange={(v) => { setEntityF(v); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Users">
          <FilterSelect label="Users" value={userFilter} options={uniqueUsers} onChange={(v) => { setUserFilter(v); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Action Type">
          <FilterSelect label="Action Type" value={actionFilter} options={["Create", "Edit", "Delete"]} onChange={(v) => { setActionFilter(v as ActionType | ""); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Date Range">
          <DateRangeFilter label="Date Range" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} />
        </FilterDrawerField>
      </FiltersDrawer>

      <ColumnsSheet
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={LOG_COLS}
        order={colOrder}
        onOrderChange={setColOrder}
        hidden={hiddenCols}
        onHiddenChange={setHiddenCols}
        frozen={frozenCols}
        onFrozenChange={setFrozenCols}
      />

      <DetailDrawer log={drawerLog} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

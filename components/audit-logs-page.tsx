"use client"

import { useState, useMemo, useRef } from "react"
import {
  Search,
  Copy,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Calendar,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { TableCard, TableCardHeader, TableToolbar, TableFooter } from "@/components/table-kit"

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
      <span className="font-mono text-xs">{id}</span>
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

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:text-primary/60">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export function AuditLogsPage() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType | "all">("all")
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [actionFilter, setActionFilter] = useState<ActionType | "">("")
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [drawerLog, setDrawerLog] = useState<AuditLog | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    if (userFilter) result = result.filter((l) => l.user.name === userFilter)
    if (actionFilter) result = result.filter((l) => l.action === actionFilter)
    if (dateFrom) result = result.filter((l) => new Date(l.createdAt) >= dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      result = result.filter((l) => new Date(l.createdAt) <= end)
    }
    return result
  }, [entityLogs, search, userFilter, actionFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const activeChips: { label: string; clear: () => void }[] = []
  if (userFilter) activeChips.push({ label: `User: ${userFilter}`, clear: () => { setUserFilter(""); setPage(1) } })
  if (actionFilter) activeChips.push({ label: `Action: ${actionFilter}`, clear: () => { setActionFilter(""); setPage(1) } })
  if (dateFrom) activeChips.push({ label: `From: ${dateFrom.toLocaleDateString("en-GB")}`, clear: () => { setDateFrom(undefined); setPage(1) } })
  if (dateTo) activeChips.push({ label: `To: ${dateTo.toLocaleDateString("en-GB")}`, clear: () => { setDateTo(undefined); setPage(1) } })

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

  const tabsRef = useRef<HTMLDivElement>(null)

  function scrollTabs(dir: "left" | "right") {
    const el = tabsRef.current
    if (!el) return
    el.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" })
  }

  return (
    <div className="p-6 space-y-5 bg-background min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track all database changes across entities</p>
      </div>

      {/* Entity tabs */}
      <div className="border-b border-border relative">
        {/* Left arrow */}
        <button
          onClick={() => scrollTabs("left")}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-background to-transparent hover:from-secondary transition-colors"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Scrollable tab strip — no visible scrollbar */}
        <div
          ref={tabsRef}
          className="flex gap-0 overflow-x-auto mx-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(["all", ...ENTITIES] as (EntityType | "all")[]).map((entity) => (
            <button
              key={entity}
              onClick={() => { setSelectedEntity(entity); setPage(1) }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                selectedEntity === entity
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {entity === "all" ? "All Entities" : entity}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                selectedEntity === entity ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
              )}>
                {entityCounts[entity] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scrollTabs("right")}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-background to-transparent hover:from-secondary transition-colors"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search + Filters */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by Log ID or Record ID..."
        activeFilters={activeChips.length}
        filters={
        <>
          {/* User filter */}
          <Select value={userFilter || "all"} onValueChange={(v) => { setUserFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className={cn("h-9 w-44", userFilter && "border-primary text-primary")}>
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueUsers.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Action filter */}
          <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v as ActionType); setPage(1) }}>
            <SelectTrigger className={cn("h-9 w-36", actionFilter && "border-primary text-primary")}>
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Edit">Edit</SelectItem>
              <SelectItem value="Delete">Delete</SelectItem>
            </SelectContent>
          </Select>

          {/* Date from */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", dateFrom && "border-primary text-primary")}>
                <Calendar className="h-3.5 w-3.5" />
                {dateFrom ? dateFrom.toLocaleDateString("en-GB") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { setDateFrom(d); setPage(1) }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date to */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", dateTo && "border-primary text-primary")}>
                <Calendar className="h-3.5 w-3.5" />
                {dateTo ? dateTo.toLocaleDateString("en-GB") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI
                mode="single"
                selected={dateTo}
                onSelect={(d) => { setDateTo(d); setPage(1) }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

        </>
        }
      />
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map((c) => <FilterChip key={c.label} label={c.label} onRemove={c.clear} />)}
          <button onClick={() => { setUserFilter(""); setActionFilter(""); setDateFrom(undefined); setDateTo(undefined); setPage(1) }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Clear all</button>
        </div>
      )}

      {/* Table */}
      <TableCard>
        <TableCardHeader title="Audit Logs" count={filtered.length} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-36">Log ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-32">Entity</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-32">Record ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-28">Action</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Before</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">After</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">Created At</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((log, i) => (
                  <tr
                    key={log.id}
                    className="border-b border-border transition-colors hover:bg-muted/40 cursor-pointer"
                    onClick={() => openDrawer(log)}
                  >
                    <td className="px-4 py-3">
                      <CopyableId id={log.id} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-md">{log.entity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <CopyableId id={log.recordId} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <UserAvatar user={log.user} />
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {log.before ? (
                        <span className="text-xs text-muted-foreground truncate block">
                          {Object.entries(log.before).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          {Object.keys(log.before).length > 2 && " …"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {log.after ? (
                        <span className="text-xs text-muted-foreground truncate block">
                          {Object.entries(log.after).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          {Object.keys(log.after).length > 2 && " …"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDrawer(log)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TableFooter page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="results" />
      </TableCard>

      <DetailDrawer log={drawerLog} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { initialConstructionUpdates } from "@/lib/mock-data"
import type { ConstructionUpdate } from "@/lib/mock-data"
import { ConstructionUpdatesTab } from "@/components/construction-updates-tab"
import { CreateConstructionUpdateDrawer } from "@/components/construction-update-drawer"
import { TableCard, TableCardHeader, TableFooter, TableToolbar, FiltersDrawer, FilterDrawerField, FilterMultiSelect, DateRangeFilter } from "@/components/table-kit"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, CalendarIcon, ChevronDown, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// Extended mock data with projectId and developerId so we can filter cross-project
interface EnrichedUpdate extends ConstructionUpdate {
  projectId: string
  projectName: string
  developerId: string
  developerName: string
}

const DEVELOPERS = [
  { id: "dev-1", name: "Palm Hills Developments" },
  { id: "dev-2", name: "SODIC" },
  { id: "dev-3", name: "Emaar Misr" },
  { id: "dev-4", name: "Mountain View" },
]

const PROJECTS = [
  { id: "prj-1", name: "Palm Hills October", developerId: "dev-1" },
  { id: "prj-2", name: "Palm Hills Katameya", developerId: "dev-1" },
  { id: "prj-3", name: "SODIC East", developerId: "dev-2" },
  { id: "prj-4", name: "SODIC West", developerId: "dev-2" },
  { id: "prj-5", name: "Uptown Cairo", developerId: "dev-3" },
  { id: "prj-6", name: "Cairo Gate", developerId: "dev-3" },
  { id: "prj-7", name: "Mountain View iCity", developerId: "dev-4" },
  { id: "prj-8", name: "Mountain View Hyde Park", developerId: "dev-4" },
]

// Spread the existing 4 updates across projects with duplicates for demo richness
const allUpdates: EnrichedUpdate[] = PROJECTS.flatMap((project, pi) =>
  initialConstructionUpdates.map((u, ui) => {
    const dev = DEVELOPERS.find((d) => d.id === project.developerId)!
    return {
      ...u,
      id: `${project.id}-${u.id}`,
      collectionId: `COL-${project.id.toUpperCase()}-${String(ui + 1).padStart(3, "0")}`,
      projectId: project.id,
      projectName: project.name,
      developerId: project.developerId,
      developerName: dev.name,
      createdAt: new Date(u.createdAt.getTime() - pi * 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(u.updatedAt.getTime() - pi * 2 * 24 * 60 * 60 * 1000),
    }
  }),
)

// Multi-select dropdown helper
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const toggleOption = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }
  const selectedLabels = options.filter((o) => selected.includes(o.id)).map((o) => o.name)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-sm font-normal min-w-[160px] justify-between",
            selected.length > 0 && "border-primary/50 bg-primary/5",
          )}
        >
          <span className="truncate text-left">
            {selected.length === 0
              ? label
              : selected.length === 1
              ? selectedLabels[0]
              : `${selected.length} selected`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1.5" align="start">
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-secondary transition-colors"
            >
              <Checkbox
                checked={selected.includes(opt.id)}
                onCheckedChange={() => toggleOption(opt.id)}
                className="pointer-events-none"
              />
              <span className="text-sm">{opt.name}</span>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="border-t border-border pt-1.5 mt-1.5 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground"
              onClick={() => onChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Date range picker helper
function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: Date | undefined
  to: Date | undefined
  onChange: (from: Date | undefined, to: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState<"from" | "to">("from")

  const hasValue = from || to
  const label = from && to
    ? `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`
    : from
    ? `From ${format(from, "MMM d, yyyy")}`
    : "Date range"

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return
    if (selecting === "from") {
      onChange(day, to && to < day ? undefined : to)
      setSelecting("to")
    } else {
      if (from && day < from) {
        onChange(day, from)
      } else {
        onChange(from, day)
      }
      setOpen(false)
      setSelecting("from")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-sm font-normal min-w-[140px] justify-between",
            hasValue && "border-primary/50 bg-primary/5",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          {selecting === "from" ? "Select start date" : "Select end date"}
        </p>
        <Calendar
          mode="single"
          selected={selecting === "from" ? from : to}
          onSelect={handleDayClick}
          modifiers={{
            range_start: from ? [from] : [],
            range_end: to ? [to] : [],
            range_middle:
              from && to
                ? {
                    after: from,
                    before: to,
                  }
                : [],
          }}
          modifiersClassNames={{
            range_start: "bg-primary text-primary-foreground rounded-l-md",
            range_end: "bg-primary text-primary-foreground rounded-r-md",
            range_middle: "bg-primary/10",
          }}
        />
        {hasValue && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => { onChange(undefined, undefined); setSelecting("from"); setOpen(false) }}
          >
            Clear dates
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function ConstructionUpdatesPage({ embedded = false, updates: extUpdates, onUpdateChange: extOnUpdateChange, onCreate: extOnCreate }: {
  /** Rendered inside a project's Construction Updates tab: no page header, no developer/project filters. */
  embedded?: boolean
  /** Embedded mode: the scoped updates, owned by the parent. */
  updates?: ConstructionUpdate[]
  onUpdateChange?: (update: ConstructionUpdate) => void
  onCreate?: (update: ConstructionUpdate) => void
} = {}) {
  const [internalUpdates, setInternalUpdates] = useState<EnrichedUpdate[]>(allUpdates)
  const rows: (ConstructionUpdate & Partial<EnrichedUpdate>)[] = embedded ? (extUpdates ?? []) : internalUpdates
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Projects filtered by selected developers
  const availableProjects = useMemo(() => {
    if (selectedDevelopers.length === 0) return PROJECTS
    return PROJECTS.filter((p) => selectedDevelopers.includes(p.developerId))
  }, [selectedDevelopers])

  // When developer selection changes, drop any selected projects not belonging to them
  const handleDeveloperChange = (ids: string[]) => {
    setSelectedDevelopers(ids)
    if (ids.length > 0) {
      setSelectedProjects((prev) =>
        prev.filter((pid) => {
          const proj = PROJECTS.find((p) => p.id === pid)
          return proj && ids.includes(proj.developerId)
        }),
      )
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    return rows.filter((u) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          u.titleEn.toLowerCase().includes(q) ||
          u.titleAr.includes(q) ||
          u.collectionId.toLowerCase().includes(q) ||
          (u.projectName ?? "").toLowerCase().includes(q) ||
          (u.developerName ?? "").toLowerCase().includes(q)
        if (!matches) return false
      }
      if (selectedDevelopers.length > 0 && (!u.developerId || !selectedDevelopers.includes(u.developerId))) return false
      if (selectedProjects.length > 0 && (!u.projectId || !selectedProjects.includes(u.projectId))) return false
      if (dateFrom && u.createdAt < new Date(dateFrom)) return false
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (u.createdAt > endOfDay) return false
      }
      return true
    })
  }, [rows, search, selectedDevelopers, selectedProjects, dateFrom, dateTo])

  // Paginate by COLLECTION (a card per collection), newest first
  const collectionIds = useMemo(() => {
    const latest = new Map<string, number>()
    for (const u of filtered) {
      const t = u.createdAt.getTime()
      if (t > (latest.get(u.collectionId) ?? 0)) latest.set(u.collectionId, t)
    }
    return [...latest.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [filtered])
  const pageIds = new Set(collectionIds.slice((page - 1) * pageSize, page * pageSize))
  const visibleUpdates = filtered.filter((u) => pageIds.has(u.collectionId))

  const handleUpdateChange = (update: ConstructionUpdate) => {
    if (embedded) extOnUpdateChange?.(update)
    else setInternalUpdates((prev) => prev.map((u) => (u.id === update.id ? { ...u, ...update } : u)))
  }

  const activeFilterCount = selectedDevelopers.length + selectedProjects.length + (dateFrom || dateTo ? 1 : 0)
  const clearAll = () => {
    setSelectedDevelopers([]); setSelectedProjects([]); setDateFrom(""); setDateTo(""); setPage(1)
  }

  const devOptions = DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))
  const projOptions = availableProjects.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className={embedded ? "space-y-4" : "space-y-4 p-4"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground">Construction Updates</h1>
          <p className="text-sm text-muted-foreground">All construction updates across projects — collected from WhatsApp, reviewed and listed.</p>
        </div>
      )}

      {/* Toolbar — canonical: search + filters, divider, list controls */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Title, collection ID, project…"
        filters={
          <>
            {!embedded && <FilterMultiSelect label="Developer" options={devOptions} value={selectedDevelopers} onChange={handleDeveloperChange} className="w-40" />}
            {!embedded && <FilterMultiSelect label="Project" options={projOptions} value={selectedProjects} onChange={(v) => { setSelectedProjects(v); setPage(1) }} className="w-40" />}
            <DateRangeFilter label="Created Date Range" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} />
          </>
        }
        activeFilters={activeFilterCount}
        onAllFilters={() => setFiltersOpen(true)}
        hideAdvanced
        hideGroup
        hideColumns
        hideSort
      />

      <TableCard>
        <TableCardHeader
          title="Construction Updates"
          count={collectionIds.length}
          extra={<span className="text-xs text-muted-foreground">{filtered.length} update{filtered.length === 1 ? "" : "s"}</span>}
          cta={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Add Update
            </Button>
          }
        />
      </TableCard>

      {/* Collections render directly on the page background */}
      {filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card text-center">
          <p className="font-medium text-muted-foreground">No updates match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground/60">Try adjusting the search or filters</p>
          <Button variant="outline" size="sm" onClick={clearAll} className="mt-4 bg-transparent">Clear all filters</Button>
        </div>
      ) : (
        <ConstructionUpdatesTab key={[...pageIds].join("·")} updates={visibleUpdates as ConstructionUpdate[]} onUpdateChange={handleUpdateChange} />
      )}

      <TableCard>
        <TableFooter page={page} pageSize={pageSize} total={collectionIds.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="collections" />
      </TableCard>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={activeFilterCount}
        onClear={clearAll}
      >
        {!embedded && (
          <FilterDrawerField label="Developer">
            <FilterMultiSelect label="Developer" options={devOptions} value={selectedDevelopers} onChange={handleDeveloperChange} className="w-full" />
          </FilterDrawerField>
        )}
        {!embedded && (
          <FilterDrawerField label="Project">
            <FilterMultiSelect label="Project" options={projOptions} value={selectedProjects} onChange={(v) => { setSelectedProjects(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
        )}
        <FilterDrawerField label="Created Date Range">
          <DateRangeFilter label="Created Date Range" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>

      <CreateConstructionUpdateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(newUpdate) => {
          if (embedded) { extOnCreate?.(newUpdate as ConstructionUpdate); return }
          setInternalUpdates((prev) => [
            {
              ...newUpdate,
              projectId: newUpdate.projectId,
              projectName: newUpdate.projectName,
              developerId: newUpdate.developerId,
              developerName: newUpdate.developerName,
            } as EnrichedUpdate,
            ...prev,
          ])
        }}
      />
    </div>
  )
}

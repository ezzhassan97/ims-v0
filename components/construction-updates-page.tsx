"use client"

import { useState, useMemo } from "react"
import { initialConstructionUpdates } from "@/lib/mock-data"
import type { ConstructionUpdate } from "@/lib/mock-data"
import { ConstructionUpdatesTab } from "@/components/construction-updates-tab"
import { CreateConstructionUpdateDrawer } from "@/components/construction-update-drawer"
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

export function ConstructionUpdatesPage() {
  const [updates, setUpdates] = useState<EnrichedUpdate[]>(allUpdates)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

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
  }

  const filtered = useMemo(() => {
    return updates.filter((u) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          u.titleEn.toLowerCase().includes(q) ||
          u.titleAr.includes(q) ||
          u.collectionId.toLowerCase().includes(q) ||
          u.projectName.toLowerCase().includes(q) ||
          u.developerName.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (selectedDevelopers.length > 0 && !selectedDevelopers.includes(u.developerId)) return false
      if (selectedProjects.length > 0 && !selectedProjects.includes(u.projectId)) return false
      if (dateFrom && u.createdAt < dateFrom) return false
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (u.createdAt > endOfDay) return false
      }
      return true
    })
  }, [updates, search, selectedDevelopers, selectedProjects, dateFrom, dateTo])

  const handleUpdateChange = (update: ConstructionUpdate) => {
    setUpdates((prev) => prev.map((u) => (u.id === update.id ? { ...u, ...update } : u)))
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    selectedDevelopers.length +
    selectedProjects.length +
    (dateFrom || dateTo ? 1 : 0)

  const clearAll = () => {
    setSearch("")
    setSelectedDevelopers([])
    setSelectedProjects([])
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Construction Updates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All construction updates across projects &mdash;{" "}
               of{" "}
              <span className="font-medium text-foreground">{updates.length}</span> updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear filters
                <Badge variant="secondary" className="text-xs ml-0.5">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by title, collection ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <MultiSelect
            label="Developer"
            options={DEVELOPERS}
            selected={selectedDevelopers}
            onChange={handleDeveloperChange}
          />

          <MultiSelect
            label="Project"
            options={availableProjects}
            selected={selectedProjects}
            onChange={setSelectedProjects}
          />

          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          />
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {selectedDevelopers.map((id) => {
              const dev = DEVELOPERS.find((d) => d.id === id)!
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                  {dev.name}
                  <button
                    onClick={() => handleDeveloperChange(selectedDevelopers.filter((d) => d !== id))}
                    className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              )
            })}
            {selectedProjects.map((id) => {
              const proj = PROJECTS.find((p) => p.id === id)!
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                  {proj.name}
                  <button
                    onClick={() => setSelectedProjects(selectedProjects.filter((p) => p !== id))}
                    className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              )
            })}
            {(dateFrom || dateTo) && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {dateFrom ? format(dateFrom, "MMM d") : "..."} –{" "}
                {dateTo ? format(dateTo, "MMM d, yyyy") : "..."}
                <button
                  onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}
                  className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground font-medium">No updates match your filters</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting the search or filters</p>
            <Button variant="outline" size="sm" onClick={clearAll} className="mt-4">
              Clear all filters
            </Button>
          </div>
        ) : (
          <ConstructionUpdatesTab updates={filtered} onUpdateChange={handleUpdateChange} />
        )}
      </div>

      <CreateConstructionUpdateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(newUpdate) => {
          setUpdates((prev) => [
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

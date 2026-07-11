"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Building2, Check, ChevronDown, ChevronRight, Download, Eye, Filter, FolderKanban,
  Group as GroupIcon, Home, Map, Plus, Search, Trash2, Upload, X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  TableCard, TableCardHeader, TableFooter, FilterMultiSelect, FilterSelect, FiltersDrawer, FilterDrawerField,
  MultiSortControl, ProjectTreeSelect, GroupPager, IdTag,
  type SortLevel, type ProjectTreeNode, type ProjectTreeSelection,
} from "@/components/table-kit"
import { cn } from "@/lib/utils"

// ── Types & mock ───────────────────────────────────────────────────────────────
type MpType = "Listing Masterplan" | "Numbered Masterplan" | "GIS Masterplan"
type MpResolution = "High" | "Med" | "Low"

interface Masterplan {
  id: string
  name: string
  imageUrl: string
  type: MpType
  resolution: MpResolution
  dimensions: { width: number; height: number }
  fileSizeKb: number
  version: number
  developerId: string
  developerName: string
  projectId: string
  projectName: string
  mainProjectId: string
  createdAt: string
}

const DEVELOPERS = [
  { id: "DEV-002", name: "Palm Hills" },
  { id: "DEV-003", name: "SODIC" },
  { id: "DEV-004", name: "Mountain View" },
  { id: "DEV-005", name: "Emaar Misr" },
]

interface ProjectRef { id: string; name: string; devId: string; parentId: string | null; status: "Active" | "Hidden" }
const PROJECTS: ProjectRef[] = [
  { id: "P-MAR", name: "Marassi", devId: "DEV-005", parentId: null, status: "Active" },
  { id: "P-MAR-1", name: "Marassi — Phase 1", devId: "DEV-005", parentId: "P-MAR", status: "Active" },
  { id: "P-MAR-2", name: "Marassi — Phase 2", devId: "DEV-005", parentId: "P-MAR", status: "Hidden" },
  { id: "P-PHO", name: "Palm Hills October", devId: "DEV-002", parentId: null, status: "Active" },
  { id: "P-PHO-1", name: "Palm Hills October — Phase 1", devId: "DEV-002", parentId: "P-PHO", status: "Active" },
  { id: "P-SW", name: "SODIC West", devId: "DEV-003", parentId: null, status: "Active" },
  { id: "P-SW-A", name: "SODIC West — Villette", devId: "DEV-003", parentId: "P-SW", status: "Hidden" },
  { id: "P-NB", name: "North Bay", devId: "DEV-004", parentId: null, status: "Hidden" },
]
const MAIN_PROJECTS = PROJECTS.filter((p) => p.parentId === null)

function projectTree(): ProjectTreeNode[] {
  return MAIN_PROJECTS.map((p) => ({
    id: p.id, name: p.name, status: p.status,
    // Display just the phase name — the parent shows in the row caption
    phases: PROJECTS.filter((ph) => ph.parentId === p.id).map((ph) => ({ id: ph.id, name: ph.name.startsWith(`${p.name} — `) ? ph.name.slice(p.name.length + 3) : ph.name, status: ph.status })),
  }))
}

const MP_TYPES: MpType[] = ["Listing Masterplan", "Numbered Masterplan", "GIS Masterplan"]
const RESOLUTIONS: MpResolution[] = ["High", "Med", "Low"]
const MP_IMG = "/aerial-view-masterplan-residential-development-blu.jpg"
const MP_BASE = new Date("2026-06-10").getTime()

const MASTERPLANS: Masterplan[] = Array.from({ length: 18 }, (_, i) => {
  const project = PROJECTS[i % PROJECTS.length]
  const dev = DEVELOPERS.find((d) => d.id === project.devId)!
  const type = MP_TYPES[i % MP_TYPES.length]
  return {
    id: `MPL-${String(3001 + i)}`,
    name: `${project.name} ${type.replace(" Masterplan", "")} v${(i % 4) + 1}`,
    imageUrl: MP_IMG,
    type,
    resolution: RESOLUTIONS[i % RESOLUTIONS.length],
    dimensions: { width: [4096, 2048, 1920][i % 3], height: [2160, 1080, 1080][i % 3] },
    fileSizeKb: [3840, 1920, 980][i % 3] + i * 13,
    version: (i % 4) + 1,
    developerId: dev.id,
    developerName: dev.name,
    projectId: project.id,
    projectName: project.name,
    mainProjectId: project.parentId ?? project.id,
    createdAt: new Date(MP_BASE - i * 86_400_000 * 2.3).toISOString(),
  }
})

const SORT_FIELDS = [
  { key: "createdAt", label: "Created at" },
  { key: "version", label: "Version" },
  { key: "fileSizeKb", label: "File size" },
]
const GROUP_FIELDS = [
  { key: "developerName", label: "Developer" },
  { key: "projectName", label: "Project" },
  { key: "type", label: "Type" },
  { key: "resolution", label: "Resolution" },
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}
const TYPE_TONE: Record<MpType, string> = {
  "Listing Masterplan": "border-blue-200 bg-blue-100 text-blue-700",
  "Numbered Masterplan": "border-purple-200 bg-purple-100 text-purple-700",
  "GIS Masterplan": "border-emerald-200 bg-emerald-100 text-emerald-700",
}

// ── Card ───────────────────────────────────────────────────────────────────────
function MasterplanCard({ mp, onDelete }: { mp: Masterplan; onDelete: () => void }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground/30">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <img src={mp.imageUrl} alt={mp.name} className="h-full w-full object-cover" />
        <span className={cn("absolute left-2 top-2 inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", TYPE_TONE[mp.type])}>
          {mp.type.replace(" Masterplan", "")}
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur">v{mp.version}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground" title={mp.name}>{mp.name}</p>
            <IdTag value={mp.id} />
          </div>
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => toast.success(`Downloading ${mp.name}…`)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{mp.developerName}</p>
          <p className="flex items-center gap-1.5"><FolderKanban className="h-3 w-3" />{mp.projectName}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span>{mp.resolution} · {mp.dimensions.width}×{mp.dimensions.height} · {(mp.fileSizeKb / 1024).toFixed(1)} MB</span>
          <span>{fmtDate(mp.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Create dialog — dependent dropdowns + multi-file upload with loading ───────
interface UploadEntry { key: string; name: string; url: string; status: "loading" | "done" }
let upKey = 0

function CreateMasterplanDialog({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (files: UploadEntry[], devId: string, projectSel: NonNullable<ProjectTreeSelection>, type: MpType) => void
}) {
  const [devId, setDevId] = useState("")
  const [projectSel, setProjectSel] = useState<ProjectTreeSelection>(null)
  const [type, setType] = useState<string>("")
  const [files, setFiles] = useState<UploadEntry[]>([])

  const reset = () => { setDevId(""); setProjectSel(null); setType(""); setFiles([]) }
  const close = () => { reset(); onClose() }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const entries: UploadEntry[] = [...list].map((f) => ({ key: `mp-up-${++upKey}`, name: f.name, url: URL.createObjectURL(f), status: "loading" as const }))
    setFiles((prev) => [...prev, ...entries])
    entries.forEach((e, i) => {
      setTimeout(() => setFiles((prev) => prev.map((f) => (f.key === e.key ? { ...f, status: "done" } : f))), 700 + i * 450)
    })
  }

  const allDone = files.length > 0 && files.every((f) => f.status === "done")
  const canSave = !!devId && !!projectSel && !!type && allDone
  const devProjects = projectTree().filter((p) => PROJECTS.find((x) => x.id === p.id)?.devId === devId)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-muted-foreground" /> Create Masterplan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Developer <span className="text-red-500">*</span></label>
              <FilterSelect label="Select developer…" value={devId} options={DEVELOPERS.map((d) => ({ value: d.id, label: d.name, sublabel: `ID: ${d.id}` }))} onChange={(v) => { setDevId(v); setProjectSel(null) }} searchable className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Project <span className="text-red-500">*</span></label>
              <ProjectTreeSelect label={devId ? "Select project…" : "Pick a developer first"} projects={devId ? devProjects : []} value={projectSel} onChange={setProjectSel} className="w-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Masterplan type <span className="text-red-500">*</span></label>
            <FilterSelect label="Select type…" value={type} options={[...MP_TYPES]} onChange={setType} className="w-full" width="w-full" />
          </div>

          <input id="mp-file-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = "" }} />
          <button
            type="button"
            onClick={() => document.getElementById("mp-file-input")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="rounded-full bg-secondary p-3"><Upload className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium">Click to choose masterplan files or drag & drop</p>
            <p className="text-xs text-muted-foreground">Multiple files supported · PNG, JPG up to 50MB</p>
          </button>

          {files.length > 0 && (
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
              {files.map((f) => (
                <div key={f.key} className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={f.url} alt={f.name} className={cn("h-full w-full object-cover transition-opacity", f.status === "loading" && "opacity-40")} />
                  {f.status === "loading" ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </span>
                  ) : (
                    <>
                      <span className="absolute left-1 top-1 rounded bg-emerald-600/90 p-0.5"><Check className="h-3 w-3 text-white" /></span>
                      <button onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => { if (projectSel) { onSave(files, devId, projectSel, type as MpType); reset() } }}>
            Save {files.length > 0 && `${files.length} masterplan${files.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function MasterplansPage({ embedded = false, scopeProject }: {
  /** Rendered inside a details tab: no page title/breadcrumb, no Developer/Project filters. */
  embedded?: boolean
  scopeProject?: { name: string; isPhase: boolean; mainProject?: string }
} = {}) {
  const [items, setItems] = useState<Masterplan[]>(MASTERPLANS)
  const [search, setSearch] = useState("")
  const [developerFilter, setDeveloperFilter] = useState<string[]>([])
  const [projectSels, setProjectSels] = useState<NonNullable<ProjectTreeSelection>[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [resolutionFilter, setResolutionFilter] = useState<string[]>([])
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const GROUP_PAGE_SIZE = 8
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<Masterplan | null>(null)

  // Scoped (project details embed): masterplans of that project (fallback to all — mock names rarely match)
  const scope = useMemo(() => {
    if (!scopeProject) return null
    const target = (scopeProject.isPhase ? scopeProject.mainProject ?? scopeProject.name : scopeProject.name).toLowerCase()
    const proj = PROJECTS.find((p) => p.name.toLowerCase() === target) ?? null
    return { proj }
  }, [scopeProject])

  const baseItems = useMemo(() => {
    if (!scope) return items
    if (!scope.proj) return items
    const mainId = scope.proj.parentId ?? scope.proj.id
    const matched = items.filter((m) => m.mainProjectId === mainId)
    return matched.length ? matched : items
  }, [items, scope])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = baseItems.filter((m) => {
      if (q && !m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false
      if (!scope && developerFilter.length > 0 && !developerFilter.includes(m.developerName)) return false
      if (!scope && projectSels.length > 0 && !projectSels.some((s) => s.projectIds.includes(m.projectId))) return false
      if (typeFilter.length > 0 && !typeFilter.includes(m.type)) return false
      if (resolutionFilter.length > 0 && !resolutionFilter.includes(m.resolution)) return false
      return true
    })
    if (!sorts.length) return result
    return [...result].sort((a, b) => {
      for (const s of sorts) {
        const va = s.key === "createdAt" ? a.createdAt : s.key === "version" ? a.version : a.fileSizeKb
        const vb = s.key === "createdAt" ? b.createdAt : s.key === "version" ? b.version : b.fileSizeKb
        if (va !== vb) return (va < vb ? -1 : 1) * (s.dir === "asc" ? 1 : -1)
      }
      return 0
    })
  }, [baseItems, scope, search, developerFilter, projectSels, typeFilter, resolutionFilter, sorts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage((p) => Math.min(p, totalPages)) }, [totalPages])
  useEffect(() => { setPage(1); setGroupPages({}) }, [search, developerFilter, projectSels, typeFilter, resolutionFilter, sorts, groupBy, pageSize])

  const sections = useMemo(() => {
    if (!groupBy) return null
    const map: Record<string, Masterplan[]> = {}
    for (const m of filtered) {
      const key = groupBy === "developerName" ? m.developerName : groupBy === "projectName" ? m.projectName : groupBy === "type" ? m.type : m.resolution
      ;(map[key] ??= []).push(m)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, groupBy])

  const activeFilterCount =
    (developerFilter.length ? 1 : 0) + (projectSels.length ? 1 : 0) + (typeFilter.length ? 1 : 0) + (resolutionFilter.length ? 1 : 0)
  const hasFilters = !!search || activeFilterCount > 0
  const clearAll = () => { setSearch(""); setDeveloperFilter([]); setProjectSels([]); setTypeFilter([]); setResolutionFilter([]) }

  const cardGrid = (rows: Masterplan[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((mp) => (
        <MasterplanCard key={mp.id} mp={mp} onDelete={() => setDeleting(mp)} />
      ))}
    </div>
  )

  return (
    <div className={cn(!embedded && "min-h-screen bg-secondary/40")}>
      <div className={cn("space-y-4", !embedded && "p-6")}>
        {!embedded && (
          <>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Home className="h-3.5 w-3.5" />
              <ChevronRight className="h-3 w-3" />
              <span>Projects Attachments</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">Masterplans</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Masterplans</h1>
              <p className="text-sm text-muted-foreground">View and manage all project masterplans in the system</p>
            </div>
          </>
        )}

        {/* Search + filters */}
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-80 shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by masterplan name or ID" className="h-8 w-full pl-8 pr-7 text-sm" />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {!scope && <FilterMultiSelect label="Developer" options={DEVELOPERS.map((d) => d.name)} value={developerFilter} onChange={setDeveloperFilter} className="flex-1" />}
              {!scope && <ProjectTreeSelect multi projects={projectTree()} values={projectSels} onValuesChange={setProjectSels} className="flex-1" />}
              <FilterMultiSelect label="Type" options={[...MP_TYPES]} value={typeFilter} onChange={setTypeFilter} className="flex-1" />
              <FilterMultiSelect label="Resolution" options={[...RESOLUTIONS]} value={resolutionFilter} onChange={setResolutionFilter} className="flex-1" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <div className="flex items-center gap-2">
              <Button variant={activeFilterCount > 0 ? "default" : "outline"} size="sm" className="h-8 gap-1.5" onClick={() => setShowAllFilters(true)}>
                <Filter className="h-3.5 w-3.5" />
                All Filters
                {activeFilterCount > 0 && <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-semibold">{activeFilterCount}</span>}
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}>
                  <X className="mr-1 h-3.5 w-3.5" />Clear All
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={groupBy ? "default" : "outline"} size="sm" className="h-8 gap-1.5">
                    <GroupIcon className="h-3.5 w-3.5" />
                    Group
                    {groupBy && <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">{GROUP_FIELDS.find((f) => f.key === groupBy)?.label}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupBy(null)}>No Grouping</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {GROUP_FIELDS.filter((f) => !scope || (f.key !== "developerName" && f.key !== "projectName")).map((f) => (
                    <DropdownMenuItem key={f.key} onClick={() => { setGroupBy(f.key); setCollapsedGroups(new Set()); setGroupPages({}) }}>
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Header — its own card; cards list freely below */}
        <TableCard>
          <TableCardHeader
            title="Masterplans"
            count={filtered.length}
            cta={
              <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />Create Masterplan
              </Button>
            }
          />
        </TableCard>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-20 text-center">
            <div className="rounded-full bg-secondary p-4"><Map className="h-8 w-8 text-muted-foreground" /></div>
            <p className="text-sm font-medium">No masterplans found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : sections ? (
          <div className="space-y-2">
            {sections.map(([key, groupRows]) => {
              const isCollapsed = collapsedGroups.has(key)
              const gp = groupPages[key] ?? 1
              const slice = groupRows.slice((gp - 1) * GROUP_PAGE_SIZE, gp * GROUP_PAGE_SIZE)
              return (
                <div key={key} className="space-y-3">
                  <button
                    className="group flex w-full items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-secondary/60"
                    onClick={() => setCollapsedGroups((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })}
                  >
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                    <span className="text-sm font-semibold text-foreground">{key}</span>
                    <Badge variant="secondary" className="text-xs">{groupRows.length.toLocaleString()}</Badge>
                    <div className="h-px flex-1 bg-border" />
                    {!isCollapsed && (
                      <GroupPager total={groupRows.length} page={gp} pageSize={GROUP_PAGE_SIZE} onPage={(p) => setGroupPages((prev) => ({ ...prev, [key]: p }))} />
                    )}
                  </button>
                  {!isCollapsed && cardGrid(slice)}
                </div>
              )
            })}
          </div>
        ) : (
          cardGrid(pageRows)
        )}

        {/* Footer */}
        {filtered.length > 0 && (sections ? (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} masterplans in {sections.length} group{sections.length !== 1 ? "s" : ""}
          </div>
        ) : (
          <TableCard>
            <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="masterplans" />
          </TableCard>
        ))}
      </div>

      {/* Create dialog */}
      <CreateMasterplanDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={(files, devId, sel, type) => {
          const dev = DEVELOPERS.find((d) => d.id === devId)!
          const target = PROJECTS.find((p) => p.id === sel.id) ?? MAIN_PROJECTS[0]
          const now = new Date().toISOString()
          setItems((prev) => [
            ...files.map((f, i) => ({
              id: `MPL-${String(4001 + prev.length + i)}`,
              name: f.name.replace(/\.[a-z]+$/i, ""),
              imageUrl: f.url,
              type,
              resolution: "High" as MpResolution,
              dimensions: { width: 4096, height: 2160 },
              fileSizeKb: 2048,
              version: 1,
              developerId: dev.id,
              developerName: dev.name,
              projectId: target.id,
              projectName: target.name,
              mainProjectId: target.parentId ?? target.id,
              createdAt: now,
            })),
            ...prev,
          ])
          toast.success(`${files.length} masterplan${files.length === 1 ? "" : "s"} saved to ${target.name}`)
          setShowCreate(false)
        }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" />Delete masterplan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-medium text-foreground">{deleting?.name}</span> (ID: {deleting?.id}) removes it from the system. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleting) { setItems((prev) => prev.filter((m) => m.id !== deleting.id)); toast.success(`${deleting.name} deleted`) } setDeleting(null) }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Filters drawer */}
      <FiltersDrawer open={showAllFilters} onClose={() => setShowAllFilters(false)} activeCount={activeFilterCount} onClear={clearAll}>
        {!scope && (
          <FilterDrawerField label="Developer">
            <FilterMultiSelect label="Developer" options={DEVELOPERS.map((d) => d.name)} value={developerFilter} onChange={setDeveloperFilter} className="w-full" />
          </FilterDrawerField>
        )}
        {!scope && (
          <FilterDrawerField label="Project">
            <ProjectTreeSelect multi projects={projectTree()} values={projectSels} onValuesChange={setProjectSels} className="w-full" />
          </FilterDrawerField>
        )}
        <FilterDrawerField label="Type">
          <FilterMultiSelect label="Type" options={[...MP_TYPES]} value={typeFilter} onChange={setTypeFilter} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Resolution">
          <FilterMultiSelect label="Resolution" options={[...RESOLUTIONS]} value={resolutionFilter} onChange={setResolutionFilter} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  BedDouble, Building2, Calendar, Check, ChevronDown, ChevronRight, Download, Eye, FolderKanban,
  Group as GroupIcon, Home, Loader2, Plus, Ruler, Search, Trash2, Upload, X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { FullscreenViewer } from "@/components/render-images-page"
import {
  TableCard, TableCardHeader, TableFooter, FilterMultiSelect, FilterSelect, FiltersDrawer, FilterDrawerField,
  MultiSortControl, ProjectTreeSelect, GroupPager, IdTag,
  type SortLevel, type ProjectTreeNode, type ProjectTreeSelection,
} from "@/components/table-kit"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types & mock ─────────────────────────────────────────────────────────────

type FpUnitType = "Apartment" | "Villa" | "Townhouse" | "Duplex" | "Studio" | "Penthouse"
type FpExt = "PNG" | "JPG" | "PDF"
type FpStatus = "Active" | "Hidden"

interface FloorPlan {
  id: string
  imageUrl: string
  unitType: FpUnitType
  bedrooms: number
  areaSqm: number
  ext: FpExt
  fileSizeKb: number
  status: FpStatus
  developerId: string
  developerName: string
  projectId: string
  projectName: string
  mainProjectId: string
  mainProjectName: string
  createdAt: string
}

const DEVELOPERS = [
  { id: "16", name: "Palm Hills" },
  { id: "254", name: "SODIC" },
  { id: "88", name: "Mountain View" },
  { id: "930", name: "Emaar Misr" },
]
interface ProjectRef { id: string; name: string; devId: string; parentId: string | null; status: "Active" | "Hidden" }
const PROJECTS: ProjectRef[] = [
  { id: "1201", name: "Marassi", devId: "930", parentId: null, status: "Active" },
  { id: "1202", name: "Marassi — Phase 1", devId: "930", parentId: "1201", status: "Active" },
  { id: "1203", name: "Marassi — Phase 2", devId: "930", parentId: "1201", status: "Hidden" },
  { id: "1204", name: "Palm Hills October", devId: "16", parentId: null, status: "Active" },
  { id: "1205", name: "Palm Hills October — Phase 1", devId: "16", parentId: "1204", status: "Active" },
  { id: "1207", name: "SODIC West", devId: "254", parentId: null, status: "Active" },
  { id: "1208", name: "SODIC West — Villette", devId: "254", parentId: "1207", status: "Hidden" },
  { id: "1209", name: "North Bay", devId: "88", parentId: null, status: "Hidden" },
]
const MAIN_PROJECTS = PROJECTS.filter((p) => p.parentId === null)

function projectTree(devId?: string): ProjectTreeNode[] {
  return MAIN_PROJECTS.filter((p) => !devId || p.devId === devId).map((p) => ({
    id: p.id, name: p.name, status: p.status,
    phases: PROJECTS.filter((ph) => ph.parentId === p.id).map((ph) => ({
      id: ph.id, name: ph.name.startsWith(`${p.name} — `) ? ph.name.slice(p.name.length + 3) : ph.name, status: ph.status,
    })),
  }))
}

const UNIT_TYPES: FpUnitType[] = ["Apartment", "Villa", "Townhouse", "Duplex", "Studio", "Penthouse"]
const UNIT_TONE: Record<FpUnitType, string> = {
  Apartment: "border-blue-200 bg-blue-100 text-blue-700",
  Villa: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Townhouse: "border-teal-200 bg-teal-100 text-teal-700",
  Duplex: "border-purple-200 bg-purple-100 text-purple-700",
  Studio: "border-gray-200 bg-gray-100 text-gray-600",
  Penthouse: "border-amber-200 bg-amber-100 text-amber-700",
}
const STATUS_TONE: Record<FpStatus, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-700",
}
function FpStatusTag({ status }: { status: FpStatus }) {
  return <span className={cn("inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none", STATUS_TONE[status])}>{status}</span>
}

const FP_IMG = "/placeholder.jpg"
const FP_BASE = new Date("2026-06-14").getTime()
const BEDS: Record<FpUnitType, number[]> = {
  Apartment: [1, 2, 3], Villa: [3, 4, 5], Townhouse: [3, 4], Duplex: [3, 4], Studio: [0], Penthouse: [3, 4],
}

const FLOOR_PLANS0: FloorPlan[] = Array.from({ length: 20 }, (_, i) => {
  const project = PROJECTS[i % PROJECTS.length]
  const dev = DEVELOPERS.find((d) => d.id === project.devId)!
  const unitType = UNIT_TYPES[i % UNIT_TYPES.length]
  const bedrooms = BEDS[unitType][i % BEDS[unitType].length]
  return {
    id: `FPL-${4001 + i}`,
    imageUrl: FP_IMG,
    unitType,
    bedrooms,
    areaSqm: bedrooms === 0 ? 55 + (i % 3) * 8 : 90 + bedrooms * 55 + (i % 4) * 12,
    ext: (["PNG", "JPG", "PDF"] as const)[i % 3],
    fileSizeKb: 640 + i * 47,
    status: i % 4 === 3 ? "Hidden" : "Active",
    developerId: dev.id,
    developerName: dev.name,
    projectId: project.id,
    projectName: project.name,
    mainProjectId: project.parentId ?? project.id,
    mainProjectName: project.parentId ? PROJECTS.find((x) => x.id === project.parentId)!.name : project.name,
    createdAt: new Date(FP_BASE - i * 86_400_000 * 1.9).toISOString(),
  }
})

const SORT_FIELDS = [
  { key: "createdAt", label: "Created at" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "areaSqm", label: "Unit area" },
  { key: "fileSizeKb", label: "File size" },
]
const GROUP_FIELDS = [
  { key: "none", label: "Group by" },
  { key: "developerName", label: "Developer" },
  { key: "projectName", label: "Project" },
  { key: "unitType", label: "Unit Type" },
  { key: "bedrooms", label: "Bedrooms" },
]

/** Canonical timestamp: "10 Jan 2026, 07:00 AM". */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${date}, ${time}`
}
function projectLine(fp: FloorPlan): string {
  if (fp.projectId === fp.mainProjectId) return fp.mainProjectName
  const phase = fp.projectName.startsWith(`${fp.mainProjectName} — `) ? fp.projectName.slice(fp.mainProjectName.length + 3) : fp.projectName
  return `${fp.mainProjectName} - ${phase}`
}
const bedLabel = (n: number) => (n === 0 ? "Studio" : `${n} BR`)

// ─── Card ─────────────────────────────────────────────────────────────────────

function FloorPlanCard({ fp, onView, onDelete, onStatusChange }: {
  fp: FloorPlan; onView: () => void; onDelete: () => void; onStatusChange: (s: FpStatus) => void
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground/30">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img src={fp.imageUrl} alt={fp.id} className="h-full w-full object-cover" />
        <span className={cn("absolute left-2 top-2 inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", UNIT_TONE[fp.unitType])}>
          {fp.unitType}
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur">{bedLabel(fp.bedrooms)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <IdTag value={fp.id} className="text-xs font-medium text-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="Change status" className="inline-flex items-center gap-0.5">
                  <FpStatusTag status={fp.status} />
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["Active", "Hidden"] as FpStatus[]).map((s) => (
                  <DropdownMenuItem key={s} className="text-sm" onClick={() => onStatusChange(s)}>
                    <Check className={cn("mr-1.5 h-3.5 w-3.5", fp.status === s ? "opacity-100" : "opacity-0")} />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onView}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => toast.success(`Downloading ${fp.id}…`)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{fp.developerName}</span>
            <IdTag value={fp.developerId} />
          </p>
          <p className="flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{projectLine(fp)}</span>
            <IdTag value={fp.projectId} />
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
          <span className="truncate">{fp.ext} · {(fp.fileSizeKb / 1024).toFixed(1)} MB · {fp.areaSqm} m²</span>
          <span className="flex flex-shrink-0 items-center gap-1">
            <Calendar className="h-3 w-3" />{fmtDateTime(fp.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── View drawer ──────────────────────────────────────────────────────────────

function FloorPlanDrawer({ fp, onClose, onDelete }: { fp: FloorPlan | null; onClose: () => void; onDelete: (fp: FloorPlan) => void }) {
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenRef = useRef(false)
  fullscreenRef.current = fullscreen
  useEffect(() => { setFullscreen(false) }, [fp?.id])
  if (!fp) return null
  return (
    <>
      <Sheet open onOpenChange={(o) => { if (!o && !fullscreenRef.current) onClose() }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[560px]"
          onEscapeKeyDown={(e) => { if (fullscreenRef.current) e.preventDefault() }}
          onPointerDownOutside={(e) => { if (fullscreenRef.current) e.preventDefault() }}
          onInteractOutside={(e) => { if (fullscreenRef.current) e.preventDefault() }}
        >
          <SheetTitle className="sr-only">Floor plan {fp.id}</SheetTitle>
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4">
            <IdTag value={fp.id} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground" />
            <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", UNIT_TONE[fp.unitType])}>{fp.unitType}</span>
            <FpStatusTag status={fp.status} />
            <Badge variant="outline" className="text-xs">{bedLabel(fp.bedrooms)}</Badge>
          </div>

          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              <button className="block w-full cursor-zoom-in" onClick={() => setFullscreen(true)}>
                <img src={fp.imageUrl} alt={fp.id} className="aspect-[4/3] w-full object-cover" />
              </button>
              <div className="absolute right-2 top-2 flex gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
                  onClick={() => toast.success(`Downloading ${fp.id}…`)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-background/90 text-red-600 shadow-sm backdrop-blur hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDelete(fp)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Developer</div>
                <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium text-foreground">{fp.developerName}</span><IdTag value={fp.developerId} /></div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project</div>
                <div className="flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate font-medium text-foreground">{projectLine(fp)}</span><IdTag value={fp.projectId} /></div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Bedrooms</div>
                <div className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-foreground">{bedLabel(fp.bedrooms)}</span></div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Unit Area</div>
                <div className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-foreground">{fp.areaSqm} m²</span></div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Format</div>
                <span className="text-foreground">{fp.ext} · {(fp.fileSizeKb / 1024).toFixed(1)} MB</span>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Created At</div>
                <span className="text-foreground">{fmtDateTime(fp.createdAt)}</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {fullscreen && (
        <FullscreenViewer images={[fp.imageUrl]} startIndex={0} onClose={() => setFullscreen(false)} label={fp.id} caption={projectLine(fp)} />
      )}
    </>
  )
}

// ─── Upload dialog ────────────────────────────────────────────────────────────

interface UploadEntry { name: string; loading: boolean }

function UploadFloorPlanDialog({ onClose, onSave }: {
  onClose: () => void
  onSave: (files: UploadEntry[], devId: string, projectSel: NonNullable<ProjectTreeSelection>, unitType: FpUnitType) => void
}) {
  const [devId, setDevId] = useState("")
  const [projectSel, setProjectSel] = useState<ProjectTreeSelection>(null)
  const [unitType, setUnitType] = useState<FpUnitType>("Apartment")
  const [files, setFiles] = useState<UploadEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = [...list].map((f) => ({ name: f.name, loading: true }))
    setFiles((prev) => [...prev, ...incoming])
    incoming.forEach((f, i) => setTimeout(() => {
      setFiles((prev) => prev.map((x) => (x.name === f.name ? { ...x, loading: false } : x)))
    }, 700 + i * 450))
  }
  const ready = devId && projectSel && files.length > 0 && files.every((f) => !f.loading)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload Floor Plans</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Developer</div>
            <FilterSelect label="Select developer…" value={devId} options={DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDevId(v); setProjectSel(null) }} searchable className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Project</div>
            <ProjectTreeSelect projects={projectTree(devId || undefined)} value={projectSel} onChange={setProjectSel} className="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Unit Type</div>
            <FilterSelect label="Select unit type…" value={unitType} options={[...UNIT_TYPES]} onChange={(v) => setUnitType(v as FpUnitType)} className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Files</div>
            <button
              type="button"
              className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card transition-colors hover:border-muted-foreground/40"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Browse floor plan images (PNG, JPG, PDF)</span>
            </button>
            <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
                {f.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!ready} onClick={() => onSave(files, devId, projectSel!, unitType)}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FloorPlansPage({ embedded = false, scopeProject }: { embedded?: boolean; scopeProject?: { name: string } } = {}) {
  const [items, setItems] = useState<FloorPlan[]>(FLOOR_PLANS0)
  const [viewing, setViewing] = useState<FloorPlan | null>(null)
  const [deleting, setDeleting] = useState<FloorPlan | null>(null)
  const [uploading, setUploading] = useState(false)

  const [search, setSearch] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [projectSels, setProjectSels] = useState<string[]>([])
  const [unitTypeF, setUnitTypeF] = useState<string[]>([])
  const [statusF, setStatusF] = useState<string[]>([])
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<string>("none")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const GROUP_PAGE_SIZE = 12
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})

  // Scoped embed (project details): name-match with fallback to all — mock names may not align
  const baseItems = useMemo(() => {
    if (!scopeProject) return items
    const scoped = items.filter((fp) => fp.mainProjectName === scopeProject.name || fp.projectName === scopeProject.name)
    return scoped.length > 0 ? scoped : items
  }, [items, scopeProject])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    let out = baseItems.filter((fp) => {
      if (needle && !`${fp.id} ${fp.projectName} ${fp.developerName}`.toLowerCase().includes(needle)) return false
      if (developerF.length > 0 && !developerF.includes(fp.developerName)) return false
      if (projectSels.length > 0 && !projectSels.includes(fp.projectId)) return false
      if (unitTypeF.length > 0 && !unitTypeF.includes(fp.unitType)) return false
      if (statusF.length > 0 && !statusF.includes(fp.status)) return false
      return true
    })
    if (sorts.length > 0) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const va = s.key === "createdAt" ? new Date(a.createdAt).getTime() : (a[s.key as "bedrooms" | "areaSqm" | "fileSizeKb"] as number)
          const vb = s.key === "createdAt" ? new Date(b.createdAt).getTime() : (b[s.key as "bedrooms" | "areaSqm" | "fileSizeKb"] as number)
          if (va !== vb) return s.dir === "asc" ? va - vb : vb - va
        }
        return 0
      })
    }
    return out
  }, [baseItems, search, developerF, projectSels, unitTypeF, statusF, sorts])

  useEffect(() => { setPage(1); setGroupPages({}) }, [search, developerF, projectSels, unitTypeF, statusF, sorts, groupBy, pageSize])

  const groups = groupBy === "none" ? null : (() => {
    const map = new Map<string, FloorPlan[]>()
    for (const fp of filtered) {
      const k = groupBy === "developerName" ? fp.developerName : groupBy === "projectName" ? fp.projectName : groupBy === "unitType" ? fp.unitType : bedLabel(fp.bedrooms)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(fp)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, list]) => ({ label, list }))
  })()

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const activeFilters = (developerF.length ? 1 : 0) + (projectSels.length ? 1 : 0) + (unitTypeF.length ? 1 : 0) + (statusF.length ? 1 : 0)
  const clearAll = () => { setSearch(""); setDeveloperF([]); setProjectSels([]); setUnitTypeF([]); setStatusF([]) }

  const patch = (id: string, p: Partial<FloorPlan>) => setItems((prev) => prev.map((fp) => (fp.id === id ? { ...fp, ...p } : fp)))

  const renderCard = (fp: FloorPlan) => (
    <FloorPlanCard
      key={fp.id} fp={fp}
      onView={() => setViewing(fp)}
      onDelete={() => setDeleting(fp)}
      onStatusChange={(s) => { patch(fp.id, { status: s }); toast.success(`${fp.id} set to ${s}`) }}
    />
  )

  const grid = (list: FloorPlan[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map(renderCard)}</div>
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
              <span className="font-medium text-foreground">Floor Plans</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Floor Plans</h1>
              <p className="text-sm text-muted-foreground">Unit floor plans across all projects and phases</p>
            </div>
          </>
        )}

        {/* Toolbar */}
        <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[300px] flex-shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, project or developer" className="h-8 w-full pl-8 pr-7 text-sm" />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <FilterMultiSelect label="Developer" options={DEVELOPERS.map((d) => d.name)} value={developerF} onChange={setDeveloperF} className="flex-1" />
            <ProjectTreeSelect multi projects={projectTree()} values={projectSels} onValuesChange={setProjectSels} className="flex-1" />
            <FilterMultiSelect label="Unit Type" options={[...UNIT_TYPES]} value={unitTypeF} onChange={setUnitTypeF} className="flex-1" />
            <FilterMultiSelect label="Status" options={["Active", "Hidden"]} value={statusF} onChange={setStatusF} className="flex-1" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowFilters(true)}>
                All Filters{activeFilters > 0 && <span className="rounded bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{activeFilters}</span>}
              </Button>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearAll}>Clear Filters</Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5">
                    <GroupIcon className="h-3.5 w-3.5" />{GROUP_FIELDS.find((g) => g.key === groupBy)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {GROUP_FIELDS.map((g) => (
                    <DropdownMenuItem key={g.key} className="text-sm" onClick={() => setGroupBy(g.key)}>
                      {g.key === "none" ? "No grouping" : g.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Header card */}
        <TableCard>
          <TableCardHeader
            title="Floor Plans"
            count={filtered.length}
            cta={
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setUploading(true)}>
                <Plus className="h-3.5 w-3.5" />Upload Floor Plan
              </Button>
            }
          />
        </TableCard>

        {/* Cards — free grid under the header */}
        {groups ? (
          <div className="space-y-4">
            {groups.map((g) => {
              const pg = groupPages[g.label] ?? 1
              return (
                <div key={g.label} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{g.label}</h3>
                    <span className="rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{g.list.length}</span>
                    <GroupPager total={g.list.length} page={pg} pageSize={GROUP_PAGE_SIZE} onPage={(p) => setGroupPages((prev) => ({ ...prev, [g.label]: p }))} />
                  </div>
                  {grid(g.list.slice((pg - 1) * GROUP_PAGE_SIZE, pg * GROUP_PAGE_SIZE))}
                </div>
              )
            })}
            {groups.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No floor plans match your filters.</p>}
          </div>
        ) : (
          <>
            {grid(pageItems)}
            {filtered.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No floor plans match your filters.</p>}
            <TableCard>
              <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="floor plans" />
            </TableCard>
          </>
        )}
      </div>

      {/* All Filters drawer — same controls, same order */}
      <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilters} onClear={clearAll}>
        <FilterDrawerField label="Developer">
          <FilterMultiSelect label="Developer" options={DEVELOPERS.map((d) => d.name)} value={developerF} onChange={setDeveloperF} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Project">
          <ProjectTreeSelect multi projects={projectTree()} values={projectSels} onValuesChange={setProjectSels} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Unit Type">
          <FilterMultiSelect label="Unit Type" options={[...UNIT_TYPES]} value={unitTypeF} onChange={setUnitTypeF} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Status">
          <FilterMultiSelect label="Status" options={["Active", "Hidden"]} value={statusF} onChange={setStatusF} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>

      <FloorPlanDrawer fp={viewing} onClose={() => setViewing(null)} onDelete={(fp) => { setViewing(null); setDeleting(fp) }} />

      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Delete floor plan?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{deleting.id}</span> ({deleting.unitType}, {bedLabel(deleting.bedrooms)}) will be permanently removed.
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700"
                onClick={() => { setItems((prev) => prev.filter((fp) => fp.id !== deleting.id)); toast.success(`${deleting.id} deleted`); setDeleting(null) }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {uploading && (
        <UploadFloorPlanDialog
          onClose={() => setUploading(false)}
          onSave={(files, devId, projectSel, unitType) => {
            const dev = DEVELOPERS.find((d) => d.id === devId)!
            const targetId = projectSel.id.startsWith("GRP-") ? projectSel.projectIds[0] : projectSel.id
            const target = PROJECTS.find((p) => p.id === targetId) ?? PROJECTS[0]
            const stamp = new Date().toISOString()
            setItems((prev) => [
              ...files.map((f, i) => ({
                id: `FPL-${4100 + prev.length + i}`,
                imageUrl: FP_IMG,
                unitType,
                bedrooms: BEDS[unitType][0],
                areaSqm: 120,
                ext: (f.name.toLowerCase().endsWith(".pdf") ? "PDF" : f.name.toLowerCase().endsWith(".png") ? "PNG" : "JPG") as FpExt,
                fileSizeKb: 900,
                status: "Active" as FpStatus,
                developerId: dev.id,
                developerName: dev.name,
                projectId: target.id,
                projectName: target.name,
                mainProjectId: target.parentId ?? target.id,
                mainProjectName: target.parentId ? PROJECTS.find((x) => x.id === target.parentId)!.name : target.name,
                createdAt: stamp,
              })),
              ...prev,
            ])
            toast.success(`${files.length} floor plan${files.length > 1 ? "s" : ""} uploaded`)
            setUploading(false)
          }}
        />
      )}
    </div>
  )
}

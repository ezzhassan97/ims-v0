"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Download, Eye, FileText, FileX2, Home, Image as ImageIcon, LayoutGrid, Loader2,
  Map as MapIcon, MoreHorizontal, Search, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  TableCard, TableCardHeader, TableFooter, FilterMultiSelect, FiltersDrawer, FilterDrawerField,
  ColumnsSheet, MultiSortControl, ProjectTreeSelect, IdTag, COL_SEP,
  type SortLevel, type ProjectTreeNode,
} from "@/components/table-kit"
import { PROJECTS } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types & mock ─────────────────────────────────────────────────────────────

type ExtractionStage = "Not Extracted" | "Queued" | "Extracting" | "Pending Review" | "Reviewed"
interface ReviewCount { reviewed: number; total: number }
export interface Brochure {
  id: string
  fileName: string
  fileSizeMb: number
  developerId: string
  developerName: string
  projectId: string
  projectName: string
  /** null when the brochure is linked to the main project directly */
  phaseId: string | null
  phaseName: string | null
  extraction: ExtractionStage
  floorPlans: ReviewCount
  renderImages: ReviewCount
  masterplans: ReviewCount
  createdAt: string
  updatedAt: string
}

const STAGES: ExtractionStage[] = ["Not Extracted", "Queued", "Extracting", "Pending Review", "Reviewed"]
const STAGE_TONE: Record<ExtractionStage, string> = {
  "Not Extracted": "border-gray-200 bg-gray-100 text-gray-600",
  Queued: "border-blue-200 bg-blue-100 text-blue-700",
  Extracting: "border-purple-200 bg-purple-100 text-purple-700",
  "Pending Review": "border-amber-200 bg-amber-100 text-amber-700",
  Reviewed: "border-emerald-200 bg-emerald-100 text-emerald-700",
}
function StageTag({ stage }: { stage: ExtractionStage }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STAGE_TONE[stage])}>{stage}</span>
}

const DAY = 86_400_000
const B0 = new Date("2026-06-20T10:00:00").getTime()

const BROCHURES0: Brochure[] = Array.from({ length: 14 }, (_, i) => {
  const row = PROJECTS[i % PROJECTS.length]
  const stage = STAGES[i % 5]
  const mk = (total: number, seed: number): ReviewCount => {
    if (stage === "Not Extracted" || stage === "Queued") return { reviewed: 0, total: 0 }
    if (stage === "Extracting") return { reviewed: 0, total }
    if (stage === "Reviewed") return { reviewed: total, total }
    return { reviewed: Math.floor((total * ((seed % 4) + 1)) / 5), total }
  }
  return {
    id: String(82490 - i * 37),
    fileName: `${(row.isPhase ? row.mainProject!.name : row.name).replace(/\s+/g, "-")}-Brochure${i % 3 === 2 ? "-v2" : ""}.pdf`,
    fileSizeMb: Number((2 + ((i * 1.7) % 9)).toFixed(1)),
    developerId: row.developer.id,
    developerName: row.developer.name,
    projectId: row.isPhase ? row.mainProject!.id : row.id,
    projectName: row.isPhase ? row.mainProject!.name : row.name,
    phaseId: row.isPhase ? row.id : null,
    phaseName: row.isPhase ? row.name : null,
    extraction: stage,
    floorPlans: mk(6 + ((i * 3) % 19), i),
    renderImages: mk(20 + ((i * 7) % 70), i + 1),
    masterplans: mk(1 + (i % 3), i + 2),
    createdAt: new Date(B0 - i * 2.6 * DAY).toISOString(),
    updatedAt: new Date(B0 - i * 1.1 * DAY).toISOString(),
  }
})

/** Canonical timestamp: "10 Jan 2026, 07:00 AM". */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${date}, ${time}`
}
const sumReviewed = (b: Brochure) => b.floorPlans.reviewed + b.renderImages.reviewed + b.masterplans.reviewed
const sumTotal = (b: Brochure) => b.floorPlans.total + b.renderImages.total + b.masterplans.total
const progressPct = (b: Brochure) => (sumTotal(b) === 0 ? 0 : Math.round((sumReviewed(b) / sumTotal(b)) * 100))

function projectTree(): ProjectTreeNode[] {
  return PROJECTS.filter((p) => !p.isPhase).map((p) => ({
    id: p.id, name: p.name, status: p.listingStatus,
    phases: PROJECTS.filter((ph) => ph.isPhase && ph.mainProject?.id === p.id).map((ph) => ({ id: ph.id, name: ph.name, status: ph.listingStatus })),
  }))
}

// ─── Small shared bits ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-6 text-foreground">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

/** Linked entity cell: name opens the (mock) details route, ID caption with copy. */
function LinkCell({ name, id, href }: { name: string; id: string; href: string }) {
  return (
    <div className="min-w-0">
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        className="block max-w-[180px] truncate text-sm font-medium text-foreground hover:text-primary hover:underline">
        {name}
      </a>
      <IdTag value={id} />
    </div>
  )
}

function ReviewProgressCell({ b }: { b: Brochure }) {
  if (sumTotal(b) === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-44 cursor-default">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{sumReviewed(b)}/{sumTotal(b)} reviewed</span>
            <span className="font-medium text-foreground">{progressPct(b)}%</span>
          </div>
          <Progress value={progressPct(b)} className="h-1.5" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="space-y-0.5">
        <p>Floor Plans: {b.floorPlans.reviewed}/{b.floorPlans.total}</p>
        <p>Render Images: {b.renderImages.reviewed}/{b.renderImages.total}</p>
        <p>Masterplans: {b.masterplans.reviewed}/{b.masterplans.total}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Fullscreen PDF preview ───────────────────────────────────────────────────

function PdfPreviewDialog({ b, onClose }: { b: Brochure; onClose: () => void }) {
  const pages = Math.max(6, Math.round(b.fileSizeMb * 4))
  const [page, setPage] = useState(1)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[86vw]">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <DialogTitle className="truncate text-sm font-semibold">{b.fileName}</DialogTitle>
          <IdTag value={b.id} className="text-[11px]" />
          <span className="text-xs text-muted-foreground">{b.fileSizeMb} MB</span>
          <Button variant="outline" size="sm" className="ml-auto mr-6 h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => toast.success(`Downloading ${b.fileName}…`)}>
            <Download className="h-3.5 w-3.5" />Download
          </Button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-900 p-6">
          {/* Mock page — real viewer renders the PDF here */}
          <div className="flex h-full max-h-full flex-col overflow-hidden rounded-md bg-white shadow-2xl" style={{ aspectRatio: "1 / 1.35" }}>
            <img src="/aerial-view-masterplan-residential-development-blu.jpg" alt={`${b.fileName} — page ${page}`} className="h-3/5 w-full object-cover" />
            <div className="flex-1 space-y-2.5 p-6">
              <div className="h-3 w-2/3 rounded bg-neutral-200" />
              <div className="h-2 w-full rounded bg-neutral-100" />
              <div className="h-2 w-full rounded bg-neutral-100" />
              <div className="h-2 w-4/5 rounded bg-neutral-100" />
              <div className="h-2 w-11/12 rounded bg-neutral-100" />
              <div className="h-2 w-3/5 rounded bg-neutral-100" />
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-background/95 px-1.5 py-1 shadow-md backdrop-blur">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs font-medium text-foreground">Page {page} / {pages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Brochure details: review extracted assets ────────────────────────────────

type AssetKind = "Floor Plans" | "Render Images" | "Masterplans"
type AssetStatus = "Needs Review" | "Approved" | "Rejected"
interface ExtractedAsset {
  id: string
  kind: AssetKind
  title: string
  desc: string
  page: number
  keywords: string[]
  imageUrl: string
  status: AssetStatus
}

const ASSET_STATUS_TONE: Record<AssetStatus, string> = {
  "Needs Review": "border-amber-200 bg-amber-100 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Rejected: "border-red-200 bg-red-100 text-red-700",
}

const ASSET_META: Record<AssetKind, { imgs: string[]; titles: string[]; keywords: string[] }> = {
  "Floor Plans": {
    imgs: ["/placeholder.jpg", "/aerial-view-masterplan-residential-development-blu.jpg"],
    titles: ["Typical floor plan — 2BR Type A", "Ground floor plan — 3BR corner", "First floor plan — Villa 320", "Roof plan — Penthouse", "Duplex lower level plan", "Studio unit plan"],
    keywords: ["floor plan", "layout", "dimensions", "rooms"],
  },
  "Render Images": {
    imgs: ["/luxury-clubhouse-exterior.jpg", "/aerial-view-masterplan-residential-development-blu.jpg", "/placeholder.jpg"],
    titles: ["Clubhouse exterior at dusk", "Central park landscape", "Aerial view of the compound", "Pool deck render", "Boulevard street scene", "Residential cluster facade"],
    keywords: ["render", "exterior", "landscape", "lifestyle"],
  },
  Masterplans: {
    imgs: ["/aerial-view-masterplan-residential-development-blu.jpg"],
    titles: ["Full compound masterplan", "Phase masterplan overview", "Zoning masterplan"],
    keywords: ["masterplan", "aerial", "zoning", "phases"],
  },
}

function genAssets(b: Brochure): ExtractedAsset[] {
  const build = (kind: AssetKind, rc: ReviewCount, idBase: number): ExtractedAsset[] => {
    const meta = ASSET_META[kind]
    return Array.from({ length: rc.total }, (_, i) => ({
      id: `${b.id}-${idBase + i}`,
      kind,
      title: meta.titles[i % meta.titles.length],
      desc: `${meta.titles[i % meta.titles.length]} extracted from ${b.fileName}.`,
      page: 3 + ((i * 7) % 60),
      keywords: meta.keywords.slice(0, 3 + (i % 2)),
      imageUrl: meta.imgs[i % meta.imgs.length],
      status: i < rc.reviewed ? "Approved" : "Needs Review",
    }))
  }
  return [
    ...build("Floor Plans", b.floorPlans, 100),
    ...build("Render Images", b.renderImages, 400),
    ...build("Masterplans", b.masterplans, 900),
  ]
}

function AssetCard({ a, onStatus }: { a: ExtractedAsset; onStatus: (s: AssetStatus) => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img src={a.imageUrl} alt={a.title} className="h-full w-full object-cover" />
        <span className={cn("absolute left-2 top-2 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", ASSET_STATUS_TONE[a.status])}>{a.status}</span>
        <span className="absolute right-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur">P. {a.page}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{a.title}</p>
        <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">{a.desc}</p>
        <div className="flex flex-wrap gap-1">
          {a.keywords.map((k) => (
            <span key={k} className="rounded border border-border px-1 py-px text-[10px] text-muted-foreground">{k}</span>
          ))}
        </div>
        <div className="mt-auto flex gap-1.5 pt-1.5">
          <Button
            variant="outline" size="sm"
            className={cn("h-7 flex-1 gap-1 text-xs", a.status === "Approved"
              ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700")}
            onClick={() => onStatus("Approved")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />Approve
          </Button>
          <Button
            variant="outline" size="sm"
            className={cn("h-7 flex-1 gap-1 text-xs", a.status === "Rejected"
              ? "border-red-600 bg-red-600 text-white hover:bg-red-600 hover:text-white"
              : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600")}
            onClick={() => onStatus("Rejected")}
          >
            <X className="h-3.5 w-3.5" />Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

const KIND_ICON: Record<AssetKind, typeof LayoutGrid> = { "Floor Plans": LayoutGrid, "Render Images": ImageIcon, Masterplans: MapIcon }

export function BrochureDetailsPage({ brochure: b, onBack }: { brochure: Brochure; onBack: () => void }) {
  const [assets, setAssets] = useState<ExtractedAsset[]>(() => genAssets(b))
  const approved = assets.filter((a) => a.status === "Approved").length
  const pct = assets.length === 0 ? 0 : Math.round((approved / assets.length) * 100)

  const setStatus = (id: string, s: AssetStatus) => setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status: s } : a)))
  const setAllOfKind = (kind: AssetKind, s: AssetStatus) => {
    setAssets((prev) => prev.map((a) => (a.kind === kind ? { ...a, status: s } : a)))
    toast.success(`All ${kind.toLowerCase()} ${s === "Approved" ? "approved" : "rejected"}`)
  }

  const kindTab = (kind: AssetKind) => {
    const list = assets.filter((a) => a.kind === kind)
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{kind}</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{list.length}</span>
          <span className="text-xs text-muted-foreground">
            {list.filter((a) => a.status === "Approved").length} approved · {list.filter((a) => a.status === "Rejected").length} rejected
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={list.length === 0} onClick={() => setAllOfKind(kind, "Rejected")}>
              <X className="h-3.5 w-3.5" />Reject All
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={list.length === 0} onClick={() => setAllOfKind(kind, "Approved")}>
              <CheckCircle2 className="h-3.5 w-3.5" />Approve All
            </Button>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-14 text-sm text-muted-foreground">
            <FileX2 className="h-4 w-4" />No {kind.toLowerCase()} extracted from this brochure
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((a) => <AssetCard key={a.id} a={a} onStatus={(s) => setStatus(a.id, s)} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3" />
          <button className="hover:text-foreground hover:underline" onClick={onBack}>Brochures</button>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">ID: {b.id}</span>
        </div>

        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />Back to Brochures
        </Button>

        {/* Main info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-foreground">{b.fileName}</h1>
                <StageTag stage={b.extraction} />
              </div>
              <div className="mt-0.5 flex items-center gap-3">
                <IdTag value={b.id} className="text-[11px]" />
                <span className="text-xs text-muted-foreground">{b.fileSizeMb} MB</span>
              </div>
              <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Developer</div>
                  <a href={`/developers/${b.developerId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{b.developerName}</a>
                  <IdTag value={b.developerId} className="ml-1.5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project</div>
                  <a href={`/projects/${b.projectId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{b.projectName}</a>
                  <IdTag value={b.projectId} className="ml-1.5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phase</div>
                  {b.phaseName ? (
                    <>
                      <a href={`/projects/${b.phaseId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{b.phaseName}</a>
                      <IdTag value={b.phaseId!} className="ml-1.5" />
                    </>
                  ) : (
                    <span className="text-muted-foreground">— (main project)</span>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Created At</div>
                  <span className="text-foreground">{fmtDateTime(b.createdAt)}</span>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Updated At</div>
                  <span className="text-foreground">{fmtDateTime(b.updatedAt)}</span>
                </div>
              </div>
            </div>
            <div className="w-full sm:w-56">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{approved}/{assets.length} assets approved</span>
                <span className="font-semibold text-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          </div>
        </div>

        {/* Asset tabs */}
        <Tabs defaultValue="Floor Plans" className="w-full">
          <TabsList>
            {(["Floor Plans", "Render Images", "Masterplans"] as AssetKind[]).map((kind) => {
              const Icon = KIND_ICON[kind]
              const n = assets.filter((a) => a.kind === kind).length
              return (
                <TabsTrigger key={kind} value={kind}>
                  <Icon className="mr-1.5 h-3.5 w-3.5" />{kind}
                  <span className="ml-1.5 rounded bg-secondary px-1 text-[10px] font-semibold">{n}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          {(["Floor Plans", "Render Images", "Masterplans"] as AssetKind[]).map((kind) => (
            <TabsContent key={kind} value={kind} className="mt-4">{kindTab(kind)}</TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

// ─── Brochures table page ─────────────────────────────────────────────────────

const BROCHURE_COLS = [
  { id: "brochure", label: "Brochure", width: 240 },
  { id: "developer", label: "Developer", width: 180 },
  { id: "project", label: "Project", width: 180 },
  { id: "phase", label: "Phase", width: 170 },
  { id: "extraction", label: "AI Extraction", width: 140 },
  { id: "progress", label: "AI Review Progress", width: 200 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
]
const SORT_FIELDS = [
  { key: "createdAt", label: "Created at" },
  { key: "updatedAt", label: "Updated at" },
  { key: "progress", label: "Review progress" },
]

export function BrochuresPage() {
  const [rows] = useState<Brochure[]>(BROCHURES0)
  const [selected, setSelected] = useState<Brochure | null>(null)
  const [pdf, setPdf] = useState<Brochure | null>(null)

  const [search, setSearch] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [projectSels, setProjectSels] = useState<string[]>([])
  const [stageF, setStageF] = useState<string[]>([])
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(BROCHURE_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const developers = [...new Set(rows.map((b) => b.developerName))]
  const tree = useMemo(() => projectTree(), [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    let out = rows.filter((b) => {
      if (needle && !`${b.fileName} ${b.id}`.toLowerCase().includes(needle)) return false
      if (developerF.length > 0 && !developerF.includes(b.developerName)) return false
      if (projectSels.length > 0 && !projectSels.includes(b.phaseId ?? b.projectId)) return false
      if (stageF.length > 0 && !stageF.includes(b.extraction)) return false
      return true
    })
    if (sorts.length > 0) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const va = s.key === "progress" ? progressPct(a) : new Date(a[s.key as "createdAt" | "updatedAt"]).getTime()
          const vb = s.key === "progress" ? progressPct(b) : new Date(b[s.key as "createdAt" | "updatedAt"]).getTime()
          if (va !== vb) return s.dir === "asc" ? va - vb : vb - va
        }
        return 0
      })
    }
    return out
  }, [rows, search, developerF, projectSels, stageF, sorts])

  useEffect(() => { setPage(1) }, [search, developerF, projectSels, stageF, sorts, pageSize])
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const activeFilters = (developerF.length ? 1 : 0) + (projectSels.length ? 1 : 0) + (stageF.length ? 1 : 0)
  const clearAll = () => { setSearch(""); setDeveloperF([]); setProjectSels([]); setStageF([]) }

  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => BROCHURE_COLS.find((c) => c.id === id)!).filter(Boolean)
  const frozenLeft = (colId: string) => {
    let left = 0
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

  if (selected) return <BrochureDetailsPage brochure={selected} onBack={() => setSelected(null)} />

  const cell = (colId: string, b: Brochure) => {
    switch (colId) {
      case "brochure":
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <button className="block max-w-[190px] truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                onClick={(e) => { e.stopPropagation(); setPdf(b) }}>
                {b.fileName}
              </button>
              <IdTag value={b.id} />
            </div>
          </div>
        )
      case "developer": return <LinkCell name={b.developerName} id={b.developerId} href={`/developers/${b.developerId}`} />
      case "project": return <LinkCell name={b.projectName} id={b.projectId} href={`/projects/${b.projectId}`} />
      case "phase": return b.phaseName ? <LinkCell name={b.phaseName} id={b.phaseId!} href={`/projects/${b.phaseId}`} /> : <span className="text-sm text-muted-foreground">—</span>
      case "extraction": return <StageTag stage={b.extraction} />
      case "progress": return <ReviewProgressCell b={b} />
      case "createdAt": return <span className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(b.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(b.updatedAt)}</span>
      default: return null
    }
  }

  const TS_KEYS = new Set(["createdAt", "updatedAt", "progress"])

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3" />
          <span>Projects Attachments</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Brochures</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Brochures</h1>
          <p className="text-sm text-muted-foreground">All project brochures in the system with their AI extraction & review progress</p>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={FileText} label="Total Brochures" value={rows.length} tone="border-blue-200 bg-blue-50 text-blue-600" />
          <StatCard icon={FileX2} label="Not Extracted" value={rows.filter((b) => b.extraction === "Not Extracted").length} tone="border-gray-200 bg-gray-50 text-gray-500" />
          <StatCard icon={Loader2} label="Queued / Extracting" value={rows.filter((b) => b.extraction === "Queued" || b.extraction === "Extracting").length} tone="border-purple-200 bg-purple-50 text-purple-600" />
          <StatCard icon={Clock} label="Pending Review" value={rows.filter((b) => b.extraction === "Pending Review").length} tone="border-amber-200 bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle2} label="Reviewed" value={rows.filter((b) => b.extraction === "Reviewed").length} tone="border-emerald-200 bg-emerald-50 text-emerald-600" />
        </div>

        {/* Toolbar */}
        <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[320px] flex-shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name or ID" className="h-8 w-full pl-8 pr-7 text-sm" />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <FilterMultiSelect label="Developer" options={developers} value={developerF} onChange={setDeveloperF} className="flex-1" />
            <ProjectTreeSelect multi projects={tree} values={projectSels} onValuesChange={setProjectSels} className="flex-1" />
            <FilterMultiSelect label="AI Extraction" options={[...STAGES]} value={stageF} onChange={setStageF} className="flex-1" />
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
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowColumns(true)}>Columns</Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <TableCard>
          <TableCardHeader title="Brochures" count={filtered.length} />
          <div className="overflow-x-auto">
            <Table className={cn("w-max min-w-full", COL_SEP)}>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
                  {visibleCols.map((c) => {
                    const s = sorts.find((x) => x.key === c.id)
                    return (
                      <TableHead
                        key={c.id}
                        className={cn("whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : { minWidth: c.width }}
                      >
                        {TS_KEYS.has(c.id) ? (
                          <button onClick={() => cycleHeaderSort(c.id)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                            {c.label}
                            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </button>
                        ) : c.label}
                      </TableHead>
                    )
                  })}
                  <TableHead className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(b)}>
                    {visibleCols.map((c) => (
                      <TableCell
                        key={c.id}
                        className={cn("py-3", frozenCols.has(c.id) && "sticky z-10 bg-card")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                      >
                        {cell(c.id, b)}
                      </TableCell>
                    ))}
                    <TableCell className="sticky right-0 z-10 border-l border-border bg-card" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-sm" onClick={() => setSelected(b)}><Eye className="mr-1.5 h-3.5 w-3.5" />View</DropdownMenuItem>
                          <DropdownMenuItem className="text-sm" onClick={() => setPdf(b)}><FileText className="mr-1.5 h-3.5 w-3.5" />Open PDF</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-sm" onClick={() => toast.success(`Downloading ${b.fileName}…`)}><Download className="mr-1.5 h-3.5 w-3.5" />Download</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={visibleCols.length + 1} className="py-16 text-center text-sm text-muted-foreground">No brochures match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="brochures" />
        </TableCard>
      </div>

      {/* All Filters drawer — same controls, same order */}
      <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilters} onClear={clearAll}>
        <FilterDrawerField label="Developer">
          <FilterMultiSelect label="Developer" options={developers} value={developerF} onChange={setDeveloperF} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Project">
          <ProjectTreeSelect multi projects={tree} values={projectSels} onValuesChange={setProjectSels} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="AI Extraction">
          <FilterMultiSelect label="AI Extraction" options={[...STAGES]} value={stageF} onChange={setStageF} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>

      <ColumnsSheet
        open={showColumns}
        onClose={() => setShowColumns(false)}
        columns={BROCHURE_COLS}
        order={colOrder}
        onOrderChange={setColOrder}
        hidden={hiddenCols}
        onHiddenChange={setHiddenCols}
        frozen={frozenCols}
        onFrozenChange={setFrozenCols}
      />

      {pdf && <PdfPreviewDialog b={pdf} onClose={() => setPdf(null)} />}
    </div>
  )
}

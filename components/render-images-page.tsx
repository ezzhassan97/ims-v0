"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Group,
  ImageIcon,
  Layers,
  Link2,
  Link2Off,
  Maximize2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  FilterMultiSelect, FilterSelect, FiltersDrawer, FilterDrawerField, MultiSortControl, ProjectTreeSelect, GroupPager, IdTag,
  type SortLevel, type ProjectTreeNode, type ProjectTreeSelection,
} from "@/components/table-kit"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────
type RenderSource = "Brochure Extraction" | "Uploaded"
type SaleType = "Launch" | "Primary" | "Resale" | "Nawy Now" | "Rental"

interface RenderImage {
  id: string
  url: string
  caption: string
  developerId: string
  developerName: string
  projectId: string
  projectName: string
  /** Top-level (main) project this image rolls up to */
  mainProjectId: string
  mainProjectName: string
  isLinked: boolean
  source: RenderSource
  createdAt: string
  /** Linked units broken down by sale type (empty when unlinked) */
  linkedUnits: Partial<Record<SaleType, number>>
  /** Of the total linked, how many are currently available AND listed */
  availableListed: number
  /** Present when the image was extracted from a brochure */
  brochure?: { id: string; name: string; url: string }
  fileSizeKb: number
  ext: "PNG" | "JPG"
}

// ── Static reference data ──────────────────────────────────────────────────────
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
  { id: "1206", name: "Palm Hills October — Phase 2", devId: "16", parentId: "1204", status: "Active" },
  { id: "1207", name: "SODIC West", devId: "254", parentId: null, status: "Active" },
  { id: "1208", name: "SODIC West — Villette", devId: "254", parentId: "1207", status: "Hidden" },
  { id: "1209", name: "North Bay", devId: "88", parentId: null, status: "Hidden" },
  { id: "1210", name: "North Bay — Phase A", devId: "88", parentId: "1209", status: "Active" },
]

const MAIN_PROJECTS = PROJECTS.filter((p) => p.parentId === null)

/** Tree for the grouped Project dropdown (optionally narrowed to one developer). */
function projectTree(devId?: string): ProjectTreeNode[] {
  return MAIN_PROJECTS
    .filter((p) => !devId || p.devId === devId)
    .map((p) => ({
      id: p.id, name: p.name, status: p.status,
      // Display just the phase name — the parent shows in the row caption
      phases: PROJECTS.filter((ph) => ph.parentId === p.id).map((ph) => ({ id: ph.id, name: ph.name.startsWith(`${p.name} — `) ? ph.name.slice(p.name.length + 3) : ph.name, status: ph.status })),
    }))
}

const IMG_POOL = [
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg",
]

const CAPTIONS = [
  "Aerial render of the central lagoon and waterfront promenade illuminated at dusk, showing the full masterplan layout.",
  "Exterior render of the standalone villa cluster surrounded by landscaped gardens and private pools.",
  "Clubhouse render highlighting the infinity pool deck, shaded lounge terraces, and panoramic sea views.",
  "Street-level render of the retail boulevard with cafés, water features, and pedestrian walkways.",
  "Render of the beachfront chalets with direct sandy beach access and elevated terraces.",
  "Twilight render of the entrance plaza and gateway architecture leading into the compound.",
  "Render of a model apartment interior featuring fully-finished living spaces and floor-to-ceiling windows.",
  "Bird's-eye render of the sports and wellness district including tennis courts and the central park.",
]

const SOURCES: RenderSource[] = ["Brochure Extraction", "Uploaded"]
const SALE_TYPES: SaleType[] = ["Launch", "Primary", "Resale", "Nawy Now", "Rental"]

const BASE_TS = new Date("2026-05-20").getTime()

// Deterministic mock builder (no Math.random → SSR-safe)
const RENDER_IMAGES: RenderImage[] = Array.from({ length: 28 }, (_, i) => {
  const project = PROJECTS[i % PROJECTS.length]
  const dev = DEVELOPERS.find((d) => d.id === project.devId)!
  const main = project.parentId ? PROJECTS.find((p) => p.id === project.parentId)! : project
  const isLinked = i % 4 !== 0 // ~75% linked

  const linkedUnits: Partial<Record<SaleType, number>> = {}
  if (isLinked) {
    linkedUnits.Primary = (i % 5) + 1
    if (i % 2 === 0) linkedUnits.Resale = (i % 3) + 1
    if (i % 3 === 0) linkedUnits["Nawy Now"] = (i % 2) + 1
    if (i % 5 === 0) linkedUnits.Launch = 2
    if (i % 7 === 0) linkedUnits.Rental = 1
  }
  const totalLinked = Object.values(linkedUnits).reduce((s, n) => s + (n ?? 0), 0)
  const availableListed = totalLinked > 0 ? Math.max(0, totalLinked - (i % 3)) : 0
  const source = SOURCES[i % SOURCES.length]
  const brochure =
    source === "Brochure Extraction"
      ? {
          id: `BRC-${String(2001 + (i % 9))}`,
          name: `${main.name} ${["Master", "Sales", "Launch", "Phase"][i % 4]} Brochure ${2024 + (i % 2)}`,
          url: "#",
        }
      : undefined

  return {
    id: `RND-${String(10001 + i)}`,
    url: IMG_POOL[i % IMG_POOL.length],
    caption: CAPTIONS[i % CAPTIONS.length],
    developerId: dev.id,
    developerName: dev.name,
    projectId: project.id,
    projectName: project.name,
    mainProjectId: main.id,
    mainProjectName: main.name,
    isLinked,
    source,
    createdAt: new Date(BASE_TS - i * 86_400_000 * 1.7).toISOString(),
    linkedUnits,
    availableListed,
    brochure,
    fileSizeKb: 640 + ((i * 397) % 3200),
    ext: (["PNG", "JPG"] as const)[i % 2],
  }
})

// Group column definitions (sorting is Created-date only)
const GROUP_COLS = [
  { id: "developerName", label: "Developer" },
  { id: "mainProjectName", label: "Project" },
  { id: "linkedState", label: "Linked / Unlinked" },
  { id: "source", label: "Source" },
]

function groupValue(img: RenderImage, col: string): string {
  switch (col) {
    case "developerName": return img.developerName
    case "mainProjectName": return img.mainProjectName
    case "linkedState": return img.isLinked && totalLinkedUnits(img) > 0 ? "Linked" : "Unlinked"
    case "source": return img.source === "Brochure Extraction" ? "Brochure" : "Uploaded"
    default: return "Other"
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}
/** Canonical timestamp: "10 Jan 2026, 07:00 AM". */
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${date}, ${time}`
}
function totalLinkedUnits(img: RenderImage): number {
  return Object.values(img.linkedUnits).reduce((s, n) => s + (n ?? 0), 0)
}
const saleTypeColor: Record<SaleType, string> = {
  Launch: "text-violet-300",
  Primary: "text-blue-300",
  Resale: "text-purple-300",
  "Nawy Now": "text-teal-300",
  Rental: "text-orange-300",
}

// ── Linked-units tooltip badge ─────────────────────────────────────────────────
function LinkedBadge({ img }: { img: RenderImage }) {
  const total = totalLinkedUnits(img)
  if (!img.isLinked || total === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        <Link2Off className="h-3 w-3" />
        Unlinked
      </span>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur cursor-default">
          <Link2 className="h-3 w-3 text-emerald-600" />
          {total}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold">Linked units · {total}</p>
        <div className="space-y-0.5">
          {SALE_TYPES.filter((t) => img.linkedUnits[t]).map((t) => (
            <div key={t} className="flex items-center justify-between gap-4 text-[11px]">
              <span className={saleTypeColor[t]}>{t}</span>
              <span className="font-medium tabular-nums">{img.linkedUnits[t]}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ── Copyable ID (copy icon on hover) ───────────────────────────────────────────
function CopyId({ id, className }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className={cn("group/copy inline-flex items-center gap-1 font-mono text-xs font-medium text-foreground", className)}
      title="Copy ID"
    >
      {id}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover/copy:opacity-100" />
      )}
    </button>
  )
}

// ── Fullscreen image viewer ─────────────────────────────────────────────────────
export function FullscreenViewer({ images, startIndex, onClose, label, caption }: { images: string[]; startIndex: number; onClose: () => void; label?: string; caption?: string }) {
  const [current, setCurrent] = useState(startIndex)
  const go = (dir: number) => setCurrent((c) => (c + dir + images.length) % images.length)
  useEffect(() => {
    // Window CAPTURE so Escape is consumed here BEFORE any dialog/sheet underneath
    // (Radix listens on document) — closing the viewer must never dismiss the drawer.
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "Escape") {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handler, { capture: true })
    return () => window.removeEventListener("keydown", handler, { capture: true })
  }, [images.length])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 p-3">
        {label || caption ? (
          <span className="flex min-w-0 items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            {label && <span className="flex-shrink-0 rounded-md bg-white/10 px-2.5 py-1 font-mono text-sm text-white/90">{label}</span>}
            {caption && <span className="truncate text-sm text-white/70">{caption}</span>}
          </span>
        ) : <span />}
        <button className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img src={images[current]} alt="" className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain shadow-2xl" />
        {images.length > 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Image card ─────────────────────────────────────────────────────────────────
function RenderCard({
  img,
  selected,
  onSelect,
  onView,
  onDelete,
}: {
  img: RenderImage
  selected: boolean
  /** Called with true when Shift was held — selects the range since the last click. */
  onSelect: (shift: boolean) => void
  onView: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground/30 hover:shadow-md",
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img src={img.url || "/placeholder.jpg"} alt={img.id} className="h-full w-full object-cover" />
        {/* checkbox overlay */}
        <div
          className={cn(
            "absolute left-2 top-2 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {/* onClick (not onCheckedChange) — Radix doesn't pass the event, and we need shiftKey */}
          <Checkbox checked={selected} onClick={(e) => onSelect(e.shiftKey)} />
        </div>
        {/* linked badge overlay */}
        <div className="absolute right-2 top-2">
          <LinkedBadge img={img} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <CopyId id={img.id} />
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onView}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <p className="line-clamp-1 cursor-default text-xs text-muted-foreground">{img.caption}</p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs px-3 py-2 text-[11px] leading-relaxed">
            {img.caption}
          </TooltipContent>
        </Tooltip>

        {/* Attribution — developer, then "Project - Phase" on one line (id of the linked entity) */}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{img.developerName}</span>
            <IdTag value={img.developerId} />
          </p>
          <p className="flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {img.projectId !== img.mainProjectId
                ? `${img.mainProjectName} - ${img.projectName.startsWith(`${img.mainProjectName} — `) ? img.projectName.slice(img.mainProjectName.length + 3) : img.projectName}`
                : img.mainProjectName}
            </span>
            <IdTag value={img.projectId} />
          </p>
        </div>

        {/* Footer: Source · Extension · Size — timestamp on the right */}
        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 whitespace-nowrap">
            {img.source === "Brochure Extraction" ? (
              <FileText className="h-3 w-3" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {img.source === "Brochure Extraction" ? "Brochure" : "Uploaded"} · {img.ext} · {(img.fileSizeKb / 1024).toFixed(1)} MB
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Calendar className="h-3 w-3" />
            {formatDateTime(img.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Detail (View) drawer ───────────────────────────────────────────────────────
function RenderDrawer({
  img,
  onClose,
  onDelete,
}: {
  img: RenderImage | null
  onClose: () => void
  onDelete: (img: RenderImage) => void
}) {
  const [fullscreen, setFullscreenState] = useState(false)
  // Ref mirrors the state so the Sheet's dismiss guards can never read a stale value.
  const fullscreenRef = useRef(false)
  const setFullscreen = (v: boolean) => { fullscreenRef.current = v; setFullscreenState(v) }
  // The drawer component stays mounted between opens — reset the fullscreen state
  // whenever the viewed image changes so a stale `true` never survives a close.
  useEffect(() => { setFullscreen(false) }, [img?.id])
  if (!img) return null
  const total = totalLinkedUnits(img)

  return (
    <>
    <Sheet open={!!img} onOpenChange={(o) => { if (!o) { setFullscreen(false); onClose() } }}>
      <SheetContent
        className="w-[620px] sm:max-w-[620px] flex flex-col p-0"
        // While the fullscreen viewer is open ABOVE the drawer, Escape / clicks on the
        // viewer must close only the viewer — never dismiss the drawer underneath.
        onEscapeKeyDown={(e) => { if (fullscreenRef.current) { e.preventDefault(); setFullscreen(false) } }}
        onPointerDownOutside={(e) => { if (fullscreenRef.current) e.preventDefault() }}
        onInteractOutside={(e) => { if (fullscreenRef.current) e.preventDefault() }}
      >
        {/* Header */}
        <SheetTitle className="sr-only">Render image {img.id}</SheetTitle>
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <CopyId id={img.id} className="rounded-md bg-muted px-2 py-1 hover:bg-muted/70" />
            {img.isLinked && total > 0 ? (
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                <Link2 className="mr-1 h-3 w-3" /> Linked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Link2Off className="mr-1 h-3 w-3" /> Unlinked
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {img.source === "Brochure Extraction" ? "Brochure" : "Uploaded"}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Image with overlay actions */}
          <div className="group relative overflow-hidden rounded-xl border border-border bg-muted">
            <button className="block w-full cursor-zoom-in" onClick={() => setFullscreen(true)}>
              <img src={img.url || "/placeholder.jpg"} alt={img.id} className="w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                <Maximize2 className="h-6 w-6 text-white drop-shadow" />
              </span>
            </button>
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { /* download */ }}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Download</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDelete(img)}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-background/90 text-red-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Caption</p>
            <p className="text-sm leading-relaxed text-foreground">{img.caption}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Developer</p>
              <p className="flex items-center gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{img.developerName}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Project</p>
              <p className="flex items-center gap-1.5 text-sm"><FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />{img.projectName}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</p>
              <p className="text-sm">{img.source === "Brochure Extraction" ? "Brochure" : "Uploaded"}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created at</p>
              <p className="text-sm">{formatDate(img.createdAt)}</p>
            </div>
          </div>

          {/* Brochure source link */}
          {img.brochure && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Extracted from brochure</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={img.brochure.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {img.brochure.name}
                  </a>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="mt-0.5 pl-5 font-mono text-xs text-muted-foreground">{img.brochure.id}</p>
              </div>
            </>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Linked Units {total > 0 && <span className="text-foreground">· {total}</span>}
            </p>
            {total > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {SALE_TYPES.filter((t) => img.linkedUnits[t]).map((t) => (
                  <div key={t} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{t}</span>
                    <span className="text-sm font-semibold tabular-nums">{img.linkedUnits[t]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This render image is not linked to any units.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    {fullscreen && <FullscreenViewer images={[img.url || "/placeholder.jpg"]} startIndex={0} label={img.id} caption={img.caption} onClose={() => setFullscreen(false)} />}
    </>
  )
}

// ── Delete confirmation dialog ──────────────────────────────────────────────────
function DeleteDialog({
  images,
  onClose,
  onConfirm,
}: {
  images: RenderImage[] | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!images) return null
  const count = images.length
  const totalProps = images.reduce((s, im) => s + totalLinkedUnits(im), 0)
  const availListed = images.reduce((s, im) => s + im.availableListed, 0)

  return (
    <Dialog open={!!images} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Delete {count} render image{count !== 1 ? "s" : ""}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {totalProps > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {count === 1 ? (
                <>
                  This image is linked to <strong>{totalProps}</strong> propert{totalProps !== 1 ? "ies" : "y"},{" "}
                  <strong>{availListed}</strong> of them currently available and listed.
                </>
              ) : (
                <>
                  These {count} images are linked to <strong>{totalProps}</strong> propert{totalProps !== 1 ? "ies" : "y"} in total,{" "}
                  <strong>{availListed}</strong> of them currently available and listed.
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {count === 1 ? "This image is not linked to any properties." : "These images are not linked to any properties."}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Deleting {count === 1 ? "this image" : "these images"} will remove {count === 1 ? "it" : "them"} from the
            inventory and unlink {count === 1 ? "it" : "them"} from any associated properties. This action cannot be undone.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete {count !== 1 ? `${count} images` : "image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Image dialog — dependent searchable dropdowns + multi-file upload ──────
interface UploadEntry { key: string; name: string; url: string; status: "loading" | "done" }

function AddImageDialog({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (files: UploadEntry[], devId: string, projectSel: NonNullable<ProjectTreeSelection>) => void
}) {
  const [devId, setDevId] = useState("")
  const [projectSel, setProjectSel] = useState<ProjectTreeSelection>(null)
  const [files, setFiles] = useState<UploadEntry[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const keyRef = useRef(0)

  const reset = () => { setDevId(""); setProjectSel(null); setFiles([]) }
  const close = () => { reset(); onClose() }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const entries: UploadEntry[] = [...list].map((f) => ({
      key: `up-${++keyRef.current}`,
      name: f.name,
      url: URL.createObjectURL(f),
      status: "loading" as const,
    }))
    setFiles((prev) => [...prev, ...entries])
    // Simulated upload — each file finishes on its own staggered timer
    entries.forEach((e, i) => {
      setTimeout(() => {
        setFiles((prev) => prev.map((f) => (f.key === e.key ? { ...f, status: "done" } : f)))
      }, 700 + i * 450)
    })
  }

  const allDone = files.length > 0 && files.every((f) => f.status === "done")
  const canSave = !!devId && !!projectSel && allDone

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" /> Add Render Images
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Developer <span className="text-red-500">*</span></label>
              <FilterSelect
                label="Select developer…"
                value={devId}
                options={DEVELOPERS.map((d) => ({ value: d.id, label: d.name, sublabel: `ID: ${d.id}` }))}
                onChange={(v) => { setDevId(v); setProjectSel(null) }}
                searchable
                className="w-full"
                width="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Project <span className="text-red-500">*</span></label>
              <ProjectTreeSelect
                label={devId ? "Select project…" : "Pick a developer first"}
                projects={devId ? projectTree(devId) : []}
                value={projectSel}
                onChange={setProjectSel}
                className="w-full"
              />
            </div>
          </div>

          {/* Drop zone / browse */}
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = "" }} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="rounded-full bg-secondary p-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Click to choose images or drag & drop</p>
            <p className="text-xs text-muted-foreground">Multiple files supported · PNG, JPG up to 20MB</p>
          </button>

          {/* Picked files — each with its own loading state */}
          {files.length > 0 && (
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
              {files.map((f) => (
                <div key={f.key} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={f.url} alt={f.name} className={cn("h-full w-full object-cover transition-opacity", f.status === "loading" && "opacity-40")} />
                  {f.status === "loading" ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </span>
                  ) : (
                    <>
                      <span className="absolute left-1 top-1 rounded bg-emerald-600/90 p-0.5"><Check className="h-3 w-3 text-white" /></span>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}
                        className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && !allDone && (
            <p className="text-xs text-muted-foreground">Uploading {files.filter((f) => f.status === "loading").length} of {files.length}…</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => { if (projectSel) { onSave(files, devId, projectSel); reset() } }}>
            Save {files.length > 0 && `${files.length} image${files.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function RenderImagesPage({
  embedded = false,
  scopeProject,
}: {
  /** Rendered inside a details tab: no page title, no outer padding, no Developer filter. */
  embedded?: boolean
  /** Scope the images to one project. Main projects get a Phase filter + phase grouping; phases get neither. */
  scopeProject?: { name: string; isPhase: boolean }
} = {}) {
  const [images, setImages] = useState<RenderImage[]>(RENDER_IMAGES)
  const [search, setSearch] = useState("")
  const [developerFilter, setDeveloperFilter] = useState<string[]>([])
  const [projectSels, setProjectSels] = useState<string[]>([])
  const [phaseFilter, setPhaseFilter] = useState<string[]>([])
  const [linkedFilter, setLinkedFilter] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [showAllFilters, setShowAllFilters] = useState(false)

  // Resolve the scoped project against the render-images mock (name match, demo fallback)
  const scope = useMemo(() => {
    if (!scopeProject) return null
    const byName = PROJECTS.find((p) => p.name.toLowerCase() === scopeProject.name.toLowerCase())
    const proj = byName ?? (scopeProject.isPhase ? PROJECTS.find((p) => p.parentId !== null)! : MAIN_PROJECTS[0])
    const mainId = proj.parentId ?? proj.id
    return { proj, mainId, isPhase: scopeProject.isPhase, main: PROJECTS.find((p) => p.id === mainId)!, phases: PROJECTS.filter((p) => p.parentId === mainId) }
  }, [scopeProject])

  // Base pool: the whole inventory, or the scoped project's images
  const baseImages = useMemo(() => {
    if (!scope) return images
    return scope.isPhase ? images.filter((im) => im.projectId === scope.proj.id) : images.filter((im) => im.mainProjectId === scope.mainId)
  }, [images, scope])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewImage, setViewImage] = useState<RenderImage | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<RenderImage[] | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Multi-level sort (Created date / Linked units) & group
  const [sorts, setSorts] = useState<SortLevel[]>([])
  // Main-project scope defaults to grouping by phase (main images first, then each phase)
  const [groupByColumn, setGroupByColumn] = useState<string | null>(scopeProject && !scopeProject.isPhase ? "phase" : null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const groupCols = scope
    ? (scope.isPhase
        ? GROUP_COLS.filter((c) => c.id === "linkedState" || c.id === "source")
        : [{ id: "phase", label: "Phase" }, ...GROUP_COLS.filter((c) => c.id === "linkedState" || c.id === "source")])
    : GROUP_COLS

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const phaseLabelOf = (img: RenderImage) => (scope && img.projectId === scope.mainId ? "Main Project" : img.projectName)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = baseImages.filter((img) => {
      if (q && !img.id.toLowerCase().includes(q) && !img.caption.toLowerCase().includes(q)) return false
      if (!scope && developerFilter.length > 0 && !developerFilter.includes(img.developerName)) return false
      // Project tree selections resolve to a union of project ids (main + phases / main only / phases)
      if (!scope && projectSels.length > 0 && !projectSels.includes(img.projectId)) return false
      // Scoped to a main project: filter by phase (Main Project = the main project's own images)
      if (scope && !scope.isPhase && phaseFilter.length > 0 && !phaseFilter.includes(phaseLabelOf(img))) return false
      if (linkedFilter.length > 0) {
        const state = img.isLinked && totalLinkedUnits(img) > 0 ? "Linked" : "Unlinked"
        if (!linkedFilter.includes(state)) return false
      }
      if (sourceFilter.length > 0 && !sourceFilter.includes(img.source)) return false
      return true
    })
    if (!sorts.length) return result
    return [...result].sort((a, b) => {
      for (const s of sorts) {
        const va = s.key === "linked" ? totalLinkedUnits(a) : a.createdAt
        const vb = s.key === "linked" ? totalLinkedUnits(b) : b.createdAt
        if (va !== vb) return (va < vb ? -1 : 1) * (s.dir === "asc" ? 1 : -1)
      }
      return 0
    })
  }, [baseImages, scope, search, developerFilter, projectSels, phaseFilter, linkedFilter, sourceFilter, sorts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  )

  // Clamp page when result count shrinks
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])
  // Per-group pagination — real data can put thousands of images in one group
  const GROUP_PAGE_SIZE = 12
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})

  // Reset to first page when filters/sort/group change
  useEffect(() => {
    setCurrentPage(1)
    setGroupPages({})
  }, [search, developerFilter, projectSels, phaseFilter, linkedFilter, sourceFilter, sorts, groupByColumn, pageSize])

  // Group ALL filtered results (across every page) into sections when groupByColumn is set
  const sections = useMemo(() => {
    if (!groupByColumn) return null
    const map: Record<string, RenderImage[]> = {}
    for (const img of filtered) {
      const key = groupByColumn === "phase"
        ? (scope && img.projectId === scope.mainId ? `${scope.main.name} — Main Project` : img.projectName)
        : groupValue(img, groupByColumn) || "Other"
      ;(map[key] ??= []).push(img)
    }
    const entries = Object.entries(map)
    // Phase grouping: the main project's images first, then each phase alphabetically
    if (groupByColumn === "phase") {
      entries.sort(([a], [b]) => {
        const aMain = a.includes("— Main Project"), bMain = b.includes("— Main Project")
        if (aMain !== bMain) return aMain ? -1 : 1
        return a.localeCompare(b)
      })
    }
    return entries
  }, [filtered, groupByColumn, scope])

  // The visible slice of each group (its own mini page)
  const groupSlice = (key: string, imgs: RenderImage[]) => {
    const page = groupPages[key] ?? 1
    return imgs.slice((page - 1) * GROUP_PAGE_SIZE, page * GROUP_PAGE_SIZE)
  }

  // What is actually on screen, in VISIBLE order: section-flattened when grouped, else the current page.
  // Shift-range selection must follow this order, not the underlying sorted order.
  const displayed = useMemo(
    () => (sections ? sections.flatMap(([key, imgs]) => (collapsedSections.has(key) ? [] : groupSlice(key, imgs))) : paginated),
    [sections, paginated, groupPages, collapsedSections],
  )
  const displayedIndex = useMemo(() => new Map(displayed.map((im, i) => [im.id, i])), [displayed])
  const lastClickedIdx = useRef<number | null>(null)

  const activeFilterCount =
    (developerFilter.length ? 1 : 0) + (projectSels.length ? 1 : 0) + (phaseFilter.length ? 1 : 0) +
    (linkedFilter.length ? 1 : 0) + (sourceFilter.length ? 1 : 0)
  const hasFilters = !!search || activeFilterCount > 0

  const clearAll = () => {
    setSearch("")
    setDeveloperFilter([])
    setProjectSels([])
    setPhaseFilter([])
    setLinkedFilter([])
    setSourceFilter([])
  }

  // Shift-click selects the whole range between the last clicked card and this one
  const toggleSelect = (id: string, shift: boolean) => {
    const index = displayedIndex.get(id) ?? 0
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && lastClickedIdx.current !== null) {
        const lo = Math.min(lastClickedIdx.current, index)
        const hi = Math.max(lastClickedIdx.current, index)
        for (let i = lo; i <= hi; i++) {
          const im = displayed[i]
          if (im) next.add(im.id)
        }
      } else {
        next.has(id) ? next.delete(id) : next.add(id)
        lastClickedIdx.current = index
      }
      return next
    })
  }

  const performDelete = (ids: string[]) => {
    setImages((prev) => prev.filter((im) => !ids.includes(im.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    setDeleteTargets(null)
    setViewImage(null)
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-secondary/40"}>
      <div className={cn("space-y-4", !embedded && "p-4")}>
        {/* Title block */}
        {!embedded && (
          <div className="px-1 pt-1">
            <p className="mb-1 text-xs text-muted-foreground">Projects Attachments</p>
            <h1 className="text-2xl font-semibold text-foreground">Render Images</h1>
            <p className="mt-1 text-sm text-muted-foreground">View and manage all render images in inventory</p>
          </div>
        )}

        {/* Filter card */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative w-80 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Image ID or caption"
                className="h-8 w-full pl-8 pr-7 text-sm"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {/* Unscoped page: Developer + Project filters. Scoped main project: Phase filter. Scoped phase: neither. */}
              {!scope && (
                <FilterMultiSelect label="Developer" options={DEVELOPERS.map((d) => d.name)} value={developerFilter} onChange={setDeveloperFilter} className="flex-1" />
              )}
              {!scope && (
                <ProjectTreeSelect multi projects={projectTree()} values={projectSels} onValuesChange={setProjectSels} className="flex-1" />
              )}
              {scope && !scope.isPhase && (
                <FilterMultiSelect label="Phase" options={["Main Project", ...scope.phases.map((p) => p.name)]} value={phaseFilter} onChange={setPhaseFilter} className="flex-1" />
              )}
              <FilterMultiSelect label="Linked" options={["Linked", "Unlinked"]} value={linkedFilter} onChange={setLinkedFilter} className="flex-1" />
              <FilterMultiSelect label="Source" options={[...SOURCES]} value={sourceFilter} onChange={setSourceFilter} className="flex-1" />
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
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Multi-level sort — canonical control */}
              <MultiSortControl
                fields={[
                  { key: "createdAt", label: "Created date" },
                  { key: "linked", label: "Linked units count" },
                ]}
                sorts={sorts}
                onChange={setSorts}
              />

              {/* Group dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={groupByColumn ? "default" : "outline"} size="sm" className="h-8">
                    <Group className="mr-1.5 h-3.5 w-3.5" />
                    Group
                    {groupByColumn && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        {groupCols.find((c) => c.id === groupByColumn)?.label ?? groupByColumn}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupByColumn(null)}>No Grouping</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {groupCols.map((opt) => (
                    <DropdownMenuItem key={opt.id} onClick={() => { setGroupByColumn(opt.id); setCollapsedSections(new Set()) }}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Header bar — its own card; the image cards list freely below it */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Checkbox
                checked={displayed.length > 0 && displayed.every((im) => selected.has(im.id))}
                onCheckedChange={(c) => {
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (c) displayed.forEach((im) => next.add(im.id))
                    else displayed.forEach((im) => next.delete(im.id))
                    return next
                  })
                }}
              />
              <span className="text-sm font-semibold text-foreground">Render Images</span>
              <Badge className="border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100">
                {filtered.length.toLocaleString()}
              </Badge>
              {hasFilters && <span className="text-xs text-muted-foreground">Filtered</span>}
              {sections && sections.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCollapsedSections(new Set(sections.map(([k]) => k)))}>
                    Collapse All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCollapsedSections(new Set())}>
                    Expand All
                  </Button>
                </>
              )}
            </div>
            <Button size="sm" className="h-8" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Image
            </Button>
          </div>
        </div>

        {/* Cards — freely listed on the page (no wrapping container), like grouped properties */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-20 text-center">
            <div className="rounded-full bg-secondary p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No render images found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : sections ? (
          <div className="space-y-2">
            {sections.map(([key, imgs]) => {
              const isCollapsed = collapsedSections.has(key)
              return (
                <div key={key} className="space-y-3">
                  <button
                    className="group flex w-full items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-secondary/60"
                    onClick={() =>
                      setCollapsedSections((prev) => {
                        const next = new Set(prev)
                        next.has(key) ? next.delete(key) : next.add(key)
                        return next
                      })
                    }
                  >
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                    <span className="text-sm font-semibold text-foreground">{key}</span>
                    <Badge variant="secondary" className="text-xs">{imgs.length.toLocaleString()}</Badge>
                    <div className="h-px flex-1 bg-border" />
                    {/* Subtle per-group pagination — huge groups page inside themselves */}
                    {!isCollapsed && (
                      <GroupPager
                        total={imgs.length}
                        page={groupPages[key] ?? 1}
                        pageSize={GROUP_PAGE_SIZE}
                        onPage={(p) => setGroupPages((prev) => ({ ...prev, [key]: p }))}
                      />
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupSlice(key, imgs).map((img) => (
                        <RenderCard
                          key={img.id}
                          img={img}
                          selected={selected.has(img.id)}
                          onSelect={(shift) => toggleSelect(img.id, shift)}
                          onView={() => setViewImage(img)}
                          onDelete={() => setDeleteTargets([img])}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginated.map((img) => (
              <RenderCard
                key={img.id}
                img={img}
                selected={selected.has(img.id)}
                onSelect={(shift) => toggleSelect(img.id, shift)}
                onView={() => setViewImage(img)}
                onDelete={() => setDeleteTargets([img])}
              />
            ))}
          </div>
        )}

        {/* Footer — its own bar */}
        {filtered.length > 0 && sections && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} images in {sections.length} group{sections.length !== 1 ? "s" : ""}
          </div>
        )}
        {filtered.length > 0 && !sections && (
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
              <span>
                {`${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`}{" "}
                of {filtered.length.toLocaleString()} images
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["10", "20", "30", "50"].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs">per page</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 px-1 text-sm">
                    Page
                    <Input
                      type="number"
                      value={currentPage}
                      onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v) }}
                      className="h-8 w-14 text-center"
                      min={1}
                      max={totalPages}
                    />
                    of {totalPages}
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar — download only (max 40 at a time), no bulk delete, no select-all */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 select-none items-center gap-0 overflow-hidden rounded-xl bg-zinc-900 text-sm text-white shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-semibold tabular-nums">{selected.size} selected</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <button
            onClick={() => {
              if (selected.size > 40) {
                toast.error("You can download at most 40 images at a time.")
                return
              }
              toast.success(`Downloading ${selected.size} image${selected.size === 1 ? "" : "s"}…`)
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" /> Download
          </button>
          <div className="h-8 w-px bg-zinc-700" />
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* View drawer */}
      <RenderDrawer img={viewImage} onClose={() => setViewImage(null)} onDelete={(im) => setDeleteTargets([im])} />

      {/* Delete confirmation */}
      <DeleteDialog
        images={deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={() => deleteTargets && performDelete(deleteTargets.map((im) => im.id))}
      />

      {/* Add image dialog — dependent dropdowns + multi-file upload */}
      <AddImageDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(files, devId, sel) => {
          const dev = DEVELOPERS.find((d) => d.id === devId)!
          const target = PROJECTS.find((p) => p.id === sel.id) ?? MAIN_PROJECTS[0]
          const mainId = target.parentId ?? target.id
          const main = PROJECTS.find((p) => p.id === mainId)!
          const now = new Date().toISOString()
          setImages((prev) => [
            ...files.map((f, i) => ({
              id: `RND-${String(20001 + prev.length + i)}`,
              url: f.url,
              caption: f.name,
              developerId: dev.id, developerName: dev.name,
              projectId: target.id, projectName: target.name,
              mainProjectId: main.id, mainProjectName: main.name,
              isLinked: false, source: "Uploaded" as const,
              createdAt: now, linkedUnits: {}, availableListed: 0, fileSizeKb: 1024,
              ext: (/\.png$/i.test(f.name) ? "PNG" : "JPG") as "PNG" | "JPG",
            })),
            ...prev,
          ])
          toast.success(`${files.length} image${files.length === 1 ? "" : "s"} saved to ${target.name}`)
          setShowAdd(false)
        }}
      />

      {/* All Filters drawer — same filters, same order as the toolbar */}
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
        {scope && !scope.isPhase && (
          <FilterDrawerField label="Phase">
            <FilterMultiSelect label="Phase" options={["Main Project", ...scope.phases.map((p) => p.name)]} value={phaseFilter} onChange={setPhaseFilter} className="w-full" />
          </FilterDrawerField>
        )}
        <FilterDrawerField label="Linked">
          <FilterMultiSelect label="Linked" options={["Linked", "Unlinked"]} value={linkedFilter} onChange={setLinkedFilter} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Source">
          <FilterMultiSelect label="Source" options={[...SOURCES]} value={sourceFilter} onChange={setSourceFilter} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>
    </div>
  )
}

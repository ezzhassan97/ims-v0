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
  FolderKanban,
  Group,
  ImageIcon,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
}

// ── Static reference data ──────────────────────────────────────────────────────
const DEVELOPERS = [
  { id: "DEV-002", name: "Palm Hills" },
  { id: "DEV-003", name: "SODIC" },
  { id: "DEV-004", name: "Mountain View" },
  { id: "DEV-005", name: "Emaar Misr" },
]

interface ProjectRef { id: string; name: string; devId: string; parentId: string | null }
const PROJECTS: ProjectRef[] = [
  { id: "P-MAR", name: "Marassi", devId: "DEV-005", parentId: null },
  { id: "P-MAR-1", name: "Marassi — Phase 1", devId: "DEV-005", parentId: "P-MAR" },
  { id: "P-MAR-2", name: "Marassi — Phase 2", devId: "DEV-005", parentId: "P-MAR" },
  { id: "P-PHO", name: "Palm Hills October", devId: "DEV-002", parentId: null },
  { id: "P-PHO-1", name: "Palm Hills October — Phase 1", devId: "DEV-002", parentId: "P-PHO" },
  { id: "P-PHO-2", name: "Palm Hills October — Phase 2", devId: "DEV-002", parentId: "P-PHO" },
  { id: "P-SW", name: "SODIC West", devId: "DEV-003", parentId: null },
  { id: "P-SW-A", name: "SODIC West — Villette", devId: "DEV-003", parentId: "P-SW" },
  { id: "P-NB", name: "North Bay", devId: "DEV-004", parentId: null },
  { id: "P-NB-A", name: "North Bay — Phase A", devId: "DEV-004", parentId: "P-NB" },
]

const MAIN_PROJECTS = PROJECTS.filter((p) => p.parentId === null)

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

// ── Searchable multi-select filter ─────────────────────────────────────────────
function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  width,
  searchable = true,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  width?: string
  searchable?: boolean
}) {
  const [q, setQ] = useState("")
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options],
  )
  const hasVal = selected.size > 0
  const display = selected.size === 0 ? label : selected.size === 1 ? [...selected][0] : `${label} · ${selected.size}`

  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger asChild>
        <Button
          variant={hasVal ? "default" : "outline"}
          size="sm"
          className={cn("h-8 text-xs justify-between min-w-0 px-2.5", width)}
        >
          <span className="truncate">{display}</span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start" sideOffset={4}>
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 pl-7 text-xs"
            />
          </div>
        )}
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {filtered.map((opt) => {
            const isChecked = selected.has(opt)
            return (
              <button
                key={opt}
                onClick={() => {
                  const next = new Set(selected)
                  isChecked ? next.delete(opt) : next.add(opt)
                  onChange(next)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                  isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    isChecked ? "bg-primary border-primary" : "border-border",
                  )}
                >
                  {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
          )}
        </div>
        {hasVal && (
          <div className="border-t border-border mt-1.5 pt-1.5">
            <button
              onClick={() => onChange(new Set())}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 rounded-md hover:bg-muted transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
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
function FullscreenViewer({ images, startIndex, onClose, label }: { images: string[]; startIndex: number; onClose: () => void; label?: string }) {
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
      <div className="flex items-center justify-between p-3">
        {label ? (
          <span className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-sm text-white/90" onClick={(e) => e.stopPropagation()}>{label}</span>
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

        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {formatDate(img.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            {img.source === "Brochure Extraction" ? (
              <FileText className="h-3 w-3" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {img.source === "Brochure Extraction" ? "Brochure" : "Uploaded"}
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
    {fullscreen && <FullscreenViewer images={[img.url || "/placeholder.jpg"]} startIndex={0} label={img.id} onClose={() => setFullscreen(false)} />}
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

// ── Add Image dialog (placeholder) ──────────────────────────────────────────────
function AddImageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" /> Add Render Image
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Developer</label>
              <Input placeholder="Select developer…" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Project</label>
              <Input placeholder="Select project…" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <div className="rounded-full bg-secondary p-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Drag & drop render images here</p>
            <p className="text-xs text-muted-foreground">or click to browse · PNG, JPG up to 20MB</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onClose}>Add Images</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function RenderImagesPage() {
  const [images, setImages] = useState<RenderImage[]>(RENDER_IMAGES)
  const [search, setSearch] = useState("")
  const [developerFilter, setDeveloperFilter] = useState<Set<string>>(new Set())
  const [projectFilter, setProjectFilter] = useState<Set<string>>(new Set())
  const [linkedFilter, setLinkedFilter] = useState<Set<string>>(new Set())
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set())

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewImage, setViewImage] = useState<RenderImage | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<RenderImage[] | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Sort (Created date only) & group
  const [createdSort, setCreatedSort] = useState<"asc" | "desc" | null>(null)
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = images.filter((img) => {
      if (q && !img.id.toLowerCase().includes(q) && !img.caption.toLowerCase().includes(q)) return false
      if (developerFilter.size > 0 && !developerFilter.has(img.developerName)) return false
      // Project filter matches main project name OR the image's own project name
      if (projectFilter.size > 0 && !projectFilter.has(img.mainProjectName)) return false
      if (linkedFilter.size > 0) {
        const state = img.isLinked && totalLinkedUnits(img) > 0 ? "Linked" : "Unlinked"
        if (!linkedFilter.has(state)) return false
      }
      if (sourceFilter.size > 0 && !sourceFilter.has(img.source)) return false
      return true
    })
    if (!createdSort) return result
    const mul = createdSort === "asc" ? 1 : -1
    return [...result].sort((a, b) => (a.createdAt < b.createdAt ? -mul : a.createdAt > b.createdAt ? mul : 0))
  }, [images, search, developerFilter, projectFilter, linkedFilter, sourceFilter, createdSort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  )

  // Clamp page when result count shrinks
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])
  // Reset to first page when filters/sort/group change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, developerFilter, projectFilter, linkedFilter, sourceFilter, createdSort, groupByColumn, pageSize])

  // Group ALL filtered results (across every page) into sections when groupByColumn is set
  const sections = useMemo(() => {
    if (!groupByColumn) return null
    const map: Record<string, RenderImage[]> = {}
    for (const img of filtered) {
      const key = groupValue(img, groupByColumn) || "Other"
      ;(map[key] ??= []).push(img)
    }
    return Object.entries(map)
  }, [filtered, groupByColumn])

  // What is actually on screen, in VISIBLE order: section-flattened when grouped, else the current page.
  // Shift-range selection must follow this order, not the underlying sorted order.
  const displayed = useMemo(
    () => (sections ? sections.flatMap(([, imgs]) => imgs) : paginated),
    [sections, paginated],
  )
  const displayedIndex = useMemo(() => new Map(displayed.map((im, i) => [im.id, i])), [displayed])
  const lastClickedIdx = useRef<number | null>(null)

  const hasFilters =
    !!search || developerFilter.size > 0 || projectFilter.size > 0 || linkedFilter.size > 0 || sourceFilter.size > 0

  const clearAll = () => {
    setSearch("")
    setDeveloperFilter(new Set())
    setProjectFilter(new Set())
    setLinkedFilter(new Set())
    setSourceFilter(new Set())
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

  const selectedImages = images.filter((im) => selected.has(im.id))

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        {/* Title block */}
        <div className="px-1 pt-1">
          <p className="mb-1 text-xs text-muted-foreground">Projects Attachments</p>
          <h1 className="text-2xl font-semibold text-foreground">Render Images</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage all render images in inventory</p>
        </div>

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
              <SearchableMultiSelect
                label="Developer"
                options={DEVELOPERS.map((d) => d.name)}
                selected={developerFilter}
                onChange={setDeveloperFilter}
                width="flex-1"
              />
              <SearchableMultiSelect
                label="Project"
                options={MAIN_PROJECTS.map((p) => p.name)}
                selected={projectFilter}
                onChange={setProjectFilter}
                width="flex-1"
              />
              <SearchableMultiSelect
                label="Linked"
                options={["Linked", "Unlinked"]}
                selected={linkedFilter}
                onChange={setLinkedFilter}
                width="flex-1"
                searchable={false}
              />
              <SearchableMultiSelect
                label="Source"
                options={[...SOURCES]}
                selected={sourceFilter}
                onChange={setSourceFilter}
                width="flex-1"
                searchable={false}
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Sort — Created date only */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={createdSort ? "default" : "outline"} size="sm" className="h-8">
                    <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                    Sort
                    {createdSort && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        Created · {createdSort === "asc" ? "Asc" : "Desc"}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCreatedSort(null)}>No sorting</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreatedSort("asc")}>
                    <ArrowUp className="mr-2 h-3.5 w-3.5" />Created date — Ascending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreatedSort("desc")}>
                    <ArrowDown className="mr-2 h-3.5 w-3.5" />Created date — Descending
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Group dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={groupByColumn ? "default" : "outline"} size="sm" className="h-8">
                    <Group className="mr-1.5 h-3.5 w-3.5" />
                    Group
                    {groupByColumn && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        {GROUP_COLS.find((c) => c.id === groupByColumn)?.label ?? groupByColumn}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupByColumn(null)}>No Grouping</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {GROUP_COLS.map((opt) => (
                    <DropdownMenuItem key={opt.id} onClick={() => { setGroupByColumn(opt.id); setCollapsedSections(new Set()) }}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Grid card */}
        <div className="rounded-xl border border-border bg-card">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
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

          {/* Select-all-results banner */}
          {(() => {
            const pageFullySelected = displayed.length > 0 && displayed.every((im) => selected.has(im.id))
            const allResultsSelected = filtered.length > 0 && filtered.every((im) => selected.has(im.id))
            const hasMoreThanPage = filtered.length > displayed.length
            if (!pageFullySelected || !hasMoreThanPage) return null
            return (
              <div className="flex items-center justify-center gap-2 border-b border-border bg-blue-50 px-4 py-2 text-xs dark:bg-blue-950/30">
                {allResultsSelected ? (
                  <>
                    <span className="text-blue-800 dark:text-blue-200">
                      All <strong>{filtered.length.toLocaleString()}</strong> render images across all pages are selected.
                    </span>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-blue-800 dark:text-blue-200">
                      All <strong>{displayed.length}</strong> on this page are selected.
                    </span>
                    <button
                      onClick={() => setSelected(new Set(filtered.map((im) => im.id)))}
                      className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                    >
                      Select all {filtered.length.toLocaleString()} render images
                    </button>
                  </>
                )}
              </div>
            )
          })()}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
              <div className="rounded-full bg-secondary p-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No render images found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : sections ? (
            <div className="space-y-2 p-4">
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
                      <Badge variant="secondary" className="text-xs">{imgs.length}</Badge>
                      <div className="h-px flex-1 bg-border" />
                    </button>
                    {!isCollapsed && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {imgs.map((img) => (
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
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

          {/* Pagination footer (grouped mode shows all results, so no pager) */}
          {filtered.length > 0 && sections && (
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {filtered.length.toLocaleString()} images in {sections.length} group{sections.length !== 1 ? "s" : ""}
            </div>
          )}
          {filtered.length > 0 && !sections && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
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
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 select-none items-center gap-0 overflow-hidden rounded-xl bg-zinc-900 text-sm text-white shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-semibold tabular-nums">{selected.size} selected</span>
            {filtered.length > selected.size ? (
              <button
                onClick={() => setSelected(new Set(filtered.map((im) => im.id)))}
                className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Select all {filtered.length.toLocaleString()}
              </button>
            ) : (
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <button className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800">
            <Download className="h-3.5 w-3.5 text-zinc-400" /> Download
          </button>
          <div className="h-8 w-px bg-zinc-700" />
          <button
            onClick={() => setDeleteTargets(selectedImages)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
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

      {/* Add image dialog */}
      <AddImageDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}

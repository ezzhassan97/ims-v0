"use client"

import { Fragment, useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCard, TableCardHeader, TableToolbar, TableFooter, FloatingBulkBar, BulkBarButton, DateRangeFilter, FilterMultiSelect, FiltersDrawer, FilterDrawerField, MultiSortControl, GroupPager, IdTag, COL_SEP, type SortLevel } from "@/components/table-kit"
import { FilePreviewDialog, type PreviewFile } from "@/components/file-preview-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal,
  Copy, Check, Eye, FileText, FileImage, FileVideo, FileSpreadsheet, Group as GroupIcon,
  ArrowUp, ArrowDown, ArrowUpDown,
  X, Download, Archive, Tag, UserCheck, ExternalLink, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  whatsappMediaItems,
  ALL_PROJECTS,
  ALL_DEVELOPERS,
  type WhatsAppMediaItem,
  type FileTypeGroup,
  type MediaClass,
} from "@/lib/whatsapp-media-mock"

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
function formatBytes(b: number) {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  if (b >= 1_000)     return `${(b / 1_000).toFixed(0)} KB`
  return `${b} B`
}

// ── File type badge ────────────────────────────────────────────────────────────

const FILE_TYPE_COLORS: Record<FileTypeGroup, string> = {
  Image:    "bg-sky-50 text-sky-700 border-sky-200",
  Video:    "bg-purple-50 text-purple-700 border-purple-200",
  Sheet:    "bg-green-50 text-green-700 border-green-200",
  Document: "bg-rose-50 text-rose-700 border-rose-200",
}

function FileTypeBadge({ group }: { group: FileTypeGroup }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", FILE_TYPE_COLORS[group])}>
      {group}
    </Badge>
  )
}

function FileIcon({ ext, size = "md" }: { ext: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-6 h-6" : "w-8 h-8"
  const ico = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3 w-3" : "h-4 w-4"
  const e = ext.toUpperCase()
  if (e === "PDF")  return <div className={cn(dim, "rounded bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0")}><FileText className={cn(ico, "text-rose-600")} /></div>
  if (["MP4","MOV","AVI","MKV"].includes(e)) return <div className={cn(dim, "rounded bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0")}><FileVideo className={cn(ico, "text-purple-600")} /></div>
  if (["XLSX","XLS","CSV"].includes(e)) return <div className={cn(dim, "rounded bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0")}><FileSpreadsheet className={cn(ico, "text-green-600")} /></div>
  if (["DOCX","DOC"].includes(e)) return <div className={cn(dim, "rounded bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0")}><FileText className={cn(ico, "text-blue-600")} /></div>
  return <div className={cn(dim, "rounded bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0")}><FileImage className={cn(ico, "text-sky-600")} /></div>
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-secondary transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  )
}

const FILE_TYPE_GROUPS: FileTypeGroup[] = ["Image", "Video", "Sheet", "Document"]
const MEDIA_CLASSES: MediaClass[] = ["Brochure", "Floor Plan", "Map Location", "Render", "Video", "Unclassified"]
const ROWS_OPTIONS = [10, 25, 50]

// ── Shared MultiSelect (filter bar + drawer) ──────────────────────────────────
// showChips=true renders selected value chips with × below the trigger

function MultiSelect({
  label,
  options,
  value,
  onChange,
  className,
  showChips = false,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  className?: string
  showChips?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm w-full",
          "hover:bg-secondary/40 transition-colors",
          open && "ring-2 ring-ring",
        )}
      >
        <span className="truncate text-left">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{label}</span>
          ) : value.length === 1 ? (
            value[0]
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{label}</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{value.length}</Badge>
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Selected chips */}
      {showChips && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-secondary border border-border"
            >
              {v}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(v) }}
                className="inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-muted-foreground/20 transition-colors ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden w-52">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/40 rounded-md outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((o) => (
              <div
                key={o}
                role="option"
                aria-selected={value.includes(o)}
                onClick={() => toggle(o)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-pointer hover:bg-secondary transition-colors",
                  value.includes(o) && "bg-primary/5",
                )}
              >
                <Checkbox checked={value.includes(o)} className="h-4 w-4 flex-shrink-0 pointer-events-none" />
                {o}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No results</p>}
          </div>
          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <button onClick={() => { onChange([]); setQ("") }} className="text-xs text-primary hover:underline">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline multi-select for table cells ──────────────────────────────────────

function InlineMultiSelect({
  options,
  value,
  onChange,
  placeholder = "—",
}: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])
  const overflowItems = value.slice(2)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/60 transition-colors text-left w-full group"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground text-xs italic">{placeholder}</span>
        ) : (
          <span className="flex items-center gap-1 flex-wrap">
            {value.slice(0, 2).map((v) => (
              <span key={v} className="inline-flex max-w-[120px] items-center truncate rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium text-foreground">{v}</span>
            ))}
            {overflowItems.length > 0 && (
              <span className="relative group/tip">
                <Badge variant="outline" className="cursor-default bg-white px-1.5 py-0 text-[11px]">+{overflowItems.length}</Badge>
                {/* Tooltip */}
                <span className="pointer-events-none absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg shadow-lg px-2.5 py-1.5 min-w-max opacity-0 group-hover/tip:opacity-100 transition-opacity">
                  <span className="flex flex-col gap-0.5">
                    {overflowItems.map((p) => (
                      <span key={p} className="text-xs text-popover-foreground whitespace-nowrap">{p}</span>
                    ))}
                  </span>
                </span>
              </span>
            )}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-52">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/40 rounded-md outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((o) => (
              <div
                key={o}
                role="option"
                aria-selected={value.includes(o)}
                onClick={() => toggle(o)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left cursor-pointer hover:bg-secondary transition-colors",
                  value.includes(o) && "bg-primary/5",
                )}
              >
                <Checkbox checked={value.includes(o)} className="h-4 w-4 flex-shrink-0 pointer-events-none" />
                {o}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No results</p>}
          </div>
          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <button onClick={() => { onChange([]); setOpen(false) }} className="text-xs text-primary hover:underline">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── File Details side sheet ───────────────────────────────────────────────────

function FileDetailsSheet({
  item,
  open,
  onOpenChange,
  onSave,
}: {
  item: WhatsAppMediaItem | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave?: (id: string, mediaClasses: MediaClass[], projects: string[]) => void
}) {
  const [mediaClasses, setMediaClasses] = useState<MediaClass[]>([])
  const [projects, setProjects] = useState<string[]>([])

  useEffect(() => {
    if (item) {
      setMediaClasses([...item.mediaClasses])
      setProjects([...item.projects])
    }
  }, [item])

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!w-[440px] !max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex-shrink-0 flex flex-row items-center justify-between">
          <SheetTitle className="text-base">File details</SheetTitle>
          <div className="flex items-center gap-2">
            <a
              href={item.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (!item.url) e.preventDefault() }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-secondary transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <button
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-secondary transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => onOpenChange(false)} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="w-full h-52 bg-muted/60 flex flex-col items-center justify-center border-b border-border gap-3">
            <FileIcon ext={item.fileExt} size="lg" />
            <p className="text-xs text-muted-foreground font-mono px-4 text-center break-all">{item.fileName}</p>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Date + size */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatDate(item.createdAt)}&nbsp;&nbsp;{formatTime(item.createdAt)}</span>
              <span className="font-mono text-xs bg-secondary/40 px-2 py-0.5 rounded">{formatBytes(item.fileSize)}</span>
            </div>

            {/* Developer */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/60 border border-border">
              <img src={item.developerLogo} alt={item.developerName} className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none">{item.developerName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <code className="text-xs font-mono text-muted-foreground">{item.developerId}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(item.developerId)}
                    className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-secondary transition-colors"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sender + message */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sender phone</p>
                <p className="text-sm">{item.senderPhone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</p>
                <p className="text-sm break-all">{item.message}</p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Media Class — shared MultiSelect with chips */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media Class</p>
              <MultiSelect
                label="Select media class..."
                options={MEDIA_CLASSES}
                value={mediaClasses}
                onChange={(v) => setMediaClasses(v as MediaClass[])}
                showChips
              />
            </div>

            {/* Assigned Projects — same component, same behaviour */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Projects</p>
              <MultiSelect
                label="Select projects..."
                options={ALL_PROJECTS}
                value={projects}
                onChange={setProjects}
                showChips
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="bg-transparent">Cancel</Button>
          <Button
            size="sm"
            onClick={() => {
              onSave?.(item.id, mediaClasses.length > 0 ? mediaClasses : ["Unclassified"], projects)
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkActionBar({ count, total, onSelectAll, onClear }: { count: number; total: number; onSelectAll: () => void; onClear: () => void }) {
  if (count === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 overflow-hidden rounded-xl bg-zinc-900 text-white shadow-2xl select-none text-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="font-semibold tabular-nums">{count} selected</span>
        {total > count ? (
          <button onClick={onSelectAll} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Select all {total.toLocaleString()}</button>
        ) : (
          <button onClick={onClear} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Clear</button>
        )}
      </div>
      <div className="h-8 w-px bg-zinc-700" />
      <button className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"><Tag className="h-3.5 w-3.5 text-zinc-400" />Classify</button>
      <div className="h-8 w-px bg-zinc-700" />
      <button className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"><UserCheck className="h-3.5 w-3.5 text-zinc-400" />Assign</button>
      <div className="h-8 w-px bg-zinc-700" />
      <button className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"><Download className="h-3.5 w-3.5 text-zinc-400" />Download</button>
      <div className="h-8 w-px bg-zinc-700" />
      <button className="flex items-center gap-1.5 px-4 py-2.5 text-red-300 transition-colors hover:bg-red-950/50"><Archive className="h-3.5 w-3.5" />Archive</button>
      <div className="h-8 w-px bg-zinc-700" />
      <button onClick={onClear} className="px-3 py-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function WhatsAppMediaPage() {
  return (
    <div className="min-h-screen space-y-4 bg-secondary/40 p-6">
      <div>
        <h1 className="text-xl font-semibold">WhatsApp Media</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Browse and manage media files received via WhatsApp</p>
      </div>
      <WhatsAppMediaTable />
    </div>
  )
}

/** The WhatsApp Media table + toolbar + bulk bar (reused inside the Developer details tab). */
export function WhatsAppMediaTable({ hideDeveloperFilter = false }: { hideDeveloperFilter?: boolean }) {
  const [items, setItems] = useState(whatsappMediaItems)
  const [search, setSearch] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<string[]>([])
  const [mediaClassFilter, setMediaClassFilter] = useState<string[]>([])
  const [projectFilter, setProjectFilter] = useState<string[]>([])
  const [developerFilter, setDeveloperFilter] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [detailItem, setDetailItem] = useState<WhatsAppMediaItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<WhatsAppMediaItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<"none" | "fileType">("none")
  const GROUP_PAGE_SIZE = 10
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})

  const filtered = useMemo(() => {
    let out = items.filter((item) => {
      if (search) {
        const q = search.toLowerCase()
        if (!item.fileName.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) return false
      }
      if (fileTypeFilter.length > 0 && !fileTypeFilter.includes(item.fileTypeGroup)) return false
      if (mediaClassFilter.length > 0 && !mediaClassFilter.some((c) => item.mediaClasses.includes(c as MediaClass))) return false
      if (projectFilter.length > 0 && !projectFilter.some((p) => item.projects.includes(p))) return false
      if (developerFilter.length > 0 && !developerFilter.includes(item.developerName)) return false
      if (dateFrom && item.createdAt < new Date(dateFrom)) return false
      if (dateTo && item.createdAt > new Date(dateTo + "T23:59:59")) return false
      return true
    })
    if (sorts.length > 0) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const av = s.key === "createdAt" ? a.createdAt.getTime() : a.updatedAt.getTime()
          const bv = s.key === "createdAt" ? b.createdAt.getTime() : b.updatedAt.getTime()
          if (av !== bv) return s.dir === "asc" ? av - bv : bv - av
        }
        return 0
      })
    }
    return out
  }, [items, search, fileTypeFilter, mediaClassFilter, projectFilter, developerFilter, dateFrom, dateTo, sorts])

  // Grouped by File Type — each group paginates independently past 10 rows
  const groups = useMemo(() => {
    if (groupBy !== "fileType") return null
    return FILE_TYPE_GROUPS
      .map((g) => ({ label: g, rows: filtered.filter((i) => i.fileTypeGroup === g) }))
      .filter((g) => g.rows.length > 0)
  }, [filtered, groupBy])

  const cycleHeaderSort = (key: string) =>
    setSorts((prev) => {
      const cur = prev.length === 1 && prev[0].key === key ? prev[0] : null
      if (!cur) return [{ key, dir: "asc" }]
      return cur.dir === "asc" ? [{ key, dir: "desc" }] : []
    })

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const pageItems = groups ? filtered : filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((i) => selected.has(i.id))
  const someOnPageSelected = pageItems.some((i) => selected.has(i.id)) && !allOnPageSelected

  const toggleAll = () => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (allOnPageSelected) pageItems.forEach((i) => n.delete(i.id))
      else pageItems.forEach((i) => n.add(i.id))
      return n
    })
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const clearFilters = () => {
    setSearch(""); setFileTypeFilter([]); setMediaClassFilter([])
    setProjectFilter([]); setDeveloperFilter([]); setDateFrom(""); setDateTo(""); setPage(1)
  }
  const hasFilters = search || fileTypeFilter.length > 0 || mediaClassFilter.length > 0 ||
    projectFilter.length > 0 || developerFilter.length > 0 || dateFrom || dateTo

  const openDetail = (item: WhatsAppMediaItem) => { setDetailItem(item); setDetailOpen(true) }
  const openPreview = (item: WhatsAppMediaItem) => setPreviewItem(item)
  useEffect(() => { setGroupPages({}) }, [groupBy, search, fileTypeFilter, mediaClassFilter, projectFilter, developerFilter, dateFrom, dateTo])

  const handleSave = (id: string, mediaClasses: MediaClass[], projects: string[]) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, mediaClasses, projects, updatedAt: new Date() } : it))
  }
  const handleInlineMediaClass = (id: string, val: string[]) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, mediaClasses: val as MediaClass[], updatedAt: new Date() } : it))
  }
  const handleInlineProjects = (id: string, val: string[]) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, projects: val, updatedAt: new Date() } : it))
  }

  const developerNames = ALL_DEVELOPERS.map((d) => d.name)

  const renderRow = (item: WhatsAppMediaItem) => (
    <tr
      key={item.id}
      className={cn(
        "hover:bg-muted/40 transition-colors cursor-pointer",
        selected.has(item.id) && "bg-primary/5",
      )}
      onClick={() => openDetail(item)}
    >
      {/* Checkbox — sticky left */}
      <td
        className={cn("sticky left-0 z-10 px-4 py-3", selected.has(item.id) ? "bg-primary/5" : "bg-card")}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleOne(item.id)} className="h-4 w-4" />
      </td>

      {/* Developer — or, inside a developer's details, the WhatsApp group the file came through */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {hideDeveloperFilter ? (
          <div className="flex items-center gap-2 group">
            <img src={item.waGroup.image} alt={item.waGroup.name} className="h-7 w-7 flex-shrink-0 rounded-lg border border-border object-cover" />
            <div className="min-w-0">
              <a
                href={`/whatsapp-groups/${item.waGroup.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block max-w-[140px] truncate text-sm font-medium leading-none text-foreground hover:text-primary hover:underline"
              >
                {item.waGroup.name}
              </a>
              <div className="mt-0.5 flex items-center gap-0.5">
                <code className="font-mono text-[10px] text-muted-foreground">{item.waGroup.id}</code>
                <CopyBtn value={item.waGroup.id} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <img src={item.developerLogo} alt={item.developerName} className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none truncate max-w-[110px]">{item.developerName}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <code className="text-[10px] font-mono text-muted-foreground">{item.developerId}</code>
                <CopyBtn value={item.developerId} />
              </div>
            </div>
          </div>
        )}
      </td>

      {/* File name + ID — clicking the name opens the in-app preview */}
      <td className="px-4 py-3 max-w-[240px]">
        <div className="flex items-center gap-2.5">
          <FileIcon ext={item.fileExt} />
          <div className="min-w-0">
            <button
              onClick={(e) => { e.stopPropagation(); openPreview(item) }}
              className="text-sm text-primary hover:underline font-medium text-left block truncate max-w-[160px]"
              title={item.fileName}
            >
              {item.fileName.length > 30 ? item.fileName.slice(0, 30) + "…" : item.fileName}
            </button>
            <div className="flex items-center gap-0.5 group" onClick={(e) => e.stopPropagation()}>
              <code className="text-[10px] font-mono text-muted-foreground">{item.id}</code>
              <CopyBtn value={item.id} />
            </div>
          </div>
        </div>
      </td>

      {/* File size */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-muted-foreground font-mono">{formatBytes(item.fileSize)}</span>
      </td>

      {/* File type */}
      <td className="px-4 py-3">
        <FileTypeBadge group={item.fileTypeGroup} />
      </td>

      {/* Media class — inline multi-select */}
      <td className="px-4 py-3 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
        <InlineMultiSelect
          options={MEDIA_CLASSES}
          value={item.mediaClasses}
          onChange={(v) => handleInlineMediaClass(item.id, v)}
          placeholder="Unclassified"
        />
      </td>

      {/* Projects — inline multi-select with overflow tooltip */}
      <td className="px-4 py-3 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
        <InlineMultiSelect
          options={ALL_PROJECTS}
          value={item.projects}
          onChange={(v) => handleInlineProjects(item.id, v)}
          placeholder="No projects"
        />
      </td>

      {/* Created at */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm leading-none">{formatDate(item.createdAt)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatTime(item.createdAt)}</div>
      </td>

      {/* Updated at */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm leading-none">{formatDate(item.updatedAt)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatTime(item.updatedAt)}</div>
      </td>

      {/* Row actions — sticky right */}
      <td
        className={cn("sticky right-0 z-10 px-4 py-3", selected.has(item.id) ? "bg-primary/5" : "bg-card")}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openPreview(item)}><Eye className="mr-2 h-3.5 w-3.5" />Preview</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDetail(item)}>View details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Download</DropdownMenuItem>
            <DropdownMenuItem>Classify</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="File name or ID"
        hideAdvanced
        activeFilters={(hideDeveloperFilter ? 0 : developerFilter.length) + projectFilter.length + fileTypeFilter.length + mediaClassFilter.length + ((dateFrom || dateTo) ? 1 : 0)}
        onAllFilters={() => setShowFilters(true)}
        filters={
        <>
          {!hideDeveloperFilter && <FilterMultiSelect label="Developer" options={developerNames} value={developerFilter} onChange={(v) => { setDeveloperFilter(v); setPage(1) }} className="w-40" />}
          <FilterMultiSelect label="Project" options={ALL_PROJECTS} value={projectFilter} onChange={(v) => { setProjectFilter(v); setPage(1) }} className="w-40" />
          <FilterMultiSelect label="File type" options={FILE_TYPE_GROUPS} value={fileTypeFilter} onChange={(v) => { setFileTypeFilter(v); setPage(1) }} className="w-36" />
          <FilterMultiSelect label="Media class" options={MEDIA_CLASSES} value={mediaClassFilter} onChange={(v) => { setMediaClassFilter(v); setPage(1) }} className="w-40" />
          <DateRangeFilter label="Created At" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} />
        </>
        }
        sortControl={<MultiSortControl fields={[{ key: "createdAt", label: "Created at" }, { key: "updatedAt", label: "Updated at" }]} sorts={sorts} onChange={setSorts} />}
        groupControl={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5">
                <GroupIcon className="h-3.5 w-3.5" />{groupBy === "none" ? "Group by" : "File Type"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-sm" onClick={() => setGroupBy("none")}>No grouping</DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={() => setGroupBy("fileType")}>File Type</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Table area */}
      <div>
        <TableCard>
          <TableCardHeader title="Media" count={filtered.length} />
          <div className="overflow-x-auto">
            <table className={cn("w-max text-sm", COL_SEP)}>
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  {/* sticky checkbox col */}
                  <th className="sticky left-0 z-10 bg-muted/60 w-10 px-4 py-3">
                    <Checkbox checked={allOnPageSelected} data-indeterminate={someOnPageSelected} onCheckedChange={toggleAll} className="h-4 w-4" />
                  </th>
                  {/* Inside a developer's details the Developer column becomes the WhatsApp Group column */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{hideDeveloperFilter ? "WhatsApp Group" : "Developer"}</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Size</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Media Class</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Projects</th>
                  {(["createdAt", "updatedAt"] as const).map((key) => {
                    const s = sorts.find((x) => x.key === key)
                    return (
                      <th key={key} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        <button onClick={() => cycleHeaderSort(key)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                          {key === "createdAt" ? "Created At" : "Updated At"}
                          {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      </th>
                    )
                  })}
                  {/* sticky action col */}
                  <th className="sticky right-0 z-10 bg-muted/60 w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No media files match your filters
                    </td>
                  </tr>
                ) : groups ? (
                  groups.map((g) => {
                    const gPage = groupPages[g.label] ?? 1
                    const gRows = g.rows.slice((gPage - 1) * GROUP_PAGE_SIZE, gPage * GROUP_PAGE_SIZE)
                    return (
                      <Fragment key={g.label}>
                        <tr className="bg-muted/40">
                          <td colSpan={10} className="p-0">
                            <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                              <FileTypeBadge group={g.label} />
                              <span className="text-xs text-muted-foreground">{g.rows.length} file{g.rows.length !== 1 ? "s" : ""}</span>
                              {g.rows.length > GROUP_PAGE_SIZE && (
                                <GroupPager total={g.rows.length} page={gPage} pageSize={GROUP_PAGE_SIZE} onPage={(pg) => setGroupPages((prev) => ({ ...prev, [g.label]: pg }))} />
                              )}
                            </div>
                          </td>
                        </tr>
                        {gRows.map(renderRow)}
                      </Fragment>
                    )
                  })
                ) : (
                  pageItems.map(renderRow)
                )}
              </tbody>
            </table>
          </div>

          {groups ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} files in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
          ) : (
            <TableFooter page={page} pageSize={rowsPerPage} total={filtered.length} onPage={setPage} onPageSize={(n) => { setRowsPerPage(n); setPage(1) }} label="assets" />
          )}
        </TableCard>
      </div>

      <FloatingBulkBar count={selected.size} total={filtered.length} onSelectAll={() => setSelected(new Set(filtered.map((i) => i.id)))} onClear={() => setSelected(new Set())}>
        <BulkBarButton icon={<Tag className="h-3.5 w-3.5 text-zinc-400" />}>Classify</BulkBarButton>
        <BulkBarButton icon={<UserCheck className="h-3.5 w-3.5 text-zinc-400" />}>Assign</BulkBarButton>
        <BulkBarButton icon={<Download className="h-3.5 w-3.5 text-zinc-400" />}>Download</BulkBarButton>
        <BulkBarButton icon={<Archive className="h-3.5 w-3.5" />} danger>Archive</BulkBarButton>
      </FloatingBulkBar>

      <FileDetailsSheet item={detailItem} open={detailOpen} onOpenChange={setDetailOpen} onSave={handleSave} />

      {/* All Filters drawer — same filters, order and state as the toolbar */}
      <FiltersDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={(hideDeveloperFilter ? 0 : developerFilter.length) + projectFilter.length + fileTypeFilter.length + mediaClassFilter.length + ((dateFrom || dateTo) ? 1 : 0)}
        onClear={clearFilters}
      >
        {!hideDeveloperFilter && (
          <FilterDrawerField label="Developer">
            <FilterMultiSelect label="Developer" options={developerNames} value={developerFilter} onChange={(v) => { setDeveloperFilter(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
        )}
        <FilterDrawerField label="Project">
          <FilterMultiSelect label="Project" options={ALL_PROJECTS} value={projectFilter} onChange={(v) => { setProjectFilter(v); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="File type">
          <FilterMultiSelect label="File type" options={FILE_TYPE_GROUPS} value={fileTypeFilter} onChange={(v) => { setFileTypeFilter(v); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Media class">
          <FilterMultiSelect label="Media class" options={MEDIA_CLASSES} value={mediaClassFilter} onChange={(v) => { setMediaClassFilter(v); setPage(1) }} className="w-full" width="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Created At">
          <DateRangeFilter label="Created At" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>

      {/* In-app large file preview — images, PDFs, videos, sheets */}
      {previewItem && (
        <FilePreviewDialog
          file={{ id: previewItem.id, name: previewItem.fileName, ext: previewItem.fileExt, typeGroup: previewItem.fileTypeGroup, url: previewItem.url, size: previewItem.fileSize }}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}

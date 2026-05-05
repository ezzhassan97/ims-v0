"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Calendar, ChevronLeft, ChevronRight, MoreHorizontal,
  Copy, Check, FileText, FileImage, FileVideo, FileSpreadsheet,
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
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                  value.includes(o) && "bg-primary/5",
                )}
              >
                <Checkbox checked={value.includes(o)} className="h-4 w-4 flex-shrink-0" onCheckedChange={() => toggle(o)} />
                {o}
              </button>
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
          <span className="text-sm flex items-center gap-1 flex-wrap">
            <span className="truncate max-w-[120px]">{value.slice(0, 2).join(", ")}</span>
            {overflowItems.length > 0 && (
              <span className="relative group/tip">
                <Badge variant="outline" className="text-xs px-1.5 py-0 cursor-default">+{overflowItems.length}</Badge>
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
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                  value.includes(o) && "bg-primary/5",
                )}
              >
                <Checkbox checked={value.includes(o)} className="h-4 w-4 flex-shrink-0" onCheckedChange={() => toggle(o)} />
                {o}
              </button>
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
          <div className="w-full h-52 bg-secondary/30 flex flex-col items-center justify-center border-b border-border gap-3">
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
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border">
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

function BulkActionBar({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium">{count} file{count !== 1 ? "s" : ""} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-background">
          <Tag className="h-3.5 w-3.5" />Classify
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-background">
          <UserCheck className="h-3.5 w-3.5" />Assign
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-background">
          <Download className="h-3.5 w-3.5" />Download
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-background text-destructive hover:text-destructive">
          <Archive className="h-3.5 w-3.5" />Archive
        </Button>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground ml-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function WhatsAppMediaPage() {
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

  const filtered = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, search, fileTypeFilter, mediaClassFilter, projectFilter, developerFilter, dateFrom, dateTo])

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const pageItems = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)
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

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold">WhatsApp Media</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse and manage media files received via WhatsApp</p>
      </div>

      {/* Filter bar — order: search | developer | project | file type | media class | date range | clear */}
      <div className="px-6 py-3 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="File name or ID"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Developer */}
          <MultiSelect
            label="Developer"
            options={developerNames}
            value={developerFilter}
            onChange={(v) => { setDeveloperFilter(v); setPage(1) }}
            className="w-40"
          />

          {/* Project */}
          <MultiSelect
            label="Project"
            options={ALL_PROJECTS}
            value={projectFilter}
            onChange={(v) => { setProjectFilter(v); setPage(1) }}
            className="w-40"
          />

          {/* File type */}
          <MultiSelect
            label="File type"
            options={FILE_TYPE_GROUPS}
            value={fileTypeFilter}
            onChange={(v) => { setFileTypeFilter(v); setPage(1) }}
            className="w-36"
          />

          {/* Media class */}
          <MultiSelect
            label="Media class"
            options={MEDIA_CLASSES}
            value={mediaClassFilter}
            onChange={(v) => { setMediaClassFilter(v); setPage(1) }}
            className="w-40"
          />

          {/* Date range — single pair of compacted inputs */}
          <div className="flex items-center gap-1 border border-input rounded-md h-9 px-2 bg-background">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none w-[120px] text-foreground placeholder:text-muted-foreground"
              title="From date"
            />
            <span className="text-muted-foreground text-xs px-1">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none w-[120px] text-foreground placeholder:text-muted-foreground"
              title="To date"
            />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-sm text-primary hover:underline font-medium whitespace-nowrap">
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Media</h2>
            <Badge variant="secondary" className="text-xs font-medium">{filtered.length} assets</Badge>
          </div>
          <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())} />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "900px" }}>
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {/* sticky checkbox col */}
                  <th className="sticky left-0 z-10 bg-secondary/30 w-10 px-4 py-3">
                    <Checkbox checked={allOnPageSelected} data-indeterminate={someOnPageSelected} onCheckedChange={toggleAll} className="h-4 w-4" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Developer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Media Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Projects</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Updated At</th>
                  {/* sticky action col */}
                  <th className="sticky right-0 z-10 bg-secondary/30 w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No media files match your filters
                    </td>
                  </tr>
                ) : pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-secondary/20 transition-colors cursor-pointer",
                      selected.has(item.id) && "bg-primary/5",
                    )}
                    onClick={() => openDetail(item)}
                  >
                    {/* Checkbox — sticky left */}
                    <td
                      className={cn(
                        "sticky left-0 z-10 px-4 py-3",
                        selected.has(item.id) ? "bg-primary/5" : "bg-card",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleOne(item.id)} className="h-4 w-4" />
                    </td>

                    {/* Developer */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 group">
                        <img src={item.developerLogo} alt={item.developerName} className="w-7 h-7 rounded-full flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate max-w-[110px]">{item.developerName}</p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <code className="text-xs font-mono text-muted-foreground">{item.developerId}</code>
                            <CopyBtn value={item.developerId} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* File name + ID */}
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="flex items-center gap-2.5">
                        <FileIcon ext={item.fileExt} />
                        <div className="min-w-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(item) }}
                            className="text-sm text-primary hover:underline font-medium text-left block truncate max-w-[160px]"
                            title={item.fileName}
                          >
                            {item.fileName.length > 30 ? item.fileName.slice(0, 30) + "…" : item.fileName}
                          </button>
                          <div className="flex items-center gap-0.5 group" onClick={(e) => e.stopPropagation()}>
                            <code className="text-xs font-mono text-muted-foreground">{item.id}</code>
                            <CopyBtn value={item.id} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* File size */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground font-mono">{formatBytes(item.fileSize)}</span>
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
                      className={cn(
                        "sticky right-0 z-10 px-4 py-3",
                        selected.has(item.id) ? "bg-primary/5" : "bg-card",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(item)}>View details</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Classify</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1) }}
              className="h-7 px-2 text-xs rounded-md border border-border bg-background outline-none cursor-pointer"
            >
              {ROWS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length === 0 ? "0" : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)}`} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <FileDetailsSheet item={detailItem} open={detailOpen} onOpenChange={setDetailOpen} onSave={handleSave} />
    </div>
  )
}

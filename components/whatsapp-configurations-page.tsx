"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Pencil, ArchiveIcon, Plus, Check, X, Upload, FileText, FileImage, FileSpreadsheet, File, Search, Copy, ChevronDown, CalendarIcon, Download, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { whatsappMediaItems, ALL_DEVELOPERS, ALL_PROJECTS, type WhatsAppMediaItem } from "@/lib/whatsapp-media-mock"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaClass {
  id: string
  name: string
  description: string
  archived: boolean
}

type EditingState = {
  id: string        // "new" for a new-row
  name: string
  description: string
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_IMAGE_CLASSES: MediaClass[] = [
  { id: "ic-1", name: "Brochure",           description: "Project or unit marketing brochures",          archived: false },
  { id: "ic-2", name: "Render",             description: "Architectural renders and 3D visualisations",  archived: false },
  { id: "ic-3", name: "Floor Plan",         description: "Unit and building floor plan layouts",          archived: false },
  { id: "ic-4", name: "Construction Photo", description: "On-site progress photography",                 archived: false },
]

const SEED_DOCUMENT_CLASSES: MediaClass[] = [
  { id: "dc-1", name: "Launch Fact Sheet",  description: "Key project facts distributed at launch events", archived: false },
  { id: "dc-2", name: "Payment Plan",       description: "Instalment schedule and payment terms",          archived: false },
  { id: "dc-3", name: "Legal Document",     description: "Contracts, title deeds, and legal notices",      archived: false },
  { id: "dc-4", name: "EOI Form",           description: "Expression of interest registration forms",      archived: false },
]

const SEED_SHEET_CLASSES: MediaClass[] = [
  { id: "sc-1", name: "Availability Sheet",     description: "Unit availability with pricing and status", archived: false },
  { id: "sc-2", name: "Construction Update",    description: "Periodic construction milestone reports",   archived: false },
  { id: "sc-3", name: "Comparison Sheet",       description: "Side-by-side project or unit comparison",   archived: false },
]

// ── ClassRow ──────────────────────────────────────────────────────────────────

function ClassRow({
  cls,
  editing,
  onEdit,
  onSave,
  onCancel,
  onArchive,
}: {
  cls: MediaClass
  editing: EditingState | null
  onEdit: (cls: MediaClass) => void
  onSave: (id: string, name: string, description: string) => void
  onCancel: () => void
  onArchive: (id: string) => void
}) {
  const isEditing = editing?.id === cls.id

  if (isEditing && editing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 bg-secondary/30">
        <div className="flex-1 flex items-center gap-3">
          <Input
            autoFocus
            value={editing.name}
            onChange={(e) =>
              onSave !== undefined &&
              // propagate name change upward via a synthetic save-preview
              // we just keep the local state in the parent
              onEdit({ ...cls, name: e.target.value })
            }
            placeholder="Class name"
            className="h-8 w-48 text-sm"
          />
          <Input
            value={editing.description}
            onChange={(e) => onEdit({ ...cls, description: e.target.value })}
            placeholder="Short description"
            className="h-8 flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="h-7 px-3 gap-1.5"
            onClick={() => onSave(cls.id, editing.name, editing.description)}
            disabled={!editing.name.trim()}
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-3 gap-1.5 bg-transparent" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{cls.name}</p>
        {cls.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{cls.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Edit"
          onClick={() => onEdit(cls)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          title="Archive"
          onClick={() => onArchive(cls.id)}
        >
          <ArchiveIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── NewRow (inline add form) ───────────────────────────────────────────────────

function NewRow({
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  editing: EditingState
  onEdit: (partial: Partial<EditingState>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-t border-border">
      <div className="flex-1 flex items-center gap-3">
        <Input
          autoFocus
          value={editing.name}
          onChange={(e) => onEdit({ name: e.target.value })}
          placeholder="Class name"
          className="h-8 w-48 text-sm"
        />
        <Input
          value={editing.description}
          onChange={(e) => onEdit({ description: e.target.value })}
          placeholder="Short description (optional)"
          className="h-8 flex-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="h-7 px-3 gap-1.5"
          onClick={onSave}
          disabled={!editing.name.trim()}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-3 gap-1.5 bg-transparent" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── ClassSection ──────────────────────────────────────────────────────────────

function ClassSection({
  title,
  classes,
  onUpdate,
}: {
  title: string
  classes: MediaClass[]
  onUpdate: (updated: MediaClass[]) => void
}) {
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [adding, setAdding] = useState<EditingState | null>(null)

  const handleEdit = (cls: MediaClass) => {
    setAdding(null)
    setEditing({ id: cls.id, name: cls.name, description: cls.description })
  }

  // Used to live-update the editing state while the user types
  const handleEditFieldChange = (cls: MediaClass) => {
    setEditing((prev) => prev ? { ...prev, name: cls.name, description: cls.description } : prev)
  }

  const handleSaveEdit = (id: string, name: string, description: string) => {
    onUpdate(classes.map((c) => c.id === id ? { ...c, name, description } : c))
    setEditing(null)
  }

  const handleCancelEdit = () => setEditing(null)

  const handleArchive = (id: string) => {
    onUpdate(classes.filter((c) => c.id !== id))
  }

  const handleStartAdd = () => {
    setEditing(null)
    setAdding({ id: "new", name: "", description: "" })
  }

  const handleSaveAdd = () => {
    if (!adding?.name.trim()) return
    const newCls: MediaClass = {
      id: `cls-${Date.now()}`,
      name: adding.name.trim(),
      description: adding.description.trim(),
      archived: false,
    }
    onUpdate([...classes, newCls])
    setAdding(null)
  }

  const handleCancelAdd = () => setAdding(null)

  const active = classes.filter((c) => !c.archived)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {active.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs bg-transparent"
          onClick={handleStartAdd}
          disabled={adding !== null}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Class
        </Button>
      </div>

      {/* Rows */}
      {active.length === 0 && !adding ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No classes yet. Click &quot;Add Class&quot; to create one.
        </div>
      ) : (
        <div>
          {active.map((cls) => (
            <ClassRow
              key={cls.id}
              cls={cls}
              editing={editing?.id === cls.id ? editing : null}
              onEdit={handleEditFieldChange}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              onArchive={handleArchive}
            />
          ))}
          {/* clicking Edit triggers handleEdit, not handleEditFieldChange */}
        </div>
      )}

      {/* Add new row */}
      {adding && (
        <NewRow
          editing={adding}
          onEdit={(partial) => setAdding((prev) => prev ? { ...prev, ...partial } : prev)}
          onSave={handleSaveAdd}
          onCancel={handleCancelAdd}
        />
      )}
    </div>
  )
}

// ── Upload from WhatsApp dialog ───────────────────────────────────────────────

function fileIcon(ext: string) {
  const e = ext.toUpperCase()
  if (["JPG","JPEG","PNG","GIF","WEBP","HEIC"].includes(e))
    return <FileImage className="h-5 w-5 text-sky-500 flex-shrink-0" />
  if (["XLSX","XLS","CSV"].includes(e))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500 flex-shrink-0" />
  if (["PDF","DOC","DOCX"].includes(e))
    return <FileText className="h-5 w-5 text-rose-500 flex-shrink-0" />
  return <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.round(bytes / 1_000)} KB`
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Inline copy button
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

// Compact multi-select dropdown for filter bar
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-8 px-3 flex items-center gap-1.5 text-sm rounded-md border border-input bg-background hover:bg-secondary/40 transition-colors",
          open && "ring-2 ring-ring ring-offset-1",
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        {value.length > 0 && (
          <Badge variant="secondary" className="px-1.5 py-0 h-4 text-xs">{value.length}</Badge>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-2 py-1 text-sm bg-secondary/40 rounded outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">No results</p>
              : filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors"
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center",
                    value.includes(opt) ? "bg-primary border-primary" : "border-input",
                  )}>
                    {value.includes(opt) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  {opt}
                </button>
              ))}
          </div>
          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Date range filter
function DateRangeFilter({ from, to, onChange }: {
  from: string; to: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <div className="flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-sm">
      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="bg-transparent outline-none text-sm w-28"
      />
      <span className="text-muted-foreground">—</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="bg-transparent outline-none text-sm w-28"
      />
    </div>
  )
}

// Main dialog
function UploadFromWhatsAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [devFilter, setDevFilter]   = useState<string[]>([])
  const [projFilter, setProjFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [dateFrom, setDateFrom]     = useState("")
  const [dateTo,   setDateTo]       = useState("")
  const [search,   setSearch]       = useState("")

  // Reset on open
  useEffect(() => {
    if (open) { setSelectedId(null); setDevFilter([]); setProjFilter([]); setTypeFilter([]); setDateFrom(""); setDateTo(""); setSearch("") }
  }, [open])

  const items: WhatsAppMediaItem[] = useMemo(() => {
    return [...whatsappMediaItems]
      // exclude Video — only Image, PDF, Sheet
      .filter((it) => it.fileTypeGroup !== "Video")
      .filter((it) => {
        if (search && !it.fileName.toLowerCase().includes(search.toLowerCase()) && !it.id.toLowerCase().includes(search.toLowerCase())) return false
        if (devFilter.length > 0 && !devFilter.includes(it.developerName)) return false
        if (projFilter.length > 0 && !it.projects.some((p) => projFilter.includes(p))) return false
        if (typeFilter.length > 0 && !typeFilter.includes(it.fileTypeGroup)) return false
        if (dateFrom && it.createdAt < new Date(dateFrom)) return false
        if (dateTo && it.createdAt > new Date(dateTo + "T23:59:59")) return false
        return true
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [search, devFilter, projFilter, typeFilter, dateFrom, dateTo])

  const selected = items.find((it) => it.id === selectedId)
  const devNames = ALL_DEVELOPERS.map((d) => d.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[65vw] !max-w-none p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload from WhatsApp
          </DialogTitle>
        </DialogHeader>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-border flex-shrink-0 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="File name or ID..."
              className="h-8 pl-8 text-sm"
            />
          </div>
          <FilterDropdown label="Developer" options={devNames} value={devFilter} onChange={setDevFilter} />
          <FilterDropdown label="Project"   options={ALL_PROJECTS} value={projFilter} onChange={setProjFilter} />
          <FilterDropdown label="File type" options={["Image","Sheet","Document"]} value={typeFilter} onChange={setTypeFilter} />
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {/* Count row */}
          <div className="px-6 py-2.5 border-b border-border bg-secondary/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{items.length} files</span>
            {selected && (
              <span className="text-xs text-primary font-medium">{selected.fileName} selected</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No files match the current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-left">
                    {/* sticky radio col */}
                    <th className="sticky left-0 z-20 bg-secondary/40 w-10 px-4 py-2.5" />
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">File</th>
                    <th className="w-28 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Type</th>
                    <th className="w-52 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Developer</th>
                    <th className="w-52 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Projects</th>
                    <th className="w-28 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created</th>
                    {/* sticky actions col */}
                    <th className="sticky right-0 z-20 bg-secondary/40 w-20 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const isSelected = item.id === selectedId
                    const rowBg = isSelected ? "bg-primary/5" : "bg-card"
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className={cn(
                          "cursor-pointer transition-colors select-none",
                          isSelected ? "bg-primary/5" : "hover:bg-secondary/30",
                        )}
                      >
                        {/* Radio — sticky left */}
                        <td className={cn("sticky left-0 z-10 px-4 py-3", rowBg)}>
                          <div className={cn(
                            "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-primary bg-primary" : "border-input bg-background",
                          )}>
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                        </td>

                        {/* File name + ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {fileIcon(item.fileExt)}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[220px]">{item.fileName}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <code className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">{item.id}</code>
                                <CopyBtn value={item.id} />
                                <span className="text-muted-foreground/40 mx-1">·</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(item.fileSize)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            item.fileTypeGroup === "Image"    && "bg-sky-100 text-sky-700",
                            item.fileTypeGroup === "Sheet"    && "bg-emerald-100 text-emerald-700",
                            item.fileTypeGroup === "Document" && "bg-rose-100 text-rose-700",
                          )}>
                            {item.fileTypeGroup}
                          </span>
                        </td>

                        {/* Developer */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={item.developerLogo} alt={item.developerName} className="h-6 w-6 rounded-full flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate max-w-[110px]">{item.developerName}</p>
                              <div className="flex items-center gap-0.5">
                                <code className="text-xs text-muted-foreground font-mono">{item.developerId}</code>
                                <CopyBtn value={item.developerId} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Projects */}
                        <td className="px-4 py-3">
                          {item.projects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.projects.slice(0, 2).map((p) => (
                                <span key={p} className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">{p}</span>
                              ))}
                              {item.projects.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{item.projects.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                        </td>

                        {/* Actions — sticky right */}
                        <td
                          className={cn("sticky right-0 z-10 px-3 py-3", rowBg)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              title="Download"
                              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                              onClick={() => { const a = document.createElement("a"); a.href = item.url ?? "#"; a.download = item.fileName; a.click() }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title="Open in new tab"
                              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                              onClick={() => window.open(item.url ?? "#", "_blank")}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">Cancel</Button>
          <Button
            disabled={!selectedId}
            onClick={() => { /* proceed handler */ onOpenChange(false) }}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Proceed with selected file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── WhatsAppConfigurationsPage ────────────────────────────────────────────────

export function WhatsAppConfigurationsPage() {
  const [imageClasses,    setImageClasses]    = useState<MediaClass[]>(SEED_IMAGE_CLASSES)
  const [documentClasses, setDocumentClasses] = useState<MediaClass[]>(SEED_DOCUMENT_CLASSES)
  const [sheetClasses,    setSheetClasses]    = useState<MediaClass[]>(SEED_SHEET_CLASSES)
  const [uploadOpen,      setUploadOpen]      = useState(false)

  // Wrap ClassSection to correctly pass onEdit as the "start editing" action
  function FullSection({
    title,
    classes,
    onUpdate,
  }: {
    title: string
    classes: MediaClass[]
    onUpdate: (u: MediaClass[]) => void
  }) {
    const [editing, setEditing] = useState<EditingState | null>(null)
    const [adding,  setAdding]  = useState<EditingState | null>(null)

    const active = classes.filter((c) => !c.archived)

    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {active.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs bg-transparent"
            onClick={() => { setEditing(null); setAdding({ id: "new", name: "", description: "" }) }}
            disabled={adding !== null}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Class
          </Button>
        </div>

        {active.length === 0 && !adding ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No classes yet. Click &quot;Add Class&quot; to create one.
          </div>
        ) : (
          <div>
            {active.map((cls) => {
              const isEditing = editing?.id === cls.id
              if (isEditing && editing) {
                return (
                  <div
                    key={cls.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 bg-secondary/30"
                  >
                    <div className="flex-1 flex items-start gap-3">
                      <Input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)}
                        placeholder="Class name"
                        className="h-8 w-48 text-sm flex-shrink-0"
                      />
                      <Textarea
                        value={editing.description}
                        onChange={(e) => {
                          setEditing((p) => p ? { ...p, description: e.target.value } : p)
                          const el = e.target
                          el.style.height = "auto"
                          el.style.height = `${el.scrollHeight}px`
                        }}
                        placeholder="Short description"
                        rows={1}
                        className="flex-1 text-sm min-h-8 resize-none overflow-hidden py-1.5 leading-5"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-3 gap-1.5"
                        onClick={() => {
                          onUpdate(classes.map((c) => c.id === cls.id ? { ...c, name: editing.name, description: editing.description } : c))
                          setEditing(null)
                        }}
                        disabled={!editing.name.trim()}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-3 gap-1.5 bg-transparent" onClick={() => setEditing(null)}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={cls.id}
                  className="group flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cls.name}</p>
                    {cls.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{cls.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => { setAdding(null); setEditing({ id: cls.id, name: cls.name, description: cls.description }) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Archive"
                      onClick={() => onUpdate(classes.filter((c) => c.id !== cls.id))}
                    >
                      <ArchiveIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {adding && (
          <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border-t border-border">
            <div className="flex-1 flex items-start gap-3">
              <Input
                autoFocus
                value={adding.name}
                onChange={(e) => setAdding((p) => p ? { ...p, name: e.target.value } : p)}
                placeholder="Class name"
                className="h-8 w-48 text-sm flex-shrink-0"
              />
              <Textarea
                value={adding.description}
                onChange={(e) => {
                  setAdding((p) => p ? { ...p, description: e.target.value } : p)
                  const el = e.target
                  el.style.height = "auto"
                  el.style.height = `${el.scrollHeight}px`
                }}
                placeholder="Short description (optional)"
                rows={1}
                className="flex-1 text-sm min-h-8 resize-none overflow-hidden py-1.5 leading-5"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                className="h-7 px-3 gap-1.5"
                onClick={() => {
                  if (!adding.name.trim()) return
                  onUpdate([...classes, { id: `cls-${Date.now()}`, name: adding.name.trim(), description: adding.description.trim(), archived: false }])
                  setAdding(null)
                }}
                disabled={!adding.name.trim()}
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-3 gap-1.5 bg-transparent" onClick={() => setAdding(null)}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0 border-b border-border">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">WhatsApp Configurations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage media classification rules and WhatsApp settings</p>
        </div>

        <Tabs defaultValue="media-classes" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto border-b-0 gap-0 w-full justify-start rounded-none">
            {[
              { value: "media-classes",  label: "Media Classes" },
              { value: "modals",         label: "Modals" },
              { value: "templates",      label: "Templates" },
              { value: "auto-replies",   label: "Auto Replies" },
              { value: "integrations",   label: "Integrations" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative px-4 pb-3 pt-1 rounded-none text-sm font-medium bg-transparent border-0 shadow-none",
                  "text-muted-foreground data-[state=active]:text-foreground",
                  "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-foreground data-[state=active]:after:rounded-t-full",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Media Classes tab */}
          <TabsContent value="media-classes" className="mt-0">
            <div className="py-6 space-y-5">
              <FullSection title="Image Classes"    classes={imageClasses}    onUpdate={setImageClasses} />
              <FullSection title="Document Classes" classes={documentClasses} onUpdate={setDocumentClasses} />
              <FullSection title="Sheet Classes"    classes={sheetClasses}    onUpdate={setSheetClasses} />
            </div>
          </TabsContent>

          {/* Modals tab */}
          <TabsContent value="modals" className="mt-0">
            <div className="py-8 px-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Data Pickers</h3>
                <p className="text-xs text-muted-foreground mb-4">Modal dialogs that let users pick and import data from connected sources.</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Upload from WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Placeholder tabs */}
          {["templates", "auto-replies", "integrations"].map((v) => (
            <TabsContent key={v} value={v} className="mt-0">
              <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
                This section is coming soon.
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <UploadFromWhatsAppDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}

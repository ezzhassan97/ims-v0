"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { X, Upload, Copy, Check, ChevronDown, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ConstructionUpdate } from "@/lib/mock-data"

// ── shared data for create drawer ──────────────────────────────────────────
const DEVELOPERS_LIST = [
  { id: "DEV-001", name: "Emaar Misr", logo: "https://api.dicebear.com/7.x/initials/svg?seed=EM&backgroundColor=1d4ed8&fontColor=ffffff" },
  { id: "DEV-002", name: "SODIC",      logo: "https://api.dicebear.com/7.x/initials/svg?seed=SO&backgroundColor=0f766e&fontColor=ffffff" },
  { id: "DEV-003", name: "Palm Hills", logo: "https://api.dicebear.com/7.x/initials/svg?seed=PH&backgroundColor=7c3aed&fontColor=ffffff" },
  { id: "DEV-004", name: "Mountain View", logo: "https://api.dicebear.com/7.x/initials/svg?seed=MV&backgroundColor=b45309&fontColor=ffffff" },
]

const PROJECTS_LIST = [
  { id: "PRJ-1001", name: "Marassi Phase 2", parentName: "Marassi",           developerId: "DEV-001" },
  { id: "PRJ-1004", name: "Uptown Cairo",                                      developerId: "DEV-001" },
  { id: "PRJ-1002", name: "Eastown",                                            developerId: "DEV-002" },
  { id: "PRJ-1005", name: "SODIC West",                                         developerId: "DEV-002" },
  { id: "PRJ-1003", name: "Badya Phase 1",    parentName: "Badya",             developerId: "DEV-003" },
  { id: "PRJ-1006", name: "Palm Hills October",                                 developerId: "DEV-003" },
  { id: "PRJ-1007", name: "Mountain View iCity",                                developerId: "DEV-004" },
  { id: "PRJ-1008", name: "Mountain View Hyde Park",                            developerId: "DEV-004" },
]

// Searchable dropdown for developer / project selection
function SearchableSelect({
  placeholder,
  options,
  value,
  onChange,
  renderOption,
  renderSelected,
  disabled,
}: {
  placeholder: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  renderOption?: (opt: { id: string; label: string }) => React.ReactNode
  renderSelected?: (opt: { id: string; label: string }) => React.ReactNode
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((o) => o.id === value)
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm transition-colors",
          "hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          open && "ring-2 ring-ring",
        )}
      >
        <span className={cn("flex-1 text-left truncate", !selected && "text-muted-foreground")}>
          {selected ? (renderSelected ? renderSelected({ id: selected.id, label: selected.label }) : selected.label) : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQuery("") }} />
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/40 rounded-md outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No results</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); setQuery("") }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                      value === opt.id && "bg-primary/5 text-primary font-medium",
                    )}
                  >
                    {renderOption ? renderOption(opt) : opt.label}
                    {value === opt.id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  "Pending Review":   { label: "Pending Review",   className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  "Rejected":         { label: "Rejected",          className: "border-red-200 bg-red-50 text-red-700" },
  "Approved Listing": { label: "Approved Listing",  className: "border-green-200 bg-green-50 text-green-700" },
  "Listed":           { label: "Listed",             className: "border-blue-200 bg-blue-50 text-blue-700" },
}

const CHANGEABLE_STATUSES: Array<ConstructionUpdate["status"]> = ["Pending Review", "Rejected", "Approved Listing"]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-secondary transition-colors flex-shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  )
}

interface ConstructionUpdateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: ConstructionUpdate | null
  onSave?: (update: ConstructionUpdate) => void
  onStatusChange?: (newStatus: ConstructionUpdate["status"]) => void
}

export function ConstructionUpdateDrawer({ open, onOpenChange, update, onSave, onStatusChange }: ConstructionUpdateDrawerProps) {
  const [titleEn, setTitleEn] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")
  const [media, setMedia] = useState<Array<{ id: string; url: string; type: "image" | "video"; thumbnail?: string }>>([])
  const [showApproveDialog, setShowApproveDialog] = useState(false)

  const isReadOnly = update?.status === "Approved Listing" || update?.status === "Listed"
  const cfg = update ? STATUS_CONFIG[update.status] : null

  useEffect(() => {
    if (update) {
      setTitleEn(update.titleEn)
      setTitleAr(update.titleAr)
      setDescriptionEn(update.descriptionEn)
      setDescriptionAr(update.descriptionAr)
      setMedia(update.media)
    }
  }, [update, open])

  const handleSave = () => {
    if (update && onSave) {
      onSave({ ...update, titleEn, titleAr, descriptionEn, descriptionAr, media, updatedAt: new Date() })
      onOpenChange(false)
    }
  }

  const handleStatusSelect = (newStatus: ConstructionUpdate["status"]) => {
    if (newStatus === "Approved Listing") {
      setShowApproveDialog(true)
    } else {
      onStatusChange?.(newStatus)
    }
  }

  const confirmApprove = () => {
    onStatusChange?.("Approved Listing")
    setShowApproveDialog(false)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-[500px] !max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          {/* Sticky header */}
          <SheetHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex-shrink-0">
            <SheetTitle>Construction Update</SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Developer + Project */}
            {update && (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2.5">
                  {update.developerLogo && (
                    <img
                      src={update.developerLogo}
                      alt={update.developerName}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Developer</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-foreground truncate">{update.developerName}</span>
                      <span className="text-xs text-muted-foreground font-mono ml-1">{update.developerId}</span>
                      <CopyButton value={update.developerId} />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 pt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Project</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {update.parentProjectName ? (
                        <><span className="text-muted-foreground">{update.parentProjectName}</span> — {update.projectName}</>
                      ) : update.projectName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono ml-1">{update.projectId}</span>
                    <CopyButton value={update.projectId} />
                  </div>
                </div>
              </div>
            )}

            {/* IDs row */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">Collection ID</span>
                <code className="font-mono text-sm flex-1">{update?.collectionId}</code>
                {update?.collectionId && <CopyButton value={update.collectionId} />}
              </div>
              {update?.listingId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 flex-shrink-0">Listing ID</span>
                  <code className="font-mono text-sm flex-1">{update.listingId}</code>
                  <CopyButton value={update.listingId} />
                </div>
              )}
            </div>

            {/* Status */}
            {update && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                {update.status === "Listed" ? (
                  <Badge variant="outline" className={cn("text-xs", cfg?.className)}>{cfg?.label}</Badge>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity", cfg?.className)}>
                        {cfg?.label}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs">Change status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {CHANGEABLE_STATUSES.map((s) => {
                        const c = STATUS_CONFIG[s]
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusSelect(s)}
                            className={cn(
                              "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors text-left",
                              update.status === s && "font-medium"
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full border flex-shrink-0", c.className)} />
                            {c.label}
                            {update.status === s && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                          </button>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Title EN */}
            <div className="space-y-2">
              <Label htmlFor="titleEn">Title (EN)</Label>
              <Input id="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Type..." disabled={isReadOnly} />
            </div>

            {/* Title AR */}
            <div className="space-y-2">
              <Label htmlFor="titleAr">Title (AR)</Label>
              <Input id="titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="Type..." disabled={isReadOnly} dir="rtl" />
            </div>

            {/* Description EN */}
            <div className="space-y-2">
              <Label htmlFor="descriptionEn">Description (EN)</Label>
              <Textarea id="descriptionEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Type..." disabled={isReadOnly} rows={4} className="resize-none" />
            </div>

            {/* Description AR */}
            <div className="space-y-2">
              <Label htmlFor="descriptionAr">Description (AR)</Label>
              <Textarea id="descriptionAr" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder="Type..." disabled={isReadOnly} dir="rtl" rows={4} className="resize-none" />
            </div>

            {/* Upload zone */}
            {!isReadOnly && (
              <div className="space-y-3">
                <Label>Upload Videos or Images</Label>
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:bg-secondary/30 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Browse or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or MP4 (maximum size 100MB)</p>
                </div>
              </div>
            )}

            {/* Media grid */}
            {media.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isReadOnly ? "Media" : "New Media (Drag to reorder)"} ({media.length})
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {media.map((m, idx) => (
                    <div key={m.id} className="relative group">
                      <div className="aspect-square rounded-lg bg-secondary/50 border border-border overflow-hidden flex items-center justify-center">
                        <span className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {m.type === "image" ? (
                          <img src={m.thumbnail || m.url} alt="Media" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <div className="text-xs text-muted-foreground text-center p-2">Video</div>
                        )}
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          {!isReadOnly && (
            <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve confirmation dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve for Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This construction update{update ? ` "${update.titleEn}"` : ""} will be published to{" "}
              <strong>Nawy Listing</strong> and <strong>E-realty</strong> platforms. Are you sure you want to publish it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>Yes, Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Create drawer ────────────────────────────────────────────────────────────

interface CreateConstructionUpdateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate?: (update: ConstructionUpdate) => void
}

export function CreateConstructionUpdateDrawer({ open, onOpenChange, onCreate }: CreateConstructionUpdateDrawerProps) {
  const [developerId, setDeveloperId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")
  const [media, setMedia] = useState<Array<{ id: string; url: string; type: "image" | "video"; thumbnail?: string }>>([])

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setDeveloperId(""); setProjectId(""); setTitleEn(""); setTitleAr("")
      setDescriptionEn(""); setDescriptionAr(""); setMedia([])
    }
  }, [open])

  // When developer changes, clear project if it no longer belongs to that developer
  const handleDeveloperChange = (id: string) => {
    setDeveloperId(id)
    const proj = PROJECTS_LIST.find((p) => p.id === projectId)
    if (proj && proj.developerId !== id) setProjectId("")
  }

  const availableProjects = developerId
    ? PROJECTS_LIST.filter((p) => p.developerId === developerId)
    : PROJECTS_LIST

  const selectedDev = DEVELOPERS_LIST.find((d) => d.id === developerId)
  const selectedProj = PROJECTS_LIST.find((p) => p.id === projectId)

  const isValid = developerId && projectId && titleEn.trim()

  const handleCreate = () => {
    if (!isValid || !selectedDev || !selectedProj) return
    const newUpdate: ConstructionUpdate = {
      id: `cu-new-${Date.now()}`,
      collectionId: `COL-NEW-${Date.now()}`,
      titleEn: titleEn.trim(),
      titleAr: titleAr.trim(),
      descriptionEn: descriptionEn.trim(),
      descriptionAr: descriptionAr.trim(),
      media,
      status: "Pending Review",
      createdAt: new Date(),
      updatedAt: new Date(),
      developerId: selectedDev.id,
      developerName: selectedDev.name,
      developerLogo: selectedDev.logo,
      projectId: selectedProj.id,
      projectName: selectedProj.name,
      parentProjectName: selectedProj.parentName,
    }
    onCreate?.(newUpdate)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!w-[500px] !max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex-shrink-0">
          <SheetTitle>Add Construction Update</SheetTitle>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Developer */}
          <div className="space-y-2">
            <Label>
              Developer <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              placeholder="Select developer..."
              value={developerId}
              onChange={handleDeveloperChange}
              options={DEVELOPERS_LIST.map((d) => ({ id: d.id, label: d.name }))}
              renderOption={(opt) => {
                const dev = DEVELOPERS_LIST.find((d) => d.id === opt.id)
                return (
                  <div className="flex items-center gap-2.5">
                    {dev?.logo && <img src={dev.logo} alt={dev.name} className="w-6 h-6 rounded-full flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium leading-none">{dev?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{dev?.id}</p>
                    </div>
                  </div>
                )
              }}
              renderSelected={(opt) => {
                const dev = DEVELOPERS_LIST.find((d) => d.id === opt.id)
                return (
                  <div className="flex items-center gap-2">
                    {dev?.logo && <img src={dev.logo} alt={dev.name} className="w-5 h-5 rounded-full flex-shrink-0" />}
                    <span>{dev?.name}</span>
                  </div>
                )
              }}
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>
              Project <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              placeholder={developerId ? "Select project..." : "Select a developer first..."}
              value={projectId}
              onChange={setProjectId}
              disabled={!developerId}
              options={availableProjects.map((p) => ({ id: p.id, label: p.parentName ? `${p.parentName} — ${p.name}` : p.name }))}
              renderOption={(opt) => {
                const proj = PROJECTS_LIST.find((p) => p.id === opt.id)
                return (
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {proj?.parentName ? (
                        <><span className="text-muted-foreground">{proj.parentName}</span> — {proj.name}</>
                      ) : proj?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{proj?.id}</p>
                  </div>
                )
              }}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Title EN */}
          <div className="space-y-2">
            <Label htmlFor="new-titleEn">
              Title (EN) <span className="text-destructive">*</span>
            </Label>
            <Input id="new-titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Enter title in English..." />
          </div>

          {/* Title AR */}
          <div className="space-y-2">
            <Label htmlFor="new-titleAr">Title (AR)</Label>
            <Input id="new-titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="أدخل العنوان بالعربية..." dir="rtl" />
          </div>

          {/* Description EN */}
          <div className="space-y-2">
            <Label htmlFor="new-descEn">Description (EN)</Label>
            <Textarea id="new-descEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Enter description in English..." rows={4} className="resize-none" />
          </div>

          {/* Description AR */}
          <div className="space-y-2">
            <Label htmlFor="new-descAr">Description (AR)</Label>
            <Textarea id="new-descAr" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} placeholder="أدخل الوصف بالعربية..." dir="rtl" rows={4} className="resize-none" />
          </div>

          {/* Upload zone */}
          <div className="space-y-3">
            <Label>Media</Label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:bg-secondary/30 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Browse or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or MP4 (maximum size 100MB)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">Cancel</Button>
            <Button onClick={handleCreate} disabled={!isValid} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

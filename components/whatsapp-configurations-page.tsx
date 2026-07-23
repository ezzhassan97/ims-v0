"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pencil, ArchiveIcon, ArchiveRestore, Plus, Check, X, Upload, FileText, FileImage, FileSpreadsheet, File, Search, Copy, ChevronDown, CalendarIcon, Download, ExternalLink,
  Shapes, Users, PanelsTopLeft, LayoutTemplate, MessageCircle, Plug, Link2, Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterSelect, FilterMultiSelect, IdTag, TabStrip } from "@/components/table-kit"
import { whatsappMediaItems, ALL_DEVELOPERS, ALL_PROJECTS, type WhatsAppMediaItem } from "@/lib/whatsapp-media-mock"
import { WA_CONTACTS, WA_USERS, type WaContact } from "@/lib/wa-contacts-mock"

// ── Types ─────────────────────────────────────────────────────────────────────

const FILE_TYPES = ["Image", "Document", "Sheet"] as const
type FileType = (typeof FILE_TYPES)[number]

/** One class = one ID; it can be linked to multiple file types at the same time. */
interface MediaClass {
  id: string
  name: string
  description: string
  fileTypes: FileType[]
  useCases: string[]
  archived: boolean
  /** Media units linked to this class, per file type */
  linkedUnits: Partial<Record<FileType, number>>
}

const USE_CASES = [
  "Automatic Availability", "Manual Availability", "Unit Images", "Unit Floor Plans",
  "Project Brochures", "Project Gallery", "Project Masterplans", "Projects Floor Plans",
  "Construction Updates", "Market Updates", "Developers Attachments",
]

const FILE_TYPE_TONE: Record<FileType, string> = {
  Image: "border-sky-200 bg-sky-50 text-sky-700",
  Document: "border-rose-200 bg-rose-50 text-rose-700",
  Sheet: "border-emerald-200 bg-emerald-50 text-emerald-700",
}
const FILE_TYPE_ICON: Record<FileType, React.ReactNode> = {
  Image: <FileImage className="h-4 w-4 text-sky-500" />,
  Document: <FileText className="h-4 w-4 text-rose-500" />,
  Sheet: <FileSpreadsheet className="h-4 w-4 text-emerald-500" />,
}

// ── Seed data — classes can span several file types ───────────────────────────

const SEED_CLASSES: MediaClass[] = [
  { id: "MC-001", name: "Brochure", description: "Project or unit marketing brochures", fileTypes: ["Image", "Document"], useCases: ["Project Brochures", "Developers Attachments"], archived: false, linkedUnits: { Image: 142, Document: 96 } },
  { id: "MC-002", name: "Render", description: "Architectural renders and 3D visualisations", fileTypes: ["Image"], useCases: ["Unit Images", "Project Gallery"], archived: false, linkedUnits: { Image: 318 } },
  { id: "MC-003", name: "Floor Plan", description: "Unit and building floor plan layouts", fileTypes: ["Image", "Document"], useCases: ["Unit Floor Plans", "Projects Floor Plans"], archived: false, linkedUnits: { Image: 207, Document: 41 } },
  { id: "MC-004", name: "Construction Photo", description: "On-site progress photography", fileTypes: ["Image"], useCases: ["Construction Updates"], archived: false, linkedUnits: { Image: 88 } },
  { id: "MC-005", name: "Launch Fact Sheet", description: "Key project facts distributed at launch events", fileTypes: ["Document"], useCases: ["Market Updates"], archived: false, linkedUnits: { Document: 27 } },
  { id: "MC-006", name: "Payment Plan", description: "Instalment schedule and payment terms", fileTypes: ["Document", "Sheet"], useCases: ["Developers Attachments"], archived: false, linkedUnits: { Document: 63, Sheet: 35 } },
  { id: "MC-007", name: "Legal Document", description: "Contracts, title deeds, and legal notices", fileTypes: ["Document"], useCases: ["Developers Attachments"], archived: false, linkedUnits: { Document: 19 } },
  { id: "MC-008", name: "EOI Form", description: "Expression of interest registration forms", fileTypes: ["Document"], useCases: ["Manual Availability"], archived: false, linkedUnits: { Document: 12 } },
  { id: "MC-009", name: "Availability Sheet", description: "Unit availability with pricing and status", fileTypes: ["Sheet"], useCases: ["Automatic Availability", "Manual Availability"], archived: false, linkedUnits: { Sheet: 154 } },
  { id: "MC-010", name: "Construction Update", description: "Periodic construction milestone reports", fileTypes: ["Sheet", "Image"], useCases: ["Construction Updates", "Market Updates"], archived: false, linkedUnits: { Sheet: 44, Image: 23 } },
  { id: "MC-011", name: "Comparison Sheet", description: "Side-by-side project or unit comparison", fileTypes: ["Sheet"], useCases: ["Market Updates"], archived: false, linkedUnits: { Sheet: 9 } },
  { id: "MC-012", name: "Old Price List", description: "Deprecated pricing sheets from before 2024", fileTypes: ["Sheet"], useCases: ["Manual Availability"], archived: true, linkedUnits: { Sheet: 71 } },
]

// ── Media Classes tab ─────────────────────────────────────────────────────────

/** Small rectangular chip for a use case. */
function UseCaseChip({ value }: { value: string }) {
  return <span className="inline-flex items-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{value}</span>
}

function FileTypeTag({ t }: { t: FileType }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium", FILE_TYPE_TONE[t])}>{t}</span>
}

/** Create / edit a class — one class links to multiple file types + use cases. */
function ClassDialog({ initial, onClose, onSave }: {
  initial?: MediaClass
  onClose: () => void
  onSave: (draft: Pick<MediaClass, "name" | "description" | "fileTypes" | "useCases">) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [fileTypes, setFileTypes] = useState<FileType[]>(initial?.fileTypes ?? [])
  const [useCases, setUseCases] = useState<string[]>(initial?.useCases ?? [])
  const toggleType = (t: FileType) => setFileTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  const canSave = name.trim() !== "" && fileTypes.length > 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        {initial && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{initial.name}</span> <IdTag value={initial.id} />
          </p>
        )}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Name<span className="ml-0.5 text-red-500">*</span></div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brochure" className="h-9 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Description</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" rows={2} className="resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">File Types<span className="ml-0.5 text-red-500">*</span> <span className="font-normal text-muted-foreground">· the class is available under every selected type</span></div>
            <div className="flex gap-2">
              {FILE_TYPES.map((t) => (
                <label key={t} className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 transition-colors",
                  fileTypes.includes(t) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
                )}>
                  <Checkbox checked={fileTypes.includes(t)} onCheckedChange={() => toggleType(t)} className="h-4 w-4" />
                  {FILE_TYPE_ICON[t]}
                  <span className="text-sm">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Use Cases</div>
            <FilterMultiSelect label="Select use cases" options={USE_CASES} value={useCases} onChange={setUseCases} className="w-full" width="w-full" />
            {useCases.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {useCases.map((u) => (
                  <span key={u} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {u}
                    <button type="button" className="text-blue-500 hover:text-blue-800" onClick={() => setUseCases((prev) => prev.filter((x) => x !== u))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave({ name: name.trim(), description: description.trim(), fileTypes, useCases })}>
            {initial ? "Save Changes" : "Create Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ArchiveConfirmDialog({ cls, onClose, onConfirm }: { cls: MediaClass; onClose: () => void; onConfirm: () => void }) {
  const totalLinked = Object.values(cls.linkedUnits).reduce((s, n) => s + (n ?? 0), 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Archive Class</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{cls.name}</span> <IdTag value={cls.id} /> will be archived and no longer used for media classification.
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-4 text-amber-800">
          {totalLinked > 0
            ? <>It currently has <span className="font-semibold">{totalLinked}</span> linked unit{totalLinked !== 1 ? "s" : ""} across {cls.fileTypes.join(", ")} — they keep their classification.</>
            : <>It has no linked units.</>}{" "}
          You can restore it anytime from Archived Classes.
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}><ArchiveIcon className="mr-1.5 h-3.5 w-3.5" />Archive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Side drawer of archived classes — click Restore to bring one back. */
function ArchivedDrawer({ open, classes, onClose, onRestore }: {
  open: boolean
  classes: MediaClass[]
  onClose: () => void
  onRestore: (id: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="flex w-[420px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <SheetTitle>Archived Classes</SheetTitle>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{classes.length}</span>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {classes.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">No archived classes.</p>
          ) : (
            classes.map((cls, i) => (
              <div key={cls.id} className={cn("flex items-center gap-3 px-5 py-3", i > 0 && "border-t border-border/70")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{cls.name}</p>
                    <IdTag value={cls.id} />
                  </div>
                  {cls.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{cls.description}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1">{cls.fileTypes.map((t) => <FileTypeTag key={t} t={t} />)}</div>
                </div>
                <Button variant="outline" size="sm" className="h-7 flex-shrink-0 gap-1.5 px-2.5 text-xs" onClick={() => onRestore(cls.id)}>
                  <ArchiveRestore className="h-3.5 w-3.5" />Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MediaClassesTab({ classes, onChange }: { classes: MediaClass[]; onChange: (next: MediaClass[]) => void }) {
  const [dlg, setDlg] = useState<{ cls?: MediaClass } | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<MediaClass | null>(null)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const active = classes.filter((c) => !c.archived)
  const archived = classes.filter((c) => c.archived)

  const saveClass = (draft: Pick<MediaClass, "name" | "description" | "fileTypes" | "useCases">) => {
    if (dlg?.cls) {
      onChange(classes.map((c) => (c.id === dlg.cls!.id ? { ...c, ...draft } : c)))
      toast.success(`${draft.name} updated`)
    } else {
      const nextNum = Math.max(0, ...classes.map((c) => Number(c.id.slice(3)))) + 1
      onChange([...classes, { id: `MC-${String(nextNum).padStart(3, "0")}`, ...draft, archived: false, linkedUnits: {} }])
      toast.success(`${draft.name} created`)
    }
    setDlg(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">One class, one ID — linked to multiple file types at the same time; it appears under every type it covers.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setArchivedOpen(true)}>
            <ArchiveIcon className="h-3.5 w-3.5" />Archived Classes
            {archived.length > 0 && <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-medium text-blue-700">{archived.length}</span>}
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDlg({})}>
            <Plus className="h-3.5 w-3.5" />Add Class
          </Button>
        </div>
      </div>

      {FILE_TYPES.map((ft) => {
        const list = active.filter((c) => c.fileTypes.includes(ft))
        return (
          <div key={ft} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-3.5">
              {FILE_TYPE_ICON[ft]}
              <h3 className="text-sm font-semibold text-foreground">{ft} Classes</h3>
              <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{list.length}</span>
            </div>
            {list.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No classes linked to {ft} yet.</p>
            ) : (
              list.map((cls, i) => (
                <div key={cls.id} className={cn("flex items-start gap-3 px-5 py-3", i > 0 && "border-t border-border/70")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{cls.name}</p>
                      <IdTag value={cls.id} />
                    </div>
                    {cls.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{cls.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {cls.fileTypes.map((t) => <FileTypeTag key={t} t={t} />)}
                      {cls.useCases.length > 0 && <span className="mx-0.5 text-border">|</span>}
                      {cls.useCases.map((u) => <UseCaseChip key={u} value={u} />)}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {/* Units linked to this class under THIS file type */}
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{cls.linkedUnits[ft] ?? 0}</span> linked units
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => setDlg({ cls })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" title="Archive" onClick={() => setArchiveTarget(cls)}>
                        <ArchiveIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      })}

      {dlg && <ClassDialog initial={dlg.cls} onClose={() => setDlg(null)} onSave={saveClass} />}
      {archiveTarget && (
        <ArchiveConfirmDialog
          cls={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => {
            onChange(classes.map((c) => (c.id === archiveTarget.id ? { ...c, archived: true } : c)))
            toast.success(`${archiveTarget.name} archived — restore it from Archived Classes`)
            setArchiveTarget(null)
          }}
        />
      )}
      <ArchivedDrawer
        open={archivedOpen}
        classes={archived}
        onClose={() => setArchivedOpen(false)}
        onRestore={(id) => {
          const cls = classes.find((c) => c.id === id)
          onChange(classes.map((c) => (c.id === id ? { ...c, archived: false } : c)))
          toast.success(`${cls?.name ?? "Class"} restored`)
        }}
      />
    </div>
  )
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

const ROLE_TONE: Record<WaContact["role"], string> = {
  Admin: "border-blue-200 bg-blue-100 text-blue-700",
  Member: "border-border bg-muted text-muted-foreground",
}

function ContactDialog({ initial, onClose, onSave }: {
  initial?: WaContact
  onClose: () => void
  onSave: (draft: Omit<WaContact, "id">) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "+2 ")
  const [role, setRole] = useState<WaContact["role"]>(initial?.role ?? "Member")
  const canSave = name.trim() !== "" && phone.replace(/\D/g, "").length >= 8
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Pick a user <span className="font-normal text-muted-foreground">· optional — fills the name below</span></div>
            <FilterSelect label="Choose from users…" value={WA_USERS.includes(name) ? name : ""} options={WA_USERS} onChange={(v) => v && setName(v)} searchable className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Name<span className="ml-0.5 text-red-500">*</span> <span className="font-normal text-muted-foreground">· free text</span></div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Phone Number<span className="ml-0.5 text-red-500">*</span> <span className="font-normal text-muted-foreground">· +2 country code by default</span></div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2 010 1234 5678" className="h-9 font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Role</div>
            <div className="flex gap-2">
              {(["Admin", "Member"] as const).map((r) => (
                <button
                  key={r} type="button" onClick={() => setRole(r)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors",
                    role === r ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", ROLE_TONE[r])}>{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave({ name: name.trim(), phone: phone.trim(), role })}>
            {initial ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContactsTab({ contacts, onChange }: { contacts: WaContact[]; onChange: (next: WaContact[]) => void }) {
  const [dlg, setDlg] = useState<{ contact?: WaContact } | null>(null)
  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>These contacts are automatically added to every WhatsApp group created for a new developer — with the role set here.</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Group Contacts</h3>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{contacts.length}</span>
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDlg({})}>
            <Plus className="h-3.5 w-3.5" />Add Contact
          </Button>
        </div>
        {contacts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No contacts yet — click "Add Contact" to create one.</p>
        ) : (
          contacts.map((c, i) => (
            <div key={c.id} className={cn("flex items-center gap-3 px-5 py-3", i > 0 && "border-t border-border/70")}>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <IdTag value={c.id} />
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", ROLE_TONE[c.role])}>{c.role}</span>
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => setDlg({ contact: c })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" title="Remove" onClick={() => { onChange(contacts.filter((x) => x.id !== c.id)); toast.success(`${c.name} removed`) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      {dlg && (
        <ContactDialog
          initial={dlg.contact}
          onClose={() => setDlg(null)}
          onSave={(draft) => {
            if (dlg.contact) {
              onChange(contacts.map((x) => (x.id === dlg.contact!.id ? { ...x, ...draft } : x)))
              toast.success(`${draft.name} updated`)
            } else {
              const nextNum = Math.max(0, ...contacts.map((x) => Number(x.id.slice(3)))) + 1
              onChange([...contacts, { id: `CT-${String(nextNum).padStart(3, "0")}`, ...draft }])
              toast.success(`${draft.name} added`)
            }
            setDlg(null)
          }}
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
  const [classes, setClasses] = useState<MediaClass[]>(SEED_CLASSES)
  const [contacts, setContacts] = useState<WaContact[]>(WA_CONTACTS)
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Configurations</h1>
          <p className="text-sm text-muted-foreground">Manage media classification rules and WhatsApp settings</p>
        </div>

        <Tabs defaultValue="media-classes" className="w-full">
          {/* Grey tab strip with icons — white active tab, like every details page */}
          <TabStrip>
            <TabsList className="w-max">
              {[
                { value: "media-classes", label: "Media Classes", icon: Shapes },
                { value: "contacts", label: "Contacts", icon: Users },
                { value: "modals", label: "Modals", icon: PanelsTopLeft },
                { value: "templates", label: "Templates", icon: LayoutTemplate },
                { value: "auto-replies", label: "Auto Replies", icon: MessageCircle },
                { value: "integrations", label: "Integrations", icon: Plug },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="data-[state=active]:bg-card">
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabStrip>

          <TabsContent value="media-classes" className="mt-4">
            <MediaClassesTab classes={classes} onChange={setClasses} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <ContactsTab contacts={contacts} onChange={setContacts} />
          </TabsContent>

          {/* Modals tab */}
          <TabsContent value="modals" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Data Pickers</h3>
              <p className="mb-4 text-xs text-muted-foreground">Modal dialogs that let users pick and import data from connected sources.</p>
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
          </TabsContent>

          {/* Placeholder tabs */}
          {["templates", "auto-replies", "integrations"].map((v) => (
            <TabsContent key={v} value={v} className="mt-4">
              <div className="flex items-center justify-center rounded-xl border border-border bg-card py-32 text-sm text-muted-foreground">
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

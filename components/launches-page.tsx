"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Archive,
  Copy,
  Check,
  Rocket,
  CheckCircle,
  ListChecks,
  Activity,
  XCircle,
  CalendarIcon,
  GripVertical,
  Pencil,
  X,
  ChevronDown,
  LayoutGrid,
  List,
} from "lucide-react"
import { LaunchDetailsPage } from "@/components/launch-details-page"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingProject {
  id: string
  name: string
}

interface Launch {
  id: string
  developer: { name: string; logo: string; id: string }
  projectNameEn: string
  phase: string
  projectLevel: "Main Compound" | "Phase"
  parentProjectId?: string
  area: string
  approvalStatus: "Pending Review" | "Approved" | "Rejected"
  ingestionStatus: "Ingested" | "Not Ingested"
  listingStatus: "Active" | "Hidden"
  listingProject?: ListingProject
  launchStatus: "Upcoming" | "Active Launch" | "Finished"
  type: "Launch" | "Release"
  source: "WhatsApp" | "Manual"
  listingCompletion: number
  eoiAmount?: number
  coverImage?: string
  createdAt: string
  updatedAt: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AREAS = ["New Cairo", "6th of October", "North Coast", "New Capital", "Sheikh Zayed", "Maadi", "Zamalek", "Heliopolis"]

const mockLaunches: Launch[] = [
  {
    id: "LCH-001",
    developer: { name: "Palm Hills Development", logo: "/placeholder.svg?height=32&width=32", id: "DEV-001" },
    projectNameEn: "Palm Hills October",
    phase: "Phase 1",
    projectLevel: "Main Compound",
    area: "6th of October",
    approvalStatus: "Approved",
    ingestionStatus: "Ingested",
    listingStatus: "Active",
    listingProject: { id: "LST-001", name: "Palm Hills October" },
    launchStatus: "Active Launch",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 85,
    eoiAmount: 50000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-10T09:00:00",
    updatedAt: "2024-01-15T14:30:00",
  },
  {
    id: "LCH-002",
    developer: { name: "Emaar Misr", logo: "/placeholder.svg?height=32&width=32", id: "DEV-002" },
    projectNameEn: "Marassi North Coast",
    phase: "Phase 2",
    projectLevel: "Phase",
    parentProjectId: "Marassi",
    area: "North Coast",
    approvalStatus: "Pending Review",
    ingestionStatus: "Not Ingested",
    listingStatus: "Hidden",
    launchStatus: "Upcoming",
    type: "Release",
    source: "Manual",
    listingCompletion: 45,
    eoiAmount: 75000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-12T11:00:00",
    updatedAt: "2024-01-14T16:45:00",
  },
  {
    id: "LCH-003",
    developer: { name: "Sodic", logo: "/placeholder.svg?height=32&width=32", id: "DEV-003" },
    projectNameEn: "Sodic East",
    phase: "Phase 3",
    projectLevel: "Main Compound",
    area: "New Cairo",
    approvalStatus: "Approved",
    ingestionStatus: "Ingested",
    listingStatus: "Active",
    listingProject: { id: "LST-003", name: "Sodic East" },
    launchStatus: "Active Launch",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 100,
    eoiAmount: 60000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-08T08:00:00",
    updatedAt: "2024-01-16T10:00:00",
  },
  {
    id: "LCH-004",
    developer: { name: "Mountain View", logo: "/placeholder.svg?height=32&width=32", id: "DEV-004" },
    projectNameEn: "Mountain View iCity",
    phase: "Phase 1",
    projectLevel: "Phase",
    parentProjectId: "Mountain View iCity Master",
    area: "New Cairo",
    approvalStatus: "Rejected",
    ingestionStatus: "Not Ingested",
    listingStatus: "Hidden",
    launchStatus: "Upcoming",
    type: "Release",
    source: "Manual",
    listingCompletion: 0,
    eoiAmount: 40000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-05T14:00:00",
    updatedAt: "2024-01-05T14:00:00",
  },
  {
    id: "LCH-005",
    developer: { name: "Ora Developers", logo: "/placeholder.svg?height=32&width=32", id: "DEV-005" },
    projectNameEn: "ZED East",
    phase: "Phase A",
    projectLevel: "Main Compound",
    area: "New Cairo",
    approvalStatus: "Approved",
    ingestionStatus: "Ingested",
    listingStatus: "Hidden",
    listingProject: { id: "LST-005", name: "ZED East" },
    launchStatus: "Finished",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 100,
    eoiAmount: 90000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2023-12-20T07:30:00",
    updatedAt: "2024-01-10T12:00:00",
  },
  {
    id: "LCH-006",
    developer: { name: "Hyde Park", logo: "/placeholder.svg?height=32&width=32", id: "DEV-006" },
    projectNameEn: "Hyde Park New Cairo",
    phase: "Phase 2",
    projectLevel: "Main Compound",
    area: "New Cairo",
    approvalStatus: "Pending Review",
    ingestionStatus: "Not Ingested",
    listingStatus: "Hidden",
    launchStatus: "Upcoming",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 60,
    eoiAmount: 55000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-14T10:00:00",
    updatedAt: "2024-01-16T09:30:00",
  },
  {
    id: "LCH-007",
    developer: { name: "Tatweer Misr", logo: "/placeholder.svg?height=32&width=32", id: "DEV-007" },
    projectNameEn: "Il Monte Galala",
    phase: "Phase 1",
    projectLevel: "Main Compound",
    area: "North Coast",
    approvalStatus: "Approved",
    ingestionStatus: "Ingested",
    listingStatus: "Active",
    listingProject: { id: "LST-007", name: "Il Monte Galala" },
    launchStatus: "Active Launch",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 78,
    eoiAmount: 120000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-03T09:00:00",
    updatedAt: "2024-01-17T11:00:00",
  },
  {
    id: "LCH-008",
    developer: { name: "Palm Hills Development", logo: "/placeholder.svg?height=32&width=32", id: "DEV-001" },
    projectNameEn: "Palm Hills New Cairo",
    phase: "Phase 5",
    projectLevel: "Phase",
    parentProjectId: "Palm Hills New Cairo Master",
    area: "New Cairo",
    approvalStatus: "Approved",
    ingestionStatus: "Ingested",
    listingStatus: "Active",
    listingProject: { id: "LST-008", name: "Palm Hills New Cairo" },
    launchStatus: "Active Launch",
    type: "Release",
    source: "Manual",
    listingCompletion: 92,
    eoiAmount: 65000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-09T08:30:00",
    updatedAt: "2024-01-18T14:00:00",
  },
  {
    id: "LCH-009",
    developer: { name: "Emaar Misr", logo: "/placeholder.svg?height=32&width=32", id: "DEV-002" },
    projectNameEn: "Mivida New Cairo",
    phase: "Phase 3",
    projectLevel: "Main Compound",
    area: "New Cairo",
    approvalStatus: "Rejected",
    ingestionStatus: "Not Ingested",
    listingStatus: "Hidden",
    launchStatus: "Upcoming",
    type: "Launch",
    source: "Manual",
    listingCompletion: 20,
    eoiAmount: 45000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-06T13:00:00",
    updatedAt: "2024-01-11T10:00:00",
  },
  {
    id: "LCH-010",
    developer: { name: "Sodic", logo: "/placeholder.svg?height=32&width=32", id: "DEV-003" },
    projectNameEn: "VYE Sheikh Zayed",
    phase: "Phase 2",
    projectLevel: "Phase",
    parentProjectId: "VYE",
    area: "Sheikh Zayed",
    approvalStatus: "Pending Review",
    ingestionStatus: "Not Ingested",
    listingStatus: "Hidden",
    launchStatus: "Upcoming",
    type: "Launch",
    source: "WhatsApp",
    listingCompletion: 35,
    eoiAmount: 80000,
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: "2024-01-17T09:00:00",
    updatedAt: "2024-01-19T15:00:00",
  },
]

const DEVELOPERS = [...new Set(mockLaunches.map((l) => l.developer.name))]

const EMPTY_FORM: Omit<Launch, "id" | "createdAt" | "updatedAt"> = {
  developer: { name: "", logo: "/placeholder.svg?height=32&width=32", id: "" },
  projectNameEn: "",
  phase: "",
  projectLevel: "Main Compound",
  area: "",
  approvalStatus: "Pending Review",
  ingestionStatus: "Not Ingested",
  listingStatus: "Hidden",
  launchStatus: "Upcoming",
  type: "Launch",
  source: "Manual",
  listingCompletion: 0,
  eoiAmount: 0,
  coverImage: "/placeholder.svg?height=200&width=300",
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function ApprovalBadge({ status }: { status: Launch["approvalStatus"] }) {
  const map = {
    "Approved": "bg-green-100 text-green-700",
    "Pending Review": "bg-yellow-100 text-yellow-700",
    "Rejected": "bg-red-100 text-red-700",
  }
  return <Badge className={cn("hover:opacity-90", map[status])}>{status}</Badge>
}

function IngestionBadge({ status }: { status: Launch["ingestionStatus"] }) {
  const map = {
    "Ingested": "bg-green-100 text-green-700",
    "Not Ingested": "bg-gray-100 text-gray-600",
  }
  return <Badge className={cn("hover:opacity-90", map[status])}>{status}</Badge>
}

function ListingStatusBadge({ status }: { status: Launch["listingStatus"] }) {
  const map = {
    "Active": "bg-emerald-100 text-emerald-700",
    "Hidden": "bg-gray-100 text-gray-600",
  }
  return <Badge className={cn("hover:opacity-90", map[status])}>{status}</Badge>
}

function LaunchStatusBadge({ status }: { status: Launch["launchStatus"] }) {
  const map = {
    "Active Launch": "bg-emerald-100 text-emerald-700",
    "Upcoming": "bg-blue-100 text-blue-700",
    "Finished": "bg-purple-100 text-purple-700",
  }
  return <Badge className={cn("hover:opacity-90", map[status])}>{status}</Badge>
}

function SourceBadge({ source }: { source: Launch["source"] }) {
  return source === "WhatsApp"
    ? <Badge className="bg-green-100 text-green-700 hover:opacity-90">WhatsApp</Badge>
    : <Badge className="bg-gray-100 text-gray-600 hover:opacity-90">Manual</Badge>
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  })
}

// ─── Inline editable cell ──────────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  type = "text",
  options,
}: {
  value: string
  onSave: (v: string) => void
  type?: "text" | "select"
  options?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing && type === "select" && options) {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="border border-border rounded px-1 py-0.5 text-sm bg-background"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false) }
          if (e.key === "Escape") setEditing(false)
        }}
        className="border border-border rounded px-1 py-0.5 text-sm bg-background w-full min-w-[80px]"
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className="cursor-pointer hover:bg-secondary/60 px-1 py-0.5 rounded flex items-center gap-1 group"
    >
      {value || <span className="text-muted-foreground italic text-xs">—</span>}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </span>
  )
}

// ─── Create / Edit dialog ──────────────────────────────────────────────────────

function LaunchFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Partial<Launch> | null
  onSave: (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => void
}) {
  const [form, setForm] = useState<Omit<Launch, "id" | "createdAt" | "updatedAt">>(
    initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM }
  )

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isEdit = !!initial?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Launch" : "Create Launch"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Developer */}
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <select
              value={form.developer.name}
              onChange={(e) => set("developer", { name: e.target.value, logo: "/placeholder.svg?height=32&width=32", id: `DEV-${e.target.value.slice(0, 3).toUpperCase()}` })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select developer…</option>
              {DEVELOPERS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Project Level */}
          <div className="space-y-1.5">
            <Label>Project Level</Label>
            <select
              value={form.projectLevel}
              onChange={(e) => set("projectLevel", e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="Main Compound">Main Compound</option>
              <option value="Phase">Phase</option>
            </select>
          </div>

          {/* Project Name */}
          <div className="space-y-1.5">
            <Label>Project Name</Label>
            {form.projectLevel === "Phase" ? (
              <select
                value={form.projectNameEn}
                onChange={(e) => set("projectNameEn", e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select project…</option>
                {mockLaunches.filter((l) => l.projectLevel === "Main Compound").map((l) => (
                  <option key={l.id} value={l.projectNameEn}>{l.projectNameEn}</option>
                ))}
              </select>
            ) : (
              <Input value={form.projectNameEn} onChange={(e) => set("projectNameEn", e.target.value)} placeholder="Project name" />
            )}
          </div>

          {/* Phase */}
          <div className="space-y-1.5">
            <Label>Phase</Label>
            <Input value={form.phase} onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Phase 1" />
          </div>

          {/* Area */}
          <div className="space-y-1.5">
            <Label>Area</Label>
            <select
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select area…</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as Launch["type"])}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="Launch">Launch</option>
              <option value="Release">Release</option>
            </select>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false) }}>
            {isEdit ? "Save Changes" : "Create Launch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Archive confirmation dialog ───────────────────────────────────────────────

function ArchiveDialog({ open, onOpenChange, onConfirm, launchId }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  launchId: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Launch</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive <strong>{launchId}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Launch card (grid view) ───────────────────────────────────────────────────

function LaunchCard({
  launch,
  index,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  launch: Launch
  index: number
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (i: number) => void
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e) }}
      onDrop={() => onDrop(index)}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="relative h-40 bg-secondary">
        <img
          src={launch.coverImage || "/placeholder.svg"}
          alt={launch.projectNameEn}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <LaunchStatusBadge status={launch.launchStatus} />
        </div>
        <div className="absolute top-2 right-2">
          <GripVertical className="h-4 w-4 text-white drop-shadow" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <img src={launch.developer.logo} alt={launch.developer.name} className="h-6 w-6 rounded object-cover bg-secondary" />
          <span className="text-xs text-muted-foreground">{launch.developer.name}</span>
        </div>
        <h3 className="font-semibold text-sm leading-tight">{launch.projectNameEn}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">{launch.projectLevel === "Main Compound" ? "Main Project" : "Phase"}</Badge>
          {launch.eoiAmount ? (
            <span className="text-xs text-muted-foreground">EOI: {launch.eoiAmount.toLocaleString()} EGP</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LaunchesPage() {
  const [launches, setLaunches] = useState<Launch[]>(mockLaunches)
  const [searchId, setSearchId] = useState("")
  const [searchProject, setSearchProject] = useState("")
  const [developerFilter, setDeveloperFilter] = useState<string>("all")
  const [launchStatusFilter, setLaunchStatusFilter] = useState<string>("all")
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("all")
  const [ingestionStatusFilter, setIngestionStatusFilter] = useState<string>("all")
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [viewingLaunch, setViewingLaunch] = useState<Launch | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLaunch, setEditingLaunch] = useState<Launch | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Launch | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const lastSelectedIndex = useRef<number | null>(null)

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = launches.filter((l) => {
    if (searchId && !l.id.toLowerCase().includes(searchId.toLowerCase())) return false
    if (searchProject && !l.projectNameEn.toLowerCase().includes(searchProject.toLowerCase())) return false
    if (developerFilter !== "all" && l.developer.name !== developerFilter) return false
    if (launchStatusFilter !== "all" && l.launchStatus !== launchStatusFilter) return false
    if (approvalStatusFilter !== "all" && l.approvalStatus !== approvalStatusFilter) return false
    if (ingestionStatusFilter !== "all" && l.ingestionStatus !== ingestionStatusFilter) return false
    if (listingStatusFilter !== "all" && l.listingStatus !== listingStatusFilter) return false
    if (createdFrom && new Date(l.createdAt) < new Date(createdFrom)) return false
    if (createdTo && new Date(l.createdAt) > new Date(createdTo + "T23:59:59")) return false
    return true
  })

  const listed = launches.filter((l) => l.listingStatus === "Active")
  const active = launches.filter((l) => l.launchStatus === "Active Launch")

  const stats = {
    total: filtered.length,
    approved: filtered.filter((l) => l.approvalStatus === "Approved").length,
    listed: filtered.filter((l) => l.listingStatus === "Active").length,
    active: filtered.filter((l) => l.launchStatus === "Active Launch").length,
    upcoming: filtered.filter((l) => l.launchStatus === "Upcoming").length,
  }

  // ── Clipboard ──────────────────────────────────────────────────────────────

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string, idx: number, shift: boolean) => {
    if (shift && lastSelectedIndex.current !== null) {
      const lo = Math.min(lastSelectedIndex.current, idx)
      const hi = Math.max(lastSelectedIndex.current, idx)
      const range = filtered.slice(lo, hi + 1).map((l) => l.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...range])))
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
      lastSelectedIndex.current = idx
    }
  }

  const selectAll = (checked: boolean) =>
    setSelectedIds(checked ? filtered.map((l) => l.id) : [])

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const updateField = (id: string, patch: Partial<Launch>) =>
    setLaunches((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l)))

  const handleCreate = (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString()
    setLaunches((prev) => [
      { ...data, id: `LCH-${String(prev.length + 1).padStart(3, "0")}`, createdAt: now, updatedAt: now },
      ...prev,
    ])
  }

  const handleEdit = (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => {
    if (!editingLaunch) return
    updateField(editingLaunch.id, data)
    setEditingLaunch(null)
  }

  const handleArchive = () => {
    if (!archiveTarget) return
    setLaunches((prev) => prev.filter((l) => l.id !== archiveTarget.id))
    setSelectedIds((prev) => prev.filter((id) => id !== archiveTarget.id))
    setArchiveTarget(null)
  }

  // ── Bulk ───────────────────────────────────────────────────────────────────

  const bulkSetApproval = (status: Launch["approvalStatus"]) => {
    setLaunches((prev) =>
      prev.map((l) => selectedIds.includes(l.id) ? { ...l, approvalStatus: status, updatedAt: new Date().toISOString() } : l)
    )
  }

  const bulkSetListing = (status: Launch["listingStatus"]) => {
    setLaunches((prev) =>
      prev.map((l) => selectedIds.includes(l.id) ? { ...l, listingStatus: status, updatedAt: new Date().toISOString() } : l)
    )
  }

  const bulkExport = () => {
    const rows = launches.filter((l) => selectedIds.includes(l.id))
    const csv = [
      ["ID", "Developer", "Project", "Area", "Approval", "Listing", "Status"].join(","),
      ...rows.map((l) => [l.id, l.developer.name, l.projectNameEn, l.area, l.approvalStatus, l.listingStatus, l.launchStatus].join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "launches.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Drag & drop for card views ─────────────────────────────────────────────

  const handleDrop = useCallback((arr: Launch[], setArr: (a: Launch[]) => void, from: number, to: number) => {
    const copy = [...arr]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    setArr(copy)
    setDragFrom(null)
  }, [])

  const [listedOrder, setListedOrder] = useState<Launch[]>(listed)
  const [activeOrder, setActiveOrder] = useState<Launch[]>(active)

  if (viewingLaunch) {
    return <LaunchDetailsPage launch={viewingLaunch} onBack={() => setViewingLaunch(null)} />
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Launches</h1>
          <p className="text-sm text-muted-foreground">Manage project launches and releases</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="data-[state=active]:bg-card">All</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-card">
            Pending Review
            {launches.filter((l) => l.approvalStatus === "Pending Review").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold">
                {launches.filter((l) => l.approvalStatus === "Pending Review").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="listed" className="data-[state=active]:bg-card">
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Listed
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-card">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Currently Active
          </TabsTrigger>
        </TabsList>

        {/* ── ALL TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Total", value: stats.total, icon: Rocket, color: "blue" },
              { label: "Approved", value: stats.approved, icon: CheckCircle, color: "green" },
              { label: "Listed (Active)", value: stats.listed, icon: ListChecks, color: "purple" },
              { label: "Active Launch", value: stats.active, icon: Activity, color: "emerald" },
              { label: "Upcoming", value: stats.upcoming, icon: XCircle, color: "gray" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${color}-100`}>
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Search ID</label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="LCH-001" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="w-32 h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Search Project</label>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Project name" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} className="w-44 h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Developer</label>
                <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Developers</SelectItem>
                    {DEVELOPERS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Launch Status</label>
                <Select value={launchStatusFilter} onValueChange={setLaunchStatusFilter}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Active Launch">Active Launch</SelectItem>
                    <SelectItem value="Finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Approval</label>
                <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Approvals</SelectItem>
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Ingestion Status</label>
                <Select value={ingestionStatusFilter} onValueChange={setIngestionStatusFilter}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Ingested">Ingested</SelectItem>
                    <SelectItem value="Not Ingested">Not Ingested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Listing Status</label>
                <Select value={listingStatusFilter} onValueChange={setListingStatusFilter}>
                  <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Created Date Range</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} className="h-9 pl-8 w-36" />
                  </div>
                  <span className="text-xs text-muted-foreground">to</span>
                  <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} className="h-9 pl-8 w-36" />
                  </div>
                </div>
              </div>
              <div className="ml-auto">
                <Button onClick={() => { setEditingLaunch(null); setFormOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />Create Launch
                </Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="sticky left-0 z-20 bg-secondary/30 w-10">
                      <Checkbox
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onCheckedChange={(c) => selectAll(!!c)}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="w-32">ID</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Ingestion Status</TableHead>
                    <TableHead>Listing Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listing Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="sticky right-0 z-20 bg-secondary/30 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={19} className="text-center py-12 text-muted-foreground">No launches found</TableCell>
                    </TableRow>
                  )}
                  {filtered.map((launch, idx) => (
                    <TableRow
                      key={launch.id}
                      className={cn(selectedIds.includes(launch.id) && "bg-primary/5")}
                    >
                      {/* Sticky checkbox */}
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <Checkbox
                          checked={selectedIds.includes(launch.id)}
                          onCheckedChange={(checked, event) => {
                            const shiftKey = (event as unknown as React.MouseEvent)?.shiftKey ?? false
                            toggleSelect(launch.id, idx, shiftKey)
                          }}
                          className="cursor-pointer"
                        />
                      </TableCell>

                      {/* ID */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{launch.id}</span>
                          <button onClick={() => copy(launch.id, `id-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                            {copiedId === `id-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </button>
                        </div>
                      </TableCell>

                      {/* Developer */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={launch.developer.logo} alt={launch.developer.name} className="h-7 w-7 rounded object-cover bg-secondary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-tight">{launch.developer.name}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{launch.developer.id}</span>
                              <button onClick={() => copy(launch.developer.id, `dev-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                                {copiedId === `dev-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Project Name */}
                      <TableCell className="min-w-[160px]">
                        <EditableCell
                          value={launch.projectNameEn}
                          onSave={(v) => updateField(launch.id, { projectNameEn: v })}
                        />
                      </TableCell>

                      {/* Phase */}
                      <TableCell className="min-w-[100px]">
                        <EditableCell
                          value={launch.phase}
                          onSave={(v) => updateField(launch.id, { phase: v })}
                        />
                      </TableCell>

                      {/* Level */}
                      <TableCell>
                        <EditableCell
                          value={launch.projectLevel}
                          onSave={(v) => updateField(launch.id, { projectLevel: v as Launch["projectLevel"] })}
                          type="select"
                          options={["Main Compound", "Phase"]}
                        />
                      </TableCell>

                      {/* Area */}
                      <TableCell className="min-w-[130px]">
                        <EditableCell
                          value={launch.area}
                          onSave={(v) => updateField(launch.id, { area: v })}
                          type="select"
                          options={AREAS}
                        />
                      </TableCell>

                      {/* Approval — colored badge, click to cycle */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <ApprovalBadge status={launch.approvalStatus} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Pending Review", "Approved", "Rejected"] as Launch["approvalStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { approvalStatus: s })}>
                                <ApprovalBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Ingestion Status — editable */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <IngestionBadge status={launch.ingestionStatus} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Ingested", "Not Ingested"] as Launch["ingestionStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { ingestionStatus: s })}>
                                <IngestionBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Listing Status — editable */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <ListingStatusBadge status={launch.listingStatus} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Active", "Hidden"] as Launch["listingStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { listingStatus: s })}>
                                <ListingStatusBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Launch Status — editable */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <LaunchStatusBadge status={launch.launchStatus} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Upcoming", "Active Launch", "Finished"] as Launch["launchStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { launchStatus: s })}>
                                <LaunchStatusBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Listing Project */}
                      <TableCell className="min-w-[150px]">
                        {launch.listingStatus === "Listed" && launch.listingProject ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{launch.listingProject.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-mono">{launch.listingProject.id}</span>
                              <button onClick={() => copy(launch.listingProject!.id, `lst-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                                {copiedId === `lst-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* Type — editable */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">{launch.type}</Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Launch", "Release"] as Launch["type"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { type: s })}>
                                <Badge variant="outline">{s}</Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Source */}
                      <TableCell><SourceBadge source={launch.source} /></TableCell>

                      {/* Completion */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={launch.listingCompletion} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">{launch.listingCompletion}%</span>
                        </div>
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(launch.createdAt)}</TableCell>

                      {/* Updated At */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(launch.updatedAt)}</TableCell>

                      {/* Actions - sticky right */}
                      <TableCell className="sticky right-0 z-10 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingLaunch(launch)}>
                              <Eye className="h-4 w-4 mr-2" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingLaunch(launch); setFormOpen(true) }}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={launch.approvalStatus !== "Approved"}
                              onClick={() => launch.approvalStatus === "Approved" && updateField(launch.id, { listingStatus: "Active" })}
                              className={cn(launch.approvalStatus !== "Approved" && "opacity-40 cursor-not-allowed")}
                            >
                              <List className="h-4 w-4 mr-2" />List
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchiveTarget(launch)}
                            >
                              <Archive className="h-4 w-4 mr-2" />Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── PENDING REVIEW TAB ──────────────────────────────────────────── */}
        <TabsContent value="pending" className="mt-4 space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="sticky left-0 z-20 bg-secondary/30 w-10">
                      <Checkbox
                        checked={selectedIds.length === launches.filter((l) => l.approvalStatus === "Pending Review").length && launches.filter((l) => l.approvalStatus === "Pending Review").length > 0}
                        onCheckedChange={(c) => setSelectedIds(!!c ? launches.filter((l) => l.approvalStatus === "Pending Review").map((l) => l.id) : [])}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="w-32">ID</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Ingestion Status</TableHead>
                    <TableHead>Listing Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listing Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="sticky right-0 z-20 bg-secondary/30 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {launches.filter((l) => l.approvalStatus === "Pending Review").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={19} className="text-center py-12 text-muted-foreground">No launches pending review</TableCell>
                    </TableRow>
                  )}
                  {launches.filter((l) => l.approvalStatus === "Pending Review").map((launch, idx) => (
                    <TableRow
                      key={launch.id}
                      className={cn(selectedIds.includes(launch.id) && "bg-primary/5")}
                    >
                      {/* Sticky checkbox */}
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <Checkbox
                          checked={selectedIds.includes(launch.id)}
                          onCheckedChange={() => toggleSelect(launch.id, idx, false)}
                          className="cursor-pointer"
                        />
                      </TableCell>

                      {/* ID */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{launch.id}</span>
                          <button onClick={() => copy(launch.id, `pid-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                            {copiedId === `pid-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </button>
                        </div>
                      </TableCell>

                      {/* Developer */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={launch.developer.logo} alt={launch.developer.name} className="h-7 w-7 rounded object-cover bg-secondary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-tight">{launch.developer.name}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{launch.developer.id}</span>
                              <button onClick={() => copy(launch.developer.id, `pdev-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                                {copiedId === `pdev-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Project Name */}
                      <TableCell className="min-w-[160px]">
                        <EditableCell value={launch.projectNameEn} onSave={(v) => updateField(launch.id, { projectNameEn: v })} />
                      </TableCell>

                      {/* Phase */}
                      <TableCell className="min-w-[100px]">
                        <EditableCell value={launch.phase} onSave={(v) => updateField(launch.id, { phase: v })} />
                      </TableCell>

                      {/* Level */}
                      <TableCell>
                        <EditableCell
                          value={launch.projectLevel}
                          onSave={(v) => updateField(launch.id, { projectLevel: v as Launch["projectLevel"] })}
                          type="select"
                          options={["Main Compound", "Phase"]}
                        />
                      </TableCell>

                      {/* Area */}
                      <TableCell className="min-w-[130px]">
                        <EditableCell
                          value={launch.area}
                          onSave={(v) => updateField(launch.id, { area: v })}
                          type="select"
                          options={AREAS}
                        />
                      </TableCell>

                      {/* Approval */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer"><ApprovalBadge status={launch.approvalStatus} /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Pending Review", "Approved", "Rejected"] as Launch["approvalStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { approvalStatus: s })}>
                                <ApprovalBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Ingestion Status */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer"><IngestionBadge status={launch.ingestionStatus} /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Ingested", "Not Ingested"] as Launch["ingestionStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { ingestionStatus: s })}>
                                <IngestionBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Listing Status */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer"><ListingStatusBadge status={launch.listingStatus} /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Active", "Hidden"] as Launch["listingStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { listingStatus: s })}>
                                <ListingStatusBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Launch Status */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer"><LaunchStatusBadge status={launch.launchStatus} /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Upcoming", "Active Launch", "Finished"] as Launch["launchStatus"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { launchStatus: s })}>
                                <LaunchStatusBadge status={s} />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Listing Project */}
                      <TableCell className="min-w-[150px]">
                        {launch.listingProject ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{launch.listingProject.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-mono">{launch.listingProject.id}</span>
                              <button onClick={() => copy(launch.listingProject!.id, `plst-${launch.id}`)} className="p-0.5 hover:bg-secondary rounded">
                                {copiedId === `plst-${launch.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <Badge variant="outline" className="cursor-pointer hover:bg-secondary">{launch.type}</Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["Launch", "Release"] as Launch["type"][]).map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateField(launch.id, { type: s })}>
                                <Badge variant="outline">{s}</Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Source */}
                      <TableCell><SourceBadge source={launch.source} /></TableCell>

                      {/* Completion */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={launch.listingCompletion} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">{launch.listingCompletion}%</span>
                        </div>
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(launch.createdAt)}</TableCell>

                      {/* Updated At */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(launch.updatedAt)}</TableCell>

                      {/* Actions - sticky right */}
                      <TableCell className="sticky right-0 z-10 bg-background">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingLaunch(launch)}>
                              <Eye className="h-4 w-4 mr-2" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingLaunch(launch); setFormOpen(true) }}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={launch.approvalStatus !== "Approved"}
                              onClick={() => launch.approvalStatus === "Approved" && updateField(launch.id, { listingStatus: "Active" })}
                              className={cn(launch.approvalStatus !== "Approved" && "opacity-40 cursor-not-allowed")}
                            >
                              <List className="h-4 w-4 mr-2" />List
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchiveTarget(launch)}
                            >
                              <Archive className="h-4 w-4 mr-2" />Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── LISTED TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="listed" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">Drag cards to reorder. Order reflects on other platforms.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {listedOrder.map((launch, i) => (
              <LaunchCard
                key={launch.id}
                launch={launch}
                index={i}
                onDragStart={(idx) => setDragFrom(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(to) => dragFrom !== null && handleDrop(listedOrder, setListedOrder, dragFrom, to)}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── ACTIVE TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">Drag cards to reorder. Order reflects on other platforms.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {activeOrder.map((launch, i) => (
              <LaunchCard
                key={launch.id}
                launch={launch}
                index={i}
                onDragStart={(idx) => setDragFrom(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(to) => dragFrom !== null && handleDrop(activeOrder, setActiveOrder, dragFrom, to)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Bulk actions floating bar ──────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="w-px h-5 bg-border" />
            <Button variant="outline" size="sm" className="bg-transparent h-8" onClick={bulkExport}>
              Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-transparent h-8 gap-1">
                  Approval Status <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => bulkSetApproval("Pending Review")}>Pending Review</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkSetApproval("Approved")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkSetApproval("Rejected")}>Rejected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds([])}
            >
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <LaunchFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingLaunch(null) }}
        initial={editingLaunch}
        onSave={editingLaunch ? handleEdit : handleCreate}
      />
      <ArchiveDialog
        open={!!archiveTarget}
        onOpenChange={(v) => { if (!v) setArchiveTarget(null) }}
        onConfirm={handleArchive}
        launchId={archiveTarget?.id ?? ""}
      />
    </div>
  )
}

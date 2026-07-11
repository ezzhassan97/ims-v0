"use client"

import { Fragment, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import {
  Plus,
  MoreHorizontal,
  Eye,
  Archive,
  Rocket,
  CheckCircle,
  Clock,
  LayoutGrid,
  ListChecks,
  Activity,
  XCircle,
  GripVertical,
  ShieldCheck,
  Download,
  Bot,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Group as GroupIcon,
  X,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { LaunchDetailsPage } from "@/components/launch-details-page"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, DateRangeFilter,
  FloatingBulkBar, BulkBarButton, IdTag, COL_SEP, ColumnsSheet, type ManagedColumn,
} from "@/components/table-kit"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectRef {
  id: string
  name: string
}

interface Launch {
  id: string
  developer: { name: string; logo: string; id: string }
  projectNameEn: string
  /** Matched system project id — undefined ⇒ free-text project name ("Unmatched Project"). */
  projectId?: string
  /** Empty phase ⇒ this is a brand-new project ("New Project"). */
  phase: string
  projectLevel: "Main Project" | "Phase"
  parentProjectId?: string
  area: string
  areaId: string
  approvalStatus: "Pending Review" | "Approved" | "Rejected"
  ingestionStatus: "Ingested" | "Not Ingested"
  listingStatus: "Active" | "Hidden"
  /** Already-created project in the system — undefined ⇒ green "New" tag. */
  existingProject?: ProjectRef
  listingProject?: ProjectRef
  launchStatus: "Upcoming" | "Active" | "Closed"
  type: "Launch" | "Release"
  source: "WhatsApp" | "Manual"
  listingCompletion: number
  eoiAmount?: number
  coverImage?: string
  /** AI-parsed updates from WhatsApp (undefined for manual launches). */
  aiUpdates?: { count: number; lastAt: string }
  ingestedAt?: string
  sentAt: string
  createdAt: string
  updatedAt: string
}

/** New AI update = the last AI update landed after the launch was last updated. */
function hasNewAiUpdate(l: Launch): boolean {
  return !!l.aiUpdates && new Date(l.aiUpdates.lastAt) > new Date(l.updatedAt)
}

// ── Column control (checkbox + ID + actions + order stay fixed) ───────────────
const LAUNCH_COLS: (ManagedColumn & { width: number })[] = [
  { id: "developer", label: "Developer", width: 230 },
  { id: "projectName", label: "Project Name", width: 190 },
  { id: "phase", label: "Phase", width: 100 },
  { id: "level", label: "Level", width: 130 },
  { id: "area", label: "Area", width: 130 },
  { id: "approval", label: "Approval", width: 140 },
  { id: "ingestion", label: "Ingestion Status", width: 140 },
  { id: "listing", label: "Listing Status", width: 130 },
  { id: "launchStatus", label: "Launch Status", width: 130 },
  { id: "existingProject", label: "Existing Project", width: 170 },
  { id: "listingProject", label: "Listing Project", width: 170 },
  { id: "type", label: "Type", width: 110 },
  { id: "source", label: "Source", width: 110 },
  { id: "completion", label: "Completion", width: 140 },
  { id: "aiUpdates", label: "AI Updates", width: 210 },
  { id: "sentAt", label: "Sent At", width: 170 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
  { id: "ingestedAt", label: "Ingested At", width: 170 },
]

// ── Group by ──────────────────────────────────────────────────────────────────
type GroupByKey = "none" | "developer" | "level" | "area" | "type" | "launchStatus" | "phase"
const GROUP_BY_LABEL: Record<GroupByKey, string> = {
  none: "Group", developer: "Developer", level: "Level", area: "Area", type: "Type", launchStatus: "Launch Status", phase: "Phase",
}
function groupValue(l: Launch, key: GroupByKey): string {
  switch (key) {
    case "developer": return l.developer.name
    case "level": return l.projectLevel
    case "area": return l.area
    case "type": return l.type
    case "launchStatus": return l.launchStatus
    case "phase": return l.phase || "Main Project"
    default: return ""
  }
}

// ── Sortable timestamp columns (header tri-state + multi-level Sort button) ───
type TsSortKey = "aiUpdates" | "sentAt" | "createdAt" | "updatedAt" | "ingestedAt"
type LaunchSort = { key: TsSortKey; dir: "asc" | "desc" }
const SORT_FIELDS: { key: TsSortKey; label: string }[] = [
  { key: "aiUpdates", label: "AI Updates" },
  { key: "sentAt", label: "Sent At" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "ingestedAt", label: "Ingested At" },
]
function tsValue(l: Launch, key: TsSortKey): string {
  if (key === "aiUpdates") return l.aiUpdates?.lastAt ?? ""
  return l[key] ?? ""
}

type TabKey = "all" | "pending" | "listed" | "active"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AREAS_DATA: ProjectRef[] = [
  { name: "New Cairo", id: "AR-101" },
  { name: "6th of October", id: "AR-102" },
  { name: "North Coast", id: "AR-103" },
  { name: "New Capital", id: "AR-104" },
  { name: "Sheikh Zayed", id: "AR-105" },
  { name: "Maadi", id: "AR-106" },
  { name: "Zamalek", id: "AR-107" },
  { name: "Heliopolis", id: "AR-108" },
]
const AREAS = AREAS_DATA.map((a) => a.name)
const AREA_ID: Record<string, string> = Object.fromEntries(AREAS_DATA.map((a) => [a.name, a.id]))

const LOGO = "/placeholder.svg?height=32&width=32"
const COVER = "/placeholder.svg?height=200&width=300"

const mockLaunches: Launch[] = [
  {
    id: "LCH-001",
    developer: { name: "Palm Hills Development", logo: LOGO, id: "DEV-001" },
    projectNameEn: "Palm Hills October", projectId: "PRJ-201",
    phase: "", projectLevel: "Main Project",
    area: "6th of October", areaId: AREA_ID["6th of October"],
    approvalStatus: "Approved", ingestionStatus: "Ingested", listingStatus: "Active",
    existingProject: { id: "PRJ-201", name: "Palm Hills October" },
    listingProject: { id: "LST-001", name: "Palm Hills October" },
    launchStatus: "Active", type: "Launch", source: "WhatsApp",
    listingCompletion: 85, eoiAmount: 50000, coverImage: COVER,
    aiUpdates: { count: 3, lastAt: "2024-01-16T10:00:00" }, ingestedAt: "2024-01-11T07:00:00",
    sentAt: "2024-01-10T07:45:00", createdAt: "2024-01-10T09:00:00", updatedAt: "2024-01-15T14:30:00",
  },
  {
    id: "LCH-002",
    developer: { name: "Emaar Misr", logo: LOGO, id: "DEV-002" },
    projectNameEn: "Marassi North Coast",
    phase: "Phase 2", projectLevel: "Phase", parentProjectId: "Marassi",
    area: "North Coast", areaId: AREA_ID["North Coast"],
    approvalStatus: "Pending Review", ingestionStatus: "Not Ingested", listingStatus: "Hidden",
    launchStatus: "Upcoming", type: "Release", source: "Manual",
    listingCompletion: 45, eoiAmount: 75000, coverImage: COVER,
    sentAt: "2024-01-12T10:20:00", createdAt: "2024-01-12T11:00:00", updatedAt: "2024-01-14T16:45:00",
  },
  {
    id: "LCH-003",
    developer: { name: "Sodic", logo: LOGO, id: "DEV-003" },
    projectNameEn: "Sodic East", projectId: "PRJ-203",
    phase: "", projectLevel: "Main Project",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Approved", ingestionStatus: "Ingested", listingStatus: "Active",
    existingProject: { id: "PRJ-203", name: "Sodic East" },
    listingProject: { id: "LST-003", name: "Sodic East" },
    launchStatus: "Active", type: "Launch", source: "WhatsApp",
    listingCompletion: 100, eoiAmount: 60000, coverImage: COVER,
    aiUpdates: { count: 2, lastAt: "2024-01-12T09:00:00" }, ingestedAt: "2024-01-09T10:30:00",
    sentAt: "2024-01-08T06:30:00", createdAt: "2024-01-08T08:00:00", updatedAt: "2024-01-16T10:00:00",
  },
  {
    id: "LCH-004",
    developer: { name: "Mountain View", logo: LOGO, id: "DEV-004" },
    projectNameEn: "Mountain View iCity", projectId: "PRJ-204",
    phase: "Phase 1", projectLevel: "Phase", parentProjectId: "Mountain View iCity Master",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Rejected", ingestionStatus: "Not Ingested", listingStatus: "Hidden",
    existingProject: { id: "PRJ-204", name: "Mountain View iCity" },
    launchStatus: "Upcoming", type: "Release", source: "Manual",
    listingCompletion: 0, eoiAmount: 40000, coverImage: COVER,
    sentAt: "2024-01-05T13:10:00", createdAt: "2024-01-05T14:00:00", updatedAt: "2024-01-05T14:00:00",
  },
  {
    id: "LCH-005",
    developer: { name: "Ora Developers", logo: LOGO, id: "DEV-005" },
    projectNameEn: "ZED East", projectId: "PRJ-205",
    phase: "", projectLevel: "Main Project",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Approved", ingestionStatus: "Ingested", listingStatus: "Hidden",
    existingProject: { id: "PRJ-205", name: "ZED East" },
    listingProject: { id: "LST-005", name: "ZED East" },
    launchStatus: "Closed", type: "Launch", source: "WhatsApp",
    listingCompletion: 100, eoiAmount: 90000, coverImage: COVER,
    aiUpdates: { count: 1, lastAt: "2024-01-05T08:00:00" }, ingestedAt: "2023-12-22T09:00:00",
    sentAt: "2023-12-20T06:00:00", createdAt: "2023-12-20T07:30:00", updatedAt: "2024-01-10T12:00:00",
  },
  {
    id: "LCH-006",
    developer: { name: "Hyde Park", logo: LOGO, id: "DEV-006" },
    projectNameEn: "Hyde Park New Cairo",
    phase: "", projectLevel: "Main Project",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Pending Review", ingestionStatus: "Not Ingested", listingStatus: "Hidden",
    launchStatus: "Upcoming", type: "Launch", source: "WhatsApp",
    listingCompletion: 60, eoiAmount: 55000, coverImage: COVER,
    aiUpdates: { count: 1, lastAt: "2024-01-17T08:00:00" },
    sentAt: "2024-01-14T08:40:00", createdAt: "2024-01-14T10:00:00", updatedAt: "2024-01-16T09:30:00",
  },
  {
    id: "LCH-007",
    developer: { name: "Tatweer Misr", logo: LOGO, id: "DEV-007" },
    projectNameEn: "Il Monte Galala", projectId: "PRJ-207",
    phase: "", projectLevel: "Main Project",
    area: "North Coast", areaId: AREA_ID["North Coast"],
    approvalStatus: "Approved", ingestionStatus: "Ingested", listingStatus: "Active",
    existingProject: { id: "PRJ-207", name: "Il Monte Galala" },
    listingProject: { id: "LST-007", name: "Il Monte Galala" },
    launchStatus: "Active", type: "Launch", source: "WhatsApp",
    listingCompletion: 78, eoiAmount: 120000, coverImage: COVER,
    aiUpdates: { count: 4, lastAt: "2024-01-15T12:00:00" }, ingestedAt: "2024-01-04T11:00:00",
    sentAt: "2024-01-03T07:15:00", createdAt: "2024-01-03T09:00:00", updatedAt: "2024-01-17T11:00:00",
  },
  {
    id: "LCH-008",
    developer: { name: "Palm Hills Development", logo: LOGO, id: "DEV-001" },
    projectNameEn: "Palm Hills New Cairo", projectId: "PRJ-208",
    phase: "Phase 5", projectLevel: "Phase", parentProjectId: "Palm Hills New Cairo Master",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Approved", ingestionStatus: "Ingested", listingStatus: "Active",
    existingProject: { id: "PRJ-208", name: "Palm Hills New Cairo" },
    listingProject: { id: "LST-008", name: "Palm Hills New Cairo" },
    launchStatus: "Active", type: "Release", source: "Manual",
    listingCompletion: 92, eoiAmount: 65000, coverImage: COVER,
    ingestedAt: "2024-01-10T09:15:00",
    sentAt: "2024-01-09T08:00:00", createdAt: "2024-01-09T08:30:00", updatedAt: "2024-01-18T14:00:00",
  },
  {
    id: "LCH-009",
    developer: { name: "Emaar Misr", logo: LOGO, id: "DEV-002" },
    projectNameEn: "Mivida New Cairo",
    phase: "", projectLevel: "Main Project",
    area: "New Cairo", areaId: AREA_ID["New Cairo"],
    approvalStatus: "Rejected", ingestionStatus: "Not Ingested", listingStatus: "Hidden",
    launchStatus: "Upcoming", type: "Launch", source: "Manual",
    listingCompletion: 20, eoiAmount: 45000, coverImage: COVER,
    sentAt: "2024-01-06T12:00:00", createdAt: "2024-01-06T13:00:00", updatedAt: "2024-01-11T10:00:00",
  },
  {
    id: "LCH-010",
    developer: { name: "Sodic", logo: LOGO, id: "DEV-003" },
    projectNameEn: "VYE Sheikh Zayed",
    phase: "Phase 2", projectLevel: "Phase", parentProjectId: "VYE",
    area: "Sheikh Zayed", areaId: AREA_ID["Sheikh Zayed"],
    approvalStatus: "Pending Review", ingestionStatus: "Not Ingested", listingStatus: "Hidden",
    launchStatus: "Upcoming", type: "Launch", source: "WhatsApp",
    listingCompletion: 35, eoiAmount: 80000, coverImage: COVER,
    aiUpdates: { count: 2, lastAt: "2024-01-20T11:00:00" },
    sentAt: "2024-01-17T08:20:00", createdAt: "2024-01-17T09:00:00", updatedAt: "2024-01-19T15:00:00",
  },
]

const DEVELOPERS = [...new Set(mockLaunches.map((l) => l.developer.name))]

const EMPTY_FORM: Omit<Launch, "id" | "createdAt" | "updatedAt"> = {
  developer: { name: "", logo: LOGO, id: "" },
  projectNameEn: "",
  phase: "",
  projectLevel: "Main Project",
  area: "",
  areaId: "",
  approvalStatus: "Pending Review",
  ingestionStatus: "Not Ingested",
  listingStatus: "Hidden",
  launchStatus: "Upcoming",
  type: "Launch",
  source: "Manual",
  listingCompletion: 0,
  eoiAmount: 0,
  coverImage: COVER,
  sentAt: "",
}

// ─── Tags (same chip UI as the detailed properties table) ─────────────────────

const CHIP_TONES = {
  green: "border-emerald-200 bg-emerald-100 text-emerald-700",
  red: "border-red-200 bg-red-100 text-red-600",
  amber: "border-amber-200 bg-amber-100 text-amber-700",
  grey: "border-gray-200 bg-gray-100 text-gray-600",
  white: "border-border bg-white text-gray-700",
  blue: "border-blue-200 bg-blue-100 text-blue-700",
  purple: "border-purple-200 bg-purple-100 text-purple-700",
} as const

/** Rectangular tag — same UI as the detailed-properties / playground data-grid badges (rounded-md, never a pill). */
function Chip({ tone = "white", children }: { tone?: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", CHIP_TONES[tone])}>
      {children}
    </span>
  )
}

/** Small caption tag under a cell value (Unmatched Project / New Project). */
function MiniTag({ tone, children }: { tone: "red" | "grey"; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex w-fit items-center whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-medium",
      tone === "red" ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 bg-gray-50 text-gray-500",
    )}>
      {children}
    </span>
  )
}

const APPROVAL_TONE: Record<Launch["approvalStatus"], keyof typeof CHIP_TONES> = {
  "Approved": "green", "Pending Review": "amber", "Rejected": "red",
}
const INGESTION_TONE: Record<Launch["ingestionStatus"], keyof typeof CHIP_TONES> = {
  "Ingested": "green", "Not Ingested": "grey",
}
const LISTING_TONE: Record<Launch["listingStatus"], keyof typeof CHIP_TONES> = {
  "Active": "green", "Hidden": "red",
}
const LAUNCH_STATUS_TONE: Record<Launch["launchStatus"], keyof typeof CHIP_TONES> = {
  "Active": "green", "Upcoming": "blue", "Closed": "purple",
}

/** Canonical launches timestamp format: "10 Jan 2024, 07:00 AM". */
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—"
  const d = new Date(dateString)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" })
  return `${date}, ${time}`
}

// ─── Create dialog ─────────────────────────────────────────────────────────────

function LaunchFormDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => void
}) {
  const [form, setForm] = useState<Omit<Launch, "id" | "createdAt" | "updatedAt">>({ ...EMPTY_FORM })

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Launch</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <select
              value={form.developer.name}
              onChange={(e) => set("developer", { name: e.target.value, logo: LOGO, id: `DEV-${e.target.value.slice(0, 3).toUpperCase()}` })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Select developer…</option>
              {DEVELOPERS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Project Level</Label>
            <select
              value={form.projectLevel}
              onChange={(e) => {
                const level = e.target.value as Launch["projectLevel"]
                // Main Project launches have no phase by definition
                setForm((prev) => ({ ...prev, projectLevel: level, phase: level === "Main Project" ? "" : prev.phase }))
              }}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="Main Project">Main Project</option>
              <option value="Phase">Phase</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Project Name</Label>
            {form.projectLevel === "Phase" ? (
              <select
                value={form.projectNameEn}
                onChange={(e) => set("projectNameEn", e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select project…</option>
                {mockLaunches.filter((l) => l.projectLevel === "Main Project").map((l) => (
                  <option key={l.id} value={l.projectNameEn}>{l.projectNameEn}</option>
                ))}
              </select>
            ) : (
              <Input value={form.projectNameEn} onChange={(e) => set("projectNameEn", e.target.value)} placeholder="Project name" />
            )}
          </div>

          {form.projectLevel === "Phase" ? (
            <div className="space-y-1.5">
              <Label>Phase</Label>
              <Input value={form.phase} onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Phase 1" />
            </div>
          ) : (
            <div />
          )}

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
          <Button onClick={() => { onSave(form); onOpenChange(false) }}>Create Launch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Action dialogs ────────────────────────────────────────────────────────────

/** Summary block shown at the top of every row-level confirmation popup. */
function LaunchSummary({ launch }: { launch: Launch }) {
  const fields: [string, string][] = [
    ["Developer", launch.developer.name],
    ["Area", launch.area],
    ["Project", launch.projectNameEn],
  ]
  if (launch.phase) fields.push(["Phase", launch.phase])
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value || "—"}</p>
        </div>
      ))}
    </div>
  )
}

function ActionDialog({
  title, launch, message, children, confirmLabel, confirmClass, confirmDisabled, onClose, onConfirm,
}: {
  title: string
  launch?: Launch
  message?: string
  children?: React.ReactNode
  confirmLabel: string
  confirmClass?: string
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {launch && <LaunchSummary launch={launch} />}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={onClose}>Cancel</Button>
          <Button className={confirmClass} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ArchiveDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("")
  return (
    <ActionDialog
      title="Archive Launch"
      launch={launch}
      message="Archiving removes this launch from all launch views."
      confirmLabel="Archive"
      confirmClass="bg-red-600 text-white hover:bg-red-700"
      confirmDisabled={!reason.trim()}
      onClose={onClose}
      onConfirm={() => onConfirm(reason.trim())}
    >
      <div className="space-y-1.5">
        <Label>Reason for archiving <span className="text-red-500">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this launch being archived?" rows={3} />
      </div>
    </ActionDialog>
  )
}

function ApproveDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: () => void }) {
  return (
    <ActionDialog
      title="Approve Launch"
      launch={launch}
      message="Approving this launch means this launch can be ingested in the database and appears across Nawy's system accordingly."
      confirmLabel="Approve"
      confirmClass="bg-emerald-600 text-white hover:bg-emerald-700"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

function RejectDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("")
  return (
    <ActionDialog
      title="Reject Launch"
      launch={launch}
      message="Rejecting this launch means this launch will not get ingested in the database and will not appear across Nawy's system accordingly."
      confirmLabel="Reject"
      confirmClass="bg-red-600 text-white hover:bg-red-700"
      confirmDisabled={!reason.trim()}
      onClose={onClose}
      onConfirm={() => onConfirm(reason.trim())}
    >
      <div className="space-y-1.5">
        <Label>Reason for rejection <span className="text-red-500">*</span></Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this launch being rejected?" rows={3} />
      </div>
    </ActionDialog>
  )
}

const EOI_SPLIT = [
  { type: "Apartments", share: 0.5 },
  { type: "Villas", share: 0.3 },
  { type: "Townhouses", share: 0.2 },
]

function ActivateDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: (startDate: string) => void }) {
  const [startDate, setStartDate] = useState("")
  const [eoiView, setEoiView] = useState<"general" | "byType">("general")
  const total = launch.eoiAmount ?? 0
  const count = Math.max(1, Math.round(total / 2500))

  return (
    <ActionDialog
      title="Activate Launch"
      launch={launch}
      message="Setting this launch to Active makes it live across Nawy's system. Pick the launch start date and review the EOIs collected."
      confirmLabel="Activate Launch"
      confirmClass="bg-emerald-600 text-white hover:bg-emerald-700"
      confirmDisabled={!startDate}
      onClose={onClose}
      onConfirm={() => onConfirm(startDate)}
    >
      <div className="space-y-1.5">
        <Label>Launch Start Date <span className="text-red-500">*</span></Label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      {/* EOI view */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">EOIs Collected</p>
          <div className="flex rounded-md border border-border p-0.5">
            {([["general", "General"], ["byType", "By Property Type"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setEoiView(key)}
                className={cn("rounded px-2 py-0.5 text-[11px] font-medium transition-colors", eoiView === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {eoiView === "general" ? (
          <div className="grid grid-cols-2 gap-4 px-3 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total EOI Amount</p>
              <p className="text-lg font-semibold">EGP {total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">EOIs</p>
              <p className="text-lg font-semibold">{count}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {EOI_SPLIT.map(({ type, share }) => (
              <div key={type} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{type}</span>
                <span className="text-muted-foreground">{Math.max(1, Math.round(count * share))} EOIs · EGP {Math.round(total * share).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ActionDialog>
  )
}

function CloseLaunchDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: (endDate: string) => void }) {
  const [endDate, setEndDate] = useState("")
  return (
    <ActionDialog
      title="Close Launch"
      launch={launch}
      message="A notification will be sent to the sales portal to flag EOIs collected after this date on this launch."
      confirmLabel="Close Launch"
      confirmClass="bg-red-600 text-white hover:bg-red-700"
      confirmDisabled={!endDate}
      onClose={onClose}
      onConfirm={() => onConfirm(endDate)}
    >
      <div className="space-y-1.5">
        <Label>Launch End Date <span className="text-red-500">*</span></Label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
    </ActionDialog>
  )
}

type BulkKind = "bulk-approve" | "bulk-reject" | "bulk-list-active" | "bulk-list-hidden"

function BulkDialog({ kind, count, onClose, onConfirm }: { kind: BulkKind; count: number; onClose: () => void; onConfirm: (reason?: string) => void }) {
  const [reason, setReason] = useState("")
  const cfg = {
    "bulk-approve": {
      title: `Approve ${count} launch${count === 1 ? "" : "es"}`,
      message: `Approving these ${count} launch${count === 1 ? "" : "es"} means they can be ingested in the database and appear across Nawy's system accordingly.`,
      label: "Approve", cls: "bg-emerald-600 text-white hover:bg-emerald-700", needsReason: false,
    },
    "bulk-reject": {
      title: `Reject ${count} launch${count === 1 ? "" : "es"}`,
      message: `Rejecting these ${count} launch${count === 1 ? "" : "es"} means they will not get ingested in the database and will not appear across Nawy's system accordingly.`,
      label: "Reject", cls: "bg-red-600 text-white hover:bg-red-700", needsReason: true,
    },
    "bulk-list-active": {
      title: `Set listing to Active for ${count} launch${count === 1 ? "" : "es"}`,
      message: `${count} launch${count === 1 ? "" : "es"} will appear on Nawy Listing website and Mobile App.`,
      label: "Set Active", cls: "bg-emerald-600 text-white hover:bg-emerald-700", needsReason: false,
    },
    "bulk-list-hidden": {
      title: `Hide ${count} launch${count === 1 ? "" : "es"} from listing`,
      message: `${count} launch${count === 1 ? "" : "es"} will disappear from Nawy Listing website and Mobile App.`,
      label: "Set Hidden", cls: "bg-red-600 text-white hover:bg-red-700", needsReason: false,
    },
  }[kind]

  return (
    <ActionDialog
      title={cfg.title}
      message={cfg.message}
      confirmLabel={cfg.label}
      confirmClass={cfg.cls}
      confirmDisabled={cfg.needsReason && !reason.trim()}
      onClose={onClose}
      onConfirm={() => onConfirm(reason.trim() || undefined)}
    >
      {cfg.needsReason && (
        <div className="space-y-1.5">
          <Label>Reason for rejection <span className="text-red-500">*</span></Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these launches being rejected?" rows={3} />
        </div>
      )}
    </ActionDialog>
  )
}

type DialogState =
  | { kind: "archive" | "approve" | "reject" | "activate" | "close"; launch: Launch }
  | { kind: BulkKind }
  | null

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LaunchesPage({ embedded = false, scopeProject }: { embedded?: boolean; scopeProject?: { name: string; isPhase: boolean; mainProject?: string } } = {}) {
  const scoped = !!scopeProject
  const [launches, setLaunches] = useState<Launch[]>(mockLaunches)
  const [tab, setTab] = useState<TabKey>(scoped ? "listed" : "all")

  // Filters (shared across tabs; per-tab exclusions applied at render/filter time)
  const [search, setSearch] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [areaF, setAreaF] = useState<string[]>([])
  const [sourceF, setSourceF] = useState("all")
  const [alreadyCreatedF, setAlreadyCreatedF] = useState("all")
  const [aiUpdatesF, setAiUpdatesF] = useState("all")
  const [launchStatusF, setLaunchStatusF] = useState("all")
  const [approvalF, setApprovalF] = useState("all")
  const [ingestionF, setIngestionF] = useState("all")
  const [listingF, setListingF] = useState("all")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sentFrom, setSentFrom] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [ingestedFrom, setIngestedFrom] = useState("")
  const [ingestedTo, setIngestedTo] = useState("")

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewingLaunch, setViewingLaunch] = useState<Launch | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const lastSelectedIndex = useRef<number | null>(null)

  // All Filters drawer · Columns sheet (order / hide / freeze) · Group by · sorts
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showColumnSheet, setShowColumnSheet] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(LAUNCH_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sorts, setSorts] = useState<LaunchSort[]>([])

  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => LAUNCH_COLS.find((c) => c.id === id)!).filter(Boolean)
  // Sticky-left offset for a frozen column = checkbox (+ Order col on Listed / Currently Active) + preceding frozen widths
  const frozenLeft = (colId: string) => {
    let left = 40 + (tab === "active" || tab === "listed" ? 56 : 0)
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }

  const clearAllFilters = () => {
    setSearch(""); setDeveloperF([]); setAreaF([]); setSourceF("all"); setAlreadyCreatedF("all")
    setAiUpdatesF("all"); setLaunchStatusF("all"); setApprovalF("all"); setIngestionF("all")
    setListingF("all"); setCreatedFrom(""); setCreatedTo(""); setSentFrom(""); setSentTo("")
    setIngestedFrom(""); setIngestedTo(""); setPage(1)
  }

  // Manual ordering for Listed / Currently Active tabs (rank = position in this array)
  const [activeOrder, setActiveOrder] = useState<string[]>(
    () => mockLaunches.filter((l) => l.approvalStatus === "Approved" && l.ingestionStatus === "Ingested").map((l) => l.id),
  )
  const dragId = useRef<string | null>(null)
  const dragTab = tab === "active" || tab === "listed"

  // ── Rows per tab ────────────────────────────────────────────────────────────

  const isIngested = (l: Launch) => l.approvalStatus === "Approved" && l.ingestionStatus === "Ingested"

  // Scoped (project details embed): only ingested launches linked to the project (or its phases).
  // Mock data rarely name-matches the projects table, so fall back to all ingested launches.
  const scopedLaunches = (() => {
    if (!scopeProject) return launches
    const ingested = launches.filter(isIngested)
    const name = (scopeProject.isPhase ? scopeProject.mainProject ?? scopeProject.name : scopeProject.name).toLowerCase()
    const matched = ingested.filter((l) =>
      l.listingProject?.name.toLowerCase().includes(name) || l.projectNameEn.toLowerCase().includes(name))
    return matched.length ? matched : ingested
  })()

  const baseRows = (t: TabKey): Launch[] => {
    switch (t) {
      case "pending": return scopedLaunches.filter((l) => l.approvalStatus === "Pending Review")
      case "listed": return scopedLaunches.filter(isIngested)
      case "active": return scopedLaunches.filter((l) => isIngested(l) && l.launchStatus === "Active")
      default: return scopedLaunches
    }
  }

  const orderRank = (id: string) => {
    const i = activeOrder.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }

  const tabRows = (t: TabKey): Launch[] => {
    let rows = baseRows(t).filter((l) => {
      if (search && !`${l.id} ${l.projectNameEn}`.toLowerCase().includes(search.toLowerCase())) return false
      if (developerF.length && !developerF.includes(l.developer.name)) return false
      if (areaF.length && !areaF.includes(l.area)) return false
      if (sourceF !== "all" && l.source !== sourceF) return false
      if (alreadyCreatedF === "Existing" && !l.existingProject) return false
      if (alreadyCreatedF === "New" && l.existingProject) return false
      if (aiUpdatesF === "New update" && !hasNewAiUpdate(l)) return false
      if (t !== "active" && launchStatusF !== "all" && l.launchStatus !== launchStatusF) return false
      if (t !== "pending" && approvalF !== "all" && l.approvalStatus !== approvalF) return false
      if (t !== "listed" && ingestionF !== "all" && l.ingestionStatus !== ingestionF) return false
      if (listingF !== "all" && l.listingStatus !== listingF) return false
      if (createdFrom && new Date(l.createdAt) < new Date(createdFrom)) return false
      if (createdTo && new Date(l.createdAt) > new Date(createdTo + "T23:59:59")) return false
      if (sentFrom && new Date(l.sentAt) < new Date(sentFrom)) return false
      if (sentTo && new Date(l.sentAt) > new Date(sentTo + "T23:59:59")) return false
      if (ingestedFrom && (!l.ingestedAt || new Date(l.ingestedAt) < new Date(ingestedFrom))) return false
      if (ingestedTo && (!l.ingestedAt || new Date(l.ingestedAt) > new Date(ingestedTo + "T23:59:59"))) return false
      return true
    })
    if (t === "active" || t === "listed") rows = [...rows].sort((a, b) => orderRank(a.id) - orderRank(b.id))
    // Multi-level sort (Sort button / header click) overrides the default/manual order
    if (sorts.length) {
      rows = [...rows].sort((a, b) => {
        for (const s of sorts) {
          const va = tsValue(a, s.key), vb = tsValue(b, s.key)
          if (va !== vb) return (va < vb ? -1 : 1) * (s.dir === "asc" ? 1 : -1)
        }
        return 0
      })
    }
    return rows
  }

  const rows = tabRows(tab)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const activeFilterCount =
    (developerF.length ? 1 : 0) + (areaF.length ? 1 : 0) +
    [sourceF, alreadyCreatedF, aiUpdatesF, listingF].filter((f) => f !== "all").length +
    (tab !== "active" && launchStatusF !== "all" ? 1 : 0) +
    (!scoped && tab !== "pending" && approvalF !== "all" ? 1 : 0) +
    (!scoped && tab !== "listed" && ingestionF !== "all" ? 1 : 0) +
    ((createdFrom || createdTo) ? 1 : 0) + ((sentFrom || sentTo) ? 1 : 0) + ((ingestedFrom || ingestedTo) ? 1 : 0)

  const allTabRows = tabRows("all")
  const stats = {
    total: allTabRows.length,
    approved: allTabRows.filter((l) => l.approvalStatus === "Approved").length,
    listed: allTabRows.filter((l) => l.listingStatus === "Active").length,
    active: allTabRows.filter((l) => l.launchStatus === "Active").length,
    upcoming: allTabRows.filter((l) => l.launchStatus === "Upcoming").length,
  }
  const pendingCount = launches.filter((l) => l.approvalStatus === "Pending Review").length

  // ── Selection ───────────────────────────────────────────────────────────────

  const toggleSelect = (id: string, idx: number, shift: boolean) => {
    if (shift && lastSelectedIndex.current !== null) {
      const lo = Math.min(lastSelectedIndex.current, idx)
      const hi = Math.max(lastSelectedIndex.current, idx)
      const range = rows.slice(lo, hi + 1).map((l) => l.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...range])))
    } else {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
      lastSelectedIndex.current = idx
    }
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  const patch = (ids: string[], p: Partial<Launch>) =>
    setLaunches((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, ...p, updatedAt: new Date().toISOString() } : l)))

  const handleCreate = (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString()
    setLaunches((prev) => [
      { ...data, areaId: AREA_ID[data.area] ?? "AR-000", sentAt: now, id: `LCH-${String(prev.length + 1).padStart(3, "0")}`, createdAt: now, updatedAt: now },
      ...prev,
    ])
    toast.success("Launch created")
  }

  const doArchive = (launch: Launch) => {
    setLaunches((prev) => prev.filter((l) => l.id !== launch.id))
    setSelectedIds((prev) => prev.filter((id) => id !== launch.id))
    setDialog(null)
    toast.success(`${launch.projectNameEn} archived`)
  }

  const doApprove = (launch: Launch) => {
    patch([launch.id], { approvalStatus: "Approved" })
    setDialog(null)
    toast.success(`${launch.projectNameEn} approved`)
  }

  const doReject = (launch: Launch) => {
    patch([launch.id], { approvalStatus: "Rejected" })
    setDialog(null)
    toast.success(`${launch.projectNameEn} rejected`)
  }

  const doActivate = (launch: Launch) => {
    patch([launch.id], { launchStatus: "Active" })
    setActiveOrder((prev) => (prev.includes(launch.id) ? prev : [...prev, launch.id]))
    setDialog(null)
    toast.success(`${launch.projectNameEn} is now an active launch`)
  }

  const doCloseLaunch = (launch: Launch) => {
    patch([launch.id], { launchStatus: "Closed" })
    setDialog(null)
    toast.success(`${launch.projectNameEn} closed — sales portal notified`)
  }

  const doBulk = (kind: BulkKind) => {
    if (kind === "bulk-approve") patch(selectedIds, { approvalStatus: "Approved" })
    if (kind === "bulk-reject") patch(selectedIds, { approvalStatus: "Rejected" })
    if (kind === "bulk-list-active") patch(selectedIds, { listingStatus: "Active" })
    if (kind === "bulk-list-hidden") patch(selectedIds, { listingStatus: "Hidden" })
    const msg = {
      "bulk-approve": "approved", "bulk-reject": "rejected",
      "bulk-list-active": "set to Active listing", "bulk-list-hidden": "hidden from listing",
    }[kind]
    toast.success(`${selectedIds.length} launch${selectedIds.length === 1 ? "" : "es"} ${msg}`)
    setSelectedIds([])
    setDialog(null)
  }

  const bulkExport = () => {
    const sel = launches.filter((l) => selectedIds.includes(l.id))
    const csv = [
      ["ID", "Developer", "Project", "Phase", "Level", "Area", "Approval", "Ingestion", "Listing", "Launch Status", "Type", "Source", "Sent At", "Created At"].join(","),
      ...sel.map((l) => [l.id, l.developer.name, l.projectNameEn, l.phase, l.projectLevel, l.area, l.approvalStatus, l.ingestionStatus, l.listingStatus, l.launchStatus, l.type, l.source, l.sentAt, l.createdAt].map((v) => `"${v}"`).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "launches.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Drag reorder (Currently Active tab) ─────────────────────────────────────

  const onRowDrop = (targetId: string) => {
    const src = dragId.current
    dragId.current = null
    if (!src || src === targetId) return
    setActiveOrder((prev) => {
      const arr = [...prev]
      const from = arr.indexOf(src)
      const to = arr.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      arr.splice(to, 0, ...arr.splice(from, 1))
      return arr
    })
  }

  // ── Renderers ───────────────────────────────────────────────────────────────

  const viewItem = (l: Launch) => (
    <DropdownMenuItem onClick={() => setViewingLaunch(l)}>
      <Eye className="h-4 w-4 mr-2" />View
    </DropdownMenuItem>
  )

  const toggleListingItem = (l: Launch) => (
    <DropdownMenuItem onClick={() => {
      const next = l.listingStatus === "Active" ? "Hidden" : "Active"
      patch([l.id], { listingStatus: next })
      toast.success(`${l.projectNameEn} listing set to ${next}`)
    }}>
      {l.listingStatus === "Active" ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
      {l.listingStatus === "Active" ? "Hide Listing" : "Show Listing"}
    </DropdownMenuItem>
  )

  const rowMenu = (l: Launch) => {
    if (tab === "all" || tab === "pending") {
      const dimApproval = l.ingestionStatus === "Ingested"
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {viewItem(l)}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={dimApproval} className={cn(dimApproval && "opacity-40")}>
                <ShieldCheck className="h-4 w-4 mr-2" />Approval
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem className="text-emerald-600 focus:text-emerald-700" onClick={() => setDialog({ kind: "approve", launch: l })}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Approve
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDialog({ kind: "reject", launch: l })}>
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />Reject
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {toggleListingItem(l)}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={l.ingestionStatus === "Ingested"}
              className={cn("text-destructive focus:text-destructive", l.ingestionStatus === "Ingested" && "opacity-40")}
              onClick={() => setDialog({ kind: "archive", launch: l })}
            >
              <Archive className="h-4 w-4 mr-2" />Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    if (tab === "listed") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {viewItem(l)}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Activity className="h-4 w-4 mr-2" />Launch Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled={l.launchStatus === "Active"} onClick={() => setDialog({ kind: "activate", launch: l })}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Set Active
                </DropdownMenuItem>
                <DropdownMenuItem disabled={l.launchStatus === "Closed"} onClick={() => setDialog({ kind: "close", launch: l })}>
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />Set Closed
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {toggleListingItem(l)}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    // Currently Active: Close Launch only
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {viewItem(l)}
          {toggleListingItem(l)}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDialog({ kind: "close", launch: l })}>
            <XCircle className="h-4 w-4 mr-2" />Close Launch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // ── Config-driven cells (order / visibility / freeze from the Columns sheet) ──
  const cellContent = (colId: string, l: Launch): React.ReactNode => {
    switch (colId) {
      case "developer": return (
        <div className="flex items-center gap-2">
          <img src={l.developer.logo} alt={l.developer.name} className="h-7 w-7 flex-shrink-0 rounded bg-secondary object-cover" />
          <div className="flex flex-col">
            <a href="#" target="_blank" rel="noreferrer" className="w-fit text-sm font-medium leading-tight hover:underline">{l.developer.name}</a>
            <IdTag value={l.developer.id} />
          </div>
        </div>
      )
      case "projectName": return l.projectId ? (
        <div className="flex flex-col">
          <a href="#" target="_blank" rel="noreferrer" className="w-fit text-sm font-medium hover:underline">{l.projectNameEn}</a>
          <IdTag value={l.projectId} />
        </div>
      ) : l.projectLevel === "Phase" ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{l.projectNameEn}</span>
          <MiniTag tone="red">Unmatched Project</MiniTag>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{l.projectNameEn}</span>
          <MiniTag tone="grey">New Project</MiniTag>
        </div>
      )
      case "phase": return l.phase ? <span className="text-sm">{l.phase}</span> : <span className="text-xs text-muted-foreground">—</span>
      case "level": return <Chip tone={l.projectLevel === "Main Project" ? "blue" : "white"}>{l.projectLevel}</Chip>
      case "area": return (
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-sm">{l.area}</span>
          <IdTag value={l.areaId} />
        </div>
      )
      case "approval": return <Chip tone={APPROVAL_TONE[l.approvalStatus]}>{l.approvalStatus}</Chip>
      case "ingestion": return <Chip tone={INGESTION_TONE[l.ingestionStatus]}>{l.ingestionStatus}</Chip>
      case "listing": return <Chip tone={LISTING_TONE[l.listingStatus]}>{l.listingStatus}</Chip>
      case "launchStatus": return <Chip tone={LAUNCH_STATUS_TONE[l.launchStatus]}>{l.launchStatus}</Chip>
      case "existingProject": return l.existingProject ? (
        <div className="flex flex-col">
          <a href="#" target="_blank" rel="noreferrer" className="w-fit text-sm hover:underline">{l.existingProject.name}</a>
          <IdTag value={l.existingProject.id} />
        </div>
      ) : <Chip tone="green">New</Chip>
      case "listingProject": return l.listingProject ? (
        <div className="flex flex-col">
          <a href="#" target="_blank" rel="noreferrer" className="w-fit text-sm hover:underline">{l.listingProject.name}</a>
          <IdTag value={l.listingProject.id} />
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span>
      case "type": return <Chip tone={l.type === "Launch" ? "green" : "white"}>{l.type}</Chip>
      case "source": return <Chip tone={l.source === "WhatsApp" ? "green" : "white"}>{l.source}</Chip>
      case "completion": return (
        <div className="flex items-center gap-2">
          <Progress value={l.listingCompletion} className="h-2 w-16" />
          <span className="text-xs text-muted-foreground">{l.listingCompletion}%</span>
        </div>
      )
      case "aiUpdates": return (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {l.aiUpdates ? (
            <span className={cn(hasNewAiUpdate(l) && "font-medium text-purple-700")}>
              {l.aiUpdates.count} update{l.aiUpdates.count === 1 ? "" : "s"}, {formatDate(l.aiUpdates.lastAt)}
            </span>
          ) : "—"}
        </span>
      )
      case "sentAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.sentAt)}</span>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.updatedAt)}</span>
      case "ingestedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.ingestedAt)}</span>
      default: return null
    }
  }

  const renderRow = (l: Launch, idx: number) => {
    const selected = selectedIds.includes(l.id)
    return (
      <TableRow
        key={l.id}
        draggable={dragTab}
        onDragStart={dragTab ? () => { dragId.current = l.id } : undefined}
        onDragOver={dragTab ? (e) => e.preventDefault() : undefined}
        onDrop={dragTab ? () => onRowDrop(l.id) : undefined}
        className={cn("hover:bg-muted/40", selected && "bg-primary/5")}
      >
        {/* Sticky checkbox */}
        <TableCell className={cn("sticky left-0 z-10 w-10", selected ? "bg-primary/5" : "bg-card")}>
          {/* onClick (not onCheckedChange) — Radix doesn't pass the event, and we need shiftKey */}
          <Checkbox
            checked={selected}
            onClick={(e) => toggleSelect(l.id, (safePage - 1) * pageSize + idx, e.shiftKey)}
            className="cursor-pointer"
          />
        </TableCell>

        {/* Order (Listed / Currently Active) — frozen after the checkbox */}
        {dragTab && (
          <TableCell className={cn("sticky left-10 z-10 w-14", selected ? "bg-primary/5" : "bg-card")}>
            <div className="flex cursor-grab items-center gap-1 active:cursor-grabbing">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-sm font-semibold tabular-nums">{orderRank(l.id) + 1}</span>
            </div>
          </TableCell>
        )}

        {/* ID (+ New AI update caption) */}
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <IdTag value={l.id} />
            {hasNewAiUpdate(l) && (
              <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded border border-purple-200 bg-purple-50 px-1.5 py-px text-[10px] font-medium text-purple-700">
                <Bot className="h-2.5 w-2.5" />New AI update
              </span>
            )}
          </div>
        </TableCell>

        {visibleCols.map((c) => (
          <TableCell
            key={c.id}
            className={cn(frozenCols.has(c.id) && cn("sticky z-10", selected ? "bg-primary/5" : "bg-card"))}
            style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
          >
            {cellContent(c.id, l)}
          </TableCell>
        ))}

        {/* Actions — frozen right */}
        <TableCell className={cn("sticky right-0 z-10 border-l border-border", selected ? "bg-primary/5" : "bg-card")}>
          {rowMenu(l)}
        </TableCell>
      </TableRow>
    )
  }

  const colCount = 3 + visibleCols.length + (dragTab ? 1 : 0)

  // Grouped rows (over the full filtered set, like the developers table)
  const groups = groupBy === "none" ? null : (() => {
    const map = new Map<string, Launch[]>()
    for (const l of rows) {
      const k = groupValue(l, groupBy)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(l)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, groupRows]) => ({ label, rows: groupRows }))
  })()

  const groupChipTone = (label: string): keyof typeof CHIP_TONES => {
    if (groupBy === "launchStatus") return LAUNCH_STATUS_TONE[label as Launch["launchStatus"]] ?? "white"
    if (groupBy === "type") return label === "Launch" ? "green" : "white"
    if (groupBy === "level") return label === "Main Project" ? "blue" : "white"
    return "white"
  }

  // Header click cycles: none → asc → desc → none (becomes the single primary sort)
  const TS_KEYS = new Set<string>(SORT_FIELDS.map((f) => f.key))
  const cycleHeaderSort = (key: TsSortKey) =>
    setSorts((prev) => {
      const cur = prev.length === 1 && prev[0].key === key ? prev[0] : null
      if (!cur) return [{ key, dir: "asc" }]
      return cur.dir === "asc" ? [{ key, dir: "desc" }] : []
    })

  const renderTh = (c: (typeof LAUNCH_COLS)[number]) => {
    const s = sorts.find((x) => x.key === c.id)
    return (
      <TableHead
        key={c.id}
        className={cn("whitespace-nowrap", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
      >
        {TS_KEYS.has(c.id) ? (
          <button onClick={() => cycleHeaderSort(c.id as TsSortKey)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
            {c.label}
            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
          </button>
        ) : c.label}
      </TableHead>
    )
  }

  const renderTable = (title: string, cta?: React.ReactNode) => (
    <TableCard>
      <TableCardHeader title={title} count={rows.length} cta={cta} />
      <div className="overflow-x-auto">
        <Table className={cn("w-max text-sm [&_thead_th]:h-auto [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_thead_th]:text-muted-foreground", COL_SEP)}>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
              <TableHead className="sticky left-0 z-20 w-10 bg-muted/60">
                <Checkbox
                  checked={rows.length > 0 && rows.every((l) => selectedIds.includes(l.id))}
                  onCheckedChange={(c) => setSelectedIds(c ? rows.map((l) => l.id) : [])}
                  className="cursor-pointer"
                />
              </TableHead>
              {dragTab && <TableHead className="sticky left-10 z-20 w-14 bg-muted/60">Order</TableHead>}
              <TableHead className="whitespace-nowrap">ID</TableHead>
              {visibleCols.map(renderTh)}
              <TableHead className="sticky right-0 z-20 w-10 bg-secondary/30"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="py-12 text-center text-muted-foreground">No launches found</TableCell>
              </TableRow>
            )}
            {groups ? (
              groups.map((g) => (
                <Fragment key={g.label}>
                  <TableRow
                    className="cursor-pointer bg-muted/40 hover:bg-muted/60"
                    onClick={() => setCollapsedGroups((prev) => { const n = new Set(prev); if (n.has(g.label)) n.delete(g.label); else n.add(g.label); return n })}
                  >
                    <TableCell colSpan={colCount} className="p-0">
                      <div className="sticky left-0 flex w-max items-center gap-2 px-4 py-2">
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                        <Chip tone={groupChipTone(g.label)}>{g.label}</Chip>
                        <span className="text-xs text-muted-foreground">{g.rows.length} launch{g.rows.length !== 1 ? "es" : ""}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {!collapsedGroups.has(g.label) && g.rows.map((l, idx) => renderRow(l, idx))}
                </Fragment>
              ))
            ) : (
              pageRows.map((l, idx) => renderRow(l, idx))
            )}
          </TableBody>
        </Table>
      </div>
      <TableFooter page={safePage} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="launches" />
    </TableCard>
  )

  // Scoped embed removes Developer / Area / Approval / Ingestion filters
  const groupKeys: GroupByKey[] = scoped
    ? (!scopeProject!.isPhase ? ["phase"] : [])
    : ["developer", "level", "area", "type", "launchStatus"]

  const toolbar = (
    <TableToolbar
      search={search}
      onSearch={(v) => { setSearch(v); setPage(1) }}
      searchPlaceholder="Launch ID or project name"
      activeFilters={activeFilterCount}
      onAllFilters={() => setShowAllFilters(true)}
      onColumns={() => setShowColumnSheet(true)}
      hideAdvanced
      hideGroup={groupKeys.length === 0}
      sortControl={<LaunchSortControl sorts={sorts} setSorts={setSorts} />}
      groupControl={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5">
              <GroupIcon className="h-3.5 w-3.5" />{GROUP_BY_LABEL[groupBy]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGroupBy("none")}>No grouping</DropdownMenuItem>
            <DropdownMenuSeparator />
            {groupKeys.map((k) => (
              <DropdownMenuItem key={k} onClick={() => setGroupBy(k)}>{GROUP_BY_LABEL[k]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
      filters={
        <>
          {!scoped && <FilterMultiSelect label="Developer" options={DEVELOPERS} value={developerF} onChange={(v) => { setDeveloperF(v); setPage(1) }} tone="danger" className="w-40" />}
          {!scoped && <FilterMultiSelect label="Area" options={AREAS} value={areaF} onChange={(v) => { setAreaF(v); setPage(1) }} tone="danger" className="w-36" />}
          <FilterSelect label="Source" value={sourceF === "all" ? "" : sourceF} options={["WhatsApp", "Manual"]} onChange={(v) => { setSourceF(v || "all"); setPage(1) }} className="w-32" />
          <FilterSelect label="Already Created" value={alreadyCreatedF === "all" ? "" : alreadyCreatedF} options={["Existing", "New"]} onChange={(v) => { setAlreadyCreatedF(v || "all"); setPage(1) }} className="w-40" />
          <FilterSelect label="AI Updates" value={aiUpdatesF === "all" ? "" : aiUpdatesF} options={["New update"]} onChange={(v) => { setAiUpdatesF(v || "all"); setPage(1) }} className="w-36" />
          {tab !== "active" && (
            <FilterSelect label="Launch Status" value={launchStatusF === "all" ? "" : launchStatusF} options={["Upcoming", "Active", "Closed"]} onChange={(v) => { setLaunchStatusF(v || "all"); setPage(1) }} className="w-38" />
          )}
          {!scoped && tab !== "pending" && (
            <FilterSelect label="Approval" value={approvalF === "all" ? "" : approvalF} options={["Pending Review", "Approved", "Rejected"]} onChange={(v) => { setApprovalF(v || "all"); setPage(1) }} className="w-36" />
          )}
          {!scoped && tab !== "listed" && (
            <FilterSelect label="Ingestion" value={ingestionF === "all" ? "" : ingestionF} options={["Ingested", "Not Ingested"]} onChange={(v) => { setIngestionF(v || "all"); setPage(1) }} className="w-36" />
          )}
          <FilterSelect label="Listing" value={listingF === "all" ? "" : listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v || "all"); setPage(1) }} className="w-32" />
          <DateRangeFilter label="Created Date Range" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} />
          <DateRangeFilter label="Sent At Range" dateFrom={sentFrom} dateTo={sentTo} onChangeFrom={(v) => { setSentFrom(v); setPage(1) }} onChangeTo={(v) => { setSentTo(v); setPage(1) }} />
          <DateRangeFilter label="Ingested At Range" dateFrom={ingestedFrom} dateTo={ingestedTo} onChangeFrom={(v) => { setIngestedFrom(v); setPage(1) }} onChangeTo={(v) => { setIngestedTo(v); setPage(1) }} />
        </>
      }
    />
  )

  if (viewingLaunch) {
    return <LaunchDetailsPage launch={viewingLaunch} onBack={() => setViewingLaunch(null)} />
  }

  return (
    <div className={cn("space-y-4", !embedded && "p-6")}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Launches</h1>
            <p className="text-sm text-muted-foreground">Manage project launches and releases</p>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabKey); setSelectedIds([]); setPage(1) }} className="w-full">
        <TabsList className="bg-secondary">
          {!scoped && (
            <TabsTrigger value="all" className="data-[state=active]:bg-card">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              All
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-gray-200 bg-gray-100 px-1 text-[10px] font-semibold text-gray-600">
                {launches.length}
              </span>
            </TabsTrigger>
          )}
          {!scoped && (
            <TabsTrigger value="pending" className="data-[state=active]:bg-card">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Pending Review
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-amber-200 bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                {pendingCount}
              </span>
            </TabsTrigger>
          )}
          <TabsTrigger value="listed" className="data-[state=active]:bg-card">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Listed
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
              {scopedLaunches.filter(isIngested).length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-card">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Currently Active
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-emerald-200 bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-700">
              {scopedLaunches.filter((l) => isIngested(l) && l.launchStatus === "Active").length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── ALL ────────────────────────────────────────────────────────────── */}
        {!scoped && (
        <TabsContent value="all" className="mt-4 space-y-4">
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
                  <div className={`rounded-lg bg-${color}-100 p-2`}>
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
          {toolbar}
          {renderTable("Launches", (
            <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Launch</Button>
          ))}
        </TabsContent>
        )}

        {/* ── PENDING REVIEW ─────────────────────────────────────────────────── */}
        {!scoped && (
        <TabsContent value="pending" className="mt-4 space-y-4">
          {toolbar}
          {renderTable("Pending Review")}
        </TabsContent>
        )}

        {/* ── LISTED ─────────────────────────────────────────────────────────── */}
        <TabsContent value="listed" className="mt-4 space-y-4">
          {toolbar}
          <p className="text-xs text-muted-foreground">Drag rows to reorder. Order reflects on Nawy Listing website and Mobile App.</p>
          {renderTable("Listed Launches")}
        </TabsContent>

        {/* ── CURRENTLY ACTIVE ───────────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-4 space-y-4">
          {toolbar}
          <p className="text-xs text-muted-foreground">Drag rows to reorder. Order reflects on Nawy Listing website and Mobile App.</p>
          {renderTable("Currently Active")}
        </TabsContent>
      </Tabs>

      {/* ── Bulk actions ──────────────────────────────────────────────────────── */}
      <FloatingBulkBar
        count={selectedIds.length}
        total={rows.length}
        onSelectAll={() => setSelectedIds(rows.map((l) => l.id))}
        onClear={() => setSelectedIds([])}
      >
        {tab === "pending" && (
          <>
            <BulkBarButton icon={<CheckCircle className="h-3.5 w-3.5 text-zinc-400" />} onClick={() => setDialog({ kind: "bulk-approve" })}>Approve</BulkBarButton>
            <BulkBarButton icon={<XCircle className="h-3.5 w-3.5 text-zinc-400" />} onClick={() => setDialog({ kind: "bulk-reject" })}>Reject</BulkBarButton>
          </>
        )}
        {tab === "active" && (
          <>
            <BulkBarButton icon={<Eye className="h-3.5 w-3.5 text-zinc-400" />} onClick={() => setDialog({ kind: "bulk-list-active" })}>Listing: Active</BulkBarButton>
            <BulkBarButton icon={<XCircle className="h-3.5 w-3.5 text-zinc-400" />} onClick={() => setDialog({ kind: "bulk-list-hidden" })}>Listing: Hidden</BulkBarButton>
          </>
        )}
        {tab !== "active" && (
          <BulkBarButton icon={<Download className="h-3.5 w-3.5 text-zinc-400" />} onClick={bulkExport}>Export</BulkBarButton>
        )}
      </FloatingBulkBar>

      {/* ── All Filters drawer — same filters, order and logic as the toolbar ── */}
      <Sheet open={showAllFilters} onOpenChange={setShowAllFilters}>
        <SheetContent className="flex w-[420px] flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle>All Filters</SheetTitle>
              {activeFilterCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">{activeFilterCount} active</span>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {!scoped && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Developer</p>
                <FilterMultiSelect label="Developer" options={DEVELOPERS} value={developerF} onChange={(v) => { setDeveloperF(v); setPage(1) }} tone="danger" className="w-full" />
              </div>
            )}
            {!scoped && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Area</p>
                <FilterMultiSelect label="Area" options={AREAS} value={areaF} onChange={(v) => { setAreaF(v); setPage(1) }} tone="danger" className="w-full" />
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Source</p>
              <FilterSelect label="Source" value={sourceF === "all" ? "" : sourceF} options={["WhatsApp", "Manual"]} onChange={(v) => { setSourceF(v || "all"); setPage(1) }} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Already Created</p>
              <FilterSelect label="Already Created" value={alreadyCreatedF === "all" ? "" : alreadyCreatedF} options={["Existing", "New"]} onChange={(v) => { setAlreadyCreatedF(v || "all"); setPage(1) }} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">AI Updates</p>
              <FilterSelect label="AI Updates" value={aiUpdatesF === "all" ? "" : aiUpdatesF} options={["New update"]} onChange={(v) => { setAiUpdatesF(v || "all"); setPage(1) }} className="w-full" />
            </div>
            {tab !== "active" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Launch Status</p>
                <FilterSelect label="Launch Status" value={launchStatusF === "all" ? "" : launchStatusF} options={["Upcoming", "Active", "Closed"]} onChange={(v) => { setLaunchStatusF(v || "all"); setPage(1) }} className="w-full" />
              </div>
            )}
            {!scoped && tab !== "pending" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Approval</p>
                <FilterSelect label="Approval" value={approvalF === "all" ? "" : approvalF} options={["Pending Review", "Approved", "Rejected"]} onChange={(v) => { setApprovalF(v || "all"); setPage(1) }} className="w-full" />
              </div>
            )}
            {!scoped && tab !== "listed" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Ingestion</p>
                <FilterSelect label="Ingestion" value={ingestionF === "all" ? "" : ingestionF} options={["Ingested", "Not Ingested"]} onChange={(v) => { setIngestionF(v || "all"); setPage(1) }} className="w-full" />
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Listing</p>
              <FilterSelect label="Listing" value={listingF === "all" ? "" : listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v || "all"); setPage(1) }} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Created Date Range</p>
              <DateRangeFilter label="Created Date Range" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Sent At Range</p>
              <DateRangeFilter label="Sent At Range" dateFrom={sentFrom} dateTo={sentTo} onChangeFrom={(v) => { setSentFrom(v); setPage(1) }} onChangeTo={(v) => { setSentTo(v); setPage(1) }} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Ingested At Range</p>
              <DateRangeFilter label="Ingested At Range" dateFrom={ingestedFrom} dateTo={ingestedTo} onChangeFrom={(v) => { setIngestedFrom(v); setPage(1) }} onChangeTo={(v) => { setIngestedTo(v); setPage(1) }} className="w-full" />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={clearAllFilters} disabled={activeFilterCount === 0 && !search}>
              <X className="h-3.5 w-3.5 mr-1" />Clear All
            </Button>
            <Button size="sm" className="h-8" onClick={() => setShowAllFilters(false)}>Done</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Customize Columns — shared sheet (order / hide / freeze), same as detailed properties ── */}
      <ColumnsSheet
        open={showColumnSheet}
        onClose={() => setShowColumnSheet(false)}
        columns={LAUNCH_COLS}
        order={colOrder}
        onOrderChange={setColOrder}
        hidden={hiddenCols}
        onHiddenChange={setHiddenCols}
        frozen={frozenCols}
        onFrozenChange={setFrozenCols}
      />

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <LaunchFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={handleCreate} />

      {dialog?.kind === "archive" && <ArchiveDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doArchive(dialog.launch)} />}
      {dialog?.kind === "approve" && <ApproveDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doApprove(dialog.launch)} />}
      {dialog?.kind === "reject" && <RejectDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doReject(dialog.launch)} />}
      {dialog?.kind === "activate" && <ActivateDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doActivate(dialog.launch)} />}
      {dialog?.kind === "close" && <CloseLaunchDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doCloseLaunch(dialog.launch)} />}
      {(dialog?.kind === "bulk-approve" || dialog?.kind === "bulk-reject" || dialog?.kind === "bulk-list-active" || dialog?.kind === "bulk-list-hidden") && (
        <BulkDialog kind={dialog.kind} count={selectedIds.length} onClose={() => setDialog(null)} onConfirm={() => doBulk(dialog.kind as BulkKind)} />
      )}
    </div>
  )
}

// ── Multi-level sort control (same pattern as the WhatsApp groups table) ──────
function LaunchSortControl({ sorts, setSorts }: { sorts: LaunchSort[]; setSorts: React.Dispatch<React.SetStateAction<LaunchSort[]>> }) {
  const used = new Set(sorts.map((s) => s.key))
  const available = SORT_FIELDS.filter((f) => !used.has(f.key))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={sorts.length ? "default" : "outline"} size="sm" className="h-8 gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />Sort
          {sorts.length > 0 && <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-semibold">{sorts.length}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Multi-level sort</DropdownMenuLabel>
        {sorts.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No sort applied — add a level below.</p>}
        {sorts.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 px-2 py-1.5">
            <span className="w-4 text-[11px] text-muted-foreground">{i + 1}.</span>
            <span className="flex-1 text-sm">{SORT_FIELDS.find((f) => f.key === s.key)?.label}</span>
            <button onClick={() => setSorts((p) => p.map((x, j) => (j === i ? { ...x, dir: "asc" } : x)))} className={cn("rounded p-1", s.dir === "asc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => setSorts((p) => p.map((x, j) => (j === i ? { ...x, dir: "desc" } : x)))} className={cn("rounded p-1", s.dir === "desc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><ArrowDown className="h-3.5 w-3.5" /></button>
            <button onClick={() => setSorts((p) => p.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {available.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Add level</DropdownMenuLabel>
            {available.map((f) => (
              <DropdownMenuItem key={f.key} onSelect={(e) => { e.preventDefault(); setSorts((p) => [...p, { key: f.key, dir: "asc" }]) }} className="text-sm">+ {f.label}</DropdownMenuItem>
            ))}
          </>
        )}
        {sorts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSorts([])} className="text-sm text-red-600">Clear sort</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

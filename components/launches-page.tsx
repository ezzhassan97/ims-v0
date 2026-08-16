"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
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
  ExternalLink,
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
  Copy,
  ChevronDown,
  ArrowRight,
  Undo2,
  Link2,
  Unlink,
} from "lucide-react"
import { toast } from "sonner"
import { Tag, LISTING_COLORS, ENTRY_COLORS, PRIMARY_COLORS } from "@/components/projects-list-page"
import { LaunchDetailsPage } from "@/components/launch-details-page"
import { PROJECTS, PROJECT_DEVELOPERS, type ProjPrimaryStatus, type ProjectRow } from "@/lib/projects-mock"
import { LinkProjectDialog, SYS_DEVELOPERS, sysProjectTree } from "@/components/link-project-dialog"
import { ActionDialog, ActivateDialog, CloseLaunchDialog } from "@/components/launch-status-dialogs"
import {
  useLaunches, patchLaunches, addLaunch, activateLaunch, closeLaunch, uuidOf,
  activeConflictOf, isIngestedLaunch, launchPropsOf, launchAreaId, LAUNCH_AREAS, setProjectPrimary, eoiRangeText,
  type Launch,
} from "@/lib/launches-mock"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, DateRangeFilter,
  FloatingBulkBar, BulkBarButton, IdTag, COL_SEP, ColumnsSheet, ProjectTreeSelect, DeveloperSelect, GroupPager,
  type ManagedColumn, type ProjectTreeNode, type ProjectTreeSelection,
} from "@/components/table-kit"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────


/** New AI update = the last AI update landed after the launch was last updated. */
function hasNewAiUpdate(l: Launch): boolean {
  return !!l.aiUpdates && new Date(l.aiUpdates.lastAt) > new Date(l.updatedAt)
}

// ── Column control (checkbox + ID + actions + order stay fixed) ───────────────
const LAUNCH_COLS: (ManagedColumn & { width: number })[] = [
  { id: "title", label: "Title", width: 220 },
  { id: "description", label: "Description", width: 240 },
  { id: "developer", label: "Developer", width: 230 },
  { id: "projectName", label: "Project Name", width: 190 },
  { id: "phase", label: "Phase", width: 100 },
  { id: "area", label: "Area", width: 130 },
  { id: "isNew", label: "Is New", width: 130 },
  { id: "level", label: "Level", width: 130 },
  { id: "approval", label: "Approval", width: 140 },
  { id: "ingestion", label: "Ingestion Status", width: 140 },
  { id: "launchStatus", label: "Launch Status", width: 130 },
  { id: "type", label: "Type", width: 110 },
  { id: "source", label: "Source", width: 110 },
  { id: "completion", label: "Completion", width: 140 },
  { id: "startDate", label: "Start Date", width: 170 },
  { id: "endDate", label: "End Date", width: 170 },
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

const LOGO = "/placeholder.svg?height=32&width=32"
const AREAS = LAUNCH_AREAS
const AREA_ID: Record<string, string> = Object.fromEntries(LAUNCH_AREAS.map((a) => [a, launchAreaId(a)]))


const DEVELOPERS = [...new Set(PROJECT_DEVELOPERS.map((d) => d.name))]

const EMPTY_FORM: Omit<Launch, "id" | "createdAt" | "updatedAt"> = {
  plans: [],
  offerings: [],
  developer: { name: "", logo: LOGO, id: "" },
  projectNameEn: "",
  projectNameAr: "",
  phase: "",
  phaseAr: "",
  projectLevel: "Main Project",
  area: "",
  areaId: "",
  approvalStatus: "Pending Review",
  ingestionStatus: "Not Ingested",
  listingStatus: "Hidden",
  launchStatus: "Inactive",
  type: "Launch",
  source: "Manual",
  listingCompletion: 0,
  eoiAmount: 0,
  coverImage: "/placeholder.svg?height=200&width=300",
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
  redSoft: "border-red-200 bg-red-50 text-red-600",
} as const

/** Database uuid — truncated mono with hover copy; the numeric id sits underneath. */
function UuidCell({ uuid }: { uuid: string }) {
  return (
    <span className="group/uuid inline-flex items-center gap-1 font-mono text-[10px] leading-none text-muted-foreground" title={uuid}>
      <span className="max-w-[110px] truncate">{uuid}</span>
      <span
        role="button" title="Copy UUID"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(uuid) }}
        className="cursor-pointer opacity-0 transition-opacity group-hover/uuid:opacity-100"
      >
        <Copy className="h-2.5 w-2.5 hover:text-foreground" />
      </span>
    </span>
  )
}

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
      tone === "red" ? "border-red-200 bg-red-50 text-red-600" : "border-gray-200 bg-gray-50 text-gray-600",
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
const LAUNCH_STATUS_TONE: Record<Launch["launchStatus"], keyof typeof CHIP_TONES> = {
  "Active": "green", "Inactive": "grey", "Closed": "redSoft",
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
  scope,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => void
  /** Project-details embed: developer + area are locked; project options come from the scope. */
  scope?: { name: string; isPhase: boolean; mainProject?: string; developer?: string; area?: string; phases?: string[] }
}) {
  const [form, setForm] = useState<Omit<Launch, "id" | "createdAt" | "updatedAt">>({ ...EMPTY_FORM })
  // New launch vs linking to an already-existing system project/phase
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [exDevId, setExDevId] = useState("")
  const [exSel, setExSel] = useState<ProjectTreeSelection>(null)
  const exRow = exSel ? PROJECTS.find((p) => p.id === exSel.id) : undefined

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Prefill + lock from the scope every time the dialog opens
  useEffect(() => {
    if (!open) return
    setMode("new"); setExDevId(""); setExSel(null)
    if (scope) {
      setForm({
        ...EMPTY_FORM,
        developer: { name: scope.developer ?? "", logo: LOGO, id: `DEV-${(scope.developer ?? "XXX").slice(0, 3).toUpperCase()}` },
        area: scope.area ?? "",
        areaId: AREA_ID[scope.area ?? ""] ?? "",
        ...(scope.isPhase
          ? { projectLevel: "Phase" as const, projectNameEn: scope.mainProject ?? scope.name, phase: scope.name }
          : { projectLevel: "Main Project" as const, projectNameEn: scope.name, phase: "" }),
      })
    } else {
      setForm({ ...EMPTY_FORM })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No scroll container — the tree/developer dropdowns overlay past the dialog instead of stretching it. */}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Launch</DialogTitle>
        </DialogHeader>

        {/* New launch vs already-existing project — existing fills the Existing Project column */}
        {!scope && (
          <div className="flex gap-2">
            {([["new", "New Launch", "A brand-new project or phase is created on ingestion."], ["existing", "Already Existing Project", "Link this launch to a project or phase that already exists."]] as const).map(([k, label, desc]) => (
              <button
                key={k} type="button" onClick={() => setMode(k)}
                className={cn(
                  "flex-1 rounded-lg border p-3 text-left transition-colors",
                  mode === k ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
                )}
              >
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        )}

        {!scope && mode === "existing" ? (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Developer</Label>
              <DeveloperSelect developers={SYS_DEVELOPERS} value={exDevId} onChange={(v) => { setExDevId(v); setExSel(null) }} placeholder="Select developer…" />
            </div>
            <div className="space-y-1.5">
              <Label>Project / Phase</Label>
              <ProjectTreeSelect projects={sysProjectTree(exDevId || undefined)} value={exSel} onChange={setExSel} />
            </div>
            <div className="space-y-1.5">
              <Label>Area <span className="text-[10px] font-normal text-muted-foreground">(from the selected project)</span></Label>
              <Input value={exRow?.area ?? ""} disabled placeholder="—" />
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
        ) : (
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <select
              value={form.developer.name}
              disabled={!!scope}
              onChange={(e) => set("developer", { name: e.target.value, logo: LOGO, id: `DEV-${e.target.value.slice(0, 3).toUpperCase()}` })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {scope ? (
                <option value={scope.developer ?? ""}>{scope.developer ?? "—"}</option>
              ) : (
                <>
                  <option value="">Select developer…</option>
                  {DEVELOPERS.map((d) => <option key={d} value={d}>{d}</option>)}
                </>
              )}
            </select>
          </div>

          {!scope && (
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
          )}

          <div className="space-y-1.5">
            <Label>{scope ? "Project / Phase" : <>Project Name En <span className="text-red-500">*</span></>}</Label>
            {scope ? (
              scope.isPhase ? (
                // Phase scope: preselected to this phase, locked
                <select value={scope.name} disabled className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed">
                  <option value={scope.name}>{scope.name} — phase of {scope.mainProject ?? "project"}</option>
                </select>
              ) : (
                // Main-project scope: main project + its phases
                <select
                  value={form.projectLevel === "Main Project" ? "__main__" : form.phase}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "__main__") setForm((prev) => ({ ...prev, projectLevel: "Main Project", projectNameEn: scope.name, phase: "" }))
                    else setForm((prev) => ({ ...prev, projectLevel: "Phase", projectNameEn: scope.name, phase: v }))
                  }}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="__main__">{scope.name} (Main Project)</option>
                  {(scope.phases ?? []).map((ph) => <option key={ph} value={ph}>{ph}</option>)}
                </select>
              )
            ) : form.projectLevel === "Phase" ? (
              <select
                value={form.projectNameEn}
                onChange={(e) => set("projectNameEn", e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select project…</option>
                {PROJECTS.filter((p) => !p.isPhase && !p.isSubProject).map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <Input value={form.projectNameEn} onChange={(e) => set("projectNameEn", e.target.value)} placeholder="Project name" />
            )}
          </div>

          {/* New main-project launch: the Arabic name is mandatory alongside the English one */}
          {!scope && form.projectLevel === "Main Project" && (
            <div className="space-y-1.5">
              <Label>Project Name Ar <span className="text-red-500">*</span></Label>
              <Input dir="rtl" value={form.projectNameAr ?? ""} onChange={(e) => set("projectNameAr", e.target.value)} placeholder="اسم المشروع" />
            </div>
          )}

          {!scope && form.projectLevel === "Phase" ? (
            <>
              <div className="space-y-1.5">
                <Label>Phase Name En <span className="text-red-500">*</span></Label>
                <Input value={form.phase} onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Phase 1" />
              </div>
              <div className="space-y-1.5">
                <Label>Phase Name Ar <span className="text-red-500">*</span></Label>
                <Input dir="rtl" value={form.phaseAr ?? ""} onChange={(e) => set("phaseAr", e.target.value)} placeholder="اسم المرحلة" />
              </div>
            </>
          ) : (
            !scope && form.projectLevel !== "Main Project" && <div />
          )}

          <div className="space-y-1.5">
            <Label>Area {scope && <span className="text-[10px] font-normal text-muted-foreground">(from the selected project)</span>}</Label>
            <select
              value={form.area}
              disabled={!!scope}
              onChange={(e) => set("area", e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {scope ? (
                <option value={form.area}>{form.area || "—"}</option>
              ) : (
                <>
                  <option value="">Select area…</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </>
              )}
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
        )}

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={
              !scope && mode === "existing"
                ? (!exDevId || !exSel)
                : !scope
                ? (form.projectLevel === "Main Project"
                    ? (!form.projectNameEn.trim() || !(form.projectNameAr ?? "").trim())
                    : (!form.projectNameEn.trim() || !form.phase.trim() || !(form.phaseAr ?? "").trim()))
                : false
            }
            onClick={() => {
              if (!scope && mode === "existing" && exSel && exRow) {
                const isPhase = exSel.kind === "phase"
                onSave({
                  ...form,
                  developer: { name: exRow.developer.name, logo: LOGO, id: exRow.developer.id },
                  projectLevel: isPhase ? "Phase" : "Main Project",
                  projectNameEn: isPhase ? exRow.mainProject?.name ?? exRow.name : exRow.name,
                  phase: isPhase ? exRow.name : "",
                  projectId: exRow.id,
                  area: exRow.area,
                  areaId: AREA_ID[exRow.area] ?? "",
                  existingProject: { id: exRow.id, name: exRow.name },
                })
              } else {
                onSave(form)
              }
              onOpenChange(false)
            }}
          >
            Create Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Action dialogs ────────────────────────────────────────────────────────────


function ArchiveDialog({ launch, onClose, onConfirm }: { launch: Launch; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("")
  return (
    <ActionDialog
      title="Archive Launch"
      launch={launch}
      message="This launch moves to Archived — restore it any time from the Archived filter."
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



type BulkKind = "bulk-approve" | "bulk-reject"

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
  | { kind: "archive" | "approve" | "reject" | "activate" | "close" | "link" | "unlink"; launch: Launch }
  | { kind: BulkKind }
  | null

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LaunchesPage({ embedded = false, scopeProject }: {
  embedded?: boolean
  /** `id` + `phaseIds` scope the table to a project's own launches. */
  scopeProject?: { id?: string; phaseIds?: string[]; name: string; isPhase: boolean; mainProject?: string; developer?: string; area?: string; phases?: string[] }
} = {}) {
  const scoped = !!scopeProject
  const launches = useLaunches()
  const [tab, setTab] = useState<TabKey>(scoped ? "listed" : "all")

  // Filters (shared across tabs; per-tab exclusions applied at render/filter time)
  const [search, setSearch] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [areaF, setAreaF] = useState<string[]>([])
  const [projectSels, setProjectSels] = useState<string[]>([])
  const [sourceF, setSourceF] = useState("all")
  const [alreadyCreatedF, setAlreadyCreatedF] = useState("all")
  const [aiUpdatesF, setAiUpdatesF] = useState("all")
  const [launchStatusF, setLaunchStatusF] = useState("all")
  const [approvalF, setApprovalF] = useState("all")
  const [ingestionF, setIngestionF] = useState("all")
  const [listingF, setListingF] = useState("all")
  const [archivedF, setArchivedF] = useState("Live")
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
  // Grouping opens only the first group; the rest start collapsed
  useEffect(() => {
    setCollapsedGroups(new Set((groups ?? []).slice(1).map((g: any) => g.label)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy])
  // Per-group pagination — real data can put hundreds of launches in one group
  const GROUP_PAGE_SIZE = 10
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  useEffect(() => { setGroupPages({}) }, [groupBy, tab])
  const [sorts, setSorts] = useState<LaunchSort[]>([])

  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => LAUNCH_COLS.find((c) => c.id === id)!).filter(Boolean)
  // Sticky-left offset for a frozen column = checkbox (+ Order col on Listed / Currently Active) + preceding frozen widths
  const frozenLeft = (colId: string) => {
    let left = 40 + (dragTab ? 56 : 0)
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }

  const clearAllFilters = () => {
    setSearch(""); setDeveloperF([]); setAreaF([]); setProjectSels([]); setSourceF("all"); setAlreadyCreatedF("all")
    setAiUpdatesF("all"); setLaunchStatusF("all"); setApprovalF("all"); setIngestionF("all")
    setListingF("all"); setCreatedFrom(""); setCreatedTo(""); setSentFrom(""); setSentTo("")
    setIngestedFrom(""); setIngestedTo(""); setArchivedF("Live"); setPage(1)
  }

  // Manual ordering for Listed / Currently Active tabs (rank = position in this array)
  const [activeOrder, setActiveOrder] = useState<string[]>(
    () => launches.filter(isIngestedLaunch).map((l) => l.id),
  )
  const dragId = useRef<string | null>(null)
  // Manual ranking is a global-launches feature only — the project-details embed has no drag
  const dragTab = !scoped && (tab === "active" || tab === "listed")

  // ── Rows per tab ────────────────────────────────────────────────────────────

  const isIngested = isIngestedLaunch

  // Scoped (project details embed): only launches linked to THIS project or its phases,
  // matched on real project ids — no name matching and no show-everything fallback.
  const scopedLaunches = (() => {
    if (!scopeProject) return launches
    const ids = new Set([scopeProject.id, ...(scopeProject.phaseIds ?? [])].filter(Boolean) as string[])
    if (ids.size === 0) return []
    return launches.filter((l) => l.projectId && ids.has(l.projectId) && isIngested(l))
  })()

  // Project dropdown = the real system projects, matched against each launch's projectId.
  const launchProjectTree: ProjectTreeNode[] = useMemo(() => sysProjectTree(), [])

  // Archived launches stay out of every tab — reach them through the Archived filter.
  const baseRows = (t: TabKey): Launch[] => {
    const live = archivedF === "Archived" ? scopedLaunches.filter((l) => l.archived) : scopedLaunches.filter((l) => !l.archived)
    switch (t) {
      case "pending": return live.filter((l) => l.approvalStatus === "Pending Review")
      case "listed": return live.filter(isIngested)
      case "active": return live.filter((l) => isIngested(l) && l.launchStatus === "Active")
      default: return live
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
      if (projectSels.length && !(l.projectId && projectSels.includes(l.projectId))) return false
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
    (developerF.length ? 1 : 0) + (areaF.length ? 1 : 0) + (projectSels.length ? 1 : 0) +
    [sourceF, alreadyCreatedF, aiUpdatesF, listingF].filter((f) => f !== "all").length +
    (archivedF !== "Live" ? 1 : 0) +
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
    inactive: allTabRows.filter((l) => l.launchStatus === "Inactive").length,
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

  const patch = patchLaunches
  /** The linked project row — drives the primary-status opt-out cards. */
  const projectOf = (l: Launch) => PROJECTS.find((p) => p.id === l.projectId)

  const handleCreate = (data: Omit<Launch, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString()
    const newId = `LCH-${String(launches.length + 1).padStart(3, "0")}`
    addLaunch({
      ...data,
      areaId: launchAreaId(data.area),
      sentAt: now,
      id: newId,
      uuid: uuidOf(newId),
      createdAt: now,
      updatedAt: now,
    })
    toast.success("Launch created")
  }

  /** Archive never destroys the row — a project may still point at this launch. */
  const doArchive = (launch: Launch, reason?: string) => {
    patch([launch.id], { archived: true, archivedReason: reason })
    setSelectedIds((prev) => prev.filter((id) => id !== launch.id))
    setDialog(null)
    toast.success(`${launch.projectNameEn} archived — restore it from the Archived filter`)
  }

  const doRestore = (launch: Launch) => {
    patch([launch.id], { archived: false, archivedReason: undefined })
    toast.success(`${launch.projectNameEn} restored`)
  }

  const doApprove = (launch: Launch) => {
    patch([launch.id], { approvalStatus: "Approved" })
    setDialog(null)
    toast.success(`${launch.projectNameEn} approved`)
  }

  const doReject = (launch: Launch, reason?: string) => {
    patch([launch.id], { approvalStatus: "Rejected", rejectionReason: reason })
    setDialog(null)
    toast.success(`${launch.projectNameEn} rejected`)
  }

  /** The start date is persisted; the store closes whichever launch conflicts. */
  const doActivate = (launch: Launch, startDate: string, syncProject: boolean) => {
    const { closedId } = activateLaunch(launch.id, startDate)
    if (closedId) setActiveOrder((prev) => prev.filter((id) => id !== closedId))
    setActiveOrder((prev) => (prev.includes(launch.id) ? prev : [...prev, launch.id]))
    if (syncProject && launch.projectId) setProjectPrimary(launch.projectId, "Launch")
    setDialog(null)
    const closed = closedId ? launches.find((l) => l.id === closedId) : undefined
    toast.success(
      closed
        ? `${launch.projectNameEn} is now the active launch — ${closed.projectNameEn} (${closed.id}) was closed`
        : `${launch.projectNameEn} is now an active launch`,
    )
  }

  const doCloseLaunch = (launch: Launch, endDate: string, nextPrimary?: ProjPrimaryStatus) => {
    closeLaunch(launch.id, endDate)
    setActiveOrder((prev) => prev.filter((id) => id !== launch.id))
    if (nextPrimary && launch.projectId) setProjectPrimary(launch.projectId, nextPrimary)
    setDialog(null)
    toast.success(`${launch.projectNameEn} closed — sales portal notified`)
  }

  const doLink = (launch: Launch, row: (typeof PROJECTS)[number], isPhase: boolean) => {
    patch([launch.id], {
      existingProject: { id: row.id, name: row.name },
      projectId: row.id,
      developer: { name: row.developer.name, logo: LOGO, id: row.developer.id },
      projectLevel: isPhase ? "Phase" : "Main Project",
      projectNameEn: isPhase ? row.mainProject?.name ?? row.name : row.name,
      phase: isPhase ? row.name : "",
      area: row.area,
      areaId: AREA_ID[row.area] ?? "",
    })
    setDialog(null)
    toast.success(`${launch.id} linked to ${row.name} (${row.id})`)
  }

  const doUnlink = (launch: Launch) => {
    patch([launch.id], { existingProject: undefined, projectId: undefined })
    setDialog(null)
    toast.success(`${launch.id} unlinked — a new ${launch.projectLevel === "Phase" ? "phase" : "project"} will be created on ingestion`)
  }

  const doBulk = (kind: BulkKind) => {
    if (kind === "bulk-approve") patch(selectedIds, { approvalStatus: "Approved" })
    if (kind === "bulk-reject") patch(selectedIds, { approvalStatus: "Rejected" })
    const msg = {
      "bulk-approve": "approved", "bulk-reject": "rejected",
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

  /** Opens the Listing Project details page — only meaningful once the launch is ingested. */
  const viewProjectItem = (l: Launch) => {
    const enabled = l.ingestionStatus === "Ingested" && !!l.listingProject
    return (
      <DropdownMenuItem
        disabled={!enabled}
        className={cn(!enabled && "opacity-40")}
        onClick={() => enabled && window.open(`/projects/${l.listingProject!.id}`, "_blank", "noopener,noreferrer")}
      >
        <ExternalLink className="h-4 w-4 mr-2" />View Project
      </DropdownMenuItem>
    )
  }

  /** Link/unlink to an existing system project — only before ingestion. */
  const linkProjectItem = (l: Launch) => {
    const enabled = l.ingestionStatus !== "Ingested"
    return l.existingProject ? (
      <>
        {/* Ingested launches can still change WHICH project they link to — just never back to New */}
        <DropdownMenuItem onClick={() => setDialog({ kind: "link", launch: l })}>
          <Link2 className="h-4 w-4 mr-2" />Change Linked Project
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!enabled} className={cn(!enabled && "opacity-40")}
          onClick={() => enabled && setDialog({ kind: "unlink", launch: l })}
        >
          <Unlink className="h-4 w-4 mr-2" />Unlink Project
        </DropdownMenuItem>
      </>
    ) : (
      <DropdownMenuItem
        disabled={!enabled} className={cn(!enabled && "opacity-40")}
        onClick={() => enabled && setDialog({ kind: "link", launch: l })}
      >
        <Link2 className="h-4 w-4 mr-2" />Link to Existing Project
      </DropdownMenuItem>
    )
  }

  /** Same submenu everywhere — gated on the launch being ingested. */
  const changeLaunchStatusItem = (l: Launch) => {
    const dim = !isIngestedLaunch(l)
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={dim} className={cn(dim && "opacity-40")}>
          <Activity className="h-4 w-4 mr-2" />Change Launch Status
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem disabled={l.launchStatus === "Active"} onClick={() => setDialog({ kind: "activate", launch: l })}>
            <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Set Active
          </DropdownMenuItem>
          <DropdownMenuItem disabled={l.launchStatus === "Closed"} onClick={() => setDialog({ kind: "close", launch: l })}>
            <XCircle className="h-4 w-4 mr-2 text-red-600" />Set Closed
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

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
            {viewProjectItem(l)}
            {linkProjectItem(l)}
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
            {changeLaunchStatusItem(l)}
            <DropdownMenuSeparator />
            {l.archived ? (
              <DropdownMenuItem onClick={() => doRestore(l)}>
                <Undo2 className="h-4 w-4 mr-2" />Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={l.ingestionStatus === "Ingested"}
                className={cn("text-destructive focus:text-destructive", l.ingestionStatus === "Ingested" && "opacity-40")}
                onClick={() => setDialog({ kind: "archive", launch: l })}
              >
                <Archive className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
            )}
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
            {viewProjectItem(l)}
            {linkProjectItem(l)}
            <DropdownMenuSeparator />
            {changeLaunchStatusItem(l)}
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
          {viewProjectItem(l)}
          {linkProjectItem(l)}
          <DropdownMenuSeparator />
          {changeLaunchStatusItem(l)}
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
      case "launchStatus": return <Chip tone={LAUNCH_STATUS_TONE[l.launchStatus]}>{l.launchStatus}</Chip>
      case "title": return l.title
        ? <span className="block max-w-[220px] truncate text-sm text-foreground" title={l.title}>{l.title}</span>
        : <span className="text-xs text-muted-foreground">—</span>
      case "description": return l.description
        ? <span className="block max-w-[240px] truncate text-xs text-muted-foreground" title={l.description}>{l.description}</span>
        : <span className="text-xs text-muted-foreground">—</span>
      // New = ingestion creates a brand-new project; Already Existed = linked to a system project
      case "isNew": return (l.existingProject || l.projectId)
        ? <Chip tone="blue">Already Existed</Chip>
        : <Chip tone="green">New</Chip>
      case "type": return <Chip tone={l.type === "Launch" ? "green" : "white"}>{l.type}</Chip>
      case "source": return <Chip tone={l.source === "WhatsApp" ? "green" : "white"}>{l.source}</Chip>
      case "startDate": return <span className="whitespace-nowrap text-xs text-muted-foreground">{l.startDate ? formatDate(l.startDate) : "—"}</span>
      case "endDate": return <span className="whitespace-nowrap text-xs text-muted-foreground">{l.endDate ? formatDate(l.endDate) : "—"}</span>
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

        {/* ID — the uuid, with the numeric id captioned underneath (ingested only) */}
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <UuidCell uuid={l.uuid ?? l.id} />
            {isIngested(l) && <IdTag value={l.id.replace(/\D/g, "")} />}
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
                        {!collapsedGroups.has(g.label) && (
                          <GroupPager total={g.rows.length} page={groupPages[g.label] ?? 1} pageSize={GROUP_PAGE_SIZE} onPage={(pg) => setGroupPages((prev) => ({ ...prev, [g.label]: pg }))} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {!collapsedGroups.has(g.label) && g.rows.slice(((groupPages[g.label] ?? 1) - 1) * GROUP_PAGE_SIZE, (groupPages[g.label] ?? 1) * GROUP_PAGE_SIZE).map((l, idx) => renderRow(l, idx))}
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
          {!scoped && <ProjectTreeSelect multi projects={launchProjectTree} values={projectSels} onValuesChange={(v) => { setProjectSels(v); setPage(1) }} className="w-44" />}
          <FilterSelect label="Source" value={sourceF === "all" ? "" : sourceF} options={["WhatsApp", "Manual"]} onChange={(v) => { setSourceF(v || "all"); setPage(1) }} className="w-32" />
          <FilterSelect label="Already Created" value={alreadyCreatedF === "all" ? "" : alreadyCreatedF} options={["Existing", "New"]} onChange={(v) => { setAlreadyCreatedF(v || "all"); setPage(1) }} className="w-40" />
          <FilterSelect label="AI Updates" value={aiUpdatesF === "all" ? "" : aiUpdatesF} options={["New update"]} onChange={(v) => { setAiUpdatesF(v || "all"); setPage(1) }} className="w-36" />
          {tab !== "active" && (
            <FilterSelect label="Launch Status" value={launchStatusF === "all" ? "" : launchStatusF} options={["Inactive", "Active", "Closed"]} onChange={(v) => { setLaunchStatusF(v || "all"); setPage(1) }} className="w-38" />
          )}
          {!scoped && tab !== "pending" && (
            <FilterSelect label="Approval" value={approvalF === "all" ? "" : approvalF} options={["Pending Review", "Approved", "Rejected"]} onChange={(v) => { setApprovalF(v || "all"); setPage(1) }} className="w-36" />
          )}
          {!scoped && tab !== "listed" && (
            <FilterSelect label="Ingestion" value={ingestionF === "all" ? "" : ingestionF} options={["Ingested", "Not Ingested"]} onChange={(v) => { setIngestionF(v || "all"); setPage(1) }} className="w-36" />
          )}
          <FilterSelect label="Listing" value={listingF === "all" ? "" : listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v || "all"); setPage(1) }} className="w-32" />
          <FilterSelect label="Archive" value={archivedF} options={["Live", "Archived"]} onChange={(v) => { setArchivedF(v || "Live"); setPage(1) }} className="w-32" />
          <DateRangeFilter label="Created Date Range" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} />
          <DateRangeFilter label="Sent At Range" dateFrom={sentFrom} dateTo={sentTo} onChangeFrom={(v) => { setSentFrom(v); setPage(1) }} onChangeTo={(v) => { setSentTo(v); setPage(1) }} />
          <DateRangeFilter label="Ingested At Range" dateFrom={ingestedFrom} dateTo={ingestedTo} onChangeFrom={(v) => { setIngestedFrom(v); setPage(1) }} onChangeTo={(v) => { setIngestedTo(v); setPage(1) }} />
        </>
      }
    />
  )

  if (viewingLaunch) {
    return (
      <LaunchDetailsPage
        launch={viewingLaunch}
        onBack={() => setViewingLaunch(null)}
        allLaunches={launches}
        // Ingesting over an existing project closes its currently-active launch
        onResolveConflict={(closedId) => patch([closedId], { launchStatus: "Closed" })}
      />
    )
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
              { label: "Inactive", value: stats.inactive, icon: XCircle, color: "gray" },
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
          {dragTab && <p className="text-xs text-muted-foreground">Drag rows to reorder. Order reflects on Nawy Listing website and Mobile App.</p>}
          {renderTable("Listed Launches", scoped ? (
            <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Launch</Button>
          ) : undefined)}
        </TabsContent>

        {/* ── CURRENTLY ACTIVE ───────────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-4 space-y-4">
          {toolbar}
          {dragTab && <p className="text-xs text-muted-foreground">Drag rows to reorder. Order reflects on Nawy Listing website and Mobile App.</p>}
          {renderTable("Currently Active", scoped ? (
            <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Launch</Button>
          ) : undefined)}
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
            {!scoped && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Project</p>
                <ProjectTreeSelect multi projects={launchProjectTree} values={projectSels} onValuesChange={(v) => { setProjectSels(v); setPage(1) }} className="w-full" />
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
                <FilterSelect label="Launch Status" value={launchStatusF === "all" ? "" : launchStatusF} options={["Inactive", "Active", "Closed"]} onChange={(v) => { setLaunchStatusF(v || "all"); setPage(1) }} className="w-full" />
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
              <p className="text-xs font-medium text-foreground">Archive</p>
              <FilterSelect label="Archive" value={archivedF} options={["Live", "Archived"]} onChange={(v) => { setArchivedF(v || "Live"); setPage(1) }} className="w-full" />
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
      <LaunchFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={handleCreate} scope={scopeProject} />

      {dialog?.kind === "archive" && <ArchiveDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={(reason) => doArchive(dialog.launch, reason)} />}
      {dialog?.kind === "approve" && <ApproveDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={() => doApprove(dialog.launch)} />}
      {dialog?.kind === "reject" && <RejectDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={(reason) => doReject(dialog.launch, reason)} />}
      {dialog?.kind === "activate" && <ActivateDialog launch={dialog.launch} conflict={activeConflictOf(dialog.launch, launches)} project={projectOf(dialog.launch)} onClose={() => setDialog(null)} onConfirm={(startDate, sync) => doActivate(dialog.launch, startDate, sync)} />}
      {dialog?.kind === "close" && <CloseLaunchDialog launch={dialog.launch} project={projectOf(dialog.launch)} onClose={() => setDialog(null)} onConfirm={(endDate, nextPrimary) => doCloseLaunch(dialog.launch, endDate, nextPrimary)} />}
      {dialog?.kind === "link" && <LinkProjectDialog launch={dialog.launch} onClose={() => setDialog(null)} onConfirm={(row, isPhase) => doLink(dialog.launch, row, isPhase)} />}
      {dialog?.kind === "unlink" && (
        <ActionDialog
          title="Unlink Project"
          launch={dialog.launch}
          message={`This launch is linked to ${dialog.launch.existingProject?.name} (${dialog.launch.existingProject?.id}). Unlinking means ingestion will create a brand-new ${dialog.launch.projectLevel === "Phase" ? "phase" : "project"} instead — you'll need to enter its EN/AR names and area during ingestion.`}
          confirmLabel="Unlink Project"
          confirmClass="bg-red-600 text-white hover:bg-red-700"
          onClose={() => setDialog(null)}
          onConfirm={() => doUnlink(dialog.launch)}
        />
      )}
      {(dialog?.kind === "bulk-approve" || dialog?.kind === "bulk-reject") && (
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

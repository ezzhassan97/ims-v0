"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, Save, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Launch, LAUNCH_AREAS, launchAreaId, launchPropsOf, launchesForProject, isIngestedLaunch, launchesSnapshot } from "@/lib/launches-mock"
import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"
import { SYS_DEVELOPERS, sysProjectTree } from "@/components/link-project-dialog"
import { DeveloperSelect, ProjectTreeSelect, type ProjectTreeSelection } from "@/components/table-kit"

const LOGO = "/placeholder.svg?height=32&width=32"
const AREA_ID: Record<string, string> = Object.fromEntries(LAUNCH_AREAS.map((a) => [a, launchAreaId(a)]))
const DEVELOPERS = [...new Set(PROJECT_DEVELOPERS.map((d) => d.name))]

export type LaunchFormData = Omit<Launch, "id" | "createdAt" | "updatedAt">

export type LaunchScope = {
  name: string
  isPhase: boolean
  mainProject?: string
  developer?: string
  area?: string
  phases?: string[]
  /** Real system ids so scoped creates come out linked (ingestable) from the start. */
  id?: string
  mainProjectId?: string
  phaseOptions?: { id: string; name: string }[]
}

const EMPTY_FORM: LaunchFormData = {
  plans: [],
  offerings: [],
  developer: { name: "", logo: LOGO, id: "" },
  projectNameEn: "",
  projectNameAr: "",
  phase: "",
  phaseAr: "",
  title: "",
  description: "",
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

// Editable fields sit on the slightly-grey dialog/page background, so they get an
// explicit card-white fill; disabled ones flip to muted grey.
const FIELD = "bg-card"
const SELECT = "w-full border border-border rounded-md px-3 py-2 text-sm bg-card disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"

type LinkState = {
  form: LaunchFormData
  set: (key: keyof LaunchFormData, value: unknown) => void
  setForm: React.Dispatch<React.SetStateAction<LaunchFormData>>
  exDevId: string
  setExDevId: (v: string) => void
  exSel: ProjectTreeSelection
  setExSel: (v: ProjectTreeSelection) => void
  exRow?: (typeof PROJECTS)[number]
}

/** Shared form state for the dialog and the details-tab card — prefill mirrors the launch's linkage. */
function useLinkState(active: boolean, initial?: Launch, scope?: LaunchScope, resetKey?: string): LinkState {
  const [form, setForm] = useState<LaunchFormData>({ ...EMPTY_FORM })
  const [exDevId, setExDevId] = useState("")
  const [exSel, setExSel] = useState<ProjectTreeSelection>(null)
  const exRow = exSel ? PROJECTS.find((p) => p.id === exSel.id) : undefined

  const set = (key: keyof LaunchFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!active) return
    // Every launch links to an existing project/phase — unlinked ones (WhatsApp
    // free-text detections) just have empty pickers plus the detected-names card.
    setExDevId(""); setExSel(null)
    if (initial) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = initial
      setForm(rest as LaunchFormData)
      // Matched launches open in "existing" with the picker prefilled from the current linkage
      const matched = initial.projectLevel === "Phase" ? !!(initial.projectId && initial.parentProjectId) : !!initial.projectId
      if (matched && initial.projectId) {
        setExDevId(initial.developer.id)
        setExSel({
          kind: initial.projectLevel === "Phase" ? "phase" : "project",
          id: initial.projectId,
          label: initial.projectLevel === "Phase" ? initial.phase : initial.projectNameEn,
          projectIds: [initial.projectId],
        })
      } else if (initial.source === "WhatsApp") {
        // The developer is CONFIRMED by the WhatsApp group the launch came from —
        // preselect it so the project tree opens already scoped to that developer
        const dev = PROJECT_DEVELOPERS.find((d) => d.name.toLowerCase() === initial.developer.name.toLowerCase())
        if (dev) setExDevId(dev.id)
      }
      return
    }
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
  }, [active, resetKey])

  return { form, set, setForm, exDevId, setExDevId, exSel, setExSel, exRow }
}

/** Linkage fields the picked system project/phase overwrites on save. */
function remapOf(s: LinkState): Partial<Launch> | null {
  if (!s.exSel || !s.exRow) return null
  const isPhase = s.exSel.kind === "phase"
  const exRow = s.exRow
  return {
    developer: { name: exRow.developer.name, logo: LOGO, id: exRow.developer.id },
    projectLevel: (isPhase ? "Phase" : "Main Project") as Launch["projectLevel"],
    projectNameEn: isPhase ? exRow.mainProject?.name ?? exRow.name : exRow.name,
    phase: isPhase ? exRow.name : "",
    projectId: exRow.id,
    parentProjectId: isPhase ? exRow.mainProject?.id : undefined,
    area: exRow.area,
    areaId: AREA_ID[exRow.area] ?? "",
    existingProject: { id: exRow.id, name: exRow.name },
  }
}

/** Edit-mode patch: relink when a pick was made, otherwise keep the current linkage. */
function editPatch(s: LinkState): Partial<Launch> {
  const remap = remapOf(s)
  return remap ? { ...s.form, ...remap } : { ...s.form }
}

function DetectedRow({ label, value, sub, matchedId, unmatchedTag, unmatchedTone = "red" }: {
  label: string
  value: string
  sub?: string
  /** System id shown as a caption when this level is matched. */
  matchedId?: string
  /** Tag shown when this level has no system id (same treatment as the table). */
  unmatchedTag?: string
  unmatchedTone?: "red" | "grey"
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      {sub && <p dir="rtl" className="text-xs text-muted-foreground">{sub}</p>}
      {matchedId ? (
        <p className="font-mono text-[10px] text-muted-foreground">ID: {matchedId}</p>
      ) : unmatchedTag ? (
        <span className={cn(
          "mt-0.5 inline-flex w-fit items-center whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-medium",
          unmatchedTone === "red" ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 bg-gray-50 text-gray-500",
        )}>{unmatchedTag}</span>
      ) : null}
    </div>
  )
}

/** Everything below the title/description — detected-names helper + the linkage pickers. */
function LinkFormBody({ s, scope, locked, unlinked }: { s: LinkState; scope?: LaunchScope; locked?: boolean; unlinked?: boolean }) {
  const { form, set, setForm, exDevId, setExDevId, exSel, setExSel, exRow } = s
  const dis = !!locked
  const entity = form.projectLevel === "Phase" ? "phase" : "project"

  if (scope) return (
    <div className="grid grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5">
        <Label>Developer</Label>
        <select value={form.developer.name} disabled className={SELECT}>
          <option value={scope.developer ?? ""}>{scope.developer ?? "—"}</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Project / Phase</Label>
        {scope.isPhase ? (
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
            className={SELECT}
          >
            <option value="__main__">{scope.name} (Main Project)</option>
            {(scope.phases ?? []).map((ph) => <option key={ph} value={ph}>{ph}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Area <span className="text-[10px] font-normal text-muted-foreground">(from the selected project)</span></Label>
        <select value={form.area} disabled className={SELECT}>
          <option value={form.area}>{form.area || "—"}</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <select value={form.type} onChange={(e) => set("type", e.target.value as Launch["type"])} className={SELECT}>
          <option value="Launch">Launch</option>
          <option value="Release">Release</option>
        </select>
      </div>
    </div>
  )

  return (
    <>
      {/* AI-detected names from the WhatsApp messages — context that helps the user find
          the right project/phase in the pickers below, never payload */}
      {unlinked && form.source === "WhatsApp" && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
            <Sparkles className="h-3 w-3" />Suggested by AI — detected from WhatsApp
          </p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            <DetectedRow label="Level" value={form.projectLevel} />
            <DetectedRow
              label={form.projectLevel === "Phase" ? "Parent Project" : "Project"}
              value={form.projectNameEn}
              sub={form.projectNameAr}
              matchedId={form.projectLevel === "Phase" ? form.parentProjectId : form.projectId}
              unmatchedTag="Unmatched Project"
            />
            {form.projectLevel === "Phase" && (
              <DetectedRow label="Phase" value={form.phase} sub={form.phaseAr} matchedId={form.projectId} unmatchedTag="New Phase" unmatchedTone="grey" />
            )}
            <DetectedRow label="Area" value={form.area} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5">
          <Label>
            Developer
            {!dis && form.source === "WhatsApp" && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">(confirmed by the WhatsApp group)</span>
            )}
          </Label>
          {dis || form.source === "WhatsApp" ? (
            <Input value={form.developer.name} disabled className="disabled:bg-muted" />
          ) : (
            <div className="rounded-md bg-card">
              <DeveloperSelect developers={SYS_DEVELOPERS} value={exDevId} onChange={(v) => { setExDevId(v); setExSel(null) }} placeholder="Select developer…" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Project / Phase</Label>
          {dis ? (
            <Input value={form.projectLevel === "Phase" ? `${form.phase} — ${form.projectNameEn}` : form.projectNameEn} disabled className="disabled:bg-muted" />
          ) : (
            <div className="rounded-md bg-card">
              <ProjectTreeSelect projects={sysProjectTree(exDevId || undefined)} value={exSel} onChange={setExSel} />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Area <span className="text-[10px] font-normal text-muted-foreground">(from the selected project)</span></Label>
          <Input value={(exRow?.area ?? (dis || !exSel ? form.area : "")) || ""} disabled className="disabled:bg-muted" placeholder="—" />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select value={form.type} disabled={dis} onChange={(e) => set("type", e.target.value as Launch["type"])} className={SELECT}>
            <option value="Launch">Launch</option>
            <option value="Release">Release</option>
          </select>
        </div>
      </div>

      {unlinked && !exSel && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
          Launch must be linked to a project or phase in the system before ingestion. If you can't find the
          phase or project, create it in the Projects page to be able to link this launch to it.
        </p>
      )}
    </>
  )
}

/** Scoped creates link to the scope's real ids, so they're ingestable immediately. */
function scopeLink(scope: LaunchScope | undefined, form: LaunchFormData): Partial<Launch> {
  if (!scope?.id) return {}
  if (scope.isPhase) return { projectId: scope.id, parentProjectId: scope.mainProjectId, existingProject: { id: scope.id, name: scope.name } }
  if (form.projectLevel === "Main Project") return { projectId: scope.id, existingProject: { id: scope.id, name: scope.name } }
  const ph = scope.phaseOptions?.find((p) => p.name === form.phase)
  return ph
    ? { projectId: ph.id, parentProjectId: scope.id, existingProject: { id: ph.id, name: ph.name } }
    : { parentProjectId: scope.id }
}

export function LaunchFormDialog({
  open,
  onOpenChange,
  onSave,
  onEdit,
  initial,
  scope,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: LaunchFormData) => void
  /** Edit mode — patches the launch instead of creating one. */
  onEdit?: (id: string, patch: Partial<Launch>) => void
  initial?: Launch
  /** Project-details embed: developer + area are locked; project options come from the scope. */
  scope?: LaunchScope
}) {
  const s = useLinkState(open, initial, scope)
  const { form, set, exDevId, exSel } = s
  const unlinked = !!initial && !(initial.projectLevel === "Phase" ? initial.projectId && initial.parentProjectId : initial.projectId)
  const editIngested = initial?.ingestionStatus === "Ingested"
  const editActive = initial?.launchStatus === "Active"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No scroll container — the tree/developer dropdowns overlay past the dialog instead of stretching it. */}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Change Linked Project" : "Create Launch"}</DialogTitle>
        </DialogHeader>

        {/* Website copy — title mandatory; the description gets a full-width textarea for longer text */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Launch title" className={FIELD} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Launch description shown on the website" rows={3} className={cn(FIELD, "resize-none")} />
          </div>
        </div>

        <LinkFormBody s={s} scope={scope} unlinked={unlinked} locked={editIngested && editActive} />

        {/* Ingested + inactive: the launch can move, but its properties move with it */}
        {initial && editIngested && !editActive && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
            Changing the linked project or phase moves this launch along with its{" "}
            <span className="font-semibold">{launchPropsOf(initial)} launch propert{launchPropsOf(initial) === 1 ? "y" : "ies"}</span> — the
            properties' titles will be updated with the move.
          </p>
        )}
        {/* Ingested + ACTIVE: linkage is frozen until the launch is closed */}
        {initial && editIngested && editActive && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
            This launch <span className="font-semibold">can't move under a different project or phase while it is Active</span> —
            change this project or phase's Primary Status to close the launch, then move it.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={
              !(form.title ?? "").trim() ? true
              // Creation must link; editing an unlinked launch may save without a pick (stays unlinked)
              : !scope && !initial
                ? (!exDevId || !exSel)
                : false
            }
            onClick={() => {
              const remap = remapOf(s)
              if (initial && onEdit) {
                onEdit(initial.id, editPatch(s))
              } else if (!scope && remap) {
                onSave({ ...form, ...remap })
              } else {
                onSave({ ...form, ...scopeLink(scope, form) })
              }
              onOpenChange(false)
            }}
          >
            {initial ? "Save Changes" : "Create Launch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Project Details tab card — the same linkage form as the popup, minus
 * title/description. Editable until the launch is ingested, then locked.
 */
export function LaunchProjectDetailsCard({ launch, onPatch }: { launch: Launch; onPatch: (patch: Partial<Launch>) => void }) {
  const ingested = launch.ingestionStatus === "Ingested"
  const active = launch.launchStatus === "Active"
  // Same rules as the Change Linked Project popup: frozen only while ACTIVE
  const frozen = ingested && active
  const [editing, setEditing] = useState(false)
  const s = useLinkState(true, launch, undefined, `${launch.id}:${launch.updatedAt}:${editing}`)
  const unlinked = !(launch.projectLevel === "Phase" ? launch.projectId && launch.parentProjectId : launch.projectId)

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Project Details</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {frozen
              ? "Active — the linked project is frozen while the launch is running."
              : ingested
              ? "Ingested — the link can still change while the launch isn't Active; its properties move with it."
              : "Every launch links to an existing project or phase — the link can change until the launch is ingested."}
          </p>
        </div>
        {!frozen && (editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
            <Button size="sm" className="h-8" onClick={() => { onPatch(editPatch(s)); setEditing(false) }}>
              <Save className="h-3.5 w-3.5 mr-1" />Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
        ))}
      </div>
      <div className="grid gap-4">
        <LinkFormBody s={s} locked={frozen || !editing} unlinked={unlinked} />
        {editing && ingested && !active && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
            Changing the linked project or phase moves this launch along with its{" "}
            <span className="font-semibold">{launchPropsOf(launch)} launch propert{launchPropsOf(launch) === 1 ? "y" : "ies"}</span> — the
            properties' titles will be updated with the move.
          </p>
        )}
        {frozen && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
            This launch <span className="font-semibold">can't move under a different project or phase while it is Active</span> —
            change this project or phase's Primary Status to close the launch, then move it.
          </p>
        )}
      </div>
    </Card>
  )
}


/**
 * Property-side relink: pick a developer + project/phase, then one of ITS ingested
 * launches. The group's launch properties move to it and their titles are updated.
 */
const LAUNCH_STATUS_CHIP: Record<Launch["launchStatus"], string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Inactive: "border-gray-200 bg-gray-100 text-gray-600",
  Closed: "border-red-200 bg-red-50 text-red-600",
}

function StatusChip({ label, cls }: { label: string; cls: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>{label}</span>
}

const LISTING_CHIP: Record<string, string> = {
  Published: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-600",
}

/** The property's listing status follows the launch it sits on. */
export const listingForLaunchStatus = (s: Launch["launchStatus"]) => (s === "Active" ? "Published" : "Hidden")

export function ChangeLinkedLaunchDialog({ currentLaunchId, current, onClose, onConfirm }: {
  currentLaunchId?: string
  /** The property's own statuses, shown in the current-linkage card. */
  current?: { listingStatus: string; saleStatus: string }
  onClose: () => void
  onConfirm: (launch: Launch) => void
}) {
  const [devId, setDevId] = useState("")
  const [sel, setSel] = useState<ProjectTreeSelection>(null)
  const [pickedId, setPickedId] = useState("")
  const candidates = sel ? launchesForProject(sel.id).filter(isIngestedLaunch) : []
  const picked = candidates.find((l) => l.id === pickedId)
  const cur = currentLaunchId ? launchesSnapshot().find((l) => l.id === currentLaunchId) : undefined
  const destListing = picked ? listingForLaunchStatus(picked.launchStatus) : null
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Linked Launch</DialogTitle>
        </DialogHeader>

        {/* Current linkage — where this property sits today, and its own statuses */}
        {cur && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Currently linked launch</p>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{cur.title ?? cur.projectNameEn}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{cur.id}</span>
              </span>
              <StatusChip label={cur.launchStatus} cls={LAUNCH_STATUS_CHIP[cur.launchStatus]} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1 border-t border-border pt-2">
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Developer</p><p className="text-xs font-medium text-foreground">{cur.developer.name}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Project</p><p className="text-xs font-medium text-foreground">{cur.projectNameEn}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phase</p><p className="text-xs font-medium text-foreground">{cur.phase || "—"}</p></div>
            </div>
            {current && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">This property — Listing:
                  <StatusChip label={current.listingStatus} cls={LISTING_CHIP[current.listingStatus] ?? "border-gray-200 bg-gray-100 text-gray-600"} />
                </span>
                <span className="flex items-center gap-1.5">Sale Status:
                  <StatusChip label={current.saleStatus} cls="border-blue-200 bg-blue-100 text-blue-700" />
                </span>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <div className="rounded-md bg-card">
              <DeveloperSelect developers={SYS_DEVELOPERS} value={devId} onChange={(v) => { setDevId(v); setSel(null); setPickedId("") }} placeholder="Select developer…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Project / Phase</Label>
            <div className="rounded-md bg-card">
              <ProjectTreeSelect projects={sysProjectTree(devId || undefined)} value={sel} onChange={(v) => { setSel(v); setPickedId("") }} />
            </div>
          </div>
        </div>

        {sel && (candidates.length ? (
          <div className="space-y-2">
            <Label>Ingested launches on {sel.label}</Label>
            {candidates.map((l) => (
              <button
                key={l.id} type="button" onClick={() => setPickedId(l.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors",
                  pickedId === l.id ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{l.title ?? l.projectNameEn}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{l.id}{l.id === currentLaunchId ? " · current" : ""}</span>
                </span>
                <span className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
                  l.launchStatus === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : l.launchStatus === "Closed" ? "border-red-200 bg-red-50 text-red-600" : "border-gray-200 bg-gray-100 text-gray-600",
                )}>{l.launchStatus}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
            No launch is linked to this project or phase — create a launch first, then move this property to it.
          </p>
        ))}

        <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-4 text-blue-800">
          <p>The property's <span className="font-semibold">title will be updated</span> with this move, and its listing status follows the destination launch.</p>
          {picked && current && (
            <p className="flex flex-wrap items-center gap-1.5">
              Listing status:
              <StatusChip label={current.listingStatus} cls={LISTING_CHIP[current.listingStatus] ?? "border-gray-200 bg-gray-100 text-gray-600"} />
              <span aria-hidden>→</span>
              <StatusChip label={destListing!} cls={LISTING_CHIP[destListing!]} />
              {destListing === current.listingStatus && <span className="text-blue-700/70">(unchanged)</span>}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={onClose}>Cancel</Button>
          <Button disabled={!picked || picked.id === currentLaunchId} onClick={() => picked && onConfirm(picked)}>
            Move Property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

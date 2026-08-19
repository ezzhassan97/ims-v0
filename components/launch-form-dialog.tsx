"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Save, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Launch, LAUNCH_AREAS, launchAreaId } from "@/lib/launches-mock"
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

function DetectedRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      {sub && <p dir="rtl" className="text-xs text-muted-foreground">{sub}</p>}
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
            <DetectedRow label={form.projectLevel === "Phase" ? "Parent Project" : "Project"} value={form.projectNameEn} sub={form.projectNameAr} />
            {form.projectLevel === "Phase" && <DetectedRow label="Phase" value={form.phase} sub={form.phaseAr} />}
            <DetectedRow label="Developer" value={form.developer.name} />
            <DetectedRow label="Area" value={form.area} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5">
          <Label>Developer</Label>
          {dis ? (
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
          This launch isn't linked to a system {entity} yet — it can be approved but <span className="font-semibold">not ingested</span>.
          Use the names above to find the {entity} in the pickers. If it doesn't exist yet, create it from the Projects page
          first, then link it here.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No scroll container — the tree/developer dropdowns overlay past the dialog instead of stretching it. */}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Launch" : "Create Launch"}</DialogTitle>
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

        <LinkFormBody s={s} scope={scope} unlinked={unlinked} />

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
  const locked = launch.ingestionStatus === "Ingested"
  const s = useLinkState(true, launch, undefined, `${launch.id}:${launch.updatedAt}`)
  const unlinked = !(launch.projectLevel === "Phase" ? launch.projectId && launch.parentProjectId : launch.projectId)

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Project Details</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {locked
              ? "Ingested — the linked project is locked."
              : "Every launch links to an existing project or phase — the link can change until the launch is ingested."}
          </p>
        </div>
        {!locked && (
          <Button size="sm" className="h-8" onClick={() => onPatch(editPatch(s))}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Changes
          </Button>
        )}
      </div>
      <div className="grid gap-4">
        <LinkFormBody s={s} locked={locked} unlinked={unlinked} />
      </div>
    </Card>
  )
}

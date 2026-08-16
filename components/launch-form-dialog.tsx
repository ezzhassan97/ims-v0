"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Launch, LAUNCH_AREAS, launchAreaId } from "@/lib/launches-mock"
import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"
import { SYS_DEVELOPERS, sysProjectTree } from "@/components/link-project-dialog"
import { DeveloperSelect, ProjectTreeSelect, type ProjectTreeSelection } from "@/components/table-kit"

const LOGO = "/placeholder.svg?height=32&width=32"
const AREA_ID: Record<string, string> = Object.fromEntries(LAUNCH_AREAS.map((a) => [a, launchAreaId(a)]))
const DEVELOPERS = [...new Set(PROJECT_DEVELOPERS.map((d) => d.name))]

export type LaunchFormData = Omit<Launch, "id" | "createdAt" | "updatedAt">

export type LaunchScope = { name: string; isPhase: boolean; mainProject?: string; developer?: string; area?: string; phases?: string[] }

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
  mode: "new" | "existing"
  setMode: (m: "new" | "existing") => void
  exDevId: string
  setExDevId: (v: string) => void
  exSel: ProjectTreeSelection
  setExSel: (v: ProjectTreeSelection) => void
  exRow?: (typeof PROJECTS)[number]
}

/** Shared form state for the dialog and the details-tab card — prefill mirrors the launch's linkage. */
function useLinkState(active: boolean, initial?: Launch, scope?: LaunchScope, resetKey?: string): LinkState {
  const [form, setForm] = useState<LaunchFormData>({ ...EMPTY_FORM })
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [exDevId, setExDevId] = useState("")
  const [exSel, setExSel] = useState<ProjectTreeSelection>(null)
  const exRow = exSel ? PROJECTS.find((p) => p.id === exSel.id) : undefined

  const set = (key: keyof LaunchFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!active) return
    setMode("new"); setExDevId(""); setExSel(null)
    if (initial) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = initial
      setForm(rest as LaunchFormData)
      // Matched launches open in "existing" with the picker prefilled from the current linkage
      const matched = initial.projectLevel === "Phase" ? !!(initial.projectId && initial.parentProjectId) : !!initial.projectId
      if (matched && initial.projectId) {
        setMode("existing")
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

  return { form, set, setForm, mode, setMode, exDevId, setExDevId, exSel, setExSel, exRow }
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

/** Edit-mode patch: existing → remap onto the pick; new → drop every system link. */
function editPatch(s: LinkState): Partial<Launch> {
  const remap = remapOf(s)
  return s.mode === "existing" && remap
    ? { ...s.form, ...remap }
    : { ...s.form, projectId: undefined, parentProjectId: undefined, existingProject: undefined, listingProject: undefined }
}

function ModeToggle({ s, locked }: { s: LinkState; locked?: boolean }) {
  return (
    <div className="flex gap-2">
      {([["new", "New Launch", "A brand-new project or phase is created on ingestion."], ["existing", "Already Existing Project", "Link this launch to a project or phase that already exists."]] as const).map(([k, label, desc]) => (
        <button
          key={k} type="button" disabled={locked} onClick={() => s.setMode(k)}
          className={cn(
            "flex-1 rounded-lg border p-3 text-left transition-colors",
            s.mode === k ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card",
            locked ? "cursor-not-allowed opacity-70" : s.mode !== k && "hover:border-muted-foreground/40",
          )}
        >
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
        </button>
      ))}
    </div>
  )
}

/** Everything below the title/description — the mode toggle plus the linkage grids. */
function LinkFormBody({ s, scope, locked }: { s: LinkState; scope?: LaunchScope; locked?: boolean }) {
  const { form, set, setForm, mode, exDevId, setExDevId, exSel, setExSel, exRow } = s
  const dis = !!locked
  return (
    <>
      {!scope && <ModeToggle s={s} locked={locked} />}

      {!scope && mode === "existing" ? (
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
            <Input value={(dis ? form.area : exRow?.area) ?? ""} disabled className="disabled:bg-muted" placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select value={form.type} disabled={dis} onChange={(e) => set("type", e.target.value as Launch["type"])} className={SELECT}>
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
            disabled={!!scope || dis}
            onChange={(e) => set("developer", { name: e.target.value, logo: LOGO, id: `DEV-${e.target.value.slice(0, 3).toUpperCase()}` })}
            className={SELECT}
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
            disabled={dis}
            onChange={(e) => {
              const level = e.target.value as Launch["projectLevel"]
              // Main Project launches have no phase by definition
              setForm((prev) => ({ ...prev, projectLevel: level, phase: level === "Main Project" ? "" : prev.phase }))
            }}
            className={SELECT}
          >
            <option value="Main Project">Main Project</option>
            <option value="Phase">Phase</option>
          </select>
        </div>
        )}

        {/* Phase launches: the parent project takes the full row so the phase EN/AR names pair up below */}
        <div className={cn("space-y-1.5", !scope && form.projectLevel === "Phase" && "col-span-2")}>
          <Label>{scope ? "Project / Phase" : form.projectLevel === "Phase" ? <>Parent Project <span className="text-red-500">*</span></> : <>Project Name En <span className="text-red-500">*</span></>}</Label>
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
                className={SELECT}
              >
                <option value="__main__">{scope.name} (Main Project)</option>
                {(scope.phases ?? []).map((ph) => <option key={ph} value={ph}>{ph}</option>)}
              </select>
            )
          ) : form.projectLevel === "Phase" ? (
            <select value={form.projectNameEn} disabled={dis} onChange={(e) => set("projectNameEn", e.target.value)} className={SELECT}>
              <option value="">Select project…</option>
              {PROJECTS.filter((p) => !p.isPhase && !p.isSubProject).map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          ) : (
            <Input value={form.projectNameEn} disabled={dis} onChange={(e) => set("projectNameEn", e.target.value)} placeholder="Project name" className={dis ? "disabled:bg-muted" : FIELD} />
          )}
        </div>

        {/* New main-project launch: the Arabic name is mandatory alongside the English one */}
        {!scope && form.projectLevel === "Main Project" && (
          <div className="space-y-1.5">
            <Label>Project Name Ar <span className="text-red-500">*</span></Label>
            <Input dir="rtl" value={form.projectNameAr ?? ""} disabled={dis} onChange={(e) => set("projectNameAr", e.target.value)} placeholder="اسم المشروع" className={dis ? "disabled:bg-muted" : FIELD} />
          </div>
        )}

        {!scope && form.projectLevel === "Phase" && (
          <>
            <div className="space-y-1.5">
              <Label>Phase Name En <span className="text-red-500">*</span></Label>
              <Input value={form.phase} disabled={dis} onChange={(e) => set("phase", e.target.value)} placeholder="e.g. Phase 1" className={dis ? "disabled:bg-muted" : FIELD} />
            </div>
            <div className="space-y-1.5">
              <Label>Phase Name Ar <span className="text-red-500">*</span></Label>
              <Input dir="rtl" value={form.phaseAr ?? ""} disabled={dis} onChange={(e) => set("phaseAr", e.target.value)} placeholder="اسم المرحلة" className={dis ? "disabled:bg-muted" : FIELD} />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label>Area {scope && <span className="text-[10px] font-normal text-muted-foreground">(from the selected project)</span>}</Label>
          <select value={form.area} disabled={!!scope || dis} onChange={(e) => set("area", e.target.value)} className={SELECT}>
            {scope ? (
              <option value={form.area}>{form.area || "—"}</option>
            ) : (
              <>
                <option value="">Select area…</option>
                {LAUNCH_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </>
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <select value={form.type} disabled={dis} onChange={(e) => set("type", e.target.value as Launch["type"])} className={SELECT}>
            <option value="Launch">Launch</option>
            <option value="Release">Release</option>
          </select>
        </div>

        {/* New-entity outcome — visibility inheritance + the default primary status */}
        {!scope && (
          <div className="col-span-2 space-y-2">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-800">
              {form.projectLevel === "Phase"
                ? "The new phase will be created Hidden — it stays hidden while its parent project is hidden."
                : "The new project will be created Hidden — it stays hidden while its developer is hidden."}
            </p>
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-4 text-blue-800">
              The {form.projectLevel === "Phase" ? "phase" : "project"}'s Primary Status will be On-Sale by default on
              creation — you can change the status and activate the launch after ingestion.
            </p>
          </div>
        )}
      </div>
      )}
    </>
  )
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
  const { form, set, mode, exDevId, exSel } = s

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

        <LinkFormBody s={s} scope={scope} />

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={
              !(form.title ?? "").trim() ? true
              : mode === "existing" && !scope
                ? (!exDevId || !exSel)
                : !scope && !initial
                ? (form.projectLevel === "Main Project"
                    ? (!form.projectNameEn.trim() || !(form.projectNameAr ?? "").trim())
                    : (!form.projectNameEn.trim() || !form.phase.trim() || !(form.phaseAr ?? "").trim()))
                : false
            }
            onClick={() => {
              const remap = remapOf(s)
              if (initial && onEdit) {
                onEdit(initial.id, editPatch(s))
              } else if (!scope && mode === "existing" && remap) {
                onSave({ ...form, ...remap })
              } else {
                onSave(form)
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
 * Project Details tab card — the same New / Already-Existing form as the popup,
 * minus title/description. Editable until the launch is ingested, then locked.
 */
export function LaunchProjectDetailsCard({ launch, onPatch }: { launch: Launch; onPatch: (patch: Partial<Launch>) => void }) {
  const locked = launch.ingestionStatus === "Ingested"
  const s = useLinkState(true, launch, undefined, `${launch.id}:${launch.updatedAt}`)
  const canSave = !locked && (s.mode === "new" || (!!s.exDevId && !!s.exSel))

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Project Details</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {locked
              ? "Ingested — the linked project and the New / Already Existing state are locked."
              : "Switch between New and Already Existing, or change the linked project or phase, until the launch is ingested."}
          </p>
        </div>
        {!locked && (
          <Button size="sm" className="h-8" disabled={!canSave} onClick={() => onPatch(editPatch(s))}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Changes
          </Button>
        )}
      </div>
      <div className="grid gap-4">
        <LinkFormBody s={s} locked={locked} />
      </div>
    </Card>
  )
}

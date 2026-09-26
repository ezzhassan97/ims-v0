"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Archive, ArrowLeft, ArrowRight, Boxes, CalendarClock, Check, CheckCircle2, ClipboardCheck, Columns3, Eye, FileText,
  GitCompareArrows, LayoutTemplate, Loader2, MoreHorizontal, ScanSearch, ScanText, Shuffle, Sparkles, Square, User as UserIcon,
  Wallet, Wand2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { IdTag } from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { EntryProjectsDrawer } from "@/components/ingestion-entries-page"
import { FilePreviewDialog, type PreviewFile } from "@/components/file-preview-dialog"
import { FLOOR_PLANS0 } from "@/components/floor-plans-page"
import { RENDER_IMAGES } from "@/components/render-images-page"
import {
  FILE_ICON, StepComparison, StepExtraction, StepFormatting, StepMapping, StepReview, StepSetup, StepTransformation,
  TAG, TONE_TAG, fmtSize, type StepCtx,
} from "@/components/bulk-entry-steps"
import { FinalizedSummary, StepFinal, StepFloorPlans, StepGrouping, StepPlans, finalCounts } from "@/components/bulk-entry-assets"
import { seedFor } from "@/lib/bulk-ingestion"
import {
  STEP_GOAL, STEP_KEYS, STEP_LABEL, aiComplete, computePipeline, fastForward, initialWork, isSkipped, stageIndex, stepStatus,
  type Catalogs, type StepKey, type Work,
} from "@/lib/bulk-entry-flow"
import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"
import type { IngestionEntry } from "@/lib/ingestion-mock"

const STEP_ICON: Record<StepKey, React.ComponentType<{ className?: string }>> = {
  setup: FileText, extraction: ScanText, mapping: Columns3, comparison: GitCompareArrows, transformation: Shuffle,
  formatting: Wand2, review: ScanSearch, plans: Wallet, floorplans: LayoutTemplate, grouping: Boxes, final: ClipboardCheck,
}
const FINAL = STEP_KEYS.length - 1
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const CATALOGS: Catalogs = {
  floorPlans: FLOOR_PLANS0.map((f) => ({ id: f.id, unitType: f.unitType, bedrooms: f.bedrooms, areaSqm: f.areaSqm })),
  // AI picks real renders first — placeholder images make poor covers
  renders: RENDER_IMAGES.filter((r) => r.url && !r.url.includes("placeholder")).map((r) => ({ id: r.id })),
}

interface AutopilotRun { running: boolean; log: { key: StepKey; summary: string }[]; stoppedAt?: StepKey; stopNote?: string }

export function BulkEntryPage({ entry, onBack }: { entry: IngestionEntry; onBack: () => void }) {
  const seedRefs = (w: Work) => (entry.projects.length ? entry.projects : w.projectIds.map((id) => ({ id })))
  const [work, setWork] = useState<Work>(() => {
    const seed = seedFor(entry.files, entry.projects, entry.dataType)
    // Opening an entry mid-flow: the steps before its stage are done the way AI would have done them
    return fastForward(seed, initialWork(entry, seed), stageIndex(entry.stage), CATALOGS)
  })
  const seed = useMemo(() => seedFor(entry.files, seedRefs(work), work.dataType), [entry, work.dataType, entry.projects.length ? "" : work.projectIds.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps
  const pipe = useMemo(() => computePipeline(seed, work), [seed, work])
  const [step, setStep] = useState(() => stageIndex(entry.stage))
  const [reached, setReached] = useState(step)
  const [finalized, setFinalized] = useState(entry.stage === "Finalized")
  const [viewKey, setViewKey] = useState(0)
  const [autopilot, setAutopilot] = useState<AutopilotRun | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [projOpen, setProjOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const stopRef = useRef(false)
  const openedAt = useRef(Date.now())
  const [activeSec, setActiveSec] = useState(0)

  // A step opens on its Output; the diff shows only right after AI runs on it
  useEffect(() => { setViewKey(0) }, [step])
  const set = useCallback((patch: Partial<Work> | ((w: Work) => Partial<Work>)) => setWork((w) => ({ ...w, ...(typeof patch === "function" ? patch(w) : patch) })), [])
  const statuses = useMemo(() => STEP_KEYS.map((k) => stepStatus(k, work, pipe)), [work, pipe])
  const key = STEP_KEYS[step]
  const status = statuses[step]
  const skipped = (i: number) => isSkipped(STEP_KEYS[i], pipe)
  const nextIdx = (i: number) => { let n = i + 1; while (n < FINAL && skipped(n)) n++; return Math.min(n, FINAL) }
  const prevIdx = (i: number) => { let n = i - 1; while (n > 0 && skipped(n)) n--; return Math.max(n, 0) }
  const visible = STEP_KEYS.filter((_, i) => !skipped(i)).length
  const position = STEP_KEYS.slice(0, step + 1).filter((_, i) => !skipped(i)).length

  const goStep = (i: number) => {
    if (skipped(i) || i > reached) return
    setStep(i)
  }
  // ponytail: the module-level ENTRIES array is the store — the list re-reads it on mount; real persistence replaces this
  const persistStage = (i: number) => { Object.assign(entry, { stage: STEP_LABEL[STEP_KEYS[i]], updatedAt: new Date().toISOString() }) }
  const next = () => {
    if (status.blocking) return
    if (step === FINAL) { setConfirm(true); return }
    const n = nextIdx(step)
    setStep(n)
    setReached((r) => Math.max(r, n))
    persistStage(n)
  }
  const back = () => (step === 0 ? onBack() : setStep(prevIdx(step)))

  const runAi = () => {
    const { patch, summary } = aiComplete(key, work, pipe, CATALOGS)
    setWork((w) => ({ ...w, ...patch }))
    setViewKey((k) => k + 1)
    toast.success(summary, { icon: <Sparkles className="h-4 w-4 text-violet-500" /> })
  }

  /** Autopilot — AI finishes step after step and stops at the first one that still needs a person. */
  const runAutopilot = async () => {
    stopRef.current = false
    let w = work
    let i = step
    const log: AutopilotRun["log"] = []
    setAutopilot({ running: true, log })
    while (i < FINAL) {
      if (stopRef.current) break
      const k = STEP_KEYS[i]
      const p = computePipeline(seed, w)
      if (isSkipped(k, p)) { i++; continue }
      setStep(i)
      setReached((r) => Math.max(r, i))
      await sleep(380)
      const { patch, summary } = aiComplete(k, w, p, CATALOGS)
      w = { ...w, ...patch }
      setWork(w)
      setViewKey((v) => v + 1)
      log.push({ key: k, summary })
      setAutopilot({ running: true, log: [...log] })
      const after = stepStatus(k, w, computePipeline(seed, w))
      if (after.blocking > 0) {
        setAutopilot({ running: false, log: [...log], stoppedAt: k, stopNote: after.note })
        persistStage(i)
        toast.warning(`Autopilot stopped at ${STEP_LABEL[k]} — ${after.note}`)
        return
      }
      await sleep(260)
      i++
    }
    if (!stopRef.current) {
      setStep(FINAL)
      setReached(FINAL)
      persistStage(FINAL)
      toast.success("Autopilot reached Final Check — review and ingest")
    }
    setAutopilot({ running: false, log: [...log], stoppedAt: stopRef.current ? STEP_KEYS[i] : undefined, stopNote: stopRef.current ? "Stopped by you" : undefined })
  }

  const ingest = () => {
    const secs = Math.round((Date.now() - openedAt.current) / 1000)
    setActiveSec(secs)
    setConfirm(false)
    setFinalized(true)
    const c = finalCounts(ctx)
    Object.assign(entry, {
      stage: "Finalized", finalizedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      detailedProperties: work.dataType === "Automatic" ? c.fresh + c.updated : 0, groupedProperties: c.groups,
      activeTimeSec: entry.activeTimeSec + secs,
    })
    toast.success(`${entry.fileName} ingested`)
  }

  const ctx: StepCtx = { entry, seed, work, set, pipe, forceView: viewKey ? { view: "diff", key: viewKey } : undefined }
  const dev = PROJECT_DEVELOPERS.find((d) => d.id === work.developerId)
  const liveEntry: IngestionEntry = {
    ...entry,
    developer: dev ? { id: dev.id, name: dev.name, logo: dev.logo } : null,
    projects: work.projectIds.map((id) => { const p = PROJECTS.find((x) => x.id === id); return { id, name: p?.name ?? id, main: p?.mainProject?.name ?? null } }),
    categories: work.categories,
  }
  const counts = finalized ? finalCounts(ctx) : null
  const fileKinds = seed.files.reduce<Record<string, number>>((m, f) => ({ ...m, [f.kind]: (m[f.kind] ?? 0) + 1 }), {})
  const kindLabel: Record<string, string> = { sheet: "sheet", pdf: "PDF", image: "photo", text: "message" }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* Breadcrumb + header */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Properties Bulk Ingestion</button>
          <span>/</span>
          <span className="font-medium text-foreground">{entry.id}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-foreground">{entry.fileName}</h1>
              {work.saleType && <ColorTag value={work.saleType} />}
              <span className={cn(TAG, work.dataType === "Automatic" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-blue-200 bg-blue-100 text-blue-700")}>{work.dataType}</span>
              {finalized && <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />Finalized</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <IdTag value={entry.id} />
              <span className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />Created by <b className="font-medium text-foreground">{entry.uploadedBy}</b></span>
              <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Created at <b className="font-medium text-foreground">{fmtDateTime(entry.createdAt)}</b></span>
              <span className="flex items-center gap-1.5">
                {Object.entries(fileKinds).map(([k, n]) => <span key={k} className="flex items-center gap-1">{FILE_ICON[k as keyof typeof FILE_ICON]}{n} {kindLabel[k]}{n > 1 ? "s" : ""}</span>)}
              </span>
            </div>
          </div>
          {!finalized && (
            <div className="flex items-center gap-2">
              <Button
                className="h-9 gap-1.5"
                disabled={autopilot?.running || step === FINAL}
                onClick={runAutopilot}
                title="AI completes every remaining step and stops where it needs you"
              >
                {autopilot?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Autopilot
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {seed.files.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => setPreview({ id: f.id, name: f.name, ext: f.name.split(".").pop()?.toUpperCase() ?? "", typeGroup: f.kind === "sheet" ? "Sheet" : f.kind === "image" ? "Image" : "Document", size: f.size, url: f.image?.url })}>
                      <Eye className="mr-2 h-3.5 w-3.5" /><span className="truncate">{f.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { toast.success(`${entry.id} archived`); onBack() }}><Archive className="mr-2 h-3.5 w-3.5" />Archive entry</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <Stepper step={finalized ? FINAL + 1 : step} reached={finalized ? FINAL : reached} skipped={skipped} statuses={statuses} onStep={goStep} />

        {/* Context strip — what this entry is, once setup is behind us */}
        {step > 0 && !finalized && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">{dev?.logo ?? "—"}</span>
              <span><span className="block text-[11px] text-muted-foreground">Developer</span><b className="font-medium text-foreground">{dev?.name ?? "—"}</b></span>
            </span>
            <span className="min-w-0 max-w-md">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">Projects<button title="View entry projects" onClick={() => setProjOpen(true)} className="hover:text-foreground"><Eye className="h-3 w-3" /></button></span>
              <b className="block truncate font-medium text-foreground">{pipe.options.filter((o) => work.projectIds.includes(o.id)).map((o) => o.label).join(", ") || "—"}</b>
            </span>
            <span><span className="block text-[11px] text-muted-foreground">Categories</span><b className="font-medium text-foreground">{work.categories.join(", ")}</b></span>
            <span><span className="block text-[11px] text-muted-foreground">Rows now</span><b className="font-medium text-foreground">{pipe.reviewed.length.toLocaleString("en-US")}</b></span>
            <span><span className="block text-[11px] text-muted-foreground">Files</span><b className="font-medium text-foreground">{seed.files.filter((f) => !pipe.applied.has(`remove-file:${f.id}`)).length} · {fmtSize(seed.files.reduce((n, f) => n + f.size, 0))}</b></span>
          </div>
        )}

        {autopilot && <AutopilotLog run={autopilot} onStop={() => { stopRef.current = true }} onClose={() => setAutopilot(null)} />}

        {finalized && counts ? (
          <FinalizedSummary ctx={ctx} counts={counts} activeSec={activeSec} onBack={onBack} />
        ) : (
          <>
            {/* Step header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step {position} of {visible}</p>
                <h2 className="text-lg font-bold text-foreground">{STEP_LABEL[key]}</h2>
                <p className="text-sm text-muted-foreground">{STEP_GOAL[key]}</p>
              </div>
              <div className="flex items-center gap-2">
                {status.blocking > 0 && <span className={cn(TAG, TONE_TAG.error)}>{status.blocking} blocking</span>}
                {status.warnings > 0 && <span className={cn(TAG, TONE_TAG.warn)}>{status.warnings} to review</span>}
                {!status.blocking && !status.warnings && <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />{status.note}</span>}
                {key !== "final" && (
                  <Button variant="outline" className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary" onClick={runAi} disabled={autopilot?.running}>
                    <Sparkles className="h-3.5 w-3.5" />Complete with AI
                  </Button>
                )}
              </div>
            </div>

            {key === "setup" && <StepSetup ctx={ctx} />}
            {key === "extraction" && <StepExtraction ctx={ctx} />}
            {key === "mapping" && <StepMapping ctx={ctx} />}
            {key === "comparison" && <StepComparison ctx={ctx} />}
            {key === "transformation" && <StepTransformation ctx={ctx} />}
            {key === "formatting" && <StepFormatting ctx={ctx} />}
            {key === "review" && <StepReview ctx={ctx} />}
            {key === "plans" && <StepPlans ctx={ctx} />}
            {key === "floorplans" && <StepFloorPlans ctx={ctx} />}
            {key === "grouping" && <StepGrouping ctx={ctx} />}
            {key === "final" && <StepFinal ctx={ctx} goStep={goStep} />}
          </>
        )}
      </div>

      {!finalized && (
        <div className="z-30 flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-6 py-3">
          <Button variant="outline" onClick={back} disabled={autopilot?.running}>{step === 0 ? "Back to entries" : "Back"}</Button>
          <p className={cn("hidden min-w-0 flex-1 truncate text-center text-sm md:block", status.blocking ? "text-red-600" : "text-muted-foreground")}>
            {status.blocking ? status.note : status.warnings ? `${status.note} — you can still continue` : status.note}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-primary text-primary" onClick={() => { persistStage(step); toast.success("Draft saved") }}>Save as draft</Button>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={next} disabled={status.blocking > 0 || autopilot?.running} className="gap-1.5">
                      {step === FINAL ? <><CheckCircle2 className="h-4 w-4" />Ingest</> : <>Next · {STEP_LABEL[STEP_KEYS[nextIdx(step)]]}<ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </span>
                </TooltipTrigger>
                {status.blocking > 0 && <TooltipContent side="top">{status.note}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-bold">Ingest {entry.id}?</DialogTitle>
          {(() => {
            const c = finalCounts(ctx)
            const auto = work.dataType === "Automatic"
            return (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">This writes to the live database for {pipe.options.filter((o) => work.projectIds.includes(o.id)).map((o) => o.label).join(", ")} as <b className="text-foreground">{work.saleType}</b>.</p>
                <ul className="space-y-1 rounded-lg border border-border p-3">
                  <li className="flex justify-between"><span>{auto ? "New units" : "New grouped properties"}</span><b>{c.fresh}</b></li>
                  <li className="flex justify-between"><span>Updated</span><b>{c.updated}</b></li>
                  <li className="flex justify-between"><span>Unchanged</span><b>{c.unchanged}</b></li>
                  {auto && <li className="flex justify-between text-red-700"><span>Marked unavailable</span><b>{c.unavailable}</b></li>}
                  <li className="flex justify-between"><span>Grouped properties</span><b>{c.groups}</b></li>
                </ul>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                  <Button onClick={ingest}><CheckCircle2 className="mr-1.5 h-4 w-4" />Ingest now</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {projOpen && <EntryProjectsDrawer entry={liveEntry} onClose={() => setProjOpen(false)} />}
      {preview && <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

/* ── Stepper — every step fits the width; skipped steps stay visible but inert ── */

function Stepper({ step, reached, skipped, statuses, onStep }: {
  step: number; reached: number; skipped: (i: number) => boolean; statuses: { blocking: number; warnings: number }[]; onStep: (i: number) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex items-start">
        {STEP_KEYS.map((k, i) => {
          const Icon = STEP_ICON[k]
          const skip = skipped(i)
          const done = !skip && i < step
          const active = i === step
          // Completed earlier, now ahead of where you are — still reachable, shown lighter
          const ahead = !skip && i > step && i <= reached
          const clickable = !skip && i <= reached
          const s = statuses[i]
          return (
            <div key={k} className="flex min-w-0 flex-1 items-start last:flex-none">
              {i > 0 && <div className={cn("mt-4 h-0.5 min-w-1 flex-1", i <= step && !skip ? "bg-emerald-500" : "bg-border", skip && "bg-transparent border-t border-dashed border-border")} />}
              <button type="button" onClick={() => clickable && onStep(i)} disabled={!clickable} className="group flex w-[76px] flex-shrink-0 flex-col items-center gap-1 disabled:cursor-default">
                <span className="relative">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                    skip ? "border-dashed border-border bg-card text-muted-foreground/40" :
                    done ? "border-emerald-500 bg-emerald-500 text-white" :
                    active ? "border-primary bg-primary text-primary-foreground" :
                    ahead ? "border-emerald-300 bg-emerald-50 text-emerald-600" :
                    "border-border bg-card text-muted-foreground", clickable && !active && !done && "group-hover:border-primary/50")}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  {!skip && i <= reached && (s.blocking > 0 || (s.warnings > 0 && i !== step)) && (
                    <span className={cn("absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white", s.blocking ? "bg-red-500" : "bg-amber-500")}>{s.blocking || s.warnings}</span>
                  )}
                </span>
                <span className={cn("text-center text-[10.5px] leading-tight", skip ? "text-muted-foreground/50" : active ? "font-semibold text-primary" : done || ahead ? "text-emerald-700" : "text-muted-foreground")}>{STEP_LABEL[k]}</span>
                {skip && <span className="text-[9px] leading-none text-muted-foreground/60">Not needed</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AutopilotLog({ run, onStop, onClose }: { run: AutopilotRun; onStop: () => void; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          {run.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {run.running ? "Autopilot is working…" : run.stoppedAt ? `Autopilot paused at ${STEP_LABEL[run.stoppedAt]}` : "Autopilot finished"}
          {!run.running && run.stopNote && <span className="font-normal text-primary/80">— {run.stopNote}</span>}
        </p>
        {run.running
          ? <Button variant="outline" size="sm" className="h-7 gap-1 border-primary/30 bg-white px-2 text-xs text-primary" onClick={onStop}><Square className="h-3 w-3" />Stop</Button>
          : <button onClick={onClose} className="text-primary/70 hover:text-primary"><X className="h-4 w-4" /></button>}
      </div>
      {run.log.length > 0 && (
        <ol className="mt-2 grid gap-x-6 gap-y-1 md:grid-cols-2">
          {run.log.map((l) => (
            <li key={l.key} className="flex items-start gap-1.5 text-xs text-foreground">
              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
              <span><b className="font-semibold">{STEP_LABEL[l.key]}</b> · {l.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

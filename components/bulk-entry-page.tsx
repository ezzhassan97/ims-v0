"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, Archive, ArrowLeft, Check, CheckCircle2, CircleAlert, Eye, History, Loader2, MoreHorizontal, RotateCcw, Sparkles, Square, Undo2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import { FilePreviewDialog, type PreviewFile } from "@/components/file-preview-dialog"
import { ChromeContext, TAG, TONE_TAG, type Chrome, type FocusReq, type StageCtx } from "@/components/bulk-entry-kit"
import { StageExtraction, StageMapping, StageMatching, StageProjects, StageSetup, StageStandard, StageTransform } from "@/components/bulk-entry-steps"
import { FinalizedView, StageFinal, StageFloor, StageGrouping, StageMedia, StagePlans, StageReview } from "@/components/bulk-entry-assets"
import { hashStr, plural, seedFor } from "@/lib/bulk-ingestion"
import {
  STAGE_GOAL, STAGE_KEYS, STAGE_LABEL, STAGE_SHORT, aiComplete, computePipeline, fastForward, initialWork, isSkipped, liveChecks, stageIndex, stageStatus,
  type StageKey, type Work,
} from "@/lib/bulk-entry-flow"
import { developerSettings, learnFromEntry } from "@/lib/ingestion-rules-mock"
import { ENTRY_USERS, type IngestionEntry } from "@/lib/ingestion-mock"

const FINAL = STAGE_KEYS.length - 1
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const INGEST_STEPS = ["Re-checking every stage's gate on the server", "Saving units and offerings", "Applying missing statuses", "Writing the summary", "Reconciling the projects", "Clearing caches"]

interface LogItem { id: number; key: StageKey; summary: string; before: Work; at: string; by: "Autopilot" | "AI" }
interface Pause { stage: StageKey; question: string }
type Ingest = { step: number; failed?: string; attempt: number } | null

export function BulkEntryPage({ entry, onBack }: { entry: IngestionEntry; onBack: () => void }) {
  const [work, setWork] = useState<Work>(() => {
    const seed = seedFor(entry.files, entry.projects, entry.dataType)
    // Opening an entry mid-flow: the stages before its own were done the way AI would have done them
    return fastForward(seed, initialWork(entry, seed), stageIndex(entry.stage))
  })
  const refs = entry.projects.length ? entry.projects : work.projectIds.map((id) => ({ id }))
  const seed = useMemo(() => seedFor([...entry.files, ...work.addedFiles], refs, work.dataType), [entry, work.addedFiles, work.dataType, entry.projects.length ? "" : work.projectIds.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps
  const pipe = useMemo(() => computePipeline(seed, work), [seed, work])
  const [step, setStep] = useState(() => stageIndex(entry.stage))
  const [reached, setReached] = useState(step)
  const [finalized, setFinalized] = useState(entry.stage === "Finalized")
  const [aiRun, setAiRun] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [pause, setPause] = useState<Pause | null>(null)
  const [log, setLog] = useState<LogItem[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [checksOpen, setChecksOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ingest, setIngest] = useState<Ingest>(null)
  const [focusReq, setFocusReq] = useState<FocusReq | null>(null)
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const [qa, setQa] = useState(entry.qa ?? { status: "Pending" as const, checks: [] })
  const stopRef = useRef(false)
  const logSeq = useRef(0)
  const openedAt = useRef(Date.now())
  const [activeSec, setActiveSec] = useState(entry.activeTimeSec)

  const set = useCallback((patch: Partial<Work> | ((w: Work) => Partial<Work>)) => setWork((w) => ({ ...w, ...(typeof patch === "function" ? patch(w) : patch) })), [])
  // The entry is a full-height workspace — the app sidebar steps aside while it's open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ims:focus-mode", { detail: true }))
    return () => { window.dispatchEvent(new CustomEvent("ims:focus-mode", { detail: false })) }
  }, [])
  const key = STAGE_KEYS[step]
  const statuses = useMemo(() => STAGE_KEYS.map((k) => stageStatus(k, work, pipe)), [work, pipe])
  const status = statuses[step]
  const skipped = (i: number) => isSkipped(STAGE_KEYS[i], pipe)
  const nextIdx = (i: number) => { let n = i + 1; while (n < FINAL && skipped(n)) n++; return Math.min(n, FINAL) }
  const prevIdx = (i: number) => { let n = i - 1; while (n > 0 && skipped(n)) n--; return Math.max(n, 0) }
  const checks = useMemo(() => liveChecks(pipe, work), [pipe, work])

  // ponytail: the module-level ENTRIES array is the store — the list re-reads it on mount; real persistence replaces this
  const persist = (i: number) => { Object.assign(entry, { stage: STAGE_LABEL[STAGE_KEYS[i]], updatedAt: new Date().toISOString() }) }
  const goStage = (k: StageKey, focus?: { rowIds: string[]; label: string }) => {
    const i = STAGE_KEYS.indexOf(k)
    if (i < 0 || skipped(i) || (i > reached && !finalized)) { toast.info(`${STAGE_LABEL[k]} isn't reached yet`); return }
    setStep(i)
    if (focus) setFocusReq({ stage: k, ...focus, key: Date.now() })
  }
  const next = () => {
    if (status.blocking) return
    if (step === FINAL) { setConfirmOpen(true); return }
    const n = nextIdx(step)
    setStep(n)
    setReached((r) => Math.max(r, n))
    persist(n)
    if (pause?.stage === key) setPause(null)
  }
  const back = () => (step === 0 ? onBack() : setStep(prevIdx(step)))
  const confirmIds = (ids: string[]) => set((w) => ({ toConfirm: w.toConfirm.filter((x) => !ids.includes(x)) }))

  const runAi = async () => {
    setAiBusy(true)
    await sleep(420)
    const before = work
    const { patch, summary, question } = aiComplete(key, work, pipe)
    setWork((w) => ({ ...w, ...patch }))
    setLog((l) => [...l, { id: ++logSeq.current, key, summary, before, at: new Date().toISOString(), by: "AI" }])
    setAiRun((v) => v + 1)
    setAiBusy(false)
    toast.success(summary, { icon: <Sparkles className="h-4 w-4 text-violet-500" /> })
    if (question) toast.warning(question)
  }

  /** Autopilot — the same stage calls a person would make, from this stage on; pauses with the exact question. */
  const runAutopilot = async () => {
    stopRef.current = false
    setRunning(true)
    setPause(null)
    let w = work
    let i = step
    while (i < FINAL) {
      if (stopRef.current) break
      const k = STAGE_KEYS[i]
      const p = computePipeline(seed, w)
      if (isSkipped(k, p)) { i++; continue }
      setStep(i)
      setReached((r) => Math.max(r, i))
      await sleep(360)
      const before = w
      const { patch, summary, question } = aiComplete(k, w, p)
      w = { ...w, ...patch }
      setWork(w)
      setAiRun((v) => v + 1)
      setLog((l) => [...l, { id: ++logSeq.current, key: k, summary, before, at: new Date().toISOString(), by: "Autopilot" }])
      const p2 = computePipeline(seed, w)
      const after = stageStatus(k, w, p2)
      if (after.blocking > 0) {
        const q = question ?? after.note
        setPause({ stage: k, question: q })
        const rowIds = k === "review" ? p2.issues.filter((x) => x.severity === "error").flatMap((x) => x.rowIds) : k === "transform" ? [...p2.mandatory.filter((m) => m.blocking).flatMap((m) => m.rowIds), ...p2.duplicates.flat()] : k === "projects" ? p2.assigned.filter((r) => !r.projectId).map((r) => r.id) : k === "standard" ? p2.unknown.flatMap((u) => u.rowIds) : k === "plans" ? p2.planChecks.filter((c) => c.severity === "error").flatMap((c) => c.rowIds) : []
        if (rowIds.length) setFocusReq({ stage: k, rowIds, label: q.toLowerCase(), key: Date.now() })
        persist(i)
        setRunning(false)
        toast.warning(`Autopilot paused at ${STAGE_LABEL[k]} — ${q}`, { description: `${entry.uploadedBy} was notified.` })
        return
      }
      await sleep(220)
      i++
    }
    setRunning(false)
    if (!stopRef.current) {
      setStep(FINAL)
      setReached(FINAL)
      persist(FINAL)
      toast.success("Autopilot reached Final check — it never ingests on its own", { description: developerSettings(work.developerId).fullAuto ? "" : "Full auto is off for this developer." })
    }
  }
  const undo = (item: LogItem) => {
    setWork(item.before)
    setLog((l) => l.filter((x) => x.id < item.id))
    setStep(STAGE_KEYS.indexOf(item.key))
    toast.success(`Undid ${STAGE_LABEL[item.key]} · ${item.summary.slice(0, 60)}`)
  }

  /* ── Ingestion — the user only waits; a failure retries only the save ── */
  useEffect(() => {
    if (!ingest || ingest.failed) return
    if (ingest.step >= INGEST_STEPS.length) {
      const secs = Math.round((Date.now() - openedAt.current) / 1000)
      setActiveSec(entry.activeTimeSec + secs)
      learnFromEntry({
        devId: work.developerId, saleType: work.saleType,
        headerPairs: Object.fromEntries(pipe.headers.filter((h) => h.target && (h.origin === "You" || h.origin === "Synonym")).map((h) => [h.key, h.target])),
        valueChoices: Object.fromEntries(Object.entries(work.valueChoices).filter(([k]) => !work.toConfirm.includes(`value:${k}`))),
        projectRules: work.projectRules.filter((r) => !work.toConfirm.includes(`rule:${r.id}`)),
        actions: work.actions.filter((a) => !work.toConfirm.includes(`action:${a.id}`)),
        modelPicks: Object.fromEntries(Object.entries(work.floorPicks).filter(([k]) => !work.toConfirm.includes(`floor:${k}`))),
        groupConfigs: work.groupConfig ? { [pipe.mainIds[0] ?? ""]: work.groupConfig } : {},
        excludedImages: work.excludedImages,
      })
      const s = pipe.summary
      Object.assign(entry, {
        stage: "Finalized", finalizedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        detailedProperties: work.dataType === "Automatic" ? s.fresh + s.modified + s.returned : 0, groupedProperties: pipe.cards.length,
        activeTimeSec: entry.activeTimeSec + secs, qa: { status: "Pending", checks: [] },
      })
      setQa({ status: "Pending", checks: [] })
      setFinalized(true)
      setIngest(null)
      toast.success(`${entry.id} ingested — saved rules now include what you taught it`)
      return
    }
    const t = setTimeout(() => {
      // One in five entries times out on the first save — the retry restarts only the save
      if (ingest.step === 1 && ingest.attempt === 0 && hashStr(entry.id) % 5 === 0) setIngest({ ...ingest, failed: `Timed out saving ${plural(12, "unit")} — nothing was written.` })
      else setIngest({ ...ingest, step: ingest.step + 1 })
    }, 650)
    return () => clearTimeout(t)
  }, [ingest]) // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: StageCtx = { entry, seed, work, set, pipe, stage: key, focusReq, aiRun, goStage, confirm: confirmIds, readOnly: finalized }
  const stageConfirm = work.toConfirm.filter((id) => stageOfConfirm(id) === key)
  const chrome: Chrome = {
    number: step + 1, label: STAGE_LABEL[key], goal: STAGE_GOAL[key], status, canAi: key !== "final", aiBusy: aiBusy || running,
    onAi: runAi, onNext: next, onBack: back, onDraft: () => { persist(step); toast.success("Draft saved") },
    nextLabel: step === FINAL ? "Approve & ingest" : `Next · ${STAGE_LABEL[STAGE_KEYS[nextIdx(step)]]}`,
    backLabel: step === 0 ? "Entries" : "Back",
    pause: pause?.stage === key ? { question: pause.question, onDismiss: () => setPause(null) } : null,
    toConfirm: stageConfirm, onConfirmAll: () => confirmIds(stageConfirm), readOnly: finalized,
  }
  const showChecks = step >= 2 && !finalized

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary/40">
      {/* Header — one line of identity + actions, one line of stages */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4">
        <div className="flex h-12 items-center gap-2.5">
          <button onClick={onBack} className="flex flex-shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Entries</button>
          <span className="text-muted-foreground/60">/</span>
          <IdTag value={entry.id} />
          <h1 className="min-w-0 truncate text-[15px] font-semibold text-foreground" title={entry.fileName}>{entry.fileName}</h1>
          {seed.files.length > 1 && <span className="flex-shrink-0 text-xs text-muted-foreground">+{seed.files.length - 1} file{seed.files.length > 2 ? "s" : ""}</span>}
          {work.saleType && <ColorTag value={work.saleType} />}
          <span className={cn(TAG, work.dataType === "Automatic" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-blue-200 bg-blue-100 text-blue-700")}>{work.dataType}</span>
          {pipe.devName && <span className="hidden flex-shrink-0 text-xs text-muted-foreground lg:inline">{pipe.devName} · {plural(work.projectIds.length, "project")}</span>}
          {finalized && <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />Finalized</span>}
          <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
            {showChecks && (
              <button type="button" onClick={() => setChecksOpen(true)} title="Field checks and validation rules — run live from Mapping on" className={cn(TAG, "h-7 cursor-pointer px-2.5", checks.errors ? TONE_TAG.error : checks.warnings ? TONE_TAG.warn : TONE_TAG.ok)}>
                {checks.errors ? <CircleAlert className="h-3.5 w-3.5" /> : checks.warnings ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {checks.errors || checks.warnings ? `${checks.errors ? plural(checks.errors, "error") : ""}${checks.errors && checks.warnings ? " · " : ""}${checks.warnings ? plural(checks.warnings, "warning") : ""}` : "Checks pass"}
              </button>
            )}
            {log.length > 0 && <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => setLogOpen(true)}><History className="h-3.5 w-3.5" />Log · {log.length}</Button>}
            {!finalized && (running
              ? <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { stopRef.current = true }}><Loader2 className="h-3.5 w-3.5 animate-spin" />Stop autopilot</Button>
              : <Button size="sm" className="h-8 gap-1.5" disabled={step === FINAL || aiBusy} onClick={runAutopilot} title="Runs every stage from here with saved rules then AI — stops at Review on errors or at Final check"><Sparkles className="h-3.5 w-3.5" />Run autopilot</Button>)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
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
        </div>
        <Stepper step={finalized ? FINAL + 1 : step} reached={finalized ? FINAL : reached} skips={pipe.skips} statuses={statuses} onStep={(i) => goStage(STAGE_KEYS[i])} pausedAt={pause?.stage} />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col p-3">
        <ChromeContext.Provider value={chrome}>
          {finalized ? <FinalizedView ctx={ctx} activeSec={activeSec} qa={qa} onQa={(q) => { setQa(q); Object.assign(entry, { qa: q }) }} onBack={onBack} /> : (
            <>
              {key === "setup" && <StageSetup ctx={ctx} />}
              {key === "extraction" && <StageExtraction ctx={ctx} />}
              {key === "mapping" && <StageMapping ctx={ctx} />}
              {key === "projects" && <StageProjects ctx={ctx} />}
              {key === "transform" && <StageTransform ctx={ctx} />}
              {key === "standard" && <StageStandard ctx={ctx} />}
              {key === "matching" && <StageMatching ctx={ctx} />}
              {key === "plans" && <StagePlans ctx={ctx} />}
              {key === "review" && <StageReview ctx={ctx} />}
              {key === "floor" && <StageFloor ctx={ctx} />}
              {key === "grouping" && <StageGrouping ctx={ctx} />}
              {key === "media" && <StageMedia ctx={ctx} />}
              {key === "final" && <StageFinal ctx={ctx} />}
            </>
          )}
        </ChromeContext.Provider>
        {ingest && <IngestOverlay ingest={ingest} entry={entry} onRetry={() => setIngest({ step: 1, attempt: ingest.attempt + 1 })} onCancel={() => setIngest(null)} />}
      </main>

      {/* Approve */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-bold">Approve and ingest {entry.id}?</DialogTitle>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Writes to the live data for {pipe.options.filter((o) => work.projectIds.includes(o.id)).map((o) => o.label).join(", ")} as <b className="text-foreground">{work.saleType}</b>. The server re-checks every stage first.</p>
            <ul className="space-y-1 rounded-lg border border-border p-3">
              <li className="flex justify-between"><span>New</span><b>{pipe.summary.fresh}</b></li>
              <li className="flex justify-between"><span>Modified</span><b>{pipe.summary.modified}</b></li>
              <li className="flex justify-between"><span>Unmodified</span><b>{pipe.summary.unmodified}</b></li>
              {pipe.summary.returned > 0 && <li className="flex justify-between"><span>Returned</span><b>{pipe.summary.returned}</b></li>}
              {work.coverage === "full" && <li className="flex justify-between text-red-700"><span>Missing</span><b>{pipe.summary.missing}</b></li>}
              <li className="flex justify-between"><span>Cards</span><b>{pipe.cards.length}</b></li>
            </ul>
            {work.toConfirm.length > 0 && <p className="text-xs text-violet-800"><Sparkles className="mr-1 inline h-3 w-3" />{plural(work.toConfirm.length, "AI decision")} still to confirm — they apply here but won&apos;t be saved as rules.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button onClick={() => { setConfirmOpen(false); openedAt.current = openedAt.current || Date.now(); setIngest({ step: 0, attempt: 0 }) }}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve &amp; ingest</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live checks */}
      <Sheet open={checksOpen} onOpenChange={setChecksOpen}>
        <SheetContent className="w-[420px] p-0 sm:max-w-[420px]">
          <div className="border-b border-border px-4 py-3"><SheetTitle className="text-base">Checks</SheetTitle><p className="text-xs text-muted-foreground">Field checks and validation rules on the data as it flows now — fixed in the stage that owns them.</p></div>
          <div className="space-y-2 overflow-y-auto p-4">
            {checks.issues.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Every check passes.</p>}
            {checks.issues.map((i) => (
              <div key={i.id} className={cn("rounded-lg border p-2.5", i.severity === "error" ? "border-red-200 bg-red-50/40" : work.acked[i.id] ? "border-border opacity-60" : "border-amber-200 bg-amber-50/40")}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-[13px] font-semibold", i.severity === "error" ? "text-red-700" : "text-amber-900")}>{i.title}</p>
                  <span className={cn(TAG, "bg-white")}>{plural(i.rowIds.length, "row")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{i.detail}</p>
                <Button size="sm" variant="outline" className="mt-1.5 h-6 bg-white px-2 text-[11px]" onClick={() => { setChecksOpen(false); goStage(i.owner, { rowIds: i.rowIds, label: i.title }) }}>Go to {STAGE_LABEL[i.owner]}</Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Autopilot + AI log */}
      <Sheet open={logOpen} onOpenChange={setLogOpen}>
        <SheetContent className="w-[420px] p-0 sm:max-w-[420px]">
          <div className="border-b border-border px-4 py-3"><SheetTitle className="text-base">Actions log</SheetTitle><p className="text-xs text-muted-foreground">Every AI and Autopilot step — undoing one rolls the entry back to just before it.</p></div>
          <div className="space-y-2 overflow-y-auto p-4">
            {[...log].reverse().map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{STAGE_LABEL[l.key]}</p>
                  <span className={cn(TAG, l.by === "Autopilot" ? TONE_TAG.blue : TONE_TAG.violet)}><Sparkles className="h-3 w-3" />{l.by}</span>
                </div>
                <p className="mt-0.5 text-xs text-foreground">{l.summary}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{new Date(l.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <button type="button" onClick={() => undo(l)} className="flex items-center gap-1 font-medium text-primary hover:underline"><Undo2 className="h-3 w-3" />Undo</button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {preview && <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

/** Which stage a to-confirm id belongs to. */
function stageOfConfirm(id: string): StageKey {
  const k = id.split(":")[0]
  return ({ coverage: "setup", launch: "setup", owner: "setup", linked: "setup", extract: "extraction", header: "mapping", rule: "projects", action: "transform", value: "standard", match: "matching", plans: "plans", floor: "floor", cards: "grouping", media: "media" } as Record<string, StageKey>)[k] ?? "final"
}

/* ── Stepper — 13 stages, same order for every entry; skipped ones say why ── */

function Stepper({ step, reached, skips, statuses, onStep, pausedAt }: {
  step: number; reached: number; skips: Record<StageKey, string | null>; statuses: { blocking: number; warnings: number }[]; onStep: (i: number) => void; pausedAt?: StageKey
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector(`[data-step="${step}"]`)?.scrollIntoView({ inline: "center", block: "nearest" }) }, [step])
  return (
    <TooltipProvider delayDuration={150}>
      <div ref={ref} className="-mx-1 flex items-start overflow-x-auto px-1 pb-2 pt-0.5">
        {STAGE_KEYS.map((k, i) => {
          const skip = skips[k]
          const done = !skip && i < step
          const active = i === step
          const ahead = !skip && i > step && i <= reached
          const clickable = !skip && i <= reached
          const s = statuses[i]
          const node = (
            <button type="button" data-step={i} onClick={() => clickable && onStep(i)} disabled={!clickable} className="group flex w-[74px] flex-shrink-0 flex-col items-center gap-0.5 disabled:cursor-default">
              <span className="relative">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                  skip ? "border-dashed border-border bg-card text-muted-foreground/40" :
                  active ? "border-primary bg-primary text-primary-foreground" :
                  done ? "border-emerald-500 bg-emerald-500 text-white" :
                  ahead ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border bg-card text-muted-foreground",
                  clickable && !active && "group-hover:border-primary/60")}>
                  {done && !s.blocking ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {!skip && i <= reached && (s.blocking > 0 || (s.warnings > 0 && i !== step)) && (
                  <span className={cn("absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white", s.blocking ? "bg-red-500" : "bg-amber-500")}>{s.blocking || s.warnings}</span>
                )}
                {pausedAt === k && <span className="absolute -left-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-card" />}
              </span>
              <span className={cn("whitespace-nowrap text-[10.5px] leading-tight", skip ? "text-muted-foreground/50 line-through decoration-muted-foreground/30" : active ? "font-semibold text-primary" : done || ahead ? "text-emerald-700" : "text-muted-foreground")}>{STAGE_SHORT[k]}</span>
            </button>
          )
          return (
            <div key={k} className={cn("flex items-start", i > 0 && "min-w-0 flex-1")}>
              {i > 0 && <div className={cn("mt-3 h-px min-w-1.5 flex-1", skip ? "border-t border-dashed border-border bg-transparent" : i <= step ? "bg-emerald-400" : "bg-border")} />}
              {skip ? <Tooltip><TooltipTrigger asChild>{node}</TooltipTrigger><TooltipContent side="bottom">Skipped — {skip}</TooltipContent></Tooltip> : node}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

function IngestOverlay({ ingest, entry, onRetry, onCancel }: { ingest: NonNullable<Ingest>; entry: IngestionEntry; onRetry: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="w-[420px] rounded-xl border border-border bg-card p-5 shadow-lg">
        <p className="text-base font-bold text-foreground">{ingest.failed ? "The save stopped" : "Ingesting"} {entry.id}</p>
        <p className="text-xs text-muted-foreground">{ingest.failed ? "Nothing was written — the retry restarts only the save." : "You only wait — seconds to about 40 seconds."}</p>
        <ol className="mt-3 space-y-1.5">
          {INGEST_STEPS.map((s, i) => {
            const done = i < ingest.step
            const now = i === ingest.step
            const failed = now && !!ingest.failed
            return (
              <li key={s} className="flex items-center gap-2 text-sm">
                {failed ? <X className="h-4 w-4 text-red-600" /> : done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : now ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border border-border" />}
                <span className={cn(done ? "text-foreground" : now ? "font-medium text-foreground" : "text-muted-foreground", failed && "text-red-700")}>{s}</span>
              </li>
            )
          })}
        </ol>
        {ingest.failed && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <p className="font-semibold">{ingest.failed}</p>
            <p>{ENTRY_USERS[0]} can retry now; the stages don&apos;t run again.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={onRetry}><RotateCcw className="h-3.5 w-3.5" />Retry the save</Button>
              <Button size="sm" variant="outline" className="h-7 bg-white px-2.5 text-xs" onClick={onCancel}>Back to Final check</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { Square }

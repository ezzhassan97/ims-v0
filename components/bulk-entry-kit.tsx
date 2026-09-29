"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronsLeft, ChevronsRight, CircleAlert, Database,
  FileSpreadsheet, FileText, Files, Image as ImageIcon, Loader2, MessageSquareText, PauseCircle, Plus, Save, Sparkles, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { IdCopy, OfferingCtxCell } from "@/components/launch-details-page"
import { SheetPreviewCard, type CellMark, type GridSheet, type ViewKind } from "@/components/sheet-preview"
import {
  FIELD_LABEL, FILTER_OPS, tabTables, txt,
  type Cell, type EntrySeed, type FieldDef, type FieldKey, type GridCol, type GridTable, type RowFilter, type SourceFile, type URow,
} from "@/lib/bulk-ingestion"
import { STAGE_KEYS, type Pipe, type StageKey, type StageState, type Work } from "@/lib/bulk-entry-flow"
import type { IngestionEntry, PropertyCategory } from "@/lib/ingestion-mock"

/* ── Tags ────────────────────────────────────────────────────────────────── */

export const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
export const TONE_TAG = {
  error: "border-red-200 bg-red-50 text-red-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-border bg-muted text-muted-foreground",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
} as const

/** Where a rule, mapping or value came from — saved for the developer, new here, or AI. */
const ORIGIN_TONE: Record<string, string> = {
  Saved: TONE_TAG.muted, Template: TONE_TAG.muted, Vocabulary: TONE_TAG.muted, "IMS link": TONE_TAG.muted, "Model rule": TONE_TAG.muted,
  New: TONE_TAG.blue, You: TONE_TAG.blue, "Your choice": TONE_TAG.blue, Manual: TONE_TAG.blue, Edited: TONE_TAG.blue,
  Synonym: TONE_TAG.info, Format: TONE_TAG.info, "IMS value": TONE_TAG.info, Metadata: TONE_TAG.info, Condition: TONE_TAG.info, Inherited: TONE_TAG.info,
  "AI · to confirm": TONE_TAG.violet, AI: TONE_TAG.violet, "AI proposal": TONE_TAG.violet, Suggestion: TONE_TAG.violet,
}
export function OriginTag({ origin, className }: { origin: string; className?: string }) {
  const ai = origin.startsWith("AI") || origin === "Suggestion"
  return <span className={cn(TAG, ORIGIN_TONE[origin] ?? TONE_TAG.muted, className)}>{ai && <Sparkles className="h-3 w-3" />}{origin}</span>
}

/* ── Stage context ───────────────────────────────────────────────────────── */

export type Setter = (patch: Partial<Work> | ((w: Work) => Partial<Work>)) => void
export interface FocusReq { stage: StageKey; rowIds: string[]; label: string; key: number }
export interface StageCtx {
  entry: IngestionEntry
  seed: EntrySeed
  work: Work
  set: Setter
  pipe: Pipe
  stage: StageKey
  /** A focus asked for from outside — Autopilot pausing, a check, Review's "Show rows" */
  focusReq: FocusReq | null
  /** Bumped after AI completes this stage — grids open on the diff */
  aiRun: number
  goStage: (k: StageKey, focus?: { rowIds: string[]; label: string }) => void
  /** Drop ids from the to-confirm list — the person has seen and agreed */
  confirm: (ids: string[]) => void
  readOnly?: boolean
}
export type GridFocus = { sheet?: string; rowIds: string[]; label: string } | null

/** A stage's grid focus — starts from an outside request and can be cleared. */
export function useFocus(ctx: StageCtx): [GridFocus, (f: GridFocus) => void] {
  const [focus, setFocus] = useState<GridFocus>(ctx.focusReq?.stage === ctx.stage ? { rowIds: ctx.focusReq.rowIds, label: ctx.focusReq.label } : null)
  const last = useRef(ctx.focusReq?.key)
  useEffect(() => {
    if (!ctx.focusReq || ctx.focusReq.key === last.current || ctx.focusReq.stage !== ctx.stage) return
    last.current = ctx.focusReq.key
    setFocus({ rowIds: ctx.focusReq.rowIds, label: ctx.focusReq.label })
  }, [ctx.focusReq, ctx.stage])
  return [focus, setFocus]
}

/* ── Workspace — the entry's data on the left, the stage's controls on the right ── */

export interface Chrome {
  number: number
  label: string
  goal: string
  status: StageState
  canAi: boolean
  aiBusy: boolean
  onAi: () => void
  onNext: () => void
  onBack: () => void
  onDraft: () => void
  nextLabel: string
  backLabel: string
  pause: { question: string; onDismiss: () => void } | null
  toConfirm: string[]
  onConfirmAll: () => void
  readOnly: boolean
}
export const ChromeContext = createContext<Chrome | null>(null)

export function Workspace({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const c = useContext(ChromeContext)
  const [collapsed, setCollapsed] = useState(false)
  if (!c) return null
  const tone = c.status.blocking ? "error" : c.status.warnings ? "warn" : "ok"
  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <section className="flex min-w-0 flex-1 flex-col">{left}</section>
      {collapsed ? (
        <button type="button" onClick={() => setCollapsed(false)} title="Show the stage controls" className="flex w-11 flex-shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-card py-3 text-muted-foreground hover:text-foreground">
          <ChevronsLeft className="h-4 w-4" />
          <span className="text-[11px] font-semibold [writing-mode:vertical-rl]">{c.number} · {c.label}</span>
          <span className={cn("h-2.5 w-2.5 rounded-full", tone === "error" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500")} />
        </button>
      ) : (
        <aside className="flex w-[320px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card xl:w-[368px] 2xl:w-[404px]">
          <header className="flex-shrink-0 border-b border-border px-3.5 pb-2.5 pt-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stage {c.number} of {STAGE_KEYS.length}</p>
                <h2 className="text-base font-bold leading-6 text-foreground">{c.label}</h2>
              </div>
              <button type="button" onClick={() => setCollapsed(true)} title="Hide the stage controls — more room for the data" className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{c.goal}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className={cn(TAG, "min-w-0 max-w-[62%] truncate", TONE_TAG[tone])} title={c.status.note}>
                {tone === "error" ? <CircleAlert className="h-3 w-3 flex-shrink-0" /> : tone === "warn" ? <AlertTriangle className="h-3 w-3 flex-shrink-0" /> : <Check className="h-3 w-3 flex-shrink-0" />}
                <span className="truncate">{c.status.blocking ? `${c.status.blocking} blocking` : c.status.warnings ? `${c.status.warnings} to look at` : "Complete"}</span>
              </span>
              {c.canAi && !c.readOnly && (
                <Button variant="outline" size="sm" className="h-7 gap-1.5 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/5 hover:text-primary" onClick={c.onAi} disabled={c.aiBusy}>
                  {c.aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Complete with AI
                </Button>
              )}
            </div>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {c.pause && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900"><PauseCircle className="h-3.5 w-3.5" />Autopilot paused here</p>
                <p className="mt-0.5 text-xs text-amber-950">{c.pause.question}</p>
                <button type="button" onClick={c.pause.onDismiss} className="mt-1 text-[11px] font-medium text-amber-900 underline">Got it</button>
              </div>
            )}
            {c.toConfirm.length > 0 && !c.readOnly && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
                <p className="text-xs text-violet-900"><Sparkles className="mr-1 inline h-3 w-3" /><b>{c.toConfirm.length}</b> AI decision{c.toConfirm.length > 1 ? "s here apply" : " here applies"} to this entry only until you confirm {c.toConfirm.length > 1 ? "them" : "it"}.</p>
                <Button size="sm" variant="outline" className="h-6 flex-shrink-0 border-violet-300 bg-white px-2 text-[11px] text-violet-800" onClick={c.onConfirmAll}>Confirm all</Button>
              </div>
            )}
            {right}
          </div>
          <footer className="flex-shrink-0 border-t border-border px-3 py-2.5">
            <p className={cn("mb-2 truncate text-xs", c.status.blocking ? "text-red-600" : "text-muted-foreground")} title={c.status.note}>{c.status.note}</p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" onClick={c.onBack}><ArrowLeft className="h-3.5 w-3.5" />{c.backLabel}</Button>
              {!c.readOnly && <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" onClick={c.onDraft} title="Save draft"><Save className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">Save draft</span></Button>}
              {!c.readOnly && (
                <Button size="sm" className="ml-auto h-8 min-w-0 flex-1 gap-1 px-2.5" disabled={c.status.blocking > 0} onClick={c.onNext} title={c.status.blocking ? c.status.note : undefined}>
                  <span className="truncate">{c.nextLabel}</span><ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                </Button>
              )}
            </div>
          </footer>
        </aside>
      )}
    </div>
  )
}

/* ── Right-column building blocks ───────────────────────────────────────── */

export function PanelCard({ title, right, children, className, tone, subtitle }: {
  title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; tone?: "error" | "warn" | "ai"; subtitle?: React.ReactNode
}) {
  return (
    <div className={cn("rounded-xl border bg-card", tone === "error" ? "border-red-200" : tone === "warn" ? "border-amber-200" : tone === "ai" ? "border-violet-200" : "border-border", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">{title}</h4>
          {subtitle && <p className="text-[11px] leading-4 text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

export function MiniStat({ label, value, tone, onClick, active }: { label: string; value: React.ReactNode; tone?: keyof typeof TONE_TAG; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn("min-w-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors", tone ? TONE_TAG[tone] : "border-border bg-card", onClick && "hover:ring-1 hover:ring-primary/40", active && "ring-2 ring-primary/50")}
    >
      <p className="truncate text-[11px] opacity-80">{label}</p>
      <p className="text-base font-bold leading-5">{value}</p>
    </button>
  )
}

/** A labelled field in the right column — label row, control, optional hint. */
export function Field({ label, required, invalid, hint, children }: { label: string; required?: boolean; invalid?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
        {label}{required && <span className="text-red-500">*</span>}
        {invalid && <span className="ml-auto text-[11px] font-normal text-red-600">Required</span>}
      </p>
      {children}
      {hint && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, invalid, labels, size = "md" }: {
  value: T | ""; options: readonly T[]; onChange: (v: T) => void; invalid?: boolean; labels?: Partial<Record<T, string>>; size?: "sm" | "md"
}) {
  return (
    <div className={cn("flex rounded-lg border p-0.5", invalid ? "border-red-300 bg-red-50/40" : "border-border bg-card")}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("min-w-0 flex-1 truncate whitespace-nowrap rounded-md font-medium transition-colors", size === "sm" ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-[13px]", value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}

/** Property categories — the two values as rectangular tags. */
export function CategoryMultiSelect({ value, onChange }: { value: PropertyCategory[]; onChange: (v: PropertyCategory[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const toggle = (c: PropertyCategory) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-sm transition-colors hover:bg-muted/50", value.length > 0 ? "border-input" : "border-red-300")}
      >
        {value.length === 0 ? <span className="text-muted-foreground">Select categories</span> : (
          <span className="flex min-w-0 items-center gap-1 overflow-hidden">
            {value.map((c) => (
              <span key={c} className={cn(TAG, "border-border bg-card text-foreground")}>
                {c}
                <span role="button" onClick={(e) => { e.stopPropagation(); toggle(c) }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></span>
              </span>
            ))}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card p-1 shadow-md">
          {(["Residential", "Commercial"] as const).map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)} className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary", value.includes(c) && "bg-primary/5")}>
              <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-sm border", value.includes(c) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white")}>
                {value.includes(c) && <Check className="h-2.5 w-2.5" />}
              </span>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** A to-confirm marker with its own Confirm button. */
export function ToConfirm({ ctx, id }: { ctx: StageCtx; id: string }) {
  if (!ctx.work.toConfirm.includes(id)) return null
  return (
    <span className="inline-flex items-center gap-1">
      <OriginTag origin="AI · to confirm" />
      <button type="button" onClick={() => ctx.confirm([id])} className="text-[11px] font-medium text-violet-700 hover:underline">Confirm</button>
    </span>
  )
}

/** Row filters — field · operator · value, all combined with "and". */
export function FilterEditor({ fields, value, onChange }: { fields: FieldDef[]; value: RowFilter[]; onChange: (f: RowFilter[]) => void }) {
  const box = "h-8 min-w-0 rounded-md border border-input bg-white px-1.5 text-xs outline-none focus:border-primary"
  const set = (i: number, patch: Partial<RowFilter>) => onChange(value.map((f, k) => (k === i ? { ...f, ...patch } : f)))
  return (
    <div className="space-y-1.5">
      {value.map((f, i) => {
        const def = fields.find((x) => x.key === f.field)
        const op = FILTER_OPS.find((o) => o.op === f.op)
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_20px] items-center gap-1">
            <select value={f.field} onChange={(e) => set(i, { field: e.target.value as FieldKey })} className={box}>
              {fields.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <select value={f.op} onChange={(e) => set(i, { op: e.target.value as RowFilter["op"] })} className={box}>
              {FILTER_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
            </select>
            {op?.needsValue ? (
              def?.options && (f.op === "is" || f.op === "is-not") ? (
                <select value={f.value ?? ""} onChange={(e) => set(i, { value: e.target.value })} className={box}>
                  <option value="">—</option>
                  {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={f.value ?? ""} onChange={(e) => set(i, { value: e.target.value })} placeholder={f.op === "in" ? "a, b, c" : "value"} className={box} />
              )
            ) : <span />}
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        )
      })}
      <button type="button" onClick={() => onChange([...value, { field: fields[0]?.key ?? "project", op: "is", value: "" }])} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Plus className="h-3 w-3" />Add filter
      </button>
    </div>
  )
}

/* ── Unit tables — typed IMS rows in the shared grid ────────────────────── */

export interface Extra { col: GridCol; get: (r: URow) => Cell }

export function unitTable(rows: URow[], fields: FieldDef[], extra: Extra[] = [], customCols: string[] = []): GridTable {
  return {
    cols: [
      ...fields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options, readOnly: true })),
      ...customCols.map((c) => ({ key: `c:${c}`, label: c, readOnly: true })),
      ...extra.map((e) => ({ ...e.col, readOnly: true })),
    ],
    rows: rows.map((r) => ({
      id: r.id,
      idx: r.idx,
      cells: {
        ...Object.fromEntries(fields.map((f) => [f.key, r.v[f.key] ?? null])),
        ...Object.fromEntries(customCols.map((c) => [`c:${c}`, r.custom?.[c] ?? null])),
        ...Object.fromEntries(extra.map((e) => [e.col.key, e.get(r)])),
      },
    })),
    hasHeader: true,
  }
}
export const customColsOf = (rows: URow[]) => [...new Set(rows.flatMap((r) => Object.keys(r.custom ?? {})))]

/* ── The left pane — entry data, with the original files a click away ─── */

export function DataPane({ ctx, sheets, title = "Entry data", grid = {} }: {
  ctx: StageCtx
  sheets: GridSheet[]
  title?: string
  grid?: Partial<React.ComponentProps<typeof SheetPreviewCard>>
}) {
  const [mode, setMode] = useState<"data" | "files">("data")
  const [fileId, setFileId] = useState(ctx.seed.files[0]?.id ?? "")
  const switcher = <PaneSwitch mode={mode} onMode={setMode} files={ctx.seed.files.length} title={title} />
  if (mode === "files") return <FilesView files={ctx.seed.files} fileId={fileId} onFile={setFileId} titleSlot={switcher} applied={ctx.pipe.applied} />
  return (
    <SheetPreviewCard
      key={`${ctx.stage}`}
      fill
      titleSlot={switcher}
      sheets={sheets}
      showTabs={sheets.length > 1}
      initialView="output"
      forceView={ctx.aiRun ? { view: "diff" as ViewKind, key: ctx.aiRun } : undefined}
      {...grid}
    />
  )
}

export function PaneSwitch({ mode, onMode, files, title }: { mode: "data" | "files"; onMode: (m: "data" | "files") => void; files: number; title: string }) {
  return (
    <div className="flex rounded-lg border border-border bg-muted/60 p-0.5">
      {(["data", "files"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onMode(m)}
          className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors", mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {m === "data" ? <Database className="h-3.5 w-3.5" /> : <Files className="h-3.5 w-3.5" />}
          {m === "data" ? title : `Source files · ${files}`}
        </button>
      ))}
    </div>
  )
}

/** The files the entry was created with — exactly as they arrived. */
export function FilesView({ files, fileId, onFile, titleSlot, applied, highlight, onLineClick, page }: {
  files: SourceFile[]
  fileId: string
  onFile: (id: string) => void
  titleSlot?: React.ReactNode
  applied?: Set<string>
  highlight?: SourceHighlight
  onLineClick?: (fileId: string, line: number, page?: number) => void
  page?: number
}) {
  const file = files.find((f) => f.id === fileId) ?? files[0]
  const chips = (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {files.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onFile(f.id)}
          title={f.name}
          className={cn("flex max-w-[210px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors", f.id === file?.id ? "border-primary bg-primary/5 font-semibold text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground", applied?.has(`remove-file:${f.id}`) && "line-through opacity-50")}
        >
          {FILE_ICON[f.kind]}<span className="truncate">{f.name}</span>
        </button>
      ))}
    </div>
  )
  if (file?.kind === "sheet") {
    const sheets: GridSheet[] = (file.tabs ?? []).map((t) => ({ name: t.name, output: tabTables(file.id, t, new Set()).input }))
    return <SheetPreviewCard key={file.id} fill titleSlot={<>{titleSlot}{files.length > 1 && chips}</>} sheets={sheets} selectable={false} title={file.name} />
  }
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">{titleSlot}{chips}</div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {file ? <SourceViewer file={file} applied={applied} highlight={highlight} onLineClick={onLineClick} page={page} /> : null}
      </div>
    </div>
  )
}

/* ── Source viewers — PDF pages, photos, messages ───────────────────────── */

export const FILE_ICON: Record<SourceFile["kind"], React.ReactNode> = {
  sheet: <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />,
  pdf: <FileText className="h-3.5 w-3.5 flex-shrink-0 text-rose-600" />,
  image: <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-sky-600" />,
  text: <MessageSquareText className="h-3.5 w-3.5 flex-shrink-0 text-violet-600" />,
}
export const fileMeta = (f: SourceFile) =>
  f.kind === "sheet" ? `${f.tabs?.length ?? 0} tabs` : f.kind === "pdf" ? `${f.pages?.length ?? 0} pages` : f.kind === "text" ? `${f.lines?.length ?? 0} lines` : f.image?.kind === "render" ? "render" : "photo"
export const fmtSize = (b: number) => (b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`)

export interface SourceHighlight { fileId: string; line: number; token?: string; page?: number }

/** A line with the highlighted token marked — "click a cell, see its place on the page". */
function Line({ text, on, token }: { text: string; on: boolean; token?: string }) {
  if (!on || !token) return <>{text}</>
  const i = text.toLowerCase().indexOf(token.toLowerCase())
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="rounded bg-amber-300 px-0.5 text-amber-950">{text.slice(i, i + token.length)}</mark>{text.slice(i + token.length)}</>
}

export function SourceViewer({ file, applied, highlight, onLineClick, page, onToggle, compact }: {
  file: SourceFile
  applied?: Set<string>
  highlight?: SourceHighlight
  onLineClick?: (fileId: string, line: number, page?: number) => void
  page?: number
  onToggle?: (id: string) => void
  compact?: boolean
}) {
  const hl = highlight?.fileId === file.id ? highlight : undefined
  if (file.kind === "pdf") return <PdfPages file={file} applied={applied ?? new Set()} onToggle={onToggle} onlyPage={page} highlight={hl} onLineClick={onLineClick} />
  if (file.kind === "image") return <PhotoDoc file={file} upright={!file.image?.rotated || !!applied?.has(`rotate:${file.id}`)} highlight={hl} onLineClick={onLineClick} compact={compact} />
  if (file.kind === "text") return <TextBubble file={file} applied={applied ?? new Set()} onToggle={onToggle} highlight={hl} onLineClick={onLineClick} />
  return null
}

/** A photographed price list — paper on a desk, optionally still sideways. */
export function PhotoDoc({ file, upright, highlight, compact, onLineClick }: { file: SourceFile; upright: boolean; highlight?: SourceHighlight; compact?: boolean; onLineClick?: (fileId: string, line: number) => void }) {
  const img = file.image
  if (!img) return null
  if (img.kind === "render") return <img src={img.url ?? "/placeholder.jpg"} alt={img.title} className={cn("w-full rounded-lg object-cover", compact ? "h-40" : "h-80")} />
  const lines = img.lines.length ? img.lines : ["(same content as the earlier photo)"]
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-lg bg-stone-300/70", compact ? "min-h-56 p-3" : "min-h-80 p-6")}>
      <div className={cn("w-full max-w-lg origin-center rounded-sm bg-[#fbfaf6] p-4 shadow-lg transition-transform duration-500", upright ? "-rotate-1" : "rotate-90 scale-75")}>
        <p className="mb-2 border-b border-stone-300 pb-1 text-center font-serif text-sm font-bold tracking-wide text-stone-800">{img.title.toUpperCase()}</p>
        <div className="space-y-1">
          {lines.map((l, i) => (
            <p key={i} onClick={() => onLineClick?.(file.id, i)} className={cn("rounded px-1 font-mono text-[11px]", onLineClick && "cursor-pointer", highlight?.line === i ? "bg-amber-100 text-amber-950 ring-1 ring-amber-400" : "text-stone-700 hover:bg-stone-100")}>
              <Line text={l} on={highlight?.line === i} token={highlight?.token} />
            </p>
          ))}
        </div>
        <p className="mt-2 text-right font-serif text-[9px] italic text-stone-500">Prices subject to change</p>
      </div>
    </div>
  )
}

export function PdfPages({ file, applied, onToggle, onlyPage, highlight, onLineClick }: {
  file: SourceFile; applied: Set<string>; onToggle?: (id: string) => void; onlyPage?: number; highlight?: SourceHighlight; onLineClick?: (fileId: string, line: number, page?: number) => void
}) {
  const pages = (file.pages ?? []).filter((p) => !onlyPage || p.n === onlyPage)
  const KIND = { cover: "Cover", prices: "Price list", plans: "Floor plans", terms: "Payment terms" } as const
  return (
    <div className={cn("grid gap-3", onlyPage ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-4")}>
      {pages.map((p) => {
        const id = `exclude-page:${file.id}:${p.n}`
        const off = applied.has(id)
        return (
          <div key={p.n} className={cn("rounded-lg border border-border bg-muted/40 p-2", off && "opacity-50")}>
            <div className={cn("flex flex-col rounded-sm bg-white p-3 shadow-sm", onlyPage ? "min-h-[300px]" : "aspect-[3/4]")}>
              <p className={cn("font-semibold text-stone-800", p.kind === "cover" ? "mt-auto text-center text-sm" : onlyPage ? "text-sm" : "text-[11px]")}>{p.title}</p>
              {p.kind !== "cover" && (
                <div className="mt-2 space-y-1">
                  {p.lines.map((l, i) => {
                    const on = highlight?.page === p.n && highlight?.line === i
                    return (
                      <p key={i} onClick={() => onLineClick?.(file.id, i, p.n)} className={cn("truncate rounded px-0.5 font-mono", onlyPage ? "text-[11.5px] leading-5" : "text-[8px]", onLineClick && "cursor-pointer", on ? "bg-amber-100 text-amber-950 ring-1 ring-amber-400" : "text-stone-600 hover:bg-stone-100")}>
                        <Line text={l} on={on} token={highlight?.token} />
                      </p>
                    )
                  })}
                </div>
              )}
              {p.kind === "cover" && <p className="mb-auto mt-1 text-center text-[10px] text-stone-500">{p.lines.join(" · ")}</p>}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-[11px] font-medium text-foreground">p.{p.n} · {KIND[p.kind]}</span>
              {onToggle && (
                <button type="button" onClick={() => onToggle(id)} className={cn("text-[11px] font-medium", off ? "text-primary hover:underline" : "text-muted-foreground hover:text-red-600")}>
                  {off ? "Keep page" : "Drop page"}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TextBubble({ file, applied, onToggle, highlight, onLineClick }: { file: SourceFile; applied: Set<string>; onToggle?: (id: string) => void; highlight?: SourceHighlight; onLineClick?: (fileId: string, line: number) => void }) {
  return (
    <div className="rounded-lg bg-[#efeae2] p-4">
      <div className="ml-auto max-w-xl rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">
        {(file.lines ?? []).map((line, i) => {
          const id = `noise:${file.id}:${i}`
          const noisy = /good morning|book now|call |hello|thanks|🌞/i.test(line)
          const off = applied.has(id)
          const on = highlight?.line === i
          return (
            <p
              key={i}
              onClick={() => { if (noisy && onToggle) onToggle(id); else onLineClick?.(file.id, i) }}
              title={noisy && onToggle ? (off ? "Removed before extraction — click to keep" : "Noise — click to remove") : undefined}
              className={cn("rounded px-1 text-[13px] leading-6", (noisy && onToggle) || onLineClick ? "cursor-pointer" : "",
                on ? "bg-amber-100 text-amber-950 ring-1 ring-amber-400" : off ? "text-stone-400 line-through" : noisy && onToggle ? "bg-amber-100 text-amber-950" : "text-stone-800")}
            >
              <Line text={line} on={on} token={highlight?.token} />
            </p>
          )
        })}
        <p className="text-right text-[10px] text-stone-500">09:41 ✓✓</p>
      </div>
    </div>
  )
}

/* ── Card preview — same structure as the launch offering card ─────────── */

export interface GroupedCardCell { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }

export function GroupedPropertyCard({ propertyId, tags, actions, title, keywords, cells, tint, selectable, selected, onToggle, children }: {
  propertyId?: string | null
  tags?: React.ReactNode
  actions?: React.ReactNode
  title: string
  keywords?: string
  cells: GroupedCardCell[]
  tint?: "warn" | "error" | null
  selectable?: boolean
  selected?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  const tintBg = tint === "warn" ? "bg-amber-50/40" : tint === "error" ? "bg-red-50/40" : undefined
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", tint === "warn" ? "border-amber-300" : tint === "error" ? "border-red-300" : "border-border")}>
      <div className={cn("flex items-center gap-3 border-b border-border px-3 py-2", tintBg)}>
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-muted-foreground">
          {selectable && <Checkbox className="h-4 w-4" checked={selected} onCheckedChange={onToggle} />}
          {propertyId ? <span className="flex items-center gap-1">Property ID: <IdCopy value={propertyId} /></span> : <span className="italic">New card</span>}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">{tags}</div>
        {actions && <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">{actions}</div>}
      </div>
      <div className={cn("border-b border-border px-3 py-2", tintBg)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", tint === "error" ? "bg-red-500" : tint === "warn" ? "bg-amber-500" : "bg-emerald-500")} />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        {keywords && <p className="mt-0.5 line-clamp-1 pl-4 text-xs text-muted-foreground">{keywords}</p>}
      </div>
      <div className={cn("px-3 py-2.5", tintBg)}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {cells.map((c, i) => <OfferingCtxCell key={`${c.label}-${i}`} label={c.label} icon={c.icon} value={c.value} sub={c.sub} />)}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ── Small helpers ───────────────────────────────────────────────────────── */

export const rowTitle = (r: URow) => {
  const beds = typeof r.v.bedrooms === "number" ? r.v.bedrooms : Number(String(r.v.bedrooms ?? "").match(/\d+/)?.[0] ?? 0) || null
  return [txt(r.v.unitCode), `${beds ? `${beds}BR ` : ""}${txt(r.v.propertyType) || "Unit"}`, typeof r.v.bua === "number" ? `${r.v.bua}${typeof r.v.buaTo === "number" ? `–${r.v.buaTo}` : ""} m²` : ""].filter(Boolean).join(" · ")
}
export const fieldLabel = (k: string) => FIELD_LABEL[k as FieldKey] ?? k
export const markOf = (tone: CellMark["tone"], note?: string): CellMark => ({ tone, note })
export function useOnce<T>(fn: () => T): T { return useMemo(fn, []) } // eslint-disable-line react-hooks/exhaustive-deps
export { CheckCircle2 }

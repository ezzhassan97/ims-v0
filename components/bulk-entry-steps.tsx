"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Eye, EyeOff,
  FileSpreadsheet, FileText, Image as ImageIcon, Info, MessageSquareText, Plus, RotateCw, Sparkles, Trash2, Undo2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DeveloperSelect, IdTag, ProjectTreeSelect } from "@/components/table-kit"
import { fmtDateTime } from "@/components/projects-list-page"
import { OfferingCtxCell, IdCopy } from "@/components/launch-details-page"
import { SheetPreviewCard, displayCell, type CellMark, type GridSheet, type ViewKind } from "@/components/sheet-preview"
import {
  hashStr, isBlank, mapTargets, headerKey, fmtInt, txt, colLetter,
  type Cell, type CleanupGroup, type CleanupItem, type EntrySeed, type FieldDef, type FieldKey, type GridCol, type GridTable,
  type Rule, type SourceFile, type URow,
} from "@/lib/bulk-ingestion"
import { addRow, editCell, type Pipe, type Work } from "@/lib/bulk-entry-flow"
import { PROJECT_DEVELOPERS, buildProjectTreeNodes } from "@/lib/projects-mock"
import { ENTRIES, ENTRY_USERS, SALE_TYPES, type IngestionEntry, type PropertyCategory } from "@/lib/ingestion-mock"

/* ── Shared step UI ──────────────────────────────────────────────────────── */

export const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
export const TONE_TAG = {
  error: "border-red-200 bg-red-50 text-red-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-border bg-muted text-muted-foreground",
} as const

export type Setter = (patch: Partial<Work> | ((w: Work) => Partial<Work>)) => void
export interface StepCtx {
  entry: IngestionEntry
  seed: EntrySeed
  work: Work
  set: Setter
  pipe: Pipe
  /** Bumped after AI runs so the grid shows what changed */
  forceView?: { view: ViewKind; key: number }
}

/** Grid on the left, the step's controls on the right. */
export function Split({ children, panel }: { children: React.ReactNode; panel: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">{children}</div>
      <aside className="space-y-3 xl:sticky xl:top-0 xl:max-h-[calc(100vh-150px)] xl:self-start xl:overflow-y-auto xl:pb-2">{panel}</aside>
    </div>
  )
}

export function PanelCard({ title, right, children, className, tone }: {
  title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; tone?: "error" | "warn"
}) {
  return (
    <div className={cn("rounded-xl border bg-card", tone === "error" ? "border-red-200" : tone === "warn" ? "border-amber-200" : "border-border", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">{title}</h4>
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
      className={cn("rounded-lg border px-2.5 py-1.5 text-left transition-colors", tone ? TONE_TAG[tone] : "border-border bg-card", onClick && "hover:ring-1 hover:ring-primary/40", active && "ring-2 ring-primary/50")}
    >
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="text-base font-bold leading-5">{value}</p>
    </button>
  )
}

export interface Extra { col: GridCol; get: (r: URow) => Cell }

export function unitTable(rows: URow[], fields: FieldDef[], extra: Extra[] = []): GridTable {
  return {
    cols: [...fields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options })), ...extra.map((e) => ({ ...e.col, readOnly: true }))],
    rows: rows.map((r) => ({
      id: r.id,
      idx: r.idx,
      cells: { ...Object.fromEntries(fields.map((f) => [f.key, r.v[f.key] ?? null])), ...Object.fromEntries(extra.map((e) => [e.col.key, e.get(r)])) },
    })),
    hasHeader: true,
  }
}

type EditsKey = "extractEdits" | "mapEdits" | "transformEdits" | "formatEdits" | "reviewEdits"
type GridFocus = { sheet?: string; rowIds: string[]; label: string } | null

/** A step's unit table in the shared grid — edits land in that step's own edit layer. */
export function UnitsGrid({
  ctx, title = "Units", input, output, extra = [], inputExtra = [], editsKey, allowDelete, markCell, markRow, focus, onClearFocus,
  bulkActions, onRowClick, activeRowId, viewLabels, initialView, headerExtra,
}: {
  ctx: StepCtx
  title?: string
  input?: URow[]
  output: URow[]
  extra?: Extra[]
  inputExtra?: Extra[]
  editsKey?: EditsKey
  allowDelete?: boolean
  markCell?: (rowId: string, colKey: string, view: ViewKind) => CellMark | null | undefined
  markRow?: (rowId: string, view: ViewKind) => CellMark | null | undefined
  focus?: GridFocus
  onClearFocus?: () => void
  bulkActions?: (ctx: { sheet: string; rowIds: string[]; clear: () => void }) => React.ReactNode
  onRowClick?: (rowId: string) => void
  activeRowId?: string | null
  viewLabels?: { input?: string; output?: string }
  initialView?: ViewKind
  headerExtra?: React.ReactNode
}) {
  const { pipe, set } = ctx
  const sheet: GridSheet = useMemo(() => ({
    name: title,
    input: input ? unitTable(input, pipe.fields, inputExtra) : undefined,
    output: unitTable(output, pipe.fields, extra),
  }), [title, input, output, pipe.fields, extra, inputExtra])
  const fieldKeys = new Set(pipe.fields.map((f) => f.key as string))
  return (
    <SheetPreviewCard
      sheets={[sheet]}
      title={title}
      showTabs={false}
      initialView={initialView ?? "output"}
      forceView={ctx.forceView}
      editable={!!editsKey}
      onEdit={editsKey ? (_, rowId, key, value) => {
        if (!fieldKeys.has(key)) return
        set((w) => ({ [editsKey]: editCell(w[editsKey], rowId, key as FieldKey, value) }) as Partial<Work>)
      } : undefined}
      onDeleteRows={editsKey && allowDelete ? (_, ids) => {
        set((w) => ({ [editsKey]: { ...w[editsKey], deleted: [...new Set([...w[editsKey].deleted, ...ids])] } }) as Partial<Work>)
        toast.success(`${ids.length} row${ids.length > 1 ? "s" : ""} removed from the entry`)
      } : undefined}
      onAddRow={editsKey ? () => set((w) => ({ [editsKey]: addRow(w[editsKey], output) }) as Partial<Work>) : undefined}
      markCell={markCell ? (_, rowId, key, view) => markCell(rowId, key, view) : undefined}
      markRow={markRow ? (_, rowId, view) => markRow(rowId, view) : undefined}
      focus={focus}
      onClearFocus={onClearFocus}
      bulkActions={bulkActions}
      onRowClick={onRowClick ? (_, id) => onRowClick(id) : undefined}
      activeRowId={activeRowId}
      viewLabels={viewLabels}
      headerExtra={headerExtra}
    />
  )
}

const rowTitle = (r: URow) => {
  const beds = firstBeds(r)
  const bua = displayCell(r.v.bua, "number")
  const to = displayCell(r.v.buaTo, "number")
  return [txt(r.v.unitCode), `${beds ? `${beds}BR ` : ""}${txt(r.v.propertyType) || "Unit"}`, bua && `${bua}${to ? `–${to}` : ""} m²`].filter(Boolean).join(" · ")
}
const firstBeds = (r: URow) => {
  const b = r.v.bedrooms
  return typeof b === "number" ? b : Number(String(b ?? "").match(/\d+/)?.[0] ?? 0) || null
}

/* ── Small pickers ───────────────────────────────────────────────────────── */

export function Segmented<T extends string>({ value, options, onChange, invalid }: { value: T | ""; options: readonly T[]; onChange: (v: T) => void; invalid?: boolean }) {
  return (
    <div className={cn("flex rounded-lg border p-0.5", invalid ? "border-red-300 bg-red-50/40" : "border-border bg-card")}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("flex-1 whitespace-nowrap rounded-md px-2.5 py-1 text-sm font-medium transition-colors", value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Property categories — the two values, shown as white tags. */
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
        className={cn("flex min-h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 py-1 text-sm transition-colors hover:bg-muted/50",
          value.length > 0 ? "border-input" : "border-red-300")}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">Select categories</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1">
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

/**
 * Grouped-property card — same structure as the launch offering card
 * (header strip: IDs · tags · icon actions → status-dot title + keywords → OfferingCtxCell grid).
 */
export interface GroupedCardCell { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }

export function GroupedPropertyCard({ propertyId, metadataId, tags, actions, title, keywords, cells, tint, selectable, selected, onToggle, children }: {
  propertyId?: string | null
  metadataId?: string | null
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
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card",
      tint === "warn" ? "border-amber-300" : tint === "error" ? "border-red-300" : "border-border")}>
      <div className={cn("flex items-center gap-3 border-b border-border px-4 py-2", tintBg)}>
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-muted-foreground">
          {selectable && <Checkbox className="h-4 w-4" checked={selected} onCheckedChange={onToggle} />}
          {propertyId ? (
            <>
              <span className="flex items-center gap-1">Property ID: <IdCopy value={propertyId} /></span>
              {metadataId && <><span>·</span><span className="flex items-center gap-1">Metadata ID: <IdCopy value={metadataId} /></span></>}
            </>
          ) : (
            <span className="italic">New grouped property</span>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">{tags}</div>
        {actions && <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">{actions}</div>}
      </div>
      <div className={cn("border-b border-border px-4 py-2", tintBg)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", tint === "error" ? "bg-red-500" : tint === "warn" ? "bg-amber-500" : "bg-emerald-500")} />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        {keywords && <p className="mt-0.5 line-clamp-1 pl-4 text-xs text-muted-foreground">{keywords}</p>}
      </div>
      <div className={cn("px-4 py-2.5", tintBg)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 lg:grid-cols-4">
          {cells.map((c, i) => <OfferingCtxCell key={`${c.label}-${i}`} label={c.label} icon={c.icon} value={c.value} sub={c.sub} />)}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ── Source documents — shared by Initial Setup and Extraction ───────────── */

export const FILE_ICON: Record<SourceFile["kind"], React.ReactNode> = {
  sheet: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />,
  pdf: <FileText className="h-4 w-4 text-rose-600" />,
  image: <ImageIcon className="h-4 w-4 text-sky-600" />,
  text: <MessageSquareText className="h-4 w-4 text-violet-600" />,
}
export const fileMeta = (f: SourceFile) =>
  f.kind === "sheet" ? `${f.tabs?.length ?? 0} tabs` : f.kind === "pdf" ? `${f.pages?.length ?? 0} pages` : f.kind === "text" ? `${f.lines?.length ?? 0} lines` : f.image?.kind === "render" ? "render" : "photo"
export const fmtSize = (b: number) => (b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`)

/** A photographed price list — paper on a desk, optionally still sideways. */
export function PhotoDoc({ file, upright, highlight, compact }: { file: SourceFile; upright: boolean; highlight?: number; compact?: boolean }) {
  const img = file.image
  if (!img) return null
  if (img.kind === "render") {
    return <img src={img.url ?? "/placeholder.jpg"} alt={img.title} className={cn("w-full rounded-lg object-cover", compact ? "h-40" : "h-72")} />
  }
  const lines = img.lines.length ? img.lines : ["(same content as the earlier photo)"]
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-lg bg-stone-300/70", compact ? "h-56 p-3" : "h-80 p-6")}>
      <div className={cn("w-full max-w-md origin-center rounded-sm bg-[#fbfaf6] p-4 shadow-lg transition-transform duration-500", upright ? "-rotate-1" : "rotate-90 scale-75")}>
        <p className="mb-2 border-b border-stone-300 pb-1 text-center font-serif text-sm font-bold tracking-wide text-stone-800">{img.title.toUpperCase()}</p>
        <div className="space-y-1">
          {lines.map((l, i) => (
            <p key={i} className={cn("rounded px-1 font-mono text-[10px] text-stone-700", highlight === i && "bg-amber-200 text-amber-950 ring-1 ring-amber-500")}>{l}</p>
          ))}
        </div>
        <p className="mt-2 text-right font-serif text-[9px] italic text-stone-500">Prices subject to change</p>
      </div>
    </div>
  )
}

export function PdfPages({ file, applied, onToggle, onlyPage, highlight }: {
  file: SourceFile; applied: Set<string>; onToggle?: (id: string) => void; onlyPage?: number; highlight?: number
}) {
  const pages = (file.pages ?? []).filter((p) => !onlyPage || p.n === onlyPage)
  const KIND = { cover: "Cover", prices: "Price list", plans: "Floor plans", terms: "Payment terms" } as const
  return (
    <div className={cn("grid gap-3", onlyPage ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4")}>
      {pages.map((p) => {
        const id = `exclude-page:${file.id}:${p.n}`
        const off = applied.has(id)
        return (
          <div key={p.n} className={cn("rounded-lg border border-border bg-muted/40 p-2", off && "opacity-50")}>
            <div className={cn("flex flex-col rounded-sm bg-white p-3 shadow-sm", onlyPage ? "min-h-[220px]" : "aspect-[3/4]")}>
              <p className={cn("font-semibold text-stone-800", p.kind === "cover" ? "mt-auto text-center text-sm" : "text-[11px]")}>{p.title}</p>
              {p.kind !== "cover" && (
                <div className="mt-2 space-y-1">
                  {p.lines.map((l, i) => (
                    <p key={i} className={cn("truncate rounded px-0.5 font-mono text-[8px] text-stone-600", onlyPage && "text-[10px]", highlight === i && "bg-amber-200 text-amber-950 ring-1 ring-amber-500")}>{l}</p>
                  ))}
                </div>
              )}
              {p.kind === "cover" && <p className="mb-auto mt-1 text-center text-[10px] text-stone-500">{p.lines.join(" · ")}</p>}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-[11px] font-medium text-foreground">p.{p.n} · {KIND[p.kind]}</span>
              {onToggle && (
                <button type="button" onClick={() => onToggle(id)} title={off ? "Include in extraction" : "Exclude from extraction"} className="text-muted-foreground hover:text-foreground">
                  {off ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TextBubble({ file, applied, onToggle, highlight }: { file: SourceFile; applied: Set<string>; onToggle?: (id: string) => void; highlight?: number }) {
  return (
    <div className="rounded-lg bg-[#efeae2] p-4">
      <div className="ml-auto max-w-lg rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">
        {(file.lines ?? []).map((line, i) => {
          const id = `noise:${file.id}:${i}`
          const noisy = /good morning|book now|call |hello|thanks/i.test(line)
          const off = applied.has(id)
          return (
            <p
              key={i}
              onClick={noisy && onToggle ? () => onToggle(id) : undefined}
              title={noisy ? (off ? "Stripped before extraction — click to keep" : "No unit data — click to strip") : undefined}
              className={cn("rounded px-1 text-[13px] leading-6 text-stone-800",
                noisy && "cursor-pointer",
                noisy && !off && "bg-amber-100",
                off && "text-stone-400 line-through",
                highlight === i && "bg-amber-200 text-amber-950 ring-1 ring-amber-500")}
            >
              {line}
            </p>
          )
        })}
        <p className="text-right text-[10px] text-stone-500">09:41 ✓✓</p>
      </div>
    </div>
  )
}

/* ── Step 1 · Initial Setup ──────────────────────────────────────────────── */

const DETECT_ICON = { error: CircleAlert, warn: AlertTriangle, info: Info } as const
const DETECT_TONE = { error: "text-red-600", warn: "text-amber-600", info: "text-sky-600" } as const

export function StepSetup({ ctx }: { ctx: StepCtx }) {
  const { work, set, pipe, seed } = ctx
  const [fileId, setFileId] = useState(seed.files[0]?.id ?? "")
  const [tab, setTab] = useState<string | undefined>(undefined)
  const [focus, setFocus] = useState<GridFocus>(null)
  const [viewReq, setViewReq] = useState<{ view: ViewKind; key: number } | undefined>(undefined)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const file = seed.files.find((f) => f.id === fileId) ?? seed.files[0]
  const toggle = (id: string) => set((w) => ({ applied: w.applied.includes(id) ? w.applied.filter((x) => x !== id) : [...w.applied, id] }))
  const setMany = (ids: string[], on: boolean) => set((w) => ({ applied: on ? [...new Set([...w.applied, ...ids])] : w.applied.filter((x) => !ids.includes(x)) }))
  const projTree = useMemo(() => buildProjectTreeNodes((p) => !work.developerId || p.developer.id === work.developerId), [work.developerId])
  const unitCodes = useMemo(() => pipe.setup.filter((s) => !s.ignored).reduce((n, s) => n + s.output.rows.filter((r) => Object.values(r.cells).some((c) => /^[A-Z]{2,4}-/i.test(txt(c)))).length, 0), [pipe.setup])
  const pendingAll = pipe.detections.flatMap((g) => g.items).filter((i) => !pipe.applied.has(i.id))

  // Detection highlights on the raw (input) sheet
  const rowMarks = useMemo(() => {
    const m = new Map<string, CellMark>()
    pipe.detections.forEach((g) => g.items.forEach((it) => {
      if (!it.rows || g.kind === "merged" || g.tone === "info") return
      const done = pipe.applied.has(it.id)
      it.rows.forEach((n) => m.set(`${it.tab}|r${n}`, { tone: done ? "ok" : g.tone === "error" ? "error" : "warn", note: `${g.title}${done ? " — removed in the output" : " — not applied yet"}` }))
    }))
    return m
  }, [pipe.detections, pipe.applied])
  const colMarks = useMemo(() => {
    const m = new Map<string, CellMark>()
    pipe.detections.forEach((g) => g.items.forEach((it) => {
      if (g.kind !== "empty-cols" || !it.cols) return
      m.set(`${it.tab}|${it.cols[0]}`, { tone: "error", note: `Completely empty column${pipe.applied.has(it.id) ? " — removed in the output" : ""}` })
    }))
    return m
  }, [pipe.detections, pipe.applied])
  const mergedCells = useMemo(() => {
    const m = new Map<string, CellMark>()
    pipe.detections.forEach((g) => g.items.forEach((it) => {
      if (g.kind !== "merged" || !it.rows || !it.cols) return
      it.rows.forEach((n) => m.set(`${it.tab}|r${n}|${it.cols![0]}`, { tone: "warn", note: `Merged cell${pipe.applied.has(it.id) ? " — unmerged and filled down in the output" : " — unmerge to fill every row"}` }))
    }))
    return m
  }, [pipe.detections, pipe.applied])

  const focusItem = (it: CleanupItem) => {
    setFileId(it.fileId)
    if (it.tab) setTab(it.tab)
    setFocus(it.rows?.length ? { sheet: it.tab, rowIds: it.rows.map((n) => `r${n}`), label: it.label } : null)
    setViewReq({ view: "input", key: Date.now() })
  }

  const sheetSheets: GridSheet[] = pipe.setup.filter((s) => s.fileId === file?.id).map((s) => ({ name: s.tab, input: s.input, output: s.output }))
  const excludedCols = Object.fromEntries(pipe.setup.filter((s) => s.fileId === file?.id).map((s) => [s.tab, s.input.cols.map((c) => c.key).filter((k) => pipe.applied.has(`drop-col:${s.fileId}:${s.tab}:${k}`) || pipe.applied.has(`empty-col:${s.fileId}:${s.tab}:${k}`))]))

  const missing = { dev: !work.developerId, proj: !work.projectIds.length, sale: !work.saleType, cat: !work.categories.length }
  const label = (text: string, bad: boolean) => <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground">{text}<span className="text-red-500">*</span>{bad && <span className="ml-auto text-[11px] font-normal text-red-600">Required</span>}</p>

  return (
    <div className="space-y-4">
      {/* Entry settings — what the popup detected, editable */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto_auto_minmax(0,1fr)]">
          <div>
            {label("Developer", missing.dev)}
            <DeveloperSelect developers={PROJECT_DEVELOPERS} value={work.developerId} onChange={(id) => set((w) => ({ developerId: id, projectIds: id === w.developerId ? w.projectIds : [] }))} className="w-full" />
          </div>
          <div>
            {label("Projects", missing.proj)}
            <ProjectTreeSelect multi projects={projTree} values={work.projectIds} onValuesChange={(ids) => set({ projectIds: ids })} className="w-full" />
          </div>
          <div>
            {label("Sale type", missing.sale)}
            <Segmented value={work.saleType} options={SALE_TYPES} onChange={(v) => set({ saleType: v })} invalid={missing.sale} />
          </div>
          <div>
            {label("Data type", false)}
            <Segmented value={work.dataType} options={["Automatic", "Manual"] as const} onChange={(v) => set({ dataType: v })} />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-violet-500" />
              {pipe.sheetSource ? `${unitCodes} unit codes detected` : work.dataType === "Automatic" ? "Unit codes found in the documents" : "No unit codes — rows are grouped properties"}
            </p>
          </div>
          <div>
            {label("Property categories", missing.cat)}
            <CategoryMultiSelect value={work.categories} onChange={(v) => set({ categories: v })} />
          </div>
        </div>
      </div>

      <PreviousEntry ctx={ctx} />

      {/* Files & cleanup */}
      <Split
        panel={
          <PanelCard
            title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />Checks &amp; cleanup</>}
            right={pendingAll.length > 0
              ? <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => { setMany(pendingAll.map((i) => i.id), true); toast.success(`${pendingAll.length} cleanups applied`); setViewReq({ view: "diff", key: Date.now() }) }}>Apply all ({pendingAll.length})</Button>
              : <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />All applied</span>}
          >
            <p className="mb-2 text-xs text-muted-foreground">Run automatically on upload. Apply everything at once or one by one — click an item to see it in the preview.</p>
            <div className="space-y-2">
              {pipe.detections.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing to clean — the files look good.</p>}
              {pipe.detections.map((g) => <DetectionGroup key={g.kind} g={g} applied={pipe.applied} open={openGroups.includes(g.kind)} onOpen={() => setOpenGroups((o) => (o.includes(g.kind) ? o.filter((x) => x !== g.kind) : [...o, g.kind]))} onToggle={toggle} onSetMany={setMany} onFocus={focusItem} />)}
            </div>
          </PanelCard>
        }
      >
        {/* File switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {seed.files.map((f) => {
            const removed = pipe.applied.has(`remove-file:${f.id}`)
            const issues = pipe.detections.flatMap((g) => g.items).filter((i) => i.fileId === f.id && !pipe.applied.has(i.id)).length
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFileId(f.id); setFocus(null); setTab(undefined) }}
                className={cn("flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left transition-colors",
                  f.id === file?.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40", removed && "opacity-50")}
              >
                {FILE_ICON[f.kind]}
                <span className="min-w-0">
                  <span className={cn("block max-w-[220px] truncate text-sm font-medium", removed && "line-through")}>{f.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{fileMeta(f)} · {fmtSize(f.size)} · {f.origin}</span>
                </span>
                {issues > 0 && !removed && <span className={cn(TAG, TONE_TAG.warn)}>{issues}</span>}
                <span
                  role="button"
                  title={removed ? "Restore file" : "Remove file from the entry"}
                  onClick={(e) => { e.stopPropagation(); toggle(`remove-file:${f.id}`) }}
                  className="ml-1 text-muted-foreground hover:text-red-600"
                >
                  {removed ? <Undo2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
              </button>
            )
          })}
        </div>

        {file && pipe.applied.has(`remove-file:${file.id}`) ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            This file is removed from the entry. <button className="text-primary hover:underline" onClick={() => toggle(`remove-file:${file.id}`)}>Restore it</button>
          </div>
        ) : file?.kind === "sheet" ? (
          <SheetPreviewCard
            key={file.id}
            sheets={sheetSheets}
            title="Sheet preview"
            initialView="input"
            forceView={viewReq ?? ctx.forceView}
            ignored={pipe.setup.filter((s) => s.fileId === file.id && s.ignored).map((s) => s.tab)}
            onToggleIgnore={(t) => toggle(`ignore-tab:${file.id}:${t}`)}
            onToggleColumn={(t, col) => toggle(pipe.applied.has(`empty-col:${file.id}:${t}:${col}`) ? `empty-col:${file.id}:${t}:${col}` : `drop-col:${file.id}:${t}:${col}`)}
            excludedCols={excludedCols}
            activeSheet={tab}
            onActiveSheetChange={(t) => { setTab(t); setFocus(null) }}
            markRow={(t, rowId, view) => (view === "input" ? rowMarks.get(`${t}|${rowId}`) : null)}
            markCol={(t, col, view) => (view === "input" ? colMarks.get(`${t}|${col}`) : null)}
            markCell={(t, rowId, col, view) => (view === "input" ? mergedCells.get(`${t}|${rowId}|${col}`) : null)}
            focus={focus}
            onClearFocus={() => setFocus(null)}
            selectable={false}
          />
        ) : file?.kind === "pdf" ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{file.name} <span className="font-normal text-muted-foreground">· eye toggles a page in or out of extraction</span></p>
            <PdfPages file={file} applied={pipe.applied} onToggle={toggle} />
          </div>
        ) : file?.kind === "image" ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{file.name}</p>
              <div className="flex items-center gap-1.5">
                {file.image?.rotated && (
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => toggle(`rotate:${file.id}`)}>
                    <RotateCw className="h-3.5 w-3.5" />{pipe.applied.has(`rotate:${file.id}`) ? "Undo rotate" : "Rotate upright"}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => toggle(`remove-file:${file.id}`)}>
                  <Trash2 className="h-3.5 w-3.5" />Remove photo
                </Button>
              </div>
            </div>
            <PhotoDoc file={file} upright={!file.image?.rotated || pipe.applied.has(`rotate:${file.id}`)} />
            {file.image?.kind === "render" && <p className="mt-2 text-xs text-muted-foreground">Recognized as a render — {pipe.applied.has(`render:${file.id}`) ? "kept out of extraction and offered in Grouping & Media." : "will be read as a price list unless you apply the check."}</p>}
          </div>
        ) : file ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{file.name} <span className="font-normal text-muted-foreground">· click a highlighted line to strip or keep it</span></p>
            <TextBubble file={file} applied={pipe.applied} onToggle={toggle} />
          </div>
        ) : null}
      </Split>
    </div>
  )
}

function DetectionGroup({ g, applied, open, onOpen, onToggle, onSetMany, onFocus }: {
  g: CleanupGroup; applied: Set<string>; open: boolean; onOpen: () => void
  onToggle: (id: string) => void; onSetMany: (ids: string[], on: boolean) => void; onFocus: (it: CleanupItem) => void
}) {
  const Icon = DETECT_ICON[g.tone]
  const done = g.items.filter((i) => applied.has(i.id)).length
  const all = done === g.items.length
  return (
    <div className={cn("rounded-lg border", all ? "border-emerald-200 bg-emerald-50/30" : "border-border")}>
      <div className="flex items-start gap-2 px-2.5 py-2">
        <button type="button" onClick={onOpen} className="mt-0.5 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", all ? "text-emerald-600" : DETECT_TONE[g.tone])} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-medium leading-5 text-foreground">{g.title} <span className="text-muted-foreground">· {g.items.length}</span></p>
          <p className="text-[11px] leading-4 text-muted-foreground">{g.detail}</p>
        </button>
        {all ? (
          <button type="button" onClick={() => onSetMany(g.items.map((i) => i.id), false)} className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-emerald-700 hover:text-foreground" title="Undo">
            <Check className="h-3 w-3" />Applied
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onSetMany(g.items.map((i) => i.id), true)}>Apply{done ? ` ${g.items.length - done}` : ""}</Button>
        )}
      </div>
      {open && (
        <div className="space-y-0.5 border-t border-border px-2.5 py-1.5">
          {g.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
              <Checkbox className="h-3.5 w-3.5" checked={applied.has(it.id)} onCheckedChange={() => onToggle(it.id)} />
              <button type="button" onClick={() => onFocus(it)} className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-primary" title="Show in preview">{it.label}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** The last finalized entries for this developer — what changed since. */
function PreviousEntry({ ctx }: { ctx: StepCtx }) {
  const { entry, work, pipe } = ctx
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(true)
  const prev = useMemo(() => {
    const real = ENTRIES.filter((e) => e.developer?.id === work.developerId && e.id !== entry.id && e.stage === "Finalized")
      .map((e) => ({ id: e.id, name: e.fileName, by: e.uploadedBy, at: e.finalizedAt ?? e.updatedAt }))
    const h = hashStr(entry.id)
    const synth = [1, 2, 3].map((k) => ({ id: `ENT-0${900 + ((h + k * 37) % 99)}`, name: entry.fileName.replace(/\d+\./, `${k}.`), by: ENTRY_USERS[(h + k) % ENTRY_USERS.length], at: new Date(Date.UTC(2026, 0, 30 - k * 9, 11)).toISOString() }))
    return [...real, ...synth].slice(0, 3)
  }, [entry, work.developerId])
  if (!work.developerId || !prev.length) return null
  const p = prev[i]
  const h = hashStr(p.id)
  const rowsNow = pipe.sheetSource ? pipe.setup.filter((s) => !s.ignored).reduce((n, s) => n + s.output.rows.length, 0) : pipe.extracted.length
  const delta = (h % 17) - 5
  const units = 180 + (h % 260)
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold text-foreground">Previous entry</span>
          <IdTag value={p.id} />
          <span className="text-xs text-muted-foreground">· {p.name} · finalized {fmtDateTime(p.at)} by {p.by}</span>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => setI((v) => v - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs text-muted-foreground"><b className="text-foreground">{i + 1}</b>/{prev.length}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === prev.length - 1} onClick={() => setI((v) => v + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => toast.info(`Opening ${p.id} in a new tab`)}>Open</Button>
        </div>
      </div>
      {open && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Since then:</span>
            <span className={cn(TAG, delta >= 0 ? TONE_TAG.ok : TONE_TAG.error)}>{delta >= 0 ? "+" : ""}{delta} rows</span>
            {pipe.sheetSource && <span className={cn(TAG, TONE_TAG.ok)}>+2 columns · Garden, Notes</span>}
            {pipe.sheetSource && <span className={cn(TAG, TONE_TAG.error)}>1 tab removed</span>}
            <span className={cn(TAG, TONE_TAG.muted)}>{rowsNow} rows now</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">It ingested {units} units:</span>
            <span className={cn(TAG, TONE_TAG.ok)}>New {Math.round(units * 0.42)}</span>
            <span className={cn(TAG, TONE_TAG.warn)}>Modified {Math.round(units * 0.23)}</span>
            <span className={cn(TAG, TONE_TAG.muted)}>Unmodified {units - Math.round(units * 0.42) - Math.round(units * 0.23)}</span>
            <span className={cn(TAG, TONE_TAG.error)}>Missing {h % 19}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Step 2 · Extraction ─────────────────────────────────────────────────── */

export function StepExtraction({ ctx }: { ctx: StepCtx }) {
  const { pipe, seed, work } = ctx
  const [activeRow, setActiveRow] = useState<string | null>(pipe.extracted[0]?.id ?? null)
  const [focus, setFocus] = useState<GridFocus>(null)
  const lowCells = useMemo(() => pipe.extracted.flatMap((r) => Object.entries(r.conf ?? {}).filter(([, c]) => (c ?? 100) < 80).map(([k, c]) => ({ rowId: r.id, key: k, c: c ?? 0 }))), [pipe.extracted])
  const avg = useMemo(() => {
    const all = pipe.extracted.flatMap((r) => Object.values(r.conf ?? {}).filter((c): c is number => typeof c === "number"))
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0
  }, [pipe.extracted])
  const row = pipe.extracted.find((r) => r.id === activeRow)
  const src = row?.fileId ? seed.files.find((f) => f.id === row.fileId) : undefined
  const bySource = useMemo(() => {
    const m = new Map<string, number>()
    pipe.extracted.forEach((r) => m.set(r.fileId ?? "sheet", (m.get(r.fileId ?? "sheet") ?? 0) + 1))
    return [...m.entries()]
  }, [pipe.extracted])
  const lineOf = (r: URow) => (r.line !== undefined ? r.line : Number(r.src.match(/row (\d+)/)?.[1] ?? 1) - 1)

  return (
    <Split
      panel={
        <>
          <PanelCard title="Extraction">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Rows" value={pipe.extracted.length} />
              <MiniStat label="Sources" value={bySource.length} />
              <MiniStat label="Confidence" value={`${work.confirmedLowConf ? Math.max(avg, 94) : avg}%`} tone={avg >= 85 || work.confirmedLowConf ? "ok" : "warn"} />
            </div>
            <div className="mt-3 space-y-1">
              {bySource.map(([fid, n]) => {
                const f = seed.files.find((x) => x.id === fid)
                return (
                  <div key={fid} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">{f ? FILE_ICON[f.kind] : FILE_ICON.sheet}<span className="truncate">{f?.name ?? "Sheet tabs"}</span></span>
                    <span className="text-muted-foreground">{n} rows</span>
                  </div>
                )
              })}
            </div>
          </PanelCard>
          {!work.confirmedLowConf && lowCells.length > 0 && (
            <PanelCard title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Low-confidence cells</>} tone="warn" right={<span className={cn(TAG, TONE_TAG.warn)}>{lowCells.length}</span>}>
              <p className="text-xs text-muted-foreground">Blurry photos and handwriting read below 80%. Check them against the source, or let AI re-read them with the high-accuracy model.</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const ids = [...new Set(lowCells.map((c) => c.rowId))]; setFocus({ rowIds: ids, label: "rows with low-confidence cells" }); setActiveRow(ids[0]) }}>Show rows</Button>
              </div>
            </PanelCard>
          )}
          <PanelCard title="Source" right={row && <span className="truncate text-[11px] text-muted-foreground">{row.src}</span>}>
            {!src ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{row ? "Read from a sheet tab." : "Click a row to see where it came from."}</p>
            ) : src.kind === "pdf" ? (
              <PdfPages file={src} applied={pipe.applied} onlyPage={row?.page ?? 2} highlight={row ? lineOf(row) : undefined} />
            ) : src.kind === "image" ? (
              <PhotoDoc file={src} upright={!src.image?.rotated || pipe.applied.has(`rotate:${src.id}`)} highlight={row ? lineOf(row) : undefined} compact />
            ) : (
              <TextBubble file={src} applied={pipe.applied} highlight={row?.line} />
            )}
          </PanelCard>
        </>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Extracted rows"
        output={pipe.extracted}
        extra={[{ col: { key: "_src", label: "Source" }, get: (r) => r.src }]}
        editsKey="extractEdits"
        allowDelete
        markCell={(rowId, key) => {
          if (work.confirmedLowConf) return null
          const c = pipe.extracted.find((r) => r.id === rowId)?.conf?.[key as FieldKey]
          return c !== undefined && c < 80 ? { tone: "warn", note: `Read with ${c}% confidence — check against the source` } : null
        }}
        focus={focus}
        onClearFocus={() => setFocus(null)}
        onRowClick={setActiveRow}
        activeRowId={activeRow}
      />
    </Split>
  )
}

/* ── Step 3 · Mapping ────────────────────────────────────────────────────── */

export function StepMapping({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useState<GridFocus>(null)
  const targets = mapTargets(work.dataType)
  const required = new Set<FieldKey>(work.dataType === "Automatic" ? ["unitCode", "propertyType", "bua", "price"] : ["propertyType", "bua", "price"])
  const mapped = new Set(Object.values(pipe.headerMap).filter(Boolean))
  const reqMissing = [...required].filter((f) => !mapped.has(f))
  const unassigned = pipe.mapped.filter((r) => !r.projectId)

  const assignBulk = ({ rowIds, clear }: { rowIds: string[]; clear: () => void }) => (
    <AssignProject options={pipe.options.map((o) => o.label)} onPick={(label) => {
      set((w) => ({ mapEdits: rowIds.reduce((e, id) => editCell(e, id, "project", label), w.mapEdits) }))
      toast.success(`${rowIds.length} row${rowIds.length > 1 ? "s" : ""} assigned to ${label}`)
      clear()
    }} />
  )

  const sheets: GridSheet[] = pipe.sheetSource
    ? pipe.setup.filter((s) => !s.ignored).map((s) => ({
      name: s.tab,
      input: s.output,
      output: unitTable(pipe.mapped.filter((r) => r.src.startsWith(`${s.tab}!`)), pipe.fields, [{ col: { key: "_src", label: "Source" }, get: (r) => r.src }]),
    }))
    : []

  return (
    <Split
      panel={
        <>
          {pipe.sheetSource && (
            <PanelCard
              title="Column mapping"
              tone={reqMissing.length ? "error" : undefined}
              right={<span className={cn(TAG, reqMissing.length ? TONE_TAG.error : TONE_TAG.ok)}>{pipe.headers.filter((h) => pipe.headerMap[headerKey(h.raw)]).length}/{pipe.headers.length} mapped</span>}
            >
              {reqMissing.length > 0 && <p className="mb-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">Required: {reqMissing.map((f) => targets.find((t) => t.key === f)?.label).join(", ")}</p>}
              <div className="space-y-1.5">
                {pipe.headers.map((h) => {
                  const k = headerKey(h.raw)
                  const cur = pipe.headerMap[k] ?? ""
                  const byAi = cur && cur === h.suggested && work.headerMap[k] === undefined
                  return (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-[13px] font-medium text-foreground">
                          {h.raw}
                          {h.tabs.length > 1 && <span className="text-[10px] font-normal text-muted-foreground">· {h.tabs.length} tabs</span>}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{h.samples.join(" · ") || "no values"}</p>
                      </div>
                      <div>
                        <select
                          value={cur}
                          onChange={(e) => set((w) => ({ headerMap: { ...w.headerMap, [k]: e.target.value as FieldKey | "" } }))}
                          className={cn("h-8 w-full rounded-md border bg-white px-1.5 text-xs outline-none", cur ? "border-input" : "border-amber-300 bg-amber-50/40")}
                        >
                          <option value="">— Ignore column —</option>
                          {targets.map((t) => <option key={t.key} value={t.key}>{t.label}{required.has(t.key) ? " *" : ""}</option>)}
                        </select>
                        {byAi && <p className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600"><Sparkles className="h-2.5 w-2.5" />Auto-mapped · {h.conf}%</p>}
                        {!cur && h.suggested && <p className="mt-0.5 text-[10px] text-amber-700">Suggested: {targets.find((t) => t.key === h.suggested)?.label} · {h.conf}%</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </PanelCard>
          )}
          <PanelCard
            title="Project assignment"
            tone={unassigned.length ? "error" : undefined}
            right={<span className={cn(TAG, unassigned.length ? TONE_TAG.error : TONE_TAG.ok)}>{unassigned.length ? `${unassigned.length} unassigned` : "All assigned"}</span>}
          >
            <p className="mb-2 text-xs text-muted-foreground">Each value found in the data maps to one of the entry&apos;s projects or phases. Select rows in the grid to assign them in bulk.</p>
            <div className="space-y-2">
              {pipe.projectKeys.map((k) => {
                const cur = pipe.projectMap[k.key] ?? ""
                const byAi = cur && cur === k.suggested && work.projectMap[k.key] === undefined
                const rows = pipe.mapBase.filter((r) => [txt(r.v.project), txt(r.v.phase)].filter(Boolean).join(" · ") === k.key || (k.key === "(blank)" && !txt(r.v.project)))
                return (
                  <div key={k.key} className={cn("rounded-lg border p-2", cur ? "border-border" : "border-red-200 bg-red-50/30")}>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => setFocus({ rowIds: rows.map((r) => r.id), label: `project value “${k.key}”` })} className="min-w-0 truncate text-left text-[13px] font-medium text-foreground hover:text-primary">“{k.key}”</button>
                      <span className="flex-shrink-0 text-[11px] text-muted-foreground">{k.rows} rows</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <select
                        value={cur}
                        onChange={(e) => set((w) => ({ projectMap: { ...w.projectMap, [k.key]: e.target.value } }))}
                        className={cn("h-7 min-w-0 flex-1 rounded-md border bg-white px-1.5 text-xs outline-none", cur ? "border-input" : "border-red-300")}
                      >
                        <option value="">Select project or phase…</option>
                        {pipe.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </div>
                    {byAi && <p className="mt-1 flex items-center gap-1 text-[10px] text-violet-600"><Sparkles className="h-2.5 w-2.5" />Auto-assigned · {k.conf}% match</p>}
                    {!cur && k.suggested && <p className="mt-1 text-[10px] text-amber-700">Suggested: {pipe.options.find((o) => o.id === k.suggested)?.label} · {k.conf}%</p>}
                  </div>
                )
              })}
            </div>
          </PanelCard>
        </>
      }
    >
      {pipe.sheetSource ? (
        sheets.length ? (
          <SheetPreviewCard
            sheets={sheets}
            title="Mapped sheet"
            initialView="output"
            forceView={ctx.forceView}
            viewLabels={{ input: "Sheet", output: "Mapped" }}
            focus={focus}
            onClearFocus={() => setFocus(null)}
            editable
            onEdit={(_, rowId, key, value) => { if (pipe.fields.some((f) => f.key === key)) set((w) => ({ mapEdits: editCell(w.mapEdits, rowId, key as FieldKey, value) })) }}
            markCell={(_, rowId, key, view) => (view === "output" && key === "project" && !pipe.mapped.find((r) => r.id === rowId)?.projectId ? { tone: "error", note: "Not assigned to a project" } : null)}
            bulkActions={assignBulk}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">No tabs with a header row — apply the title-row cleanup in Initial Setup.</div>
        )
      ) : (
        <UnitsGrid
          ctx={ctx}
          title="Rows"
          input={pipe.extracted}
          output={pipe.mapped}
          editsKey="mapEdits"
          markCell={(rowId, key, view) => (view === "output" && key === "project" && !pipe.mapped.find((r) => r.id === rowId)?.projectId ? { tone: "error", note: "Not assigned to a project" } : null)}
          focus={focus}
          onClearFocus={() => setFocus(null)}
          bulkActions={assignBulk}
        />
      )}
    </Split>
  )
}

function AssignProject({ options, onPick }: { options: string[]; onPick: (label: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">Assign project</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => { onPick(o); setOpen(false) }} className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-secondary">{o}</button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/* ── Step 4 · Comparison ─────────────────────────────────────────────────── */

export function StepComparison({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useState<GridFocus>(null)
  const auto = work.dataType === "Automatic"
  const dbById = useMemo(() => new Map(pipe.db.map((d) => [d.id, d])), [pipe.db])
  const by = (s: string) => pipe.compared.filter((r) => r.match?.status === s)
  const matched = by("matched")
  const fresh = by("new")
  const review = by("review")
  const unavailable = work.fullInventory ? pipe.missing.filter((d) => !work.keepMissing.includes(d.id)) : []
  const extra: Extra[] = [
    { col: { key: "_match", label: "Match" }, get: (r) => (r.match?.status === "matched" ? "Matched" : r.match?.status === "review" ? "Needs decision" : "New") },
    { col: { key: "_db", label: auto ? "Database unit" : "Database property" }, get: (r) => (r.match?.dbId && r.match.status !== "new" ? `${dbById.get(r.match.dbId)?.label ?? ""} · ${r.match.dbId}` : null) },
    { col: { key: "_conf", label: "Confidence" }, get: (r) => (r.match && r.match.conf ? `${r.match.conf}%` : null) },
    { col: { key: "_how", label: "Matched by" }, get: (r) => r.match?.how ?? null },
  ]
  const pick = (rowId: string, dbId: string) => set((w) => ({ matchOverrides: { ...w.matchOverrides, [rowId]: dbId } }))

  return (
    <Split
      panel={
        <>
          <PanelCard title={auto ? "Matched by unit code" : "Matched by similarity"}>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Matched" value={matched.length} tone="ok" onClick={() => setFocus({ rowIds: matched.map((r) => r.id), label: "matched rows" })} />
              <MiniStat label="New" value={fresh.length} tone="info" onClick={() => setFocus({ rowIds: fresh.map((r) => r.id), label: "new rows" })} />
              <MiniStat label="Needs decision" value={review.length} tone={review.length ? "warn" : undefined} onClick={review.length ? () => setFocus({ rowIds: review.map((r) => r.id), label: "rows that need a decision" }) : undefined} />
              {auto && <MiniStat label="Not in entry" value={pipe.missing.length} tone={pipe.missing.length ? "error" : undefined} />}
            </div>
            {!auto && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Auto-match threshold</span>
                  <span className={cn(TAG, TONE_TAG.info)}>{work.threshold}%</span>
                </div>
                <input type="range" min={50} max={95} step={5} value={work.threshold} onChange={(e) => set({ threshold: Number(e.target.value) })} className="mt-1.5 w-full accent-[hsl(var(--primary))]" />
                <p className="text-[11px] text-muted-foreground">Above it rows match automatically; between 50% and it they wait for you.</p>
              </div>
            )}
            {auto && <p className="mt-2 text-[11px] text-muted-foreground">Codes match after ignoring case, spaces and dashes — “ncr-a1-105 ” finds NCR-A1-105.</p>}
          </PanelCard>

          {review.length > 0 && (
            <PanelCard title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Needs your decision</>} tone="warn" right={<span className={cn(TAG, TONE_TAG.warn)}>{review.length}</span>}>
              <div className="space-y-2">
                {review.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-2">
                    <p className="text-[13px] font-medium text-foreground">{rowTitle(r)}</p>
                    <p className="text-[11px] text-muted-foreground">{txt(r.v.project)} · row {r.idx}</p>
                    <div className="mt-1.5 space-y-1">
                      {(r.match?.candidates ?? []).map((c) => (
                        <button key={c.dbId} type="button" onClick={() => pick(r.id, c.dbId)} className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-left text-xs hover:border-primary hover:bg-primary/5">
                          <span className="min-w-0 truncate">{c.label} <span className="text-muted-foreground">· {c.dbId}</span></span>
                          <span className={cn(TAG, c.conf >= 75 ? TONE_TAG.ok : TONE_TAG.warn)}>{c.conf}%</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => pick(r.id, "new")} className="w-full rounded-md border border-dashed border-border px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground">It&apos;s new — create a grouped property</button>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          )}

          {Object.keys(work.matchOverrides).length > 0 && (
            <button type="button" onClick={() => set({ matchOverrides: {} })} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Reset {Object.keys(work.matchOverrides).length} manual match decisions</button>
          )}

          {auto && pipe.missing.length > 0 && (
            <PanelCard title="In the database, not in this entry" right={<span className={cn(TAG, TONE_TAG.error)}>{pipe.missing.length}</span>}>
              <label className="flex items-start gap-2 text-xs">
                <Switch checked={work.fullInventory} onCheckedChange={(v) => set({ fullInventory: v })} className="mt-0.5" />
                <span><b className="font-medium text-foreground">This entry is the full inventory</b><br /><span className="text-muted-foreground">Units it doesn&apos;t list are marked unavailable.</span></span>
              </label>
              {work.fullInventory && (
                <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
                  {pipe.missing.map((d) => {
                    const keep = work.keepMissing.includes(d.id)
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/50">
                        <span className={cn("min-w-0 truncate font-mono", !keep && "text-red-700")}>{d.code}</span>
                        <span className="text-muted-foreground">{typeof d.v.price === "number" ? fmtInt(d.v.price) : ""}</span>
                        <button type="button" onClick={() => set((w) => ({ keepMissing: keep ? w.keepMissing.filter((x) => x !== d.id) : [...w.keepMissing, d.id] }))} className={cn(TAG, keep ? TONE_TAG.muted : TONE_TAG.error)}>
                          {keep ? "Keep as is" : "Unavailable"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">{unavailable.length} will be marked unavailable at ingest.</p>
            </PanelCard>
          )}
        </>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Matching"
        input={pipe.mapped}
        output={pipe.compared}
        extra={extra}
        markCell={(rowId, key, view) => {
          if (view !== "output" || key !== "_match") return null
          const s = pipe.compared.find((r) => r.id === rowId)?.match?.status
          return s === "matched" ? { tone: "ok" } : s === "review" ? { tone: "warn", note: "Pick a match in the panel" } : { tone: "info", note: "Will be created" }
        }}
        focus={focus}
        onClearFocus={() => setFocus(null)}
      />
    </Split>
  )
}

/* ── Step 5 · Transformation ─────────────────────────────────────────────── */

export function StepTransformation({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useState<GridFocus>(null)
  const enabled = new Set(work.enabledRules)
  const suggested = work.rules.filter((r) => !r.custom && (pipe.ruleHits[r.id]?.length ?? 0) > 0)
  const idle = work.rules.filter((r) => !r.custom && !(pipe.ruleHits[r.id]?.length))
  const custom = work.rules.filter((r) => r.custom)
  const toggleRule = (id: string) => set((w) => ({ enabledRules: w.enabledRules.includes(id) ? w.enabledRules.filter((x) => x !== id) : [...w.enabledRules, id] }))
  const pending = suggested.filter((r) => !enabled.has(r.id))

  const ruleCard = (r: Rule) => {
    const hits = pipe.ruleHits[r.id] ?? []
    return (
      <div key={r.id} className={cn("rounded-lg border p-2", enabled.has(r.id) ? "border-emerald-200 bg-emerald-50/30" : "border-border")}>
        <div className="flex items-start gap-2">
          <Switch checked={enabled.has(r.id)} onCheckedChange={() => toggleRule(r.id)} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-5 text-foreground">{r.title}</p>
            <p className="text-[11px] text-muted-foreground">{r.detail}</p>
          </div>
          {r.custom && (
            <button type="button" title="Delete rule" onClick={() => set((w) => ({ rules: w.rules.filter((x) => x.id !== r.id), enabledRules: w.enabledRules.filter((x) => x !== r.id) }))} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          )}
        </div>
        <button type="button" disabled={!hits.length} onClick={() => setFocus({ rowIds: hits, label: r.title })} className="mt-1 pl-11 text-[11px] font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
          {hits.length} row{hits.length !== 1 ? "s" : ""} {enabled.has(r.id) ? "changed" : "would change"}
        </button>
      </div>
    )
  }

  return (
    <Split
      panel={
        <>
          <PanelCard
            title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />Suggested rules</>}
            right={pending.length > 0 && <Button size="sm" className="h-7 px-2 text-xs" onClick={() => set((w) => ({ enabledRules: [...new Set([...w.enabledRules, ...pending.map((r) => r.id)])] }))}>Apply all ({pending.length})</Button>}
          >
            <p className="mb-2 text-xs text-muted-foreground">Detected in this data. Rules run top to bottom on the step&apos;s input; the grid&apos;s Diff shows exactly what each one changed.</p>
            <div className="space-y-2">
              {suggested.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Nothing to transform.</p>}
              {suggested.map(ruleCard)}
            </div>
            {idle.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Not needed here: {idle.map((r) => r.title).join(" · ")}</p>}
          </PanelCard>
          <PanelCard title="Your rules" right={<AddRule fields={pipe.fields} onAdd={(r) => set((w) => ({ rules: [...w.rules, r], enabledRules: [...w.enabledRules, r.id] }))} />}>
            {custom.length === 0 ? <p className="text-xs text-muted-foreground">Find &amp; replace, fill blanks or scale a column — they apply to every row.</p> : <div className="space-y-2">{custom.map(ruleCard)}</div>}
          </PanelCard>
        </>
      }
    >
      <UnitsGrid ctx={ctx} title="Units" input={pipe.transformIn} output={pipe.transformed} editsKey="transformEdits" focus={focus} onClearFocus={() => setFocus(null)} />
    </Split>
  )
}

function AddRule({ fields, onAdd }: { fields: FieldDef[]; onAdd: (r: Rule) => void }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<"replace" | "set-blank" | "multiply">("replace")
  const [field, setField] = useState<FieldKey>(fields[0]?.key ?? "project")
  const [a, setA] = useState("")
  const [b, setB] = useState("")
  const fieldLabel = fields.find((f) => f.key === field)?.label ?? field
  const add = () => {
    const id = `custom-${Date.now()}`
    if (kind === "replace" && a) onAdd({ id, kind, field, find: a, replace: b, custom: true, title: `Replace “${a}” → “${b}”`, detail: `in ${fieldLabel}` })
    else if (kind === "set-blank" && a) onAdd({ id, kind, field, value: a, custom: true, title: `Fill blank ${fieldLabel}`, detail: `with “${a}”` })
    else if (kind === "multiply" && Number(a)) onAdd({ id, kind, field, factor: Number(a), custom: true, title: `${fieldLabel} × ${a}`, detail: "on every row with a number" })
    else return
    setOpen(false); setA(""); setB("")
  }
  const box = "h-8 w-full rounded-md border border-input bg-white px-2 text-sm outline-none focus:border-primary"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"><Plus className="h-3 w-3" />Add rule</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={box}>
          <option value="replace">Find &amp; replace</option>
          <option value="set-blank">Fill blanks</option>
          <option value="multiply">Multiply</option>
        </select>
        <select value={field} onChange={(e) => setField(e.target.value as FieldKey)} className={box}>
          {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder={kind === "replace" ? "Find" : kind === "set-blank" ? "Value" : "Factor, e.g. 1000"} className={box} />
        {kind === "replace" && <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Replace with" className={box} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={add}>Add &amp; apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ── Step 6 · Formatting ─────────────────────────────────────────────────── */

export function StepFormatting({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useState<GridFocus>(null)
  const ambiguous = pipe.formatChecks.reduce((n, c) => n + c.ambiguous, 0)
  const withChanges = pipe.formatChecks.filter((c) => c.changes.length)
  const unknown = pipe.formatChecks.filter((c) => c.unknown.length)
  const pending = withChanges.filter((c) => !work.fixed[c.field])
  const fieldOf = (k: FieldKey) => pipe.fields.find((f) => f.key === k)

  return (
    <Split
      panel={
        <>
          <PanelCard title="Date format">
            <Segmented value={work.dateFormat === "DMY" ? "DD/MM/YYYY" : "MM/DD/YYYY"} options={["DD/MM/YYYY", "MM/DD/YYYY"] as const} onChange={(v) => set({ dateFormat: v === "DD/MM/YYYY" ? "DMY" : "MDY" })} />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {ambiguous ? `${ambiguous} date${ambiguous > 1 ? "s" : ""} like 03/04/2028 read either way — this decides. ` : ""}Quarters, months and years land on the period&apos;s last day. Shown as 30 Sep 2027.
            </p>
          </PanelCard>

          {unknown.length > 0 && (
            <PanelCard title={<><CircleAlert className="h-3.5 w-3.5 text-red-600" />Values the system can&apos;t read</>} tone="error">
              <div className="space-y-2">
                {unknown.map((c) => (
                  <div key={c.field}>
                    <p className="mb-1 text-xs font-semibold text-foreground">{c.label}</p>
                    {c.unknown.map((u) => {
                      const opts = fieldOf(c.field)?.options
                      return (
                        <div key={u.raw} className="mb-1 flex items-center gap-1.5">
                          <button type="button" onClick={() => setFocus({ rowIds: u.rowIds, label: `${c.label} “${u.raw}”` })} className="min-w-0 flex-1 truncate rounded bg-red-50 px-1.5 py-1 text-left text-xs text-red-700 hover:underline">“{u.raw}” · {u.rowIds.length}</button>
                          {opts ? (
                            <select
                              value=""
                              onChange={(e) => e.target.value && set((w) => ({ valueMap: { ...w.valueMap, [`${c.field}:${u.raw}`]: e.target.value } }))}
                              className="h-7 w-36 rounded-md border border-red-300 bg-white px-1 text-xs outline-none"
                            >
                              <option value="">Map to…</option>
                              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">edit in grid</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </PanelCard>
          )}

          <PanelCard
            title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />Normalize columns</>}
            right={pending.length > 0 && <Button size="sm" className="h-7 px-2 text-xs" onClick={() => set((w) => ({ fixed: { ...w.fixed, ...Object.fromEntries(pending.map((c) => [c.field, true])) } }))}>Normalize all ({pending.length})</Button>}
          >
            {withChanges.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Every value is already in system format.</p>}
            <div className="space-y-2">
              {withChanges.map((c) => {
                const on = !!work.fixed[c.field]
                const f = fieldOf(c.field)
                return (
                  <div key={c.field} className={cn("rounded-lg border p-2", on ? "border-emerald-200 bg-emerald-50/30" : "border-border")}>
                    <div className="flex items-center gap-2">
                      <Switch checked={on} onCheckedChange={(v) => set((w) => ({ fixed: { ...w.fixed, [c.field]: v } }))} />
                      <p className="flex-1 text-[13px] font-medium text-foreground">{c.label}</p>
                      <button type="button" onClick={() => setFocus({ rowIds: c.changes.map((x) => x.rowId), label: `${c.label} values that ${on ? "were" : "will be"} normalized` })} className="text-[11px] font-medium text-primary hover:underline">{c.changes.length} values</button>
                    </div>
                    <div className="mt-1 space-y-0.5 pl-11">
                      {c.changes.slice(0, 2).map((x) => (
                        <p key={x.rowId} className="flex items-center gap-1 truncate text-[11px]">
                          <span className="text-muted-foreground line-through">{displayCell(x.from)}</span>
                          <ArrowRight className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">{displayCell(x.to, f?.type)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </PanelCard>
        </>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Units"
        input={pipe.transformed}
        output={pipe.formatted}
        editsKey="formatEdits"
        markCell={(rowId, key, view) => {
          if (view === "input") return null
          const note = pipe.invalid.get(`${rowId}|${key}`)
          return note ? { tone: note.startsWith("Not normalized") ? "warn" : "error", note } : null
        }}
        focus={focus}
        onClearFocus={() => setFocus(null)}
      />
    </Split>
  )
}

/* ── Step 7 · Review ─────────────────────────────────────────────────────── */

export function StepReview({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useState<GridFocus>(null)
  const blocking = pipe.issues.filter((i) => i.blocking)
  const warnings = pipe.issues.filter((i) => !i.blocking)
  const marks = useMemo(() => {
    const m = new Map<string, CellMark>()
    pipe.issues.forEach((i) => {
      if (!i.blocking && work.ignoredIssues.includes(i.id)) return
      i.rowIds.forEach((id) => {
        const k = `${id}|${i.field ?? ""}`
        if (!m.has(k) || i.blocking) m.set(k, { tone: i.blocking ? "error" : "warn", note: i.title })
      })
    })
    return m
  }, [pipe.issues, work.ignoredIssues])

  const card = (i: (typeof pipe.issues)[number]) => {
    const ignored = !i.blocking && work.ignoredIssues.includes(i.id)
    return (
      <div key={i.id} className={cn("rounded-lg border p-2", i.blocking ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40", ignored && "opacity-50")}>
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[13px] font-semibold leading-5", i.blocking ? "text-red-700" : "text-amber-800")}>{i.title}</p>
          <span className={cn(TAG, "bg-white", i.blocking ? "border-red-200 text-red-700" : "border-amber-300 text-amber-800")}>{i.rowIds.length} row{i.rowIds.length === 1 ? "" : "s"}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{i.detail}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-6 bg-white px-2 text-[11px]" onClick={() => setFocus({ rowIds: i.rowIds, label: i.title })}>Show rows</Button>
          {i.fix && <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={() => set((w) => ({ reviewFixes: [...new Set([...w.reviewFixes, i.fix!.id])] }))}><Sparkles className="h-3 w-3" />{i.fix.label}</Button>}
          {!i.blocking && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => set((w) => ({ ignoredIssues: ignored ? w.ignoredIssues.filter((x) => x !== i.id) : [...w.ignoredIssues, i.id] }))}>
              {ignored ? "Un-ignore" : "Ignore"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Split
      panel={
        <>
          {pipe.issues.length === 0 ? (
            <PanelCard title={<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />All clear</>}>
              <p className="text-xs text-muted-foreground">Every check passed — nothing blocks this entry.</p>
            </PanelCard>
          ) : (
            <>
              {blocking.length > 0 && <PanelCard title={<><CircleAlert className="h-3.5 w-3.5 text-red-600" />Blocking</>} tone="error"><div className="space-y-2">{blocking.map(card)}</div></PanelCard>}
              {blocking.length === 0 && <PanelCard title={<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />No blocking issues</>}><p className="text-xs text-muted-foreground">Decide on the warnings below or carry on.</p></PanelCard>}
              {warnings.length > 0 && <PanelCard title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Warnings</>} tone="warn"><div className="space-y-2">{warnings.map(card)}</div></PanelCard>}
            </>
          )}
          {work.reviewFixes.length > 0 && (
            <button type="button" onClick={() => set({ reviewFixes: [] })} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Undo {work.reviewFixes.length} auto-fix{work.reviewFixes.length > 1 ? "es" : ""}</button>
          )}
        </>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Units"
        input={pipe.formatted}
        output={pipe.reviewed}
        editsKey="reviewEdits"
        allowDelete
        markCell={(rowId, key, view) => (view === "input" ? null : marks.get(`${rowId}|${key}`) ?? null)}
        markRow={(rowId, view) => (view !== "input" && marks.get(`${rowId}|`) ? { tone: "error", note: marks.get(`${rowId}|`)?.note } : null)}
        focus={focus}
        onClearFocus={() => setFocus(null)}
      />
    </Split>
  )
}

export { isBlank, colLetter }

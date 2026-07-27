"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft, Banknote, Bath, BedDouble, Boxes, CalendarClock, CalendarDays, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Columns3, Eye, EyeOff, FileText, Grid3X3, GripVertical, Home, Info,
  LayoutTemplate, Maximize2, Paintbrush, Pencil, Plus, RefreshCw, Ruler, ScanSearch, Search, Shuffle,
  Sparkles, Trash2, TriangleAlert, User as UserIcon, Wallet, Wand2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { IdTag, DeveloperSelect, ProjectTreeSelect, type ProjectTreeNode } from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { LinkedPlanCard, PAYMENT_PLAN_GROUPS, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { FullscreenViewer } from "@/components/render-images-page"
import { FilePreviewDialog, type PreviewFile } from "@/components/file-preview-dialog"
import { OfferingCtxCell, IdCopy } from "@/components/launch-details-page"
import { FloorPlanCard, FLOOR_PLANS0, type FloorPlan } from "@/components/floor-plans-page"
import { EntryProjectsDrawer } from "@/components/ingestion-entries-page"
import { PROJECT_DEVELOPERS, PROJECTS } from "@/lib/projects-mock"
import type { IngestionEntry } from "@/lib/ingestion-mock"

/* ------------------------------------------------------------------ */
/* Constants & mock sheet data                                         */
/* ------------------------------------------------------------------ */

export const TAG = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
export const FP_IMG = "/placeholder.jpg"

// Images step intentionally excluded — cover/render images are assigned inside Grouping.
const STEPS = [
  { key: "Initial Setup", icon: FileText },
  { key: "Sheet Preparation", icon: Grid3X3 },
  { key: "Mapping", icon: Columns3 },
  { key: "Transformation", icon: Shuffle },
  { key: "Formatting", icon: Wand2 },
  { key: "Review", icon: ScanSearch },
  { key: "Payment Plans", icon: Wallet },
  { key: "Floor Plans", icon: LayoutTemplate },
  { key: "Grouping", icon: Boxes },
] as const

const STAGE_TO_STEP: Record<string, number> = {
  "OCR Processing": 0, "Initial Setup": 0, "Sheet Preparation": 1, Mapping: 2, Transformations: 3,
  Formatting: 4, Review: 5, "Payment Plans": 6, "Floor Plans": 7, Grouping: 8, Finalized: 8,
}

export interface SheetRow {
  unit: string
  phase: string
  buildingType: string
  typeCode: string
  category: string
  project: string
  delivery: string
  area: string
  price: string
  fees: string
  /** none = clean, warn = modified (yellow), error = issue (red), ok = new (green) */
  tone: "none" | "warn" | "error" | "ok"
}

const UNIT_IDS = ["133-00-01", "220-A4-4", "220-C4-1", "220-C4-3", "221-C4-1", "243-A4-2", "243-C4-2"]
const TYPE_CODES = ["I-VILLA R", "I-VILLA S", "I-VILLA T", "I-VILLA U", "I-VILLA V", "I-VILLA W", "I-VILLA X"]
const CATEGORIES = ["Villa", "I-Villa Roof Garden", "I-Villa Sky Garden"]
const AREAS = [180, 220, 210, 210, 229, 189, 197, 188, 183, 129, 123, 199, 180, 213, 210, 160, 229, 198]

export const SHEET_ROWS: SheetRow[] = Array.from({ length: 18 }, (_, i) => ({
  unit: UNIT_IDS[i % UNIT_IDS.length],
  phase: i % 7 === 0 ? "M-CRWN" : "M-IV-A",
  buildingType: i % 5 === 4 ? "C" : "A",
  typeCode: TYPE_CODES[i % TYPE_CODES.length],
  category: i >= 9 && i <= 12 ? "Apartment" : CATEGORIES[i % 3 === 0 ? 0 : 1 + (i % 2)],
  project: "Uptown cairo",
  delivery: `Jan ${2 + ((i * 2) % 7)}, 2025`,
  area: i === 13 ? "" : String(AREAS[i % AREAS.length]),
  price: i === 0 ? "18,000,000" : i % 4 === 2 ? "32,650,000" : "24,000,000",
  fees: i % 3 === 0 ? "530,000" : i % 3 === 1 ? "600,000" : "650,000",
  tone: i >= 9 && i <= 12 ? "warn" : i === 13 || i === 17 ? "error" : i >= 14 ? "ok" : "none",
}))

const ROW_TONE: Record<SheetRow["tone"], string> = {
  none: "",
  warn: "bg-amber-50",
  error: "bg-red-50",
  ok: "bg-emerald-50",
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

export function SectionCard({ title, count, right, children, className }: {
  title?: string; count?: string; right?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
            {count && <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{count}</span>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

/** Numbered-column mini sheet grid used by every step's preview. */
export function MiniSheet({ cols, rows, renderCell, toneOf, maxHeight = "max-h-[420px]" }: {
  cols: string[]
  rows: SheetRow[]
  renderCell: (col: string, r: SheetRow, i: number) => React.ReactNode
  toneOf?: (r: SheetRow, i: number) => string
  maxHeight?: string
}) {
  return (
    <div className={cn("overflow-auto", maxHeight)}>
      <table className="w-max min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th className="w-10 px-2 py-1.5 text-center font-normal" />
            {cols.map((c, i) => <th key={c} className="px-4 py-1.5 text-center font-normal text-muted-foreground/70">{i + 1}</th>)}
          </tr>
          <tr className="border-b border-border">
            <th className="w-10 px-2 py-2" />
            {cols.map((c) => <th key={c} className="whitespace-nowrap px-4 py-2 text-left">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className={cn("transition-colors", toneOf ? toneOf(r, i) : ROW_TONE[r.tone])}>
              <td className="w-10 px-2 py-2 text-center text-xs text-muted-foreground">{i + 1}</td>
              {cols.map((c) => <td key={c} className="whitespace-nowrap px-4 py-2">{renderCell(c, r, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatTile({ label, value, total, alert }: { label: string; value: string; total?: string; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-sm font-bold">
        <span className={alert ? "text-orange-600" : "text-foreground"}>{value}</span>
        {total && <span className="font-medium text-muted-foreground"> / {total}</span>}
      </p>
    </div>
  )
}

const UNIT_BREAKDOWN = [
  { label: "New", count: 220, cls: "border-emerald-200 bg-emerald-100 text-emerald-700" },
  { label: "Modified", count: 98, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  { label: "Unmodified", count: 134, cls: "border-border bg-muted text-muted-foreground" },
  { label: "Missing units", count: 16, cls: "border-red-200 bg-red-50 text-red-700" },
]

export function UnitBreakdownChips() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {UNIT_BREAKDOWN.map((b) => (
        <span key={b.label} className={cn(TAG, b.cls)}>{b.label} <b>{b.count}</b></span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared cards — used by both the sheets and manual wizards           */
/* ------------------------------------------------------------------ */

/** Review issue card (blocking red / warning amber). Eye toggle renders only when a handler is given. */
export function ReviewIssueCard({ issue, dimmed, onToggleVisibility }: { issue: ReviewIssue; dimmed?: boolean; onToggleVisibility?: () => void }) {
  return (
    <div className={cn("rounded-xl border p-3", issue.blocking ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40", dimmed && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("flex items-center gap-1.5 text-sm font-semibold", issue.blocking ? "text-red-600" : "text-amber-600")}>
            {issue.title}
            {onToggleVisibility && (
              <button onClick={onToggleVisibility} className="text-current opacity-70 hover:opacity-100">
                {dimmed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </p>
          <IdTag value={issue.id} />
        </div>
        <span className={cn(TAG, issue.blocking ? "border-red-200 bg-white text-red-600" : "border-amber-300 bg-white text-amber-700")}>{issue.units} Units</span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{issue.description}</p>
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
      {/* Section 1 — IDs · tags · icon actions */}
      <div className={cn("flex items-center gap-3 border-b border-border px-4 py-2", tintBg)}>
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-muted-foreground">
          {selectable && <Checkbox className="h-4 w-4" checked={selected} onCheckedChange={onToggle} />}
          {propertyId ? (
            <>
              <span className="flex items-center gap-1">Property ID: <IdCopy value={propertyId} /></span>
              {metadataId && <><span>·</span><span className="flex items-center gap-1">Metadata ID: <IdCopy value={metadataId} /></span></>}
            </>
          ) : (
            <span className="italic">Draft property</span>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">{tags}</div>
        {actions && <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">{actions}</div>}
      </div>

      {/* Section 2 — status dot · title · keywords */}
      <div className={cn("border-b border-border px-4 py-2", tintBg)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", tint === "error" ? "bg-red-500" : tint === "warn" ? "bg-amber-500" : "bg-emerald-500")} />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        {keywords && <p className="mt-0.5 pl-4 text-xs text-muted-foreground line-clamp-1">{keywords}</p>}
      </div>

      {/* Section 3 — main info grid */}
      <div className={cn("px-4 py-2.5", tintBg)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 lg:grid-cols-4">
          {cells.map((c, i) => <OfferingCtxCell key={`${c.label}-${i}`} label={c.label} icon={c.icon} value={c.value} sub={c.sub} />)}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 1 — Initial Setup                                              */
/* ------------------------------------------------------------------ */

/**
 * File preview — the uploaded entry file (Sheet / Image / PDF / Text).
 * Sheets get the tabbed grid preview; other types open the shared FilePreviewDialog
 * (same viewer as WhatsApp Media).
 */
export function FilePreviewCard({ entry }: { entry: IngestionEntry }) {
  const [preview, setPreview] = useState<"input" | "output">("output")
  const [viewerOpen, setViewerOpen] = useState(false)
  const mains = entry.projects.filter((p) => p.main === null)
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState(mains[0]?.id)
  const tabCounts = useMemo(() => mains.map((m, i) => ({ ...m, count: [119, 56, 76, 56][i % 4] })), [mains])

  const ext = entry.fileName.split(".").pop()?.toUpperCase() ?? ""
  const isSheet = entry.fileType === "Sheet"
  const previewFile: PreviewFile = {
    id: entry.id,
    name: entry.fileName,
    ext,
    typeGroup: isSheet ? "Sheet" : entry.fileType === "Image" ? "Image" : "Document",
    url: entry.fileType === "Image" ? "/aerial-view-masterplan-residential-development-blu.jpg" : undefined,
  }

  if (!isSheet) {
    return (
      <SectionCard
        title="File preview"
        right={<Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary text-primary" onClick={() => setViewerOpen(true)}><Eye className="h-3.5 w-3.5" />Open preview</Button>}
      >
        <button className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40" onClick={() => setViewerOpen(true)}>
          {entry.fileType === "Image" ? (
            <img src={previewFile.url} alt={entry.fileName} className="h-24 w-36 flex-shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <span className="flex h-24 w-36 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{entry.fileName}</span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>{ext}</span>
              <ColorTag value={entry.fileType} />
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">Click to open the full preview</span>
          </span>
        </button>
        {viewerOpen && <FilePreviewDialog file={previewFile} onClose={() => setViewerOpen(false)} />}
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="File preview"
      count="220 Units"
      right={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewerOpen(true)}><Maximize2 className="h-4 w-4" /></Button>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["input", "output"] as const).map((m) => (
              <button key={m} onClick={() => setPreview(m)} className={cn("rounded-md px-3 py-1 text-sm font-medium capitalize", preview === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{m}</button>
            ))}
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4">
        {tabCounts.map((t) => {
          const hidden = hiddenTabs.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
                activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                hidden && "opacity-50 line-through")}
            >
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); setHiddenTabs((prev) => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n }) }}
                className="text-muted-foreground hover:text-foreground"
              >
                {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </span>
              {t.name}
              <span className="rounded-full border border-border bg-muted px-1.5 text-[11px]">{t.count}</span>
            </button>
          )
        })}
      </div>
      <MiniSheet
        cols={["Unit ID", "Unit Type Code", "Category", "Project", "Delivery", "Area"]}
        rows={SHEET_ROWS.slice(0, 14)}
        toneOf={() => ""}
        renderCell={(c, r) => {
          switch (c) {
            case "Unit ID": return <span className="font-medium text-foreground">{r.phase === "M-CRWN" ? "M-CRWN-" : "M-IV-A-"}{r.unit}</span>
            case "Unit Type Code": return r.typeCode
            case "Category": return r.category
            case "Project": return "MV The Villas"
            case "Delivery": return r.delivery
            case "Area": return r.area || "—"
            default: return null
          }
        }}
      />
      {viewerOpen && <FilePreviewDialog file={previewFile} onClose={() => setViewerOpen(false)} />}
    </SectionCard>
  )
}

export function StepInitialSetup({ entry }: { entry: IngestionEntry }) {
  const [prevIdx, setPrevIdx] = useState(0)

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><p className="text-sm font-semibold text-foreground">Entry ID</p><p className="mt-0.5 text-sm text-muted-foreground">{entry.id}</p></div>
            <div><p className="text-sm font-semibold text-foreground">File name</p><p className="mt-0.5 text-sm text-muted-foreground">{entry.fileName}</p></div>
            <div><p className="text-sm font-semibold text-foreground">Source</p><p className="mt-0.5 text-sm text-muted-foreground">Uploaded from {entry.source}</p></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">Developer</p>
              <Select defaultValue={entry.developer?.id}>
                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select developer" /></SelectTrigger>
                <SelectContent>
                  {(entry.developer ? [entry.developer] : PROJECT_DEVELOPERS).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">Projects</p>
              <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1.5">
                {entry.projects.length === 0 && <span className="text-sm italic text-muted-foreground">Not selected yet</span>}
                {entry.projects.slice(0, 3).map((p) => <ColorTag key={p.id} value={p.name} />)}
                {entry.projects.length > 3 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>+{entry.projects.length - 3}</span>}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">Property categories</p>
              <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1.5">
                {entry.categories.map((c) => <ColorTag key={c} value={c} />)}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Previous entry comparison */}
      <SectionCard>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">Previous Entry Comparison</h3>
              <button className="text-sm text-primary underline-offset-2 hover:underline" onClick={() => toast.info("Opening previous entry is coming soon")}>
                Previous Entry ID: 92303210990100
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={prevIdx === 0} onClick={() => setPrevIdx((v) => v - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground"><b className="text-foreground">{prevIdx + 1}</b>/5</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={prevIdx === 4} onClick={() => setPrevIdx((v) => v + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.success("Comparison refreshed")}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-foreground">Sheet Differences</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}><b>2</b> Columns added</span>
                  <span className={cn(TAG, "border-emerald-200 bg-emerald-50 text-emerald-700")}><b>14</b> Row added</span>
                  <span className={cn(TAG, "border-red-200 bg-red-50 text-red-700")}><b>1</b> Tab removed</span>
                </div>
              </div>
              <div><p className="text-sm font-semibold text-foreground">File name</p><p className="text-sm text-muted-foreground">ava all projects 12-1-2025-NSPS.xlc</p></div>
              <div><p className="text-sm font-semibold text-foreground">Source</p><p className="text-sm text-muted-foreground">WhatsApp</p></div>
            </div>
            <div className="space-y-1.5 text-sm">
              {[
                ["Projects", "Uptown, Mivida, Marassi, Soul +2"],
                ["Property category", "Commercial, residential"],
                ["Created by", "Omar Mouneer"],
                ["Creation date", "22 Oct. 2025  -  2:34 PM"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium text-foreground">{v}</span></div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-sm font-semibold text-foreground">Units Ingested: 420 Units</span>
                <UnitBreakdownChips />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <FilePreviewCard entry={entry} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 2 — Sheet Preparation                                          */
/* ------------------------------------------------------------------ */

interface WorkbookTab { name: string; rows: number; included: boolean; headerRow: number }

function StepSheetPreparation() {
  const [tabs, setTabs] = useState<WorkbookTab[]>([
    { name: "Marassi", rows: 119, included: true, headerRow: 1 },
    { name: "Uptown cairo", rows: 56, included: true, headerRow: 1 },
    { name: "Mivida", rows: 76, included: true, headerRow: 2 },
    { name: "Soul", rows: 56, included: false, headerRow: 1 },
  ])
  const included = tabs.filter((t) => t.included)
  const totalRows = included.reduce((s, t) => s + t.rows, 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
      <SectionCard title="Workbook tabs" count={`${included.length}/${tabs.length} included`} className="self-start">
        <div className="divide-y divide-border">
          {tabs.map((t, i) => (
            <div key={t.name} className={cn("flex items-center gap-3 px-4 py-3", !t.included && "opacity-50")}>
              <Switch checked={t.included} onCheckedChange={(v) => setTabs((prev) => prev.map((x, j) => (j === i ? { ...x, included: v } : x)))} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.rows} rows</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Header row</span>
                <Input
                  type="number"
                  min={1}
                  value={t.headerRow}
                  disabled={!t.included}
                  onChange={(e) => setTabs((prev) => prev.map((x, j) => (j === i ? { ...x, headerRow: Math.max(1, Number(e.target.value) || 1) } : x)))}
                  className="h-8 w-16 text-center text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <b className="text-foreground">{totalRows}</b> rows will be ingested from <b className="text-foreground">{included.length}</b> tab{included.length !== 1 && "s"}.
        </div>
      </SectionCard>

      <SectionCard title="Sheet preview" count={`${totalRows} Units`}>
        <MiniSheet
          cols={["Unit ID", "Phase", "Building Type", "Category", "Project", "Area", "Full price"]}
          rows={SHEET_ROWS.slice(0, 12)}
          toneOf={() => ""}
          renderCell={(c, r) => {
            switch (c) {
              case "Unit ID": return <span className="font-medium text-foreground">{r.unit}</span>
              case "Phase": return r.phase
              case "Building Type": return r.buildingType
              case "Category": return r.category
              case "Project": return r.project
              case "Area": return r.area || "—"
              case "Full price": return r.price
              default: return null
            }
          }}
        />
      </SectionCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 3 — Mapping                                                    */
/* ------------------------------------------------------------------ */

const SYSTEM_FIELDS = ["Unit ID", "Phase", "Building Type", "Category", "Project", "Area", "Garden area", "Full price", "Maintenance fees", "Delivery date", "— Ignore column —"]

interface ColumnMapping { sheetCol: string; sample: string; field: string | null }

function StepMapping() {
  const [mappings, setMappings] = useState<ColumnMapping[]>([
    { sheetCol: "Unit Code", sample: "M-IV-A-220-A4-4", field: "Unit ID" },
    { sheetCol: "Phase", sample: "M-IV-A", field: "Phase" },
    { sheetCol: "Bldg", sample: "A", field: "Building Type" },
    { sheetCol: "Type", sample: "I-Villa Roof Garden", field: "Category" },
    { sheetCol: "Project Name", sample: "Uptown cairo", field: "Project" },
    { sheetCol: "BUA", sample: "220", field: null },
    { sheetCol: "Land/Garden", sample: "220", field: null },
    { sheetCol: "Total Price", sample: "24,000,000", field: "Full price" },
    { sheetCol: "Maint.", sample: "600,000", field: null },
    { sheetCol: "Delivery", sample: "Jan 4, 2025", field: "Delivery date" },
  ])
  const mapped = mappings.filter((m) => m.field).length

  const autoMap = () => {
    setMappings((prev) => prev.map((m) => m.field ? m : { ...m, field: m.sheetCol === "BUA" ? "Area" : m.sheetCol === "Land/Garden" ? "Garden area" : "Maintenance fees" }))
    toast.success("All columns auto-mapped")
  }

  return (
    <SectionCard
      title="Column mapping"
      count={`${mapped}/${mappings.length} Mapped`}
      right={<Button size="sm" className="h-8 gap-1.5" onClick={autoMap}><Sparkles className="h-3.5 w-3.5" />Auto map</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Sheet column</th>
              <th className="px-4 py-2 text-left">Sample value</th>
              <th className="px-4 py-2 text-left">Maps to</th>
              <th className="w-32 px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mappings.map((m, i) => (
              <tr key={m.sheetCol} className={cn(!m.field && "bg-red-50/50")}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{m.sheetCol}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.sample}</td>
                <td className="px-4 py-2.5">
                  <Select value={m.field ?? ""} onValueChange={(v) => setMappings((prev) => prev.map((x, j) => (j === i ? { ...x, field: v } : x)))}>
                    <SelectTrigger className="h-8 w-52 text-sm"><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>{SYSTEM_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  {m.field
                    ? <span className={cn(TAG, "border-emerald-200 bg-emerald-100 text-emerald-700")}><CheckCircle2 className="h-3 w-3" />Mapped</span>
                    : <span className={cn(TAG, "border-red-200 bg-red-50 text-red-700")}><TriangleAlert className="h-3 w-3" />Unmapped</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

/* ------------------------------------------------------------------ */
/* Step 4 — Transformation                                             */
/* ------------------------------------------------------------------ */

interface Transformation { id: string; name: string; type: "Split" | "Merge" | "Add data"; condition: string; units: number }

const TRANSFORM_TONE: Record<Transformation["type"], string> = {
  Split: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Merge: "border-blue-200 bg-blue-100 text-blue-700",
  "Add data": "border-purple-200 bg-purple-50 text-purple-700",
}

function StepTransformation() {
  const [items, setItems] = useState<Transformation[]>([
    { id: "TRF-001", name: "Unit ID from Phase + Code", type: "Merge", condition: "Category = APT AND Delivery date is Jan 2025", units: 103 },
    { id: "TRF-002", name: "Split Land/Garden into Garden area", type: "Split", condition: "Property type = Villa", units: 64 },
  ])
  const [adding, setAdding] = useState(false)
  const [conds, setConds] = useState([{ field: "Category", op: "Equals", value: "APT" }])
  const [type, setType] = useState<Transformation["type"]>("Merge")

  const save = () => {
    setItems((prev) => [...prev, {
      id: `TRF-${String(prev.length + 1).padStart(3, "0")}`,
      name: `${type} transformation ${prev.length + 1}`,
      type,
      condition: conds.map((c) => `${c.field} ${c.op.toLowerCase()} ${c.value || "…"}`).join(" AND "),
      units: 103,
    }])
    setAdding(false)
    toast.success("Transformation added")
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_400px]">
      {/* Left — sheet preview */}
      <SectionCard title="Sheet preview" count="220 Units">
        <MiniSheet
          cols={["Unit ID", "Unit Type Code", "Category", "Project", "Delivery", "Area"]}
          rows={SHEET_ROWS}
          maxHeight="max-h-[560px]"
          toneOf={() => ""}
          renderCell={(c, r) => {
            switch (c) {
              case "Unit ID": return <span className="font-medium text-foreground">{r.phase === "M-CRWN" ? "M-CRWN-" : "M-IV-A-"}{r.unit}</span>
              case "Unit Type Code": return r.typeCode
              case "Category": return r.category
              case "Project": return "MV The Villas"
              case "Delivery": return r.delivery
              case "Area": return r.area || "—"
              default: return null
            }
          }}
        />
      </SectionCard>

      {/* Right — transformation rules */}
      <SectionCard
        title="Data transformation"
        count={`${items.length} rules`}
        right={<Button size="sm" className="h-8 gap-1.5" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />Add</Button>}
      >
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No transformations yet — add one to split, merge or enrich unit columns.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(TAG, TRANSFORM_TONE[t.type])}>{t.type}</span>
                      <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                    </div>
                    <IdTag value={t.id} />
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{t.units} Units</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { setItems((prev) => prev.filter((x) => x.id !== t.id)); toast.success("Transformation removed") }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Where {t.condition}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Add Transformation drawer */}
      <Sheet open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <div className="border-b border-border bg-card px-5 py-4">
            <SheetTitle className="text-lg font-bold text-foreground">Add Transformation</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">Define units to apply transformations on</SheetDescription>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Where</p>
              <div className="space-y-2">
                {conds.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Select value={c.field} onValueChange={(v) => setConds((prev) => prev.map((x, j) => (j === i ? { ...x, field: v } : x)))}>
                      <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Category", "Project", "Phase", "Area", "Delivery date"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={c.op} onValueChange={(v) => setConds((prev) => prev.map((x, j) => (j === i ? { ...x, op: v } : x)))}>
                      <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Equals", "Not equals", "Contains", "Between"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={c.value} placeholder="Type…" onChange={(e) => setConds((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="h-9 w-40 text-sm" />
                    {conds.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => setConds((prev) => prev.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 h-8 gap-1 px-2 text-primary" onClick={() => setConds((prev) => [...prev, { field: "Project", op: "Equals", value: "" }])}>
                <Plus className="h-3.5 w-3.5" />Add condition
              </Button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Transformation</p>
                <div className="flex gap-1.5">
                  {(["Split", "Merge", "Add data"] as const).map((t) => (
                    <Button key={t} variant={type === t ? "default" : "outline"} size="sm" className="h-8" onClick={() => setType(t)}>{t}</Button>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>{["Column #1", "Column #2", "Column #3", "Output"].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[["APT", "9290219", "-A", "APT-9290219-A"], ["APT", "9928180", "-A", "APT-9928180-A"], ["APT", "9219921", "-A", "APT-9219921-A"]].map((row) => (
                      <tr key={row[3]}>
                        {row.map((cell, j) => <td key={j} className={cn("px-3 py-2", j === 3 && "bg-emerald-50 font-medium text-emerald-800")}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex justify-between border-t border-border bg-card px-5 py-3">
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save}>Save and exit</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 5 — Formatting (standardise values + clean up)                 */
/* ------------------------------------------------------------------ */

interface StandardSection { label: string; status: string; ok: boolean }

function StepFormatting() {
  const [preview, setPreview] = useState<"input" | "output">("input")
  const [typeMap, setTypeMap] = useState<Record<string, string>>({ APT: "Apartment", TH: "Town house" })
  const [expanded, setExpanded] = useState<string | null>("Property Types")
  const typesMapped = Object.keys(typeMap).length

  const sections: StandardSection[] = [
    { label: "Phases", status: "20/20 Mapped", ok: true },
    { label: "Property Categories", status: "20/20 Mapped", ok: true },
    { label: "Property Types", status: `${typesMapped}/3 Mapped`, ok: typesMapped === 3 },
    { label: "Floor Numbers", status: "20/20 Mapped", ok: true },
    { label: "Finishing Types", status: "5/12 Mapped", ok: false },
    { label: "Delivery Types", status: "8/8 Mapped", ok: true },
    { label: "Delivery date", status: "8/10 Formated", ok: false },
    { label: "View", status: "7/7 Mapped", ok: true },
    { label: "Orientation", status: "7/7 Mapped", ok: true },
  ]
  const cleanup: StandardSection[] = [
    { label: "Format Numbers", status: "5/12 Columns", ok: false },
    { label: "Translations", status: "3/40 Translated", ok: false },
    { label: "Formatted Bolean", status: "8/8 Formatted", ok: true },
  ]

  const statusChip = (s: StandardSection) => (
    <span className={cn(TAG, s.ok ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-50 text-red-600")}>{s.status}</span>
  )

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
      <SectionCard
        title="Sheet preview"
        count="220 Units"
        right={
          <div className="flex rounded-lg border border-border p-0.5">
            {(["input", "output"] as const).map((m) => (
              <button key={m} onClick={() => setPreview(m)} className={cn("rounded-md px-3 py-1 text-sm font-medium capitalize", preview === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{m}</button>
            ))}
          </div>
        }
      >
        <MiniSheet
          cols={["Unit ID", "Property types", "Category", "Project"]}
          rows={SHEET_ROWS.slice(0, 14)}
          maxHeight="max-h-[560px]"
          toneOf={(r, i) => (i < 3 ? "bg-emerald-50/60" : i < 5 ? "bg-red-50" : "bg-emerald-50/60")}
          renderCell={(c, r, i) => {
            switch (c) {
              case "Unit ID": return <span className="font-medium text-foreground">{r.phase === "M-CRWN" ? "M-CRWN-" : "M-IV-A-"}{r.unit}</span>
              case "Property types":
                if (i < 3) return preview === "input" ? "APT" : <span className="inline-flex items-center gap-1">APT <span className="text-muted-foreground">→</span> <b>Villa</b></span>
                if (i < 5) return "Villa"
                return "I-VILLA R"
              case "Category": return i < 3 ? "Villa" : r.category
              case "Project": return i % 3 === 0 ? "The Rustic Cabin" : "Ocean's Edge"
              default: return null
            }
          }}
        />
      </SectionCard>

      <div className="space-y-4">
        <SectionCard
          title="Standardise Values"
          right={<Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary text-primary" onClick={() => { setTypeMap({ Villa: "Villa", APT: "Apartment", TH: "Town house" }); toast.success("Values auto-mapped") }}><Sparkles className="h-3.5 w-3.5" />Auto map</Button>}
        >
          <div className="divide-y divide-border">
            {sections.map((s) => (
              <div key={s.label}>
                <button className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left" onClick={() => setExpanded((e) => (e === s.label ? null : s.label))}>
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <span className="flex items-center gap-2">{statusChip(s)}<ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded === s.label && "rotate-180")} /></span>
                </button>
                {expanded === s.label && s.label === "Property Types" && (
                  <div className="space-y-2 px-4 pb-3">
                    {["Villa", "APT", "TH"].map((raw) => (
                      <div key={raw} className={cn("flex items-center justify-between gap-2 rounded-lg border p-2", typeMap[raw] ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50")}>
                        <span className="text-sm font-medium text-foreground">{raw}</span>
                        <div className="flex items-center gap-2">
                          <Select value={typeMap[raw] ?? ""} onValueChange={(v) => setTypeMap((prev) => ({ ...prev, [raw]: v }))}>
                            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{["Villa", "Apartment", "Town house", "Studio", "Penthouse"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                          {typeMap[raw]
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <TriangleAlert className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {expanded === s.label && s.label === "Delivery date" && (
                  <div className="space-y-2 px-4 pb-3">
                    {[["22 Oct. 2025", "22/10/2025", false], ["22 Oct. 2025", "22 October 2025", true], ["22 Oct. 2025", "22 October 2025", true]].map(([raw, out, ok], i) => (
                      <div key={i} className={cn("flex items-center justify-between gap-2 rounded-lg border p-2", ok ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50")}>
                        <span className="text-sm font-medium text-foreground">{raw as string}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{out as string}</span>
                          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <TriangleAlert className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {expanded === s.label && s.label !== "Property Types" && s.label !== "Delivery date" && (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">All values for this attribute are listed here — {s.status.toLowerCase()}.</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Clean up" right={<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.success("Clean-up rules re-ran")}><RefreshCw className="h-4 w-4" /></Button>}>
          <div className="divide-y divide-border">
            {cleanup.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <span className="flex items-center gap-2">{statusChip(s)}<ChevronDown className="h-4 w-4 text-muted-foreground" /></span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 6 — Review                                                     */
/* ------------------------------------------------------------------ */

export interface ReviewIssue { title: string; id: string; units: number; description: string; blocking: boolean }

export const REVIEW_ISSUES: ReviewIssue[] = [
  { title: "Same Unit ID", id: "21932190", units: 2, description: "Duplicate unit IDs found, causing conflicts in property identification.", blocking: true },
  { title: "Area is not assigned", id: "21932190", units: 2, description: "Unit has no area value entered, leaving key data incomplete.", blocking: true },
  { title: "Area is not assigned", id: "21932190", units: 2, description: "Unit has no area value entered, leaving key data incomplete.", blocking: true },
  { title: "Building type is missing", id: "21932190", units: 112, description: "Property record lacks a defined building type classification.", blocking: false },
  { title: "Building type is missing", id: "21932190", units: 220, description: "Entered area value is incorrect.", blocking: false },
]

function StepReview() {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setHidden((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  const issueCard = (issue: ReviewIssue, i: number) => (
    <ReviewIssueCard key={i} issue={issue} dimmed={hidden.has(i)} onToggleVisibility={() => toggle(i)} />
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <span className={cn(TAG, "border-amber-200 bg-amber-50 text-amber-700")}>● Warning <b>98</b></span>
        <span className={cn(TAG, "border-red-200 bg-red-50 text-red-700")}>● Blocking issues <b>16</b></span>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="Sheet preview" count="220 Units">
          <MiniSheet
            cols={["Unit ID", "Phase", "Building Type", "Category", "Project", "Area"]}
            rows={SHEET_ROWS}
            maxHeight="max-h-[560px]"
            renderCell={(c, r, i) => {
              switch (c) {
                case "Unit ID": return (
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    {(r.tone === "warn" || r.tone === "error") && <Info className={cn("h-3.5 w-3.5", r.tone === "error" ? "text-red-500" : "text-amber-500")} />}
                    {r.unit}
                  </span>
                )
                case "Phase": return r.phase
                case "Building Type": return r.buildingType
                case "Category": return r.category
                case "Project": return r.project
                case "Area": return r.area || "—"
                default: return null
              }
            }}
          />
        </SectionCard>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Blocking Issues</h3>
              <span className={cn(TAG, "border-red-200 bg-red-50 text-red-600")}>6 issues</span>
            </div>
            <div className="space-y-2">{REVIEW_ISSUES.filter((x) => x.blocking).map((x, i) => issueCard(x, i))}</div>
            <button className="mt-2 w-full text-center text-sm font-medium text-foreground underline underline-offset-2" onClick={() => toast.info("Full issues list is coming soon")}>See more</button>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Warning Issues</h3>
              <span className={cn(TAG, "border-amber-300 bg-amber-50 text-amber-700")}>4 issues</span>
            </div>
            <div className="space-y-2">{REVIEW_ISSUES.filter((x) => !x.blocking).map((x, i) => issueCard(x, i + 3))}</div>
            <button className="mt-2 w-full text-center text-sm font-medium text-foreground underline underline-offset-2" onClick={() => toast.info("Full issues list is coming soon")}>See more</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 7 — Payment Plans                                              */
/* ------------------------------------------------------------------ */

function StepPaymentPlans() {
  const plans = useMemo<PlanCardData[]>(() => PAYMENT_PLAN_GROUPS.flatMap((g) => g.plans).slice(0, 3), [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<PlanCardData | null>(null)

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_400px]">
      <SectionCard title="Sheet preview" count="220 Units">
        <MiniSheet
          cols={["Unit ID", "Standard Price", "Price 2", "Project"]}
          rows={SHEET_ROWS.slice(0, 8)}
          toneOf={() => ""}
          renderCell={(c, r, i) => {
            switch (c) {
              case "Unit ID": return <span className="font-medium text-foreground">{r.phase === "M-CRWN" ? "M-CRWN-" : "M-IV-A-"}{r.unit}</span>
              case "Standard Price": return (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{r.price}</p>
                  <div className="flex gap-1">
                    <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>{i % 3 === 1 ? "Premium 5 YRS" : "Standard 10 Yrs"}</span>
                    {i % 3 === 1 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>Cash</span>}
                  </div>
                </div>
              )
              case "Price 2": return (
                <div className="space-y-1">
                  <p className={cn("font-medium text-foreground", i === 1 && "rounded bg-red-50 px-1")}>23,950,000</p>
                  {i !== 1 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>Standard 10 Yrs</span>}
                </div>
              )
              case "Project": return "MV The Villas"
              default: return null
            }
          }}
        />
      </SectionCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Payment plans</h3>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.info("Add payment plan is coming soon")}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search" className="h-9 pl-8" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Payment Plans Used" value="7" total="12" />
          <StatTile label="Unit Prices attached" value="32" total="32" alert />
        </div>
        <div className="space-y-3">
          {plans.map((p) => (
            <LinkedPlanCard
              key={p.id}
              plan={p}
              isExpanded={expandedId === p.id}
              onToggleExpand={() => setExpandedId((v) => (v === p.id ? null : p.id))}
              totalInGroup={plans.length}
              readOnly
              fullWidth
              onView={() => setViewing(p)}
            />
          ))}
        </div>
      </div>

      <PaymentPlanDetailsDrawer plan={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 8 — Floor Plans                                                */
/* ------------------------------------------------------------------ */

function StepFloorPlans() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fullscreen, setFullscreen] = useState<string | null>(null)
  const [panelPlans, setPanelPlans] = useState<FloorPlan[]>(() => FLOOR_PLANS0.slice(0, 2))
  const rows = SHEET_ROWS.slice(0, 8)
  const toggle = (u: string) => setSelected((prev) => { const n = new Set(prev); n.has(u) ? n.delete(u) : n.add(u); return n })

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_360px]">
      <SectionCard
        title="Sheet preview"
        count="220 Units"
        right={
          <div className="flex items-center gap-2">
            {selected.size > 0 && <span className="text-sm text-muted-foreground">{selected.size} selected</span>}
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-primary font-semibold text-primary"
              disabled={selected.size === 0}
              onClick={() => { toast.success(`Floor plan assigned to ${selected.size} unit${selected.size > 1 ? "s" : ""}`); setSelected(new Set()) }}
            >
              Assign{selected.size > 0 && ` (${selected.size})`}
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <Checkbox className="h-4 w-4" checked={selected.size === rows.length && rows.length > 0} onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r, i) => `${r.unit}-${i}`)) : new Set())} />
                </th>
                <th className="px-4 py-2.5 text-left">Unit ID</th>
                <th className="px-4 py-2.5 text-left">Floor plan</th>
                <th className="px-4 py-2.5 text-left">Unit Type Code</th>
                <th className="px-4 py-2.5 text-left">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => {
                const key = `${r.unit}-${i}`
                return (
                  <tr key={key} className="hover:bg-muted/40">
                    <td className="w-10 px-4 py-2.5"><Checkbox className="h-4 w-4" checked={selected.has(key)} onCheckedChange={() => toggle(key)} /></td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.phase === "M-CRWN" ? "M-CRWN-" : "M-IV-A-"}{r.unit}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {[0, 1].map((j) => (
                          <button key={j} onClick={() => setFullscreen(`${key}-${j}`)} className={cn("h-10 w-12 overflow-hidden rounded border", j === 0 ? "border-amber-300" : "border-blue-300")}>
                            <img src={FP_IMG} alt="Floor plan" className="h-full w-full object-cover" />
                          </button>
                        ))}
                        {i === 0 && <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>+2</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{r.typeCode}</td>
                    <td className="px-4 py-2.5">{r.category}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Floor plans</h3>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.info("Upload floor plan is coming soon")}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search" className="h-9 pl-8" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Floor Plans used" value="7" total="12" />
          <StatTile label="Units Linked to Plans" value="122" total="280" alert />
        </div>
        {/* Real floor-plan cards — same component as the Floor Plans page */}
        {panelPlans.map((fp) => (
          <FloorPlanCard
            key={fp.id}
            fp={fp}
            onView={() => setFullscreen(fp.id)}
            onDelete={() => { setPanelPlans((prev) => prev.filter((x) => x.id !== fp.id)); toast.success("Floor plan removed") }}
            onStatusChange={(s) => setPanelPlans((prev) => prev.map((x) => (x.id === fp.id ? { ...x, status: s } : x)))}
          />
        ))}
      </div>

      {fullscreen && <FullscreenViewer images={[FP_IMG]} startIndex={0} label="Floor plan" onClose={() => setFullscreen(null)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 9 — Grouping                                                   */
/* ------------------------------------------------------------------ */

interface GroupResult { name: string; units: number; isNew: boolean; id: string }

function GroupResultCard({ g }: { g: GroupResult }) {
  const [devNaming, setDevNaming] = useState(g.isNew)
  const [fullscreen, setFullscreen] = useState(false)
  const cells: GroupedCardCell[] = [
    { icon: <Home className="h-3 w-3" />, label: "Property type", value: "Apartments - Studio" },
    { icon: <CalendarDays className="h-3 w-3" />, label: "Delivery type", value: "Off-plan" },
    { icon: <Paintbrush className="h-3 w-3" />, label: "Finishing", value: "Semi-finished" },
    { icon: <Ruler className="h-3 w-3" />, label: "Area", value: "96 - 102 SQM" },
    { icon: <Bath className="h-3 w-3" />, label: "Bathroom", value: "3" },
    { icon: <BedDouble className="h-3 w-3" />, label: "Bedroom", value: "4" },
    { icon: <Banknote className="h-3 w-3" />, label: "Price Range", value: "4,800,000 - 6,900,000" },
  ]
  return (
    <GroupedPropertyCard
      propertyId={g.id}
      title={g.name}
      keywords="Proximity to schools, payment plans up to 8 years, ready-to-move options."
      cells={cells}
      tags={
        <>
          <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>{g.units} Units</span>
          {g.isNew && <span className={cn(TAG, "border-emerald-200 bg-emerald-100 text-emerald-700")}>New</span>}
        </>
      }
      actions={
        <span className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
          Developer naming
          <Switch checked={devNaming} onCheckedChange={setDevNaming} />
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 md:grid-cols-3">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">Images:</p>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <button key={i} className="h-12 w-16 overflow-hidden rounded border border-border" onClick={() => setFullscreen(true)}>
                <img src={FP_IMG} alt="Render" className="h-full w-full object-cover" />
              </button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => toast.info("Image assignment is coming soon")}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">Floor plans</p>
          <div className="flex items-center gap-1.5">
            <button className="h-12 w-16 overflow-hidden rounded border border-border" onClick={() => setFullscreen(true)}>
              <img src={FP_IMG} alt="Floor plan" className="h-full w-full object-cover" />
            </button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => toast.info("Floor plan assignment is coming soon")}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">Payment plans <button className="font-medium text-primary underline underline-offset-2" onClick={() => toast.info("Payment plan details are coming soon")}>Details</button></p>
          <p className="text-sm text-foreground"><b>Plans:</b> 3 Plans added</p>
          <p className="text-sm text-foreground"><b>Offers:</b> 2 Offers</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <UnitBreakdownChips />
          <span className={cn(TAG, "border-blue-200 bg-blue-50 text-blue-700")}>Returned <b>9</b></span>
        </div>
        <Button variant="outline" size="sm" className="h-8 border-primary font-semibold text-primary" onClick={() => toast.success(`Missing units marked for ${g.name}`)}>Mark missing units</Button>
      </div>
      {fullscreen && <FullscreenViewer images={[FP_IMG]} startIndex={0} label={g.name} onClose={() => setFullscreen(false)} />}
    </GroupedPropertyCard>
  )
}

function StepGrouping({ entry }: { entry: IngestionEntry }) {
  const [attrs, setAttrs] = useState(["Property type", "Subtype", "No. of bedrooms", "Has Garden", "Has Roof", "Same floor plan"])
  const [expanded, setExpanded] = useState(true)
  const [showGroups, setShowGroups] = useState(false)
  const [breakdown, setBreakdown] = useState("5")
  const mains = entry.projects.filter((p) => p.main === null)

  const groups: { project: string; results: GroupResult[] }[] = [
    { project: mains[0]?.name ?? "Marassi", results: [
      { name: "Palm Heights Studio Apartments", units: 230, isNew: true, id: "92303210990100" },
      { name: "Palm Heights Villas", units: 230, isNew: false, id: "92303210990100" },
    ] },
    { project: mains[1]?.name ?? "Uptown cairo", results: [
      { name: "Palm Heights Studio Apartments", units: 230, isNew: false, id: "92303210990100" },
    ] },
  ]

  return (
    <div className="space-y-4">
      <SectionCard title="Grouping configurations">
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            Default Grouping of the system is by Developer, Project, Property Type, Bedroom Number, has_garden, has_roof, floor plans
          </div>

          <div className="rounded-lg border border-border">
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded((v) => !v)}>
              <span className="text-sm font-bold text-foreground">{mains[0]?.name ?? "Project name"}</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <div className="grid grid-cols-1 gap-6 border-t border-border p-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Grouping by</p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {attrs.map((a) => (
                      <div key={a} className="flex items-center gap-2 px-3 py-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm text-foreground">{a}</span>
                        <button className="text-muted-foreground hover:text-red-600" onClick={() => setAttrs((prev) => prev.filter((x) => x !== a))}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-foreground">Default Area Breakdown</p>
                    <div className="flex items-center gap-1.5">
                      <Input value={breakdown} onChange={(e) => setBreakdown(e.target.value)} className="h-9 w-24" />
                      <span className="text-sm text-muted-foreground">m²</span>
                    </div>
                    <p className="mt-1 text-xs text-primary">**If a property type is not added below, it will be filled with the default value</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">Villa</span>
                    <span className="text-muted-foreground">{breakdown || "5"} m²</span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs text-muted-foreground">Last update: 24 May 2025 - 01:30 PM</span>
                    <Button variant="outline" size="sm" className="h-8 border-primary text-primary" onClick={() => toast.success("Grouping configuration applied")}>Apply changes</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button className="gap-1.5" onClick={() => { setShowGroups(true); toast.success("Groups generated") }}>Show group results</Button>
          </div>
        </div>
      </SectionCard>

      <div>
        <h3 className="mb-2 text-lg font-bold text-foreground">Group results</h3>
        {!showGroups ? (
          <div className="rounded-xl border border-border bg-card px-4 py-16 text-center">
            <Boxes className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-base font-semibold text-foreground">Groups not created yet</p>
            <p className="text-sm text-muted-foreground">Once you finish group configuration click &ldquo;Show group results&rdquo; to see groups</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50/40 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-orange-600">Total Missing units: 65</p>
                <p className="text-sm text-foreground">All Missing units will be marked as sold by default, unless you set their statuses yourself.</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 border-primary font-semibold text-primary" onClick={() => toast.info("Set missing-unit statuses is coming soon")}>Set status</Button>
            </div>
            {groups.map((sec) => (
              <div key={sec.project} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-foreground">{sec.project}</h4>
                  <span className={cn(TAG, "border-border bg-muted text-muted-foreground")}>{sec.results.length} Groups</span>
                </div>
                {sec.results.map((g, i) => <GroupResultCard key={i} g={g} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/* Shared wizard chrome — used by both the sheets and manual entry details pages. */
export type WizardStep = { key: string; icon: React.ComponentType<{ className?: string }> }

export function WizardStepper({ steps, step, onStep }: { steps: readonly WizardStep[]; step: number; onStep: (i: number) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      {/* Fits the container width — no horizontal scrolling */}
      <div className="flex items-start">
        {steps.map((s, i) => {
          const done = i < step
          const active = i === step
          const Icon = s.icon
          return (
            <div key={s.key} className="flex min-w-0 flex-1 items-start last:flex-none">
              {i > 0 && <div className={cn("mt-5 h-0.5 min-w-2 flex-1", i <= step ? "bg-emerald-500" : "bg-border")} />}
              <button onClick={() => onStep(i)} className="group flex w-20 flex-shrink-0 flex-col items-center gap-1.5">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                  done ? "border-emerald-500 bg-emerald-500 text-white" :
                  active ? "border-primary bg-card text-primary" :
                  "border-border bg-card text-muted-foreground group-hover:border-primary/50")}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                <span className={cn("text-center text-[11px] leading-tight", active ? "font-semibold text-primary" : done ? "text-emerald-600" : "text-muted-foreground")}>{s.key}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WizardHeader({ entry, listLabel, pageLabel, onBack }: { entry: IngestionEntry; listLabel: string; pageLabel: string; onBack: () => void }) {
  return (
    <>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground hover:underline"><ArrowLeft className="h-3.5 w-3.5" />{listLabel}</button>
        <span>/</span>
        <span className="font-medium text-foreground">{pageLabel}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{entry.fileName}</h1>
          <IdTag value={entry.id} />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" />Created by <b className="font-medium text-foreground">{entry.uploadedBy}</b>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />Created at <b className="font-medium text-foreground">{fmtDateTime(entry.createdAt)}</b>
          </span>
        </div>
      </div>
    </>
  )
}

export function EntryContextStrip({ entry }: { entry: IngestionEntry }) {
  const [projOpen, setProjOpen] = useState(false)
  const mains = entry.projects.filter((p) => p.main === null)
  const projNames = (mains.length > 0 ? mains : entry.projects).map((p) => p.name).join(", ")
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
      <div><p className="text-sm font-semibold text-foreground">Entry ID</p><p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.id}</p></div>
      <div>
        <p className="text-sm font-semibold text-foreground">Developer</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.developer?.name ?? <span className="italic">Not selected yet</span>}</p>
      </div>
      <div><p className="text-sm font-semibold text-foreground">Property category</p><p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.categories.join(", ")}</p></div>
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          Projects
          <button title="View entry projects" className="text-muted-foreground transition-colors hover:text-foreground" onClick={() => setProjOpen(true)}>
            <Eye className="h-3.5 w-3.5" />
          </button>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{projNames || <span className="italic">Not selected yet</span>}</p>
      </div>
      {projOpen && <EntryProjectsDrawer entry={entry} onClose={() => setProjOpen(false)} />}
    </div>
  )
}

export function WizardFooter({ backLabel = "Back", nextLabel = "Next", onBack, onNext }: { backLabel?: string; nextLabel?: string; onBack: () => void; onNext: () => void }) {
  return (
    <div className="sticky bottom-0 z-30 flex items-center justify-between border-t border-border bg-card px-6 py-3">
      <Button variant="outline" onClick={onBack}>{backLabel}</Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="border-primary text-primary" onClick={() => toast.success("Draft saved")}>Save as draft</Button>
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  )
}

export function SheetEntryDetailsPage({ entry, onBack }: { entry: IngestionEntry; onBack: () => void }) {
  const [step, setStep] = useState(() => STAGE_TO_STEP[entry.stage] ?? 0)

  const next = () => {
    if (step === STEPS.length - 1) {
      toast.success(`${entry.fileName} finalized`)
      onBack()
    } else setStep((s) => s + 1)
  }
  const back = () => (step === 0 ? onBack() : setStep((s) => s - 1))

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <div className="flex-1 space-y-4 p-6">
        <WizardHeader entry={entry} listLabel="Automatic Sheets Entries" pageLabel="Sheets processing" onBack={onBack} />
        <WizardStepper steps={STEPS} step={step} onStep={setStep} />
        {/* The Initial Setup step owns these fields itself — no duplicate strip there */}
        {step > 0 && <EntryContextStrip entry={entry} />}

        {step === 0 && <StepInitialSetup entry={entry} />}
        {step === 1 && <StepSheetPreparation />}
        {step === 2 && <StepMapping />}
        {step === 3 && <StepTransformation />}
        {step === 4 && <StepFormatting />}
        {step === 5 && <StepReview />}
        {step === 6 && <StepPaymentPlans />}
        {step === 7 && <StepFloorPlans />}
        {step === 8 && <StepGrouping entry={entry} />}
      </div>

      <WizardFooter onBack={back} onNext={next} nextLabel={step === STEPS.length - 1 ? "Finalize" : "Next"} />
    </div>
  )
}

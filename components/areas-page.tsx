"use client"

import { useMemo, useRef, useState } from "react"
import {
  ChevronRight, FileJson, FileText, HelpCircle, Home, Loader2, Map as MapIcon, MapPin,
  Pencil, Plus, Search, Upload, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IdTag } from "@/components/table-kit"
import { SeoTab, FaqsTab } from "@/components/developers-page"
import {
  GlobalMapDialog, MapDrawDialog, LevelChip, blobPolygon as blob, centroid, LEVEL_COLOR,
  type GeoLevel, type GeoRef, type MapLocation, type Pt,
} from "@/components/area-map"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types & mock: District > Area > Subarea ──────────────────────────────────

type GeoStatus = "Active" | "Hidden"
interface GeoBase {
  id: string
  nameEn: string
  nameAr: string
  status: GeoStatus
  createdAt: string
  updatedAt: string
  pin: Pt | null
  polygon: Pt[] | null
}
interface District extends GeoBase {}
interface Area extends GeoBase { districtId: string }
interface Subarea extends GeoBase { areaId: string }

const T0 = new Date("2026-01-05T09:00:00").getTime()
const DAY = 86_400_000
let gi = 0
function geo(id: string, nameEn: string, nameAr: string, cx: number, cy: number, r: number, opts?: { status?: GeoStatus; noPin?: boolean; noPoly?: boolean }): GeoBase {
  const i = gi++
  return {
    id, nameEn, nameAr,
    status: opts?.status ?? "Active",
    createdAt: new Date(T0 - i * 3.4 * DAY).toISOString(),
    updatedAt: new Date(T0 + ((i % 5) * 9 + 2) * DAY + 5 * 3_600_000).toISOString(),
    pin: opts?.noPin ? null : { x: cx, y: cy },
    polygon: opts?.noPoly ? null : blob(cx, cy, r),
  }
}

const DISTRICTS0: District[] = [
  geo("101", "New Cairo", "القاهرة الجديدة", 700, 330, 130),
  geo("102", "6th of October", "السادس من أكتوبر", 215, 410, 120),
  geo("103", "North Coast", "الساحل الشمالي", 300, 150, 140),
  geo("104", "New Capital", "العاصمة الإدارية الجديدة", 868, 430, 92),
  geo("105", "Ain Sokhna", "العين السخنة", 795, 610, 78),
]

const AREAS0: Area[] = [
  { ...geo("201", "5th Settlement", "التجمع الخامس", 728, 302, 46), districtId: "101" },
  { ...geo("202", "1st Settlement", "التجمع الأول", 655, 278, 38), districtId: "101" },
  { ...geo("203", "Katameya", "القطامية", 682, 382, 40), districtId: "101" },
  { ...geo("204", "El Shorouk", "الشروق", 762, 248, 36), districtId: "101" },
  { ...geo("205", "West Somid", "غرب سوميد", 172, 378, 34), districtId: "102" },
  { ...geo("206", "Sheikh Zayed", "الشيخ زايد", 232, 332, 40), districtId: "102" },
  { ...geo("207", "October Gardens", "حدائق أكتوبر", 196, 470, 38, { status: "Hidden" }), districtId: "102" },
  { ...geo("208", "Ras El Hekma", "رأس الحكمة", 198, 140, 34), districtId: "103" },
  { ...geo("209", "Sidi Abdelrahman", "سيدي عبد الرحمن", 280, 128, 30), districtId: "103" },
  { ...geo("210", "El Alamein", "العلمين", 362, 142, 30, { noPoly: true }), districtId: "103" },
  { ...geo("211", "R7", "الحي السابع", 846, 468, 28), districtId: "104" },
  { ...geo("212", "R8", "الحي الثامن", 896, 448, 26), districtId: "104" },
  { ...geo("213", "Downtown", "وسط العاصمة", 862, 392, 28, { noPin: true, noPoly: true }), districtId: "104" },
  { ...geo("214", "Galala", "الجلالة", 766, 600, 26), districtId: "105" },
  { ...geo("215", "Zafarana Road", "طريق الزعفرانة", 826, 586, 24), districtId: "105" },
]

const SUBAREAS0: Subarea[] = [
  { ...geo("801", "Golden Square", "المربع الذهبي", 738, 306, 15), areaId: "201" },
  { ...geo("802", "North Investors", "المستثمرين الشمالية", 712, 286, 13), areaId: "201" },
  { ...geo("803", "South Investors", "المستثمرين الجنوبية", 716, 322, 13, { status: "Hidden" }), areaId: "201" },
  { ...geo("804", "Lotus", "اللوتس", 748, 290, 12), areaId: "201" },
  { ...geo("805", "El Banafseg", "البنفسج", 650, 270, 12), areaId: "202" },
  { ...geo("806", "El Yasmeen", "الياسمين", 668, 292, 12, { noPoly: true }), areaId: "202" },
  { ...geo("807", "Katameya Heights", "مرتفعات القطامية", 690, 376, 13), areaId: "203" },
  { ...geo("808", "Katameya Dunes", "كثبان القطامية", 668, 392, 12), areaId: "203" },
  { ...geo("809", "Beverly Hills", "بيفرلي هيلز", 222, 326, 13), areaId: "206" },
  { ...geo("810", "Zayed 2000", "زايد 2000", 246, 344, 12), areaId: "206" },
  { ...geo("811", "Waslet Dahshour", "وصلة دهشور", 238, 312, 11, { noPin: true, noPoly: true }), areaId: "206" },
  { ...geo("812", "El Hekma Bay", "خليج الحكمة", 190, 134, 11), areaId: "208" },
  { ...geo("813", "MV Ras El Hekma", "ماونتن فيو رأس الحكمة", 208, 150, 11), areaId: "208" },
  { ...geo("814", "Marassi", "مراسي", 272, 122, 11), areaId: "209" },
  { ...geo("815", "Hacienda Bay", "هاسيندا باي", 292, 136, 10), areaId: "209" },
  { ...geo("816", "R7 Central", "وسط الحي السابع", 848, 470, 10), areaId: "211" },
  { ...geo("817", "Il Monte Galala", "المونت جلالة", 762, 596, 10), areaId: "214" },
]

/** Mock project pins for the map search box. */
const PROJECT_LOCATIONS: MapLocation[] = [
  { id: "1201", name: "Marassi", kind: "Project", center: { x: 272, y: 122 } },
  { id: "1204", name: "Palm Hills October", kind: "Project", center: { x: 238, y: 352 } },
  { id: "1207", name: "SODIC West", kind: "Project", center: { x: 205, y: 340 } },
  { id: "1209", name: "North Bay", kind: "Project", center: { x: 300, y: 130 } },
  { id: "1301", name: "Hyde Park New Cairo", kind: "Project", center: { x: 735, y: 315 } },
  { id: "1302", name: "Mivida", kind: "Project", center: { x: 700, y: 300 } },
  { id: "1303", name: "IL Bosco", kind: "Project", center: { x: 866, y: 420 } },
]

/** Canonical timestamp: "10 Jan 2026, 07:00 AM". */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${date}, ${time}`
}

const STATUS_TONE: Record<GeoStatus, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-700",
}
function StatusTag({ status }: { status: GeoStatus }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none", STATUS_TONE[status])}>{status}</span>
}

// ─── Entity card & hierarchy column ───────────────────────────────────────────

function GeoTag({ ok, kind }: { ok: boolean; kind: "Pin" | "Polygon" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none",
      ok ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700",
    )}>
      {ok ? `${kind} Uploaded` : `Missing ${kind}`}
    </span>
  )
}

function GeoCard({ item, selected, onSelect, childCount, childLabel, onEdit, onDraw, showGeoTags = true, kind, parentLine }: {
  item: GeoBase
  selected?: boolean
  onSelect?: () => void
  childCount?: number
  childLabel?: string
  onEdit?: () => void
  onDraw?: () => void
  /** Pin/polygon uploaded tags under the Arabic name (hidden on SEO/FAQs selector). */
  showGeoTags?: boolean
  /** Area/Subarea tag next to the ID (SEO/FAQs selector mixes both levels). */
  kind?: GeoLevel
  /** "Parent: …" caption for subareas in mixed lists. */
  parentLine?: string
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-2.5 transition-colors",
        onSelect && "cursor-pointer",
        selected ? "border-primary/50 ring-1 ring-primary/25" : "border-border hover:border-muted-foreground/35",
      )}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <IdTag value={item.id} className="text-[11px]" />
            {kind && <LevelChip level={kind} />}
          </div>
          <div className={cn("mt-0.5 truncate text-sm", selected ? "font-semibold text-primary" : "font-medium text-foreground")}>{item.nameEn}</div>
          <div className="truncate text-xs text-muted-foreground">{item.nameAr}</div>
          {parentLine && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{parentLine}</div>}
          {showGeoTags && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <GeoTag ok={!!item.pin} kind="Pin" />
              <GeoTag ok={!!item.polygon} kind="Polygon" />
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <StatusTag status={item.status} />
          {childCount !== undefined && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              {childCount} {childLabel}
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
          {(onEdit || onDraw) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button variant="outline" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Edit"
                  onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDraw && (
                <Button variant="outline" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Draw on map"
                  onClick={(e) => { e.stopPropagation(); onDraw() }}>
                  <MapIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-1.5 text-[10px] leading-none text-muted-foreground">
        <span className="truncate">Created: {fmtDateTime(item.createdAt)}</span>
        <span className="truncate">Updated: {fmtDateTime(item.updatedAt)}</span>
      </div>
    </div>
  )
}

function GeoColumn({ title, items, selectedId, onSelect, childCount, childLabel, onCreate, onUpload, uploadTooltip, onEdit, onDraw, searchPlaceholder, showGeoTags = true, kindOf, parentOf }: {
  title: string
  items: GeoBase[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  childCount?: (id: string) => number
  childLabel?: string
  onCreate?: () => void
  onUpload?: () => void
  uploadTooltip?: string
  onEdit?: (id: string) => void
  onDraw?: (id: string) => void
  searchPlaceholder: string
  showGeoTags?: boolean
  kindOf?: (item: GeoBase) => GeoLevel
  parentOf?: (item: GeoBase) => string | undefined
}) {
  const [q, setQ] = useState("")
  const needle = q.trim().toLowerCase()
  const filtered = items.filter((it) => !needle || it.nameEn.toLowerCase().includes(needle) || it.nameAr.includes(q.trim()) || it.id.includes(needle))
  return (
    <div className="flex h-[calc(100vh-330px)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="space-y-2 border-b border-border px-2.5 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        <span className="flex-shrink-0 rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{filtered.length}</span>
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          {onUpload && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7 bg-card" onClick={onUpload}>
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56 text-center">{uploadTooltip}</TooltipContent>
            </Tooltip>
          )}
          {onCreate && (
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onCreate}>
              <Plus className="h-3.5 w-3.5" />Create
            </Button>
          )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="h-8 pl-8 text-sm" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#F1F4F5] p-2.5">
        {filtered.map((it) => (
          <GeoCard
            key={it.id}
            item={it}
            selected={it.id === selectedId}
            onSelect={onSelect ? () => onSelect(it.id) : undefined}
            childCount={childCount?.(it.id)}
            childLabel={childLabel}
            onEdit={onEdit ? () => onEdit(it.id) : undefined}
            onDraw={onDraw ? () => onDraw(it.id) : undefined}
            showGeoTags={showGeoTags}
            kind={kindOf?.(it)}
            parentLine={parentOf?.(it)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />{needle ? "No matches" : "Nothing here yet"}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function GeoFormDialog({ level, initial, parentLabel, parentOptions, defaultParentId, onSave, onClose }: {
  level: GeoLevel
  initial?: GeoBase & { parentId?: string }
  parentLabel?: string
  parentOptions?: { value: string; label: string }[]
  defaultParentId?: string
  onSave: (data: { nameEn: string; nameAr: string; status: GeoStatus; parentId?: string }) => void
  onClose: () => void
}) {
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "")
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "")
  const [status, setStatus] = useState<GeoStatus>(initial?.status ?? "Active")
  const [parentId, setParentId] = useState(initial?.parentId ?? defaultParentId ?? "")
  const canSave = nameEn.trim().length > 0 && (!parentOptions || parentId !== "")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial ? `Edit ${level}` : `Create ${level}`}
            {initial && <IdTag value={initial.id} className="text-[11px]" />}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {parentOptions && (
            <div className="space-y-1.5">
              <Label className="text-xs">{parentLabel}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder={`Select ${parentLabel?.toLowerCase()}`} /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">English name</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={`${level} name in English`} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Arabic name</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GeoStatus)}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave({ nameEn: nameEn.trim(), nameAr: nameAr.trim(), status, parentId: parentOptions ? parentId : undefined })}>
            {initial ? "Save Changes" : `Create ${level}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bulk GeoJSON upload drawer ───────────────────────────────────────────────

interface UploadRow { id: string; name: string; kind: string; polyPass: boolean; pinPass: boolean }

function SummaryBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
      <div className="text-sm font-bold text-emerald-800">{title}</div>
      {lines.map((l) => <div key={l} className="mt-1 text-sm text-emerald-900">{l}</div>)}
    </div>
  )
}

function BulkUploadDrawer({ level, rows, onClose }: {
  level: "Districts" | "Areas"
  rows: { id: string; name: string; kind: string }[]
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<"idle" | "extracting" | "done">("idle")
  const [showReport, setShowReport] = useState(false)
  const [q, setQ] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const report: UploadRow[] = useMemo(() => rows.map((r, i) => ({ ...r, polyPass: i % 5 !== 3, pinPass: i % 7 !== 5 })), [rows])
  const kinds = [...new Set(report.map((r) => r.kind))]
  const summarize = (pass: (r: UploadRow) => boolean) =>
    kinds.map((k) => {
      const of = report.filter((r) => r.kind === k)
      return `${of.filter(pass).length} ${k}s extracted successfully out of ${of.length}`
    })
  const needle = q.trim().toLowerCase()
  const visible = report.filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.id.includes(needle))
  const importedCount = report.filter((r) => r.polyPass || r.pinPass).length

  const takeFile = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setPhase("idle")
    setShowReport(false)
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <div className="border-b border-border px-4 py-3">
          <SheetTitle className="text-base font-semibold">Map Pins & Polygons — {level}</SheetTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bulk upload {level === "Areas" ? "areas & subareas" : "districts"} pins and polygons as GeoJSON.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div>
            <div className="mb-1.5 text-sm font-medium text-foreground">Upload GeoJSON file</div>
            <label
              className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card transition-colors hover:border-muted-foreground/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); takeFile(e.dataTransfer.files?.[0]) }}
            >
              <span className="rounded-lg border border-border p-2"><Upload className="h-4 w-4 text-muted-foreground" /></span>
              <span className="text-sm font-medium text-foreground">Browse or drag and drop</span>
              <span className="text-xs text-muted-foreground">GeoJSON file only</span>
              <input ref={inputRef} type="file" accept=".json,.geojson" className="hidden" onChange={(e) => takeFile(e.target.files?.[0])} />
            </label>
          </div>

          {file && phase === "idle" && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5">
              <FileJson className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{file.name}</div>
                <div className="text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</div>
              </div>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={() => { setPhase("extracting"); setTimeout(() => setPhase("done"), 1200) }}>Extract</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setFile(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {phase === "extracting" && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Extracting pins & polygons…
            </div>
          )}

          {phase === "done" && (
            <>
              <SummaryBox title="Polygons:" lines={summarize((r) => r.polyPass)} />
              <SummaryBox title="Pins:" lines={summarize((r) => r.pinPass)} />
              <button type="button" className="text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setShowReport((v) => !v)}>
                {showReport ? "Hide detailed report" : "Show detailed report"}
              </button>

              {showReport && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 text-base font-semibold text-foreground">Report</div>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or ID" className="h-8 pl-8 text-sm" />
                    </div>
                    <button type="button" className="flex-shrink-0 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => toast.success("Report exported to Excel")}>
                      Export to excel
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_72px_72px] border-b border-border pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Name</span><span>Polygon</span><span>Pin</span>
                  </div>
                  {visible.map((r) => (
                    <div key={`${r.kind}-${r.id}`} className="grid grid-cols-[1fr_72px_72px] items-center border-b border-border/60 py-2 last:border-0">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                          {r.kind === "Subarea" && <span className="flex-shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground">Subarea</span>}
                        </div>
                        <IdTag value={r.id} />
                      </div>
                      <span className={cn("text-sm font-medium", r.polyPass ? "text-emerald-600" : "text-red-600")}>{r.polyPass ? "Passed" : "Failed"}</span>
                      <span className={cn("text-sm font-medium", r.pinPass ? "text-emerald-600" : "text-red-600")}>{r.pinPass ? "Passed" : "Failed"}</span>
                    </div>
                  ))}
                  {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No matches</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={phase !== "done"} onClick={() => { toast.success(`${importedCount} geometries imported`); onClose() }}>Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AreasPage() {
  const [tab, setTab] = useState("hierarchy")
  const [districts, setDistricts] = useState<District[]>(DISTRICTS0)
  const [areas, setAreas] = useState<Area[]>(AREAS0)
  const [subareas, setSubareas] = useState<Subarea[]>(SUBAREAS0)

  // Hierarchy drill selection — everything shows until a parent is picked
  const [selDistrict, setSelDistrict] = useState<string | null>(null)
  const [selArea, setSelArea] = useState<string | null>(null)
  const [selSub, setSelSub] = useState<string | null>(null)

  // Dialogs
  const [createLevel, setCreateLevel] = useState<GeoLevel | null>(null)
  const [editTarget, setEditTarget] = useState<{ level: GeoLevel; id: string } | null>(null)
  const [drawTarget, setDrawTarget] = useState<{ level: GeoLevel; id: string } | null>(null)
  const [uploadLevel, setUploadLevel] = useState<"Districts" | "Areas" | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

  // SEO / FAQs working item — the selector lists areas AND subareas together
  const [workAreaId, setWorkAreaId] = useState<string>(AREAS0[0].id)
  const workItem: Area | Subarea | undefined = areas.find((a) => a.id === workAreaId) ?? subareas.find((s) => s.id === workAreaId) ?? areas[0]
  const workIsSub = !!workItem && "areaId" in workItem
  const workParent = workIsSub
    ? areas.find((a) => a.id === (workItem as Subarea).areaId)?.nameEn ?? ""
    : districts.find((d) => d.id === (workItem as Area | undefined)?.districtId)?.nameEn ?? ""

  const dName = (id: string | null) => districts.find((d) => d.id === id)?.nameEn ?? ""
  const visibleAreas = selDistrict ? areas.filter((a) => a.districtId === selDistrict) : areas
  const visibleSubs = selArea
    ? subareas.filter((s) => s.areaId === selArea)
    : selDistrict
      ? subareas.filter((s) => visibleAreas.some((a) => a.id === s.areaId))
      : subareas

  const pickDistrict = (id: string) => { setSelDistrict((cur) => (cur === id ? null : id)); setSelArea(null); setSelSub(null) }
  const pickArea = (id: string) => { setSelArea((cur) => (cur === id ? null : id)); setSelSub(null) }

  const now = () => new Date().toISOString()
  const nextId = (arr: { id: string }[]) => String(Math.max(...arr.map((x) => Number(x.id))) + 1)

  const locations: MapLocation[] = useMemo(() => [
    ...PROJECT_LOCATIONS,
    ...districts.map((d) => ({ id: d.id, name: d.nameEn, kind: "District", center: centroid(d.polygon, d.pin) })),
    ...areas.map((a) => ({ id: a.id, name: a.nameEn, kind: "Area", center: centroid(a.polygon, a.pin) })),
    ...subareas.map((s) => ({ id: s.id, name: s.nameEn, kind: "Subarea", center: centroid(s.polygon, s.pin) })),
  ], [districts, areas, subareas])

  const editEntity = editTarget
    ? editTarget.level === "District" ? districts.find((d) => d.id === editTarget.id)
      : editTarget.level === "Area" ? areas.find((a) => a.id === editTarget.id)
        : subareas.find((s) => s.id === editTarget.id)
    : undefined
  const drawEntity = drawTarget
    ? drawTarget.level === "District" ? districts.find((d) => d.id === drawTarget.id)
      : drawTarget.level === "Area" ? areas.find((a) => a.id === drawTarget.id)
        : subareas.find((s) => s.id === drawTarget.id)
    : undefined

  // Subareas listed right after their parent area
  const seoItems: GeoBase[] = areas.flatMap((a) => [a as GeoBase, ...subareas.filter((s) => s.areaId === a.id)])
  const areaSelector = (
    <GeoColumn
      title="Areas & Subareas"
      items={seoItems}
      selectedId={workAreaId}
      onSelect={setWorkAreaId}
      showGeoTags={false}
      kindOf={(it) => ("areaId" in it ? "Subarea" : "Area")}
      parentOf={(it) => ("areaId" in it ? `Parent: ${areas.find((a) => a.id === (it as Subarea).areaId)?.nameEn ?? ""} · ID: ${(it as Subarea).areaId}` : undefined)}
      searchPlaceholder="Search areas or subareas by name or ID"
    />
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Areas</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Areas</h1>
          <p className="text-sm text-muted-foreground">Manage the location hierarchy, SEO content and FAQs per area</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="hierarchy"><MapIcon className="mr-1.5 h-3.5 w-3.5" />Map Hierarchy</TabsTrigger>
              <TabsTrigger value="seo"><FileText className="mr-1.5 h-3.5 w-3.5" />SEO</TabsTrigger>
              <TabsTrigger value="faqs"><HelpCircle className="mr-1.5 h-3.5 w-3.5" />FAQs</TabsTrigger>
            </TabsList>
            {tab === "hierarchy" && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setMapOpen(true)}>
                <MapIcon className="h-3.5 w-3.5" />Map
              </Button>
            )}
          </div>

          {/* ── Map Hierarchy: District > Area > Subarea columns ── */}
          <TabsContent value="hierarchy" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <GeoColumn
                title="Districts"
                items={districts}
                selectedId={selDistrict}
                onSelect={pickDistrict}
                childCount={(id) => areas.filter((a) => a.districtId === id).length}
                childLabel="areas"
                onCreate={() => setCreateLevel("District")}
                onUpload={() => setUploadLevel("Districts")}
                uploadTooltip="Bulk upload districts Pins and Polygons as GeoJSON"
                onEdit={(id) => setEditTarget({ level: "District", id })}
                onDraw={(id) => setDrawTarget({ level: "District", id })}
                searchPlaceholder="Search districts by name or ID"
              />
              <GeoColumn
                title={selDistrict ? `Areas — ${dName(selDistrict)}` : "Areas"}
                items={visibleAreas}
                selectedId={selArea}
                onSelect={pickArea}
                childCount={(id) => subareas.filter((s) => s.areaId === id).length}
                childLabel="subareas"
                onCreate={() => setCreateLevel("Area")}
                onUpload={() => setUploadLevel("Areas")}
                uploadTooltip="Bulk upload areas Pins and Polygons as GeoJSON"
                onEdit={(id) => setEditTarget({ level: "Area", id })}
                onDraw={(id) => setDrawTarget({ level: "Area", id })}
                searchPlaceholder="Search areas by name or ID"
              />
              <GeoColumn
                title={selArea ? `Subareas — ${areas.find((a) => a.id === selArea)?.nameEn ?? ""}` : selDistrict ? `Subareas — ${dName(selDistrict)}` : "Subareas"}
                items={visibleSubs}
                selectedId={selSub}
                onSelect={(id) => setSelSub((c) => (c === id ? null : id))}
                onCreate={() => setCreateLevel("Subarea")}
                onEdit={(id) => setEditTarget({ level: "Subarea", id })}
                onDraw={(id) => setDrawTarget({ level: "Subarea", id })}
                searchPlaceholder="Search subareas by name or ID"
              />
            </div>
          </TabsContent>

          {/* ── SEO: pick an area on the left, edit its SEO on the right ── */}
          <TabsContent value="seo" className="mt-4">
            <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
              {areaSelector}
              {workItem && (
                <SeoTab key={workItem.id} entity={{ name: workItem.nameEn, nameAr: workItem.nameAr, descriptionEn: `${workItem.nameEn} is one of ${workParent}'s most in-demand ${workIsSub ? "subareas" : "areas"}.`, descriptionAr: `${workItem.nameAr} من أكثر المناطق طلبًا.` }} />
              )}
            </div>
          </TabsContent>

          {/* ── FAQs: pick an area on the left, manage its FAQs on the right ── */}
          <TabsContent value="faqs" className="mt-4">
            <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
              {areaSelector}
              {workItem && <FaqsTab key={workItem.id} entityName={workItem.nameEn} />}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create / edit dialog ── */}
      {(createLevel || editTarget) && (() => {
        const level = createLevel ?? editTarget!.level
        const parentOptions = level === "Area"
          ? districts.map((d) => ({ value: d.id, label: `${d.nameEn} — ID: ${d.id}` }))
          : level === "Subarea"
            ? areas.map((a) => ({ value: a.id, label: `${a.nameEn} — ID: ${a.id}` }))
            : undefined
        const parentLabel = level === "Area" ? "District" : level === "Subarea" ? "Area" : undefined
        const editParentId = editTarget?.level === "Area" ? (editEntity as Area | undefined)?.districtId
          : editTarget?.level === "Subarea" ? (editEntity as Subarea | undefined)?.areaId : undefined
        return (
          <GeoFormDialog
            level={level}
            initial={editEntity ? { ...editEntity, parentId: editParentId } : undefined}
            parentLabel={parentLabel}
            parentOptions={parentOptions}
            defaultParentId={level === "Area" ? selDistrict ?? undefined : level === "Subarea" ? selArea ?? undefined : undefined}
            onClose={() => { setCreateLevel(null); setEditTarget(null) }}
            onSave={({ nameEn, nameAr, status, parentId }) => {
              const stamp = now()
              if (editTarget) {
                if (level === "District") setDistricts((ds) => ds.map((d) => (d.id === editTarget.id ? { ...d, nameEn, nameAr, status, updatedAt: stamp } : d)))
                else if (level === "Area") setAreas((as) => as.map((a) => (a.id === editTarget.id ? { ...a, nameEn, nameAr, status, districtId: parentId!, updatedAt: stamp } : a)))
                else setSubareas((ss) => ss.map((s) => (s.id === editTarget.id ? { ...s, nameEn, nameAr, status, areaId: parentId!, updatedAt: stamp } : s)))
                toast.success(`${level} updated`)
              } else {
                const base = { nameEn, nameAr, status, createdAt: stamp, updatedAt: stamp, pin: null, polygon: null }
                if (level === "District") setDistricts((ds) => [{ id: nextId(ds), ...base }, ...ds])
                else if (level === "Area") setAreas((as) => [{ id: nextId(as), districtId: parentId!, ...base }, ...as])
                else setSubareas((ss) => [{ id: nextId(ss), areaId: parentId!, ...base }, ...ss])
                toast.success(`${level} created`)
              }
              setCreateLevel(null)
              setEditTarget(null)
            }}
          />
        )
      })()}

      {/* ── Draw on map dialog ── */}
      {drawTarget && drawEntity && (
        <MapDrawDialog
          name={drawEntity.nameEn}
          level={drawTarget.level}
          entityId={drawEntity.id}
          pin={drawEntity.pin}
          polygon={drawEntity.polygon}
          locations={locations}
          backdrop={
            drawTarget.level === "Area"
              ? districts.filter((d) => d.id === (drawEntity as Area).districtId && d.polygon).map((d) => ({ pts: d.polygon!, color: LEVEL_COLOR.District }))
              : drawTarget.level === "Subarea"
                ? areas.filter((a) => a.id === (drawEntity as Subarea).areaId && a.polygon).map((a) => ({ pts: a.polygon!, color: LEVEL_COLOR.Area }))
                : []
          }
          onClose={() => setDrawTarget(null)}
          onSave={(pin, polygon) => {
            const stamp = now()
            if (drawTarget.level === "District") setDistricts((ds) => ds.map((d) => (d.id === drawTarget.id ? { ...d, pin, polygon, updatedAt: stamp } : d)))
            else if (drawTarget.level === "Area") setAreas((as) => as.map((a) => (a.id === drawTarget.id ? { ...a, pin, polygon, updatedAt: stamp } : a)))
            else setSubareas((ss) => ss.map((s) => (s.id === drawTarget.id ? { ...s, pin, polygon, updatedAt: stamp } : s)))
            setDrawTarget(null)
            toast.success("Map geometry saved")
          }}
        />
      )}

      {/* ── Bulk GeoJSON upload ── */}
      {uploadLevel && (
        <BulkUploadDrawer
          level={uploadLevel}
          rows={uploadLevel === "Districts"
            ? districts.map((d) => ({ id: d.id, name: d.nameEn, kind: "District" }))
            : [
              ...areas.map((a) => ({ id: a.id, name: a.nameEn, kind: "Area" })),
              ...subareas.map((s) => ({ id: s.id, name: s.nameEn, kind: "Subarea" })),
            ]}
          onClose={() => setUploadLevel(null)}
        />
      )}

      {/* ── Global map (90%) ── */}
      {mapOpen && (
        <GlobalMapDialog
          entities={[
            ...districts.map((d) => ({ id: d.id, name: d.nameEn, level: "District" as GeoLevel, status: d.status, pin: d.pin, polygon: d.polygon })),
            ...areas.map((a) => ({ id: a.id, name: a.nameEn, level: "Area" as GeoLevel, status: a.status, pin: a.pin, polygon: a.polygon })),
            ...subareas.map((s) => ({ id: s.id, name: s.nameEn, level: "Subarea" as GeoLevel, status: s.status, pin: s.pin, polygon: s.polygon })),
          ]}
          locations={locations}
          onClose={() => setMapOpen(false)}
          onSave={(updated: GeoRef[]) => {
            const find = (level: GeoLevel, id: string) => updated.find((g) => g.level === level && g.id === id)
            setDistricts((ds) => ds.map((d) => { const g = find("District", d.id); return g ? { ...d, pin: g.pin, polygon: g.polygon } : d }))
            setAreas((as) => as.map((a) => { const g = find("Area", a.id); return g ? { ...a, pin: g.pin, polygon: g.polygon } : a }))
            setSubareas((ss) => ss.map((s) => { const g = find("Subarea", s.id); return g ? { ...s, pin: g.pin, polygon: g.polygon } : s }))
            setMapOpen(false)
            toast.success("Map changes saved")
          }}
        />
      )}
    </div>
  )
}

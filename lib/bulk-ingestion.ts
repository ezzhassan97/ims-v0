/* ────────────────────────────────────────────────────────────────────────────
   Properties Bulk Ingestion — the engine behind the unified 13-stage flow.

   Sheets, PDFs, photos of price lists and WhatsApp text all become the same
   typed table. Every stage is a pure function of the previous stage's output
   plus the rules that apply to it — saved for the developer, new in this entry
   or proposed by AI — so a change anywhere flows downstream on its own. Sheet
   data is never edited by hand: it changes through saved, reusable actions.
   Everything is deterministic (no Date.now / Math.random) so the mock renders
   identically on server and client.
   ──────────────────────────────────────────────────────────────────────────── */

import { PROJECTS } from "@/lib/projects-mock"
import type { EntryDataType, EntryFileKind, IngestionEntry, PropertyCategory, SaleType } from "@/lib/ingestion-mock"

/* ── Types ───────────────────────────────────────────────────────────────── */

export type Cell = string | number | null
export type FieldType = "text" | "number" | "money" | "select" | "date"
export type DataType = EntryDataType
export type FieldKey =
  | "unitCode" | "project" | "phase" | "building" | "model" | "propertyType" | "bedrooms"
  | "bua" | "buaTo" | "land" | "garden" | "floor" | "finishing" | "deliveryType" | "deliveryDate" | "price" | "priceTo"

export type StageRef =
  | "setup" | "extraction" | "mapping" | "projects" | "transform" | "standard" | "matching"
  | "plans" | "review" | "floor" | "grouping" | "media" | "final"

export interface FieldDef { key: FieldKey; label: string; type: FieldType; options?: readonly string[]; required?: boolean }

/** Generic table the Sheet Preview grid renders — raw sheets and typed unit tables alike. */
export interface GridCol { key: string; label: string; type?: FieldType; options?: readonly string[]; readOnly?: boolean }
export interface GridRow { id: string; idx: number; cells: Record<string, Cell> }
export interface GridTable { cols: GridCol[]; rows: GridRow[]; hasHeader: boolean; headerIdx?: number }

export type AssignHow = "Single project" | "Name match" | "Rule" | "Known code" | "Suggestion" | "Manual"
export type MatchStatus = "new" | "modified" | "unmodified" | "returned" | "review"

/** A unit (with codes) or an offering (no codes) moving through the pipeline. */
export interface URow {
  id: string
  /** Stable row number shown in the grid gutter */
  idx: number
  /** Where the row came from — "Marassi!R14", "PDF p.2 · row 3", "Text · L3" */
  src: string
  v: Partial<Record<FieldKey, Cell>>
  /** Developer-specific columns kept as custom fields */
  custom?: Record<string, Cell>
  projectId?: string
  /** How the row got its project (stage 4) */
  how?: AssignHow
  /** Project a pending suggestion would assign */
  suggested?: string
  /** IMS unit with the same code in the row's project family (stage 4) */
  dbId?: string
  /** The code exists in IMS under a project outside this entry */
  conflict?: string
  /** Extraction confidence per field, 0–100 */
  conf?: Partial<Record<FieldKey, number>>
  /** Matching result (stage 7) */
  match?: RowMatch
  fileId?: string
  tab?: string
  page?: number
  line?: number
}

export interface RowMatch {
  status: MatchStatus
  dbId?: string
  conf: number
  how: string
  candidates?: { dbId: string; conf: number; label: string }[]
  changed?: FieldKey[]
}

export const PROPERTY_TYPES = ["Apartment", "Studio", "Duplex", "Penthouse", "Townhouse", "Twinhouse", "Villa", "Chalet", "Office", "Retail", "Clinic"] as const
export const FINISHING_TYPES = ["Core & Shell", "Semi Finished", "Fully Finished", "Furnished"] as const
export const DELIVERY_TYPES = ["Off Plan", "Ready to Move"] as const
const NON_RESIDENTIAL = new Set(["Office", "Retail", "Clinic", "Studio"])

/** Fixed "today" so date checks don't drift between server and client renders. */
export const TODAY = "2026-09-26"

/** A project or phase an entry's rows can be assigned to. */
export interface ProjOption { id: string; label: string; mainId: string; mainName: string; isPhase: boolean }

export function fieldsFor(dataType: DataType, projects: ProjOption[]): FieldDef[] {
  const project: FieldDef = { key: "project", label: "Project", type: "select", options: projects.map((p) => p.label), required: true }
  const tail: FieldDef[] = [
    { key: "finishing", label: "Finishing", type: "select", options: FINISHING_TYPES },
    { key: "deliveryType", label: "Delivery Type", type: "select", options: DELIVERY_TYPES },
    { key: "deliveryDate", label: "Delivery Date", type: "date" },
  ]
  if (dataType === "Automatic") {
    return [
      { key: "unitCode", label: "Unit Code", type: "text", required: true },
      project,
      { key: "building", label: "Building", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "propertyType", label: "Property Type", type: "select", options: PROPERTY_TYPES, required: true },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bua", label: "BUA m²", type: "number", required: true },
      { key: "land", label: "Land m²", type: "number" },
      { key: "garden", label: "Garden m²", type: "number" },
      { key: "floor", label: "Floor", type: "number" },
      ...tail,
      { key: "price", label: "Price EGP", type: "money", required: true },
    ]
  }
  return [
    project,
    { key: "propertyType", label: "Property Type", type: "select", options: PROPERTY_TYPES, required: true },
    { key: "bedrooms", label: "Bedrooms", type: "number" },
    { key: "bua", label: "BUA from m²", type: "number", required: true },
    { key: "buaTo", label: "BUA to m²", type: "number" },
    { key: "price", label: "Price from EGP", type: "money", required: true },
    { key: "priceTo", label: "Price to EGP", type: "money" },
    ...tail,
  ]
}

/** Required IMS fields per entry type — Mapping blocks until each has a column. */
export const REQUIRED_FIELDS: Record<DataType, FieldKey[]> = {
  Automatic: ["unitCode", "propertyType", "bua", "price"],
  Manual: ["propertyType", "bua", "price"],
}

/** Mapping targets — the entry's fields plus Phase (read for project assignment). */
export function mapTargets(dataType: DataType): { key: FieldKey; label: string }[] {
  const base = fieldsFor(dataType, []).filter((f) => f.key !== "project").map((f) => ({ key: f.key, label: f.label }))
  return [{ key: "project", label: "Project" }, { key: "phase", label: "Phase" }, ...base]
}
export const FIELD_LABEL: Record<FieldKey, string> = {
  unitCode: "Unit Code", project: "Project", phase: "Phase", building: "Building", model: "Model", propertyType: "Property Type",
  bedrooms: "Bedrooms", bua: "BUA", buaTo: "BUA to", land: "Land", garden: "Garden", floor: "Floor", finishing: "Finishing",
  deliveryType: "Delivery Type", deliveryDate: "Delivery Date", price: "Price", priceTo: "Price to",
}
/** A field's name inside a sentence — "delivery date", while acronyms stay "BUA". */
export const fieldWord = (f: FieldKey) => FIELD_LABEL[f].replace(/\b[A-Z][a-z]+/g, (w) => w.toLowerCase())

/* ── Small utils ─────────────────────────────────────────────────────────── */

export const isBlank = (v: Cell | undefined): boolean => v === null || v === undefined || String(v).trim() === ""
export const txt = (v: Cell | undefined): string => (isBlank(v) ? "" : String(v).trim())
export function hashStr(s: string) {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const roundTo = (n: number, step: number) => Math.round(n / step) * step
export const fmtInt = (n: number) => n.toLocaleString("en-US")
export const fmtM = (n: number) => `${+(n / 1e6).toFixed(2)}M`
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`

/** First number in a cell — "160 m²" → 160, "3BR" → 3. */
export const firstNum = (v: Cell | undefined): number | null => {
  if (typeof v === "number") return v
  const m = txt(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}
/** Lenient price read — understands 4.8M and 950K shorthand. */
export function looseMoney(v: Cell | undefined): number | null {
  if (typeof v === "number") return v
  const s = txt(v).toLowerCase().replace(/,/g, "")
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mn|million|m\b|k\b)?/)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] === "k" ? n * 1e3 : m[2] ? n * 1e6 : n
}

function tokens(s: string) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean))
}
/** Token overlap similarity 0–100. */
export function similarity(a: string, b: string): number {
  const A = tokens(a)
  const B = tokens(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  A.forEach((t) => { if (B.has(t)) inter++ })
  return Math.round((inter / Math.max(A.size, B.size)) * 100)
}
export const normCode = (v: Cell | undefined) => txt(v).toUpperCase().replace(/[\s_-]+/g, "")

/* ── Row filters — shared by transformation actions, project rules and plan conditions ── */

export type FilterOp = "is" | "is-not" | "contains" | "blank" | "not-blank" | "lt" | "gt" | "in"
export interface RowFilter { field: FieldKey; op: FilterOp; value?: string }
export const FILTER_OPS: { op: FilterOp; label: string; needsValue: boolean }[] = [
  { op: "is", label: "is", needsValue: true },
  { op: "is-not", label: "is not", needsValue: true },
  { op: "contains", label: "contains", needsValue: true },
  { op: "in", label: "is one of", needsValue: true },
  { op: "blank", label: "is blank", needsValue: false },
  { op: "not-blank", label: "is not blank", needsValue: false },
  { op: "lt", label: "is less than", needsValue: true },
  { op: "gt", label: "is more than", needsValue: true },
]

export function matchesFilter(r: URow, f: RowFilter): boolean {
  const raw = r.v[f.field]
  const s = txt(raw).toLowerCase()
  const val = (f.value ?? "").toLowerCase().trim()
  switch (f.op) {
    case "blank": return isBlank(raw)
    case "not-blank": return !isBlank(raw)
    case "is": return s === val
    case "is-not": return s !== val
    case "contains": return val.split("|").some((x) => !!x.trim() && s.includes(x.trim()))
    case "in": return val.split(",").map((x) => x.trim()).includes(s)
    case "lt": { const n = looseMoney(raw); return n !== null && n < Number(f.value) }
    case "gt": { const n = looseMoney(raw); return n !== null && n > Number(f.value) }
  }
}
export const matchesFilters = (r: URow, fs?: RowFilter[]) => !fs?.length || fs.every((f) => matchesFilter(r, f))
export function filterText(f: RowFilter): string {
  const op = FILTER_OPS.find((o) => o.op === f.op)
  const value = f.op === "in" ? (f.value ?? "").split(",").map((x) => x.trim()).join(", ") : f.value
  return `${FIELD_LABEL[f.field]} ${op?.label ?? f.op}${op?.needsValue ? ` “${value}”` : ""}`
}
export const filtersText = (fs?: RowFilter[]) => (fs?.length ? fs.map(filterText).join(" and ") : "every row")

/* ── Sources ─────────────────────────────────────────────────────────────── */

export type FileKind = "sheet" | "pdf" | "image" | "text"
export interface RawTab { name: string; grid: Cell[][]; merges: { col: number; from: number; to: number }[] }
export interface DocPage { n: number; kind: "cover" | "prices" | "plans" | "terms"; title: string; lines: string[] }
export interface SourceFile {
  id: string
  name: string
  kind: FileKind
  size: number
  origin: "Device" | "WhatsApp"
  tabs?: RawTab[]
  pages?: DocPage[]
  image?: { kind: "prices" | "render"; title: string; lines: string[]; rotated?: boolean; duplicateOf?: string; url?: string }
  lines?: string[]
  /** Rows the extraction model reads from this file (docs only) */
  extracted?: URow[]
}

export const KIND_OF: Record<EntryFileKind, FileKind> = { Sheet: "sheet", PDF: "pdf", Image: "image", Text: "text" }

/* Unit archetypes — realistic mixes of types, areas and prices */
interface Arch { type: string[]; beds: number; bua: [number, number]; land: [number, number] | null; garden: [number, number] | null; price: [number, number]; model: string; floors: boolean }
const ARCH: Arch[] = [
  { type: ["Apartment", "apartment", "APT"], beds: 2, bua: [110, 135], land: null, garden: [18, 45], price: [5.2e6, 6.6e6], model: "A-2B", floors: true },
  { type: ["Apartment", "Apartment 3BR", "Flat"], beds: 3, bua: [150, 180], land: null, garden: [25, 60], price: [7.0e6, 8.6e6], model: "B-3B", floors: true },
  { type: ["Duplex", "duplex"], beds: 4, bua: [220, 260], land: null, garden: [40, 90], price: [11e6, 13.2e6], model: "D-4B", floors: true },
  { type: ["Penthouse", "PH"], beds: 3, bua: [190, 215], land: null, garden: null, price: [10.2e6, 12.1e6], model: "P-3B", floors: true },
  { type: ["Townhouse", "Town House"], beds: 3, bua: [200, 232], land: [160, 210], garden: null, price: [14e6, 16.4e6], model: "TH-M", floors: false },
  { type: ["Villa", "Stand Alone"], beds: 4, bua: [280, 325], land: [350, 460], garden: null, price: [22e6, 26.5e6], model: "V-A", floors: false },
]
export const MODEL_ARCH = ARCH.map((a) => ({ model: a.model, type: a.type[0], beds: a.beds, area: Math.round((a.bua[0] + a.bua[1]) / 2) }))
const MIX = [0, 1, 0, 1, 2, 0, 3, 1, 4, 0, 5, 1]
const TOWER_MIX = [0, 1, 0, 3, 1, 2]
const FIN_CLEAN = ["Fully Finished", "Semi Finished", "Core & Shell"] as const

interface UnitSpec {
  code: string; building: string; model: string; type: string; beds: number; bua: number
  land: number | null; garden: number | null; floor: number | null; finishing: string; delivery: string; ready: boolean; price: number
}

export function prefixOf(name: string) {
  const letters = name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "")
  return (letters + "XXX").slice(0, 3)
}

/** The clean truth behind a generated unit — what IMS holds after ingestion. */
function unitSpec(prefix: string, i: number, towers = false): UnitSpec {
  const a = ARCH[towers ? TOWER_MIX[i % TOWER_MIX.length] : MIX[i % MIX.length]]
  const t = (hashStr(`${prefix}${i}`) % 100) / 100
  const bua = Math.round(lerp(a.bua[0], a.bua[1], t))
  const floor = a.floors ? Math.floor(i / 6) % 9 : null
  const building = towers ? `T${(i % 3) + 1}` : `${"ABC"[i % 3]}${(i % 4) + 1}`
  const code = `${prefix}-${building}-${Math.floor(i / 6)}${String((i % 6) + 1).padStart(2, "0")}`
  const ready = i % 8 === 4
  const q = [3, 6, 9, 12][i % 4]
  const year = 2027 + (i % 3 === 2 ? 1 : 0)
  const lastDay = new Date(Date.UTC(year, q, 0)).getUTCDate()
  return {
    code,
    building,
    model: a.model,
    type: a.type[0],
    beds: a.beds,
    bua,
    land: a.land ? Math.round(lerp(a.land[0], a.land[1], t)) : null,
    garden: a.garden && i % 3 === 0 ? Math.round(lerp(a.garden[0], a.garden[1], t)) : null,
    floor,
    finishing: FIN_CLEAN[i % 3],
    delivery: ready ? "" : `${year}-${String(q).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    ready,
    price: roundTo(lerp(a.price[0], a.price[1], t), 10_000),
  }
}

/* Messy renditions — the way developer sheets actually arrive */
const FIN_VARIANTS: Record<string, string[]> = {
  "Fully Finished": ["Fully Finished", "fully finished", "FF"],
  "Semi Finished": ["Semi Finished", "semi", "Semi-Finished"],
  "Core & Shell": ["Core & Shell", "CS"],
}
const rawFinishing = (s: UnitSpec, i: number) => { const v = FIN_VARIANTS[s.finishing] ?? [s.finishing]; return v[Math.floor(i / 3) % v.length] }
function rawDelivery(s: UnitSpec, i: number): string {
  if (s.ready) return i % 16 === 4 ? "Immediate" : "Ready"
  const [y, m] = s.delivery.split("-").map(Number)
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]
  const variants = [`Q${m / 3} ${y}`, `${mon} ${y}`, `${String(m).padStart(2, "0")}/${y}`, m === 12 ? `${y}` : `Q${m / 3} ${y}`, s.delivery.split("-").reverse().join("/")]
  return variants[i % variants.length]
}
function rawPrice(s: UnitSpec, i: number): string {
  if (i === 31) return "0"
  if (i === 19) return fmtInt(Math.round(s.price / s.bua)) // a price per m² slipped into the price column
  if (i % 7 === 4) return fmtM(s.price)
  if (i % 11 === 6) return `${fmtInt(s.price)} EGP`
  return fmtInt(s.price)
}

/** Clean tab — header at A1, but with merged Project/Phase blocks, an empty column, spacer rows and a totals row. */
function unitsTabA(project: string, phases: string[], n: number): RawTab {
  const prefix = prefixOf(project)
  const header: Cell[] = ["Unit Code", "Project", "Phase", "Model", "Type", "Beds", "BUA", "Land", "Garden", "Floor", null, "Finishing", "Delivery", "Price", "Notes"]
  const rows: Cell[][] = []
  const merges: RawTab["merges"] = []
  const blank = () => header.map(() => null)
  let blockStart = -1
  for (let i = 0; i < n; i++) {
    const block = Math.floor(i / 12)
    const s = unitSpec(prefix, i)
    const a = ARCH[MIX[i % MIX.length]]
    if (i > 0 && i % 12 === 0) rows.push(blank()) // spacer row between phase blocks
    const sheetRow = rows.length + 1 // 0-based grid row of this unit (header is row 0)
    const typeRaw = a.type[i % 7 === 3 ? 1 : i % 13 === 5 ? 2 : 0] ?? a.type[0]
    const splitType = /\d\s*br/i.test(typeRaw)
    const beds = splitType || i % 17 === 0 ? null : i % 5 === 1 ? `${s.beds}BR` : i % 9 === 2 ? `${s.beds} bed` : String(s.beds)
    const code = i === 17 ? unitSpec(prefix, 16).code : i % 11 === 4 ? `${s.code.toLowerCase()} ` : s.code
    const firstInBlock = i % 12 === 0
    if (firstInBlock) blockStart = sheetRow
    rows.push([
      code,
      firstInBlock ? project : null,
      firstInBlock ? (phases[block % Math.max(1, phases.length)] ?? `Phase ${block + 1}`) : null,
      s.model,
      typeRaw,
      beds,
      i % 6 === 2 ? `${s.bua} m²` : i % 10 === 7 ? `${s.bua}sqm` : String(s.bua),
      s.land === null ? null : String(s.land),
      s.garden === null ? null : String(s.garden),
      s.floor === null ? null : s.floor === 0 ? "G" : String(s.floor),
      null,
      i === 23 ? "Premium" : rawFinishing(s, i),
      i === 29 ? "03/04/2028" : rawDelivery(s, i),
      rawPrice(s, i),
      i % 9 === 5 ? "Corner unit" : i % 13 === 8 ? "Sea view" : null,
    ])
    const lastInBlock = i % 12 === 11 || i === n - 1
    if (lastInBlock && sheetRow > blockStart) {
      merges.push({ col: 1, from: blockStart, to: sheetRow })
      merges.push({ col: 2, from: blockStart, to: sheetRow })
    }
    if (i === 20) rows.push(blank()) // a stray empty row mid-block
  }
  rows.push(["Total", null, null, null, null, null, null, null, null, null, null, null, null, `${n} units`, null])
  return { name: project, grid: [header, ...rows], merges }
}

/** Messy tab — title rows, a blank row, the table indented one column and a repeated header mid-sheet. */
function unitsTabB(name: string, n: number): RawTab {
  const prefix = prefixOf(name)
  const width = 10
  const pad = (cells: Cell[]) => [...cells, ...Array.from({ length: width - cells.length }, () => null)]
  const header: Cell[] = [null, "Code", "Tower", "Unit Type", "Bedrooms", "Area", "Terrace", "Finish", "Handover", "Total Price"]
  const grid: Cell[][] = [
    pad([`${name.toUpperCase()} — PRICE LIST`]),
    pad(["Updated 12 Sep 2026 · Sales dept."]),
    pad([]),
    header,
  ]
  for (let i = 0; i < n; i++) {
    if (i === 18) grid.push(header) // page-break header repeated by the export
    const s = unitSpec(prefix, i, true)
    grid.push([
      null,
      s.code,
      `Tower ${s.building.slice(1)}`,
      i % 5 === 3 ? s.type.toLowerCase() : s.type,
      i % 7 === 2 ? `${s.beds} BR` : String(s.beds),
      String(s.bua),
      s.garden === null ? null : `${s.garden} m²`,
      rawFinishing(s, i + 1),
      rawDelivery(s, i + 1),
      i % 4 === 1 ? fmtM(s.price) : fmtInt(s.price),
    ])
  }
  return { name, grid, merges: [] }
}

function termsTab(): RawTab {
  return {
    name: "Payment Terms",
    merges: [],
    grid: [
      ["Payment terms — 2026 price list", null, null, null],
      [null, null, null, null],
      ["Plan", "Down payment", "Years", "Installments"],
      ["Standard", "10%", 8, "Quarterly"],
      ["Extended", "5%", 10, "Monthly"],
      ["Cash", "100%", 0, "12% discount"],
      [null, null, null, null],
      ["* Prices exclude maintenance and club membership.", null, null, null],
    ],
  }
}

/* Offering archetypes — how brokers describe inventory without unit codes */
const GROUP_ARCH = [
  { type: "Apartment", beds: 2, bua: [120, 135], price: [6.2e6, 6.9e6] },
  { type: "Apartment", beds: 3, bua: [165, 180], price: [8.1e6, 9.0e6] },
  { type: "Duplex", beds: 4, bua: [240, 255], price: [13.9e6, 14.6e6] },
  { type: "Townhouse", beds: 3, bua: [210, 230], price: [14.5e6, 15.8e6] },
  { type: "Villa", beds: 4, bua: [310, 330], price: [23.8e6, 25.1e6] },
  { type: "Penthouse", beds: 3, bua: [190, 205], price: [11.4e6, 12.2e6] },
  { type: "Studio", beds: 0, bua: [55, 60], price: [3.2e6, 3.5e6] },
  { type: "Chalet", beds: 2, bua: [95, 110], price: [4.9e6, 5.4e6] },
] as const

function groupRow(fileId: string, n: number, projectRaw: string, g: (typeof GROUP_ARCH)[number], src: string, conf: number, extra: Partial<URow> = {}): URow {
  return {
    id: `${fileId}:${n}`,
    idx: 0,
    src,
    fileId,
    v: {
      project: projectRaw,
      propertyType: g.type === "Studio" ? "Studio" : g.type,
      bedrooms: g.beds === 0 ? null : String(g.beds),
      bua: String(g.bua[0]),
      buaTo: String(g.bua[1]),
      price: fmtM(g.price[0]),
      priceTo: fmtM(g.price[1]),
      finishing: n === 2 ? "Premium finish" : "Semi finished",
      deliveryDate: "Q4 2027",
    },
    conf: { project: conf, propertyType: 98, bedrooms: 96, bua: conf, buaTo: conf, price: conf, priceTo: conf - 4, finishing: n === 2 ? 58 : 90, deliveryDate: 88 },
    ...extra,
  }
}

function unitDocRow(fileId: string, n: number, projectRaw: string, s: UnitSpec, src: string, conf: number, extra: Partial<URow> = {}): URow {
  return {
    id: `${fileId}:${n}`,
    idx: 0,
    src,
    fileId,
    v: {
      unitCode: s.code,
      project: projectRaw,
      building: s.building,
      model: s.model,
      propertyType: s.type,
      bedrooms: String(s.beds),
      bua: String(s.bua),
      land: s.land === null ? null : String(s.land),
      floor: s.floor === null ? null : String(s.floor),
      finishing: rawFinishing(s, n),
      deliveryDate: rawDelivery(s, n),
      price: n % 3 === 1 ? fmtM(s.price) : fmtInt(s.price),
    },
    conf: { unitCode: conf, propertyType: 97, bedrooms: 95, bua: conf, price: conf - (n % 4 === 2 ? 22 : 0), deliveryDate: 90, finishing: 92 },
    ...extra,
  }
}

const TYPE_WORD = /\b(apartments?|apts?|flats?|villas?|town\s*houses?|twin\s*houses?|duplex(?:es)?|penthouses?|studios?|chalets?|offices?|retail|shops?|clinics?)\b/i
const CODE_RE = /\b([A-Z]{2,4}-[A-Z0-9]{1,4}-\d{2,4})\b/

/** Reads a broker message line by line — one row per line that names a unit type and a number. */
export function parseMessage(fileId: string, lines: string[], fallbackProject: string): URow[] {
  const delivery = lines.map((l) => (/deliver|handover/i.test(l) ? l.match(/q[1-4]\s*\d{4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\b20\d{2}\b|ready|immediate/i)?.[0] : undefined)).find(Boolean) ?? null
  const finishing = lines.map((l) => l.match(/fully[\s-]*finished|semi[\s-]*finished|core\s*(?:&|and)\s*shell|furnished/i)?.[0]).find(Boolean) ?? null
  const titleLine = lines.find((l) => /release|launch|phase|🔥|new/i.test(l) && !TYPE_WORD.test(l))
  const project = titleLine?.replace(/[^\p{L}\p{N}\s—–-]/gu, " ").replace(/\b(new|release|launch|now|available)\b/gi, " ").replace(/\s+/g, " ").trim() || fallbackProject
  const out: URow[] = []
  lines.forEach((line, i) => {
    const type = line.match(TYPE_WORD)?.[1]
    if (!type || !/\d/.test(line)) return
    const beds = line.match(/(\d)\s*(?:br|bed|bedroom)s?\b/i)?.[1] ?? null
    const area = line.match(/(\d{2,4})\s*(?:[-–]\s*(\d{2,4}))?\s*(?:sqm|m²|m2|meters?|sq\.?\s*m)/i)
    // Read the price from what's left once the area is taken out — "240 m² 13.9M" must not price at 240
    const rest = area ? line.replace(area[0], " ") : line
    const price = rest.match(/(\d+(?:\.\d+)?\s*(?:m|mn|million)(?![²2a-z])|\d{1,3}(?:,\d{3})+)/i)?.[1] ?? null
    const code = line.match(CODE_RE)?.[1]
    out.push({
      id: `${fileId}:${i}`,
      idx: 0,
      src: `Text · L${i + 1}`,
      fileId,
      line: i,
      v: {
        ...(code ? { unitCode: code } : {}),
        project,
        propertyType: type.replace(/s$/i, "").replace(/^apt$/i, "Apartment"),
        bedrooms: beds,
        bua: area?.[1] ?? null,
        buaTo: area?.[2] ?? null,
        price,
        finishing,
        deliveryDate: delivery,
      },
      conf: { project: titleLine ? 90 : 60, propertyType: 97, bedrooms: beds ? 95 : 70, bua: area ? 94 : 55, buaTo: area?.[2] ? 94 : 55, price: price ? 92 : 50, finishing: finishing ? 90 : 60, deliveryDate: delivery ? 88 : 55 },
    })
  })
  return out
}

/** Builds the content behind an entry's files — sheets get tabs, docs get pages, photos, text and extractable rows. */
function buildFile(meta: { name: string; kind: EntryFileKind; size: number; origin: "Device" | "WhatsApp"; content?: string }, idx: number, ctx: {
  dataType: DataType; mains: { id: string; name: string }[]; phases: string[]; imageSeq: { n: number }
}): SourceFile {
  const id = `F${idx + 1}`
  const kind = KIND_OF[meta.kind]
  const mainA = ctx.mains[0]?.name ?? "Project"
  const mainB = ctx.mains[1]?.name ?? `${mainA} Towers`
  const phase = ctx.phases[0] ?? "Phase 1"
  const base: SourceFile = { id, name: meta.name, kind, size: meta.size, origin: meta.origin }

  if (kind === "sheet") {
    return { ...base, tabs: [unitsTabA(mainA, ctx.phases.length ? ctx.phases : ["Phase 1", "Phase 2"], 44), unitsTabB(mainB, 30), termsTab()] }
  }

  if (kind === "text" && meta.content) {
    const lines = meta.content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    return { ...base, lines, extracted: parseMessage(id, lines, mainA) }
  }

  if (kind === "text") {
    const auto = ctx.dataType === "Automatic"
    const groups = [GROUP_ARCH[0], GROUP_ARCH[1], GROUP_ARCH[2]]
    const specs = [0, 1, 2, 3].map((i) => unitSpec(prefixOf(mainA), 60 + i))
    const body = auto
      ? specs.map((s) => `• ${s.code} · ${s.type} ${s.beds}BR · ${s.bua} m² · ${fmtM(s.price)}`)
      : groups.map((g, k) => `• ${g.type}s ${g.beds}BR ${g.bua[0]}-${g.bua[1]} sqm from ${fmtM(g.price[0])}${k === 2 ? " · Premium finish" : ""}`)
    const lines = [
      "Good morning team 🌞",
      `🔥 ${mainA} — ${phase} new release 🔥`,
      ...body,
      "Delivery Q4 2027 · Semi finished",
      "Payment: 10% DP, 8 years equal installments",
      "Limited units — book now!",
      "For more info call Ahmed 0100 123 4567",
    ]
    const extracted = auto
      ? specs.map((s, k) => unitDocRow(id, k, `${mainA} — ${phase}`, s, `Text · L${k + 3}`, 96, { line: k + 2 }))
      : groups.map((g, k) => groupRow(id, k, `${mainA} — ${phase}`, g, `Text · L${k + 3}`, 97, { line: k + 2 }))
    return { ...base, lines, extracted }
  }

  if (kind === "image") {
    const n = ++ctx.imageSeq.n
    // 3rd photo is a re-send of the 1st, 4th is a render — both real WhatsApp habits
    if (n === 3) return { ...base, image: { kind: "prices", title: `${mainB} price list`, lines: [], duplicateOf: "F-photo-1" } }
    if (n === 4) return { ...base, image: { kind: "render", title: "Clubhouse render", lines: [], url: "/luxury-clubhouse-exterior.jpg" } }
    const auto = ctx.dataType === "Automatic"
    const groups = n === 1 ? [GROUP_ARCH[3], GROUP_ARCH[4], GROUP_ARCH[5]] : [GROUP_ARCH[7], GROUP_ARCH[6]]
    const specs = [0, 1, 2].map((i) => unitSpec(prefixOf(mainB), 70 + n * 5 + i, true))
    const lines = auto
      ? specs.map((s) => `${s.code} | ${s.type} | ${s.beds}BR | ${s.bua} m² | ${fmtInt(s.price)}`)
      : groups.map((g, k) => `${g.type} | ${g.beds ? `${g.beds}BR` : "—"} | ${g.bua[0]}–${g.bua[1]} m² | from ${fmtInt(g.price[0])}${k === 2 ? " | Premium finish" : ""}`)
    const rotated = n === 2
    const conf = rotated ? 64 : 81
    const extracted = auto
      ? specs.map((s, k) => unitDocRow(id, k, mainB, s, `Photo ${n} · row ${k + 1}`, conf, { line: k }))
      : groups.map((g, k) => groupRow(id, k, mainB, g, `Photo ${n} · row ${k + 1}`, conf, { line: k }))
    return { ...base, image: { kind: "prices", title: `${mainB} price list`, lines, rotated }, extracted }
  }

  // PDF — cover, price list, floor plans, payment terms
  const auto = ctx.dataType === "Automatic"
  const specs = Array.from({ length: 8 }, (_, i) => unitSpec(prefixOf(mainA), 80 + i))
  const groups = [GROUP_ARCH[6], GROUP_ARCH[0], GROUP_ARCH[5], GROUP_ARCH[1]]
  const priceLines = auto
    ? specs.map((s) => `${s.code}  ${s.type}  ${s.beds}BR  ${s.bua} m²  ${fmtInt(s.price)}`)
    : groups.map((g, k) => `${g.type} ${g.beds ? `${g.beds}BR` : ""} · ${g.bua[0]}–${g.bua[1]} m² · from ${fmtM(g.price[0])}${k === 2 ? " · Premium finish" : ""}`)
  const pages: DocPage[] = [
    { n: 1, kind: "cover", title: `${mainA} — ${phase}`, lines: ["Sales kit", "September 2026"] },
    { n: 2, kind: "prices", title: "Price list", lines: priceLines },
    { n: 3, kind: "plans", title: "Floor plans", lines: ["Type A — 2BR 120 m²", "Type B — 3BR 165 m²", "Type P — Penthouse 190 m²"] },
    { n: 4, kind: "terms", title: "Payment terms", lines: ["10% down payment, 8 years quarterly", "5% down payment, 10 years monthly"] },
  ]
  const extracted = auto
    ? specs.map((s, k) => unitDocRow(id, k, `${mainA} ${phase}`, s, `PDF p.2 · row ${k + 1}`, 94, { page: 2, line: k }))
    : groups.map((g, k) => groupRow(id, k, `${mainA} ${phase}`, g, `PDF p.2 · row ${k + 1}`, 93, { page: 2, line: k }))
  return { ...base, pages, extracted }
}

export interface EntrySeed {
  files: SourceFile[]
  projects: ProjOption[]
  mains: { id: string; name: string }[]
}

/** Every project and phase the entry's rows can be assigned to. */
export function projectOptions(refs: { id: string }[]): ProjOption[] {
  const out: ProjOption[] = []
  const push = (o: ProjOption) => { if (!out.some((x) => x.id === o.id)) out.push(o) }
  for (const ref of refs) {
    const row = PROJECTS.find((p) => p.id === ref.id)
    if (!row) continue
    if (!row.isPhase) {
      push({ id: row.id, label: row.name, mainId: row.id, mainName: row.name, isPhase: false })
      PROJECTS.filter((ph) => ph.isPhase && ph.mainProject?.id === row.id).forEach((ph) =>
        push({ id: ph.id, label: `${row.name} › ${ph.name}`, mainId: row.id, mainName: row.name, isPhase: true }))
    } else if (row.mainProject) {
      push({ id: row.id, label: `${row.mainProject.name} › ${row.name}`, mainId: row.mainProject.id, mainName: row.mainProject.name, isPhase: true })
    }
  }
  return out
}

export function seedFor(files: IngestionEntry["files"], projectRefs: { id: string }[], dataType: DataType): EntrySeed {
  const projects = projectOptions(projectRefs)
  const mains = [...new Map(projects.map((p) => [p.mainId, { id: p.mainId, name: p.mainName }])).values()].slice(0, 2)
  const phases = projects.filter((p) => p.isPhase && p.mainId === mains[0]?.id).map((p) => p.label.split(" › ")[1])
  const ctx = { dataType, mains: mains.length ? mains : [{ id: "", name: "Project" }], phases, imageSeq: { n: 0 } }
  const built = files.map((f, i) => buildFile(f, i, ctx))
  // Resolve the "duplicate of first photo" pointer to real file ids
  const firstPhoto = built.find((f) => f.kind === "image")
  built.forEach((f) => { if (f.image?.duplicateOf && firstPhoto) f.image.duplicateOf = firstPhoto.id })
  return { files: built, projects, mains }
}

export const isSheetSource = (files: SourceFile[]) => files.length > 0 && files.every((f) => f.kind === "sheet")

/* ── Stage 1 · Initial setup — cleanup detectors (removals only) ────────── */

export type CleanupKind =
  | "not-units" | "title-rows" | "repeat-header" | "summary-row" | "empty-rows" | "empty-cols" | "merged"
  | "cover-page" | "plans-page" | "terms-page" | "dup-image" | "rotated" | "render" | "noise-lines"

export interface CleanupItem { id: string; label: string; fileId: string; tab?: string; rows?: number[]; cols?: number[]; page?: number; line?: number }
export interface CleanupGroup { kind: CleanupKind; title: string; detail: string; items: CleanupItem[]; tone: "error" | "warn" | "info"; learned?: boolean }

const HEADER_SYNONYMS: [FieldKey, string[]][] = [
  ["unitCode", ["unit code", "code", "unit no", "unit id", "unit number", "unit"]],
  ["project", ["project", "compound", "development"]],
  ["phase", ["phase", "release", "stage"]],
  ["building", ["building", "tower", "bldg", "block"]],
  ["model", ["model", "unit model", "layout"]],
  ["propertyType", ["property type", "type", "unit type", "category"]],
  ["bedrooms", ["bedrooms", "beds", "bedroom", "br", "rooms"]],
  ["bua", ["bua", "area", "built up area", "size", "net area"]],
  ["land", ["land", "land area", "plot"]],
  ["garden", ["garden", "terrace", "roof", "outdoor"]],
  ["floor", ["floor", "level"]],
  ["finishing", ["finishing", "finish", "finishing type"]],
  ["deliveryDate", ["delivery", "delivery date", "handover", "completion"]],
  ["price", ["price", "total price", "unit price", "total", "amount"]],
]
export const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim()
export const headerKey = normHeader

/** The global synonym list — today's default column mapping. */
export function suggestField(raw: string): { key: FieldKey | ""; conf: number } {
  const h = normHeader(raw)
  if (!h) return { key: "", conf: 0 }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn[0] === h) return { key, conf: 99 }
  }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn.includes(h)) return { key, conf: 93 }
  }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn.some((s) => s.length > 3 && (h.includes(s) || s.includes(h)))) return { key, conf: 76 }
  }
  return { key: "", conf: 0 }
}

const rowEmpty = (r: Cell[] | undefined) => !r || r.every(isBlank)

/** Header = first row with 3+ text labels and data underneath. */
export function findHeader(grid: Cell[][]): number {
  for (let r = 0; r < Math.min(grid.length, 12); r++) {
    const cells = grid[r].filter((c) => !isBlank(c))
    if (cells.length >= 3 && cells.every((c) => typeof c === "string" && !/^\d[\d,.\s]*$/.test(c)) && !rowEmpty(grid[r + 1])) return r
  }
  return 0
}
const isUnitsTab = (tab: RawTab) => {
  const h = findHeader(tab.grid)
  const hits = tab.grid[h].filter((c) => suggestField(txt(c)).key).length
  return hits >= 4
}

export function detectCleanups(files: SourceFile[]): CleanupGroup[] {
  const groups = new Map<CleanupKind, CleanupGroup>()
  const add = (kind: CleanupKind, title: string, detail: string, tone: CleanupGroup["tone"], item: CleanupItem, learned?: boolean) => {
    if (!groups.has(kind)) groups.set(kind, { kind, title, detail, items: [], tone, learned })
    groups.get(kind)!.items.push(item)
  }
  for (const f of files) {
    if (f.kind === "sheet") {
      for (const tab of f.tabs ?? []) {
        const key = `${f.id}:${tab.name}`
        if (!isUnitsTab(tab)) {
          add("not-units", "Tabs without units", "No unit columns — this developer's past entries always dropped these.", "info", { id: `ignore-tab:${key}`, label: `“${tab.name}” tab`, fileId: f.id, tab: tab.name }, true)
          continue
        }
        const h = findHeader(tab.grid)
        if (h > 0) add("title-rows", "Title rows above the header", "Rows above the detected header are dropped and the header is promoted to row 1.", "warn", { id: `title:${key}`, label: `${tab.name} · rows 1–${h}`, fileId: f.id, tab: tab.name, rows: Array.from({ length: h }, (_, i) => i + 1) })
        const headerSig = tab.grid[h].map(txt).join("|")
        tab.grid.forEach((row, r) => {
          if (r <= h) return
          if (row.map(txt).join("|") === headerSig) add("repeat-header", "Repeated header rows", "Page-break copies of the header inside the table.", "warn", { id: `repeat:${key}:${r + 1}`, label: `${tab.name} · row ${r + 1}`, fileId: f.id, tab: tab.name, rows: [r + 1] })
          else if (/^total/i.test(txt(row.find((c) => !isBlank(c)) ?? null))) add("summary-row", "Summary rows", "Totals rows aren't units.", "warn", { id: `summary:${key}:${r + 1}`, label: `${tab.name} · row ${r + 1} “${txt(row.find((c) => !isBlank(c)) ?? null)}”`, fileId: f.id, tab: tab.name, rows: [r + 1] })
          else if (rowEmpty(row)) add("empty-rows", "Completely empty rows", "Blank rows inside the table.", "error", { id: `empty-row:${key}:${r + 1}`, label: `${tab.name} · row ${r + 1}`, fileId: f.id, tab: tab.name, rows: [r + 1] })
        })
        const width = Math.max(...tab.grid.map((r) => r.length))
        for (let c = 0; c < width; c++) {
          if (tab.grid.slice(h).every((row) => isBlank(row[c]))) add("empty-cols", "Completely empty columns", "Columns with no header and no values.", "error", { id: `empty-col:${key}:${c}`, label: `${tab.name} · column ${colLetter(c)}`, fileId: f.id, tab: tab.name, cols: [c] })
        }
        for (const m of tab.merges) {
          add("merged", "Merged cells", "Merged blocks are unmerged and their value filled down to every row.", "warn", { id: `merged:${key}:${m.col}:${m.from}`, label: `${tab.name} · ${txt(tab.grid[0][m.col]) || colLetter(m.col)} rows ${m.from + 1}–${m.to + 1}`, fileId: f.id, tab: tab.name, cols: [m.col], rows: Array.from({ length: m.to - m.from + 1 }, (_, i) => m.from + i + 1) })
        }
      }
    } else if (f.kind === "pdf") {
      for (const p of f.pages ?? []) {
        if (p.kind === "cover") add("cover-page", "Pages without units", "No numbers or table structure — covers and brochure pages are dropped.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} cover`, fileId: f.id, page: p.n }, true)
        if (p.kind === "plans") add("plans-page", "Floor plan pages", "Dropped from unit extraction — read later in Floor Plans.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} floor plans`, fileId: f.id, page: p.n }, true)
        if (p.kind === "terms") add("terms-page", "Payment terms pages", "Dropped from unit extraction — read later in Payment Plans.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} payment terms`, fileId: f.id, page: p.n }, true)
      }
    } else if (f.kind === "image") {
      if (f.image?.duplicateOf) add("dup-image", "Duplicate photos", "The same price list sent twice — the copy is dropped.", "error", { id: `remove-file:${f.id}`, label: `${f.name} = ${files.find((x) => x.id === f.image?.duplicateOf)?.name ?? "earlier photo"}`, fileId: f.id })
      if (f.image?.rotated) add("rotated", "Rotated photos", "Turned upright before extraction — lifts confidence.", "warn", { id: `rotate:${f.id}`, label: `${f.name} · 90°`, fileId: f.id })
      if (f.image?.kind === "render") add("render", "Renders, not price lists", "Dropped from extraction and added to the project's render pool for Media.", "info", { id: `render:${f.id}`, label: f.name, fileId: f.id }, true)
    } else if (f.kind === "text") {
      (f.lines ?? []).forEach((line, i) => {
        if (/good morning|book now|call |hello|thanks|🌞/i.test(line)) add("noise-lines", "Noise in the message", "Greetings, calls to action and contacts are removed so extraction reads fewer tokens.", "warn", { id: `noise:${f.id}:${i}`, label: `L${i + 1} “${line.slice(0, 34)}${line.length > 34 ? "…" : ""}”`, fileId: f.id, line: i })
      })
    }
  }
  const order: CleanupKind[] = ["not-units", "dup-image", "title-rows", "empty-rows", "empty-cols", "merged", "repeat-header", "summary-row", "rotated", "noise-lines", "cover-page", "plans-page", "terms-page", "render"]
  return order.filter((k) => groups.has(k)).map((k) => groups.get(k)!)
}

/** Detections safe to apply before the user looks — the developer's past choices. */
export const AUTO_CLEANUPS: CleanupKind[] = ["not-units", "cover-page", "plans-page", "terms-page", "render"]

export function colLetter(c: number) {
  let s = ""
  let n = c
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

/**
 * One tab before and after the applied removals — keys are original column
 * indexes so the grid can diff them. `headerRow` (1-based) overrides detection.
 */
export function tabTables(fileId: string, tab: RawTab, applied: Set<string>, headerRow?: number): { input: GridTable; output: GridTable; header: number } {
  const key = `${fileId}:${tab.name}`
  const detected = findHeader(tab.grid)
  const h = headerRow ? headerRow - 1 : detected
  const width = Math.max(...tab.grid.map((r) => r.length))
  const allCols = Array.from({ length: width }, (_, c) => c)
  const toRow = (r: number, cols: number[]): GridRow => ({ id: `r${r + 1}`, idx: r + 1, cells: Object.fromEntries(cols.map((c) => [String(c), tab.grid[r][c] ?? null])) })
  const labelCols = (cols: number[], hr: number | null): GridCol[] => cols.map((c) => ({ key: String(c), label: hr === null ? "" : txt(tab.grid[hr][c]) }))

  const input: GridTable = h === 0 && !headerRow
    ? { cols: labelCols(allCols, 0), rows: tab.grid.slice(1).map((_, i) => toRow(i + 1, allCols)), hasHeader: true, headerIdx: 1 }
    : { cols: labelCols(allCols, null), rows: tab.grid.map((_, r) => toRow(r, allCols)), hasHeader: false }

  const promoted = h === 0 || applied.has(`title:${key}`) || !!headerRow
  const dropped = new Set<number>()
  tab.grid.forEach((_, r) => {
    if (promoted && r <= h) dropped.add(r)
    if (applied.has(`repeat:${key}:${r + 1}`) || applied.has(`summary:${key}:${r + 1}`) || applied.has(`empty-row:${key}:${r + 1}`) || applied.has(`drop-row:${key}:${r + 1}`)) dropped.add(r)
  })
  const cols = allCols.filter((c) => !applied.has(`empty-col:${key}:${c}`) && !applied.has(`drop-col:${key}:${c}`))
  const filled = tab.grid.map((row) => [...row])
  for (const m of tab.merges) {
    if (!applied.has(`merged:${key}:${m.col}:${m.from}`)) continue
    const value = tab.grid[m.from][m.col]
    for (let r = m.from + 1; r <= m.to; r++) if (!dropped.has(r) && isBlank(filled[r][m.col])) filled[r][m.col] = value
  }
  const outRows = filled.map((_, r) => r).filter((r) => !dropped.has(r)).map((r) => ({ id: `r${r + 1}`, idx: r + 1, cells: Object.fromEntries(cols.map((c) => [String(c), filled[r][c] ?? null])) }))
  const output: GridTable = promoted
    ? { cols: labelCols(cols, h), rows: outRows, hasHeader: true, headerIdx: h + 1 }
    : { cols: labelCols(cols, null), rows: outRows, hasHeader: false }
  return { input, output, header: h + 1 }
}

/* ── Value normalizers — shared by Extraction (typed output) and Standardization ── */

const TYPE_SYN: [RegExp, string][] = [
  [/^(apt|apartment|flat)s?\b/i, "Apartment"], [/^studio/i, "Studio"], [/^duplex/i, "Duplex"], [/^(penthouse|ph)\b/i, "Penthouse"],
  [/^town\s*house|^th\b/i, "Townhouse"], [/^twin\s*house|^twin\b/i, "Twinhouse"], [/villa|stand\s*alone|standalone/i, "Villa"],
  [/chalet/i, "Chalet"], [/office/i, "Office"], [/retail|shop/i, "Retail"], [/clinic/i, "Clinic"],
]
const FIN_SYN: [RegExp, string][] = [
  [/^(fully?[\s-]*finished|ff|finished)$/i, "Fully Finished"], [/^(semi[\s-]*finished|semi|sf)$/i, "Semi Finished"],
  [/^(core\s*(&|and)\s*shell|cs|c&s|shell)$/i, "Core & Shell"], [/^furnished$/i, "Furnished"],
]
const READY = /ready|immediate|rtm|delivered/i
const SHORTHAND = /^\s*\d+(?:\.\d+)?\s*(m|mn|million|k)\s*$/i
const SPLIT = /^(.*?)\s*(\d)\s*(br|bed|bedroom)s?\b\s*$/i

/** What the AI would answer for a lookup value — limited to the field's IMS values. */
export function guessLookup(field: FieldKey, raw: string): { value: string; conf: number } | null {
  const s = raw.trim()
  if (field === "propertyType") {
    const hit = TYPE_SYN.find(([re]) => re.test(s))
    return hit ? { value: hit[1], conf: 94 } : null
  }
  if (field === "finishing") {
    const hit = FIN_SYN.find(([re]) => re.test(s))
    if (hit) return { value: hit[1], conf: 95 }
    if (/premium|lux|high/i.test(s)) return { value: "Fully Finished", conf: 72 }
    return null
  }
  if (field === "deliveryType") {
    if (/off|plan|construction/i.test(s)) return { value: "Off Plan", conf: 93 }
    if (READY.test(s)) return { value: "Ready to Move", conf: 93 }
  }
  return null
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const isoOf = (y: number, m: number, d?: number) => {
  const day = d ?? new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
export type DateFmt = "DMY" | "MDY"

/** Delivery text → ISO date. Month/quarter/year precision lands on the period's last day. */
export function parseDelivery(v: Cell | undefined, fmt: DateFmt): { iso: string | null; ambiguous?: boolean; ready?: boolean; ok: boolean } {
  const s = txt(v)
  if (!s) return { iso: null, ok: true }
  if (READY.test(s)) return { iso: null, ready: true, ok: true }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return { iso: s, ok: true }
  m = s.match(/^q([1-4])\s*[-/ ]?\s*(\d{4})$/i)
  if (m) return { iso: isoOf(+m[2], +m[1] * 3), ok: true }
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (m && MONTHS.includes(m[1].toLowerCase())) return { iso: isoOf(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]), ok: true }
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i)
  if (m && MONTHS.includes(m[1].toLowerCase())) return { iso: isoOf(+m[2], MONTHS.indexOf(m[1].toLowerCase()) + 1), ok: true }
  m = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (m && +m[1] >= 1 && +m[1] <= 12) return { iso: isoOf(+m[2], +m[1]), ok: true }
  m = s.match(/^(\d{4})$/)
  if (m) return { iso: isoOf(+m[1], 12), ok: true }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) {
    const a = +m[1]
    const b = +m[2]
    const ambiguous = a <= 12 && b <= 12 && a !== b
    const [d, mo] = fmt === "DMY" ? [a, b] : [b, a]
    if (mo < 1 || mo > 12) return { iso: null, ok: false }
    return { iso: isoOf(+m[3], mo, d), ambiguous, ok: true }
  }
  return { iso: null, ok: false }
}

/** Number formats — "4.8M", "4,800,000 EGP", "132 m²", "3BR", "G" (ground). */
export function parseNumberCell(field: FieldKey, v: Cell | undefined): { value: number | null; format?: string } {
  if (typeof v === "number") return { value: v }
  const raw = txt(v)
  if (!raw) return { value: null }
  if ((field === "price" || field === "priceTo") && SHORTHAND.test(raw)) return { value: Math.round(looseMoney(raw) ?? 0), format: "Price shorthand" }
  if (field === "floor" && /^(g|gf|ground)$/i.test(raw)) return { value: 0, format: "Ground floor" }
  const cleaned = raw.replace(/egp|le\b|l\.e\.?/gi, "").replace(/,/g, "").trim()
  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return { value: Number(cleaned), format: /egp|,/i.test(raw) ? "Separators & currency" : undefined }
  const unit = raw.match(/^(\d+(?:\.\d+)?)\s*(m²|m2|sqm|sq\.?\s*m|meters?|br|bed|beds|bedrooms?)$/i)
  if (unit) return { value: Number(unit[1]), format: /br|bed/i.test(unit[2]) ? "Bedroom suffix" : "Area units" }
  return { value: null }
}

/* ── Stage 2 · Extraction — the model returns IMS-typed values with confidence ── */

/** Types one extracted row the way the extraction prompt asks: IMS fields, IMS values. */
function typeExtracted(r: URow): URow {
  const v = { ...r.v }
  const conf = { ...r.conf }
  for (const f of ["bedrooms", "bua", "buaTo", "land", "garden", "floor", "price", "priceTo"] as FieldKey[]) {
    if (isBlank(v[f])) continue
    const p = parseNumberCell(f, v[f])
    if (p.value !== null) v[f] = p.value
    else conf[f] = Math.min(conf[f] ?? 60, 55)
  }
  if (!isBlank(v.propertyType)) {
    const g = guessLookup("propertyType", txt(v.propertyType))
    if (g) v.propertyType = g.value
    else conf.propertyType = Math.min(conf.propertyType ?? 60, 55)
  }
  if (!isBlank(v.finishing)) {
    const g = guessLookup("finishing", txt(v.finishing))
    if (g && g.conf >= 90) v.finishing = g.value
    else conf.finishing = Math.min(conf.finishing ?? 60, 58)
  }
  if (!isBlank(v.deliveryDate)) {
    const d = parseDelivery(v.deliveryDate, "DMY")
    if (d.ready) { v.deliveryType = "Ready to Move"; v.deliveryDate = null }
    else if (d.ok && d.iso) { v.deliveryDate = d.iso; if (isBlank(v.deliveryType)) v.deliveryType = "Off Plan" }
    else conf.deliveryDate = Math.min(conf.deliveryDate ?? 60, 55)
  }
  if (!isBlank(v.unitCode)) v.unitCode = txt(v.unitCode).toUpperCase()
  return { ...r, v, conf }
}

/**
 * Rows the extraction model reads from every kept page, photo and message.
 * `reread` holds files or pages re-read with the high-accuracy model.
 */
export function extractRows(files: SourceFile[], applied: Set<string>, reread: Set<string>): URow[] {
  const out: URow[] = []
  for (const f of files) {
    if (applied.has(`remove-file:${f.id}`) || applied.has(`render:${f.id}`) || !f.extracted) continue
    for (const r of f.extracted) {
      if (r.page && applied.has(`exclude-page:${f.id}:${r.page}`)) continue
      let conf = r.conf
      // Upright photos read better — rotation lifts every field's confidence
      if (f.image?.rotated && applied.has(`rotate:${f.id}`)) conf = Object.fromEntries(Object.entries(conf ?? {}).map(([k, c]) => [k, Math.min(99, (c ?? 0) + 18)]))
      if (reread.has(f.id) || (r.page && reread.has(`${f.id}:p${r.page}`))) conf = Object.fromEntries(Object.entries(conf ?? {}).map(([k, c]) => [k, Math.max(c ?? 0, 93)]))
      out.push(typeExtracted({ ...r, conf }))
    }
  }
  return out.map((r, i) => ({ ...r, idx: i + 1 }))
}

/* ── Stage 3 · Mapping — every tab of every sheet stacked, each header mapped once ── */

export interface HeaderInfo { raw: string; key: string; samples: string[]; tabs: string[]; suggested: FieldKey | ""; conf: number }
export interface LiveTab { fileId: string; fileName: string; tab: string; table: GridTable }

export function headerCatalog(tables: LiveTab[]): HeaderInfo[] {
  const map = new Map<string, HeaderInfo>()
  for (const { tab, table } of tables) {
    if (!table.hasHeader) continue
    for (const c of table.cols) {
      const raw = c.label.trim()
      if (!raw) continue
      const k = normHeader(raw)
      if (!map.has(k)) {
        const s = suggestField(raw)
        map.set(k, { raw, key: k, samples: [], tabs: [], suggested: s.key, conf: s.conf })
      }
      const info = map.get(k)!
      if (!info.tabs.includes(tab)) info.tabs.push(tab)
      for (const r of table.rows) {
        const v = txt(r.cells[c.key])
        if (v && info.samples.length < 3 && !info.samples.includes(v)) info.samples.push(v)
      }
    }
  }
  return [...map.values()]
}

/** All tabs as one table — source file and tab kept as columns, columns unioned by header. */
export function stackTabs(tables: LiveTab[]): GridTable {
  const union: GridCol[] = [{ key: "_file", label: "Source file", readOnly: true }, { key: "_tab", label: "Tab", readOnly: true }]
  const seen = new Set<string>()
  for (const t of tables) {
    if (!t.table.hasHeader) continue
    for (const c of t.table.cols) {
      const k = normHeader(c.label)
      if (!k || seen.has(k)) continue
      seen.add(k)
      union.push({ key: `h:${k}`, label: c.label.trim() })
    }
  }
  const rows: GridRow[] = []
  for (const t of tables) {
    if (!t.table.hasHeader) continue
    const byKey = new Map(t.table.cols.map((c) => [normHeader(c.label), c.key]))
    for (const r of t.table.rows) {
      const cells: Record<string, Cell> = { _file: t.fileName, _tab: t.tab }
      for (const col of union.slice(2)) {
        const src = byKey.get(col.key.slice(2))
        cells[col.key] = src !== undefined ? r.cells[src] ?? null : null
      }
      rows.push({ id: `${t.fileId}:${t.tab}:${r.id}`, idx: rows.length + 1, cells })
    }
  }
  return { cols: union, rows, hasHeader: true }
}

/** Stacked rows → IMS rows. Same-meaning headers merge (first non-blank wins); custom fields ride along. */
export function mapStacked(stacked: GridTable, headerMap: Record<string, string>): URow[] {
  return stacked.rows.map((r, i) => {
    const v: URow["v"] = {}
    const custom: Record<string, Cell> = {}
    for (const col of stacked.cols) {
      if (!col.key.startsWith("h:")) continue
      const target = headerMap[col.key.slice(2)]
      const cell = r.cells[col.key] ?? null
      if (!target) continue
      if (target.startsWith("custom:")) { if (!isBlank(cell)) custom[target.slice(7)] = cell; continue }
      const f = target as FieldKey
      if (isBlank(v[f]) && !isBlank(cell)) v[f] = cell
    }
    const [fileId, tab, rid] = r.id.split(":")
    if (isBlank(v.project)) v.project = tab
    return { id: r.id, idx: i + 1, src: `${tab}!R${rid.slice(1)}`, v, fileId, tab, ...(Object.keys(custom).length ? { custom } : {}) }
  })
}

/* ── IMS today — units and offerings the entry's projects already hold ──── */

export interface DbUnit {
  id: string
  projectId: string
  label: string
  code?: string
  v: Partial<Record<FieldKey, Cell>>
  status: "Available" | "Sold" | "Hold" | "Archived"
  /** Floor plan linked in IMS */
  fpId?: string
  lastSeen: string
}

/** Floor plan ids per model — shared by IMS links and the floor plan library. */
export const planIdFor = (mainId: string, model: string) => `FPL-${7000 + (hashStr(`${mainId}|${model}`) % 900)}`

export function dbFor(seed: EntrySeed, dataType: DataType): DbUnit[] {
  const out: DbUnit[] = []
  const main = seed.projects.find((p) => !p.isPhase) ?? seed.projects[0]
  if (!main) return out
  const seen = (k: number) => `2026-0${7 + (k % 2)}-${String(10 + (k % 18)).padStart(2, "0")}`
  if (dataType === "Automatic") {
    const add = (s: UnitSpec, projectId: string, mainId: string, bump: number, status: DbUnit["status"]) => {
      const h = hashStr(s.code)
      const id = `U-${10000 + (h % 89999)}`
      out.push({
        id, projectId, code: s.code, label: s.code, status, lastSeen: seen(h),
        // Most units keep their IMS floor plan; a few point at an older revision — a conflict to show
        fpId: h % 5 === 0 ? undefined : h % 17 === 3 ? planIdFor(mainId, `${s.model}-OLD`) : planIdFor(mainId, s.model),
        v: {
          unitCode: s.code, building: s.building, model: s.model, propertyType: s.type, bedrooms: s.beds, bua: s.bua,
          land: s.land, garden: s.garden, floor: s.floor, finishing: s.finishing,
          deliveryType: s.ready ? "Ready to Move" : "Off Plan", deliveryDate: s.delivery || null,
          price: s.price + bump,
        },
      })
    }
    const sources: { name: string; towers: boolean; n: number; start: number }[] = []
    seed.mains.forEach((m, k) => sources.push({ name: m.name, towers: k === 1, n: k === 1 ? 30 : 44, start: 0 }))
    if (seed.mains.length === 1) sources.push({ name: `${seed.mains[0].name} Towers`, towers: true, n: 30, start: 0 })
    // Units the sales kit lists — only when the entry carries it, so a sheet-only entry isn't compared against a brochure
    if (seed.files.some((f) => f.kind === "pdf")) sources.push({ name: seed.mains[0]?.name ?? "Project", towers: false, n: 8, start: 80 })
    for (const s of sources) {
      const prefix = prefixOf(s.name)
      const proj = seed.projects.find((p) => p.label === s.name || p.mainName === s.name) ?? main
      for (let i = s.start; i < s.start + s.n; i++) {
        const u = unitSpec(prefix, i, s.towers)
        const h = hashStr(u.code)
        if (h % 4 === 0) continue // not in IMS yet → New
        // One code lives under a project outside this entry — a code conflict
        if (!s.towers && i === 40) { add(u, "PRJ-OTHER", "PRJ-OTHER", 0, "Available"); continue }
        add(u, proj.id, proj.mainId, h % 5 === 1 ? -roundTo(u.price * 0.04, 10_000) : 0, h % 13 === 5 ? "Sold" : "Available")
      }
      // Units IMS still lists but this entry no longer carries — Final check decides them
      for (let i = s.start + s.n; i < s.start + s.n + 3; i++) add(unitSpec(prefix, i, s.towers), proj.id, proj.mainId, 0, "Available")
    }
    return out
  }
  // Offerings — current listing cards per project, close to (but not exactly) what brokers describe
  seed.mains.forEach((m, mi) => {
    const ph = seed.projects.find((p) => p.isPhase && p.mainId === m.id)
    GROUP_ARCH.forEach((g, i) => {
      if (i === 2 || i === 7) return // genuinely new offerings
      const drift = (i + mi) % 2 === 0 ? 5 : -8
      out.push({
        id: `GP-${4100 + mi * 97 + i * 7}`,
        projectId: i % 3 === 0 && ph ? ph.id : m.id,
        label: `${g.beds ? `${g.beds}BR ` : ""}${g.type} ${g.bua[0] + drift}–${g.bua[1] + drift} m²`,
        status: i === 6 ? "Archived" : "Available",
        lastSeen: seen(i + mi),
        fpId: planIdFor(m.id, `${g.type}-${g.beds}`),
        v: {
          propertyType: g.type, bedrooms: g.beds || null, bua: g.bua[0] + drift, buaTo: g.bua[1] + drift,
          price: roundTo(g.price[0] * (1 - drift / 200), 10_000), priceTo: roundTo(g.price[1] * (1 - drift / 200), 10_000),
          finishing: "Semi Finished", deliveryType: "Off Plan", deliveryDate: "2027-12-31",
        },
      })
    })
  })
  return out
}

/* ── Stage 4 · Project assignment — name match → saved rules → known codes → AI ── */

export interface ProjectRule { id: string; filters: RowFilter[]; projectId: string; origin: "saved" | "new" | "ai"; conf?: number; note?: string }

export const projectKeyOf = (r: URow) => [txt(r.v.project), txt(r.v.phase)].filter(Boolean).join(" · ") || "(blank)"

function bestProject(key: string, options: ProjOption[]): { id: string; conf: number } {
  let best = { id: "", conf: 0 }
  const phaseNo = key.match(/phase\s*(\d+)/i)?.[1]
  for (const o of options) {
    let c = similarity(key.replace(/[—·-]/g, " "), o.label.replace("›", " "))
    // A phase number in the text must agree with the option's phase
    const oPhase = o.label.match(/phase\s*(\d+)/i)?.[1]
    if (phaseNo && oPhase && phaseNo !== oPhase) c = Math.min(c, 40)
    if (phaseNo && !o.isPhase) c -= 10
    if (!phaseNo && o.isPhase) c -= 15
    if (c > best.conf) best = { id: o.id, conf: Math.max(0, Math.min(99, c)) }
  }
  return best
}

export interface AssignCtx {
  single: string | null
  aliases: Record<string, string>
  rules: ProjectRule[]
  /** normalized code → project id, for IMS units inside the entry's projects */
  codes: Map<string, string>
  manual: Record<string, string>
}

export function assignProjects(rows: URow[], options: ProjOption[], ctx: AssignCtx): URow[] {
  const byId = new Map(options.map((o) => [o.id, o]))
  const put = (r: URow, id: string, how: AssignHow): URow => {
    const opt = byId.get(id)
    if (!opt) return { ...r, projectId: undefined, how: undefined }
    const v = { ...r.v, project: opt.label }
    delete v.phase
    return { ...r, projectId: opt.id, how, v }
  }
  return rows.map((r) => {
    if (ctx.manual[r.id]) return put(r, ctx.manual[r.id], "Manual")
    if (ctx.single) return put(r, ctx.single, "Single project")
    const alias = ctx.aliases[txt(r.v.project).toLowerCase()]
    if (alias && byId.has(alias)) return put(r, alias, "Name match")
    const key = projectKeyOf(r)
    const b = key === "(blank)" ? { id: "", conf: 0 } : bestProject(key, options)
    if (b.id && b.conf >= 90) return put(r, b.id, "Name match")
    const rule = ctx.rules.find((x) => matchesFilters(r, x.filters) && byId.has(x.projectId))
    if (rule) return put(r, rule.projectId, "Rule")
    const code = ctx.codes.get(normCode(r.v.unitCode))
    if (code && byId.has(code)) return put(r, code, "Known code")
    return { ...r, projectId: undefined, how: undefined }
  })
}

/** AI — rows still unassigned get filter rules proposed (never per-row answers). */
export function suggestProjectRules(rows: URow[], options: ProjOption[]): ProjectRule[] {
  const left = rows.filter((r) => !r.projectId)
  if (!left.length || !options.length) return []
  const groups = new Map<string, URow[]>()
  for (const r of left) {
    const b = txt(r.v.building)
    const k = /tower/i.test(b) ? "b:tower" : b ? `b:${b.replace(/\d+/g, "").trim().toLowerCase()}` : `p:${txt(r.v.project).toLowerCase()}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  return [...groups.entries()].map(([k, rs]) => {
    const sample = txt(rs[0].v.project)
    const b = bestProject(sample, options)
    const target = b.id || options.find((o) => !o.isPhase)?.id || options[0].id
    const filters: RowFilter[] = k === "b:tower" ? [{ field: "building", op: "contains", value: "Tower" }]
      : k.startsWith("b:") ? [{ field: "building", op: "contains", value: k.slice(2) || txt(rs[0].v.building) }]
      : [{ field: "project", op: "is", value: sample }]
    return { id: `ai-${hashStr(k) % 100000}`, filters, projectId: target, origin: "ai" as const, conf: Math.max(70, Math.min(96, b.conf + 12)), note: `${rs.length} rows · learned from the codes and names in this layout` }
  })
}

/** Units with codes — matched to IMS right away (code + project family), so Transformation can fill from them. */
export function identify(rows: URow[], db: DbUnit[], options: ProjOption[]): URow[] {
  const byId = new Map(options.map((o) => [o.id, o]))
  const family = (id?: string) => { const o = id ? byId.get(id) : undefined; return o ? options.filter((x) => x.mainId === o.mainId).map((x) => x.id) : [] }
  const byCode = new Map<string, DbUnit[]>()
  db.forEach((d) => { const c = normCode(d.code); if (c) byCode.set(c, [...(byCode.get(c) ?? []), d]) })
  const outside = PROJECTS.find((p) => !p.isPhase && !byId.has(p.id))?.name ?? "another project"
  return rows.map((r) => {
    const hits = byCode.get(normCode(r.v.unitCode)) ?? []
    if (!hits.length) return { ...r, dbId: undefined, conflict: undefined }
    const fam = family(r.projectId)
    const inside = hits.find((d) => fam.includes(d.projectId))
    if (inside) return { ...r, dbId: inside.id, conflict: undefined }
    const other = hits.find((d) => !byId.has(d.projectId))
    return { ...r, dbId: undefined, conflict: other ? outside : undefined }
  })
}

/* ── Stage 5 · Transformation — saved, reusable actions (the only way sheet data changes) ── */

export type ActionKind = "merge" | "split" | "replace" | "formula" | "fill" | "lookup" | "dedupe"
export type FormulaPreset = "per-sqm" | "multiply" | "delivery-type"
export type SplitPreset = "type-beds" | "range" | "separator"
export type LookupSource = "unit" | "project" | "previous"
export interface ActionScope { developer: string; project?: string; phase?: string; saleType?: SaleType | ""; entryType?: DataType }

export interface Action {
  id: string
  kind: ActionKind
  title: string
  detail: string
  field?: FieldKey
  from?: FieldKey[]
  sep?: string
  find?: string
  replace?: string
  value?: string
  formula?: FormulaPreset
  factor?: number
  split?: SplitPreset
  lookup?: LookupSource
  fields?: FieldKey[]
  keep?: "latest" | "first"
  filters?: RowFilter[]
  scope: ActionScope
  origin: "saved" | "new" | "ai"
  /** Saved actions — how often they held up on past entries */
  health?: { applied: number; overridden: number }
  lastUsed?: string
}

export const ACTION_KINDS: { kind: ActionKind; label: string; hint: string }[] = [
  { kind: "fill", label: "Fill with a value", hint: "Set a field where the filter matches (blanks by default)" },
  { kind: "lookup", label: "Lookup", hint: "Fill blanks from the matched IMS unit, the project or the previous entry" },
  { kind: "replace", label: "Replace", hint: "Find and replace text in a field" },
  { kind: "split", label: "Split", hint: "Split one field into two" },
  { kind: "merge", label: "Merge", hint: "Join fields into one" },
  { kind: "formula", label: "Formula", hint: "Compute a field — price per m² × BUA, multiply, delivery type" },
  { kind: "dedupe", label: "Duplicate unit codes", hint: "Keep one row per unit code" },
]

export interface ActionCtx {
  dbById: Map<string, DbUnit>
  projectData: (projectId?: string) => Partial<Record<FieldKey, Cell>>
}

function actionPatch(a: Action, r: URow, ctx: ActionCtx): Partial<URow["v"]> | null {
  const v = r.v
  switch (a.kind) {
    case "merge": {
      if (!a.field || !a.from?.length) return null
      const parts = a.from.map((f) => txt(v[f])).filter(Boolean)
      if (parts.length < a.from.length) return null
      const merged = parts.join(a.sep ?? "-")
      return txt(v[a.field]) === merged ? null : { [a.field]: merged }
    }
    case "split": {
      if (a.split === "type-beds") {
        const m = txt(v.propertyType).match(SPLIT)
        if (!m) return null
        return { propertyType: m[1].trim(), ...(isBlank(v.bedrooms) ? { bedrooms: m[2] } : {}) }
      }
      if (a.split === "range") {
        const f = a.field ?? "bua"
        const to: FieldKey = f === "price" ? "priceTo" : "buaTo"
        const m = txt(v[f]).match(/^\s*([\d.,]+\s*[mk]?)\s*[-–]\s*([\d.,]+\s*[mk]?)/i)
        return m ? { [f]: m[1].trim(), [to]: m[2].trim() } : null
      }
      if (a.split === "separator" && a.from?.[0] && a.field && a.sep) {
        const src = txt(v[a.from[0]])
        const i = src.indexOf(a.sep)
        if (i < 0) return null
        return { [a.field]: src.slice(0, i).trim(), [a.from[0]]: src.slice(i + a.sep.length).trim() }
      }
      return null
    }
    case "replace": {
      if (!a.field || !a.find) return null
      const cur = txt(v[a.field])
      if (!cur.toLowerCase().includes(a.find.toLowerCase())) return null
      return { [a.field]: cur.replace(new RegExp(a.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), a.replace ?? "").trim() }
    }
    case "formula": {
      if (a.formula === "per-sqm") {
        const p = looseMoney(v.price)
        const area = firstNum(v.bua)
        if (p && area && p > 0 && p < 150_000 && !SHORTHAND.test(txt(v.price))) return { price: roundTo(p * area, 1000) }
        return null
      }
      if (a.formula === "multiply" && a.field && a.factor) {
        const n = a.field === "price" || a.field === "priceTo" ? looseMoney(v[a.field]) : firstNum(v[a.field])
        return n === null ? null : { [a.field]: Math.round(n * a.factor) }
      }
      if (a.formula === "delivery-type") {
        if (!isBlank(v.deliveryType)) return null
        if (READY.test(txt(v.deliveryDate))) return { deliveryType: "Ready to Move", deliveryDate: null }
        if (!isBlank(v.deliveryDate)) return { deliveryType: "Off Plan" }
        return null
      }
      return null
    }
    case "fill": {
      if (!a.field || a.value === undefined) return null
      if (!a.filters?.length && !isBlank(v[a.field])) return null
      return txt(v[a.field]) === a.value ? null : { [a.field]: a.value }
    }
    case "lookup": {
      const src = a.lookup === "project" ? ctx.projectData(r.projectId) : r.dbId ? ctx.dbById.get(r.dbId)?.v : undefined
      if (!src) return null
      const patch: Partial<URow["v"]> = {}
      for (const f of a.fields ?? []) {
        const target = src[f]
        const cur = v[f]
        const empty = isBlank(cur) || ((f === "price" || f === "priceTo") && (looseMoney(cur) ?? 0) <= 0)
        if (empty && !isBlank(target)) patch[f] = target ?? null
      }
      return Object.keys(patch).length ? patch : null
    }
    case "dedupe":
      return null
  }
}

/** Runs actions in order. Hits are the rows each action changed (or removed, for duplicates). */
export function applyActions(rows: URow[], actions: Action[], ctx: ActionCtx): { rows: URow[]; hits: Record<string, string[]> } {
  const hits: Record<string, string[]> = {}
  let cur = rows
  for (const a of actions) {
    hits[a.id] = []
    if (a.kind === "dedupe") {
      const keep = new Map<string, string>()
      const order = a.keep === "first" ? cur : [...cur].reverse()
      order.forEach((r) => { const c = normCode(r.v.unitCode); if (c && !keep.has(c)) keep.set(c, r.id) })
      cur = cur.filter((r) => {
        const c = normCode(r.v.unitCode)
        const ok = !c || keep.get(c) === r.id
        if (!ok) hits[a.id].push(r.id)
        return ok
      })
      continue
    }
    cur = cur.map((r) => {
      if (a.filters?.length && !matchesFilters(r, a.filters)) return r
      const patch = actionPatch(a, r, ctx)
      if (!patch) return r
      hits[a.id].push(r.id)
      return { ...r, v: { ...r.v, ...patch } }
    })
  }
  return { rows: cur, hits }
}

/** Duplicate unit codes — groups of row ids sharing a normalized code. */
export function duplicateCodes(rows: URow[]): string[][] {
  const seen = new Map<string, string[]>()
  rows.forEach((r) => { const c = normCode(r.v.unitCode); if (c) seen.set(c, [...(seen.get(c) ?? []), r.id]) })
  return [...seen.values()].filter((ids) => ids.length > 1)
}

/** Blank required values after the replay — the mandatory-field panel. */
export function missingRequired(rows: URow[], dataType: DataType): { field: FieldKey; rowIds: string[]; blocking: boolean }[] {
  const req: { field: FieldKey; blocking: boolean; when?: (r: URow) => boolean }[] = [
    ...(dataType === "Automatic" ? [{ field: "unitCode" as FieldKey, blocking: true }] : []),
    { field: "propertyType", blocking: true },
    { field: "bua", blocking: true },
    { field: "price", blocking: true },
    { field: "deliveryType", blocking: false },
    { field: "deliveryDate", blocking: false, when: (r) => r.v.deliveryType !== "Ready to Move" },
    { field: "bedrooms", blocking: false, when: (r) => !NON_RESIDENTIAL.has(txt(r.v.propertyType)) },
  ]
  return req.map((q) => ({
    field: q.field,
    blocking: q.blocking,
    rowIds: rows.filter((r) => (!q.when || q.when(r)) && (isBlank(r.v[q.field]) || ((q.field === "price") && (looseMoney(r.v.price) ?? 0) <= 0))).map((r) => r.id),
  })).filter((x) => x.rowIds.length)
}

/* ── Stage 6 · Standardization — every value an IMS value ──────────────── */

export type ValueSource = "IMS value" | "Vocabulary" | "Format" | "Your choice" | "AI · to confirm"
export interface KnownValue { field: FieldKey; raw: string; to: Cell; source: ValueSource; rows: number }
export interface ValueIssue { field: FieldKey; raw: string; rowIds: string[]; suggestion?: { value: string; conf: number }; note?: string }

export function standardizeRows(rows: URow[], fields: FieldDef[], s: { vocab: Record<string, string>; choices: Record<string, string>; aiChoices: Set<string>; dateFormat: DateFmt }): {
  rows: URow[]; known: KnownValue[]; unknown: ValueIssue[]; ambiguous: number; invalid: Map<string, string>
} {
  const known = new Map<string, KnownValue>()
  const unknown = new Map<string, ValueIssue>()
  const invalid = new Map<string, string>()
  let ambiguous = 0
  const hit = (field: FieldKey, raw: string, to: Cell, source: ValueSource) => {
    const k = `${field}|${raw}|${source}`
    const cur = known.get(k)
    if (cur) cur.rows++
    else known.set(k, { field, raw, to, source, rows: 1 })
  }
  const miss = (r: URow, field: FieldKey, raw: string, suggestion?: { value: string; conf: number }, note?: string) => {
    const k = `${field}|${raw}`
    const cur = unknown.get(k)
    if (cur) cur.rowIds.push(r.id)
    else unknown.set(k, { field, raw, rowIds: [r.id], suggestion, note })
    invalid.set(`${r.id}|${field}`, note ?? `“${raw}” isn't an IMS value yet`)
  }
  const out = rows.map((r) => {
    const v = { ...r.v }
    for (const f of fields) {
      const cur = r.v[f.key]
      if (isBlank(cur) || f.key === "project") continue
      const raw = txt(cur)
      const choice = s.choices[`${f.key}:${raw}`]
      if (f.type === "select") {
        const opts = f.options ?? []
        const exact = opts.find((o) => o.toLowerCase() === raw.toLowerCase())
        if (exact) { v[f.key] = exact; if (exact !== raw) hit(f.key, raw, exact, "Format"); continue }
        if (choice) { v[f.key] = choice; hit(f.key, raw, choice, s.aiChoices.has(`${f.key}:${raw}`) ? "AI · to confirm" : "Your choice"); continue }
        const voc = s.vocab[`${f.key}:${raw.toLowerCase()}`]
        if (voc) { v[f.key] = voc; hit(f.key, raw, voc, "Vocabulary"); continue }
        miss(r, f.key, raw, guessLookup(f.key, raw) ?? undefined)
        continue
      }
      if (f.type === "number" || f.type === "money") {
        if (typeof cur === "number") continue
        if (choice && !Number.isNaN(Number(choice))) { v[f.key] = Number(choice); hit(f.key, raw, Number(choice), "Your choice"); continue }
        const p = parseNumberCell(f.key, cur)
        if (p.value !== null) { v[f.key] = p.value; hit(f.key, raw, p.value, "Format"); continue }
        miss(r, f.key, raw, undefined, `“${raw}” isn't a number`)
        continue
      }
      if (f.type === "date") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue
        if (choice) { v[f.key] = choice; hit(f.key, raw, choice, "Your choice"); continue }
        const p = parseDelivery(cur, s.dateFormat)
        if (p.ready) { miss(r, f.key, raw, undefined, "“Ready” is a delivery type — the Delivery Type action in Transformation handles it"); continue }
        if (p.ok && p.iso) { if (p.ambiguous) ambiguous++; v[f.key] = p.iso; hit(f.key, raw, p.iso, "Format"); continue }
        miss(r, f.key, raw, undefined, `“${raw}” isn't a date`)
        continue
      }
      if (f.key === "unitCode") {
        const norm = raw.toUpperCase().replace(/\s+/g, "-")
        if (norm !== cur) { v.unitCode = norm; hit("unitCode", raw, norm, "Format") }
        continue
      }
      if (raw !== cur) v[f.key] = raw
    }
    return { ...r, v }
  })
  return { rows: out, known: [...known.values()], unknown: [...unknown.values()], ambiguous, invalid }
}

/* ── Stage 7 · Matching — each row's twin in IMS ───────────────────────── */

const COMPARE: FieldKey[] = ["building", "model", "propertyType", "bedrooms", "bua", "buaTo", "land", "garden", "floor", "finishing", "deliveryType", "deliveryDate", "price", "priceTo"]
const differs = (a: Cell | undefined, b: Cell | undefined) => !(isBlank(a) && isBlank(b)) && txt(a) !== txt(b)
export const changedFields = (r: URow, d: DbUnit) => COMPARE.filter((f) => f in r.v && differs(r.v[f], d.v[f]))

function offeringScore(r: URow, d: DbUnit): number {
  const type = txt(r.v.propertyType).toLowerCase().startsWith(txt(d.v.propertyType).toLowerCase().slice(0, 4)) ? 30 : 0
  const beds = (firstNum(r.v.bedrooms) ?? 0) === (firstNum(d.v.bedrooms) ?? 0) ? 10 : 0
  const a1 = firstNum(r.v.bua) ?? 0
  const a2 = firstNum(r.v.buaTo) ?? a1
  const b1 = firstNum(d.v.bua) ?? 0
  const b2 = firstNum(d.v.buaTo) ?? b1
  const overlap = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
  const span = Math.max(a2, b2) - Math.min(a1, b1) || 1
  const area = Math.round((overlap / span) * 30)
  const p1 = looseMoney(r.v.price) ?? 0
  const p2 = looseMoney(d.v.price) ?? 0
  const price = p1 && p2 ? Math.round(Math.max(0, 1 - Math.abs(p1 - p2) / p2 / 0.25) * 20) : 0
  const fin = txt(r.v.finishing) && txt(r.v.finishing) === txt(d.v.finishing) ? 5 : 0
  const del = txt(r.v.deliveryType) && txt(r.v.deliveryType) === txt(d.v.deliveryType) ? 5 : 0
  return type + beds + area + price + fin + del
}

export function matchRows(rows: URow[], db: DbUnit[], dataType: DataType, options: ProjOption[], threshold: number, overrides: Record<string, string>): URow[] {
  const dbById = new Map(db.map((d) => [d.id, d]))
  const settle = (r: URow, d: DbUnit, conf: number, how: string, candidates?: RowMatch["candidates"]): URow => {
    const changed = changedFields(r, d)
    const status: MatchStatus = d.status === "Sold" || d.status === "Archived" ? "returned" : changed.length ? "modified" : "unmodified"
    return { ...r, match: { status, dbId: d.id, conf, how, candidates, changed } }
  }
  if (dataType === "Automatic") {
    return rows.map((r) => {
      const o = overrides[r.id]
      if (o === "new") return { ...r, match: { status: "new", conf: 0, how: "Marked new" } }
      if (o && dbById.has(o)) return settle(r, dbById.get(o)!, 100, "Picked by you")
      const d = r.dbId ? dbById.get(r.dbId) : undefined
      if (!d) return { ...r, match: { status: "new", conf: 0, how: r.conflict ? "Code belongs to another project" : "No unit with this code" } }
      const exact = txt(r.v.unitCode) === d.code
      return settle(r, d, exact ? 100 : 97, exact ? "Unit code" : "Unit code · normalized")
    })
  }
  const byId = new Map(options.map((o) => [o.id, o]))
  return rows.map((r) => {
    const mainOf = (id?: string) => (id ? byId.get(id)?.mainId ?? PROJECTS.find((p) => p.id === id)?.mainProject?.id ?? id : undefined)
    const pool = db.filter((d) => !r.projectId || mainOf(d.projectId) === mainOf(r.projectId))
    // Widen the search when type or bedrooms are missing instead of calling the row new
    const candidates = pool.map((d) => ({ dbId: d.id, conf: offeringScore(r, d), label: d.label })).filter((c) => c.conf >= 30).sort((a, b) => b.conf - a.conf).slice(0, 3)
    const o = overrides[r.id]
    if (o === "new") return { ...r, match: { status: "new", conf: 0, how: "Marked new", candidates } }
    if (o && dbById.has(o)) return settle(r, dbById.get(o)!, candidates.find((c) => c.dbId === o)?.conf ?? 100, "Picked by you", candidates)
    const best = candidates[0]
    if (!best) return { ...r, match: { status: "new", conf: 0, how: "No similar offering", candidates } }
    if (best.conf >= threshold) return settle(r, dbById.get(best.dbId)!, best.conf, "Similarity", candidates)
    if (best.conf >= 50) return { ...r, match: { status: "review", dbId: best.dbId, conf: best.conf, how: "Below the threshold", candidates } }
    return { ...r, match: { status: "new", conf: best.conf, how: "Low similarity", candidates } }
  })
}

/** IMS records in the entry's projects no row matched — decided in Final check. */
export function missingUnits(rows: URow[], db: DbUnit[], options: ProjOption[]): DbUnit[] {
  const matched = new Set(rows.map((r) => r.match?.dbId).filter(Boolean))
  const ids = new Set(options.map((o) => o.id))
  return db.filter((d) => !matched.has(d.id) && ids.has(d.projectId) && d.status !== "Sold" && d.status !== "Archived")
}

/* ── Stage 8 · Payment plans — every price linked to exactly one plan ─── */

export interface PlanDraft {
  id: string
  name: string
  source: "Detected" | "Database" | "New" | "Per unit"
  dp: number
  years: number
  freq: "Monthly" | "Quarterly" | "Cash"
  discount?: number
  from: string
  mainId: string
  mainName: string
  /** Units the plan applies to — evaluated top to bottom, first match wins */
  conditions: RowFilter[]
  /** Linked by hand only, never by conditions */
  manualOnly?: boolean
}
export type PlanHow = "Condition" | "Manual" | "Inherited" | "Per unit"

export function linkPlans(rows: URow[], plans: PlanDraft[], manual: Record<string, string>, inherited: Map<string, string>, perUnit: boolean): Map<string, { planId: string; how: PlanHow }> {
  const out = new Map<string, { planId: string; how: PlanHow }>()
  const ids = new Set(plans.map((p) => p.id))
  for (const r of rows) {
    if (manual[r.id] && ids.has(manual[r.id])) { out.set(r.id, { planId: manual[r.id], how: "Manual" }); continue }
    if (perUnit) { out.set(r.id, { planId: `PU-${r.idx}`, how: "Per unit" }); continue }
    const inh = inherited.get(r.id)
    if (inh) { out.set(r.id, { planId: inh, how: "Inherited" }); continue }
    const p = plans.find((x) => !x.manualOnly && x.conditions.every((c) => matchesFilter(r, c)))
    if (p) out.set(r.id, { planId: p.id, how: "Condition" })
  }
  return out
}

/** Project price per m² range per type, from what IMS holds today. */
export function priceRanges(db: DbUnit[], options: ProjOption[]): Map<string, { min: number; max: number; median: number }> {
  const mainOf = (id: string) => options.find((o) => o.id === id)?.mainId ?? id
  const by = new Map<string, number[]>()
  for (const d of db) {
    const p = typeof d.v.price === "number" ? d.v.price : null
    const a = typeof d.v.bua === "number" ? d.v.bua : null
    if (!p || !a) continue
    const k = `${mainOf(d.projectId)}|${txt(d.v.propertyType)}`
    by.set(k, [...(by.get(k) ?? []), p / a])
  }
  const out = new Map<string, { min: number; max: number; median: number }>()
  by.forEach((vals, k) => { const s = [...vals].sort((a, b) => a - b); out.set(k, { min: s[0], max: s[s.length - 1], median: s[Math.floor(s.length / 2)] }) })
  return out
}

export interface PlanCheck { id: "several" | "range" | "no-plan" | "no-price"; title: string; detail: string; severity: "error" | "warning"; rowIds: string[] }

export function planChecks(rows: URow[], links: Map<string, { planId: string }>, ranges: Map<string, { min: number; max: number }>, options: ProjOption[], relaxed: boolean): PlanCheck[] {
  const mainOf = (id?: string) => options.find((o) => o.id === id)?.mainId ?? id ?? ""
  const price = (r: URow) => (typeof r.v.price === "number" ? r.v.price : looseMoney(r.v.price) ?? 0)
  const noPrice = rows.filter((r) => price(r) <= 0)
  const noPlan = rows.filter((r) => price(r) > 0 && !links.has(r.id))
  const byCodePlan = new Map<string, Set<number>>()
  rows.forEach((r) => { const l = links.get(r.id); const c = normCode(r.v.unitCode); if (l && c) { const k = `${c}|${l.planId}`; byCodePlan.set(k, new Set([...(byCodePlan.get(k) ?? []), price(r)])) } })
  const several = rows.filter((r) => { const l = links.get(r.id); const c = normCode(r.v.unitCode); return l && c ? (byCodePlan.get(`${c}|${l.planId}`)?.size ?? 0) > 1 : false })
  const out: { r: URow; far: boolean }[] = []
  rows.forEach((r) => {
    const rg = ranges.get(`${mainOf(r.projectId)}|${txt(r.v.propertyType)}`)
    const a = typeof r.v.bua === "number" ? r.v.bua : null
    if (!rg || !a || price(r) <= 0) return
    const pp = price(r) / a
    const lo = rg.min * 0.85
    const hi = rg.max * 1.15
    if (pp < lo || pp > hi) out.push({ r, far: pp < rg.min * 0.6 || pp > rg.max * 1.4 })
  })
  return [
    { id: "no-price", title: "Unit with no price", detail: "Every unit needs at least one price.", severity: "error", rowIds: noPrice.map((r) => r.id) },
    { id: "no-plan", title: "Price with no plan", detail: "Dropped at ingest unless it's linked to a plan — the unit would have no price.", severity: relaxed ? "warning" : "error", rowIds: noPlan.map((r) => r.id) },
    { id: "range", title: "Price outside the project's range", detail: "Price per m² outside what the project's units of this type sell for.", severity: relaxed || !out.some((x) => x.far) ? "warning" : "error", rowIds: out.map((x) => x.r.id) },
    { id: "several", title: "Several prices of one unit on one plan", detail: "One plan can carry one price per unit.", severity: "error", rowIds: several.map((r) => r.id) },
  ]
}

/* ── Stage 9 · Review — validation rules on data, fixed in the stage that owns them ── */

export type FixKind = "fill" | "lookup" | "dedupe" | "value" | "project" | "plan"
export interface Issue {
  id: string
  title: string
  detail: string
  scope: string
  severity: "error" | "warning"
  kind: "rule" | "anomaly"
  rowIds: string[]
  field?: FieldKey
  owner: StageRef
  fix?: { kind: FixKind; label: string; field?: FieldKey }
}

export function reviewIssues(rows: URow[], ctx: {
  dataType: DataType; saleType: SaleType | ""; developer: string; db: Map<string, DbUnit>; ranges: Map<string, { min: number; max: number; median: number }>
  options: ProjOption[]; invalid: Map<string, string>; planChecks: PlanCheck[]
}): Issue[] {
  const out: Issue[] = []
  const push = (i: Issue) => { if (i.rowIds.length) out.push(i) }
  const num = (v: Cell | undefined) => (typeof v === "number" ? v : null)
  const launch = ctx.saleType === "Launch"
  const mainOf = (id?: string) => ctx.options.find((o) => o.id === id)?.mainId ?? id ?? ""
  const anyMatched = rows.some((r) => r.dbId || r.match?.dbId)

  if (ctx.dataType === "Automatic") {
    push({ id: "VR-101", title: "Unit code on every unit", detail: "Units with codes need a code on every row.", scope: "All developers", severity: "error", kind: "rule", field: "unitCode", owner: "transform", rowIds: rows.filter((r) => isBlank(r.v.unitCode)).map((r) => r.id), fix: { kind: "fill", label: "Fill in Transformation", field: "unitCode" } })
    push({ id: "VR-102", title: "No duplicate unit codes", detail: "The same unit appears more than once.", scope: "All developers", severity: "error", kind: "rule", field: "unitCode", owner: "transform", rowIds: duplicateCodes(rows).flat(), fix: { kind: "dedupe", label: "Keep the latest row" } })
  }
  const noPrice = ctx.planChecks.find((c) => c.id === "no-price")?.rowIds ?? []
  push({ id: "VR-103", title: "Price on every unit", detail: "Units without a price can't be listed.", scope: "All developers", severity: "error", kind: "rule", field: "price", owner: "transform", rowIds: noPrice, fix: anyMatched ? { kind: "lookup", label: "Fill from the matched IMS unit", field: "price" } : { kind: "fill", label: "Fill in Transformation", field: "price" } })
  push({ id: "VR-104", title: "BUA on every unit", detail: "Built-up area is required.", scope: "All developers", severity: "error", kind: "rule", field: "bua", owner: "transform", rowIds: rows.filter((r) => num(r.v.bua) === null).map((r) => r.id), fix: anyMatched ? { kind: "lookup", label: "Fill from the matched IMS unit", field: "bua" } : { kind: "fill", label: "Fill in Transformation", field: "bua" } })
  const badValue = [...new Set([...ctx.invalid.keys()].map((k) => k.split("|")[0]))]
  push({ id: "VR-105", title: "Values from the IMS lists", detail: "Property type, finishing and delivery must be IMS values.", scope: "All developers", severity: "error", kind: "rule", owner: "standard", rowIds: badValue, fix: { kind: "value", label: "Choose the IMS values" } })
  push({ id: "VR-106", title: "Every row has a project", detail: "Assign the rows to one of the entry's projects.", scope: "All developers", severity: "error", kind: "rule", field: "project", owner: "projects", rowIds: rows.filter((r) => !r.projectId).map((r) => r.id), fix: { kind: "project", label: "Assign a project" } })
  const noPlan = ctx.planChecks.find((c) => c.id === "no-plan")
  if (noPlan) push({ id: "VR-107", title: "Prices link to a plan", detail: noPlan.detail, scope: "All developers", severity: noPlan.severity, kind: "rule", field: "price", owner: "plans", rowIds: noPlan.rowIds, fix: { kind: "plan", label: "Link a plan" } })

  // Warnings
  push({ id: "VR-201", title: "Off-plan delivery after today", detail: "Off-plan units should deliver in the future.", scope: "All developers", severity: "warning", kind: "rule", field: "deliveryDate", owner: "transform", rowIds: rows.filter((r) => r.v.deliveryType === "Off Plan" && txt(r.v.deliveryDate) && txt(r.v.deliveryDate) < TODAY).map((r) => r.id), fix: { kind: "fill", label: "Fill a delivery date", field: "deliveryDate" } })
  push({ id: "VR-202", title: "Bedrooms on residential units", detail: "Residential units usually list bedrooms.", scope: "All developers", severity: "warning", kind: "rule", field: "bedrooms", owner: "transform", rowIds: rows.filter((r) => !NON_RESIDENTIAL.has(txt(r.v.propertyType)) && isBlank(r.v.bedrooms)).map((r) => r.id), fix: anyMatched ? { kind: "lookup", label: "Fill from the matched IMS unit", field: "bedrooms" } : { kind: "fill", label: "Fill bedrooms", field: "bedrooms" } })
  push({ id: "VR-203", title: "Garden under twice the BUA", detail: `Developer rule for ${ctx.developer || "this developer"}.`, scope: ctx.developer || "Developer", severity: "warning", kind: "rule", field: "garden", owner: "transform", rowIds: rows.filter((r) => (num(r.v.garden) ?? 0) > 2 * (num(r.v.bua) ?? Infinity)).map((r) => r.id) })
  if (!launch) {
    push({
      id: "AN-301", title: "Price per m² vs project history", detail: "More than 30% away from what the project's units of this type sell for.", scope: "Project history", severity: "warning", kind: "anomaly", field: "price", owner: "transform",
      rowIds: rows.filter((r) => { const rg = ctx.ranges.get(`${mainOf(r.projectId)}|${txt(r.v.propertyType)}`); const p = num(r.v.price); const a = num(r.v.bua); return rg && p && a ? Math.abs(p / a - rg.median) / rg.median > 0.3 : false }).map((r) => r.id),
    })
  }
  push({
    id: "AN-302", title: "Price jump vs the last entry", detail: "Matched units whose price moved more than 25%.", scope: "Project history", severity: "warning", kind: "anomaly", field: "price", owner: "transform",
    rowIds: rows.filter((r) => { const id = r.match?.dbId ?? r.dbId; const d = id ? ctx.db.get(id) : undefined; const a = num(r.v.price); const b = num(d?.v.price); return a && b ? Math.abs(a - b) / b > 0.25 : false }).map((r) => r.id),
  })
  push({
    id: "AN-303", title: "Unusual area for the type", detail: "BUA far outside the project's usual range for this type.", scope: "Project history", severity: "warning", kind: "anomaly", field: "bua", owner: "transform",
    rowIds: rows.filter((r) => { const a = num(r.v.bua); const t = txt(r.v.propertyType); return a !== null && ((t === "Apartment" && (a < 60 || a > 260)) || (t === "Villa" && a < 180)) }).map((r) => r.id),
  })
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1))
}

/* ── Stage 10 · Floor plans — assigned per model group, not per unit ──── */

export interface LibPlan { id: string; model: string; type: string; beds: number; area: number; image: string; mainId: string; uploaded?: boolean }
export type FloorSource = "IMS link" | "Model rule" | "Metadata" | "Manual"
export interface ModelGroup {
  key: string
  label: string
  projectId: string
  mainId: string
  model: string
  type: string
  beds: number | null
  area: number | null
  rowIds: string[]
  planId?: string
  source?: FloorSource
  conflicts: { rowId: string; imsPlan: string }[]
}

export function modelGroups(rows: URow[], dataType: DataType, options: ProjOption[]): ModelGroup[] {
  const map = new Map<string, URow[]>()
  for (const r of rows) {
    const mainId = options.find((o) => o.id === r.projectId)?.mainId ?? r.projectId ?? "?"
    const model = dataType === "Automatic" ? txt(r.v.model) || `${txt(r.v.propertyType)}-${txt(r.v.bedrooms)}` : r.id
    const k = `${mainId}|${model}`
    map.set(k, [...(map.get(k) ?? []), r])
  }
  return [...map.entries()].map(([key, rs]) => {
    const r0 = rs[0]
    const areas = rs.map((r) => (typeof r.v.bua === "number" ? r.v.bua : null)).filter((x): x is number => x !== null)
    const beds = typeof r0.v.bedrooms === "number" ? r0.v.bedrooms : firstNum(r0.v.bedrooms)
    const [mainId, model] = key.split("|")
    return {
      key,
      label: dataType === "Automatic" ? model : `${beds ? `${beds}BR ` : ""}${txt(r0.v.propertyType)}`,
      projectId: r0.projectId ?? "",
      mainId,
      model: dataType === "Automatic" ? model : `${txt(r0.v.propertyType)}-${beds ?? 0}`,
      type: txt(r0.v.propertyType),
      beds,
      area: areas.length ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : null,
      rowIds: rs.map((r) => r.id),
      conflicts: [],
    }
  })
}

export function resolveFloorPlans(groups: ModelGroup[], ctx: { rows: Map<string, URow>; db: Map<string, DbUnit>; modelRules: Record<string, string>; library: LibPlan[]; picks: Record<string, string> }): ModelGroup[] {
  const lib = new Map(ctx.library.map((p) => [p.id, p]))
  return groups.map((g) => {
    const ims = g.rowIds.map((id) => { const r = ctx.rows.get(id); const d = r?.dbId ? ctx.db.get(r.dbId) : r?.match?.dbId ? ctx.db.get(r.match.dbId) : undefined; return { id, fp: d?.fpId } }).filter((x) => x.fp)
    const votes = new Map<string, number>()
    ims.forEach((x) => votes.set(x.fp!, (votes.get(x.fp!) ?? 0) + 1))
    const imsTop = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    let planId: string | undefined
    let source: FloorSource | undefined
    if (ctx.picks[g.key] && lib.has(ctx.picks[g.key])) { planId = ctx.picks[g.key]; source = "Manual" }
    else if (imsTop && lib.has(imsTop)) { planId = imsTop; source = "IMS link" }
    else if (ctx.modelRules[g.key] && lib.has(ctx.modelRules[g.key])) { planId = ctx.modelRules[g.key]; source = "Model rule" }
    else {
      const meta = ctx.library
        .filter((p) => p.type === g.type && p.beds === (g.beds ?? p.beds) && g.area !== null && Math.abs(p.area - g.area) / g.area <= 0.12)
        .sort((a, b) => Math.abs(a.area - (g.area ?? 0)) - Math.abs(b.area - (g.area ?? 0)))[0]
      if (meta) { planId = meta.id; source = "Metadata" }
    }
    const conflicts = planId ? ims.filter((x) => x.fp !== planId).map((x) => ({ rowId: x.id, imsPlan: x.fp! })) : []
    return { ...g, planId, source, conflicts }
  })
}

/* ── Stage 11 · Grouping — units into listing cards (units with codes, Primary / Launch) ── */

export type GroupField = "bedrooms" | "finishing" | "deliveryYear" | "building" | "floorPlan"
export const GROUP_FIELDS: { key: GroupField; label: string }[] = [
  { key: "bedrooms", label: "Bedrooms" },
  { key: "finishing", label: "Finishing" },
  { key: "floorPlan", label: "Floor plan" },
  { key: "deliveryYear", label: "Delivery year" },
  { key: "building", label: "Building" },
]
export interface GroupConfig { fields: GroupField[]; bucket: number }
export type CardStatus = "Same" | "New" | "Split" | "Merged" | "Changed"
export interface Card {
  key: string
  title: string
  projectId: string
  projectLabel: string
  type: string
  beds: number | null
  finishing: string
  buaMin: number
  buaMax: number
  priceMin: number
  priceMax: number
  deliveryType: string
  deliveryDate: string
  rowIds: string[]
  planId?: string
  status: CardStatus
  /** Current listings its units came from */
  from: string[]
  currentId?: string
}

const cardValue = (r: URow, f: GroupField, planOf: Map<string, string>) =>
  f === "deliveryYear" ? (r.v.deliveryType === "Ready to Move" ? "Ready" : txt(r.v.deliveryDate).slice(0, 4)) : f === "floorPlan" ? planOf.get(r.id) ?? "" : txt(r.v[f])

export function cardKeyOf(r: URow, cfg: GroupConfig, planOf: Map<string, string>) {
  const bua = typeof r.v.bua === "number" ? r.v.bua : 0
  const start = Math.floor(bua / cfg.bucket) * cfg.bucket
  return [r.projectId ?? "", txt(r.v.propertyType), ...cfg.fields.map((f) => cardValue(r, f, planOf)), start].join("|")
}

export function buildCards(rows: URow[], cfg: GroupConfig, planOf: Map<string, string>): Card[] {
  const map = new Map<string, URow[]>()
  rows.forEach((r) => { const k = cardKeyOf(r, cfg, planOf); map.set(k, [...(map.get(k) ?? []), r]) })
  return [...map.entries()].map(([key, rs]) => {
    const r0 = rs[0]
    const nums = (f: FieldKey) => rs.map((r) => r.v[f]).filter((x): x is number => typeof x === "number" && x > 0)
    const bua = nums("bua")
    const price = nums("price")
    // The card's bedrooms — the most common value, so one unit with a blank doesn't blank the title
    const bedVotes = new Map<number, number>()
    rs.forEach((r) => { const b = typeof r.v.bedrooms === "number" ? r.v.bedrooms : firstNum(r.v.bedrooms); if (b !== null) bedVotes.set(b, (bedVotes.get(b) ?? 0) + 1) })
    const beds = [...bedVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const type = txt(r0.v.propertyType) || "Unit"
    const start = Number(key.split("|").pop())
    return {
      key,
      title: `${beds ? `${beds}BR ` : ""}${type}${txt(r0.v.finishing) ? ` · ${r0.v.finishing}` : ""} · ${start}–${start + cfg.bucket} m²`,
      projectId: r0.projectId ?? "",
      projectLabel: txt(r0.v.project),
      type,
      beds,
      finishing: txt(r0.v.finishing),
      buaMin: bua.length ? Math.min(...bua) : 0,
      buaMax: bua.length ? Math.max(...bua) : 0,
      priceMin: price.length ? Math.min(...price) : 0,
      priceMax: price.length ? Math.max(...price) : 0,
      deliveryType: txt(r0.v.deliveryType),
      deliveryDate: txt(r0.v.deliveryDate),
      rowIds: rs.map((r) => r.id),
      planId: planOf.get(r0.id),
      status: "New",
      from: [],
    }
  })
}

/** The cards on the site today — built from IMS units with the project's saved config. */
export function currentCards(rows: URow[], db: Map<string, DbUnit>, saved: GroupConfig, planOf: Map<string, string>): Map<string, { id: string; rowIds: string[] }> {
  const imsRows = rows.filter((r) => r.dbId).map((r) => {
    const d = db.get(r.dbId!)!
    return { ...r, v: { ...r.v, ...d.v, project: r.v.project } }
  })
  const out = new Map<string, { id: string; rowIds: string[] }>()
  imsRows.forEach((r) => {
    const k = cardKeyOf(r, saved, planOf)
    const cur = out.get(k) ?? { id: `GP-${3000 + (hashStr(k) % 900)}`, rowIds: [] }
    cur.rowIds.push(r.id)
    out.set(k, cur)
  })
  return out
}

export function compareCards(cards: Card[], current: Map<string, { id: string; rowIds: string[] }>): Card[] {
  const cardOfRow = new Map<string, string>()
  current.forEach((c) => c.rowIds.forEach((id) => cardOfRow.set(id, c.id)))
  const spread = new Map<string, Set<string>>()
  cards.forEach((c) => c.rowIds.forEach((id) => { const cur = cardOfRow.get(id); if (cur) spread.set(cur, new Set([...(spread.get(cur) ?? []), c.key])) }))
  return cards.map((c) => {
    const from = [...new Set(c.rowIds.map((id) => cardOfRow.get(id)).filter((x): x is string => !!x))]
    const same = current.get(c.key)
    if (same) return { ...c, status: "Same" as const, from, currentId: same.id }
    if (!from.length) return { ...c, status: "New" as const, from }
    if (from.length > 1) return { ...c, status: "Merged" as const, from }
    return { ...c, status: (spread.get(from[0])?.size ?? 0) > 1 ? "Split" as const : "Changed" as const, from }
  })
}

/* ── Stage 12 · Media — a render pool per project, spread over the cards ── */

export type ImageKind = "Exterior render" | "Interior render" | "Masterplan" | "Floor plan" | "Amenity" | "Other"
export type Building = "Apartment" | "Villa" | "Townhouse" | "Clubhouse"
export interface PoolImage { id: string; url: string; caption: string; kind: ImageKind; building?: Building; source: "Brochure" | "Library" | "This entry" | "Owner"; mainId: string }
export interface CardMedia { images: string[]; source: "Inherited" | "Spread" | "Pinned" | "Chosen" | "Owner" | "None" }
export const buildingOf = (type: string): Building => (/villa/i.test(type) ? "Villa" : /town|twin/i.test(type) ? "Townhouse" : "Apartment")

export function assignMedia(cards: { key: string; type: string; mainId: string; inheritFrom?: string }[], pool: PoolImage[], opts: {
  perCard: number; pins: Record<string, string>; chosen: Record<string, string[]>; excluded: Set<string>; inherited: Record<string, string[]>
}): Record<string, CardMedia> {
  const usable = pool.filter((p) => !opts.excluded.has(p.id))
  const covers = usable.filter((p) => p.kind === "Exterior render" || p.kind === "Interior render")
  const gallery = usable.filter((p) => p.kind !== "Masterplan" && p.kind !== "Floor plan")
  const out: Record<string, CardMedia> = {}
  cards.forEach((c, i) => {
    if (opts.chosen[c.key]?.length) { out[c.key] = { images: opts.chosen[c.key].filter((id) => !opts.excluded.has(id)), source: "Chosen" }; return }
    const inh = c.inheritFrom ? opts.inherited[c.inheritFrom]?.filter((id) => !opts.excluded.has(id)) : undefined
    const mine = covers.filter((p) => p.mainId === c.mainId)
    const pref = mine.filter((p) => p.building === buildingOf(c.type))
    const coverPool = pref.length ? pref : mine.length ? mine : covers
    let images: string[]
    let source: CardMedia["source"]
    if (inh?.length) { images = inh; source = "Inherited" }
    else if (coverPool.length) {
      const cover = coverPool[i % coverPool.length]
      const rest = gallery.filter((p) => p.id !== cover.id && (p.mainId === c.mainId || !mine.length))
      images = [cover.id, ...Array.from({ length: Math.max(0, opts.perCard - 1) }, (_, k) => rest[(i + k * 2 + 1) % Math.max(1, rest.length)]?.id).filter((x): x is string => !!x)]
      images = [...new Set(images)]
      source = "Spread"
    } else { images = []; source = "None" }
    const pin = opts.pins[c.key]
    if (pin && !opts.excluded.has(pin)) { images = [pin, ...images.filter((x) => x !== pin)].slice(0, Math.max(opts.perCard, 1)); source = "Pinned" }
    out[c.key] = { images, source }
  })
  return out
}

/* ── Stage 13 · Final check — project state, missing units, change summary ── */

export type MissingDecision = "Sold" | "Available" | "Hold" | "Archive"
export interface ChangeSummary { fresh: number; modified: number; unmodified: number; returned: number; missing: number; priceChanges: number; avgPricePct: number; maxPricePct: number }

export function changeSummary(rows: URow[], missing: DbUnit[], db: Map<string, DbUnit>): ChangeSummary {
  const s = { fresh: 0, modified: 0, unmodified: 0, returned: 0 }
  const pcts: number[] = []
  for (const r of rows) {
    const st = r.match?.status ?? "new"
    if (st === "new" || st === "review") s.fresh++
    else if (st === "modified") s.modified++
    else if (st === "unmodified") s.unmodified++
    else s.returned++
    const d = r.match?.dbId ? db.get(r.match.dbId) : undefined
    const a = typeof r.v.price === "number" ? r.v.price : null
    const b = typeof d?.v.price === "number" ? d.v.price : null
    if (a && b && a !== b) pcts.push(Math.abs(a - b) / b * 100)
  }
  return { ...s, missing: missing.length, priceChanges: pcts.length, avgPricePct: pcts.length ? +(pcts.reduce((x, y) => x + y, 0) / pcts.length).toFixed(1) : 0, maxPricePct: pcts.length ? +Math.max(...pcts).toFixed(1) : 0 }
}

/* ── Upload guard — what the popup can tell from a file before an entry exists ── */

export interface FileDetection {
  kind: FileKind
  hasUnitCodes: boolean
  unitCodes: number
  developerName: string | null
  developerConf: number
  projectNames: string[]
  categories: PropertyCategory[]
  /** Price list / availability, or something else to file in the project library */
  availability: boolean
  docKind?: "Brochure" | "Floor plans" | "Payment plan"
  fingerprint: string
  how: "WhatsApp group" | "Name dictionary" | "AI" | "Not detected"
  summary: string
}

/** Rules first (WhatsApp group → name dictionary → headers), light AI only for docs the rules can't place. */
export function detectFile(name: string, kind: EntryFileKind, size: number, hint?: { developerName?: string; projects?: string[]; fromGroup?: boolean; text?: string }): FileDetection {
  const k = KIND_OF[kind]
  const lower = name.toLowerCase()
  const project = PROJECTS.find((p) => !p.isPhase && lower.includes(p.name.toLowerCase().replace(/\s+/g, "-"))) ??
    PROJECTS.find((p) => !p.isPhase && lower.includes(p.name.toLowerCase().split(" ")[0]))
  const developerName = hint?.developerName ?? project?.developer.name ?? null
  const docKind = /brochure|sales-kit/.test(lower) ? "Brochure" as const : /floor-?plans?/.test(lower) ? "Floor plans" as const : /payment-?plans?|terms/.test(lower) ? "Payment plan" as const : undefined
  const hasUnitCodes = !docKind && (k === "sheet" || /inventory|units|unit-codes|availability/.test(lower) || (!!hint?.text && CODE_RE.test(hint.text)))
  const textLines = hint?.text ? hint.text.split(/\r?\n/).filter((l) => l.trim()).length : 0
  const h = hashStr(name)
  const unitCodes = hasUnitCodes ? 60 + (h % 90) : 0
  const summary =
    docKind ? `${docKind.toLowerCase()} · not a price list` :
    k === "sheet" ? `3 tabs · ${unitCodes} unit codes` :
    k === "pdf" ? `4 pages · ${hasUnitCodes ? `${unitCodes} unit codes` : "ranges, no unit codes"}` :
    k === "image" ? `${1200 + (h % 2400)}×${900 + (h % 1600)} · price list` :
    `${textLines || 9 + (h % 5)} lines · ${hasUnitCodes ? "unit codes" : "ranges, no unit codes"}`
  return {
    kind: k,
    hasUnitCodes,
    unitCodes,
    developerName,
    developerConf: hint?.developerName ? 99 : project ? 88 + (h % 10) : 0,
    projectNames: hint?.projects?.length ? hint.projects : project ? [project.name] : [],
    categories: /commercial|retail|office|clinic/.test(lower) ? ["Commercial"] : ["Residential"],
    availability: !docKind,
    docKind,
    fingerprint: `${h.toString(16)}-${size}`,
    how: hint?.fromGroup ? "WhatsApp group" : project || hint?.projects?.length ? "Name dictionary" : developerName ? "AI" : "Not detected",
    summary,
  }
}

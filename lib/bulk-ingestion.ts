/* ────────────────────────────────────────────────────────────────────────────
   Properties Bulk Ingestion — one pipeline for every unit source.

   Sheets, PDFs, photos of price lists and WhatsApp text all become the same
   typed unit table. Each wizard step is a pure transform of the previous
   step's output, so an edit anywhere flows downstream on its own.
   Everything here is deterministic (no Date.now / Math.random) so the mock
   renders identically on server and client.
   ──────────────────────────────────────────────────────────────────────────── */

import { PROJECTS } from "@/lib/projects-mock"
import type { EntryDataType, EntryFileKind, IngestionEntry, PropertyCategory } from "@/lib/ingestion-mock"

/* ── Types ───────────────────────────────────────────────────────────────── */

export type Cell = string | number | null
export type FieldType = "text" | "number" | "money" | "select" | "date"
export type DataType = EntryDataType
export type FieldKey =
  | "unitCode" | "project" | "phase" | "building" | "model" | "propertyType" | "bedrooms"
  | "bua" | "buaTo" | "land" | "garden" | "floor" | "finishing" | "deliveryType" | "deliveryDate" | "price" | "priceTo"

export interface FieldDef { key: FieldKey; label: string; type: FieldType; options?: readonly string[]; required?: boolean }

/** Generic table the Sheet Preview grid renders — raw sheets and typed unit tables alike. */
export interface GridCol { key: string; label: string; type?: FieldType; options?: readonly string[]; readOnly?: boolean }
export interface GridRow { id: string; idx: number; cells: Record<string, Cell> }
export interface GridTable { cols: GridCol[]; rows: GridRow[]; hasHeader: boolean; headerIdx?: number }

/** A unit (Automatic) or grouped property (Manual) moving through the pipeline. */
export interface URow {
  id: string
  /** Stable row number shown in the grid gutter */
  idx: number
  /** Where the row came from — "Marassi!R14", "PDF p.2", "Photo 1", "Text L3" */
  src: string
  v: Partial<Record<FieldKey, Cell>>
  /** Assigned project or phase id (Mapping) */
  projectId?: string
  /** Extraction confidence per field, 0–100 */
  conf?: Partial<Record<FieldKey, number>>
  /** Database match (Comparison) */
  match?: RowMatch
  /** For doc rows — which page / line / file it came from (drives exclusions) */
  fileId?: string
  page?: number
  line?: number
}

export interface RowMatch {
  status: "new" | "matched" | "review"
  dbId?: string
  conf: number
  how: string
  candidates?: { dbId: string; conf: number; label: string }[]
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

/** Mapping targets for a sheet column — the entry's fields plus Phase (read for project assignment). */
export function mapTargets(dataType: DataType): { key: FieldKey; label: string }[] {
  const base = fieldsFor(dataType, []).filter((f) => f.key !== "project").map((f) => ({ key: f.key, label: f.label }))
  return [{ key: "project", label: "Project" }, { key: "phase", label: "Phase (for project assignment)" }, ...base]
}

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
const fmtM = (n: number) => `${+(n / 1e6).toFixed(2)}M`

/** First number in a cell — "160 m²" → 160, "3BR" → 3. */
export const firstNum = (v: Cell | undefined): number | null => {
  if (typeof v === "number") return v
  const m = txt(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}
/** Lenient price read for scoring — understands 4.8M shorthand. */
export function looseMoney(v: Cell | undefined): number | null {
  if (typeof v === "number") return v
  const s = txt(v).toLowerCase().replace(/,/g, "")
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mn|million|m\b)?/)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] ? n * 1e6 : n
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
const MIX = [0, 1, 0, 1, 2, 0, 3, 1, 4, 0, 5, 1]
const TOWER_MIX = [0, 1, 0, 3, 1, 2]
const FIN_CLEAN = ["Fully Finished", "Semi Finished", "Core & Shell"] as const

interface UnitSpec {
  code: string; building: string; model: string; type: string; beds: number; bua: number
  land: number | null; garden: number | null; floor: number | null; finishing: string; delivery: string; ready: boolean; price: number
}

function prefixOf(name: string) {
  const letters = name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "")
  return (letters + "XXX").slice(0, 3)
}

/** The clean truth behind a generated unit — what the database holds after ingestion. */
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

/* Grouped (Manual) archetypes — how brokers describe inventory without unit codes */
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
      finishing: "Semi finished",
      deliveryDate: "Q4 2027",
    },
    conf: { project: conf, propertyType: 98, bedrooms: 96, bua: conf, buaTo: conf, price: conf, priceTo: conf - 4, finishing: 90, deliveryDate: 88 },
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
      : groups.map((g) => `• ${g.type}s ${g.beds}BR ${g.bua[0]}-${g.bua[1]} sqm from ${fmtM(g.price[0])}`)
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
      : groups.map((g) => `${g.type} | ${g.beds ? `${g.beds}BR` : "—"} | ${g.bua[0]}–${g.bua[1]} m² | from ${fmtInt(g.price[0])}`)
    const rotated = n === 2
    const conf = rotated ? 64 : 81
    const extracted = auto
      ? specs.map((s, k) => unitDocRow(id, k, mainB, s, `Photo ${n} · row ${k + 1}`, conf))
      : groups.map((g, k) => groupRow(id, k, mainB, g, `Photo ${n} · row ${k + 1}`, conf))
    return { ...base, image: { kind: "prices", title: `${mainB} price list`, lines, rotated }, extracted }
  }

  // PDF — cover, price list, floor plans, payment terms
  const auto = ctx.dataType === "Automatic"
  const specs = Array.from({ length: 8 }, (_, i) => unitSpec(prefixOf(mainA), 80 + i))
  const groups = [GROUP_ARCH[6], GROUP_ARCH[0], GROUP_ARCH[5], GROUP_ARCH[1]]
  const priceLines = auto
    ? specs.map((s) => `${s.code}  ${s.type}  ${s.beds}BR  ${s.bua} m²  ${fmtInt(s.price)}`)
    : groups.map((g) => `${g.type} ${g.beds ? `${g.beds}BR` : ""} · ${g.bua[0]}–${g.bua[1]} m² · from ${fmtM(g.price[0])}`)
  const pages: DocPage[] = [
    { n: 1, kind: "cover", title: `${mainA} — ${phase}`, lines: ["Sales kit", "September 2026"] },
    { n: 2, kind: "prices", title: "Price list", lines: priceLines },
    { n: 3, kind: "plans", title: "Floor plans", lines: ["Type A — 2BR 120 m²", "Type B — 3BR 165 m²", "Type P — Penthouse 190 m²"] },
    { n: 4, kind: "terms", title: "Payment terms", lines: ["10% down payment, 8 years quarterly", "5% down payment, 10 years monthly"] },
  ]
  const extracted = auto
    ? specs.map((s, k) => unitDocRow(id, k, `${mainA} ${phase}`, s, `PDF p.2 · row ${k + 1}`, 94, { page: 2 }))
    : groups.map((g, k) => groupRow(id, k, `${mainA} ${phase}`, g, `PDF p.2 · row ${k + 1}`, 93, { page: 2 }))
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

/* ── Step 1 · Initial setup — detections & cleanup ──────────────────────── */

export type CleanupKind =
  | "not-units" | "title-rows" | "repeat-header" | "summary-row" | "empty-rows" | "empty-cols" | "merged"
  | "cover-page" | "plans-page" | "terms-page" | "dup-image" | "rotated" | "render" | "noise-lines"

export interface CleanupItem { id: string; label: string; fileId: string; tab?: string; rows?: number[]; cols?: number[]; page?: number; line?: number }
export interface CleanupGroup { kind: CleanupKind; title: string; detail: string; items: CleanupItem[]; tone: "error" | "warn" | "info" }

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
const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim()

export function suggestField(raw: string): { key: FieldKey | ""; conf: number } {
  const h = normHeader(raw)
  if (!h) return { key: "", conf: 0 }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn[0] === h) return { key, conf: 99 }
  }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn.includes(h)) return { key, conf: 91 }
  }
  for (const [key, syn] of HEADER_SYNONYMS) {
    if (syn.some((s) => s.length > 3 && (h.includes(s) || s.includes(h)))) return { key, conf: 72 }
  }
  return { key: "", conf: 0 }
}

const rowEmpty = (r: Cell[] | undefined) => !r || r.every(isBlank)

/** Header = first row with 4+ text labels and data underneath. */
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
  const add = (kind: CleanupKind, title: string, detail: string, tone: CleanupGroup["tone"], item: CleanupItem) => {
    if (!groups.has(kind)) groups.set(kind, { kind, title, detail, items: [], tone })
    groups.get(kind)!.items.push(item)
  }
  for (const f of files) {
    if (f.kind === "sheet") {
      for (const tab of f.tabs ?? []) {
        const key = `${f.id}:${tab.name}`
        if (!isUnitsTab(tab)) {
          add("not-units", "Tabs without units", "No unit columns found — ignored and excluded from the output.", "info", { id: `ignore-tab:${key}`, label: `“${tab.name}” tab`, fileId: f.id, tab: tab.name })
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
          if (tab.grid.slice(h).every((row) => isBlank(row[c]))) add("empty-cols", "Completely empty columns", "Columns with no header and no values.", "error", { id: `empty-col:${key}:${c}`, label: `${tab.name} · column ${String.fromCharCode(65 + c)}`, fileId: f.id, tab: tab.name, cols: [c] })
        }
        for (const m of tab.merges) {
          add("merged", "Merged cells", "Merged blocks are unmerged and their value filled down to every row.", "warn", { id: `merged:${key}:${m.col}:${m.from}`, label: `${tab.name} · ${txt(tab.grid[0][m.col]) || String.fromCharCode(65 + m.col)} rows ${m.from + 1}–${m.to + 1}`, fileId: f.id, tab: tab.name, cols: [m.col], rows: Array.from({ length: m.to - m.from + 1 }, (_, i) => m.from + i + 1) })
        }
      }
    } else if (f.kind === "pdf") {
      for (const p of f.pages ?? []) {
        if (p.kind === "cover") add("cover-page", "Pages without units", "Covers and brochure pages are excluded from extraction.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} cover`, fileId: f.id, page: p.n })
        if (p.kind === "plans") add("plans-page", "Floor plan pages", "Excluded from unit extraction — read later in Floor Plans.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} floor plans`, fileId: f.id, page: p.n })
        if (p.kind === "terms") add("terms-page", "Payment terms pages", "Excluded from unit extraction — read later in Payment Plans.", "info", { id: `exclude-page:${f.id}:${p.n}`, label: `${f.name} · p.${p.n} payment terms`, fileId: f.id, page: p.n })
      }
    } else if (f.kind === "image") {
      if (f.image?.duplicateOf) add("dup-image", "Duplicate photos", "The same price list sent twice — the copy is removed.", "error", { id: `remove-file:${f.id}`, label: `${f.name} = ${files.find((x) => x.id === f.image?.duplicateOf)?.name ?? "earlier photo"}`, fileId: f.id })
      if (f.image?.rotated) add("rotated", "Rotated photos", "Auto-rotated upright — lifts extraction confidence.", "warn", { id: `rotate:${f.id}`, label: `${f.name} · 90°`, fileId: f.id })
      if (f.image?.kind === "render") add("render", "Renders, not price lists", "Excluded from extraction and offered in Grouping & Media.", "info", { id: `render:${f.id}`, label: f.name, fileId: f.id })
    } else if (f.kind === "text") {
      (f.lines ?? []).forEach((line, i) => {
        if (/good morning|book now|call |hello|thanks/i.test(line)) add("noise-lines", "Lines without unit data", "Greetings, calls to action and contacts are stripped before extraction.", "warn", { id: `noise:${f.id}:${i}`, label: `L${i + 1} “${line.slice(0, 34)}${line.length > 34 ? "…" : ""}”`, fileId: f.id, line: i })
      })
    }
  }
  const order: CleanupKind[] = ["not-units", "dup-image", "title-rows", "empty-rows", "empty-cols", "merged", "repeat-header", "summary-row", "rotated", "noise-lines", "cover-page", "plans-page", "terms-page", "render"]
  return order.filter((k) => groups.has(k)).map((k) => groups.get(k)!)
}

/** Detections that are safe to apply before the user even looks. */
export const AUTO_CLEANUPS: CleanupKind[] = ["not-units", "cover-page", "plans-page", "terms-page", "render"]

const letter = (c: number) => {
  let s = ""
  let n = c
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

/** One tab before and after the applied cleanups — keys are original column indexes so the grid can diff them. */
export function tabTables(fileId: string, tab: RawTab, applied: Set<string>): { input: GridTable; output: GridTable } {
  const key = `${fileId}:${tab.name}`
  const h = findHeader(tab.grid)
  const width = Math.max(...tab.grid.map((r) => r.length))
  const allCols = Array.from({ length: width }, (_, c) => c)
  const toRow = (r: number, cols: number[]): GridRow => ({ id: `r${r + 1}`, idx: r + 1, cells: Object.fromEntries(cols.map((c) => [String(c), tab.grid[r][c] ?? null])) })
  const labelCols = (cols: number[], headerRow: number | null): GridCol[] => cols.map((c) => ({ key: String(c), label: headerRow === null ? "" : txt(tab.grid[headerRow][c]) }))

  const input: GridTable = h === 0
    ? { cols: labelCols(allCols, 0), rows: tab.grid.slice(1).map((_, i) => toRow(i + 1, allCols)), hasHeader: true, headerIdx: 1 }
    : { cols: labelCols(allCols, null), rows: tab.grid.map((_, r) => toRow(r, allCols)), hasHeader: false }

  const promoted = h === 0 || applied.has(`title:${key}`)
  const dropped = new Set<number>()
  tab.grid.forEach((_, r) => {
    if (promoted && r <= h) dropped.add(r)
    if (applied.has(`repeat:${key}:${r + 1}`) || applied.has(`summary:${key}:${r + 1}`) || applied.has(`empty-row:${key}:${r + 1}`)) dropped.add(r)
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
  return { input, output }
}

export { letter as colLetter }

/* ── Step 2 · Extraction (non-sheet sources) ─────────────────────────────── */

export function extractRows(files: SourceFile[], applied: Set<string>): URow[] {
  const out: URow[] = []
  for (const f of files) {
    if (applied.has(`remove-file:${f.id}`) || applied.has(`render:${f.id}`) || !f.extracted) continue
    for (const r of f.extracted) {
      if (r.page && applied.has(`exclude-page:${f.id}:${r.page}`)) continue
      // Upright photos read better — rotation lifts every field's confidence
      const conf = f.image?.rotated && applied.has(`rotate:${f.id}`)
        ? Object.fromEntries(Object.entries(r.conf ?? {}).map(([k, c]) => [k, Math.min(99, (c ?? 0) + 18)]))
        : r.conf
      out.push({ ...r, conf })
    }
  }
  return out.map((r, i) => ({ ...r, idx: i + 1 }))
}

/* ── Step 3 · Mapping — sheet headers + project assignment ─────────────── */

export interface HeaderInfo { raw: string; samples: string[]; tabs: string[]; suggested: FieldKey | ""; conf: number }

export function headerCatalog(tables: { tab: string; table: GridTable }[]): HeaderInfo[] {
  const map = new Map<string, HeaderInfo>()
  for (const { tab, table } of tables) {
    if (!table.hasHeader) continue
    for (const c of table.cols) {
      const raw = c.label.trim()
      if (!raw) continue
      const k = normHeader(raw)
      if (!map.has(k)) {
        const s = suggestField(raw)
        map.set(k, { raw, samples: [], tabs: [], suggested: s.key, conf: s.conf })
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
export const headerKey = normHeader

/** Sheet rows → typed rows through the header mapping. Tabs without a Project column carry the tab name. */
export function mapSheetRows(tables: { fileId: string; tab: string; table: GridTable }[], headerMap: Record<string, FieldKey | "">): URow[] {
  const out: URow[] = []
  for (const { fileId, tab, table } of tables) {
    if (!table.hasHeader) continue
    const colFor = new Map<FieldKey, string>()
    for (const c of table.cols) {
      const f = headerMap[normHeader(c.label)]
      if (f && !colFor.has(f)) colFor.set(f, c.key)
    }
    for (const r of table.rows) {
      const v: URow["v"] = {}
      colFor.forEach((colKey, f) => { v[f] = r.cells[colKey] ?? null })
      if (!colFor.has("project")) v.project = tab
      out.push({ id: `${fileId}:${tab}:${r.id}`, idx: 0, src: `${tab}!R${r.idx}`, v })
    }
  }
  return out.map((r, i) => ({ ...r, idx: i + 1 }))
}

export interface ProjKey { key: string; rows: number; suggested: string; conf: number }
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

export function projectCatalog(rows: URow[], options: ProjOption[]): ProjKey[] {
  const counts = new Map<string, number>()
  rows.forEach((r) => counts.set(projectKeyOf(r), (counts.get(projectKeyOf(r)) ?? 0) + 1))
  return [...counts.entries()].map(([key, n]) => {
    const b = key === "(blank)" ? { id: "", conf: 0 } : bestProject(key, options)
    return { key, rows: n, suggested: b.id, conf: b.conf }
  })
}

export function assignProjects(rows: URow[], projectMap: Record<string, string>, options: ProjOption[]): URow[] {
  return rows.map((r) => {
    const id = projectMap[projectKeyOf(r)]
    const opt = options.find((o) => o.id === id)
    if (!opt) return { ...r, projectId: undefined }
    const v = { ...r.v, project: opt.label }
    delete v.phase
    return { ...r, projectId: opt.id, v }
  })
}

/* ── Step 4 · Comparison — match rows to the database ───────────────────── */

export interface DbUnit { id: string; projectId: string; label: string; code?: string; v: Partial<Record<FieldKey, Cell>> }

export const normCode = (v: Cell | undefined) => txt(v).toUpperCase().replace(/[\s_-]+/g, "")

/** What the database already holds for the entry's projects. */
export function dbFor(seed: EntrySeed, dataType: DataType): DbUnit[] {
  const out: DbUnit[] = []
  const main = seed.projects.find((p) => !p.isPhase) ?? seed.projects[0]
  const phase = seed.projects.find((p) => p.isPhase) ?? main
  if (!main) return out
  if (dataType === "Automatic") {
    const add = (s: UnitSpec, projectId: string, bump: number) => {
      const id = `U-${10000 + (hashStr(s.code) % 89999)}`
      out.push({
        id, projectId, code: s.code, label: s.code,
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
    sources.push({ name: seed.mains[0]?.name ?? "Project", towers: false, n: 8, start: 80 })
    for (const s of sources) {
      const prefix = prefixOf(s.name)
      const projectId = seed.projects.find((p) => p.label === s.name || p.mainName === s.name)?.id ?? main.id
      for (let i = s.start; i < s.start + s.n; i++) {
        const u = unitSpec(prefix, i, s.towers)
        const h = hashStr(u.code)
        if (h % 4 === 0) continue // not in the database yet → New
        add(u, projectId, h % 5 === 1 ? -roundTo(u.price * 0.04, 10_000) : 0)
      }
      // Units the database still lists but this entry no longer carries
      for (let i = s.start + s.n; i < s.start + s.n + 3; i++) add(unitSpec(prefix, i, s.towers), projectId, 0)
    }
    return out
  }
  // Manual — existing grouped properties per project, close to (but not exactly) what brokers describe
  seed.mains.forEach((m, mi) => {
    const ph = seed.projects.find((p) => p.isPhase && p.mainId === m.id)
    GROUP_ARCH.forEach((g, i) => {
      if (i === 2 || i === 7) return // genuinely new groups
      const drift = (i + mi) % 2 === 0 ? 5 : -8
      out.push({
        id: `GP-${4100 + mi * 97 + i * 7}`,
        projectId: i % 3 === 0 && ph ? ph.id : m.id,
        label: `${g.beds ? `${g.beds}BR ` : ""}${g.type} ${g.bua[0] + drift}–${g.bua[1] + drift} m²`,
        v: {
          propertyType: g.type, bedrooms: g.beds || null, bua: g.bua[0] + drift, buaTo: g.bua[1] + drift,
          price: roundTo(g.price[0] * (1 - drift / 200), 10_000), priceTo: roundTo(g.price[1] * (1 - drift / 200), 10_000),
          finishing: "Semi Finished", deliveryType: "Off Plan", deliveryDate: "2027-12-31",
        },
      })
    })
  })
  void phase
  return out
}

function groupScore(r: URow, d: DbUnit): number {
  const type = txt(r.v.propertyType).toLowerCase().startsWith(txt(d.v.propertyType).toLowerCase().slice(0, 4)) ? 40 : 0
  const beds = (firstNum(r.v.bedrooms) ?? 0) === (firstNum(d.v.bedrooms) ?? 0) ? 20 : 0
  const a1 = firstNum(r.v.bua) ?? 0
  const a2 = firstNum(r.v.buaTo) ?? a1
  const b1 = firstNum(d.v.bua) ?? 0
  const b2 = firstNum(d.v.buaTo) ?? b1
  const overlap = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
  const span = Math.max(a2, b2) - Math.min(a1, b1) || 1
  const area = Math.round((overlap / span) * 20)
  const p1 = looseMoney(r.v.price) ?? 0
  const p2 = looseMoney(d.v.price) ?? 0
  const price = p1 && p2 ? Math.round(Math.max(0, 1 - Math.abs(p1 - p2) / p2 / 0.25) * 20) : 0
  return type + beds + area + price
}

export function compareRows(rows: URow[], db: DbUnit[], dataType: DataType, threshold: number, overrides: Record<string, string>): URow[] {
  if (dataType === "Automatic") {
    const byCode = new Map(db.map((d) => [normCode(d.code), d]))
    return rows.map((r) => {
      const o = overrides[r.id]
      if (o === "new") return { ...r, match: { status: "new", conf: 0, how: "Marked new" } }
      if (o) return { ...r, match: { status: "matched", dbId: o, conf: 100, how: "Picked manually" } }
      const d = byCode.get(normCode(r.v.unitCode))
      if (!d) return { ...r, match: { status: "new", conf: 0, how: "No unit with this code" } }
      const exact = txt(r.v.unitCode) === d.code
      return { ...r, match: { status: "matched", dbId: d.id, conf: exact ? 100 : 97, how: exact ? "Unit code" : "Unit code (normalized)" } }
    })
  }
  return rows.map((r) => {
    const pool = db.filter((d) => !r.projectId || d.projectId === r.projectId || PROJECTS.find((p) => p.id === d.projectId)?.mainProject?.id === r.projectId || PROJECTS.find((p) => p.id === r.projectId)?.mainProject?.id === d.projectId)
    const candidates = pool.map((d) => ({ dbId: d.id, conf: groupScore(r, d), label: d.label })).filter((c) => c.conf >= 30).sort((a, b) => b.conf - a.conf).slice(0, 3)
    const o = overrides[r.id]
    if (o === "new") return { ...r, match: { status: "new", conf: 0, how: "Marked new", candidates } }
    if (o) return { ...r, match: { status: "matched", dbId: o, conf: candidates.find((c) => c.dbId === o)?.conf ?? 100, how: "Picked manually", candidates } }
    const best = candidates[0]
    if (!best) return { ...r, match: { status: "new", conf: 0, how: "No similar grouped property", candidates } }
    if (best.conf >= threshold) return { ...r, match: { status: "matched", dbId: best.dbId, conf: best.conf, how: "Similarity", candidates } }
    if (best.conf >= 50) return { ...r, match: { status: "review", dbId: best.dbId, conf: best.conf, how: "Below threshold", candidates } }
    return { ...r, match: { status: "new", conf: best.conf, how: "Low similarity", candidates } }
  })
}

/** Database units for the entry's projects that no row matched — candidates to mark unavailable. */
export function missingUnits(rows: URow[], db: DbUnit[], dataType: DataType): DbUnit[] {
  if (dataType !== "Automatic") return []
  const matched = new Set(rows.map((r) => r.match?.dbId).filter(Boolean))
  return db.filter((d) => !matched.has(d.id))
}

/* ── Step 5 · Transformation — semantic rules ───────────────────────────── */

export type RuleKind = "shorthand" | "per-sqm" | "split-type" | "delivery-type" | "db-fill" | "replace" | "set-blank" | "multiply"
export interface Rule {
  id: string
  kind: RuleKind
  title: string
  detail: string
  field?: FieldKey
  find?: string
  replace?: string
  value?: string
  factor?: number
  custom?: boolean
}

const SHORTHAND = /^\s*\d+(?:\.\d+)?\s*(m|mn|million)\s*$/i
const READY = /ready|immediate|rtm|delivered/i
const SPLIT = /^(.*?)\s*(\d)\s*(br|bed|bedroom)s?\b\s*$/i

export const AUTO_RULES: Rule[] = [
  { id: "shorthand", kind: "shorthand", title: "Expand price shorthand", detail: "“4.8M” → 4,800,000" },
  { id: "per-sqm", kind: "per-sqm", title: "Price per m² → total price", detail: "Prices under 150,000 × BUA" },
  { id: "split-type", kind: "split-type", title: "Split bedrooms out of Property Type", detail: "“Apartment 3BR” → Apartment · 3" },
  { id: "delivery-type", kind: "delivery-type", title: "Derive Delivery Type", detail: "“Ready” → Ready to Move, dates → Off Plan" },
  { id: "db-fill", kind: "db-fill", title: "Fill blanks from the database", detail: "Matched units inherit Land, Garden, Floor, Model" },
]

function ruleTouch(rule: Rule, r: URow, db: Map<string, DbUnit>): Partial<URow["v"]> | null {
  const v = r.v
  switch (rule.kind) {
    case "shorthand": {
      const patch: Partial<URow["v"]> = {}
      for (const f of ["price", "priceTo"] as const) if (SHORTHAND.test(txt(v[f]))) patch[f] = Math.round((looseMoney(v[f]) ?? 0))
      return Object.keys(patch).length ? patch : null
    }
    case "per-sqm": {
      const p = looseMoney(v.price)
      const a = firstNum(v.bua)
      if (p && a && p > 0 && p < 150_000 && !SHORTHAND.test(txt(v.price))) return { price: roundTo(p * a, 1000) }
      return null
    }
    case "split-type": {
      const m = txt(v.propertyType).match(SPLIT)
      if (!m) return null
      return { propertyType: m[1].trim(), ...(isBlank(v.bedrooms) ? { bedrooms: m[2] } : {}) }
    }
    case "delivery-type": {
      if (!isBlank(v.deliveryType)) return null
      if (READY.test(txt(v.deliveryDate))) return { deliveryType: "Ready to Move", deliveryDate: null }
      if (!isBlank(v.deliveryDate)) return { deliveryType: "Off Plan" }
      return null
    }
    case "db-fill": {
      const d = r.match?.status === "matched" && r.match.dbId ? db.get(r.match.dbId) : undefined
      if (!d) return null
      const patch: Partial<URow["v"]> = {}
      for (const f of ["land", "garden", "floor", "model", "building"] as const) if (isBlank(v[f]) && !isBlank(d.v[f])) patch[f] = d.v[f] ?? null
      return Object.keys(patch).length ? patch : null
    }
    case "replace": {
      if (!rule.field || !rule.find) return null
      const cur = txt(v[rule.field])
      if (!cur.toLowerCase().includes(rule.find.toLowerCase())) return null
      return { [rule.field]: cur.replace(new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), rule.replace ?? "") }
    }
    case "set-blank": {
      if (!rule.field || !isBlank(v[rule.field])) return null
      return { [rule.field]: rule.value ?? "" }
    }
    case "multiply": {
      if (!rule.field || !rule.factor) return null
      const n = rule.field === "price" || rule.field === "priceTo" ? looseMoney(v[rule.field]) : firstNum(v[rule.field])
      if (n === null) return null
      return { [rule.field]: Math.round(n * rule.factor) }
    }
  }
}

export function applyRules(rows: URow[], rules: Rule[], enabled: Set<string>, db: DbUnit[]): { rows: URow[]; hits: Record<string, string[]> } {
  const dbMap = new Map(db.map((d) => [d.id, d]))
  const hits: Record<string, string[]> = {}
  let cur = rows
  for (const rule of rules) {
    hits[rule.id] = []
    cur = cur.map((r) => {
      const patch = ruleTouch(rule, r, dbMap)
      if (!patch) return r
      hits[rule.id].push(r.id)
      return enabled.has(rule.id) ? { ...r, v: { ...r.v, ...patch } } : r
    })
  }
  return { rows: cur, hits }
}

/* ── Step 6 · Formatting — normalize every value to the system format ───── */

export type DateFmt = "DMY" | "MDY"
export interface FormatSettings { dateFormat: DateFmt; fixed: Partial<Record<FieldKey, boolean>>; valueMap: Record<string, string> }
export interface FormatCheck {
  field: FieldKey
  label: string
  changes: { rowId: string; from: Cell; to: Cell }[]
  unknown: { raw: string; rowIds: string[] }[]
  ambiguous: number
}

const TYPE_SYN: [RegExp, string][] = [
  [/^(apt|apartment|flat)/i, "Apartment"], [/^studio/i, "Studio"], [/^duplex/i, "Duplex"], [/^(penthouse|ph)\b/i, "Penthouse"],
  [/^town\s*house|^th\b/i, "Townhouse"], [/^twin\s*house|^twin\b/i, "Twinhouse"], [/villa|stand\s*alone|standalone/i, "Villa"],
  [/chalet/i, "Chalet"], [/office/i, "Office"], [/retail|shop/i, "Retail"], [/clinic/i, "Clinic"],
]
const FIN_SYN: [RegExp, string][] = [
  [/^(fully?[\s-]*finished|ff|finished)$/i, "Fully Finished"], [/^(semi[\s-]*finished|semi|sf)$/i, "Semi Finished"],
  [/^(core\s*(&|and)\s*shell|cs|c&s|shell)$/i, "Core & Shell"], [/^furnished$/i, "Furnished"],
]
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const isoOf = (y: number, m: number, d?: number) => {
  const day = d ?? new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

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

function normalizeField(f: FieldDef, v: Cell | undefined, s: FormatSettings): { value: Cell; ok: boolean; reason?: string; ambiguous?: boolean } {
  const raw = txt(v)
  if (!raw) return { value: null, ok: true }
  const mapped = s.valueMap[`${f.key}:${raw}`]
  if (mapped) return { value: mapped, ok: true }
  switch (f.key) {
    case "unitCode": return { value: raw.toUpperCase().replace(/\s+/g, "-"), ok: true }
    case "building": case "model": return { value: raw.replace(/\s+/g, " "), ok: true }
    case "project": return { value: raw, ok: true }
    case "propertyType": {
      const hit = TYPE_SYN.find(([re]) => re.test(raw))
      return hit ? { value: hit[1], ok: true } : { value: raw, ok: false, reason: "Unknown property type" }
    }
    case "finishing": {
      const hit = FIN_SYN.find(([re]) => re.test(raw))
      return hit ? { value: hit[1], ok: true } : { value: raw, ok: false, reason: "Unknown finishing type" }
    }
    case "deliveryType": {
      if (/off|plan|construction/i.test(raw)) return { value: "Off Plan", ok: true }
      if (READY.test(raw)) return { value: "Ready to Move", ok: true }
      return { value: raw, ok: false, reason: "Unknown delivery type" }
    }
    case "deliveryDate": {
      const p = parseDelivery(v, s.dateFormat)
      if (p.ready) return { value: raw, ok: false, reason: "“Ready” is a delivery type — derive it in Transformation" }
      return p.ok ? { value: p.iso, ok: true, ambiguous: p.ambiguous } : { value: raw, ok: false, reason: "Unreadable date" }
    }
    case "price": case "priceTo": {
      if (SHORTHAND.test(raw)) return { value: raw, ok: false, reason: "Shorthand value — expand it in Transformation" }
      const n = Number(raw.replace(/egp|le|l\.e\.?|,|\s/gi, ""))
      return Number.isFinite(n) ? { value: n, ok: true } : { value: raw, ok: false, reason: "Not a number" }
    }
    case "floor": {
      if (/^(g|gf|ground)$/i.test(raw)) return { value: 0, ok: true }
      const n = firstNum(v)
      return n === null ? { value: raw, ok: false, reason: "Not a number" } : { value: n, ok: true }
    }
    default: {
      const n = firstNum(v)
      return n === null ? { value: raw, ok: false, reason: "Not a number" } : { value: n, ok: true }
    }
  }
}

const sameCell = (a: Cell | undefined, b: Cell | undefined) => txt(a) === txt(b) && typeof a === typeof b

export function formatRows(rows: URow[], fields: FieldDef[], s: FormatSettings): { rows: URow[]; checks: FormatCheck[]; invalid: Map<string, string> } {
  const checks = new Map<FieldKey, FormatCheck>()
  const invalid = new Map<string, string>()
  const unknownMap = new Map<string, Map<string, string[]>>()
  const out = rows.map((r) => {
    const v = { ...r.v }
    for (const f of fields) {
      const cur = r.v[f.key]
      if (isBlank(cur)) continue
      const n = normalizeField(f, cur, s)
      if (!checks.has(f.key)) checks.set(f.key, { field: f.key, label: f.label, changes: [], unknown: [], ambiguous: 0 })
      const ck = checks.get(f.key)!
      if (n.ambiguous) ck.ambiguous++
      if (!n.ok) {
        const u = unknownMap.get(f.key) ?? new Map<string, string[]>()
        u.set(txt(cur), [...(u.get(txt(cur)) ?? []), r.id])
        unknownMap.set(f.key, u)
        invalid.set(`${r.id}|${f.key}`, n.reason ?? "Invalid")
        continue
      }
      if (sameCell(cur, n.value)) continue
      // "132" → 132 or "4,800,000" → 4800000 is a silent type coercion, not a change worth reviewing
      if (txt(cur).replace(/[,\s]/g, "") === String(n.value)) { v[f.key] = n.value; continue }
      ck.changes.push({ rowId: r.id, from: cur ?? null, to: n.value })
      if (s.fixed[f.key]) v[f.key] = n.value
      else invalid.set(`${r.id}|${f.key}`, `Not normalized — will become “${n.value === null ? "—" : f.type === "money" && typeof n.value === "number" ? fmtInt(n.value) : n.value}”`)
    }
    return { ...r, v }
  })
  unknownMap.forEach((vals, key) => {
    const ck = checks.get(key as FieldKey)
    if (ck) ck.unknown = [...vals.entries()].map(([raw, ids]) => ({ raw, rowIds: ids }))
  })
  return { rows: out, checks: [...checks.values()].filter((c) => c.changes.length || c.unknown.length), invalid }
}

/* ── Step 7 · Review — quality checks before anything touches the database ── */

export interface ReviewIssue {
  id: string
  title: string
  detail: string
  blocking: boolean
  rowIds: string[]
  field?: FieldKey
  fix?: { id: "dedupe" | "db-price"; label: string }
}

export function reviewIssues(rows: URow[], dataType: DataType, db: DbUnit[], invalid: Map<string, string>): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  const push = (i: ReviewIssue) => { if (i.rowIds.length) issues.push(i) }
  const dbMap = new Map(db.map((d) => [d.id, d]))
  const num = (v: Cell | undefined) => (typeof v === "number" ? v : null)

  if (dataType === "Automatic") {
    const seen = new Map<string, string[]>()
    rows.forEach((r) => { const c = normCode(r.v.unitCode); if (c) seen.set(c, [...(seen.get(c) ?? []), r.id]) })
    push({ id: "dup-code", title: "Duplicate unit codes", detail: "The same unit appears more than once — keep the latest row.", blocking: true, field: "unitCode", rowIds: [...seen.values()].filter((ids) => ids.length > 1).flat(), fix: { id: "dedupe", label: "Keep latest" } })
    push({ id: "no-code", title: "Missing unit code", detail: "Automatic entries need a unit code on every row.", blocking: true, field: "unitCode", rowIds: rows.filter((r) => isBlank(r.v.unitCode)).map((r) => r.id) })
  }
  const badPrice = rows.filter((r) => num(r.v.price) === null || (num(r.v.price) ?? 0) <= 0)
  push({
    id: "price", title: "Missing or zero price", detail: "Every row needs a positive price.", blocking: true, field: "price", rowIds: badPrice.map((r) => r.id),
    fix: badPrice.some((r) => r.match?.status === "matched") ? { id: "db-price", label: "Use database price" } : undefined,
  })
  push({ id: "bua", title: "Missing BUA", detail: "Built-up area is required.", blocking: true, field: "bua", rowIds: rows.filter((r) => num(r.v.bua) === null).map((r) => r.id) })
  push({ id: "type", title: "Unknown property type", detail: "Pick a property type from the system list.", blocking: true, field: "propertyType", rowIds: rows.filter((r) => !PROPERTY_TYPES.includes(txt(r.v.propertyType) as (typeof PROPERTY_TYPES)[number])).map((r) => r.id) })
  push({ id: "project", title: "Unassigned project", detail: "Assign every row to one of the entry's projects in Mapping.", blocking: true, field: "project", rowIds: rows.filter((r) => !r.projectId).map((r) => r.id) })
  const stillInvalid = [...invalid.keys()].map((k) => k.split("|")[0])
  push({ id: "format", title: "Unformatted values", detail: "Values Formatting couldn't normalize.", blocking: true, rowIds: [...new Set(stillInvalid)] })

  // Warnings
  const ppsqm = (r: URow) => (num(r.v.price) && num(r.v.bua) ? (num(r.v.price) as number) / (num(r.v.bua) as number) : null)
  const medians = new Map<string, number>()
  const byKey = new Map<string, number[]>()
  rows.forEach((r) => { const p = ppsqm(r); if (p) { const k = `${r.projectId}|${r.v.propertyType}`; byKey.set(k, [...(byKey.get(k) ?? []), p]) } })
  byKey.forEach((vals, k) => { const s = [...vals].sort((a, b) => a - b); medians.set(k, s[Math.floor(s.length / 2)]) })
  push({ id: "ppsqm", title: "Price per m² outliers", detail: "More than 40% away from similar units in the same project.", blocking: false, field: "price", rowIds: rows.filter((r) => { const p = ppsqm(r); const m = medians.get(`${r.projectId}|${r.v.propertyType}`); return p && m ? Math.abs(p - m) / m > 0.4 : false }).map((r) => r.id) })
  push({ id: "past", title: "Delivery date in the past", detail: "Off-plan units should deliver after today.", blocking: false, field: "deliveryDate", rowIds: rows.filter((r) => r.v.deliveryType === "Off Plan" && txt(r.v.deliveryDate) && txt(r.v.deliveryDate) < TODAY).map((r) => r.id) })
  push({ id: "beds", title: "Missing bedrooms", detail: "Residential units usually list bedrooms.", blocking: false, field: "bedrooms", rowIds: rows.filter((r) => !NON_RESIDENTIAL.has(txt(r.v.propertyType)) && isBlank(r.v.bedrooms)).map((r) => r.id) })
  push({ id: "delivery", title: "No delivery date", detail: "Off-plan units without a delivery date.", blocking: false, field: "deliveryDate", rowIds: rows.filter((r) => r.v.deliveryType !== "Ready to Move" && isBlank(r.v.deliveryDate)).map((r) => r.id) })
  push({
    id: "jump", title: "Big price change vs database", detail: "Matched units whose price moved more than 25%.", blocking: false, field: "price",
    rowIds: rows.filter((r) => { const d = r.match?.dbId ? dbMap.get(r.match.dbId) : undefined; const a = num(r.v.price); const b = num(d?.v.price); return a && b ? Math.abs(a - b) / b > 0.25 : false }).map((r) => r.id),
  })
  return issues
}

export function applyReviewFixes(rows: URow[], fixes: Set<string>, db: DbUnit[]): URow[] {
  let out = rows
  if (fixes.has("dedupe")) {
    const last = new Map<string, string>()
    out.forEach((r) => { const c = normCode(r.v.unitCode); if (c) last.set(c, r.id) })
    out = out.filter((r) => { const c = normCode(r.v.unitCode); return !c || last.get(c) === r.id })
  }
  if (fixes.has("db-price")) {
    const dbMap = new Map(db.map((d) => [d.id, d]))
    out = out.map((r) => {
      const p = r.v.price
      if (typeof p === "number" && p > 0) return r
      const d = r.match?.dbId ? dbMap.get(r.match.dbId) : undefined
      return d && typeof d.v.price === "number" ? { ...r, v: { ...r.v, price: d.v.price } } : r
    })
  }
  return out
}

/* ── Step 10 · Grouping ──────────────────────────────────────────────────── */

export interface GroupRec {
  key: string
  title: string
  projectId: string
  projectLabel: string
  propertyType: string
  bedrooms: number | null
  finishing: string
  deliveryType: string
  deliveryDate: string
  rowIds: string[]
  buaMin: number
  buaMax: number
  priceMin: number
  priceMax: number
  existingId?: string
}

export function groupRows(rows: URow[], dataType: DataType): GroupRec[] {
  const map = new Map<string, URow[]>()
  for (const r of rows) {
    const k = dataType === "Automatic"
      ? [r.projectId, r.v.propertyType, r.v.bedrooms ?? "", r.v.finishing ?? ""].join("|")
      : r.id
    map.set(k, [...(map.get(k) ?? []), r])
  }
  return [...map.entries()].map(([key, rs]) => {
    const r0 = rs[0]
    const nums = (f: FieldKey) => rs.flatMap((r) => [r.v[f], f === "bua" ? r.v.buaTo : f === "price" ? r.v.priceTo : null]).filter((x): x is number => typeof x === "number" && x > 0)
    const bua = nums("bua")
    const price = nums("price")
    const beds = typeof r0.v.bedrooms === "number" ? r0.v.bedrooms : null
    const type = txt(r0.v.propertyType) || "Unit"
    return {
      key,
      title: `${beds ? `${beds}BR ` : ""}${type}${txt(r0.v.finishing) ? ` · ${r0.v.finishing}` : ""}`,
      projectId: r0.projectId ?? "",
      projectLabel: txt(r0.v.project),
      propertyType: type,
      bedrooms: beds,
      finishing: txt(r0.v.finishing),
      deliveryType: txt(r0.v.deliveryType),
      deliveryDate: txt(r0.v.deliveryDate),
      rowIds: rs.map((r) => r.id),
      buaMin: bua.length ? Math.min(...bua) : 0,
      buaMax: bua.length ? Math.max(...bua) : 0,
      priceMin: price.length ? Math.min(...price) : 0,
      priceMax: price.length ? Math.max(...price) : 0,
      existingId: r0.match?.status === "matched" && dataType === "Manual" ? r0.match.dbId : hashStr(key) % 3 === 0 ? undefined : `GP-${3000 + (hashStr(key) % 900)}`,
    }
  })
}

/* ── Popup detection — what the system can tell from a file before setup ── */

export interface FileDetection {
  kind: FileKind
  hasUnitCodes: boolean
  unitCodes: number
  developerName: string | null
  developerConf: number
  projectNames: string[]
  categories: PropertyCategory[]
  summary: string
}

/** Fast heuristics the upload popup runs per file (name, type and a peek at the content). */
export function detectFile(name: string, kind: EntryFileKind, hint?: { developerName?: string; projects?: string[] }): FileDetection {
  const k = KIND_OF[kind]
  const lower = name.toLowerCase()
  const project = PROJECTS.find((p) => !p.isPhase && lower.includes(p.name.toLowerCase().replace(/\s+/g, "-"))) ??
    PROJECTS.find((p) => !p.isPhase && lower.includes(p.name.toLowerCase().split(" ")[0]))
  const developerName = hint?.developerName ?? project?.developer.name ?? null
  const hasUnitCodes = k === "sheet" || /inventory|units|unit-codes|availability/.test(lower)
  const h = hashStr(name)
  const unitCodes = hasUnitCodes ? 60 + (h % 90) : 0
  const summary =
    k === "sheet" ? `3 tabs · ${unitCodes} unit codes` :
    k === "pdf" ? `4 pages · ${hasUnitCodes ? `${unitCodes} unit codes` : "no unit codes"}` :
    k === "image" ? `${1200 + (h % 2400)}×${900 + (h % 1600)} · price list` :
    `${9 + (h % 5)} lines · no unit codes`
  return {
    kind: k,
    hasUnitCodes,
    unitCodes,
    developerName,
    developerConf: hint?.developerName ? 99 : project ? 88 + (h % 10) : 0,
    projectNames: hint?.projects?.length ? hint.projects : project ? [project.name] : [],
    categories: /commercial|retail|office|clinic/.test(lower) ? ["Commercial"] : ["Residential"],
    summary,
  }
}

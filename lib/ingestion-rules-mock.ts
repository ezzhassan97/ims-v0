/* ────────────────────────────────────────────────────────────────────────────
   Saved ingestion rules — what the data ops team built up per developer.

   Mapping templates, value vocabulary, project rules, transformation actions,
   floor-plan model rules and grouping configs. Rules run first; AI only sees
   what they don't cover; anything accepted in an entry is saved back here on
   ingest so the developer's next entry needs no call.
   ponytail: module-level store mutated in place — a real API replaces it.
   ──────────────────────────────────────────────────────────────────────────── */

import {
  MODEL_ARCH, fmtInt, hashStr, planIdFor,
  type Action, type DataType, type FieldKey, type GroupConfig, type LibPlan, type PoolImage, type ProjOption, type ProjectRule,
} from "@/lib/bulk-ingestion"
import type { SaleType } from "@/lib/ingestion-mock"

/** A developer with no history yet — every stage runs AI-first for them. */
export const NEW_DEVELOPER = "DEV-003"
const knows = (devId: string) => !!devId && devId !== NEW_DEVELOPER

/* ── Mapping templates — header → field per developer and sale type ─────── */

const TAB_A: Record<string, string> = {
  "unit code": "unitCode", project: "project", phase: "phase", model: "model", type: "propertyType", beds: "bedrooms", bua: "bua",
  land: "land", garden: "garden", floor: "floor", finishing: "finishing", delivery: "deliveryDate", price: "price", notes: "custom:Notes",
}
const TAB_B: Record<string, string> = {
  code: "unitCode", tower: "building", "unit type": "propertyType", bedrooms: "bedrooms", area: "bua", terrace: "garden",
  finish: "finishing", handover: "deliveryDate", "total price": "price",
}
const learnedTemplates = new Map<string, Record<string, string>>()

export function mappingTemplate(devId: string, saleType: SaleType | ""): Record<string, string> {
  const learned = learnedTemplates.get(`${devId}|${saleType}`) ?? {}
  if (!knows(devId)) return learned
  // Palm Hills already sent the towers layout once — everyone else meets it for the first time
  return { ...TAB_A, ...(devId === "DEV-001" ? TAB_B : {}), ...learned }
}

/* ── Value vocabulary — raw value → IMS value, the developer's past choices ── */

const BASE_VOCAB: Record<string, string> = {
  "propertyType:apt": "Apartment", "propertyType:flat": "Apartment", "propertyType:apartment": "Apartment",
  "propertyType:ph": "Penthouse", "propertyType:town house": "Townhouse", "propertyType:stand alone": "Villa", "propertyType:duplex": "Duplex",
  "finishing:ff": "Fully Finished", "finishing:fully finished": "Fully Finished", "finishing:semi": "Semi Finished",
  "finishing:semi-finished": "Semi Finished", "finishing:cs": "Core & Shell", "finishing:semi finished": "Semi Finished",
}
const learnedVocab = new Map<string, Record<string, string>>()
export function vocabulary(devId: string): Record<string, string> {
  return { ...(knows(devId) ? BASE_VOCAB : {}), ...(learnedVocab.get(devId) ?? {}) }
}

/* ── Project assignment — aliases and filter rules per developer ───────── */

const learnedAliases = new Map<string, Record<string, string>>()
const learnedProjectRules = new Map<string, ProjectRule[]>()
export const projectAliases = (devId: string) => learnedAliases.get(devId) ?? {}

export function savedProjectRules(devId: string, options: ProjOption[]): ProjectRule[] {
  const main = options.find((o) => !o.isPhase)
  const seeded: ProjectRule[] = main && ["DEV-001", "DEV-004", "DEV-005"].includes(devId)
    ? [{ id: `pr-${devId}-towers`, filters: [{ field: "building", op: "contains", value: "Tower" }], projectId: main.id, origin: "saved", note: "Saved 14 Aug 2026 by Omar Farouk" }]
    : []
  const learned = (learnedProjectRules.get(devId) ?? []).filter((r) => options.some((o) => o.id === r.projectId))
  return [...seeded, ...learned]
}

/* ── Transformation actions — saved per developer + project + phase + sale type + entry type ── */

const learnedActions = new Map<string, Action[]>()

export function savedActions(devId: string, devName: string, saleType: SaleType | "", dataType: DataType, options: ProjOption[]): Action[] {
  const main = options.find((o) => !o.isPhase)
  const scope = { developer: devName, project: main?.label, saleType: saleType || "Primary", entryType: dataType }
  const seeded: Action[] = !knows(devId) ? [] : dataType === "Automatic"
    ? [
      { id: "sa-type-beds", kind: "split", split: "type-beds", field: "propertyType", title: "Split bedrooms out of the type", detail: "“Apartment 3BR” → Apartment · 3 bedrooms", scope: { ...scope, project: undefined }, origin: "saved", health: { applied: 38, overridden: 1 }, lastUsed: "2026-09-12" },
      { id: "sa-per-sqm", kind: "formula", formula: "per-sqm", field: "price", title: "Price per m² → total price", detail: "Prices under 150,000 are per m² — multiply by BUA", filters: [{ field: "price", op: "lt", value: "150000" }], scope, origin: "saved", health: { applied: 22, overridden: 0 }, lastUsed: "2026-09-12" },
      { id: "sa-delivery", kind: "formula", formula: "delivery-type", field: "deliveryType", title: "Delivery type from the delivery text", detail: "“Ready”, “Immediate” → Ready to Move; dates → Off Plan", scope: { ...scope, project: undefined }, origin: "saved", health: { applied: 41, overridden: 2 }, lastUsed: "2026-09-19" },
      { id: "sa-lookup-unit", kind: "lookup", lookup: "unit", fields: ["land", "garden", "floor", "model", "building"], title: "Fill blanks from the matched IMS unit", detail: "Land, Garden, Floor, Model and Building", scope, origin: "saved", health: { applied: 35, overridden: 0 }, lastUsed: "2026-09-19" },
    ]
    : [
      { id: "sa-fin", kind: "fill", field: "finishing", value: "Semi Finished", filters: [{ field: "finishing", op: "blank" }], title: "Blank finishing → Semi Finished", detail: "The developer's offerings launch semi finished", scope, origin: "saved", health: { applied: 12, overridden: 3 }, lastUsed: "2026-09-02" },
      { id: "sa-proj-delivery", kind: "lookup", lookup: "project", fields: ["deliveryDate", "deliveryType"], title: "Delivery from the project", detail: "Blank delivery date and type take the project's", scope, origin: "saved", health: { applied: 9, overridden: 0 }, lastUsed: "2026-09-02" },
    ]
  const learned = (learnedActions.get(devId) ?? []).filter((a) => !a.scope.entryType || a.scope.entryType === dataType)
  return [...seeded, ...learned]
}

/** Values Transformation's "project data" lookup reads. */
export function projectData(projectId?: string): Partial<Record<FieldKey, string>> {
  const h = hashStr(projectId ?? "")
  return { deliveryDate: `${2027 + (h % 2)}-12-31`, deliveryType: "Off Plan", finishing: "Semi Finished" }
}

/* ── Floor plans — the library with each project's plans, and model rules ── */

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
/** Text inside SVG is XML — "&" and "<" must be escaped or the image breaks. */
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** A clean schematic floor plan — rooms sized from the bedroom count. */
export function floorPlanSvg(model: string, type: string, beds: number, area: number, revision = 0): string {
  const wall = "#334155"
  const label = (x: number, y: number, t: string, s = 11) => `<text x="${x}" y="${y}" font-family="Inter,Arial" font-size="${s}" fill="#64748b" text-anchor="middle">${esc(t)}</text>`
  const room = (x: number, y: number, w: number, h: number, name: string, fill = "#f8fafc") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${wall}" stroke-width="3"/>${label(x + w / 2, y + h / 2 + 4, name)}`
  const door = (x: number, y: number, r = 16) => `<path d="M${x} ${y} a${r} ${r} 0 0 1 ${r} ${r}" fill="none" stroke="#94a3b8" stroke-width="1.2"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + r}" stroke="#94a3b8" stroke-width="1.2"/>`
  const parts: string[] = []
  const twoLevels = /villa|town|twin|duplex/i.test(type)
  if (!twoLevels) {
    const x = 20, y = 20, w = 360, h = 222
    const bw = beds ? Math.round(w * (revision ? 0.34 : 0.38)) : 0
    const bh = beds ? h / beds : 0
    for (let b = 0; b < beds; b++) { parts.push(room(x, y + b * bh, bw, bh, b === 0 ? "Master" : `Bedroom ${b + 1}`, b % 2 ? "#f1f5f9" : "#f8fafc")); parts.push(door(x + bw - 18, y + b * bh + 4)) }
    parts.push(room(x + bw, y, w - bw, h * 0.62, beds ? "Living & dining" : "Studio living", "#f0f9ff"))
    parts.push(room(x + bw, y + h * 0.62, (w - bw) * 0.58, h * 0.38, "Kitchen"))
    parts.push(room(x + bw + (w - bw) * 0.58, y + h * 0.62, (w - bw) * 0.42, h * 0.38, "Bath", "#f1f5f9"))
    parts.push(`<line x1="${x + bw + 30}" y1="${y}" x2="${x + bw + 110}" y2="${y}" stroke="#7dd3fc" stroke-width="5"/>`)
  } else {
    const levels = [{ x: 20, name: "Ground" }, { x: 206, name: "First" }]
    levels.forEach((lv, li) => {
      const y = 34, w = 174, h = 208
      parts.push(`<text x="${lv.x}" y="26" font-family="Inter,Arial" font-size="10" font-weight="600" fill="#334155">${lv.name} floor</text>`)
      if (li === 0) {
        parts.push(room(lv.x, y, w, h * 0.58, "Living", "#f0f9ff"))
        parts.push(room(lv.x, y + h * 0.58, w * 0.6, h * 0.42, "Kitchen"))
        parts.push(room(lv.x + w * 0.6, y + h * 0.58, w * 0.4, h * 0.42, "WC", "#f1f5f9"))
      } else {
        const n = Math.max(1, beds)
        const bh = h / n
        for (let b = 0; b < n; b++) { parts.push(room(lv.x, y + b * bh, w * 0.66, bh, b === 0 ? "Master" : `Bed ${b + 1}`, b % 2 ? "#f1f5f9" : "#f8fafc")); parts.push(door(lv.x + w * 0.66 - 16, y + b * bh + 4, 12)) }
        parts.push(room(lv.x + w * 0.66, y, w * 0.34, h, "Bath", "#f1f5f9"))
      }
    })
  }
  const title = `${model}${revision ? " (older revision)" : ""} · ${beds ? `${beds}BR ` : ""}${type} · ${area} m²`
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 290"><rect width="400" height="290" fill="#ffffff"/>${parts.join("")}<rect x="0" y="252" width="400" height="38" fill="#f8fafc"/><text x="20" y="276" font-family="Inter,Arial" font-size="13" font-weight="600" fill="#1e293b">${esc(title)}</text></svg>`)
}

const OFFERING_MODELS = [
  { type: "Apartment", beds: 2, area: 128 }, { type: "Apartment", beds: 3, area: 172 }, { type: "Duplex", beds: 4, area: 248 },
  { type: "Townhouse", beds: 3, area: 220 }, { type: "Villa", beds: 4, area: 320 }, { type: "Penthouse", beds: 3, area: 198 },
  { type: "Studio", beds: 0, area: 58 }, { type: "Chalet", beds: 2, area: 102 },
]
const uploadedPlans: LibPlan[] = []

/** Each main project's plans: one per model, plus an older revision some IMS units still point at. */
export function floorLibrary(mainIds: string[]): LibPlan[] {
  const out: LibPlan[] = []
  for (const mainId of mainIds) {
    for (const m of MODEL_ARCH) {
      out.push({ id: planIdFor(mainId, m.model), model: m.model, type: m.type, beds: m.beds, area: m.area, mainId, image: floorPlanSvg(m.model, m.type, m.beds, m.area) })
      out.push({ id: planIdFor(mainId, `${m.model}-OLD`), model: `${m.model} rev. A`, type: m.type, beds: m.beds, area: m.area - 6, mainId, image: floorPlanSvg(m.model, m.type, m.beds, m.area - 6, 1) })
    }
    for (const m of OFFERING_MODELS) {
      const model = `${m.type}-${m.beds}`
      out.push({ id: planIdFor(mainId, model), model: `${m.type} ${m.beds ? `${m.beds}BR` : ""}`.trim(), type: m.type, beds: m.beds, area: m.area, mainId, image: floorPlanSvg(`Type ${m.type[0]}${m.beds}`, m.type, m.beds, m.area) })
    }
  }
  return [...out, ...uploadedPlans.filter((p) => mainIds.includes(p.mainId))]
}
/** A new plan image read by AI once — model, bedrooms and area land in its details. */
export function uploadPlan(mainId: string, model: string, type: string, beds: number, area: number): LibPlan {
  const p: LibPlan = { id: `FPL-${8100 + uploadedPlans.length}`, model, type, beds, area, mainId, uploaded: true, image: floorPlanSvg(model, type, beds, area) }
  uploadedPlans.push(p)
  return p
}

const learnedModelRules = new Map<string, Record<string, string>>()
/** `${mainId}|${model}` → plan, learned from past assignments. */
export function modelRules(devId: string, mainIds: string[]): Record<string, string> {
  const seeded = devId === "DEV-001" || devId === "DEV-002"
    ? Object.fromEntries(mainIds.flatMap((m) => MODEL_ARCH.map((a) => [`${m}|${a.model}`, planIdFor(m, a.model)])))
    : {}
  return { ...seeded, ...(learnedModelRules.get(devId) ?? {}) }
}

/* ── Grouping configs — saved per project or phase ──────────────────────── */

const savedGroupConfigs = new Map<string, GroupConfig>()
export function groupConfigFor(devId: string, mainId: string): { config: GroupConfig; origin: "Saved" | "AI proposal" } {
  const learned = savedGroupConfigs.get(mainId)
  if (learned) return { config: learned, origin: "Saved" }
  if (knows(devId)) return { config: { fields: ["finishing", "floorPlan"], bucket: 50 }, origin: "Saved" }
  return { config: { fields: ["floorPlan"], bucket: 50 }, origin: "AI proposal" }
}

/* ── Media — each project's render pool (brochures + library) ──────────── */

function renderSvg(kind: "Apartment" | "Villa" | "Townhouse" | "Interior" | "Amenity", seed: number): string {
  const dusk = seed % 2 === 1
  const sky = dusk ? ["#fde68a", "#fbcfe8", "#c7d2fe"] : ["#dbeafe", "#eff6ff", "#f8fafc"]
  const defs = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[2]}"/><stop offset="0.6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[0]}"/></linearGradient></defs>`
  const tree = (x: number, y: number, r: number) => `<rect x="${x - 2}" y="${y}" width="4" height="${r * 1.6}" fill="#78716c"/><circle cx="${x}" cy="${y}" r="${r}" fill="#4d7c0f" opacity="0.9"/><circle cx="${x - r * 0.5}" cy="${y + 4}" r="${r * 0.7}" fill="#65a30d"/>`
  const palm = (x: number, y: number) => `<path d="M${x} ${y} q4 -40 0 -80" stroke="#92400e" stroke-width="4" fill="none"/><path d="M${x} ${y - 80} q-30 -6 -44 12 M${x} ${y - 80} q30 -6 44 12 M${x} ${y - 80} q-12 -26 -34 -26 M${x} ${y - 80} q12 -26 34 -26" stroke="#15803d" stroke-width="5" fill="none" stroke-linecap="round"/>`
  let body = ""
  if (kind === "Interior") {
    body = `<rect width="480" height="300" fill="#f5f5f4"/><rect x="0" y="210" width="480" height="90" fill="#d6b48a"/><rect x="250" y="40" width="190" height="130" fill="url(#s)" stroke="#e7e5e4" stroke-width="8"/>
      <rect x="40" y="150" width="200" height="60" rx="14" fill="#94a3b8"/><rect x="40" y="130" width="200" height="40" rx="12" fill="#a8b3c4"/><rect x="60" y="215" width="160" height="10" rx="3" fill="#57534e"/>
      <circle cx="300" cy="195" r="16" fill="#65a30d"/><rect x="292" y="205" width="16" height="22" fill="#a16207"/><rect x="398" y="120" width="6" height="90" fill="#44403c"/><path d="M380 120 h42 l-8 -26 h-26z" fill="#fef3c7"/>`
  } else if (kind === "Amenity") {
    body = `<rect width="480" height="300" fill="url(#s)"/><rect x="0" y="170" width="480" height="130" fill="#e7e5e4"/><rect x="60" y="190" width="360" height="80" rx="12" fill="#38bdf8"/>
      <path d="M80 215 h320 M80 240 h320" stroke="#bae6fd" stroke-width="3"/>${[90, 170, 250, 330].map((x) => `<rect x="${x}" y="276" width="44" height="10" rx="3" fill="#f8fafc"/><path d="M${x + 22} 272 v-38" stroke="#57534e" stroke-width="2"/><path d="M${x} 240 q22 -22 44 0z" fill="#fb7185"/>`).join("")}${palm(40, 176)}${palm(446, 176)}`
  } else {
    const ground = `<rect x="0" y="232" width="480" height="68" fill="#a3e635" opacity="0.8"/><rect x="0" y="262" width="480" height="38" fill="#d6d3d1"/>`
    let bld = ""
    if (kind === "Apartment") {
      const towers = [{ x: 60, w: 110, h: 170 }, { x: 190, w: 120, h: 205 }, { x: 330, w: 100, h: 150 }]
      bld = towers.map((t, ti) => {
        const top = 232 - t.h
        let win = ""
        for (let yy = top + 14; yy < 222; yy += 18) for (let xx = t.x + 12; xx < t.x + t.w - 14; xx += 20) win += `<rect x="${xx}" y="${yy}" width="10" height="9" fill="${(xx + yy + ti + seed) % 5 === 0 ? "#fde68a" : "#bfdbfe"}"/>`
        return `<rect x="${t.x}" y="${top}" width="${t.w}" height="${t.h}" fill="${ti % 2 ? "#e2e8f0" : "#f1f5f9"}"/><rect x="${t.x + t.w - 10}" y="${top}" width="10" height="${t.h}" fill="#cbd5e1"/>${win}`
      }).join("") + tree(40, 214, 14) + tree(452, 216, 12)
    } else if (kind === "Villa") {
      bld = `<rect x="110" y="130" width="260" height="102" fill="#f5f5f4"/><rect x="92" y="118" width="296" height="14" fill="#e7e5e4"/><rect x="150" y="70" width="170" height="60" fill="#fafaf9"/><rect x="138" y="62" width="194" height="10" fill="#e7e5e4"/>
        <rect x="130" y="150" width="90" height="70" fill="#bae6fd"/><rect x="236" y="150" width="60" height="70" fill="#bae6fd"/><rect x="170" y="84" width="60" height="36" fill="#bae6fd"/><rect x="246" y="84" width="54" height="36" fill="#bae6fd"/>
        <rect x="130" y="240" width="220" height="18" rx="4" fill="#38bdf8"/>${palm(78, 232)}${palm(410, 232)}`
    } else {
      bld = [0, 1, 2, 3].map((k) => { const x = 60 + k * 95; return `<rect x="${x}" y="140" width="90" height="92" fill="${k % 2 ? "#f5f5f4" : "#fafaf9"}"/><path d="M${x - 6} 142 L${x + 45} 104 L${x + 96} 142z" fill="${k % 2 ? "#b45309" : "#c2410c"}"/><rect x="${x + 34}" y="196" width="22" height="36" fill="#78350f"/><rect x="${x + 10}" y="160" width="22" height="20" fill="#bae6fd"/><rect x="${x + 58}" y="160" width="22" height="20" fill="#bae6fd"/>` }).join("") + tree(34, 214, 13) + tree(456, 214, 13)
    }
    body = `<rect width="480" height="300" fill="url(#s)"/>${dusk ? `<circle cx="400" cy="70" r="26" fill="#fdba74" opacity="0.8"/>` : `<circle cx="410" cy="60" r="20" fill="#fef9c3"/>`}${ground}${bld}`
  }
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">${defs}${body}</svg>`)
}

const poolExtras = new Map<string, PoolImage[]>()
export function renderPool(mainIds: string[], names: Record<string, string>): PoolImage[] {
  const out: PoolImage[] = []
  for (const mainId of mainIds) {
    const n = names[mainId] ?? "Project"
    const h = hashStr(mainId)
    const add = (k: number, url: string, caption: string, kind: PoolImage["kind"], building: PoolImage["building"], source: PoolImage["source"]) =>
      out.push({ id: `IMG-${mainId.replace(/\D/g, "") || h % 900}-${k}`, url, caption, kind, building, source, mainId })
    add(1, renderSvg("Apartment", h), `${n} — residential towers at dusk`, "Exterior render", "Apartment", "Brochure")
    add(2, renderSvg("Apartment", h + 1), `${n} — apartment buildings by day`, "Exterior render", "Apartment", "Library")
    add(3, renderSvg("Villa", h), `${n} — standalone villa with pool`, "Exterior render", "Villa", "Brochure")
    add(4, renderSvg("Townhouse", h + 1), `${n} — townhouse row`, "Exterior render", "Townhouse", "Library")
    add(5, renderSvg("Interior", h), `${n} — living room, fully finished`, "Interior render", undefined, "Brochure")
    add(6, renderSvg("Amenity", h), `${n} — lagoon pool deck`, "Amenity", undefined, "Library")
    add(7, "/luxury-clubhouse-exterior.jpg", `${n} — clubhouse`, "Exterior render", "Clubhouse", "Library")
    add(8, "/aerial-view-masterplan-residential-development-blu.jpg", `${n} — masterplan aerial`, "Masterplan", undefined, "Brochure")
    add(9, floorPlanSvg("A-2B", "Apartment", 2, 122), `${n} — floor plan page from the brochure`, "Floor plan", undefined, "Brochure")
    out.push(...(poolExtras.get(mainId) ?? []))
  }
  return out
}
export function addToPool(img: PoolImage) { poolExtras.set(img.mainId, [...(poolExtras.get(img.mainId) ?? []), img]) }
const notRepresentative = new Set<string>()
export const isNotRepresentative = (id: string) => notRepresentative.has(id)

/* ── Developer settings, owners and QA ──────────────────────────────────── */

export function developerSettings(devId: string) {
  return { missingDefault: "Sold" as const, missingNoDefaultAbove: 20, fullAuto: false, secondApprovalAbove: { priceChangePct: 15, missingPct: 15 }, autopilot: devId === "DEV-001" ? "Assist" : "Off" }
}

const OWNERS = [
  { name: "Mohamed Adel", phone: "0100 555 1234" },
  { name: "Heba Sami", phone: "0122 410 7788" },
  { name: "Karim Nabil", phone: "0111 902 3345" },
  { name: "Dina Fawzy", phone: "0109 318 6620" },
]
export const ownerFor = (entryId: string) => OWNERS[hashStr(entryId) % OWNERS.length]
export function resaleUnitsOf(entryId: string, project: string) {
  const h = hashStr(entryId)
  return [0, 1, 2].map((k) => ({ id: `RS-${2400 + ((h + k * 37) % 500)}`, label: `${[2, 3, 3][k]}BR ${["Apartment", "Apartment", "Townhouse"][k]} · ${project}`, price: [6_150_000, 8_400_000, 15_200_000][k] }))
}

export const QA_ITEMS = [
  "Prices spot-checked against the source",
  "New units' floor plans look right",
  "Media is representative",
  "Missing units decided correctly",
  "Project status is consistent",
]

/* ── Feedback loop — what an ingested entry teaches the next one ────────── */

export function learnFromEntry(x: {
  devId: string
  saleType: SaleType | ""
  headerPairs: Record<string, string>
  valueChoices: Record<string, string>
  projectRules: ProjectRule[]
  actions: Action[]
  modelPicks: Record<string, string>
  groupConfigs: Record<string, GroupConfig>
  excludedImages: string[]
}) {
  if (!x.devId) return
  learnedTemplates.set(`${x.devId}|${x.saleType}`, { ...(learnedTemplates.get(`${x.devId}|${x.saleType}`) ?? {}), ...x.headerPairs })
  const voc = { ...(learnedVocab.get(x.devId) ?? {}) }
  Object.entries(x.valueChoices).forEach(([k, v]) => { const [field, ...raw] = k.split(":"); voc[`${field}:${raw.join(":").toLowerCase()}`] = v })
  learnedVocab.set(x.devId, voc)
  learnedProjectRules.set(x.devId, [...(learnedProjectRules.get(x.devId) ?? []), ...x.projectRules.map((r) => ({ ...r, origin: "saved" as const, note: "Saved from your last entry" }))])
  learnedActions.set(x.devId, [...(learnedActions.get(x.devId) ?? []), ...x.actions.map((a) => ({ ...a, id: `learned-${a.id}`, origin: "saved" as const, health: { applied: 1, overridden: 0 }, lastUsed: "2026-09-29" }))])
  learnedModelRules.set(x.devId, { ...(learnedModelRules.get(x.devId) ?? {}), ...x.modelPicks })
  Object.entries(x.groupConfigs).forEach(([mainId, cfg]) => savedGroupConfigs.set(mainId, cfg))
  x.excludedImages.forEach((id) => notRepresentative.add(id))
}

export const fmtMoney = (n: number) => `${fmtInt(n)} EGP`

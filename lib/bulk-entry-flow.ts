/* ────────────────────────────────────────────────────────────────────────────
   Bulk entry flow — the wizard's state, the whole pipeline as one pure
   function, per-step status (gates Next) and AI completion per step. The same
   AI functions drive Autopilot and fast-forward entries opened mid-flow.
   ──────────────────────────────────────────────────────────────────────────── */

import {
  AUTO_CLEANUPS, AUTO_RULES, FINISHING_TYPES, PROPERTY_TYPES, applyReviewFixes, applyRules, assignProjects, compareRows, dbFor,
  detectCleanups, extractRows, fieldsFor, firstNum, formatRows, groupRows, hashStr, headerCatalog, headerKey, isBlank,
  isSheetSource, mapSheetRows, missingUnits, projectCatalog, projectOptions, reviewIssues, similarity, tabTables, txt,
  type Cell, type CleanupGroup, type DataType, type DateFmt, type DbUnit, type EntrySeed, type FieldDef, type FieldKey,
  type FormatCheck, type GridTable, type GroupRec, type HeaderInfo, type ProjKey, type ProjOption, type ReviewIssue,
  type Rule, type URow,
} from "@/lib/bulk-ingestion"
import type { EntryStage, IngestionEntry, PropertyCategory, SaleType } from "@/lib/ingestion-mock"

export type StepKey =
  | "setup" | "extraction" | "mapping" | "comparison" | "transformation" | "formatting"
  | "review" | "plans" | "floorplans" | "grouping" | "final"

export const STEP_KEYS: StepKey[] = ["setup", "extraction", "mapping", "comparison", "transformation", "formatting", "review", "plans", "floorplans", "grouping", "final"]
export const STEP_LABEL: Record<StepKey, EntryStage> = {
  setup: "Initial Setup", extraction: "Extraction", mapping: "Mapping", comparison: "Comparison", transformation: "Transformation",
  formatting: "Formatting", review: "Review", plans: "Payment Plans", floorplans: "Floor Plans", grouping: "Grouping & Media", final: "Final Check",
}
export const STEP_GOAL: Record<StepKey, string> = {
  setup: "Confirm what this entry is and clean the files before anything is read.",
  extraction: "Documents, photos and messages become one editable table — verify it against the source.",
  mapping: "Map sheet columns to system fields and assign every row to one of the entry's projects.",
  comparison: "Match every row to what the database already holds.",
  transformation: "Fix meaning — price shorthand, per-m² prices, combined columns, blanks the database can fill.",
  formatting: "Normalize every value to the system format.",
  review: "Resolve blocking issues and decide on warnings before anything touches the database.",
  plans: "Link payment plans to the units they apply to.",
  floorplans: "Attach the right floor plan to every model.",
  grouping: "Group units into grouped properties and give each one media.",
  final: "One last look at everything that will change, then ingest.",
}

/* ── Work — everything the user (or AI) decided so far ──────────────────── */

export interface Edits { set: Record<string, Partial<Record<FieldKey, Cell>>>; deleted: string[]; added: URow[] }
export const NO_EDITS: Edits = { set: {}, deleted: [], added: [] }

export interface Work {
  developerId: string
  projectIds: string[]
  saleType: SaleType | ""
  dataType: DataType
  categories: PropertyCategory[]
  /** Setup actions: cleanups, removed files, ignored tabs, excluded pages, dropped columns */
  applied: string[]
  extractEdits: Edits
  /** Low-confidence cells re-read with the high-accuracy model */
  confirmedLowConf: boolean
  headerMap: Record<string, FieldKey | "">
  projectMap: Record<string, string>
  mapEdits: Edits
  threshold: number
  matchOverrides: Record<string, string>
  /** The entry covers the projects' whole inventory — unmatched database units become unavailable */
  fullInventory: boolean
  keepMissing: string[]
  rules: Rule[]
  enabledRules: string[]
  transformEdits: Edits
  dateFormat: DateFmt
  fixed: Partial<Record<FieldKey, boolean>>
  valueMap: Record<string, string>
  formatEdits: Edits
  reviewFixes: string[]
  ignoredIssues: string[]
  reviewEdits: Edits
  rowPlans: Record<string, string[]>
  floorPlans: Record<string, string>
  groupMedia: Record<string, string[]>
}

export function initialWork(entry: IngestionEntry, seed: EntrySeed): Work {
  const detections = detectCleanups(seed.files)
  return {
    developerId: entry.developer?.id ?? "",
    projectIds: entry.projects.map((p) => p.id),
    saleType: entry.saleType,
    dataType: entry.dataType,
    categories: entry.categories,
    applied: detections.filter((g) => AUTO_CLEANUPS.includes(g.kind)).flatMap((g) => g.items.map((i) => i.id)),
    extractEdits: NO_EDITS,
    confirmedLowConf: false,
    headerMap: {},
    projectMap: {},
    mapEdits: NO_EDITS,
    threshold: 80,
    matchOverrides: {},
    fullInventory: isSheetSource(seed.files),
    keepMissing: [],
    rules: AUTO_RULES,
    enabledRules: [],
    transformEdits: NO_EDITS,
    dateFormat: "DMY",
    fixed: {},
    valueMap: {},
    formatEdits: NO_EDITS,
    reviewFixes: [],
    ignoredIssues: [],
    reviewEdits: NO_EDITS,
    rowPlans: {},
    floorPlans: {},
    groupMedia: {},
  }
}

/** Inline edits on top of a step's rows. Editing Project re-resolves the project id from its label. */
export function applyEdits(rows: URow[], e: Edits, options: ProjOption[]): URow[] {
  if (!e.deleted.length && !e.added.length && !Object.keys(e.set).length) return rows
  const del = new Set(e.deleted)
  const patch = (r: URow): URow => {
    const s = e.set[r.id]
    if (!s) return r
    const projectId = "project" in s ? options.find((o) => o.label === txt(s.project))?.id : r.projectId
    return { ...r, v: { ...r.v, ...s }, projectId }
  }
  return [...rows.filter((r) => !del.has(r.id)).map(patch), ...e.added.filter((r) => !del.has(r.id)).map(patch)]
}
export function editCell(e: Edits, rowId: string, field: FieldKey, value: Cell): Edits {
  return { ...e, set: { ...e.set, [rowId]: { ...e.set[rowId], [field]: value } } }
}
export function addRow(e: Edits, rows: URow[]): Edits {
  const idx = Math.max(0, ...rows.map((r) => r.idx), ...e.added.map((r) => r.idx)) + 1
  return { ...e, added: [...e.added, { id: `new-${idx}`, idx, src: "Added manually", v: {} }] }
}

/* ── Payment plans read from the sources + the database ─────────────────── */

export interface PlanDraft {
  id: string
  name: string
  source: "Detected" | "Database"
  dp: number
  years: number
  freq: "Monthly" | "Quarterly" | "Cash"
  discount?: number
  from: string
  mainId: string
  mainName: string
}

export function plansFor(seed: EntrySeed, options: ProjOption[]): PlanDraft[] {
  const main = options.find((o) => !o.isPhase) ?? options[0]
  if (!main) return []
  const out: PlanDraft[] = []
  const add = (p: Omit<PlanDraft, "id" | "mainId" | "mainName">) => {
    if (out.some((x) => x.dp === p.dp && x.years === p.years && x.freq === p.freq && x.source === p.source)) return
    out.push({ ...p, id: `PL-${out.length + 1}`, mainId: main.mainId, mainName: main.mainName })
  }
  for (const f of seed.files) {
    if (f.kind === "sheet" && f.tabs?.some((t) => t.name === "Payment Terms")) {
      add({ name: "Standard — 10% DP · 8 years quarterly", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} › Payment Terms` })
      add({ name: "Extended — 5% DP · 10 years monthly", source: "Detected", dp: 5, years: 10, freq: "Monthly", from: `${f.name} › Payment Terms` })
      add({ name: "Cash — 12% discount", source: "Detected", dp: 100, years: 0, freq: "Cash", discount: 12, from: `${f.name} › Payment Terms` })
    }
    if (f.kind === "text" && f.lines?.some((l) => /payment/i.test(l))) add({ name: "10% DP · 8 years equal installments", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} · L${(f.lines ?? []).findIndex((l) => /payment/i.test(l)) + 1}` })
    if (f.kind === "pdf") {
      add({ name: "10% DP · 8 years quarterly", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} · p.4` })
      add({ name: "5% DP · 10 years monthly", source: "Detected", dp: 5, years: 10, freq: "Monthly", from: `${f.name} · p.4` })
    }
  }
  const mains = [...new Map(options.filter((o) => !o.isPhase).map((o) => [o.mainId, o])).values()]
  mains.forEach((m, i) => {
    out.push({ id: `DB-${50600 + i * 17}`, name: `${m.mainName} — Standard 7 years`, source: "Database", dp: 10, years: 7, freq: "Quarterly", from: "Already on the project", mainId: m.mainId, mainName: m.mainName })
  })
  return out
}

/** Units that share a floor plan — models for Automatic entries, each grouped row for Manual ones. */
export interface FloorKey { key: string; label: string; rowIds: string[]; type: string; beds: number | null; area: number | null }
export function floorPlanKeys(rows: URow[], dataType: DataType): FloorKey[] {
  const map = new Map<string, URow[]>()
  for (const r of rows) {
    const k = dataType === "Automatic" ? txt(r.v.model) || `${txt(r.v.propertyType)} ${txt(r.v.bedrooms)}BR` : r.id
    map.set(k, [...(map.get(k) ?? []), r])
  }
  return [...map.entries()].map(([key, rs]) => {
    const r0 = rs[0]
    const areas = rs.map((r) => (typeof r.v.bua === "number" ? r.v.bua : null)).filter((x): x is number => x !== null)
    const beds = typeof r0.v.bedrooms === "number" ? r0.v.bedrooms : firstNum(r0.v.bedrooms)
    return {
      key,
      label: dataType === "Automatic" ? key : `${beds ? `${beds}BR ` : ""}${txt(r0.v.propertyType)} · ${txt(r0.v.project)}`,
      rowIds: rs.map((r) => r.id),
      type: txt(r0.v.propertyType),
      beds,
      area: areas.length ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : null,
    }
  })
}

/* ── The pipeline ────────────────────────────────────────────────────────── */

export interface SetupSheet { fileId: string; tab: string; input: GridTable; output: GridTable; ignored: boolean }

export interface Pipe {
  options: ProjOption[]
  fields: FieldDef[]
  sheetSource: boolean
  detections: CleanupGroup[]
  applied: Set<string>
  setup: SetupSheet[]
  extracted: URow[]
  headers: HeaderInfo[]
  headerMap: Record<string, FieldKey | "">
  mapBase: URow[]
  projectKeys: ProjKey[]
  projectMap: Record<string, string>
  mapped: URow[]
  db: DbUnit[]
  compared: URow[]
  missing: DbUnit[]
  ruleHits: Record<string, string[]>
  transformIn: URow[]
  transformed: URow[]
  formatIn: URow[]
  formatted: URow[]
  formatChecks: FormatCheck[]
  invalid: Map<string, string>
  reviewed: URow[]
  reviewInvalid: Map<string, string>
  issues: ReviewIssue[]
  groups: GroupRec[]
  plans: PlanDraft[]
  floorKeys: FloorKey[]
}

const autoHeaderMap = (headers: HeaderInfo[]) =>
  Object.fromEntries(headers.filter((h) => h.suggested && h.conf >= 90).map((h) => [headerKey(h.raw), h.suggested]))

export function computePipeline(seed: EntrySeed, w: Work): Pipe {
  const options = projectOptions(w.projectIds.map((id) => ({ id })))
  const fields = fieldsFor(w.dataType, options)
  const sheetSource = isSheetSource(seed.files)
  const applied = new Set(w.applied)
  const detections = detectCleanups(seed.files)
  const setup: SetupSheet[] = seed.files
    .filter((f) => f.kind === "sheet" && !applied.has(`remove-file:${f.id}`))
    .flatMap((f) => (f.tabs ?? []).map((t) => ({ fileId: f.id, tab: t.name, ignored: applied.has(`ignore-tab:${f.id}:${t.name}`), ...tabTables(f.id, t, applied) })))
  const liveTabs = setup.filter((s) => !s.ignored).map((s) => ({ fileId: s.fileId, tab: s.tab, table: s.output }))

  // Extraction — documents, photos and text; sheets inside a mixed entry are read by the extractor too
  const headers = headerCatalog(liveTabs)
  const docSheets = sheetSource ? [] : mapSheetRows(liveTabs, autoHeaderMap(headers)).map((r) => ({ ...r, conf: Object.fromEntries(Object.keys(r.v).map((k) => [k, 95])) }))
  const extractedBase = sheetSource ? [] : [...extractRows(seed.files, applied), ...docSheets].map((r, i) => ({ ...r, idx: i + 1 }))
  const extracted = applyEdits(
    w.confirmedLowConf ? extractedBase.map((r) => ({ ...r, conf: Object.fromEntries(Object.entries(r.conf ?? {}).map(([k, c]) => [k, Math.max(c ?? 0, 92)])) })) : extractedBase,
    w.extractEdits,
    options,
  )

  // Mapping
  const headerMap = { ...autoHeaderMap(headers), ...w.headerMap }
  const mapBase = sheetSource ? mapSheetRows(liveTabs, headerMap) : extracted
  const projectKeys = projectCatalog(mapBase, options)
  const projectMap = { ...Object.fromEntries(projectKeys.filter((k) => k.conf >= 90).map((k) => [k.key, k.suggested])), ...w.projectMap }
  const mapped = applyEdits(assignProjects(mapBase, projectMap, options), w.mapEdits, options)

  // Comparison
  const db = dbFor(seed, w.dataType)
  const compared = compareRows(mapped, db, w.dataType, w.threshold, w.matchOverrides)
  const missing = missingUnits(compared, db, w.dataType)

  // Transformation
  const transformIn = applyEdits(compared, w.transformEdits, options)
  const { rows: transformed, hits: ruleHits } = applyRules(transformIn, w.rules, new Set(w.enabledRules), db)

  // Formatting
  const settings = { dateFormat: w.dateFormat, fixed: w.fixed, valueMap: w.valueMap }
  const formatIn = applyEdits(transformed, w.formatEdits, options)
  const { rows: formatted, checks: formatChecks, invalid } = formatRows(formatIn, fields, settings)

  // Review
  const reviewed = applyReviewFixes(applyEdits(formatted, w.reviewEdits, options), new Set(w.reviewFixes), db)
  const reviewInvalid = formatRows(reviewed, fields, settings).invalid
  const issues = reviewIssues(reviewed, w.dataType, db, reviewInvalid)

  return {
    options, fields, sheetSource, detections, applied, setup, extracted, headers, headerMap, mapBase, projectKeys, projectMap, mapped,
    db, compared, missing, ruleHits, transformIn, transformed, formatIn, formatted, formatChecks, invalid, reviewed, reviewInvalid, issues,
    groups: groupRows(reviewed, w.dataType),
    plans: plansFor(seed, options),
    floorKeys: floorPlanKeys(reviewed, w.dataType),
  }
}

/* ── Status per step — what blocks Next and what's worth a look ─────────── */

export interface StepState { blocking: number; warnings: number; note: string }

const REQUIRED_MAPPED: Record<DataType, FieldKey[]> = { Automatic: ["unitCode", "propertyType", "bua", "price"], Manual: ["propertyType", "bua", "price"] }

export function isSkipped(key: StepKey, p: Pipe) {
  return key === "extraction" && p.sheetSource
}

export function stepStatus(key: StepKey, w: Work, p: Pipe): StepState {
  switch (key) {
    case "setup": {
      const missing = [!w.developerId && "developer", !w.projectIds.length && "projects", !w.saleType && "sale type", !w.categories.length && "categories"].filter(Boolean) as string[]
      const pending = p.detections.flatMap((g) => g.items).filter((i) => !p.applied.has(i.id)).length
      return { blocking: missing.length, warnings: pending, note: missing.length ? `Pick the ${missing.join(", ")}` : pending ? `${pending} cleanup${pending > 1 ? "s" : ""} not applied yet` : "Files are clean" }
    }
    case "extraction": {
      if (p.sheetSource) return { blocking: 0, warnings: 0, note: "Not needed — sheets are already tables" }
      const low = w.confirmedLowConf ? 0 : p.extracted.reduce((n, r) => n + Object.values(r.conf ?? {}).filter((c) => (c ?? 100) < 80).length, 0)
      return { blocking: p.extracted.length ? 0 : 1, warnings: low, note: !p.extracted.length ? "Nothing was extracted" : low ? `${low} low-confidence cell${low > 1 ? "s" : ""} to verify` : `${p.extracted.length} rows extracted` }
    }
    case "mapping": {
      const mappedFields = new Set(Object.values(p.headerMap).filter(Boolean))
      const reqMissing = p.sheetSource ? REQUIRED_MAPPED[w.dataType].filter((f) => !mappedFields.has(f)).length : 0
      const unassigned = p.mapped.filter((r) => !r.projectId).length
      return { blocking: reqMissing + unassigned, warnings: 0, note: reqMissing ? `${reqMissing} required field${reqMissing > 1 ? "s" : ""} not mapped` : unassigned ? `${unassigned} row${unassigned > 1 ? "s" : ""} without a project` : "Every row is mapped and assigned" }
    }
    case "comparison": {
      const review = p.compared.filter((r) => r.match?.status === "review").length
      const matched = p.compared.filter((r) => r.match?.status === "matched").length
      return { blocking: review, warnings: 0, note: review ? `${review} match${review > 1 ? "es" : ""} need your decision` : `${matched} matched · ${p.compared.length - matched} new` }
    }
    case "transformation": {
      const pending = w.rules.filter((r) => !r.custom && (p.ruleHits[r.id]?.length ?? 0) > 0 && !w.enabledRules.includes(r.id)).length
      return { blocking: 0, warnings: pending, note: pending ? `${pending} suggested rule${pending > 1 ? "s" : ""} not applied` : "Rules applied" }
    }
    case "formatting": {
      const unknown = p.formatChecks.reduce((n, c) => n + c.unknown.reduce((m, u) => m + u.rowIds.length, 0), 0)
      const pending = p.formatChecks.filter((c) => c.changes.length && !w.fixed[c.field]).length
      return { blocking: unknown, warnings: pending, note: unknown ? `${unknown} value${unknown > 1 ? "s" : ""} the system can't read` : pending ? `${pending} column${pending > 1 ? "s" : ""} to normalize` : "Every value is in system format" }
    }
    case "review": {
      const blocking = p.issues.filter((i) => i.blocking).reduce((n, i) => n + i.rowIds.length, 0)
      const warnings = p.issues.filter((i) => !i.blocking && !w.ignoredIssues.includes(i.id)).reduce((n, i) => n + i.rowIds.length, 0)
      return { blocking, warnings, note: blocking ? `${blocking} blocking row${blocking > 1 ? "s" : ""}` : warnings ? `${warnings} warning${warnings > 1 ? "s" : ""} to decide` : "No issues" }
    }
    case "plans": {
      const without = p.reviewed.filter((r) => !(w.rowPlans[r.id]?.length)).length
      return { blocking: 0, warnings: without, note: without ? `${without} row${without > 1 ? "s" : ""} without a payment plan` : "Every row has a plan" }
    }
    case "floorplans": {
      const without = p.floorKeys.filter((k) => !w.floorPlans[k.key]).length
      return { blocking: 0, warnings: without, note: without ? `${without} ${p.floorKeys[0] && w.dataType === "Automatic" ? "model" : "row"}${without > 1 ? "s" : ""} without a floor plan` : "Floor plans attached" }
    }
    case "grouping": {
      const without = p.groups.filter((g) => !(w.groupMedia[g.key]?.length)).length
      return { blocking: 0, warnings: without, note: without ? `${without} group${without > 1 ? "s" : ""} without media` : `${p.groups.length} grouped properties ready` }
    }
    case "final": {
      const prior = STEP_KEYS.slice(0, -1).filter((k) => !isSkipped(k, p)).reduce((n, k) => n + stepStatus(k, w, p).blocking, 0)
      return { blocking: prior, warnings: 0, note: prior ? `${prior} blocking item${prior > 1 ? "s" : ""} in earlier steps` : "Ready to ingest" }
    }
  }
}

/* ── AI completion — one click finishes a step ──────────────────────────── */

export interface Catalogs {
  floorPlans: { id: string; unitType: string; bedrooms: number; areaSqm: number }[]
  renders: { id: string }[]
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const join = (parts: (string | false)[]) => parts.filter(Boolean).join(" and ")

export function aiComplete(key: StepKey, w: Work, p: Pipe, cat: Catalogs): { patch: Partial<Work>; summary: string } {
  switch (key) {
    case "setup": {
      const all = p.detections.flatMap((g) => g.items.map((i) => i.id))
      const fresh = p.detections.map((g) => ({ g, n: g.items.filter((i) => !p.applied.has(i.id)).length })).filter((x) => x.n)
      const applied = [...new Set([...w.applied, ...all])]
      const done = fresh.map((x) => `${x.n} ${x.g.title.toLowerCase()}`).join(", ")
      return { patch: { applied }, summary: fresh.length ? `Applied ${plural(fresh.reduce((n, x) => n + x.n, 0), "cleanup")} — ${done}.` : "Files were already clean." }
    }
    case "extraction": {
      const low = p.extracted.reduce((n, r) => n + Object.values(r.conf ?? {}).filter((c) => (c ?? 100) < 80).length, 0)
      return { patch: { confirmedLowConf: true }, summary: low ? `Re-read ${plural(low, "low-confidence cell")} with the high-accuracy model — all values confirmed.` : "Extraction was already confident." }
    }
    case "mapping": {
      const headerMap = { ...w.headerMap }
      let cols = 0
      p.headers.forEach((h) => { const k = headerKey(h.raw); if (h.suggested && headerMap[k] === undefined && p.headerMap[k] !== h.suggested) { headerMap[k] = h.suggested; cols++ } })
      const projectMap = { ...w.projectMap }
      const assigned: string[] = []
      p.projectKeys.forEach((k) => {
        if (!k.suggested || p.projectMap[k.key]) return
        projectMap[k.key] = k.suggested
        assigned.push(`“${k.key}” → ${p.options.find((o) => o.id === k.suggested)?.label ?? k.suggested}`)
      })
      const keysText = assigned.length === 1 ? `${cols ? "assigned" : "Assigned"} ${assigned[0]}` : `${cols ? "assigned" : "Assigned"} ${plural(assigned.length, "project value")}`
      return { patch: { headerMap, projectMap }, summary: cols + assigned.length ? `${join([cols > 0 && `Mapped ${plural(cols, "column")}`, assigned.length > 0 && keysText])}.` : "Mapping was already complete." }
    }
    case "comparison": {
      const overrides = { ...w.matchOverrides }
      let accepted = 0
      let fresh = 0
      p.compared.filter((r) => r.match?.status === "review").forEach((r) => {
        const best = r.match?.candidates?.[0]
        if (best && best.conf >= 65) { overrides[r.id] = best.dbId; accepted++ } else { overrides[r.id] = "new"; fresh++ }
      })
      return { patch: { matchOverrides: overrides }, summary: accepted + fresh ? `${join([accepted > 0 && `Accepted ${plural(accepted, "match", "matches")}`, fresh > 0 && `${accepted ? "marked" : "Marked"} ${fresh} as new`])}.` : "Every row already had a confident match." }
    }
    case "transformation": {
      const on = w.rules.filter((r) => (p.ruleHits[r.id]?.length ?? 0) > 0).map((r) => r.id)
      const fresh = on.filter((id) => !w.enabledRules.includes(id))
      const cells = fresh.reduce((n, id) => n + (p.ruleHits[id]?.length ?? 0), 0)
      return { patch: { enabledRules: [...new Set([...w.enabledRules, ...on])] }, summary: fresh.length ? `Applied ${plural(fresh.length, "rule")} touching ${plural(cells, "row")}.` : "No rules left to apply." }
    }
    case "formatting": {
      const fixed = Object.fromEntries(p.fields.map((f) => [f.key, true]))
      const valueMap = { ...w.valueMap }
      let guessed = 0
      for (const c of p.formatChecks) {
        for (const u of c.unknown) {
          const opts = c.field === "finishing" ? FINISHING_TYPES : c.field === "propertyType" ? PROPERTY_TYPES : null
          if (!opts) continue
          const best = [...opts].sort((a, b) => similarity(u.raw, b) - similarity(u.raw, a))[0]
          valueMap[`${c.field}:${u.raw}`] = similarity(u.raw, best) > 0 ? best : c.field === "finishing" ? "Fully Finished" : best
          guessed++
        }
      }
      const cols = p.formatChecks.filter((c) => c.changes.length && !w.fixed[c.field]).length
      return { patch: { fixed, valueMap }, summary: `Normalized ${plural(cols, "column")}${guessed ? ` and mapped ${plural(guessed, "unknown value")} to the closest system value` : ""}.` }
    }
    case "review": {
      const fixes = new Set(w.reviewFixes)
      p.issues.forEach((i) => { if (i.blocking && i.fix) fixes.add(i.fix.id) })
      // Bedrooms hide in model codes like "B-3B"
      let reviewEdits = w.reviewEdits
      let beds = 0
      p.reviewed.forEach((r) => {
        if (!isBlank(r.v.bedrooms)) return
        const m = txt(r.v.model).match(/(\d)B\b/)
        if (m) { reviewEdits = { ...reviewEdits, set: { ...reviewEdits.set, [r.id]: { ...reviewEdits.set[r.id], bedrooms: Number(m[1]) } } }; beds++ }
      })
      const fixed = [...fixes].filter((f) => !w.reviewFixes.includes(f)).length
      const noIssues = !p.issues.length
      return { patch: { reviewFixes: [...fixes], reviewEdits }, summary: fixed + beds ? `${join([fixed > 0 && `Applied ${plural(fixed, "auto-fix", "auto-fixes")}`, beds > 0 && `${fixed ? "read" : "Read"} bedrooms from ${plural(beds, "model code")}`])}.` : noIssues ? "No issues found." : "Nothing AI can fix safely — the rest needs your call." }
    }
    case "plans": {
      const rowPlans = { ...w.rowPlans }
      let n = 0
      p.reviewed.forEach((r) => {
        if (rowPlans[r.id]?.length) return
        const ids = p.plans.filter((pl) => pl.source === "Detected" || p.options.find((o) => o.id === r.projectId)?.mainId === pl.mainId).map((pl) => pl.id)
        if (ids.length) { rowPlans[r.id] = ids; n++ }
      })
      const detected = p.plans.filter((x) => x.source === "Detected").length
      return { patch: { rowPlans }, summary: n ? `Linked ${detected ? plural(detected, "detected plan") : "the project's plans"} to ${plural(n, "row")} by project.` : "Every row already had plans." }
    }
    case "floorplans": {
      const floorPlans = { ...w.floorPlans }
      let n = 0
      p.floorKeys.forEach((k) => {
        if (floorPlans[k.key]) return
        const best = [...cat.floorPlans].sort((a, b) => {
          const score = (f: Catalogs["floorPlans"][number]) => (f.bedrooms === (k.beds ?? -1) ? 0 : 200) + Math.abs(f.areaSqm - (k.area ?? f.areaSqm))
          return score(a) - score(b)
        })[0]
        if (best) { floorPlans[k.key] = best.id; n++ }
      })
      return { patch: { floorPlans }, summary: n ? `Matched floor plans to ${plural(n, w.dataType === "Automatic" ? "model" : "row")} by bedrooms and area.` : "Floor plans were already attached." }
    }
    case "grouping": {
      const groupMedia = { ...w.groupMedia }
      let n = 0
      p.groups.forEach((g) => {
        if (groupMedia[g.key]?.length || !cat.renders.length) return
        const start = hashStr(g.key) % cat.renders.length
        groupMedia[g.key] = [0, 1, 2].map((i) => cat.renders[(start + i) % cat.renders.length].id)
        n++
      })
      return { patch: { groupMedia }, summary: n ? `Picked renders for ${plural(n, "grouped property", "grouped properties")} from the project's media.` : "Every group already has media." }
    }
    case "final":
      return { patch: {}, summary: "Checked everything — nothing left to fix." }
  }
}

/** Opening an entry mid-flow: earlier steps are completed the way AI would have. */
export function fastForward(seed: EntrySeed, w: Work, toIndex: number, cat: Catalogs): Work {
  let cur = w
  for (let i = 0; i < toIndex && i < STEP_KEYS.length - 1; i++) {
    const key = STEP_KEYS[i]
    const p = computePipeline(seed, cur)
    if (isSkipped(key, p)) continue
    cur = { ...cur, ...aiComplete(key, cur, p, cat).patch }
  }
  return cur
}

export const stageIndex = (stage: EntryStage) => (stage === "Finalized" ? STEP_KEYS.length - 1 : Math.max(0, STEP_KEYS.findIndex((k) => STEP_LABEL[k] === stage)))

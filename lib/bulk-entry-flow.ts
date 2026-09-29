/* ────────────────────────────────────────────────────────────────────────────
   Bulk entry flow — the 13 stages, the entry's decisions (Work), the whole
   pipeline as one pure function, per-stage status (what completes, what
   pauses) and AI completion per stage. The same AI functions drive Autopilot
   and fast-forward entries opened mid-flow.
   ──────────────────────────────────────────────────────────────────────────── */

import {
  REQUIRED_FIELDS, applyActions, assignProjects, buildCards, buildingOf, changeSummary, compareCards, currentCards, dbFor,
  detectCleanups, duplicateCodes, extractRows, fieldsFor, filtersText, fmtInt, guessLookup, hashStr, headerCatalog, identify,
  isBlank, isSheetSource, linkPlans, mapStacked, matchRows, matchesFilters, missingRequired, missingUnits, modelGroups,
  normCode, planChecks, plural, priceRanges, projectOptions, resolveFloorPlans, reviewIssues, stackTabs, standardizeRows,
  suggestProjectRules, tabTables, txt, assignMedia, AUTO_CLEANUPS,
  type Action, type Card, type CardMedia, type Cell, type ChangeSummary, type CleanupGroup, type DataType, type DateFmt,
  type DbUnit, type EntrySeed, type FieldDef, type FieldKey, type GridTable, type GroupConfig, type HeaderInfo, type Issue,
  type KnownValue, type LibPlan, type LiveTab, type MissingDecision, type ModelGroup, type PlanCheck, type PlanDraft,
  type PlanHow, type PoolImage, type ProjOption, type ProjectRule, type RowFilter, type StageRef, type URow, type ValueIssue,
} from "@/lib/bulk-ingestion"
import {
  developerSettings, floorLibrary, groupConfigFor, mappingTemplate, modelRules, projectAliases, projectData, renderPool,
  savedActions, savedProjectRules, vocabulary, isNotRepresentative,
} from "@/lib/ingestion-rules-mock"
import type { EntryFile, EntryStage, IngestionEntry, PropertyCategory, SaleType } from "@/lib/ingestion-mock"
import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"
import { launchesForProject } from "@/lib/launches-mock"

/* ── Stages ──────────────────────────────────────────────────────────────── */

export type StageKey = StageRef
export const STAGE_KEYS: StageKey[] = ["setup", "extraction", "mapping", "projects", "transform", "standard", "matching", "plans", "review", "floor", "grouping", "media", "final"]
export const STAGE_LABEL: Record<StageKey, EntryStage> = {
  setup: "Initial Setup", extraction: "Extraction", mapping: "Mapping", projects: "Project Assignment", transform: "Transformation",
  standard: "Standardization", matching: "Matching", plans: "Payment Plans", review: "Review", floor: "Floor Plans",
  grouping: "Grouping", media: "Media", final: "Final Check",
}
export const STAGE_SHORT: Record<StageKey, string> = {
  setup: "Setup", extraction: "Extraction", mapping: "Mapping", projects: "Projects", transform: "Transform", standard: "Standardize",
  matching: "Matching", plans: "Plans", review: "Review", floor: "Floor plans", grouping: "Grouping", media: "Media", final: "Final check",
}
export const STAGE_GOAL: Record<StageKey, string> = {
  setup: "Right developer, projects, sale type, entry type and coverage — every file cleaned before it's read.",
  extraction: "Every PDF, photo and message becomes rows in IMS fields — checked against the source.",
  mapping: "One table with IMS field names, whatever the number of files and tabs.",
  projects: "A project (and phase) for every row, from the projects chosen in Initial Setup.",
  transform: "Fix and complete the data through saved, reusable actions.",
  standard: "Every value an IMS value — finishing, delivery, dates, types, numbers.",
  matching: "Each row's twin in IMS and its status, plus the records this entry no longer carries.",
  plans: "Every unit has a price in range, each linked to exactly one plan.",
  review: "The data is right before any floor plan, grouping or media work.",
  floor: "The right floor plan on every unit or card, consistent with past entries.",
  grouping: "Units into listing cards, as they'll appear on the site.",
  media: "Every card has representative images, without redoing them every entry.",
  final: "Consistent with each project's state, missing units decided — then approve.",
}
/** Stage an entry sits in → index. Finalized entries open on Final check, read-only. */
export const stageIndex = (stage: EntryStage) => (stage === "Finalized" ? STAGE_KEYS.length - 1 : Math.max(0, STAGE_KEYS.findIndex((k) => STAGE_LABEL[k] === stage)))

/* ── Work — everything the user (or AI) decided so far ──────────────────── */

export interface Edits { set: Record<string, Partial<Record<FieldKey, Cell>>>; deleted: string[]; added: URow[] }
export const NO_EDITS: Edits = { set: {}, deleted: [], added: [] }

export interface Work {
  developerId: string
  projectIds: string[]
  saleType: SaleType | ""
  dataType: DataType
  categories: PropertyCategory[]
  /** Full inventory — absent units go missing; partial update — absent units stay untouched */
  coverage: "full" | "partial" | ""
  launchId: string
  owner: { name: string; phone: string }
  linkedUnit: string
  addedFiles: EntryFile[]
  /** Removals only — cleanups, dropped tabs/rows/columns/pages/files, text noise */
  applied: string[]
  /** `${fileId}:${tab}` → header row (1-based) set by hand */
  headerRow: Record<string, number>
  /** Only AI-extracted values are edited inline */
  extractEdits: Edits
  /** `${rowId}|${field}` low-confidence cells accepted as read */
  accepted: string[]
  /** Files or pages re-read with the high-accuracy model */
  reread: string[]
  /** header key → field | "" (ignore) | "custom:Name" */
  headerMap: Record<string, string>
  projectRules: ProjectRule[]
  disabledRules: string[]
  dismissedSuggestions: string[]
  actions: Action[]
  editedActions: Record<string, Action>
  actionOrder: string[]
  disabledActions: string[]
  /** "Suggest actions" ran — AI proposals listed as keep / modify / add / drop */
  suggested: boolean
  dismissedProposals: string[]
  /** `${field}:${raw}` → IMS value */
  valueChoices: Record<string, string>
  dateFormat: DateFmt
  threshold: number
  matchOverrides: Record<string, string>
  planOrder: string[]
  planConditions: Record<string, RowFilter[]>
  newPlans: PlanDraft[]
  rowPlans: Record<string, string>
  /** Warnings acknowledged with a reason */
  acked: Record<string, string>
  floorPicks: Record<string, string>
  /** Model groups whose units keep their existing IMS link */
  keepImsLinks: string[]
  groupConfig: GroupConfig | null
  cardsConfirmed: boolean
  perCard: number
  mediaPins: Record<string, string>
  mediaChosen: Record<string, string[]>
  excludedImages: string[]
  statusFixes: Record<string, string>
  missingDecisions: Record<string, MissingDecision>
  publishLaunch: boolean
  approvals: string[]
  /** Decisions AI applied that apply to this entry only until a person confirms them */
  toConfirm: string[]
}

export function initialWork(entry: IngestionEntry, seed: EntrySeed): Work {
  const detections = detectCleanups(seed.files)
  const perUnit = entry.saleType === "Resale" || entry.saleType === "Nawy Now"
  const launch = entry.saleType === "Launch" ? entry.projects.flatMap((p) => launchesForProject(p.id))[0] : undefined
  return {
    developerId: entry.developer?.id ?? "",
    projectIds: entry.projects.map((p) => p.id),
    saleType: entry.saleType,
    dataType: entry.dataType,
    categories: entry.categories,
    coverage: entry.coverage ?? "",
    launchId: launch?.id ?? "",
    owner: perUnit && entry.owner ? entry.owner : { name: "", phone: "" },
    linkedUnit: "",
    addedFiles: [],
    applied: detections.filter((g) => AUTO_CLEANUPS.includes(g.kind)).flatMap((g) => g.items.map((i) => i.id)),
    headerRow: {},
    extractEdits: NO_EDITS,
    accepted: [],
    reread: [],
    headerMap: {},
    projectRules: [],
    disabledRules: [],
    dismissedSuggestions: [],
    actions: [],
    editedActions: {},
    actionOrder: [],
    disabledActions: [],
    suggested: false,
    dismissedProposals: [],
    valueChoices: {},
    dateFormat: "DMY",
    threshold: 80,
    matchOverrides: {},
    planOrder: [],
    planConditions: {},
    newPlans: [],
    rowPlans: {},
    acked: {},
    floorPicks: {},
    keepImsLinks: [],
    groupConfig: null,
    cardsConfirmed: false,
    perCard: 3,
    mediaPins: {},
    mediaChosen: {},
    excludedImages: [],
    statusFixes: {},
    missingDecisions: {},
    publishLaunch: true,
    approvals: [],
    toConfirm: [],
  }
}

/** Inline edits on extracted rows. Editing Project re-resolves the project id from its label. */
export function applyEdits(rows: URow[], e: Edits): URow[] {
  if (!e.deleted.length && !e.added.length && !Object.keys(e.set).length) return rows
  const del = new Set(e.deleted)
  const patch = (r: URow): URow => {
    const s = e.set[r.id]
    if (!s) return r
    return { ...r, v: { ...r.v, ...s }, conf: { ...r.conf, ...Object.fromEntries(Object.keys(s).map((k) => [k, 100])) } }
  }
  return [...rows.filter((r) => !del.has(r.id)).map(patch), ...e.added.filter((r) => !del.has(r.id)).map(patch)]
}
export function editCell(e: Edits, rowId: string, field: FieldKey, value: Cell): Edits {
  return { ...e, set: { ...e.set, [rowId]: { ...e.set[rowId], [field]: value } } }
}
export function addRow(e: Edits, rows: URow[]): Edits {
  const idx = Math.max(0, ...rows.map((r) => r.idx), ...e.added.map((r) => r.idx)) + 1
  return { ...e, added: [...e.added, { id: `new-${idx}`, idx, src: "Added by hand", v: {} }] }
}

/* ── Payment plans read from the sources + the database ─────────────────── */

export function plansFor(seed: EntrySeed, options: ProjOption[], w: Work): PlanDraft[] {
  const main = options.find((o) => !o.isPhase) ?? options[0]
  if (!main) return []
  const out: PlanDraft[] = []
  const add = (p: Omit<PlanDraft, "id" | "mainId" | "mainName">) => {
    if (out.some((x) => x.dp === p.dp && x.years === p.years && x.freq === p.freq && x.source === p.source)) return
    out.push({ ...p, id: `PL-${out.length + 1}`, mainId: main.mainId, mainName: main.mainName })
  }
  const apts: RowFilter = { field: "propertyType", op: "in", value: "Apartment, Duplex, Penthouse, Studio" }
  for (const f of seed.files) {
    if (f.kind === "sheet" && f.tabs?.some((t) => t.name === "Payment Terms")) {
      add({ name: "Standard — 10% DP · 8 years quarterly", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} › Payment Terms`, conditions: [apts] })
      add({ name: "Extended — 5% DP · 10 years monthly", source: "Detected", dp: 5, years: 10, freq: "Monthly", from: `${f.name} › Payment Terms`, conditions: [{ field: "propertyType", op: "is", value: "Townhouse" }] })
      add({ name: "Cash — 12% discount", source: "Detected", dp: 100, years: 0, freq: "Cash", discount: 12, from: `${f.name} › Payment Terms`, conditions: [], manualOnly: true })
    }
    if (f.kind === "text" && f.lines?.some((l) => /payment/i.test(l))) add({ name: "10% DP · 8 years equal installments", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} · L${(f.lines ?? []).findIndex((l) => /payment/i.test(l)) + 1}`, conditions: [] })
    if (f.kind === "pdf") {
      add({ name: "10% DP · 8 years quarterly", source: "Detected", dp: 10, years: 8, freq: "Quarterly", from: `${f.name} · p.4`, conditions: [apts] })
      add({ name: "5% DP · 10 years monthly", source: "Detected", dp: 5, years: 10, freq: "Monthly", from: `${f.name} · p.4`, conditions: [{ field: "propertyType", op: "is", value: "Apartment" }] })
    }
  }
  const mains = [...new Map(options.filter((o) => !o.isPhase).map((o) => [o.mainId, o])).values()]
  mains.forEach((m, i) => {
    out.push({ id: `DB-${50600 + i * 17}`, name: `${m.mainName} — Standard 7 years`, source: "Database", dp: 10, years: 7, freq: "Quarterly", from: "Already on the project", mainId: m.mainId, mainName: m.mainName, conditions: [{ field: "project", op: "contains", value: m.mainName }], manualOnly: true })
  })
  const all = [...out, ...w.newPlans].map((p) => (w.planConditions[p.id] ? { ...p, conditions: w.planConditions[p.id] } : p))
  if (!w.planOrder.length) return all
  return [...w.planOrder.map((id) => all.find((p) => p.id === id)).filter((p): p is PlanDraft => !!p), ...all.filter((p) => !w.planOrder.includes(p.id))]
}

/* ── The pipeline ────────────────────────────────────────────────────────── */

export interface SetupSheet { fileId: string; fileName: string; tab: string; input: GridTable; output: GridTable; header: number; ignored: boolean }
export type HeaderOrigin = "You" | "Template" | "Synonym" | "AI · to confirm" | "Not mapped"
export interface HeaderRow extends HeaderInfo { target: string; origin: HeaderOrigin; pending?: { target: string; conf: number } }
export interface ResolvedAction extends Action { enabled: boolean; hits: string[] }
export interface Proposal { id: string; verb: "keep" | "modify" | "add" | "drop"; action: Action; reason: string }
export interface Consistency { id: string; title: string; detail: string; choices: { id: string; label: string }[] }

export interface Pipe {
  options: ProjOption[]
  mainIds: string[]
  mainNames: Record<string, string>
  devName: string
  fields: FieldDef[]
  sheetOnly: boolean
  skips: Record<StageKey, string | null>
  perUnit: boolean
  // 1
  applied: Set<string>
  detections: CleanupGroup[]
  setup: SetupSheet[]
  // 2
  extracted: URow[]
  lowCells: { rowId: string; field: FieldKey; conf: number }[]
  // 3
  headers: HeaderRow[]
  headerMap: Record<string, string>
  stacked: GridTable
  mapped: URow[]
  requiredMissing: FieldKey[]
  // 4
  db: DbUnit[]
  dbById: Map<string, DbUnit>
  rules: ProjectRule[]
  suggestions: ProjectRule[]
  assigned: URow[]
  // 5
  actions: ResolvedAction[]
  transformed: URow[]
  mandatory: { field: FieldKey; rowIds: string[]; blocking: boolean }[]
  duplicates: string[][]
  proposals: Proposal[]
  showProposals: boolean
  // 6
  standardized: URow[]
  known: KnownValue[]
  unknown: ValueIssue[]
  ambiguous: number
  invalid: Map<string, string>
  // 7
  matched: URow[]
  missing: DbUnit[]
  conflicts: URow[]
  // 8
  plans: PlanDraft[]
  links: Map<string, { planId: string; how: PlanHow }>
  planChecks: PlanCheck[]
  // 9
  issues: Issue[]
  // 10
  library: LibPlan[]
  models: ModelGroup[]
  planOfRow: Map<string, string>
  // 11
  grouped: boolean
  groupCfg: GroupConfig
  groupOrigin: "Saved" | "AI proposal" | "Edited"
  cards: Card[]
  // 12
  pool: PoolImage[]
  media: Record<string, CardMedia>
  inherited: Record<string, string[]>
  // 13
  summary: ChangeSummary
  consistency: Consistency[]
  missingDefault: MissingDecision | null
  missingPct: number
  needsSecond: string[]
}

const toFields = (headers: HeaderInfo[]) => headers
const ORDER: FieldKey[] = ["unitCode", "project", "building", "model", "propertyType", "bedrooms", "bua", "buaTo", "land", "garden", "floor", "finishing", "deliveryType", "deliveryDate", "price", "priceTo"]

export function computePipeline(seed: EntrySeed, w: Work): Pipe {
  const options = projectOptions(w.projectIds.map((id) => ({ id })))
  const mainNames = Object.fromEntries(options.map((o) => [o.mainId, o.mainName]))
  const mainIds = Object.keys(mainNames)
  const devName = PROJECT_DEVELOPERS.find((d) => d.id === w.developerId)?.name ?? ""
  const fields = fieldsFor(w.dataType, options)
  const applied = new Set(w.applied)
  const files = seed.files
  const kept = files.filter((f) => !applied.has(`remove-file:${f.id}`))
  const sheetOnly = isSheetSource(kept.length ? kept : files)
  const perUnit = w.saleType === "Resale" || w.saleType === "Nawy Now"
  const skips: Record<StageKey, string | null> = {
    setup: null,
    extraction: sheetOnly ? "Sheets are already tables — nothing to extract" : null,
    mapping: null,
    projects: w.projectIds.length === 1 ? "One project — every row belongs to it" : null,
    transform: null,
    standard: null,
    matching: null,
    plans: null,
    review: null,
    floor: null,
    grouping: w.dataType === "Manual" ? "Offerings are one card each" : perUnit ? `${w.saleType} lists every unit on its own` : null,
    media: null,
    final: null,
  }

  // 1 · Initial setup
  const detections = detectCleanups(files)
  const setup: SetupSheet[] = files
    .filter((f) => f.kind === "sheet" && !applied.has(`remove-file:${f.id}`))
    .flatMap((f) => (f.tabs ?? []).map((t) => ({ fileId: f.id, fileName: f.name, tab: t.name, ignored: applied.has(`ignore-tab:${f.id}:${t.name}`), ...tabTables(f.id, t, applied, w.headerRow[`${f.id}:${t.name}`]) })))
  const liveTabs: LiveTab[] = setup.filter((s) => !s.ignored).map((s) => ({ fileId: s.fileId, fileName: s.fileName, tab: s.tab, table: s.output }))

  // 2 · Extraction — documents, photos and text only
  const extracted = applyEdits(extractRows(files, applied, new Set(w.reread)), w.extractEdits)
  const accepted = new Set(w.accepted)
  // Confidence is about values that were read — a blank is a missing value, which Transformation's mandatory fields catch
  const lowCells = extracted.flatMap((r) => Object.entries(r.conf ?? {})
    .filter(([k, c]) => (c ?? 100) < 80 && !accepted.has(`${r.id}|${k}`) && !isBlank(r.v[k as FieldKey]))
    .map(([k, c]) => ({ rowId: r.id, field: k as FieldKey, conf: c ?? 0 })))

  // 3 · Mapping — developer template → synonym list → AI for what's new
  const catalog = toFields(headerCatalog(liveTabs))
  const template = mappingTemplate(w.developerId, w.saleType)
  const headers: HeaderRow[] = catalog.map((h) => {
    const mine = w.headerMap[h.key]
    const aiPick = w.toConfirm.includes(`header:${h.key}`)
    if (mine !== undefined) return { ...h, target: mine, origin: aiPick ? "AI · to confirm" : mine ? "You" : "Not mapped" }
    if (template[h.key]) return { ...h, target: template[h.key], origin: "Template" }
    if (h.suggested && h.conf >= 90) return { ...h, target: h.suggested, origin: "Synonym" }
    const pending = h.suggested ? { target: h.suggested as string, conf: h.conf + 8 } : { target: `custom:${h.raw.replace(/\s+/g, " ").trim()}`, conf: 81 }
    return { ...h, target: "", origin: "Not mapped", pending }
  })
  const headerMap = Object.fromEntries(headers.map((h) => [h.key, h.target]))
  const stacked = stackTabs(liveTabs)
  const mapped = [...mapStacked(stacked, headerMap), ...extracted].map((r, i) => ({ ...r, idx: i + 1 }))
  const targets = new Set(Object.values(headerMap))
  const requiredMissing = liveTabs.length ? REQUIRED_FIELDS[w.dataType].filter((f) => !targets.has(f)) : []

  // 4 · Project assignment — name match → saved rules → known codes → AI
  const allDb = dbFor(seed, w.dataType)
  // Resale / Nawy Now match the owner's own listings; everything else the projects' inventory
  const db = perUnit ? allDb.filter((d) => hashStr(d.id) % 3 === 0 || d.projectId === "PRJ-OTHER") : allDb
  const dbById = new Map(db.map((d) => [d.id, d]))
  const single = w.projectIds.length === 1 ? options.find((o) => o.id === w.projectIds[0])?.id ?? null : null
  const rules = [...savedProjectRules(w.developerId, options).filter((r) => !w.disabledRules.includes(r.id)), ...w.projectRules]
  const codes = new Map(db.filter((d) => options.some((o) => o.id === d.projectId)).map((d) => [normCode(d.code), d.projectId]))
  let assigned = assignProjects(mapped, options, { single, aliases: projectAliases(w.developerId), rules, codes, manual: {} })
  const suggestions = single ? [] : suggestProjectRules(assigned, options).filter((s) => !w.dismissedSuggestions.includes(s.id) && !w.projectRules.some((r) => r.id === s.id))
  assigned = assigned.map((r) => {
    if (r.projectId) return r
    const s = suggestions.find((x) => matchesFilters(r, x.filters))
    return s ? { ...r, how: "Suggestion" as const, suggested: s.projectId } : r
  })
  if (w.dataType === "Automatic") assigned = identify(assigned, db, options)

  // 5 · Transformation — saved actions replay first, in order
  const saved = savedActions(w.developerId, devName, w.saleType, w.dataType, options).map((a) => w.editedActions[a.id] ?? a)
  const pool = [...saved, ...w.actions]
  const order = [...w.actionOrder.filter((id) => pool.some((a) => a.id === id)), ...pool.map((a) => a.id).filter((id) => !w.actionOrder.includes(id))]
  const ordered = order.map((id) => pool.find((a) => a.id === id)!)
  const actx = { dbById, projectData }
  const enabled = ordered.filter((a) => !w.disabledActions.includes(a.id))
  const { rows: transformed, hits } = applyActions(assigned, enabled, actx)
  const actions: ResolvedAction[] = ordered.map((a) => ({ ...a, enabled: !w.disabledActions.includes(a.id), hits: w.disabledActions.includes(a.id) ? applyActions(assigned, [a], actx).hits[a.id] : hits[a.id] ?? [] }))
  const mandatory = missingRequired(transformed, w.dataType)
  const duplicates = w.dataType === "Automatic" ? duplicateCodes(transformed) : []
  // AI proposals are always computed (cheap); the stage shows them once "Suggest actions" ran or when nothing is saved
  const proposals = proposeActions(assigned, transformed, actions, w, db)
  const showProposals = w.suggested || !saved.length

  // 6 · Standardization — IMS values from the developer's vocabulary, formats and your choices
  const aiChoices = new Set(w.toConfirm.filter((x) => x.startsWith("value:")).map((x) => x.slice(6)))
  const std = standardizeRows(transformed, fields, { vocab: vocabulary(w.developerId), choices: w.valueChoices, aiChoices, dateFormat: w.dateFormat })

  // 7 · Matching — identity by code (found at stage 4) or similarity, status on final values
  const matched = matchRows(std.rows, db, w.dataType, options, w.threshold, w.matchOverrides)
  const missing = missingUnits(matched, db, options)
  const conflicts = matched.filter((r) => r.conflict && !w.matchOverrides[r.id])

  // 8 · Payment plans — conditions top to bottom, inherited for matched offerings, per unit for resale
  const plans = plansFor(seed, options, w)
  const dbPlanOf = (projectId?: string) => { const m = options.find((o) => o.id === projectId)?.mainId; return plans.find((p) => p.source === "Database" && p.mainId === m)?.id }
  const inherited = new Map<string, string>()
  if (w.dataType === "Manual") matched.forEach((r) => { if (r.match?.dbId && r.match.status !== "review" && r.match.status !== "new") { const p = dbPlanOf(r.projectId); if (p) inherited.set(r.id, p) } })
  const links = linkPlans(matched, plans, w.rowPlans, inherited, perUnit)
  const ranges = priceRanges(allDb, options)
  const checks = planChecks(matched, links, ranges, options, w.saleType === "Launch")

  // 9 · Review — validation rules and history anomalies on the data
  const issues = reviewIssues(matched, { dataType: w.dataType, saleType: w.saleType, developer: devName, db: dbById, ranges, options, invalid: std.invalid, planChecks: checks })

  // 10 · Floor plans — IMS link → model rule → metadata, per model group
  const library = floorLibrary(mainIds)
  const rowMap = new Map(matched.map((r) => [r.id, r]))
  const groups = modelGroups(matched, w.dataType, options)
  const models = resolveFloorPlans(groups, { rows: rowMap, db: dbById, modelRules: modelRules(w.developerId, mainIds), library, picks: w.floorPicks })
    .map((g) => (w.keepImsLinks.includes(g.key) ? { ...g, conflicts: [] } : g))
  const planOfRow = new Map(models.flatMap((g) => (g.planId ? g.rowIds.map((id) => [id, g.planId!] as const) : [])))

  // 11 · Grouping — saved config per project, card identity by the exact set of grouping values
  const grouped = !skips.grouping
  const gc = groupConfigFor(w.developerId, mainIds[0] ?? "")
  const groupCfg = w.groupConfig ?? gc.config
  const groupOrigin: Pipe["groupOrigin"] = w.groupConfig ? "Edited" : gc.origin
  const cards: Card[] = grouped
    ? compareCards(buildCards(matched, groupCfg, planOfRow), currentCards(matched, dbById, gc.config, planOfRow))
    : matched.map((r) => ({
      key: r.id, title: `${txt(r.v.unitCode) ? `${txt(r.v.unitCode)} · ` : ""}${r.v.bedrooms ? `${r.v.bedrooms}BR ` : ""}${txt(r.v.propertyType)}`,
      projectId: r.projectId ?? "", projectLabel: txt(r.v.project), type: txt(r.v.propertyType), beds: typeof r.v.bedrooms === "number" ? r.v.bedrooms : null,
      finishing: txt(r.v.finishing), buaMin: Number(r.v.bua) || 0, buaMax: Number(r.v.buaTo ?? r.v.bua) || 0, priceMin: Number(r.v.price) || 0, priceMax: Number(r.v.priceTo ?? r.v.price) || 0,
      deliveryType: txt(r.v.deliveryType), deliveryDate: txt(r.v.deliveryDate), rowIds: [r.id], planId: planOfRow.get(r.id),
      status: !r.match?.dbId || r.match.status === "new" || r.match.status === "review" ? "New" as const : "Same" as const, from: r.match?.dbId ? [r.match.dbId] : [], currentId: r.match?.dbId,
    }))

  // 12 · Media — the project's render pool spread over the cards; unchanged cards keep their images
  const pool_ = perUnit ? ownerPhotos(matched, mainIds) : [...renderPool(mainIds, mainNames), ...entryRenders(files, applied, mainIds[0] ?? "")]
  const imgPool = pool_.filter((p) => !isNotRepresentative(p.id))
  const inheritedMedia: Record<string, string[]> = {}
  cards.forEach((c) => {
    const cur = c.currentId ?? c.from[0]
    if (!cur || perUnit) return
    const main = options.find((o) => o.id === c.projectId)?.mainId ?? ""
    const renders = imgPool.filter((p) => p.mainId === main && p.kind === "Exterior render" && p.building === buildingOf(c.type))
    const rest = imgPool.filter((p) => p.mainId === main && (p.kind === "Interior render" || p.kind === "Amenity"))
    const h = hashStr(cur)
    if (renders.length) inheritedMedia[cur] = [renders[h % renders.length].id, ...rest.slice(0, 2).map((p) => p.id)]
  })
  const media = perUnit
    ? Object.fromEntries(cards.map((c, i) => { const mine = imgPool.filter((p) => p.caption.includes(`#${i + 1} `)); return [c.key, (w.mediaChosen[c.key]?.length ? { images: w.mediaChosen[c.key], source: "Chosen" } : mine.length ? { images: mine.map((p) => p.id), source: "Owner" } : { images: [], source: "None" }) as CardMedia] }))
    : assignMedia(cards.map((c) => ({ key: c.key, type: c.type, mainId: options.find((o) => o.id === c.projectId)?.mainId ?? mainIds[0] ?? "", inheritFrom: c.status === "Same" || c.status === "Changed" || c.status === "Split" ? c.currentId ?? c.from[0] : c.status === "Merged" ? c.from[0] : undefined })), imgPool, {
      perCard: w.perCard, pins: w.mediaPins, chosen: w.mediaChosen, excluded: new Set(w.excludedImages), inherited: inheritedMedia,
    })

  // 13 · Final check
  const summary = changeSummary(matched, w.coverage === "full" ? missing : [], dbById)
  const covered = db.filter((d) => options.some((o) => o.id === d.projectId)).length || 1
  const missingPct = Math.round((missing.length / covered) * 100)
  const settings = developerSettings(w.developerId)
  const missingDefault: MissingDecision | null = w.coverage === "full" && missingPct <= settings.missingNoDefaultAbove ? settings.missingDefault : null
  const needsSecond = [
    summary.maxPricePct > settings.secondApprovalAbove.priceChangePct && `A price moved ${summary.maxPricePct}% (limit ${settings.secondApprovalAbove.priceChangePct}%)`,
    w.coverage === "full" && missingPct > settings.secondApprovalAbove.missingPct && `${missingPct}% of the covered inventory is missing (limit ${settings.secondApprovalAbove.missingPct}%)`,
  ].filter((x): x is string => !!x)

  return {
    options, mainIds, mainNames, devName, fields, sheetOnly, skips, perUnit,
    applied, detections, setup,
    extracted, lowCells,
    headers, headerMap, stacked, mapped, requiredMissing,
    db, dbById, rules, suggestions, assigned,
    actions, transformed, mandatory, duplicates, proposals, showProposals,
    standardized: std.rows, known: std.known, unknown: std.unknown, ambiguous: std.ambiguous, invalid: std.invalid,
    matched, missing, conflicts,
    plans, links, planChecks: checks,
    issues,
    library, models, planOfRow,
    grouped, groupCfg, groupOrigin, cards,
    pool: imgPool, media, inherited: inheritedMedia,
    summary, consistency: consistencyChecks(options, w, matched.length), missingDefault, missingPct, needsSecond,
  }
}

/** Renders dropped from extraction in Initial setup join the project's pool. */
function entryRenders(files: EntrySeed["files"], applied: Set<string>, mainId: string): PoolImage[] {
  return files.filter((f) => f.image?.kind === "render" && applied.has(`render:${f.id}`)).map((f) => ({
    id: `IMG-entry-${f.id}`, url: f.image?.url ?? "/placeholder.jpg", caption: `${f.name} — from this entry`, kind: "Exterior render" as const, building: "Clubhouse" as const, source: "This entry" as const, mainId,
  }))
}
/** Resale / Nawy Now — the owner's own photos, one set per unit. */
function ownerPhotos(rows: URow[], mainIds: string[]): PoolImage[] {
  const base = renderPool(mainIds.slice(0, 1), {})
  return rows.slice(0, Math.max(0, rows.length - 1)).flatMap((r, i) => [base[4], base[0]].filter(Boolean).map((b, k) => ({ ...b, id: `OWN-${r.id}-${k}`, caption: `Owner photo #${i + 1} ${k ? "exterior" : "living room"}`, source: "Owner" as const })))
}

function consistencyChecks(options: ProjOption[], w: Work, units: number): Consistency[] {
  if (!units) return []
  const out: Consistency[] = []
  const mains = [...new Set(options.map((o) => o.mainId))]
  for (const id of mains) {
    const p = PROJECTS.find((x) => x.id === id)
    if (!p) continue
    if ((w.saleType === "Primary" || w.saleType === "Launch") && (p.primaryStatus === "Sold-Off" || p.primaryStatus === "On-Hold")) {
      out.push({ id: `status:${id}`, title: `${p.name} is ${p.primaryStatus}`, detail: `This entry brings ${plural(units, "available unit")}.`, choices: [{ id: "keep", label: `Keep the units ${p.primaryStatus === "Sold-Off" ? "Sold out" : "on hold"}` }, { id: "on-sale", label: "Set the project On-Sale" }] })
    }
    if (p.listingStatus === "Hidden") {
      out.push({ id: `listing:${id}`, title: `${p.name} is hidden`, detail: "Its units won't show on the site while it stays hidden.", choices: [{ id: "keep", label: "Keep the project hidden" }, { id: "activate", label: "Set the project Active" }] })
    }
    if (p.entryType !== w.dataType && (w.saleType === "Primary" || w.saleType === "Launch")) {
      out.push({
        id: `type:${id}`, title: w.dataType === "Automatic" ? `${p.name} lists offerings today` : `${p.name} lists units with codes today`,
        detail: w.dataType === "Automatic" ? "This entry brings units with codes — the entry type switches to Automatic." : "This entry brings offerings without codes for a project listed by unit.",
        choices: w.dataType === "Automatic" ? [{ id: "replace", label: "Replace the offerings with units" }, { id: "keep", label: "Keep both for now" }] : [{ id: "keep", label: "Keep the units, skip the offerings" }, { id: "switch", label: "Switch the project to offerings" }],
      })
    }
  }
  return out
}

/* ── AI proposals for Transformation — keep / modify / add / drop against the saved set ── */

function proposeActions(before: URow[], after: URow[], actions: ResolvedAction[], w: Work, db: DbUnit[]): Proposal[] {
  const out: Proposal[] = []
  const scope = { developer: "", saleType: w.saleType, entryType: w.dataType }
  const has = (id: string) => actions.some((a) => a.id === id)
  for (const a of actions.filter((x) => x.origin === "saved")) {
    if (a.hits.length) out.push({ id: `keep:${a.id}`, verb: "keep", action: a, reason: `Changed ${plural(a.hits.length, "row")} in this layout` })
    else out.push({ id: `drop:${a.id}`, verb: "drop", action: a, reason: "Changes nothing in this layout — switch it off for this entry" })
  }
  const dups = duplicateCodes(after)
  if (dups.length && !has("ai-dedupe")) out.push({ id: "add:ai-dedupe", verb: "add", reason: `${plural(dups.length, "unit code")} appear twice`, action: { id: "ai-dedupe", kind: "dedupe", keep: "latest", title: "Keep the latest row per unit code", detail: "Duplicate codes from re-sent rows", scope, origin: "ai" } })
  const noPrice = after.filter((r) => (Number(r.v.price) || 0) <= 0 && !txt(r.v.price).match(/[1-9]/) && r.dbId)
  if (noPrice.length && !has("ai-lookup-price")) out.push({ id: "add:ai-lookup-price", verb: "add", reason: `${plural(noPrice.length, "unit")} with a zero or blank price match an IMS unit`, action: { id: "ai-lookup-price", kind: "lookup", lookup: "unit", fields: ["price"], title: "Blank or zero price → the matched IMS unit's price", detail: "Only where the sheet has no usable price", scope, origin: "ai" } })
  const towers = after.filter((r) => /^tower\s+\d/i.test(txt(r.v.building)))
  if (towers.length && !has("ai-tower")) out.push({ id: "add:ai-tower", verb: "add", reason: `IMS writes buildings as T1, T2 — ${plural(towers.length, "row")} say “Tower 1”`, action: { id: "ai-tower", kind: "replace", field: "building", find: "Tower ", replace: "T", title: "Building “Tower 1” → “T1”", detail: "Matches how IMS names these buildings", scope, origin: "ai" } })
  const noDelivery = after.filter((r) => isBlank(r.v.deliveryDate) && r.v.deliveryType !== "Ready to Move" && !/ready|immediate/i.test(txt(r.v.deliveryDate)))
  if (noDelivery.length && !has("ai-delivery") && !actions.some((a) => a.lookup === "project")) out.push({ id: "add:ai-delivery", verb: "add", reason: `${plural(noDelivery.length, "off-plan row")} without a delivery date`, action: { id: "ai-delivery", kind: "lookup", lookup: "project", fields: ["deliveryDate"], filters: [{ field: "deliveryDate", op: "blank" }], title: "Blank delivery date → the project's", detail: "Project delivery from IMS", scope, origin: "ai" } })
  if (!actions.some((a) => a.origin === "saved")) {
    // A developer with no history — AI proposes the whole set from sample rows
    const splitNeeded = before.some((r) => /\d\s*br/i.test(txt(r.v.propertyType)))
    if (splitNeeded) out.push({ id: "add:ai-type-beds", verb: "add", reason: "Some types carry the bedrooms — “Apartment 3BR”", action: { id: "ai-type-beds", kind: "split", split: "type-beds", field: "propertyType", title: "Split bedrooms out of the type", detail: "“Apartment 3BR” → Apartment · 3", scope, origin: "ai" } })
    if (before.some((r) => /ready|immediate/i.test(txt(r.v.deliveryDate)))) out.push({ id: "add:ai-delivery-type", verb: "add", reason: "Delivery says “Ready” on some rows", action: { id: "ai-delivery-type", kind: "formula", formula: "delivery-type", field: "deliveryType", title: "Delivery type from the delivery text", detail: "“Ready” → Ready to Move; dates → Off Plan", scope, origin: "ai" } })
    if (before.some((r) => { const p = Number(txt(r.v.price).replace(/,/g, "")); return p > 0 && p < 150_000 })) out.push({ id: "add:ai-per-sqm", verb: "add", reason: "A price looks like a price per m²", action: { id: "ai-per-sqm", kind: "formula", formula: "per-sqm", field: "price", filters: [{ field: "price", op: "lt", value: "150000" }], title: "Price per m² → total price", detail: "Prices under 150,000 × BUA", scope, origin: "ai" } })
    if (db.length && w.dataType === "Automatic") out.push({ id: "add:ai-lookup-unit", verb: "add", reason: "Matched units hold Land, Garden and Floor", action: { id: "ai-lookup-unit", kind: "lookup", lookup: "unit", fields: ["land", "garden", "floor", "model", "building"], title: "Fill blanks from the matched IMS unit", detail: "Land, Garden, Floor, Model, Building", scope, origin: "ai" } })
  }
  return out.filter((p) => !w.dismissedProposals.includes(p.id))
}

/* ── Status per stage — what completes it and what pauses it ────────────── */

export interface StageState { blocking: number; warnings: number; note: string }

export const isSkipped = (key: StageKey, p: Pipe) => !!p.skips[key]
const s = (blocking: number, warnings: number, note: string): StageState => ({ blocking, warnings, note })

export function stageStatus(key: StageKey, w: Work, p: Pipe): StageState {
  if (p.skips[key]) return s(0, 0, p.skips[key]!)
  switch (key) {
    case "setup": {
      const missing = [
        !w.developerId && "the developer", !w.projectIds.length && "projects", !w.saleType && "the sale type", !w.categories.length && "categories",
        !w.coverage && "the coverage", w.saleType === "Launch" && !w.launchId && "the launch record", p.perUnit && !w.owner.name && "the owner",
        w.saleType === "Nawy Now" && !w.linkedUnit && "the linked resale unit",
      ].filter(Boolean) as string[]
      const pending = p.detections.flatMap((g) => g.items).filter((i) => !p.applied.has(i.id)).length
      return s(missing.length, pending, missing.length ? `Set ${missing.join(", ")}` : pending ? `${plural(pending, "cleanup")} suggested` : "Files are clean")
    }
    case "extraction": {
      const low = p.lowCells.length
      return s(low + (p.extracted.length ? 0 : 1), 0, !p.extracted.length ? "Nothing was extracted" : low ? `${plural(low, "low-confidence cell")} to check` : `${plural(p.extracted.length, "row")} extracted and checked`)
    }
    case "mapping": {
      const unsure = p.headers.filter((h) => h.pending).length
      const req = p.requiredMissing.length
      return s(req + unsure, 0, req ? `${plural(req, "required field")} not mapped` : unsure ? `${plural(unsure, "new header")} to confirm` : p.headers.length ? "Every header is mapped" : "Extracted data arrives mapped")
    }
    case "projects": {
      const none = p.assigned.filter((r) => !r.projectId).length
      return s(none, 0, none ? `${plural(none, "row")} without a project` : "Every row has a project")
    }
    case "transform": {
      const blank = p.mandatory.filter((m) => m.blocking).reduce((n, m) => n + m.rowIds.length, 0)
      const dups = p.duplicates.length
      const soft = p.mandatory.filter((m) => !m.blocking).reduce((n, m) => n + m.rowIds.length, 0)
      const note = blank || dups ? [blank && `${plural(blank, "required blank")}`, dups && `${plural(dups, "duplicate code")}`].filter(Boolean).join(" · ") : soft ? `${plural(soft, "optional blank")} left` : "No blocking field check after the replay"
      return s(blank + dups, soft, note)
    }
    case "standard": {
      const unknown = p.unknown.reduce((n, u) => n + u.rowIds.length, 0)
      const ai = w.toConfirm.filter((x) => x.startsWith("value:")).length
      return s(unknown, ai, unknown ? `${plural(p.unknown.length, "value")} not in IMS yet` : ai ? `${plural(ai, "AI choice")} to confirm` : "Every value is an IMS value")
    }
    case "matching": {
      const review = p.matched.filter((r) => r.match?.status === "review").length
      const conflicts = p.conflicts.length
      const c = p.summary
      return s(review + conflicts, 0, review || conflicts ? [review && `${plural(review, "uncertain match", "uncertain matches")}`, conflicts && `${plural(conflicts, "code conflict")}`].filter(Boolean).join(" · ") : `${c.fresh} new · ${c.modified} modified · ${c.unmodified} unmodified${c.returned ? ` · ${c.returned} returned` : ""}`)
    }
    case "plans": {
      const errors = p.planChecks.filter((c) => c.severity === "error").reduce((n, c) => n + c.rowIds.length, 0)
      const warns = p.planChecks.filter((c) => c.severity === "warning").reduce((n, c) => n + c.rowIds.length, 0)
      return s(errors, warns, errors ? `${plural(errors, "price")} to fix` : warns ? `${plural(warns, "price")} to look at` : "Every price has exactly one plan")
    }
    case "review": {
      const errors = p.issues.filter((i) => i.severity === "error").reduce((n, i) => n + i.rowIds.length, 0)
      const warns = p.issues.filter((i) => i.severity === "warning" && !w.acked[i.id]).reduce((n, i) => n + i.rowIds.length, 0)
      return s(errors, warns, errors ? `${plural(errors, "error")} to fix` : warns ? `${plural(warns, "warning")} to acknowledge` : "No errors — data is ready")
    }
    case "floor": {
      const none = p.models.filter((g) => !g.planId).length
      const conflicts = p.models.reduce((n, g) => n + g.conflicts.length, 0)
      const optional = p.perUnit
      return s(optional ? 0 : none, (optional ? none : 0) + conflicts, none ? `${plural(none, w.dataType === "Automatic" ? "model" : "card")} without a floor plan` : conflicts ? `${plural(conflicts, "unit")} linked to another plan in IMS` : "Every model has its floor plan")
    }
    case "grouping": {
      const changed = p.cards.filter((c) => c.status !== "Same").length
      const pending = changed && !w.cardsConfirmed ? changed : 0
      return s(pending, 0, pending ? `${plural(changed, "card")} changed vs the site — confirm` : changed ? `${plural(changed, "card change")} confirmed` : "Same cards as the site")
    }
    case "media": {
      const none = p.cards.filter((c) => !p.media[c.key]?.images.length).length
      return s(p.perUnit ? 0 : none, p.perUnit ? none : 0, none ? `${plural(none, "card")} without images` : `${plural(p.cards.length, "card")} with images`)
    }
    case "final": {
      const prior = STAGE_KEYS.slice(0, -1).filter((k) => !isSkipped(k, p)).reduce((n, k) => n + stageStatus(k, w, p).blocking, 0)
      const consistency = p.consistency.filter((c) => !w.statusFixes[c.id]).length
      const undecided = w.coverage === "full" && !p.missingDefault ? p.missing.filter((d) => !w.missingDecisions[d.id]).length : 0
      const second = p.needsSecond.length && !w.approvals.includes("second") ? 1 : 0
      const n = prior + consistency + undecided + second
      const note = prior ? `${plural(prior, "blocking item")} in earlier stages` : consistency ? `${plural(consistency, "project check")} to decide` : undecided ? `${plural(undecided, "missing unit")} to decide` : second ? "Needs a second approval" : "Ready to approve"
      return s(n, 0, note)
    }
  }
}

/* ── Live checks — field checks and validation rules from Mapping on ─────── */

export function liveChecks(p: Pipe, w: Work): { errors: number; warnings: number; issues: Issue[] } {
  const issues = p.issues
  return {
    errors: issues.filter((i) => i.severity === "error").reduce((n, i) => n + i.rowIds.length, 0),
    warnings: issues.filter((i) => i.severity === "warning" && !w.acked[i.id]).reduce((n, i) => n + i.rowIds.length, 0),
    issues,
  }
}

/* ── AI completion — one click finishes a stage (Autopilot uses the same) ── */

export interface Catalogs { floorPlans: LibPlan[] }
export interface AiResult { patch: Partial<Work>; summary: string; question?: string }

const join = (parts: (string | false | 0 | undefined)[]) => parts.filter(Boolean).join(" · ")
const confirm = (w: Work, ids: string[]) => [...new Set([...w.toConfirm, ...ids])]

export function aiComplete(key: StageKey, w: Work, p: Pipe): AiResult {
  switch (key) {
    case "setup": {
      const fresh = p.detections.flatMap((g) => g.items).filter((i) => !p.applied.has(i.id))
      const patch: Partial<Work> = { applied: [...new Set([...w.applied, ...fresh.map((i) => i.id)])] }
      const guessed: string[] = []
      // Coverage — the developer's past entries were full inventories; applied for this entry until confirmed
      if (!w.coverage && p.sheetOnly) { patch.coverage = "full"; guessed.push("coverage") }
      if (w.saleType === "Launch" && !w.launchId) { const l = w.projectIds.flatMap((id) => launchesForProject(id))[0]; if (l) { patch.launchId = l.id; guessed.push("launch") } }
      if (p.perUnit && !w.owner.name) { patch.owner = { name: "Owner from the WhatsApp contact", phone: "" }; guessed.push("owner") }
      if (w.saleType === "Nawy Now" && !w.linkedUnit) { patch.linkedUnit = `RS-${2400 + (hashStr(w.developerId + w.projectIds.join()) % 500)}`; guessed.push("linked") }
      if (guessed.length) patch.toConfirm = confirm(w, guessed)
      const stillMissing = !w.coverage && !patch.coverage
      return { patch, summary: join([fresh.length && `Applied ${plural(fresh.length, "cleanup")}`, patch.coverage && "set coverage to Full inventory", patch.launchId && "picked the project's launch", patch.owner && "took the owner from the WhatsApp contact", patch.linkedUnit && "linked the owner's resale unit"]) || "Files were already clean", question: stillMissing ? "Is this the projects' full inventory or a partial update?" : undefined }
    }
    case "extraction": {
      // Values read correctly but not IMS values (e.g. "Premium finish") get the closest IMS value; the rest are re-read
      let edits = w.extractEdits
      const guessed: string[] = []
      const unreadable: string[] = []
      for (const c of p.lowCells) {
        const r = p.extracted.find((x) => x.id === c.rowId)
        if (!r) continue
        if (c.field === "finishing" || c.field === "propertyType") {
          const g = guessLookup(c.field, txt(r.v[c.field]))
          if (g) { edits = editCell(edits, r.id, c.field, g.value); guessed.push(`extract:${r.id}|${c.field}`) }
          else unreadable.push(`${r.id}|${c.field}`)
        }
      }
      const files = [...new Set(p.lowCells.filter((c) => c.field !== "finishing" && c.field !== "propertyType").map((c) => p.extracted.find((r) => r.id === c.rowId)?.fileId).filter((x): x is string => !!x))]
      return {
        patch: { reread: [...new Set([...w.reread, ...files])], extractEdits: edits, toConfirm: confirm(w, guessed) },
        summary: join([files.length && `Re-read ${plural(files.length, "file")} with the high-accuracy model`, guessed.length && `set ${plural(guessed.length, "value")} to the closest IMS value`]) || "Extraction was already confident",
        question: unreadable.length ? `${plural(unreadable.length, "cell")} can't be read with confidence` : undefined,
      }
    }
    case "mapping": {
      const pend = p.headers.filter((h) => h.pending)
      const headerMap = { ...w.headerMap, ...Object.fromEntries(pend.map((h) => [h.key, h.pending!.target])) }
      return { patch: { headerMap, toConfirm: confirm(w, pend.map((h) => `header:${h.key}`)) }, summary: pend.length ? `Mapped ${plural(pend.length, "new header")} — ${pend.map((h) => `“${h.raw}”`).join(", ")}` : "Every header was already mapped", question: p.requiredMissing.length && !pend.length ? `${plural(p.requiredMissing.length, "required field")} have no column` : undefined }
    }
    case "projects": {
      const acc = p.suggestions
      return {
        patch: { projectRules: [...w.projectRules, ...acc], toConfirm: confirm(w, acc.map((r) => `rule:${r.id}`)) },
        summary: acc.length ? `Added ${plural(acc.length, "project rule")} — ${acc.map((r) => `${filtersText(r.filters)} → ${p.options.find((o) => o.id === r.projectId)?.label}`).join("; ")}` : "Every row already had a project",
        question: !acc.length && p.assigned.some((r) => !r.projectId) ? `${plural(p.assigned.filter((r) => !r.projectId).length, "row")} have no project` : undefined,
      }
    }
    case "transform": {
      const adds = p.proposals.filter((x) => x.verb === "add")
      const drops = p.proposals.filter((x) => x.verb === "drop")
      const patch: Partial<Work> = {
        suggested: true,
        actions: [...w.actions, ...adds.map((x) => x.action)],
        disabledActions: [...new Set([...w.disabledActions, ...drops.map((x) => x.action.id)])],
        toConfirm: confirm(w, adds.map((x) => `action:${x.action.id}`)),
      }
      return { patch, summary: adds.length || drops.length ? join([adds.length && `Added ${plural(adds.length, "action")} — ${adds.map((x) => x.action.title).join("; ")}`, drops.length && `switched off ${plural(drops.length, "unused action")}`]) : "Saved actions already cover this layout" }
    }
    case "standard": {
      const choices = { ...w.valueChoices }
      const ids: string[] = []
      for (const u of p.unknown) {
        const g = u.suggestion ?? guessLookup(u.field, u.raw)
        if (!g) continue
        choices[`${u.field}:${u.raw}`] = g.value
        ids.push(`value:${u.field}:${u.raw}`)
      }
      const left = p.unknown.length - ids.length
      return { patch: { valueChoices: choices, toConfirm: confirm(w, ids) }, summary: ids.length ? `Chose IMS values for ${plural(ids.length, "raw value")} — ${p.unknown.filter((u) => choices[`${u.field}:${u.raw}`]).slice(0, 3).map((u) => `“${u.raw}” → ${choices[`${u.field}:${u.raw}`]}`).join(", ")}` : "Every value was already an IMS value", question: left ? `${plural(left, "value")} need a person — no safe IMS match` : undefined }
    }
    case "matching": {
      const overrides = { ...w.matchOverrides }
      const ids: string[] = []
      p.matched.filter((r) => r.match?.status === "review").forEach((r) => { const best = r.match?.candidates?.[0]; overrides[r.id] = best && best.conf >= 65 ? best.dbId : "new"; ids.push(`match:${r.id}`) })
      p.conflicts.forEach((r) => { overrides[r.id] = "new"; ids.push(`match:${r.id}`) })
      return { patch: { matchOverrides: overrides, toConfirm: confirm(w, ids) }, summary: ids.length ? `Decided ${plural(ids.length, "uncertain match", "uncertain matches")}` : "Every row already had a confident match" }
    }
    case "plans": {
      const rowPlans = { ...w.rowPlans }
      const noPlan = p.planChecks.find((c) => c.id === "no-plan")?.rowIds ?? []
      noPlan.forEach((id) => { const r = p.matched.find((x) => x.id === id); const m = p.options.find((o) => o.id === r?.projectId)?.mainId; const plan = p.plans.find((x) => x.source === "Database" && x.mainId === m) ?? p.plans[0]; if (plan) rowPlans[id] = plan.id })
      return { patch: { rowPlans, toConfirm: confirm(w, noPlan.length ? ["plans"] : []) }, summary: noPlan.length ? `Linked ${plural(noPlan.length, "price")} with no plan to the project's standard plan` : "Every price already had a plan" }
    }
    case "review": {
      // Fix in place — each fix lands in the stage that owns it
      const actions = [...w.actions]
      const ids: string[] = []
      const scope = { developer: p.devName, saleType: w.saleType, entryType: w.dataType }
      for (const i of p.issues.filter((x) => x.severity === "error" && x.fix)) {
        if (i.fix!.kind === "dedupe" && !actions.some((a) => a.kind === "dedupe")) { actions.push({ id: "fix-dedupe", kind: "dedupe", keep: "latest", title: "Keep the latest row per unit code", detail: "Fix from Review", scope, origin: "ai" }); ids.push("action:fix-dedupe") }
        if (i.fix!.kind === "lookup" && i.fix!.field && !actions.some((a) => a.id === `fix-lookup-${i.fix!.field}`)) { actions.push({ id: `fix-lookup-${i.fix!.field}`, kind: "lookup", lookup: "unit", fields: [i.fix!.field], title: `Blank ${i.fix!.field === "price" ? "or zero price" : i.fix!.field} → the matched IMS unit's`, detail: "Fix from Review", scope, origin: "ai" }); ids.push(`action:fix-lookup-${i.fix!.field}`) }
      }
      const errorsLeft = p.issues.filter((x) => x.severity === "error" && (!x.fix || x.fix.kind === "fill" || x.fix.kind === "value" || x.fix.kind === "project" || x.fix.kind === "plan"))
      return { patch: { actions, toConfirm: confirm(w, ids) }, summary: ids.length ? `Fixed in place — ${plural(ids.length, "action")} added to Transformation` : p.issues.length ? "No fix is obvious from the rules — the rest needs your call" : "No issues found", question: errorsLeft.length ? `${plural(errorsLeft.reduce((n, x) => n + x.rowIds.length, 0), "error")} need a person` : undefined }
    }
    case "floor": {
      const picks = { ...w.floorPicks }
      const ids: string[] = []
      p.models.filter((g) => !g.planId).forEach((g) => {
        const best = [...p.library].filter((f) => f.mainId === g.mainId).sort((a, b) => (a.type === g.type ? 0 : 100) + (a.beds === (g.beds ?? -1) ? 0 : 50) + Math.abs(a.area - (g.area ?? a.area)) - ((b.type === g.type ? 0 : 100) + (b.beds === (g.beds ?? -1) ? 0 : 50) + Math.abs(b.area - (g.area ?? b.area))))[0]
        if (best) { picks[g.key] = best.id; ids.push(`floor:${g.key}`) }
      })
      return { patch: { floorPicks: picks, toConfirm: confirm(w, ids) }, summary: ids.length ? `Picked the closest plan for ${plural(ids.length, "model")} by type, bedrooms and area` : "Every model already had its plan" }
    }
    case "grouping": {
      const changed = p.cards.filter((c) => c.status !== "Same").length
      return { patch: { cardsConfirmed: true, toConfirm: confirm(w, changed ? ["cards"] : []) }, summary: changed ? `Accepted ${plural(changed, "card change")} vs the site` : "Cards match the site" }
    }
    case "media": {
      const chosen = { ...w.mediaChosen }
      const none = p.cards.filter((c) => !p.media[c.key]?.images.length)
      const renders = p.pool.filter((x) => x.kind === "Exterior render")
      const given = renders.length ? none : []
      given.forEach((c, i) => { chosen[c.key] = [renders[i % renders.length].id] })
      return { patch: { mediaChosen: chosen, toConfirm: confirm(w, given.length ? ["media"] : []) }, summary: given.length ? `Gave ${plural(given.length, "card")} a render from the pool` : none.length ? "No renders in the pool yet" : `Spread the render pool over ${plural(p.cards.length, "card")}`, question: none.length && !renders.length ? "The project has no renders — upload some or pick the owner's photos" : undefined }
    }
    case "final":
      return { patch: {}, summary: "Final check always waits for a person to approve" }
  }
}

/** Opening an entry mid-flow: earlier stages are completed the way AI would have. */
export function fastForward(seed: EntrySeed, w: Work, toIndex: number): Work {
  let cur = w
  for (let i = 0; i < toIndex && i < STAGE_KEYS.length - 1; i++) {
    const key = STAGE_KEYS[i]
    const p = computePipeline(seed, cur)
    if (isSkipped(key, p)) continue
    cur = { ...cur, ...aiComplete(key, cur, p).patch }
    if (key === "setup" && !cur.coverage) cur = { ...cur, coverage: "full" }
    if (key === "setup" && p.perUnit && !cur.owner.name) cur = { ...cur, owner: { name: "Owner", phone: "" } }
    if (key === "setup" && cur.saleType === "Nawy Now" && !cur.linkedUnit) cur = { ...cur, linkedUnit: "RS-2400" }
    if (key === "setup" && cur.saleType === "Launch" && !cur.launchId) cur = { ...cur, launchId: "new" }
  }
  // Mid-flow entries were worked by a person — nothing is left waiting for confirmation
  return { ...cur, toConfirm: [] }
}

export { fmtInt, ORDER }

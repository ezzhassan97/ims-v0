// Data Quality → Data Quality Reports — runs of validation rules (later:
// format / AI analysis) over a selected set of units. A report snapshots the
// units + rules at creation; whether a violation is still broken is derived
// deterministically from the report's progress, so re-opening a report shows
// "X% had issues at creation, Y% now".

import {
  ISSUE_FIELDS, addPropertyIssues, nextIssueId, unitContext,
  type PropertyIssue, type PropIssueSeverity,
} from "./property-issues-mock"

export type ReportKind = "Validation Rules" | "Format Analysis" | "AI Analysis"
export type ReportEntity = "Properties" | "Projects"

export interface ReportRule {
  id: string // VR-001
  name: string
  description: string
  type: "Warning" | "Blocking"
}

export interface ReportUnit {
  propertyId: string
  detailedPropertyId: string | null
  unitCode: string | null
  developer: { id: string; name: string }
  project: { id: string; name: string }
  phase: { id: string; name: string } | null
}

export interface OpenedIssueRef {
  ruleId: string
  propertyId: string
  issueId: string
}

export interface QualityReport {
  id: string // QR-0001
  kind: ReportKind
  entity: ReportEntity
  createdBy: string
  createdAt: string
  units: ReportUnit[]
  rules: ReportRule[]
  /** 0–100: mock share of the initial violations that have since been fixed.
   *  New reports start at 0; seeded (older) reports carry higher values so the
   *  dynamic "at creation vs now" story is visible. */
  progressPct: number
  /** Issues opened from this report (source System) — mutable. */
  openedIssues: OpenedIssueRef[]
}

// ── Deterministic violation model ─────────────────────────────────────────────
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Does this rule flag this unit? Blocking rules fire less often than warnings. */
export function ruleViolatesUnit(rule: ReportRule, propertyId: string): boolean {
  return hash(rule.id + propertyId) % 100 < (rule.type === "Blocking" ? 16 : 30)
}

/** All (rule × unit) violations of a report — snapshot at creation. */
export function reportViolations(r: QualityReport): { rule: ReportRule; unit: ReportUnit }[] {
  const out: { rule: ReportRule; unit: ReportUnit }[] = []
  for (const rule of r.rules) for (const unit of r.units) {
    if (ruleViolatesUnit(rule, unit.propertyId)) out.push({ rule, unit })
  }
  return out
}

/** Is this violation fixed by now? Derived from the report's progress. */
export function violationFixed(r: QualityReport, ruleId: string, propertyId: string): boolean {
  return hash(r.id + ruleId + propertyId) % 100 < r.progressPct
}

export interface ReportStats {
  totalUnits: number
  initialUnits: number // units with ≥1 violation at creation
  initialBlocking: number
  initialWarning: number
  nowUnits: number // units still violating something
  nowBlocking: number
  nowWarning: number
  initialPct: number
  nowPct: number
  clean: boolean
}

export function reportStats(r: QualityReport): ReportStats {
  const initial = new Set<string>(), iBlock = new Set<string>(), iWarn = new Set<string>()
  const now = new Set<string>(), nBlock = new Set<string>(), nWarn = new Set<string>()
  for (const { rule, unit } of reportViolations(r)) {
    initial.add(unit.propertyId)
    ;(rule.type === "Blocking" ? iBlock : iWarn).add(unit.propertyId)
    if (!violationFixed(r, rule.id, unit.propertyId)) {
      now.add(unit.propertyId)
      ;(rule.type === "Blocking" ? nBlock : nWarn).add(unit.propertyId)
    }
  }
  const pct = (n: number) => (r.units.length ? Math.round((n / r.units.length) * 100) : 0)
  return {
    totalUnits: r.units.length,
    initialUnits: initial.size, initialBlocking: iBlock.size, initialWarning: iWarn.size,
    nowUnits: now.size, nowBlocking: nBlock.size, nowWarning: nWarn.size,
    initialPct: pct(initial.size), nowPct: pct(now.size),
    clean: now.size === 0,
  }
}

// ── Opening issues from a report ──────────────────────────────────────────────
// Each still-broken (rule × unit) violation of the picked units becomes a
// PropertyIssue with Reported By Type = System.
const RULE_FIELD_POOL = ISSUE_FIELDS.filter((f) => f.kind === "value")
export function ruleField(rule: ReportRule) {
  return RULE_FIELD_POOL[hash(rule.id) % RULE_FIELD_POOL.length]
}

export function openIssuesFromReport(r: QualityReport, propertyIds: string[]): PropertyIssue[] {
  const now = new Date().toISOString()
  const pick = new Set(propertyIds)
  const already = new Set(r.openedIssues.map((o) => `${o.ruleId}|${o.propertyId}`))
  const created: PropertyIssue[] = []
  for (const { rule, unit } of reportViolations(r)) {
    if (!pick.has(unit.propertyId)) continue
    if (violationFixed(r, rule.id, unit.propertyId)) continue
    if (already.has(`${rule.id}|${unit.propertyId}`)) continue
    const field = ruleField(rule)
    const severity: PropIssueSeverity = rule.type === "Blocking" ? "Critical" : "Medium"
    const issue: PropertyIssue = {
      id: nextIssueId(),
      source: "System",
      severity,
      status: "To Do",
      fieldId: field.id,
      fieldLabel: field.label,
      type: rule.name,
      subtype: null,
      description: `Validation rule "${rule.name}" (${rule.id}) failed — opened from report ${r.id}`,
      expected: "Pass validation rule",
      current: null,
      linkedItems: null,
      reportedBy: "System",
      assignedTo: null,
      developer: unit.developer,
      project: unit.project,
      phase: unit.phase,
      propertyId: unit.propertyId,
      detailedPropertyId: unit.detailedPropertyId ?? `DP-${unit.propertyId.slice(-4)}`,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
      comments: [],
      activity: [{ id: `ACT-${r.id}-${rule.id}-${unit.propertyId}`, kind: "created", actor: "System", at: now, detail: `Issue opened from report ${r.id}` }],
    }
    created.push(issue)
    r.openedIssues.push({ ruleId: rule.id, propertyId: unit.propertyId, issueId: issue.id })
  }
  if (created.length) addPropertyIssues(created)
  return created
}

// ── Store ─────────────────────────────────────────────────────────────────────
const BASE = Date.UTC(2026, 7, 12, 9, 0, 0)
const ts = (daysAgo: number) => new Date(BASE - daysAgo * 24 * 3600000).toISOString()

// Seed rule snapshots (mirror the Validation Rules page mock's tone)
const SEED_RULES: ReportRule[] = [
  { id: "VR-002", name: "Invalid Garden Unit Configuration", description: "Blocks units that claim to have a garden area but are located on upper floors.", type: "Blocking" },
  { id: "VR-005", name: "Zero Built-Up Area", description: "Blocks properties published with a zero or missing built-up area.", type: "Blocking" },
  { id: "VR-008", name: "Bedrooms Without Bathrooms", description: "Blocks units with 3+ bedrooms and no bathrooms recorded.", type: "Blocking" },
  { id: "VR-001", name: "Low Price Warning for New Giza Properties", description: "Warns when a unit price is far below the area's median.", type: "Warning" },
  { id: "VR-006", name: "Delivery Before Launch", description: "Warns when a unit's delivery date is earlier than its project launch date.", type: "Warning" },
  { id: "VR-007", name: "Price Per Meter Outlier", description: "Flags units priced above 400K EGP per square meter for review.", type: "Warning" },
  { id: "VR-009", name: "Duplicate Unit Number", description: "Warns when two units in the same building share a unit number.", type: "Warning" },
]

function seedUnits(start: number, count: number): ReportUnit[] {
  return Array.from({ length: count }, (_, k) => {
    const ctx = unitContext((start + k) % 72)
    return { propertyId: ctx.propertyId, detailedPropertyId: ctx.detailedPropertyId, unitCode: null, developer: ctx.developer, project: ctx.project, phase: ctx.phase }
  })
}

export const QUALITY_REPORTS: QualityReport[] = [
  { id: "QR-0001", kind: "Validation Rules", entity: "Properties", createdBy: "Ezz H.", createdAt: ts(21), units: seedUnits(0, 36), rules: SEED_RULES, progressPct: 100, openedIssues: [] },
  { id: "QR-0002", kind: "Validation Rules", entity: "Properties", createdBy: "Sarah M.", createdAt: ts(14), units: seedUnits(10, 28), rules: SEED_RULES.slice(0, 5), progressPct: 72, openedIssues: [] },
  { id: "QR-0003", kind: "Validation Rules", entity: "Properties", createdBy: "System", createdAt: ts(9), units: seedUnits(20, 44), rules: SEED_RULES, progressPct: 45, openedIssues: [] },
  { id: "QR-0004", kind: "Validation Rules", entity: "Properties", createdBy: "Ahmed K.", createdAt: ts(5), units: seedUnits(5, 18), rules: SEED_RULES.slice(2), progressPct: 20, openedIssues: [] },
  { id: "QR-0005", kind: "Validation Rules", entity: "Properties", createdBy: "Ezz H.", createdAt: ts(1), units: seedUnits(30, 24), rules: SEED_RULES, progressPct: 0, openedIssues: [] },
]

let reportSeq = QUALITY_REPORTS.length
export function nextReportId(): string {
  return `QR-${String(++reportSeq).padStart(4, "0")}`
}
export function addQualityReport(r: QualityReport) {
  QUALITY_REPORTS.unshift(r)
}

// Cross-page handoff: the generate dialog sets this, the reports page consumes
// it on mount to open the new report's details directly.
let pendingReportId: string | null = null
export function setPendingReport(id: string) {
  pendingReportId = id
}
export function consumePendingReport(): string | null {
  const id = pendingReportId
  pendingReportId = null
  return id
}

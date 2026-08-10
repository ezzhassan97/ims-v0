// Data Quality — property data issues (issue-tracking model).
//
// Single source of truth for:
//  - the property FIELD registry (the ~35 reportable fields; categories in the
//    quality taxonomy ARE these fields, incl. Payment Plans / Floor Plans / Render Images)
//  - per-field-kind issue types & subtypes
//  - the mock issue store (~1,500 deterministic issues, mutable so the Report
//    an Issue drawer can add to it within the session)
//
// Field ids intentionally match the detailed-properties table column ids, and
// field labels match the unit-details drawer Field labels — that is what makes
// cell/drawer highlighting work without any mapping tables.

export type PropIssueStatus = "To Do" | "In Progress" | "Resolved" | "Closed" | "Invalid"
// Jira-style priority scale
export type PropIssueSeverity = "Highest" | "High" | "Medium" | "Low" | "Lowest"
// Who raised the issue: quality team, automated validation rules, or a sales agent
export type PropIssueSource = "Data Quality" | "System" | "Sales Agent"
export type FieldKind = "value" | "plans" | "floorPlans" | "images"

export const PROP_ISSUE_SEVERITIES: PropIssueSeverity[] = ["Highest", "High", "Medium", "Low", "Lowest"]
/** Highest/High issues render red (blocking-grade); the rest amber. */
export function isCriticalSeverity(s: PropIssueSeverity): boolean {
  return s === "Highest" || s === "High"
}

export interface IssueField {
  id: string // detailed-table column id where applicable
  label: string // unit-details drawer Field label (used for highlighting)
  group: string
  kind: FieldKind
}

export const ISSUE_FIELDS: IssueField[] = [
  // Placement — the unit itself may be right but sit under the wrong developer/project/phase
  { id: "developer", label: "Developer", group: "Placement", kind: "value" },
  { id: "project", label: "Project", group: "Placement", kind: "value" },
  { id: "phase", label: "Phase", group: "Placement", kind: "value" },
  // Identity
  { id: "unitCode", label: "Unit Code", group: "Identity", kind: "value" },
  { id: "unitNumber", label: "Unit Number", group: "Identity", kind: "value" },
  { id: "unitModel", label: "Unit Model", group: "Identity", kind: "value" },
  { id: "zone", label: "Zone", group: "Identity", kind: "value" },
  // Classification
  { id: "propertyCategory", label: "Category", group: "Classification", kind: "value" },
  { id: "propertyType", label: "Type", group: "Classification", kind: "value" },
  { id: "propertySubType", label: "Sub-type", group: "Classification", kind: "value" },
  { id: "developerType", label: "Developer Type", group: "Classification", kind: "value" },
  { id: "buildingType", label: "Building Type", group: "Classification", kind: "value" },
  { id: "buildingNumber", label: "Building Number", group: "Classification", kind: "value" },
  { id: "floorNumber", label: "Floor Number", group: "Classification", kind: "value" },
  // Dimensions
  { id: "grossBua", label: "Gross BUA", group: "Dimensions", kind: "value" },
  { id: "netBua", label: "Net BUA", group: "Dimensions", kind: "value" },
  { id: "bedrooms", label: "Bedrooms", group: "Dimensions", kind: "value" },
  { id: "bathrooms", label: "Bathrooms", group: "Dimensions", kind: "value" },
  // Pricing & availability
  { id: "price", label: "Price", group: "Pricing", kind: "value" },
  { id: "storagePrice", label: "Storage Price", group: "Pricing", kind: "value" },
  { id: "outdoorPrice", label: "Outdoor Price", group: "Pricing", kind: "value" },
  { id: "availability", label: "Availability", group: "Pricing", kind: "value" },
  // Delivery & finishing
  { id: "deliveryType", label: "Delivery Type", group: "Delivery & Finishing", kind: "value" },
  { id: "deliveryDate", label: "Delivery Date", group: "Delivery & Finishing", kind: "value" },
  { id: "finishingType", label: "Finishing Type", group: "Delivery & Finishing", kind: "value" },
  { id: "serviced", label: "Serviced", group: "Delivery & Finishing", kind: "value" },
  { id: "branded", label: "Branded", group: "Delivery & Finishing", kind: "value" },
  // Areas
  { id: "openRoofArea", label: "Open Roof Area", group: "Areas", kind: "value" },
  { id: "roofAnnexArea", label: "Roof Annex Area", group: "Areas", kind: "value" },
  { id: "gardenArea", label: "Garden Area", group: "Areas", kind: "value" },
  { id: "terraceArea", label: "Terrace Area", group: "Areas", kind: "value" },
  { id: "landArea", label: "Land Area", group: "Areas", kind: "value" },
  { id: "storageArea", label: "Storage Area", group: "Areas", kind: "value" },
  { id: "outdoorArea", label: "Outdoor Area", group: "Areas", kind: "value" },
  { id: "basementArea", label: "Basement Area", group: "Areas", kind: "value" },
  // Parking & views
  { id: "parking", label: "Parking", group: "Parking & Views", kind: "value" },
  { id: "parkingSlots", label: "Parking Slots", group: "Parking & Views", kind: "value" },
  { id: "unitView", label: "Unit View", group: "Parking & Views", kind: "value" },
  { id: "unitOrientation", label: "Unit Orientation", group: "Parking & Views", kind: "value" },
  // Attachments
  { id: "paymentPlans", label: "Payment Plans", group: "Attachments", kind: "plans" },
  { id: "floorPlans", label: "Floor Plans", group: "Attachments", kind: "floorPlans" },
  { id: "images", label: "Render Images", group: "Attachments", kind: "images" },
]

export const FIELD_BY_ID = new Map(ISSUE_FIELDS.map((f) => [f.id, f]))
export const ISSUE_FIELD_GROUPS = Array.from(new Set(ISSUE_FIELDS.map((f) => f.group)))

/** Types (and their subtypes) per field kind — the taxonomy level below the field. */
export const KIND_TAXONOMY: Record<FieldKind, { type: string; subtypes: string[] }[]> = {
  value: [
    { type: "Wrong Value", subtypes: ["Mismatch with developer sheet", "Mismatch with brochure", "Typo / impossible value"] },
    { type: "Missing Value", subtypes: ["Never entered", "Lost in ingestion"] },
    { type: "Outdated Value", subtypes: ["Developer update not reflected", "Stale after re-ingestion"] },
    { type: "Formatting", subtypes: ["Wrong unit / format", "Naming convention"] },
  ],
  plans: [
    { type: "Wrong Plan Terms", subtypes: ["Wrong down payment", "Wrong duration", "Wrong installment %"] },
    { type: "Missing Plan", subtypes: ["Plan on price list not in IMS"] },
    { type: "Duplicate Plan", subtypes: ["Same terms listed twice"] },
    { type: "Outdated Plan", subtypes: ["Expired plan still listed"] },
  ],
  floorPlans: [
    { type: "Wrong Floor Plan", subtypes: ["Belongs to another model", "Wrong orientation"] },
    { type: "Low Quality", subtypes: ["Blurred / unreadable", "Watermarked"] },
    { type: "Missing Floor Plan", subtypes: ["No floor plan uploaded"] },
  ],
  images: [
    { type: "Wrong Render", subtypes: ["Different project / model"] },
    { type: "Low Quality", subtypes: ["Low resolution", "Watermarked"] },
    { type: "Missing Renders", subtypes: ["No render images uploaded"] },
  ],
}

export const ALL_ISSUE_TYPES = Array.from(new Set(Object.values(KIND_TAXONOMY).flat().map((t) => t.type)))
export const ALL_ISSUE_SUBTYPES = Array.from(new Set(Object.values(KIND_TAXONOMY).flat().flatMap((t) => t.subtypes)))

export interface IssueComment {
  id: string
  author: string
  text: string
  at: string
}

export interface PropertyIssue {
  id: string // ISS-000001
  source: PropIssueSource
  severity: PropIssueSeverity
  status: PropIssueStatus
  fieldId: string // category — the property field
  fieldLabel: string
  type: string
  subtype: string
  description: string
  /** What the value SHOULD be — drives manual fixing and auto-resolution checks. */
  expected: string | null
  /** Value at report time (context for data ops). */
  current: string | null
  /** For plans/floorPlans/images fields: the affected item names. */
  linkedItems: string[] | null
  reportedBy: string
  assignedTo: string | null
  developer: { id: string; name: string }
  project: { id: string; name: string }
  phase: { id: string; name: string } | null
  propertyId: string
  detailedPropertyId: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  comments: IssueComment[]
}

export const PROP_ISSUE_STATUSES: PropIssueStatus[] = ["To Do", "In Progress", "Resolved", "Closed", "Invalid"]
/** Statuses that count as "open" for property-view highlighting. */
export const OPEN_STATUSES: PropIssueStatus[] = ["To Do", "In Progress", "Resolved"]

export const STATUS_COLORS: Record<PropIssueStatus, string> = {
  "To Do": "bg-gray-100 text-gray-700 border-gray-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Resolved: "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Invalid: "bg-red-50 text-red-600 border-red-200",
}
export const SEVERITY_COLORS: Record<PropIssueSeverity, string> = {
  Highest: "bg-red-100 text-red-800 border-red-300",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-sky-50 text-sky-700 border-sky-200",
  Lowest: "bg-gray-100 text-gray-600 border-gray-200",
}
export const SOURCE_COLORS: Record<PropIssueSource, string> = {
  System: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Data Quality": "bg-blue-50 text-blue-700 border-blue-200",
  "Sales Agent": "bg-purple-50 text-purple-700 border-purple-200",
}
export const PROP_ISSUE_SOURCES: PropIssueSource[] = ["Data Quality", "System", "Sales Agent"]

export const QUALITY_TEAM = ["Ezz H.", "Sarah M.", "Ahmed K.", "Mariam N.", "Youssef T.", "Nour H."]
export const DATA_OPS_TEAM = ["Karim S.", "Laila A.", "Omar F.", "Hana E.", "Mostafa G."]
export const SALES_AGENTS = ["Tarek B.", "Dina R.", "Sherif M.", "Aya K."]
export const ALL_PEOPLE = [...QUALITY_TEAM, ...DATA_OPS_TEAM]
export const ALL_REPORTERS = ["System", ...QUALITY_TEAM, ...SALES_AGENTS]

// Mirrors mapUnitToProperty in all-properties-page so issues line up with real rows.
export const ROW_COUNT = 72
const DEVELOPERS = ["Palm Hills", "Sodic", "Mountain View", "Emaar"]
const PROJECTS = ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"]
export function unitContext(rowIndex: number) {
  return {
    propertyId: `PRP-${String(rowIndex + 1).padStart(6, "0")}`,
    detailedPropertyId: `DP-${String(4200 + rowIndex * 7)}`,
    developer: { id: `DEV-${(rowIndex % 4) + 1}`, name: DEVELOPERS[rowIndex % 4] },
    project: { id: `PRJ-${100 + (rowIndex % 5)}`, name: PROJECTS[rowIndex % 5] },
    phase: rowIndex % 7 === 0 ? null : { id: `PHS-${200 + (rowIndex % 6)}`, name: `Phase ${1 + (rowIndex % 6)}` },
  }
}

const BASE = Date.UTC(2026, 7, 8, 9, 0, 0) // fixed — SSR/client render identical
const HOUR = 3600000
const ts = (hoursAgo: number) => new Date(BASE - hoursAgo * HOUR).toISOString()

const COMMENT_TEXTS = [
  "Checked against the latest developer price list — confirming the mismatch.",
  "Waiting for the developer to send the updated sheet.",
  "Fixed in the last ingestion run, please verify.",
  "This looks intentional — the developer changed the model spec in May.",
  "Escalated to the account manager.",
  "Re-checked after the fix, value now matches the expected result.",
]

function commentsFor(i: number, status: PropIssueStatus, created: number): IssueComment[] {
  const n = status === "To Do" ? i % 2 : (i % 4) + (status === "Closed" ? 1 : 0)
  return Array.from({ length: Math.min(n, 4) }, (_, k) => ({
    id: `CMT-${i}-${k}`,
    author: ALL_PEOPLE[(i + k * 3) % ALL_PEOPLE.length],
    text: COMMENT_TEXTS[(i + k) % COMMENT_TEXTS.length],
    at: ts(Math.max(1, created - 8 * (k + 1))),
  }))
}

const EXPECTED_SAMPLES: Record<string, [string, string][]> = {
  // fieldId → [current, expected] samples
  developer: [["Sodic", "Palm Hills"]],
  project: [["North Coast Bay", "New Cairo Residences"]],
  phase: [["Phase 2", "Phase 3"], ["—", "Phase 1"]],
  price: [["7,850,000 EGP", "8,100,000 EGP"], ["No price set", "6,450,000 EGP"]],
  bedrooms: [["2", "3"], ["—", "2"]],
  bathrooms: [["1", "2"], ["3", "2"]],
  grossBua: [["120 m²", "134 m²"], ["—", "145 m²"]],
  netBua: [["150 m²", "118 m²"], ["—", "96 m²"]],
  floorNumber: [["1", "3"], ["—", "Ground"]],
  deliveryDate: [["2024", "Q4 2026"], ["—", "Q2 2027"]],
  finishingType: [["Core & Shell", "Fully Finished"], ["—", "Semi Finished"]],
  availability: [["Available", "Sold-Off"], ["Hold", "Available"]],
}

function makeIssue(i: number): PropertyIssue {
  // uneven density: cluster issues on ~60 of the 72 units
  const rowIndex = (i * 7) % ROW_COUNT
  const ctx = unitContext(rowIndex)
  const field = ISSUE_FIELDS[(i * 5) % ISSUE_FIELDS.length]
  const tax = KIND_TAXONOMY[field.kind]
  const t = tax[i % tax.length]
  const subtype = t.subtypes[i % t.subtypes.length]
  const source: PropIssueSource = (["Data Quality", "System", "Sales Agent", "Data Quality", "System"] as const)[i % 5]
  const severity: PropIssueSeverity = PROP_ISSUE_SEVERITIES[[2, 1, 3, 0, 2, 4, 1, 2, 3, 2][i % 10]] // mostly Medium/High/Low
  const status = PROP_ISSUE_STATUSES[[0, 0, 1, 0, 2, 3, 1, 3, 4, 0][i % 10]] // ~40% todo, 20% in prog, 10% resolved, 20% closed, 10% invalid
  const created = 12 + (i % 700) * 3 // spread over ~90 days
  const updated = status === "To Do" ? created : Math.max(2, created - 24 - (i % 48))
  const resolvedAt = status === "Resolved" || status === "Closed" ? Math.max(1, updated - 2) : null
  const closedAt = status === "Closed" ? Math.max(1, (resolvedAt ?? updated) - 6) : null
  const samples = EXPECTED_SAMPLES[field.id]
  const [current, expected] = samples ? samples[i % samples.length] : [null, field.kind === "value" ? "Match developer sheet" : null]
  const linkedItems =
    field.kind === "plans" ? [["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"][i % 4]]
    : field.kind === "floorPlans" ? [`Floor Plan ${(i % 3) + 1}`]
    : field.kind === "images" ? [`Render ${(i % 4) + 1}`]
    : null

  return {
    id: `ISS-${String(i + 1).padStart(6, "0")}`,
    source,
    severity,
    status,
    fieldId: field.id,
    fieldLabel: field.label,
    type: t.type,
    subtype,
    description: source === "System"
      ? `Validation rule flagged ${field.label}: ${t.type.toLowerCase()} (${subtype.toLowerCase()})`
      : `${field.label} — ${t.type.toLowerCase()}: ${subtype.toLowerCase()}`,
    expected,
    current,
    linkedItems,
    reportedBy: source === "System" ? "System" : source === "Sales Agent" ? SALES_AGENTS[i % SALES_AGENTS.length] : QUALITY_TEAM[i % QUALITY_TEAM.length],
    assignedTo: status === "To Do" && i % 4 === 0 ? null : DATA_OPS_TEAM[i % DATA_OPS_TEAM.length],
    ...ctx,
    createdAt: ts(created),
    updatedAt: ts(updated),
    resolvedAt: resolvedAt != null ? ts(resolvedAt) : null,
    closedAt: closedAt != null ? ts(closedAt) : null,
    comments: commentsFor(i, status, created),
  }
}

// ponytail: module-level mutable store — pages read it on mount; Report drawer
// unshifts into it. Survives client-side navigation; resets on reload (mock).
export const PROPERTY_ISSUES: PropertyIssue[] = Array.from({ length: 1500 }, (_, i) => makeIssue(i))

let reportSeq = PROPERTY_ISSUES.length
export function nextIssueId(): string {
  return `ISS-${String(++reportSeq).padStart(6, "0")}`
}
export function addPropertyIssues(issues: PropertyIssue[]) {
  PROPERTY_ISSUES.unshift(...issues)
}

/** propertyId → open issues (To Do / In Progress / Resolved). */
export function openIssuesByProperty(): Map<string, PropertyIssue[]> {
  const m = new Map<string, PropertyIssue[]>()
  for (const iss of PROPERTY_ISSUES) {
    if (!OPEN_STATUSES.includes(iss.status)) continue
    if (!m.has(iss.propertyId)) m.set(iss.propertyId, [])
    m.get(iss.propertyId)!.push(iss)
  }
  return m
}

/** Distribute `total` across n items in whole numbers (first items absorb the remainder). */
export function distribute(total: number, n: number): number[] {
  if (n === 0) return []
  const base = Math.floor(total / n)
  const rem = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

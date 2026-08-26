// Data Quality — property data issues (issue-tracking model).
//
// Single source of truth for:
//  - the property FIELD registry (the reportable fields; categories in the
//    quality taxonomy ARE these fields, incl. Payment Plans / Floor Plans / Render Images)
//  - the FIXED issue taxonomy: per-field types (optional subtypes), each with a
//    priority (Critical…Lowest), a score weight, and an Active/Hidden flag.
//    The catalog itself is not editable — only priority/score/active are
//    (adjusted in Quality Configurations).
//  - the mock issue store (~1,500 deterministic issues with activity logs,
//    mutable so the Report an Issue drawer can add to it within the session)
//
// Field ids intentionally match the detailed-properties table column ids, and
// field labels match the unit-details drawer Field labels — that is what makes
// cell/drawer highlighting work without any mapping tables.

export type PropIssueStatus = "To Do" | "In Progress" | "Resolved" | "Closed" | "Invalid"
// Jira-style priority scale (also used as issue severity — issues inherit the
// priority of their issue type from the quality configuration)
export type PropIssueSeverity = "Critical" | "High" | "Medium" | "Low" | "Lowest"
export type PropIssueSource = "Data Quality" | "System" | "Sales Agent"
export type FieldKind = "value" | "plans" | "floorPlans" | "images" | "amenities"
export type FieldValueType = "text" | "number" | "area" | "currency" | "boolean" | "enum" | "phase"

export const PROP_ISSUE_SEVERITIES: PropIssueSeverity[] = ["Critical", "High", "Medium", "Low", "Lowest"]
/** Critical/High issues render red (blocking-grade); the rest amber. */
export function isCriticalSeverity(s: PropIssueSeverity): boolean {
  return s === "Critical" || s === "High"
}

export interface IssueField {
  id: string // detailed-table column id where applicable
  label: string // unit-details drawer Field label (used for highlighting)
  group: string
  kind: FieldKind
  /** How the field's value renders + which expected-result input to use. */
  valueType?: FieldValueType
  /** Enum fields: the valid values (expected-result dropdown). */
  options?: string[]
  /** Category-level priority — issues on this field inherit it as severity.
   *  (Editable per category in Quality Configurations.) */
  priority?: PropIssueSeverity
}

/** Fields whose value changes over time — they additionally get "Outdated Value". */
export const OUTDATED_FIELD_IDS = new Set(["price", "storagePrice", "outdoorPrice", "deliveryDate", "deliveryType", "finishingType", "availability"])

/** Effective category priority of a field (default Medium). */
export function fieldPriority(field: IssueField): PropIssueSeverity {
  return field.priority ?? "Medium"
}

export const DEVELOPER_NAMES = ["Palm Hills", "Sodic", "Mountain View", "Emaar"]
export const PROJECT_NAMES = ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"]
export const PHASE_NAMES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"]
export const AMENITY_LIBRARY = [
  "Swimming Pool", "Gym", "Security", "Parking", "Club House", "Kids Area", "BBQ Area", "Smart Home",
  "Concierge", "Valet", "Rooftop Terrace", "Pets Allowed", "Spa", "Golf Course", "Private Beach", "Marina",
]

export const ISSUE_FIELDS: IssueField[] = [
  // Placement — the unit itself may be right but sit under the wrong developer/project/phase,
  // or carry the wrong sale/listing state
  { id: "developer", label: "Developer", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: DEVELOPER_NAMES },
  { id: "project", label: "Project", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: PROJECT_NAMES },
  { id: "phase", label: "Phase", priority: "Critical", group: "Placement", kind: "value", valueType: "phase" },
  { id: "availability", label: "Sale Status", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: ["Available", "Hold", "Sold-Off", "Archived"] },
  { id: "listingStatus", label: "Listing Status", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: ["Active", "Hidden"] },
  // Identity
  { id: "unitCode", label: "Unit Code", group: "Identity", kind: "value" },
  { id: "unitNumber", label: "Unit Number", group: "Identity", kind: "value" },
  { id: "unitModel", label: "Unit Model", group: "Identity", kind: "value" },
  { id: "zone", label: "Zone", group: "Identity", kind: "value" },
  // Classification
  { id: "propertyCategory", label: "Category", group: "Classification", kind: "value", valueType: "enum", options: ["Residential", "Commercial", "Administrative", "Medical"] },
  { id: "propertyType", label: "Type", group: "Classification", kind: "value", valueType: "enum", options: ["Apartment", "Villa", "Townhouse", "Duplex", "Chalet", "Penthouse", "Studio", "Office", "Retail"] },
  { id: "propertySubType", label: "Sub-type", group: "Classification", kind: "value" },
  { id: "developerType", label: "Developer Type", group: "Classification", kind: "value" },
  { id: "buildingType", label: "Building Type", group: "Classification", kind: "value", valueType: "enum", options: ["Cluster", "Standalone", "Tower"] },
  { id: "buildingNumber", label: "Building Number", group: "Classification", kind: "value" },
  { id: "floorNumber", label: "Floor Number", group: "Classification", kind: "value", valueType: "number" },
  // Dimensions
  { id: "grossBua", label: "Gross BUA", priority: "High", group: "Dimensions", kind: "value", valueType: "area" },
  { id: "netBua", label: "Net BUA", group: "Dimensions", kind: "value", valueType: "area" },
  { id: "bedrooms", label: "Bedrooms", priority: "High", group: "Dimensions", kind: "value", valueType: "number" },
  { id: "bathrooms", label: "Bathrooms", group: "Dimensions", kind: "value", valueType: "number" },
  // Pricing
  { id: "price", label: "Price", priority: "Critical", group: "Pricing", kind: "value", valueType: "currency" },
  { id: "storagePrice", label: "Storage Price", priority: "High", group: "Pricing", kind: "value", valueType: "currency" },
  { id: "outdoorPrice", label: "Outdoor Price", priority: "High", group: "Pricing", kind: "value", valueType: "currency" },
  // Delivery & finishing
  { id: "deliveryType", label: "Delivery Type", group: "Delivery & Finishing", kind: "value", valueType: "enum", options: ["Ready to move", "Off Plan", "Under Construction"] },
  { id: "deliveryDate", label: "Delivery Date", group: "Delivery & Finishing", kind: "value" },
  { id: "finishingType", label: "Finishing Type", group: "Delivery & Finishing", kind: "value", valueType: "enum", options: ["Core & Shell", "Semi Finished", "Fully Finished", "Furnished"] },
  { id: "serviced", label: "Serviced", group: "Delivery & Finishing", kind: "value", valueType: "boolean" },
  { id: "branded", label: "Branded", group: "Delivery & Finishing", kind: "value", valueType: "boolean" },
  // Areas
  { id: "openRoofArea", label: "Open Roof Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "roofAnnexArea", label: "Roof Annex Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "gardenArea", label: "Garden Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "terraceArea", label: "Terrace Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "landArea", label: "Land Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "storageArea", label: "Storage Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "outdoorArea", label: "Outdoor Area", group: "Areas", kind: "value", valueType: "area" },
  { id: "basementArea", label: "Basement Area", group: "Areas", kind: "value", valueType: "area" },
  // Parking & views
  { id: "parking", label: "Parking", group: "Parking & Views", kind: "value", valueType: "boolean" },
  { id: "parkingSlots", label: "Parking Slots", group: "Parking & Views", kind: "value", valueType: "number" },
  { id: "parkingFees", label: "Parking Fees", group: "Parking & Views", kind: "value", valueType: "currency" },
  { id: "additionalParkingFees", label: "Additional Parking Fees", group: "Parking & Views", kind: "value", valueType: "currency" },
  { id: "unitView", label: "Unit View", group: "Parking & Views", kind: "value", valueType: "enum", options: ["Garden View", "Pool View", "Sea View", "Street View", "Landscape View", "Club View"] },
  { id: "unitOrientation", label: "Unit Orientation", group: "Parking & Views", kind: "value", valueType: "enum", options: ["North", "North East", "East", "South East", "South", "South West", "West", "North West"] },
  // Amenities & services
  { id: "amenities", label: "Amenities & Services", group: "Amenities & Services", kind: "amenities", priority: "Medium" },
  // Attachments
  { id: "paymentPlans", label: "Payment Plans", group: "Attachments", kind: "plans", priority: "High" },
  { id: "floorPlans", label: "Floor Plans", group: "Attachments", kind: "floorPlans", priority: "High" },
  { id: "images", label: "Render Images", group: "Attachments", kind: "images", priority: "Medium" },
]

export const FIELD_BY_ID = new Map(ISSUE_FIELDS.map((f) => [f.id, f]))
export const ISSUE_FIELD_GROUPS = Array.from(new Set(ISSUE_FIELDS.map((f) => f.group)))

// ── Fixed taxonomy ────────────────────────────────────────────────────────────
export interface IssueTypeDef {
  type: string
  /** Not every type has subtypes. */
  subtypes?: string[]
  /** Attachment fields: this type requires picking the specific item(s) (a
   *  "missing"/"order" type never does — you describe it instead). */
  requiresSelection?: boolean
  /** Default priority — becomes the issue's severity. Editable in Quality Configurations. */
  priority: PropIssueSeverity
  active: boolean
}

const WRONG_VALUE = (p: PropIssueSeverity): IssueTypeDef => ({ type: "Wrong Value", subtypes: ["Mismatch with developer sheet", "Mismatch with brochure", "Typo / impossible value"], priority: p, active: true })
const MISSING_VALUE = (p: PropIssueSeverity): IssueTypeDef => ({ type: "Missing Value", priority: p, active: true })
const OUTDATED_VALUE = (p: PropIssueSeverity): IssueTypeDef => ({ type: "Outdated Value", subtypes: ["Developer update not reflected", "Stale after re-ingestion"], priority: p, active: true })

/** Fields the "Wrong Values" plan issue can point at, in reporting order. */
export const PLAN_VALUE_FIELDS = ["Type", "Duration", "Down Payment %", "Frequency", "Installment %", "Currency", "Milestones", "Bulk Installments"]
/** Plan fields with a fixed set of valid values (expected-result dropdown). */
export const PLAN_FIELD_OPTIONS: Record<string, string[]> = {
  Type: ["Equal", "Backloaded", "Frontloaded", "Cash"],
  Frequency: ["Monthly", "Quarterly", "Semi-Annually", "Annually"],
  Currency: ["EGP", "USD"],
}
/** Back-compat alias. */
export const PLAN_ASPECTS = PLAN_VALUE_FIELDS

const PLANS_TYPES: IssueTypeDef[] = [
  { type: "Wrong Payment Plan", requiresSelection: true, priority: "High", active: true },
  { type: "Missing Payment Plan", priority: "High", active: true },
  { type: "Outdated Payment Plan", requiresSelection: true, priority: "Medium", active: true },
  { type: "Wrong Values", subtypes: PLAN_VALUE_FIELDS, requiresSelection: true, priority: "High", active: true },
]

const FLOOR_PLAN_TYPES: IssueTypeDef[] = [
  { type: "Missing Floor Plan", priority: "High", active: true },
  { type: "Wrong Floor Plan", subtypes: ["Belongs to another model", "Wrong orientation"], requiresSelection: true, priority: "High", active: true },
  { type: "Low Quality", subtypes: ["Blurred / unreadable", "Watermarked"], requiresSelection: true, priority: "Medium", active: true },
  { type: "Wrong Order", priority: "Low", active: true },
]

const IMAGE_TYPES: IssueTypeDef[] = [
  { type: "Missing Renders", priority: "Medium", active: true },
  { type: "Wrong Render", subtypes: ["Different project / model"], requiresSelection: true, priority: "High", active: true },
  { type: "Low Quality", subtypes: ["Low resolution", "Watermarked"], requiresSelection: true, priority: "Low", active: true },
  { type: "Wrong Order", priority: "Lowest", active: true },
]

const AMENITY_TYPES: IssueTypeDef[] = [
  { type: "Missing Amenity", priority: "Medium", active: true },
  { type: "Wrong Amenity", priority: "Medium", active: true },
  { type: "Amenities Update", priority: "Low", active: true },
]

const STATUS_TYPES: IssueTypeDef[] = [
  { type: "Wrong Status", priority: "Critical", active: true },
  { type: "Outdated Status", priority: "Medium", active: true },
]

/** The fixed taxonomy for a field. Value fields get Wrong/Missing Value (and
 *  Outdated Value when the field changes over time). Priorities come from the
 *  field's category-level priority. */
export function fieldTaxonomy(field: IssueField): IssueTypeDef[] {
  const p = fieldPriority(field)
  if (field.kind === "amenities") return AMENITY_TYPES
  if (field.kind === "plans") return PLANS_TYPES
  if (field.kind === "floorPlans") return FLOOR_PLAN_TYPES
  if (field.kind === "images") return IMAGE_TYPES
  return [
    WRONG_VALUE(p),
    MISSING_VALUE(p),
    ...(OUTDATED_FIELD_IDS.has(field.id) ? [OUTDATED_VALUE(p)] : []),
  ]
}

export const ALL_ISSUE_TYPES = Array.from(new Set(ISSUE_FIELDS.flatMap((f) => fieldTaxonomy(f).map((t) => t.type))))
export const ALL_ISSUE_SUBTYPES = Array.from(new Set(ISSUE_FIELDS.flatMap((f) => fieldTaxonomy(f).flatMap((t) => t.subtypes ?? []))))

export const STATUS_COLORS: Record<PropIssueStatus, string> = {
  "To Do": "bg-gray-100 text-gray-700 border-gray-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Resolved: "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Invalid: "bg-red-50 text-red-600 border-red-200",
}
export const SEVERITY_COLORS: Record<PropIssueSeverity, string> = {
  Critical: "bg-red-100 text-red-800 border-red-300",
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

export interface IssueComment {
  id: string
  author: string
  text: string
  at: string
}

/** Structured payload for attachment/amenity issues — drives the rich
 *  rendering in the issue details pane. */
export interface IssueDetails {
  /** Payment plans: the affected plans, each optionally with wrong-value fields. */
  plans?: { name: string; fields?: { field: string; expected: string | null; note: string | null }[] }[]
  amenitiesAdd?: string[]
  amenitiesRemove?: string[]
  /** "Render 3" / "Floor Plan 1" — resolvable to the unit's media by index. */
  media?: string[]
}

export interface IssueActivity {
  id: string
  kind: "created" | "status" | "assigned"
  actor: string
  at: string
  detail: string
}

export interface PropertyIssue {
  id: string // ISS-000001
  source: PropIssueSource
  severity: PropIssueSeverity
  status: PropIssueStatus
  fieldId: string // category — the property field
  fieldLabel: string
  type: string
  subtype: string | null
  description: string
  /** What the value SHOULD be — drives manual fixing and auto-resolution checks. */
  expected: string | null
  /** Value at report time (context for data ops). */
  current: string | null
  /** For plans/floorPlans/images fields: the affected item names (may carry aspect annotations). */
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
  activity: IssueActivity[]
  details?: IssueDetails
}

export const PROP_ISSUE_STATUSES: PropIssueStatus[] = ["To Do", "In Progress", "Resolved", "Closed", "Invalid"]
/** Statuses that count as "open" for property-view highlighting. */
export const OPEN_STATUSES: PropIssueStatus[] = ["To Do", "In Progress", "Resolved"]

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

/** Activity log derived from the issue's lifecycle (mock). */
function activityFor(
  i: number,
  status: PropIssueStatus,
  reportedBy: string,
  assignedTo: string | null,
  created: number,
  updated: number,
  resolved: number | null,
  closed: number | null,
): IssueActivity[] {
  const acts: IssueActivity[] = [
    { id: `ACT-${i}-0`, kind: "created", actor: reportedBy, at: ts(created), detail: "Issue created — To Do" },
  ]
  if (assignedTo) acts.push({ id: `ACT-${i}-1`, kind: "assigned", actor: "System", at: ts(Math.max(1, created - 1)), detail: `Auto-assigned to ${assignedTo}` })
  if (status !== "To Do") {
    const actor = assignedTo ?? DATA_OPS_TEAM[i % DATA_OPS_TEAM.length]
    if (status === "Invalid") acts.push({ id: `ACT-${i}-2`, kind: "status", actor, at: ts(updated), detail: "Status changed: To Do → Invalid" })
    else {
      acts.push({ id: `ACT-${i}-2`, kind: "status", actor, at: ts(Math.max(1, updated + 6)), detail: "Status changed: To Do → In Progress" })
      if (resolved != null) acts.push({ id: `ACT-${i}-3`, kind: "status", actor, at: ts(resolved), detail: "Status changed: In Progress → Resolved" })
      if (closed != null) acts.push({ id: `ACT-${i}-4`, kind: "status", actor: QUALITY_TEAM[i % QUALITY_TEAM.length], at: ts(closed), detail: "Status changed: Resolved → Closed" })
    }
  }
  return acts
}

const EXPECTED_SAMPLES: Record<string, [string, string][]> = {
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
  const rowIndex = (i * 7) % ROW_COUNT
  const ctx = unitContext(rowIndex)
  const field = ISSUE_FIELDS[(i * 5) % ISSUE_FIELDS.length]
  const tax = fieldTaxonomy(field)
  // i steps by ISSUE_FIELDS.length between instances of the same field, so use
  // i/len (not i) to cycle through ALL of the field's types across instances.
  const t = tax[Math.floor(i / ISSUE_FIELDS.length) % tax.length]
  const subtype = t.subtypes ? t.subtypes[i % t.subtypes.length] : null
  const source: PropIssueSource = (["Data Quality", "System", "Sales Agent", "Data Quality", "System"] as const)[i % 5]
  const severity = fieldPriority(field) // category-level priority
  const status = PROP_ISSUE_STATUSES[[0, 0, 1, 0, 2, 3, 1, 3, 4, 0][i % 10]]
  const created = 12 + (i % 700) * 3
  const updated = status === "To Do" ? created : Math.max(2, created - 24 - (i % 48))
  const resolvedAt = status === "Resolved" || status === "Closed" ? Math.max(1, updated - 2) : null
  const closedAt = status === "Closed" ? Math.max(1, (resolvedAt ?? updated) - 6) : null
  const samples = EXPECTED_SAMPLES[field.id]
  const [current, expected] = samples ? samples[i % samples.length] : [null, field.kind === "value" ? "Match developer sheet" : null]
  const needsItems = t.requiresSelection === true
  let details: IssueDetails | undefined
  let linkedItems: string[] | null = null
  if (field.kind === "amenities") {
    details = t.type === "Missing Amenity"
      ? { amenitiesAdd: [AMENITY_LIBRARY[i % AMENITY_LIBRARY.length]] }
      : { amenitiesRemove: [AMENITY_LIBRARY[(i + 5) % AMENITY_LIBRARY.length]] }
    linkedItems = [...(details.amenitiesAdd ?? []).map((a) => `Add: ${a}`), ...(details.amenitiesRemove ?? []).map((a) => `Remove: ${a}`)]
  } else if (field.kind === "plans" && needsItems) {
    const plan = ["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"][i % 4]
    if (t.type === "Wrong Values") {
      const pf = PLAN_VALUE_FIELDS[i % PLAN_VALUE_FIELDS.length]
      details = { plans: [{ name: plan, fields: [{ field: pf, expected: PLAN_FIELD_OPTIONS[pf]?.[i % (PLAN_FIELD_OPTIONS[pf]?.length || 1)] ?? "12", note: null }] }] }
      linkedItems = [`${plan} (${pf})`]
    } else {
      details = { plans: [{ name: plan }] }
      linkedItems = [plan]
    }
  } else if (field.kind === "floorPlans" && needsItems) {
    // ponytail: low indices — most units hold 1-2 files, so the thumbnail resolves
    details = { media: [`Floor Plan ${(i % 2) + 1}`] }
    linkedItems = details.media!
  } else if (field.kind === "images" && needsItems) {
    details = { media: [`Render ${(i % 2) + 1}`] }
    linkedItems = details.media!
  }
  const reportedBy = source === "System" ? "System" : source === "Sales Agent" ? SALES_AGENTS[i % SALES_AGENTS.length] : QUALITY_TEAM[i % QUALITY_TEAM.length]
  const assignedTo = status === "To Do" && i % 4 === 0 ? null : DATA_OPS_TEAM[i % DATA_OPS_TEAM.length]

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
      ? `Validation rule flagged ${field.label}: ${t.type.toLowerCase()}${subtype ? ` (${subtype.toLowerCase()})` : ""}`
      : `${field.label} — ${t.type.toLowerCase()}${subtype ? `: ${subtype.toLowerCase()}` : ""}`,
    expected,
    current,
    linkedItems,
    reportedBy,
    assignedTo,
    ...ctx,
    createdAt: ts(created),
    updatedAt: ts(updated),
    resolvedAt: resolvedAt != null ? ts(resolvedAt) : null,
    closedAt: closedAt != null ? ts(closedAt) : null,
    details,
    comments: commentsFor(i, status, created),
    activity: activityFor(i, status, reportedBy, assignedTo, created, updated, resolvedAt, closedAt),
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

/** All open issues on one property (freshly read from the store). */
export function openIssuesFor(propertyId: string): PropertyIssue[] {
  return PROPERTY_ISSUES.filter((i) => i.propertyId === propertyId && OPEN_STATUSES.includes(i.status))
}

/** Distribute `total` across n items in whole numbers (first items absorb the remainder). */
export function distribute(total: number, n: number): number[] {
  if (n === 0) return []
  const base = Math.floor(total / n)
  const rem = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

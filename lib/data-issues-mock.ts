// Data Quality → Data Issues — bug-report-style tickets raised on properties,
// projects and developers. Mock only (no backend), deterministic so SSR and
// client render identical output.

export type IssueEntity = "Property" | "Project" | "Developer"
export type IssueStatus = "Open" | "In Progress" | "Fixed" | "Rejected"

export interface DataIssue {
  id: string // ISS-0001
  entity: IssueEntity
  reportedBy: string
  assignedTo: string | null
  status: IssueStatus
  category: string
  type: string
  description: string
  /** Unit-details drawer field label the issue was reported on (Property issues only). */
  field: string | null
  developer: { id: string; name: string }
  project: { id: string; name: string } | null
  phase: { id: string; name: string } | null
  /** Matches the All Properties mock ids (PRP-000001…) so the unit drawer can open the real row. */
  propertyId: string | null
  detailedPropertyId: string | null
  createdAt: string
  updatedAt: string
  fixedAt: string | null
}

const REPORTERS = ["Ahmed K.", "Sarah M.", "Omar F.", "Mariam N.", "Youssef T.", "Nour H."]
const ASSIGNEES = ["Sarah M.", "Ahmed K.", "Mariam N.", "Karim S.", "Laila A."]
const STATUSES: IssueStatus[] = ["Open", "In Progress", "Fixed", "Open", "Rejected", "Fixed", "In Progress", "Open"]
const TYPES = ["Incorrect Data", "Missing Data", "Outdated Data", "Duplicate", "Formatting"]

const DEVELOPERS = [
  { id: "DEV-001", name: "Palm Hills" },
  { id: "DEV-002", name: "SODIC" },
  { id: "DEV-003", name: "Mountain View" },
  { id: "DEV-004", name: "Ora Developers" },
  { id: "DEV-005", name: "Emaar Misr" },
]

const PROJECTS = [
  { id: "PRJ-0001", name: "New Cairo Residences", devIdx: 0, phase: { id: "PRJ-0002", name: "Phase 1" } },
  { id: "PRJ-0003", name: "North Coast Bay", devIdx: 1, phase: { id: "PRJ-0004", name: "Phase 1" } },
  { id: "PRJ-0005", name: "West Ridge", devIdx: 2, phase: null },
  { id: "PRJ-0007", name: "Silversands", devIdx: 3, phase: { id: "PRJ-0008", name: "Phase 2" } },
  { id: "PRJ-0009", name: "Cairo Gate", devIdx: 4, phase: null },
]

// Labels must match the unit-details drawer Field labels exactly — the drawer
// highlights the reported field by label.
const PROPERTY_FIELDS: { field: string; category: string; desc: string }[] = [
  { field: "Gross BUA", category: "Areas & Sizes", desc: "Gross BUA doesn't match the developer price list" },
  { field: "Net BUA", category: "Areas & Sizes", desc: "Net BUA larger than gross BUA" },
  { field: "Bedrooms", category: "Unit Info", desc: "Bedroom count wrong vs floor plan" },
  { field: "Bathrooms", category: "Unit Info", desc: "Bathroom count missing on listing" },
  { field: "Floor Number", category: "Unit Info", desc: "Floor number inconsistent with unit code" },
  { field: "Delivery Date", category: "Unit Info", desc: "Delivery date passed but unit still marked under construction" },
  { field: "Finishing Type", category: "Unit Info", desc: "Finishing type contradicts the brochure" },
  { field: "Garden Area", category: "Areas & Sizes", desc: "Garden area reported for a typical floor apartment" },
  { field: "Unit Number", category: "Unit Info", desc: "Duplicate unit number inside the same building" },
  { field: "Unit Model", category: "Unit Info", desc: "Unit model not in the approved models list" },
  { field: "Storage Price", category: "Pricing", desc: "Storage price present but storage not included" },
  { field: "Outdoor Price", category: "Pricing", desc: "Outdoor price outdated after last sheet ingestion" },
  { field: "Unit View", category: "Unit Info", desc: "Unit view mismatch with masterplan position" },
  { field: "Parking Slots", category: "Unit Info", desc: "Parking slots count missing for villa" },
  { field: "Land Area", category: "Areas & Sizes", desc: "Land area formatting broken in export" },
  { field: "Availability", category: "Availability", desc: "Unit sold on CRM but still Available here" },
]

const PROJECT_ISSUES: { category: string; desc: string }[] = [
  { category: "Location", desc: "Project polygon overlaps a neighbouring project" },
  { category: "Masterplans", desc: "Listing masterplan is an outdated revision" },
  { category: "Media", desc: "Render images are low resolution and watermarked" },
  { category: "General Info", desc: "SEO description missing for the project" },
  { category: "Location", desc: "Coordinates point outside the project's district" },
  { category: "General Info", desc: "Phase naming inconsistent with the developer site" },
]

const DEVELOPER_ISSUES: { category: string; desc: string }[] = [
  { category: "Media", desc: "Developer logo is stretched and off-brand" },
  { category: "General Info", desc: "Developer description duplicated across languages" },
  { category: "Contacts", desc: "WhatsApp group link expired" },
  { category: "General Info", desc: "Founded year and portfolio counts outdated" },
]

const BASE = Date.UTC(2026, 6, 20, 9, 0, 0) // fixed — avoids SSR/client hydration mismatch
const HOUR = 3600000

function ts(hoursAgo: number) {
  return new Date(BASE - hoursAgo * HOUR).toISOString()
}

function buildIssue(i: number, entity: IssueEntity, category: string, desc: string, field: string | null): DataIssue {
  const proj = PROJECTS[i % PROJECTS.length]
  const dev = DEVELOPERS[proj.devIdx]
  const status = STATUSES[i % STATUSES.length]
  const created = 16 + i * 11
  const updated = status === "Open" ? created : Math.max(2, created - 30)
  const isProperty = entity === "Property"
  return {
    id: `ISS-${String(i + 1).padStart(4, "0")}`,
    entity,
    reportedBy: REPORTERS[i % REPORTERS.length],
    assignedTo: status === "Open" && i % 3 === 0 ? null : ASSIGNEES[i % ASSIGNEES.length],
    status,
    category,
    type: TYPES[i % TYPES.length],
    description: desc,
    field,
    developer: dev,
    project: entity === "Developer" ? null : { id: proj.id, name: proj.name },
    phase: entity === "Property" ? proj.phase : null,
    propertyId: isProperty ? `PRP-${String((i % 30) + 1).padStart(6, "0")}` : null,
    detailedPropertyId: isProperty ? `DP-${String(4200 + i * 7)}` : null,
    createdAt: ts(created),
    updatedAt: ts(updated),
    fixedAt: status === "Fixed" ? ts(Math.max(1, updated - 4)) : null,
  }
}

export const DATA_ISSUES: DataIssue[] = [
  // 40 property issues
  ...Array.from({ length: 40 }, (_, i) => {
    const spec = PROPERTY_FIELDS[i % PROPERTY_FIELDS.length]
    return buildIssue(i, "Property", spec.category, spec.desc, spec.field)
  }),
  // 12 project issues
  ...Array.from({ length: 12 }, (_, i) => {
    const spec = PROJECT_ISSUES[i % PROJECT_ISSUES.length]
    return buildIssue(40 + i, "Project", spec.category, spec.desc, null)
  }),
  // 8 developer issues
  ...Array.from({ length: 8 }, (_, i) => {
    const spec = DEVELOPER_ISSUES[i % DEVELOPER_ISSUES.length]
    return buildIssue(52 + i, "Developer", spec.category, spec.desc, null)
  }),
]

export const ISSUE_CATEGORIES = Array.from(new Set(DATA_ISSUES.map((x) => x.category)))
export const ISSUE_TYPES = TYPES
export const ISSUE_STATUSES: IssueStatus[] = ["Open", "In Progress", "Fixed", "Rejected"]
export const ISSUE_PEOPLE = Array.from(new Set([...REPORTERS, ...ASSIGNEES]))

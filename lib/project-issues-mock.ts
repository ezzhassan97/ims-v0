// Data Quality → PROJECT data issues — mirrors lib/property-issues-mock.ts
// (same statuses, severities, sources, teams, colors) with project-specific
// categories/fields. Single source of truth for the Projects tab in Quality
// Configurations, the Report an Issue (project) drawer and the Projects Data
// Issues page.

import { PROJECTS, PROJECT_DEVELOPERS, AREAS } from "./projects-mock"
import {
  QUALITY_TEAM, DATA_OPS_TEAM, SALES_AGENTS, PROP_ISSUE_STATUSES, OPEN_STATUSES,
  type PropIssueStatus, type PropIssueSeverity, type PropIssueSource,
  type IssueTypeDef, type IssueComment, type IssueActivity, type IssueDetails,
} from "./property-issues-mock"

export type ProjectFieldKind = "value" | "media" | "amenities"

export interface ProjectIssueField {
  id: string
  label: string
  /** Category-level priority — becomes the issue severity. */
  priority?: PropIssueSeverity
  group: string
  kind: ProjectFieldKind
  valueType?: "text" | "enum"
  options?: string[]
}

export function projectFieldPriority(f: ProjectIssueField): PropIssueSeverity {
  return f.priority ?? "Medium"
}

export const PROJECT_AMENITY_LIBRARY = [
  "Clubhouse", "Commercial Strip", "Lagoon", "Sports Club", "International Schools", "Medical Center",
  "Mosque", "Security & Gates", "Landscape Parks", "Cycling Tracks", "Business Hub", "Kids Area",
]

const DEV_NAMES = PROJECT_DEVELOPERS.map((d) => d.name)

export const PROJECT_ISSUE_FIELDS: ProjectIssueField[] = [
  // Identity
  { id: "projectNameEn", label: "Project Name EN", priority: "Critical", group: "Identity", kind: "value", valueType: "text" },
  { id: "projectNameAr", label: "Project Name AR", priority: "High", group: "Identity", kind: "value", valueType: "text" },
  { id: "listingStatus", label: "Listing Status", priority: "Critical", group: "Identity", kind: "value", valueType: "enum", options: ["Active", "Hidden"] },
  { id: "entryType", label: "Entry Type", priority: "Critical", group: "Identity", kind: "value", valueType: "enum", options: ["Automatic", "Manual"] },
  { id: "primaryStatus", label: "Primary Status", priority: "Critical", group: "Identity", kind: "value", valueType: "enum", options: ["Launch", "On-Sale", "On-Hold", "Sold-Off"] },
  // Placement
  { id: "developer", label: "Developer", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: DEV_NAMES },
  { id: "areaSubarea", label: "Area / Subarea", priority: "Critical", group: "Placement", kind: "value", valueType: "enum", options: AREAS },
  { id: "location", label: "Location", priority: "High", group: "Placement", kind: "value", valueType: "text" },
  { id: "polygon", label: "Polygon", priority: "High", group: "Placement", kind: "value" },
  { id: "organizations", label: "Organizations", priority: "High", group: "Placement", kind: "value", valueType: "enum", options: ["Nawy", "Partners", "Nawy & Partners"] },
  // Classification
  { id: "category", label: "Category", group: "Classification", kind: "value", valueType: "enum", options: ["Residential", "Commercial", "Coastal", "Administrative"] },
  { id: "projectType", label: "Type", group: "Classification", kind: "value", valueType: "enum", options: ["Compound", "Standalone", "Mixed Use", "Resort"] },
  { id: "projectSubtype", label: "Subtype", group: "Classification", kind: "value", valueType: "text" },
  // Content
  { id: "description", label: "Project Description", group: "Content", kind: "value", valueType: "text" },
  { id: "metadata", label: "Project Metadata", priority: "Low", group: "Content", kind: "value", valueType: "text" },
  // Attachments
  { id: "brochure", label: "Brochure", group: "Attachments", kind: "media" },
  { id: "listingMasterplan", label: "Listing Masterplan", priority: "High", group: "Attachments", kind: "media" },
  { id: "gisMasterplan", label: "GIS Masterplan", group: "Attachments", kind: "media" },
  { id: "numberedMasterplan", label: "Numbered Masterplan", group: "Attachments", kind: "media" },
  { id: "gallery", label: "Gallery", group: "Attachments", kind: "media" },
  { id: "logo", label: "Project Logo", priority: "Low", group: "Attachments", kind: "media" },
  // Amenities
  { id: "amenities", label: "Project Amenities", group: "Amenities", kind: "amenities" },
]

export const PROJECT_FIELD_BY_ID = new Map(PROJECT_ISSUE_FIELDS.map((f) => [f.id, f]))
export const PROJECT_ISSUE_FIELD_GROUPS = Array.from(new Set(PROJECT_ISSUE_FIELDS.map((f) => f.group)))

/** Fields whose value legitimately changes over time → also "Outdated Value". */
export const PROJECT_OUTDATED_FIELD_IDS = new Set(["listingStatus", "primaryStatus", "description", "metadata"])

const GALLERY_DIMS = ["Cover Image", "Images", "Videos"]

/** Fixed taxonomy for a project field (priorities come from the category). */
export function projectFieldTaxonomy(field: ProjectIssueField): IssueTypeDef[] {
  const p = projectFieldPriority(field)
  if (field.kind === "amenities") {
    return [
      { type: "Missing Amenity", priority: p, active: true },
      { type: "Wrong Amenity", priority: p, active: true },
      { type: "Amenities Update", priority: p, active: true },
    ]
  }
  if (field.kind === "media") {
    const dims = field.id === "gallery" ? GALLERY_DIMS : undefined
    return [
      { type: `Missing ${field.label}`, subtypes: dims, priority: p, active: true },
      { type: `Wrong ${field.label}`, subtypes: dims ?? ["Belongs to another project", "Outdated version"], priority: p, active: true },
      { type: "Low Quality", subtypes: ["Blurred / unreadable", "Watermarked", "Low resolution"], priority: p, active: true },
    ]
  }
  if (field.id === "polygon") {
    return [
      { type: "Wrong Polygon", subtypes: ["Wrong boundaries", "Wrong location"], priority: p, active: true },
      { type: "Missing Polygon", priority: p, active: true },
    ]
  }
  return [
    { type: "Wrong Value", subtypes: ["Mismatch with developer sheet", "Mismatch with brochure", "Typo / impossible value"], priority: p, active: true },
    { type: "Missing Value", priority: p, active: true },
    ...(PROJECT_OUTDATED_FIELD_IDS.has(field.id)
      ? [{ type: "Outdated Value", subtypes: ["Developer update not reflected", "Stale after re-ingestion"], priority: p, active: true }]
      : []),
  ]
}

export const ALL_PROJECT_ISSUE_TYPES = Array.from(new Set(PROJECT_ISSUE_FIELDS.flatMap((f) => projectFieldTaxonomy(f).map((t) => t.type))))

// ── Issues ────────────────────────────────────────────────────────────────────
export interface ProjectIssue {
  id: string // PIS-000001
  source: PropIssueSource
  severity: PropIssueSeverity
  status: PropIssueStatus
  fieldId: string
  fieldLabel: string
  type: string
  subtype: string | null
  description: string
  expected: string | null
  current: string | null
  reportedBy: string
  assignedTo: string | null
  developer: { id: string; name: string }
  project: { id: string; name: string }
  projectLevel: "Project" | "Phase"
  listingStatus: string
  primaryStatus: string
  entryType: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  comments: IssueComment[]
  activity: IssueActivity[]
  details?: IssueDetails
}

const BASE = Date.UTC(2026, 7, 10, 9, 0, 0)
const HOUR = 3600000
const ts = (hoursAgo: number) => new Date(BASE - hoursAgo * HOUR).toISOString()

const COMMENT_TEXTS = [
  "Checked against the developer's latest kit — confirming the mismatch.",
  "Waiting for the developer to share the updated masterplan.",
  "Fixed in the last sync, please verify.",
  "The developer rebranded this phase in June — intentional.",
  "Escalated to the account manager.",
]

const ALL_PEOPLE_P = [...QUALITY_TEAM, ...DATA_OPS_TEAM]

const EXPECTED_SAMPLES: Record<string, [string, string][]> = {
  projectNameEn: [["Zed East", "ZED East New Cairo"]],
  projectNameAr: [["—", "زيد الشرقية"]],
  listingStatus: [["Hidden", "Active"]],
  primaryStatus: [["On-Sale", "Sold-Off"], ["Launch", "On-Sale"]],
  developer: [["Sodic", "Ora Developers"]],
  areaSubarea: [["New Cairo", "Mostakbal City"]],
  organizations: [["Nawy", "Nawy & Partners"]],
  category: [["Residential", "Coastal"]],
}

function makeProjectIssue(i: number): ProjectIssue {
  const proj = PROJECTS[(i * 3) % PROJECTS.length]
  const field = PROJECT_ISSUE_FIELDS[(i * 5) % PROJECT_ISSUE_FIELDS.length]
  const tax = projectFieldTaxonomy(field)
  // i steps by fields.length between instances of a field — cycle its types
  const t = tax[Math.floor(i / PROJECT_ISSUE_FIELDS.length) % tax.length]
  const subtype = t.subtypes ? t.subtypes[i % t.subtypes.length] : null
  const source: PropIssueSource = (["Data Quality", "System", "Sales Agent", "Data Quality", "System"] as const)[i % 5]
  const severity = projectFieldPriority(field)
  const status = PROP_ISSUE_STATUSES[[0, 0, 1, 0, 2, 3, 1, 3, 4, 0][i % 10]]
  const created = 10 + (i % 500) * 3
  const updated = status === "To Do" ? created : Math.max(2, created - 20 - (i % 40))
  const resolvedAt = status === "Resolved" || status === "Closed" ? Math.max(1, updated - 2) : null
  const closedAt = status === "Closed" ? Math.max(1, (resolvedAt ?? updated) - 5) : null
  const samples = EXPECTED_SAMPLES[field.id]
  const [current, expected] = samples ? samples[i % samples.length] : [null, field.kind === "value" ? "Match developer sheet" : null]
  let details: IssueDetails | undefined
  if (field.kind === "amenities") {
    details = t.type === "Missing Amenity"
      ? { amenitiesAdd: [PROJECT_AMENITY_LIBRARY[i % PROJECT_AMENITY_LIBRARY.length]] }
      : { amenitiesRemove: [PROJECT_AMENITY_LIBRARY[(i + 5) % PROJECT_AMENITY_LIBRARY.length]] }
  }
  const reportedBy = source === "System" ? "System" : source === "Sales Agent" ? SALES_AGENTS[i % SALES_AGENTS.length] : QUALITY_TEAM[i % QUALITY_TEAM.length]
  const assignedTo = status === "To Do" && i % 4 === 0 ? null : DATA_OPS_TEAM[i % DATA_OPS_TEAM.length]
  return {
    id: `PIS-${String(i + 1).padStart(6, "0")}`,
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
    reportedBy,
    assignedTo,
    developer: { id: proj.developer.id, name: proj.developer.name },
    project: { id: proj.id, name: proj.name },
    projectLevel: proj.isPhase ? "Phase" : "Project",
    listingStatus: proj.listingStatus,
    primaryStatus: proj.primaryStatus,
    entryType: proj.entryType,
    createdAt: ts(created),
    updatedAt: ts(updated),
    resolvedAt: resolvedAt != null ? ts(resolvedAt) : null,
    closedAt: closedAt != null ? ts(closedAt) : null,
    details,
    comments: Array.from({ length: status === "To Do" ? i % 2 : (i % 3) + 1 }, (_, k) => ({
      id: `PCM-${i}-${k}`,
      author: ALL_PEOPLE_P[(i + k * 3) % ALL_PEOPLE_P.length],
      text: COMMENT_TEXTS[(i + k) % COMMENT_TEXTS.length],
      at: ts(Math.max(1, created - 6 * (k + 1))),
    })),
    activity: [
      { id: `PAC-${i}-0`, kind: "created", actor: reportedBy, at: ts(created), detail: "Issue created — To Do" },
      ...(assignedTo ? [{ id: `PAC-${i}-1`, kind: "assigned" as const, actor: "System", at: ts(Math.max(1, created - 1)), detail: `Auto-assigned to ${assignedTo}` }] : []),
      ...(status !== "To Do" ? [{ id: `PAC-${i}-2`, kind: "status" as const, actor: assignedTo ?? "System", at: ts(updated), detail: `Status changed: To Do → ${status === "Invalid" ? "Invalid" : "In Progress"}` }] : []),
      ...(resolvedAt != null ? [{ id: `PAC-${i}-3`, kind: "status" as const, actor: assignedTo ?? "System", at: ts(resolvedAt), detail: "Status changed: In Progress → Resolved" }] : []),
      ...(closedAt != null ? [{ id: `PAC-${i}-4`, kind: "status" as const, actor: QUALITY_TEAM[i % QUALITY_TEAM.length], at: ts(closedAt), detail: "Status changed: Resolved → Closed" }] : []),
    ],
  }
}

// ponytail: module-level mutable store — same pattern as PROPERTY_ISSUES.
export const PROJECT_ISSUES: ProjectIssue[] = Array.from({ length: 420 }, (_, i) => makeProjectIssue(i))

let projSeq = PROJECT_ISSUES.length
export function nextProjectIssueId(): string {
  return `PIS-${String(++projSeq).padStart(6, "0")}`
}
export function addProjectIssues(issues: ProjectIssue[]) {
  PROJECT_ISSUES.unshift(...issues)
}
export function openProjectIssuesFor(projectId: string): ProjectIssue[] {
  return PROJECT_ISSUES.filter((i) => i.project.id === projectId && OPEN_STATUSES.includes(i.status))
}

"use client"

import { useSyncExternalStore } from "react"
import { PROJECTS, type ProjectRow, type ProjPrimaryStatus } from "@/lib/projects-mock"

// ─── Shared launch record ─────────────────────────────────────────────────────
// One source of truth for BOTH flows: the Launches pages and the projects'
// Change Primary Status dialog. A project sits in Launch because exactly one
// ingested, type="Launch" launch is Active on it — so both sides must read and
// write the same rows, and every launch must point at a real PROJECTS id.

export interface LaunchRef {
  id: string
  name: string
}

export interface Launch {
  id: string
  /** Database uuid — the main identifier shown in the table; the numeric id is its caption. */
  uuid?: string
  developer: { name: string; logo: string; id: string }
  projectNameEn: string
  projectNameAr?: string
  /** Real `PRJ-XXXX` id — undefined ⇒ free-text project name ("Unmatched Project"). */
  projectId?: string
  /** Empty phase ⇒ this launch is on a main project. */
  phase: string
  phaseAr?: string
  projectLevel: "Main Project" | "Phase"
  parentProjectId?: string
  area: string
  areaId: string
  approvalStatus: "Pending Review" | "Approved" | "Rejected"
  ingestionStatus: "Ingested" | "Not Ingested"
  listingStatus: "Active" | "Hidden"
  /** Already-created project in the system — undefined ⇒ green "New" tag. */
  existingProject?: LaunchRef
  listingProject?: LaunchRef
  launchStatus: "Inactive" | "Active" | "Closed"
  type: "Launch" | "Release"
  source: "WhatsApp" | "Manual"
  listingCompletion: number
  /** Reservation fee in EGP — NOT a count of EOIs collected. */
  eoiAmount?: number
  /** Per-property-type reservation fees; absent when one fee covers every type. */
  eoiByType?: { type: string; amount: number }[]
  coverImage?: string
  /** Website-facing copy — editable at any time, even after ingestion. */
  title?: string
  description?: string
  /** Written when the launch is activated. */
  startDate?: string
  /** Written only when the launch is closed. */
  endDate?: string
  /** Action timestamps — when Set Active / Set Closed actually happened (not the EOI window). */
  activatedAt?: string
  closedAt?: string
  plans: { name: string; planType: string; dp: string; duration: string }[]
  offerings: { name: string; propertyType: string; grossAreaRange: string; priceRange: string; images?: number }[]
  /** Mirrors the Launch Incentives tab — broker/agent commission + notes. */
  incentives?: { commissionType: "percentage" | "amount"; commissionValue: string; brokerNotes?: string }
  /** Taskeen (allocation) days — same shape as the launch details page editor. */
  taskeen?: { date: string; types: string[]; address: string }[]
  /** Released offerings metadata — counts only, no unit records. */
  released?: { units: number; buildings: number; byType: { type: string; units: number }[] }
  contacts?: { name: string; phone: string }[]
  /** Archived launches leave the default tabs but are never destroyed. */
  archived?: boolean
  rejectionReason?: string
  archivedReason?: string
  /** AI-parsed updates from WhatsApp (undefined for manual launches). */
  aiUpdates?: { count: number; lastAt: string }
  ingestedAt?: string
  sentAt: string
  createdAt: string
  updatedAt: string
}

const LOGO = "/placeholder.svg?height=32&width=32"
const COVER = "/placeholder.svg?height=200&width=300"

/** Deterministic pseudo-uuid — stable per id so hydration and re-renders agree. */
export function uuidOf(s: string): string {
  const h = [...s].reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), 7)
  const hex = (n: number, len: number) => (n >>> 0).toString(16).padStart(len, "0").slice(-len)
  return `${hex(h * 2654435761, 8)}-${hex(h ^ 0xabcd, 4)}-4${hex(h >> 3, 3)}-9${hex(h >> 7, 3)}-${hex(h * 48271, 8)}${hex(h ^ 0x55aa, 4)}`
}

const LAUNCH_DESCRIPTIONS = [
  "Limited-release units with launch-exclusive payment terms and priority allocation.",
  "First offering of the new phase — waterfront-first inventory at launch pricing.",
  "Early-bird release covering the signature clusters before public availability.",
  "Flagship launch with extended plans and a capped EOI window.",
]

const BROKER_NOTES = [
  "Extra 0.5% for the first 10 contracted units.",
  "Commission paid on contract signature, not on EOI.",
  "Double commission on penthouse units during launch week.",
  "",
]
const CONTACT_POOL = [
  { name: "Ahmed Samir", phone: "+20 100 123 4567" },
  { name: "Sara El Din", phone: "+20 111 234 5678" },
  { name: "Omar Farouk", phone: "+20 122 345 6789" },
  { name: "Nour Hassan", phone: "+20 106 456 7890" },
]

const AREA_ID: Record<string, string> = {
  "New Cairo": "AR-101",
  "6th of October": "AR-102",
  "North Coast": "AR-103",
  "New Capital": "AR-104",
  "Sheikh Zayed": "AR-105",
  Maadi: "AR-106",
  Zamalek: "AR-107",
  Heliopolis: "AR-108",
}
export const LAUNCH_AREAS = Object.keys(AREA_ID)
export const launchAreaId = (area: string) => AREA_ID[area] ?? "AR-000"

/**
 * Ingested launches are generated from real projects, so every one of them
 * resolves to a live `PRJ-XXXX`. Rows whose project is in Launch always get an
 * Active type="Launch" launch — the state the primary status depends on.
 */
function seedForProject(r: ProjectRow): Launch[] {
  const seed = [...r.id].reduce((s, c) => s + c.charCodeAt(0), 0)
  const isLaunch = r.primaryStatus === "Launch"
  const n = isLaunch ? 1 + (seed % 2) : seed % 3
  const projectNameEn = r.isPhase ? r.mainProject?.name ?? r.name : r.name
  return Array.from({ length: n }, (_, i) => {
    // The active launch driving a Launch primary status is always of type "Launch".
    // Non-Launch projects only get the occasional Release, so some rows carry TWO
    // ingested type="Launch" launches — the multi-option activate picker stays visible.
    const type: Launch["type"] = isLaunch ? "Launch" : (seed + i) % 4 === 2 ? "Release" : "Launch"
    // EOI amounts are reservation fees — 50,000 to 1,000,000 EGP. Releases collect none.
    const eoi = type === "Launch" ? (1 + ((seed * 7 + i * 31) % 20)) * 50_000 : undefined
    const differsByType = eoi ? (seed + i) % 2 === 0 : false
    const launchStatus: Launch["launchStatus"] =
      isLaunch && i === 0 ? "Active" : (seed + i) % 2 === 0 ? "Inactive" : "Closed"
    const day = String(10 + (seed % 18)).padStart(2, "0")
    const offerings = [
      { name: "Apartments", propertyType: "Apartment", grossAreaRange: "110–180 SQM", priceRange: `${5 + (seed % 4)}M – ${9 + (seed % 5)}M`, images: 1 + (seed % 3) },
      { name: "Villas", propertyType: "Villa", grossAreaRange: "220–340 SQM", priceRange: `${14 + (seed % 5)}M – ${22 + (seed % 6)}M`, images: 1 + ((seed + i) % 2) },
    ].slice(0, 1 + ((seed + i + 1) % 2))
    const relByType = offerings.map((o, j) => ({ type: o.propertyType, units: 20 + ((seed + i * 7 + j * 13) % 120) }))
    const id = `LCH-${String(1000 + ((seed * 13 + i * 47) % 8000))}`
    return {
      id,
      uuid: uuidOf(id),
      developer: { name: r.developer.name, logo: LOGO, id: r.developer.id },
      projectNameEn,
      projectId: r.id,
      phase: r.isPhase ? r.name : "",
      projectLevel: r.isPhase ? "Phase" : "Main Project",
      parentProjectId: r.mainProject?.id,
      area: r.area,
      areaId: launchAreaId(r.area),
      approvalStatus: "Approved" as const,
      ingestionStatus: "Ingested" as const,
      listingStatus: r.listingStatus,
      existingProject: { id: r.id, name: r.name },
      listingProject: { id: r.id, name: r.name },
      launchStatus,
      type,
      source: (seed + i) % 2 === 0 ? ("WhatsApp" as const) : ("Manual" as const),
      listingCompletion: 60 + ((seed + i * 7) % 41),
      eoiAmount: eoi,
      eoiByType: eoi && differsByType
        ? [
            { type: "Apartment", amount: eoi },
            { type: "Villa", amount: Math.min(1_000_000, eoi + 150_000) },
            { type: "Chalet", amount: Math.min(1_000_000, eoi + 50_000) },
          ]
        : undefined,
      coverImage: COVER,
      title: `${projectNameEn}${r.isPhase ? ` — ${r.name}` : ""} · Official Launch`,
      description: LAUNCH_DESCRIPTIONS[(seed + i) % LAUNCH_DESCRIPTIONS.length],
      // Only an activated launch has a start date; only a closed one has an end date.
      startDate: launchStatus === "Inactive" ? undefined : `2026-0${3 + (i % 3)}-${day}`,
      endDate: launchStatus === "Closed" ? `2026-0${5 + (i % 3)}-${day}` : undefined,
      activatedAt: launchStatus === "Inactive" ? undefined : `2026-0${3 + (i % 3)}-${day}T09:00:00`,
      closedAt: launchStatus === "Closed" ? `2026-0${5 + (i % 3)}-${day}T18:00:00` : undefined,
      plans: [
        { name: "Standard Plan", planType: "Equal Installments", dp: "10%", duration: `${6 + (seed % 3)} years` },
        { name: "Extended Plan", planType: "Backloaded", dp: "5%", duration: `${8 + (seed % 3)} years` },
      ].slice(0, 1 + ((seed + i) % 2)),
      offerings,
      incentives: type === "Launch"
        ? {
            commissionType: (seed + i) % 2 === 0 ? ("percentage" as const) : ("amount" as const),
            commissionValue: (seed + i) % 2 === 0 ? `${2 + ((seed + i) % 4)}` : `${(1 + ((seed + i) % 6)) * 25_000}`,
            brokerNotes: BROKER_NOTES[(seed + i) % BROKER_NOTES.length] || undefined,
          }
        : undefined,
      taskeen: type === "Launch"
        ? Array.from({ length: 1 + ((seed + i) % 2) }, (_, k) => ({
            date: `2026-0${3 + (i % 3)}-${String(10 + ((seed + k * 3) % 18)).padStart(2, "0")}`,
            types: offerings.map((o) => o.propertyType),
            address: (seed + i) % 2 === 0 ? "Developer Sales Center — New Cairo" : "Nawy HQ — Sheikh Zayed",
          }))
        : undefined,
      released: {
        units: relByType.reduce((s, t) => s + t.units, 0),
        buildings: 2 + ((seed + i) % 9),
        byType: relByType,
      },
      contacts: Array.from({ length: 1 + ((seed + i) % 2) }, (_, k) => CONTACT_POOL[(seed + i + k) % CONTACT_POOL.length]),
      aiUpdates: (seed + i) % 2 === 0 ? { count: 1 + (seed % 4), lastAt: `2026-0${4 + (i % 3)}-${day}T09:00:00` } : undefined,
      ingestedAt: `2026-0${2 + (i % 3)}-${day}T10:30:00`,
      sentAt: `2026-0${2 + (i % 3)}-${day}T07:30:00`,
      createdAt: `2026-0${3 + (i % 3)}-${day}T09:30:00Z`,
      updatedAt: `2026-0${4 + (i % 3)}-${String(5 + (seed % 20)).padStart(2, "0")}T14:00:00Z`,
    }
  })
}

/**
 * Not-yet-ingested launches stay hand-written — they are the Pending Review /
 * Rejected content and legitimately have no (or an unconfirmed) project link.
 */
function pendingSeed(): Launch[] {
  const mains = PROJECTS.filter((p) => !p.isPhase && !p.isSubProject)
  const phases = PROJECTS.filter((p) => p.isPhase)
  const matchedPhase = phases[0]
  const empty = { plans: [], offerings: [] }
  return [
    {
      id: "LCH-002",
      uuid: uuidOf("LCH-002"),
      title: "LCH-002 · Launch Announcement",
      description: "Awaiting review — details captured from the source announcement.",
      developer: { name: matchedPhase?.developer.name ?? "Emaar Misr", logo: LOGO, id: matchedPhase?.developer.id ?? "DEV-002" },
      projectNameEn: matchedPhase?.mainProject?.name ?? "Marassi North Coast",
      phase: matchedPhase?.name ?? "Phase 2",
      projectLevel: "Phase",
      parentProjectId: matchedPhase?.mainProject?.id,
      area: matchedPhase?.area ?? "North Coast",
      areaId: launchAreaId(matchedPhase?.area ?? "North Coast"),
      approvalStatus: "Pending Review",
      ingestionStatus: "Not Ingested",
      listingStatus: "Hidden",
      // Matched an existing phase that already has an Active launch → ingestion conflict.
      existingProject: matchedPhase ? { id: matchedPhase.id, name: matchedPhase.name } : undefined,
      launchStatus: "Inactive",
      type: "Launch",
      source: "Manual",
      listingCompletion: 45,
      eoiAmount: 75_000,
      coverImage: COVER,
      ...empty,
      sentAt: "2026-01-12T10:20:00",
      createdAt: "2026-01-12T11:00:00",
      updatedAt: "2026-01-14T16:45:00",
    },
    {
      id: "LCH-004",
      uuid: uuidOf("LCH-004"),
      title: "LCH-004 — Phase 1 · Launch Announcement",
      description: "Awaiting review — details captured from the source announcement.",
      developer: { name: mains[3]?.developer.name ?? "Mountain View", logo: LOGO, id: mains[3]?.developer.id ?? "DEV-004" },
      projectNameEn: mains[3]?.name ?? "Mountain View iCity",
      phase: "Phase 1",
      projectLevel: "Phase",
      parentProjectId: mains[3]?.id,
      area: mains[3]?.area ?? "New Cairo",
      areaId: launchAreaId(mains[3]?.area ?? "New Cairo"),
      approvalStatus: "Rejected",
      ingestionStatus: "Not Ingested",
      listingStatus: "Hidden",
      existingProject: mains[3] ? { id: mains[3].id, name: mains[3].name } : undefined,
      launchStatus: "Inactive",
      type: "Release",
      source: "Manual",
      listingCompletion: 0,
      coverImage: COVER,
      rejectionReason: "Payment plans missing — sent back to the developer.",
      ...empty,
      sentAt: "2026-01-05T13:10:00",
      createdAt: "2026-01-05T14:00:00",
      updatedAt: "2026-01-05T14:00:00",
    },
    {
      // Brand-new project — no system project yet, so ingestion must create one.
      id: "LCH-006",
      uuid: uuidOf("LCH-006"),
      title: "Hyde Park New Cairo · Launch Announcement",
      description: "Awaiting review — details captured from the source announcement.",
      developer: { name: "Hyde Park", logo: LOGO, id: "DEV-006" },
      projectNameEn: "Hyde Park New Cairo",
      phase: "",
      projectLevel: "Main Project",
      area: "New Cairo",
      areaId: launchAreaId("New Cairo"),
      approvalStatus: "Pending Review",
      ingestionStatus: "Not Ingested",
      listingStatus: "Hidden",
      launchStatus: "Inactive",
      type: "Launch",
      source: "WhatsApp",
      listingCompletion: 60,
      eoiAmount: 55_000,
      coverImage: COVER,
      ...empty,
      aiUpdates: { count: 1, lastAt: "2026-01-17T08:00:00" },
      sentAt: "2026-01-14T08:40:00",
      createdAt: "2026-01-14T10:00:00",
      updatedAt: "2026-01-16T09:30:00",
    },
    {
      id: "LCH-009",
      uuid: uuidOf("LCH-009"),
      title: "Mivida New Cairo · Launch Announcement",
      description: "Awaiting review — details captured from the source announcement.",
      developer: { name: "Emaar Misr", logo: LOGO, id: "DEV-002" },
      projectNameEn: "Mivida New Cairo",
      phase: "",
      projectLevel: "Main Project",
      area: "New Cairo",
      areaId: launchAreaId("New Cairo"),
      approvalStatus: "Rejected",
      ingestionStatus: "Not Ingested",
      listingStatus: "Hidden",
      launchStatus: "Inactive",
      type: "Launch",
      source: "Manual",
      listingCompletion: 20,
      eoiAmount: 45_000,
      coverImage: COVER,
      rejectionReason: "Duplicate of an existing launch.",
      ...empty,
      sentAt: "2026-01-06T12:00:00",
      createdAt: "2026-01-06T13:00:00",
      updatedAt: "2026-01-11T10:00:00",
    },
    {
      id: "LCH-010",
      uuid: uuidOf("LCH-010"),
      title: "VYE Sheikh Zayed — Phase 2 · Launch Announcement",
      description: "Awaiting review — details captured from the source announcement.",
      developer: { name: "Sodic", logo: LOGO, id: "DEV-003" },
      projectNameEn: "VYE Sheikh Zayed",
      phase: "Phase 2",
      projectLevel: "Phase",
      area: "Sheikh Zayed",
      areaId: launchAreaId("Sheikh Zayed"),
      approvalStatus: "Pending Review",
      ingestionStatus: "Not Ingested",
      listingStatus: "Hidden",
      launchStatus: "Inactive",
      type: "Launch",
      source: "WhatsApp",
      listingCompletion: 35,
      eoiAmount: 80_000,
      coverImage: COVER,
      ...empty,
      aiUpdates: { count: 2, lastAt: "2026-01-20T11:00:00" },
      sentAt: "2026-01-17T08:20:00",
      createdAt: "2026-01-17T09:00:00",
      updatedAt: "2026-01-19T15:00:00",
    },
  ]
}

function seed(): Launch[] {
  const generated = PROJECTS.flatMap(seedForProject)
  // Ids are seeded per project; drop any accidental collision so keys stay unique.
  const seen = new Set<string>()
  const unique = generated.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
  return [...pendingSeed(), ...unique]
}

// ─── Store ────────────────────────────────────────────────────────────────────
// A module store rather than lifted state: the launches table, the launch
// details page, the embedded launches tab and the projects' primary-status
// dialog all read/write these rows with no common ancestor short of AppShell.

let LAUNCHES: Launch[] = seed()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function useLaunches(): Launch[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => LAUNCHES,
    () => LAUNCHES,
  )
}

export function patchLaunches(ids: string[], p: Partial<Launch>) {
  const set = new Set(ids)
  LAUNCHES = LAUNCHES.map((l) => (set.has(l.id) ? { ...l, ...p, updatedAt: new Date().toISOString() } : l))
  emit()
}

export function addLaunch(l: Launch) {
  LAUNCHES = [l, ...LAUNCHES]
  emit()
}



/**
 * Data completeness for ingestion: a linked project/phase and a launch title are
 * mandatory; property offerings are optional, but each one present needs a
 * property type and at least one image.
 */
export function launchCompleteness(l: Launch): { pct: number; missing: string[] } {
  const linked = l.projectLevel === "Phase" ? !!(l.projectId && l.parentProjectId) : !!l.projectId
  const checks: { label: string; ok: boolean }[] = [
    { label: "Linked project / phase", ok: linked },
    { label: "Launch title", ok: !!(l.title ?? "").trim() },
    ...l.offerings.flatMap((o, i) => {
      const name = o.name || `Offering ${i + 1}`
      return [
        { label: `${name}: property type`, ok: !!o.propertyType },
        { label: `${name}: at least one image`, ok: (o.images ?? 0) > 0 },
      ]
    }),
  ]
  const ok = checks.filter((c) => c.ok).length
  return { pct: Math.round((ok / checks.length) * 100), missing: checks.filter((c) => !c.ok).map((c) => c.label) }
}

/** New AI update = WhatsApp messages were detected AFTER the launch was ingested. */
export function hasNewAiUpdate(l: Launch): boolean {
  const last = l.aiUpdates?.lastAt ?? l.sentAt
  return !!last && !!l.ingestedAt && new Date(last) > new Date(l.ingestedAt)
}

/** WhatsApp message-extraction datetimes, ascending — first message to last detected update. */
export function aiUpdateDates(l: Launch): string[] {
  const count = Math.max(1, l.aiUpdates?.count ?? 1)
  const first = new Date(l.sentAt).getTime()
  const last = new Date(l.aiUpdates?.lastAt ?? l.sentAt).getTime()
  if (count === 1 || !isFinite(first) || !isFinite(last) || last <= first) return [l.sentAt]
  return Array.from({ length: count }, (_, i) => new Date(first + ((last - first) * i) / (count - 1)).toISOString())
}

export const isIngestedLaunch = (l: Launch) => l.approvalStatus === "Approved" && l.ingestionStatus === "Ingested"

/** Card/cell display: one fee, or a min–max range when per-type fees differ. */
export function eoiRangeText(l: Launch): string | null {
  if (!l.eoiAmount) return null
  const amts = l.eoiByType?.length ? l.eoiByType.map((e) => e.amount) : [l.eoiAmount]
  const lo = Math.min(...amts), hi = Math.max(...amts)
  const fmt = (n: number) => `${n.toLocaleString("en-US")} EGP`
  return lo === hi ? fmt(lo) : `${lo.toLocaleString("en-US")} – ${fmt(hi)}`
}

/** Display label — "New Cairo Residences — Phase 1 · Launch". */
export const launchLabel = (l: Launch) => `${l.projectNameEn}${l.phase ? ` — ${l.phase}` : ""} · ${l.type}`

/** Same project/phase, ingested, type Launch and currently Active — the row activation must close. */
export function activeConflictOf(launch: Launch, rows: Launch[] = LAUNCHES): Launch | undefined {
  return rows.find((x) =>
    x.id !== launch.id
    && x.launchStatus === "Active"
    && x.type === "Launch"
    && isIngestedLaunch(x)
    && !x.archived
    && (x.projectId && launch.projectId
      ? x.projectId === launch.projectId
      : x.projectNameEn === launch.projectNameEn && x.phase === launch.phase),
  )
}

/** Activates a launch, closing whichever one it conflicts with. Only one can be active. */
export function activateLaunch(id: string, startDate: string): { closedId?: string } {
  const launch = LAUNCHES.find((l) => l.id === id)
  if (!launch) return {}
  const conflict = activeConflictOf(launch)
  const now = new Date().toISOString()
  LAUNCHES = LAUNCHES.map((l) => {
    if (l.id === id) return { ...l, launchStatus: "Active" as const, startDate, activatedAt: now, updatedAt: now }
    if (conflict && l.id === conflict.id) return { ...l, launchStatus: "Closed" as const, endDate: l.endDate ?? startDate, closedAt: now, updatedAt: now }
    return l
  })
  emit()
  return { closedId: conflict?.id }
}

/**
 * Takes a launch out of Active. Default is Closed (end date mandatory in the
 * dialogs); "Inactive" needs no end date — the launch simply stops running.
 */
export function closeLaunch(id: string, endDate?: string, to: "Closed" | "Inactive" = "Closed") {
  patchLaunches([id], {
    launchStatus: to,
    ...(endDate ? { endDate } : {}),
    ...(to === "Closed" ? { closedAt: new Date().toISOString() } : {}),
  })
}

/** Non-reactive snapshot — for seeding other mocks at module load. */
export function launchesSnapshot(): Launch[] {
  return LAUNCHES
}

/** Every launch linked to a project or phase id. */
export function launchesForProject(projectId: string, rows: Launch[] = LAUNCHES): Launch[] {
  return rows.filter((l) => l.projectId === projectId && !l.archived)
}

/**
 * Launch Properties belong to the PROJECT while it is in Launch — no property
 * carries a launch id — so the count comes from the linked project's own
 * bucket. Keeps entering and leaving Launch quoting the same number.
 */
export function launchPropsOf(l: Launch): number {
  const p = PROJECTS.find((x) => x.id === l.projectId)
  return p ? p.primaryStatusProps.launch.grouped : 0
}

// ─── Project primary status, written from the launches side ───────────────────
// Activating or closing a launch can move the linked project. The projects table
// keeps its rows in local state, so the write lands on the shared PROJECTS row
// and bumps a version the table subscribes to.

let primaryVersion = 0
const primaryListeners = new Set<() => void>()

export function useProjectPrimaryVersion(): number {
  return useSyncExternalStore(
    (cb) => { primaryListeners.add(cb); return () => { primaryListeners.delete(cb) } },
    () => primaryVersion,
    () => primaryVersion,
  )
}

export function setProjectPrimary(projectId: string, next: ProjPrimaryStatus) {
  const p = PROJECTS.find((x) => x.id === projectId)
  if (!p || p.primaryStatus === next) return
  p.primaryStatus = next
  primaryVersion++
  primaryListeners.forEach((l) => l())
}

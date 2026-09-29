// Mock data for the Properties Bulk Ingestion entries list.
// One entry model for every source: sheets, PDFs, photos of price lists and WhatsApp text.

import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"

export type SaleType = "Primary" | "Resale" | "Nawy Now" | "Launch"
export const SALE_TYPES: SaleType[] = ["Primary", "Resale", "Nawy Now", "Launch"]

/** Automatic = rows carry unit codes (detailed units). Manual = no unit codes (grouped properties). */
export type EntryDataType = "Automatic" | "Manual"
export const DATA_TYPES: EntryDataType[] = ["Automatic", "Manual"]

export type IngestionSource = "WhatsApp" | "Device"
export type PropertyCategory = "Residential" | "Commercial"
export type EntryFileKind = "Sheet" | "PDF" | "Image" | "Text"
export const FILE_KINDS: EntryFileKind[] = ["Sheet", "PDF", "Image", "Text"]

/**
 * The single ingestion pipeline — same 13 stages, same order for every type.
 * Extraction runs only for PDFs, photos and text; Project Assignment only with
 * more than one project; Grouping only for units with codes on Primary / Launch.
 */
export const ENTRY_STAGES = [
  "Initial Setup", "Extraction", "Mapping", "Project Assignment", "Transformation", "Standardization", "Matching",
  "Payment Plans", "Review", "Floor Plans", "Grouping", "Media", "Final Check", "Finalized",
] as const
export type EntryStage = (typeof ENTRY_STAGES)[number]

export interface EntryFile {
  name: string
  kind: EntryFileKind
  size: number
  origin: IngestionSource
  /** Pasted message text — read line by line by the extractor */
  content?: string
}

export interface IngestionEntry {
  id: string
  /** Primary file name — doubles as the entry's display name */
  fileName: string
  files: EntryFile[]
  /** null when the entry was auto-captured from WhatsApp and the developer couldn't be detected */
  developer: { id: string; name: string; logo: string } | null
  /** Projects covered by the entry — phases carry their main project name for grouping.
   *  A phase may be selected without its main project (the parent is then only implied). */
  projects: { id: string; name: string; main: string | null }[]
  stage: EntryStage
  saleType: SaleType
  dataType: EntryDataType
  uploadedBy: string
  /** Kind of the entry's files, or Mixed when they differ */
  fileType: EntryFileKind | "Mixed"
  source: IngestionSource
  categories: PropertyCategory[]
  createdAt: string
  updatedAt: string
  finalizedAt: string | null
  /** Analytics (meaningful for finalized entries) */
  groupedProperties: number
  detailedProperties: number
  totalTimeSec: number
  activeTimeSec: number
  /** Full inventory — absent units go missing; partial update — absent units stay untouched */
  coverage?: "full" | "partial" | ""
  /** Resale / Nawy Now — whose units these are */
  owner?: { name: string; phone: string }
  /** Finalized entries — the quality team's sign-off */
  qa?: { status: "Pending" | "Reviewed"; checks: { item: string; by: string; at: string }[] }
}

export const ENTRY_USERS = ["Ezz Hassan", "Sara Adel", "Omar Farouk", "Nour ElDin", "Youssef Kamal"]
const OWNERS = [
  { name: "Mohamed Adel", phone: "0100 555 1234" },
  { name: "Heba Sami", phone: "0122 410 7788" },
  { name: "Karim Nabil", phone: "0111 902 3345" },
]
const EXT: Record<EntryFileKind, string> = { Sheet: "xlsx", PDF: "pdf", Image: "jpg", Text: "txt" }

// Deterministic dates (no Date.now) so SSR and client match
function iso(dayOffset: number, hour: number) {
  const base = new Date(Date.UTC(2026, 1, 1, hour, 0, 0)) // 2026-02-01
  base.setUTCDate(base.getUTCDate() + dayOffset)
  return base.toISOString()
}

/** File mixes per data type — Automatic entries are mostly sheets, Manual ones docs, photos and text. */
const AUTO_MIXES: EntryFileKind[][] = [["Sheet"], ["Sheet"], ["PDF"], ["Sheet"], ["Sheet"], ["Sheet", "PDF"]]
const MANUAL_MIXES: EntryFileKind[][] = [["Text"], ["Text", "Image", "Image"], ["PDF"], ["Image", "Image", "Image", "Image"], ["Text", "PDF"], ["PDF", "Image"]]

function filesFor(slug: string, kinds: EntryFileKind[], i: number, origin: IngestionSource): EntryFile[] {
  return kinds.map((kind, k) => {
    const base =
      kind === "Sheet" ? `${slug}-inventory-${String(i + 1).padStart(2, "0")}` :
      kind === "PDF" ? `${slug}-price-list` :
      kind === "Image" ? `${slug}-price-list-photo-${k + 1}` :
      `${slug}-whatsapp-message`
    const size = kind === "Sheet" ? 240_000 + i * 9_000 : kind === "PDF" ? 3_400_000 + k * 120_000 : kind === "Image" ? 820_000 + k * 60_000 : 2_400
    return { name: `${base}.${EXT[kind]}`, kind, size, origin }
  })
}

function buildEntries(): IngestionEntry[] {
  const mains = PROJECTS.filter((p) => !p.isPhase)
  return Array.from({ length: 52 }, (_, i) => {
    const dataType: EntryDataType = i % 2 === 0 ? "Automatic" : "Manual"
    const k = Math.floor(i / 2)
    const main = mains[k % mains.length]
    // Every entry belongs to exactly one developer — the main project's
    const dev = PROJECT_DEVELOPERS.find((d) => d.id === main.developer.id) ?? PROJECT_DEVELOPERS[0]
    const phases = PROJECTS.filter((p) => p.isPhase && p.mainProject?.id === main.id).slice(0, (k % 3) + 1)
    const sibling = mains.find((m) => m.id !== main.id && m.developer.id === main.developer.id)
    const extraMain = k % 4 === 3 && sibling ? sibling : null
    const kinds = (dataType === "Automatic" ? AUTO_MIXES : MANUAL_MIXES)[k % 6]
    const sheetsOnly = kinds.every((x) => x === "Sheet")
    const saleType = (["Primary", "Resale", "Nawy Now", "Launch"] as const)[k % 4]
    // Each entry only sits in a stage that runs for it
    const oneProject = k % 4 === 2
    const stages = ENTRY_STAGES.filter((s) =>
      !(sheetsOnly && s === "Extraction") &&
      !(oneProject && s === "Project Assignment") &&
      !((dataType === "Manual" || saleType === "Resale" || saleType === "Nawy Now") && s === "Grouping"))
    const stage = stages[k % stages.length]
    const source: IngestionSource = (k + i) % 3 === 0 ? "WhatsApp" : "Device"
    const slug = main.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const files = filesFor(slug, kinds, i, source)
    // One WhatsApp capture whose developer couldn't be detected — setup must pick it
    const undetected = i === 3
    const allRefs = [
      { id: main.id, name: main.name, main: null as string | null },
      ...phases.map((p) => ({ id: p.id, name: p.name, main: main.name as string | null })),
      ...(extraMain ? [{ id: extraMain.id, name: extraMain.name, main: null as string | null }] : []),
    ]
    // k % 4 === 1: phases selected without their main project — the parent is only implied
    // k % 4 === 2: a single project — Project Assignment is skipped
    const projectRefs = oneProject ? allRefs.slice(0, 1) : k % 4 === 1 ? allRefs.filter((p) => p.id !== main.id) : allRefs
    return {
      id: `ENT-${String(1001 + i)}`,
      fileName: files[0].name,
      files,
      developer: undetected ? null : { id: dev.id, name: dev.name, logo: dev.logo },
      projects: undetected ? [] : projectRefs,
      stage: undetected ? "Initial Setup" : stage,
      saleType,
      dataType,
      uploadedBy: ENTRY_USERS[i % ENTRY_USERS.length],
      fileType: kinds.every((x) => x === kinds[0]) ? kinds[0] : "Mixed",
      source,
      categories: k % 3 === 0 ? ["Residential", "Commercial"] : ["Residential"],
      createdAt: iso(i * 2, 9),
      updatedAt: iso(i * 2 + 1, 15),
      finalizedAt: stage === "Finalized" && !undetected ? iso(i * 2 + 2, 11) : null,
      groupedProperties: 6 + (k % 9),
      detailedProperties: dataType === "Automatic" ? 5400 + k * 470 : 0,
      totalTimeSec: 6600 + i * 270,
      activeTimeSec: 2400 + i * 105,
      // Sheets usually carry the whole availability; documents, photos and messages are partial updates
      coverage: undetected ? "" : sheetsOnly && k % 5 !== 4 ? "full" : "partial",
      owner: saleType === "Resale" || saleType === "Nawy Now" ? OWNERS[i % OWNERS.length] : undefined,
      qa: stage === "Finalized" && !undetected ? (i % 3 === 0 ? { status: "Reviewed", checks: [{ item: "Prices spot-checked against the source", by: ENTRY_USERS[(i + 2) % ENTRY_USERS.length], at: iso(i * 2 + 3, 10) }] } : { status: "Pending", checks: [] }) : undefined,
    }
  })
}

export const ENTRIES: IngestionEntry[] = buildEntries()

/** Sheet-only entries skip Extraction — every other entry runs it. */
export const isSheetOnly = (e: Pick<IngestionEntry, "files">) => e.files.length > 0 && e.files.every((f) => f.kind === "Sheet")

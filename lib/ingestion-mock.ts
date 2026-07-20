// Mock data for the Data Ingestion entry tables (Automatic Sheets Entries / Manual Grouped Entries).

import { PROJECTS, PROJECT_DEVELOPERS } from "@/lib/projects-mock"

export type IngestionMode = "sheets" | "manual"
export type IngestionSource = "WhatsApp" | "Device"
export type PropertyCategory = "Residential" | "Commercial"

export const SHEET_STAGES = [
  "OCR Processing", "Initial Setup", "Sheet Preparation", "Mapping", "Transformations",
  "Formatting", "Review", "Payment Plans", "Floor Plans", "Grouping", "Finalized",
] as const
export const MANUAL_STAGES = [
  "Initial Setup", "Extraction", "Comparison", "Payment Plans", "Media", "Review", "Final Check", "Finalized",
] as const

export const SHEET_FILE_TYPES = ["Sheet", "PDF", "Image"] as const
export const MANUAL_FILE_TYPES = ["Text", "PDF", "Image"] as const

export interface IngestionEntry {
  id: string
  fileName: string
  developer: { id: string; name: string; logo: string }
  /** Projects covered by the entry — phases carry their main project name for grouping */
  projects: { id: string; name: string; main: string | null }[]
  stage: string
  uploadedBy: string
  fileType: string
  source: IngestionSource
  categories: PropertyCategory[]
  createdAt: string
  updatedAt: string
  finalizedAt: string | null
}

const USERS = ["Ezz Hassan", "Sara Adel", "Omar Farouk", "Nour ElDin", "Youssef Kamal"]
const EXT: Record<string, string> = { Sheet: "xlsx", PDF: "pdf", Image: "png", Text: "txt" }

// Deterministic dates (no Date.now) so SSR and client match
function iso(dayOffset: number, hour: number) {
  const base = new Date(Date.UTC(2026, 1, 1, hour, 0, 0)) // 2026-02-01
  base.setUTCDate(base.getUTCDate() + dayOffset)
  return base.toISOString()
}

function buildEntries(mode: IngestionMode): IngestionEntry[] {
  const stages = mode === "sheets" ? SHEET_STAGES : MANUAL_STAGES
  const fileTypes = mode === "sheets" ? SHEET_FILE_TYPES : MANUAL_FILE_TYPES
  const mains = PROJECTS.filter((p) => !p.isPhase)
  const prefix = mode === "sheets" ? "ING" : "MAN"
  return Array.from({ length: 26 }, (_, i) => {
    const dev = PROJECT_DEVELOPERS[i % PROJECT_DEVELOPERS.length]
    const main = mains[i % mains.length]
    const phases = PROJECTS.filter((p) => p.isPhase && p.mainProject?.id === main.id).slice(0, (i % 3) + 1)
    const extraMain = i % 4 === 3 ? mains[(i + 3) % mains.length] : null
    const stage = stages[i % stages.length]
    const fileType = fileTypes[i % fileTypes.length]
    const slug = main.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    return {
      id: `${prefix}-${String(1001 + i)}`,
      fileName: `${slug}-${mode === "sheets" ? "inventory" : "listing"}-${String(i + 1).padStart(2, "0")}.${EXT[fileType]}`,
      developer: dev,
      projects: [
        { id: main.id, name: main.name, main: null },
        ...phases.map((p) => ({ id: p.id, name: p.name, main: main.name })),
        ...(extraMain ? [{ id: extraMain.id, name: extraMain.name, main: null }] : []),
      ],
      stage,
      uploadedBy: USERS[i % USERS.length],
      fileType,
      source: (i % 3 === 0 ? "WhatsApp" : "Device") as IngestionSource,
      categories: i % 3 === 0 ? ["Residential", "Commercial"] : i % 3 === 1 ? ["Residential"] : ["Commercial"],
      createdAt: iso(i * 3, 9),
      updatedAt: iso(i * 3 + 2, 15),
      finalizedAt: stage === "Finalized" ? iso(i * 3 + 4, 11) : null,
    }
  })
}

export const SHEET_ENTRIES: IngestionEntry[] = buildEntries("sheets")
export const MANUAL_ENTRIES: IngestionEntry[] = buildEntries("manual")

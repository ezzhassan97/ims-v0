// Mock data for the Projects table (projects + phases as a flat row list).
// A phase row carries a `mainProject` reference; a project row has `mainProject: null`.

export type ProjListingStatus = "Active" | "Hidden"
export type ProjPrimaryStatus = "Launch" | "On-Sale" | "On-Hold" | "Sold-Off" | "Archived"
export type ProjEntryType = "Automatic" | "Manual"

export interface ProjectRow {
  id: string
  name: string
  isPhase: boolean
  mainProject: { id: string; name: string } | null
  developer: { id: string; name: string; logo: string }
  district: string
  area: string
  subarea: string
  listingStatus: ProjListingStatus
  primaryStatus: ProjPrimaryStatus
  entryType: ProjEntryType
  createdAt: string
  updatedAt: string
}

const DEVELOPERS = [
  { id: "DEV-001", name: "Palm Hills", logo: "PH" },
  { id: "DEV-002", name: "SODIC", logo: "SO" },
  { id: "DEV-003", name: "Mountain View", logo: "MV" },
  { id: "DEV-004", name: "Emaar Misr", logo: "EM" },
  { id: "DEV-005", name: "Ora Developers", logo: "OR" },
  { id: "DEV-006", name: "Tatweer Misr", logo: "TM" },
]

export const AREAS = ["New Cairo", "6th of October", "North Coast", "Sheikh Zayed", "New Capital", "Mostakbal City"]
export const DISTRICTS = ["5th Settlement", "Sodic West", "Ras El Hekma", "R7", "Downtown", "1st Settlement"]
export const SUBAREAS = ["Golden Square", "Bloomfields", "West Somid", "El Hekma Bay", "R7 Central", "Waslet Dahshour"]

const PRIMARY: ProjPrimaryStatus[] = ["Launch", "On-Sale", "On-Hold", "Sold-Off", "Archived"]

const PROJECT_NAMES = [
  "New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District",
  "Capital Gardens", "East Park", "Zed Towers", "Silver Sands", "Bloom Fields",
]

// Deterministic date so server/client render identically (no Date.now()).
function isoDate(dayOffset: number, hour = 9) {
  const base = new Date(Date.UTC(2026, 0, 1, hour, 0, 0)) // 2026-01-01
  base.setUTCDate(base.getUTCDate() + dayOffset)
  return base.toISOString()
}

function buildRows(): ProjectRow[] {
  const rows: ProjectRow[] = []
  PROJECT_NAMES.forEach((name, i) => {
    const dev = DEVELOPERS[i % DEVELOPERS.length]
    const area = AREAS[i % AREAS.length]
    const district = DISTRICTS[i % DISTRICTS.length]
    const projectId = `PRJ-${String(i + 1).padStart(4, "0")}`
    const project: ProjectRow = {
      id: projectId,
      name,
      isPhase: false,
      mainProject: null,
      developer: dev,
      district,
      area,
      subarea: SUBAREAS[i % SUBAREAS.length],
      listingStatus: i % 5 === 0 ? "Hidden" : "Active",
      primaryStatus: PRIMARY[i % PRIMARY.length],
      entryType: i % 3 === 0 ? "Manual" : "Automatic",
      createdAt: isoDate(i * 6, 9),
      updatedAt: isoDate(i * 6 + 3, 14),
    }
    rows.push(project)

    const phaseCount = (i % 3) + 1
    for (let p = 0; p < phaseCount; p++) {
      const seed = i * 7 + p + 1
      rows.push({
        id: `${projectId}-P${p + 1}`,
        name: `Phase ${p + 1}`,
        isPhase: true,
        mainProject: { id: projectId, name },
        developer: dev,
        district,
        area,
        subarea: `${SUBAREAS[i % SUBAREAS.length]} · Cluster ${String.fromCharCode(65 + p)}`,
        listingStatus: seed % 4 === 0 ? "Hidden" : "Active",
        primaryStatus: PRIMARY[seed % PRIMARY.length],
        entryType: seed % 2 === 0 ? "Manual" : "Automatic",
        createdAt: isoDate(i * 6 + p + 1, 10),
        updatedAt: isoDate(i * 6 + p + 4, 16),
      })
    }
  })
  return rows
}

export const PROJECTS: ProjectRow[] = buildRows()
export const PROJECT_DEVELOPERS = DEVELOPERS

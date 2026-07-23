// Mock data for the Projects table (projects + phases as a flat row list).
// A phase row carries a `mainProject` reference; a project row has `mainProject: null`.

export type ProjListingStatus = "Active" | "Hidden"
export type ProjPrimaryStatus = "Launch" | "On-Sale" | "On-Hold" | "Sold-Off"
export type ProjEntryType = "Automatic" | "Manual"
export type ProjOrg = "Nawy" | "Partners"
export type ProjConstructionStatus = "Off-plan" | "Under Construction" | "Completed"
export interface UnitCount { available: number; total: number }
/** Primary property counts (grouped + detailed) split by the entry type they were ingested with. */
export interface EntryPropCount { grouped: number; detailed: number }
export interface PrimaryByEntry { Automatic: EntryPropCount; Manual: EntryPropCount }

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
  organizations: ProjOrg[]
  category: string
  projectType: string
  projectSubtype: string
  constructionStatus: ProjConstructionStatus
  /** Ranks — manual is user-set (null when unset), automatic is system-computed */
  manualRank: number | null
  autoRank: number
  /** Land area in km² — null when unknown */
  areaKm2: number | null
  galleryImages: string[]
  brochureCount: number
  listingMasterplan: boolean
  gisMasterplan: boolean
  seoDescription: boolean
  buildingsCount: number
  /** Property counts impacted by primary-status changes */
  groupedProps: number
  detailedProps: number
  /** Primary properties split by entry type — drives the Change Entry Type impact preview */
  primaryByEntry: PrimaryByEntry
  /** Primary/Launch property breakdown (grouped + detailed per status) — drives the
   *  Change Primary Status impact preview. Only Primary & Launch properties cascade
   *  (never Resale / Nawy Now / Rental). */
  primaryStatusProps: { launch: EntryPropCount; available: EntryPropCount; onHold: EntryPropCount; soldOff: EntryPropCount }
  /** Sale-type unit counts: available / total */
  primaryUnits: UnitCount
  resaleUnits: UnitCount
  nawyNowUnits: UnitCount
  rentalUnits: UnitCount
  createdAt: string
  updatedAt: string
}

const DEVELOPERS = [
  { id: "DEV-001", name: "Palm Hills", logo: "PH", status: "Active" as const },
  { id: "DEV-002", name: "SODIC", logo: "SO", status: "Active" as const },
  { id: "DEV-003", name: "Mountain View", logo: "MV", status: "Active" as const },
  { id: "DEV-004", name: "Emaar Misr", logo: "EM", status: "Hidden" as const },
  { id: "DEV-005", name: "Ora Developers", logo: "OR", status: "Active" as const },
  { id: "DEV-006", name: "Tatweer Misr", logo: "TM", status: "Hidden" as const },
]

export const AREAS = ["New Cairo", "6th of October", "North Coast", "Sheikh Zayed", "New Capital", "Mostakbal City"]
export const DISTRICTS = ["5th Settlement", "Sodic West", "Ras El Hekma", "R7", "Downtown", "1st Settlement"]
export const SUBAREAS = ["Golden Square", "Bloomfields", "West Somid", "El Hekma Bay", "R7 Central", "Waslet Dahshour"]

/** Areas with their subareas nested — feeds the shared grouped area dropdown (AreaTreeSelect). */
export const AREA_TREE = AREAS.map((name, i) => ({
  id: `AREA-${String(i + 1).padStart(3, "0")}`,
  name,
  subareas: [{ id: `SUB-${String(i + 1).padStart(3, "0")}`, name: SUBAREAS[i] }],
}))

const PRIMARY: ProjPrimaryStatus[] = ["Launch", "On-Sale", "On-Hold", "Sold-Off"]

const CONSTRUCTION: ProjConstructionStatus[] = ["Off-plan", "Under Construction", "Completed"]
const CATEGORIES = ["Residential", "Commercial", "Mixed Use"]
const PROJECT_TYPES = ["Compound", "Standalone", "Coastal Resort"]
const PROJECT_SUBTYPES = ["Apartments", "Villas", "Mixed Units"]
const GALLERY_POOL = [
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg",
]
const orgsFor = (seed: number): ProjOrg[] => (seed % 3 === 0 ? ["Nawy"] : seed % 3 === 1 ? ["Nawy", "Partners"] : ["Partners"])

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
      organizations: orgsFor(i),
      category: CATEGORIES[i % CATEGORIES.length],
      projectType: PROJECT_TYPES[i % PROJECT_TYPES.length],
      projectSubtype: PROJECT_SUBTYPES[(i + 1) % PROJECT_SUBTYPES.length],
      constructionStatus: CONSTRUCTION[i % 3],
      manualRank: i % 3 === 0 ? null : i + 1,
      autoRank: ((i * 7) % 20) + 1,
      areaKm2: i % 4 === 3 ? null : Number((0.6 + i * 0.45).toFixed(1)),
      galleryImages: GALLERY_POOL.slice(0, i % 4),
      brochureCount: i % 3 === 2 ? 0 : (i % 4) + 1,
      listingMasterplan: i % 3 !== 1,
      gisMasterplan: i % 2 === 0,
      seoDescription: i % 3 !== 2,
      buildingsCount: i % 5 === 4 ? 0 : 6 + i * 3,
      groupedProps: 4 + ((i * 3) % 18),
      detailedProps: 30 + ((i * 23) % 160),
      primaryByEntry: {
        Automatic: { grouped: 3 + ((i * 2) % 12), detailed: 22 + ((i * 11) % 90) },
        Manual: { grouped: 2 + ((i * 3) % 10), detailed: 16 + ((i * 7) % 70) },
      },
      primaryStatusProps: {
        launch: { grouped: 2 + (i % 6), detailed: 4 + ((i * 3) % 18) },
        available: { grouped: 3 + ((i * 2) % 9), detailed: 12 + ((i * 5) % 40) },
        onHold: { grouped: i % 4, detailed: (i * 2) % 10 },
        soldOff: { grouped: (i * 3) % 7, detailed: (i * 7) % 26 },
      },
      primaryUnits: { available: 12 + ((i * 7) % 60), total: 40 + ((i * 13) % 120) },
      resaleUnits: { available: (i * 5) % 25, total: ((i * 5) % 25) + ((i * 9) % 40) },
      nawyNowUnits: { available: (i * 3) % 12, total: ((i * 3) % 12) + ((i * 5) % 18) },
      rentalUnits: { available: (i * 2) % 9, total: ((i * 2) % 9) + ((i * 4) % 14) },
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
        organizations: orgsFor(seed),
        category: CATEGORIES[i % CATEGORIES.length],
        projectType: PROJECT_TYPES[i % PROJECT_TYPES.length],
        projectSubtype: PROJECT_SUBTYPES[seed % PROJECT_SUBTYPES.length],
        constructionStatus: CONSTRUCTION[seed % 3],
        manualRank: seed % 4 === 0 ? null : (seed % 15) + 1,
        autoRank: (seed % 20) + 1,
        areaKm2: seed % 3 === 0 ? null : Number((0.2 + p * 0.15 + (i % 3) * 0.1).toFixed(2)),
        galleryImages: GALLERY_POOL.slice(0, seed % 4),
        brochureCount: seed % 4 === 1 ? 0 : seed % 3,
        listingMasterplan: seed % 4 !== 2,
        gisMasterplan: seed % 3 !== 1,
        seoDescription: seed % 3 !== 0,
        buildingsCount: seed % 4 === 0 ? 0 : 2 + (seed % 9),
        groupedProps: 2 + (seed % 9),
        detailedProps: 12 + ((seed * 13) % 70),
        primaryByEntry: {
          Automatic: { grouped: 1 + ((seed * 2) % 8), detailed: 8 + ((seed * 5) % 40) },
          Manual: { grouped: 1 + ((seed * 3) % 7), detailed: 6 + ((seed * 4) % 35) },
        },
        primaryStatusProps: {
          launch: { grouped: 1 + (seed % 4), detailed: 2 + ((seed * 3) % 10) },
          available: { grouped: 1 + ((seed * 2) % 6), detailed: 5 + ((seed * 5) % 20) },
          onHold: { grouped: seed % 3, detailed: seed % 6 },
          soldOff: { grouped: seed % 4, detailed: (seed * 4) % 12 },
        },
        primaryUnits: { available: 4 + ((seed * 3) % 30), total: 15 + ((seed * 7) % 60) },
        resaleUnits: { available: (seed * 2) % 14, total: ((seed * 2) % 14) + (seed % 20) },
        nawyNowUnits: { available: seed % 8, total: (seed % 8) + ((seed * 3) % 10) },
        rentalUnits: { available: seed % 6, total: (seed % 6) + ((seed * 2) % 9) },
        createdAt: isoDate(i * 6 + p + 1, 10),
        updatedAt: isoDate(i * 6 + p + 4, 16),
      })
    }
  })
  return rows
}

export const PROJECTS: ProjectRow[] = buildRows()
export const PROJECT_DEVELOPERS = DEVELOPERS

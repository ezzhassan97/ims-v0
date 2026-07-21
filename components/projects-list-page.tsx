"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  AlignLeft, ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink, GitBranch, ImagePlus, Info, MoreHorizontal, Download, Eye, FileText, Globe, Repeat, ToggleRight, Layers, Building2,
  Group as GroupIcon, MapPin, Plus, Tag as TagIcon, Map as MapIcon, Upload, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, FiltersDrawer, FilterDrawerField, FloatingBulkBar, BulkBarButton, MultiSortControl, ColumnsSheet, IdTag, COL_SEP, ProjectTreeSelect, AreaTreeSelect, DeveloperSelect,
  type SortLevel, type ProjectTreeSelection, type AreaPick,
} from "@/components/table-kit"
import { ProjectDetails } from "@/components/projects-page"
import {
  PROJECTS, PROJECT_DEVELOPERS, AREAS, DISTRICTS, SUBAREAS, AREA_TREE,
  type ProjectRow, type ProjListingStatus, type ProjPrimaryStatus, type ProjEntryType, type ProjOrg,
} from "@/lib/projects-mock"
import { GlobalMapDialog, MapDrawDialog, blobPolygon, centroid, LEVEL_COLOR, type GeoRef, type MapLocation } from "@/components/area-map"
import { BulkUploadDrawer } from "@/components/areas-page"

// ── Mock geometry for the projects & phases map ────────────────────────────────
// Mains spread across the basemap; phases cluster inside their parent. Some
// records deliberately miss a pin/polygon to feed the "Not Drawn Yet" list.
const MAIN_ROWS = PROJECTS.filter((p) => !p.isPhase)
const PROJECT_GEO0: GeoRef[] = PROJECTS.map((p) => {
  const mainId = p.mainProject?.id ?? p.id
  const mi = Math.max(0, MAIN_ROWS.findIndex((m) => m.id === mainId))
  const cx = 150 + (mi % 4) * 225 + ((mi * 37) % 40)
  const cy = 180 + Math.floor(mi / 4) * 175 + ((mi * 53) % 50)
  if (!p.isPhase) {
    return {
      id: p.id, name: p.name, level: "Project" as const, status: p.listingStatus, sub: p.developer.name,
      pin: mi % 4 === 3 ? null : { x: cx, y: cy },
      polygon: mi % 3 === 2 ? null : blobPolygon(cx, cy, 46),
    }
  }
  const siblings = PROJECTS.filter((q) => q.isPhase && q.mainProject?.id === mainId)
  const pi = Math.max(0, siblings.findIndex((q) => q.id === p.id))
  const px = cx - 25 + (pi % 3) * 26
  const py = cy - 18 + Math.floor(pi / 3) * 24
  return {
    id: p.id, name: p.name, level: "Phase" as const, status: p.listingStatus, sub: p.developer.name,
    parentId: mainId, parent: p.mainProject!.name,
    pin: pi % 3 === 1 ? null : { x: px, y: py },
    polygon: pi % 2 === 1 ? null : blobPolygon(px, py, 14),
  }
})
const PROJECT_MAP_LOCATIONS: MapLocation[] = PROJECT_GEO0.map((g) => ({ id: g.id, name: g.name, kind: g.level, center: centroid(g.polygon, g.pin) }))

const PRIMARY_STATUSES: ProjPrimaryStatus[] = ["Launch", "On-Sale", "On-Hold", "Sold-Off", "Archived"]

/** Public listing page for a project on nawy.com (mock slug). */
export const projSiteUrl = (name: string) => `https://www.nawy.com/compound/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
// UTC getters (the mock stores UTC ISO strings) so SSR and client render identically — no hydration mismatch.
export function fmtDateTime(iso: string) {
  const d = new Date(iso)
  const h = d.getUTCHours(); const ap = h < 12 ? "am" : "pm"; const h12 = h % 12 || 12
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`
}

// ── Colored location tags (stable colour per value) ───────────────────────────
const TAG_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-teal-50 text-teal-700 border-teal-200",
]
function tagColor(s: string) {
  let h = 0
  for (const c of s) h = (h + c.charCodeAt(0)) % TAG_COLORS.length
  return TAG_COLORS[h]
}
export function ColorTag({ value }: { value: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", tagColor(value))}>{value}</span>
}

const LISTING_COLORS: Record<ProjListingStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Hidden: "bg-red-50 text-red-600 border-red-200",
}
const ENTRY_COLORS: Record<ProjEntryType, string> = {
  Automatic: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Manual: "bg-blue-50 text-blue-700 border-blue-200",
}
const PRIMARY_COLORS: Record<ProjPrimaryStatus, string> = {
  Launch: "bg-green-50 text-green-700 border-green-200",           // light green
  "On-Sale": "bg-emerald-100 text-emerald-800 border-emerald-300", // darker green
  "On-Hold": "bg-orange-50 text-orange-700 border-orange-200",     // orange
  "Sold-Off": "bg-red-50 text-red-600 border-red-200",             // red
  Archived: "bg-red-100 text-red-800 border-red-300",              // darker red
}
// Rounded-md status tag (not a circular pill).
function Tag({ value, cls }: { value: string; cls: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", cls)}>{value}</span>
}

const RED_TAG = "bg-red-50 text-red-600 border-red-200"
const UPLOADED_TAG = "bg-emerald-50 text-emerald-700 border-emerald-200"
// Coordinates / polygon presence — same tags in the table columns and the details header
const ADDED_TAG = "bg-emerald-100 text-emerald-700 border-emerald-200"
const MISSING_TAG = "bg-red-100 text-red-700 border-red-200"

/** Organization tag — light tones like the rest of the tag system (Nawy light green, Partners light blue). */
export function OrgChip({ org }: { org: ProjOrg }) {
  return (
    <span className={cn(
      "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium",
      org === "Nawy" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-blue-200 bg-blue-100 text-blue-700",
    )}>
      {org}
    </span>
  )
}

export type CascadeKind = "developer" | "location" | "orgs" | "entry" | "parent"

/** Dependent classification tree: Category → Type → Subtype. */
export const CLASSIFICATION: Record<string, Record<string, string[]>> = {
  Residential: {
    Compound: ["Apartments", "Villas", "Mixed Units"],
    Standalone: ["Apartments", "Villas"],
    "Coastal Resort": ["Chalets", "Villas", "Mixed Units"],
  },
  Commercial: {
    "Office Park": ["Offices", "Clinics"],
    Retail: ["Shops", "F&B"],
  },
  "Mixed Use": {
    Compound: ["Mixed Units", "Apartments"],
    "Coastal Resort": ["Chalets", "Mixed Units"],
  },
}

const SORT_FIELDS = [
  { key: "createdAt", label: "Created at" },
  { key: "updatedAt", label: "Updated at" },
  { key: "buildingsCount", label: "Buildings count" },
  { key: "areaKm2", label: "Area (km²)" },
  { key: "primaryUnits", label: "Primary units" },
  { key: "resaleUnits", label: "Resale units" },
  { key: "nawyNowUnits", label: "Nawy Now units" },
  { key: "rentalUnits", label: "Rental units" },
  { key: "manualRank", label: "Manual rank" },
  { key: "autoRank", label: "Automatic rank" },
]
function sortVal(r: ProjectRow, k: string): number {
  switch (k) {
    case "createdAt": return new Date(r.createdAt).getTime()
    case "updatedAt": return new Date(r.updatedAt).getTime()
    case "buildingsCount": return r.buildingsCount
    case "areaKm2": return r.areaKm2 ?? -1
    case "primaryUnits": return r.primaryUnits.total
    case "resaleUnits": return r.resaleUnits.total
    case "nawyNowUnits": return r.nawyNowUnits.total
    case "rentalUnits": return r.rentalUnits.total
    case "manualRank": return r.manualRank ?? -1
    case "autoRank": return r.autoRank
    default: return 0
  }
}

function UnitsCell({ u }: { u: { available: number; total: number } }) {
  if (u.total === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="font-semibold text-foreground">{u.available}</span>
      <span className="text-muted-foreground">/{u.total}</span>
      <span className="ml-1 text-[10px] text-muted-foreground">Listed / Total</span>
    </span>
  )
}

/** Column definitions for the shared ColumnsSheet (order / hide / freeze). */
const PROJ_COLS = [
  { id: "name", label: "Project / Phase Name", width: 240 },
  { id: "mainProject", label: "Main Project", width: 180 },
  { id: "developer", label: "Developer", width: 200 },
  { id: "district", label: "District", width: 140 },
  { id: "area", label: "Area", width: 140 },
  { id: "subarea", label: "Subarea", width: 160 },
  { id: "listingStatus", label: "Listing Status", width: 130 },
  { id: "primaryStatus", label: "Primary Status", width: 130 },
  { id: "entryType", label: "Entry Type", width: 120 },
  { id: "organizations", label: "Organizations", width: 150 },
  { id: "category", label: "Category", width: 130 },
  { id: "projectType", label: "Type", width: 130 },
  { id: "projectSubtype", label: "Subtype", width: 130 },
  { id: "areaKm2", label: "Area (km²)", width: 110 },
  { id: "brochures", label: "Brochures", width: 130 },
  { id: "coordinates", label: "Coordinates", width: 120 },
  { id: "polygons", label: "Map Polygons", width: 130 },
  { id: "listingMp", label: "Listing Masterplans", width: 150 },
  { id: "gisMp", label: "GIS Masterplan", width: 140 },
  { id: "buildingsCount", label: "Buildings", width: 130 },
  { id: "primaryUnits", label: "Primary Properties", width: 170 },
  { id: "resaleUnits", label: "Resale Properties", width: 170 },
  { id: "nawyNowUnits", label: "Nawy Now", width: 160 },
  { id: "rentalUnits", label: "Rentals", width: 160 },
  { id: "manualRank", label: "Manual Rank", width: 130 },
  { id: "autoRank", label: "Automatic Rank", width: 150 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Updated At", width: 170 },
]
/** Header-click sortable columns — the same fields as the multi-sort control. */
const SORTABLE_COLS = new Set(SORT_FIELDS.map((f) => f.key))

type GroupByKey = "none" | "mainProject" | "developer" | "district" | "area" | "listingStatus" | "primaryStatus" | "entryType"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", mainProject: "Main Project", developer: "Developer", district: "District", area: "Area",
  listingStatus: "Listing Status", primaryStatus: "Primary Status", entryType: "Entry Type",
}
function groupKeyOf(row: ProjectRow, key: GroupByKey) {
  switch (key) {
    case "developer": return row.developer.name
    case "district": return row.district
    case "area": return row.area
    case "listingStatus": return row.listingStatus
    case "primaryStatus": return row.primaryStatus
    case "entryType": return row.entryType
    default: return ""
  }
}

export function ProjectsPage({ rows: rowsProp, hideDeveloperFilter = false, embedded = false }: { rows?: ProjectRow[]; hideDeveloperFilter?: boolean; embedded?: boolean } = {}) {
  const [rows, setRows] = useState<ProjectRow[]>(rowsProp ?? PROJECTS)
  const [selected, setSelected] = useState<ProjectRow | null>(null)
  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState<string[]>([])
  const [districtF, setDistrictF] = useState<string[]>([])
  const [areaF, setAreaF] = useState<string[]>([])
  const [listingF, setListingF] = useState("")
  const [primaryF, setPrimaryF] = useState<string[]>([])
  const [entryF, setEntryF] = useState("")
  const [levelF, setLevelF] = useState("")
  const [coordF, setCoordF] = useState("")
  const [polyF, setPolyF] = useState("")
  const [listingMpF, setListingMpF] = useState("")
  const [gisMpF, setGisMpF] = useState("")
  const [buildingsF, setBuildingsF] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(PROJ_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [mapOpen, setMapOpen] = useState(false)
  const [projGeo, setProjGeo] = useState<GeoRef[]>(PROJECT_GEO0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [listingDlg, setListingDlg] = useState<ProjectRow | null>(null)
  const [primaryDlg, setPrimaryDlg] = useState<ProjectRow | null>(null)
  const [drawTarget, setDrawTarget] = useState<ProjectRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [cascadeDlg, setCascadeDlg] = useState<{ kind: CascadeKind; targets: ProjectRow[]; ignored: number } | null>(null)
  const [bulkClass, setBulkClass] = useState(false)

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })

  const update = (id: string, patch: Partial<ProjectRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const geoOf = (id: string) => projGeo.find((g) => g.id === id)
  const phasesOf = (r: ProjectRow) => rows.filter((x) => x.isPhase && x.mainProject?.id === r.id)
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  /** Listing/primary changes cascade from a main project to all of its phases. */
  const applyListing = (r: ProjectRow, next: ProjListingStatus) =>
    setRows((rs) => rs.map((x) => (x.id === r.id || (!r.isPhase && x.mainProject?.id === r.id) ? { ...x, listingStatus: next } : x)))
  const applyPrimary = (r: ProjectRow, next: ProjPrimaryStatus) =>
    setRows((rs) => rs.map((x) => (x.id === r.id || (!r.isPhase && x.mainProject?.id === r.id) ? { ...x, primaryStatus: next } : x)))
  /** Cascading changes: main-project targets cascade to every phase under them; phase targets change only themselves. */
  const applyCascade = (kind: CascadeKind, targets: ProjectRow[], value: string | ProjOrg[]) => {
    const targetIds = new Set(targets.map((t) => t.id))
    setRows((rs) => {
      const parent = kind === "parent" ? rs.find((y) => y.id === value) : null
      return rs.map((x) => {
        const hit = targetIds.has(x.id) || (x.isPhase && !!x.mainProject && targetIds.has(x.mainProject.id))
        if (!hit) return x
        if (kind === "developer") { const dev = PROJECT_DEVELOPERS.find((d) => d.id === value)!; return { ...x, developer: dev } }
        if (kind === "location") return { ...x, area: value as string }
        if (kind === "entry") return { ...x, entryType: value as ProjEntryType }
        if (kind === "parent") return parent ? { ...x, mainProject: { id: parent.id, name: parent.name } } : x
        return { ...x, organizations: value as ProjOrg[] }
      })
    })
  }
  const BULK_CAP = 10
  /** Change Organizations is the only capped bulk action (10 rows); Export & Classification are unlimited. */
  const bulkGuard = (fn: () => void) => () => {
    if (selectedIds.size > BULK_CAP) { toast.error(`Change Organizations is limited to ${BULK_CAP} selected rows`); return }
    fn()
  }
  const openBulkCascade = (kind: CascadeKind) => {
    const sel = rows.filter((r) => selectedIds.has(r.id))
    const mains = sel.filter((r) => !r.isPhase)
    if (mains.length === 0) { toast.error("Select at least one main project — this action applies to main projects only"); return }
    setCascadeDlg({ kind, targets: mains, ignored: sel.length - mains.length })
  }

  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => PROJ_COLS.find((c) => c.id === id)!).filter(Boolean)
  // Sticky-left offset for a frozen column = checkbox column (40px) + preceding frozen widths
  const frozenLeft = (colId: string) => {
    let left = 40
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }
  const cycleHeaderSort = (key: string) =>
    setSorts((prev) => {
      const cur = prev.length === 1 && prev[0].key === key ? prev[0] : null
      if (!cur) return [{ key, dir: "asc" }]
      return cur.dir === "asc" ? [{ key, dir: "desc" }] : []
    })

  /** When grouped by Main Project, main rows aggregate their phases' numeric columns. */
  const aggOf = (m: ProjectRow): ProjectRow => {
    const phs = phasesOf(m)
    if (phs.length === 0) return m
    const sumUnits = (k: "primaryUnits" | "resaleUnits" | "nawyNowUnits" | "rentalUnits") => ({
      available: m[k].available + phs.reduce((s, p) => s + p[k].available, 0),
      total: m[k].total + phs.reduce((s, p) => s + p[k].total, 0),
    })
    const kmVals = [m.areaKm2, ...phs.map((p) => p.areaKm2)].filter((x): x is number => x != null)
    return {
      ...m,
      areaKm2: kmVals.length ? Number(kmVals.reduce((s, x) => s + x, 0).toFixed(2)) : null,
      brochureCount: m.brochureCount + phs.reduce((s, p) => s + p.brochureCount, 0),
      buildingsCount: m.buildingsCount + phs.reduce((s, p) => s + p.buildingsCount, 0),
      primaryUnits: sumUnits("primaryUnits"),
      resaleUnits: sumUnits("resaleUnits"),
      nawyNowUnits: sumUnits("nawyNowUnits"),
      rentalUnits: sumUnits("rentalUnits"),
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter((r) => {
      if (needle && !`${r.name} ${r.id}`.toLowerCase().includes(needle)) return false
      if (developerF.length > 0 && !developerF.includes(r.developer.id)) return false
      if (districtF.length > 0 && !districtF.includes(r.district)) return false
      if (areaF.length > 0 && !areaF.includes(r.area)) return false
      if (listingF && r.listingStatus !== listingF) return false
      if (primaryF.length > 0 && !primaryF.includes(r.primaryStatus)) return false
      if (entryF && r.entryType !== entryF) return false
      if (levelF && (r.isPhase ? "Phase" : "Main Project") !== levelF) return false
      if (coordF && (geoOf(r.id)?.pin ? "Added" : "Missing") !== coordF) return false
      if (polyF && (geoOf(r.id)?.polygon ? "Added" : "Missing") !== polyF) return false
      if (listingMpF && (r.listingMasterplan ? "Uploaded" : "Missing") !== listingMpF) return false
      if (gisMpF && (r.gisMasterplan ? "Uploaded" : "Missing") !== gisMpF) return false
      if (buildingsF && (r.buildingsCount > 0 ? "Has buildings" : "No buildings") !== buildingsF) return false
      return true
    })
    if (sorts.length > 0) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const d = sortVal(a, s.key) - sortVal(b, s.key)
          if (d !== 0) return s.dir === "asc" ? d : -d
        }
        return 0
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, developerF, districtF, areaF, listingF, primaryF, entryF, levelF, coordF, polyF, listingMpF, gisMpF, buildingsF, sorts, projGeo])

  const groups = useMemo(() => {
    if (groupBy === "none" || groupBy === "mainProject") return null
    const map = new Map<string, ProjectRow[]>()
    for (const r of filtered) {
      const k = groupKeyOf(r, groupBy)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()].map(([label, rs]) => ({ label, rows: rs }))
  }, [filtered, groupBy])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Coverage analytics — dynamic: follow the applied filters
  const mainCount = filtered.filter((r) => !r.isPhase).length
  const phaseCount = filtered.filter((r) => r.isPhase).length
  const covered = (pred: (r: ProjectRow) => boolean) => filtered.filter(pred).length

  if (creating) {
    return (
      <AddProjectPage
        onBack={() => setCreating(false)}
        onSave={(row) => {
          setRows((rs) => [row, ...rs])
          toast.success(`${row.name} created`)
          setCreating(false)
          setSelected(row) // straight to the details page to complete the rest
        }}
      />
    )
  }

  if (selected) {
    return <ProjectDetails project={selected} onBack={() => setSelected(null)} />
  }

  const activeFilterCount =
    [listingF, entryF, levelF, coordF, polyF, listingMpF, gisMpF, buildingsF].filter(Boolean).length +
    [developerF, districtF, areaF, primaryF].filter((a) => a.length > 0).length
  const clearAllFilters = () => {
    setDeveloperF([]); setDistrictF([]); setAreaF([]); setListingF(""); setPrimaryF([]); setEntryF("")
    setLevelF(""); setCoordF(""); setPolyF(""); setListingMpF(""); setGisMpF(""); setBuildingsF(""); setPage(1)
  }

  const treeMode = groupBy === "mainProject"
  // Header checkbox scope = the rows currently rendered (page in flat mode, all groups otherwise).
  // Selecting the whole result set lives in the bulk bar's "Select all".
  const renderedRows = treeMode || groups ? filtered : pageRows
  const allPageSelected = renderedRows.length > 0 && renderedRows.every((r) => selectedIds.has(r.id))
  const togglePageSelect = (v: boolean) =>
    setSelectedIds((prev) => {
      const n = new Set(prev)
      renderedRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)))
      return n
    })
  const expandAllGroups = () => {
    if (treeMode) setExpandedMains(new Set(filtered.filter((r) => !r.isPhase).map((r) => r.id)))
    else setCollapsedGroups(new Set())
  }
  const collapseAllGroups = () => {
    if (treeMode) setExpandedMains(new Set())
    else setCollapsedGroups(new Set((groups ?? []).map((g) => g.label)))
  }

  // d = display row: when grouped by Main Project, mains aggregate their phases' numeric columns
  const cellContent = (colId: string, r: ProjectRow, d: ProjectRow) => {
    switch (colId) {
      case "name":
        return (
          <div className="flex items-center gap-2.5">
            {treeMode && !r.isPhase && (
              phasesOf(r).length > 0 ? (
                <button
                  className="flex-shrink-0 rounded p-0.5 hover:bg-secondary"
                  onClick={(e) => { e.stopPropagation(); setExpandedMains((prev) => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n }) }}
                >
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !expandedMains.has(r.id) && "-rotate-90")} />
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )
            )}
            <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border", r.isPhase ? "border-border bg-muted text-muted-foreground" : "border-primary/20 bg-primary/10 text-primary")}>
              {r.isPhase ? <Layers className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.name}</p>
              <IdTag value={r.id} />
            </div>
          </div>
        )
      case "mainProject":
        return r.mainProject ? (
          <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
            <a href={`/projects/${r.mainProject.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">{r.mainProject.name}</a>
            <IdTag value={r.mainProject.id} />
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Main Project</span>
        )
      case "developer":
        return (
          <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{r.developer.logo}</span>
            <div className="min-w-0">
              <a href={`/developers/${r.developer.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">{r.developer.name}</a>
              <IdTag value={r.developer.id} />
            </div>
          </div>
        )
      case "district": return <ColorTag value={r.district} />
      case "area": return <ColorTag value={r.area} />
      case "subarea": return <ColorTag value={r.subarea} />
      case "listingStatus": return <Tag value={r.listingStatus} cls={LISTING_COLORS[r.listingStatus]} />
      case "primaryStatus": return <Tag value={r.primaryStatus} cls={PRIMARY_COLORS[r.primaryStatus]} />
      case "entryType": return <Tag value={r.entryType} cls={ENTRY_COLORS[r.entryType]} />
      case "organizations": return <div className="flex gap-1">{r.organizations.map((o) => <OrgChip key={o} org={o} />)}</div>
      case "category": return <ColorTag value={r.category} />
      case "projectType": return <ColorTag value={r.projectType} />
      case "projectSubtype": return <ColorTag value={r.projectSubtype} />
      case "areaKm2": return <span className="whitespace-nowrap text-sm text-muted-foreground">{d.areaKm2 == null ? "—" : `${d.areaKm2} km²`}</span>
      case "brochures":
        return d.brochureCount === 0
          ? <Tag value="No brochures" cls={RED_TAG} />
          : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{d.brochureCount}</span>
      case "coordinates": return <Tag value={geoOf(r.id)?.pin ? "Added" : "Missing"} cls={geoOf(r.id)?.pin ? ADDED_TAG : MISSING_TAG} />
      case "polygons": return <Tag value={geoOf(r.id)?.polygon ? "Added" : "Missing"} cls={geoOf(r.id)?.polygon ? ADDED_TAG : MISSING_TAG} />
      case "listingMp": return <Tag value={r.listingMasterplan ? "Uploaded" : "Missing"} cls={r.listingMasterplan ? UPLOADED_TAG : RED_TAG} />
      case "gisMp": return <Tag value={r.gisMasterplan ? "Uploaded" : "Missing"} cls={r.gisMasterplan ? UPLOADED_TAG : RED_TAG} />
      case "buildingsCount":
        return d.buildingsCount === 0
          ? <Tag value="No buildings" cls={RED_TAG} />
          : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{d.buildingsCount}</span>
      case "primaryUnits": return <UnitsCell u={d.primaryUnits} />
      case "resaleUnits": return <UnitsCell u={d.resaleUnits} />
      case "nawyNowUnits": return <UnitsCell u={d.nawyNowUnits} />
      case "rentalUnits": return <UnitsCell u={d.rentalUnits} />
      case "manualRank": return <span className="text-sm text-muted-foreground">{r.manualRank == null ? "—" : r.manualRank}</span>
      case "autoRank": return <span className="text-sm text-muted-foreground">{r.autoRank}</span>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.updatedAt)}</span>
      default: return null
    }
  }

  const renderRow = (r: ProjectRow) => {
    const d = treeMode && !r.isPhase ? aggOf(r) : r
    return (
      <tr
        key={r.id}
        onClick={() => setSelected(r)}
        className={cn(
          "group cursor-pointer transition-colors hover:bg-muted/40",
          treeMode && r.isPhase && "bg-muted/20",
          treeMode && !r.isPhase && expandedMains.has(r.id) && "bg-primary/5",
        )}
      >
        {/* Selection checkbox — frozen left, matching the frozen-column offsets (they start at 40px) */}
        <td className="sticky left-0 z-10 w-10 bg-card py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="h-4 w-4" />
        </td>
        {visibleCols.map((c) => (
          <td
            key={c.id}
            className={cn(
              c.id === "name" ? cn("py-3 pr-4", treeMode && r.isPhase ? "pl-10" : "pl-5") : "px-4 py-3",
              frozenCols.has(c.id) && "sticky z-10 bg-card",
            )}
            style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
          >
            {cellContent(c.id, r, d)}
          </td>
        ))}
        {/* Action — frozen right */}
        <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setSelected(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(projSiteUrl(r.name), "_blank", "noopener")}><ExternalLink className="mr-2 h-3.5 w-3.5" />View on Website</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCascadeDlg({ kind: "entry", targets: [r], ignored: 0 })}><Repeat className="mr-2 h-3.5 w-3.5" />Change Entry Type</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setListingDlg(r)}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrimaryDlg(r)}><TagIcon className="mr-2 h-3.5 w-3.5" />Change Primary Status</DropdownMenuItem>
              <DropdownMenuSeparator />
              {r.isPhase ? (
                <DropdownMenuItem onClick={() => setCascadeDlg({ kind: "parent", targets: [r], ignored: 0 })}><GitBranch className="mr-2 h-3.5 w-3.5" />Change Parent Project</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setCascadeDlg({ kind: "developer", targets: [r], ignored: 0 })}><Building2 className="mr-2 h-3.5 w-3.5" />Change Developer</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setCascadeDlg({ kind: "location", targets: [r], ignored: 0 })}><MapPin className="mr-2 h-3.5 w-3.5" />Change Area</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCascadeDlg({ kind: "orgs", targets: [r], ignored: 0 })}><Globe className="mr-2 h-3.5 w-3.5" />Change Organizations</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDrawTarget(r)}><MapIcon className="mr-2 h-3.5 w-3.5" />Draw on Map</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-secondary/40"}>
      <div className={embedded ? "space-y-4" : "space-y-4 p-6"}>
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">All projects and phases in the system</p>
          </div>
        )}

        {/* Coverage analytics — how complete the data is across the filtered rows */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CoverageCard icon={<MapPin className="h-4 w-4 text-primary" />} label="Coordinates & Polygons" covered={covered((r) => !!geoOf(r.id)?.pin && !!geoOf(r.id)?.polygon)} total={filtered.length} />
          <CoverageCard icon={<MapIcon className="h-4 w-4 text-indigo-600" />} label="Listing Masterplan" covered={covered((r) => r.listingMasterplan)} total={filtered.length} />
          <CoverageCard icon={<Globe className="h-4 w-4 text-emerald-600" />} label="GIS Masterplan" covered={covered((r) => r.gisMasterplan)} total={filtered.length} />
          <CoverageCard icon={<Building2 className="h-4 w-4 text-amber-500" />} label="Buildings" covered={covered((r) => r.buildingsCount > 0)} total={filtered.length} />
          <CoverageCard icon={<FileText className="h-4 w-4 text-purple-600" />} label="Brochures" covered={covered((r) => r.brochureCount > 0)} total={filtered.length} />
          <CoverageCard icon={<AlignLeft className="h-4 w-4 text-rose-500" />} label="SEO Description" covered={covered((r) => r.seoDescription)} total={filtered.length} />
        </div>

        {/* Search + filters + controls */}
        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Project name or ID"
          hideAdvanced
          onAllFilters={() => setShowFilters(true)}
          onColumns={() => setShowColumns(true)}
          activeFilters={activeFilterCount}
          filters={
            <>
              {!hideDeveloperFilter && <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />}
              <FilterMultiSelect label="District" value={districtF} options={DISTRICTS} onChange={(v) => { setDistrictF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Area" value={areaF} options={AREAS} onChange={(v) => { setAreaF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Listing Status" value={listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Primary Status" value={primaryF} options={PRIMARY_STATUSES} onChange={(v) => { setPrimaryF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Entry Type" value={entryF} options={["Automatic", "Manual"]} onChange={(v) => { setEntryF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Level" value={levelF} options={["Main Project", "Phase"]} onChange={(v) => { setLevelF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Coordinates" value={coordF} options={["Added", "Missing"]} onChange={(v) => { setCoordF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Polygons" value={polyF} options={["Added", "Missing"]} onChange={(v) => { setPolyF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Listing Masterplan" value={listingMpF} options={["Uploaded", "Missing"]} onChange={(v) => { setListingMpF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="GIS Masterplan" value={gisMpF} options={["Uploaded", "Missing"]} onChange={(v) => { setGisMpF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Buildings" value={buildingsF} options={["Has buildings", "No buildings"]} onChange={(v) => { setBuildingsF(v); setPage(1) }} className="w-40" />
            </>
          }
          sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
          groupControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(GROUP_LABEL) as GroupByKey[]).map((k) => (
                  <DropdownMenuItem
                    key={k}
                    onClick={() => {
                      setGroupBy(k)
                      // Grouping by Main Project starts with every main expanded
                      if (k === "mainProject") setExpandedMains(new Set(rows.filter((r) => !r.isPhase).map((r) => r.id)))
                    }}
                    className="text-sm"
                  >
                    {k === "none" ? "No grouping" : GROUP_LABEL[k]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Table */}
        <TableCard>
          <TableCardHeader
            title="Projects"
            count={mainCount}
            extra={
              <>
                <span className="ml-1 text-sm font-semibold text-foreground">Phases</span>
                <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{phaseCount.toLocaleString()}</span>
                {groupBy !== "none" && (
                  <div className="ml-2 flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={expandAllGroups}>
                      <ChevronsUpDown className="h-3.5 w-3.5" />Expand all
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={collapseAllGroups}>
                      <ChevronsDownUp className="h-3.5 w-3.5" />Collapse all
                    </Button>
                  </div>
                )}
              </>
            }
            cta={!embedded ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-3.5 w-3.5" />Upload Polygons
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setMapOpen(true)}>
                  <MapIcon className="h-3.5 w-3.5" />Map
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5" />Add Project
                </Button>
              </div>
            ) : undefined}
          />
          <div className="overflow-x-auto">
            <table className={cn("w-max text-sm", COL_SEP)}>
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-20 w-10 bg-muted/60 py-3 pl-4 pr-0">
                    <Checkbox
                      className="h-4 w-4"
                      checked={allPageSelected}
                      onCheckedChange={(v) => togglePageSelect(!!v)}
                    />
                  </th>
                  {visibleCols.map((c) => {
                    const s = sorts.find((x) => x.key === c.id)
                    return (
                      <th
                        key={c.id}
                        className={cn("whitespace-nowrap px-4 py-3 text-left", c.id === "name" && "pl-5", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                      >
                        {SORTABLE_COLS.has(c.id) ? (
                          <button onClick={() => cycleHeaderSort(c.id)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                            {c.label}
                            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </button>
                        ) : c.label}
                      </th>
                    )
                  })}
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {treeMode ? (
                  filtered.filter((m) => !m.isPhase).map((m) => {
                    const phs = filtered.filter((p) => p.isPhase && p.mainProject?.id === m.id)
                    const open = expandedMains.has(m.id)
                    return (
                      <Fragment key={m.id}>
                        {renderRow(m)}
                        {open && phs.length > 0 && (
                          <tr className="bg-primary/5">
                            <td className="w-10 p-0" />
                            <td colSpan={visibleCols.length + 1} className="p-0">
                              {/* sticky-left so the separator stays put on horizontal scroll */}
                              <div className="sticky left-10 w-max py-1.5 pl-6 pr-4">
                                <span className="border-l-2 border-primary pl-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  {phs.length} Phases and Subprojects
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {open && phs.map(renderRow)}
                      </Fragment>
                    )
                  })
                ) : groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={visibleCols.length + 2} className="p-0">
                          <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                            <span className="text-sm font-semibold text-foreground">{g.label}</span>
                            <span className="text-xs text-muted-foreground">{g.rows.length} row{g.rows.length !== 1 ? "s" : ""}</span>
                          </div>
                        </td>
                      </tr>
                      {!collapsedGroups.has(g.label) && g.rows.map(renderRow)}
                    </Fragment>
                  ))
                ) : (
                  pageRows.map(renderRow)
                )}
                {filtered.length === 0 && (
                  <tr><td colSpan={visibleCols.length + 2} className="px-5 py-16 text-center text-sm text-muted-foreground">No projects match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {treeMode ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              {filtered.filter((m) => !m.isPhase).length} main projects · {filtered.filter((m) => m.isPhase).length} phases nested
            </div>
          ) : groups ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} rows in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
          ) : (
            <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="projects" />
          )}
        </TableCard>

        {mapOpen && (
          <GlobalMapDialog
            title="Projects Map"
            entities={projGeo}
            locations={PROJECT_MAP_LOCATIONS}
            onClose={() => setMapOpen(false)}
            onSave={(updated) => {
              setProjGeo(updated)
              toast.success("Map changes saved")
            }}
          />
        )}

        {/* Bulk actions */}
        <FloatingBulkBar
          count={selectedIds.size}
          total={filtered.length}
          onSelectAll={() => setSelectedIds(new Set(filtered.map((r) => r.id)))}
          onClear={() => setSelectedIds(new Set())}
        >
          {/* Only Export (no cap), Classification (no cap) and Change Organizations (10-row cap) are allowed in bulk */}
          <BulkBarButton icon={<Download className="h-4 w-4" />} onClick={() => { toast.success(`${selectedIds.size} row${selectedIds.size > 1 ? "s" : ""} exported to CSV`); setSelectedIds(new Set()) }}>Export</BulkBarButton>
          <BulkBarButton icon={<TagIcon className="h-4 w-4" />} onClick={() => setBulkClass(true)}>Classification</BulkBarButton>
          <BulkBarButton icon={<Globe className="h-4 w-4" />} onClick={bulkGuard(() => openBulkCascade("orgs"))}>Change Organizations</BulkBarButton>
        </FloatingBulkBar>

        {listingDlg && (
          <ListingStatusDialog
            r={listingDlg}
            phases={phasesOf(listingDlg)}
            onClose={() => setListingDlg(null)}
            onConfirm={() => {
              const next: ProjListingStatus = listingDlg.listingStatus === "Active" ? "Hidden" : "Active"
              applyListing(listingDlg, next)
              toast.success(`${listingDlg.name} set to ${next}${!listingDlg.isPhase && phasesOf(listingDlg).length ? ` with ${phasesOf(listingDlg).length} phases` : ""}`)
              setListingDlg(null)
            }}
          />
        )}

        {primaryDlg && (
          <PrimaryStatusDialog
            r={primaryDlg}
            phases={phasesOf(primaryDlg)}
            onClose={() => setPrimaryDlg(null)}
            onConfirm={(next) => {
              applyPrimary(primaryDlg, next)
              toast.success(`${primaryDlg.name} set to ${next}${!primaryDlg.isPhase && phasesOf(primaryDlg).length ? ` with ${phasesOf(primaryDlg).length} phases` : ""}`)
              setPrimaryDlg(null)
            }}
          />
        )}

        {drawTarget && (
          <MapDrawDialog
            name={drawTarget.name}
            level={drawTarget.isPhase ? "Phase" : "Project"}
            entityId={drawTarget.id}
            pin={geoOf(drawTarget.id)?.pin ?? null}
            polygon={geoOf(drawTarget.id)?.polygon ?? null}
            locations={PROJECT_MAP_LOCATIONS}
            backdrop={drawTarget.isPhase
              ? projGeo.filter((x) => x.id === drawTarget.mainProject!.id && x.polygon).map((x) => ({ pts: x.polygon!, color: LEVEL_COLOR.Project }))
              : []}
            onClose={() => setDrawTarget(null)}
            onSave={(pin, polygon) => {
              setProjGeo((prev) => prev.some((x) => x.id === drawTarget.id)
                ? prev.map((x) => (x.id === drawTarget.id ? { ...x, pin, polygon } : x))
                : [...prev, { id: drawTarget.id, name: drawTarget.name, level: drawTarget.isPhase ? "Phase" as const : "Project" as const, status: drawTarget.listingStatus, sub: drawTarget.developer.name, parentId: drawTarget.mainProject?.id, parent: drawTarget.mainProject?.name, pin, polygon }])
              setDrawTarget(null)
              toast.success("Map geometry saved")
            }}
          />
        )}

        {cascadeDlg && (
          <CascadeChangeDialog
            kind={cascadeDlg.kind}
            targets={cascadeDlg.targets}
            ignored={cascadeDlg.ignored}
            allRows={rows}
            onClose={() => setCascadeDlg(null)}
            onConfirm={(value) => {
              applyCascade(cascadeDlg.kind, cascadeDlg.targets, value)
              const t = cascadeDlg.targets
              toast.success(t.length === 1 && t[0].isPhase ? `${t[0].name} updated` : `${t.length} main project${t.length > 1 ? "s" : ""} updated with their phases`)
              setCascadeDlg(null)
              setSelectedIds(new Set())
            }}
          />
        )}

        {bulkClass && (
          <BulkClassificationDialog
            count={selectedIds.size}
            onClose={() => setBulkClass(false)}
            onConfirm={(category, projectType, projectSubtype) => {
              setRows((rs) => rs.map((x) => (selectedIds.has(x.id) ? { ...x, category, projectType, projectSubtype } : x)))
              toast.success(`${selectedIds.size} row${selectedIds.size > 1 ? "s" : ""} reclassified`)
              setBulkClass(false)
              setSelectedIds(new Set())
            }}
          />
        )}

        <ColumnsSheet
          open={showColumns}
          onClose={() => setShowColumns(false)}
          columns={PROJ_COLS}
          order={colOrder}
          onOrderChange={setColOrder}
          hidden={hiddenCols}
          onHiddenChange={setHiddenCols}
          frozen={frozenCols}
          onFrozenChange={setFrozenCols}
        />

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer open={showFilters} onClose={() => setShowFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
          {!hideDeveloperFilter && (
            <FilterDrawerField label="Developer">
              <FilterMultiSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" width="w-full" />
            </FilterDrawerField>
          )}
          <FilterDrawerField label="District">
            <FilterMultiSelect label="District" value={districtF} options={DISTRICTS} onChange={(v) => { setDistrictF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Area">
            <FilterMultiSelect label="Area" value={areaF} options={AREAS} onChange={(v) => { setAreaF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Listing Status">
            <FilterSelect label="Listing Status" value={listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Primary Status">
            <FilterMultiSelect label="Primary Status" value={primaryF} options={PRIMARY_STATUSES} onChange={(v) => { setPrimaryF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Entry Type">
            <FilterSelect label="Entry Type" value={entryF} options={["Automatic", "Manual"]} onChange={(v) => { setEntryF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Level">
            <FilterSelect label="Level" value={levelF} options={["Main Project", "Phase"]} onChange={(v) => { setLevelF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Coordinates">
            <FilterSelect label="Coordinates" value={coordF} options={["Added", "Missing"]} onChange={(v) => { setCoordF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Polygons">
            <FilterSelect label="Polygons" value={polyF} options={["Added", "Missing"]} onChange={(v) => { setPolyF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Listing Masterplan">
            <FilterSelect label="Listing Masterplan" value={listingMpF} options={["Uploaded", "Missing"]} onChange={(v) => { setListingMpF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="GIS Masterplan">
            <FilterSelect label="GIS Masterplan" value={gisMpF} options={["Uploaded", "Missing"]} onChange={(v) => { setGisMpF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Buildings">
            <FilterSelect label="Buildings" value={buildingsF} options={["Has buildings", "No buildings"]} onChange={(v) => { setBuildingsF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
        </FiltersDrawer>

        {uploadOpen && (
          <BulkUploadDrawer
            level="Projects"
            rows={rows.map((p) => ({ id: p.id, name: p.isPhase ? `${p.mainProject!.name} — ${p.name}` : p.name, kind: p.isPhase ? "Phase" : "Project" }))}
            onClose={() => setUploadOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-3 text-left", className)}>{children}</th>
}

/** Coverage stat: covered/total + % + progress bar. */
function CoverageCard({ icon, label, covered, total }: { icon: React.ReactNode; label: string; covered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((covered / total) * 100)
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">{icon}<span className="truncate text-xs text-muted-foreground">{label}</span></div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xl font-bold leading-6 text-foreground">
          {covered}<span className="text-sm font-medium text-muted-foreground">/{total}</span>
        </p>
        <span className="text-xs font-semibold text-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-1.5 h-1.5" />
    </div>
  )
}

/** Phase cascade preview: name + ID, current tag → new tag. */
function PhaseCascadeList({ phases, tagOf, next, nextCls }: {
  phases: ProjectRow[]
  tagOf: (p: ProjectRow) => { value: string; cls: string }
  next: string
  nextCls: string
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
      {phases.map((p, i) => {
        const cur = tagOf(p)
        return (
          <div key={p.id} className={cn("flex items-center gap-2 px-3 py-2", i > 0 && "border-t border-border/70")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
              <IdTag value={p.id} />
            </div>
            <Tag value={cur.value} cls={cur.cls} />
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <Tag value={next} cls={nextCls} />
          </div>
        )
      })}
    </div>
  )
}

export function ListingStatusDialog({ r, phases, onClose, onConfirm }: { r: ProjectRow; phases: ProjectRow[]; onClose: () => void; onConfirm: () => void }) {
  const next: ProjListingStatus = r.listingStatus === "Active" ? "Hidden" : "Active"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Change Listing Status</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{r.name}</span> <IdTag value={r.id} /> will change from{" "}
          <Tag value={r.listingStatus} cls={LISTING_COLORS[r.listingStatus]} /> to <Tag value={next} cls={LISTING_COLORS[next]} />.
        </p>
        {!r.isPhase && phases.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This is a <span className="font-semibold text-foreground">main project</span> — its {phases.length} phase{phases.length > 1 ? "s" : ""} will become {next} as well:
            </p>
            <PhaseCascadeList phases={phases} tagOf={(p) => ({ value: p.listingStatus, cls: LISTING_COLORS[p.listingStatus] })} next={next} nextCls={LISTING_COLORS[next]} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}>Change to {next}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PrimaryStatusDialog({ r, phases, onClose, onConfirm }: { r: ProjectRow; phases: ProjectRow[]; onClose: () => void; onConfirm: (s: ProjPrimaryStatus) => void }) {
  const [next, setNext] = useState<ProjPrimaryStatus>(r.primaryStatus)
  const impacted = [r, ...(!r.isPhase ? phases : [])]
  const grouped = impacted.reduce((s, x) => s + x.groupedProps, 0)
  const detailed = impacted.reduce((s, x) => s + x.detailedProps, 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Change Primary Status</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{r.name}</span> <IdTag value={r.id} /> is currently{" "}
          <Tag value={r.primaryStatus} cls={PRIMARY_COLORS[r.primaryStatus]} />. Choose the new status:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_STATUSES.map((s) => (
            <button
              key={s} type="button" onClick={() => setNext(s)}
              className={cn("rounded-md transition-shadow", s === next && "ring-2 ring-primary/50 ring-offset-1")}
            >
              <Tag value={s} cls={PRIMARY_COLORS[s]} />
            </button>
          ))}
        </div>
        {!r.isPhase && phases.length > 0 && next !== r.primaryStatus && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This is a <span className="font-semibold text-foreground">main project</span> — its {phases.length} phase{phases.length > 1 ? "s" : ""} will become {next} as well:
            </p>
            <PhaseCascadeList phases={phases} tagOf={(p) => ({ value: p.primaryStatus, cls: PRIMARY_COLORS[p.primaryStatus] })} next={next} nextCls={PRIMARY_COLORS[next]} />
          </div>
        )}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-4 text-amber-800">
          This change impacts <span className="font-semibold">{grouped}</span> grouped properties and{" "}
          <span className="font-semibold">{detailed}</span> detailed properties{!r.isPhase && phases.length > 0 ? " across this project and its phases" : ""}.
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={next === r.primaryStatus} onClick={() => onConfirm(next)}>Change to {next}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Cascading change (Entry Type / Developer / Parent Project / Area / Organizations).
 * Main-project targets also apply to every phase under them; the phases are
 * listed read-only. In bulk mode, selected phases are ignored with a note.
 */
export function CascadeChangeDialog({ kind, targets, ignored, allRows, onClose, onConfirm }: {
  kind: CascadeKind
  targets: ProjectRow[]
  ignored: number
  allRows: ProjectRow[]
  onClose: () => void
  onConfirm: (value: string | ProjOrg[]) => void
}) {
  const [devId, setDevId] = useState(targets[0]?.developer.id ?? "")
  const initialArea = AREA_TREE.find((a) => a.name === targets[0]?.area)
  const [areaPick, setAreaPick] = useState<AreaPick | null>(initialArea ? { level: "Area", id: initialArea.id, name: initialArea.name } : null)
  const [orgs, setOrgs] = useState<ProjOrg[]>(targets[0]?.organizations ?? ["Nawy"])
  const [entryVal, setEntryVal] = useState<ProjEntryType>(targets[0]?.entryType === "Automatic" ? "Manual" : "Automatic")
  const [parentId, setParentId] = useState(targets[0]?.mainProject?.id ?? "")
  const toggleOrg = (o: ProjOrg) => setOrgs((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))
  const impacted = allRows.filter((x) => x.isPhase && targets.some((t) => t.id === x.mainProject?.id))
  const singlePhase = targets.length === 1 && targets[0].isPhase
  const title =
    kind === "developer" ? "Change Developer"
    : kind === "location" ? "Change Area"
    : kind === "entry" ? "Change Entry Type"
    : kind === "parent" ? "Change Parent Project"
    : "Change Organizations"
  const canSave =
    kind === "developer" ? !!devId
    : kind === "location" ? !!areaPick
    : kind === "entry" ? entryVal !== targets[0]?.entryType
    : kind === "parent" ? !!parentId && parentId !== targets[0]?.mainProject?.id
    : orgs.length > 0
  const phaseCurrent = (p: ProjectRow) =>
    kind === "developer" ? p.developer.name
    : kind === "location" ? p.area
    : kind === "entry" ? p.entryType
    : kind === "parent" ? p.mainProject?.name ?? "—"
    : p.organizations.join(", ")
  // Entry-type changes also touch every property under the impacted projects
  const propRows = [...targets, ...impacted]
  const grouped = propRows.reduce((s, x) => s + x.groupedProps, 0)
  const detailed = propRows.reduce((s, x) => s + x.detailedProps, 0)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {targets.length === 1 ? (
            <>
              <span className="font-medium text-foreground">{targets[0].name}</span> <IdTag value={targets[0].id} />{" "}
              {singlePhase ? "will get this change." : "and the phases under it will get the same change."}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{targets.length} main projects</span> will be changed — each together with its phases.
            </>
          )}
        </p>
        {ignored > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-4 text-amber-800">
            {ignored} selected phase{ignored > 1 ? "s are" : " is"} ignored — this action applies to main projects only; their phases inherit the change automatically.
          </div>
        )}

        {kind === "entry" && (
          <>
            <div className="flex gap-2">
              {(["Automatic", "Manual"] as ProjEntryType[]).map((s) => (
                <button
                  key={s} type="button" onClick={() => setEntryVal(s)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors",
                    entryVal === s ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <Tag value={s} cls={ENTRY_COLORS[s]} />
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-4 text-amber-800">
              This change also impacts <span className="font-semibold">{grouped}</span> grouped properties and{" "}
              <span className="font-semibold">{detailed}</span> detailed properties under {targets.length === 1 ? "this project" : "these projects"}{impacted.length > 0 ? " and their phases" : ""}.
            </div>
          </>
        )}
        {kind === "parent" && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Parent Project</div>
            <FilterSelect label="Select main project…" value={parentId} options={allRows.filter((x) => !x.isPhase).map((x) => ({ value: x.id, label: x.name }))} onChange={setParentId} searchable className="w-full" width="w-full" />
          </div>
        )}
        {kind === "developer" && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Developer</div>
            <DeveloperSelect developers={PROJECT_DEVELOPERS} value={devId} onChange={setDevId} />
          </div>
        )}
        {kind === "location" && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Area</div>
            <AreaTreeSelect tree={AREA_TREE} value={areaPick} onChange={setAreaPick} />
          </div>
        )}
        {kind === "orgs" && (
          <div className="space-y-2">
            {(["Nawy", "Partners"] as ProjOrg[]).map((o) => (
              <label key={o} className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors",
                orgs.includes(o) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
              )}>
                <Checkbox checked={orgs.includes(o)} onCheckedChange={() => toggleOrg(o)} className="h-4 w-4" />
                <OrgChip org={o} />
              </label>
            ))}
          </div>
        )}

        {impacted.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Phases inheriting this change ({impacted.length}) — read only:</p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {impacted.map((p, i) => (
                <div key={p.id} className={cn("flex items-center gap-2 px-3 py-2", i > 0 && "border-t border-border/70")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.isPhase && targets.length > 1 ? `${p.mainProject?.name} — ${p.name}` : p.name}</p>
                    <IdTag value={p.id} />
                  </div>
                  <span className="max-w-36 flex-shrink-0 truncate text-xs text-muted-foreground">{phaseCurrent(p)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" disabled={!canSave}
            onClick={() => onConfirm(
              kind === "developer" ? devId
              // Picking a subarea still cascades its parent area
              : kind === "location" ? (areaPick!.level === "Area" ? areaPick!.name : areaPick!.parent!)
              : kind === "entry" ? entryVal
              : kind === "parent" ? parentId
              : orgs,
            )}
          >
            Apply to {targets.length} project{targets.length > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Bulk classification — one action; Type depends on Category, Subtype depends on Type. */
function BulkClassificationDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (category: string, type: string, subtype: string) => void }) {
  const [category, setCategory] = useState("Residential")
  const types = Object.keys(CLASSIFICATION[category])
  const [type, setType] = useState(types[0])
  const subtypes = CLASSIFICATION[category][type] ?? []
  const [subtype, setSubtype] = useState(subtypes[0])
  const pickCategory = (c: string) => {
    const t = Object.keys(CLASSIFICATION[c])[0]
    setCategory(c); setType(t); setSubtype(CLASSIFICATION[c][t][0])
  }
  const pickType = (t: string) => { setType(t); setSubtype(CLASSIFICATION[category][t][0]) }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Change Classification</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{count}</span> selected row{count > 1 ? "s" : ""} — category, type and subtype are dependent:
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Category</div>
            <FilterSelect label="Category" value={category} options={Object.keys(CLASSIFICATION)} onChange={pickCategory} className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Type</div>
            <FilterSelect label="Type" value={type} options={types} onChange={pickType} className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Subtype</div>
            <FilterSelect label="Subtype" value={subtype} options={subtypes} onChange={setSubtype} className="w-full" width="w-full" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(category, type, subtype)}>Apply to {count}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Project creation form — Main Project or Phase (toggle). Only identity fields are
 * asked for; everything else takes defaults (see the blue note) and is completed
 * from the details page the user lands on after creation.
 */
function AddProjectPage({ onBack, onSave }: { onBack: () => void; onSave: (r: ProjectRow) => void }) {
  const [level, setLevel] = useState<"main" | "phase">("main")
  const [cover, setCover] = useState<string | null>(null)
  const [nameEn, setNameEn] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [devId, setDevId] = useState("")
  const [loc, setLoc] = useState<AreaPick | null>(null)
  const [parentSel, setParentSel] = useState<ProjectTreeSelection>(null)
  const [category, setCategory] = useState("")
  const [projectType, setProjectType] = useState("")
  const [projectSubtype, setProjectSubtype] = useState("")
  const [construction, setConstruction] = useState("")
  const [orgs, setOrgs] = useState<ProjOrg[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleOrg = (o: ProjOrg) => setOrgs((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))
  const pickCategory = (c: string) => {
    const t = Object.keys(CLASSIFICATION[c] ?? {})[0] ?? ""
    setCategory(c); setProjectType(t); setProjectSubtype((CLASSIFICATION[c]?.[t] ?? [])[0] ?? "")
  }
  const pickType = (t: string) => { setProjectType(t); setProjectSubtype((CLASSIFICATION[category]?.[t] ?? [])[0] ?? "") }

  const mains = PROJECTS.filter((p) => !p.isPhase)
  const parentRow = parentSel ? mains.find((m) => m.id === parentSel.id) : null
  const canSave = nameEn.trim() && nameAr.trim() && orgs.length > 0 && (level === "phase" ? !!parentRow : devId && !!loc)

  const create = () => {
    const stamp = new Date().toISOString()
    const zero = { available: 0, total: 0 }
    const base = {
      listingStatus: "Hidden" as ProjListingStatus,
      primaryStatus: "On-Sale" as ProjPrimaryStatus,
      entryType: "Automatic" as ProjEntryType,
      organizations: orgs,
      category: category || "—",
      projectType: projectType || "—",
      projectSubtype: projectSubtype || "—",
      constructionStatus: (construction || "Off-plan") as ProjectRow["constructionStatus"],
      manualRank: null,
      autoRank: 0,
      areaKm2: null,
      galleryImages: cover ? [cover] : [],
      brochureCount: 0,
      listingMasterplan: false,
      gisMasterplan: false,
      seoDescription: false,
      buildingsCount: 0,
      groupedProps: 0,
      detailedProps: 0,
      primaryUnits: zero, resaleUnits: zero, nawyNowUnits: zero, rentalUnits: zero,
      createdAt: stamp,
      updatedAt: stamp,
    }
    if (level === "phase" && parentRow) {
      const n = PROJECTS.filter((p) => p.isPhase && p.mainProject?.id === parentRow.id).length + 1
      onSave({
        ...base,
        id: `${parentRow.id}-P${n}`,
        name: nameEn.trim(),
        isPhase: true,
        mainProject: { id: parentRow.id, name: parentRow.name },
        developer: parentRow.developer,
        district: parentRow.district, area: parentRow.area, subarea: parentRow.subarea,
      })
      return
    }
    const dev = PROJECT_DEVELOPERS.find((d) => d.id === devId)!
    // District is deduced from the (parent) area — mock pairs them by index
    const areaName = loc!.level === "Area" ? loc!.name : loc!.parent!
    const idx = AREAS.indexOf(areaName)
    const nextNum = Math.max(...mains.map((p) => Number(p.id.slice(4)))) + 1
    onSave({
      ...base,
      id: `PRJ-${String(nextNum).padStart(4, "0")}`,
      name: nameEn.trim(),
      isPhase: false,
      mainProject: null,
      developer: dev,
      district: DISTRICTS[idx] ?? DISTRICTS[0],
      area: areaName,
      subarea: loc!.level === "Subarea" ? loc!.name : "—",
    })
  }

  const req = (label: string) => (
    <div className="text-xs font-medium text-foreground">{label}<span className="ml-0.5 text-red-500">*</span></div>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button className="hover:text-foreground hover:underline" onClick={onBack}>Projects</button>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <span className="font-medium text-foreground">Add Project</span>
        </div>
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-2xl font-bold text-foreground">Add Project</h1>
          <p className="text-sm text-muted-foreground">Create a new main project or a phase under an existing project</p>
        </div>
        <div className="mx-auto w-full max-w-4xl space-y-4 rounded-xl border border-border bg-card p-6">
          {/* Level toggle */}
          <div className="flex gap-2">
            {([
              { key: "main", label: "Main Project", icon: Building2 },
              { key: "phase", label: "Phase", icon: Layers },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key} type="button" onClick={() => setLevel(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                  level === key ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/40" : "border-border text-muted-foreground hover:border-muted-foreground/40",
                )}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          {/* Cover image — optional */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Cover Image <span className="font-normal text-muted-foreground">(optional)</span></div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCover(URL.createObjectURL(f)) }} />
            {/* Banner-sized cover, full card width */}
            {cover ? (
              <div className="relative w-full">
                <img src={cover} alt="Cover" className="h-40 w-full rounded-lg border border-border object-cover" />
                <button type="button" onClick={() => setCover(null)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[11px]">Upload cover</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              {req("Project Name En")}
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Marina Heights" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              {req("Project Name Ar")}
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" className="h-9 text-sm" />
            </div>

            {level === "main" ? (
              <>
                <div className="space-y-1.5">
                  {req("Developer")}
                  <DeveloperSelect developers={PROJECT_DEVELOPERS} value={devId} onChange={setDevId} />
                </div>
                <div className="space-y-1.5">
                  {req("Location")}
                  <AreaTreeSelect tree={AREA_TREE} value={loc} onChange={setLoc} />
                  <p className="text-[11px] text-muted-foreground">District is deduced from the selected area</p>
                </div>
              </>
            ) : (
              <div className="col-span-2 space-y-1.5">
                {req("Parent Project")}
                <ProjectTreeSelect
                  label="Select parent project…"
                  projects={mains.map((m) => ({ id: m.id, name: m.name, status: m.listingStatus, phases: [] }))}
                  value={parentSel}
                  onChange={setParentSel}
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">Developer and location are inherited from the parent project</p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Category</div>
              <FilterSelect label="Select category…" value={category} options={Object.keys(CLASSIFICATION)} onChange={pickCategory} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Type</div>
              <FilterSelect label="Select type…" value={projectType} options={Object.keys(CLASSIFICATION[category] ?? {})} onChange={pickType} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Subtype</div>
              <FilterSelect label="Select subtype…" value={projectSubtype} options={CLASSIFICATION[category]?.[projectType] ?? []} onChange={setProjectSubtype} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Construction Status</div>
              <FilterSelect label="Select status…" value={construction} options={["Off-plan", "Under Construction", "Completed"]} onChange={setConstruction} className="w-full" width="w-full" />
            </div>

            <div className="col-span-2 space-y-1.5">
              {req("Organizations")}
              <div className="flex gap-2">
                {(["Nawy", "Partners"] as ProjOrg[]).map((o) => (
                  <label key={o} className={cn(
                    "flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors",
                    orgs.includes(o) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
                  )}>
                    <Checkbox checked={orgs.includes(o)} onCheckedChange={() => toggleOrg(o)} className="h-4 w-4" />
                    <OrgChip org={o} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Everything else takes defaults — completed later from the details page */}
          <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              <span className="font-semibold">Entry Type</span> will be <span className="font-semibold">Automatic</span> (assuming properties data comes as sheets),{" "}
              <span className="font-semibold">Listing Status</span> will be <span className="font-semibold">Hidden</span>,{" "}
              <span className="font-semibold">Primary Status</span> will be <span className="font-semibold">On-Sale</span>, and the map location can be added later —
              after creation you land on the project details page to change or add anything.
            </span>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
            <Button size="sm" disabled={!canSave} onClick={create}>Create {level === "phase" ? "Phase" : "Project"}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

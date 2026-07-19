"use client"

import { Fragment, useMemo, useState } from "react"
import {
  ArrowRight, Check, ChevronDown, MoreHorizontal, Download, Eye, FileText, ToggleRight, Layers, Building2,
  Group as GroupIcon, FolderTree, CheckCircle2, Plus, Tag as TagIcon, Map as MapIcon, Upload,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FloatingBulkBar, BulkBarButton, MultiSortControl, IdTag, COL_SEP,
  type SortLevel,
} from "@/components/table-kit"
import { ProjectDetails } from "@/components/projects-page"
import {
  PROJECTS, PROJECT_DEVELOPERS, AREAS, DISTRICTS, SUBAREAS,
  type ProjectRow, type ProjListingStatus, type ProjPrimaryStatus, type ProjEntryType, type ProjOrg,
} from "@/lib/projects-mock"
import { GlobalMapDialog, MapDrawDialog, blobPolygon, centroid, LEVEL_COLOR, type GeoRef, type MapLocation } from "@/components/area-map"
import { FullscreenViewer } from "@/components/render-images-page"
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
      id: p.id, name: p.name, level: "Project" as const, status: p.listingStatus,
      pin: mi % 4 === 3 ? null : { x: cx, y: cy },
      polygon: mi % 3 === 2 ? null : blobPolygon(cx, cy, 46),
    }
  }
  const siblings = PROJECTS.filter((q) => q.isPhase && q.mainProject?.id === mainId)
  const pi = Math.max(0, siblings.findIndex((q) => q.id === p.id))
  const px = cx - 25 + (pi % 3) * 26
  const py = cy - 18 + Math.floor(pi / 3) * 24
  return {
    id: p.id, name: p.name, level: "Phase" as const, status: p.listingStatus,
    pin: pi % 3 === 1 ? null : { x: px, y: py },
    polygon: pi % 2 === 1 ? null : blobPolygon(px, py, 14),
  }
})
const PROJECT_MAP_LOCATIONS: MapLocation[] = PROJECT_GEO0.map((g) => ({ id: g.id, name: g.name, kind: g.level, center: centroid(g.polygon, g.pin) }))

const PRIMARY_STATUSES: ProjPrimaryStatus[] = ["Launch", "On-Sale", "On-Hold", "Sold-Off", "Archived"]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
// UTC getters (the mock stores UTC ISO strings) so SSR and client render identically — no hydration mismatch.
function fmt(iso: string) {
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
function ColorTag({ value }: { value: string }) {
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

/** Dependent classification tree: Category → Type → Subtype. */
const CLASSIFICATION: Record<string, Record<string, string[]>> = {
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
    default: return 0
  }
}

function UnitsCell({ u }: { u: { available: number; total: number } }) {
  if (u.total === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="font-semibold text-foreground">{u.available}</span>
      <span className="text-muted-foreground">/{u.total}</span>
    </span>
  )
}

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
  const [developerF, setDeveloperF] = useState("")
  const [districtF, setDistrictF] = useState("")
  const [areaF, setAreaF] = useState("")
  const [listingF, setListingF] = useState("")
  const [primaryF, setPrimaryF] = useState("")
  const [entryF, setEntryF] = useState("")
  const [coordF, setCoordF] = useState("")
  const [polyF, setPolyF] = useState("")
  const [listingMpF, setListingMpF] = useState("")
  const [gisMpF, setGisMpF] = useState("")
  const [buildingsF, setBuildingsF] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [mapOpen, setMapOpen] = useState(false)
  const [projGeo, setProjGeo] = useState<GeoRef[]>(PROJECT_GEO0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [listingDlg, setListingDlg] = useState<ProjectRow | null>(null)
  const [primaryDlg, setPrimaryDlg] = useState<ProjectRow | null>(null)
  const [bulkListing, setBulkListing] = useState(false)
  const [drawTarget, setDrawTarget] = useState<ProjectRow | null>(null)
  const [gallery, setGallery] = useState<{ images: string[]; index: number; label: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [orgDlg, setOrgDlg] = useState<ProjectRow | null>(null)
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
  const applyOrgs = (r: ProjectRow, orgs: ProjOrg[]) =>
    setRows((rs) => rs.map((x) => (x.id === r.id || (!r.isPhase && x.mainProject?.id === r.id) ? { ...x, organizations: orgs } : x)))

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter((r) => {
      if (needle && !`${r.name} ${r.id}`.toLowerCase().includes(needle)) return false
      if (developerF && r.developer.id !== developerF) return false
      if (districtF && r.district !== districtF) return false
      if (areaF && r.area !== areaF) return false
      if (listingF && r.listingStatus !== listingF) return false
      if (primaryF && r.primaryStatus !== primaryF) return false
      if (entryF && r.entryType !== entryF) return false
      if (coordF && (geoOf(r.id)?.pin ? "Active" : "Hidden") !== coordF) return false
      if (polyF && (geoOf(r.id)?.polygon ? "Active" : "Hidden") !== polyF) return false
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
  }, [rows, q, developerF, districtF, areaF, listingF, primaryF, entryF, coordF, polyF, listingMpF, gisMpF, buildingsF, sorts, projGeo])

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

  // Analytics
  const projectCount = rows.filter((r) => !r.isPhase).length
  const phaseCount = rows.filter((r) => r.isPhase).length
  const activeCount = rows.filter((r) => r.listingStatus === "Active").length
  const onSaleCount = rows.filter((r) => r.primaryStatus === "On-Sale").length

  if (creating) {
    return (
      <AddProjectPage
        onBack={() => setCreating(false)}
        onSave={(row) => {
          setRows((rs) => [row, ...rs])
          toast.success(`${row.name} created`)
          setCreating(false)
        }}
      />
    )
  }

  if (selected) {
    return <ProjectDetails project={selected} onBack={() => setSelected(null)} />
  }

  const treeMode = groupBy === "mainProject"

  const renderRow = (r: ProjectRow) => (
    <tr key={r.id} onClick={() => setSelected(r)} className="group cursor-pointer transition-colors hover:bg-muted/40">
      {/* Select */}
      <td className="w-10 py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="h-4 w-4" />
      </td>

      {/* Project / Phase name + id — tree affordances when grouped by Main Project */}
      <td className={cn("py-3 pr-4", treeMode && r.isPhase ? "pl-10" : "pl-5")}>
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
      </td>

      {/* Main Project */}
      <td className="px-4 py-3">
        {r.mainProject ? (
          <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
            <a href={`/projects/${r.mainProject.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">{r.mainProject.name}</a>
            <IdTag value={r.mainProject.id} />
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Main Project</span>
        )}
      </td>

      {/* Developer */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{r.developer.logo}</span>
          <div className="min-w-0">
            <a href={`/developers/${r.developer.id}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-primary hover:underline">{r.developer.name}</a>
            <IdTag value={r.developer.id} />
          </div>
        </div>
      </td>

      <td className="px-4 py-3"><ColorTag value={r.district} /></td>
      <td className="px-4 py-3"><ColorTag value={r.area} /></td>
      <td className="px-4 py-3"><ColorTag value={r.subarea} /></td>
      <td className="px-4 py-3"><Tag value={r.listingStatus} cls={LISTING_COLORS[r.listingStatus]} /></td>
      <td className="px-4 py-3"><Tag value={r.primaryStatus} cls={PRIMARY_COLORS[r.primaryStatus]} /></td>
      <td className="px-4 py-3"><Tag value={r.entryType} cls={ENTRY_COLORS[r.entryType]} /></td>

      {/* Organizations */}
      <td className="px-4 py-3"><div className="flex gap-1">{r.organizations.map((o) => <OrgChip key={o} org={o} />)}</div></td>
      <td className="px-4 py-3"><ColorTag value={r.category} /></td>
      <td className="px-4 py-3"><ColorTag value={r.projectType} /></td>
      <td className="px-4 py-3"><ColorTag value={r.projectSubtype} /></td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{r.areaKm2 == null ? "—" : `${r.areaKm2} km²`}</td>

      {/* Gallery images — click opens the fullscreen carousel */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {r.galleryImages.length === 0 ? (
          <Tag value="No images" cls={RED_TAG} />
        ) : (
          <div className="flex items-center gap-1">
            {r.galleryImages.slice(0, 3).map((src, i) => (
              <button key={i} onClick={() => setGallery({ images: r.galleryImages, index: i, label: r.id })}
                className="h-8 w-12 flex-shrink-0 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80">
                <img src={src} alt={`${r.name} gallery ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Brochures */}
      <td className="px-4 py-3">
        {r.brochureCount === 0 ? (
          <Tag value="No brochures" cls={RED_TAG} />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{r.brochureCount}</span>
        )}
      </td>

      {/* Geometry state comes from the live map data */}
      <td className="px-4 py-3"><Tag value={geoOf(r.id)?.pin ? "Active" : "Hidden"} cls={LISTING_COLORS[geoOf(r.id)?.pin ? "Active" : "Hidden"]} /></td>
      <td className="px-4 py-3"><Tag value={geoOf(r.id)?.polygon ? "Active" : "Hidden"} cls={LISTING_COLORS[geoOf(r.id)?.polygon ? "Active" : "Hidden"]} /></td>
      <td className="px-4 py-3"><Tag value={r.listingMasterplan ? "Uploaded" : "Missing"} cls={r.listingMasterplan ? UPLOADED_TAG : RED_TAG} /></td>
      <td className="px-4 py-3"><Tag value={r.gisMasterplan ? "Uploaded" : "Missing"} cls={r.gisMasterplan ? UPLOADED_TAG : RED_TAG} /></td>

      {/* Buildings */}
      <td className="px-4 py-3">
        {r.buildingsCount === 0 ? (
          <Tag value="No buildings" cls={RED_TAG} />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{r.buildingsCount}</span>
        )}
      </td>

      {/* Sale-type unit counts: available / total */}
      <td className="px-4 py-3"><UnitsCell u={r.primaryUnits} /></td>
      <td className="px-4 py-3"><UnitsCell u={r.resaleUnits} /></td>
      <td className="px-4 py-3"><UnitsCell u={r.nawyNowUnits} /></td>
      <td className="px-4 py-3"><UnitsCell u={r.rentalUnits} /></td>

      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(r.createdAt)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(r.updatedAt)}</td>

      {/* Action — frozen right */}
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setSelected(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setListingDlg(r)}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPrimaryDlg(r)}><TagIcon className="mr-2 h-3.5 w-3.5" />Change Primary Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOrgDlg(r)}><Building2 className="mr-2 h-3.5 w-3.5" />Organizations</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDrawTarget(r)}><MapIcon className="mr-2 h-3.5 w-3.5" />Draw on Map</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  return (
    <div className={embedded ? "" : "min-h-screen bg-secondary/40"}>
      <div className={embedded ? "space-y-4" : "space-y-4 p-6"}>
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">All projects and phases in the system</p>
          </div>
        )}

        {/* Analytics cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AnalyticsCard icon={<FolderTree className="h-4 w-4 text-primary" />} label="Projects" value={projectCount} />
          <AnalyticsCard icon={<Layers className="h-4 w-4 text-indigo-600" />} label="Phases" value={phaseCount} />
          <AnalyticsCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Active Listings" value={activeCount} />
          <AnalyticsCard icon={<TagIcon className="h-4 w-4 text-amber-500" />} label="On-Sale" value={onSaleCount} />
        </div>

        {/* Search + filters + controls */}
        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Project name or ID"
          hideAdvanced
          activeFilters={[developerF, districtF, areaF, listingF, primaryF, entryF, coordF, polyF, listingMpF, gisMpF, buildingsF].filter(Boolean).length}
          filters={
            <>
              {!hideDeveloperFilter && <FilterSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name, sublabel: d.id }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />}
              <FilterSelect label="District" value={districtF} options={DISTRICTS} onChange={(v) => { setDistrictF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Area" value={areaF} options={AREAS} onChange={(v) => { setAreaF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Listing Status" value={listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Primary Status" value={primaryF} options={PRIMARY_STATUSES} onChange={(v) => { setPrimaryF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Entry Type" value={entryF} options={["Automatic", "Manual"]} onChange={(v) => { setEntryF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Coordinates" value={coordF} options={["Active", "Hidden"]} onChange={(v) => { setCoordF(v); setPage(1) }} className="w-36" />
              <FilterSelect label="Polygons" value={polyF} options={["Active", "Hidden"]} onChange={(v) => { setPolyF(v); setPage(1) }} className="w-36" />
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
            count={filtered.length}
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
                  <th className="w-10 py-3 pl-4 pr-0">
                    <Checkbox
                      className="h-4 w-4"
                      checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                      onCheckedChange={(v) => setSelectedIds(v ? new Set(filtered.map((r) => r.id)) : new Set())}
                    />
                  </th>
                  <Th className="pl-5">Project / Phase Name</Th>
                  <Th>Main Project</Th>
                  <Th>Developer</Th>
                  <Th>District</Th>
                  <Th>Area</Th>
                  <Th>Subarea</Th>
                  <Th>Listing Status</Th>
                  <Th>Primary Status</Th>
                  <Th>Entry Type</Th>
                  <Th>Organizations</Th>
                  <Th>Category</Th>
                  <Th>Type</Th>
                  <Th>Subtype</Th>
                  <Th>Area (km²)</Th>
                  <Th>Gallery Images</Th>
                  <Th>Brochures</Th>
                  <Th>Coordinates</Th>
                  <Th>Map Polygons</Th>
                  <Th>Listing Masterplans</Th>
                  <Th>GIS Masterplan</Th>
                  <Th>Buildings</Th>
                  <Th>Primary Properties</Th>
                  <Th>Resale Properties</Th>
                  <Th>Nawy Now</Th>
                  <Th>Rentals</Th>
                  <Th>Created At</Th>
                  <Th>Updated At</Th>
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {treeMode ? (
                  filtered.filter((m) => !m.isPhase).map((m) => (
                    <Fragment key={m.id}>
                      {renderRow(m)}
                      {expandedMains.has(m.id) && filtered.filter((p) => p.isPhase && p.mainProject?.id === m.id).map(renderRow)}
                    </Fragment>
                  ))
                ) : groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={30} className="p-0">
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
                  <tr><td colSpan={30} className="px-5 py-16 text-center text-sm text-muted-foreground">No projects match your filters.</td></tr>
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
          <BulkBarButton icon={<Download className="h-4 w-4" />} onClick={() => { toast.success(`${selectedIds.size} row${selectedIds.size > 1 ? "s" : ""} exported to CSV`); setSelectedIds(new Set()) }}>Export</BulkBarButton>
          <BulkBarButton icon={<ToggleRight className="h-4 w-4" />} onClick={() => setBulkListing(true)}>Listing Status</BulkBarButton>
          <BulkBarButton icon={<TagIcon className="h-4 w-4" />} onClick={() => setBulkClass(true)}>Classification</BulkBarButton>
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

        {bulkListing && (
          <BulkListingDialog
            count={selectedIds.size}
            onClose={() => setBulkListing(false)}
            onConfirm={(next) => {
              setRows((rs) => rs.map((x) => (selectedIds.has(x.id) ? { ...x, listingStatus: next } : x)))
              toast.success(`${selectedIds.size} row${selectedIds.size > 1 ? "s" : ""} set to ${next}`)
              setBulkListing(false)
              setSelectedIds(new Set())
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
                : [...prev, { id: drawTarget.id, name: drawTarget.name, level: drawTarget.isPhase ? "Phase" as const : "Project" as const, status: drawTarget.listingStatus, pin, polygon }])
              setDrawTarget(null)
              toast.success("Map geometry saved")
            }}
          />
        )}

        {gallery && (
          <FullscreenViewer images={gallery.images} startIndex={gallery.index} onClose={() => setGallery(null)} label={gallery.label} caption="Gallery" />
        )}

        {orgDlg && (
          <OrganizationsDialog
            r={orgDlg}
            phases={phasesOf(orgDlg)}
            onClose={() => setOrgDlg(null)}
            onConfirm={(orgs) => {
              applyOrgs(orgDlg, orgs)
              toast.success(`${orgDlg.name} organizations updated${!orgDlg.isPhase && phasesOf(orgDlg).length ? ` with ${phasesOf(orgDlg).length} phases` : ""}`)
              setOrgDlg(null)
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

function AnalyticsCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
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
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
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

function ListingStatusDialog({ r, phases, onClose, onConfirm }: { r: ProjectRow; phases: ProjectRow[]; onClose: () => void; onConfirm: () => void }) {
  const next: ProjListingStatus = r.listingStatus === "Active" ? "Hidden" : "Active"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
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

function PrimaryStatusDialog({ r, phases, onClose, onConfirm }: { r: ProjectRow; phases: ProjectRow[]; onClose: () => void; onConfirm: (s: ProjPrimaryStatus) => void }) {
  const [next, setNext] = useState<ProjPrimaryStatus>(r.primaryStatus)
  const impacted = [r, ...(!r.isPhase ? phases : [])]
  const grouped = impacted.reduce((s, x) => s + x.groupedProps, 0)
  const detailed = impacted.reduce((s, x) => s + x.detailedProps, 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
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

function BulkListingDialog({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (s: ProjListingStatus) => void }) {
  const [next, setNext] = useState<ProjListingStatus>("Active")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Bulk Change Listing Status</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{count}</span> selected project{count > 1 ? "s / phases" : ""} will be set to:
        </p>
        <div className="flex gap-2">
          {(["Active", "Hidden"] as ProjListingStatus[]).map((s) => (
            <button
              key={s} type="button" onClick={() => setNext(s)}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors",
                next === s ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <Tag value={s} cls={LISTING_COLORS[s]} />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(next)}>Apply to {count}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Organizations picker — cascades from a main project to its phases. */
function OrganizationsDialog({ r, phases, onClose, onConfirm }: { r: ProjectRow; phases: ProjectRow[]; onClose: () => void; onConfirm: (orgs: ProjOrg[]) => void }) {
  const [orgs, setOrgs] = useState<ProjOrg[]>(r.organizations)
  const toggle = (o: ProjOrg) => setOrgs((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Organizations</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose the organizations linked to <span className="font-medium text-foreground">{r.name}</span> <IdTag value={r.id} />:
        </p>
        <div className="space-y-2">
          {(["Nawy", "Partners"] as ProjOrg[]).map((o) => (
            <label key={o} className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors",
              orgs.includes(o) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
            )}>
              <Checkbox checked={orgs.includes(o)} onCheckedChange={() => toggle(o)} className="h-4 w-4" />
              <OrgChip org={o} />
            </label>
          ))}
        </div>
        {!r.isPhase && phases.length > 0 && (
          <p className="text-xs text-muted-foreground">
            This is a <span className="font-semibold text-foreground">main project</span> — its {phases.length} phase{phases.length > 1 ? "s" : ""} will get the same organizations.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={orgs.length === 0} onClick={() => onConfirm(orgs)}>Save</Button>
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
      <DialogContent className="sm:max-w-sm">
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

function AddProjectPage({ onBack, onSave }: { onBack: () => void; onSave: (r: ProjectRow) => void }) {
  const [name, setName] = useState("")
  const [devId, setDevId] = useState("")
  const [district, setDistrict] = useState("")
  const [area, setArea] = useState("")
  const [subarea, setSubarea] = useState("")
  const [category, setCategory] = useState("Residential")
  const [projectType, setProjectType] = useState("Compound")
  const [projectSubtype, setProjectSubtype] = useState("Apartments")
  const [entryType, setEntryType] = useState<ProjEntryType>("Manual")
  const canSave = name.trim() && devId && district && area

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button className="hover:text-foreground hover:underline" onClick={onBack}>Projects</button>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <span className="font-medium text-foreground">Add Project</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Project</h1>
          <p className="text-sm text-muted-foreground">Create a new main project — phases can be added from its details page</p>
        </div>
        <div className="max-w-3xl space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Project name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marina Heights" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Developer</div>
              <FilterSelect label="Select developer…" value={devId} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name }))} onChange={setDevId} searchable className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">District</div>
              <FilterSelect label="Select district…" value={district} options={DISTRICTS} onChange={setDistrict} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Area</div>
              <FilterSelect label="Select area…" value={area} options={AREAS} onChange={setArea} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Subarea</div>
              <FilterSelect label="Select subarea…" value={subarea} options={SUBAREAS} onChange={setSubarea} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Category</div>
              <FilterSelect label="Category" value={category} options={["Residential", "Commercial", "Mixed Use"]} onChange={setCategory} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Type</div>
              <FilterSelect label="Type" value={projectType} options={["Compound", "Standalone", "Coastal Resort"]} onChange={setProjectType} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Subtype</div>
              <FilterSelect label="Subtype" value={projectSubtype} options={["Apartments", "Villas", "Mixed Units"]} onChange={setProjectSubtype} className="w-full" width="w-full" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-foreground">Entry Type</div>
              <FilterSelect label="Entry Type" value={entryType} options={["Manual", "Automatic"]} onChange={(v) => setEntryType(v as ProjEntryType)} className="w-full" width="w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
            <Button
              size="sm" disabled={!canSave}
              onClick={() => {
                const dev = PROJECT_DEVELOPERS.find((d) => d.id === devId)!
                const nextNum = Math.max(...PROJECTS.filter((p) => !p.isPhase).map((p) => Number(p.id.slice(4)))) + 1
                const stamp = new Date().toISOString()
                const zero = { available: 0, total: 0 }
                onSave({
                  id: `PRJ-${String(nextNum).padStart(4, "0")}`,
                  name: name.trim(),
                  isPhase: false,
                  mainProject: null,
                  developer: dev,
                  district, area, subarea: subarea || "—",
                  listingStatus: "Active",
                  primaryStatus: "Launch",
                  entryType,
                  organizations: ["Nawy"],
                  category, projectType, projectSubtype,
                  areaKm2: null,
                  galleryImages: [],
                  brochureCount: 0,
                  listingMasterplan: false,
                  gisMasterplan: false,
                  buildingsCount: 0,
                  groupedProps: 0,
                  detailedProps: 0,
                  primaryUnits: zero,
                  resaleUnits: zero,
                  nawyNowUnits: zero,
                  rentalUnits: zero,
                  createdAt: stamp,
                  updatedAt: stamp,
                })
              }}
            >
              Create Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

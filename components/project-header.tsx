"use client"

import { useMemo, useState } from "react"
import { Building2, Check, ChevronDown, Globe, Layers, Map as MapIcon, MapPin, MoreHorizontal, Pencil, Tag as TagIcon, ToggleRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FilterSelect, IdTag } from "@/components/table-kit"
import { MapDrawDialog, type Pt } from "@/components/area-map"
import { ListingStatusDialog, PrimaryStatusDialog, CascadeChangeDialog, type CascadeKind } from "@/components/projects-list-page"
import { PROJECTS, type ProjectRow, type ProjListingStatus, type ProjPrimaryStatus } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TAG = "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
const LISTING_TONE: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-700",
}
const PRIMARY_TONE: Record<string, string> = {
  Launch: "border-green-200 bg-green-50 text-green-700",
  "On-Sale": "border-emerald-300 bg-emerald-100 text-emerald-800",
  "On-Hold": "border-orange-200 bg-orange-50 text-orange-700",
  "Sold-Off": "border-red-200 bg-red-50 text-red-600",
  Archived: "border-red-300 bg-red-100 text-red-800",
}
const ENTRY_TONE: Record<string, string> = {
  Automatic: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Manual: "border-blue-200 bg-blue-50 text-blue-700",
}
function OrgTag({ org }: { org: string }) {
  return <span className={cn(TAG, org === "Nawy" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-blue-200 bg-blue-100 text-blue-700")}>{org}</span>
}

interface HeaderForm {
  nameEn: string
  nameAr: string
  category: string
  projectType: string
  projectSubtype: string
  coordinates: string
  address: string
  projectArea: string
  greeneryArea: string
  buaArea: string
  footprintArea: string
  buildings: string
  totalUnits: string
  manualRank: string
  autoRank: string
  listingStatus: string
  primaryStatus: string
  entryType: string
}

/**
 * Main project info card — view-only header bar (name, level, parent/developer links,
 * statuses, location) with a cascading actions menu; collapsed by default. Expanding
 * shows the full field grid; Edit makes the grid fields editable (Save / Cancel).
 */
export function ProjectHeader({ project }: { project?: Partial<ProjectRow> }) {
  const p = project ?? {}
  const phases = useMemo(() => PROJECTS.filter((x) => x.isPhase && x.mainProject?.id === p.id), [p.id])
  const init: HeaderForm = {
    nameEn: p.name ?? "Project",
    nameAr: "",
    category: p.category ?? "Residential",
    projectType: p.projectType ?? "Compound",
    projectSubtype: p.projectSubtype ?? "Apartments",
    coordinates: "29.960077, 31.077884",
    address: "",
    projectArea: p.areaKm2 != null ? String(Math.round(p.areaKm2 * 1_000_000)) : "",
    greeneryArea: "",
    buaArea: "",
    footprintArea: "",
    buildings: p.buildingsCount != null ? String(p.buildingsCount) : "",
    totalUnits: p.primaryUnits ? String(p.primaryUnits.total + (p.resaleUnits?.total ?? 0) + (p.nawyNowUnits?.total ?? 0) + (p.rentalUnits?.total ?? 0)) : "",
    manualRank: "",
    autoRank: "14",
    listingStatus: p.listingStatus ?? "Active",
    primaryStatus: p.primaryStatus ?? "Launch",
    entryType: p.entryType ?? "Automatic",
  }
  const [saved, setSaved] = useState<HeaderForm>(init)
  const [form, setForm] = useState<HeaderForm>(init)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [geo, setGeo] = useState<{ pin: Pt | null; polygon: Pt[] | null }>({ pin: { x: 500, y: 350 }, polygon: null })
  const [drawOpen, setDrawOpen] = useState(false)
  const [listingDlg, setListingDlg] = useState(false)
  const [primaryDlg, setPrimaryDlg] = useState(false)
  const [cascade, setCascade] = useState<CascadeKind | null>(null)
  const set = (k: keyof HeaderForm) => (val: string) => setForm((f) => ({ ...f, [k]: val }))
  const gallery = p.galleryImages ?? []
  const location = [p.district, p.area, p.subarea].filter(Boolean).join(" - ") || "—"
  /** Full row for the shared dialogs (fills any missing mock fields). */
  const asRow = (): ProjectRow => ({ ...PROJECTS[0], ...(p as Partial<ProjectRow>), listingStatus: saved.listingStatus as ProjListingStatus, primaryStatus: saved.primaryStatus as ProjPrimaryStatus } as ProjectRow)

  const setStatus = (k: "listingStatus" | "primaryStatus", v: string) => {
    setSaved((s) => ({ ...s, [k]: v }))
    setForm((f) => ({ ...f, [k]: v }))
  }

  const field = (label: string, key: keyof HeaderForm, opts?: { options?: string[]; suffix?: string; viewTone?: Record<string, string>; rtl?: boolean }) => (
    <div key={key}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {editing ? (
        opts?.options ? (
          <FilterSelect label={label} value={form[key]} options={opts.options} onChange={set(key)} className="mt-1 w-full" width="w-full" />
        ) : (
          <Input value={form[key]} onChange={(e) => set(key)(e.target.value)} placeholder="—" dir={opts?.rtl ? "rtl" : undefined} className="mt-1 h-8 text-sm" />
        )
      ) : opts?.viewTone ? (
        <span className={cn(TAG, "mt-1", opts.viewTone[saved[key]] ?? "border-border bg-muted text-muted-foreground")}>{saved[key] || "—"}</span>
      ) : (
        <div className={cn("mt-1 truncate text-sm text-foreground", opts?.rtl && "text-right")} dir={opts?.rtl ? "rtl" : undefined}>
          {saved[key] ? `${saved[key]}${opts?.suffix ? ` ${opts.suffix}` : ""}` : "—"}
        </div>
      )}
    </div>
  )

  const viewOnly = (label: string, value: React.ReactNode) => (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  )

  const devLink = p.developer ? (
    <span className="inline-flex items-center gap-1.5">
      <a href={`/developers/${p.developer.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{p.developer.name}</a>
      <IdTag value={p.developer.id} />
    </span>
  ) : "—"
  const parentLink = p.mainProject ? (
    <span className="inline-flex items-center gap-1.5">
      <a href={`/projects/${p.mainProject.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{p.mainProject.name}</a>
      <IdTag value={p.mainProject.id} />
    </span>
  ) : <span className="text-muted-foreground">— (main project)</span>

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* View-only header bar */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          {p.isPhase ? <Layers className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-foreground">{saved.nameEn}</h1>
            <span className={cn(TAG, p.isPhase ? "border-border bg-muted text-muted-foreground" : "border-blue-200 bg-blue-100 text-blue-700")}>
              {p.isPhase ? "Phase" : "Main Project"}
            </span>
            <span className={cn(TAG, LISTING_TONE[saved.listingStatus] ?? "border-border bg-muted text-muted-foreground")}>{saved.listingStatus}</span>
            <span className={cn(TAG, PRIMARY_TONE[saved.primaryStatus] ?? "border-border bg-muted text-muted-foreground")}>{saved.primaryStatus}</span>
            <span className={cn(TAG, ENTRY_TONE[saved.entryType] ?? "border-border bg-muted text-muted-foreground")}>{saved.entryType}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.id && <IdTag value={p.id} className="text-[11px]" />}
            {p.isPhase && p.mainProject && (
              <span className="inline-flex items-center gap-1">
                Parent:
                <a href={`/projects/${p.mainProject.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{p.mainProject.name}</a>
                <IdTag value={p.mainProject.id} />
              </span>
            )}
            {p.developer && (
              <span className="inline-flex items-center gap-1">
                <a href={`/developers/${p.developer.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary hover:underline">{p.developer.name}</a>
                <IdTag value={p.developer.id} />
              </span>
            )}
            <span>{location}</span>
          </div>
        </div>
        {editing ? (
          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { setForm(saved); setEditing(false) }}>
              <X className="h-3.5 w-3.5" />Cancel
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={() => { setSaved(form); setEditing(false); toast.success("Project details saved") }}>
              <Check className="h-3.5 w-3.5" />Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8 flex-shrink-0 gap-1.5" onClick={() => { setExpanded(true); setEditing(true); setForm(saved) }}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
        )}
        {/* Same actions & cascade logic as the projects table rows */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setListingDlg(true)}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPrimaryDlg(true)}><TagIcon className="mr-2 h-3.5 w-3.5" />Change Primary Status</DropdownMenuItem>
            {!p.isPhase && <DropdownMenuItem onClick={() => setCascade("orgs")}><Building2 className="mr-2 h-3.5 w-3.5" />Organizations</DropdownMenuItem>}
            {!p.isPhase && <DropdownMenuItem onClick={() => setCascade("developer")}><Globe className="mr-2 h-3.5 w-3.5" />Change Developer</DropdownMenuItem>}
            {!p.isPhase && <DropdownMenuItem onClick={() => setCascade("location")}><MapPin className="mr-2 h-3.5 w-3.5" />Change Location</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDrawOpen(true)}><MapIcon className="mr-2 h-3.5 w-3.5" />Draw on Map</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground" onClick={() => setExpanded((e) => !e)} title={expanded ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {/* Expanded details — 4-per-row field grid */}
      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {field("Name En", "nameEn")}
            {field("Name Ar", "nameAr", { rtl: true })}
            {viewOnly("Developer", devLink)}
            {viewOnly("Parent Project", parentLink)}

            <div className="hidden lg:block" aria-hidden />
            {field("Category", "category", { options: ["Residential", "Commercial", "Mixed Use"] })}
            {field("Type", "projectType", { options: ["Compound", "Standalone", "Coastal Resort", "Office Park", "Retail"] })}
            {field("Subtype", "projectSubtype", { options: ["Apartments", "Villas", "Mixed Units", "Chalets", "Offices", "Shops"] })}

            {viewOnly("Location", location)}
            {field("Coordinates", "coordinates")}
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Map Polygon</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={cn(TAG, geo.polygon ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700")}>
                  {geo.polygon ? "Polygon Geometry" : "Missing Polygon"}
                </span>
                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setDrawOpen(true)}>
                  <MapIcon className="h-3 w-3" />Draw on Map
                </Button>
              </div>
            </div>
            {field("Address", "address")}

            {field("Project Area", "projectArea", { suffix: "SQM" })}
            {field("Greenery Area", "greeneryArea", { suffix: "SQM" })}
            {field("Total BUA Area", "buaArea", { suffix: "SQM" })}
            {field("Footprint Area", "footprintArea", { suffix: "SQM" })}

            {field("Number of Buildings", "buildings")}
            {field("Total Number of Units", "totalUnits")}
            {field("Manual Rank", "manualRank")}
            {viewOnly("Automatic Rank", saved.autoRank || "—")}

            {field("Listing Status", "listingStatus", { options: ["Active", "Hidden"], viewTone: LISTING_TONE })}
            {field("Primary Status", "primaryStatus", { options: ["Launch", "On-Sale", "On-Hold", "Sold-Off", "Archived"], viewTone: PRIMARY_TONE })}
            {field("Entry Type", "entryType", { options: ["Automatic", "Manual"] })}
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Organizations</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(p.organizations ?? ["Nawy"]).map((o) => <OrgTag key={o} org={o} />)}
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cover Image</div>
              {gallery[0] ? (
                <img src={gallery[0]} alt="Cover" className="mt-1.5 h-20 w-32 rounded-lg border border-border object-cover" />
              ) : (
                <div className="mt-1.5 flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">No cover</div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Gallery Images</div>
              {gallery.length > 0 ? (
                <div className="mt-1.5 flex gap-1.5">
                  {gallery.slice(0, 4).map((src, i) => (
                    <img key={i} src={src} alt={`Gallery ${i + 1}`} className="h-20 w-24 rounded-lg border border-border object-cover" />
                  ))}
                </div>
              ) : (
                <span className={cn(TAG, "mt-1.5 border-red-200 bg-red-100 text-red-700")}>No images</span>
              )}
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Masterplan Image</div>
              <img src="/aerial-view-masterplan-residential-development-blu.jpg" alt="Masterplan" className="mt-1.5 h-20 w-32 rounded-lg border border-border object-cover" />
            </div>
          </div>
        </div>
      )}

      {drawOpen && (
        <MapDrawDialog
          name={saved.nameEn}
          level={p.isPhase ? "Phase" : "Project"}
          entityId={p.id ?? "—"}
          pin={geo.pin}
          polygon={geo.polygon}
          locations={[]}
          onClose={() => setDrawOpen(false)}
          onSave={(pin, polygon) => { setGeo({ pin, polygon }); setDrawOpen(false); toast.success("Map geometry saved") }}
        />
      )}

      {listingDlg && (
        <ListingStatusDialog
          r={asRow()}
          phases={p.isPhase ? [] : phases}
          onClose={() => setListingDlg(false)}
          onConfirm={() => {
            const next = saved.listingStatus === "Active" ? "Hidden" : "Active"
            setStatus("listingStatus", next)
            setListingDlg(false)
            toast.success(`Listing status set to ${next}${!p.isPhase && phases.length ? ` with ${phases.length} phases` : ""}`)
          }}
        />
      )}
      {primaryDlg && (
        <PrimaryStatusDialog
          r={asRow()}
          phases={p.isPhase ? [] : phases}
          onClose={() => setPrimaryDlg(false)}
          onConfirm={(s: ProjPrimaryStatus) => {
            setStatus("primaryStatus", s)
            setPrimaryDlg(false)
            toast.success(`Primary status set to ${s}${!p.isPhase && phases.length ? ` with ${phases.length} phases` : ""}`)
          }}
        />
      )}
      {cascade && (
        <CascadeChangeDialog
          kind={cascade}
          targets={[asRow()]}
          ignored={0}
          allRows={PROJECTS}
          onClose={() => setCascade(null)}
          onConfirm={() => { setCascade(null); toast.success(`${saved.nameEn} updated with its phases`) }}
        />
      )}
    </div>
  )
}

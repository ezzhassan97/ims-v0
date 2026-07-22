"use client"

import { useMemo, useState } from "react"
import { Building2, Check, ChevronDown, ExternalLink, GitBranch, Globe, Layers, Map as MapIcon, MapPin, MoreHorizontal, Pencil, Repeat, Tag as TagIcon, ToggleRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FilterSelect, IdTag } from "@/components/table-kit"
import { MapDrawDialog, type Pt } from "@/components/area-map"
import { ListingStatusDialog, PrimaryStatusDialog, CascadeChangeDialog, CLASSIFICATION, fmtDateTime, projSiteUrl, type CascadeKind } from "@/components/projects-list-page"
import { PROJECTS, type ProjectRow, type ProjListingStatus, type ProjPrimaryStatus, type ProjEntryType } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TAG = "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium"
const ADDED_TONE = "border-emerald-200 bg-emerald-100 text-emerald-700"
const MISSING_TONE = "border-red-200 bg-red-100 text-red-700"
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
  constructionStatus: string
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

const DECIMAL_FIELDS = ["projectArea", "greeneryArea", "buaArea", "footprintArea"] as const
const INT_FIELDS = ["buildings", "totalUnits", "manualRank"] as const

/**
 * Main project info card — view-only header bar (name, level, parent/developer links,
 * statuses, location) with a cascading actions menu; collapsed by default. Expanding
 * shows the full field grid; Edit makes the grid fields editable (Save / Cancel).
 * Statuses stay view-only in edit mode — they change through the actions menu.
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
    constructionStatus: p.constructionStatus ?? "Off-plan",
    coordinates: "29.960077, 31.077884",
    address: "",
    projectArea: p.areaKm2 != null ? String(Math.round(p.areaKm2 * 1_000_000)) : "",
    greeneryArea: "",
    buaArea: "",
    footprintArea: "",
    buildings: p.buildingsCount != null ? String(p.buildingsCount) : "",
    totalUnits: p.primaryUnits ? String(p.primaryUnits.total + (p.resaleUnits?.total ?? 0) + (p.nawyNowUnits?.total ?? 0) + (p.rentalUnits?.total ?? 0)) : "",
    manualRank: p.manualRank != null ? String(p.manualRank) : "",
    autoRank: p.autoRank != null ? String(p.autoRank) : "14",
    listingStatus: p.listingStatus ?? "Active",
    primaryStatus: p.primaryStatus ?? "Launch",
    entryType: p.entryType ?? "Automatic",
  }
  const [saved, setSaved] = useState<HeaderForm>(init)
  const [form, setForm] = useState<HeaderForm>(init)
  const [errs, setErrs] = useState<Set<string>>(new Set())
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
  const asRow = (): ProjectRow => ({
    ...PROJECTS[0],
    ...(p as Partial<ProjectRow>),
    listingStatus: saved.listingStatus as ProjListingStatus,
    primaryStatus: saved.primaryStatus as ProjPrimaryStatus,
    entryType: saved.entryType as ProjEntryType,
  } as ProjectRow)

  const setStatus = (k: "listingStatus" | "primaryStatus" | "entryType", v: string) => {
    setSaved((s) => ({ ...s, [k]: v }))
    setForm((f) => ({ ...f, [k]: v }))
  }

  /** Names are mandatory; numeric fields must be positive (areas allow decimals, counts/rank are integers). */
  const trySave = () => {
    const bad = new Set<string>()
    if (!form.nameEn.trim()) bad.add("nameEn")
    if (!form.nameAr.trim()) bad.add("nameAr")
    for (const k of DECIMAL_FIELDS) if (form[k] && !(/^\d+(\.\d+)?$/.test(form[k]) && Number(form[k]) > 0)) bad.add(k)
    for (const k of INT_FIELDS) if (form[k] && !(/^\d+$/.test(form[k]) && Number(form[k]) > 0)) bad.add(k)
    setErrs(bad)
    if (bad.size > 0) {
      toast.error(bad.has("nameEn") || bad.has("nameAr")
        ? "Name En and Name Ar are mandatory — and numeric fields must be positive numbers"
        : "Numeric fields must be positive numbers")
      return
    }
    setSaved(form)
    setEditing(false)
    toast.success("Project details saved")
  }

  const field = (label: string, key: keyof HeaderForm, opts?: { options?: string[]; suffix?: string; rtl?: boolean; required?: boolean }) => (
    <div key={key}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {opts?.required && editing && <span className="ml-0.5 text-red-500">*</span>}
      </div>
      {editing ? (
        opts?.options ? (
          <FilterSelect label={label} value={form[key]} options={opts.options} onChange={set(key)} className="mt-1 w-full" width="w-full" />
        ) : opts?.suffix ? (
          <div className="relative mt-1">
            <Input
              value={form[key]} onChange={(e) => set(key)(e.target.value)} placeholder="0"
              className={cn("h-8 pr-12 text-sm", errs.has(key) && "border-red-500 focus-visible:ring-red-500/30")}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">{opts.suffix}</span>
          </div>
        ) : (
          <Input
            value={form[key]} onChange={(e) => set(key)(e.target.value)} placeholder="—" dir={opts?.rtl ? "rtl" : undefined}
            className={cn("mt-1 h-8 text-sm", errs.has(key) && "border-red-500 focus-visible:ring-red-500/30")}
          />
        )
      ) : (
        <div className={cn("mt-1 truncate text-sm text-foreground", opts?.rtl && "text-right")} dir={opts?.rtl ? "rtl" : undefined}>
          {saved[key] ? `${saved[key]}${opts?.suffix ? ` ${opts.suffix}` : ""}` : opts?.suffix ? `— ${opts.suffix}` : "—"}
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

  // Category → Type → Subtype are a dependent hierarchy
  const typeOptions = Object.keys(CLASSIFICATION[form.category] ?? {})
  const subtypeOptions = CLASSIFICATION[form.category]?.[form.projectType] ?? []
  const pickCategory = (c: string) => {
    const t = Object.keys(CLASSIFICATION[c] ?? {})[0] ?? ""
    setForm((f) => ({ ...f, category: c, projectType: t, projectSubtype: (CLASSIFICATION[c]?.[t] ?? [])[0] ?? "" }))
  }
  const pickType = (t: string) =>
    setForm((f) => ({ ...f, projectType: t, projectSubtype: (CLASSIFICATION[f.category]?.[t] ?? [])[0] ?? "" }))
  const classField = (label: string, key: "category" | "projectType" | "projectSubtype", options: string[], onPick: (v: string) => void) => (
    <div key={key}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {editing ? (
        <FilterSelect label={label} value={form[key]} options={options} onChange={onPick} className="mt-1 w-full" width="w-full" />
      ) : (
        <div className="mt-1 truncate text-sm text-foreground">{saved[key] || "—"}</div>
      )}
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
        {/* Developer profile avatar (initials logo), not a generic icon */}
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
          {p.developer?.logo ?? (p.isPhase ? <Layers className="h-5 w-5" /> : <Building2 className="h-5 w-5" />)}
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
        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground" title="View on Website" onClick={() => window.open(projSiteUrl(saved.nameEn), "_blank", "noopener")}>
          <ExternalLink className="h-4 w-4" />
        </Button>
        {editing ? (
          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { setForm(saved); setErrs(new Set()); setEditing(false) }}>
              <X className="h-3.5 w-3.5" />Cancel
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={trySave}>
              <Check className="h-3.5 w-3.5" />Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8 flex-shrink-0 gap-1.5" onClick={() => { setExpanded(true); setEditing(true); setForm(saved) }}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground" onClick={() => setExpanded((e) => !e)} title={expanded ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </Button>
        {/* Same actions & cascade logic as the projects table rows — far right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setCascade("entry")}><Repeat className="mr-2 h-3.5 w-3.5" />Change Entry Type</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setListingDlg(true)}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPrimaryDlg(true)}><TagIcon className="mr-2 h-3.5 w-3.5" />Change Primary Status</DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Phases: only Change Parent Project. Mains: Change Developer / Area / Organizations */}
            {p.isPhase ? (
              <DropdownMenuItem onClick={() => setCascade("parent")}><GitBranch className="mr-2 h-3.5 w-3.5" />Change Parent Project</DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setCascade("developer")}><Building2 className="mr-2 h-3.5 w-3.5" />Change Developer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCascade("location")}><MapPin className="mr-2 h-3.5 w-3.5" />Change Area</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCascade("orgs")}><Globe className="mr-2 h-3.5 w-3.5" />Change Organizations</DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDrawOpen(true)}><MapIcon className="mr-2 h-3.5 w-3.5" />Draw on Map</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded details — 4-per-row field grid */}
      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {field("Name En", "nameEn", { required: true })}
            {field("Name Ar", "nameAr", { rtl: true, required: true })}
            {viewOnly("Developer", devLink)}
            {viewOnly("Parent Project", parentLink)}

            {classField("Category", "category", Object.keys(CLASSIFICATION), pickCategory)}
            {classField("Type", "projectType", typeOptions, pickType)}
            {classField("Subtype", "projectSubtype", subtypeOptions, set("projectSubtype"))}
            {field("Construction Status", "constructionStatus", { options: ["Off-plan", "Under Construction", "Completed"] })}

            {viewOnly("Location", location)}
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Coordinates</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {saved.coordinates ? (
                  <>
                    <span className={cn(TAG, ADDED_TONE)}>Added</span>
                    <span className="text-xs text-muted-foreground">{saved.coordinates}</span>
                  </>
                ) : (
                  <span className={cn(TAG, MISSING_TONE)}>Missing</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Map Polygon</div>
              <div className="mt-1">
                <span className={cn(TAG, geo.polygon ? ADDED_TONE : MISSING_TONE)}>{geo.polygon ? "Added" : "Missing"}</span>
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

            {/* Statuses change through the actions menu — never editable inline */}
            {viewOnly("Listing Status", <span className={cn(TAG, LISTING_TONE[saved.listingStatus] ?? "border-border bg-muted text-muted-foreground")}>{saved.listingStatus}</span>)}
            {viewOnly("Primary Status", <span className={cn(TAG, PRIMARY_TONE[saved.primaryStatus] ?? "border-border bg-muted text-muted-foreground")}>{saved.primaryStatus}</span>)}
            {viewOnly("Entry Type", <span className={cn(TAG, ENTRY_TONE[saved.entryType] ?? "border-border bg-muted text-muted-foreground")}>{saved.entryType}</span>)}
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Organizations</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(p.organizations ?? ["Nawy"]).map((o) => <OrgTag key={o} org={o} />)}
              </div>
            </div>

            {viewOnly("Created At", p.createdAt ? fmtDateTime(p.createdAt) : "—")}
            {viewOnly("Updated At", p.updatedAt ? fmtDateTime(p.updatedAt) : "—")}
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
          onConfirm={(value) => {
            // Entry type is reflected locally; the other cascades only exist against the mock list
            if (cascade === "entry") setStatus("entryType", value as string)
            setCascade(null)
            toast.success(p.isPhase ? `${saved.nameEn} updated` : `${saved.nameEn} updated with its phases`)
          }}
        />
      )}
    </div>
  )
}

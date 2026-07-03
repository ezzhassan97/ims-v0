"use client"

import { Fragment, useMemo, useState } from "react"
import {
  Check, ChevronDown, MoreHorizontal, Eye, ToggleRight, Layers, Building2,
  Group as GroupIcon, FolderTree, CheckCircle2, Tag as TagIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, IdTag, COL_SEP } from "@/components/table-kit"
import { ProjectDetails } from "@/components/projects-page"
import {
  PROJECTS, PROJECT_DEVELOPERS, AREAS, DISTRICTS,
  type ProjectRow, type ProjListingStatus, type ProjPrimaryStatus, type ProjEntryType,
} from "@/lib/projects-mock"

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

type GroupByKey = "none" | "developer" | "district" | "area" | "listingStatus" | "primaryStatus" | "entryType"
const GROUP_LABEL: Record<GroupByKey, string> = {
  none: "Group by", developer: "Developer", district: "District", area: "Area",
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

export function ProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>(PROJECTS)
  const [selected, setSelected] = useState<ProjectRow | null>(null)
  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState("")
  const [districtF, setDistrictF] = useState("")
  const [areaF, setAreaF] = useState("")
  const [listingF, setListingF] = useState("")
  const [primaryF, setPrimaryF] = useState("")
  const [entryF, setEntryF] = useState("")
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })

  const update = (id: string, patch: Partial<ProjectRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (needle && !`${r.name} ${r.id}`.toLowerCase().includes(needle)) return false
      if (developerF && r.developer.id !== developerF) return false
      if (districtF && r.district !== districtF) return false
      if (areaF && r.area !== areaF) return false
      if (listingF && r.listingStatus !== listingF) return false
      if (primaryF && r.primaryStatus !== primaryF) return false
      if (entryF && r.entryType !== entryF) return false
      return true
    })
  }, [rows, q, developerF, districtF, areaF, listingF, primaryF, entryF])

  const groups = useMemo(() => {
    if (groupBy === "none") return null
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

  if (selected) {
    return <ProjectDetails project={selected} onBack={() => setSelected(null)} />
  }

  const renderRow = (r: ProjectRow) => (
    <tr key={r.id} onClick={() => setSelected(r)} className="group cursor-pointer transition-colors hover:bg-muted/40">
      {/* Project / Phase name + id */}
      <td className="py-3 pl-5 pr-4">
        <div className="flex items-center gap-2.5">
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
            <DropdownMenuItem onClick={() => update(r.id, { listingStatus: r.listingStatus === "Active" ? "Hidden" : "Active" })}>
              <ToggleRight className="mr-2 h-3.5 w-3.5" />Toggle Listing Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Change Primary Status</DropdownMenuLabel>
            {PRIMARY_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => update(r.id, { primaryStatus: s })}>
                {s}{r.primaryStatus === s && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">All projects and phases in the system</p>
        </div>

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
          activeFilters={[developerF, districtF, areaF, listingF, primaryF, entryF].filter(Boolean).length}
          filters={
            <>
              <FilterSelect label="Developer" value={developerF} options={PROJECT_DEVELOPERS.map((d) => ({ value: d.id, label: d.name, sublabel: d.id }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />
              <FilterSelect label="District" value={districtF} options={DISTRICTS} onChange={(v) => { setDistrictF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Area" value={areaF} options={AREAS} onChange={(v) => { setAreaF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Listing Status" value={listingF} options={["Active", "Hidden"]} onChange={(v) => { setListingF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Primary Status" value={primaryF} options={PRIMARY_STATUSES} onChange={(v) => { setPrimaryF(v); setPage(1) }} className="w-40" />
              <FilterSelect label="Entry Type" value={entryF} options={["Automatic", "Manual"]} onChange={(v) => { setEntryF(v); setPage(1) }} className="w-36" />
            </>
          }
          groupControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />{GROUP_LABEL[groupBy]}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(GROUP_LABEL) as GroupByKey[]).map((k) => (
                  <DropdownMenuItem key={k} onClick={() => setGroupBy(k)} className="text-sm">{k === "none" ? "No grouping" : GROUP_LABEL[k]}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Table */}
        <TableCard>
          <TableCardHeader title="Projects" count={filtered.length} />
          <div className="overflow-x-auto">
            <table className={cn("w-max text-sm", COL_SEP)}>
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th className="pl-5">Project / Phase Name</Th>
                  <Th>Main Project</Th>
                  <Th>Developer</Th>
                  <Th>District</Th>
                  <Th>Area</Th>
                  <Th>Subarea</Th>
                  <Th>Listing Status</Th>
                  <Th>Primary Status</Th>
                  <Th>Entry Type</Th>
                  <Th>Created At</Th>
                  <Th>Updated At</Th>
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={12} className="p-0">
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
                  <tr><td colSpan={12} className="px-5 py-16 text-center text-sm text-muted-foreground">No projects match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {groups ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} rows in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
          ) : (
            <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="projects" />
          )}
        </TableCard>
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

"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Columns3, Plus, Copy, Check, ChevronDown, Download,
  ArrowRight, Home, ChevronRight, Pencil, ChevronUp, MoreHorizontal, MessageCircle,
  ChevronLeft, ChevronsLeft, ChevronsRight, Building2, ExternalLink, Eye, FileText, Globe, ToggleRight, Users, HelpCircle,
  Image as ImageIcon, Group as GroupIcon, GripVertical, Trash2, Save, X, UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { StoryBadge } from "@/components/all-properties-page"
import { TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, FloatingBulkBar, BulkBarButton, IdTag, COL_SEP, FiltersDrawer, FilterDrawerField, ColumnsSheet, GroupPager, type ManagedColumn } from "@/components/table-kit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/rich-text-editor"
import { WhatsAppMediaTable } from "@/components/whatsapp-media-page"
import { ProjectsPage } from "@/components/projects-list-page"
import { PROJECTS } from "@/lib/projects-mock"
import { WA_CONTACTS, type WaContact } from "@/lib/wa-contacts-mock"
import { DeveloperCreatePage } from "@/components/developer-create-page"
import { DEVELOPERS, type Developer, type DevPriority, type DevListingStatus, type DevOrg } from "@/lib/developers-mock"

const PRIORITIES: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]

/** Public listing page for a developer on nawy.com (mock slug). */
const devSiteUrl = (name: string) => `https://www.nawy.com/developer/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`

type SortKey = "priority" | "projects" | "phases" | "createdAt" | "updatedAt"
const SORT_FIELDS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "projects", label: "Projects" },
  { key: "phases", label: "Phases" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Last Updated" },
]
const PRIORITY_ORDER: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]
function sortVal(d: Developer, key: SortKey): string | number {
  switch (key) {
    case "priority": return PRIORITY_ORDER.indexOf(d.priority)
    case "projects": return d.projectsTotal
    case "phases": return d.phasesTotal
    case "createdAt": return d.createdAt
    case "updatedAt": return d.updatedAt
  }
}

/** Organization tag — light tones like the rest of the tag system (Nawy light green, Partners light blue). */
function OrgChip({ org }: { org: string }) {
  return (
    <span className={cn(
      "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
      org === "Nawy" ? "border-emerald-200 bg-emerald-100 text-emerald-700"
        : org === "Partners" ? "border-blue-200 bg-blue-100 text-blue-700"
          : "border-border bg-muted text-muted-foreground",
    )}>
      {org}
    </span>
  )
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function fmt(iso: string) {
  const [datePart, timePart] = iso.split("T")
  const [y, mo, da] = datePart.split("-").map(Number)
  const [hh, mm] = (timePart ?? "00:00").split(":").map(Number)
  const ap = hh < 12 ? "am" : "pm"
  const h12 = hh % 12 || 12
  return `${da} ${MONTHS[mo - 1]} ${y}, ${h12}:${String(mm).padStart(2, "0")} ${ap}`
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
      title="Copy ID"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

/** Image + Name + (ID + copy) cell — used by Developer Name and WhatsApp Group columns. */
function EntityCell({ image, name, id, label, rounded = "rounded-lg" }: {
  image: string; name: string; id: string; label?: string; rounded?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <img src={image} alt="" className={cn("h-9 w-9 shrink-0 border border-border object-cover", rounded)} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <IdTag value={id} label={label} />
      </div>
    </div>
  )
}

type GroupByKey = "none" | "priority" | "listingStatus"
const GROUP_BY_LABEL: Record<GroupByKey, string> = { none: "Group by", priority: "Priority", listingStatus: "Listing Status" }

// ── Column control config (checkbox + actions stay fixed) ──
const DEV_COLS: (ManagedColumn & { width: number })[] = [
  { id: "name", label: "Developer Name", width: 260 },
  { id: "priority", label: "Priority", width: 130 },
  { id: "listingStatus", label: "Listing Status", width: 130 },
  { id: "organization", label: "Organization", width: 160 },
  { id: "whatsappGroup", label: "WhatsApp Group", width: 240 },
  { id: "projects", label: "Projects", width: 170 },
  { id: "phases", label: "Phases", width: 170 },
  { id: "createdAt", label: "Created At", width: 170 },
  { id: "updatedAt", label: "Last Updated", width: 170 },
]
const DEV_COL_SORT: Partial<Record<string, SortKey>> = {
  priority: "priority", projects: "projects", phases: "phases", createdAt: "createdAt", updatedAt: "updatedAt",
}

export function DevelopersPage() {
  const [rows, setRows] = useState<Developer[]>(DEVELOPERS)
  const [selected, setSelected] = useState<Developer | null>(null)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [priorityF, setPriorityF] = useState<string[]>([])
  const [orgF, setOrgF] = useState<string[]>([])
  const [waF, setWaF] = useState("")
  const [devDlg, setDevDlg] = useState<{ kind: "listing" | "orgs"; dev: Developer } | null>(null)
  const [waGroupDev, setWaGroupDev] = useState<Developer | null>(null)
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // Per-group pagination — real data can put hundreds of rows in one group
  const GROUP_PAGE_SIZE = 10
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  useEffect(() => { setGroupPages({}) }, [groupBy, q, statusF, priorityF, orgF, waF])
  const [sorts, setSorts] = useState<{ key: SortKey; dir: "asc" | "desc" }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const lastClickedRef = useRef<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // All Filters drawer + Customize Columns (order / hide / freeze)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showColumnsSheet, setShowColumnsSheet] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(DEV_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => DEV_COLS.find((c) => c.id === id)!).filter(Boolean)
  // Sticky-left offset for a frozen column = checkbox width + widths of preceding frozen columns
  const frozenLeft = (colId: string) => {
    let left = 40
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }
  const clearAllFilters = () => { setQ(""); setStatusF([]); setPriorityF([]); setOrgF([]); setWaF(""); setPage(1) }

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((d) => {
      if (needle && !`${d.name} ${d.id}`.toLowerCase().includes(needle)) return false
      if (statusF.length && !statusF.includes(d.listingStatus)) return false
      if (priorityF.length && !priorityF.includes(d.priority)) return false
      if (orgF.length && !orgF.some((o) => d.organizations.includes(o as never))) return false
      if (waF && (d.whatsappGroup ? "Linked" : "Not Linked") !== waF) return false
      return true
    })
  }, [rows, q, statusF, priorityF, orgF, waF])

  const sorted = useMemo(() => {
    if (!sorts.length) return filtered
    return [...filtered].sort((a, b) => {
      for (const s of sorts) {
        const av = sortVal(a, s.key), bv = sortVal(b, s.key)
        const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        if (c !== 0) return s.dir === "asc" ? c : -c
      }
      return 0
    })
  }, [filtered, sorts])

  // Header click → make this key the single primary sort (toggle dir if already primary).
  const toggleHeaderSort = (key: SortKey) =>
    setSorts((prev) => (prev[0]?.key === key ? [{ key, dir: prev[0].dir === "asc" ? "desc" : "asc" }] : [{ key, dir: "asc" }]))
  const headerSort = (key: SortKey) => sorts.find((s) => s.key === key)

  const groups = useMemo(() => {
    if (groupBy === "none") return null
    const order = groupBy === "priority" ? ["Highest", "High", "Medium", "Low", "Lowest"] : ["Active", "Hidden"]
    const map = new Map<string, Developer[]>()
    for (const d of sorted) {
      const k = String(groupBy === "priority" ? d.priority : d.listingStatus)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(d)
    }
    return order.filter((o) => map.has(o)).map((o) => ({ label: o, rows: map.get(o)! }))
  }, [filtered, groupBy])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  const update = (id: number, patch: Partial<Developer>) =>
    setRows((rs) => rs.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  // ── Selection (shift-range / page / all-results) ──
  const toggleRow = (id: number, index: number, shift: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (shift && lastClickedRef.current !== null) {
        const lo = Math.min(lastClickedRef.current, index), hi = Math.max(lastClickedRef.current, index)
        for (let i = lo; i <= hi; i++) if (pageRows[i]) n.add(pageRows[i].id)
      } else {
        n.has(id) ? n.delete(id) : n.add(id)
        lastClickedRef.current = index
      }
      return n
    })
  }
  const pageAllSelected = pageRows.length > 0 && pageRows.every((d) => selectedIds.has(d.id))
  const togglePage = () => setSelectedIds((prev) => {
    const n = new Set(prev)
    if (pageAllSelected) pageRows.forEach((d) => n.delete(d.id)); else pageRows.forEach((d) => n.add(d.id))
    return n
  })
  const exportSelected = () => {
    const chosen = rows.filter((d) => selectedIds.has(d.id))
    const csv = [
      ["ID", "Name", "Priority", "Listing Status", "Organizations", "Projects", "Phases"].join(","),
      ...chosen.map((d) => [d.id, `"${d.name}"`, d.priority, d.listingStatus, `"${d.organizations.join("; ")}"`, `${d.projectsListed}/${d.projectsTotal}`, `${d.phasesListed}/${d.phasesTotal}`].join(",")),
    ].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a"); a.href = url; a.download = "developers.csv"; a.click(); URL.revokeObjectURL(url)
  }

  if (creating) {
    return <DeveloperCreatePage onBack={() => setCreating(false)} onCreate={() => setCreating(false)} />
  }
  if (selected) {
    const live = rows.find((d) => d.id === selected.id) ?? selected
    return <DeveloperDetails developer={live} onBack={() => setSelected(null)} onUpdate={(patch) => update(live.id, patch)} />
  }

  // ── Config-driven cells (order / visibility / freeze from the Columns sheet) ──
  const cellContent = (colId: string, d: Developer): React.ReactNode => {
    switch (colId) {
      case "name": return <EntityCell image={d.logo} name={d.name} id={String(d.id)} />
      case "priority": return <StoryBadge value={d.priority} options={PRIORITIES} onChange={(v) => { update(d.id, { priority: v as DevPriority }); toast.success(`${d.name} priority updated to ${v}`) }} />
      // Listing status is NOT inline-editable — it changes through the row action (cascades to projects & phases)
      case "listingStatus": return <StoryBadge value={d.listingStatus} />
      case "organization": return <div className="flex flex-nowrap items-center gap-1">{d.organizations.map((o) => <OrgChip key={o} org={o} />)}</div>
      case "whatsappGroup": return d.whatsappGroup
        ? <EntityCell image={d.whatsappGroup.image} name={d.whatsappGroup.name} id={d.whatsappGroup.id} />
        : <Badge variant="outline" className="border border-red-200 bg-red-50 text-xs font-medium text-red-600">No WhatsApp linked</Badge>
      case "projects": return <span className="whitespace-nowrap text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.projectsListed}</span> Listed / <span className="font-medium text-foreground">{d.projectsTotal}</span> Total</span>
      case "phases": return <span className="whitespace-nowrap text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.phasesListed}</span> Listed / <span className="font-medium text-foreground">{d.phasesTotal}</span> Total</span>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmt(d.createdAt)}</span>
      case "updatedAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmt(d.updatedAt)}</span>
      default: return null
    }
  }

  const renderRow = (d: Developer, index: number) => (
    <tr key={d.id} onClick={() => setSelected(d)} className={cn("group cursor-pointer transition-colors hover:bg-muted/40", selectedIds.has(d.id) && "bg-primary/5")}>
      <td className={cn("sticky left-0 z-10 w-10 px-4 py-3", selectedIds.has(d.id) ? "bg-primary/5" : "bg-card")} onClick={(e) => e.stopPropagation()}>
        {/* onClick (not onCheckedChange) — Radix doesn't pass the event, and we need shiftKey */}
        <Checkbox checked={selectedIds.has(d.id)} onClick={(e) => toggleRow(d.id, index, e.shiftKey)} className="h-4 w-4" />
      </td>
      {visibleCols.map((c) => (
        <td
          key={c.id}
          className={cn("px-4 py-3", frozenCols.has(c.id) && "sticky z-10 bg-card")}
          style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
          onClick={c.id === "priority" ? (e) => e.stopPropagation() : undefined}
        >
          {cellContent(c.id, d)}
        </td>
      ))}
      {/* Action — frozen right: single ⋯ dropdown, View first */}
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setSelected(d)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(devSiteUrl(d.name), "_blank", "noopener")}><ExternalLink className="mr-2 h-3.5 w-3.5" />View on Website</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDevDlg({ kind: "listing", dev: d })}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDevDlg({ kind: "orgs", dev: d })}><Globe className="mr-2 h-3.5 w-3.5" />Change Organizations</DropdownMenuItem>
            {/* Only for developers with no WhatsApp group linked yet */}
            {!d.whatsappGroup && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setWaGroupDev(d)}><MessageCircle className="mr-2 h-3.5 w-3.5" />Create WhatsApp Group</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )

  const renderTh = (c: (typeof DEV_COLS)[number]) => {
    const k = DEV_COL_SORT[c.id]
    const s = k ? headerSort(k) : undefined
    return (
      <th
        key={c.id}
        className={cn("whitespace-nowrap px-4 py-3 text-left", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
      >
        {k ? (
          <button onClick={() => toggleHeaderSort(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
            {c.label}
            {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
          </button>
        ) : c.label}
      </th>
    )
  }
  const colCount = visibleCols.length + 2

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developers</h1>
          <p className="text-sm text-muted-foreground">Manage all real estate developers in the system</p>
        </div>

        {/* Search + filters + control actions */}
        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Developer Name or ID"
          activeFilters={statusF.length + priorityF.length + orgF.length + (waF ? 1 : 0)}
          hideAdvanced
          onAllFilters={() => setShowAllFilters(true)}
          onColumns={() => setShowColumnsSheet(true)}
          filters={
            <>
              <FilterMultiSelect label="Status" tone="danger" value={statusF} options={["Active", "Hidden"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Priority" tone="danger" value={priorityF} options={PRIORITIES} onChange={(v) => { setPriorityF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Organizations" tone="danger" value={orgF} options={["Nawy", "Partners"]} onChange={(v) => { setOrgF(v); setPage(1) }} className="w-44" />
              <FilterSelect label="WhatsApp Groups" value={waF} options={["Linked", "Not Linked"]} onChange={(v) => { setWaF(v); setPage(1) }} className="w-44" />
            </>
          }
          sortControl={<DevSortControl sorts={sorts} setSorts={setSorts} />}
          groupControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />{GROUP_BY_LABEL[groupBy]}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy("none")} className="text-sm">No grouping</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("priority")} className="text-sm">Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("listingStatus")} className="text-sm">Listing Status</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Table card */}
        <TableCard>
          <TableCardHeader title="Developers" count={filtered.length} cta={<Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Add developer</Button>} />

          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[1100px] text-sm", COL_SEP)}>
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-20 w-10 bg-muted/60 px-4 py-3">
                    <Checkbox checked={pageAllSelected} onCheckedChange={togglePage} className="h-4 w-4" />
                  </th>
                  {visibleCols.map(renderTh)}
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={colCount} className="p-0">
                          <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                            <StoryBadge value={g.label} />
                            <span className="text-xs text-muted-foreground">{g.rows.length} developer{g.rows.length !== 1 ? "s" : ""}</span>
                            {!collapsedGroups.has(g.label) && (
                              <GroupPager total={g.rows.length} page={groupPages[g.label] ?? 1} pageSize={GROUP_PAGE_SIZE} onPage={(pg) => setGroupPages((prev) => ({ ...prev, [g.label]: pg }))} />
                            )}
                          </div>
                        </td>
                      </tr>
                      {!collapsedGroups.has(g.label) && g.rows.slice(((groupPages[g.label] ?? 1) - 1) * GROUP_PAGE_SIZE, (groupPages[g.label] ?? 1) * GROUP_PAGE_SIZE).map(renderRow)}
                    </Fragment>
                  ))
                ) : (
                  pageRows.map(renderRow)
                )}
                {filtered.length === 0 && (
                  <tr><td colSpan={colCount} className="px-5 py-16 text-center text-sm text-muted-foreground">No developers match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (hidden while grouped) */}
          {groups ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} developers in {groups.length} group{groups.length !== 1 ? "s" : ""}</div>
          ) : (
            <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="developers" />
          )}
        </TableCard>

        <FloatingBulkBar
          count={selectedIds.size}
          total={filtered.length}
          onSelectAll={() => setSelectedIds(new Set(filtered.map((d) => d.id)))}
          onClear={() => setSelectedIds(new Set())}
        >
          <BulkBarButton icon={<Download className="h-3.5 w-3.5 text-zinc-400" />} onClick={exportSelected}>Export</BulkBarButton>
        </FloatingBulkBar>

        {devDlg && (
          <DevCascadeDialog
            kind={devDlg.kind}
            dev={devDlg.dev}
            onClose={() => setDevDlg(null)}
            onConfirm={(value) => {
              if (devDlg.kind === "listing") update(devDlg.dev.id, { listingStatus: value as DevListingStatus })
              else update(devDlg.dev.id, { organizations: value as DevOrg[] })
              setDevDlg(null)
            }}
          />
        )}

        {waGroupDev && (
          <CreateWaGroupDialog
            dev={waGroupDev}
            onClose={() => setWaGroupDev(null)}
            onCreate={(members) => {
              update(waGroupDev.id, { whatsappGroup: { id: `WA-9${String(waGroupDev.id).slice(-3)}`, name: `${waGroupDev.name} — Nawy`, image: "/placeholder-logo.png" } })
              const admins = members.filter((m) => m.role === "Admin").length
              toast.success(`WhatsApp group created for ${waGroupDev.name} — ${members.length} contact${members.length !== 1 ? "s" : ""} added (${admins} admin${admins !== 1 ? "s" : ""})`)
              setWaGroupDev(null)
            }}
          />
        )}

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer
          open={showAllFilters}
          onClose={() => setShowAllFilters(false)}
          activeCount={statusF.length + priorityF.length + orgF.length + (waF ? 1 : 0)}
          onClear={clearAllFilters}
        >
          <FilterDrawerField label="Status">
            <FilterMultiSelect label="Status" tone="danger" value={statusF} options={["Active", "Hidden"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Priority">
            <FilterMultiSelect label="Priority" tone="danger" value={priorityF} options={PRIORITIES} onChange={(v) => { setPriorityF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Organizations">
            <FilterMultiSelect label="Organizations" tone="danger" value={orgF} options={["Nawy", "Partners"]} onChange={(v) => { setOrgF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="WhatsApp Groups">
            <FilterSelect label="WhatsApp Groups" value={waF} options={["Linked", "Not Linked"]} onChange={(v) => { setWaF(v); setPage(1) }} className="w-full" width="w-full" />
          </FilterDrawerField>
        </FiltersDrawer>

        {/* Customize Columns — order / visibility / freeze */}
        <ColumnsSheet
          open={showColumnsSheet}
          onClose={() => setShowColumnsSheet(false)}
          columns={DEV_COLS}
          order={colOrder}
          onOrderChange={setColOrder}
          hidden={hiddenCols}
          onHiddenChange={setHiddenCols}
          frozen={frozenCols}
          onFrozenChange={setFrozenCols}
        />
      </div>
    </div>
  )
}

function DevSortControl({ sorts, setSorts }: { sorts: { key: SortKey; dir: "asc" | "desc" }[]; setSorts: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: "asc" | "desc" }[]>> }) {
  const used = new Set(sorts.map((s) => s.key))
  const available = SORT_FIELDS.filter((f) => !used.has(f.key))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={sorts.length ? "default" : "outline"} size="sm" className="h-8 gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />Sort
          {sorts.length > 0 && <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-semibold">{sorts.length}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Multi-level sort</DropdownMenuLabel>
        {sorts.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No sort applied — add a level below.</p>}
        {sorts.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 px-2 py-1.5">
            <span className="w-4 text-[11px] text-muted-foreground">{i + 1}.</span>
            <span className="flex-1 text-sm">{SORT_FIELDS.find((f) => f.key === s.key)?.label}</span>
            <button onClick={() => setSorts((p) => p.map((x, j) => (j === i ? { ...x, dir: "asc" } : x)))} className={cn("rounded p-1", s.dir === "asc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => setSorts((p) => p.map((x, j) => (j === i ? { ...x, dir: "desc" } : x)))} className={cn("rounded p-1", s.dir === "desc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><ArrowDown className="h-3.5 w-3.5" /></button>
            <button onClick={() => setSorts((p) => p.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {available.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Add level</DropdownMenuLabel>
            {available.map((f) => (
              <DropdownMenuItem key={f.key} onSelect={(e) => { e.preventDefault(); setSorts((p) => [...p, { key: f.key, dir: "asc" }]) }} className="text-sm">+ {f.label}</DropdownMenuItem>
            ))}
          </>
        )}
        {sorts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSorts([])} className="text-sm text-red-600">Clear sort</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 text-left", className)}>{children}</th>
}
function PagerBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">{children}</button>
}

// ── Developer Details ────────────────────────────────────────────────────────
const DETAIL_TABS = [
  { value: "seo", label: "SEO", icon: FileText },
  { value: "faqs", label: "FAQs", icon: HelpCircle },
  { value: "projects", label: "Projects", icon: Building2 },
  { value: "whatsapp-media", label: "WhatsApp Media", icon: ImageIcon },
  { value: "contacts", label: "Contacts", icon: Users },
]
const PRIORITY_OPTS: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]

function DeveloperDetails({ developer, onBack, onUpdate }: { developer: Developer; onBack: () => void; onUpdate: (patch: Partial<Developer>) => void }) {
  const [collapsed, setCollapsed] = useState(true) // collapsed by default
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(developer)
  const [dlg, setDlg] = useState<"listing" | "orgs" | null>(null)
  const startEdit = () => { setDraft(developer); setEditing(true); setCollapsed(false) }
  // Listing status & organizations are NOT saved from inline edit — they change through the ⋯ actions (cascade)
  const saveEdit = () => {
    onUpdate({ officialName: draft.officialName, nameEn: draft.nameEn, nameAr: draft.nameAr, name: draft.nameEn, priority: draft.priority, nawyEligible: draft.nawyEligible })
    setEditing(false)
  }
  const expanded = editing || !collapsed

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={onBack} className="hover:text-foreground hover:underline">Developers</button>
        </div>

        {/* Main container */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-4">
              {/* Profile image — hover to change or remove */}
              <div className="group/avatar relative h-14 w-14 flex-shrink-0">
                <img src={developer.logo} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                  <label title="Change image" className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/20">
                    <UploadCloud className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onUpdate({ logo: URL.createObjectURL(f) })
                      }}
                    />
                  </label>
                  <button
                    title="Remove image"
                    onClick={() => onUpdate({ logo: "/placeholder.svg?height=64&width=64" })}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white hover:bg-white/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">{developer.name}</h1>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700">Developer</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">ID: {developer.id} <CopyBtn text={String(developer.id)} /></div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" className="gap-1.5" onClick={saveEdit}><Save className="h-3.5 w-3.5" />Save</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" title="View on Website" onClick={() => window.open(devSiteUrl(developer.name), "_blank", "noopener")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <IconBtn title="Edit" onClick={startEdit}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</IconBtn>
                  {/* Same cascading actions as the developers table rows */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setDlg("listing")}><ToggleRight className="mr-2 h-3.5 w-3.5" />Change Listing Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDlg("orgs")}><Globe className="mr-2 h-3.5 w-3.5" />Change Organizations</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {expanded && (
            <div className="space-y-5 border-t border-border px-6 py-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <EditField label="Official Registered Name" editing={editing} value={editing ? draft.officialName : developer.officialName} onChange={(v) => setDraft((d) => ({ ...d, officialName: v }))} />
                <EditField label="Name (EN)" editing={editing} value={editing ? draft.nameEn : developer.nameEn} onChange={(v) => setDraft((d) => ({ ...d, nameEn: v }))} />
                <EditField label="Name (AR)" rtl editing={editing} value={editing ? draft.nameAr : developer.nameAr} onChange={(v) => setDraft((d) => ({ ...d, nameAr: v }))} />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
                  {editing ? (
                    <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as DevPriority }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p} value={p} className="text-sm"><StoryBadge value={p} /></SelectItem>)}</SelectContent>
                    </Select>
                  ) : <div className="mt-1"><StoryBadge value={developer.priority} /></div>}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
                  {/* Changed through the ⋯ Change Organizations action (cascades) — never inline */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {developer.organizations.map((o) => <OrgChip key={o} org={o} />)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Listing status</p>
                  {/* Changed through the ⋯ Change Listing Status action (cascades) — never inline */}
                  <div className="mt-1"><StoryBadge value={developer.listingStatus} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nawy Eligible</p>
                  {editing
                    ? <div className="mt-1.5"><Switch checked={draft.nawyEligible} onCheckedChange={(v) => setDraft((d) => ({ ...d, nawyEligible: v }))} /></div>
                    : <Badge variant="outline" className={cn("mt-1 border text-xs font-medium", developer.nawyEligible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "text-muted-foreground")}>{developer.nawyEligible ? "Yes" : "No"}</Badge>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="seo" className="space-y-4">
          <TabsList>
            {DETAIL_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="seo"><SeoTab entity={developer} /></TabsContent>
          <TabsContent value="faqs"><FaqsTab entityName={developer.name} /></TabsContent>
          <TabsContent value="projects"><ProjectsTab developer={developer} /></TabsContent>
          <TabsContent value="whatsapp-media"><WhatsAppMediaTable hideDeveloperFilter /></TabsContent>
          <TabsContent value="contacts"><ContactsTab /></TabsContent>
        </Tabs>

        {dlg && (
          <DevCascadeDialog
            kind={dlg}
            dev={developer}
            onClose={() => setDlg(null)}
            onConfirm={(value) => {
              if (dlg === "listing") onUpdate({ listingStatus: value as DevListingStatus })
              else onUpdate({ organizations: value as DevOrg[] })
              setDlg(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function EditField({ label, value, editing, onChange, rtl }: { label: string; value: string; editing: boolean; onChange: (v: string) => void; rtl?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {editing
        ? <Input value={value} onChange={(e) => onChange(e.target.value)} dir={rtl ? "rtl" : undefined} className={cn("mt-1 h-8 text-sm", rtl && "text-right")} />
        : <p className={cn("mt-1 truncate text-sm font-medium text-foreground", rtl && "text-right")} dir={rtl ? "rtl" : undefined} title={value}>{value}</p>}
    </div>
  )
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return <button title={title} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{children}</button>
}
function Field({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-medium text-foreground", rtl && "text-right")} dir={rtl ? "rtl" : undefined} title={value}>{value}</p>
    </div>
  )
}
function TabCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-6">{children}</div>
}

/** Reuses the exact Projects table from the Projects page, scoped to this developer and
 *  without the Developer filter — so future changes to the Projects table reflect here too. */
function ProjectsTab({ developer }: { developer: Developer }) {
  const first = developer.name.split(" ")[0].toLowerCase()
  const devProjects = PROJECTS.filter((p) => {
    const pd = p.developer.name.toLowerCase()
    return pd.startsWith(first) || first.startsWith(p.developer.name.split(" ")[0].toLowerCase())
  })
  return <ProjectsPage embedded hideDeveloperFilter rows={devProjects} />
}

/** Shared SEO editor (developer details, areas page) — pass any entity with names + descriptions. */
export function SeoTab({ entity }: { entity: { name: string; nameAr: string; descriptionEn: string; descriptionAr: string } }) {
  const [descEn, setDescEn] = useState(`<p>${entity.descriptionEn}</p>`)
  const [descAr, setDescAr] = useState(`<p>${entity.descriptionAr}</p>`)
  const [metaTitleEn, setMetaTitleEn] = useState(`${entity.name} — Projects & Properties`)
  const [metaTitleAr, setMetaTitleAr] = useState(`${entity.nameAr} — المشروعات والعقارات`)
  const [metaDescEn, setMetaDescEn] = useState("")
  const [metaDescAr, setMetaDescAr] = useState("")
  const wc = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
  return (
    <TabCard>
      <h3 className="mb-4 text-sm font-semibold">SEO Information</h3>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Description EN</p>
          <RichTextEditor value={descEn} onChange={setDescEn} placeholder="Write the English description…" />
        </div>
        <div>
          <p className="mb-1.5 text-right text-xs font-medium text-muted-foreground">Description AR</p>
          <RichTextEditor value={descAr} onChange={setDescAr} dir="rtl" placeholder="اكتب الوصف بالعربية…" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Meta Title EN</p>
          <Input value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} className="h-9" />
          <p className="mt-1 text-[11px] text-muted-foreground">{wc(metaTitleEn)} words</p>
        </div>
        <div>
          <p className="mb-1.5 text-right text-xs font-medium text-muted-foreground">Meta Title AR</p>
          <Input value={metaTitleAr} onChange={(e) => setMetaTitleAr(e.target.value)} dir="rtl" className="h-9 text-right" />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{wc(metaTitleAr)} كلمة</p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Meta Description EN</p>
          <textarea value={metaDescEn} onChange={(e) => setMetaDescEn(e.target.value)} rows={4} placeholder="Meta description in English…" className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50" />
        </div>
        <div>
          <p className="mb-1.5 text-right text-xs font-medium text-muted-foreground">Meta Description AR</p>
          <textarea value={metaDescAr} onChange={(e) => setMetaDescAr(e.target.value)} dir="rtl" rows={4} placeholder="الوصف التعريفي بالعربية…" className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-right text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50" />
        </div>
      </div>
      <div className="mt-5 flex justify-end"><Button size="sm" className="gap-1.5"><Save className="h-3.5 w-3.5" />Save</Button></div>
    </TabCard>
  )
}

function ContactsTab() {
  const contacts = [
    { name: "Mahmoud Adel", role: "Sales Director", phone: "+20 100 123 4567", email: "m.adel@example.com" },
    { name: "Nour Hassan", role: "Marketing Lead", phone: "+20 106 987 6543", email: "n.hassan@example.com" },
    { name: "Omar Zaki", role: "Partnerships Manager", phone: "+20 111 222 3344", email: "o.zaki@example.com" },
  ]
  return (
    <TabCard>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">Contacts</h3>
        <span className="text-xs text-muted-foreground">({contacts.length})</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map((c) => (
          <div key={c.email} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{c.name.split(" ").map((p) => p[0]).join("")}</div>
              <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.role}</p></div>
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-muted-foreground"><p>{c.phone}</p><p className="truncate">{c.email}</p></div>
          </div>
        ))}
      </div>
    </TabCard>
  )
}

/** An FAQ belongs to ONE language — English and Arabic are separate pools, not paired translations. */
interface Faq { id: string; active: boolean; lang: "en" | "ar"; question: string; answer: string }
let faqCounter = 100

function LangToggle({ lang, onChange }: { lang: "en" | "ar"; onChange: (l: "en" | "ar") => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs font-semibold">
      <button onClick={() => onChange("en")} className={cn("rounded-full px-3 py-1 transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>English</button>
      <button onClick={() => onChange("ar")} className={cn("rounded-full px-3 py-1 transition-colors", lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Arabic (العربية)</button>
    </div>
  )
}

/** Shared FAQs manager (developer details, projects, areas). Each language is its own pool. */
export function FaqsTab({ entityName }: { entityName: string }) {
  const [lang, setLang] = useState<"en" | "ar">("en")
  const [faqs, setFaqs] = useState<Faq[]>([
    { id: "faq-1", active: true, lang: "en", question: `Where are ${entityName}'s projects located?`, answer: "Across New Cairo, Sheikh Zayed, the North Coast, and 6th of October." },
    { id: "faq-2", active: true, lang: "en", question: "What payment plans are available?", answer: "Flexible plans from 5% down payment and up to 12 years of installments." },
    { id: "faq-3", active: false, lang: "en", question: "Is delivery on schedule?", answer: "Projects follow the announced delivery timelines with periodic updates." },
    { id: "faq-4", active: true, lang: "ar", question: "ما أنظمة السداد المتاحة؟", answer: "أنظمة مرنة تبدأ من 5% مقدم وحتى 12 سنة أقساط." },
    { id: "faq-5", active: true, lang: "ar", question: "أين تقع المشروعات؟", answer: "في القاهرة الجديدة والشيخ زايد والساحل الشمالي و6 أكتوبر." },
  ])
  const [editing, setEditing] = useState<Faq | null>(null)
  const [creating, setCreating] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const isAr = lang === "ar"
  const pool = faqs.filter((f) => f.lang === lang)

  // Reorder within the current language pool (positions map back to the master list)
  const move = (from: number, to: number) =>
    setFaqs((fs) => {
      const ids = fs.filter((f) => f.lang === lang).map((f) => f.id)
      const fromIdx = fs.findIndex((f) => f.id === ids[from])
      const toIdx = fs.findIndex((f) => f.id === ids[to])
      const n = [...fs]; const [m] = n.splice(fromIdx, 1); n.splice(toIdx, 0, m); return n
    })
  const toggleActive = (id: string) => setFaqs((fs) => fs.map((f) => (f.id === id ? { ...f, active: !f.active } : f)))
  const remove = (id: string) => setFaqs((fs) => fs.filter((f) => f.id !== id))
  const save = (faq: Faq) => setFaqs((fs) => (fs.some((f) => f.id === faq.id) ? fs.map((f) => (f.id === faq.id ? faq : f)) : [...fs, faq]))

  return (
    <TabCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold">FAQs</h3><p className="text-xs text-muted-foreground">English and Arabic FAQs are separate pools — switch the language to manage each</p></div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} />
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Add FAQ</Button>
        </div>
      </div>

      <div className="space-y-2.5">
        {pool.map((f, i) => (
          <div
            key={f.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx !== null && dragIdx !== i) move(dragIdx, i); setDragIdx(null) }}
            className={cn("rounded-lg border border-border p-3 transition-shadow", dragIdx === i && "opacity-50")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground active:cursor-grabbing" />
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">#{i + 1}</span>
                <StoryBadge value={f.active ? "Active" : "Hidden"} />
                <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{f.lang}</span>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={f.active} onCheckedChange={() => toggleActive(f.id)} />
                <IconBtn title="Edit" onClick={() => setEditing(f)}><Pencil className="h-4 w-4" /></IconBtn>
                <IconBtn title="Delete" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>
            <p dir={isAr ? "rtl" : undefined} className={cn("mt-2 text-sm font-semibold text-foreground", isAr && "text-right")}>{f.question}</p>
            <div dir={isAr ? "rtl" : undefined} className={cn("mt-1.5 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground", isAr && "text-right")}>{f.answer}</div>
          </div>
        ))}
        {pool.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No {isAr ? "Arabic" : "English"} FAQs yet — click "Add FAQ" to create one.</p>}
      </div>

      {(creating || editing) && (
        <FaqModal faq={editing} defaultLang={lang} onClose={() => { setCreating(false); setEditing(null) }} onSave={(f) => { save(f); setCreating(false); setEditing(null) }} />
      )}
    </TabCard>
  )
}

function FaqModal({ faq, defaultLang, onClose, onSave }: { faq: Faq | null; defaultLang: "en" | "ar"; onClose: () => void; onSave: (f: Faq) => void }) {
  // The FAQ's own language — switchable while creating AND while editing
  const [lang, setLang] = useState<"en" | "ar">(faq?.lang ?? defaultLang)
  const [active, setActive] = useState(faq?.active ?? true)
  const [q, setQ] = useState(faq?.question ?? "")
  const [a, setA] = useState(faq?.answer ?? "")
  const isAr = lang === "ar"
  const canSave = q.trim() && a.trim()
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold">{faq ? "Edit FAQ" : "Add New FAQ"}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Language</p>
            <LangToggle lang={lang} onChange={setLang} />
          </div>
          <label className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><span className="text-sm">Active</span></label>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Question ({isAr ? "AR" : "EN"}) <span className="text-red-500">*</span></label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} dir={isAr ? "rtl" : undefined} placeholder={isAr ? "أدخل السؤال..." : "Enter question..."} className={cn("h-10", isAr && "text-right")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Answer ({isAr ? "AR" : "EN"}) <span className="text-red-500">*</span></label>
            <textarea value={a} onChange={(e) => setA(e.target.value)} dir={isAr ? "rtl" : undefined} rows={6} placeholder={isAr ? "أدخل الإجابة..." : "Enter answer..."} className={cn("w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50", isAr && "text-right")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave({ id: faq?.id ?? `faq-${++faqCounter}`, active, lang, question: q.trim(), answer: a.trim() })}>{faq ? "Save" : "Add FAQ"}</Button>
        </div>
      </div>
    </div>
  )
}


/** Projects & phases under a developer (mock names don't always align — fuzzy match). */
function projectsOfDeveloper(devName: string) {
  const k = devName.toLowerCase()
  return PROJECTS.filter((p) => {
    const n = p.developer.name.toLowerCase()
    return k.includes(n) || n.includes(k)
  })
}

/**
 * Developer cascade dialog — Change Listing Status / Change Organizations.
 * The impacted list is grouped by main project (phases nested under it).
 * Organizations only: every row is included by default and can be excluded.
 */
export function DevCascadeDialog({ kind, dev, onClose, onConfirm }: {
  kind: "listing" | "orgs"
  dev: Developer
  onClose: () => void
  onConfirm: (value: DevListingStatus | DevOrg[]) => void
}) {
  const next: DevListingStatus = dev.listingStatus === "Active" ? "Hidden" : "Active"
  const [orgs, setOrgs] = useState<DevOrg[]>(dev.organizations)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const toggleOrg = (o: DevOrg) => setOrgs((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]))
  const toggleExcluded = (id: string) =>
    setExcluded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const impacted = projectsOfDeveloper(dev.name)
  // Grouped by main project — phases sit indented under their main
  const flat = impacted
    .filter((p) => !p.isPhase)
    .flatMap((m) => [m, ...impacted.filter((p) => p.isPhase && p.mainProject?.id === m.id)])
  const included = kind === "orgs" ? flat.filter((p) => !excluded.has(p.id)) : flat
  const mainsIncl = included.filter((p) => !p.isPhase).length
  const phasesIncl = included.length - mainsIncl
  const canSave = kind === "listing" || orgs.length > 0

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{kind === "listing" ? "Change Listing Status" : "Change Organizations"}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{dev.name}</span> <IdTag value={String(dev.id)} />{" "}
          {kind === "listing" ? (
            <>will change from <StoryBadge value={dev.listingStatus} /> to <StoryBadge value={next} />.</>
          ) : (
            <>will get the selected organizations.</>
          )}
        </p>

        {kind === "orgs" && (
          <div className="flex gap-2">
            {(["Nawy", "Partners"] as DevOrg[]).map((o) => (
              <label key={o} className={cn(
                "flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors",
                orgs.includes(o) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
              )}>
                <Checkbox checked={orgs.includes(o)} onCheckedChange={() => toggleOrg(o)} className="h-4 w-4" />
                <OrgChip org={o} />
              </label>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-4 text-amber-800">
          This change cascades to <span className="font-semibold">{mainsIncl}</span> project{mainsIncl !== 1 ? "s" : ""} and{" "}
          <span className="font-semibold">{phasesIncl}</span> phase{phasesIncl !== 1 ? "s" : ""} under this developer
          {kind === "orgs" && excluded.size > 0 ? <> — <span className="font-semibold">{excluded.size}</span> excluded</> : null}.
        </div>

        {flat.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {kind === "orgs"
                ? "All projects and phases are included by default — untick a row to exclude it from this change:"
                : "Projects and phases inheriting this change — grouped by main project, read only:"}
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {flat.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2",
                    i > 0 && "border-t border-border/70",
                    p.isPhase && "bg-muted/20 pl-9",
                    kind === "orgs" && excluded.has(p.id) && "opacity-45",
                  )}
                >
                  {kind === "orgs" && (
                    <Checkbox checked={!excluded.has(p.id)} onCheckedChange={() => toggleExcluded(p.id)} className="h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <IdTag value={p.id} />
                  </div>
                  <span className={cn(
                    "inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-px text-[10px] font-medium",
                    p.isPhase ? "border-border bg-muted text-muted-foreground" : "border-blue-200 bg-blue-100 text-blue-700",
                  )}>
                    {p.isPhase ? "Phase" : "Main Project"}
                  </span>
                  {/* Listing status shown for both actions so the user sees each project/phase's state */}
                  <StoryBadge value={p.listingStatus} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No projects are linked to this developer yet.</p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" disabled={!canSave}
            onClick={() => {
              onConfirm(kind === "listing" ? next : orgs)
              toast.success(`${dev.name} updated — cascaded to ${mainsIncl} project${mainsIncl !== 1 ? "s" : ""} and ${phasesIncl} phase${phasesIncl !== 1 ? "s" : ""}${kind === "orgs" && excluded.size > 0 ? ` (${excluded.size} excluded)` : ""}`)
            }}
          >
            {kind === "listing" ? `Change to ${next}` : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Create WhatsApp Group — for developers with no group linked. The default contacts
 * (WhatsApp Configurations → Contacts) are all included; the user can exclude any
 * of them and flip each contact's role between Admin and Member before creating.
 */
export function CreateWaGroupDialog({ dev, onClose, onCreate }: {
  dev: Developer
  onClose: () => void
  onCreate: (members: WaContact[]) => void
}) {
  const [members, setMembers] = useState<WaContact[]>(WA_CONTACTS.map((c) => ({ ...c })))
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const toggleExcluded = (id: string) =>
    setExcluded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const setRole = (id: string, role: WaContact["role"]) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  const included = members.filter((m) => !excluded.has(m.id))
  const admins = included.filter((m) => m.role === "Admin").length

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create WhatsApp Group</DialogTitle></DialogHeader>

        {/* Developer context: image, name + ID, listing status, projects listed vs total */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <img src={dev.logo} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg border border-border object-cover" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">{dev.name}</span>
              <IdTag value={String(dev.id)} />
              <StoryBadge value={dev.listingStatus} />
            </div>
            <p className="text-xs text-muted-foreground">
              Projects: <span className="font-medium text-foreground">{dev.projectsListed}</span> Listed / <span className="font-medium text-foreground">{dev.projectsTotal}</span> Total
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          A new WhatsApp group will be created for this developer. The contacts below are added by default — untick to exclude, and switch roles as needed.
        </p>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{included.length} of {members.length}</span> contact{members.length !== 1 ? "s" : ""} will be added ({admins} admin{admins !== 1 ? "s" : ""}):
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {members.map((c, i) => {
              const isEx = excluded.has(c.id)
              return (
                <div key={c.id} className={cn("flex items-center gap-2.5 px-3 py-2.5", i > 0 && "border-t border-border/70", isEx && "opacity-45")}>
                  <Checkbox checked={!isEx} onCheckedChange={() => toggleExcluded(c.id)} className="h-4 w-4 flex-shrink-0" />
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                    {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{c.phone}</p>
                  </div>
                  {/* Admin ↔ Member toggle */}
                  <div className="flex flex-shrink-0 overflow-hidden rounded-md border border-border text-[11px] font-medium">
                    {(["Admin", "Member"] as const).map((r) => (
                      <button
                        key={r} type="button" disabled={isEx} onClick={() => setRole(c.id, r)}
                        className={cn("px-2 py-1 transition-colors", c.role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={included.length === 0} onClick={() => onCreate(included)}>
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

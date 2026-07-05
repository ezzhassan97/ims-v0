"use client"

import { Fragment, useMemo, useRef, useState } from "react"
import {
  Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Columns3, Plus, Copy, Check, ChevronDown, Download,
  ArrowRight, Home, ChevronRight, Pencil, ChevronUp, MoreHorizontal, MessageCircle,
  ChevronLeft, ChevronsLeft, ChevronsRight, Building2, FileText, Users, HelpCircle,
  Image as ImageIcon, Group as GroupIcon, GripVertical, Trash2, Save, X, UploadCloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { StoryBadge } from "@/components/all-properties-page"
import { TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, FilterMultiSelect, FloatingBulkBar, BulkBarButton, IdTag, COL_SEP } from "@/components/table-kit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/rich-text-editor"
import { WhatsAppMediaTable } from "@/components/whatsapp-media-page"
import { DeveloperCreatePage } from "@/components/developer-create-page"
import { DEVELOPERS, type Developer, type DevPriority, type DevListingStatus, type DevOrg } from "@/lib/developers-mock"

const PRIORITIES: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]

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

/** Organization chip — same line, brand colours (Nawy teal, Partners blue). */
function OrgChip({ org }: { org: string }) {
  const bg = org === "Nawy" ? "#7DCBC1" : org === "Partners" ? "#015C9A" : "#e5e7eb"
  const fg = org === "Nawy" ? "#0D1B2E" : "#ffffff"
  return <span className="inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: bg, color: fg }}>{org}</span>
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

export function DevelopersPage() {
  const [rows, setRows] = useState<Developer[]>(DEVELOPERS)
  const [selected, setSelected] = useState<Developer | null>(null)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [priorityF, setPriorityF] = useState<string[]>([])
  const [orgF, setOrgF] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sorts, setSorts] = useState<{ key: SortKey; dir: "asc" | "desc" }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const lastClickedRef = useRef<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((d) => {
      if (needle && !`${d.name} ${d.id}`.toLowerCase().includes(needle)) return false
      if (statusF.length && !statusF.includes(d.listingStatus)) return false
      if (priorityF.length && !priorityF.includes(d.priority)) return false
      if (orgF.length && !orgF.some((o) => d.organizations.includes(o as never))) return false
      return true
    })
  }, [rows, q, statusF, priorityF, orgF])

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

  const renderRow = (d: Developer, index: number) => (
    <tr key={d.id} onClick={() => setSelected(d)} className={cn("group cursor-pointer transition-colors hover:bg-muted/40", selectedIds.has(d.id) && "bg-primary/5")}>
      <td className={cn("sticky left-0 z-10 w-10 px-4 py-3", selectedIds.has(d.id) ? "bg-primary/5" : "bg-card")} onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selectedIds.has(d.id)} onCheckedChange={(checked, event) => toggleRow(d.id, index, (event as unknown as React.MouseEvent)?.shiftKey ?? false)} className="h-4 w-4" />
      </td>
      <td className="py-3 pl-5 pr-4">
        <EntityCell image={d.logo} name={d.name} id={String(d.id)} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StoryBadge value={d.priority} options={PRIORITIES} onChange={(v) => update(d.id, { priority: v as DevPriority })} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StoryBadge value={d.listingStatus} options={["Active", "Hidden"]} onChange={(v) => update(d.id, { listingStatus: v as DevListingStatus })} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-nowrap items-center gap-1">
          {d.organizations.map((o) => <OrgChip key={o} org={o} />)}
        </div>
      </td>
      <td className="px-4 py-3">
        {d.whatsappGroup ? (
          <EntityCell image={d.whatsappGroup.image} name={d.whatsappGroup.name} id={d.whatsappGroup.id} rounded="rounded-full" />
        ) : (
          <Badge variant="outline" className="border border-red-200 bg-red-50 text-xs font-medium text-red-600">No WhatsApp linked</Badge>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.projectsListed}</span> Listed / <span className="font-medium text-foreground">{d.projectsTotal}</span> Total</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.phasesListed}</span> Listed / <span className="font-medium text-foreground">{d.phasesTotal}</span> Total</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(d.createdAt)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(d.updatedAt)}</td>
      <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40">
        <button onClick={(e) => { e.stopPropagation(); setSelected(d) }} title="View developer" className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-primary">
          <ArrowRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )

  const SortTh = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => {
    const s = headerSort(k)
    return (
      <th className={cn("whitespace-nowrap px-4 py-3 text-left", className)}>
        <button onClick={() => toggleHeaderSort(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
          {label}
          {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      </th>
    )
  }

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
          activeFilters={statusF.length + priorityF.length + orgF.length}
          filters={
            <>
              <FilterMultiSelect label="Status" tone="danger" value={statusF} options={["Active", "Hidden"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Priority" tone="danger" value={priorityF} options={PRIORITIES} onChange={(v) => { setPriorityF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Organizations" tone="danger" value={orgF} options={["Nawy", "Partners"]} onChange={(v) => { setOrgF(v); setPage(1) }} className="w-44" />
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
                  <Th className="pl-5">Developer Name</Th>
                  <SortTh label="Priority" k="priority" />
                  <Th>Listing Status</Th>
                  <Th>Organization</Th>
                  <Th>WhatsApp Group</Th>
                  <SortTh label="Projects" k="projects" />
                  <SortTh label="Phases" k="phases" />
                  <SortTh label="Created At" k="createdAt" />
                  <SortTh label="Last Updated" k="updatedAt" />
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleGroup(g.label)}>
                        <td colSpan={11} className="p-0">
                          <div className="sticky left-0 flex w-max items-center gap-2 px-5 py-2">
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsedGroups.has(g.label) && "-rotate-90")} />
                            <StoryBadge value={g.label} />
                            <span className="text-xs text-muted-foreground">{g.rows.length} developer{g.rows.length !== 1 ? "s" : ""}</span>
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
                  <tr><td colSpan={11} className="px-5 py-16 text-center text-sm text-muted-foreground">No developers match your filters.</td></tr>
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
  const startEdit = () => { setDraft(developer); setEditing(true); setCollapsed(false) }
  const saveEdit = () => {
    onUpdate({ officialName: draft.officialName, nameEn: draft.nameEn, nameAr: draft.nameAr, name: draft.nameEn, priority: draft.priority, organizations: draft.organizations, listingStatus: draft.listingStatus, nawyEligible: draft.nawyEligible })
    setEditing(false)
  }
  const toggleOrg = (o: DevOrg) => setDraft((d) => ({ ...d, organizations: d.organizations.includes(o) ? d.organizations.filter((x) => x !== o) : [...d.organizations, o] }))
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
              <img src={developer.logo} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
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
                  <IconBtn title="Edit" onClick={startEdit}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</IconBtn>
                  <IconBtn title="More"><MoreHorizontal className="h-4 w-4" /></IconBtn>
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
                      <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <div className="mt-1"><StoryBadge value={developer.priority} /></div>}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {editing
                      ? (["Nawy", "Partners"] as DevOrg[]).map((o) => (
                        <button key={o} onClick={() => toggleOrg(o)} className={cn("rounded-md border px-2 py-0.5 text-xs font-medium transition-colors", draft.organizations.includes(o) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{o}</button>
                      ))
                      : developer.organizations.map((o) => <Badge key={o} variant="outline" className="border text-xs font-medium">{o}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Listing status</p>
                  {editing ? (
                    <Select value={draft.listingStatus} onValueChange={(v) => setDraft((d) => ({ ...d, listingStatus: v as DevListingStatus }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Active" className="text-sm">Active</SelectItem><SelectItem value="Hidden" className="text-sm">Hidden</SelectItem></SelectContent>
                    </Select>
                  ) : <div className="mt-1"><StoryBadge value={developer.listingStatus} /></div>}
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
          <TabsList className="bg-card">
            {DETAIL_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="seo"><SeoTab developer={developer} /></TabsContent>
          <TabsContent value="faqs"><FaqsTab developer={developer} /></TabsContent>
          <TabsContent value="projects"><ProjectsTab developer={developer} /></TabsContent>
          <TabsContent value="whatsapp-media"><WhatsAppMediaTable hideDeveloperFilter /></TabsContent>
          <TabsContent value="contacts"><ContactsTab /></TabsContent>
        </Tabs>
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
  return <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
}

function ProjectsTab({ developer }: { developer: Developer }) {
  const projects = Array.from({ length: developer.projectsTotal }, (_, i) => ({
    id: `PRJ-${developer.id}-${i + 1}`,
    name: `${developer.name.split(" ")[0]} ${["Heights", "Residences", "Park", "Gardens", "Bay", "Hills", "Square", "Valley"][i % 8]}`,
    phases: (i % 4) + 1,
    units: 80 + i * 35,
    listed: i < developer.projectsListed,
  }))
  return (
    <TabCard>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">Linked Projects</h3>
        <span className="text-xs text-muted-foreground">({projects.length})</span>
      </div>
      {projects.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No projects linked to this developer.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr><Th className="pl-4">Project</Th><Th>ID</Th><Th>Phases</Th><Th>Units</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="py-2.5 pl-4 pr-4 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-2.5">{p.phases}</td>
                  <td className="px-4 py-2.5">{p.units}</td>
                  <td className="px-4 py-2.5"><StoryBadge value={p.listed ? "Active" : "Hidden"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TabCard>
  )
}

function SeoTab({ developer }: { developer: Developer }) {
  const [descEn, setDescEn] = useState(`<p>${developer.descriptionEn}</p>`)
  const [descAr, setDescAr] = useState(`<p>${developer.descriptionAr}</p>`)
  const [metaTitleEn, setMetaTitleEn] = useState(`${developer.name} — Projects & Properties`)
  const [metaTitleAr, setMetaTitleAr] = useState(`${developer.nameAr} — المشروعات والعقارات`)
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

interface Faq { id: string; active: boolean; questionEn: string; answerEn: string; questionAr: string; answerAr: string }
let faqCounter = 100

function LangToggle({ lang, onChange }: { lang: "en" | "ar"; onChange: (l: "en" | "ar") => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs font-semibold">
      <button onClick={() => onChange("en")} className={cn("rounded-full px-3 py-1 transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>English</button>
      <button onClick={() => onChange("ar")} className={cn("rounded-full px-3 py-1 transition-colors", lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Arabic (العربية)</button>
    </div>
  )
}

function FaqsTab({ developer }: { developer: Developer }) {
  const [lang, setLang] = useState<"en" | "ar">("en")
  const [faqs, setFaqs] = useState<Faq[]>([
    { id: "faq-1", active: true, questionEn: `Where are ${developer.name}'s projects located?`, answerEn: "Across New Cairo, Sheikh Zayed, the North Coast, and 6th of October.", questionAr: "أين تقع مشروعات المطور؟", answerAr: "في القاهرة الجديدة والشيخ زايد والساحل الشمالي و6 أكتوبر." },
    { id: "faq-2", active: true, questionEn: "What payment plans are available?", answerEn: "Flexible plans from 5% down payment and up to 12 years of installments.", questionAr: "ما أنظمة السداد المتاحة؟", answerAr: "أنظمة مرنة تبدأ من 5% مقدم وحتى 12 سنة أقساط." },
    { id: "faq-3", active: false, questionEn: "Is delivery on schedule?", answerEn: "Projects follow the announced delivery timelines with periodic updates.", questionAr: "هل التسليم في الموعد؟", answerAr: "تلتزم المشروعات بمواعيد التسليم المعلنة مع تحديثات دورية." },
  ])
  const [editing, setEditing] = useState<Faq | null>(null)
  const [creating, setCreating] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const isAr = lang === "ar"

  const move = (from: number, to: number) => setFaqs((fs) => { const n = [...fs]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n })
  const toggleActive = (id: string) => setFaqs((fs) => fs.map((f) => (f.id === id ? { ...f, active: !f.active } : f)))
  const remove = (id: string) => setFaqs((fs) => fs.filter((f) => f.id !== id))
  const save = (faq: Faq) => setFaqs((fs) => (fs.some((f) => f.id === faq.id) ? fs.map((f) => (f.id === faq.id ? faq : f)) : [...fs, faq]))

  return (
    <TabCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold">FAQs</h3><p className="text-xs text-muted-foreground">Manage developer FAQs by language</p></div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} />
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Add FAQ</Button>
        </div>
      </div>

      <div className="space-y-2.5">
        {faqs.map((f, i) => (
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
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={f.active} onCheckedChange={() => toggleActive(f.id)} />
                <IconBtn title="Edit" onClick={() => setEditing(f)}><Pencil className="h-4 w-4" /></IconBtn>
                <IconBtn title="Delete" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>
            <p dir={isAr ? "rtl" : undefined} className={cn("mt-2 text-sm font-semibold text-foreground", isAr && "text-right")}>{(isAr ? f.questionAr : f.questionEn) || "—"}</p>
            <div dir={isAr ? "rtl" : undefined} className={cn("mt-1.5 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground", isAr && "text-right")}>{(isAr ? f.answerAr : f.answerEn) || "—"}</div>
          </div>
        ))}
        {faqs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No FAQs yet — click "Add FAQ" to create one.</p>}
      </div>

      {(creating || editing) && (
        <FaqModal faq={editing} lang={lang} onLang={setLang} onClose={() => { setCreating(false); setEditing(null) }} onSave={(f) => { save(f); setCreating(false); setEditing(null) }} />
      )}
    </TabCard>
  )
}

function FaqModal({ faq, lang, onLang, onClose, onSave }: { faq: Faq | null; lang: "en" | "ar"; onLang: (l: "en" | "ar") => void; onClose: () => void; onSave: (f: Faq) => void }) {
  const [active, setActive] = useState(faq?.active ?? true)
  const [qEn, setQEn] = useState(faq?.questionEn ?? "")
  const [aEn, setAEn] = useState(faq?.answerEn ?? "")
  const [qAr, setQAr] = useState(faq?.questionAr ?? "")
  const [aAr, setAAr] = useState(faq?.answerAr ?? "")
  const isAr = lang === "ar"
  const q = isAr ? qAr : qEn
  const a = isAr ? aAr : aEn
  const setQ = isAr ? setQAr : setQEn
  const setA = isAr ? setAAr : setAEn
  const canSave = (qEn.trim() && aEn.trim()) || (qAr.trim() && aAr.trim())
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
            <LangToggle lang={lang} onChange={onLang} />
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
          <Button size="sm" disabled={!canSave} onClick={() => onSave({ id: faq?.id ?? `faq-${++faqCounter}`, active, questionEn: qEn, answerEn: aEn, questionAr: qAr, answerAr: aAr })}>{faq ? "Save" : "Add FAQ"}</Button>
        </div>
      </div>
    </div>
  )
}


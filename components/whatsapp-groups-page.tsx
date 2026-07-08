"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight, ArrowLeft, Home, ChevronRight, ChevronUp, ChevronDown, Copy, Check,
  Users, Image as ImageIcon, MessageSquareText, Tag as TagIcon, CheckCircle2,
  ArrowUp, ArrowDown, ArrowUpDown, Link2, Search, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { TableCard, TableCardHeader, TableToolbar, TableFooter, FilterSelect, DateRangeFilter, IdTag, COL_SEP, FiltersDrawer, FilterDrawerField, ColumnsSheet, type ManagedColumn } from "@/components/table-kit"
import { WhatsAppMediaTable } from "@/components/whatsapp-media-page"
import { DEVELOPERS } from "@/lib/developers-mock"
import { toast } from "sonner"

// ─── Types + mock data ─────────────────────────────────────────────────────────

interface WaGroup {
  id: string            // short id, e.g. "191"
  jid: string           // WhatsApp JID
  name: string
  image: string
  /** null ⇒ the group is not linked to any developer yet. */
  developer: { name: string; id: string; logo: string } | null
  members: number
  classified: number
  totalMedia: number
  invitationLink: string | null
  status: "Active" | "Inactive"
  lastMessageSent: string
  lastMediaSent: string
  createdAt: string
  updatedAt: string
}

const img = (seed: string, bg: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=${bg}&fontColor=ffffff`

const WA_GROUPS: WaGroup[] = [
  { id: "191", jid: "201000107055-1484756396@g.us", name: "Nawy - Sodic", image: img("NS", "0f766e"), developer: { name: "SODIC", id: "8", logo: img("SO", "111111") }, members: 764, classified: 1550, totalMedia: 3922, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:21:00", lastMediaSent: "2026-07-05T22:21:00", createdAt: "2017-01-18T18:19:00", updatedAt: "2025-04-15T16:16:00" },
  { id: "204", jid: "120363315548230041@g.us", name: "Nawy - PRE", image: img("PRE", "334155"), developer: { name: "PRE Group", id: "111", logo: img("PR", "1e293b") }, members: 673, classified: 1205, totalMedia: 3611, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:21:00", lastMediaSent: "2026-07-05T22:09:00", createdAt: "2024-07-01T21:39:00", updatedAt: "2026-07-05T22:21:00" },
  { id: "301", jid: "201018721074-1615491012@g.us", name: "Nawy - IL CAZAR (Creek)", image: img("ILC", "b45309"), developer: { name: "IL Cazar Developments", id: "213", logo: img("IC", "7c2d12") }, members: 698, classified: 1219, totalMedia: 4522, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:20:00", lastMediaSent: "2026-07-05T21:57:00", createdAt: "2021-03-11T21:30:00", updatedAt: "2026-07-05T22:20:00" },
  { id: "318", jid: "120363025383115341@g.us", name: "Nawy-ERG_74375", image: img("ERG", "166534"), developer: { name: "Emaar Rezk Group Developments", id: "222", logo: img("ER", "064e3b") }, members: 377, classified: 417, totalMedia: 850, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:16:00", lastMediaSent: "2026-07-05T22:16:00", createdAt: "2022-06-09T14:13:00", updatedAt: "2026-07-05T22:16:00" },
  { id: "205", jid: "201224508357-1512394524@g.us", name: "Nawy - Dorra", image: img("DOR", "6d28d9"), developer: { name: "Dorra Group", id: "63", logo: img("DO", "4c1d95") }, members: 573, classified: 64, totalMedia: 572, invitationLink: null, status: "Inactive", lastMessageSent: "2026-07-05T22:15:00", lastMediaSent: "2026-07-05T22:15:00", createdAt: "2017-12-04T15:35:00", updatedAt: "2026-07-05T22:15:00" },
  { id: "266", jid: "201224508357-1516113957@g.us", name: "Nawy - M2 Developments", image: img("M2", "9333ea"), developer: { name: "M Squared", id: "66", logo: img("M2", "6b21a8") }, members: 606, classified: 1221, totalMedia: 3323, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:12:00", lastMediaSent: "2026-07-05T22:12:00", createdAt: "2018-01-16T16:45:00", updatedAt: "2026-07-05T22:12:00" },
  { id: "375", jid: "120363268011461750@g.us", name: "Nawy - Dal", image: img("DAL", "15803d"), developer: null, members: 409, classified: 130, totalMedia: 554, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:11:00", lastMediaSent: "2026-07-05T22:11:00", createdAt: "2024-03-20T17:37:00", updatedAt: "2026-07-05T22:11:00" },
  { id: "336", jid: "120363169719213706@g.us", name: "Nawy - Acasa Mia", image: img("ACM", "1f2937"), developer: null, members: 506, classified: 226, totalMedia: 887, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:06:00", lastMediaSent: "2026-07-05T22:06:00", createdAt: "2023-10-09T11:45:00", updatedAt: "2026-07-05T22:06:00" },
  { id: "115", jid: "120363247054255279@g.us", name: "Nawy - Hyde park", image: img("HP", "0369a1"), developer: { name: "Hyde Park", id: "15", logo: img("HP", "075985") }, members: 726, classified: 2620, totalMedia: 7922, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:04:00", lastMediaSent: "2026-07-05T22:04:00", createdAt: "2024-02-26T19:02:00", updatedAt: "2026-07-05T22:04:00" },
  { id: "164", jid: "201224508357-1623589047@g.us", name: "Nawy - Waterway", image: img("WW", "0e7490"), developer: { name: "The Waterway Developments", id: "64", logo: img("WW", "155e75") }, members: 633, classified: 544, totalMedia: 1794, invitationLink: null, status: "Active", lastMessageSent: "2026-07-05T22:02:00", lastMediaSent: "2026-07-05T22:02:00", createdAt: "2021-06-13T14:57:00", updatedAt: "2026-07-05T22:02:00" },
]

const DEVELOPER_OPTIONS = [...new Map(WA_GROUPS.filter((g) => g.developer).map((g) => [g.developer!.id, g.developer!])).values()]

// ── Column control config (actions column stays fixed) ──
const WAG_COLS: (ManagedColumn & { width: number })[] = [
  { id: "groupName", label: "Group Name", width: 280 },
  { id: "developer", label: "Developer", width: 260 },
  { id: "members", label: "Members #", width: 110 },
  { id: "classified", label: "Classified Media", width: 160 },
  { id: "invitationLink", label: "Invitation Link", width: 140 },
  { id: "lastMessageSent", label: "Last Message Sent", width: 190 },
  { id: "lastMediaSent", label: "Last Media Sent", width: 190 },
  { id: "createdAt", label: "Created At", width: 190 },
]

// ── Sorting (header click + multi-level from the Sort button) ──
type WagSortKey = "members" | "classified" | "lastMessageSent" | "lastMediaSent" | "createdAt"
const WAG_SORT_FIELDS: { key: WagSortKey; label: string }[] = [
  { key: "members", label: "Members" },
  { key: "classified", label: "Count of Media" },
  { key: "lastMessageSent", label: "Last Message Sent" },
  { key: "lastMediaSent", label: "Last Media Sent" },
  { key: "createdAt", label: "Created At" },
]
const WAG_COL_SORT: Partial<Record<string, WagSortKey>> = {
  members: "members", classified: "classified", lastMessageSent: "lastMessageSent", lastMediaSent: "lastMediaSent", createdAt: "createdAt",
}
function wagSortVal(g: WaGroup, key: WagSortKey): string | number {
  switch (key) {
    case "members": return g.members
    case "classified": return g.classified
    default: return g[key]
  }
}

// ─── Date formatting (UTC → stable across SSR/client) ──────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  const h = d.getUTCHours(); const ap = h < 12 ? "AM" : "PM"; const h12 = h % 12 || 12
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}, ${d.getUTCFullYear()}, ${String(h12).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`
}
function fmtLong(iso: string) {
  const d = new Date(iso)
  const h = d.getUTCHours(); const ap = h < 12 ? "am" : "pm"; const h12 = h % 12 || 12
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}  ${h12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-primary" title="Copy">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

/** Image + name + (id + copy) cell. */
function EntityCell({ image, name, id, rounded = "rounded-lg" }: { image: string; name: string; id: string; rounded?: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src={image} alt="" className={cn("h-9 w-9 shrink-0 border border-border object-cover", rounded)} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <IdTag value={id} />
      </div>
    </div>
  )
}

/** Searchable single-select to link a developer to an unlinked group. */
function LinkDeveloperButton({ onLink }: { onLink: (d: { name: string; id: string; logo: string }) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const opts = DEVELOPERS.filter((d) => `${d.name} ${d.id}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        title="Link developer"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Link2 className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-md">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search developers…" className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {opts.map((d) => (
              <button
                key={d.id}
                onClick={() => { onLink({ name: d.name, id: String(d.id), logo: d.logo }); setOpen(false); setQ("") }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.name}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">ID: {d.id}</span>
                </span>
                <span className={cn(
                  "flex-shrink-0 rounded-md border px-1.5 py-px text-[10px] font-medium",
                  d.listingStatus === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-500",
                )}>
                  {d.listingStatus}
                </span>
              </button>
            ))}
            {opts.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No developers found</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function WhatsAppGroupsPage() {
  const [rows, setRows] = useState<WaGroup[]>(WA_GROUPS)
  const [selected, setSelected] = useState<WaGroup | null>(null)
  const [q, setQ] = useState("")
  const [developerF, setDeveloperF] = useState("")
  const [statusF, setStatusF] = useState("") // Linked | Unlinked
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [mediaFrom, setMediaFrom] = useState("")
  const [mediaTo, setMediaTo] = useState("")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [sorts, setSorts] = useState<{ key: WagSortKey; dir: "asc" | "desc" }[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // All Filters drawer + Customize Columns (order / hide / freeze)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showColumnsSheet, setShowColumnsSheet] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(WAG_COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  const visibleCols = colOrder.filter((id) => !hiddenCols.has(id)).map((id) => WAG_COLS.find((c) => c.id === id)!).filter(Boolean)
  const frozenLeft = (colId: string) => {
    let left = 0
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }

  const activeFilterCount = [developerF, statusF].filter(Boolean).length + ((dateFrom || dateTo) ? 1 : 0) + ((mediaFrom || mediaTo) ? 1 : 0) + ((createdFrom || createdTo) ? 1 : 0)
  const clearAllFilters = () => {
    setQ(""); setDeveloperF(""); setStatusF(""); setDateFrom(""); setDateTo("")
    setMediaFrom(""); setMediaTo(""); setCreatedFrom(""); setCreatedTo(""); setPage(1)
  }

  const linkDeveloper = (groupId: string, dev: { name: string; id: string; logo: string }) => {
    setRows((rs) => rs.map((g) => (g.id === groupId ? { ...g, developer: dev } : g)))
    toast.success(`Group linked to ${dev.name}`)
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((g) => {
      if (needle && !`${g.name} ${g.jid} ${g.id}`.toLowerCase().includes(needle)) return false
      if (developerF && g.developer?.id !== developerF) return false
      if (statusF === "Linked" && !g.developer) return false
      if (statusF === "Unlinked" && g.developer) return false
      if (dateFrom && g.lastMessageSent < dateFrom) return false
      if (dateTo && g.lastMessageSent > dateTo + "T23:59:59") return false
      if (mediaFrom && g.lastMediaSent < mediaFrom) return false
      if (mediaTo && g.lastMediaSent > mediaTo) return false
      if (createdFrom && g.createdAt < createdFrom) return false
      if (createdTo && g.createdAt > createdTo) return false
      return true
    })
  }, [rows, q, developerF, statusF, dateFrom, dateTo, mediaFrom, mediaTo, createdFrom, createdTo])

  const sorted = useMemo(() => {
    if (!sorts.length) return filtered
    return [...filtered].sort((a, b) => {
      for (const s of sorts) {
        const av = wagSortVal(a, s.key), bv = wagSortVal(b, s.key)
        const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        if (c !== 0) return s.dir === "asc" ? c : -c
      }
      return 0
    })
  }, [filtered, sorts])

  const toggleHeaderSort = (key: WagSortKey) =>
    setSorts((prev) => (prev[0]?.key === key ? [{ key, dir: prev[0].dir === "asc" ? "desc" : "asc" }] : [{ key, dir: "asc" }]))
  const headerSort = (key: WagSortKey) => sorts.find((s) => s.key === key)

  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  if (selected) return <WhatsAppGroupDetails group={rows.find((g) => g.id === selected.id) ?? selected} onBack={() => setSelected(null)} />

  const cellContent = (colId: string, g: WaGroup): React.ReactNode => {
    switch (colId) {
      case "groupName": return <EntityCell image={g.image} name={g.name} id={g.jid} rounded="rounded-lg" />
      case "developer": return g.developer ? (
        <div className="flex items-center gap-3">
          <img src={g.developer.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
          <div className="min-w-0">
            <a href="#" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block w-fit truncate font-medium text-foreground hover:underline">{g.developer.name}</a>
            <IdTag value={g.developer.id} />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-red-200 bg-red-50 text-xs font-medium text-red-600">No Developer Linked</Badge>
          <LinkDeveloperButton onLink={(dev) => linkDeveloper(g.id, dev)} />
        </div>
      )
      case "members": return <span className="tabular-nums">{g.members}</span>
      case "classified": return <><span className="font-semibold text-primary">{g.classified.toLocaleString()}</span> <span className="text-muted-foreground">/ {g.totalMedia.toLocaleString()}</span></>
      case "invitationLink": return <span className="text-muted-foreground">{g.invitationLink ?? "-"}</span>
      case "lastMessageSent": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(g.lastMessageSent)}</span>
      case "lastMediaSent": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(g.lastMediaSent)}</span>
      case "createdAt": return <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(g.createdAt)}</span>
      default: return null
    }
  }

  const renderTh = (c: (typeof WAG_COLS)[number]) => {
    const k = WAG_COL_SORT[c.id]
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
  const colCount = visibleCols.length + 1

  const filterControls = (
    <>
      <FilterSelect label="Developer" value={developerF} options={DEVELOPER_OPTIONS.map((d) => ({ value: d.id, label: d.name, sublabel: `ID: ${d.id}` }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-44" />
      <FilterSelect label="Status" value={statusF} options={["Linked", "Unlinked"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-36" />
      <DateRangeFilter label="Last message" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} />
      <DateRangeFilter withTime label="Last media sent" dateFrom={mediaFrom} dateTo={mediaTo} onChangeFrom={(v) => { setMediaFrom(v); setPage(1) }} onChangeTo={(v) => { setMediaTo(v); setPage(1) }} />
      <DateRangeFilter withTime label="Created at" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} />
    </>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp groups</h1>
          <p className="text-sm text-muted-foreground">All developer WhatsApp groups synced to IMS</p>
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Chat name or ID"
          activeFilters={activeFilterCount}
          hideAdvanced
          hideGroup
          onAllFilters={() => setShowAllFilters(true)}
          onColumns={() => setShowColumnsSheet(true)}
          sortControl={<WagSortControl sorts={sorts} setSorts={setSorts} />}
          filters={filterControls}
        />

        <TableCard>
          <TableCardHeader title="WhatsApp groups" count={sorted.length} />
          <div className="overflow-x-auto">
            <table className={cn("w-max text-sm", COL_SEP)}>
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  {visibleCols.map(renderTh)}
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((g) => (
                  <tr key={g.id} onClick={() => setSelected(g)} className="group cursor-pointer transition-colors hover:bg-muted/40">
                    {visibleCols.map((c) => (
                      <td
                        key={c.id}
                        className={cn("px-4 py-3", frozenCols.has(c.id) && "sticky z-10 bg-card")}
                        style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                      >
                        {cellContent(c.id, g)}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(g) }} title="View group" className="flex h-full w-12 items-center justify-center text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && <tr><td colSpan={colCount} className="px-5 py-16 text-center text-sm text-muted-foreground">No groups match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <TableFooter page={page} pageSize={pageSize} total={sorted.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="results" />
        </TableCard>

        {/* All Filters drawer — same filters, order and state as the toolbar */}
        <FiltersDrawer open={showAllFilters} onClose={() => setShowAllFilters(false)} activeCount={activeFilterCount} onClear={clearAllFilters}>
          <FilterDrawerField label="Developer">
            <FilterSelect label="Developer" value={developerF} options={DEVELOPER_OPTIONS.map((d) => ({ value: d.id, label: d.name, sublabel: `ID: ${d.id}` }))} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Status">
            <FilterSelect label="Status" value={statusF} options={["Linked", "Unlinked"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Last message">
            <DateRangeFilter label="Last message" dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={(v) => { setDateFrom(v); setPage(1) }} onChangeTo={(v) => { setDateTo(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Last media sent">
            <DateRangeFilter withTime label="Last media sent" dateFrom={mediaFrom} dateTo={mediaTo} onChangeFrom={(v) => { setMediaFrom(v); setPage(1) }} onChangeTo={(v) => { setMediaTo(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
          <FilterDrawerField label="Created at">
            <DateRangeFilter withTime label="Created at" dateFrom={createdFrom} dateTo={createdTo} onChangeFrom={(v) => { setCreatedFrom(v); setPage(1) }} onChangeTo={(v) => { setCreatedTo(v); setPage(1) }} className="w-full" />
          </FilterDrawerField>
        </FiltersDrawer>

        {/* Customize Columns — order / visibility / freeze */}
        <ColumnsSheet
          open={showColumnsSheet}
          onClose={() => setShowColumnsSheet(false)}
          columns={WAG_COLS}
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

function WagSortControl({ sorts, setSorts }: { sorts: { key: WagSortKey; dir: "asc" | "desc" }[]; setSorts: React.Dispatch<React.SetStateAction<{ key: WagSortKey; dir: "asc" | "desc" }[]>> }) {
  const used = new Set(sorts.map((s) => s.key))
  const available = WAG_SORT_FIELDS.filter((f) => !used.has(f.key))
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
            <span className="flex-1 text-sm">{WAG_SORT_FIELDS.find((f) => f.key === s.key)?.label}</span>
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

// ─── Group details ─────────────────────────────────────────────────────────────

function WhatsAppGroupDetails({ group, onBack }: { group: WaGroup; onBack: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const [developer, setDeveloper] = useState(group.developer?.id ?? "")

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
          <ChevronRight className="h-3 w-3" />
          <span>Whatsapp</span>
          <ChevronRight className="h-3 w-3" />
          <button onClick={onBack} className="hover:text-foreground hover:underline">WhatsApp Groups</button>
        </div>

        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"><ArrowLeft className="h-4 w-4" />{group.name}</button>

        {/* Header card */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-4">
              <img src={group.image} alt="" className="h-12 w-12 rounded-full border border-border object-cover" />
              <div>
                <h1 className="text-lg font-bold text-foreground">{group.name}</h1>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">ID: {group.id} <CopyBtn text={group.id} /></div>
              </div>
            </div>
            <button onClick={() => setCollapsed((c) => !c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted">{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
          </div>
          {!collapsed && (
            <div className="grid grid-cols-1 gap-6 border-t border-border px-6 py-5 md:grid-cols-4">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Developer</p>
                <div className="flex items-center gap-2">
                  <Select value={developer || undefined} onValueChange={setDeveloper}>
                    <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Select developer…" /></SelectTrigger>
                    <SelectContent>{DEVELOPER_OPTIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" className="h-9">Update</Button>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Group link</p>
                <div className="flex items-center gap-1 text-sm">{group.invitationLink ?? <span className="text-muted-foreground">missing link</span>} <CopyBtn text={group.invitationLink ?? ""} /></div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Group members</p>
                <p className="text-sm font-medium text-foreground">{group.members}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Created at / Last update</p>
                <p className="text-sm text-foreground">{fmtLong(group.createdAt)}</p>
                <p className="text-sm text-foreground">{fmtLong(group.updatedAt)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="media" className="space-y-4">
          <TabsList className="bg-card">
            <TabsTrigger value="media" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Media</TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5"><MessageSquareText className="h-3.5 w-3.5" />Group summary</TabsTrigger>
          </TabsList>
          <TabsContent value="media"><WhatsAppMediaTable hideDeveloperFilter /></TabsContent>
          <TabsContent value="summary"><GroupSummaryTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Group summary tab ─────────────────────────────────────────────────────────

interface DailySummary {
  id: string
  tag: string
  date: string
  processed: boolean
  messages: number
  summary: string
  updatedAt: string
  inquiries: { id: string; text: string; status: "Open" | "Resolved" }[]
}

const SUMMARIES: DailySummary[] = [
  {
    id: "s1", tag: "unit offer", date: "Saturday - 04 July 2026", processed: true, messages: 10,
    summary: "The conversation included several inquiries about offers and availability for real estate units. There were requests for offers on two-bedroom units in prime locations with a delivery timeline of two years, as well as inquiries about three-bedroom units. Specific offers for two-bedroom lofts and three-bedroom units with a delivery of five months were also mentioned. Additionally, there were requests for updates on availability at Sodic East and offers for two and three-bedroom units in that area. No inquiries were resolved during the conversation.",
    updatedAt: "05 Jul 2026, 12:30 AM",
    inquiries: [
      { id: "i1", text: "Need offer 2bed prime location f june", status: "Open" },
      { id: "i2", text: "Any 3bed available delivery 5 months?", status: "Open" },
      { id: "i3", text: "Update on Sodic East availability", status: "Open" },
    ],
  },
  {
    id: "s2", tag: "unit offer", date: "Friday - 03 July 2026", processed: true, messages: 6,
    summary: "The conversation included several inquiries regarding offers and availability of real estate units. There were requests for offers on two-bedroom units with a delivery timeframe of five months, and questions about resale options in the compound. Two inquiries were resolved with shared payment plans.",
    updatedAt: "04 Jul 2026, 01:10 AM",
    inquiries: [
      { id: "i4", text: "Resale options in the compound?", status: "Resolved" },
      { id: "i5", text: "Payment plan for 2bed?", status: "Resolved" },
    ],
  },
  {
    id: "s3", tag: "general", date: "Thursday - 02 July 2026", processed: true, messages: 4,
    summary: "General discussion about delivery timelines and finishing options. No unit offers were requested.",
    updatedAt: "03 Jul 2026, 11:45 PM",
    inquiries: [{ id: "i6", text: "Finishing options for villas?", status: "Open" }],
  },
]

function GroupSummaryTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [tag, setTag] = useState("")
  const tags = [...new Set(SUMMARIES.map((s) => s.tag))]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <DateRangeFilter label="Date range" dateFrom={from} dateTo={to} onChangeFrom={setFrom} onChangeTo={setTo} />
        <FilterSelect label="Tags" value={tag} options={tags} onChange={setTag} className="w-44" />
        <button onClick={() => { setFrom(""); setTo(""); setTag("") }} className="ml-auto text-sm font-medium text-primary hover:underline">Clear filter</button>
      </div>

      <TableCard>
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Group summary</h2>
          <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs font-semibold text-primary">10 days</span>
        </div>
        <div className="space-y-4 p-5">
          {SUMMARIES.filter((s) => !tag || s.tag === tag).map((s) => <SummaryCard key={s.id} s={s} />)}
        </div>
      </TableCard>
    </div>
  )
}

function SummaryCard({ s }: { s: DailySummary }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative pl-6">
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
      <span className="absolute left-[5px] top-4 bottom-0 w-px bg-border" />
      <div className="rounded-xl border border-border p-4">
        <Badge variant="outline" className="border-border text-xs font-medium">{s.tag}</Badge>
        <p className="mt-2 text-sm font-semibold text-foreground">{s.date}</p>
        <div className="mt-2 flex items-center gap-2">
          {s.processed && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Processed</span>}
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{s.messages} messages</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{s.summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Updated at {s.updatedAt}</p>
        <button onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {open ? "Collapse message" : "Expand message"} {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {open && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-sm font-semibold">{s.tag}</p>
            {s.inquiries.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Inquiry #{i + 1}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", q.status === "Open" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{q.status}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{q.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

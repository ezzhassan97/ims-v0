"use client"

import { Fragment, useMemo, useState } from "react"
import {
  Search, SlidersHorizontal, ArrowUpDown, Columns3, Plus, Copy, Check, ChevronDown,
  ArrowRight, Home, ChevronRight, Pencil, ChevronUp, MoreHorizontal, MessageCircle,
  ChevronLeft, ChevronsLeft, ChevronsRight, Building2, FileText, Users, HelpCircle,
  Image as ImageIcon, Group as GroupIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { StoryBadge } from "@/components/all-properties-page"
import { TableCard, TableCardHeader, TableToolbar, TableFooter } from "@/components/table-kit"
import { DEVELOPERS, type Developer, type DevPriority, type DevListingStatus } from "@/lib/developers-mock"

const PRIORITIES: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]

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
function EntityCell({ image, name, idLabel, idValue, rounded = "rounded-lg" }: {
  image: string; name: string; idLabel: string; idValue: string; rounded?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <img src={image} alt="" className={cn("h-9 w-9 shrink-0 border border-border object-cover", rounded)} />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] text-muted-foreground">{idLabel}</span>
          <CopyBtn text={idValue} />
        </div>
      </div>
    </div>
  )
}

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50">
          {value === "all" ? label : value}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange("all")} className="text-sm">{label}</DropdownMenuItem>
        {options.map((o) => <DropdownMenuItem key={o} onClick={() => onChange(o)} className="text-sm">{o}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type GroupByKey = "none" | "priority" | "listingStatus"
const GROUP_BY_LABEL: Record<GroupByKey, string> = { none: "Group by", priority: "Priority", listingStatus: "Listing Status" }

export function DevelopersPage() {
  const [rows, setRows] = useState<Developer[]>(DEVELOPERS)
  const [selected, setSelected] = useState<Developer | null>(null)
  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState("all")
  const [priorityF, setPriorityF] = useState("all")
  const [orgF, setOrgF] = useState("all")
  const [groupBy, setGroupBy] = useState<GroupByKey>("none")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((d) => {
      if (needle && !`${d.name} ${d.id}`.toLowerCase().includes(needle)) return false
      if (statusF !== "all" && d.listingStatus !== statusF) return false
      if (priorityF !== "all" && d.priority !== priorityF) return false
      if (orgF !== "all" && !d.organizations.includes(orgF as never)) return false
      return true
    })
  }, [rows, q, statusF, priorityF, orgF])

  const groups = useMemo(() => {
    if (groupBy === "none") return null
    const order = groupBy === "priority" ? ["Highest", "High", "Medium", "Low", "Lowest"] : ["Active", "Hidden"]
    const map = new Map<string, Developer[]>()
    for (const d of filtered) {
      const k = String(groupBy === "priority" ? d.priority : d.listingStatus)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(d)
    }
    return order.filter((o) => map.has(o)).map((o) => ({ label: o, rows: map.get(o)! }))
  }, [filtered, groupBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const update = (id: number, patch: Partial<Developer>) =>
    setRows((rs) => rs.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  if (selected) {
    const live = rows.find((d) => d.id === selected.id) ?? selected
    return <DeveloperDetails developer={live} onBack={() => setSelected(null)} />
  }

  const renderRow = (d: Developer) => (
    <tr key={d.id} onClick={() => setSelected(d)} className="group cursor-pointer transition-colors hover:bg-muted/40">
      <td className="py-3 pl-5 pr-4">
        <EntityCell image={d.logo} name={d.name} idLabel={`ID# ${d.id}`} idValue={String(d.id)} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StoryBadge value={d.priority} options={PRIORITIES} onChange={(v) => update(d.id, { priority: v as DevPriority })} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StoryBadge value={d.listingStatus} options={["Active", "Hidden"]} onChange={(v) => update(d.id, { listingStatus: v as DevListingStatus })} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {d.organizations.map((o) => <Badge key={o} variant="outline" className="border text-xs font-medium">{o}</Badge>)}
        </div>
      </td>
      <td className="px-4 py-3">
        {d.whatsappGroup ? (
          <EntityCell image={d.whatsappGroup.image} name={d.whatsappGroup.name} idLabel={d.whatsappGroup.id} idValue={d.whatsappGroup.id} rounded="rounded-full" />
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
          filters={
            <>
              <FilterDropdown label="All Status" value={statusF} options={["Active", "Hidden"]} onChange={(v) => { setStatusF(v); setPage(1) }} />
              <FilterDropdown label="All Priority" value={priorityF} options={PRIORITIES} onChange={(v) => { setPriorityF(v); setPage(1) }} />
              <FilterDropdown label="All Organizations" value={orgF} options={["Nawy", "Partners"]} onChange={(v) => { setOrgF(v); setPage(1) }} />
            </>
          }
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
          <TableCardHeader title="Developers" count={filtered.length} cta={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add developer</Button>} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th className="pl-5">Developer Name</Th>
                  <Th>Priority</Th>
                  <Th>Listing Status</Th>
                  <Th>Organization</Th>
                  <Th>WhatsApp Group</Th>
                  <Th>Projects</Th>
                  <Th>Phases</Th>
                  <Th>Created At</Th>
                  <Th>Last Updated</Th>
                  <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups ? (
                  groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="bg-muted/40">
                        <td colSpan={10} className="px-5 py-2">
                          <div className="flex items-center gap-2">
                            <StoryBadge value={g.label} />
                            <span className="text-xs text-muted-foreground">{g.rows.length} developer{g.rows.length !== 1 ? "s" : ""}</span>
                          </div>
                        </td>
                      </tr>
                      {g.rows.map(renderRow)}
                    </Fragment>
                  ))
                ) : (
                  pageRows.map(renderRow)
                )}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-5 py-16 text-center text-sm text-muted-foreground">No developers match your filters.</td></tr>
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
      </div>
    </div>
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
  { value: "projects", label: "Projects", icon: Building2 },
  { value: "seo", label: "SEO", icon: FileText },
  { value: "contacts", label: "Contacts", icon: Users },
  { value: "faqs", label: "FAQs", icon: HelpCircle },
  { value: "whatsapp-media", label: "WhatsApp Media", icon: ImageIcon },
]

function DeveloperDetails({ developer, onBack }: { developer: Developer; onBack: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={onBack} className="hover:text-foreground hover:underline">Developers</button>
        </div>

        {/* Main container */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
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
            <div className="flex items-center gap-1">
              <IconBtn title="Edit"><Pencil className="h-4 w-4" /></IconBtn>
              <IconBtn title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</IconBtn>
              <IconBtn title="More"><MoreHorizontal className="h-4 w-4" /></IconBtn>
            </div>
          </div>

          {!collapsed && (
            <div className="space-y-5 border-t border-border px-6 py-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <Field label="Official Registered Name" value={developer.officialName} />
                <Field label="Name (EN)" value={developer.nameEn} />
                <Field label="Name (AR)" value={developer.nameAr} rtl />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
                  <div className="mt-1"><StoryBadge value={developer.priority} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {developer.organizations.map((o) => <Badge key={o} variant="outline" className="border text-xs font-medium">{o}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Listing status</p>
                  <div className="mt-1"><StoryBadge value={developer.listingStatus} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nawy Eligible</p>
                  <Badge variant="outline" className={cn("mt-1 border text-xs font-medium", developer.nawyEligible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "text-muted-foreground")}>{developer.nawyEligible ? "Yes" : "No"}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="bg-card">
            {DETAIL_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="projects"><ProjectsTab developer={developer} /></TabsContent>
          <TabsContent value="seo"><SeoTab developer={developer} /></TabsContent>
          <TabsContent value="contacts"><ContactsTab /></TabsContent>
          <TabsContent value="faqs"><FaqsTab developer={developer} /></TabsContent>
          <TabsContent value="whatsapp-media"><WhatsAppMediaTab /></TabsContent>
        </Tabs>
      </div>
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
  return (
    <TabCard>
      <h3 className="mb-4 text-sm font-semibold">SEO Information</h3>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Description EN</p>
          <div className="min-h-[120px] rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">{developer.descriptionEn}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Words: {developer.descriptionEn.split(" ").length} · Characters: {developer.descriptionEn.length}</p>
        </div>
        <div>
          <p className="mb-1.5 text-right text-xs font-medium text-muted-foreground">Description AR</p>
          <div dir="rtl" className="min-h-[120px] rounded-lg border border-border bg-muted/20 px-3 py-2 text-right text-sm">{developer.descriptionAr}</div>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">عدد الكلمات: {developer.descriptionAr.split(" ").length}</p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Meta Title EN</p>
          <Input defaultValue={`${developer.name} — Projects & Properties`} className="h-9" />
        </div>
        <div>
          <p className="mb-1.5 text-right text-xs font-medium text-muted-foreground">Meta Title AR</p>
          <Input dir="rtl" defaultValue={`${developer.nameAr} — المشروعات والعقارات`} className="h-9 text-right" />
        </div>
      </div>
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

function FaqsTab({ developer }: { developer: Developer }) {
  const faqs = [
    { q: `Where are ${developer.name}'s projects located?`, a: "Across New Cairo, Sheikh Zayed, the North Coast, and 6th of October." },
    { q: "What payment plans are available?", a: "Flexible plans from 5% down payment and up to 12 years of installments, varying by project." },
    { q: "Is delivery on schedule?", a: "Projects follow the announced delivery timelines with periodic construction updates." },
  ]
  return (
    <TabCard>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">FAQs</h3>
        <span className="text-xs text-muted-foreground">({faqs.length})</span>
      </div>
      <div className="space-y-2.5">
        {faqs.map((f, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">{f.q}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </TabCard>
  )
}

function WhatsAppMediaTab() {
  const imgs = ["/aerial-view-masterplan-residential-development-blu.jpg", "/luxury-clubhouse-exterior.jpg", "/placeholder.jpg", "/placeholder-logo.png", "/placeholder-user.jpg", "/aerial-view-masterplan-residential-development-blu.jpg"]
  return (
    <TabCard>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">WhatsApp Media</h3>
        <span className="text-xs text-muted-foreground">({imgs.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {imgs.map((src, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <img src={src} alt="" className="aspect-video w-full object-cover" />
            <div className="px-2 py-1.5"><p className="truncate text-[11px] font-medium">Media {i + 1}</p><p className="text-[10px] text-muted-foreground">Sales Group</p></div>
          </div>
        ))}
      </div>
    </TabCard>
  )
}

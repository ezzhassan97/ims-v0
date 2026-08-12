"use client"

// Permissions & Roles — a purely VISUAL reference for the tech team: which team
// can see and do what across the IMS. No logic ships from here. The page list is
// derived from the sidebar's navItems at render time, so navbar changes (new
// pages, renamed pages, new subpages) reflect automatically; only the in-page
// structure that ISN'T in the navbar — page tabs, details pages and their tabs —
// is declared once in EXTENSIONS below.

import { useMemo, useState } from "react"
import {
  Crown, DatabaseZap, Handshake, FileSpreadsheet, Repeat, MonitorSmartphone,
  Search, ShieldCheck, FileBarChart, CornerDownRight, Unlock, LayoutGrid, ChevronDown, ChevronsUpDown, ChevronsDownUp, Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems, type NavItem } from "@/components/sidebar"

// ─── Access model ─────────────────────────────────────────────────────────────

type Level = "none" | "view" | "full"

const LEVELS: Level[] = ["full", "view", "none"]

const LEVEL_META: Record<Level, { label: string; tag: string; dot: string }> = {
  full: { label: "Full Access", tag: "border-emerald-200 bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  view: { label: "View Only", tag: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  none: { label: "No Access", tag: "border-red-200 bg-red-50 text-red-600", dot: "bg-red-300" },
}

/** Beyond the level, a rule can carry specific access types (e.g. "map" on projects-table). */
interface Rule { level: Level; note?: string; extras?: string[] }

/** Exported permission names are slug-level; the catalog also enumerates these mid levels. */
const EXPORT_LEVELS = ["view", "edit", "full-access"]

/** Specific access types per page/tab slug — exported as `${slug}-${extra}`. */
const EXTRA_PERMISSIONS: Record<string, string[]> = {
  "projects-table": ["map"],
}

interface Team {
  id: string
  name: string
  short: string
  blurb: string
  icon: React.ComponentType<{ className?: string }>
  /** Applied to everything without an override (tabs inherit their details page / page, pages inherit their parent). */
  default: Level
  overrides: Record<string, Rule>
}

/** Pages with no permissions at all — documentation/dev surfaces. */
const EXCLUDED_PAGES = new Set(["Permissions and Roles", "Testing Playground"])

// ─── In-page structure not present in the navbar ──────────────────────────────

interface DetailExt { label: string; tabs?: string[] }
interface TabExt { label: string; details?: DetailExt[] }
interface PageExt { tabs?: TabExt[]; details?: DetailExt[] }

/** The grouped-property drill-down is identical on every properties page. */
const GROUPED_DETAIL: DetailExt = {
  label: "Grouped Property Details",
  tabs: ["Additional Info", "Detailed Properties", "Payment Plans", "Floor Plans", "Gallery", "Attachments", "Price History", "Audit Logs"],
}
const PROPERTIES_PAGE_EXT: PageExt = {
  tabs: [
    { label: "Grouped Properties", details: [GROUPED_DETAIL] },
    { label: "Detailed Properties" },
  ],
}

/**
 * Keyed by the navbar page that hosts the structure. Tab overrides use scoped
 * keys — "«page» / «tab»" and "«details page» / «tab»" — so a tab named like a
 * navbar page never collides with it.
 */
const EXTENSIONS: Record<string, PageExt> = {
  Areas: { tabs: [{ label: "Hierarchy" }, { label: "SEO" }, { label: "FAQs" }] },
  "Nawy Space": { tabs: [{ label: "Images" }, { label: "Analysis" }] },
  Developers: { details: [{ label: "Developer Details", tabs: ["Main Info", "Metadata", "Projects", "Contacts", "SEO", "FAQs"] }] },
  "Whatsapp Groups": { details: [{ label: "WhatsApp Group Details", tabs: ["Group Summary", "Members", "Media"] }] },
  Launches: {
    details: [{
      label: "Launch Details",
      tabs: ["Main Info", "WhatsApp Messages", "Project Details", "Launch Details", "Launch Incentives", "Payment Plans", "Property Offerings", "Attachments", "Audit Logs"],
    }],
  },
  Projects: {
    details: [{
      label: "Project Details",
      tabs: [
        "Main Info", "Features", "Metadata", "SEO", "FAQs", "Launches", "Phases", "Project Gallery", "Payment Plans",
        "Render Images", "Floor Plans", "Properties", "Masterplans", "Masterplan Amenities", "Masterplan Buildings",
        "Construction Updates", "Ingestion Entries", "Attachments",
      ],
    }],
  },
  "All Properties": PROPERTIES_PAGE_EXT,
  "Launch Properties": PROPERTIES_PAGE_EXT,
  "Primary Properties": PROPERTIES_PAGE_EXT,
  "Resale Properties": PROPERTIES_PAGE_EXT,
  "Nawy Now Properties": PROPERTIES_PAGE_EXT,
  "Resale Marketplace": PROPERTIES_PAGE_EXT,
  "Rental Properties": PROPERTIES_PAGE_EXT,
  "Project Configurations": { tabs: [{ label: "Projects Classification" }, { label: "Projects Metadata" }] },
  "Developers Configurations": { tabs: [{ label: "Developers Classification" }, { label: "Developers Metadata" }] },
  "Automatic Sheets Entries": { details: [{ label: "Sheet Entry Details" }] },
  "Manual Grouped Entries": { details: [{ label: "Manual Entry Details" }] },
}

// ─── Teams ────────────────────────────────────────────────────────────────────

const TEAMS: Team[] = [
  {
    id: "admins", name: "Admins", short: "Admins",
    blurb: "Can view, edit and do everything — no constraints.",
    icon: Crown, default: "full", overrides: {},
  },
  {
    id: "unlocked-keys", name: "Unlocked Keys", short: "Unlocked",
    blurb: "Full access on Rental Properties only; the rest is view-only or fully off-limits.",
    icon: Unlock, default: "view",
    overrides: {
      Dashboards: { level: "none" },
      Whatsapp: { level: "none" },
      "Market Updates": { level: "none" },
      Launches: { level: "none" },
      Properties: { level: "none" },
      "Rental Properties": { level: "full", note: "Every action, incl. all tabs under it" },
      "Data Ingestion": { level: "none" },
      "Data Quality": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Data Collection": { level: "none" },
    },
  },
  {
    id: "data-ops", name: "Data Ops Managers", short: "Data Ops",
    blurb: "Like Admins — every action on everything, except WhatsApp configurations and groups.",
    icon: DatabaseZap, default: "full",
    overrides: {
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
      "Whatsapp Groups": { level: "view" },
    },
  },
  {
    id: "dev-relations", name: "Dev Relations", short: "Dev Rel",
    blurb: "Own developers, WhatsApp, launches and the projects table; content and inventory tabs read-only; run Data Collection.",
    icon: Handshake, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      Whatsapp: { level: "full", note: "Groups & media; configurations stay Admins-only" },
      Launches: { level: "full", note: "All launch tabs" },
      Developers: { level: "full", note: "Main page + details; SEO / FAQs tabs stay view-only" },
      "Developer Details / SEO": { level: "view", note: "SEO copy is owned by the SEO team" },
      "Developer Details / FAQs": { level: "view" },
      Projects: { level: "full", note: "Projects table + main info; content/inventory tabs stay view-only" },
      "Project Details / SEO": { level: "view" },
      "Project Details / FAQs": { level: "view" },
      "Project Details / Payment Plans": { level: "view" },
      "Project Details / Render Images": { level: "view" },
      "Project Details / Floor Plans": { level: "view" },
      "Project Details / Properties": { level: "view" },
      "Project Details / Masterplans": { level: "view" },
      "Project Details / Masterplan Amenities": { level: "view" },
      "Project Details / Masterplan Buildings": { level: "view" },
      "Project Details / Construction Updates": { level: "view" },
      "Project Details / Ingestion Entries": { level: "view" },
      "Data Collection": { level: "full", note: "Masterplan & brochure chasing with the developers" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
      "Data Ingestion": { level: "none" },
      "Data Quality": { level: "none" },
      "General Configurations": { level: "none" },
    },
  },
  {
    id: "primary-ingestion", name: "Primary Ingestion", short: "Primary Ing",
    blurb: "Run the primary pipeline — primary properties, sheets ingestion and data quality; plans & media tabs on projects.",
    icon: FileSpreadsheet, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      "Primary Properties": { level: "full" },
      "Data Ingestion": { level: "full", note: "Automatic sheets + manual entries" },
      "Data Quality": { level: "full" },
      "Quality Configurations": { level: "view" },
      "Project Details / Payment Plans": { level: "full" },
      "Project Details / Render Images": { level: "full" },
      "Project Details / Floor Plans": { level: "full" },
      "Project Details / Properties": { level: "full" },
      "Project Details / Ingestion Entries": { level: "full" },
      "Floor Plans": { level: "full", note: "Projects Attachments" },
      "Render Images": { level: "full" },
      "Payment Plans": { level: "full" },
      Brochures: { level: "full" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
    },
  },
  {
    id: "resale-nawynow", name: "Resale & Nawy Now Ingestion", short: "Resale/NN",
    blurb: "Full control of the Resale Properties page; no other properties pages.",
    icon: Repeat, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      Properties: { level: "none" },
      "Resale Properties": { level: "full" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
    },
  },
  {
    id: "erealty-ingestion", name: "E-realty Ingestion", short: "E-realty",
    blurb: "Own the masterplan surfaces and data issues; map access on the projects table.",
    icon: MonitorSmartphone, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      Projects: { level: "view", extras: ["map"] },
      "Project Details / Masterplans": { level: "full" },
      "Project Details / Masterplan Amenities": { level: "full" },
      "Project Details / Masterplan Buildings": { level: "full" },
      "Areas / Hierarchy": { level: "full", note: "Area hierarchy tab" },
      Masterplans: { level: "full", note: "Projects Attachments" },
      "Masterplan Collection": { level: "full" },
      "Data Issues": { level: "full" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
    },
  },
  {
    id: "seo", name: "SEO", short: "SEO",
    blurb: "Own website copy — SEO descriptions, titles, FAQs and gallery content.",
    icon: Search, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
      "Project Details / SEO": { level: "full" },
      "Project Details / FAQs": { level: "full" },
      "Project Details / Project Gallery": { level: "view" },
      "Developer Details / SEO": { level: "full" },
      "Developer Details / FAQs": { level: "full" },
      "Areas / SEO": { level: "full", note: "Area SEO descriptions" },
      "Areas / FAQs": { level: "full" },
      "Grouped Property Details": { level: "view", note: "All property tabs are read-only" },
      "Data Collection": { level: "none" },
      "Data Ingestion": { level: "none" },
      "Data Quality": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "view" },
    },
  },
  {
    id: "data-quality", name: "Data Quality", short: "Data Qual",
    blurb: "Guard data integrity — validation rules, issues and checks across the system.",
    icon: ShieldCheck, default: "view",
    overrides: {
      Dashboards: { level: "full" },
      "Data Quality": { level: "full", note: "Rules & issue lifecycle" },
      Projects: { level: "view", note: "Data checks only" },
      "Audit Logs": { level: "view" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
      "General Configurations": { level: "view" },
    },
  },
  {
    id: "market-research", name: "Market Research", short: "Mkt Res",
    blurb: "Publish market intelligence and run launches; view-only elsewhere, no data pipelines.",
    icon: FileBarChart, default: "view",
    overrides: {
      "Market Updates": { level: "full", note: "Nawy Space, newsfeed, construction updates & reports" },
      Launches: { level: "full" },
      "Data Collection": { level: "none" },
      "Data Ingestion": { level: "none" },
      "Data Quality": { level: "none" },
      "Whatsapp Configurations": { level: "none", note: "Admins only" },
    },
  },
]

// ─── Page rows derived from the live navbar ───────────────────────────────────

interface PageRow {
  label: string
  icon?: React.ReactNode
  depth: number
  kind: "page" | "detail" | "tab"
  /** Export permission name base — e.g. "projects-table", "projects-details-main". */
  slug: string
  /** Navbar group container (has child pages) — carries no permission of its own; shows child counts. */
  group?: boolean
  /** Chain used for permission resolution: own key first, then ancestors. */
  chain: string[]
  /** Unique row id + structural parent — drives expand/collapse. */
  key: string
  parentKey?: string
}

const kebab = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "")
const tabSlug = (t: string) => (t === "Main Info" ? "main" : kebab(t))
/** Page slugs follow the export convention — the projects table page is "projects-table". */
const pageSlug = (label: string) => (label === "Projects" ? "projects-table" : kebab(label))

function buildRows(): PageRow[] {
  const rows: PageRow[] = []
  const push = (r: Omit<PageRow, "key">) => {
    rows.push({ ...r, key: r.chain.join("·") })
    return rows[rows.length - 1].key
  }

  const pushDetail = (d: DetailExt, parentChain: string[], depth: number, parentKey: string, hostPageLabel: string) => {
    const detailChain = [d.label, ...parentChain]
    const detailSlug = `${kebab(hostPageLabel)}-details`
    const k = push({ label: d.label, depth, kind: "detail", slug: detailSlug, chain: detailChain, parentKey })
    for (const tab of d.tabs ?? []) {
      push({ label: tab, depth: depth + 1, kind: "tab", slug: `${detailSlug}-${tabSlug(tab)}`, chain: [`${d.label} / ${tab}`, ...detailChain], parentKey: k })
    }
  }

  const pushExt = (pageLabel: string, parentChain: string[], depth: number, parentKey: string) => {
    const ext = EXTENSIONS[pageLabel]
    if (!ext) return
    const base = pageSlug(pageLabel)
    for (const tab of ext.tabs ?? []) {
      const tabChain = [`${pageLabel} / ${tab.label}`, ...parentChain]
      const k = push({ label: tab.label, depth, kind: "tab", slug: `${base}-${tabSlug(tab.label)}`, chain: tabChain, parentKey })
      for (const d of tab.details ?? []) pushDetail(d, tabChain, depth + 1, k, pageLabel)
    }
    for (const d of ext.details ?? []) pushDetail(d, parentChain, depth, parentKey, pageLabel)
  }

  for (const item of navItems as NavItem[]) {
    if (EXCLUDED_PAGES.has(item.label)) continue
    const group = (item.children?.length ?? 0) > 0
    const topKey = push({ label: item.label, icon: item.icon, depth: 0, kind: "page", slug: pageSlug(item.label), group, chain: [item.label] })
    pushExt(item.label, [item.label], 1, topKey)
    for (const child of item.children ?? []) {
      const childChain = [child.label, item.label]
      const childKey = push({ label: child.label, icon: child.icon, depth: 1, kind: "page", slug: pageSlug(child.label), chain: childChain, parentKey: topKey })
      pushExt(child.label, childChain, 2, childKey)
    }
  }
  return rows
}

function resolve(team: Team, row: PageRow): Rule {
  for (const key of row.chain) {
    const rule = team.overrides[key]
    if (rule) return rule
  }
  return { level: team.default }
}

// ─── UI bits ──────────────────────────────────────────────────────────────────

function LevelTag({ level }: { level: Level }) {
  const m = LEVEL_META[level]
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", m.tag)}>{m.label}</span>
}

/** JSON / CSV download pair — used at the page top and above each table. */
function ExportButtons({ onExport }: { onExport: (fmt: "json" | "csv") => void }) {
  return (
    <span className="flex items-center gap-1">
      {(["json", "csv"] as const).map((f) => (
        <button
          key={f} type="button" onClick={() => onExport(f)}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />{f.toUpperCase()}
        </button>
      ))}
    </span>
  )
}

/** Per-level counts of a group's descendant pages — rendered instead of a single tag. */
function GroupCountTags({ c, compact }: { c: Record<Level, number>; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", compact ? "justify-center gap-1.5" : "flex-wrap justify-end gap-1")}>
      {LEVELS.map((l) => {
        const n = c[l]
        if (n === 0) return null
        return compact ? (
          <span key={l} title={`${n} ${LEVEL_META[l].label}`} className="inline-flex items-center gap-0.5 text-[9px] tabular-nums text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-sm", LEVEL_META[l].dot)} />{n}
          </span>
        ) : (
          <span key={l} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium", LEVEL_META[l].tag)}>
            {n} {LEVEL_META[l].label}
          </span>
        )
      })}
    </span>
  )
}

function LevelDot({ level, title }: { level: Level; title: string }) {
  return <span title={title} className={cn("inline-block h-2.5 w-2.5 rounded-sm", LEVEL_META[level].dot)} />
}

function RowLabel({ r, expandable, collapsed, onToggle }: { r: PageRow; expandable: boolean; collapsed: boolean; onToggle: () => void }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: r.depth * 16 }}>
      {expandable ? (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")} />
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}
      {r.kind !== "page"
        ? <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
        : r.icon && <span className="flex-shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{r.icon}</span>}
      <span className={cn("truncate whitespace-nowrap text-sm", r.depth === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>{r.label}</span>
      {r.kind === "detail" && <span className="inline-flex flex-shrink-0 items-center rounded border border-indigo-200 bg-indigo-50 px-1 py-0 text-[9px] font-medium leading-4 text-indigo-700">Details page</span>}
      {r.kind === "tab" && <span className="inline-flex flex-shrink-0 items-center rounded border border-border bg-muted px-1 py-0 text-[9px] font-medium leading-4 text-muted-foreground">Tab</span>}
    </span>
  )
}

export function PermissionsRolesPage() {
  const rows = useMemo(buildRows, [])
  // "all-teams" shows the matrix; a team id shows that team's breakdown
  const [teamId, setTeamId] = useState<string>("all-teams")
  const team = TEAMS.find((t) => t.id === teamId)

  const counts = (t: Team) => {
    const c: Record<Level, number> = { full: 0, view: 0, none: 0 }
    rows.forEach((r) => { if (!r.group) c[resolve(t, r).level]++ })
    return c
  }
  /** Level counts across a navbar group's descendant pages/tabs — groups have no permission of their own. */
  const groupCounts = (t: Team, g: PageRow) => {
    const c: Record<Level, number> = { full: 0, view: 0, none: 0 }
    rows.forEach((r) => { if (!r.group && r.key.endsWith(`·${g.key}`)) c[resolve(t, r).level]++ })
    return c
  }

  // ── Permission export — slug-level names, e.g. "projects-details-payment-plans-full-access" ──
  const exportRows = rows.filter((r) => !r.group)
  const download = (name: string, content: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement("a")
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }
  /** One export record: name, access_level (view / edit / all), kind, path and a human description. */
  const permRecord = (r: PageRow, suffix: string, specific: boolean) => {
    const where = r.kind === "page" ? `the ${r.label} page` : r.kind === "detail" ? `the ${r.label} drill-down` : `the ${r.label} tab`
    const ctx = r.chain.length > 1 ? ` (${r.chain.slice(1).reverse().join(" / ")})` : ""
    const access_level = specific || suffix === "full-access" ? "all" : suffix
    const description = specific
      ? `Specific "${suffix}" action on ${where}${ctx}`
      : access_level === "view" ? `View-only access to ${where}${ctx}`
      : access_level === "edit" ? `Edit access to ${where}${ctx}`
      : `Full access — all actions — on ${where}${ctx}`
    return {
      permission: `${r.slug}-${suffix}`,
      access_level,
      kind: specific ? "specific" : r.kind,
      path: r.chain.slice().reverse().join(" / "),
      description,
    }
  }
  /** Global catalog: every page/tab × every level, plus the specific access types. */
  const catalogPerms = () => {
    const perms = exportRows.flatMap((r) => [
      ...EXPORT_LEVELS.map((l) => permRecord(r, l, false)),
      ...(EXTRA_PERMISSIONS[r.slug] ?? []).map((e) => permRecord(r, e, true)),
    ])
    return Array.from(new Map(perms.map((p) => [p.permission, p])).values())
  }
  /** A team's granted permissions (No Access rows are omitted) — full records. */
  const teamPermList = (t: Team) => exportRows.flatMap((r) => {
    const rule = resolve(t, r)
    const out: ReturnType<typeof permRecord>[] = []
    if (rule.level === "view") out.push(permRecord(r, "view", false))
    if (rule.level === "full") out.push(permRecord(r, "full-access", false))
    for (const e of t.overrides[r.chain[0]]?.extras ?? []) out.push(permRecord(r, e, true))
    return out
  })
  const csvCell = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  const CSV_HEAD = "permission,access_level,kind,path,description"
  const csvRow = (p: ReturnType<typeof permRecord>) => [p.permission, p.access_level, p.kind, p.path, p.description].map(csvCell).join(",")
  const exportCatalog = (fmt: "json" | "csv") => {
    const perms = catalogPerms()
    if (fmt === "json") download("ims-permissions-catalog.json", JSON.stringify({ count: perms.length, permissions: perms }, null, 2), "application/json")
    else download("ims-permissions-catalog.csv", [CSV_HEAD, ...perms.map(csvRow)].join("\n"), "text/csv")
  }
  const exportTeams = (ts: Team[], name: string, fmt: "json" | "csv") => {
    if (fmt === "json") {
      download(`${name}.json`, JSON.stringify(ts.map((t) => ({ team: t.name, permissions: teamPermList(t) })), null, 2), "application/json")
    } else {
      download(`${name}.csv`, [`team,${CSV_HEAD}`, ...ts.flatMap((t) => teamPermList(t).map((p) => `${csvCell(t.name)},${csvRow(p)}`))].join("\n"), "text/csv")
    }
  }

  // Expand/collapse — shared between the matrix and the team panel
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows])
  const parentKeys = useMemo(() => new Set(rows.map((r) => r.parentKey).filter(Boolean) as string[]), [rows])
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())
  const toggleKey = (k: string) => setCollapsedKeys((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  const isVisible = (r: PageRow) => {
    let p = r.parentKey
    while (p) {
      if (collapsedKeys.has(p)) return false
      p = byKey.get(p)?.parentKey
    }
    return true
  }
  const visibleRows = rows.filter(isVisible)
  const expandCollapseAll = (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setCollapsedKeys(new Set())} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <ChevronsUpDown className="h-3.5 w-3.5" />Expand all
      </button>
      <button type="button" onClick={() => setCollapsedKeys(new Set(parentKeys))} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <ChevronsDownUp className="h-3.5 w-3.5" />Collapse all
      </button>
    </div>
  )

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions and Roles</h1>
          <p className="text-sm text-muted-foreground">
            Which team can see and do what across the IMS — a visual reference for the tech team. Pages, subpages, in-page tabs and details pages mirror the navbar automatically.
          </p>
        </div>
        {/* Legend + global permission-catalog export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {LEVELS.map((l) => <LevelTag key={l} level={l} />)}
          </div>
          <span className="h-4 w-px bg-border" />
          <span className="text-[11px] text-muted-foreground">Export all permissions</span>
          <ExportButtons onExport={exportCatalog} />
        </div>
      </div>

      {/* Team cards — click one to inspect it below */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <button
          type="button" onClick={() => setTeamId("all-teams")}
          className={cn(
            "flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors",
            teamId === "all-teams" ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", teamId === "all-teams" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <LayoutGrid className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-sm font-semibold leading-tight text-foreground">All Teams</span>
          </div>
          <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">Every team side by side — the full access matrix across all pages and tabs.</p>
          <div className="mt-auto text-[10px] tabular-nums text-muted-foreground">{TEAMS.length} teams · {rows.length} pages & tabs</div>
        </button>
        {TEAMS.map((t) => {
          const c = counts(t)
          const Icon = t.icon
          const selected = t.id === teamId
          return (
            <button
              key={t.id} type="button" onClick={() => setTeamId(t.id)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors",
                selected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-sm font-semibold leading-tight text-foreground">{t.name}</span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{t.blurb}</p>
              <div className="mt-auto flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
                {LEVELS.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-sm", LEVEL_META[l].dot)} />{c[l]}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* All teams at a glance — every team × every page/tab */}
      {teamId === "all-teams" && <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">All Teams</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{rows.length} pages & tabs</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Click a team column — or a card above — to inspect it</span>
          <ExportButtons onExport={(f) => exportTeams(TEAMS, "ims-team-permissions", f)} />
          {expandCollapseAll}
        </div>
        <div className="overflow-x-auto">
          <table className="w-max min-w-full text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border/70 bg-muted">
                <th className="sticky left-0 z-10 bg-muted px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Page</th>
                {TEAMS.map((t) => (
                  <th key={t.id} className="px-2 py-2 text-center">
                    <button
                      type="button" onClick={() => setTeamId(t.id)}
                      className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", t.id === teamId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                    >
                      {t.short}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visibleRows.map((r) => (
                <tr key={r.key} className={cn(r.depth === 0 && "bg-muted/20")}>
                  <td className="sticky left-0 z-10 bg-card px-4 py-1.5">
                    <RowLabel r={r} expandable={parentKeys.has(r.key)} collapsed={collapsedKeys.has(r.key)} onToggle={() => toggleKey(r.key)} />
                  </td>
                  {TEAMS.map((t) => {
                    if (r.group) {
                      return (
                        <td key={t.id} className="px-2 py-1.5 text-center">
                          <GroupCountTags c={groupCounts(t, r)} compact />
                        </td>
                      )
                    }
                    const rule = resolve(t, r)
                    return (
                      <td key={t.id} className="px-2 py-1.5 text-center">
                        <LevelDot level={rule.level} title={`${t.name} — ${LEVEL_META[rule.level].label}${rule.note ? ` · ${rule.note}` : ""}`} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Selected team — permissions per page/tab, with scope notes */}
      {team && <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <team.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{team.name}</h3>
            <p className="text-xs text-muted-foreground">{team.blurb}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {LEVELS.map((l) => {
              const n = counts(team)[l]
              return n > 0 ? (
                <span key={l} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", LEVEL_META[l].tag)}>
                  {n} {LEVEL_META[l].label}
                </span>
              ) : null
            })}
          </div>
          <ExportButtons onExport={(f) => exportTeams([team], `${kebab(team.name)}-permissions`, f)} />
          {expandCollapseAll}
        </div>
        <div className="divide-y divide-border/60">
          {visibleRows.map((r) => {
            if (r.group) {
              return (
                <div key={r.key} className={cn("flex items-center gap-3 px-4 py-2", r.depth === 0 && "bg-muted/20")}>
                  <div className="min-w-0 flex-1">
                    <RowLabel r={r} expandable={parentKeys.has(r.key)} collapsed={collapsedKeys.has(r.key)} onToggle={() => toggleKey(r.key)} />
                  </div>
                  <GroupCountTags c={groupCounts(team, r)} />
                </div>
              )
            }
            const rule = resolve(team, r)
            const extras = team.overrides[r.chain[0]]?.extras ?? []
            return (
              <div key={r.key} className={cn("flex items-center gap-3 px-4 py-2", r.depth === 0 && "bg-muted/20")}>
                <div className="min-w-0 flex-1">
                  <RowLabel r={r} expandable={parentKeys.has(r.key)} collapsed={collapsedKeys.has(r.key)} onToggle={() => toggleKey(r.key)} />
                </div>
                {rule.note && <span className="hidden max-w-xs truncate text-right text-[11px] text-muted-foreground sm:block" title={rule.note}>{rule.note}</span>}
                {extras.map((e) => (
                  <span key={e} className="inline-flex items-center whitespace-nowrap rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                    {r.slug}-{e}
                  </span>
                ))}
                <LevelTag level={rule.level} />
              </div>
            )
          })}
        </div>
      </div>}
    </div>
  )
}

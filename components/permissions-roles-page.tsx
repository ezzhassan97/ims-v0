"use client"

// Permissions & Roles — a purely VISUAL reference for the tech team: which team
// can see and do what across the IMS. No logic ships from here. The page list is
// derived from the sidebar's navItems at render time, so navbar changes (new
// pages, renamed pages, new subpages) reflect automatically; only the nested
// details pages and their tabs (not navbar entries) are declared in
// DETAIL_PAGES below.

import { useMemo, useState } from "react"
import {
  Crown, DatabaseZap, Handshake, FileSpreadsheet, Repeat, MonitorSmartphone,
  Search, ShieldCheck, FileBarChart, CornerDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems, type NavItem } from "@/components/sidebar"

// ─── Access model ─────────────────────────────────────────────────────────────

type Level = "none" | "view" | "edit" | "create" | "all"

const LEVELS: Level[] = ["all", "create", "edit", "view", "none"]

const LEVEL_META: Record<Level, { label: string; tag: string; dot: string }> = {
  all: { label: "All Actions", tag: "border-emerald-200 bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  create: { label: "Create", tag: "border-indigo-200 bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  edit: { label: "Edit", tag: "border-blue-200 bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  view: { label: "View Only", tag: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  none: { label: "No Access", tag: "border-red-200 bg-red-50 text-red-600", dot: "bg-red-300" },
}

interface Rule { level: Level; note?: string }

interface Team {
  id: string
  name: string
  short: string
  blurb: string
  icon: React.ComponentType<{ className?: string }>
  /** Applied to every page without an override (tabs inherit their details page, which inherits its parent page). */
  default: Level
  overrides: Record<string, Rule>
}

/** Pages with no permissions at all — documentation/dev surfaces. */
const EXCLUDED_PAGES = new Set(["Permissions and Roles", "Testing Playground"])

/**
 * Nested details pages (and their tabs) that aren't navbar entries — keyed by
 * the page that opens them. Tab overrides use the scoped key
 * "«details page» / «tab»", so a tab named like a navbar page never collides.
 */
const DETAIL_PAGES: Record<string, { label: string; tabs?: string[] }[]> = {
  Developers: [{ label: "Developer Details", tabs: ["Main Info", "Projects", "Contacts", "SEO", "FAQs"] }],
  "Whatsapp Groups": [{ label: "WhatsApp Group Details", tabs: ["Group Summary", "Members", "Media"] }],
  Launches: [{
    label: "Launch Details",
    tabs: ["WhatsApp Messages", "Project Details", "Launch Details", "Launch Incentives", "Payment Plans", "Property Offerings", "Attachments", "Audit Logs"],
  }],
  Projects: [{
    label: "Project Details",
    tabs: [
      "Main Info", "Features", "SEO", "FAQs", "Launches", "Phases", "Project Gallery", "Payment Plans",
      "Render Images", "Floor Plans", "Properties", "Masterplans", "Construction Updates", "Ingestion Entries", "Attachments",
    ],
  }],
  "All Properties": [{
    label: "Grouped Property Details",
    tabs: ["Additional Info", "Detailed Properties", "Payment Plans", "Floor Plans", "Gallery", "Attachments", "Price History", "Audit Logs"],
  }],
  "Automatic Sheets Entries": [{ label: "Sheet Entry Details" }],
  "Manual Grouped Entries": [{ label: "Manual Entry Details" }],
}

const TEAMS: Team[] = [
  {
    id: "admins", name: "Admins", short: "Admins",
    blurb: "Can view, edit and do everything — no constraints.",
    icon: Crown, default: "all", overrides: {},
  },
  {
    id: "data-ops", name: "Data Ops Managers", short: "Data Ops",
    blurb: "Own the inventory data end to end — every action on projects, properties, launches and ingestion.",
    icon: DatabaseZap, default: "create",
    overrides: {
      Projects: { level: "all", note: "All cascade actions — developer, area, organizations, statuses" },
      "Project Details": { level: "all" },
      Properties: { level: "all" },
      Launches: { level: "all", note: "Approve, ingest, activate and close launches" },
      "Launch Details": { level: "all" },
      "Data Ingestion": { level: "all" },
      "Data Validation": { level: "all" },
      "General Configurations": { level: "all" },
      "Audit Logs": { level: "view" },
    },
  },
  {
    id: "dev-relations", name: "Dev Relations", short: "Dev Rel",
    blurb: "Manage developers and their WhatsApp presence; review launches without touching ingestion.",
    icon: Handshake, default: "view",
    overrides: {
      Developers: { level: "create", note: "Create developers, set priorities, link WhatsApp groups" },
      "Developer Details": { level: "create" },
      "Developer Details / SEO": { level: "view", note: "SEO copy is owned by the SEO team" },
      "Developer Details / FAQs": { level: "view" },
      Whatsapp: { level: "create", note: "Create groups, manage contacts and media" },
      "Whatsapp Configurations": { level: "view" },
      "Market Updates": { level: "edit" },
      Launches: { level: "view", note: "Approve / Reject only — no ingestion or status changes" },
      "Launch Details": { level: "view", note: "Approve / Reject only" },
      "Data Ingestion": { level: "none" },
      "Data Validation": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
    },
  },
  {
    id: "primary-ingestion", name: "Primary Ingestion", short: "Primary Ing",
    blurb: "Run the primary pipeline — sheets, launches and project/phase setup.",
    icon: FileSpreadsheet, default: "view",
    overrides: {
      "Data Ingestion": { level: "create", note: "Automatic sheets pipeline" },
      "Manual Grouped Entries": { level: "view" },
      "Manual Entry Details": { level: "view" },
      Launches: { level: "create", note: "Ingest launches, link projects, change launch status" },
      "Launch Details": { level: "create" },
      Projects: { level: "create", note: "Create projects/phases, primary status actions" },
      "Project Details": { level: "create" },
      "Project Details / SEO": { level: "view", note: "SEO copy is owned by the SEO team" },
      "Project Details / FAQs": { level: "view" },
      "Projects Attachments": { level: "edit" },
      "Launch Properties": { level: "create" },
      "Primary Properties": { level: "create" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
    },
  },
  {
    id: "resale-nawynow", name: "Resale & Nawy Now Ingestion", short: "Resale/NN",
    blurb: "Ingest and maintain Resale, Nawy Now and Rental inventory.",
    icon: Repeat, default: "view",
    overrides: {
      "Resale Properties": { level: "create", note: "Incl. unit titles & descriptions" },
      "Nawy Now Properties": { level: "create" },
      "Resale Marketplace": { level: "create" },
      "Rental Properties": { level: "create" },
      "Grouped Property Details": { level: "edit", note: "Resale / Nawy Now / Rental groups only" },
      "Grouped Property Details / Detailed Properties": { level: "view", note: "Detailed units belong to E-realty" },
      "Manual Grouped Entries": { level: "create" },
      "Manual Entry Details": { level: "create" },
      Launches: { level: "none" },
      "Launch Details": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
    },
  },
  {
    id: "erealty-ingestion", name: "E-realty Ingestion", short: "E-realty",
    blurb: "Maintain detailed unit inventory published on E-realty.",
    icon: MonitorSmartphone, default: "view",
    overrides: {
      "All Properties": { level: "create", note: "Detailed properties on E-realty" },
      "Grouped Property Details": { level: "view" },
      "Grouped Property Details / Detailed Properties": { level: "create", note: "Add & edit detailed units" },
      "Grouped Property Details / Price History": { level: "edit" },
      "Sold Units": { level: "edit" },
      Launches: { level: "none" },
      "Launch Details": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
    },
  },
  {
    id: "seo", name: "SEO", short: "SEO",
    blurb: "Own website copy — SEO descriptions, titles, FAQs and gallery content.",
    icon: Search, default: "view",
    overrides: {
      "Project Details / SEO": { level: "edit" },
      "Project Details / FAQs": { level: "edit" },
      "Project Details / Project Gallery": { level: "edit" },
      "Developer Details / SEO": { level: "edit" },
      "Developer Details / FAQs": { level: "edit" },
      Areas: { level: "edit", note: "SEO descriptions only" },
      "Grouped Property Details / Additional Info": { level: "edit", note: "Titles & descriptions (Resale / Nawy Now / Rental)" },
      "Grouped Property Details / Gallery": { level: "edit" },
      "Data Ingestion": { level: "none" },
      "Data Validation": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
    },
  },
  {
    id: "data-quality", name: "Data Quality", short: "Data Qual",
    blurb: "Guard data integrity — validation rules, issues and checks across the system.",
    icon: ShieldCheck, default: "view",
    overrides: {
      "Data Validation": { level: "all", note: "Rules & issue lifecycle" },
      "Data Quality Analysis": { level: "all" },
      Projects: { level: "view", note: "Data checks only" },
      "Audit Logs": { level: "view" },
      "General Configurations": { level: "none" },
    },
  },
  {
    id: "market-research", name: "Market Research", short: "Mkt Res",
    blurb: "Publish market intelligence; read-only on the rest of the inventory.",
    icon: FileBarChart, default: "none",
    overrides: {
      "Market Updates": { level: "all", note: "Nawy Space, newsfeed, construction updates & reports" },
      Dashboards: { level: "view" },
      Areas: { level: "view" },
      Developers: { level: "view" },
      Projects: { level: "view" },
      Launches: { level: "view" },
      Properties: { level: "view" },
    },
  },
]

// ─── Page rows derived from the live navbar ───────────────────────────────────

interface PageRow {
  label: string
  icon?: React.ReactNode
  depth: number
  kind: "page" | "detail" | "tab"
  /** Chain used for permission resolution: own key first, then ancestors. */
  chain: string[]
}

function buildRows(): PageRow[] {
  const rows: PageRow[] = []
  const pushDetails = (parentChain: string[], depth: number) => {
    for (const d of DETAIL_PAGES[parentChain[0]] ?? []) {
      const detailChain = [d.label, ...parentChain]
      rows.push({ label: d.label, depth, kind: "detail", chain: detailChain })
      for (const tab of d.tabs ?? []) {
        // Scoped key so a tab named like a navbar page never collides with it
        rows.push({ label: tab, depth: depth + 1, kind: "tab", chain: [`${d.label} / ${tab}`, ...detailChain] })
      }
    }
  }
  for (const item of navItems as NavItem[]) {
    if (EXCLUDED_PAGES.has(item.label)) continue
    rows.push({ label: item.label, icon: item.icon, depth: 0, kind: "page", chain: [item.label] })
    pushDetails([item.label], 1)
    for (const child of item.children ?? []) {
      rows.push({ label: child.label, icon: child.icon, depth: 1, kind: "page", chain: [child.label, item.label] })
      pushDetails([child.label, item.label], 2)
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

function LevelDot({ level, title }: { level: Level; title: string }) {
  return <span title={title} className={cn("inline-block h-2.5 w-2.5 rounded-sm", LEVEL_META[level].dot)} />
}

function RowLabel({ r }: { r: PageRow }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: r.depth * 16 }}>
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
  const [teamId, setTeamId] = useState(TEAMS[0].id)
  const team = TEAMS.find((t) => t.id === teamId)!

  const counts = (t: Team) => {
    const c: Record<Level, number> = { all: 0, create: 0, edit: 0, view: 0, none: 0 }
    rows.forEach((r) => { c[resolve(t, r).level]++ })
    return c
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions and Roles</h1>
          <p className="text-sm text-muted-foreground">
            Which team can see and do what across the IMS — a visual reference for the tech team. Pages, subpages and details-page tabs mirror the navbar automatically.
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5">
          {LEVELS.map((l) => <LevelTag key={l} level={l} />)}
        </div>
      </div>

      {/* Team tabs — one panel per team, no endless scrolling */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {TEAMS.map((t) => {
          const Icon = t.icon
          const selected = t.id === teamId
          return (
            <button
              key={t.id} type="button" onClick={() => setTeamId(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />{t.name}
            </button>
          )
        })}
      </div>

      {/* Selected team — permissions per page/tab, with scope notes */}
      <div className="rounded-xl border border-border bg-card">
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
        </div>
        <div className="divide-y divide-border/60">
          {rows.map((r) => {
            const rule = resolve(team, r)
            return (
              <div key={r.chain.join("·")} className={cn("flex items-center gap-3 px-4 py-2", r.depth === 0 && "bg-muted/20")}>
                <div className="min-w-0 flex-1"><RowLabel r={r} /></div>
                {rule.note && <span className="hidden max-w-xs truncate text-right text-[11px] text-muted-foreground sm:block" title={rule.note}>{rule.note}</span>}
                <LevelTag level={rule.level} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Access matrix — every team × every page at a glance */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Access Matrix</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{rows.length} pages & tabs</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Click a team column to open its tab above</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">Page</th>
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
              {rows.map((r) => (
                <tr key={r.chain.join("·")} className={cn(r.depth === 0 && "bg-muted/20")}>
                  <td className="sticky left-0 z-10 bg-card px-4 py-1.5"><RowLabel r={r} /></td>
                  {TEAMS.map((t) => {
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
      </div>
    </div>
  )
}

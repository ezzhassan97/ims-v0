"use client"

// Permissions & Roles — a purely VISUAL reference for the tech team: which team
// can see and do what across the IMS. No logic ships from here. The page list is
// derived from the sidebar's navItems at render time, so navbar changes (new
// pages, renamed pages, new subpages) reflect automatically; only the nested
// details pages (not in the navbar) are declared in DETAIL_PAGES below.

import { useMemo, useState } from "react"
import {
  Crown, DatabaseZap, Handshake, FileSpreadsheet, Repeat, MonitorSmartphone,
  Search, ShieldCheck, FileBarChart, CornerDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navItems, type NavItem } from "@/components/sidebar"

// ─── Access model ─────────────────────────────────────────────────────────────

type Level = "full" | "edit" | "view" | "none"

const LEVEL_META: Record<Level, { label: string; tag: string; dot: string }> = {
  full: { label: "Full Access", tag: "border-emerald-200 bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  edit: { label: "View & Edit", tag: "border-blue-200 bg-blue-100 text-blue-700", dot: "bg-blue-500" },
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
  /** Applied to every page without an override (children inherit their parent's override first). */
  default: Level
  overrides: Record<string, Rule>
}

/** Nested details pages that aren't navbar entries — keyed by the page that opens them. */
const DETAIL_PAGES: Record<string, string[]> = {
  Developers: ["Developer Details"],
  "Whatsapp Groups": ["WhatsApp Group Details"],
  Launches: ["Launch Details"],
  Projects: ["Project Details"],
  "All Properties": ["Grouped Property Details"],
  "Automatic Sheets Entries": ["Sheet Entry Details"],
  "Manual Grouped Entries": ["Manual Entry Details"],
}

const TEAMS: Team[] = [
  {
    id: "admins", name: "Admins", short: "Admins",
    blurb: "Can view, edit and do everything — no constraints.",
    icon: Crown, default: "full", overrides: {},
  },
  {
    id: "data-ops", name: "Data Ops Managers", short: "Data Ops",
    blurb: "Own the inventory data end to end — full control of projects, properties, launches and ingestion.",
    icon: DatabaseZap, default: "edit",
    overrides: {
      Projects: { level: "full", note: "All cascade actions — developer, area, organizations, statuses" },
      "Project Details": { level: "full" },
      Properties: { level: "full" },
      Launches: { level: "full", note: "Approve, ingest, activate and close launches" },
      "Launch Details": { level: "full" },
      "Data Ingestion": { level: "full" },
      "Data Validation": { level: "full" },
      "General Configurations": { level: "full" },
      "Audit Logs": { level: "view" },
      "Testing Playground": { level: "none" },
      "Permissions and Roles": { level: "view" },
    },
  },
  {
    id: "dev-relations", name: "Dev Relations", short: "Dev Rel",
    blurb: "Manage developers and their WhatsApp presence; review launches without touching ingestion.",
    icon: Handshake, default: "view",
    overrides: {
      Developers: { level: "edit", note: "Create/edit developers, priorities, link WhatsApp groups" },
      "Developer Details": { level: "edit" },
      Whatsapp: { level: "edit", note: "Groups, contacts and media" },
      "Whatsapp Configurations": { level: "view" },
      "Market Updates": { level: "edit" },
      Launches: { level: "view", note: "Approve / Reject only — no ingestion or status changes" },
      "Launch Details": { level: "view", note: "Approve / Reject only" },
      "Data Ingestion": { level: "none" },
      "Data Validation": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "primary-ingestion", name: "Primary Ingestion", short: "Primary Ing",
    blurb: "Run the primary pipeline — sheets, launches and project/phase setup.",
    icon: FileSpreadsheet, default: "view",
    overrides: {
      "Data Ingestion": { level: "edit", note: "Automatic sheets pipeline" },
      "Manual Grouped Entries": { level: "view" },
      "Manual Entry Details": { level: "view" },
      Launches: { level: "edit", note: "Ingest launches, link projects, change launch status" },
      "Launch Details": { level: "edit" },
      Projects: { level: "edit", note: "Create projects/phases, primary status actions" },
      "Project Details": { level: "edit" },
      "Projects Attachments": { level: "edit" },
      "Launch Properties": { level: "edit" },
      "Primary Properties": { level: "edit" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "resale-nawynow", name: "Resale & Nawy Now Ingestion", short: "Resale/NN",
    blurb: "Ingest and maintain Resale, Nawy Now and Rental inventory.",
    icon: Repeat, default: "view",
    overrides: {
      "Resale Properties": { level: "edit", note: "Incl. unit titles & descriptions" },
      "Nawy Now Properties": { level: "edit" },
      "Resale Marketplace": { level: "edit" },
      "Rental Properties": { level: "edit" },
      "Grouped Property Details": { level: "edit", note: "Resale / Nawy Now / Rental groups only" },
      "Manual Grouped Entries": { level: "edit" },
      "Manual Entry Details": { level: "edit" },
      Launches: { level: "none" },
      "Launch Details": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "erealty-ingestion", name: "E-realty Ingestion", short: "E-realty",
    blurb: "Maintain detailed unit inventory published on E-realty.",
    icon: MonitorSmartphone, default: "view",
    overrides: {
      "All Properties": { level: "edit", note: "Detailed properties on E-realty" },
      "Grouped Property Details": { level: "edit", note: "Detailed units tab only" },
      "Sold Units": { level: "edit" },
      Launches: { level: "none" },
      "Launch Details": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "seo", name: "SEO", short: "SEO",
    blurb: "Own website copy — SEO descriptions, titles and gallery content.",
    icon: Search, default: "view",
    overrides: {
      Projects: { level: "edit", note: "SEO descriptions & gallery only" },
      "Project Details": { level: "edit", note: "SEO descriptions & gallery only" },
      Developers: { level: "edit", note: "SEO descriptions only" },
      "Developer Details": { level: "edit", note: "SEO descriptions only" },
      Areas: { level: "edit", note: "SEO descriptions only" },
      "Grouped Property Details": { level: "edit", note: "Titles & descriptions (Resale / Nawy Now / Rental)" },
      "Data Ingestion": { level: "none" },
      "Data Validation": { level: "none" },
      "General Configurations": { level: "none" },
      "Audit Logs": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "data-quality", name: "Data Quality", short: "Data Qual",
    blurb: "Guard data integrity — validation rules, issues and checks across the system.",
    icon: ShieldCheck, default: "view",
    overrides: {
      "Data Validation": { level: "full", note: "Rules & issue lifecycle" },
      "Data Quality Analysis": { level: "full" },
      Projects: { level: "view", note: "Data checks only" },
      "Audit Logs": { level: "view" },
      "General Configurations": { level: "none" },
      "Testing Playground": { level: "none" },
    },
  },
  {
    id: "market-research", name: "Market Research", short: "Mkt Res",
    blurb: "Publish market intelligence; read-only on the rest of the inventory.",
    icon: FileBarChart, default: "none",
    overrides: {
      "Market Updates": { level: "full", note: "Nawy Space, newsfeed, construction updates & reports" },
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
  isDetail: boolean
  /** Chain used for permission resolution: own label first, then ancestors. */
  chain: string[]
  isGreyed?: boolean
}

function buildRows(): PageRow[] {
  const rows: PageRow[] = []
  const pushDetails = (parentChain: string[], depth: number) => {
    for (const d of DETAIL_PAGES[parentChain[0]] ?? []) {
      rows.push({ label: d, depth, isDetail: true, chain: [d, ...parentChain] })
    }
  }
  for (const item of navItems as NavItem[]) {
    rows.push({ label: item.label, icon: item.icon, depth: 0, isDetail: false, chain: [item.label], isGreyed: item.isGreyed })
    pushDetails([item.label], 1)
    for (const child of item.children ?? []) {
      rows.push({ label: child.label, icon: child.icon, depth: 1, isDetail: false, chain: [child.label, item.label] })
      pushDetails([child.label, item.label], 2)
    }
  }
  return rows
}

function resolve(team: Team, row: PageRow): Rule {
  for (const label of row.chain) {
    const rule = team.overrides[label]
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

export function PermissionsRolesPage() {
  const rows = useMemo(buildRows, [])
  const [teamId, setTeamId] = useState(TEAMS[0].id)
  const team = TEAMS.find((t) => t.id === teamId)!

  const counts = (t: Team) => {
    const c: Record<Level, number> = { full: 0, edit: 0, view: 0, none: 0 }
    rows.forEach((r) => { c[resolve(t, r).level]++ })
    return c
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions and Roles</h1>
          <p className="text-sm text-muted-foreground">
            Which team can see and do what across the IMS — a visual reference for the tech team. Pages and subpages mirror the navbar automatically.
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5">
          {(Object.keys(LEVEL_META) as Level[]).map((l) => <LevelTag key={l} level={l} />)}
        </div>
      </div>

      {/* Teams — click one to inspect it below */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                {(["full", "edit", "view", "none"] as Level[]).map((l) => (
                  <span key={l} className="inline-flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-sm", LEVEL_META[l].dot)} />{c[l]}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Access matrix — every team × every page at a glance */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Access Matrix</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{rows.length} pages</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Click a team column to inspect it below</span>
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
                  <td className="sticky left-0 z-10 bg-card px-4 py-1.5">
                    <span className="flex items-center gap-1.5" style={{ paddingLeft: r.depth * 16 }}>
                      {r.isDetail ? <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" /> : r.icon && <span className="flex-shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{r.icon}</span>}
                      <span className={cn("whitespace-nowrap", r.depth === 0 ? "font-medium text-foreground" : "text-muted-foreground", r.isGreyed && "opacity-50")}>{r.label}</span>
                      {r.isDetail && <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1 py-0 text-[9px] font-medium leading-4 text-indigo-700">Details page</span>}
                    </span>
                  </td>
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

      {/* Selected team — permissions per page, with scope notes */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <team.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{team.name}</h3>
            <p className="text-xs text-muted-foreground">{team.blurb}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {(["full", "edit", "view", "none"] as Level[]).map((l) => {
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
                <span className="flex min-w-0 flex-1 items-center gap-1.5" style={{ paddingLeft: r.depth * 16 }}>
                  {r.isDetail ? <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" /> : r.icon && <span className="flex-shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{r.icon}</span>}
                  <span className={cn("truncate text-sm", r.depth === 0 ? "font-medium text-foreground" : "text-muted-foreground", r.isGreyed && "opacity-50")}>{r.label}</span>
                  {r.isDetail && <span className="inline-flex flex-shrink-0 items-center rounded border border-indigo-200 bg-indigo-50 px-1 py-0 text-[9px] font-medium leading-4 text-indigo-700">Details page</span>}
                </span>
                {rule.note && <span className="hidden max-w-xs truncate text-right text-[11px] text-muted-foreground sm:block" title={rule.note}>{rule.note}</span>}
                <LevelTag level={rule.level} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

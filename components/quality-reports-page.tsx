"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ChevronRight, CircleCheck, Eye, FileBarChart2, LayoutGrid, MoreHorizontal,
  Search, ShieldCheck, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCard, TableCardHeader, TableFooter, IdTag, COL_SEP } from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import {
  QUALITY_REPORTS, reportStats, reportViolations, violationFixed, openIssuesFromReport, consumePendingReport,
  type QualityReport, type ReportRule, type ReportUnit,
} from "@/lib/quality-reports-mock"
import { cn } from "@/lib/utils"

// ── Small bits ────────────────────────────────────────────────────────────────
function PctTag({ pct, tone }: { pct: number; tone: "red" | "amber" | "emerald" | "gray" }) {
  const cls = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gray: "border-gray-200 bg-gray-100 text-gray-600",
  }[tone]
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums", cls)}>{pct}%</span>
}

/** "At creation X% · b blocking / w warning" summary chips. */
function IssueBreakdown({ units, blocking, warning, pct }: { units: number; blocking: number; warning: number; pct: number }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
      <PctTag pct={pct} tone={pct === 0 ? "emerald" : "gray"} />
      <span className="text-xs tabular-nums text-muted-foreground">{units} units</span>
      {blocking > 0 && <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-red-700">{blocking} blocking</span>}
      {warning > 0 && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-amber-700">{warning} warning</span>}
    </span>
  )
}

function NowCell({ r }: { r: QualityReport }) {
  const s = reportStats(r)
  if (s.clean) {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><CircleCheck className="h-3 w-3" />100% completed — no issues</span>
  }
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <IssueBreakdown units={s.nowUnits} blocking={s.nowBlocking} warning={s.nowWarning} pct={s.nowPct} />
      {s.nowPct < s.initialPct && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600"><ArrowDown className="h-3 w-3" />{s.initialPct - s.nowPct}%</span>
      )}
    </span>
  )
}

function StatCard({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "red" | "amber" | "emerald" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-foreground")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Report details ────────────────────────────────────────────────────────────
function ReportDetails({ report, onBack, onChanged }: { report: QualityReport; onBack: () => void; onChanged: () => void }) {
  const [activeRule, setActiveRule] = useState<string | null>(null)
  const [focusUnit, setFocusUnit] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [version, setVersion] = useState(0)

  const stats = useMemo(() => reportStats(report), [report, version])
  const violations = useMemo(() => reportViolations(report), [report])

  // Per-unit current broken rules + opened issue counts
  const unitInfo = useMemo(() => {
    const m = new Map<string, { broken: ReportRule[]; fixed: number; issues: number }>()
    for (const u of report.units) m.set(u.propertyId, { broken: [], fixed: 0, issues: 0 })
    for (const { rule, unit } of violations) {
      const e = m.get(unit.propertyId)!
      if (violationFixed(report, rule.id, unit.propertyId)) e.fixed++
      else e.broken.push(rule)
    }
    for (const o of report.openedIssues) {
      const e = m.get(o.propertyId)
      if (e) e.issues++
    }
    return m
  }, [report, violations, version])

  // Per-rule current counts + progress + opened issues
  const ruleInfo = useMemo(() => {
    const m = new Map<string, { total: number; broken: number; issues: number }>()
    for (const r of report.rules) m.set(r.id, { total: 0, broken: 0, issues: 0 })
    for (const { rule, unit } of violations) {
      const e = m.get(rule.id)!
      e.total++
      if (!violationFixed(report, rule.id, unit.propertyId)) e.broken++
    }
    for (const o of report.openedIssues) {
      const e = m.get(o.ruleId)
      if (e) e.issues++
    }
    return m
  }, [report, violations, version])

  const visibleUnits = useMemo(() => {
    let units = report.units
    if (activeRule) {
      units = units.filter((u) => unitInfo.get(u.propertyId)!.broken.some((r) => r.id === activeRule))
    }
    return units
  }, [report.units, activeRule, unitInfo])

  const openIssues = (ids: string[]) => {
    const created = openIssuesFromReport(report, ids)
    setVersion((v) => v + 1)
    setSelected(new Set())
    onChanged()
    toast.success(created.length
      ? `${created.length} issue${created.length !== 1 ? "s" : ""} opened in Properties Data Issues (System)`
      : "Nothing new to open — the selected units' violations are fixed or already have issues")
  }

  const blockingRules = report.rules.filter((r) => r.type === "Blocking")
  const warningRules = report.rules.filter((r) => r.type === "Warning")

  const RuleCard = ({ rule }: { rule: ReportRule }) => {
    const info = ruleInfo.get(rule.id)!
    const blocking = rule.type === "Blocking"
    const active = activeRule === rule.id
    const dimmedByUnit = focusUnit != null && !unitInfo.get(focusUnit)?.broken.some((r) => r.id === rule.id)
    return (
      <button
        onClick={() => { setActiveRule(active ? null : rule.id); setFocusUnit(null) }}
        className={cn(
          "block w-full rounded-xl border p-3 text-left transition-all",
          blocking ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40",
          active && "ring-2 ring-primary/60",
          (dimmedByUnit || (activeRule && !active)) && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", blocking ? "text-red-700" : "text-amber-700")}>
            {rule.name}
            <Eye className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </span>
          <span className={cn(
            "shrink-0 whitespace-nowrap rounded-md border bg-card px-2 py-0.5 text-xs font-medium tabular-nums",
            blocking ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700",
          )}>
            {info.broken} Unit{info.broken !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">ID: {rule.id}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{rule.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-emerald-700 tabular-nums">{info.total - info.broken} of {info.total} fixed</span>
          {info.issues > 0 && (
            <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-px font-medium tabular-nums text-blue-700">{info.issues} issue{info.issues !== 1 ? "s" : ""} opened</span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground hover:underline">Data Quality Reports</button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-semibold text-foreground">{report.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <FileBarChart2 className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-foreground">{report.id}</span>
          <ColorTag value={report.kind} />
          <ColorTag value={report.entity} />
          <span className="text-xs text-muted-foreground">Created by {report.createdBy} · {fmtDateTime(report.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{report.units.length} units</span>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{report.rules.length} rules</span>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Units" value={stats.totalUnits} />
        <StatCard label="With Issues at Creation" value={`${stats.initialPct}%`} sub={`${stats.initialUnits} units · ${stats.initialBlocking} blocking / ${stats.initialWarning} warning`} />
        <StatCard
          label="With Issues Now"
          value={stats.clean ? "0%" : `${stats.nowPct}%`}
          tone={stats.clean ? "emerald" : stats.nowBlocking > 0 ? "red" : "amber"}
          sub={stats.clean ? "100% completed — no issues" : `${stats.nowUnits} units · was ${stats.initialPct}% at creation`}
        />
        <StatCard label="Blocking Units Now" value={stats.nowBlocking} tone={stats.nowBlocking > 0 ? "red" : undefined} />
        <StatCard label="Warning Units Now" value={stats.nowWarning} tone={stats.nowWarning > 0 ? "amber" : undefined} />
        <StatCard label="Issues Opened" value={report.openedIssues.length} sub="visible in Properties Data Issues" />
      </div>

      {/* Units | Rules */}
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4">
        {/* Units table */}
        <TableCard>
          <TableCardHeader
            title="Units"
            count={visibleUnits.length}
            extra={activeRule ? (
              <button
                onClick={() => setActiveRule(null)}
                className="ml-1 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
              >
                Filtered: {report.rules.find((r) => r.id === activeRule)?.name}
                <X className="h-3 w-3" />
              </button>
            ) : undefined}
            cta={
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={selected.size === 0}
                onClick={() => openIssues([...selected])}
              >
                <AlertTriangle className="h-3.5 w-3.5" />Open Issues{selected.size > 0 ? ` (${selected.size})` : ""}
              </Button>
            }
          />
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border">
                  <th className={cn("w-10 px-3 py-2", COL_SEP)}>
                    <Checkbox
                      className="h-4 w-4"
                      checked={visibleUnits.length > 0 && visibleUnits.every((u) => selected.has(u.propertyId))}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const n = new Set(prev)
                          visibleUnits.forEach((u) => (v ? n.add(u.propertyId) : n.delete(u.propertyId)))
                          return n
                        })
                      }
                    />
                  </th>
                  {["Property ID", "Detailed Property ID", "Project", "Broken Rules", "Fixed", "Issues"].map((h) => (
                    <th key={h} className={cn("whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", COL_SEP)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleUnits.map((u) => {
                  const info = unitInfo.get(u.propertyId)!
                  const blocking = info.broken.filter((r) => r.type === "Blocking").length
                  const warning = info.broken.length - blocking
                  const focused = focusUnit === u.propertyId
                  return (
                    <tr
                      key={u.propertyId}
                      onClick={() => { setFocusUnit(focused ? null : u.propertyId); setActiveRule(null) }}
                      className={cn(
                        "cursor-pointer transition-colors",
                        blocking > 0 ? "bg-red-50/60" : warning > 0 ? "bg-amber-50/50" : "bg-card",
                        "hover:bg-muted/50",
                        focused && "ring-2 ring-inset ring-primary/60",
                      )}
                    >
                      <td className={cn("w-10 px-3 py-1.5", COL_SEP)} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          className="h-4 w-4"
                          checked={selected.has(u.propertyId)}
                          onCheckedChange={(v) => setSelected((prev) => { const n = new Set(prev); v ? n.add(u.propertyId) : n.delete(u.propertyId); return n })}
                        />
                      </td>
                      <td className={cn("whitespace-nowrap px-3 py-1.5 font-mono text-[10px]", COL_SEP)}>{u.propertyId}</td>
                      <td className={cn("whitespace-nowrap px-3 py-1.5 font-mono text-[10px] text-muted-foreground", COL_SEP)}>{u.detailedPropertyId ?? "—"}</td>
                      <td className={cn("whitespace-nowrap px-3 py-1.5 text-xs", COL_SEP)}>{u.project.name}</td>
                      <td className={cn("px-3 py-1.5", COL_SEP)}>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          {blocking > 0 && <span className="rounded-md border border-red-200 bg-red-100 px-1.5 py-px text-[10px] font-medium tabular-nums text-red-700">{blocking} blocking</span>}
                          {warning > 0 && <span className="rounded-md border border-amber-200 bg-amber-100 px-1.5 py-px text-[10px] font-medium tabular-nums text-amber-700">{warning} warning</span>}
                          {info.broken.length === 0 && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><CircleCheck className="h-3 w-3" />Clean</span>}
                        </span>
                      </td>
                      <td className={cn("whitespace-nowrap px-3 py-1.5 text-xs tabular-nums text-emerald-700", COL_SEP)}>{info.fixed > 0 ? info.fixed : "—"}</td>
                      <td className={cn("whitespace-nowrap px-3 py-1.5", COL_SEP)}>
                        {info.issues > 0
                          ? <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-blue-700">{info.issues} issue{info.issues !== 1 ? "s" : ""}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  )
                })}
                {visibleUnits.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No units currently break this rule.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>

        {/* Rule cards */}
        <div className="space-y-5 rounded-xl border border-border bg-card p-4">
          {focusUnit && (
            <button
              onClick={() => setFocusUnit(null)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
            >
              Showing rules broken by {focusUnit}
              <X className="h-3 w-3" />
            </button>
          )}
          {blockingRules.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">Blocking Issues</h4>
                <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{blockingRules.length} rules</span>
              </div>
              {blockingRules.map((r) => <RuleCard key={r.id} rule={r} />)}
            </div>
          )}
          {warningRules.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">Warning Issues</h4>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{warningRules.length} rules</span>
              </div>
              {warningRules.map((r) => <RuleCard key={r.id} rule={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── The page ──────────────────────────────────────────────────────────────────
export function QualityReportsPage() {
  const [tab, setTab] = useState<"Properties" | "Projects">("Properties")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [version, setVersion] = useState(0)
  const [openReport, setOpenReport] = useState<QualityReport | null>(null)

  // A report just generated from the properties bulk action opens directly
  useEffect(() => {
    const id = consumePendingReport()
    if (id) {
      const r = QUALITY_REPORTS.find((x) => x.id === id)
      if (r) setOpenReport(r)
    }
  }, [])

  const reports = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return QUALITY_REPORTS
      .filter((r) => r.entity === "Properties")
      .filter((r) => !needle || [r.id, r.createdBy, r.kind].some((x) => x.toLowerCase().includes(needle)))
  }, [q, version])

  const pageRows = reports.slice((page - 1) * pageSize, page * pageSize)

  if (openReport) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <div className="space-y-4 p-6">
          <ReportDetails report={openReport} onBack={() => { setOpenReport(null); setVersion((v) => v + 1) }} onChanged={() => setVersion((v) => v + 1)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Quality Reports</h1>
          <p className="text-sm text-muted-foreground">Validation-rule runs over selected units — each report tracks how many units had issues at creation and how many still do now</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="Properties" className="data-[state=active]:bg-card">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />Properties
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{reports.length}</span>
            </TabsTrigger>
            <TabsTrigger value="Projects" className="data-[state=active]:bg-card">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Projects
              <span className="ml-1.5 inline-flex h-4 items-center justify-center rounded border border-gray-200 bg-gray-100 px-1 text-[10px] font-semibold text-gray-500">Soon</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "Projects" ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-24 text-center">
            <FileBarChart2 className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Project quality reports are coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">Property reports are live — run one from the properties tables via bulk select.</p>
          </div>
        ) : (
          <>
            <div className="relative w-[420px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search by report ID or creator" className="h-8 bg-card pl-8 text-sm" />
            </div>

            <TableCard>
              <TableCardHeader title="Reports" count={reports.length} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["Report ID", "Type", "Units", "Rules", "At Creation", "Now", "Issues Opened", "Created By", "Created At", ""].map((h, i) => (
                        <th key={i} className={cn("whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", COL_SEP)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((r) => {
                      const s = reportStats(r)
                      return (
                        <tr key={r.id} className="group cursor-pointer bg-card transition-colors hover:bg-muted/40" onClick={() => setOpenReport(r)}>
                          <td className={cn("px-3 py-2", COL_SEP)}><IdTag value={r.id} /></td>
                          <td className={cn("px-3 py-2", COL_SEP)}><ColorTag value={r.kind} /></td>
                          <td className={cn("whitespace-nowrap px-3 py-2 text-xs tabular-nums", COL_SEP)}>{r.units.length}</td>
                          <td className={cn("whitespace-nowrap px-3 py-2 text-xs tabular-nums", COL_SEP)}>{r.rules.length}</td>
                          <td className={cn("px-3 py-2", COL_SEP)}>
                            <IssueBreakdown units={s.initialUnits} blocking={s.initialBlocking} warning={s.initialWarning} pct={s.initialPct} />
                          </td>
                          <td className={cn("px-3 py-2", COL_SEP)}><NowCell r={r} /></td>
                          <td className={cn("whitespace-nowrap px-3 py-2", COL_SEP)}>
                            {r.openedIssues.length > 0
                              ? <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-blue-700">{r.openedIssues.length}</span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className={cn("whitespace-nowrap px-3 py-2 text-xs", COL_SEP)}>{r.createdBy}</td>
                          <td className={cn("whitespace-nowrap px-3 py-2 text-xs tabular-nums text-muted-foreground", COL_SEP)}>{fmtDateTime(r.createdAt)}</td>
                          <td className="w-12 px-1 py-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex h-7 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setOpenReport(r)}><Eye className="mr-2 h-3.5 w-3.5" />View Details</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                    {pageRows.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No reports yet — bulk-select units on a properties page and run Validation Rules.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter page={page} pageSize={pageSize} total={reports.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="reports" />
            </TableCard>
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ChevronRight, CircleCheck, Eye, FileBarChart2, FileDown, LayoutGrid,
  MinusCircle, MoreHorizontal, Search, ShieldCheck, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  TableCard, TableCardHeader, TableFooter, IdTag, COL_SEP, FloatingBulkBar, BulkBarButton,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { createRows, EmbeddedPropertyTable, type ColId, type PropertyRow } from "@/components/all-properties-page"
import { mockRules } from "@/components/validation-rules-page"
import {
  QUALITY_REPORTS, reportStats, reportViolations, violationFixed, openIssuesFromReport,
  excludeUnitsFromReport, consumePendingReport,
  type QualityReport, type ReportRule,
} from "@/lib/quality-reports-mock"
import { cn } from "@/lib/utils"

// ── Small bits ────────────────────────────────────────────────────────────────
type PctTone = "red" | "orange" | "amber" | "emerald" | "gray"

/** Share of units with issues — the higher, the worse. */
function pctTone(pct: number): PctTone {
  if (pct === 0) return "emerald"
  if (pct <= 33) return "amber"
  if (pct <= 66) return "orange"
  return "red"
}

function PctTag({ pct, tone }: { pct: number; tone: PctTone }) {
  const cls = {
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-700",
    gray: "border-gray-200 bg-gray-100 text-gray-600",
  }[tone]
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums", cls)}>{pct}%</span>
}

function PersonCell({ name }: { name: string }) {
  const sys = name === "System"
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
        sys ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary",
      )}>
        {sys ? "SYS" : name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
      </span>
      <span className="text-xs">{name}</span>
    </span>
  )
}

/** "N of M units" + color-coded percentage (higher = worse). */
function IssueShareCell({ units, total, pct }: { units: number; total: number; pct: number }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <PctTag pct={pct} tone={pctTone(pct)} />
      <span className="text-xs tabular-nums text-muted-foreground">{units} of {total} units</span>
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
      <IssueShareCell units={s.nowUnits} total={s.totalUnits} pct={s.nowPct} />
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

// ── Validation rule details drawer ────────────────────────────────────────────
const OP_LABEL: Record<string, string> = {
  equals: "equals", notEquals: "not equals", greaterThan: "greater than", lessThan: "less than",
  greaterThanOrEqual: "≥", lessThanOrEqual: "≤", contains: "contains", isEmpty: "is empty", isNotEmpty: "is not empty",
}

function RuleDetailsDrawer({
  rule, scope, onClose,
}: {
  rule: ReportRule | null
  /** This report's scope for the rule — units checked / broken / fixed / issues. */
  scope: { totalUnits: number; broken: number; fixed: number; issues: number } | null
  onClose: () => void
}) {
  const full = rule ? mockRules.find((m) => m.id === rule.id) ?? null : null
  const conditions: { field: string; operator: string; value: unknown }[] = full?.conditions?.conditions ?? []
  const blocking = rule?.type === "Blocking"
  return (
    <Sheet open={!!rule} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[440px]">
        {rule && (
          <>
            <SheetHeader className="space-y-2 border-b border-border bg-card px-5 py-4">
              <SheetTitle className="flex items-start justify-between gap-2 pr-6 text-base">{rule.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", blocking ? "border-red-200 bg-red-100 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{rule.type}</span>
                {full && (
                  <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", full.isActive ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700")}>
                    {full.isActive ? "Active" : "Inactive"}
                  </span>
                )}
                <IdTag value={rule.id} />
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-5 px-5 py-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h4>
                <p className="mt-1.5 text-sm leading-snug text-foreground">{rule.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter</h4>
                <div className="mt-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  {conditions.length ? (
                    <div className="space-y-1.5">
                      {conditions.map((c, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                          {i > 0 && <span className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">{full?.conditions?.operator ?? "AND"}</span>}
                          <span className="rounded-md border border-border bg-card px-1.5 py-px font-mono text-[11px]">{c.field}</span>
                          <span className="text-muted-foreground">{OP_LABEL[c.operator] ?? c.operator}</span>
                          {c.value !== "" && c.value != null && <span className="rounded-md border border-border bg-card px-1.5 py-px font-mono text-[11px] tabular-nums">{String(c.value)}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Rule conditions snapshot not available for this report.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</h4>
                <div className="mt-1.5 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Applies to entity</span><ColorTag value={full?.entity ?? "Property"} /></div>
                  {scope && (
                    <>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Units checked in this report</span><span className="font-semibold tabular-nums">{scope.totalUnits}</span></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Currently breaking the rule</span><span className={cn("font-semibold tabular-nums", scope.broken > 0 ? "text-red-600" : "text-emerald-600")}>{scope.broken}</span></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Fixed since creation</span><span className="font-semibold tabular-nums text-emerald-600">{scope.fixed}</span></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Issues opened</span><span className="font-semibold tabular-nums text-blue-700">{scope.issues}</span></div>
                    </>
                  )}
                </div>
              </div>

              {full && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Created At</p><p className="mt-0.5 tabular-nums">{fmtDateTime(full.createdAt)}</p></div>
                  <div><p className="text-muted-foreground">Updated At</p><p className="mt-0.5 tabular-nums">{fmtDateTime(full.updatedAt)}</p></div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Report details ────────────────────────────────────────────────────────────
// Detailed-properties columns hidden in the report's Properties table
const REPORT_HIDDEN_COLS = ["floorPlans", "images", "paymentOptions"] as ColId[]

function ReportDetails({ report, onBack, onChanged }: { report: QualityReport; onBack: () => void; onChanged: () => void }) {
  const [activeRule, setActiveRule] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewRule, setViewRule] = useState<ReportRule | null>(null)
  const [version, setVersion] = useState(0)

  const stats = useMemo(() => reportStats(report), [report, version])
  const violations = useMemo(() => reportViolations(report), [report, version])

  // Full detailed-property rows joined by property id
  const propertyById = useMemo(() => new Map(createRows().map((r) => [r.propertyId, r])), [])

  // Per-unit current broken rules
  const unitInfo = useMemo(() => {
    const m = new Map<string, { broken: ReportRule[] }>()
    for (const u of report.units) m.set(u.propertyId, { broken: [] })
    for (const { rule, unit } of violations) {
      if (!violationFixed(report, rule.id, unit.propertyId)) m.get(unit.propertyId)!.broken.push(rule)
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

  const visibleRows = useMemo(() => {
    let units = report.units
    if (activeRule) units = units.filter((u) => unitInfo.get(u.propertyId)?.broken.some((r) => r.id === activeRule))
    return units.map((u) => propertyById.get(u.propertyId)).filter(Boolean) as PropertyRow[]
  }, [report.units, activeRule, unitInfo, propertyById, version])

  const openIssues = (ids: string[]) => {
    const created = openIssuesFromReport(report, ids)
    setVersion((v) => v + 1)
    setSelected(new Set())
    onChanged()
    toast.success(created.length
      ? `${created.length} issue${created.length !== 1 ? "s" : ""} opened in Properties Data Issues (System)`
      : "Nothing new to open — the selected units' violations are fixed or already have issues")
  }

  const exclude = (ids: string[]) => {
    const removed = excludeUnitsFromReport(report, ids)
    setSelected(new Set())
    setVersion((v) => v + 1)
    onChanged()
    toast.success(removed
      ? `${removed} propert${removed === 1 ? "y" : "ies"} excluded from ${report.id}`
      : "Nothing to exclude")
  }

  const blockingRules = report.rules.filter((r) => r.type === "Blocking")
  const warningRules = report.rules.filter((r) => r.type === "Warning")

  const RuleCard = ({ rule }: { rule: ReportRule }) => {
    const info = ruleInfo.get(rule.id)!
    const blocking = rule.type === "Blocking"
    const active = activeRule === rule.id
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setActiveRule(active ? null : rule.id)}
        onKeyDown={(e) => { if (e.key === "Enter") setActiveRule(active ? null : rule.id) }}
        className={cn(
          "block w-full cursor-pointer rounded-xl border p-3 text-left transition-all",
          blocking ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40",
          active && "ring-2 ring-primary/60",
          activeRule && !active && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("text-sm font-semibold", blocking ? "text-red-700" : "text-amber-700")}>{rule.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <span className={cn(
              "whitespace-nowrap rounded-md border bg-card px-2 py-0.5 text-xs font-medium tabular-nums",
              blocking ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700",
            )}>
              {info.broken} Unit{info.broken !== 1 ? "s" : ""}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setViewRule(rule) }}
              title="View rule details"
              className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
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
      </div>
    )
  }

  const viewScope = viewRule ? {
    totalUnits: report.units.length,
    broken: ruleInfo.get(viewRule.id)?.broken ?? 0,
    fixed: (ruleInfo.get(viewRule.id)?.total ?? 0) - (ruleInfo.get(viewRule.id)?.broken ?? 0),
    issues: ruleInfo.get(viewRule.id)?.issues ?? 0,
  } : null

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
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{report.units.length} properties</span>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{report.rules.length} rules</span>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Properties" value={stats.totalUnits} />
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

      {/* Properties | Rules */}
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4">
        {/* Properties table — full detailed-properties columns */}
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Properties</h3>
              <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{visibleRows.length}</span>
              {activeRule && (
                <button
                  onClick={() => setActiveRule(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Filtered: {report.rules.find((r) => r.id === activeRule)?.name}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={selected.size === 0}
              onClick={() => openIssues([...selected])}
            >
              <AlertTriangle className="h-3.5 w-3.5" />Open Issues{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          </div>
          <EmbeddedPropertyTable
            rows={visibleRows}
            hiddenColumns={REPORT_HIDDEN_COLS}
            allowReportIssue
            selectedIds={selected}
            onSelectedChange={setSelected}
            extraMenuItems={(row) => (
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => exclude([row.propertyId])}>
                <MinusCircle className="mr-2 h-3.5 w-3.5" />Exclude from Report
              </DropdownMenuItem>
            )}
            onIssuesChanged={() => { setVersion((v) => v + 1); onChanged() }}
            maxHeight={560}
          />
        </div>

        {/* Rule cards */}
        <div className="space-y-5 rounded-xl border border-border bg-card p-4">
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

      {/* Bulk actions */}
      <FloatingBulkBar
        count={selected.size}
        total={visibleRows.length}
        onSelectAll={() => setSelected(new Set(visibleRows.map((r) => r.propertyId)))}
        onClear={() => setSelected(new Set())}
      >
        <BulkBarButton icon={<AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />} onClick={() => openIssues([...selected])}>Open Issues</BulkBarButton>
        <BulkBarButton danger icon={<MinusCircle className="h-3.5 w-3.5" />} onClick={() => exclude([...selected])}>Exclude from Report</BulkBarButton>
      </FloatingBulkBar>

      {/* Rule details drawer */}
      <RuleDetailsDrawer rule={viewRule} scope={viewScope} onClose={() => setViewRule(null)} />
    </div>
  )
}

// ── The page ──────────────────────────────────────────────────────────────────
const REPORT_COLS = [
  { id: "id", label: "Report ID" },
  { id: "kind", label: "Type" },
  { id: "units", label: "Units" },
  { id: "rules", label: "Rules" },
  { id: "atCreation", label: "At Creation" },
  { id: "now", label: "Now" },
  { id: "issuesOpened", label: "Issues Opened" },
  { id: "createdBy", label: "Created By" },
  { id: "createdAt", label: "Created At" },
  { id: "updatedAt", label: "Updated At" },
]

export function QualityReportsPage() {
  const [tab, setTab] = useState<"Properties" | "Projects">("Properties")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [version, setVersion] = useState(0)
  const [openReport, setOpenReport] = useState<QualityReport | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

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

  const renderCell = (r: QualityReport, colId: string): React.ReactNode => {
    const s = reportStats(r)
    switch (colId) {
      case "id": return <IdTag value={r.id} />
      case "kind": return <ColorTag value={r.kind} />
      case "units": return <span className="text-xs tabular-nums">{r.units.length}</span>
      case "rules": {
        const blocking = r.rules.filter((x) => x.type === "Blocking").length
        const warning = r.rules.length - blocking
        return (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-sm font-semibold tabular-nums">{r.rules.length}</span>
            {warning > 0 && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-amber-700">{warning} warning</span>}
            {blocking > 0 && <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-red-700">{blocking} blocking</span>}
          </span>
        )
      }
      case "atCreation": return <IssueShareCell units={s.initialUnits} total={s.totalUnits} pct={s.initialPct} />
      case "now": return <NowCell r={r} />
      case "issuesOpened":
        return r.openedIssues.length > 0
          ? <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-blue-700">{r.openedIssues.length}</span>
          : <span className="text-xs text-muted-foreground">—</span>
      case "createdBy": return <PersonCell name={r.createdBy} />
      case "createdAt": return <span className="text-xs tabular-nums text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
      case "updatedAt": return <span className="text-xs tabular-nums text-muted-foreground">{fmtDateTime(r.updatedAt)}</span>
      default: return null
    }
  }

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
                <table className={cn("w-max min-w-full text-sm", COL_SEP)}>
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="sticky left-0 z-20 w-10 bg-muted/60 py-2.5 pl-4 pr-0">
                        <Checkbox
                          className="h-4 w-4"
                          checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                          onCheckedChange={(v) =>
                            setSelected((prev) => {
                              const n = new Set(prev)
                              pageRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)))
                              return n
                            })
                          }
                        />
                      </th>
                      {REPORT_COLS.map((c) => (
                        <th key={c.id} className="whitespace-nowrap px-3 py-2.5 text-left">{c.label}</th>
                      ))}
                      <th className="sticky right-0 z-10 w-12 border-l border-border bg-muted/60" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="cursor-pointer border-b border-border bg-card transition-colors hover:bg-muted/40" onClick={() => setOpenReport(r)}>
                        <td className="sticky left-0 z-10 w-10 bg-card py-2 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            className="h-4 w-4"
                            checked={selected.has(r.id)}
                            onCheckedChange={(v) => setSelected((prev) => { const n = new Set(prev); v ? n.add(r.id) : n.delete(r.id); return n })}
                          />
                        </td>
                        {REPORT_COLS.map((c) => (
                          <td key={c.id} className="whitespace-nowrap px-3 py-2.5 align-middle">{renderCell(r, c.id)}</td>
                        ))}
                        <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex h-7 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setOpenReport(r)}><Eye className="mr-2 h-3.5 w-3.5" />View Details</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr><td colSpan={REPORT_COLS.length + 2} className="px-4 py-12 text-center text-sm text-muted-foreground">No reports yet — bulk-select units on a properties page and run Validation Rules.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter page={page} pageSize={pageSize} total={reports.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="reports" />
            </TableCard>

            <FloatingBulkBar
              count={selected.size}
              total={reports.length}
              onSelectAll={() => setSelected(new Set(reports.map((r) => r.id)))}
              onClear={() => setSelected(new Set())}
            >
              <BulkBarButton
                icon={<FileDown className="h-3.5 w-3.5 text-zinc-400" />}
                onClick={() => { toast.success(`${selected.size} report${selected.size !== 1 ? "s" : ""} exported as CSV`); setSelected(new Set()) }}
              >
                Export CSV
              </BulkBarButton>
            </FloatingBulkBar>
          </>
        )}
      </div>
    </div>
  )
}

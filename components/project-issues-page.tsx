"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDot, Clock, Eye,
  Loader2, MessageSquare, MoreHorizontal, ScrollText, Send, UserRound, XCircle, CirclePlus,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterMultiSelect, DateRangeFilter,
  FloatingBulkBar, BulkBarButton, MultiSortControl, IdTag, COL_SEP, type SortLevel,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import {
  PROJECT_ISSUES, PROJECT_ISSUE_FIELDS, ALL_PROJECT_ISSUE_TYPES,
  type ProjectIssue,
} from "@/lib/project-issues-mock"
import {
  PROP_ISSUE_STATUSES, PROP_ISSUE_SEVERITIES, PROP_ISSUE_SOURCES, STATUS_COLORS, SEVERITY_COLORS, SOURCE_COLORS,
  ALL_PEOPLE, ALL_REPORTERS, type PropIssueStatus, type IssueActivity,
} from "@/lib/property-issues-mock"
import { PROJECT_DEVELOPERS, PROJECTS } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"

// ── Small shared bits (mirror the properties data-issues page) ────────────────
function StatusTag({ status, chevron }: { status: PropIssueStatus; chevron?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
      {status}
      {chevron && <ChevronDown className="h-3 w-3 opacity-60" />}
    </span>
  )
}

function PersonCell({ name, muted }: { name: string | null; muted?: boolean }) {
  if (!name) return <span className="text-xs text-muted-foreground">Unassigned</span>
  if (name === "System") return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS.System)}>System</span>
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
        {name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
      </span>
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground")}>{name}</span>
    </span>
  )
}

function StatCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
        {value.toLocaleString()}
        {total != null && total > 0 && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{Math.round((value / total) * 100)}%</span>}
      </p>
    </div>
  )
}

// Status / assignee patches (same shape as the property tracking drawer's)
let actSeq = 0
const actId = () => `PACT-N${++actSeq}`
function statusPatch(iss: ProjectIssue, next: PropIssueStatus, actor = "Ezz H."): Partial<ProjectIssue> {
  const now = new Date().toISOString()
  return {
    status: next,
    updatedAt: now,
    ...(next === "Resolved" ? { resolvedAt: now, closedAt: null } : {}),
    ...(next === "Closed" ? { closedAt: now } : {}),
    ...(next === "To Do" || next === "In Progress" || next === "Invalid" ? { resolvedAt: null, closedAt: null } : {}),
    activity: [...iss.activity, { id: actId(), kind: "status" as const, actor, at: now, detail: `Status changed: ${iss.status} → ${next}` }],
  }
}
function assigneePatch(iss: ProjectIssue, person: string | null, actor = "Ezz H."): Partial<ProjectIssue> {
  const now = new Date().toISOString()
  return {
    assignedTo: person,
    updatedAt: now,
    activity: [...iss.activity, { id: actId(), kind: "assigned" as const, actor, at: now, detail: person ? `Assigned to ${person}` : "Unassigned" }],
  }
}

const ACT_ICON: Record<IssueActivity["kind"], React.ReactNode> = {
  created: <CirclePlus className="h-3 w-3" />,
  status: <Clock className="h-3 w-3" />,
  assigned: <UserRound className="h-3 w-3" />,
}

// ── Tracking drawer — issue details | comments & logs (project issues have no
//    embeddable entity panel yet, so 2 panes instead of the properties' 3) ────
export function ProjectIssueDrawer({
  issue, list, onStep, onClose, onSetStatus, onSetAssignee, onAddComment,
}: {
  issue: ProjectIssue | null
  list?: ProjectIssue[]
  onStep: (next: ProjectIssue) => void
  onClose: () => void
  onSetStatus: (issue: ProjectIssue, s: PropIssueStatus) => void
  onSetAssignee: (issue: ProjectIssue, p: string | null) => void
  onAddComment: (issue: ProjectIssue, text: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [midTab, setMidTab] = useState<"comments" | "logs">("comments")
  if (!issue) return null
  const idx = list ? list.findIndex((r) => r.id === issue.id) : -1

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[105px_1fr] items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground">{children}</span>
    </div>
  )
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[920px] !max-w-[95vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex min-w-0 items-center gap-2.5">
              <SheetTitle className="text-base font-semibold">Project Issue</SheetTitle>
              <IdTag value={issue.id} />
              <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS[issue.source])}>{issue.source}</span>
              <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[issue.severity])}>{issue.severity}</span>
            </div>
            {idx >= 0 && list && list.length > 1 && (
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => onStep(list[idx - 1])}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="px-1 text-xs tabular-nums text-muted-foreground">{idx + 1}/{list.length.toLocaleString()}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx >= list.length - 1} onClick={() => onStep(list[idx + 1])}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-x divide-border">
          {/* Pane 1 — issue details */}
          <div className="min-w-0 space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-2.5">
              <SectionTitle>Issue Details</SectionTitle>
              <Row label="Status">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button><StatusTag status={issue.status} chevron /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {PROP_ISSUE_STATUSES.filter((s) => s !== issue.status).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => onSetStatus(issue, s)}>
                        <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </Row>
              <Row label="Priority">
                <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[issue.severity])}>{issue.severity}</span>
              </Row>
              <Row label="Assigned To">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <UserRound className="h-3 w-3" />{issue.assignedTo ?? "Unassigned"}<ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto">
                    {ALL_PEOPLE.map((p) => (
                      <DropdownMenuItem key={p} onClick={() => onSetAssignee(issue, p)}>{p}</DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onSetAssignee(issue, null)}>Unassigned</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Row>
              <Row label="Reported By">{issue.reportedBy}</Row>
              <Row label="Reporter Type">
                <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS[issue.source])}>{issue.source}</span>
              </Row>
              <Row label="Category"><ColorTag value={issue.fieldLabel} /></Row>
              <Row label="Type"><ColorTag value={issue.type} /></Row>
              <Row label="Subtype">{issue.subtype ? <ColorTag value={issue.subtype} /> : <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Project">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{issue.project.name}</span>
                  <IdTag value={issue.project.id} />
                  <ColorTag value={issue.projectLevel} />
                </span>
              </Row>
              <Row label="Developer">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm">{issue.developer.name}</span>
                  <IdTag value={issue.developer.id} />
                </span>
              </Row>
            </div>

            <div className="space-y-3">
              <SectionTitle>Description</SectionTitle>
              <p className="min-w-0 break-words text-sm leading-relaxed text-foreground">{issue.description}</p>
              {(issue.details?.amenitiesRemove?.length || issue.details?.amenitiesAdd?.length) ? (
                <div className="space-y-2">
                  {!!issue.details?.amenitiesRemove?.length && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-red-700">Wrong — should be removed</p>
                      <div className="flex flex-wrap gap-1.5">
                        {issue.details.amenitiesRemove.map((a) => (
                          <span key={a} className="rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!issue.details?.amenitiesAdd?.length && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-emerald-700">Missing — should be added</p>
                      <div className="flex flex-wrap gap-1.5">
                        {issue.details.amenitiesAdd.map((a) => (
                          <span key={a} className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {(issue.expected || issue.current) && (
              <div className="space-y-3">
                <SectionTitle>Expected Result</SectionTitle>
                <div className="space-y-2">
                  {issue.current && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Current</p>
                      <p className="text-sm text-red-700">{issue.current}</p>
                    </div>
                  )}
                  {issue.expected && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Expected</p>
                      <p className="text-sm text-emerald-700">{issue.expected}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <SectionTitle>Timeline</SectionTitle>
              <Row label="Created At">{fmtDateTime(issue.createdAt)}</Row>
              <Row label="Updated At">{fmtDateTime(issue.updatedAt)}</Row>
              <Row label="Resolved At">{issue.resolvedAt ? fmtDateTime(issue.resolvedAt) : <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Closed At">{issue.closedAt ? fmtDateTime(issue.closedAt) : <span className="text-muted-foreground">—</span>}</Row>
            </div>
          </div>

          {/* Pane 2 — comments | logs */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
              <button
                onClick={() => setMidTab("comments")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  midTab === "comments" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="h-3 w-3" />Comments
                <span className="rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{issue.comments.length}</span>
              </button>
              <button
                onClick={() => setMidTab("logs")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  midTab === "logs" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ScrollText className="h-3 w-3" />Logs
                <span className="rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{issue.activity.length}</span>
              </button>
            </div>

            {midTab === "comments" ? (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {issue.comments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>}
                  {issue.comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {c.author.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{c.author}</p>
                          <p className="shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(c.at)}</p>
                        </div>
                        <p className="mt-0.5 rounded-lg rounded-tl-none border border-border bg-muted/40 px-2.5 py-1.5 text-sm leading-snug text-foreground">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a comment…"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim()) { onAddComment(issue, draft.trim()); setDraft("") }
                    }}
                  />
                  <Button size="sm" className="h-8 gap-1.5" disabled={!draft.trim()} onClick={() => { onAddComment(issue, draft.trim()); setDraft("") }}>
                    <Send className="h-3.5 w-3.5" />Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {[...issue.activity].sort((a, b) => a.at.localeCompare(b.at)).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">{ACT_ICON[a.kind]}</span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-foreground/80">{a.detail}</p>
                      <p className="text-[10px]">{a.actor} · {fmtDateTime(a.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── The page ──────────────────────────────────────────────────────────────────
const SORT_FIELDS = [
  { id: "severity", label: "Severity" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created At" },
  { id: "updatedAt", label: "Updated At" },
  { id: "resolvedAt", label: "Resolved At" },
  { id: "closedAt", label: "Closed At" },
]

function sortVal(r: ProjectIssue, key: string): string | number {
  switch (key) {
    case "severity": return PROP_ISSUE_SEVERITIES.indexOf(r.severity)
    case "status": return PROP_ISSUE_STATUSES.indexOf(r.status)
    case "createdAt": return r.createdAt
    case "updatedAt": return r.updatedAt
    case "resolvedAt": return r.resolvedAt ?? ""
    case "closedAt": return r.closedAt ?? ""
    default: return ""
  }
}

const DEV_OPTIONS = PROJECT_DEVELOPERS.map((d) => d.name)
const PROJ_OPTIONS = Array.from(new Set(PROJECTS.map((p) => p.name))).sort()

export function ProjectIssuesPage() {
  const [version, setVersion] = useState(0)
  const issues = useMemo(() => [...PROJECT_ISSUES], [version])
  const patchIssue = (iss: ProjectIssue, patch: Partial<ProjectIssue>) => {
    for (const s of PROJECT_ISSUES) if (s.id === iss.id) Object.assign(s, patch)
    setVersion((v) => v + 1)
    setTrackIssue((cur) => (cur && cur.id === iss.id ? { ...cur, ...patch } : cur))
  }

  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [severityF, setSeverityF] = useState<string[]>([])
  const [sourceF, setSourceF] = useState<string[]>([])
  const [fieldF, setFieldF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [devF, setDevF] = useState<string[]>([])
  const [projF, setProjF] = useState<string[]>([])
  const [reporterF, setReporterF] = useState<string[]>([])
  const [assigneeF, setAssigneeF] = useState<string[]>([])
  const [createdR, setCreatedR] = useState({ from: "", to: "" })
  const [updatedR, setUpdatedR] = useState({ from: "", to: "" })
  const [sorts, setSorts] = useState<SortLevel[]>([{ field: "createdAt", dir: "desc" }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [trackIssue, setTrackIssue] = useState<ProjectIssue | null>(null)

  const inRange = (v: string | null, r: { from: string; to: string }) => {
    if (!r.from && !r.to) return true
    if (!v) return false
    if (r.from && v < r.from) return false
    if (r.to && v > r.to) return false
    return true
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = issues.filter((r) => {
      if (needle && ![r.id, r.description, r.project.name, r.project.id, r.developer.name].some((x) => x.toLowerCase().includes(needle))) return false
      if (statusF.length && !statusF.includes(r.status)) return false
      if (severityF.length && !severityF.includes(r.severity)) return false
      if (sourceF.length && !sourceF.includes(r.source)) return false
      if (fieldF.length && !fieldF.includes(r.fieldLabel)) return false
      if (typeF.length && !typeF.includes(r.type)) return false
      if (devF.length && !devF.includes(r.developer.name)) return false
      if (projF.length && !projF.includes(r.project.name)) return false
      if (reporterF.length && !reporterF.includes(r.reportedBy)) return false
      if (assigneeF.length && !assigneeF.includes(r.assignedTo ?? "Unassigned")) return false
      if (!inRange(r.createdAt, createdR)) return false
      if (!inRange(r.updatedAt, updatedR)) return false
      return true
    })
    return [...rows].sort((a, b) => {
      for (const s of sorts) {
        const av = sortVal(a, s.field), bv = sortVal(b, s.field)
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [issues, q, statusF, severityF, sourceF, fieldF, typeF, devF, projF, reporterF, assigneeF, createdR, updatedR, sorts])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const stats = useMemo(() => ({
    total: issues.length,
    todo: issues.filter((i) => i.status === "To Do").length,
    inProgress: issues.filter((i) => i.status === "In Progress").length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
    closed: issues.filter((i) => i.status === "Closed").length,
    invalid: issues.filter((i) => i.status === "Invalid").length,
  }), [issues])

  const activeFilterCount =
    [statusF, severityF, sourceF, fieldF, typeF, devF, projF, reporterF, assigneeF].filter((f) => f.length > 0).length +
    (createdR.from || createdR.to ? 1 : 0) + (updatedR.from || updatedR.to ? 1 : 0)

  const bulkApply = (fn: (iss: ProjectIssue) => Partial<ProjectIssue>, label: string) => {
    const targets = filtered.filter((r) => selected.has(r.id))
    targets.forEach((t) => patchIssue(t, fn(t)))
    setSelected(new Set())
    toast.success(`${targets.length} issue${targets.length !== 1 ? "s" : ""} — ${label}`)
  }

  const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={cn("whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", COL_SEP, right && "text-right")}>{children}</th>
  )
  const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={cn("px-3 py-2 align-middle", COL_SEP, className)}>{children}</td>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects Data Issues</h1>
          <p className="text-sm text-muted-foreground">Issue tracking for project data — reported by the quality team, sales agents, or raised automatically by validation rules</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Total Issues" value={stats.total} />
          <StatCard icon={<CircleDot className="h-3.5 w-3.5 text-gray-500" />} label="To Do" value={stats.todo} total={stats.total} />
          <StatCard icon={<Loader2 className="h-3.5 w-3.5 text-amber-500" />} label="In Progress" value={stats.inProgress} total={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />} label="Resolved" value={stats.resolved} total={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} label="Closed" value={stats.closed} total={stats.total} />
          <StatCard icon={<XCircle className="h-3.5 w-3.5 text-red-500" />} label="Invalid" value={stats.invalid} total={stats.total} />
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Search by issue ID, description, project or developer"
          hideAdvanced
          activeFilters={activeFilterCount}
          filters={
            <>
              <FilterMultiSelect label="Developer" value={devF} options={DEV_OPTIONS} onChange={(v) => { setDevF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Project" value={projF} options={PROJ_OPTIONS} onChange={(v) => { setProjF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-32" />
              <FilterMultiSelect label="Severity" value={severityF} options={PROP_ISSUE_SEVERITIES} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-32" />
              <FilterMultiSelect label="Reported By Type" value={sourceF} options={PROP_ISSUE_SOURCES} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Issue Category" value={fieldF} options={PROJECT_ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Issue Type" value={typeF} options={ALL_PROJECT_ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-34" />
              <FilterMultiSelect label="Reported By" value={reporterF} options={ALL_REPORTERS} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-36" />
              <DateRangeFilter label="Created At" dateFrom={createdR.from} dateTo={createdR.to} onChangeFrom={(v) => { setCreatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setCreatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
              <DateRangeFilter label="Updated At" dateFrom={updatedR.from} dateTo={updatedR.to} onChangeFrom={(v) => { setUpdatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setUpdatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
            </>
          }
          sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
        />

        <TableCard>
          <TableCardHeader title="Issues" count={filtered.length} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className={cn("sticky left-0 z-10 w-10 bg-muted/50 px-3 py-2", COL_SEP)}>
                    <Checkbox
                      className="h-4 w-4"
                      checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const n = new Set(prev)
                          pageRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)))
                          return n
                        })
                      }}
                    />
                  </th>
                  <Th>Issue ID</Th>
                  <Th>Reported By Type</Th>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th>Issue Category</Th>
                  <Th>Issue Type</Th>
                  <Th>Description</Th>
                  <Th>Expected Result</Th>
                  <Th>Reported By</Th>
                  <Th>Assigned To</Th>
                  <Th>Developer</Th>
                  <Th>Project</Th>
                  <Th>Listing Status</Th>
                  <Th>Primary Status</Th>
                  <Th>Entry Type</Th>
                  <Th>Created At</Th>
                  <Th>Updated At</Th>
                  <th className="sticky right-0 z-10 w-12 bg-muted/50" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((r) => (
                  <tr key={r.id} className="group bg-card transition-colors hover:bg-muted/40">
                    <td className={cn("sticky left-0 z-10 w-10 bg-card px-3 py-2 transition-colors group-hover:bg-muted/40", COL_SEP)}>
                      <Checkbox
                        className="h-4 w-4"
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => setSelected((prev) => { const n = new Set(prev); v ? n.add(r.id) : n.delete(r.id); return n })}
                      />
                    </td>
                    <Td><span className="whitespace-nowrap font-mono text-[10px]">{r.id}</span></Td>
                    <Td><span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS[r.source])}>{r.source}</span></Td>
                    <Td><span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[r.severity])}>{r.severity}</span></Td>
                    <Td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button><StatusTag status={r.status} chevron /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          {PROP_ISSUE_STATUSES.filter((s) => s !== r.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => patchIssue(r, statusPatch(r, s))}>
                              <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                    <Td><ColorTag value={r.fieldLabel} /></Td>
                    <Td><ColorTag value={r.type} /></Td>
                    <Td><span className="block max-w-[260px] truncate text-xs text-muted-foreground" title={r.description}>{r.description}</span></Td>
                    <Td><span className="block max-w-[180px] truncate text-xs text-foreground" title={r.expected ?? undefined}>{r.expected ?? "—"}</span></Td>
                    <Td><PersonCell name={r.reportedBy} muted /></Td>
                    <Td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="rounded px-1 py-0.5 hover:bg-muted"><PersonCell name={r.assignedTo} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto">
                          {ALL_PEOPLE.map((p) => (
                            <DropdownMenuItem key={p} onClick={() => patchIssue(r, assigneePatch(r, p))}>{p}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => patchIssue(r, assigneePatch(r, null))}>Unassigned</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                    <Td><span className="whitespace-nowrap text-xs text-foreground">{r.developer.name}</span></Td>
                    <Td>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs font-medium text-foreground">{r.project.name}</span>
                        <ColorTag value={r.projectLevel} />
                      </span>
                    </Td>
                    <Td><ColorTag value={r.listingStatus} /></Td>
                    <Td><ColorTag value={r.primaryStatus} /></Td>
                    <Td><ColorTag value={r.entryType} /></Td>
                    <Td><span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{fmtDateTime(r.createdAt)}</span></Td>
                    <Td><span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{fmtDateTime(r.updatedAt)}</span></Td>
                    <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0 transition-colors group-hover:bg-muted/40">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-full w-12 items-center justify-center py-2 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setTrackIssue(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => patchIssue(r, assigneePatch(r, "Ezz H."))}><UserRound className="mr-2 h-3.5 w-3.5" />Assign to Me</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => patchIssue(r, statusPatch(r, "Resolved"))}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Mark Resolved</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => patchIssue(r, statusPatch(r, "Closed"))}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Close</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => patchIssue(r, statusPatch(r, "Invalid"))}><XCircle className="mr-2 h-3.5 w-3.5" />Mark Invalid</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={19} className="px-4 py-12 text-center text-sm text-muted-foreground">No issues match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="issues" />
        </TableCard>

        <FloatingBulkBar
          count={selected.size}
          total={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((r) => r.id)))}
          onClear={() => setSelected(new Set())}
        >
          <BulkBarButton onClick={() => bulkApply((t) => assigneePatch(t, "Ezz H."), "assigned to me")}>Assign to Me</BulkBarButton>
          <BulkBarButton onClick={() => bulkApply((t) => statusPatch(t, "Resolved"), "marked resolved")}>Mark Resolved</BulkBarButton>
          <BulkBarButton onClick={() => bulkApply((t) => statusPatch(t, "Closed"), "closed")}>Close</BulkBarButton>
        </FloatingBulkBar>

        <ProjectIssueDrawer
          issue={trackIssue}
          list={filtered}
          onStep={setTrackIssue}
          onClose={() => setTrackIssue(null)}
          onSetStatus={(iss, s) => patchIssue(iss, statusPatch(iss, s))}
          onSetAssignee={(iss, p) => patchIssue(iss, assigneePatch(iss, p))}
          onAddComment={(iss, text) => {
            const now = new Date().toISOString()
            patchIssue(iss, { comments: [...iss.comments, { id: `PCM-N${now}`, author: "Ezz H.", text, at: now }], updatedAt: now })
          }}
        />
      </div>
    </div>
  )
}

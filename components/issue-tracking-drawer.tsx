"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, Clock, MessageSquare, Send, UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IdTag } from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { ViewPropertyDrawer, type PropertyRow } from "@/components/all-properties-page"
import {
  PROP_ISSUE_STATUSES, STATUS_COLORS, SEVERITY_COLORS, SOURCE_COLORS, ALL_PEOPLE, openIssuesFor,
  type PropertyIssue, type PropIssueStatus, type IssueActivity,
} from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

// ── Patch helpers — hosts apply these to their issue stores ───────────────────
let actSeq = 0
const actId = () => `ACT-N${++actSeq}`

/** Status change patch incl. timestamps + an activity log entry. */
export function statusPatch(iss: PropertyIssue, next: PropIssueStatus, actor = "Ezz H."): Partial<PropertyIssue> {
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

/** Assignee change patch incl. an activity log entry. */
export function assigneePatch(iss: PropertyIssue, person: string | null, actor = "Ezz H."): Partial<PropertyIssue> {
  const now = new Date().toISOString()
  return {
    assignedTo: person,
    updatedAt: now,
    activity: [...iss.activity, { id: actId(), kind: "assigned" as const, actor, at: now, detail: person ? `Assigned to ${person}` : "Unassigned" }],
  }
}

function StatusTag({ status, chevron }: { status: PropIssueStatus; chevron?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
      {status}
      {chevron && <ChevronDown className="h-3 w-3 opacity-60" />}
    </span>
  )
}

const ACT_ICON: Record<IssueActivity["kind"], React.ReactNode> = {
  created: <CirclePlus className="h-3 w-3" />,
  status: <Clock className="h-3 w-3" />,
  assigned: <UserRound className="h-3 w-3" />,
}

/**
 * The single issue drawer: Issue Details | Logs & Comments | the unit details
 * panel (embedded, compact). No second drawer — the property is always the
 * third pane, with a switcher for every open issue on the same unit.
 */
export function IssueTrackingDrawer({
  issue, list, unit, onStep, onClose, onSetStatus, onSetAssignee, onAddComment,
}: {
  issue: PropertyIssue | null
  /** Optional prev/next context (e.g. the filtered Data Issues list). */
  list?: PropertyIssue[]
  unit: PropertyRow | null
  onStep: (next: PropertyIssue) => void
  onClose: () => void
  onSetStatus: (issue: PropertyIssue, s: PropIssueStatus) => void
  onSetAssignee: (issue: PropertyIssue, p: string | null) => void
  onAddComment: (issue: PropertyIssue, text: string) => void
}) {
  const [draft, setDraft] = useState("")

  // All open issues on this unit — switcher between them (self plus siblings).
  const unitIssues = useMemo(() => {
    if (!issue) return []
    const open = openIssuesFor(issue.propertyId)
    return open.some((i) => i.id === issue.id) ? open : [issue, ...open]
  }, [issue])

  if (!issue) return null
  const idx = list ? list.findIndex((r) => r.id === issue.id) : -1

  const Field = ({ label, value, span }: { label: string; value: React.ReactNode; span?: 2 }) => (
    <div className={cn("space-y-0.5", span === 2 && "col-span-2")}>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  )

  // Merged feed: activity rows + comment bubbles, chronological
  const feed = [
    ...issue.activity.map((a) => ({ kind: "act" as const, at: a.at, act: a })),
    ...issue.comments.map((c) => ({ kind: "cmt" as const, at: c.at, cmt: c })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  // Embedded unit panel highlights: every open-issue field on this unit
  const highlightFields = Object.fromEntries(unitIssues.map((i) => [i.fieldLabel, i.severity]))
  const highlightTooltips = Object.fromEntries(
    unitIssues.map((i) => [i.fieldLabel, `${i.type}${i.subtype ? ` — ${i.subtype}` : ""} (${i.id}) — click to open`]),
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[1380px] !max-w-[97vw] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex min-w-0 items-center gap-2.5">
              <SheetTitle className="text-base font-semibold">Issue</SheetTitle>
              <IdTag value={issue.id} />
              <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SOURCE_COLORS[issue.source])}>{issue.source}</span>
              <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[issue.severity])}>{issue.severity}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button><StatusTag status={issue.status} chevron /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {PROP_ISSUE_STATUSES.filter((s) => s !== issue.status).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => onSetStatus(issue, s)}>
                      <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <UserRound className="h-3 w-3" />{issue.assignedTo ?? "Unassigned"}<ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 w-44 overflow-y-auto">
                  {ALL_PEOPLE.map((p) => (
                    <DropdownMenuItem key={p} onClick={() => onSetAssignee(issue, p)}>{p}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSetAssignee(issue, null)}>Unassigned</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {idx >= 0 && list && list.length > 1 && (
                <div className="ml-1 flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => onStep(list[idx - 1])}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="px-1 text-xs tabular-nums text-muted-foreground">{idx + 1}/{list.length.toLocaleString()}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx >= list.length - 1} onClick={() => onStep(list[idx + 1])}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* 3 panes: issue details | logs & comments | the unit itself */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,340px)_minmax(290px,330px)_1fr] divide-x divide-border">
          {/* Pane 1 — issue details */}
          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <SectionTitle>Classification</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Category (Field)" value={<ColorTag value={issue.fieldLabel} />} />
                <Field label="Type" value={<ColorTag value={issue.type} />} />
                <Field label="Subtype" value={issue.subtype ? <ColorTag value={issue.subtype} /> : null} />
                <Field label="Reported By" value={<div><p>{issue.reportedBy}</p><p className="text-[10px] text-muted-foreground">{issue.source}</p></div>} />
              </dl>
            </div>

            <div className="space-y-3">
              <SectionTitle>Description</SectionTitle>
              <p className="text-sm leading-relaxed text-foreground">{issue.description}</p>
              {issue.linkedItems && issue.linkedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {issue.linkedItems.map((x) => <ColorTag key={x} value={x} />)}
                </div>
              )}
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
                  <p className="text-[11px] leading-snug text-muted-foreground">Issues auto-move to Resolved when the field value matches the expected result after an update.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <SectionTitle>Linked Records</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Developer" value={<div><p>{issue.developer.name}</p><IdTag value={issue.developer.id} /></div>} />
                <Field label="Project" value={<div><p>{issue.project.name}</p><IdTag value={issue.project.id} /></div>} />
                <Field label="Phase" value={issue.phase ? <div><p>{issue.phase.name}</p><IdTag value={issue.phase.id} /></div> : null} />
                <Field label="Property ID" value={<IdTag value={issue.propertyId} />} />
              </dl>
            </div>

            <div className="space-y-3">
              <SectionTitle>Timeline</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Created At" value={fmtDateTime(issue.createdAt)} />
                <Field label="Updated At" value={fmtDateTime(issue.updatedAt)} />
                <Field label="Resolved At" value={issue.resolvedAt ? fmtDateTime(issue.resolvedAt) : null} />
                <Field label="Closed At" value={issue.closedAt ? fmtDateTime(issue.closedAt) : null} />
              </dl>
            </div>
          </div>

          {/* Pane 2 — logs & comments (one chronological feed) */}
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold text-foreground">Logs & Comments</p>
              <p className="text-[11px] text-muted-foreground">
                {issue.activity.length} event{issue.activity.length !== 1 ? "s" : ""} · {issue.comments.length} comment{issue.comments.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
              {feed.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
              {feed.map((f) =>
                f.kind === "act" ? (
                  <div key={f.act.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">{ACT_ICON[f.act.kind]}</span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-foreground/80">{f.act.detail}</p>
                      <p className="text-[10px]">{f.act.actor} · {fmtDateTime(f.act.at)}</p>
                    </div>
                  </div>
                ) : (
                  <div key={f.cmt.id} className="flex gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {f.cmt.author.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="flex items-center gap-1 text-xs font-semibold text-foreground"><MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />{f.cmt.author}</p>
                        <p className="shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(f.cmt.at)}</p>
                      </div>
                      <p className="mt-0.5 rounded-lg rounded-tl-none border border-border bg-muted/40 px-2.5 py-1.5 text-sm leading-snug text-foreground">{f.cmt.text}</p>
                    </div>
                  </div>
                ),
              )}
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
          </div>

          {/* Pane 3 — the property itself (compact unit details panel) */}
          <div className="flex min-h-0 flex-col">
            {/* Open-issues-on-this-unit switcher */}
            <div className="shrink-0 border-b border-border bg-muted/40 px-4 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {unitIssues.length} open issue{unitIssues.length !== 1 ? "s" : ""} on this property
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unitIssues.map((i) => {
                  const active = i.id === issue.id
                  return (
                    <button
                      key={i.id}
                      onClick={() => onStep(i)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        SEVERITY_COLORS[i.severity],
                        active ? "ring-2 ring-primary/50" : "opacity-75 hover:opacity-100",
                      )}
                      title={`${i.fieldLabel} — ${i.type} (${i.status})`}
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {i.fieldLabel}
                      <span className="font-mono opacity-70">{i.id.slice(-4)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              {unit ? (
                <ViewPropertyDrawer
                  row={unit}
                  defaultTab="unit-details"
                  onClose={() => {}}
                  onUpdateRow={() => {}}
                  embedded
                  highlightFields={highlightFields}
                  highlightTooltips={highlightTooltips}
                  onIssueFieldClick={(label) => {
                    const target = unitIssues.find((i) => i.fieldLabel === label)
                    if (target) onStep(target)
                  }}
                />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Unit not found in the current mock rows.</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

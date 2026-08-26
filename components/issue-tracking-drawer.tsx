"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, Clock, MessageSquare, ScrollText, Send, UserRound, X,
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

// Mock plan universe (matches unitPlans in report-issue-drawer + the plans tab
// card order) — issue plan names resolve to plan-card indices for highlighting.
const PLAN_ORDER = ["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"]
/** "Render 3" / "Floor Plan 1" → 0-based media index. */
const mediaIdx = (m: string) => (parseInt(m.replace(/\D/g, ""), 10) || 0) - 1

/**
 * The single issue drawer: Issue Details | Comments/Logs | the unit details
 * panel (embedded, width-constrained). All open issues on the property live in
 * an overlay panel toggled from the header.
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
  const [midTab, setMidTab] = useState<"comments" | "logs">("comments")
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(false)

  // All open issues on this unit — the switcher overlay (self plus siblings).
  const unitIssues = useMemo(() => {
    if (!issue) return []
    const open = openIssuesFor(issue.propertyId)
    return open.some((i) => i.id === issue.id) ? open : [issue, ...open]
  }, [issue])

  // Item-level highlights for the property pane: red rings on the affected plan
  // cards / media / amenities; the current issue's items get the strong ring.
  const itemIssues = useMemo(() => {
    const acc = {
      plans: { indices: [] as number[], focus: [] as number[] },
      images: { indices: [] as number[], focus: [] as number[] },
      floorPlans: { indices: [] as number[], focus: [] as number[] },
      amenities: { names: [] as string[], focus: [] as string[] },
    }
    for (const i of unitIssues) {
      const focus = i.id === issue?.id
      const d = i.details
      if (!d) continue
      d.plans?.forEach((p) => {
        const k = PLAN_ORDER.indexOf(p.name)
        if (k >= 0) { acc.plans.indices.push(k); if (focus) acc.plans.focus.push(k) }
      })
      d.media?.forEach((m) => {
        const k = mediaIdx(m)
        const bucket = m.startsWith("Floor") ? acc.floorPlans : acc.images
        if (k >= 0) { bucket.indices.push(k); if (focus) bucket.focus.push(k) }
      })
      d.amenitiesRemove?.forEach((a) => { acc.amenities.names.push(a); if (focus) acc.amenities.focus.push(a) })
    }
    return acc
  }, [unitIssues, issue?.id])

  if (!issue) return null
  const idx = list ? list.findIndex((r) => r.id === issue.id) : -1

  /** Label/value row — no wrapping/merging: label column fixed, value fills. */
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[105px_1fr] items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground">{children}</span>
    </div>
  )
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  )

  const highlightFields = Object.fromEntries(unitIssues.map((i) => [i.fieldLabel, i.severity]))
  const highlightTooltips = Object.fromEntries(
    unitIssues.map((i) => [i.fieldLabel, `${i.type}${i.subtype ? ` — ${i.subtype}` : ""} (${i.id}) — click to open`]),
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[1400px] !max-w-[97vw] flex-col gap-0 overflow-hidden p-0">
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
              {unitIssues.length > 1 && (
                <Button
                  variant={issuesPanelOpen ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setIssuesPanelOpen((v) => !v)}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {unitIssues.length} issues on this property
                </Button>
              )}
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

        {/* 3 panes: issue details | comments & logs | the unit itself */}
        {/* 30% | 30% | 40% */}
        <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,4fr)] divide-x divide-border">
          {/* Pane 1 — all the main fields of the issue, as in the table */}
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
            </div>

            <div className="space-y-3">
              <SectionTitle>Description</SectionTitle>
              <p className="min-w-0 break-words text-sm leading-relaxed text-foreground">{issue.description}</p>

              {/* Payment plans — the affected plans, with per-field expected + note */}
              {issue.details?.plans && (
                <div className="space-y-2">
                  {issue.details.plans.map((p) => (
                    <div key={p.name} className="min-w-0 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2">
                      <p className="break-words text-xs font-semibold text-foreground">{p.name}</p>
                      {p.fields?.map((f) => (
                        <div key={f.field} className="mt-1.5 min-w-0 space-y-0.5 border-t border-red-200/60 pt-1.5">
                          <p className="break-words text-[11px]">
                            <span className="font-medium text-foreground">{f.field}</span>
                            {f.expected && <span className="font-medium text-emerald-700"> → {f.expected}</span>}
                          </p>
                          {f.note && <p className="break-words text-[11px] leading-snug text-muted-foreground">{f.note}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Amenities — wrong (remove) / missing (add) */}
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

              {/* Wrong renders / floor plans — small image cards */}
              {issue.details?.media && (
                <div className="grid grid-cols-2 gap-2">
                  {issue.details.media.map((m) => {
                    const k = mediaIdx(m)
                    const src = m.startsWith("Floor") ? unit?.floorPlans[k] : unit?.images[k]
                    return (
                      <div key={m} className="min-w-0 overflow-hidden rounded-lg border border-red-300">
                        {src
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={src} alt={m} className="aspect-video w-full object-cover" />
                          : <div className="flex aspect-video w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">No preview</div>}
                        <p className="truncate bg-card px-2 py-1 text-[10px] font-medium text-foreground">{m}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Fallback — older issues without a structured payload */}
              {!issue.details && issue.linkedItems && issue.linkedItems.length > 0 && (
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

            <div className="space-y-2.5">
              <SectionTitle>Timeline</SectionTitle>
              <Row label="Created At">{fmtDateTime(issue.createdAt)}</Row>
              <Row label="Updated At">{fmtDateTime(issue.updatedAt)}</Row>
              <Row label="Resolved At">{issue.resolvedAt ? fmtDateTime(issue.resolvedAt) : <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Closed At">{issue.closedAt ? fmtDateTime(issue.closedAt) : <span className="text-muted-foreground">—</span>}</Row>
            </div>
          </div>

          {/* Pane 2 — comments | logs tabs */}
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
                {issue.activity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
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

          {/* Pane 3 — the property itself (embedded unit details, width-safe) */}
          <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
            {unit ? (
              <ViewPropertyDrawer
                row={unit}
                defaultTab="unit-details"
                onClose={() => {}}
                onUpdateRow={() => {}}
                embedded
                highlightFields={highlightFields}
                highlightFocusField={issue.fieldLabel}
                highlightTooltips={highlightTooltips}
                itemIssues={itemIssues}
                onIssueFieldClick={(label) => {
                  const target = unitIssues.find((i) => i.fieldLabel === label)
                  if (target) onStep(target)
                }}
              />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Unit not found in the current mock rows.</p>
            )}

            {/* Open-issues overlay panel */}
            {issuesPanelOpen && (
              <div className="absolute inset-y-0 right-0 z-30 flex w-80 flex-col border-l border-border bg-card shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
                  <p className="text-sm font-semibold text-foreground">Open issues on this property</p>
                  <button onClick={() => setIssuesPanelOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                  {unitIssues.map((i) => {
                    const active = i.id === issue.id
                    return (
                      <button
                        key={i.id}
                        onClick={() => { onStep(i); setIssuesPanelOpen(false) }}
                        className={cn("block w-full space-y-1 px-4 py-2.5 text-left transition-colors", active ? "bg-primary/5" : "hover:bg-muted/50")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-foreground")}>{i.fieldLabel}</span>
                          <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", SEVERITY_COLORS[i.severity])}>{i.severity}</span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{i.type}{i.subtype ? ` — ${i.subtype}` : ""}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", STATUS_COLORS[i.status])}>{i.status}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
                          {active && <span className="text-[10px] font-medium text-primary">· viewing</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

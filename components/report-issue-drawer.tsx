"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Check, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { IdTag } from "@/components/table-kit"
import type { PropertyRow } from "@/components/all-properties-page"
import {
  ISSUE_FIELDS, ISSUE_FIELD_GROUPS, fieldTaxonomy, PLAN_ASPECTS, DATA_OPS_TEAM, SEVERITY_COLORS, STATUS_COLORS,
  addPropertyIssues, nextIssueId, isCriticalSeverity,
  type IssueField, type IssueTypeDef, type PropertyIssue,
} from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

// ── Open-issues badge for property rows/cards (popover lists the open issues) ──
// Lives here (not data-issues-page) so all-properties can import it without a
// runtime import cycle.
export function RowIssuesBadge({ issues, compact, onOpenIssue }: { issues: PropertyIssue[]; compact?: boolean; /** Makes each listed issue clickable (opens the tracking drawer). */ onOpenIssue?: (i: PropertyIssue) => void }) {
  const critical = issues.some((i) => isCriticalSeverity(i.severity))
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            critical ? "border-red-200 bg-red-100 text-red-700" : "border-amber-200 bg-amber-100 text-amber-700",
          )}
          title={`${issues.length} open issue${issues.length !== 1 ? "s" : ""}`}
        >
          <AlertTriangle className="h-3 w-3" />
          {issues.length}{!compact && <span className="font-medium"> issue{issues.length !== 1 ? "s" : ""}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0" onClick={(e) => e.stopPropagation()}>
        <p className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
          {issues.length} open issue{issues.length !== 1 ? "s" : ""}
        </p>
        <div className="max-h-64 divide-y divide-border overflow-y-auto">
          {issues.map((i) => (
            <div
              key={i.id}
              className={cn("space-y-1 px-3 py-2", onOpenIssue && "cursor-pointer hover:bg-muted/50")}
              onClick={onOpenIssue ? () => onOpenIssue(i) : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{i.fieldLabel}</span>
                <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", SEVERITY_COLORS[i.severity])}>{i.severity}</span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground" title={i.description}>{i.type} · {i.subtype}</p>
              <div className="flex items-center gap-1.5">
                <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", STATUS_COLORS[i.status])}>{i.status}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FieldDraft {
  type: string
  subtype: string | null
  expected: string
  items: string[] // floor plans / renders / duplicate plans selection
  planAspects: Record<string, string[]> // payment plans: plan name → aspects with issues
}

function emptyDraft(field: IssueField): FieldDraft {
  const t = fieldTaxonomy(field)[0]
  return { type: t.type, subtype: t.subtypes?.[0] ?? null, expected: "", items: [], planAspects: {} }
}

/** The unit's current value for a field, formatted for display + issue context. */
function currentValue(row: PropertyRow, field: IssueField): string {
  if (field.id === "developer") return row.developer.name
  if (field.id === "project") return row.project.name
  if (field.id === "phase") return row.phase?.name ?? "—"
  if (field.kind === "plans") return `${row.paymentPlans} plan${row.paymentPlans !== 1 ? "s" : ""}`
  if (field.kind === "floorPlans") return `${row.floorPlans.length} file${row.floorPlans.length !== 1 ? "s" : ""}`
  if (field.kind === "images") return `${row.images.length} image${row.images.length !== 1 ? "s" : ""}`
  const v = (row as unknown as Record<string, unknown>)[field.id]
  if (v == null || v === "") return "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (typeof v === "number") return v.toLocaleString()
  return String(v)
}

// Same derivation as the unit drawer's payment-plan cards, so the picker shows
// the unit's actual plans (mock).
function planOptions(row: PropertyRow) {
  return Array.from({ length: Math.max(row.paymentPlans, 0) }, (_, i) => ({
    name: ["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"][i % 4],
    downPayment: [10, 15, 20, 25][i % 4],
    installmentPct: [5, 4, 3, 5][i % 4],
    duration: [60, 48, 72, 36][i % 4],
  }))
}

let assignSeq = 0 // round-robin auto-assignment to data ops (mock)

export function ReportIssueDrawer({
  row, onClose, onSubmitted,
}: {
  row: PropertyRow | null
  onClose: () => void
  onSubmitted?: (issues: PropertyIssue[]) => void
}) {
  const [q, setQ] = useState("")
  const [drafts, setDrafts] = useState<Map<string, FieldDraft>>(new Map())

  const visibleFields = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? ISSUE_FIELDS.filter((f) => f.label.toLowerCase().includes(needle)) : ISSUE_FIELDS
  }, [q])

  if (!row) return null

  const toggleField = (field: IssueField, on: boolean) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      if (on) n.set(field.id, emptyDraft(field)); else n.delete(field.id)
      return n
    })
  const patchDraft = (fieldId: string, patch: Partial<FieldDraft>) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) n.set(fieldId, { ...cur, ...patch })
      return n
    })
  const toggleItem = (fieldId: string, item: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const items = cur.items.includes(item) ? cur.items.filter((x) => x !== item) : [...cur.items, item]
        n.set(fieldId, { ...cur, items })
      }
      return n
    })
  const togglePlanAspect = (fieldId: string, plan: string, aspect: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const aspects = cur.planAspects[plan] ?? []
        const next = aspects.includes(aspect) ? aspects.filter((a) => a !== aspect) : [...aspects, aspect]
        const planAspects = { ...cur.planAspects }
        if (next.length) planAspects[plan] = next; else delete planAspects[plan]
        n.set(fieldId, { ...cur, planAspects })
      }
      return n
    })
  const togglePlan = (fieldId: string, plan: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const planAspects = { ...cur.planAspects }
        if (plan in planAspects) delete planAspects[plan]
        else planAspects[plan] = []
        n.set(fieldId, { ...cur, planAspects })
      }
      return n
    })

  const typeDefOf = (field: IssueField, d: FieldDraft): IssueTypeDef =>
    fieldTaxonomy(field).find((t) => t.type === d.type) ?? fieldTaxonomy(field)[0]

  // Selection-requiring types must have their items / plan aspects picked
  const invalids = [...drafts.entries()].filter(([fieldId, d]) => {
    const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
    const def = typeDefOf(field, d)
    if (!def.requiresSelection) return false
    if (field.kind === "plans" && def.type === "Plan Terms Issue")
      return Object.keys(d.planAspects).length === 0 || Object.values(d.planAspects).every((a) => a.length === 0)
    return field.kind === "plans" ? d.items.length === 0 && Object.keys(d.planAspects).length === 0 : d.items.length === 0
  })

  const submit = () => {
    if (drafts.size === 0) return
    const now = new Date().toISOString()
    const created: PropertyIssue[] = [...drafts.entries()].map(([fieldId, d]) => {
      const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
      const def = typeDefOf(field, d)
      const assignedTo = DATA_OPS_TEAM[assignSeq++ % DATA_OPS_TEAM.length] // auto-assignment
      // Linked items: plans carry their per-plan aspect annotations
      const linkedItems =
        field.kind === "plans" && def.type === "Plan Terms Issue"
          ? Object.entries(d.planAspects).map(([plan, aspects]) => `${plan} (${aspects.join(", ")})`)
          : d.items.length ? d.items : null
      return {
        id: nextIssueId(),
        source: "Data Quality",
        severity: def.priority, // inherits the type's configured priority
        status: "To Do",
        fieldId: field.id,
        fieldLabel: field.label,
        type: def.type,
        subtype: d.subtype,
        description: `${field.label} — ${def.type.toLowerCase()}${d.subtype ? `: ${d.subtype.toLowerCase()}` : ""}${d.expected.trim() ? ` — ${d.expected.trim()}` : ""}`,
        expected: d.expected.trim() || null,
        current: currentValue(row, field),
        linkedItems,
        reportedBy: "Ezz H.",
        assignedTo,
        developer: { id: row.developer.id, name: row.developer.name },
        project: { id: row.project.id, name: row.project.name },
        phase: row.phase ? { id: row.phase.id, name: row.phase.name } : null,
        propertyId: row.propertyId,
        detailedPropertyId: row.detailedPropertyId ?? `DP-${row.propertyId.slice(-4)}`,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
        closedAt: null,
        comments: [],
        activity: [{ id: `ACT-${now}-${field.id}`, kind: "created", actor: "Ezz H.", at: now, detail: "Issue created — To Do" }],
      }
    })
    addPropertyIssues(created)
    toast.success(`${created.length} issue${created.length !== 1 ? "s" : ""} reported and auto-assigned`)
    onSubmitted?.(created)
    onClose()
  }

  /** Item picker for floor plans / renders (only when the type requires it). */
  const ThumbPicker = ({ field, draft }: { field: IssueField; draft: FieldDraft }) => {
    const srcs = field.kind === "floorPlans" ? row.floorPlans : row.images
    const label = field.kind === "floorPlans" ? "Floor Plan" : "Render"
    if (srcs.length === 0) return <p className="text-xs text-muted-foreground">Nothing uploaded on this unit — use a "missing" type instead.</p>
    return (
      <div className="grid grid-cols-3 gap-2">
        {srcs.map((s, i) => {
          const name = `${label} ${i + 1}`
          const on = draft.items.includes(name)
          return (
            <button
              key={name}
              onClick={() => toggleItem(field.id, name)}
              className={cn(
                "group relative overflow-hidden rounded-lg border transition-all",
                on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-muted-foreground/40",
              )}
            >
              {on && (
                <span className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s || "/placeholder.svg"} alt={name} className="h-16 w-full object-cover" />
              <span className="block bg-card px-1.5 py-1 text-left text-[10px] font-medium text-foreground">{name}</span>
            </button>
          )
        })}
      </div>
    )
  }

  /** Payment plans: select plan(s), then per-plan which aspects have issues. */
  const PlanTermsPicker = ({ field, draft }: { field: IssueField; draft: FieldDraft }) => {
    const plans = planOptions(row)
    if (plans.length === 0) return <p className="text-xs text-muted-foreground">No payment plans on this unit — use "Missing Plan" instead.</p>
    return (
      <div className="space-y-2">
        {plans.map((pl) => {
          const on = pl.name in draft.planAspects
          const aspects = draft.planAspects[pl.name] ?? []
          return (
            <div key={pl.name} className={cn("rounded-lg border transition-colors", on ? "border-primary bg-primary/5" : "border-border bg-card")}>
              <button onClick={() => togglePlan(field.id, pl.name)} className="flex w-full items-center justify-between px-2.5 py-2 text-left">
                <span>
                  <span className="text-xs font-semibold text-foreground">{pl.name}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">DP {pl.downPayment}% · {pl.duration} mo · {pl.installmentPct}%/mo</span>
                </span>
                {on && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
              </button>
              {on && (
                <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-2.5 py-2">
                  {PLAN_ASPECTS.map((a) => {
                    const sel = aspects.includes(a)
                    return (
                      <button
                        key={a}
                        onClick={() => togglePlanAspect(field.id, pl.name, a)}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                          sel ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {a}
                      </button>
                    )
                  })}
                  {aspects.length === 0 && <span className="text-[10px] text-red-600">Pick what's wrong with this plan</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /** Duplicate plan: just pick the duplicated plan(s). */
  const PlanSelectPicker = ({ field, draft }: { field: IssueField; draft: FieldDraft }) => {
    const plans = planOptions(row)
    if (plans.length === 0) return <p className="text-xs text-muted-foreground">No payment plans on this unit.</p>
    return (
      <div className="grid grid-cols-2 gap-2">
        {plans.map((pl) => {
          const on = draft.items.includes(pl.name)
          return (
            <button
              key={pl.name}
              onClick={() => toggleItem(field.id, pl.name)}
              className={cn(
                "relative rounded-lg border p-2.5 text-left transition-colors",
                on ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:bg-muted/40",
              )}
            >
              {on && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <p className="pr-5 text-xs font-semibold text-foreground">{pl.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">DP {pl.downPayment}% · {pl.duration} mo · {pl.installmentPct}%/mo</p>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[600px] !max-w-[93vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-base font-semibold">Report an Issue</SheetTitle>
          <div className="flex items-center gap-2">
            <IdTag value={row.propertyId} />
            <span className="text-xs text-muted-foreground">{row.project.name}{row.phase ? ` · ${row.phase.name}` : ""} · {row.developer.name}</span>
          </div>
        </SheetHeader>

        <div className="shrink-0 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fields…" className="h-8 pl-8 pr-7 text-sm" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Check every field that has an issue, classify it, and enter the expected result. One ticket is created per field and auto-assigned to data operations.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {ISSUE_FIELD_GROUPS.map((group) => {
            const fields = visibleFields.filter((f) => f.group === group)
            if (fields.length === 0) return null
            return (
              <div key={group}>
                <p className="sticky top-0 z-10 border-b border-border bg-muted/80 px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{group}</p>
                <div className="divide-y divide-border">
                  {fields.map((field) => {
                    const draft = drafts.get(field.id)
                    const tax = fieldTaxonomy(field)
                    const def = draft ? typeDefOf(field, draft) : tax[0]
                    return (
                      <div key={field.id} className="px-5 py-2.5">
                        <label className="flex cursor-pointer items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5">
                            <Checkbox className="h-4 w-4" checked={!!draft} onCheckedChange={(v) => toggleField(field, !!v)} />
                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                          </span>
                          <span className="max-w-[200px] truncate text-xs text-muted-foreground">{currentValue(row, field)}</span>
                        </label>

                        {draft && (
                          <div className="mt-2.5 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                            {/* Type first — it decides the rest of the flow */}
                            <div className={cn("grid gap-2", def.subtypes ? "grid-cols-2" : "grid-cols-1")}>
                              <div className="space-y-1">
                                <p className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                  Type
                                  <span className={cn("rounded border px-1 py-px text-[9px] font-semibold", SEVERITY_COLORS[def.priority])}>{def.priority}</span>
                                </p>
                                <Select value={draft.type} onValueChange={(v) => {
                                  const t = tax.find((x) => x.type === v) ?? tax[0]
                                  patchDraft(field.id, { type: v, subtype: t.subtypes?.[0] ?? null, items: [], planAspects: {} })
                                }}>
                                  <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {tax.filter((t) => t.active).map((t) => <SelectItem key={t.type} value={t.type} className="text-sm">{t.type}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              {def.subtypes && (
                                <div className="space-y-1">
                                  <p className="text-[11px] font-medium text-muted-foreground">Subtype</p>
                                  <Select value={draft.subtype ?? ""} onValueChange={(v) => patchDraft(field.id, { subtype: v })}>
                                    <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {def.subtypes.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* What exactly — only when this type needs a selection */}
                            {def.requiresSelection && field.kind === "plans" && def.type === "Plan Terms Issue" && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  Select the plan(s), then what's wrong with each
                                  {invalids.some(([id]) => id === field.id) && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                <PlanTermsPicker field={field} draft={draft} />
                              </div>
                            )}
                            {def.requiresSelection && field.kind === "plans" && def.type !== "Plan Terms Issue" && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  Select the affected plan(s)
                                  {invalids.some(([id]) => id === field.id) && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                <PlanSelectPicker field={field} draft={draft} />
                              </div>
                            )}
                            {def.requiresSelection && (field.kind === "floorPlans" || field.kind === "images") && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  Select the {field.label.toLowerCase()} with the issue
                                  {invalids.some(([id]) => id === field.id) && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                <ThumbPicker field={field} draft={draft} />
                              </div>
                            )}

                            {/* Expected result / description */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {field.kind === "value" ? "Expected result" : "Description / expected result"}
                              </p>
                              <Input
                                value={draft.expected}
                                onChange={(e) => patchDraft(field.id, { expected: e.target.value })}
                                placeholder={field.kind === "value" ? `Expected ${field.label.toLowerCase()} (current: ${currentValue(row, field)})` : "Describe the issue / what it should be"}
                                className="h-8 bg-card text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {visibleFields.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No fields match "{q}".</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {drafts.size === 0 ? "No fields selected" : `${drafts.size} issue${drafts.size !== 1 ? "s" : ""} will be created`}
            {invalids.length > 0 && <span className="ml-1 text-red-600">— complete the required selections</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8" disabled={drafts.size === 0 || invalids.length > 0} onClick={submit}>
              Report {drafts.size > 0 ? `${drafts.size} Issue${drafts.size !== 1 ? "s" : ""}` : "Issues"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

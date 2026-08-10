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
  ISSUE_FIELDS, ISSUE_FIELD_GROUPS, KIND_TAXONOMY, DATA_OPS_TEAM, SEVERITY_COLORS, STATUS_COLORS,
  addPropertyIssues, nextIssueId, isCriticalSeverity,
  type IssueField, type PropertyIssue,
} from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

// ── Open-issues badge for property rows/cards (popover lists the open issues) ──
// Lives here (not data-issues-page) so all-properties can import it without a
// runtime import cycle.
export function RowIssuesBadge({ issues, compact }: { issues: PropertyIssue[]; compact?: boolean }) {
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
            <div key={i.id} className="space-y-1 px-3 py-2">
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
  subtype: string
  expected: string
  items: string[] // selected payment plans / floor plans / renders
}

function emptyDraft(field: IssueField): FieldDraft {
  const tax = KIND_TAXONOMY[field.kind]
  return { type: tax[0].type, subtype: tax[0].subtypes[0], expected: "", items: [] }
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

  // Attachment fields need the specific item(s) selected unless it's a "missing" type
  const invalids = [...drafts.entries()].filter(([fieldId, d]) => {
    const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
    return field.kind !== "value" && d.items.length === 0 && !d.type.toLowerCase().includes("missing")
  })

  const submit = () => {
    if (drafts.size === 0) return
    const now = new Date().toISOString()
    const created: PropertyIssue[] = [...drafts.entries()].map(([fieldId, d]) => {
      const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
      const assignedTo = DATA_OPS_TEAM[assignSeq++ % DATA_OPS_TEAM.length] // auto-assignment
      return {
        id: nextIssueId(),
        source: "Data Quality",
        severity: "Medium", // severity is set by triage / scoring config, not the reporter
        status: "To Do",
        fieldId: field.id,
        fieldLabel: field.label,
        type: d.type,
        subtype: d.subtype,
        description: `${field.label} — ${d.type.toLowerCase()}: ${d.subtype.toLowerCase()}`,
        expected: d.expected.trim() || null,
        current: currentValue(row, field),
        linkedItems: d.items.length ? d.items : null,
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
      }
    })
    addPropertyIssues(created)
    toast.success(`${created.length} issue${created.length !== 1 ? "s" : ""} reported and auto-assigned`)
    onSubmitted?.(created)
    onClose()
  }

  /** Per-kind picker for WHAT exactly has the issue. */
  const ItemPicker = ({ field, draft }: { field: IssueField; draft: FieldDraft }) => {
    if (field.kind === "plans") {
      const plans = planOptions(row)
      if (plans.length === 0) return <p className="text-xs text-muted-foreground">No payment plans on this unit — use a "missing" type.</p>
      return (
        <div className="grid grid-cols-2 gap-2">
          {plans.map((p) => {
            const on = draft.items.includes(p.name)
            return (
              <button
                key={p.name}
                onClick={() => toggleItem(field.id, p.name)}
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
                <p className="pr-5 text-xs font-semibold text-foreground">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">DP {p.downPayment}% · {p.duration} mo · {p.installmentPct}%/mo</p>
              </button>
            )
          })}
        </div>
      )
    }
    if (field.kind === "floorPlans" || field.kind === "images") {
      const srcs = field.kind === "floorPlans" ? row.floorPlans : row.images
      const label = field.kind === "floorPlans" ? "Floor Plan" : "Render"
      if (srcs.length === 0) return <p className="text-xs text-muted-foreground">Nothing uploaded on this unit — use a "missing" type.</p>
      return (
        <div className="grid grid-cols-3 gap-2">
          {srcs.map((src, i) => {
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
                <img src={src || "/placeholder.svg"} alt={name} className="h-16 w-full object-cover" />
                <span className="block bg-card px-1.5 py-1 text-left text-[10px] font-medium text-foreground">{name}</span>
              </button>
            )
          })}
        </div>
      )
    }
    return null
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
                    const tax = KIND_TAXONOMY[field.kind]
                    const typeDef = draft ? tax.find((t) => t.type === draft.type) ?? tax[0] : tax[0]
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
                            {/* What exactly has the issue (plans / floor plans / renders) */}
                            {field.kind !== "value" && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  Select the {field.label.toLowerCase()} with the issue
                                  {invalids.some(([id]) => id === field.id) && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                <ItemPicker field={field} draft={draft} />
                              </div>
                            )}
                            {/* Classification */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">Type</p>
                                <Select value={draft.type} onValueChange={(v) => {
                                  const t = tax.find((x) => x.type === v) ?? tax[0]
                                  patchDraft(field.id, { type: v, subtype: t.subtypes[0] })
                                }}>
                                  <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {tax.map((t) => <SelectItem key={t.type} value={t.type} className="text-sm">{t.type}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">Subtype</p>
                                <Select value={draft.subtype} onValueChange={(v) => patchDraft(field.id, { subtype: v })}>
                                  <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {typeDef.subtypes.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {/* Expected result */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium text-muted-foreground">Expected result</p>
                              <Input
                                value={draft.expected}
                                onChange={(e) => patchDraft(field.id, { expected: e.target.value })}
                                placeholder={field.kind === "value" ? `Expected ${field.label.toLowerCase()} (current: ${currentValue(row, field)})` : "What should it be? (helps data ops fix & auto-close)"}
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
            {invalids.length > 0 && <span className="ml-1 text-red-600">— select the affected item(s)</span>}
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

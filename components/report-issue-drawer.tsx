"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Check, Eye, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import { StoryBadge, BADGE_CLASS, type PropertyRow, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import {
  ISSUE_FIELDS, ISSUE_FIELD_GROUPS, fieldTaxonomy, fieldPriority, PLAN_VALUE_FIELDS, PLAN_FIELD_OPTIONS, PHASE_NAMES, AMENITY_LIBRARY, DATA_OPS_TEAM,
  SEVERITY_COLORS, STATUS_COLORS, addPropertyIssues, nextIssueId, isCriticalSeverity,
  type IssueField, type IssueTypeDef, type PropertyIssue, type IssueDetails,
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

interface PlanFieldIssue {
  expected: string
  note: string
}

interface FieldDraft {
  type: string
  subtype: string | null
  expected: string
  description: string
  items: string[] // floor plans / renders / plan selection
  planValues: Record<string, Record<string, PlanFieldIssue>> // plan → plan field → issue data
  addItems: string[] // amenities to add (missing)
  removeItems: string[] // amenities to remove (wrong)
}

/** Does the unit actually hold a value/content for this field? Drives which
 *  issue types are reportable (value present → no "Missing …"; absent → only). */
function fieldHasValue(row: PropertyRow, field: IssueField): boolean {
  if (field.kind === "amenities") return true // add & remove flows both stay valid
  if (field.kind === "plans") return row.paymentPlans > 0
  if (field.kind === "floorPlans") return row.floorPlans.length > 0
  if (field.kind === "images") return row.images.length > 0
  if (field.valueType === "boolean") return true
  const raw = field.id === "developer" ? row.developer.name
    : field.id === "project" ? row.project.name
    : field.id === "phase" ? row.phase?.name ?? null
    : (row as unknown as Record<string, unknown>)[field.id]
  return raw != null && raw !== ""
}

/** Taxonomy filtered by whether the field currently has a value. */
function availableTypes(field: IssueField, row: PropertyRow): IssueTypeDef[] {
  const tax = fieldTaxonomy(field).filter((t) => t.active)
  if (field.kind === "amenities") return tax
  const isMissing = (t: IssueTypeDef) => t.type.startsWith("Missing")
  return fieldHasValue(row, field) ? tax.filter((t) => !isMissing(t)) : tax.filter(isMissing)
}

function emptyDraft(field: IssueField, row: PropertyRow): FieldDraft {
  const t = availableTypes(field, row)[0] ?? fieldTaxonomy(field)[0]
  return { type: t.type, subtype: field.kind === "plans" ? null : t.subtypes?.[0] ?? null, expected: "", description: "", items: [], planValues: {}, addItems: [], removeItems: [] }
}

/** Boolean value mark — same idiom as the detailed properties table. */
function BoolMark({ value }: { value: boolean }) {
  return value
    ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100"><Check className="h-3 w-3 text-emerald-600" /></span>
    : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100"><X className="h-3 w-3 text-red-500" /></span>
}

/** Current value rendered with the same UI conventions as the detailed table. */
function CurrentValue({ row, field }: { row: PropertyRow; field: IssueField }) {
  if (field.kind === "amenities") {
    const n = row.amenities.length + row.services.length
    return <span className="text-xs text-muted-foreground">{n} item{n !== 1 ? "s" : ""}</span>
  }
  if (field.kind === "plans") return <span className="text-xs text-muted-foreground">{row.paymentPlans} plan{row.paymentPlans !== 1 ? "s" : ""}</span>
  if (field.kind === "floorPlans") return <span className="text-xs text-muted-foreground">{row.floorPlans.length} file{row.floorPlans.length !== 1 ? "s" : ""}</span>
  if (field.kind === "images") return <span className="text-xs text-muted-foreground">{row.images.length} image{row.images.length !== 1 ? "s" : ""}</span>
  const raw = field.id === "developer" ? row.developer.name
    : field.id === "project" ? row.project.name
    : field.id === "phase" ? row.phase?.name ?? null
    : (row as unknown as Record<string, unknown>)[field.id]
  if (field.valueType === "boolean") return <BoolMark value={!!raw} />
  if (raw == null || raw === "") return <span className="text-xs text-muted-foreground">—</span>
  if (field.valueType === "currency") return <span className="whitespace-nowrap text-xs font-medium text-foreground">{Number(raw).toLocaleString()} EGP</span>
  if (field.valueType === "area") return <span className="whitespace-nowrap text-xs text-foreground">{String(raw)} m²</span>
  if (field.valueType === "enum" || field.valueType === "phase") {
    const v = String(raw)
    return BADGE_CLASS[v] ? <StoryBadge value={v} /> : <ColorTag value={v} />
  }
  return <span className="max-w-[180px] truncate text-xs text-muted-foreground">{String(raw)}</span>
}

/** Plain-text version of the current value (stored on the issue). */
function currentText(row: PropertyRow, field: IssueField): string {
  if (field.kind === "amenities") return [...row.amenities, ...row.services].join(", ") || "—"
  if (field.kind === "plans") return `${row.paymentPlans} plan${row.paymentPlans !== 1 ? "s" : ""}`
  if (field.kind === "floorPlans") return `${row.floorPlans.length} file${row.floorPlans.length !== 1 ? "s" : ""}`
  if (field.kind === "images") return `${row.images.length} image${row.images.length !== 1 ? "s" : ""}`
  const raw = field.id === "developer" ? row.developer.name
    : field.id === "project" ? row.project.name
    : field.id === "phase" ? row.phase?.name ?? null
    : (row as unknown as Record<string, unknown>)[field.id]
  if (field.valueType === "boolean") return raw ? "Yes" : "No"
  if (raw == null || raw === "") return "—"
  if (field.valueType === "currency") return `${Number(raw).toLocaleString()} EGP`
  if (field.valueType === "area") return `${raw} m²`
  return String(raw)
}

/** Expected-result input that follows the field's value type. */
function ExpectedInput({ row, field, value, onChange }: { row: PropertyRow; field: IssueField; value: string; onChange: (v: string) => void }) {
  const current = currentText(row, field)
  if (field.valueType === "enum" || field.valueType === "phase") {
    const options = (field.valueType === "phase" ? PHASE_NAMES : field.options ?? []).filter((o) => o !== current)
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-card text-sm"><SelectValue placeholder={`Select the correct ${field.label.toLowerCase()}…`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }
  if (field.valueType === "boolean") {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-card text-sm"><SelectValue placeholder="Correct value…" /></SelectTrigger>
        <SelectContent>
          {["Yes", "No"].filter((o) => o !== current).map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }
  if (field.valueType === "currency" || field.valueType === "area" || field.valueType === "number") {
    const suffix = field.valueType === "currency" ? "EGP" : field.valueType === "area" ? "m²" : null
    return (
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Expected ${field.label.toLowerCase()} (current: ${current})`}
          className={cn("h-8 bg-card text-sm", suffix && "pr-10")}
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Expected ${field.label.toLowerCase()} (current: ${current})`}
      className="h-8 bg-card text-sm"
    />
  )
}

// Deterministic plan cards per unit — PlanCardData so the existing payment plan
// details drawer can open them as-is.
function unitPlans(row: PropertyRow): PlanCardData[] {
  const idx = Number(row.propertyId.replace(/\D/g, "")) || 0
  return Array.from({ length: Math.max(row.paymentPlans, 0) }, (_, i) => {
    const pt = ["Equal", "Backloaded", "Frontloaded", "Cash"][(idx + i) % 4]
    const isCash = pt === "Cash"
    const yrs = isCash ? 0 : 4 + ((idx + i) % 5)
    const mths = isCash ? 0 : [0, 6][(idx + i) % 2]
    const dp = isCash ? 100 : 10 + ((idx + i) % 4) * 5
    const hasOffer = (idx + i) % 3 === 0
    return {
      id: `PPL-${String(idx).padStart(4, "0")}${i}`,
      name: ["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"][i % 4],
      status: "Active" as const,
      hasOffer,
      devName: row.developer.name,
      devId: row.developer.id,
      projName: row.project.name,
      projId: row.project.id,
      units: 1,
      available: 1,
      priceCount: 1,
      historicalCount: 0,
      planType: pt,
      currency: "EGP",
      discount: hasOffer ? "5%" : "—",
      validTill: "31 Dec 2026",
      dp: isCash ? "100% DP" : `${dp}% DP`,
      duration: isCash ? "Immediate" : `${yrs} Yrs${mths ? ` ${mths} Mths` : ""}`,
      frequency: isCash ? "—" : "Monthly",
      instalPct: isCash ? "—" : "1.5%",
      createdAt: "10 Jan 2026, 07:00 AM",
      updatedAt: "10 Jan 2026, 07:00 AM",
      expanded: { isCash },
    }
  })
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
  const [viewPlan, setViewPlan] = useState<PlanCardData | null>(null)

  const visibleFields = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? ISSUE_FIELDS.filter((f) => f.label.toLowerCase().includes(needle)) : ISSUE_FIELDS
  }, [q])
  const plans = useMemo(() => (row ? unitPlans(row) : []), [row])

  if (!row) return null

  const toggleField = (field: IssueField, on: boolean) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      if (on) n.set(field.id, emptyDraft(field, row)); else n.delete(field.id)
      return n
    })
  const patchDraft = (fieldId: string, patch: Partial<FieldDraft>) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) n.set(fieldId, { ...cur, ...patch })
      return n
    })
  const toggleIn = (fieldId: string, key: "items" | "addItems" | "removeItems", item: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const arr = cur[key].includes(item) ? cur[key].filter((x) => x !== item) : [...cur[key], item]
        n.set(fieldId, { ...cur, [key]: arr })
      }
      return n
    })
  const togglePlanForValues = (fieldId: string, plan: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const planValues = { ...cur.planValues }
        if (plan in planValues) delete planValues[plan]
        else planValues[plan] = {}
        n.set(fieldId, { ...cur, planValues })
      }
      return n
    })
  const togglePlanField = (fieldId: string, plan: string, planField: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const fields = { ...(cur.planValues[plan] ?? {}) }
        if (planField in fields) delete fields[planField]
        else fields[planField] = { expected: "", note: "" }
        n.set(fieldId, { ...cur, planValues: { ...cur.planValues, [plan]: fields } })
      }
      return n
    })
  const patchPlanField = (fieldId: string, plan: string, planField: string, patch: Partial<PlanFieldIssue>) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const fields = { ...(cur.planValues[plan] ?? {}) }
        fields[planField] = { ...(fields[planField] ?? { expected: "", note: "" }), ...patch }
        n.set(fieldId, { ...cur, planValues: { ...cur.planValues, [plan]: fields } })
      }
      return n
    })

  const typeDefOf = (field: IssueField, d: FieldDraft): IssueTypeDef =>
    fieldTaxonomy(field).find((t) => t.type === d.type) ?? fieldTaxonomy(field)[0]

  /** Per-field validation problem (null = valid). */
  const problemOf = (field: IssueField, d: FieldDraft): string | null => {
    const def = typeDefOf(field, d)
    if (field.kind === "amenities") {
      return d.addItems.length + d.removeItems.length === 0 ? "select what to add or remove" : null
    }
    if (field.kind === "plans") {
      if (def.type === "Wrong Values") {
        const ok = Object.values(d.planValues).some((f) => Object.keys(f).length > 0)
        return Object.keys(d.planValues).length === 0 ? "select the plan(s)" : ok ? null : "pick the wrong field(s) per plan"
      }
      if (def.requiresSelection) return d.items.length === 0 ? "select the plan(s)" : null
      return null
    }
    if (def.requiresSelection) return d.items.length === 0 ? "select the affected item(s)" : null
    // Wrong value/status/assignment on structured fields needs the correct value chosen
    if (
      (field.valueType === "enum" || field.valueType === "phase" || field.valueType === "boolean") &&
      (def.type.startsWith("Wrong")) && !d.expected
    ) return "select the correct value"
    return null
  }

  const invalids = [...drafts.entries()].filter(([fieldId, d]) => {
    const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
    return problemOf(field, d) != null
  })

  const submit = () => {
    if (drafts.size === 0) return
    const now = new Date().toISOString()
    const created: PropertyIssue[] = [...drafts.entries()].map(([fieldId, d]) => {
      const field = ISSUE_FIELDS.find((f) => f.id === fieldId)!
      let def = typeDefOf(field, d)
      // Amenities: type is derived from what was picked
      if (field.kind === "amenities") {
        const derived = d.addItems.length && d.removeItems.length ? "Amenities Update" : d.addItems.length ? "Missing Amenity" : "Wrong Amenity"
        def = fieldTaxonomy(field).find((t) => t.type === derived) ?? def
      }
      const assignedTo = DATA_OPS_TEAM[assignSeq++ % DATA_OPS_TEAM.length] // auto-assignment
      const suffix = field.valueType === "currency" ? " EGP" : field.valueType === "area" ? " m²" : ""
      const expected = d.expected ? `${d.expected}${/^\d/.test(d.expected) ? suffix : ""}` : null
      const linkedItems =
        field.kind === "amenities"
          ? [...d.addItems.map((a) => `Add: ${a}`), ...d.removeItems.map((a) => `Remove: ${a}`)]
          : field.kind === "plans" && def.type === "Wrong Values"
            ? Object.entries(d.planValues).map(([plan, fields]) =>
                `${plan}: ${Object.entries(fields).map(([pf, v]) => `${pf}${v.expected ? ` → ${v.expected}` : ""}`).join(", ")}`)
            : d.items.length ? d.items : null
      const planNotes = field.kind === "plans" && def.type === "Wrong Values"
        ? Object.entries(d.planValues).flatMap(([plan, fields]) => Object.entries(fields).filter(([, v]) => v.note).map(([pf, v]) => `${plan} ${pf}: ${v.note}`))
        : []
      // Structured payload — drives the rich rendering in the tracking drawer
      const sortPf = (a: string, b: string) => PLAN_VALUE_FIELDS.indexOf(a) - PLAN_VALUE_FIELDS.indexOf(b)
      const details: IssueDetails | undefined =
        field.kind === "amenities"
          ? { amenitiesAdd: d.addItems, amenitiesRemove: d.removeItems }
          : field.kind === "plans" && def.type === "Wrong Values"
            ? { plans: Object.entries(d.planValues).map(([plan, fields]) => ({
                name: plan,
                fields: Object.entries(fields).sort(([a], [b]) => sortPf(a, b)).map(([pf, v]) => ({ field: pf, expected: v.expected || null, note: v.note || null })),
              })) }
            : field.kind === "plans" && d.items.length
              ? { plans: d.items.map((name) => ({ name })) }
              : (field.kind === "floorPlans" || field.kind === "images") && d.items.length
                ? { media: d.items }
                : undefined
      return {
        id: nextIssueId(),
        source: "Data Quality",
        severity: fieldPriority(field),
        status: "To Do",
        fieldId: field.id,
        fieldLabel: field.label,
        type: def.type,
        subtype: field.kind === "plans" ? null : d.subtype,
        description: [
          `${field.label} — ${def.type.toLowerCase()}${d.subtype && field.kind !== "plans" ? `: ${d.subtype.toLowerCase()}` : ""}`,
          d.description.trim(),
          ...planNotes,
        ].filter(Boolean).join(" — "),
        expected,
        current: currentText(row, field),
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
        details,
      }
    })
    addPropertyIssues(created)
    toast.success(`${created.length} issue${created.length !== 1 ? "s" : ""} reported and auto-assigned`)
    onSubmitted?.(created)
    onClose()
  }

  /** Payment plan card — Plan Type, Duration, DP, Offer tag, Currency, View. */
  const PlanCard = ({ plan, selected, onToggle, children }: { plan: PlanCardData; selected: boolean; onToggle: () => void; children?: React.ReactNode }) => (
    <div className={cn("rounded-lg border transition-colors", selected ? "border-primary bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
            {selected && <Check className="h-3 w-3" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{plan.name}</span>
              <ColorTag value={plan.planType} />
              {plan.hasOffer && <span className="rounded-md border border-amber-200 bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-700">Offer</span>}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{plan.duration} · {plan.dp} · {plan.currency}</span>
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setViewPlan(plan) }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="View plan details"
        >
          <Eye className="h-3 w-3" />
        </button>
      </div>
      {children}
    </div>
  )

  const ChipPicker = ({ options, selected, onToggle, tone }: { options: string[]; selected: string[]; onToggle: (o: string) => void; tone: "add" | "remove" }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.length === 0 && <span className="text-[11px] text-muted-foreground">Nothing available.</span>}
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
              on
                ? tone === "add" ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-red-300 bg-red-100 text-red-700"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {o}
          </button>
        )
      })}
    </div>
  )

  const currentAmenities = [...row.amenities, ...row.services]
  const missingAmenityOptions = AMENITY_LIBRARY.filter((a) => !currentAmenities.includes(a))

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[620px] !max-w-[93vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 gap-2 border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-base font-semibold">Report an Issue</SheetTitle>
          {/* The property being reported on */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">Property ID <IdTag value={row.propertyId} /></span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">Metadata ID <IdTag value={row.propertyMetadataId} /></span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">Detailed ID {row.detailedPropertyId ? <IdTag value={row.detailedPropertyId} /> : <span className="text-muted-foreground">—</span>}</span>
            <StoryBadge value={row.saleType} />
            <StoryBadge value={row.entryType} />
          </div>
          <p className="text-xs text-muted-foreground">{row.project.name}{row.phase ? ` · ${row.phase.name}` : ""} · {row.developer.name}</p>
        </SheetHeader>

        <div className="shrink-0 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fields…" className="h-8 pl-8 pr-7 text-sm" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Check every field that has an issue, classify it, and give the correct value. One ticket is created per field and auto-assigned to data operations.
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
                    const tax = availableTypes(field, row)
                    const def = draft ? typeDefOf(field, draft) : tax[0] ?? fieldTaxonomy(field)[0]
                    const problem = draft ? problemOf(field, draft) : null
                    return (
                      <div key={field.id} className="px-5 py-2.5">
                        <label className="flex cursor-pointer items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5">
                            <Checkbox className="h-4 w-4" checked={!!draft} onCheckedChange={(v) => toggleField(field, !!v)} />
                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                          </span>
                          <CurrentValue row={row} field={field} />
                        </label>

                        {draft && (
                          <div className="mt-2.5 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                            {/* Type first — amenities derive their type from the pickers */}
                            {field.kind !== "amenities" && (
                              <div className={cn("grid gap-2", def.subtypes && field.kind !== "plans" ? "grid-cols-2" : "grid-cols-1")}>
                                <div className="space-y-1">
                                  <p className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                    Type
                                    <span className={cn("rounded border px-1 py-px text-[9px] font-semibold", SEVERITY_COLORS[fieldPriority(field)])}>{fieldPriority(field)}</span>
                                  </p>
                                  <Select value={draft.type} onValueChange={(v) => {
                                    const t = tax.find((x) => x.type === v) ?? tax[0]
                                    patchDraft(field.id, { type: v, subtype: field.kind === "plans" ? null : t.subtypes?.[0] ?? null, items: [], planValues: {}, expected: "" })
                                  }}>
                                    <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {tax.map((t) => <SelectItem key={t.type} value={t.type} className="text-sm">{t.type}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {def.subtypes && field.kind !== "plans" && (
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
                            )}

                            {/* Amenities & Services — pick what to add / remove */}
                            {field.kind === "amenities" && (
                              <>
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-medium text-foreground">Missing — should be added</p>
                                  <ChipPicker options={missingAmenityOptions} selected={draft.addItems} onToggle={(o) => toggleIn(field.id, "addItems", o)} tone="add" />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-medium text-foreground">Wrong — should be removed</p>
                                  <ChipPicker options={currentAmenities} selected={draft.removeItems} onToggle={(o) => toggleIn(field.id, "removeItems", o)} tone="remove" />
                                </div>
                              </>
                            )}

                            {/* Payment plans — cards per flow */}
                            {field.kind === "plans" && def.type !== "Missing Payment Plan" && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  {def.type === "Wrong Values" ? "Select the plan(s), then which values are wrong" : "Select the affected plan(s)"}
                                  {problem && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                {plans.length === 0 && <p className="text-xs text-muted-foreground">No payment plans on this unit — use "Missing Payment Plan".</p>}
                                <div className="space-y-2">
                                  {plans.map((plan) => {
                                    const isValues = def.type === "Wrong Values"
                                    const selected = isValues ? plan.name in draft.planValues : draft.items.includes(plan.name)
                                    return (
                                      <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        selected={selected}
                                        onToggle={() => (isValues ? togglePlanForValues(field.id, plan.name) : toggleIn(field.id, "items", plan.name))}
                                      >
                                        {isValues && selected && (
                                          <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
                                            <div className="flex flex-wrap gap-1.5">
                                              {PLAN_VALUE_FIELDS.map((pf) => {
                                                const on = pf in (draft.planValues[plan.name] ?? {})
                                                return (
                                                  <button
                                                    key={pf}
                                                    onClick={() => togglePlanField(field.id, plan.name, pf)}
                                                    className={cn(
                                                      "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                                                      on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted",
                                                    )}
                                                  >
                                                    {pf}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                            {Object.entries(draft.planValues[plan.name] ?? {}).sort(([a], [b]) => PLAN_VALUE_FIELDS.indexOf(a) - PLAN_VALUE_FIELDS.indexOf(b)).map(([pf, v]) => (
                                              <div key={pf} className="grid grid-cols-[110px_1fr_1fr] items-center gap-1.5">
                                                <span className="truncate text-[11px] font-medium text-foreground">{pf}</span>
                                                {PLAN_FIELD_OPTIONS[pf] ? (
                                                  <Select value={v.expected || undefined} onValueChange={(val) => patchPlanField(field.id, plan.name, pf, { expected: val })}>
                                                    <SelectTrigger className="h-7 bg-card text-xs"><SelectValue placeholder="Expected" /></SelectTrigger>
                                                    <SelectContent>
                                                      {PLAN_FIELD_OPTIONS[pf].map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  <Input
                                                    value={v.expected}
                                                    onChange={(e) => patchPlanField(field.id, plan.name, pf, { expected: e.target.value })}
                                                    placeholder="Expected"
                                                    className="h-7 bg-card text-xs"
                                                  />
                                                )}
                                                <Input
                                                  value={v.note}
                                                  onChange={(e) => patchPlanField(field.id, plan.name, pf, { note: e.target.value })}
                                                  placeholder="Description"
                                                  className="h-7 bg-card text-xs"
                                                />
                                              </div>
                                            ))}
                                            {Object.keys(draft.planValues[plan.name] ?? {}).length === 0 && (
                                              <p className="text-[10px] text-red-600">Pick the wrong value(s) on this plan</p>
                                            )}
                                          </div>
                                        )}
                                      </PlanCard>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Floor plans / renders — thumbnails when the type requires them */}
                            {(field.kind === "floorPlans" || field.kind === "images") && def.requiresSelection && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  Select the {field.label.toLowerCase()} with the issue
                                  {problem && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                {(field.kind === "floorPlans" ? row.floorPlans : row.images).length === 0
                                  ? <p className="text-xs text-muted-foreground">Nothing uploaded on this unit — use a "missing" type instead.</p>
                                  : (
                                    <div className="grid grid-cols-3 gap-2">
                                      {(field.kind === "floorPlans" ? row.floorPlans : row.images).map((s, i) => {
                                        const name = `${field.kind === "floorPlans" ? "Floor Plan" : "Render"} ${i + 1}`
                                        const on = draft.items.includes(name)
                                        return (
                                          <button
                                            key={name}
                                            onClick={() => toggleIn(field.id, "items", name)}
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
                                  )}
                              </div>
                            )}

                            {/* Expected result — input follows the field's value type */}
                            {field.kind === "value" && (
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  Correct value / expected result
                                  {problem === "select the correct value" && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                <ExpectedInput row={row} field={field} value={draft.expected} onChange={(v) => patchDraft(field.id, { expected: v })} />
                              </div>
                            )}

                            {/* Free-text description — always available */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium text-muted-foreground">Description</p>
                              <Input
                                value={draft.description}
                                onChange={(e) => patchDraft(field.id, { description: e.target.value })}
                                placeholder="Describe the issue (optional)"
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
            {invalids.length > 0 && <span className="ml-1 text-red-600">— complete the required inputs</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8" disabled={drafts.size === 0 || invalids.length > 0} onClick={submit}>
              Report {drafts.size > 0 ? `${drafts.size} Issue${drafts.size !== 1 ? "s" : ""}` : "Issues"}
            </Button>
          </div>
        </div>

        {/* Existing payment plan details drawer, as-is */}
        <PaymentPlanDetailsDrawer plan={viewPlan} onClose={() => setViewPlan(null)} />
      </SheetContent>
    </Sheet>
  )
}

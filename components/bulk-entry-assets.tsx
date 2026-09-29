"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Banknote, BedDouble, Boxes, CalendarDays, Check, CheckCircle2, CircleAlert, Eye, EyeOff,
  HelpCircle, ImagePlus, LayoutTemplate, Paintbrush, Pin, Plus, Ruler, Sparkles, Upload, Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { LinkedPlanCard, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { FloorPlanCard, type FloorPlan } from "@/components/floor-plans-page"
import { FullscreenViewer } from "@/components/render-images-page"
import { fmtDateTime } from "@/components/projects-list-page"
import { SheetPreviewCard, displayCell, type GridSheet } from "@/components/sheet-preview"
import {
  DataPane, Field, FilterEditor, FilesView, GroupedPropertyCard, MiniStat, OriginTag, PanelCard, PaneSwitch, Segmented, TAG, TONE_TAG, ToConfirm,
  Workspace, customColsOf, rowTitle, unitTable, useFocus, type Extra, type StageCtx,
} from "@/components/bulk-entry-kit"
import { ActionEditor } from "@/components/bulk-entry-steps"
import {
  FIELD_LABEL, GROUP_FIELDS, filtersText, fmtInt, fmtM, plural, txt,
  type Action, type Card, type DbUnit, type GridRow, type GridTable, type Issue, type LibPlan, type MissingDecision, type PlanDraft, type RowFilter, type URow,
} from "@/lib/bulk-ingestion"
import { STAGE_KEYS, STAGE_LABEL, isSkipped, stageStatus, type Work } from "@/lib/bulk-entry-flow"
import { QA_ITEMS, uploadPlan } from "@/lib/ingestion-rules-mock"
import { ENTRY_USERS } from "@/lib/ingestion-mock"

const fmtRange = (a: number, b: number, unit = "") => (a && b && a !== b ? `${fmtInt(a)}–${fmtInt(b)}${unit}` : a ? `${fmtInt(a)}${unit}` : "—")
const money = (n: number) => (n >= 1e6 ? fmtM(n) : fmtInt(n))
const empty = (text: string) => <p className="py-2 text-center text-xs text-muted-foreground">{text}</p>

/* ── Stage 8 · Payment plans — every price linked to exactly one plan ──── */

function planCard(p: PlanDraft, linked: number, devName: string): PlanCardData {
  const inst = p.years ? 100 - p.dp : 0
  return {
    id: p.source === "Database" ? p.id.replace("DB-", "") : p.id,
    name: p.name, status: "Active", hasOffer: !!p.discount, devName, devId: "", projName: p.mainName, projId: p.mainId,
    units: linked, available: linked, priceCount: linked, historicalCount: 0,
    planType: p.freq === "Cash" ? "Cash" : "Installments", currency: "EGP", discount: p.discount ? `${p.discount}%` : "—", validTill: "31 Dec 2026",
    dp: `${p.dp}%`, duration: p.years ? `${p.years} years` : "—", frequency: p.freq, instalPct: p.years ? `${inst}%` : "—", createdAt: "—", updatedAt: "—",
    expanded: {
      isCash: p.freq === "Cash",
      initialPayments: [{ label: "Down payment", pct: `${p.dp}%` }],
      installments: p.years ? { pct: `${inst}%`, amt: `${p.years * (p.freq === "Monthly" ? 12 : 4)} installments`, freq: p.freq === "Monthly" ? "/ Month" : "/ Quarter" } : null,
    },
  }
}

export function StagePlans({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set, entry } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [viewing, setViewing] = useState<PlanCardData | null>(null)
  const [conditionsFor, setConditionsFor] = useState<PlanDraft | null>(null)
  const [creating, setCreating] = useState(false)
  const name = (id?: string) => pipe.plans.find((p) => p.id === id)?.name.split(" — ")[0] ?? (id?.startsWith("PU-") ? "Per unit · owner's terms" : null)
  const linked = (id: string) => pipe.matched.filter((r) => pipe.links.get(r.id)?.planId === id)
  const withPlan = pipe.matched.filter((r) => pipe.links.has(r.id)).length
  const custom = customColsOf(pipe.matched)
  const extra: Extra[] = [
    { col: { key: "_plan", label: "Payment plan" }, get: (r) => name(pipe.links.get(r.id)?.planId) },
    { col: { key: "_how", label: "Linked by" }, get: (r) => pipe.links.get(r.id)?.how ?? null },
  ]
  const checkOf = new Map<string, { title: string; severity: string }>()
  pipe.planChecks.forEach((c) => c.rowIds.forEach((id) => { if (!checkOf.has(id) || c.severity === "error") checkOf.set(id, c) }))
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.matched, pipe.fields, [], custom), output: unitTable(pipe.matched, pipe.fields, extra, custom) }]
  const order = pipe.plans.map((p) => p.id)
  const move = (id: string, dir: -1 | 1) => { const i = order.indexOf(id); const j = i + dir; if (j < 0 || j >= order.length) return; const next = [...order];[next[i], next[j]] = [next[j], next[i]]; set({ planOrder: next }) }
  const link = (rowIds: string[], planId: string) => { set((w) => ({ rowPlans: { ...w.rowPlans, ...Object.fromEntries(rowIds.map((id) => [id, planId])) } })); ctx.confirm(["plans"]) }

  const right = (
    <>
      <PanelCard title="Coverage" subtitle={pipe.perUnit ? `${work.saleType} — one plan per unit, built from each row.` : work.dataType === "Manual" ? "Matched offerings inherit their plan; the rest go by conditions." : work.saleType === "Launch" ? "Plans are optional for a launch — gaps are warnings." : "Conditions run top to bottom — the first plan that fits a unit takes its price."}>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Units with a plan" value={`${withPlan}/${pipe.matched.length}`} tone={withPlan === pipe.matched.length ? "ok" : "warn"} />
          <MiniStat label="Plans in use" value={pipe.plans.filter((p) => linked(p.id).length).length || (pipe.perUnit ? withPlan : 0)} />
        </div>
      </PanelCard>

      <PanelCard title="Validation" subtitle="Errors first — each price must be in range and on exactly one plan.">
        <div className="space-y-1.5">
          {[...pipe.planChecks].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1)).map((c) => (
            <button key={c.id} type="button" disabled={!c.rowIds.length} onClick={() => setFocus({ rowIds: c.rowIds, label: c.title.toLowerCase() })} className={cn("flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left", !c.rowIds.length ? "border-border" : c.severity === "error" ? "border-red-200 bg-red-50/40 hover:bg-red-50" : "border-amber-200 bg-amber-50/40 hover:bg-amber-50")}>
              {!c.rowIds.length ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" /> : c.severity === "error" ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground">{c.title}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">{c.detail}</span>
              </span>
              <span className={cn(TAG, !c.rowIds.length ? TONE_TAG.ok : c.severity === "error" ? TONE_TAG.error : TONE_TAG.warn)}>{c.rowIds.length || "✓"}</span>
            </button>
          ))}
        </div>
      </PanelCard>

      {!pipe.perUnit && (
        <PanelCard title="Plans" subtitle="Top to bottom — reorder to change which plan takes a unit." right={<Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setCreating(true)}><Plus className="h-3 w-3" />New plan</Button>}>
          <div className="space-y-3">
            {pipe.plans.map((p, i) => {
              const rows = linked(p.id)
              const card = planCard(p, rows.length, entry.developer?.name ?? pipe.devName)
              return (
                <div key={p.id} className="space-y-1.5">
                  <LinkedPlanCard plan={card} isExpanded={expanded === p.id} onToggleExpand={() => setExpanded((v) => (v === p.id ? null : p.id))} totalInGroup={pipe.plans.length} readOnly fullWidth hideIds={p.source !== "Database"} hideTimestamps onView={() => setViewing(card)}
                    statusTag={<OriginTag origin={p.source === "Detected" ? "AI" : p.source === "Database" ? "Saved" : "New"} />} />
                  <div className="flex items-start gap-1.5 px-1 text-[11px]">
                    <div className="flex flex-col text-muted-foreground">
                      <button type="button" disabled={i === 0} onClick={() => move(p.id, -1)} className="hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                      <button type="button" disabled={i === pipe.plans.length - 1} onClick={() => move(p.id, 1)} className="hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground">{p.manualOnly ? "Linked by hand only" : `Applies to ${filtersText(p.conditions)}`} · {p.from}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <button type="button" disabled={!rows.length} onClick={() => setFocus({ rowIds: rows.map((r) => r.id), label: `units on ${p.name}` })} className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">{plural(rows.length, "unit")}</button>
                        <button type="button" onClick={() => setConditionsFor(p)} className="font-medium text-primary hover:underline">Edit conditions</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </PanelCard>
      )}
      <PaymentPlanDetailsDrawer plan={viewing} onClose={() => setViewing(null)} />
      {conditionsFor && <ConditionsDialog plan={conditionsFor} fields={pipe.fields} onClose={() => setConditionsFor(null)} onSave={(c) => { set((w) => ({ planConditions: { ...w.planConditions, [conditionsFor.id]: c } })); setConditionsFor(null); toast.success("Conditions saved on the plan") }} />}
      {creating && <NewPlanDialog fields={pipe.fields} main={pipe.options.find((o) => !o.isPhase) ?? pipe.options[0]} onClose={() => setCreating(false)} onSave={(p) => { set((w) => ({ newPlans: [...w.newPlans, p] })); setCreating(false); toast.success(`${p.name} created`) }} />}
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{
        focus, onClearFocus: () => setFocus(null),
        markCell: (_, rowId, key, view) => { if (view === "input" || (key !== "_plan" && key !== "price")) return null; const c = checkOf.get(rowId); return c ? { tone: c.severity === "error" ? "error" : "warn", note: c.title } : key === "_plan" && !pipe.links.has(rowId) ? { tone: "warn", note: "No plan" } : null },
        bulkActions: pipe.perUnit ? undefined : ({ rowIds, clear }) => <LinkPlan plans={pipe.plans} onPick={(id) => { link(rowIds, id); toast.success(`${plural(rowIds.length, "unit")} linked`); clear() }} />,
      }} />}
      right={right}
    />
  )
}

function LinkPlan({ plans, onPick }: { plans: PlanDraft[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"><Wallet className="h-3 w-3" />Link plan</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1">
        {plans.map((p) => <button key={p.id} type="button" onClick={() => { onPick(p.id); setOpen(false) }} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-secondary"><span className="truncate">{p.name}</span><OriginTag origin={p.source === "Detected" ? "AI" : p.source === "Database" ? "Saved" : "New"} /></button>)}
      </PopoverContent>
    </Popover>
  )
}

function ConditionsDialog({ plan, fields, onClose, onSave }: { plan: PlanDraft; fields: import("@/lib/bulk-ingestion").FieldDef[]; onClose: () => void; onSave: (c: RowFilter[]) => void }) {
  const [c, setC] = useState<RowFilter[]>(plan.conditions)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-base font-semibold">Conditions · {plan.name}</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">Units matching every condition take this plan — saved on the plan, so the next entry links itself.</p>
        <FilterEditor fields={fields} value={c} onChange={setC} />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(c)}>Save conditions</Button></div>
      </DialogContent>
    </Dialog>
  )
}

function NewPlanDialog({ fields, main, onClose, onSave }: { fields: import("@/lib/bulk-ingestion").FieldDef[]; main?: { mainId: string; mainName: string }; onClose: () => void; onSave: (p: PlanDraft) => void }) {
  const [dp, setDp] = useState(10)
  const [years, setYears] = useState(6)
  const [freq, setFreq] = useState<PlanDraft["freq"]>("Quarterly")
  const [conditions, setConditions] = useState<RowFilter[]>([])
  const box = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-base font-semibold">New payment plan</DialogTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Down payment %"><input type="number" value={dp} onChange={(e) => setDp(Number(e.target.value))} className={box} /></Field>
          <Field label="Years"><input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className={box} /></Field>
          <Field label="Installments"><select value={freq} onChange={(e) => setFreq(e.target.value as PlanDraft["freq"])} className={box}><option>Quarterly</option><option>Monthly</option><option>Cash</option></select></Field>
        </div>
        <Field label="Applies to"><FilterEditor fields={fields} value={conditions} onChange={setConditions} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ id: `NP-${Date.now() % 100000}`, name: `${dp}% DP · ${years} years ${freq.toLowerCase()}`, source: "New", dp, years, freq, from: "Created in this entry", mainId: main?.mainId ?? "", mainName: main?.mainName ?? "", conditions })}>Create plan</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Stage 9 · Review — every issue, fixed in the stage that owns it ────── */

const REASONS = ["Confirmed with the developer", "Known exception for this project", "Price change is expected", "Will be fixed in the next entry"]

export function StageReview({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [fixing, setFixing] = useState<Issue | null>(null)
  const errors = pipe.issues.filter((i) => i.severity === "error")
  const warnings = pipe.issues.filter((i) => i.severity === "warning")
  const custom = customColsOf(pipe.matched)
  const marks = useMemo(() => {
    const m = new Map<string, { tone: "error" | "warn"; note: string }>()
    pipe.issues.forEach((i) => {
      if (i.severity === "warning" && work.acked[i.id]) return
      i.rowIds.forEach((id) => { const k = `${id}|${i.field ?? ""}`; if (!m.has(k) || i.severity === "error") m.set(k, { tone: i.severity === "error" ? "error" : "warn", note: i.title }) })
    })
    return m
  }, [pipe.issues, work.acked])
  const table = unitTable(pipe.matched, pipe.fields, [], custom)
  const sheets: GridSheet[] = [{ name: "Units", input: table, output: table }]

  const card = (i: Issue) => {
    const acked = work.acked[i.id]
    return (
      <div key={i.id} className={cn("rounded-lg border p-2", i.severity === "error" ? "border-red-200 bg-red-50/30" : acked ? "border-border opacity-70" : "border-amber-200 bg-amber-50/30")}>
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[13px] font-semibold leading-5", i.severity === "error" ? "text-red-700" : "text-amber-900")}>{i.title}</p>
          <span className={cn(TAG, "bg-white", i.severity === "error" ? "border-red-200 text-red-700" : "border-amber-300 text-amber-900")}>{plural(i.rowIds.length, "row")}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{i.detail}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn(TAG, TONE_TAG.muted)}>{i.kind === "anomaly" ? "Anomaly" : "Admin rule"} · {i.scope}</span>
          <span className="text-[10px] text-muted-foreground">Owned by {STAGE_LABEL[i.owner]}</span>
        </div>
        {acked && <p className="mt-1 text-[11px] text-muted-foreground"><Check className="mr-0.5 inline h-3 w-3 text-emerald-600" />Acknowledged — {acked}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-6 bg-white px-2 text-[11px]" onClick={() => setFocus({ rowIds: i.rowIds, label: i.title })}>Show rows</Button>
          {i.fix && <Button size="sm" className="h-6 gap-1 px-2 text-[11px]" onClick={() => setFixing(i)}>Fix in {STAGE_LABEL[i.owner]}</Button>}
          {i.severity === "warning" && (acked
            ? <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => set((w) => { const a = { ...w.acked }; delete a[i.id]; return { acked: a } })}>Undo</Button>
            : <Acknowledge onPick={(reason) => set((w) => ({ acked: { ...w.acked, [i.id]: reason } }))} />)}
          <Why issue={i} />
        </div>
      </div>
    )
  }

  const right = (
    <>
      <PanelCard title="Issues" subtitle="Admin validation rules and anomalies against the project's history — errors first, grouped by rule.">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Errors" value={errors.reduce((n, i) => n + i.rowIds.length, 0)} tone={errors.length ? "error" : "ok"} />
          <MiniStat label="Warnings" value={warnings.filter((i) => !work.acked[i.id]).reduce((n, i) => n + i.rowIds.length, 0)} tone={warnings.some((i) => !work.acked[i.id]) ? "warn" : undefined} />
          <MiniStat label="Acknowledged" value={warnings.filter((i) => work.acked[i.id]).length} />
        </div>
      </PanelCard>
      {pipe.issues.length === 0 && <PanelCard title={<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />All clear</>}><p className="text-xs text-muted-foreground">Every rule passes — the data is ready for floor plans, grouping and media.</p></PanelCard>}
      {errors.length > 0 && <PanelCard tone="error" title={<><CircleAlert className="h-3.5 w-3.5 text-red-600" />Errors</>} subtitle="Fix opens the owning stage's tool on just these rows — saving re-runs the flow from there."><div className="space-y-2">{errors.map(card)}</div></PanelCard>}
      {warnings.length > 0 && <PanelCard tone="warn" title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Warnings</>} subtitle="Acknowledge with a reason, or fix them like errors."><div className="space-y-2">{warnings.map(card)}</div></PanelCard>}
      {fixing && <FixDialog ctx={ctx} issue={fixing} onClose={() => setFixing(null)} />}
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{
        focus, onClearFocus: () => setFocus(null),
        markCell: (_, rowId, key, view) => (view === "input" ? null : marks.get(`${rowId}|${key}`) ?? null),
        markRow: (_, rowId, view) => (view !== "input" && marks.get(`${rowId}|`) ? { tone: "error", note: marks.get(`${rowId}|`)?.note } : null),
      }} />}
      right={right}
    />
  )
}

function Acknowledge({ onPick }: { onPick: (reason: string) => void }) {
  const [open, setOpen] = useState(false)
  const [other, setOther] = useState("")
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-6 bg-white px-2 text-[11px]">Acknowledge</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="mb-1 px-1 text-xs font-semibold">Why is this fine?</p>
        {REASONS.map((r) => <button key={r} type="button" onClick={() => { onPick(r); setOpen(false) }} className="flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-secondary">{r}</button>)}
        <div className="mt-1 flex gap-1 border-t border-border pt-1.5">
          <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other reason" className="h-7 flex-1 rounded border border-input px-2 text-xs outline-none" />
          <Button size="sm" className="h-7 px-2 text-xs" disabled={!other.trim()} onClick={() => { onPick(other.trim()); setOpen(false) }}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Why({ issue }: { issue: Issue }) {
  const text = issue.id === "AN-301" ? "These units price per m² more than 30% away from the project's median for the type. Most often a price per m² typed into the price column, or a premium view — compare with the source row." :
    issue.id === "AN-302" ? "The unit's price moved more than 25% since IMS last saw it. Check the source; if the developer re-priced the phase, acknowledge it." :
    issue.id === "VR-103" ? "The unit has no usable price. When it matches an IMS unit, filling from that unit is safe; otherwise ask the developer." :
    issue.id === "VR-202" ? "Residential units usually list bedrooms. The model code often carries them (B-3B = 3 bedrooms) — a lookup from the matched unit fills them." :
    `${issue.detail} ${issue.fix ? `Suggested fix: ${issue.fix.label.toLowerCase()}.` : "No fix is obvious from the rule — acknowledge it with a reason if it's expected."}`
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px] text-violet-700"><HelpCircle className="h-3 w-3" />Why?</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3"><p className="flex items-center gap-1 text-xs font-semibold text-violet-800"><Sparkles className="h-3 w-3" />AI explanation</p><p className="mt-1 text-xs text-foreground">{text}</p></PopoverContent>
    </Popover>
  )
}

/** Fix in place — the owning stage's tool, scoped to the affected rows. */
function FixDialog({ ctx, issue, onClose }: { ctx: StageCtx; issue: Issue; onClose: () => void }) {
  const { pipe, work, set } = ctx
  const rows = pipe.matched.filter((r) => issue.rowIds.includes(r.id))
  const codes = rows.map((r) => txt(r.v.unitCode)).filter(Boolean)
  const scope = { developer: pipe.devName, saleType: work.saleType, entryType: work.dataType }
  if (issue.owner === "transform" && issue.fix) {
    const f = issue.fix.field
    const action: Action = issue.fix.kind === "dedupe"
      ? { id: `fix-${issue.id}`, kind: "dedupe", keep: "latest", title: "", detail: "Fix from Review", scope, origin: "new" }
      : issue.fix.kind === "lookup"
        ? { id: `fix-${issue.id}`, kind: "lookup", lookup: "unit", fields: f ? [f] : [], filters: codes.length ? [{ field: "unitCode", op: "in", value: codes.join(", ") }] : [], title: "", detail: "Fix from Review", scope, origin: "new" }
        : { id: `fix-${issue.id}`, kind: "fill", field: f, value: "", filters: f ? [{ field: f, op: "blank" }] : [], title: "", detail: "Fix from Review", scope, origin: "new" }
    return <ActionEditor ctx={ctx} action={action} onClose={onClose} onSave={(a) => { set((w) => ({ actions: [...w.actions, a] })); onClose(); toast.success("Saved in Transformation — the flow re-ran from there") }} />
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-base font-semibold">{issue.title} · fix in {STAGE_LABEL[issue.owner]}</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">{plural(rows.length, "affected row")} — the fix is saved in {STAGE_LABEL[issue.owner]} and reused next time.</p>
        {issue.owner === "standard" && (
          <div className="space-y-1.5">
            {pipe.unknown.filter((u) => u.rowIds.some((id) => issue.rowIds.includes(id))).map((u) => {
              const def = pipe.fields.find((f) => f.key === u.field)
              return (
                <div key={`${u.field}|${u.raw}`} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{FIELD_LABEL[u.field]} “{u.raw}”</span>
                  {def?.options ? (
                    <select defaultValue={u.suggestion?.value ?? ""} onChange={(e) => e.target.value && set((w) => ({ valueChoices: { ...w.valueChoices, [`${u.field}:${u.raw}`]: e.target.value } }))} className="h-8 w-40 rounded-md border border-input bg-white px-1.5 text-xs outline-none">
                      <option value="">Map to…</option>{def.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : <span className="text-muted-foreground">choose in Standardization</span>}
                </div>
              )
            })}
          </div>
        )}
        {issue.owner === "projects" && (
          <Field label="Assign these rows to">
            <select defaultValue="" onChange={(e) => { if (!e.target.value) return; set((w) => ({ projectRules: [...w.projectRules, { id: `fix-${issue.id}`, filters: [{ field: "unitCode", op: "in", value: codes.join(", ") }], projectId: e.target.value, origin: "new" }] })); onClose(); toast.success("Saved as a project rule") }} className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none">
              <option value="">Select project or phase…</option>{pipe.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
        )}
        {issue.owner === "plans" && (
          <Field label="Link these prices to">
            <select defaultValue="" onChange={(e) => { if (!e.target.value) return; set((w) => ({ rowPlans: { ...w.rowPlans, ...Object.fromEntries(issue.rowIds.map((id) => [id, e.target.value])) } })); onClose(); toast.success("Plan linked") }} className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none">
              <option value="">Select a plan…</option>{pipe.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Done</Button></div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Stage 10 · Floor plans — per model group, IMS link → model rule → metadata ── */

const asFloorPlan = (p: LibPlan, mainName: string): FloorPlan => ({
  id: p.id, imageUrl: p.image, unitType: (["Apartment", "Villa", "Townhouse", "Duplex", "Studio", "Penthouse"].includes(p.type) ? p.type : "Apartment") as FloorPlan["unitType"],
  bedrooms: p.beds, areaSqm: p.area, ext: "PNG", fileSizeKb: 380 + (p.area % 200), status: "Active", developerId: "", developerName: "", projectId: p.mainId, projectName: mainName,
  mainProjectId: p.mainId, mainProjectName: mainName, createdAt: "2026-08-01T10:00:00.000Z",
})

export function StageFloor({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [picking, setPicking] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ images: string[]; label: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const lib = useMemo(() => new Map(pipe.library.map((p) => [p.id, p])), [pipe.library])
  const auto = work.dataType === "Automatic"
  const groupOf = useMemo(() => new Map(pipe.models.flatMap((g) => g.rowIds.map((id) => [id, g] as const))), [pipe.models])
  const custom = customColsOf(pipe.matched)
  const extra: Extra[] = [
    { col: { key: "_group", label: auto ? "Model group" : "Card" }, get: (r) => { const g = groupOf.get(r.id); return g ? `${g.label} · ${g.type}${g.beds ? ` ${g.beds}BR` : ""}` : null } },
    { col: { key: "_fp", label: "Floor plan" }, get: (r) => { const p = lib.get(groupOf.get(r.id)?.planId ?? ""); return p ? `${p.id} · ${p.model} · ${p.area} m²` : null } },
    { col: { key: "_fpSrc", label: "Linked by" }, get: (r) => groupOf.get(r.id)?.source ?? null },
  ]
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.matched, pipe.fields, [], custom), output: unitTable(pipe.matched, pipe.fields, extra, custom) }]
  const group = pipe.models.find((g) => g.key === picking)
  const ranked = useMemo(() => {
    if (!group) return []
    const score = (f: LibPlan) => (f.type === group.type ? 0 : 100) + (f.beds === (group.beds ?? -1) ? 0 : 50) + Math.abs(f.area - (group.area ?? f.area))
    return pipe.library.filter((p) => p.mainId === group.mainId).sort((a, b) => score(a) - score(b))
  }, [group, pipe.library])
  const bySource = ["IMS link", "Model rule", "Metadata", "Manual"].map((s) => ({ s, n: pipe.models.filter((g) => g.source === s).length }))
  const conflicts = pipe.models.filter((g) => g.conflicts.length)

  const right = (
    <>
      <PanelCard title={auto ? "Model groups" : "Cards"} subtitle={auto ? `${plural(pipe.matched.length, "unit")} in ${plural(pipe.models.length, "group")} of the same model, type, bedrooms and area — one plan each.` : "Each offering gets its own plan."}
        right={<Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setUploading(true)}><Upload className="h-3 w-3" />Upload plans</Button>}>
        <div className="mb-2 flex flex-wrap gap-1.5">{bySource.filter((x) => x.n).map((x) => <span key={x.s} className="inline-flex items-center gap-1 text-[11px]"><OriginTag origin={x.s} /><b>{x.n}</b></span>)}</div>
        <div className="space-y-2">
          {pipe.models.map((g) => {
            const p = lib.get(g.planId ?? "")
            return (
              <div key={g.key} className={cn("flex items-center gap-2.5 rounded-lg border p-2", p ? "border-border" : pipe.perUnit ? "border-dashed border-border" : "border-amber-200 bg-amber-50/30")}>
                <button type="button" onClick={() => (p ? setViewer({ images: [p.image], label: `${p.id} · ${p.model}` }) : setPicking(g.key))} className="flex h-12 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                  {p ? <img src={p.image} alt={p.id} className="h-full w-full object-contain" /> : <LayoutTemplate className="h-5 w-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setFocus({ rowIds: g.rowIds, label: `${g.label} units` })} className="block max-w-full truncate text-left text-[13px] font-medium text-foreground hover:text-primary">{g.label} · {g.type}{g.beds ? ` ${g.beds}BR` : ""}</button>
                  <p className="truncate text-[11px] text-muted-foreground">{plural(g.rowIds.length, auto ? "unit" : "row")}{g.area ? ` · ~${g.area} m²` : ""}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                    {p ? <><span className="truncate text-foreground">{p.id} · {p.model}</span>{g.source && (work.toConfirm.includes(`floor:${g.key}`) ? <ToConfirm ctx={ctx} id={`floor:${g.key}`} /> : <OriginTag origin={g.source} />)}</> : <span className="text-amber-700">{pipe.perUnit ? "No plan — optional" : "No floor plan"}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPicking(g.key)}>{p ? "Change" : "Pick"}</Button>
              </div>
            )
          })}
        </div>
      </PanelCard>
      {conflicts.length > 0 && (
        <PanelCard tone="warn" title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Linked to another plan in IMS</>} subtitle="Some units point at an older revision today.">
          <div className="space-y-2">
            {conflicts.map((g) => (
              <div key={g.key} className="rounded-lg border border-border p-2 text-xs">
                <p><b>{plural(g.conflicts.length, "unit")}</b> of {g.label} use {g.conflicts[0].imsPlan} in IMS; the group uses {g.planId}.</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => setFocus({ rowIds: g.conflicts.map((c) => c.rowId), label: "units linked to another plan" })}>Show units</Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => set((w) => ({ keepImsLinks: [...w.keepImsLinks, g.key] }))}>Keep their IMS link</Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Otherwise they're relinked to {g.planId} at ingest.</p>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
      <Dialog open={!!picking} onOpenChange={(o) => !o && setPicking(null)}>
        <DialogContent className="flex max-h-[88vh] !w-[92vw] !max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <DialogTitle className="text-base font-semibold">Floor plan for {group?.label}</DialogTitle>
            <p className="text-xs text-muted-foreground">{group && `${plural(group.rowIds.length, "unit")} · ${group.type}${group.beds ? ` · ${group.beds} bedrooms` : ""}${group.area ? ` · ~${group.area} m²` : ""}`} — closest first. Your pick becomes a model rule for the project.</p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-4">
            {ranked.map((p, i) => (
              <div key={p.id} onClick={() => { if (!picking) return; set((w) => ({ floorPicks: { ...w.floorPicks, [picking]: p.id } })); ctx.confirm([`floor:${picking}`]); toast.success(`${p.id} → ${group?.label}`); setPicking(null) }}
                className={cn("relative cursor-pointer rounded-xl transition-shadow hover:ring-2 hover:ring-primary/40", group?.planId === p.id && "ring-2 ring-primary")}>
                {i === 0 && <span className={cn(TAG, TONE_TAG.violet, "absolute left-2 top-10 z-10")}><Sparkles className="h-3 w-3" />{p.type === group?.type && p.beds === group?.beds ? "Best match" : "Closest"}</span>}
                <FloorPlanCard fp={asFloorPlan(p, pipe.mainNames[p.mainId] ?? "")} onView={() => setViewer({ images: [p.image], label: p.id })} onDelete={() => toast.info("Plans are managed on the Floor Plans page")} onStatusChange={() => toast.info("Plans are managed on the Floor Plans page")} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {uploading && <UploadPlans ctx={ctx} onClose={() => setUploading(false)} />}
      {viewer && <FullscreenViewer images={viewer.images} startIndex={0} onClose={() => setViewer(null)} label={viewer.label} />}
    </>
  )
  return <Workspace left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{ initialGroupBy: "_group", focus, onClearFocus: () => setFocus(null), markCell: (_, rowId, key, view) => (view !== "input" && key === "_fp" && !groupOf.get(rowId)?.planId ? { tone: "warn", note: "No floor plan" } : null) }} />} right={right} />
}

function UploadPlans({ ctx, onClose }: { ctx: StageCtx; onClose: () => void }) {
  const main = ctx.pipe.options.find((o) => !o.isPhase) ?? ctx.pipe.options[0]
  const [reading, setReading] = useState(false)
  const [done, setDone] = useState<LibPlan[]>([])
  const read = () => {
    setReading(true)
    setTimeout(() => {
      const added = [uploadPlan(main?.mainId ?? "", "C-2B", "Apartment", 2, 118), uploadPlan(main?.mainId ?? "", "TW-3B", "Townhouse", 3, 236)]
      setDone(added)
      setReading(false)
      ctx.set((w) => ({ floorPicks: { ...w.floorPicks } }))
    }, 900)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-base font-semibold">Upload floor plans</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">New plan images are read once by AI — model name, bedrooms and area land in the plan&apos;s details.</p>
        {!done.length ? (
          <button type="button" onClick={read} disabled={reading} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center hover:border-primary">
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">{reading ? "Reading plans…" : "Drop plan images, or click to pick"}</span>
            <span className="text-xs text-muted-foreground">PNG · JPG · PDF pages</span>
          </button>
        ) : (
          <div className="space-y-2">
            {done.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                <img src={p.image} alt={p.id} className="h-12 w-16 rounded border border-border object-contain" />
                <div className="text-xs"><p className="font-medium">{p.id} · {p.model}</p><p className="text-muted-foreground">{p.type} · {p.beds}BR · {p.area} m² <OriginTag origin="AI" className="ml-1" /></p></div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Added to {main?.mainName}&apos;s library — pick them from any group.</p>
          </div>
        )}
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Done</Button></div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Stage 11 · Grouping — units into listing cards, compared with the site ── */

const CARD_TONE: Record<Card["status"], string> = { Same: TONE_TAG.muted, New: TONE_TAG.ok, Split: TONE_TAG.warn, Merged: TONE_TAG.warn, Changed: TONE_TAG.info }

export function StageGrouping({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [selected, setSelected] = useState<string | null>(pipe.cards[0]?.key ?? null)
  const cardOf = useMemo(() => new Map(pipe.cards.flatMap((c) => c.rowIds.map((id) => [id, c] as const))), [pipe.cards])
  const byTitle = useMemo(() => new Map(pipe.cards.map((c) => [c.title, c])), [pipe.cards])
  const custom = customColsOf(pipe.matched)
  const extra: Extra[] = [{ col: { key: "_card", label: "Card" }, get: (r) => cardOf.get(r.id)?.title ?? null }, { col: { key: "_cardStatus", label: "vs the site" }, get: (r) => cardOf.get(r.id)?.status ?? null }]
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.matched, pipe.fields, [], custom), output: unitTable(pipe.matched, pipe.fields, extra, custom) }]
  const cfg = pipe.groupCfg
  const setCfg = (patch: Partial<typeof cfg>) => set({ groupConfig: { ...cfg, ...patch }, cardsConfirmed: false })
  const counts = (["Same", "New", "Split", "Merged", "Changed"] as const).map((s) => ({ s, cards: pipe.cards.filter((c) => c.status === s) }))
  const changed = pipe.cards.filter((c) => c.status !== "Same")
  const card = pipe.cards.find((c) => c.key === selected)

  const right = (
    <>
      <PanelCard title="Grouping config" subtitle={`Saved per project and phase — ${pipe.options.find((o) => !o.isPhase)?.mainName ?? "this project"}.`} right={<OriginTag origin={pipe.groupOrigin} />}>
        <p className="mb-1.5 text-[11px] text-muted-foreground">Project and type always group. Add:</p>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_FIELDS.map((f) => {
            const on = cfg.fields.includes(f.key)
            return <button key={f.key} type="button" onClick={() => setCfg({ fields: on ? cfg.fields.filter((x) => x !== f.key) : [...cfg.fields, f.key] })} className={cn(TAG, on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>{on && <Check className="h-3 w-3" />}{f.label}{f.key === "floorPlan" && " · key"}</button>
          })}
        </div>
        <div className="mt-2.5">
          <Field label="Area buckets" hint="Measured from each bucket's start, fixed width — they don't drift.">
            <Segmented value={String(cfg.bucket) as "10"} options={["10", "20", "25", "50", "100"] as const} labels={{ 10: "10 m²", 20: "20 m²", 25: "25 m²", 50: "50 m²", 100: "100 m²" }} onChange={(v) => setCfg({ bucket: Number(v) })} size="sm" />
          </Field>
        </div>
      </PanelCard>

      <PanelCard title="Cards vs the site" subtitle="Card identity is the exact set of grouping values." tone={changed.length && !work.cardsConfirmed ? "warn" : undefined}
        right={changed.length ? (work.cardsConfirmed ? <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />Confirmed</span> : <Button size="sm" className="h-7 px-2 text-xs" onClick={() => { set({ cardsConfirmed: true }); ctx.confirm(["cards"]) }}>Confirm cards</Button>) : undefined}>
        <div className="grid grid-cols-3 gap-2">
          {counts.filter((c) => c.cards.length || c.s === "Same" || c.s === "New").map((c) => <MiniStat key={c.s} label={c.s} value={c.cards.length} tone={c.s === "Same" ? undefined : c.cards.length ? (c.s === "New" ? "ok" : "warn") : undefined} onClick={c.cards.length ? () => setFocus({ rowIds: c.cards.flatMap((x) => x.rowIds), label: `units on ${c.s.toLowerCase()} cards` }) : undefined} />)}
        </div>
        {changed.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">New cards appear on the site; split and merged cards keep their images from the card most of their units came from.</p>}
      </PanelCard>

      <PanelCard title={`${plural(pipe.cards.length, "card")}`}>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {pipe.cards.map((c) => (
            <button key={c.key} type="button" onClick={() => setSelected(c.key)} className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60", selected === c.key && "bg-primary/5 ring-1 ring-primary/30")}>
              <span className="min-w-0 truncate"><b className="font-medium">{c.title}</b> <span className="text-muted-foreground">· {c.rowIds.length}u</span></span>
              <span className={cn(TAG, CARD_TONE[c.status])}>{c.status}</span>
            </button>
          ))}
        </div>
      </PanelCard>
      {card && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview — as on the site</p>
          <CardPreview c={card} />
        </div>
      )}
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{
        initialGroupBy: "_card", focus, onClearFocus: () => setFocus(null),
        groupLabel: (value) => { const c = byTitle.get(value); return c ? <span className={cn(TAG, CARD_TONE[c.status])}>{c.status}{c.currentId ? ` · ${c.currentId}` : ""}</span> : null },
      }} />}
      right={right}
    />
  )
}

function CardPreview({ c }: { c: Card }) {
  return (
    <GroupedPropertyCard
      propertyId={c.currentId ?? null}
      title={c.title}
      keywords={`${c.projectLabel} · ${plural(c.rowIds.length, "unit")}`}
      tags={<span className={cn(TAG, CARD_TONE[c.status])}>{c.status}</span>}
      cells={[
        { icon: <Boxes className="h-3 w-3" />, label: "Units", value: String(c.rowIds.length) },
        { icon: <Ruler className="h-3 w-3" />, label: "BUA", value: fmtRange(c.buaMin, c.buaMax, " m²") },
        { icon: <Banknote className="h-3 w-3" />, label: "Price", value: c.priceMin ? `${money(c.priceMin)}${c.priceMax && c.priceMax !== c.priceMin ? `–${money(c.priceMax)}` : ""} EGP` : "—" },
        { icon: <CalendarDays className="h-3 w-3" />, label: "Delivery", value: c.deliveryType === "Ready to Move" ? "Ready to Move" : displayCell(c.deliveryDate, "date") || "—" },
        { icon: <BedDouble className="h-3 w-3" />, label: "Bedrooms", value: c.beds ? String(c.beds) : "—" },
        { icon: <Paintbrush className="h-3 w-3" />, label: "Finishing", value: c.finishing || "—" },
      ]}
    />
  )
}

/* ── Stage 12 · Media — the project's render pool spread over the cards ── */

const SOURCE_TONE: Record<string, string> = { Inherited: TONE_TAG.info, Spread: TONE_TAG.violet, Pinned: TONE_TAG.blue, Chosen: TONE_TAG.blue, Owner: TONE_TAG.muted, None: TONE_TAG.error }

export function StageMedia({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [selected, setSelected] = useState<string | null>(pipe.cards[0]?.key ?? null)
  const [onlyEmpty, setOnlyEmpty] = useState(false)
  const [viewer, setViewer] = useState<{ images: string[]; i: number } | null>(null)
  const [mode, setMode] = useState<"data" | "files">("data")
  const [fileId, setFileId] = useState(ctx.seed.files[0]?.id ?? "")
  const img = useMemo(() => new Map(pipe.pool.map((p) => [p.id, p])), [pipe.pool])
  const card = pipe.cards.find((c) => c.key === selected)
  const cm = card ? pipe.media[card.key] : undefined
  const without = pipe.cards.filter((c) => !pipe.media[c.key]?.images.length)
  const shown = onlyEmpty ? without : pipe.cards
  const excluded = new Set(work.excludedImages)
  const pin = (cardKey: string, id: string) => { set((w) => ({ mediaPins: { ...w.mediaPins, [cardKey]: id } })); toast.success("Pinned as the card's cover") }
  const setChosen = (cardKey: string, ids: string[]) => set((w) => ({ mediaChosen: { ...w.mediaChosen, [cardKey]: ids } }))
  const toggleExclude = (id: string) => set((w) => ({ excludedImages: w.excludedImages.includes(id) ? w.excludedImages.filter((x) => x !== id) : [...w.excludedImages, id] }))
  const perSource = ["Inherited", "Spread", "Pinned", "Chosen", "Owner"].map((s) => ({ s, n: pipe.cards.filter((c) => pipe.media[c.key]?.source === s).length }))

  const table = (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <PaneSwitch mode={mode} onMode={setMode} files={ctx.seed.files.length} title="Cards" />
        <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{plural(pipe.cards.length, "card")}</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><Checkbox className="h-3.5 w-3.5" checked={onlyEmpty} onCheckedChange={(v) => setOnlyEmpty(!!v)} />Only cards without images ({without.length})</label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-xs font-semibold text-foreground">
              {["#", "Cover", "Card", "Units", "Gallery", "Images from"].map((h) => <th key={h} className="sticky top-0 z-10 border-b border-r border-border bg-muted px-3 py-1.5 last:border-r-0">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((c, i) => {
              const m = pipe.media[c.key]
              const cover = m?.images[0] ? img.get(m.images[0]) : undefined
              return (
                <tr key={c.key} onClick={() => setSelected(c.key)} className={cn("cursor-pointer", selected === c.key ? "bg-primary/5" : i % 2 ? "bg-slate-50" : "bg-card", "hover:bg-muted")}>
                  <td className="w-10 border-b border-r border-border px-2 text-center text-[10px] text-muted-foreground">{i + 1}</td>
                  <td className="w-24 border-b border-r border-border px-2 py-1.5">
                    {cover ? <img src={cover.url} alt={cover.caption} className="h-12 w-20 rounded-md border border-border object-cover" /> : <span className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-red-300 text-[10px] text-red-600">No image</span>}
                  </td>
                  <td className="border-b border-r border-border px-3 py-1.5"><p className="whitespace-nowrap font-medium text-foreground">{c.title}</p><p className="whitespace-nowrap text-[11px] text-muted-foreground">{c.projectLabel}</p></td>
                  <td className="w-16 border-b border-r border-border px-3 text-right tabular-nums">{c.rowIds.length}</td>
                  <td className="border-b border-r border-border px-2 py-1.5">
                    <div className="flex gap-1">{(m?.images ?? []).slice(1).map((id) => { const p = img.get(id); return p ? <img key={id} src={p.url} alt={p.caption} className="h-9 w-12 rounded border border-border object-cover" /> : null })}</div>
                  </td>
                  <td className="w-28 border-b border-border px-3"><span className={cn(TAG, SOURCE_TONE[m?.source ?? "None"])}>{m?.source ?? "None"}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  const right = (
    <>
      <PanelCard title="Spread" subtitle={pipe.perUnit ? "The owner's own photos, per unit — no pooling." : "Cover + gallery from the project's render pool; neighbouring cards differ."}>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Cards with images" value={`${pipe.cards.length - without.length}/${pipe.cards.length}`} tone={without.length ? "warn" : "ok"} />
          <MiniStat label="Pool" value={plural(pipe.pool.length, "image")} />
        </div>
        {!pipe.perUnit && <div className="mt-2.5"><Field label="Images per card"><Segmented value={String(work.perCard) as "3"} options={["1", "3", "5"] as const} onChange={(v) => set({ perCard: Number(v) })} size="sm" /></Field></div>}
        <div className="mt-2 flex flex-wrap gap-1.5">{perSource.filter((x) => x.n).map((x) => <span key={x.s} className={cn(TAG, SOURCE_TONE[x.s])}>{x.s} · {x.n}</span>)}</div>
        <p className="mt-2 text-[11px] text-muted-foreground">Unchanged cards keep their images; a new or split card takes the images of the card most of its units came from.</p>
      </PanelCard>

      {card && (
        <PanelCard title="Selected card" subtitle={card.title} right={cm && <span className={cn(TAG, SOURCE_TONE[cm.source])}>{cm.source}</span>}>
          <div className="grid grid-cols-3 gap-1.5">
            {(cm?.images ?? []).map((id, k) => {
              const p = img.get(id)
              return p ? (
                <div key={id} className="group relative">
                  <img src={p.url} alt={p.caption} onClick={() => setViewer({ images: (cm?.images ?? []).map((x) => img.get(x)?.url ?? ""), i: k })} className="h-16 w-full cursor-zoom-in rounded-md border border-border object-cover" />
                  {k === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">Cover</span>}
                  <button type="button" title="Remove from this card" onClick={() => setChosen(card.key, (cm?.images ?? []).filter((x) => x !== id))} className="absolute right-1 top-1 hidden rounded bg-white/90 px-1 text-[10px] text-red-600 group-hover:block">✕</button>
                </div>
              ) : null
            })}
            {!cm?.images.length && <p className="col-span-3 text-xs text-red-600">No images — pick from the pool below.</p>}
          </div>
          <ToConfirm ctx={ctx} id="media" />
        </PanelCard>
      )}

      <PanelCard title="Render pool" subtitle="From brochures and the library. Covers only come from renders — never floor plans, masterplans or text slides.">
        <div className="grid grid-cols-3 gap-1.5">
          {pipe.pool.map((p) => {
            const off = excluded.has(p.id)
            const coverable = p.kind === "Exterior render" || p.kind === "Interior render"
            return (
              <div key={p.id} className={cn("rounded-md border border-border p-1", off && "opacity-40")}>
                <img src={p.url} alt={p.caption} onClick={() => setViewer({ images: [p.url], i: 0 })} className="h-14 w-full cursor-zoom-in rounded object-cover" />
                <p className="mt-0.5 truncate text-[10px] font-medium">{p.kind}{p.building ? ` · ${p.building}` : ""}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <button type="button" disabled={!card || !coverable || off} title={coverable ? "Pin as the selected card's cover" : "Not a render — can't be a cover"} onClick={() => card && pin(card.key, p.id)} className="text-muted-foreground hover:text-primary disabled:opacity-30"><Pin className="h-3 w-3" /></button>
                  <button type="button" disabled={!card || off} title="Add to the selected card" onClick={() => card && setChosen(card.key, [...new Set([...(cm?.images ?? []), p.id])])} className="text-muted-foreground hover:text-primary disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                  <button type="button" title={off ? "Use again" : "Exclude — not representative"} onClick={() => toggleExclude(p.id)} className="text-muted-foreground hover:text-red-600">{off ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
                </div>
              </div>
            )
          })}
        </div>
      </PanelCard>
      {viewer && <FullscreenViewer images={viewer.images} startIndex={viewer.i} onClose={() => setViewer(null)} />}
    </>
  )
  return <Workspace left={mode === "files" ? <FilesView files={ctx.seed.files} fileId={fileId} onFile={setFileId} titleSlot={<PaneSwitch mode={mode} onMode={setMode} files={ctx.seed.files.length} title="Cards" />} applied={pipe.applied} /> : table} right={right} />
}

/* ── Stage 13 · Final check — project state, missing units, approvals ──── */

const DECISIONS: MissingDecision[] = ["Sold", "Available", "Hold", "Archive"]

export function StageFinal({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const s = pipe.summary
  const auto = work.dataType === "Automatic"
  const full = work.coverage === "full"
  const decisionOf = (d: DbUnit): MissingDecision | "" => work.missingDecisions[d.id] ?? pipe.missingDefault ?? ""
  const label = (id: string) => pipe.options.find((o) => o.id === id)?.label ?? ""

  const dbTable: GridTable = useMemo(() => ({
    ...unitTable([], pipe.fields),
    rows: pipe.matched.flatMap((r): GridRow[] => {
      const d = r.match?.dbId && r.match.status !== "new" && r.match.status !== "review" ? pipe.dbById.get(r.match.dbId) : undefined
      return d ? [{ id: r.id, idx: r.idx, cells: Object.fromEntries(pipe.fields.map((f) => [f.key, f.key === "project" ? r.v.project ?? null : d.v[f.key] ?? null])) }] : []
    }),
  }), [pipe.matched, pipe.fields, pipe.dbById])
  const afterTable = useMemo(() => unitTable(pipe.matched, pipe.fields), [pipe.matched, pipe.fields])
  const missingTable: GridTable = {
    cols: [
      { key: "code", label: auto ? "Unit code" : "Offering", readOnly: true }, { key: "project", label: "Project", readOnly: true }, { key: "type", label: "Type", readOnly: true },
      { key: "beds", label: "Bedrooms", type: "number", readOnly: true }, { key: "bua", label: "BUA m²", type: "number", readOnly: true }, { key: "price", label: "Price EGP", type: "money", readOnly: true },
      { key: "seen", label: "Last seen", type: "date", readOnly: true }, { key: "decision", label: "Decision", type: "select", options: DECISIONS },
    ],
    rows: pipe.missing.map((d, i) => ({ id: d.id, idx: i + 1, cells: { code: d.code ?? d.label, project: label(d.projectId), type: txt(d.v.propertyType), beds: d.v.bedrooms ?? null, bua: d.v.bua ?? null, price: d.v.price ?? null, seen: d.lastSeen, decision: decisionOf(d) || null } })),
    hasHeader: true,
  }
  const sheets: GridSheet[] = [
    { name: "Changes vs IMS", input: dbTable, output: afterTable },
    ...(full && pipe.missing.length ? [{ name: `Missing · ${pipe.missing.length}`, output: missingTable }] : []),
  ]
  const toConfirmAll = work.toConfirm
  const checklist = STAGE_KEYS.slice(0, -1).map((k) => ({ k, skipped: isSkipped(k, pipe), st: stageStatus(k, work, pipe) }))
  const setAll = (d: MissingDecision) => set({ missingDecisions: Object.fromEntries(pipe.missing.map((m) => [m.id, d])) })
  const counts = DECISIONS.map((d) => ({ d, n: pipe.missing.filter((m) => decisionOf(m) === d).length }))

  const right = (
    <>
      {pipe.consistency.length > 0 && (
        <PanelCard title="Project vs units" subtitle="The projects' state against what this entry brings." tone={pipe.consistency.some((c) => !work.statusFixes[c.id]) ? "warn" : undefined}>
          <div className="space-y-2">
            {pipe.consistency.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2">
                <p className="text-xs font-semibold text-foreground">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">{c.detail}</p>
                <div className="mt-1.5 space-y-1">
                  {c.choices.map((ch) => (
                    <label key={ch.id} className="flex cursor-pointer items-center gap-2 text-xs">
                      <input type="radio" name={c.id} checked={work.statusFixes[c.id] === ch.id} onChange={() => set((w) => ({ statusFixes: { ...w.statusFixes, [c.id]: ch.id } }))} className="accent-[hsl(var(--primary))]" />{ch.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      <PanelCard title="Change summary">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="New" value={s.fresh} tone="ok" />
          <MiniStat label="Modified" value={s.modified} tone="warn" />
          <MiniStat label="Unmodified" value={s.unmodified} tone="muted" />
          <MiniStat label="Returned" value={s.returned} tone={s.returned ? "violet" : undefined} />
          <MiniStat label="Missing" value={full ? s.missing : 0} tone={full && s.missing ? "error" : undefined} />
          <MiniStat label="Price changes" value={s.priceChanges} tone={s.maxPricePct > 15 ? "warn" : undefined} />
        </div>
        {s.priceChanges > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Prices moved {s.avgPricePct}% on average, {s.maxPricePct}% at most.</p>}
      </PanelCard>

      <PanelCard title="Missing units" subtitle={!full ? "Partial update — units absent from the files stay untouched." : pipe.missingDefault ? `Default ${pipe.missingDefault} — full inventory, ${pipe.missingPct}% of the covered units are missing.` : `No default — ${pipe.missingPct}% missing is over 20%, a person decides.`}
        tone={full && !pipe.missingDefault && pipe.missing.some((m) => !work.missingDecisions[m.id]) ? "warn" : undefined}>
        {!full || !pipe.missing.length ? <p className="text-xs text-muted-foreground">{full ? "Nothing is missing." : `${plural(pipe.missing.length, "record")} not in these files — left as they are.`}</p> : (
          <>
            <div className="flex flex-wrap gap-1.5">{counts.map((c) => <span key={c.d} className={cn(TAG, c.n ? TONE_TAG.blue : TONE_TAG.muted)}>{c.d} · {c.n}</span>)}</div>
            <p className="mt-2 text-[11px] text-muted-foreground">Decide in bulk in the Missing tab — filter by project, type or price, select, edit Decision.</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{DECISIONS.map((d) => <Button key={d} size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setAll(d)}>All {d}</Button>)}</div>
          </>
        )}
      </PanelCard>

      {work.saleType === "Launch" && (
        <PanelCard title="Launch publishing">
          <label className="flex items-center justify-between gap-2 text-xs"><span>Publish the launch when this entry is ingested</span><Switch checked={work.publishLaunch} onCheckedChange={(v) => set({ publishLaunch: v })} /></label>
        </PanelCard>
      )}

      {toConfirmAll.length > 0 && (
        <PanelCard tone="ai" title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />AI decisions still to confirm</>} subtitle="They apply to this entry; only confirmed ones become saved rules." right={<Button size="sm" variant="outline" className="h-7 border-violet-300 px-2 text-xs text-violet-800" onClick={() => ctx.confirm(toConfirmAll)}>Confirm all</Button>}>
          <p className="text-xs text-muted-foreground">{plural(toConfirmAll.length, "decision")} across {plural(new Set(toConfirmAll.map((x) => x.split(":")[0])).size, "stage")}.</p>
        </PanelCard>
      )}

      <PanelCard title="Approval" tone={pipe.needsSecond.length && !work.approvals.includes("second") ? "warn" : undefined}>
        {pipe.needsSecond.length ? (
          <>
            <p className="text-xs font-medium text-foreground">Needs a second approval:</p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">{pipe.needsSecond.map((r) => <li key={r}>{r}</li>)}</ul>
            {work.approvals.includes("second")
              ? <p className="mt-2 text-xs text-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5" />Approved by {ENTRY_USERS[2]}</p>
              : <Button size="sm" variant="outline" className="mt-2 h-7 px-2 text-xs" onClick={() => { set((w) => ({ approvals: [...w.approvals, "second"] })); toast.success(`${ENTRY_USERS[2]} approved`) }}>Get {ENTRY_USERS[2]}&apos;s approval</Button>}
          </>
        ) : <p className="text-xs text-muted-foreground">Within limits — your approval ingests it.</p>}
      </PanelCard>

      <PanelCard title="Stages">
        <div className="space-y-0.5">
          {checklist.map(({ k, skipped, st }) => (
            <button key={k} type="button" disabled={skipped} onClick={() => ctx.goStage(k)} className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/60 disabled:hover:bg-transparent">
              {skipped ? <span className="h-3.5 w-3.5 rounded-full border border-dashed border-muted-foreground/40" /> : st.blocking ? <CircleAlert className="h-3.5 w-3.5 text-red-600" /> : st.warnings ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              <span className={cn("flex-1 font-medium", skipped ? "text-muted-foreground" : "text-foreground")}>{STAGE_LABEL[k]}</span>
              <span className={cn("max-w-[55%] truncate text-[11px]", st.blocking ? "text-red-600" : "text-muted-foreground")}>{st.note}</span>
            </button>
          ))}
        </div>
      </PanelCard>
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="After ingest" grid={{
        initialView: "diff", viewLabels: { input: "IMS today", output: "After ingest" }, editable: true,
        onEdit: (sheet, rowId, key, value) => { if (sheet.startsWith("Missing") && key === "decision" && value) set((w) => ({ missingDecisions: { ...w.missingDecisions, [rowId]: value as MissingDecision } })) },
      }} />}
      right={right}
    />
  )
}

/* ── Finalized — read-only, the quality team reviews and signs off ─────── */

export function FinalizedView({ ctx, activeSec, qa, onQa, onBack }: {
  ctx: StageCtx
  activeSec: number
  qa: { status: "Pending" | "Reviewed"; checks: { item: string; by: string; at: string }[] }
  onQa: (qa: { status: "Pending" | "Reviewed"; checks: { item: string; by: string; at: string }[] }) => void
  onBack: () => void
}) {
  const { pipe, work, entry } = ctx
  const [focus, setFocus] = useState<{ rowIds: string[]; label: string } | null>(null)
  const [items, setItems] = useState(QA_ITEMS)
  const [adding, setAdding] = useState("")
  const s = pipe.summary
  const statusOf = (r: URow) => ({ new: "New", review: "New", modified: "Modified", unmodified: "Unmodified", returned: "Returned" } as const)[r.match?.status ?? "new"]
  const custom = customColsOf(pipe.matched)
  const sheets: GridSheet[] = [
    { name: "Ingested", output: unitTable(pipe.matched, pipe.fields, [{ col: { key: "_status", label: "Status" }, get: statusOf }], custom) },
    { name: "Grouped view", output: { cols: [{ key: "t", label: "Card" }, { key: "p", label: "Project" }, { key: "u", label: "Units", type: "number" }, { key: "b", label: "BUA m²" }, { key: "pr", label: "Price EGP" }, { key: "s", label: "vs the site" }], rows: pipe.cards.map((c, i) => ({ id: c.key, idx: i + 1, cells: { t: c.title, p: c.projectLabel, u: c.rowIds.length, b: fmtRange(c.buaMin, c.buaMax), pr: fmtRange(c.priceMin, c.priceMax), s: c.status } })), hasHeader: true } },
  ]
  const edited = Object.keys(work.extractEdits.set)
  const warnRows = pipe.issues.filter((i) => i.severity === "warning").flatMap((i) => i.rowIds)
  const modified = pipe.matched.filter((r) => r.match?.status === "modified").map((r) => r.id)
  const priceChanged = pipe.matched.filter((r) => r.match?.changed?.includes("price")).map((r) => r.id)
  const check = (item: string) => {
    const has = qa.checks.find((c) => c.item === item)
    onQa({ ...qa, checks: has ? qa.checks.filter((c) => c.item !== item) : [...qa.checks, { item, by: ENTRY_USERS[1], at: new Date().toISOString() }] })
  }
  const total = s.fresh + s.modified + s.unmodified + s.returned
  const bar = [
    { label: "New", n: s.fresh, cls: "bg-emerald-500" }, { label: "Modified", n: s.modified, cls: "bg-amber-400" },
    { label: "Unmodified", n: s.unmodified, cls: "bg-slate-300" }, { label: "Returned", n: s.returned, cls: "bg-violet-400" },
  ]

  const right = (
    <>
      <PanelCard title="Ingested" subtitle={`${entry.id} · ${work.saleType} · ${fmtDateTime(entry.finalizedAt ?? entry.updatedAt)}`}>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">{bar.map((b) => b.n ? <div key={b.label} className={b.cls} style={{ width: `${(b.n / Math.max(1, total)) * 100}%` }} title={`${b.label} ${b.n}`} /> : null)}</div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{bar.map((b) => <span key={b.label} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-sm", b.cls)} />{b.label} <b>{b.n}</b></span>)}{work.coverage === "full" && <span>Missing <b>{s.missing}</b></span>}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <MiniStat label="Active time" value={`${Math.floor(activeSec / 60)}m ${String(activeSec % 60).padStart(2, "0")}s`} />
          <MiniStat label="Cards" value={pipe.cards.length} />
        </div>
      </PanelCard>
      <PanelCard title="Focus" subtitle="Where to look first.">
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Warnings" value={warnRows.length} tone={warnRows.length ? "warn" : undefined} onClick={warnRows.length ? () => setFocus({ rowIds: warnRows, label: "rows with warnings" }) : undefined} />
          <MiniStat label="Modified" value={modified.length} onClick={modified.length ? () => setFocus({ rowIds: modified, label: "modified units" }) : undefined} />
          <MiniStat label="Price changes" value={priceChanged.length} onClick={priceChanged.length ? () => setFocus({ rowIds: priceChanged, label: "units whose price changed" }) : undefined} />
          <MiniStat label="Edited AI cells" value={edited.length} onClick={edited.length ? () => setFocus({ rowIds: edited, label: "rows with edited AI values" }) : undefined} />
        </div>
      </PanelCard>
      <PanelCard title="QA checklist" right={<span className={cn(TAG, qa.status === "Reviewed" ? TONE_TAG.ok : TONE_TAG.warn)}>QA {qa.status.toLowerCase()}</span>}>
        <div className="space-y-1">
          {items.map((it) => {
            const c = qa.checks.find((x) => x.item === it)
            return (
              <label key={it} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs hover:bg-muted/50">
                <Checkbox className="mt-0.5 h-3.5 w-3.5" checked={!!c} disabled={qa.status === "Reviewed"} onCheckedChange={() => check(it)} />
                <span className="flex-1"><span className="block text-foreground">{it}</span>{c && <span className="block text-[10px] text-muted-foreground">{c.by} · {fmtDateTime(c.at)}</span>}</span>
              </label>
            )
          })}
        </div>
        {qa.status !== "Reviewed" && (
          <div className="mt-2 flex gap-1">
            <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a check" className="h-7 flex-1 rounded border border-input px-2 text-xs outline-none" />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={!adding.trim()} onClick={() => { setItems((x) => [...x, adding.trim()]); setAdding("") }}>Add</Button>
          </div>
        )}
        <Button size="sm" className="mt-2 w-full" disabled={qa.status === "Reviewed" || qa.checks.length < items.length} onClick={() => { onQa({ ...qa, status: "Reviewed" }); toast.success(`${entry.id} marked QA reviewed`) }}>
          {qa.status === "Reviewed" ? "QA reviewed" : `Mark QA reviewed (${qa.checks.length}/${items.length})`}
        </Button>
      </PanelCard>
    </>
  )
  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <section className="flex min-w-0 flex-1 flex-col">
        <DataPane ctx={ctx} sheets={sheets} title="Final sheet" grid={{ focus, onClearFocus: () => setFocus(null), markCell: (_, rowId, key) => (key === "_status" ? { tone: ({ New: "ok", Modified: "warn", Returned: "info", Unmodified: "ok" } as const)[statusOf(pipe.matched.find((r) => r.id === rowId) ?? pipe.matched[0])] } : null) }} />
      </section>
      <aside className="flex w-[320px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card xl:w-[368px] 2xl:w-[404px]">
        <header className="flex-shrink-0 border-b border-border px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Read-only</p>
          <h2 className="text-base font-bold leading-6 text-foreground">Finalized</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Let the quality team review fast, then sign off.</p>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{right}</div>
        <footer className="flex-shrink-0 border-t border-border px-3 py-2.5"><Button variant="outline" size="sm" className="w-full" onClick={onBack}>Back to entries</Button></footer>
      </aside>
    </div>
  )
}

export { ArrowRight, Wallet, SheetPreviewCard }
export type { Work }

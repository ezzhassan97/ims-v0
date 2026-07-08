"use client"

import { useState } from "react"
import { Plus, Trash2, UploadCloud, X } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { FieldShell, SelectInput, TextInput, NumberInput, CURRENCY_OPTIONS } from "@/components/additional-info-tab"
import type { PlanCardData } from "@/components/all-properties-page"

export const PLAN_TYPE_OPTIONS = ["Equal", "Cash", "Backloaded", "Frontloaded", "Flexible"]
const PLAN_CATEGORY_OPTIONS = ["Primary", "Resale", "Nawy Now"]
const FREQUENCY_OPTIONS = ["Monthly", "Quarterly", "Semi-Annual", "Annual"]
const MILESTONE_TYPES = ["Construction", "Delivery", "Contract", "Custom"]
const TRIGGER_TYPES = ["Installment #", "Month #", "Milestone"]
const DEV_OPTIONS = ["Concrete Development", "People & Places", "Saudi Egyptian Developers (SED)", "Shehab Mazhar"]
const PROJ_OPTIONS = ["Jiwar", "The Med", "Tierra", "Marsa Baghush"]

let __c = 0
const rid = (p: string) => `${p}-${Date.now().toString(36)}-${__c++}`

interface MilestoneRow { id: string; type: string; amount: string; frequency: string }
interface BulkRow { id: string; value: string; trigger: string; instalNo: string }

/** Compact summary string for a saved plan card (used by the section if needed). */
export function planSummary(p: PlanCardData): string {
  return [p.planType, p.dp !== "—" ? `${p.dp} DP` : null, p.duration, p.frequency].filter(Boolean).join(" · ")
}

export function PaymentPlanDrawer({
  open,
  onClose,
  onSave,
  title = "Add Payment Plans",
  submitLabel = "Save Plan",
}: {
  open: boolean
  onClose: () => void
  onSave: (plan: PlanCardData) => void
  title?: string
  submitLabel?: string
}) {
  const empty = () => ({
    developer: "", project: "", name: "",
    category: "Primary", planType: "Equal", currency: "EGP",
    dp: "", durYrs: "", durMth: "", frequency: "",
    discount: "", markOffer: false, active: true,
    m1: "", m3: "", m6: "", contractual: "", delivery: "",
  })
  const [f, setF] = useState(empty)
  const set = (patch: Partial<ReturnType<typeof empty>>) => setF((p) => ({ ...p, ...patch }))
  const [milestones, setMilestones] = useState<MilestoneRow[]>([{ id: rid("ms"), type: "", amount: "", frequency: "One time" }])
  const [bulks, setBulks] = useState<BulkRow[]>([{ id: rid("bk"), value: "", trigger: "Installment #", instalNo: "" }])

  // reset on open
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setF(empty()); setMilestones([{ id: rid("ms"), type: "", amount: "", frequency: "One time" }]); setBulks([{ id: rid("bk"), value: "", trigger: "Installment #", instalNo: "" }]); setWasOpen(true) }
  if (!open && wasOpen) setWasOpen(false)

  const valid = f.name.trim() !== "" && f.planType !== "" && f.currency !== ""

  const save = () => {
    const now = "29 Jun 2026, 14:45"
    const plan: PlanCardData = {
      id: rid("PP").toUpperCase(),
      name: f.name.trim() || "Untitled plan",
      status: f.active ? "Active" : "Hidden",
      hasOffer: f.markOffer,
      devName: f.developer || "—", devId: "DEV-NEW",
      projName: f.project || "—", projId: "PRJ-NEW",
      units: 0, available: 0, priceCount: 0, historicalCount: 0,
      planType: f.planType,
      currency: f.currency,
      discount: f.discount ? `${f.discount}%` : "—",
      validTill: "—",
      dp: f.dp ? `${f.dp}%` : "—",
      duration: `${f.durYrs || 0} Yrs${f.durMth ? ` ${f.durMth} Ms` : ""}`,
      frequency: f.frequency || "—",
      instalPct: "—",
      createdAt: now, updatedAt: now,
      expanded: { isCash: f.planType === "Cash" },
    }
    onSave(plan)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex h-full w-[980px] max-w-[96vw] flex-col overflow-hidden p-0 sm:max-w-[980px]">
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* BASIC */}
          <Section label="Basic">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldShell label="Developer" required><SelectInput value={f.developer} onChange={(v) => set({ developer: v })} options={DEV_OPTIONS} /></FieldShell>
              <FieldShell label="Project" required><SelectInput value={f.project} onChange={(v) => set({ project: v })} options={PROJ_OPTIONS} /></FieldShell>
              <FieldShell label="Plan name" required><TextInput value={f.name} onChange={(v) => set({ name: v })} /></FieldShell>
              <FieldShell label="Plan category" required><SelectInput value={f.category} onChange={(v) => set({ category: v })} options={PLAN_CATEGORY_OPTIONS} /></FieldShell>
              <FieldShell label="Plan type" required><SelectInput value={f.planType} onChange={(v) => set({ planType: v })} options={PLAN_TYPE_OPTIONS} /></FieldShell>
              <FieldShell label="Currency" required><SelectInput value={f.currency} onChange={(v) => set({ currency: v })} options={CURRENCY_OPTIONS} /></FieldShell>
              <FieldShell label="Down payment" required><NumberInput value={f.dp} onChange={(v) => set({ dp: v })} placeholder="0" /></FieldShell>
              <FieldShell label="Plan duration" required>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1"><Input value={f.durYrs} onChange={(e) => set({ durYrs: e.target.value })} placeholder="0" className="h-8 w-full text-sm" /><span className="text-[11px] text-muted-foreground">YRS</span></div>
                  <div className="flex items-center gap-1"><Input value={f.durMth} onChange={(e) => set({ durMth: e.target.value })} placeholder="0" className="h-8 w-full text-sm" /><span className="text-[11px] text-muted-foreground">MTH</span></div>
                </div>
              </FieldShell>
              <FieldShell label="Frequency" required><SelectInput value={f.frequency} onChange={(v) => set({ frequency: v })} options={FREQUENCY_OPTIONS} /></FieldShell>
              <FieldShell label="Discount %"><NumberInput value={f.discount} onChange={(v) => set({ discount: v })} placeholder="0" /></FieldShell>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Switch checked={f.markOffer} onCheckedChange={(v) => set({ markOffer: v })} />
              <span className="text-sm font-medium">Mark as offer</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Ingestion status</p>
                <p className="text-xs text-muted-foreground">Plan will appear in ingestion flows</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", f.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600")}>● {f.active ? "Active" : "Hidden"}</span>
                <Switch checked={f.active} onCheckedChange={(v) => set({ active: v })} />
              </div>
            </div>
          </Section>

          {/* INITIAL PAYMENTS */}
          <Section label="Initial Payments">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldShell label="Month 1"><NumberInput value={f.m1} onChange={(v) => set({ m1: v })} placeholder="0" /></FieldShell>
              <FieldShell label="Month 3"><NumberInput value={f.m3} onChange={(v) => set({ m3: v })} placeholder="0" /></FieldShell>
              <FieldShell label="Month 6"><NumberInput value={f.m6} onChange={(v) => set({ m6: v })} placeholder="0" /></FieldShell>
              <FieldShell label="Contractual payment"><NumberInput value={f.contractual} onChange={(v) => set({ contractual: v })} placeholder="0" /></FieldShell>
              <FieldShell label="Delivery payment"><NumberInput value={f.delivery} onChange={(v) => set({ delivery: v })} placeholder="0" /></FieldShell>
            </div>
          </Section>

          {/* MILESTONES */}
          <Section label="Milestones">
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[11px] text-primary">{i + 1}</span> Milestone</span>
                    <button onClick={() => setMilestones((xs) => xs.filter((x) => x.id !== m.id))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FieldShell label="Type"><SelectInput value={m.type} onChange={(v) => setMilestones((xs) => xs.map((x) => x.id === m.id ? { ...x, type: v } : x))} options={MILESTONE_TYPES} /></FieldShell>
                    <FieldShell label="Amount"><NumberInput value={m.amount} onChange={(v) => setMilestones((xs) => xs.map((x) => x.id === m.id ? { ...x, amount: v } : x))} placeholder="0" /></FieldShell>
                    <FieldShell label="Frequency"><SelectInput value={m.frequency} onChange={(v) => setMilestones((xs) => xs.map((x) => x.id === m.id ? { ...x, frequency: v } : x))} options={["One time", "Recurring"]} /></FieldShell>
                  </div>
                </div>
              ))}
              <button onClick={() => setMilestones((xs) => [...xs, { id: rid("ms"), type: "", amount: "", frequency: "One time" }])} className="w-full rounded-lg border border-dashed border-primary/40 bg-primary/5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10">+ Add milestone</button>
            </div>
          </Section>

          {/* INSTALLMENTS / BULK */}
          <Section label="Installments — Bulk Installments">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Quick add</p>
              <div className="flex flex-wrap items-end gap-2">
                <FieldShell label="Value %"><NumberInput value="" onChange={() => {}} placeholder="5" /></FieldShell>
                <FieldShell label="Trigger type"><SelectInput value="Installment #" onChange={() => {}} options={TRIGGER_TYPES} /></FieldShell>
                <FieldShell label="Starting at"><SelectInput value="" onChange={() => {}} options={["1", "2", "3", "4"]} placeholder="Select #" /></FieldShell>
                <FieldShell label="Repeat every"><Input placeholder="—" className="h-8 w-24 text-sm" /></FieldShell>
                <FieldShell label="Count"><Input defaultValue="1" className="h-8 w-20 text-sm" /></FieldShell>
                <Button size="sm" className="h-8">Add</Button>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {bulks.map((b, i) => (
                <div key={b.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[11px] text-primary">{i + 1}</span> Bulk installment</span>
                    <button onClick={() => setBulks((xs) => xs.filter((x) => x.id !== b.id))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FieldShell label="Value"><NumberInput value={b.value} onChange={(v) => setBulks((xs) => xs.map((x) => x.id === b.id ? { ...x, value: v } : x))} placeholder="0" /></FieldShell>
                    <FieldShell label="Trigger type"><SelectInput value={b.trigger} onChange={(v) => setBulks((xs) => xs.map((x) => x.id === b.id ? { ...x, trigger: v } : x))} options={TRIGGER_TYPES} /></FieldShell>
                    <FieldShell label="Installment #"><span className="text-xs text-muted-foreground">Set plan duration and frequency first</span></FieldShell>
                  </div>
                </div>
              ))}
              <button onClick={() => setBulks((xs) => [...xs, { id: rid("bk"), value: "", trigger: "Installment #", instalNo: "" }])} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"><Plus className="h-4 w-4" /> Add bulk installment</button>
            </div>
          </Section>

          {/* ATTACHMENTS */}
          <Section label="Attachments">
            <div className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border py-8">
              <UploadCloud className="h-6 w-6 text-primary" />
              <p className="text-sm"><span className="font-medium text-primary">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-muted-foreground">Excel, PNG, JPG or PDF</p>
            </div>
          </Section>
        </div>

        {/* sticky footer: summary + actions */}
        <div className="shrink-0 border-t border-border bg-muted/30">
          <div className="grid grid-cols-5 gap-2 px-6 py-3">
            {[
              ["Initial payments", "0.0%"], ["Milestones", "0.0%"], ["Bulk installments", "0.0%"], ["Remaining", "100.0%"], ["Installment %", "—"],
            ].map(([k, v]) => (
              <div key={k}><p className="text-[11px] text-muted-foreground">{k}</p><p className="text-sm font-semibold">{v}</p></div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!valid} onClick={save}>{submitLabel}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

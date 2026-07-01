"use client"

import { useState } from "react"
import { Copy, Check, X, Pencil, CreditCard, FileText, Download, ExternalLink, Info } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { PlanCardData } from "@/components/all-properties-page"

/**
 * Read-only payment-plan details drawer (the "VIEW DRAWER" from the reference UI).
 * Consumes a PlanCardData and renders Basic info / Payment / Initial payments /
 * Milestones / Installments / Attachments / Conditions. Footer "Edit plan" → onEdit.
 * Reused by the Payment Plans tab and the Price History tab.
 */
export function PaymentPlanDetailsDrawer({
  plan, onClose, onEdit,
}: {
  plan: PlanCardData | null
  onClose: () => void
  onEdit?: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!plan) return null
  const e = plan.expanded ?? {}
  const isCash = e.isCash || plan.planType === "Cash"
  const copyId = () => { navigator.clipboard.writeText(plan.id).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <Sheet open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex h-full w-[440px] max-w-[94vw] flex-col overflow-hidden p-0">
        <SheetTitle className="sr-only">{plan.name} — payment plan details</SheetTitle>
        <SheetDescription className="sr-only">Read-only details for payment plan {plan.id}.</SheetDescription>
        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-foreground" title={plan.name}>{plan.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{plan.id}</span>
                  <button onClick={copyId} className="flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors hover:text-primary" title="Copy ID">
                    {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                  {plan.status === "Active"
                    ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[9px] font-semibold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/40">● Active</span>
                    : <span className="rounded-full border border-border bg-muted px-1.5 py-px text-[9px] font-semibold text-muted-foreground">● Hidden</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          {plan.hasOffer && (
            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
              <Info className="h-3 w-3" />Offer · {plan.discount !== "—" ? `${plan.discount} Off` : "Special offer"}{plan.validTill !== "—" ? ` — till ${plan.validTill}` : ""}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Basic info */}
          <Section title="Basic info">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Info2 label="Developer" value={plan.devName} />
              <Info2 label="Project" value={plan.projName} />
              <Info2 label="Plan name" value={plan.name} />
              <Info2 label="Type" value={plan.planType} />
              <Info2 label="Currency" value={plan.currency} />
              {!isCash && <Info2 label="Down payment" value={plan.dp} />}
              {!isCash && <Info2 label="Duration" value={plan.duration} />}
              {!isCash && <Info2 label="Frequency" value={plan.frequency} />}
              {!isCash && <Info2 label="Instal %" value={plan.instalPct} />}
              <Info2 label="Discount" value={plan.discount} valueClass={plan.discount !== "—" ? "text-emerald-600 font-semibold" : ""} />
              {plan.validTill !== "—" && <Info2 label="Valid till" value={plan.validTill} valueClass="text-amber-600 font-medium" />}
            </div>
          </Section>

          {/* Price after discount / cash payment */}
          {e.priceAfterDiscount && (
            <Section title={isCash ? "Payment" : "Price after discount"}>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <span className="text-[11px] text-muted-foreground line-through">{e.priceAfterDiscount.original}</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-foreground">{e.priceAfterDiscount.final}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">{e.priceAfterDiscount.badge}</span>
                </div>
              </div>
            </Section>
          )}

          {/* Initial payments */}
          {!isCash && e.initialPayments && e.initialPayments.length > 0 && (
            <Section title="Initial payments">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {e.initialPayments.map((ip, i) => (
                  <div key={i} className="flex flex-col gap-px">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">{ip.label}</span>
                    <span className="text-[12px] font-semibold text-foreground">{ip.pct}</span>
                    {ip.amt && <span className="text-[10px] font-medium text-muted-foreground">{ip.amt}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Milestones */}
          {!isCash && e.milestones && e.milestones.length > 0 && (
            <Section title="Milestones">
              <div className="space-y-1.5">{e.milestones.map((m, i) => <Row key={i} n={i + 1} name={m.name} at={m.at} amt={m.amt} pct={m.pct} />)}</div>
            </Section>
          )}

          {/* Installments */}
          {!isCash && e.installments && (
            <Section title="Installments">
              <div className="mb-2 flex items-baseline gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <span className="text-[13px] font-bold text-foreground">{e.installments.pct}</span>
                <span className="text-[11px] text-muted-foreground">({e.installments.amt})</span>
                <span className="text-[11px] font-medium text-muted-foreground">{e.installments.freq}</span>
              </div>
              {e.bulks && e.bulks.length > 0 && <div className="space-y-1.5">{e.bulks.map((b, i) => <Row key={i} n={i + 1} name={b.name} at={b.at} amt={b.amt} pct={b.pct} />)}</div>}
            </Section>
          )}

          {/* Attachments */}
          {e.attachments && e.attachments.length > 0 && (
            <Section title="Attachments">
              <div className="space-y-1.5">
                {e.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-foreground">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.size}</p></div>
                    <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted" title="Download"><Download className="h-3 w-3" /></button>
                    <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted" title="Open"><ExternalLink className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Conditions */}
          {e.conditions && e.conditions.andGroups.length > 0 && (
            <Section title="Conditions">
              <div className="space-y-1.5">
                {e.conditions.andGroups.map((grp, gi) => (
                  <div key={gi} className="space-y-1.5">
                    {gi > 0 && <div className="flex items-center gap-2"><div className="h-px flex-1 bg-border" /><span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">And</span><div className="h-px flex-1 bg-border" /></div>}
                    {grp.map((r, ri) => (
                      <div key={ri} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[11px]">
                        <span className={cn("rounded px-1.5 py-px text-[9px] font-bold uppercase", r.op === "OR" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary")}>{gi > 0 && ri === 0 ? "AND" : r.op}</span>
                        <span className="font-medium text-foreground">{r.field}</span>
                        <span className="text-muted-foreground">{r.operator}</span>
                        {r.values.map((v, vi) => <span key={vi} className="rounded bg-card px-1.5 py-px font-medium text-foreground ring-1 ring-border">{v}</span>)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        {onEdit && (
          <div className="shrink-0 border-t border-border px-5 py-3">
            <button onClick={onEdit} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <Pencil className="h-3.5 w-3.5" />Edit plan
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}
function Info2({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-px">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  )
}
function Row({ n, name, at, amt, pct }: { n: number; name: string; at: string; amt?: string; pct: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{n}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-foreground">{name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{at}{amt ? ` · ${amt}` : ""}</p>
      </div>
      <span className="shrink-0 text-[12px] font-bold text-foreground">{pct}</span>
    </div>
  )
}

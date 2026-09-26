"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight, Banknote, BedDouble, Boxes, CalendarDays, Check, CheckCircle2, CircleAlert, ImagePlus, LayoutGrid,
  LayoutTemplate, Paintbrush, Ruler, Rows3, Sparkles, Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { LinkedPlanCard, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { FloorPlanCard, FLOOR_PLANS0 } from "@/components/floor-plans-page"
import { FullscreenViewer, RENDER_IMAGES, RenderCard } from "@/components/render-images-page"
import { SheetPreviewCard, displayCell } from "@/components/sheet-preview"
import { GroupedPropertyCard, MiniStat, PanelCard, Split, TAG, TONE_TAG, UnitsGrid, unitTable, type Extra, type StepCtx } from "@/components/bulk-entry-steps"
import { fmtInt, isBlank, txt, type GridRow, type GridTable, type GroupRec, type URow } from "@/lib/bulk-ingestion"
import { STEP_KEYS, STEP_LABEL, isSkipped, stepStatus, type PlanDraft } from "@/lib/bulk-entry-flow"

type GridFocus = { rowIds: string[]; label: string } | null
const fmtRange = (a: number, b: number, unit = "") => (a && b && a !== b ? `${fmtInt(a)}–${fmtInt(b)}${unit}` : a ? `${fmtInt(a)}${unit}` : "—")
const fmtMoneyShort = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : fmtInt(n))

/* ── Step 8 · Payment Plans ──────────────────────────────────────────────── */

/** A plan read from the sources, shaped for the shared LinkedPlanCard. */
function planCard(p: PlanDraft, linked: number, devName: string): PlanCardData {
  const inst = p.years ? 100 - p.dp : 0
  return {
    id: p.source === "Database" ? p.id.replace("DB-", "") : p.id,
    name: p.name,
    status: "Active",
    hasOffer: !!p.discount,
    devName,
    devId: "",
    projName: p.mainName,
    projId: p.mainId,
    units: linked,
    available: linked,
    priceCount: linked,
    historicalCount: 0,
    planType: p.freq === "Cash" ? "Cash" : "Installments",
    currency: "EGP",
    discount: p.discount ? `${p.discount}%` : "—",
    validTill: "31 Dec 2026",
    dp: `${p.dp}%`,
    duration: p.years ? `${p.years} years` : "—",
    frequency: p.freq,
    instalPct: p.years ? `${inst}%` : "—",
    createdAt: "—",
    updatedAt: "—",
    expanded: {
      isCash: p.freq === "Cash",
      initialPayments: [{ label: "Down payment", pct: `${p.dp}%` }],
      installments: p.years ? { pct: `${inst}%`, amt: `${p.years * (p.freq === "Monthly" ? 12 : 4)} installments`, freq: p.freq === "Monthly" ? "/ Month" : "/ Quarter" } : null,
    },
  }
}

export function StepPlans({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set, entry } = ctx
  const [expanded, setExpanded] = useState<string | null>(null)
  const [viewing, setViewing] = useState<PlanCardData | null>(null)
  const [focus, setFocus] = useState<GridFocus>(null)
  const short = useMemo(() => new Map(pipe.plans.map((p) => [p.id, p.name.split(" — ")[0].split(" · ")[0]])), [pipe.plans])
  const linkedRows = (id: string) => pipe.reviewed.filter((r) => work.rowPlans[r.id]?.includes(id))
  const without = pipe.reviewed.filter((r) => !work.rowPlans[r.id]?.length)
  const setPlans = (rowIds: string[], plans: string[] | ((cur: string[]) => string[])) =>
    set((w) => ({ rowPlans: { ...w.rowPlans, ...Object.fromEntries(rowIds.map((id) => [id, typeof plans === "function" ? plans(w.rowPlans[id] ?? []) : plans])) } }))
  const extra: Extra[] = [{ col: { key: "_plans", label: "Payment plans" }, get: (r) => (work.rowPlans[r.id] ?? []).map((id) => short.get(id)).join(", ") || null }]
  const groups: { title: string; plans: PlanDraft[] }[] = [
    { title: "Read from this entry", plans: pipe.plans.filter((p) => p.source === "Detected") },
    { title: "Already on the project", plans: pipe.plans.filter((p) => p.source === "Database") },
  ]

  return (
    <Split
      panel={
        <>
          <PanelCard title="Coverage">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Rows with plans" value={`${pipe.reviewed.length - without.length}/${pipe.reviewed.length}`} tone={without.length ? "warn" : "ok"} />
              <MiniStat label="Plans in use" value={pipe.plans.filter((p) => linkedRows(p.id).length).length} />
            </div>
            {without.length > 0 && <button type="button" onClick={() => setFocus({ rowIds: without.map((r) => r.id), label: "rows without a payment plan" })} className="mt-2 text-xs font-medium text-primary hover:underline">Show {without.length} rows without a plan</button>}
          </PanelCard>
          {groups.map((g) => g.plans.length > 0 && (
            <PanelCard key={g.title} title={g.title} right={<span className={cn(TAG, g.plans[0].source === "Detected" ? TONE_TAG.info : TONE_TAG.muted)}>{g.plans.length}</span>}>
              <div className="space-y-3">
                {g.plans.map((p) => {
                  const rows = linkedRows(p.id)
                  const card = planCard(p, rows.length, entry.developer?.name ?? "")
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <LinkedPlanCard
                        plan={card}
                        isExpanded={expanded === p.id}
                        onToggleExpand={() => setExpanded((v) => (v === p.id ? null : p.id))}
                        totalInGroup={g.plans.length}
                        readOnly
                        fullWidth
                        hideIds={p.source === "Detected"}
                        hideTimestamps
                        onView={() => setViewing(card)}
                        statusTag={<span className={cn(TAG, p.source === "Detected" ? TONE_TAG.info : TONE_TAG.muted)}>{p.source === "Detected" ? "Detected" : "Database"}</span>}
                      />
                      <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
                        <span className="truncate text-muted-foreground">{p.from}</span>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          <button type="button" className="font-medium text-primary hover:underline" disabled={!rows.length} onClick={() => setFocus({ rowIds: rows.map((r) => r.id), label: `rows on ${p.name}` })}>{rows.length} rows</button>
                          <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setPlans(pipe.reviewed.map((r) => r.id), (cur) => [...new Set([...cur, p.id])]); toast.success(`${p.name} linked to every row`) }}>Link to all</button>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </PanelCard>
          ))}
        </>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Units"
        output={pipe.reviewed}
        extra={extra}
        markCell={(rowId, key) => (key === "_plans" && !work.rowPlans[rowId]?.length ? { tone: "warn", note: "No payment plan yet" } : null)}
        focus={focus}
        onClearFocus={() => setFocus(null)}
        bulkActions={({ rowIds, clear }) => (
          <LinkPlans plans={pipe.plans} onApply={(ids) => { setPlans(rowIds, ids); toast.success(`${ids.length ? "Plans linked to" : "Plans removed from"} ${rowIds.length} rows`); clear() }} />
        )}
      />
      <PaymentPlanDetailsDrawer plan={viewing} onClose={() => setViewing(null)} />
    </Split>
  )
}

function LinkPlans({ plans, onApply }: { plans: PlanDraft[]; onApply: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"><Wallet className="h-3 w-3" />Set plans</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <p className="px-1 pb-1.5 text-xs font-semibold text-foreground">Payment plans for the selected rows</p>
        {plans.map((p) => (
          <button key={p.id} type="button" onClick={() => setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))} className={cn("flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-xs hover:bg-secondary", picked.includes(p.id) && "bg-primary/5")}>
            <span className={cn("flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border", picked.includes(p.id) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white")}>{picked.includes(p.id) && <Check className="h-2.5 w-2.5" />}</span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className={cn(TAG, p.source === "Detected" ? TONE_TAG.info : TONE_TAG.muted)}>{p.source}</span>
          </button>
        ))}
        <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => { onApply([]); setOpen(false) }}>Remove all</Button>
          <Button size="sm" className="h-7 text-xs" disabled={!picked.length} onClick={() => { onApply(picked); setOpen(false); setPicked([]) }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ── Step 9 · Floor Plans ────────────────────────────────────────────────── */

export function StepFloorPlans({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [picking, setPicking] = useState<string | null>(null)
  const [focus, setFocus] = useState<GridFocus>(null)
  const auto = work.dataType === "Automatic"
  const fpById = useMemo(() => new Map(FLOOR_PLANS0.map((f) => [f.id, f])), [])
  const keyOfRow = useMemo(() => new Map(pipe.floorKeys.flatMap((k) => k.rowIds.map((id) => [id, k.key] as const))), [pipe.floorKeys])
  const extra: Extra[] = [{ col: { key: "_fp", label: "Floor plan" }, get: (r) => { const fp = fpById.get(work.floorPlans[keyOfRow.get(r.id) ?? ""] ?? ""); return fp ? `${fp.id} · ${fp.unitType} ${fp.bedrooms ? `${fp.bedrooms}BR` : ""} · ${fp.areaSqm} m²` : null } }]
  const key = pipe.floorKeys.find((k) => k.key === picking)
  const ranked = useMemo(() => {
    if (!key) return []
    const score = (f: (typeof FLOOR_PLANS0)[number]) => (f.bedrooms === (key.beds ?? -1) ? 0 : 200) + Math.abs(f.areaSqm - (key.area ?? f.areaSqm)) + (f.unitType === key.type ? 0 : 60)
    return [...FLOOR_PLANS0].sort((a, b) => score(a) - score(b))
  }, [key])
  const done = pipe.floorKeys.filter((k) => work.floorPlans[k.key]).length

  return (
    <Split
      panel={
        <PanelCard title={auto ? "Models" : "Grouped properties"} right={<span className={cn(TAG, done === pipe.floorKeys.length ? TONE_TAG.ok : TONE_TAG.warn)}>{done}/{pipe.floorKeys.length}</span>}>
          <p className="mb-2 text-xs text-muted-foreground">{auto ? "Units of the same model share one floor plan." : "Each grouped property gets its own floor plan."} AI ranks the library by bedrooms and area.</p>
          <div className="space-y-2">
            {pipe.floorKeys.map((k) => {
              const fp = fpById.get(work.floorPlans[k.key] ?? "")
              return (
                <div key={k.key} className={cn("flex items-center gap-2.5 rounded-lg border p-2", fp ? "border-border" : "border-amber-200 bg-amber-50/30")}>
                  <button type="button" onClick={() => setPicking(k.key)} className="flex h-12 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {fp ? <img src={fp.imageUrl} alt={fp.id} className="h-full w-full object-cover" /> : <LayoutTemplate className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setFocus({ rowIds: k.rowIds, label: k.label })} className="block max-w-full truncate text-left text-[13px] font-medium text-foreground hover:text-primary">{k.label}</button>
                    <p className="truncate text-[11px] text-muted-foreground">{k.rowIds.length} {auto ? "units" : "row"} · {k.beds ? `${k.beds}BR · ` : ""}{k.area ? `~${k.area} m²` : ""}</p>
                    <p className="truncate text-[11px]">{fp ? <span className="text-foreground">{fp.id} · {fp.unitType} · {fp.areaSqm} m²</span> : <span className="text-amber-700">No floor plan</span>}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPicking(k.key)}>{fp ? "Change" : "Pick"}</Button>
                </div>
              )
            })}
          </div>
        </PanelCard>
      }
    >
      <UnitsGrid
        ctx={ctx}
        title="Units"
        output={pipe.reviewed}
        extra={extra}
        markCell={(rowId, k) => (k === "_fp" && !work.floorPlans[keyOfRow.get(rowId) ?? ""] ? { tone: "warn", note: "No floor plan yet" } : null)}
        focus={focus}
        onClearFocus={() => setFocus(null)}
      />
      <Dialog open={!!picking} onOpenChange={(o) => !o && setPicking(null)}>
        <DialogContent className="flex max-h-[88vh] !w-[92vw] !max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <DialogTitle className="text-base font-semibold">Floor plan for {key?.label}</DialogTitle>
            <p className="text-xs text-muted-foreground">{key?.rowIds.length} {auto ? "units" : "row"} · {key?.beds ? `${key.beds} bedrooms · ` : ""}{key?.area ? `~${key.area} m²` : ""} — closest matches first</p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-4">
            {ranked.map((fp, i) => {
              const current = work.floorPlans[picking ?? ""] === fp.id
              return (
                <div
                  key={fp.id}
                  onClick={() => { if (!picking) return; set((w) => ({ floorPlans: { ...w.floorPlans, [picking]: fp.id } })); toast.success(`${fp.id} attached to ${key?.label}`); setPicking(null) }}
                  className={cn("relative cursor-pointer rounded-xl transition-shadow hover:ring-2 hover:ring-primary/40", current && "ring-2 ring-primary")}
                >
                  {i < 2 && <span className={cn(TAG, "absolute left-2 top-10 z-10 border-violet-200 bg-violet-50 text-violet-700")}><Sparkles className="h-3 w-3" />Best match</span>}
                  <FloorPlanCard fp={fp} onView={() => {}} onDelete={() => toast.info("Floor plans are managed in the Floor Plans page")} onStatusChange={() => toast.info("Floor plans are managed in the Floor Plans page")} />
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Split>
  )
}

/* ── Step 10 · Grouping & Media ──────────────────────────────────────────── */

export function StepGrouping({ ctx }: { ctx: StepCtx }) {
  const { pipe, work, set } = ctx
  const [mode, setMode] = useState<"cards" | "table">("cards")
  const [mediaFor, setMediaFor] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [viewer, setViewer] = useState<{ images: string[]; i: number } | null>(null)
  const renderById = useMemo(() => new Map(RENDER_IMAGES.map((r) => [r.id, r])), [])
  const fpById = useMemo(() => new Map(FLOOR_PLANS0.map((f) => [f.id, f])), [])
  const keyOfRow = useMemo(() => new Map(pipe.floorKeys.flatMap((k) => k.rowIds.map((id) => [id, k.key] as const))), [pipe.floorKeys])
  const auto = work.dataType === "Automatic"
  const plansOf = (g: GroupRec) => new Set(g.rowIds.flatMap((id) => work.rowPlans[id] ?? [])).size
  const fpOf = (g: GroupRec) => fpById.get(work.floorPlans[keyOfRow.get(g.rowIds[0]) ?? ""] ?? "")
  const openMedia = (g: GroupRec) => { setMediaFor(g.key); setPicked(work.groupMedia[g.key] ?? []) }
  const current = pipe.groups.find((g) => g.key === mediaFor)
  const withMedia = pipe.groups.filter((g) => work.groupMedia[g.key]?.length).length

  const table: GridTable = {
    cols: [
      { key: "title", label: "Grouped property" }, { key: "project", label: "Project" }, { key: "units", label: "Units", type: "number" },
      { key: "bua", label: "BUA m²" }, { key: "price", label: "Price EGP" }, { key: "delivery", label: "Delivery" },
      { key: "plans", label: "Payment plans", type: "number" }, { key: "fp", label: "Floor plan" }, { key: "media", label: "Media", type: "number" }, { key: "status", label: "Status" },
    ],
    rows: pipe.groups.map((g, i): GridRow => ({
      id: g.key, idx: i + 1,
      cells: {
        title: g.title, project: g.projectLabel, units: g.rowIds.length, bua: fmtRange(g.buaMin, g.buaMax), price: fmtRange(g.priceMin, g.priceMax),
        delivery: g.deliveryType === "Ready to Move" ? "Ready to Move" : displayCell(g.deliveryDate, "date") || "—",
        plans: plansOf(g), fp: fpOf(g)?.id ?? null, media: work.groupMedia[g.key]?.length ?? 0, status: g.existingId ? `Updates ${g.existingId}` : "New",
      },
    })),
    hasHeader: true,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(TAG, "border-blue-200 bg-blue-100 text-blue-700")}>{pipe.groups.length} grouped properties</span>
          <span className={cn(TAG, TONE_TAG.ok)}>{pipe.groups.filter((g) => !g.existingId).length} new</span>
          <span className={cn(TAG, TONE_TAG.muted)}>{pipe.groups.filter((g) => g.existingId).length} update existing</span>
          <span className={cn(TAG, withMedia === pipe.groups.length ? TONE_TAG.ok : TONE_TAG.warn)}>{withMedia}/{pipe.groups.length} with media</span>
          {auto && <span className="text-xs text-muted-foreground">Units group by project · type · bedrooms · finishing.</span>}
        </div>
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {(["cards", "table"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {m === "cards" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}{m === "cards" ? "Cards" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {mode === "table" ? (
        <SheetPreviewCard sheets={[{ name: "Grouped properties", output: table }]} title="Grouped properties" showTabs={false} selectable={false} />
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {pipe.groups.map((g) => {
            const media = (work.groupMedia[g.key] ?? []).map((id) => renderById.get(id)).filter(Boolean)
            const fp = fpOf(g)
            return (
              <GroupedPropertyCard
                key={g.key}
                propertyId={g.existingId ?? null}
                title={g.title}
                keywords={`${g.projectLabel} · ${g.rowIds.length} ${auto ? "units" : "listing"}`}
                tint={media.length ? null : "warn"}
                tags={<span className={cn(TAG, g.existingId ? TONE_TAG.muted : TONE_TAG.ok)}>{g.existingId ? "Updates existing" : "New"}</span>}
                cells={[
                  { icon: <Boxes className="h-3 w-3" />, label: auto ? "Units" : "Listing", value: auto ? String(g.rowIds.length) : "Grouped" },
                  { icon: <Ruler className="h-3 w-3" />, label: "BUA", value: fmtRange(g.buaMin, g.buaMax, " m²") },
                  { icon: <Banknote className="h-3 w-3" />, label: "Price", value: g.priceMin ? `${fmtMoneyShort(g.priceMin)}${g.priceMax && g.priceMax !== g.priceMin ? `–${fmtMoneyShort(g.priceMax)}` : ""} EGP` : "—" },
                  { icon: <CalendarDays className="h-3 w-3" />, label: "Delivery", value: g.deliveryType === "Ready to Move" ? "Ready to Move" : displayCell(g.deliveryDate, "date") || "—" },
                  { icon: <BedDouble className="h-3 w-3" />, label: "Bedrooms", value: g.bedrooms ? String(g.bedrooms) : "—" },
                  { icon: <Paintbrush className="h-3 w-3" />, label: "Finishing", value: g.finishing || "—" },
                  { icon: <Wallet className="h-3 w-3" />, label: "Payment plans", value: String(plansOf(g)) },
                  { icon: <LayoutTemplate className="h-3 w-3" />, label: "Floor plan", value: fp ? fp.id : "—" },
                ]}
              >
                <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
                  {media.length ? media.map((m, i) => (
                    <button key={m!.id} type="button" onClick={() => setViewer({ images: media.map((x) => x!.url || "/placeholder.jpg"), i })} className="h-12 w-16 overflow-hidden rounded-md border border-border">
                      <img src={m!.url || "/placeholder.jpg"} alt={m!.id} className="h-full w-full object-cover" />
                    </button>
                  )) : <span className="text-xs text-amber-700">No media yet</span>}
                  <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 px-2 text-xs" onClick={() => openMedia(g)}><ImagePlus className="h-3.5 w-3.5" />{media.length ? "Edit media" : "Assign media"}</Button>
                </div>
              </GroupedPropertyCard>
            )
          })}
        </div>
      )}

      <Dialog open={!!mediaFor} onOpenChange={(o) => !o && setMediaFor(null)}>
        <DialogContent className="flex max-h-[88vh] !w-[92vw] !max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <DialogTitle className="text-base font-semibold">Media for {current?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">{current?.projectLabel} · pick renders — the first one becomes the cover</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 md:grid-cols-3 lg:grid-cols-4">
            {RENDER_IMAGES.slice(0, 16).map((img) => (
              <RenderCard
                key={img.id}
                img={img}
                selected={picked.includes(img.id)}
                onSelect={() => setPicked((x) => (x.includes(img.id) ? x.filter((i) => i !== img.id) : [...x, img.id]))}
                onView={() => setViewer({ images: [img.url || "/placeholder.jpg"], i: 0 })}
                onDelete={() => toast.info("Renders are managed in the Render Images page")}
              />
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-sm text-muted-foreground">{picked.length} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMediaFor(null)}>Cancel</Button>
              <Button onClick={() => { if (mediaFor) set((w) => ({ groupMedia: { ...w.groupMedia, [mediaFor]: picked } })); setMediaFor(null); toast.success("Media updated") }}>Save media</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {viewer && <FullscreenViewer images={viewer.images} startIndex={viewer.i} onClose={() => setViewer(null)} />}
    </div>
  )
}

/* ── Step 11 · Final Check ───────────────────────────────────────────────── */

export interface FinalCounts { fresh: number; updated: number; unchanged: number; unavailable: number; groups: number; plans: number; floorPlans: number; media: number }

export function finalCounts(ctx: StepCtx): FinalCounts {
  const { pipe, work } = ctx
  const dbMap = new Map(pipe.db.map((d) => [d.id, d]))
  let fresh = 0, updated = 0, unchanged = 0
  for (const r of pipe.reviewed) {
    const d = r.match?.status === "matched" && r.match.dbId ? dbMap.get(r.match.dbId) : undefined
    if (!d) { fresh++; continue }
    const diff = pipe.fields.some((f) => f.key !== "project" && !(isBlank(r.v[f.key]) && isBlank(d.v[f.key])) && txt(r.v[f.key]) !== txt(d.v[f.key]))
    diff ? updated++ : unchanged++
  }
  return {
    fresh, updated, unchanged,
    unavailable: work.fullInventory ? pipe.missing.filter((d) => !work.keepMissing.includes(d.id)).length : 0,
    groups: pipe.groups.length,
    plans: new Set(Object.values(work.rowPlans).flat()).size,
    floorPlans: Object.keys(work.floorPlans).length,
    media: pipe.groups.filter((g) => work.groupMedia[g.key]?.length).length,
  }
}

export function StepFinal({ ctx, goStep }: { ctx: StepCtx; goStep: (i: number) => void }) {
  const { pipe, work } = ctx
  const auto = work.dataType === "Automatic"
  const c = finalCounts(ctx)
  const dbMap = useMemo(() => new Map(pipe.db.map((d) => [d.id, d])), [pipe.db])
  const unavailable = work.fullInventory ? pipe.missing.filter((d) => !work.keepMissing.includes(d.id)) : []
  const projectLabel = (id: string) => pipe.options.find((o) => o.id === id)?.label ?? ""

  // Database state vs what ingest will write — matched rows diff, new rows add, unavailable units strike
  const dbTable: GridTable = useMemo(() => ({
    ...unitTable([], pipe.fields),
    rows: [
      ...pipe.reviewed.flatMap((r): GridRow[] => {
        const d = r.match?.status === "matched" && r.match.dbId ? dbMap.get(r.match.dbId) : undefined
        return d ? [{ id: r.id, idx: r.idx, cells: Object.fromEntries(pipe.fields.map((f) => [f.key, f.key === "project" ? r.v.project ?? null : d.v[f.key] ?? null])) }] : []
      }),
      ...unavailable.map((d, i): GridRow => ({ id: `db:${d.id}`, idx: 9000 + i, cells: Object.fromEntries(pipe.fields.map((f) => [f.key, f.key === "project" ? projectLabel(d.projectId) : d.v[f.key] ?? null])) })),
    ],
  }), [pipe.reviewed, pipe.fields, dbMap, unavailable]) // eslint-disable-line react-hooks/exhaustive-deps
  const afterTable = useMemo(() => unitTable(pipe.reviewed, pipe.fields), [pipe.reviewed, pipe.fields])

  const byProject = useMemo(() => {
    const m = new Map<string, { label: string; rows: number; fresh: number; groups: number }>()
    pipe.reviewed.forEach((r) => {
      const k = r.projectId ?? "?"
      const cur = m.get(k) ?? { label: txt(r.v.project) || "Unassigned", rows: 0, fresh: 0, groups: 0 }
      cur.rows++
      if (r.match?.status !== "matched") cur.fresh++
      m.set(k, cur)
    })
    pipe.groups.forEach((g) => { const cur = m.get(g.projectId); if (cur) cur.groups++ })
    return [...m.values()]
  }, [pipe.reviewed, pipe.groups])

  const checklist = STEP_KEYS.slice(0, -1).map((k, i) => ({ k, i, skipped: isSkipped(k, pipe), s: stepStatus(k, work, pipe) }))
  const tiles = auto
    ? [
      { label: "New units", value: c.fresh, tone: "ok" as const },
      { label: "Updated units", value: c.updated, tone: "warn" as const },
      { label: "Unchanged", value: c.unchanged, tone: "muted" as const },
      { label: "Marked unavailable", value: c.unavailable, tone: "error" as const },
    ]
    : [
      { label: "New grouped properties", value: c.fresh, tone: "ok" as const },
      { label: "Updated", value: c.updated, tone: "warn" as const },
      { label: "Unchanged", value: c.unchanged, tone: "muted" as const },
    ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {tiles.map((t) => <MiniStat key={t.label} label={t.label} value={fmtInt(t.value)} tone={t.tone} />)}
        {auto && <MiniStat label="Grouped properties" value={c.groups} />}
        <MiniStat label="Payment plans" value={c.plans} />
        <MiniStat label="Floor plans" value={c.floorPlans} />
        <MiniStat label="With media" value={`${c.media}/${c.groups}`} tone={c.media === c.groups ? "ok" : "warn"} />
      </div>

      <Split
        panel={
          <>
            <PanelCard title="Checklist">
              <div className="space-y-1">
                {checklist.map(({ k, i, skipped, s }) => (
                  <button key={k} type="button" disabled={skipped} onClick={() => goStep(i)} className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/60 disabled:hover:bg-transparent">
                    {skipped ? <span className="h-3.5 w-3.5 rounded-full border border-dashed border-muted-foreground/40" /> : s.blocking ? <CircleAlert className="h-3.5 w-3.5 text-red-600" /> : s.warnings ? <CircleAlert className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    <span className={cn("flex-1 font-medium", skipped ? "text-muted-foreground" : "text-foreground")}>{STEP_LABEL[k]}</span>
                    <span className={cn("truncate text-[11px]", s.blocking ? "text-red-600" : "text-muted-foreground")}>{skipped ? "Not needed" : s.note}</span>
                    {!skipped && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </PanelCard>
            <PanelCard title="By project">
              <div className="space-y-1.5">
                {byProject.map((p) => (
                  <div key={p.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate font-medium text-foreground">{p.label}</span>
                    <span className="flex-shrink-0 text-muted-foreground">{p.rows} {auto ? "units" : "rows"} · {p.fresh} new{auto ? ` · ${p.groups} groups` : ""}</span>
                  </div>
                ))}
              </div>
            </PanelCard>
          </>
        }
      >
        <SheetPreviewCard
          sheets={[{ name: "Ingest preview", input: dbTable, output: afterTable }]}
          title="Database vs this entry"
          showTabs={false}
          initialView="diff"
          viewLabels={{ input: "Database", output: "After ingest" }}
          headerExtra={unavailable.length > 0 && <span className="text-xs text-muted-foreground">Struck-through rows are marked unavailable.</span>}
        />
      </Split>
    </div>
  )
}

/* ── Finalized ───────────────────────────────────────────────────────────── */

export function FinalizedSummary({ ctx, counts, activeSec, onBack }: { ctx: StepCtx; counts: FinalCounts; activeSec: number; onBack: () => void }) {
  const { work, pipe } = ctx
  const auto = work.dataType === "Automatic"
  const mm = Math.floor(activeSec / 60)
  const ss = activeSec % 60
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></span>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Entry finalized</h2>
        <p className="text-sm text-muted-foreground">
          {auto ? `${fmtInt(counts.fresh + counts.updated)} units written` : `${fmtInt(counts.fresh + counts.updated)} grouped properties written`} to {[...new Set(pipe.reviewed.map((r) => txt(r.v.project).split(" › ")[0]))].join(", ")} as {work.saleType} · active time {mm}m {String(ss).padStart(2, "0")}s
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left md:grid-cols-4">
        <MiniStat label={auto ? "New units" : "New grouped"} value={fmtInt(counts.fresh)} tone="ok" />
        <MiniStat label="Updated" value={fmtInt(counts.updated)} tone="warn" />
        <MiniStat label="Unchanged" value={fmtInt(counts.unchanged)} tone="muted" />
        {auto ? <MiniStat label="Marked unavailable" value={fmtInt(counts.unavailable)} tone="error" /> : <MiniStat label="Payment plans" value={counts.plans} />}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={onBack}>Back to entries</Button>
        <Button onClick={() => toast.info("Opening the updated properties")}>View properties</Button>
      </div>
    </div>
  )
}

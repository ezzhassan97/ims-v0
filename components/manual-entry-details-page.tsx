"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight, Banknote, Bath, BedDouble, Building, Building2, CalendarDays, CheckCircle2, ChevronDown,
  ChevronsUpDown, Database, Eye, GitCompare, Home, Images, Layers, ListChecks, Paintbrush, Pencil, Plus,
  RefreshCw, Ruler, Save, ScanSearch, ScanText, Search, Trash2, TriangleAlert, Wallet, X, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { IdTag, FilterSelect } from "@/components/table-kit"
import { buildTypeGroups } from "@/components/grouped-properties-page"
import { LinkedPlanCard, PAYMENT_PLAN_GROUPS, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { RenderCard, RENDER_IMAGES, FullscreenViewer, type RenderImage } from "@/components/render-images-page"
import { FloorPlanCard, FLOOR_PLANS0, type FloorPlan } from "@/components/floor-plans-page"
import {
  TAG, SectionCard, StatTile, StepInitialSetup, WizardStepper, WizardHeader, EntryContextStrip, WizardFooter,
  ReviewIssueCard, GroupedPropertyCard, REVIEW_ISSUES, type GroupedCardCell, type WizardStep,
} from "@/components/sheet-entry-details-page"
import type { IngestionEntry } from "@/lib/ingestion-mock"

/* ------------------------------------------------------------------ */
/* Steps & mock grouped-property data                                  */
/* ------------------------------------------------------------------ */

const STEPS: readonly WizardStep[] = [
  { key: "Initial setup", icon: Database },
  { key: "Extraction", icon: ScanText },
  { key: "Comparison", icon: GitCompare },
  { key: "Payment plans", icon: Wallet },
  { key: "Media", icon: Images },
  { key: "Review", icon: ScanSearch },
  { key: "Check", icon: ListChecks },
]

const STAGE_TO_STEP: Record<string, number> = {
  "Initial Setup": 0, Extraction: 1, Comparison: 2, "Payment Plans": 3, Media: 4, Review: 5, "Final Check": 6, Finalized: 6,
}

type PropStatus = "New" | "Modified" | "Unmodified" | "Returned" | "Missing"

const STATUS_TONE: Record<PropStatus, string> = {
  New: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Modified: "border-amber-200 bg-amber-50 text-amber-700",
  Unmodified: "border-border bg-muted text-muted-foreground",
  Returned: "border-blue-200 bg-blue-50 text-blue-700",
  Missing: "border-red-300 bg-red-50 text-red-600",
}

function StatusTag({ s }: { s: PropStatus }) {
  return <span className={cn(TAG, STATUS_TONE[s])}>{s}</span>
}

const KEYWORDS = "Uptown Cairo, luxury villa, standalone villa, private garden, golf view, gated community, modern design, premium finishing, Emaar property, Cairo real estate"
const IMGS = ["/aerial-view-masterplan-residential-development-blu.jpg", "/luxury-clubhouse-exterior.jpg", "/placeholder.jpg"]
const FP_IMG = "/placeholder.jpg"

interface GroupProp {
  key: string
  id: string | null
  name: string
  status: PropStatus
  project: string
  category: string
  type: string
  subtype: string
  developerType: string
  bedrooms: string
  bathrooms: string
  finishing: string
  deliveryType: string
  deliveryDate: string
  areaRange: string
  priceRange: string
  images: number
  floorPlans: number
  matchedTo: string | "new" | null
  matchPct: number | null
  /** indexes into the shared PLAN_POOL */
  planIdx: number[]
  issues: { text: string; blocking: boolean }[]
}

function makeProp(key: string, over: Partial<GroupProp>): GroupProp {
  return {
    key,
    id: "721789123821",
    name: "Villa",
    status: "New",
    project: "Uptown cairo",
    category: "Apartments",
    type: "Apartments - Studio",
    subtype: "Apartments - Studio",
    developerType: "--",
    bedrooms: "3",
    bathrooms: "4",
    finishing: "Core & Shell",
    deliveryType: "Off-plan",
    deliveryDate: "Oct. 2028",
    areaRange: "96 - 102 SQM",
    priceRange: "4,800,000 - 6,900,000",
    images: 4,
    floorPlans: 2,
    matchedTo: null,
    matchPct: null,
    planIdx: [0, 1],
    issues: [],
    ...over,
  }
}

const INITIAL_PROPS: GroupProp[] = [
  makeProp("p1", {
    id: null, status: "New", project: "Project name", matchedTo: null,
    issues: [{ text: "Area is not assigned", blocking: true }, { text: "Building type is missing", blocking: false }],
  }),
  makeProp("p2", { status: "Unmodified", project: "Project name", matchedTo: "92303210990100", matchPct: 100, planIdx: [0, 1, 2] }),
  makeProp("p3", { id: null, status: "New", matchedTo: null, images: 0, floorPlans: 2 }),
  makeProp("p4", {
    status: "Modified", matchedTo: "92303210990100", matchPct: 80, images: 4, floorPlans: 0,
    issues: [{ text: "Entered area value is incorrect", blocking: true }],
  }),
  makeProp("p5", { status: "Returned", matchedTo: "92303210990100", matchPct: 100 }),
]

const MISSING_PROPS = [
  { key: "m1", name: "Palm Heights Penthouse 198", id: "92303210990100" },
  { key: "m2", name: "Palm Heights Penthouse 198", id: "92303210990100" },
]

function projectSections(props: GroupProp[]) {
  const names = [...new Set(props.map((p) => p.project))]
  return names.map((name) => ({ name, props: props.filter((p) => p.project === name) }))
}

const PLAN_POOL: PlanCardData[] = PAYMENT_PLAN_GROUPS.flatMap((g) => g.plans).slice(0, 3)

/* ------------------------------------------------------------------ */
/* Grouped-property card wrapper (shared GroupedPropertyCard)          */
/* ------------------------------------------------------------------ */

function propCells(p: GroupProp): GroupedCardCell[] {
  return [
    { icon: <Building2 className="h-3 w-3" />, label: "Project", value: p.project },
    { icon: <Home className="h-3 w-3" />, label: "Property Category", value: p.category },
    { icon: <Building className="h-3 w-3" />, label: "Property type", value: p.type },
    { icon: <Layers className="h-3 w-3" />, label: "Property Sub-type", value: p.subtype },
    { icon: <Building2 className="h-3 w-3" />, label: "Developer type", value: p.developerType },
    { icon: <BedDouble className="h-3 w-3" />, label: "Bedrooms", value: p.bedrooms },
    { icon: <Bath className="h-3 w-3" />, label: "Bathrooms", value: p.bathrooms },
    { icon: <Paintbrush className="h-3 w-3" />, label: "Finishing type", value: p.finishing },
    { icon: <CalendarDays className="h-3 w-3" />, label: "Delivery type / date", value: `${p.deliveryType} / ${p.deliveryDate}` },
    { icon: <Ruler className="h-3 w-3" />, label: "Gross Area Range", value: p.areaRange },
    { icon: <Banknote className="h-3 w-3" />, label: "Price", value: p.priceRange },
  ]
}

function ManualPropCard({ p, tint, tags, actions, selectable, selected, onToggle, children }: {
  p: GroupProp
  tint?: "warn" | "error" | null
  tags?: React.ReactNode
  actions?: React.ReactNode
  selectable?: boolean
  selected?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  return (
    <GroupedPropertyCard
      propertyId={p.id}
      metadataId={p.id ? `PMD-${p.key}` : null}
      title={p.name}
      keywords={KEYWORDS}
      cells={propCells(p)}
      tint={tint}
      selectable={selectable}
      selected={selected}
      onToggle={onToggle}
      tags={<><StatusTag s={p.status} />{tags}</>}
      actions={actions}
    >
      {children}
    </GroupedPropertyCard>
  )
}

function MediaThumbs({ count, images = IMGS, onAdd }: { count: number; images?: string[]; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
        <img key={i} src={images[i % images.length]} alt="Media" className="h-11 w-14 rounded border border-border object-cover" />
      ))}
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onAdd}><Plus className="h-4 w-4" /></Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 2 — Extraction                                                 */
/* ------------------------------------------------------------------ */

const EXTRACT_FEATURES: [string, boolean][] = [["Nanny", true], ["Driver", false], ["Storage", false], ["Parking", true], ["Garden", true], ["Roof", true]]

function ExtractionExtra({ editing }: { editing: boolean }) {
  const [features, setFeatures] = useState<Record<string, boolean>>(Object.fromEntries(EXTRACT_FEATURES))
  const areas: [string, string][] = [["Garden area", "89 SQM"], ["Open roof area", "12 SQM"], ["Roof anex area", "--"], ["Terrace area", "12 SQM"], ["Outdoor area", "40 SQM"], ["Storage area", "--"]]
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-bold text-foreground">Areas</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4">
          {areas.map(([k, v]) => (
            <div key={k}><p className="text-sm font-semibold text-foreground">{k}</p><p className="text-sm text-muted-foreground">{v}</p></div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-bold text-foreground">Features</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 lg:grid-cols-4">
          {EXTRACT_FEATURES.map(([k]) => (
            <span key={k} className="flex items-center gap-1.5 text-sm text-foreground">
              {editing ? (
                <Checkbox className="h-4 w-4" checked={features[k]} onCheckedChange={(v) => setFeatures((prev) => ({ ...prev, [k]: !!v }))} />
              ) : features[k] ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div><p className="text-sm font-bold text-foreground">Amenties</p><p className="text-sm text-foreground">Gym , Lake view</p></div>
        <div><p className="text-sm font-bold text-foreground">Services</p><p className="text-sm text-foreground">Gym , Lake view</p></div>
      </div>
    </div>
  )
}

function ExtractEditForm({ p, onSave, onCancel }: { p: GroupProp; onSave: (patch: Partial<GroupProp>) => void; onCancel: () => void }) {
  const [type, setType] = useState(p.type)
  const [category, setCategory] = useState(p.category)
  const [bedrooms, setBedrooms] = useState(p.bedrooms)
  const [bathrooms, setBathrooms] = useState(p.bathrooms)
  const [finishing, setFinishing] = useState(p.finishing)
  const [deliveryType, setDeliveryType] = useState(p.deliveryType)
  return (
    <div className="space-y-3 border-t border-border px-4 py-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Building2 className="h-3.5 w-3.5" />Project <span className="text-red-500">*</span></p>
          <Select defaultValue={p.project}>
            <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={p.project}>{p.project}</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Home className="h-3.5 w-3.5" />Property type</p>
          <Select value={`${category}|${type}`} onValueChange={(v) => { const [c, t] = v.split("|"); setCategory(c); setType(t) }}>
            <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {buildTypeGroups(category, type).flatMap((g) => g.types.map((t) => (
                <SelectItem key={`${g.category}|${t}`} value={`${g.category}|${t}`}>{t}</SelectItem>
              )))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><BedDouble className="h-3.5 w-3.5" />Bedrooms</p>
          <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Bath className="h-3.5 w-3.5" />Bathrooms</p>
          <Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Paintbrush className="h-3.5 w-3.5" />Finishing type</p>
          <Select value={finishing} onValueChange={setFinishing}>
            <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["Core & Shell", "Semi-finished", "Fully finished"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><CalendarDays className="h-3.5 w-3.5" />Delivery type</p>
          <Select value={deliveryType} onValueChange={setDeliveryType}>
            <SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["Off-plan", "Ready to move"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Ruler className="h-3.5 w-3.5" />Gross Area Range</p>
          <div className="flex gap-1.5"><Input placeholder="From" className="h-9 text-sm" /><Input placeholder="To" className="h-9 text-sm" /></div>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground"><Banknote className="h-3.5 w-3.5" />Price:</p>
          <div className="flex gap-1.5"><Input placeholder="From" className="h-9 text-sm" /><Input placeholder="To" className="h-9 text-sm" /></div>
        </div>
      </div>
      <ExtractionExtra editing />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={onCancel}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
        <Button size="sm" className="h-8" onClick={() => onSave({ type, category, subtype: type, bedrooms, bathrooms, finishing, deliveryType })}><Save className="mr-1 h-3.5 w-3.5" />Save</Button>
      </div>
    </div>
  )
}

function StepExtraction({ props, setProps }: { props: GroupProp[]; setProps: React.Dispatch<React.SetStateAction<GroupProp[]>> }) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!processing) return
    const t = setInterval(() => setProgress((v) => {
      if (v >= 100) { clearInterval(t); setProcessing(false); toast.success("Properties re-extracted"); return 0 }
      return v + 10
    }), 120)
    return () => clearInterval(t)
  }, [processing])

  const patch = (key: string, upd: Partial<GroupProp>) => setProps((prev) => prev.map((x) => (x.key === key ? { ...x, ...upd } : x)))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground">Extracted properties</h3>
          {!processing && <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-50 text-blue-700")}>{props.length} Properties extracted</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.info("Fullscreen preview is coming soon")}><ScanSearch className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 border-primary text-primary" disabled={processing} onClick={() => { setProgress(0); setProcessing(true) }}>Re-extract</Button>
        </div>
      </div>

      {processing ? (
        <SectionCard>
          <div className="space-y-2 p-4">
            <p className="text-sm font-medium text-foreground">Processing data</p>
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-semibold text-foreground">{progress}%</span>
            </div>
          </div>
        </SectionCard>
      ) : (
        projectSections(props).map((sec) => (
          <div key={sec.name} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-foreground">{sec.name}</h4>
                <span className={cn(TAG, "rounded-full border-border bg-card text-muted-foreground")}>{sec.props.length} Properties</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-primary font-semibold text-primary"
                onClick={() => {
                  const key = `new-${sec.name}-${sec.props.length + 1}`
                  setProps((prev) => [...prev, makeProp(key, { id: null, project: sec.name, status: "New", matchedTo: null })])
                  setEditingKey(key)
                }}
              >
                Add property
              </Button>
            </div>
            {sec.props.map((p) => (
              <ManualPropCard
                key={p.key}
                p={p}
                actions={
                  <>
                    <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Expand" onClick={() => setExpandedKey((k) => (k === p.key ? null : p.key))}>
                      <ChevronsUpDown className="h-3 w-3" />
                    </Button>
                    {editingKey !== p.key && (
                      <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Edit" onClick={() => setEditingKey(p.key)}><Pencil className="h-3 w-3" /></Button>
                    )}
                    <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent text-muted-foreground hover:text-destructive" title="Delete" onClick={() => { setProps((prev) => prev.filter((x) => x.key !== p.key)); toast.success("Property removed") }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                }
              >
                {editingKey === p.key && (
                  <ExtractEditForm p={p} onCancel={() => setEditingKey(null)} onSave={(u) => { patch(p.key, u); setEditingKey(null); toast.success("Property saved") }} />
                )}
                {editingKey !== p.key && expandedKey === p.key && (
                  <div className="border-t border-border px-4 py-3"><ExtractionExtra editing={false} /></div>
                )}
              </ManualPropCard>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 3 — Comparison & matching drawer                               */
/* ------------------------------------------------------------------ */

function MatchBar({ pct }: { pct: number }) {
  return (
    <span className="flex w-36 items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", pct >= 90 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm font-semibold text-foreground">{pct}%</span>
    </span>
  )
}

const MATCH_CANDIDATES = [
  { id: "92303210990100", pct: 100, status: "Available" as const },
  { id: "721789123821", pct: 90, status: "Available" as const },
  { id: "721789123822", pct: 80, status: "Sold off" as const },
]

function MatchingDrawer({ prop, onClose, onSave }: { prop: GroupProp | null; onClose: () => void; onSave: (sel: string | "new") => void }) {
  const [sel, setSel] = useState<string | "new" | null>(null)
  useEffect(() => { setSel(prop?.matchedTo ?? null) }, [prop])
  if (!prop) return null
  const candidate = MATCH_CANDIDATES.find((c) => c.id === sel)
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-lg font-bold text-foreground">{prop.project} - Matching</SheetTitle>
          <SheetDescription className="sr-only">Match the extracted property to an existing property group</SheetDescription>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <ManualPropCard p={prop} />

          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-foreground">Matched to</h4>
            <Button variant="outline" size="sm" className="h-8 border-primary font-semibold text-primary" onClick={() => setSel("new")}>Match as new</Button>
          </div>
          {sel === "new" ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 px-4 py-5 text-center">
              <p className="text-base font-bold text-foreground">Property will matched to new</p>
              <p className="text-sm text-muted-foreground">The existing property group will be matched to a newly created group with a separate, unique ID.</p>
            </div>
          ) : candidate ? (
            <div className="rounded-xl border-2 border-primary">
              <GroupedPropertyCard
                propertyId={candidate.id}
                title="Apartment studio"
                keywords={KEYWORDS}
                cells={propCells(prop)}
                tags={<><span className={cn(TAG, "border-emerald-200 bg-emerald-100 text-emerald-700")}>Available</span><MatchBar pct={candidate.pct} /></>}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">Pick a property below, or match as new.</p>
          )}

          <h4 className="text-base font-bold text-foreground">Other properties</h4>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <div><p className="mb-1 text-xs text-muted-foreground">ID</p><Input placeholder="Type…" className="h-9 text-sm" /></div>
            {["Delivery type", "Finishing type", "No. of bedrooms", "Status"].map((f) => (
              <div key={f}>
                <p className="mb-1 text-xs text-muted-foreground">{f}</p>
                <Select><SelectTrigger className="h-9 w-full text-sm"><SelectValue placeholder="select" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem></SelectContent></Select>
              </div>
            ))}
          </div>
          {MATCH_CANDIDATES.filter((c) => c.id !== sel).map((c) => (
            <GroupedPropertyCard
              key={c.id}
              propertyId={c.id}
              title="Apartment studio"
              keywords={KEYWORDS}
              cells={propCells(prop)}
              tags={
                <>
                  <span className={cn(TAG, c.status === "Available" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-50 text-red-600")}>{c.status}</span>
                  <MatchBar pct={c.pct} />
                </>
              }
              actions={
                <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Select this match" onClick={() => setSel(c.id)}>
                  <ChevronsUpDown className="h-3 w-3" />
                </Button>
              }
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={sel === null} onClick={() => sel !== null && onSave(sel)}>Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StepComparison({ props, setProps }: { props: GroupProp[]; setProps: React.Dispatch<React.SetStateAction<GroupProp[]>> }) {
  const [matching, setMatching] = useState<GroupProp | null>(null)
  const [projectF, setProjectF] = useState("")
  const [typeF, setTypeF] = useState("")
  const matched = props.filter((p) => p.matchedTo).length

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm font-bold text-foreground">Summary</span>
            <span className={cn(TAG, STATUS_TONE.New)}>New <b>8</b></span>
            <span className={cn(TAG, STATUS_TONE.Modified)}>Modified <b>2</b></span>
            <span className={cn(TAG, STATUS_TONE.Unmodified)}>Unmodified <b>0</b></span>
            <span className={cn(TAG, STATUS_TONE.Missing)}>Missing <b>2</b></span>
          </div>
          <span className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-1.5 text-sm text-foreground"><b>{matched * 10}</b> matched out of <b>32</b></span>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterSelect label="Project" value={projectF} options={["Project name", "Uptown cairo"]} onChange={setProjectF} className="w-40" />
          <FilterSelect label="Property type" value={typeF} options={["Villa", "Apartment"]} onChange={setTypeF} className="w-40" />
        </div>
        <Button variant="outline" className="h-8 gap-1.5 border-primary text-primary" onClick={() => toast.success("Properties re-matched")}><RefreshCw className="h-3.5 w-3.5" />Re-match</Button>
      </div>

      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-foreground">Extracted Properties</h3>
        <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-50 text-blue-700")}>{props.length} units extracted</span>
      </div>

      {projectSections(props).map((sec) => (
        <div key={sec.name} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-foreground">{sec.name}</h4>
            <span className={cn(TAG, "rounded-full border-border bg-card text-muted-foreground")}>{sec.props.length} Units</span>
          </div>
          {sec.props.map((p) => (
            <ManualPropCard
              key={p.key}
              p={p}
              tags={
                p.matchedTo === null ? (
                  <span className="text-xs font-semibold text-primary">Not matched</span>
                ) : p.matchedTo === "new" ? (
                  <span className={cn(TAG, "border-emerald-200 bg-emerald-100 text-emerald-700")}>Matched as new</span>
                ) : (
                  <>
                    <button className="text-xs font-semibold text-primary underline underline-offset-2" onClick={() => toast.info("Opening matched property is coming soon")}>
                      Matched to ID: {p.matchedTo}
                    </button>
                    {p.matchPct !== null && <MatchBar pct={p.matchPct} />}
                  </>
                )
              }
              actions={
                <Button variant="outline" size="sm" className="h-6 gap-1 bg-transparent px-2 text-xs" onClick={() => setMatching(p)}><GitCompare className="h-3 w-3" />Match</Button>
              }
            />
          ))}
        </div>
      ))}

      <MatchingDrawer
        prop={matching}
        onClose={() => setMatching(null)}
        onSave={(sel) => {
          setProps((prev) => prev.map((x) => (x.key === matching!.key ? { ...x, matchedTo: sel, matchPct: sel === "new" ? null : MATCH_CANDIDATES.find((c) => c.id === sel)?.pct ?? null } : x)))
          setMatching(null)
          toast.success(sel === "new" ? "Property will be matched as new" : "Property matched")
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 4 — Payment plans (LinkedPlanCard grid, launch-details style)  */
/* ------------------------------------------------------------------ */

function SourceChips() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-50 text-blue-700")}>● Database</span>
      <span className={cn(TAG, "rounded-full border-amber-300 bg-amber-50 text-amber-700")}>● Auto matched</span>
      <span className={cn(TAG, "rounded-full border-border bg-muted text-muted-foreground")}>● Manual</span>
    </div>
  )
}

function StepPaymentPlans({ props, setProps }: { props: GroupProp[]; setProps: React.Dispatch<React.SetStateAction<GroupProp[]>> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["p1", "p2"]))
  const [viewingPlan, setViewingPlan] = useState<PlanCardData | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [allPlansOpen, setAllPlansOpen] = useState(false)
  const toggle = (k: string) => setSelected((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1.5"><p className="text-sm font-bold text-foreground">Summary</p><SourceChips /></div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Units linked to Plans" value="7" total="12" />
            <StatTile label="Payment Plans Used" value="21" total="32" alert />
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">Extracted properties</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-8 border-red-300 font-semibold text-red-600"
            disabled={selected.size === 0}
            onClick={() => { setProps((prev) => prev.map((x) => (selected.has(x.key) ? { ...x, planIdx: [] } : x))); toast.success(`Payment plans removed from ${selected.size} properties`) }}
          >
            Remove ({selected.size})
          </Button>
          <Button
            variant="outline"
            className="h-8 border-primary font-semibold text-primary"
            disabled={selected.size === 0}
            onClick={() => { setProps((prev) => prev.map((x) => (selected.has(x.key) ? { ...x, planIdx: [0, 1, 2] } : x))); toast.success(`Payment plans assigned to ${selected.size} properties`) }}
          >
            Assign({selected.size})
          </Button>
          <Button variant="outline" className="h-8 border-primary font-semibold text-primary" onClick={() => setAllPlansOpen(true)}>All payment plans</Button>
        </div>
      </div>

      {projectSections(props).map((sec) => (
        <div key={sec.name} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-foreground">{sec.name}</h4>
            <span className={cn(TAG, "rounded-full border-border bg-card text-muted-foreground")}>{sec.props.length} Properties</span>
          </div>
          {sec.props.map((p) => (
            <ManualPropCard key={p.key} p={p} selectable selected={selected.has(p.key)} onToggle={() => toggle(p.key)}>
              <div className="border-t border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Payment plans</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => { setProps((prev) => prev.map((x) => (x.key === p.key ? { ...x, planIdx: [...new Set([...x.planIdx, x.planIdx.length % 3])] } : x))); toast.success("Payment plan added") }}
                  >
                    <Plus className="h-3 w-3" />Add plan
                  </Button>
                </div>
                {p.planIdx.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment plans linked.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {p.planIdx.slice(0, 3).map((i) => {
                      const plan = PLAN_POOL[i % PLAN_POOL.length]
                      const key = `${p.key}-${i}`
                      return (
                        <LinkedPlanCard
                          key={key}
                          plan={plan}
                          isExpanded={expandedPlan === key}
                          onToggleExpand={() => setExpandedPlan((v) => (v === key ? null : key))}
                          totalInGroup={p.planIdx.length}
                          readOnly
                          onView={() => setViewingPlan(plan)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </ManualPropCard>
          ))}
        </div>
      ))}

      <PaymentPlanDetailsDrawer plan={viewingPlan} onClose={() => setViewingPlan(null)} />
      <Sheet open={allPlansOpen} onOpenChange={setAllPlansOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <div className="border-b border-border bg-card px-5 py-4">
            <SheetTitle className="text-lg font-bold text-foreground">All payment plans</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">Plans available for this entry</SheetDescription>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {PLAN_POOL.map((plan) => (
              <LinkedPlanCard key={plan.id} plan={plan} isExpanded={false} onToggleExpand={() => {}} totalInGroup={PLAN_POOL.length} readOnly fullWidth onView={() => setViewingPlan(plan)} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 5 — Media (RenderCard / FloorPlanCard pickers)                 */
/* ------------------------------------------------------------------ */

function AssignImagesDialog({ open, targets, onClose, onAssign }: { open: boolean; targets: number; onClose: () => void; onAssign: (count: number) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<RenderImage | null>(null)
  const pool = RENDER_IMAGES.slice(0, 8)
  const toggle = (id: string) => setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogTitle className="text-lg font-bold text-foreground">Assign Images</DialogTitle>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn(TAG, "rounded-full border-border bg-card text-foreground")}>{targets} Units selected</span>
          <span className={cn(TAG, "rounded-full border-border bg-card text-foreground")}>{picked.size} images selected</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by ID" className="h-9 pl-8" />
        </div>
        {/* Real render-image cards — same component as the Render Images page */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pool.map((img) => (
            <RenderCard
              key={img.id}
              img={img}
              selected={picked.has(img.id)}
              onSelect={() => toggle(img.id)}
              onView={() => setViewing(img)}
              onDelete={() => toast.info("Manage images from the Render Images page")}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-primary text-primary" onClick={() => toast.info("Upload is coming soon")}>Upload new</Button>
          <Button disabled={picked.size === 0} onClick={() => { onAssign(picked.size); setPicked(new Set()) }}>Assign</Button>
        </div>
        {viewing && <FullscreenViewer images={[viewing.url]} startIndex={0} label={viewing.id} caption={viewing.caption} onClose={() => setViewing(null)} />}
      </DialogContent>
    </Dialog>
  )
}

function AddFloorPlanDialog({ open, targets, onClose, onAssign }: { open: boolean; targets: number; onClose: () => void; onAssign: (count: number) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [viewing, setViewing] = useState<FloorPlan | null>(null)
  const pool = FLOOR_PLANS0.slice(0, 6)
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogTitle className="text-lg font-bold text-foreground">Add floor plan</DialogTitle>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn(TAG, "rounded-full border-border bg-card text-foreground")}>{picked.length} Floor plans selected</span>
          <span className={cn(TAG, "rounded-full border-border bg-card text-foreground")}>{targets} Units</span>
        </div>
        {/* Real floor-plan cards — same component as the Floor Plans page, with pick order badges */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pool.map((fp) => {
            const order = picked.indexOf(fp.id)
            return (
              <div key={fp.id} className={cn("relative rounded-xl", order >= 0 && "ring-2 ring-primary")}>
                <button
                  className={cn("absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm",
                    order >= 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-transparent")}
                  title="Select floor plan"
                  onClick={() => toggle(fp.id)}
                >
                  {order >= 0 ? order + 1 : "0"}
                </button>
                <FloorPlanCard
                  fp={fp}
                  onView={() => setViewing(fp)}
                  onDelete={() => toast.info("Manage floor plans from the Floor Plans page")}
                  onStatusChange={() => toast.info("Manage floor plans from the Floor Plans page")}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-primary text-primary" onClick={() => toast.info("Upload is coming soon")}>Upload new</Button>
          <Button disabled={picked.length === 0} onClick={() => { onAssign(picked.length); setPicked([]) }}>Assign</Button>
        </div>
        {viewing && <FullscreenViewer images={[viewing.imageUrl || FP_IMG]} startIndex={0} label={viewing.id} onClose={() => setViewing(null)} />}
      </DialogContent>
    </Dialog>
  )
}

function StepMedia({ props, setProps }: { props: GroupProp[]; setProps: React.Dispatch<React.SetStateAction<GroupProp[]>> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["p1", "p3"]))
  const [noImages, setNoImages] = useState(false)
  const [noFloorPlans, setNoFloorPlans] = useState(false)
  const [dialog, setDialog] = useState<"images" | "floorplans" | null>(null)
  const toggle = (k: string) => setSelected((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  const visible = props.filter((p) => (!noImages || p.images === 0) && (!noFloorPlans || p.floorPlans === 0))
  const applyTo = (patch: (x: GroupProp) => Partial<GroupProp>, msg: string) => {
    setProps((prev) => prev.map((x) => (selected.has(x.key) ? { ...x, ...patch(x) } : x)))
    toast.success(msg)
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="space-y-1.5 p-4"><p className="text-sm font-bold text-foreground">Color guide</p><SourceChips /></div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-4">
        <FilterSelect label="Project" value="" options={["Project name", "Uptown cairo"]} onChange={() => {}} className="w-40" />
        <FilterSelect label="Property type" value="" options={["Villa", "Apartment"]} onChange={() => {}} className="w-40" />
        <span className="flex items-center gap-2 text-sm text-foreground">No Images <Switch checked={noImages} onCheckedChange={setNoImages} /></span>
        <span className="flex items-center gap-2 text-sm text-foreground">No Floor plans <Switch checked={noFloorPlans} onCheckedChange={setNoFloorPlans} /></span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">Extracted properties</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-8 border-primary font-semibold text-primary" disabled={selected.size === 0} onClick={() => setDialog("images")}>Add Media ({selected.size})</Button>
          <Button variant="outline" className="h-8 border-red-300 font-semibold text-red-600" disabled={selected.size === 0} onClick={() => applyTo(() => ({ images: 0 }), "Media removed")}>Remove Media ({selected.size})</Button>
          <Button variant="outline" className="h-8 border-primary font-semibold text-primary" disabled={selected.size === 0} onClick={() => setDialog("floorplans")}>Add floor plans ({selected.size})</Button>
          <Button variant="outline" className="h-8 border-red-300 font-semibold text-red-600" disabled={selected.size === 0} onClick={() => applyTo(() => ({ floorPlans: 0 }), "Floor plans removed")}>Remove floor plans ({selected.size})</Button>
        </div>
      </div>

      {projectSections(visible).map((sec) => (
        <div key={sec.name} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-foreground">{sec.name}</h4>
            <span className={cn(TAG, "rounded-full border-border bg-card text-muted-foreground")}>{sec.props.length} Properties</span>
          </div>
          {sec.props.map((p) => (
            <ManualPropCard key={p.key} p={p} selectable selected={selected.has(p.key)} onToggle={() => toggle(p.key)}>
              <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 md:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Images:</p>
                  <MediaThumbs count={p.images} onAdd={() => { setSelected(new Set([p.key])); setDialog("images") }} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Floor plans</p>
                  <MediaThumbs count={p.floorPlans} images={[FP_IMG]} onAdd={() => { setSelected(new Set([p.key])); setDialog("floorplans") }} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Payment plans <button className="font-semibold text-primary underline underline-offset-2" onClick={() => toast.info("Payment plan details are on the Payment plans step")}>Details</button></p>
                  <p className="text-sm text-foreground"><b>Plans:</b> {p.planIdx.length} Plans added</p>
                  <p className="text-sm text-foreground"><b>Offers:</b> 2 Offers</p>
                </div>
              </div>
            </ManualPropCard>
          ))}
        </div>
      ))}

      <AssignImagesDialog
        open={dialog === "images"}
        targets={selected.size}
        onClose={() => setDialog(null)}
        onAssign={(n) => { applyTo((x) => ({ images: x.images + n }), `${n} image${n > 1 ? "s" : ""} assigned`); setDialog(null) }}
      />
      <AddFloorPlanDialog
        open={dialog === "floorplans"}
        targets={selected.size}
        onClose={() => setDialog(null)}
        onAssign={(n) => { applyTo((x) => ({ floorPlans: x.floorPlans + n }), `${n} floor plan${n > 1 ? "s" : ""} assigned`); setDialog(null) }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 6 — Review                                                     */
/* ------------------------------------------------------------------ */

function ValidationRulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const blocking = REVIEW_ISSUES.filter((x) => x.blocking)
  const warning = REVIEW_ISSUES.filter((x) => !x.blocking)
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-lg font-bold text-foreground">Validation rules</SheetTitle>
          <SheetDescription className="sr-only">All blocking and warning issues found for this entry</SheetDescription>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-2"><h4 className="text-base font-bold text-foreground">Blocking Issues</h4><span className={cn(TAG, "rounded-full border-red-200 bg-red-50 text-red-600")}>{blocking.length} issues</span></div>
          <div className="space-y-2">{blocking.map((x, i) => <ReviewIssueCard key={i} issue={x} />)}</div>
          <div className="flex items-center gap-2"><h4 className="text-base font-bold text-foreground">Warning Issues</h4><span className={cn(TAG, "rounded-full border-amber-300 bg-amber-50 text-amber-700")}>{warning.length} issues</span></div>
          <div className="space-y-2">{warning.map((x, i) => <ReviewIssueCard key={i} issue={x} />)}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StepReview({ props }: { props: GroupProp[] }) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const warnUnits = props.filter((p) => p.issues.some((i) => !i.blocking)).length
  const blockUnits = props.filter((p) => p.issues.some((i) => i.blocking)).length

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-foreground">Issues found</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(TAG, "rounded-full border-amber-300 bg-amber-50 text-amber-700")}>Warning issues <b>2</b> in {warnUnits} Unit</span>
              <span className={cn(TAG, "rounded-full border-red-200 bg-red-50 text-red-600")}>Blocking issues <b>3</b> In {blockUnits + 1} Units</span>
            </div>
          </div>
          <Button variant="outline" className="h-9 gap-1.5 border-red-300 text-red-600" onClick={() => setRulesOpen(true)}>
            <TriangleAlert className="h-4 w-4" />({REVIEW_ISSUES.length})
          </Button>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <FilterSelect label="Project" value="" options={["Project name", "Uptown cairo"]} onChange={() => {}} className="w-40" />
        <FilterSelect label="Property type" value="" options={["Villa", "Apartment"]} onChange={() => {}} className="w-40" />
        <FilterSelect label="Status" value="" options={["New", "Modified", "Unmodified"]} onChange={() => {}} className="w-36" />
        <FilterSelect label="Issue status" value="" options={["Blocking", "Warning", "None"]} onChange={() => {}} className="w-36" />
      </div>

      {projectSections(props).map((sec) => (
        <div key={sec.name} className="space-y-3">
          <div className="flex items-center gap-2"><h4 className="text-base font-bold text-foreground">{sec.name}</h4><span className={cn(TAG, "rounded-full border-border bg-card text-muted-foreground")}>{sec.props.length}</span></div>
          {sec.props.map((p) => {
            const tint = p.issues.some((i) => i.blocking) && p.status === "Modified" ? "error" : p.issues.length > 0 ? "warn" : null
            return (
              <ManualPropCard
                key={p.key}
                p={p}
                tint={tint}
                tags={p.issues.length > 0 ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-default items-center gap-1 text-xs font-semibold text-foreground"><TriangleAlert className="h-3.5 w-3.5 text-amber-500" />({p.issues.length})</span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="p-3">
                        <div className="space-y-1.5">
                          {p.issues.map((i, j) => (
                            <p key={j} className="flex items-center gap-2 text-xs">
                              • {i.text}
                              <span className={cn(TAG, i.blocking ? "border-red-300 bg-red-50 text-red-600" : "border-amber-300 bg-amber-50 text-amber-700")}>{i.blocking ? "Blocking issue" : "Warning issue"}</span>
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : undefined}
              />
            )
          })}
        </div>
      ))}

      <ValidationRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Step 7 — Check (finalize)                                           */
/* ------------------------------------------------------------------ */

const MISSING_STATUSES = ["Available", "On hold", "Sold off", "Archived"]

function MissingCard({ m, status, selected, onToggle, onStatus }: {
  m: (typeof MISSING_PROPS)[number]
  status: string | null
  selected: boolean
  onToggle: () => void
  onStatus: (s: string) => void
}) {
  const p = makeProp(m.key, { id: m.id, name: m.name, status: "Missing" })
  return (
    <GroupedPropertyCard
      propertyId={m.id}
      title={m.name}
      keywords={KEYWORDS}
      cells={propCells(p)}
      tint="error"
      selectable
      selected={selected}
      onToggle={onToggle}
      tags={
        <>
          <StatusTag s="Missing" />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          {status
            ? <span className={cn(TAG, "border-orange-300 bg-orange-50 text-orange-600")}>{status}</span>
            : <span className={cn(TAG, "border-border bg-card text-muted-foreground")}>not set</span>}
        </>
      }
      actions={<span className="pl-1 text-[10px] text-muted-foreground">Last updated 10/10/2024</span>}
    >
      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <span className="text-sm font-bold text-foreground">Mark as</span>
        <Select value={status ?? ""} onValueChange={onStatus}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{MISSING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </GroupedPropertyCard>
  )
}

function StepCheck({ props, missingStatus, setMissingStatus }: {
  props: GroupProp[]
  missingStatus: Record<string, string | null>
  setMissingStatus: React.Dispatch<React.SetStateAction<Record<string, string | null>>>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(MISSING_PROPS.map((m) => m.key)))
  const [missingOpen, setMissingOpen] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [devNaming, setDevNaming] = useState<Set<string>>(new Set())
  const unset = MISSING_PROPS.filter((m) => !missingStatus[m.key]).length
  const toggle = (k: string) => setSelected((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  const bulkMark = (s: string) => {
    setMissingStatus((prev) => { const n = { ...prev }; selected.forEach((k) => { n[k] = s }); return n })
    toast.success(`${selected.size} missing propert${selected.size > 1 ? "ies" : "y"} marked as ${s}`)
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm font-bold text-foreground">Properties break down</p>
          <FilterSelect label="All projects" value="" options={["Project name", "Uptown cairo"]} onChange={() => {}} className="w-36" />
          <FilterSelect label="Property type" value="" options={["Villa", "Apartment"]} onChange={() => {}} className="w-36" />
          <div className="flex flex-wrap gap-1.5">
            <span className={cn(TAG, STATUS_TONE.New)}>New <b>8</b></span>
            <span className={cn(TAG, STATUS_TONE.Modified)}>Modified <b>2</b></span>
            <span className={cn(TAG, STATUS_TONE.Unmodified)}>Unmodified <b>0</b></span>
            <span className={cn(TAG, STATUS_TONE.Missing)}>Missing <b>{unset}</b></span>
            <span className={cn(TAG, STATUS_TONE.Returned)}>Returned <b>0</b></span>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">Properties</h3>
        <div className="flex items-center gap-2">
          <Select onValueChange={bulkMark}>
            <SelectTrigger className="h-9 w-40 border-primary text-sm font-semibold text-primary"><SelectValue placeholder={`Mark as (${selected.size})`} /></SelectTrigger>
            <SelectContent>{MISSING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => toast.info("Fullscreen preview is coming soon")}><ScanSearch className="h-4 w-4" /></Button>
        </div>
      </div>

      {unset > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-300 bg-orange-50/40 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-orange-600">Total Missing propeties: {unset + 4}</p>
            <p className="text-sm text-foreground">All Missing units will be marked as sold by default , unless you set their statuses yourself.</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className={cn(TAG, "border-orange-300 bg-white text-orange-600")}>Archived 2</span>
              <span className={cn(TAG, "border-orange-300 bg-white text-orange-600")}>Sold off 2</span>
              <span className={cn(TAG, "border-orange-300 bg-white text-orange-600")}>Hold 4</span>
            </div>
          </div>
          <Button variant="outline" className="h-9 border-primary font-semibold text-primary" onClick={() => setDrawerOpen(true)}>Set status</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm font-bold text-foreground">No missing units</div>
      )}

      <div>
        <button className="mb-2 flex items-center gap-2 text-base font-bold text-foreground" onClick={() => setMissingOpen((v) => !v)}>
          <ChevronDown className={cn("h-4 w-4 transition-transform", !missingOpen && "-rotate-90")} />
          Missing properties ({MISSING_PROPS.length})
        </button>
        {missingOpen && (
          <div className="space-y-3">
            {MISSING_PROPS.map((m) => (
              <MissingCard
                key={m.key}
                m={m}
                status={missingStatus[m.key] ?? null}
                selected={selected.has(m.key)}
                onToggle={() => toggle(m.key)}
                onStatus={(s) => { setMissingStatus((prev) => ({ ...prev, [m.key]: s })); toast.success(`Marked as ${s}`) }}
              />
            ))}
          </div>
        )}
      </div>

      <h4 className="text-base font-bold text-foreground">Properties ({props.length})</h4>
      {projectSections(props).map((sec) => (
        <div key={sec.name} className="space-y-3">
          <p className="text-sm font-bold text-foreground">{sec.name}</p>
          {sec.props.map((p) => (
            <ManualPropCard
              key={p.key}
              p={p}
              actions={
                <span className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                  Developer naming
                  <Switch checked={devNaming.has(p.key)} onCheckedChange={() => setDevNaming((prev) => { const n = new Set(prev); n.has(p.key) ? n.delete(p.key) : n.add(p.key); return n })} />
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 md:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Images:</p>
                  <div className="flex gap-1.5">{Array.from({ length: Math.min(p.images, 4) }, (_, i) => <img key={i} src={IMGS[i % IMGS.length]} alt="Media" className="h-11 w-14 rounded border border-border object-cover" />)}</div>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Floor plans</p>
                  <div className="flex gap-1.5">{Array.from({ length: Math.min(p.floorPlans, 2) }, (_, i) => <img key={i} src={FP_IMG} alt="Floor plan" className="h-11 w-14 rounded border border-border object-cover" />)}</div>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">Payment plans <button className="font-semibold text-primary underline underline-offset-2" onClick={() => toast.info("Payment plan details are on the Payment plans step")}>Details</button></p>
                  <p className="text-sm text-foreground"><b>Plans:</b> {p.planIdx.length} Plans added</p>
                  <p className="text-sm text-foreground"><b>Offers:</b> 2 Offers</p>
                </div>
              </div>
            </ManualPropCard>
          ))}
        </div>
      ))}

      {/* Missing units drawer — bulk mark-as */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-4">
            <SheetTitle className="text-lg font-bold text-foreground">Missing units</SheetTitle>
            <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-50 text-blue-700")}>16 Unit</span>
            <SheetDescription className="sr-only">Set the status of missing units before finalizing</SheetDescription>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Mark as <span className={cn(TAG, "ml-1 rounded-full border-border bg-card text-foreground")}>Selected: {selected.size}</span></p>
              <div className="flex gap-2">
                <MissingBulkSelect onApply={(s) => bulkMark(s)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(TAG, "rounded-full border-orange-300 bg-white text-orange-600")}>Archived 2</span>
              <span className={cn(TAG, "rounded-full border-orange-300 bg-white text-orange-600")}>Sold off 2</span>
              <span className={cn(TAG, "rounded-full border-orange-300 bg-white text-orange-600")}>Hold 4</span>
              <span className={cn(TAG, "rounded-full border-emerald-300 bg-white text-emerald-700")}>Available 4</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-3">
              <p className="text-base font-bold text-foreground">Results</p>
              <span className={cn(TAG, "rounded-full border-blue-200 bg-blue-50 text-blue-700")}>{MISSING_PROPS.length}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                className="h-4 w-4"
                checked={MISSING_PROPS.every((m) => selected.has(m.key))}
                onCheckedChange={(v) => setSelected(v ? new Set(MISSING_PROPS.map((m) => m.key)) : new Set())}
              />
              Select all
            </label>
            {MISSING_PROPS.map((m) => (
              <MissingCard
                key={m.key}
                m={m}
                status={missingStatus[m.key] ?? null}
                selected={selected.has(m.key)}
                onToggle={() => toggle(m.key)}
                onStatus={(s) => setMissingStatus((prev) => ({ ...prev, [m.key]: s }))}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDrawerOpen(false); toast.success("Missing unit statuses saved") }}>Save</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MissingBulkSelect({ onApply }: { onApply: (s: string) => void }) {
  const [val, setVal] = useState("")
  return (
    <>
      <Select value={val} onValueChange={setVal}>
        <SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="select" /></SelectTrigger>
        <SelectContent>{MISSING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
      <Button className="h-9" disabled={!val} onClick={() => onApply(val)}>Change</Button>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function ManualEntryDetailsPage({ entry, onBack }: { entry: IngestionEntry; onBack: () => void }) {
  const [step, setStep] = useState(() => STAGE_TO_STEP[entry.stage] ?? 0)
  const [props, setProps] = useState<GroupProp[]>(INITIAL_PROPS)
  const [missingStatus, setMissingStatus] = useState<Record<string, string | null>>({})

  const next = () => {
    if (step === STEPS.length - 1) {
      toast.success(`${entry.fileName} finalized`)
      onBack()
    } else setStep((s) => s + 1)
  }
  const back = () => (step === 0 ? onBack() : setStep((s) => s - 1))

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <WizardHeader entry={entry} listLabel="Manual Grouped Entries" pageLabel="Bulk Grouped properties" onBack={onBack} />
        <WizardStepper steps={STEPS} step={step} onStep={setStep} />
        {/* The Initial Setup step owns these fields itself — no duplicate strip there */}
        {step > 0 && <EntryContextStrip entry={entry} />}

        {step === 0 && <StepInitialSetup entry={entry} />}
        {step === 1 && <StepExtraction props={props} setProps={setProps} />}
        {step === 2 && <StepComparison props={props} setProps={setProps} />}
        {step === 3 && <StepPaymentPlans props={props} setProps={setProps} />}
        {step === 4 && <StepMedia props={props} setProps={setProps} />}
        {step === 5 && <StepReview props={props} />}
        {step === 6 && <StepCheck props={props} missingStatus={missingStatus} setMissingStatus={setMissingStatus} />}
      </div>

      <WizardFooter
        onBack={back}
        onNext={next}
        backLabel={step === 0 ? "Close" : "Back"}
        nextLabel={step === STEPS.length - 1 ? "Finalize" : "Next"}
      />
    </div>
  )
}

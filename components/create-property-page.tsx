"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft, Bath, BedDouble, Building2, CalendarDays, ChevronDown, ChevronRight, Eye, FileText, FolderOpen,
  Home, ImageIcon, Layers, Loader2, MapPin, Plus, Ruler, Save, Sparkles, Tag, Wrench, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  type Variation, isRangeVariation,
  FieldShell, TextInput, NumberInput, SelectInput, RangeInput, BooleanToggle, MultiChips,
  maxLenErr, floorEndpointErr, decimalErr, priceErr, intRangeErr, moneyErr, countErr, withCommas,
  DEVELOPER_TYPE_OPTIONS, FINISHING_OPTIONS, DELIVERY_TYPE_OPTIONS, CURRENCY_OPTIONS,
  UNIT_VIEW_OPTIONS, UNIT_ORIENTATION_OPTIONS, AMENITY_OPTIONS, SERVICE_OPTIONS,
} from "@/components/additional-info-tab"
import { TYPE_TREE, buildTypeGroups } from "@/components/grouped-properties-page"
import { LinkedPlanCard, MediaGalleryTab, ImageCarousel, PAYMENT_PLAN_GROUPS, type PlanCardData } from "@/components/all-properties-page"
import { ChooseAssetsDrawer } from "@/components/choose-assets-drawer"
import { AddMediaDialog } from "@/components/add-media-dialog"
import { PaymentPlanDrawer } from "@/components/payment-plan-builder"

const SALE_TYPE_LABEL: Record<Variation, string> = {
  launch: "Launch", "primary-manual": "Primary (Manual)", "primary-automatic": "Primary (Automatic)",
  resale: "Resale", "nawy-now": "Nawy Now", rental: "Rental",
}

const DEVELOPERS = [
  { id: "DEV-001", name: "Lasirena Group" }, { id: "DEV-002", name: "Palm Hills" },
  { id: "DEV-003", name: "Sodic" }, { id: "DEV-004", name: "Mountain View" },
]
const PROJECTS = [
  { id: "PRJ-1001", name: "Palm Beach Resort", devId: "DEV-001", city: "Ain Sokhna", area: "El Sokhna", district: "District A" },
  { id: "PRJ-1002", name: "New Cairo Gate", devId: "DEV-002", city: "New Cairo", area: "El Shorouk", district: "District B" },
  { id: "PRJ-1003", name: "North Bay", devId: "DEV-003", city: "North Coast", area: "Ras El Hekma", district: "Sector 1" },
  { id: "PRJ-1004", name: "Lagoon Heights", devId: "DEV-004", city: "Sheikh Zayed", area: "Beverly Hills", district: "Zone 5" },
]
const PHASES = [
  { id: "PH-201", name: "Phase 1", projId: "PRJ-1001" }, { id: "PH-202", name: "Phase 2", projId: "PRJ-1001" },
  { id: "PH-203", name: "Phase 1", projId: "PRJ-1002" }, { id: "PH-204", name: "Phase A", projId: "PRJ-1003" },
  { id: "PH-205", name: "Phase A", projId: "PRJ-1004" },
]

const imagePool = [
  "/aerial-view-masterplan-residential-development-blu.jpg", "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg", "/placeholder-logo.png", "/placeholder-user.jpg",
]
interface MediaAsset { id: string; name: string; url: string; type?: string }
const FLOOR_PLAN_POOL: MediaAsset[] = [
  { id: "FLP-001", name: "Type A — 2BR", url: imagePool[2], type: "2BR" }, { id: "FLP-002", name: "Type B — 3BR", url: imagePool[2], type: "3BR" },
  { id: "FLP-003", name: "Type C — Duplex", url: imagePool[1], type: "Duplex" }, { id: "FLP-004", name: "Ground — Garden", url: imagePool[0], type: "Garden" },
  { id: "FLP-005", name: "Roof — Penthouse", url: imagePool[1], type: "Penthouse" }, { id: "FLP-006", name: "Studio Layout", url: imagePool[2], type: "Studio" },
]
const FLOOR_PLAN_TYPES = ["2BR", "3BR", "Duplex", "Garden", "Penthouse", "Studio"]
const IMAGE_POOL: MediaAsset[] = [
  { id: "IMG-001", name: "Aerial view", url: imagePool[0] }, { id: "IMG-002", name: "Clubhouse", url: imagePool[1] },
  { id: "IMG-003", name: "Pool area", url: imagePool[0] }, { id: "IMG-004", name: "Lobby", url: imagePool[2] },
  { id: "IMG-005", name: "Landscape", url: imagePool[0] },
]
const PLAN_POOL: PlanCardData[] = PAYMENT_PLAN_GROUPS.flatMap((g) => g.plans)

type RangeVal = { min: string; max: string }
type FieldValue = string | boolean | string[] | RangeVal
const isRangeVal = (v: FieldValue): v is RangeVal => typeof v === "object" && v !== null && !Array.isArray(v) && "min" in v

type Flavor = "floor" | "net" | "area" | "money" | "count" | "price" | "int19"
const NUM_META: Record<string, { flavor: Flavor; rangeable?: boolean; alwaysRange?: boolean; money?: boolean }> = {
  floorNumber: { flavor: "floor", rangeable: true },
  grossArea: { flavor: "area", alwaysRange: true },
  netArea: { flavor: "net", rangeable: true },
  gardenArea: { flavor: "area", rangeable: true }, openRoofArea: { flavor: "area", rangeable: true },
  roofAnnexArea: { flavor: "area", rangeable: true }, terraceArea: { flavor: "area", rangeable: true },
  landArea: { flavor: "area", rangeable: true }, outdoorArea: { flavor: "area", rangeable: true },
  storageArea: { flavor: "area", rangeable: true }, basementArea: { flavor: "area", rangeable: true },
  price: { flavor: "price", rangeable: true, money: true },
  outdoorPrice: { flavor: "money", rangeable: true, money: true }, storagePrice: { flavor: "money", rangeable: true, money: true },
  parkingSlots: { flavor: "count", rangeable: true },
  bedrooms: { flavor: "int19" }, bathrooms: { flavor: "int19" },
}
const AREA_FIELDS = [
  { key: "gardenArea", label: "Garden Area" }, { key: "openRoofArea", label: "Open Roof Area" },
  { key: "roofAnnexArea", label: "Roof Annex Area" }, { key: "terraceArea", label: "Terrace Area" },
  { key: "landArea", label: "Land Area" }, { key: "outdoorArea", label: "Outdoor Area" },
  { key: "storageArea", label: "Storage Area" }, { key: "basementArea", label: "Basement Area" },
]

export function CreatePropertyPage({ variation, onBack }: { variation: Variation; onBack: () => void }) {
  const isRange = isRangeVariation(variation)
  const showRNN = variation === "resale" || variation === "nawy-now"
  const isLaunch = variation === "launch"
  const allowPlanLibrary = variation === "launch" || variation === "primary-manual"
  const ranged = (key: string) => { const m = NUM_META[key]; return !!m && (m.alwaysRange || (m.rangeable && isRange)) }

  const [form, setForm] = useState<Record<string, FieldValue>>(() => {
    const f: Record<string, FieldValue> = {
      listingStatus: "Hidden", developer: "", project: "", phase: "",
      unitCode: "", unitNumber: "", unitModel: "", zone: "",
      developerType: "", buildingType: "", buildingNumber: "", unitView: "", unitOrientation: "",
      category: "", type: "", subtype: "", finishing: "", deliveryType: "", deliveryDate: "", currency: "EGP",
      hasParking: false, hasStorage: false, isServiced: false, isBranded: false, amenities: [], services: [],
    }
    for (const key of Object.keys(NUM_META)) f[key] = ranged(key) ? { min: "", max: "" } : ""
    return f
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [plans, setPlans] = useState<PlanCardData[]>([])
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [floorPlanUrls, setFloorPlanUrls] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [planDrawer, setPlanDrawer] = useState(false)
  const [drawer, setDrawer] = useState<null | "plans" | "floorPlans" | "images">(null)
  const [addMedia, setAddMedia] = useState<null | "floorPlans" | "images">(null)
  const [matching, setMatching] = useState<null | "floorPlans" | "images">(null)
  const [carousel, setCarousel] = useState<{ imgs: string[]; idx: number; field: "floorPlans" | "images" } | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["main", "plans", "floorPlans", "images"]))
  const toggleSection = (id: string) => setOpenSections((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selectedProject = PROJECTS.find((p) => p.id === form.project)
  const phasesForProject = useMemo(() => PHASES.filter((p) => p.projId === form.project), [form.project])

  const grossMinNum = (() => { const g = form.grossArea; return isRangeVal(g) && g.min ? parseFloat(g.min) : NaN })()
  const grossMaxNum = (() => { const g = form.grossArea; return isRangeVal(g) && g.max ? parseFloat(g.max) : NaN })()

  const endpointErr = (flavor: Flavor, v: string): string | null => {
    switch (flavor) {
      case "floor": return floorEndpointErr(v)
      case "net": case "area": return decimalErr(v, 2000)
      case "money": return moneyErr(v)
      case "count": return countErr(v)
      case "price": return priceErr(v)
      case "int19": return intRangeErr(v, 0, 19)
    }
  }
  const numErr = (key: string, value: FieldValue): string | null => {
    const m = NUM_META[key]; if (!m) return null
    if (ranged(key) && isRangeVal(value)) {
      const e1 = endpointErr(m.flavor, value.min); if (e1) return `Min: ${e1}`
      const e2 = endpointErr(m.flavor, value.max); if (e2) return `Max: ${e2}`
      const bothNum = /^-?\d+(\.\d+)?$/.test(value.min) && /^-?\d+(\.\d+)?$/.test(value.max)
      if (bothNum) {
        const strict = m.flavor === "floor" || m.flavor === "price"
        if (strict ? parseFloat(value.max) <= parseFloat(value.min) : parseFloat(value.max) < parseFloat(value.min))
          return strict ? "Max must be greater than min" : "Max must be ≥ min"
      }
      if (m.flavor === "net" && bothNum) {
        if (!isNaN(grossMinNum) && parseFloat(value.min) >= grossMinNum) return `Min net must be below gross min (${grossMinNum})`
        if (!isNaN(grossMaxNum) && parseFloat(value.max) >= grossMaxNum) return `Max net must be below gross max (${grossMaxNum})`
      }
      return null
    }
    const v = value as string
    const e = endpointErr(m.flavor, v); if (e) return e
    if (m.flavor === "net" && v && !isNaN(grossMaxNum) && parseFloat(v) >= grossMaxNum) return `Net must be below gross (${grossMaxNum})`
    return null
  }
  const fieldErr = (key: string, value: FieldValue): string | null => {
    if ((key === "unitCode" || key === "unitNumber") && typeof value === "string") return maxLenErr(value, 15)
    if (NUM_META[key]) return numErr(key, value)
    return null
  }

  const setField = (key: string, value: FieldValue) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "developer") { next.project = ""; next.phase = "" }
      if (key === "project") next.phase = ""
      if (key === "deliveryDate" && typeof value === "string" && value) next.deliveryType = value > today() ? "OFF PLAN" : "READY TO MOVE"
      return next
    })
    setErrors((e) => { const next = { ...e }; const msg = fieldErr(key, value); if (msg) next[key] = msg; else delete next[key]; return next })
  }
  const setType = (cat: string, type: string) => setForm((p) => ({ ...p, category: cat, type, subtype: "" }))

  const isRequired = (key: string): boolean => {
    if (key === "developer" || key === "project") return true
    if (key === "type") return true
    if (isLaunch) return false
    if (key === "phase") return false
    if ((key === "bedrooms" || key === "bathrooms") && form.category === "Residential") return false
    if (["finishing", "delivery", "grossMin", "priceMin", "bedrooms", "bathrooms"].includes(key)) return true
    return false
  }
  const emptyVal = (v: FieldValue | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (isRangeVal(v) && !v.min)

  // ── Main-fields counts for the section tags ──
  const counts = useMemo(() => {
    const base = ["developer", "project", "phase", "unitModel", "zone", "developerType", "unitView", "unitOrientation",
      "type", "finishing", "delivery", "floorNumber", "grossArea", "netArea", ...AREA_FIELDS.map((a) => a.key),
      "price", "outdoorPrice", "storagePrice", "parkingSlots", "bedrooms", "bathrooms", "amenities", "services"]
    const visible = base.concat(showRNN ? ["unitCode", "unitNumber", "buildingType", "buildingNumber"] : [])
    const filledOf = (key: string): boolean => {
      if (key === "type") return !!(form.category && form.type && form.subtype)
      if (key === "delivery") return !!(form.deliveryType && form.deliveryDate)
      return !emptyVal(form[key])
    }
    const totalFilled = visible.filter(filledOf).length
    const reqKeys = ["developer", "project", "type", "finishing", "delivery", "grossMin", "priceMin", "bedrooms", "bathrooms"].filter(isRequired)
    const reqFilled = reqKeys.filter((k) => filledOf(k === "grossMin" ? "grossArea" : k === "priceMin" ? "price" : k)).length
    return { total: visible.length, totalFilled, reqTotal: reqKeys.length, reqFilled }
  }, [form, showRNN, variation])

  const validateAll = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    for (const key of Object.keys(form)) { const m = fieldErr(key, form[key]); if (m) errs[key] = m }
    const checks: [string, boolean, FieldValue][] = [
      ["developer", isRequired("developer"), form.developer],
      ["project", isRequired("project"), form.project], ["type", isRequired("type"), `${form.category}${form.type}${form.subtype}`],
      ["finishing", isRequired("finishing"), form.finishing], ["delivery", isRequired("delivery"), `${form.deliveryType}${form.deliveryDate}`],
      ["grossArea", isRequired("grossMin"), isRangeVal(form.grossArea) ? form.grossArea.min : ""],
      ["price", isRequired("priceMin"), isRangeVal(form.price) ? form.price.min : (form.price as string)],
      ["bedrooms", isRequired("bedrooms"), form.bedrooms], ["bathrooms", isRequired("bathrooms"), form.bathrooms],
    ]
    for (const [key, required, val] of checks) if (required && !errs[key] && emptyVal(val)) errs[key] = "Required"
    return errs
  }
  const liveError = Object.keys(errors).length > 0
  const save = () => {
    const errs = validateAll(); setErrors(errs)
    if (Object.keys(errs).length) { if (!openSections.has("main")) toggleSection("main"); toast.error("Please fix the highlighted fields"); return }
    toast.success(`${SALE_TYPE_LABEL[variation]} property created`); onBack()
  }

  const numInput = (key: string) => {
    const m = NUM_META[key]; const fmt = m?.money ? withCommas : undefined
    return ranged(key)
      ? <RangeInput value={(form[key] as RangeVal) ?? { min: "", max: "" }} onChange={(v) => setField(key, v)} error={errors[key]} format={fmt} />
      : <NumberInput value={(form[key] as string) ?? ""} onChange={(v) => setField(key, v)} error={errors[key]} format={fmt} />
  }

  const offers = plans.filter((p) => p.hasOffer).length
  const planCreateDisabled = !allowPlanLibrary && plans.length >= 1

  // Dummy "auto matching" — assigns a couple of random assets after a short delay.
  const runAutoMatch = (field: "floorPlans" | "images") => {
    if (matching) return
    setMatching(field)
    const pool = (field === "floorPlans" ? FLOOR_PLAN_POOL : IMAGE_POOL).map((a) => a.url)
    setTimeout(() => {
      const picks = [...pool].sort(() => 0.5 - 0.4).slice(0, 2 + (pool.length % 2))
      const setter = field === "floorPlans" ? setFloorPlanUrls : setImageUrls
      setter((xs) => [...xs, ...picks.filter((u) => !xs.includes(u))])
      setMatching(null)
      toast.success(`Auto-matched ${field === "floorPlans" ? "floor plans" : "images"}`)
    }, 1100)
  }
  const listingStatus = form.listingStatus as string

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        {/* Back + breadcrumb */}
        <div className="space-y-2 px-1 pt-1">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" /><span>Properties</span>
            <ChevronRight className="h-3 w-3" />
            <button onClick={onBack} className="hover:text-foreground hover:underline">All Properties</button>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">New {SALE_TYPE_LABEL[variation]}</span>
          </div>
        </div>

        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">Create {SALE_TYPE_LABEL[variation]} Property</h1>
            <Badge variant="outline" className="text-xs">{SALE_TYPE_LABEL[variation]}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}><X className="mr-1.5 h-3.5 w-3.5" /> Cancel</Button>
            <Button size="sm" onClick={save} disabled={liveError}><Save className="mr-1.5 h-3.5 w-3.5" /> Save</Button>
          </div>
        </div>

        {/* ── Main Fields ── */}
        <CollapsibleSection
          open={openSections.has("main")} onToggle={() => toggleSection("main")}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />} title="Main Fields"
          tags={<><CountTag label="filled" a={counts.totalFilled} b={counts.total} /><CountTag label="required" a={counts.reqFilled} b={counts.reqTotal} tone={counts.reqFilled < counts.reqTotal ? "warn" : "ok"} /></>}
        >
          <div className="divide-y divide-border">
            <SubSection label="Listing">
              <FieldShell label="Sale Type" icon={<Tag className="h-3 w-3" />}><div className="text-xs font-medium text-foreground">{SALE_TYPE_LABEL[variation]}</div></FieldShell>
              <FieldShell label="Listing Status" icon={<Eye className="h-3 w-3" />}>
                <Select value={listingStatus} onValueChange={(v) => setField("listingStatus", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <span className={cn("inline-flex items-center gap-1.5 font-medium", listingStatus === "Active" ? "text-emerald-700" : "text-red-600")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", listingStatus === "Active" ? "bg-emerald-500" : "bg-red-500")} />{listingStatus}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active"><span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active</span></SelectItem>
                    <SelectItem value="Hidden"><span className="inline-flex items-center gap-1.5 text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Hidden</span></SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </SubSection>

            <SubSection label="Developer & Project">
              <FieldShell label="Developer" icon={<Building2 className="h-3 w-3" />} required error={errors.developer}>
                <SelectInput value={form.developer as string} onChange={(v) => setField("developer", v)} options={DEVELOPERS.map((d) => d.name)} error={errors.developer} placeholder="Select developer…" />
              </FieldShell>
              <FieldShell label="Project" icon={<Home className="h-3 w-3" />} required error={errors.project}>
                <SelectInput value={selectedProject?.name ?? ""} onChange={(name) => setField("project", PROJECTS.find((x) => x.name === name)?.id ?? "")}
                  options={PROJECTS.filter((p) => !form.developer || DEVELOPERS.find((d) => d.name === form.developer)?.id === p.devId).map((p) => p.name)} error={errors.project}
                  placeholder={form.developer ? "Select project…" : "Pick a developer first"} />
              </FieldShell>
              <FieldShell label="Phase" icon={<Layers className="h-3 w-3" />}>
                <SelectInput value={PHASES.find((p) => p.id === form.phase)?.name ?? ""} onChange={(name) => setField("phase", phasesForProject.find((x) => x.name === name)?.id ?? "")}
                  options={phasesForProject.map((p) => p.name)} placeholder={form.project ? "Select phase…" : "Pick a project first"} />
              </FieldShell>
              <FieldShell label="Location" icon={<MapPin className="h-3 w-3" />}>
                <div className="text-xs font-medium text-foreground">{selectedProject ? [selectedProject.city, selectedProject.area, selectedProject.district].join(" · ") : <span className="text-muted-foreground">Auto-filled from project</span>}</div>
              </FieldShell>
            </SubSection>

            <SubSection label="Identity">
              {showRNN && <FieldShell label="Unit Code" error={errors.unitCode}><TextInput value={form.unitCode as string} onChange={(v) => setField("unitCode", v)} error={errors.unitCode} maxLength={15} /></FieldShell>}
              {showRNN && <FieldShell label="Unit Number" error={errors.unitNumber}><TextInput value={form.unitNumber as string} onChange={(v) => setField("unitNumber", v)} error={errors.unitNumber} maxLength={15} /></FieldShell>}
              <FieldShell label="Unit Model"><TextInput value={form.unitModel as string} onChange={(v) => setField("unitModel", v)} /></FieldShell>
              <FieldShell label="Zone"><TextInput value={form.zone as string} onChange={(v) => setField("zone", v)} /></FieldShell>
            </SubSection>

            <SubSection label="Classification">
              <FieldShell label="Type" icon={<Tag className="h-3 w-3" />} required error={errors.type} className="lg:col-span-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <Select value={form.type ? `${form.category}|${form.type}` : undefined} onValueChange={(val) => { const [c, t] = val.split("|"); setType(c, t) }}>
                      <SelectTrigger className={cn("h-8 w-full text-sm", errors.type && "border-red-500")}><SelectValue placeholder="Property Type" /></SelectTrigger>
                      <SelectContent>
                        {buildTypeGroups(form.category as string, form.type as string).map((g) => (
                          <SelectGroup key={g.category}><SelectLabel>{g.category}</SelectLabel>
                            {g.types.map((t) => <SelectItem key={`${g.category}|${t}`} value={`${g.category}|${t}`}>{t}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-0"><SelectInput value={form.subtype as string} onChange={(v) => setField("subtype", v)} options={form.category && form.type ? (TYPE_TREE[form.category as string]?.[form.type as string] ?? []) : []} placeholder="Subtype" error={errors.type} /></div>
                </div>
              </FieldShell>
              <FieldShell label="Developer Type"><SelectInput value={form.developerType as string} onChange={(v) => setField("developerType", v)} options={DEVELOPER_TYPE_OPTIONS} /></FieldShell>
              <FieldShell label="Finishing" icon={<Wrench className="h-3 w-3" />} required={isRequired("finishing")} error={errors.finishing}><SelectInput value={form.finishing as string} onChange={(v) => setField("finishing", v)} options={FINISHING_OPTIONS} error={errors.finishing} /></FieldShell>
              <FieldShell label="Unit View"><SelectInput value={form.unitView as string} onChange={(v) => setField("unitView", v)} options={UNIT_VIEW_OPTIONS} /></FieldShell>
              <FieldShell label="Unit Orientation"><SelectInput value={form.unitOrientation as string} onChange={(v) => setField("unitOrientation", v)} options={UNIT_ORIENTATION_OPTIONS} /></FieldShell>
              {showRNN && <FieldShell label="Building Type"><TextInput value={form.buildingType as string} onChange={(v) => setField("buildingType", v)} /></FieldShell>}
              {showRNN && <FieldShell label="Building Number"><TextInput value={form.buildingNumber as string} onChange={(v) => setField("buildingNumber", v)} /></FieldShell>}
            </SubSection>

            <SubSection label="Capacity">
              <FieldShell label="Bedrooms" icon={<BedDouble className="h-3 w-3" />} required={isRequired("bedrooms")} error={errors.bedrooms}>{numInput("bedrooms")}</FieldShell>
              <FieldShell label="Bathrooms" icon={<Bath className="h-3 w-3" />} required={isRequired("bathrooms")} error={errors.bathrooms}>{numInput("bathrooms")}</FieldShell>
            </SubSection>

            <SubSection label="Delivery">
              <FieldShell label="Delivery" icon={<CalendarDays className="h-3 w-3" />} required={isRequired("delivery")} error={errors.delivery} className="lg:col-span-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0"><SelectInput value={form.deliveryType as string} onChange={(v) => setField("deliveryType", v)} options={DELIVERY_TYPE_OPTIONS} error={errors.delivery} /></div>
                  <div className="flex-1 min-w-0"><Input type="date" value={form.deliveryDate as string} onChange={(e) => setField("deliveryDate", e.target.value)} className={cn("h-8 w-full min-w-0 text-sm", errors.delivery && "border-red-500")} /></div>
                </div>
              </FieldShell>
            </SubSection>

            <SubSection label="Areas and Floor">
              <FieldShell label="Gross Area (SQM)" icon={<Ruler className="h-3 w-3" />} required={isRequired("grossMin")} error={errors.grossArea}>{numInput("grossArea")}</FieldShell>
              <FieldShell label="Net Area (SQM)" error={errors.netArea}>{numInput("netArea")}</FieldShell>
              <FieldShell label="Floor Number">{numInput("floorNumber")}</FieldShell>
            </SubSection>

            <SubSection label="Additional Areas">
              {AREA_FIELDS.map((a) => <FieldShell key={a.key} label={a.label} error={errors[a.key]}>{numInput(a.key)}</FieldShell>)}
            </SubSection>

            <SubSection label="Pricing">
              <FieldShell label="Price" icon={<FileText className="h-3 w-3" />} required={isRequired("priceMin")} error={errors.price}>
                <div className="flex items-start gap-1.5">
                  <div className="min-w-0 flex-1">{numInput("price")}</div>
                  <div className="w-20 shrink-0"><SelectInput value={form.currency as string} onChange={(v) => setField("currency", v)} options={CURRENCY_OPTIONS} /></div>
                </div>
              </FieldShell>
              <FieldShell label="Outdoor Price" error={errors.outdoorPrice}>{numInput("outdoorPrice")}</FieldShell>
              <FieldShell label="Storage Price" error={errors.storagePrice}>{numInput("storagePrice")}</FieldShell>
            </SubSection>

            <SubSection label="Features" noGrid>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <FieldShell label="Has Parking"><BooleanToggle value={form.hasParking as boolean} onChange={(v) => setField("hasParking", v)} /></FieldShell>
                <FieldShell label="Has Storage"><BooleanToggle value={form.hasStorage as boolean} onChange={(v) => setField("hasStorage", v)} /></FieldShell>
                <FieldShell label="Is Serviced"><BooleanToggle value={form.isServiced as boolean} onChange={(v) => setField("isServiced", v)} /></FieldShell>
                <FieldShell label="Is Branded"><BooleanToggle value={form.isBranded as boolean} onChange={(v) => setField("isBranded", v)} /></FieldShell>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3"><FieldShell label="Parking Slots" error={errors.parkingSlots}>{numInput("parkingSlots")}</FieldShell></div>
            </SubSection>

            <SubSection label="Amenities & Services" noGrid>
              <div className="space-y-4">
                <FieldShell label="Amenities"><MultiChips selected={form.amenities as string[]} onChange={(v) => setField("amenities", v)} options={AMENITY_OPTIONS} /></FieldShell>
                <FieldShell label="Services"><MultiChips selected={form.services as string[]} onChange={(v) => setField("services", v)} options={SERVICE_OPTIONS} /></FieldShell>
              </div>
            </SubSection>
          </div>
        </CollapsibleSection>

        {/* ── Payment Plans ── */}
        <CollapsibleSection
          open={openSections.has("plans")} onToggle={() => toggleSection("plans")}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />} title="Payment Plans"
          tags={<><CountTag label={plans.length === 1 ? "plan" : "plans"} a={plans.length} /><CountTag label={offers === 1 ? "offer" : "offers"} a={offers} tone="amber" /></>}
          actions={<>
            {allowPlanLibrary && <Button variant="outline" size="sm" onClick={() => setDrawer("plans")}><FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Choose from project</Button>}
            <Button size="sm" disabled={planCreateDisabled} title={planCreateDisabled ? "Only one payment plan allowed for this sale type" : undefined} onClick={() => setPlanDrawer(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Create new</Button>
          </>}
        >
          <div className="px-5 py-4">
            {plans.length === 0 ? (
              <EmptyAssets label={showRNN ? "No payment plan yet — create one (single plan for this sale type)." : "No payment plans added yet."} />
            ) : (
              <div className="flex flex-wrap gap-3">
                {plans.map((p) => (
                  <LinkedPlanCard key={p.id} plan={p} totalInGroup={2} isExpanded={expandedPlans.has(p.id)}
                    onToggleExpand={() => setExpandedPlans((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })}
                    onRemove={() => setPlans((xs) => xs.filter((x) => x.id !== p.id))} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ── Floor Plans ── */}
        <CollapsibleSection
          open={openSections.has("floorPlans")} onToggle={() => toggleSection("floorPlans")}
          icon={<Layers className="h-4 w-4 text-muted-foreground" />} title="Floor Plans"
          tags={<CountTag label={floorPlanUrls.length === 1 ? "floor plan" : "floor plans"} a={floorPlanUrls.length} />}
          actions={<MediaActions field="floorPlans" matching={matching} onMatch={() => runAutoMatch("floorPlans")} onChoose={() => setDrawer("floorPlans")} onAdd={() => setAddMedia("floorPlans")} addLabel="Add floor plans" />}
        >
          <div className="px-5 py-4">
            <MediaGalleryTab field="floorPlans" items={floorPlanUrls} label="Floor Plan" hideHeader
              onUpload={() => setAddMedia("floorPlans")}
              onView={(idx) => setCarousel({ imgs: floorPlanUrls, idx, field: "floorPlans" })}
              onRemove={(idx) => setFloorPlanUrls((xs) => xs.filter((_, i) => i !== idx))}
              onReorder={(items) => setFloorPlanUrls(items)} />
          </div>
        </CollapsibleSection>

        {/* ── Images ── */}
        <CollapsibleSection
          open={openSections.has("images")} onToggle={() => toggleSection("images")}
          icon={<ImageIcon className="h-4 w-4 text-muted-foreground" />} title="Images"
          tags={<CountTag label={imageUrls.length === 1 ? "image" : "images"} a={imageUrls.length} />}
          actions={<MediaActions field="images" matching={matching} onMatch={() => runAutoMatch("images")} onChoose={() => setDrawer("images")} onAdd={() => setAddMedia("images")} addLabel="Add images" />}
        >
          <div className="px-5 py-4">
            <MediaGalleryTab field="images" items={imageUrls} label="Image" hideHeader
              onUpload={() => setAddMedia("images")}
              onView={(idx) => setCarousel({ imgs: imageUrls, idx, field: "images" })}
              onRemove={(idx) => setImageUrls((xs) => xs.filter((_, i) => i !== idx))}
              onReorder={(items) => setImageUrls(items)} />
          </div>
        </CollapsibleSection>
      </div>

      {/* Payment plan create drawer */}
      <PaymentPlanDrawer open={planDrawer} onClose={() => setPlanDrawer(false)} onSave={(plan) => setPlans((xs) => [...xs, plan])} />

      {/* Choose-from-project drawers */}
      <ChooseAssetsDrawer open={drawer === "plans"} onClose={() => setDrawer(null)} layout="list"
        title="Choose payment plans" description="Select one or more existing plans to attach."
        items={PLAN_POOL} searchKeys={["name", "id"]} searchPlaceholder="Search by plan name or ID"
        filters={[
          { key: "planType", label: "Type", options: ["Equal", "Backloaded", "Frontloaded", "Cash"] },
          { key: "frequency", label: "Frequency", options: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "One-time"] },
          { key: "hasOffer", label: "Offer", boolean: true },
        ]}
        alreadySelectedIds={plans.map((p) => p.id)}
        renderItem={(p, ctx) => <LinkedPlanCard plan={p} totalInGroup={1} isExpanded={false} onToggleExpand={() => {}} readOnly fullWidth selected={ctx.selected} onSelectToggle={ctx.disabled ? undefined : ctx.toggle} />}
        onConfirm={(sel) => { setPlans((xs) => [...xs, ...sel.filter((s) => !xs.some((x) => x.id === s.id))]); setDrawer(null) }} />

      <ChooseAssetsDrawer open={drawer === "floorPlans"} onClose={() => setDrawer(null)} layout="grid" mediaKind="floorPlan"
        title="Choose floor plans" description="Select one or more floor plans to attach."
        items={FLOOR_PLAN_POOL} searchKeys={["id", "name", "type"]} searchPlaceholder="Search by floor plan ID"
        filters={[{ key: "type", label: "Type", options: FLOOR_PLAN_TYPES }]}
        alreadySelectedIds={FLOOR_PLAN_POOL.filter((p) => floorPlanUrls.includes(p.url)).map((p) => p.id)}
        onConfirm={(sel) => { setFloorPlanUrls((xs) => [...xs, ...sel.map((s) => s.url).filter((u) => !xs.includes(u))]); setDrawer(null) }} />

      <ChooseAssetsDrawer open={drawer === "images"} onClose={() => setDrawer(null)} layout="grid" mediaKind="image"
        title="Choose images" description="Select one or more images to attach."
        items={IMAGE_POOL} searchKeys={["id", "name"]} searchPlaceholder="Search by image ID"
        alreadySelectedIds={IMAGE_POOL.filter((p) => imageUrls.includes(p.url)).map((p) => p.id)}
        onConfirm={(sel) => { setImageUrls((xs) => [...xs, ...sel.map((s) => s.url).filter((u) => !xs.includes(u))]); setDrawer(null) }} />

      {/* Add media dialog (Upload + WhatsApp library) */}
      <AddMediaDialog open={addMedia !== null} onClose={() => setAddMedia(null)} label={addMedia === "images" ? "Image" : "Floor Plan"}
        onAdd={(urls) => { const setter = addMedia === "images" ? setImageUrls : setFloorPlanUrls; setter((xs) => [...xs, ...urls]) }} />

      {/* Carousel */}
      {carousel && (
        <ImageCarousel images={carousel.imgs} startIndex={carousel.idx} onClose={() => setCarousel(null)}
          onReorder={(imgs) => { carousel.field === "floorPlans" ? setFloorPlanUrls(imgs) : setImageUrls(imgs); setCarousel((s) => s ? { ...s, imgs } : null) }}
          onRemove={(idx) => {
            const next = carousel.imgs.filter((_, i) => i !== idx)
            carousel.field === "floorPlans" ? setFloorPlanUrls(next) : setImageUrls(next)
            if (next.length === 0) setCarousel(null); else setCarousel((s) => s ? { ...s, imgs: next } : null)
          }} />
      )}
    </div>
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

function CountTag({ label, a, b, tone = "default" }: { label: string; a: number; b?: number; tone?: "default" | "ok" | "warn" | "amber" }) {
  const cls = tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-700"
    : tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-border bg-secondary/60 text-muted-foreground"
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>{b === undefined ? `${a} ${label}` : `${a}/${b} ${label}`}</span>
}

function CollapsibleSection({ open, onToggle, icon, title, tags, actions, children }: {
  open: boolean; onToggle: () => void; icon: React.ReactNode; title: string; tags?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
          {icon}
          <h3 className="shrink-0 text-sm font-semibold">{title}</h3>
          {tags && <div className="flex flex-wrap items-center gap-1.5">{tags}</div>}
        </button>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  )
}

function SubSection({ label, children, noGrid }: { label: string; children: React.ReactNode; noGrid?: boolean }) {
  return (
    <div className="px-5 py-4">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
      {noGrid ? children : <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">{children}</div>}
    </div>
  )
}

function EmptyAssets({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">{label}</div>
}

function MediaActions({ field, matching, onMatch, onChoose, onAdd, addLabel }: {
  field: "floorPlans" | "images"; matching: "floorPlans" | "images" | null; onMatch: () => void; onChoose: () => void; onAdd: () => void; addLabel: string
}) {
  const isMatching = matching === field
  return (
    <>
      <Button variant="outline" size="sm" disabled={isMatching} onClick={onMatch}>
        {isMatching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        Auto Matching
      </Button>
      <Button variant="outline" size="sm" onClick={onChoose}><FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Choose from project</Button>
      <Button size="sm" onClick={onAdd}><Plus className="mr-1.5 h-3.5 w-3.5" /> {addLabel}</Button>
    </>
  )
}

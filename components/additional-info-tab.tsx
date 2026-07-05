"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Plus,
  Save,
  Search,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { GroupedProperty } from "@/components/grouped-properties-page"

// ─────────────────────────────────────────────────────────────────────────────
// Variation model — drives every visibility/editability decision on this page.
// ─────────────────────────────────────────────────────────────────────────────
export type Variation =
  | "launch"
  | "primary-automatic"
  | "primary-manual"
  | "resale"
  | "nawy-now"
  | "rental"

export function variationOf(g: GroupedProperty): Variation {
  if (g.saleType === "Primary") return g.entryType === "Automatic" ? "primary-automatic" : "primary-manual"
  const map: Record<string, Variation> = {
    Launch: "launch",
    Resale: "resale",
    "Nawy Now": "nawy-now",
    Rental: "rental",
  }
  return map[g.saleType] ?? "primary-manual"
}

/** Variations whose numeric fields render as a min/max range. */
const RANGE_VARIATIONS: Variation[] = ["launch", "primary-manual"]
export const isRangeVariation = (v: Variation) => RANGE_VARIATIONS.includes(v)

// ─────────────────────────────────────────────────────────────────────────────
// Option lists (mock)
// ─────────────────────────────────────────────────────────────────────────────
export const DEVELOPER_TYPE_OPTIONS = ["Primary Developer", "Co-Developer", "Master Developer", "Sub-Developer"]
export const BUILDING_TYPE_OPTIONS = ["Standalone", "Cluster", "Tower", "Mid-rise", "Low-rise"]
export const CURRENCY_OPTIONS = ["EGP", "USD", "EUR", "AED"]
export const FINISHING_OPTIONS = ["Core & Shell", "Semi Finished", "Fully Finished", "Furnished"]
export const DELIVERY_TYPE_OPTIONS = ["OFF PLAN", "READY TO MOVE"]
export const UNIT_VIEW_OPTIONS = ["Sea View", "Garden View", "Pool View", "Lagoon View", "Golf View", "City View", "Street View", "Park View", "Open View"]
export const UNIT_ORIENTATION_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"]
export const AMENITY_OPTIONS = [
  "Swimming Pool", "Pool", "Gym", "Security", "Parking", "Club House", "Playground",
  "Mall Access", "Concierge", "Beach Access", "Water Park", "Tennis Court",
  "Rooftop Terrace", "Smart Home", "Pets Allowed", "Kids Area", "BBQ Area",
  "Golf Course", "Spa", "Valet", "Private Beach", "Marina",
]
export const SERVICE_OPTIONS = [
  "Cleaning", "Maintenance", "Security Patrol", "Concierge", "Landscaping",
  "Pest Control", "Waste Management", "Shuttle Service", "Property Management",
]

// ─────────────────────────────────────────────────────────────────────────────
// Field spec
// ─────────────────────────────────────────────────────────────────────────────
type InputKind = "text" | "select" | "number" | "boolean" | "multiselect"
type Section = "identifiers" | "classification" | "floor-area" | "areas" | "features" | "amenities-services"

interface FieldSpec {
  key: string
  label: string
  kind: InputKind
  section: Section
  visibleIn: Variation[]
  /** subset of visibleIn rendered as a min/max range (numeric only) */
  range?: boolean
  options?: string[]
  /** DetailedProperty accessor used to seed the value (mock) */
  detailKey?: keyof GroupedProperty["details"][number]
  maxLen?: number
  /** validation flavor for numeric fields */
  numeric?: "floor" | "net" | "area" | "money" | "count"
}

const ALL: Variation[] = ["launch", "primary-automatic", "primary-manual", "resale", "nawy-now", "rental"]
const NOT_PA: Variation[] = ["launch", "primary-manual", "resale", "nawy-now", "rental"]
const RNN: Variation[] = ["resale", "nawy-now", "rental"]

const FIELD_SPECS: FieldSpec[] = [
  // Identifiers
  { key: "unitCode", label: "Unit Code", kind: "text", section: "identifiers", visibleIn: RNN, maxLen: 15, detailKey: "unitCode" },
  { key: "unitNumber", label: "Unit Number", kind: "text", section: "identifiers", visibleIn: RNN, maxLen: 15, detailKey: "unitNumber" },
  { key: "unitModel", label: "Unit Model", kind: "text", section: "identifiers", visibleIn: NOT_PA, detailKey: "unitModel" },
  { key: "zone", label: "Zone", kind: "text", section: "identifiers", visibleIn: NOT_PA },
  // Classification
  { key: "developerType", label: "Developer Type", kind: "select", section: "classification", visibleIn: ALL, options: DEVELOPER_TYPE_OPTIONS },
  { key: "buildingType", label: "Building Type", kind: "text", section: "classification", visibleIn: RNN },
  { key: "buildingNumber", label: "Building Number", kind: "text", section: "classification", visibleIn: RNN },
  { key: "unitView", label: "Unit View", kind: "select", section: "classification", visibleIn: NOT_PA, options: UNIT_VIEW_OPTIONS },
  { key: "unitOrientation", label: "Unit Orientation", kind: "select", section: "classification", visibleIn: NOT_PA, options: UNIT_ORIENTATION_OPTIONS },
  // Floor & Area
  { key: "floorNumber", label: "Floor Number", kind: "number", section: "floor-area", visibleIn: NOT_PA, range: true, numeric: "floor", detailKey: "floor" },
  { key: "netArea", label: "Net Area (SQM)", kind: "number", section: "floor-area", visibleIn: NOT_PA, range: true, numeric: "net", detailKey: "netBua" },
  // Additional areas
  { key: "gardenArea", label: "Garden Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area", detailKey: "gardenArea" },
  { key: "openRoofArea", label: "Open Roof Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area", detailKey: "roofArea" },
  { key: "roofAnnexArea", label: "Roof Annex Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area", detailKey: "roofAnnex" },
  { key: "terraceArea", label: "Terrace Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area", detailKey: "terraceArea" },
  { key: "landArea", label: "Land Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area", detailKey: "landArea" },
  { key: "outdoorArea", label: "Outdoor Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area" },
  { key: "storageArea", label: "Storage Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area" },
  { key: "basementArea", label: "Basement Area", kind: "number", section: "areas", visibleIn: NOT_PA, range: true, numeric: "area" },
  // Features — booleans first (one row), then the numeric fields below
  { key: "hasParking", label: "Has Parking", kind: "boolean", section: "features", visibleIn: NOT_PA },
  { key: "hasStorage", label: "Has Storage", kind: "boolean", section: "features", visibleIn: NOT_PA },
  { key: "isServiced", label: "Is Serviced", kind: "boolean", section: "features", visibleIn: NOT_PA },
  { key: "isBranded", label: "Is Branded", kind: "boolean", section: "features", visibleIn: NOT_PA },
  { key: "parkingSlots", label: "Parking Slots", kind: "number", section: "features", visibleIn: NOT_PA, range: true, numeric: "count" },
  { key: "storagePrice", label: "Storage Price", kind: "number", section: "features", visibleIn: NOT_PA, range: true, numeric: "money" },
  { key: "outdoorPrice", label: "Outdoor Price", kind: "number", section: "features", visibleIn: NOT_PA, range: true, numeric: "money" },
  // Amenities & services
  { key: "amenities", label: "Amenities", kind: "multiselect", section: "amenities-services", visibleIn: ALL, options: AMENITY_OPTIONS },
  { key: "services", label: "Services", kind: "multiselect", section: "amenities-services", visibleIn: ALL, options: SERVICE_OPTIONS },
]

const SECTION_ORDER: { id: Section; label: string }[] = [
  { id: "identifiers", label: "Identifiers" },
  { id: "classification", label: "Classification" },
  { id: "floor-area", label: "Floor & Area" },
  { id: "areas", label: "Additional Areas" },
  { id: "features", label: "Features" },
  { id: "amenities-services", label: "Amenities & Services" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Validation primitives (exported — reused by the container edit mode)
// ─────────────────────────────────────────────────────────────────────────────
export function maxLenErr(v: string, n: number): string | null {
  return v.length > n ? `Max ${n} characters` : null
}

export function floorEndpointErr(v: string): string | null {
  if (v === "") return null
  if (/^R$/i.test(v)) return null
  if (!/^-?\d+$/.test(v)) return 'Use an integer, 0, or "R"'
  const n = parseInt(v, 10)
  if (n < -10) return "Floor can't be below -10"
  if (n > 200) return "Floor too high"
  return null
}

export function decimalErr(v: string, max = 2000): string | null {
  if (v === "") return null
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Positive number, up to 2 decimals"
  const n = parseFloat(v)
  if (n <= 0) return "Must be greater than 0"
  if (n > max) return `Must be ≤ ${max}`
  return null
}

export function priceErr(v: string): string | null {
  if (v === "") return null
  const raw = v.replace(/,/g, "")
  if (!/^\d+(\.\d+)?$/.test(raw)) return "Numbers only"
  if (raw.replace(/\D/g, "").length < 6) return "At least 6 digits"
  return null
}

export function intRangeErr(v: string, lo: number, hi: number): string | null {
  if (v === "") return null
  if (!/^\d+$/.test(v)) return "Whole number"
  const n = parseInt(v, 10)
  if (n < lo || n > hi) return `Must be ${lo}–${hi}`
  return null
}

/** Monetary amount: non-negative, up to 2 decimals, comma-tolerant, no upper cap. */
export function moneyErr(v: string): string | null {
  if (v === "") return null
  const raw = v.replace(/,/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return "Positive amount, up to 2 decimals"
  if (parseFloat(raw) < 0) return "Cannot be negative"
  return null
}

/** Non-negative whole count. */
export function countErr(v: string): string | null {
  if (v === "") return null
  if (!/^\d+$/.test(v)) return "Whole number"
  return null
}

/** Format a numeric string with thousands separators, preserving a trailing/partial decimal. */
export function withCommas(v: string): string {
  if (v === "") return ""
  const raw = v.replace(/,/g, "")
  if (!/^\d*\.?\d*$/.test(raw)) return v
  const [int, dec] = raw.split(".")
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return dec !== undefined ? `${grouped}.${dec}` : grouped
}

type Ctx = { variation: Variation; grossMin: number; grossMax: number }
type RangeVal = { min: string; max: string }
type FieldValue = string | boolean | string[] | RangeVal

const isRangeVal = (v: FieldValue): v is RangeVal =>
  typeof v === "object" && v !== null && !Array.isArray(v) && "min" in v

function validateField(spec: FieldSpec, value: FieldValue, ctx: Ctx): string | null {
  if (spec.kind === "text" && typeof value === "string" && spec.maxLen) {
    return maxLenErr(value, spec.maxLen)
  }
  if (spec.kind !== "number") return null

  const endpoint = (v: string): string | null => {
    switch (spec.numeric) {
      case "floor": return floorEndpointErr(v)
      case "money": return moneyErr(v)
      case "count": return countErr(v)
      default: return decimalErr(v, 2000) // net, area
    }
  }

  if (isRangeVal(value)) {
    const minErr = endpoint(value.min)
    if (minErr) return `Min: ${minErr}`
    const maxErr = endpoint(value.max)
    if (maxErr) return `Max: ${maxErr}`
    const bothNumeric = /^-?\d+(\.\d+)?$/.test(value.min) && /^-?\d+(\.\d+)?$/.test(value.max)
    if (bothNumeric) {
      const mn = parseFloat(value.min)
      const mx = parseFloat(value.max)
      // Floor range must be strictly increasing; area/net allow equal endpoints.
      const strict = spec.numeric === "floor"
      if (strict ? mx <= mn : mx < mn) return strict ? "Max must be greater than min" : "Max must be ≥ min"
    }
    if (spec.numeric === "net" && bothNumeric) {
      if (parseFloat(value.min) >= ctx.grossMin) return `Min net must be below gross min (${ctx.grossMin})`
      if (parseFloat(value.max) >= ctx.grossMax) return `Max net must be below gross max (${ctx.grossMax})`
    }
    return null
  }

  if (typeof value === "string") {
    const e = endpoint(value)
    if (e) return e
    if (spec.numeric === "net" && value !== "" && parseFloat(value) >= ctx.grossMax) {
      return `Net must be below gross (${ctx.grossMax})`
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding (mock)
// ─────────────────────────────────────────────────────────────────────────────
function numericFrom(values: (number | undefined)[]): { min: string; max: string } {
  const nums = values.filter((n): n is number => typeof n === "number")
  if (nums.length === 0) return { min: "", max: "" }
  return { min: String(Math.min(...nums)), max: String(Math.max(...nums)) }
}

function seedDraft(group: GroupedProperty, variation: Variation): Record<string, FieldValue> {
  const details = group.details
  const first = details[0]
  const range = isRangeVariation(variation)
  const out: Record<string, FieldValue> = {}

  for (const spec of FIELD_SPECS) {
    if (!spec.visibleIn.includes(variation)) continue
    switch (spec.kind) {
      case "boolean":
        out[spec.key] = false
        break
      case "multiselect":
        out[spec.key] = spec.key === "amenities" ? [...group.amenities] : []
        break
      case "select":
        out[spec.key] = ""
        break
      case "number": {
        if (spec.numeric === "floor") {
          if (range) {
            const floors = details.map((d) => d.floor).filter((f) => /^-?\d+$/.test(f)).map(Number)
            out[spec.key] = floors.length ? { min: String(Math.min(...floors)), max: String(Math.max(...floors)) } : { min: "", max: "" }
          } else {
            out[spec.key] = first && /^-?\d+$/.test(first.floor) ? first.floor : ""
          }
        } else {
          const accessor = spec.detailKey
          const vals = accessor ? details.map((d) => d[accessor] as number | undefined) : []
          if (range) {
            out[spec.key] = numericFrom(vals)
          } else {
            const v = accessor && first ? (first[accessor] as number | undefined) : undefined
            out[spec.key] = typeof v === "number" ? String(v) : ""
          }
        }
        break
      }
      case "text":
      default: {
        const accessor = spec.detailKey
        const raw = accessor && first ? first[accessor] : undefined
        out[spec.key] = typeof raw === "string" && raw !== "N/A" ? raw : ""
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field atoms (exported — also used by the container edit mode)
// ─────────────────────────────────────────────────────────────────────────────
const errRing = (e?: string | null) => (e ? "border-red-500 focus-visible:ring-red-500/40" : "")

export function FieldShell({
  label, icon, error, required, children, className,
}: { label: string; icon?: React.ReactNode; error?: string | null; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function TextInput({ value, onChange, error, maxLength, placeholder }: { value: string; onChange: (v: string) => void; error?: string | null; maxLength?: number; placeholder?: string }) {
  return (
    <Input
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-8 text-sm", errRing(error))}
    />
  )
}

export function NumberInput({ value, onChange, error, placeholder, format }: { value: string; onChange: (v: string) => void; error?: string | null; placeholder?: string; format?: (v: string) => string }) {
  return (
    <Input
      value={format ? format(value) : value}
      inputMode="decimal"
      placeholder={placeholder}
      onChange={(e) => onChange(format ? e.target.value.replace(/,/g, "") : e.target.value)}
      className={cn("h-8 text-sm", errRing(error))}
    />
  )
}

export function SelectInput({ value, onChange, options, error, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; error?: string | null; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 text-sm", errRing(error))}>
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export function RangeInput({ value, onChange, error, format }: { value: RangeVal; onChange: (v: RangeVal) => void; error?: string | null; format?: (v: string) => string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={format ? format(value.min) : value.min}
        inputMode="decimal"
        placeholder="Min"
        onChange={(e) => onChange({ ...value, min: format ? e.target.value.replace(/,/g, "") : e.target.value })}
        className={cn("h-8 text-sm", errRing(error))}
      />
      <span className="text-muted-foreground">–</span>
      <Input
        value={format ? format(value.max) : value.max}
        inputMode="decimal"
        placeholder="Max"
        onChange={(e) => onChange({ ...value, max: format ? e.target.value.replace(/,/g, "") : e.target.value })}
        className={cn("h-8 text-sm", errRing(error))}
      />
    </div>
  )
}

export function BooleanToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={value} onCheckedChange={onChange} />
      <BoolDisplay value={value} />
    </div>
  )
}

export function BoolDisplay({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Yes</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="h-4 w-4" /> No</span>
  )
}

export function MultiChips({ selected, onChange, options }: { selected: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const [q, setQ] = useState("")
  const set = new Set(selected)
  const filtered = useMemo(() => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options), [q, options])
  const toggle = (o: string) => {
    const next = new Set(set)
    next.has(o) ? next.delete(o) : next.add(o)
    onChange([...next])
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {s}
            <button onClick={() => toggle(s)} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <Popover onOpenChange={(o) => !o && setQ("")}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
              <Plus className="h-3 w-3" /> Add
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start" sideOffset={4}>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 pl-7 text-xs" />
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {filtered.map((o) => {
                const checked = set.has(o)
                return (
                  <button key={o} onClick={() => toggle(o)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors", checked ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
                    <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary" : "border-border")}>
                      {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{o}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {selected.length === 0 && <span className="text-xs text-muted-foreground">None selected</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only renderer
// ─────────────────────────────────────────────────────────────────────────────
function readDisplay(spec: FieldSpec, value: FieldValue): React.ReactNode {
  if (spec.kind === "boolean") return <BoolDisplay value={value as boolean} />
  if (spec.kind === "multiselect") {
    const arr = value as string[]
    if (arr.length === 0) return <span className="text-muted-foreground">—</span>
    return (
      <div className="flex flex-wrap gap-1">
        {arr.map((a) => <Badge key={a} variant="outline" className="h-4 border-border bg-secondary/50 px-1.5 text-[10px] font-normal text-muted-foreground">{a}</Badge>)}
      </div>
    )
  }
  const fmt = spec.numeric === "money" ? withCommas : (x: string) => x
  if (isRangeVal(value)) {
    if (!value.min && !value.max) return <span className="text-muted-foreground">—</span>
    return <span>{fmt(value.min) || "?"} – {fmt(value.max) || "?"}</span>
  }
  const s = value as string
  return s ? <span>{fmt(s)}</span> : <span className="text-muted-foreground">—</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab
// ─────────────────────────────────────────────────────────────────────────────
export function AdditionalInfoTab({ group, embedded = false, editing: editingProp }: { group: GroupedProperty; embedded?: boolean; editing?: boolean }) {
  const variation = useMemo(() => variationOf(group), [group])
  const ctx: Ctx = { variation, grossMin: group.areaMin, grossMax: group.areaMax }
  const fields = useMemo(() => FIELD_SPECS.filter((f) => f.visibleIn.includes(variation)), [variation])

  // `editing` can be driven externally (embedded mode) so a parent card shares one edit state.
  const [internalEditing, setIsEditing] = useState(false)
  const isEditing = editingProp ?? internalEditing
  const [saved, setSaved] = useState<Record<string, FieldValue>>(() => seedDraft(group, variation))
  const [draft, setDraft] = useState<Record<string, FieldValue>>(saved)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setField = (spec: FieldSpec, value: FieldValue) => {
    setDraft((d) => ({ ...d, [spec.key]: value }))
    setErrors((e) => {
      const next = { ...e }
      const msg = validateField(spec, value, ctx)
      if (msg) next[spec.key] = msg
      else delete next[spec.key]
      return next
    })
  }

  const startEdit = () => { setDraft(saved); setErrors({}); setIsEditing(true) }
  const cancel = () => { setDraft(saved); setErrors({}); setIsEditing(false) }
  const save = () => {
    const all: Record<string, string> = {}
    for (const f of fields) {
      const msg = validateField(f, draft[f.key], ctx)
      if (msg) all[f.key] = msg
    }
    if (Object.keys(all).length) { setErrors(all); return }
    setSaved(draft)
    setIsEditing(false)
    toast.success("Additional info updated")
  }

  const hasErrors = Object.keys(errors).length > 0
  const source = (isEditing || embedded) ? draft : saved

  const renderEdit = (spec: FieldSpec) => {
    const v = draft[spec.key]
    const err = errors[spec.key]
    const range = spec.kind === "number" && spec.range && isRangeVariation(variation)
    switch (spec.kind) {
      case "text":
        return <TextInput value={v as string} onChange={(nv) => setField(spec, nv)} error={err} maxLength={spec.maxLen} />
      case "select":
        return <SelectInput value={v as string} onChange={(nv) => setField(spec, nv)} options={spec.options ?? []} error={err} />
      case "boolean":
        return <BooleanToggle value={v as boolean} onChange={(nv) => setField(spec, nv)} />
      case "multiselect":
        return <MultiChips selected={v as string[]} onChange={(nv) => setField(spec, nv)} options={spec.options ?? []} />
      case "number": {
        const fmt = spec.numeric === "money" ? withCommas : undefined
        return range
          ? <RangeInput value={v as RangeVal} onChange={(nv) => setField(spec, nv)} error={err} format={fmt} />
          : <NumberInput value={v as string} onChange={(nv) => setField(spec, nv)} error={err} format={fmt} />
      }
    }
  }

  return (
    <div className={embedded ? "" : "rounded-xl border border-border bg-card"}>
      {!embedded && (
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">Additional Info</h3>
          <p className="text-xs text-muted-foreground">Extra Property Fields</p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancel}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={hasErrors}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>
      )}

      <div className="divide-y divide-border">
        {SECTION_ORDER.map(({ id, label }) => {
          const secFields = fields.filter((f) => f.section === id)
          if (secFields.length === 0) return null
          const isFeatures = id === "features"
          const isChips = id === "amenities-services"

          const cell = (spec: FieldSpec) => (
            <FieldShell key={spec.key} label={spec.label} error={isEditing ? errors[spec.key] : undefined}>
              {isEditing ? renderEdit(spec) : <div className="text-sm font-medium text-foreground">{readDisplay(spec, source[spec.key])}</div>}
            </FieldShell>
          )

          return (
            <div key={id} className="px-5 py-4">
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
              {isFeatures ? (
                <div className="space-y-4">
                  {/* Boolean flags on one row */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                    {secFields.filter((f) => f.kind === "boolean").map(cell)}
                  </div>
                  {/* Numeric fields below (Parking Slots, Storage Price, Outdoor Price) */}
                  {secFields.some((f) => f.kind !== "boolean") && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
                      {secFields.filter((f) => f.kind !== "boolean").map(cell)}
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("grid gap-x-6 gap-y-4", isChips ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3")}>
                  {secFields.map(cell)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

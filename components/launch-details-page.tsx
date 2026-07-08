"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LinkedPlanCard, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDrawer } from "@/components/payment-plan-builder"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { toast } from "sonner"
import {
  AdditionalInfoTab, FieldShell, SelectInput, NumberInput, RangeInput,
  withCommas, decimalErr, intRangeErr, priceErr,
  FINISHING_OPTIONS, DELIVERY_TYPE_OPTIONS, CURRENCY_OPTIONS,
} from "@/components/additional-info-tab"
import { TYPE_TREE, buildTypeGroups, type GroupedProperty } from "@/components/grouped-properties-page"
import { FilterMultiSelect } from "@/components/table-kit"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Copy,
  Check,
  Edit,
  Save,
  Archive,
  Plus,
  Trash2,
  Link2,
  Upload,
  Eye,
  EyeOff,
  MessageSquare,
  Clock,
  User,
  FileText,
  ImageIcon,
  ChevronDown,
  Search,
  Building2,
  LayoutGrid,
  BedDouble,
  Bath,
  PaintBucket,
  Truck,
  Ruler,
  Tag,
  X,
  GripVertical,
  ExternalLink,
  MoreHorizontal,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Pencil,
  Layers,
  MapPin,
  Home,
  Wrench,
  CalendarDays,
  Banknote,
  Globe,
  Bot,
  Database,
} from "lucide-react"
import { useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

// --- Searchable Dropdown ---
interface SearchableOption {
  id: string
  label: string
}

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Search...",
}: {
  options: SearchableOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.id === value)

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      o.id.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery("") }}
        className="w-full flex items-center justify-between px-3 py-2 mt-1 text-sm border border-border rounded-md bg-background hover:bg-secondary/30 transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/30 rounded-md outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); setQuery("") }}
                  className={`w-full flex flex-col items-start px-3 py-2 hover:bg-secondary/50 transition-colors text-left ${value === opt.id ? "bg-secondary/30" : ""}`}
                >
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{opt.id}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const mockDevelopers: SearchableOption[] = [
  { id: "DEV-001", label: "Palm Hills Developments" },
  { id: "DEV-002", label: "Emaar Misr" },
  { id: "DEV-003", label: "Sodic" },
  { id: "DEV-004", label: "Mountain View" },
  { id: "DEV-005", label: "Hyde Park Developments" },
  { id: "DEV-006", label: "Ora Developers" },
]

const mockAreas: SearchableOption[] = [
  { id: "AREA-001", label: "6th of October" },
  { id: "AREA-002", label: "New Cairo" },
  { id: "AREA-003", label: "North Coast" },
  { id: "AREA-004", label: "Sheikh Zayed" },
  { id: "AREA-005", label: "Ain Sokhna" },
  { id: "AREA-006", label: "Heliopolis" },
]

const mockProjects: SearchableOption[] = [
  { id: "PROJ-001", label: "Palm Hills October" },
  { id: "PROJ-002", label: "Westown Residences" },
  { id: "PROJ-003", label: "Cairo Festival City" },
  { id: "PROJ-004", label: "Mountain View iCity" },
  { id: "PROJ-005", label: "Hyde Park Cairo" },
  { id: "PROJ-006", label: "Zed East" },
]

interface Launch {
  id: string
  developer: {
    name: string
    logo: string
    id: string
  }
  projectNameEn: string
  phase: string
  projectLevel: "Main Project" | "Phase"
  parentProjectId?: string
  /** Matched system project id — undefined ⇒ unmatched free-text parent. */
  projectId?: string
  /** Already-created project in the system — undefined ⇒ "New". */
  existingProject?: { id: string; name: string }
  area: string
  areaId?: string
  aiUpdates?: { count: number; lastAt: string }
  ingestedAt?: string
  approvalStatus: "Pending Review" | "Approved" | "Rejected"
  ingestionStatus: "Ingested" | "Not Ingested"
  listingStatus: "Active" | "Hidden"
  launchStatus: "Upcoming" | "Active" | "Closed"
  type: "Launch" | "Release"
  source: "WhatsApp" | "Manual"
  listingCompletion: number
  sentAt?: string | null
  createdAt: string
  updatedAt: string
}

interface LaunchDetailsPageProps {
  launch: Launch
  onBack: () => void
}

interface Offering {
  id: number
  offeringName: string
  isNew: boolean
  keywords: string
  propertyCategory: string
  propertyType: string
  propertySubtype: string
  developerType: string
  bedrooms: string
  bathrooms: string
  finishingType: string
  deliveryType: string
  deliveryDate: string
  grossAreaRange: string
  priceRange: string
  paymentPlansCount: number
  offersCount: number
  listed: boolean
  listingStatus?: "Active" | "Hidden"
}

const initialOfferings: Offering[] = [
  {
    id: 1,
    offeringName: "Premium Duplex",
    isNew: true,
    keywords: "luxury duplex, city view, modern design, premium finishing, gated community",
    propertyCategory: "Apartments",
    propertyType: "Apartments - Duplex",
    propertySubtype: "Apartments - Duplex",
    developerType: "--",
    bedrooms: "4",
    bathrooms: "3",
    finishingType: "Fully Finished",
    deliveryType: "Off-plan",
    deliveryDate: "Oct. 2027",
    grossAreaRange: "180 - 220 SQM",
    priceRange: "4,500,000 - 6,200,000",
    paymentPlansCount: 2,
    offersCount: 1,
    listed: true,
    listingStatus: "Active",
  },
  {
    id: 2,
    offeringName: "Garden Villa",
    isNew: false,
    keywords: "standalone villa, private garden, golf view, gated community, premium finishing",
    propertyCategory: "Villas",
    propertyType: "Villas - Standalone",
    propertySubtype: "Villas - Standalone",
    developerType: "--",
    bedrooms: "5",
    bathrooms: "4",
    finishingType: "Core & Shell",
    deliveryType: "Off-plan",
    deliveryDate: "Oct. 2028",
    grossAreaRange: "320 - 400 SQM",
    priceRange: "12,000,000 - 18,000,000",
    paymentPlansCount: 3,
    offersCount: 2,
    listed: false,
  },
  {
    id: 3,
    offeringName: "Corner Townhouse",
    isNew: false,
    keywords: "corner unit, townhouse, private entrance, modern design, spacious garden",
    propertyCategory: "Townhouses",
    propertyType: "Townhouses - Corner",
    propertySubtype: "Townhouses - Corner",
    developerType: "--",
    bedrooms: "3",
    bathrooms: "3",
    finishingType: "Semi-Finished",
    deliveryType: "Off-plan",
    deliveryDate: "Mar. 2027",
    grossAreaRange: "250 - 280 SQM",
    priceRange: "8,000,000 - 10,000,000",
    paymentPlansCount: 2,
    offersCount: 0,
    listed: false,
  },
]

// Read-only field with icon
function OfferingField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm text-foreground">{value || "--"}</p>
    </div>
  )
}

// Locked context field (developer / project / phase / location) — read-only even in edit mode
function OfferingContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  )
}

// Inline editable field with icon + validation
function OfferingEditField({
  icon: Icon, label, value, onChange, type = "text", options, error,
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  type?: "text" | "number" | "select"
  options?: string[]
  error?: string
}) {
  const bad = !!error
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {type === "select" && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`h-7 w-full rounded-md border bg-background px-2 text-sm outline-none ${bad ? "border-red-400" : "border-input"}`}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode={type === "number" ? "numeric" : undefined} className={`h-7 text-sm px-2 py-0 ${bad ? "border-red-400 focus-visible:ring-red-400/40" : ""}`} />
      )}
      {bad && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// Parse "4,500,000 - 6,200,000" or "180 - 220 SQM" → [min, max].
function parseRange(s: string): [number, number] {
  const nums = (s.match(/[\d.,]+/g) ?? []).map((x) => Number(x.replace(/,/g, ""))).filter((n) => !Number.isNaN(n))
  if (nums.length >= 2) return [nums[0], nums[1]]
  if (nums.length === 1) return [nums[0], nums[0]]
  return [0, 0]
}

// Convert a free-text delivery like "Oct. 2027" → the YYYY-MM-DD the grouped card expects.
const MONTHS3: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" }
function toISODate(s: string): string {
  const m = s.toLowerCase().match(/([a-z]{3})[a-z.]*\s*(\d{4})/)
  if (m && MONTHS3[m[1]]) return `${m[2]}-${MONTHS3[m[1]]}-01`
  const y = s.match(/\d{4}/)
  return y ? `${y[0]}-01-01` : "2027-01-01"
}

interface MediaItem {
  id: string
  url: string
  name: string
  type: "image" | "floorplan"
}

// Draggable media list
function DraggableMediaList({
  items,
  onReorder,
  onRemove,
  onAdd,
  label,
  icon: Icon,
  readOnly = false,
}: {
  items: MediaItem[]
  onReorder: (items: MediaItem[]) => void
  onRemove: (id: string) => void
  onAdd: (files: FileList) => void
  label: string
  icon: React.ElementType
  /** Listed/ingested properties: media is view-only — no add, remove or reorder. */
  readOnly?: boolean
}) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copy = [...items]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOverItem.current, 0, dragged)
    dragItem.current = null
    dragOverItem.current = null
    onReorder(copy)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && onAdd(e.target.files)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : () => handleDragStart(idx)}
            onDragEnter={readOnly ? undefined : () => handleDragEnter(idx)}
            onDragEnd={readOnly ? undefined : handleDragEnd}
            onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
            className={cn(
              "relative group w-14 h-14 rounded-md bg-secondary border border-border flex items-center justify-center overflow-hidden",
              !readOnly && "cursor-grab active:cursor-grabbing",
            )}
          >
            {item.url.startsWith("blob:") || item.url.startsWith("/") ? (
              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Icon className="h-5 w-5 text-muted-foreground" />
            )}
            {!readOnly && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <GripVertical className="h-3.5 w-3.5 text-white" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                  className="absolute top-0.5 right-0.5"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          readOnly ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-md border border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        )}
      </div>
    </div>
  )
}

const mockPaymentPlans: PlanCardData[] = [
  {
    id: "PP-STD-001", name: "Standard Plan", status: "Active", hasOffer: false,
    devName: "Palm Hills", devId: "DEV-001", projName: "Palm Hills October", projId: "PRJ-1001",
    units: 0, available: 0, priceCount: 1, historicalCount: 0,
    planType: "Equal", currency: "EGP", discount: "—", validTill: "—",
    dp: "10%", duration: "8 Yrs", frequency: "Quarterly", instalPct: "—",
    createdAt: "10 Jan 2026, 09:00", updatedAt: "15 Jan 2026, 14:30",
    expanded: { isCash: false },
  },
  {
    id: "PP-PRM-002", name: "Premium Plan", status: "Hidden", hasOffer: true,
    devName: "Palm Hills", devId: "DEV-001", projName: "Palm Hills October", projId: "PRJ-1001",
    units: 0, available: 0, priceCount: 1, historicalCount: 0,
    planType: "Backloaded", currency: "EGP", discount: "5%", validTill: "—",
    dp: "5%", duration: "10 Yrs", frequency: "Monthly", instalPct: "—",
    createdAt: "11 Jan 2026, 10:00", updatedAt: "14 Jan 2026, 10:15",
    expanded: { isCash: false },
  },
]

const mockAuditLogs = [
  { id: 1, user: "Ahmed Hassan", action: "Updated approval status", timestamp: "2024-01-15 14:30", field: "Approval Status: Under Review → Approved" },
  { id: 2, user: "Sara Ali", action: "Added payment plan", timestamp: "2024-01-14 10:15", field: "Payment Plans" },
  { id: 3, user: "Mohamed Fathy", action: "Updated offering details", timestamp: "2024-01-13 16:45", field: "Property Offerings" },
  { id: 4, user: "System", action: "Launch created", timestamp: "2024-01-10 09:00", field: "Initial creation" },
]

const mockAttachments = [
  { id: 1, name: "Brochure.pdf", type: "PDF", status: "Active", uploadedAt: "2024-01-12" },
  { id: 2, name: "Masterplan.jpg", type: "Image", status: "Active", uploadedAt: "2024-01-12" },
  { id: 3, name: "Price List.xlsx", type: "Excel", status: "Hidden", uploadedAt: "2024-01-11" },
  { id: 4, name: "Floor Plans.pdf", type: "PDF", status: "Active", uploadedAt: "2024-01-10" },
]

// Shared option lists + validators for the details tabs
const PROPERTY_TYPE_OPTIONS = ["Apartments", "Villas", "Townhouses", "Duplexes", "Penthouses", "Chalets", "Studios"]
const TASKEEN_TYPE_OPTIONS = ["Bulk", ...PROPERTY_TYPE_OPTIONS]
const AREA_UNIT_OPTIONS = ["Feddans", "Acres", "KM2"]

// EOI validation: positive integer, at least 5 digits, comma-grouped while typing
function fmtInt(raw: string): string {
  const d = raw.replace(/[^\d]/g, "")
  return d ? Number(d).toLocaleString("en-US") : ""
}
function eoiErr(v: string): string | null {
  const d = v.replace(/,/g, "")
  if (!d) return null
  if (!/^\d+$/.test(d)) return "Positive integers only"
  if (Number(d) <= 0) return "Must be a positive amount"
  if (d.length < 5) return "Minimum 5 digits (e.g. 10,000)"
  return null
}

/** New AI update = the last AI update landed after the launch was last updated. */
function hasNewAiUpdateDetails(l: Launch): boolean {
  return !!l.aiUpdates && new Date(l.aiUpdates.lastAt) > new Date(l.updatedAt)
}

// Map a launch offering → GroupedProperty so the embedded AdditionalInfoTab shows the real
// launch-property fields (developer/unit/area/amenity extras) with the same edit state.
function offeringToGroup(o: Offering, launch: Launch): GroupedProperty {
  const [priceMin, priceMax] = parseRange(o.priceRange)
  const [areaMin, areaMax] = parseRange(o.grossAreaRange)
  return {
    id: `LOFF-${o.id}`, propertyMetadataId: `PMD-${o.id}`, title: o.offeringName, description: o.keywords,
    availableUnits: o.offersCount, totalUnits: o.offersCount + o.paymentPlansCount,
    priceMin, priceMax, areaMin, areaMax, bedroom: Number(o.bedrooms) || 0, bathroom: Number(o.bathrooms) || 0,
    saleType: "Launch", entryType: "Manual", listingStatus: o.listed ? "Published" : "Hidden", saleStatus: "Available",
    propertyCategory: o.propertyCategory, propertyType: o.propertyType, propertySubType: o.propertySubtype,
    district: launch.area, locationArea: launch.area, subarea: null, locationId: "0000", source: launch.source,
    developer: { name: launch.developer.name, id: launch.developer.id, url: "#" },
    project: { name: launch.projectNameEn, id: "PRJ-LAUNCH", url: "#" },
    phase: launch.phase ? { name: launch.phase, id: "PH-LAUNCH", url: "#" } : null,
    deliveryType: o.deliveryType, deliveryDate: toISODate(o.deliveryDate), finishing: o.finishingType,
    createdAt: launch.createdAt, updatedAt: launch.updatedAt, availabilityUpdatedAt: launch.updatedAt,
    plans: o.paymentPlansCount, offers: o.offersCount, images: [], floorPlans: [], amenities: [], details: [],
  }
}

// ── Launch offering card (dedicated — mirrors the grouped-property card, launch-only handling) ──
const FINISHING_OPTS = ["Fully Finished", "Semi-Finished", "Core & Shell", "Not Finished"]
const MANDATORY_OFFERING: (keyof Offering)[] = ["propertyCategory", "propertyType", "bedrooms", "bathrooms", "finishingType", "grossAreaRange", "priceRange"]

function offeringFieldErrors(o: Offering): Partial<Record<keyof Offering, string>> {
  const errs: Partial<Record<keyof Offering, string>> = {}
  const intOk = (v: string) => v.trim() === "" || (/^\d+$/.test(v.trim()) && +v >= 0 && +v <= 19)
  if (!intOk(o.bedrooms)) errs.bedrooms = "Whole number 0–19"
  if (!intOk(o.bathrooms)) errs.bathrooms = "Whole number 0–19"
  return errs
}
function offeringMissingMandatory(o: Offering): string[] {
  return MANDATORY_OFFERING.filter((k) => !String(o[k] ?? "").trim())
}
function fmtLaunchDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
function IdCopy({ value }: { value: string }) {
  return (
    <span className="group/id inline-flex items-center gap-1 font-mono text-[10px] text-foreground">
      {value}
      <button onClick={() => navigator.clipboard?.writeText(value).catch(() => {})} className="opacity-0 transition-opacity group-hover/id:opacity-100"><Copy className="h-3 w-3 text-muted-foreground" /></button>
    </span>
  )
}

// ── Offering edit form — mirrors the grouped-property main container (launch variation) ──
interface OfferingForm {
  name: string; keywords: string
  category: string; type: string; subtype: string
  finishing: string; deliveryType: string; deliveryDate: string
  grossMin: string; grossMax: string
  bedrooms: string; bathrooms: string
  priceMin: string; priceMax: string; currency: string
}
function seedOfferingForm(o: Offering): OfferingForm {
  const [gMin, gMax] = parseRange(o.grossAreaRange)
  const [pMin, pMax] = parseRange(o.priceRange)
  const dt = o.deliveryType?.toUpperCase().includes("READY") ? "READY TO MOVE" : "OFF PLAN"
  return {
    name: o.offeringName, keywords: o.keywords,
    category: o.propertyCategory, type: o.propertyType, subtype: o.propertySubtype,
    finishing: o.finishingType, deliveryType: dt, deliveryDate: toISODate(o.deliveryDate) || "",
    grossMin: gMin ? String(gMin) : "", grossMax: gMax ? String(gMax) : "",
    bedrooms: o.bedrooms, bathrooms: o.bathrooms,
    priceMin: pMin ? String(pMin) : "", priceMax: pMax ? String(pMax) : "", currency: "EGP",
  }
}
// Same validation rules as the grouped main container (launch variation: only Type mandatory).
// No title/description here — they are auto-generated at ingestion.
function validateOfferingForm(f: OfferingForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.category || !f.type) e.type = "Required"
  const gMin = decimalErr(f.grossMin, 2000); if (gMin) e.grossMin = gMin
  const gMax = decimalErr(f.grossMax, 2000); if (gMax) e.grossMax = gMax
  if (!gMin && !gMax && f.grossMin && f.grossMax && parseFloat(f.grossMax) < parseFloat(f.grossMin)) e.grossMax = "Max must be ≥ min"
  const bed = intRangeErr(f.bedrooms, 0, 19); if (bed) e.bedrooms = bed
  const bath = intRangeErr(f.bathrooms, 0, 19); if (bath) e.bathrooms = bath
  const pMin = priceErr(f.priceMin); if (pMin) e.priceMin = pMin
  const pMax = priceErr(f.priceMax); if (pMax) e.priceMax = pMax
  if (!pMin && !pMax && f.priceMin && f.priceMax && parseFloat(f.priceMax) <= parseFloat(f.priceMin)) e.priceMax = "Max must be greater than min"
  return e
}

/** Read-only context cell — same look as the grouped card's EntityCell. */
function OfferingCtxCell({ label, icon, value, sub }: { label: string; icon: React.ReactNode; value: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="truncate text-xs font-medium text-foreground">{value || "—"}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function LaunchOfferingCard({
  offering: o, launch, launchIngested, editing, expanded, images, floorPlans, linkedPlansCount,
  onUpdate, onToggleEdit, onToggleExpand, onDelete, onListClick,
  onAddMedia, onRemoveMedia, onReorderImages, onReorderFloorPlans, onViewPlans, onLinkPlans,
}: {
  offering: Offering
  launch: Launch
  launchIngested: boolean
  editing: boolean
  expanded: boolean
  images: MediaItem[]
  floorPlans: MediaItem[]
  linkedPlansCount: number
  onUpdate: (field: keyof Offering, value: string) => void
  onToggleEdit: () => void
  onToggleExpand: () => void
  onDelete: () => void
  onListClick: () => void
  onAddMedia: (type: "image" | "floorplan", files: FileList) => void
  onRemoveMedia: (type: "image" | "floorplan", id: string) => void
  onReorderImages: (items: MediaItem[]) => void
  onReorderFloorPlans: (items: MediaItem[]) => void
  onViewPlans: () => void
  onLinkPlans: () => void
}) {
  // Per-property ingestion: only real (listed) properties of an ingested launch are Ingested.
  const ingested = launchIngested && o.listed
  const [form, setForm] = useState<OfferingForm>(() => seedOfferingForm(o))
  const [fErrors, setFErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<OfferingForm>) =>
    setForm((prev) => { const next = { ...prev, ...patch }; setFErrors(validateOfferingForm(next)); return next })
  const startEdit = () => { setForm(seedOfferingForm(o)); setFErrors({}); onToggleEdit() }
  const saveEdit = () => {
    const errs = validateOfferingForm(form)
    setFErrors(errs)
    if (Object.keys(errs).length > 0) return
    onUpdate("propertyCategory", form.category); onUpdate("propertyType", form.type); onUpdate("propertySubtype", form.subtype)
    onUpdate("finishingType", form.finishing); onUpdate("deliveryType", form.deliveryType); onUpdate("deliveryDate", form.deliveryDate)
    onUpdate("grossAreaRange", form.grossMin || form.grossMax ? `${form.grossMin} - ${form.grossMax} SQM` : "")
    onUpdate("priceRange", form.priceMin || form.priceMax ? `${Number(form.priceMin || 0).toLocaleString()} - ${Number(form.priceMax || 0).toLocaleString()}` : "")
    onUpdate("bedrooms", form.bedrooms); onUpdate("bathrooms", form.bathrooms)
    onToggleEdit()
    toast.success("Offering saved")
  }

  return (
    <Card className={cn("overflow-hidden gap-0 border p-0", editing ? "border-primary/50" : ingested ? "border-border" : "border-amber-200")}>
      {/* ── Section 1: IDs · Tags (right, before actions) · Icon actions ── */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-muted-foreground">
          {ingested ? (
            <>
              <span className="flex items-center gap-1">Property ID: <IdCopy value={`LOFF-${o.id}`} /></span>
              <span>·</span>
              <span className="flex items-center gap-1">Metadata ID: <IdCopy value={`PMD-${o.id}`} /></span>
            </>
          ) : (
            <span className="italic">Draft offering</span>
          )}
        </div>

        {/* Tags — right aligned, before the action buttons */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {ingested
            ? <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-xs text-emerald-700">Ingested</Badge>
            : <Badge variant="outline" className="border-amber-200 bg-amber-100 text-xs text-amber-700">Draft</Badge>}
          <Badge variant="outline" className="border-blue-200 bg-blue-100 text-xs text-blue-700">Launch</Badge>
          {o.listed && (
            (o.listingStatus ?? "Active") === "Active"
              ? <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-xs text-emerald-700">Active</Badge>
              : <Badge variant="outline" className="border-red-200 bg-red-100 text-xs text-red-600">Hidden</Badge>
          )}
        </div>

        {/* Icon actions */}
        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          {ingested ? (
            <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="View property" asChild>
              <a href="#" target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
            </Button>
          ) : editing ? (
            <>
              <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Cancel" onClick={onToggleEdit}><X className="h-3 w-3" /></Button>
              <Button size="icon" className="h-6 w-6" title="Save" onClick={saveEdit} disabled={Object.keys(fErrors).length > 0}><Save className="h-3 w-3" /></Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Edit" onClick={startEdit}><Pencil className="h-3 w-3" /></Button>
              <Button variant="outline" size="sm" className="h-6 bg-transparent px-2 text-xs" onClick={onListClick}><Check className="h-3 w-3 mr-1" />List</Button>
              <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent text-muted-foreground hover:text-destructive" title="Delete" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
          <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent" title="Expand" onClick={onToggleExpand}>
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* ── Section 2: Status dot · Title · Description — VIEW ONLY, ingested properties only.
             Drafts have no title/description fields at all: both are auto-generated at ingestion. ── */}
      {ingested && (
        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <h3 className="truncate text-sm font-semibold">{o.offeringName}</h3>
          </div>
          {o.keywords && <p className="mt-0.5 pl-4 text-xs text-muted-foreground line-clamp-1">{o.keywords}</p>}
        </div>
      )}

      {/* ── Section 3: Main info — same 4-col grid, order and validation as the grouped main container ── */}
      <div className="border-b border-border px-4 py-2.5">
        <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
          {/* Row 1 — locked context */}
          <OfferingCtxCell label="Developer" icon={<Building2 className="h-3 w-3" />} value={launch.developer.name} sub={<IdCopy value={launch.developer.id} />} />
          <OfferingCtxCell label="Project" icon={<Home className="h-3 w-3" />} value={launch.projectNameEn} />
          <OfferingCtxCell label="Phase" icon={<Layers className="h-3 w-3" />} value={launch.phase} />
          <OfferingCtxCell label="Location" icon={<MapPin className="h-3 w-3" />} value={launch.area} sub={<span className="flex items-center gap-1">Area — <IdCopy value={launch.areaId ?? "AR-000"} /></span>} />

          {/* Type — grouped Property Type + dependent Subtype */}
          <FieldShell label="Type" icon={<Tag className="h-3 w-3" />} required={editing} error={editing ? fErrors.type : undefined}>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <Select
                    value={form.type ? `${form.category}|${form.type}` : undefined}
                    onValueChange={(v) => { const [cat, t] = v.split("|"); set({ category: cat, type: t, subtype: "" }) }}
                  >
                    <SelectTrigger className={cn("h-8 w-full text-sm", fErrors.type && "border-red-500")}><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {buildTypeGroups(form.category, form.type).map((g) => (
                        <SelectGroup key={g.category}>
                          <SelectLabel>{g.category}</SelectLabel>
                          {g.types.map((t) => <SelectItem key={`${g.category}|${t}`} value={`${g.category}|${t}`}>{t}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <SelectInput value={form.subtype} onChange={(v) => set({ subtype: v })} options={form.category && form.type ? (TYPE_TREE[form.category]?.[form.type] ?? []) : []} placeholder="Subtype" error={fErrors.type} />
                </div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">{[o.propertyCategory, o.propertyType, o.propertySubtype].filter(Boolean).join(" · ") || "—"}</div>
            )}
          </FieldShell>

          {/* Finishing */}
          <FieldShell label="Finishing" icon={<Wrench className="h-3 w-3" />} error={editing ? fErrors.finishing : undefined}>
            {editing ? (
              <SelectInput value={form.finishing} onChange={(v) => set({ finishing: v })} options={FINISHING_OPTIONS.includes(form.finishing) || !form.finishing ? FINISHING_OPTIONS : [form.finishing, ...FINISHING_OPTIONS]} error={fErrors.finishing} />
            ) : (
              <div className="text-xs font-medium text-foreground">{o.finishingType || "—"}</div>
            )}
          </FieldShell>

          {/* Delivery — type + date */}
          <FieldShell label="Delivery" icon={<CalendarDays className="h-3 w-3" />} error={editing ? fErrors.delivery : undefined}>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SelectInput value={form.deliveryType} onChange={(v) => set({ deliveryType: v })} options={DELIVERY_TYPE_OPTIONS} />
                </div>
                <div className="min-w-0 flex-1">
                  <Input type="date" value={form.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} className="h-8 w-full min-w-0 text-sm" />
                </div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">{[o.deliveryType, o.deliveryDate].filter(Boolean).join(" · ") || "—"}</div>
            )}
          </FieldShell>

          {/* Gross Area */}
          <FieldShell label="Gross Area" icon={<Ruler className="h-3 w-3" />} error={editing ? (fErrors.grossMin || fErrors.grossMax) : undefined}>
            {editing ? (
              <RangeInput value={{ min: form.grossMin, max: form.grossMax }} onChange={(r) => set({ grossMin: r.min, grossMax: r.max })} error={fErrors.grossMin || fErrors.grossMax} />
            ) : (
              <div className="text-xs font-medium text-foreground">{o.grossAreaRange || "—"}</div>
            )}
          </FieldShell>

          {/* Source (read-only) */}
          <FieldShell label="Source" icon={<Globe className="h-3 w-3" />}>
            <div className="text-xs font-medium text-foreground">{launch.source}</div>
          </FieldShell>

          {/* Bedrooms */}
          <FieldShell label="Bedrooms" icon={<BedDouble className="h-3 w-3" />} error={editing ? fErrors.bedrooms : undefined}>
            {editing ? (
              <NumberInput value={form.bedrooms} onChange={(v) => set({ bedrooms: v })} error={fErrors.bedrooms} />
            ) : (
              <div className="text-xs font-medium text-foreground">{o.bedrooms || "—"}</div>
            )}
          </FieldShell>

          {/* Bathrooms */}
          <FieldShell label="Bathrooms" icon={<Bath className="h-3 w-3" />} error={editing ? fErrors.bathrooms : undefined}>
            {editing ? (
              <NumberInput value={form.bathrooms} onChange={(v) => set({ bathrooms: v })} error={fErrors.bathrooms} />
            ) : (
              <div className="text-xs font-medium text-foreground">{o.bathrooms || "—"}</div>
            )}
          </FieldShell>

          {/* Price (+ currency) */}
          <FieldShell label="Price" icon={<Banknote className="h-3 w-3" />} error={editing ? (fErrors.priceMin || fErrors.priceMax) : undefined}>
            {editing ? (
              <div className="flex items-start gap-1.5">
                <RangeInput value={{ min: form.priceMin, max: form.priceMax }} onChange={(r) => set({ priceMin: r.min, priceMax: r.max })} error={fErrors.priceMin || fErrors.priceMax} format={withCommas} />
                <div className="w-20 shrink-0"><SelectInput value={form.currency} onChange={(v) => set({ currency: v })} options={CURRENCY_OPTIONS} /></div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">{o.priceRange ? `${o.priceRange} EGP` : "—"}</div>
            )}
          </FieldShell>
        </div>
      </div>

      {/* ── Expanded: the full Additional Info fields (same edit state, no nested card header) ── */}
      {expanded && (
        <div className="border-b border-border px-4 py-1">
          <AdditionalInfoTab group={offeringToGroup(o, launch)} embedded editing={editing} />
        </div>
      )}

      {/* ── Media · Amenities · Payment plans ── */}
      <div className="grid grid-cols-2 gap-4 px-4 py-2.5 md:grid-cols-4">
        {/* Listed properties: media is view-only (no add / remove / reorder / link) */}
        <DraggableMediaList label="Images" icon={ImageIcon} items={images} readOnly={o.listed} onReorder={onReorderImages} onRemove={(id) => onRemoveMedia("image", id)} onAdd={(files) => onAddMedia("image", files)} />
        <DraggableMediaList label="Floor Plans" icon={FileText} items={floorPlans} readOnly={o.listed} onReorder={onReorderFloorPlans} onRemove={(id) => onRemoveMedia("floorplan", id)} onAdd={(files) => onAddMedia("floorplan", files)} />
        <div><p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Amenities &amp; Services</p><p className="text-xs text-muted-foreground">—</p></div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Payment Plans</p>
            <div className="flex items-center gap-0.5">
              <Button variant="outline" size="icon" className="h-5 w-5 bg-transparent" title="View linked plans & prices" onClick={onViewPlans}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-5 w-5 bg-transparent" title="Link payment plans" onClick={onLinkPlans}>
                <Link2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5"><LayoutGrid className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{linkedPlansCount}</span> linked plan{linkedPlansCount === 1 ? "" : "s"}</div>
            <div className="flex items-center gap-1.5"><Tag className="h-3 w-3 text-muted-foreground" /><span className="font-medium">{o.offersCount}</span> offers</div>
          </div>
        </div>
      </div>

      {/* ── Dates — bottom, right aligned (ingested only) ── */}
      {ingested && (
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 border-t border-border px-4 py-1.5 text-[10px] text-muted-foreground">
          <span>Created <span className="text-foreground">{fmtLaunchDate(launch.createdAt)}</span></span>
          <span>Updated <span className="text-foreground">{fmtLaunchDate(launch.updatedAt)}</span></span>
          <span>Avail. updated <span className="text-foreground">{fmtLaunchDate(launch.updatedAt)}</span></span>
        </div>
      )}
    </Card>
  )
}

export function LaunchDetailsPage({ launch, onBack }: LaunchDetailsPageProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<Launch["approvalStatus"]>(launch.approvalStatus)
  const [ingestionStatus, setIngestionStatus] = useState<Launch["ingestionStatus"]>(launch.ingestionStatus)
  const [listingStatus, setListingStatus] = useState<Launch["listingStatus"]>(launch.listingStatus)
  const [launchStatus, setLaunchStatus] = useState<Launch["launchStatus"]>(launch.launchStatus)
  const [launchType, _setLaunchTypeField] = useState<Launch["type"]>(launch.type)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  // Payment Plans tab — real plan cards + create/edit drawer
  const [plans, setPlans] = useState<PlanCardData[]>(mockPaymentPlans)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanCardData | null>(null)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [projectLevel, setProjectLevel] = useState<"Phase" | "Main Project">("Phase")
  const [selectedDeveloper, setSelectedDeveloper] = useState("DEV-001")
  const [selectedArea, setSelectedArea] = useState("AREA-001")
  const [selectedProject, setSelectedProject] = useState("PROJ-001")
  const [projectNameEn, setProjectNameEn] = useState(launch.projectNameEn)
  const [projectNameAr, setProjectNameAr] = useState("بالم هيلز أكتوبر")
  const [phaseNameEn, setPhaseNameEn] = useState("")
  const [phaseNameAr, setPhaseNameAr] = useState("")
  // Project Details fields
  const [projectEditing, setProjectEditing] = useState(false)
  const [projectAreaValue, setProjectAreaValue] = useState("")
  const [projectAreaUnit, setProjectAreaUnit] = useState("Feddans")
  const [totalUnitsReleased, setTotalUnitsReleased] = useState("")
  const [totalBuildingsReleased, setTotalBuildingsReleased] = useState("")
  const [propertyReleased, setPropertyReleased] = useState<{ id: string; type: string; count: string }[]>([
    { id: "pr1", type: "", count: "" },
  ])

  // Launch Details fields
  const [launchFormType, setLaunchFormType] = useState<"Launch" | "Release">("Launch")
  const [launchDirty, setLaunchDirty] = useState(false)
  const [launchSaveConfirm, setLaunchSaveConfirm] = useState(false)
  const [eoiCurrency, setEoiCurrency] = useState("EGP")
  const [eoiOverallAmount, setEoiOverallAmount] = useState("")
  const [eoiByType, setEoiByType] = useState<{ id: string; name: string; amount: string }[]>([
    { id: "PT-001", name: "Apartments", amount: "" },
  ])
  const [launchStartDate, setLaunchStartDate] = useState("")
  const [launchEndDate, setLaunchEndDate] = useState("")
  const [paymentMethodCheque, setPaymentMethodCheque] = useState(false)
  const [paymentMethodOnline, setPaymentMethodOnline] = useState(false)
  const [paymentMethodCash, setPaymentMethodCash] = useState(false)
  const [paymentMethodBankTransfer, setPaymentMethodBankTransfer] = useState(false)
  const [isRefundable, setIsRefundable] = useState(false)
  const [refundType, setRefundType] = useState<"full" | "partial">("full")
  const [partialRefundValue, setPartialRefundValue] = useState("")
  const [partialRefundType, setPartialRefundType] = useState<"amount" | "percentage">("percentage")
  const [taskeenDays, setTaskeenDays] = useState<{ id: string; date: string; types: string[]; address: string }[]>([
    { id: "td1", date: "", types: [], address: "" },
  ])
  // Header actions + payment plan view drawer
  const [headerDialog, setHeaderDialog] = useState<"approve" | "reject" | "archive" | null>(null)
  const [headerReason, setHeaderReason] = useState("")
  const [detailsPlan, setDetailsPlan] = useState<PlanCardData | null>(null)
  const [ingestDialog, setIngestDialog] = useState<"summary" | "incomplete" | null>(null)
  // Tab edit states (view → edit → save/cancel)
  const [launchEditing, setLaunchEditing] = useState(false)
  const [incentivesEditing, setIncentivesEditing] = useState(false)
  const [incentivesSaveConfirm, setIncentivesSaveConfirm] = useState(false)
  // Per-offering linked payment plans + view/link drawers
  const [offeringPlanIds, setOfferingPlanIds] = useState<Record<number, string[]>>({ 1: ["PP-STD-001"], 2: [], 3: [] })
  const [viewPlansOffering, setViewPlansOffering] = useState<Offering | null>(null)
  const [linkPlansOffering, setLinkPlansOffering] = useState<Offering | null>(null)

  // Incentives fields
  const [commissionType, setCommissionType] = useState<"percentage" | "amount">("percentage")
  const [commissionValue, setCommissionValue] = useState("")
  const [brokerNotes, setBrokerNotes] = useState("")
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([
    { id: "c1", name: "", phone: "" },
  ])

  const addContact = () =>
    setContacts((prev) => [...prev, { id: `c${Date.now()}`, name: "", phone: "" }])
  const removeContact = (id: string) =>
    setContacts((prev) => prev.filter((c) => c.id !== id))
  const updateContact = (id: string, field: "name" | "phone", value: string) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))

  const addEoiByType = () =>
    setEoiByType((prev) => [...prev, { id: `PT-${Date.now()}`, name: "", amount: "" }])
  const removeEoiByType = (id: string) =>
    setEoiByType((prev) => prev.filter((e) => e.id !== id))
  const updateEoiByType = (id: string, field: "name" | "amount", value: string) =>
    setEoiByType((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))

  // Offerings state
  const [offerings, setOfferings] = useState<Offering[]>(initialOfferings)
  const [editingOfferingIds, setEditingOfferingIds] = useState<Set<number>>(new Set())
  const [expandedOfferingIds, setExpandedOfferingIds] = useState<Set<number>>(new Set())
  const [deletingOfferingId, setDeletingOfferingId] = useState<number | null>(null)
  const [showAddOffering, setShowAddOffering] = useState(false)
  const [newOffering, setNewOffering] = useState<Offering>({
    id: Date.now(), offeringName: "", isNew: false, keywords: "", propertyCategory: "",
    propertyType: "", propertySubtype: "", developerType: "", bedrooms: "", bathrooms: "",
    finishingType: "", deliveryType: "Off-plan", deliveryDate: "", grossAreaRange: "",
    priceRange: "", paymentPlansCount: 0, offersCount: 0, listed: false,
  })

  // Per-offering media
  const [offeringImages, setOfferingImages] = useState<Record<number, MediaItem[]>>({
    1: [{ id: "img-1", url: "/placeholder.svg", name: "photo1.jpg", type: "image" }],
    2: [{ id: "img-2", url: "/placeholder.svg", name: "photo2.jpg", type: "image" }],
    3: [],
  })
  const [offeringFloorPlans, setOfferingFloorPlans] = useState<Record<number, MediaItem[]>>({
    1: [{ id: "fp-1", url: "/placeholder.svg", name: "plan1.jpg", type: "floorplan" }],
    2: [],
    3: [],
  })

  // ── Data completeness (drives the header progress bar + the Ingest gate) ──
  const completenessChecks: { label: string; ok: boolean }[] = [
    { label: "Developer", ok: !!launch.developer.name },
    ...(launch.projectLevel === "Phase"
      ? [
          { label: "Phase Name (EN)", ok: !!(phaseNameEn || launch.phase) },
          { label: "Phase Name (AR)", ok: !!phaseNameAr },
          { label: "Parent Project", ok: !!(launch.parentProjectId || selectedProject) },
        ]
      : [
          { label: "Project Name (EN)", ok: !!projectNameEn },
          { label: "Project Name (AR)", ok: !!projectNameAr },
        ]),
    { label: "Area", ok: !!launch.area },
    { label: "Launch Type", ok: !!launchFormType },
    { label: "Launch Start Date", ok: !!launchStartDate },
    ...(listingStatus === "Active" ? [{ label: "Project Cover Image", ok: !!launch.coverImage }] : []),
    ...offerings.flatMap((o, i) => {
      const name = o.offeringName || `Offering ${i + 1}`
      const rows = [
        { label: `${name}: images`, ok: (offeringImages[o.id]?.length ?? 0) > 0 },
        { label: `${name}: property type`, ok: !!o.propertyType },
      ]
      if (o.priceRange) rows.push({ label: `${name}: payment plans`, ok: o.paymentPlansCount > 0 || (offeringPlanIds[o.id]?.length ?? 0) > 0 })
      return rows
    }),
  ]
  const missingFields = completenessChecks.filter((c) => !c.ok).map((c) => c.label)
  const completeness = Math.round((completenessChecks.filter((c) => c.ok).length / completenessChecks.length) * 100)

  const toggleEditOffering = (id: number) => {
    setEditingOfferingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const updateOffering = (id: number, field: keyof Offering, value: string) => {
    setOfferings((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o))
  }

  const confirmDelete = () => {
    setOfferings((prev) => prev.filter((o) => o.id !== deletingOfferingId))
    setDeletingOfferingId(null)
  }

  // Add PREPENDS a new blank card already in edit state (no dialog / form, no scroll hunting).
  const addOffering = () => {
    const id = Date.now()
    setOfferings((prev) => [{
      id, offeringName: "", isNew: true, keywords: "", propertyCategory: "",
      propertyType: "", propertySubtype: "", developerType: "", bedrooms: "", bathrooms: "",
      finishingType: "", deliveryType: "Off-plan", deliveryDate: "", grossAreaRange: "",
      priceRange: "", paymentPlansCount: 0, offersCount: 0, listed: false,
    }, ...prev])
    setOfferingImages((prev) => ({ ...prev, [id]: [] }))
    setOfferingFloorPlans((prev) => ({ ...prev, [id]: [] }))
    setEditingOfferingIds((prev) => new Set(prev).add(id))
    setExpandedOfferingIds((prev) => new Set(prev).add(id))
  }

  const toggleExpandOffering = (id: number) =>
    setExpandedOfferingIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const setOfferingListed = (id: number, val: boolean) => {
    setOfferings((prev) => prev.map((o) => {
      if (o.id !== id) return o
      // Title/description are auto-generated at ingestion (drafts never author them).
      const autoName = o.offeringName || [o.propertyType || o.propertyCategory || "Property", o.bedrooms && `${o.bedrooms}BR`].filter(Boolean).join(" · ")
      const autoKeywords = o.keywords || [o.propertyCategory, o.finishingType, o.grossAreaRange].filter(Boolean).join(", ")
      return { ...o, listed: val, listingStatus: o.listingStatus ?? "Active", offeringName: val ? autoName : o.offeringName, keywords: val ? autoKeywords : o.keywords }
    }))
    if (val) setEditingOfferingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // Listing flow: validate mandatory → confirm dialog → loading toast → reveal id/title/dates.
  const [listingOfferingId, setListingOfferingId] = useState<number | null>(null)
  const handleListClick = (id: number) => {
    const o = offerings.find((x) => x.id === id)
    if (!o) return
    if (offeringMissingMandatory(o).length > 0) { toast.error("Fill all mandatory fields before listing this offering."); return }
    setListingOfferingId(id)
  }
  const confirmList = () => {
    const id = listingOfferingId
    setListingOfferingId(null)
    if (id === null) return
    const t = toast.loading("Listing property…")
    setTimeout(() => { setOfferingListed(id, true); toast.success("Property listed", { id: t }) }, 900)
  }

  const addMediaFiles = (offeringId: number, type: "image" | "floorplan", files: FileList) => {
    const newItems: MediaItem[] = Array.from(files).map((f) => ({
      id: `${type}-${Date.now()}-${f.name}`,
      url: URL.createObjectURL(f),
      name: f.name,
      type,
    }))
    if (type === "image") {
      setOfferingImages((prev) => ({ ...prev, [offeringId]: [...(prev[offeringId] ?? []), ...newItems] }))
    } else {
      setOfferingFloorPlans((prev) => ({ ...prev, [offeringId]: [...(prev[offeringId] ?? []), ...newItems] }))
    }
  }

  const removeMedia = (offeringId: number, type: "image" | "floorplan", mediaId: string) => {
    if (type === "image") {
      setOfferingImages((prev) => ({ ...prev, [offeringId]: (prev[offeringId] ?? []).filter((m) => m.id !== mediaId) }))
    } else {
      setOfferingFloorPlans((prev) => ({ ...prev, [offeringId]: (prev[offeringId] ?? []).filter((m) => m.id !== mediaId) }))
    }
  }

  const copyToClipboard = (text: string, key: string = "default") => {
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getApprovalStatusBadge = (status: Launch["approvalStatus"]) => {
    const map: Record<Launch["approvalStatus"], string> = {
      "Approved": "bg-green-100 text-green-700 hover:bg-green-100",
      "Pending Review": "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      "Rejected": "bg-red-100 text-red-700 hover:bg-red-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getIngestionStatusBadge = (status: Launch["ingestionStatus"]) => {
    const map: Record<Launch["ingestionStatus"], string> = {
      "Ingested": "bg-green-100 text-green-700 hover:bg-green-100",
      "Not Ingested": "bg-gray-100 text-gray-600 hover:bg-gray-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getListingStatusBadge = (status: Launch["listingStatus"]) => {
    const map: Record<Launch["listingStatus"], string> = {
      "Active": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      "Hidden": "bg-gray-100 text-gray-600 hover:bg-gray-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getLaunchStatusBadge = (status: Launch["launchStatus"]) => {
    const map: Record<Launch["launchStatus"], string> = {
      "Active": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      "Upcoming": "bg-blue-100 text-blue-700 hover:bg-blue-100",
      "Closed": "bg-purple-100 text-purple-700 hover:bg-purple-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getTypeBadge = (t: Launch["type"]) =>
    <Badge variant="outline">{t}</Badge>

  // Canonical launches timestamp format: "10 Jan 2024, 07:00 AM"
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    const d = new Date(dateString)
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" })
    return `${date}, ${time}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Launches
      </Button>

      {/* Main Details Container — 3 sections split by thin dividers */}
      <Card className="overflow-hidden p-0 gap-0">
        {/* ── Section 1: Main info + actions ── */}
        <div className="flex items-start justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={launch.developer.logo || "/placeholder.svg"}
              alt={launch.developer.name}
              className="h-14 w-14 rounded-lg object-cover bg-secondary flex-shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {/* Phase launches are titled by the PHASE name, not the parent project */}
                <h1 className="truncate text-xl font-bold">
                  {launch.projectLevel === "Phase" && launch.phase ? launch.phase : launch.projectNameEn}
                </h1>
                <Badge variant={launch.projectLevel === "Phase" ? "secondary" : "outline"} className="text-xs">
                  {launch.projectLevel === "Phase" ? "Phase" : "Main Project"}
                </Badge>
                {hasNewAiUpdateDetails(launch) && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-purple-200 bg-purple-50 px-1.5 py-px text-[10px] font-medium text-purple-700">
                    <Bot className="h-2.5 w-2.5" />New AI update
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {/* Developer — clickable */}
                <span className="flex items-center gap-1.5">
                  <a href="#" target="_blank" rel="noreferrer" className="text-sm font-medium text-muted-foreground hover:underline">{launch.developer.name}</a>
                  <span className="text-[10px] text-muted-foreground"><IdCopy value={launch.developer.id} /></span>
                </span>
                {/* Launch ID */}
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wide text-muted-foreground/60">Launch ID:</span> <IdCopy value={launch.id} />
                </span>
                {/* Parent project — matched (link + id) vs unmatched (red tag), phase launches only */}
                {launch.projectLevel === "Phase" && (
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="uppercase tracking-wide text-muted-foreground/60">Parent:</span>
                    {launch.projectId ? (
                      <>
                        <a href="#" target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground hover:underline">{launch.parentProjectId || launch.projectNameEn}</a>
                        <IdCopy value={launch.projectId} />
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-foreground">{launch.parentProjectId || launch.projectNameEn}</span>
                        <span className="inline-flex items-center whitespace-nowrap rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-medium text-red-500">Unmatched Project</span>
                      </>
                    )}
                  </span>
                )}
                {/* New project — a main-project launch with no matched system project */}
                {launch.projectLevel !== "Phase" && !launch.projectId && (
                  <span className="inline-flex items-center whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-medium text-gray-500">New Project</span>
                )}
                {/* Existing project — same as the table column */}
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wide text-muted-foreground/60">Existing Project:</span>
                  {launch.existingProject ? (
                    <>
                      <a href="#" target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground hover:underline">{launch.existingProject.name}</a>
                      <IdCopy value={launch.existingProject.id} />
                    </>
                  ) : (
                    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700">New</span>
                  )}
                </span>
                {/* Area name + id */}
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wide text-muted-foreground/60">Area:</span>
                  <span className="text-xs font-medium text-foreground">{launch.area}</span>
                  <IdCopy value={launch.areaId ?? "AR-000"} />
                </span>
              </div>
            </div>
          </div>

          {/* Actions — same logic as the launches table row */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 bg-transparent">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={ingestionStatus === "Ingested"} className={cn(ingestionStatus === "Ingested" && "opacity-40")}>
                  <ShieldCheck className="h-4 w-4 mr-2" />Approval
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem className="text-emerald-600 focus:text-emerald-700" onClick={() => setHeaderDialog("approve")}>
                    <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setHeaderDialog("reject")}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />Reject
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                disabled={ingestionStatus === "Ingested"}
                className={cn(ingestionStatus === "Ingested" && "opacity-40")}
                onClick={() => setIngestDialog(approvalStatus === "Approved" && completeness === 100 ? "summary" : "incomplete")}
              >
                <Database className="h-4 w-4 mr-2" />Ingest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const next = listingStatus === "Active" ? "Hidden" : "Active"
                setListingStatus(next)
                toast.success(`Listing status set to ${next}`)
              }}>
                {listingStatus === "Active" ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Toggle Listing Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={ingestionStatus === "Ingested"}
                className={cn("text-destructive focus:text-destructive", ingestionStatus === "Ingested" && "opacity-40")}
                onClick={() => setHeaderDialog("archive")}
              >
                <Archive className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Section 2: Statuses (read-only tags — edited via the actions dropdown) + data completeness ── */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {([
              ["Type", getTypeBadge(launchType)],
              ["Approval Status", getApprovalStatusBadge(approvalStatus)],
              ["Ingestion Status", getIngestionStatusBadge(ingestionStatus)],
              ["Listing Status", getListingStatusBadge(listingStatus)],
              ["Launch Status", getLaunchStatusBadge(launchStatus)],
            ] as [string, React.ReactNode][]).map(([label, badge]) => (
              <div key={label}>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                {badge}
              </div>
            ))}
          </div>

          {/* Data completeness — hover to see missing fields */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <p className="mb-1 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Data Completeness</p>
                <div className="flex w-56 items-center gap-2">
                  <Progress value={completeness} className="h-2 flex-1" />
                  <span className={cn("text-xs font-semibold tabular-nums", completeness === 100 ? "text-emerald-600" : "text-muted-foreground")}>{completeness}%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-sm">
              {missingFields.length === 0 ? (
                <p className="text-xs">All mandatory fields complete — ready to ingest.</p>
              ) : (
                <div className="text-xs">
                  <p className="mb-1 font-semibold">Missing fields:</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {missingFields.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── Section 3: Metadata ── */}
        <div className="grid grid-cols-6 gap-6 border-t border-border px-6 py-3">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Source</p>
            <Badge variant="outline">{launch.source}</Badge>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sent At</p>
            <p className="text-xs text-foreground">{formatDate(launch.sentAt ?? null)}</p>
          </div>
          {launch.source === "WhatsApp" && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">AI Updates</p>
              <p className="text-xs text-foreground">
                {launch.aiUpdates ? `${launch.aiUpdates.count} update${launch.aiUpdates.count === 1 ? "" : "s"}, ${formatDate(launch.aiUpdates.lastAt)}` : "—"}
              </p>
            </div>
          )}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Created At</p>
            <p className="text-xs text-foreground">{formatDate(launch.createdAt)}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Updated At</p>
            <p className="text-xs text-foreground">{formatDate(launch.updatedAt)}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Ingested At</p>
            <p className="text-xs text-foreground">{formatDate(launch.ingestedAt ?? null)}</p>
          </div>
        </div>
      </Card>

      {/* Header action dialogs — summary + confirm (same logic as the launches table row) */}
      {headerDialog && (
        <Dialog open onOpenChange={(v) => { if (!v) { setHeaderDialog(null); setHeaderReason("") } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {headerDialog === "approve" ? "Approve Launch" : headerDialog === "reject" ? "Reject Launch" : "Archive Launch"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                {([["Developer", launch.developer.name], ["Area", launch.area], ["Project", launch.projectNameEn], ...(launch.phase ? [["Phase", launch.phase]] : [])] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {headerDialog === "approve" && "Approving this launch means this launch can be ingested in the database and appears across Nawy's system accordingly."}
                {headerDialog === "reject" && "Rejecting this launch means this launch will not get ingested in the database and will not appear across Nawy's system accordingly."}
                {headerDialog === "archive" && "Archiving removes this launch from all launch views."}
              </p>
              {(headerDialog === "reject" || headerDialog === "archive") && (
                <div className="space-y-1.5">
                  <Label>{headerDialog === "reject" ? "Reason for rejection" : "Reason for archiving"} <span className="text-red-500">*</span></Label>
                  <Textarea value={headerReason} onChange={(e) => setHeaderReason(e.target.value)} rows={3} placeholder={headerDialog === "reject" ? "Why is this launch being rejected?" : "Why is this launch being archived?"} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="bg-transparent" onClick={() => { setHeaderDialog(null); setHeaderReason("") }}>Cancel</Button>
              <Button
                className={headerDialog === "approve" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"}
                disabled={headerDialog !== "approve" && !headerReason.trim()}
                onClick={() => {
                  if (headerDialog === "approve") { setApprovalStatus("Approved"); toast.success("Launch approved") }
                  if (headerDialog === "reject") { setApprovalStatus("Rejected"); toast.success("Launch rejected") }
                  if (headerDialog === "archive") { toast.success("Launch archived"); onBack() }
                  setHeaderDialog(null); setHeaderReason("")
                }}
              >
                {headerDialog === "approve" ? "Approve" : headerDialog === "reject" ? "Reject" : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ingestion — incomplete data popup */}
      <AlertDialog open={ingestDialog === "incomplete"} onOpenChange={(o) => !o && setIngestDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot ingest this launch</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  {approvalStatus !== "Approved"
                    ? "This launch must be approved before it can be ingested."
                    : "The data is not 100% complete. Check the mandatory fields to ingest this launch."}
                </p>
                {missingFields.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                    {missingFields.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIngestDialog(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ingestion — launch ingestion summary */}
      <Dialog open={ingestDialog === "summary"} onOpenChange={(o) => { if (!o) setIngestDialog(null) }}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Launch Ingestion Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cover image */}
            <img
              src={launch.coverImage || "/placeholder.svg"}
              alt={launch.projectNameEn}
              className="h-36 w-full rounded-lg border border-border bg-secondary object-cover"
            />

            {launch.existingProject && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  This launch was created before — it matches the existing project{" "}
                  <span className="font-semibold">{launch.existingProject.name}</span> ({launch.existingProject.id}).
                  Ingesting will update that project rather than create a new one.
                </p>
              </div>
            )}

            {/* Project details */}
            <div className="rounded-lg border border-border">
              <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Details</p>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                <div><p className="text-[10px] uppercase text-muted-foreground">Developer</p><p className="font-medium">{launch.developer.name}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">{launch.projectLevel === "Phase" ? "Phase" : "Project"}</p><p className="font-medium">{launch.projectLevel === "Phase" && launch.phase ? launch.phase : launch.projectNameEn}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Area</p><p className="font-medium">{launch.area}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Level</p><p className="font-medium">{launch.projectLevel}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Listing Status</p>{getListingStatusBadge(listingStatus)}</div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Type</p><p className="font-medium">{launchFormType}</p></div>
              </div>
            </div>

            {/* Launch details */}
            <div className="rounded-lg border border-border">
              <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Launch Details</p>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                <div><p className="text-[10px] uppercase text-muted-foreground">General EOI</p><p className="font-medium">{eoiOverallAmount ? `${eoiOverallAmount} ${eoiCurrency}` : "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Start Date</p><p className="font-medium">{launchStartDate || "—"}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">End Date</p><p className="font-medium">{launchEndDate || "—"}</p></div>
                <div className="col-span-3">
                  <p className="text-[10px] uppercase text-muted-foreground">EOI by Property Type</p>
                  <p className="font-medium">
                    {eoiByType.filter((e) => e.name && e.amount).length > 0
                      ? eoiByType.filter((e) => e.name && e.amount).map((e) => `${e.name}: ${e.amount} ${eoiCurrency}`).join(" · ")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment plans — type, downpayment and duration per plan */}
            <div className="rounded-lg border border-border">
              <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Plans ({plans.length})</p>
              <div className="divide-y divide-border">
                {plans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.planType} · DP {p.dp} · {p.duration}</span>
                  </div>
                ))}
                {plans.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No payment plans</p>}
              </div>
            </div>

            {/* Property offerings */}
            <div className="rounded-lg border border-border">
              <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property Offerings ({offerings.length})</p>
              <div className="divide-y divide-border">
                {offerings.map((o, i) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-medium">{o.offeringName || `Offering ${i + 1}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {[o.propertyType, o.grossAreaRange, o.priceRange && `${o.priceRange} EGP`].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                ))}
                {offerings.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No property offerings</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIngestDialog(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setIngestionStatus("Ingested")
                setIngestDialog(null)
                toast.success("Launch ingested — now live across Nawy's system")
              }}
            >
              <Database className="h-4 w-4 mr-1.5" />Ingest Launch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabbed Container */}
      <Tabs defaultValue={launch.source === "WhatsApp" ? "whatsapp" : "project"} className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-0.5">
          {launch.source === "WhatsApp" && (
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-card">WhatsApp Messages</TabsTrigger>
          )}
          <TabsTrigger value="project" className="data-[state=active]:bg-card">Project Details</TabsTrigger>
          <TabsTrigger value="launch-info" className="data-[state=active]:bg-card">Launch Details</TabsTrigger>
          <TabsTrigger value="incentives" className="data-[state=active]:bg-card">Launch Incentives</TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-card">Payment Plans</TabsTrigger>
          <TabsTrigger value="offerings" className="data-[state=active]:bg-card">Property Offerings</TabsTrigger>
          <TabsTrigger value="attachments" className="data-[state=active]:bg-card">Attachments</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-card">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Project Details Tab */}
        <TabsContent value="project">
          <Card className="p-6">
            {/* Header: title + view/edit controls (locked once approved + ingested) */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Project Details</h3>
              {approvalStatus === "Approved" && ingestionStatus === "Ingested" ? (
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" title="Edit Project details" asChild>
                  <a href="#" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              ) : projectEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setProjectEditing(false)}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancel
                  </Button>
                  <Button size="sm" className="h-8" onClick={() => { setProjectEditing(false); toast.success("Project details saved") }}>
                    <Save className="h-3.5 w-3.5 mr-1" />Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setProjectEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              )}
            </div>

            <fieldset
              disabled={!projectEditing || (approvalStatus === "Approved" && ingestionStatus === "Ingested")}
              className={cn(approvalStatus === "Approved" && ingestionStatus === "Ingested" && "opacity-60")}
            >
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

              {/* Developer — searchable dropdown */}
              <div>
                <Label>Developer</Label>
                <SearchableDropdown
                  options={mockDevelopers}
                  value={selectedDeveloper}
                  onChange={setSelectedDeveloper}
                  placeholder="Select developer..."
                />
              </div>

              {/* Area — searchable dropdown */}
              <div>
                <Label>Area</Label>
                <SearchableDropdown
                  options={mockAreas}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Select area..."
                />
              </div>

              {/* Project Level */}
              <div>
                <Label>Project Level</Label>
                <Select value={projectLevel} onValueChange={(v) => setProjectLevel(v as "Phase" | "Main Project")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phase">Phase</SelectItem>
                    <SelectItem value="Main Project">Main Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer to keep grid aligned */}
              <div />

              {projectLevel === "Phase" ? (
                <>
                  <div className="col-span-2">
                    <Label>Project Name</Label>
                    <SearchableDropdown
                      options={mockProjects}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      placeholder="Select project..."
                    />
                  </div>
                  <div>
                    <Label>Phase Name (EN)</Label>
                    <Input value={phaseNameEn} onChange={(e) => setPhaseNameEn(e.target.value)} placeholder="e.g. Phase 1" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phase Name (AR)</Label>
                    <Input value={phaseNameAr} onChange={(e) => setPhaseNameAr(e.target.value)} placeholder="مثال: المرحلة الأولى" className="mt-1" dir="rtl" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Project Name (EN)</Label>
                    <Input value={projectNameEn} onChange={(e) => setProjectNameEn(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Project Name (AR)</Label>
                    <Input value={projectNameAr} onChange={(e) => setProjectNameAr(e.target.value)} className="mt-1" dir="rtl" />
                  </div>
                </>
              )}

              {/* Project Area — numeric value + unit dropdown */}
              <div>
                <Label>Project Area</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={projectAreaValue}
                    onChange={(e) => setProjectAreaValue(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="e.g. 500"
                    inputMode="decimal"
                    className="flex-1"
                  />
                  <Select value={projectAreaUnit} onValueChange={setProjectAreaUnit}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREA_UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Spacer */}
              <div />

              {/* Total Units Released */}
              <div>
                <Label>Total Units Released</Label>
                <Input value={totalUnitsReleased} onChange={(e) => setTotalUnitsReleased(e.target.value)} placeholder="e.g. 248" className="mt-1" type="number" />
              </div>

              {/* Total Buildings Released */}
              <div>
                <Label>Total Buildings Released</Label>
                <Input value={totalBuildingsReleased} onChange={(e) => setTotalBuildingsReleased(e.target.value)} placeholder="e.g. 12" className="mt-1" type="number" />
              </div>

              {/* Property Released — one row per property type, no duplicate types */}
              <div className="col-span-2 border-t border-border pt-5">
                <Label className="mb-2 block">Property Released</Label>
                <div className="space-y-2">
                  {propertyReleased.map((row) => (
                    <div key={row.id} className="flex items-end gap-3">
                      <div className="flex-1">
                        <p className="mb-1 text-xs text-muted-foreground">Property Type</p>
                        <Select value={row.type || undefined} onValueChange={(v) => setPropertyReleased((prev) => prev.map((r) => (r.id === row.id ? { ...r, type: v } : r)))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select type…" /></SelectTrigger>
                          <SelectContent>
                            {PROPERTY_TYPE_OPTIONS.map((pt) => (
                              <SelectItem
                                key={pt}
                                value={pt}
                                disabled={propertyReleased.some((r) => r.id !== row.id && r.type === pt)}
                              >
                                {pt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36">
                        <p className="mb-1 text-xs text-muted-foreground">Count</p>
                        <Input
                          type="number"
                          min={0}
                          value={row.count}
                          onChange={(e) => setPropertyReleased((prev) => prev.map((r) => (r.id === row.id ? { ...r, count: e.target.value } : r)))}
                          placeholder="e.g. 40"
                          className="h-9"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPropertyReleased((prev) => prev.filter((r) => r.id !== row.id))}
                        className="mb-2 text-muted-foreground transition-colors hover:text-destructive"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPropertyReleased((prev) => [...prev, { id: `pr${prev.length + 1}-${prev.map((r) => r.id).join("").length}`, type: "", count: "" }])}
                    disabled={propertyReleased.length >= PROPERTY_TYPE_OPTIONS.length}
                    className="mt-1 flex items-center gap-1 text-sm text-primary hover:opacity-80 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Property Type
                  </button>
                </div>
              </div>
            </div>
            </fieldset>
          </Card>
        </TabsContent>

        {/* Property Offerings Tab */}
        <TabsContent value="offerings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{offerings.length} offering{offerings.length !== 1 ? "s" : ""} · {offerings.filter((o) => o.listed).length} listed</p>
              <Button size="sm" onClick={addOffering}>
                <Plus className="h-4 w-4 mr-2" />
                Add Offering
              </Button>
            </div>

            {offerings.map((offering) => (
              <LaunchOfferingCard
                key={offering.id}
                offering={offering}
                launch={launch}
                launchIngested={ingestionStatus === "Ingested"}
                editing={editingOfferingIds.has(offering.id)}
                expanded={expandedOfferingIds.has(offering.id)}
                images={offeringImages[offering.id] ?? []}
                floorPlans={offeringFloorPlans[offering.id] ?? []}
                onUpdate={(f, v) => updateOffering(offering.id, f, v)}
                onToggleEdit={() => toggleEditOffering(offering.id)}
                onToggleExpand={() => toggleExpandOffering(offering.id)}
                onDelete={() => setDeletingOfferingId(offering.id)}
                onListClick={() => handleListClick(offering.id)}
                onAddMedia={(t, files) => addMediaFiles(offering.id, t, files)}
                onRemoveMedia={(t, id) => removeMedia(offering.id, t, id)}
                onReorderImages={(items) => setOfferingImages((prev) => ({ ...prev, [offering.id]: items }))}
                onReorderFloorPlans={(items) => setOfferingFloorPlans((prev) => ({ ...prev, [offering.id]: items }))}
                linkedPlansCount={offeringPlanIds[offering.id]?.length ?? 0}
                onViewPlans={() => setViewPlansOffering(offering)}
                onLinkPlans={() => setLinkPlansOffering(offering)}
              />
            ))}
          </div>

          {/* Add Offering Dialog */}
          <Dialog open={showAddOffering} onOpenChange={setShowAddOffering}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Offering</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1">
                  <Label>Offering Name</Label>
                  <Input value={newOffering.offeringName} onChange={(e) => setNewOffering((p) => ({ ...p, offeringName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Category</Label>
                  <Input value={newOffering.propertyCategory} onChange={(e) => setNewOffering((p) => ({ ...p, propertyCategory: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Type</Label>
                  <Input value={newOffering.propertyType} onChange={(e) => setNewOffering((p) => ({ ...p, propertyType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Sub-type</Label>
                  <Input value={newOffering.propertySubtype} onChange={(e) => setNewOffering((p) => ({ ...p, propertySubtype: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Developer Type</Label>
                  <Input value={newOffering.developerType} onChange={(e) => setNewOffering((p) => ({ ...p, developerType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Bedrooms</Label>
                  <Input value={newOffering.bedrooms} onChange={(e) => setNewOffering((p) => ({ ...p, bedrooms: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Bathrooms</Label>
                  <Input value={newOffering.bathrooms} onChange={(e) => setNewOffering((p) => ({ ...p, bathrooms: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Finishing Type</Label>
                  <Input value={newOffering.finishingType} onChange={(e) => setNewOffering((p) => ({ ...p, finishingType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Delivery Type</Label>
                  <Input value={newOffering.deliveryType} onChange={(e) => setNewOffering((p) => ({ ...p, deliveryType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Delivery Date</Label>
                  <Input value={newOffering.deliveryDate} onChange={(e) => setNewOffering((p) => ({ ...p, deliveryDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Gross Area Range</Label>
                  <Input value={newOffering.grossAreaRange} onChange={(e) => setNewOffering((p) => ({ ...p, grossAreaRange: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Price Range</Label>
                  <Input value={newOffering.priceRange} onChange={(e) => setNewOffering((p) => ({ ...p, priceRange: e.target.value }))} />
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button variant="outline" onClick={() => setShowAddOffering(false)}>Cancel</Button>
                <Button onClick={addOffering}>Add Offering</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={deletingOfferingId !== null} onOpenChange={(o) => !o && setDeletingOfferingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Offering</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this offering? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* List confirmation */}
          <AlertDialog open={listingOfferingId !== null} onOpenChange={(o) => !o && setListingOfferingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>List this property?</AlertDialogTitle>
                <AlertDialogDescription>
                  Listing publishes this offering and assigns it a Property ID, Metadata ID, title, description and timestamps. You can unlist it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmList}>List property</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* View linked payment plans — read-only drawer (prices + linked plan cards) */}
          <Sheet open={!!viewPlansOffering} onOpenChange={(o) => { if (!o) setViewPlansOffering(null) }}>
            <SheetContent side="right" className="flex w-[520px] max-w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="text-base">Payment Plans — {viewPlansOffering?.offeringName || "Draft offering"}</SheetTitle>
                <p className="text-xs text-muted-foreground">Read-only view of the prices and payment plans linked to this property.</p>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[15px] font-bold tabular-nums text-foreground">
                    {viewPlansOffering?.priceRange ? `${viewPlansOffering.priceRange} EGP` : "—"}
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Range price</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {(viewPlansOffering ? (offeringPlanIds[viewPlansOffering.id] ?? []) : []).length} linked
                  </span>
                </div>
                {viewPlansOffering && plans.filter((p) => (offeringPlanIds[viewPlansOffering.id] ?? []).includes(p.id)).map((plan) => (
                  <LinkedPlanCard
                    key={plan.id}
                    plan={plan}
                    readOnly
                    hideFooter
                    fullWidth
                    isExpanded={false}
                    onToggleExpand={() => {}}
                    totalInGroup={(offeringPlanIds[viewPlansOffering.id] ?? []).length}
                  />
                ))}
                {viewPlansOffering && (offeringPlanIds[viewPlansOffering.id] ?? []).length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">No payment plans linked to this property yet.</p>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Link payment plans — linked at the top (unlink), unlinked below (link) */}
          <Sheet open={!!linkPlansOffering} onOpenChange={(o) => { if (!o) setLinkPlansOffering(null) }}>
            <SheetContent side="right" className="flex w-[520px] max-w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="text-base">Link Payment Plans — {linkPlansOffering?.offeringName || "Draft offering"}</SheetTitle>
                <p className="text-xs text-muted-foreground">Link or unlink this launch's payment plans for this property.</p>
              </SheetHeader>
              {linkPlansOffering && (() => {
                const linkedIds = offeringPlanIds[linkPlansOffering.id] ?? []
                const linked = plans.filter((p) => linkedIds.includes(p.id))
                const available = plans.filter((p) => !linkedIds.includes(p.id))
                return (
                  <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    {/* Linked — real plan cards with the native unlink action */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked ({linked.length})</p>
                      <div className="space-y-2.5">
                        {linked.map((p) => (
                          <LinkedPlanCard
                            key={p.id}
                            plan={p}
                            hideFooter
                            fullWidth
                            isExpanded={false}
                            onToggleExpand={() => {}}
                            totalInGroup={linked.length}
                            onRemove={() => {
                              setOfferingPlanIds((prev) => ({ ...prev, [linkPlansOffering.id]: (prev[linkPlansOffering.id] ?? []).filter((id) => id !== p.id) }))
                              toast.success(`${p.name} unlinked`)
                            }}
                          />
                        ))}
                        {linked.length === 0 && <p className="text-sm text-muted-foreground">No plans linked yet.</p>}
                      </div>
                    </div>
                    {/* Available — real plan cards with a Link CTA */}
                    <div className="border-t border-border pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available to link ({available.length})</p>
                      <div className="space-y-4">
                        {available.map((p) => (
                          <div key={p.id} className="space-y-1.5">
                            <LinkedPlanCard
                              plan={p}
                              readOnly
                              hideFooter
                              fullWidth
                              isExpanded={false}
                              onToggleExpand={() => {}}
                              totalInGroup={available.length}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-full bg-transparent"
                              onClick={() => {
                                setOfferingPlanIds((prev) => ({ ...prev, [linkPlansOffering.id]: [...(prev[linkPlansOffering.id] ?? []), p.id] }))
                                toast.success(`${p.name} linked`)
                              }}
                            >
                              <Link2 className="h-3 w-3 mr-1.5" />Link to property
                            </Button>
                          </div>
                        ))}
                        {available.length === 0 && <p className="text-sm text-muted-foreground">All launch payment plans are linked.</p>}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* Payment Plans Tab */}
        <TabsContent value="payment">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Payment Plans</h3>
                <p className="text-xs text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
              </div>
              <Button size="sm" onClick={() => { setEditingPlan(null); setPlanDrawerOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Plan
              </Button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {plans.map((plan) => {
                // Launch-only status: Ingested (green) when the launch itself is ingested,
                // Draft (yellow) otherwise — a not-ingested launch has ALL plans as drafts.
                const planIngested = ingestionStatus === "Ingested" && plan.status === "Active"
                return (
                  <LinkedPlanCard
                    key={plan.id}
                    plan={plan}
                    isExpanded={expandedPlanId === plan.id}
                    onToggleExpand={() => setExpandedPlanId((id) => (id === plan.id ? null : plan.id))}
                    totalInGroup={plans.length}
                    fullWidth
                    hideFooter
                    statusTag={planIngested
                      ? <span className="text-[9px] font-semibold text-emerald-600 bg-[#EDFAF4] border border-[#A7F3D0] px-1.5 py-px rounded-full">● Ingested</span>
                      : <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-px rounded-full">● Draft</span>}
                    onView={() => setDetailsPlan(plan)}
                    onRemove={() => setDeletingPlanId(plan.id)}
                  />
                )
              })}
              {plans.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No payment plans yet — click "Create New Plan".</p>
              )}
            </div>
          </Card>

          {/* View drawer (read-only) with Edit at the bottom — same as grouped property details */}
          <PaymentPlanDetailsDrawer
            plan={detailsPlan}
            onClose={() => setDetailsPlan(null)}
            onEdit={() => { setEditingPlan(detailsPlan); setDetailsPlan(null); setPlanDrawerOpen(true) }}
          />

          <PaymentPlanDrawer
            open={planDrawerOpen}
            onClose={() => { setPlanDrawerOpen(false); setEditingPlan(null) }}
            title={editingPlan ? "Edit Payment Plan" : "Add Payment Plan"}
            submitLabel={editingPlan ? "Save Changes" : "Save Plan"}
            onSave={(saved) => {
              if (editingPlan) setPlans((ps) => ps.map((p) => (p.id === editingPlan.id ? { ...saved, id: p.id } : p)))
              else setPlans((ps) => [...ps, saved])
            }}
          />

          <AlertDialog open={deletingPlanId !== null} onOpenChange={(o) => !o && setDeletingPlanId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Payment Plan</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete this payment plan? This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setPlans((ps) => ps.filter((p) => p.id !== deletingPlanId)); setDeletingPlanId(null) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Launch Details Tab */}
        <TabsContent value="launch-info">
          <Card className="p-6 space-y-8">

            {/* Header: view state → Edit → Save/Cancel (confirm only when the launch is already ingested) */}
            <div className="-mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Launch Details</h3>
              {launchEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => { setLaunchEditing(false); setLaunchDirty(false) }}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (ingestionStatus === "Ingested" && launchDirty) { setLaunchSaveConfirm(true); return }
                      setLaunchEditing(false)
                      setLaunchDirty(false)
                      toast.success("Launch details saved")
                    }}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setLaunchEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              )}
            </div>

            <fieldset disabled={!launchEditing} className="min-w-0 space-y-8">
            {/* Launch Type + Dates */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Launch Info</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Launch Type</Label>
                  <Select value={launchFormType} onValueChange={(v) => { setLaunchDirty(true); setLaunchFormType(v as "Launch" | "Release") }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Launch">Launch</SelectItem>
                      <SelectItem value="Release">Release</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Launch Start Date</Label>
                  <Input type="date" value={launchStartDate} onChange={(e) => { setLaunchDirty(true); setLaunchStartDate(e.target.value) }} className="mt-1" />
                </div>
                <div>
                  <Label>Launch End Date</Label>
                  <Input type="date" value={launchEndDate} onChange={(e) => { setLaunchDirty(true); setLaunchEndDate(e.target.value) }} className="mt-1" />
                </div>
              </div>
            </div>

            {/* EOI — General + by property type visible together */}
            <div className="pt-6 border-t border-border">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Expression of Interest (EOI)</h3>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <Select value={eoiCurrency} onValueChange={(v) => { setLaunchDirty(true); setEoiCurrency(v) }}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["EGP", "USD", "EUR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-5">
                {/* General EOI */}
                <div className="max-w-xs">
                  <Label>General EOI ({eoiCurrency})</Label>
                  <Input
                    value={eoiOverallAmount}
                    onChange={(e) => { setLaunchDirty(true); setEoiOverallAmount(fmtInt(e.target.value)) }}
                    placeholder="e.g. 50,000"
                    inputMode="numeric"
                    className={cn("mt-1", eoiErr(eoiOverallAmount) && "border-red-400 focus-visible:ring-red-300 focus-visible:border-red-400")}
                  />
                  {eoiErr(eoiOverallAmount) && <p className="mt-1 text-[11px] text-red-500">{eoiErr(eoiOverallAmount)}</p>}
                </div>

                {/* EOI by Property Type */}
                <div>
                  <Label className="mb-2 block">EOI by Property Type ({eoiCurrency})</Label>
                  <div className="space-y-2">
                    {eoiByType.map((entry) => {
                      const err = eoiErr(entry.amount)
                      return (
                        <div key={entry.id} className="flex items-start gap-3">
                          <div className="flex-1">
                            <Input value={entry.name} onChange={(e) => { setLaunchDirty(true); updateEoiByType(entry.id, "name", e.target.value) }} placeholder="e.g. Apartments" className="h-9" />
                          </div>
                          <div className="w-44">
                            <Input
                              value={entry.amount}
                              onChange={(e) => { setLaunchDirty(true); updateEoiByType(entry.id, "amount", fmtInt(e.target.value)) }}
                              placeholder="50,000"
                              inputMode="numeric"
                              className={cn("h-9", err && "border-red-400 focus-visible:ring-red-300 focus-visible:border-red-400")}
                            />
                            {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
                          </div>
                          <button type="button" onClick={() => { setLaunchDirty(true); removeEoiByType(entry.id) }} className="mt-2.5 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                    <button type="button" onClick={() => { setLaunchDirty(true); addEoiByType() }} className="flex items-center gap-1 text-sm text-primary hover:opacity-80 mt-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Property Type
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">All EOI amounts must be positive integers of at least 5 digits — commas are added automatically (e.g. 250,000 · 10,000).</p>
              </div>
            </div>

            {/* EOI Payment Methods */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">EOI Payment Methods Allowed</h3>
              <div className="flex flex-wrap gap-6">
                {[
                  { id: "cheque", label: "Cheque", value: paymentMethodCheque, setter: setPaymentMethodCheque },
                  { id: "online", label: "Online", value: paymentMethodOnline, setter: setPaymentMethodOnline },
                  { id: "cash", label: "Cash", value: paymentMethodCash, setter: setPaymentMethodCash },
                  { id: "bank", label: "Bank Transfer", value: paymentMethodBankTransfer, setter: setPaymentMethodBankTransfer },
                ].map(({ id, label, value, setter }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Switch id={id} checked={value} onCheckedChange={(v) => { setLaunchDirty(true); setter(v) }} />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Refundability */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Refundability</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch id="refundable" checked={isRefundable} onCheckedChange={(v) => { setLaunchDirty(true); setIsRefundable(v) }} />
                  <Label htmlFor="refundable">Refundable</Label>
                </div>
                {isRefundable && (
                  <div className="ml-0 pl-4 border-l-2 border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setLaunchDirty(true); setRefundType("full") }}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${refundType === "full" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                      >
                        Full Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLaunchDirty(true); setRefundType("partial") }}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${refundType === "partial" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                      >
                        Partial Refund
                      </button>
                    </div>
                    {refundType === "partial" && (
                      <div className="flex items-end gap-3 max-w-sm">
                        <div className="flex-1">
                          <Label className="text-xs">Partial Refund Value</Label>
                          <Input value={partialRefundValue} onChange={(e) => { setLaunchDirty(true); setPartialRefundValue(e.target.value) }} placeholder="e.g. 50" className="mt-1 h-9" />
                        </div>
                        <Select value={partialRefundType} onValueChange={(v) => { setLaunchDirty(true); setPartialRefundType(v as "amount" | "percentage") }}>
                          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="amount">Amount (EGP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Taskeen Days — multiple days, each with date, types and address */}
            <div className="pt-6 border-t border-border">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Taskeen Days</h3>
                <button
                  type="button"
                  onClick={() => { setLaunchDirty(true); setTaskeenDays((prev) => [...prev, { id: `td${prev.length + 1}-${prev.map((d) => d.id).join("").length}`, date: "", types: [], address: "" }]) }}
                  className="flex items-center gap-1 text-sm text-primary hover:opacity-80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Day
                </button>
              </div>
              <div className="space-y-3">
                {taskeenDays.map((day, i) => (
                  <div key={day.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Day {i + 1}</p>
                      {taskeenDays.length > 1 && (
                        <button type="button" onClick={() => { setLaunchDirty(true); setTaskeenDays((prev) => prev.filter((d) => d.id !== day.id)) }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input type="date" value={day.date} onChange={(e) => { setLaunchDirty(true); setTaskeenDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, date: e.target.value } : d))) }} className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs">Types</Label>
                        <div className="mt-1">
                          <FilterMultiSelect
                            label="Types"
                            options={TASKEEN_TYPE_OPTIONS}
                            value={day.types}
                            onChange={(v) => { setLaunchDirty(true); setTaskeenDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, types: v } : d))) }}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Address</Label>
                        <Input value={day.address} onChange={(e) => { setLaunchDirty(true); setTaskeenDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, address: e.target.value } : d))) }} placeholder="e.g. Sales Center, 6th October" className="mt-1 h-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </fieldset>
          </Card>

          {/* Save confirmation — only when fields changed on an already-ingested launch */}
          <AlertDialog open={launchSaveConfirm} onOpenChange={(o) => !o && setLaunchSaveConfirm(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change launch details?</AlertDialogTitle>
                <AlertDialogDescription>
                  This Launch already ingested and {launchStatus.toLowerCase()}. Are you sure you want to change these launch details?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setLaunchSaveConfirm(false); setLaunchEditing(false); setLaunchDirty(false); toast.success("Launch details saved") }}>
                  Save Changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Incentives Tab */}
        <TabsContent value="incentives">
          <Card className="p-6 space-y-8">

            {/* Header: view state → Edit → Save/Cancel (confirm only when the launch is already ingested) */}
            <div className="-mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Launch Incentives</h3>
              {incentivesEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setIncentivesEditing(false)}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (ingestionStatus === "Ingested") { setIncentivesSaveConfirm(true); return }
                      setIncentivesEditing(false)
                      toast.success("Launch incentives saved")
                    }}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setIncentivesEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              )}
            </div>

            <fieldset disabled={!incentivesEditing} className="min-w-0 space-y-8">
            {/* Brokerage / Agent Incentives */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Brokerage / Agent Incentives</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Commission</Label>
                  <div className="flex items-end gap-3 max-w-sm">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                      <Input
                        value={commissionValue}
                        onChange={(e) => setCommissionValue(e.target.value)}
                        placeholder={commissionType === "percentage" ? "e.g. 3" : "e.g. 50,000"}
                        className="h-9"
                      />
                    </div>
                    <Select value={commissionType} onValueChange={(v) => setCommissionType(v as "percentage" | "amount")}>
                      <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="amount">Amount (EGP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Additional Broker / Agent Incentive Notes</Label>
                  <Textarea
                    value={brokerNotes}
                    onChange={(e) => setBrokerNotes(e.target.value)}
                    placeholder="Any additional incentives, bonuses, or conditions for agents..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Contact Info</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1 text-sm text-primary hover:opacity-80 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Contact
                </button>
              </div>
              <div className="space-y-3">
                {contacts.map((contact, idx) => (
                  <div key={contact.id} className="flex items-end gap-3">
                    <div className="w-6 text-xs text-muted-foreground pb-2 text-center">{idx + 1}</div>
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs mb-1 block">Name</Label>}
                      <Input
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                        placeholder="Contact name"
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs mb-1 block">Phone Number</Label>}
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                        placeholder="+20 100 000 0000"
                        className="h-9"
                        type="tel"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="pb-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No contacts added yet.</p>
                )}
              </div>
            </div>
            </fieldset>
          </Card>

          {/* Save confirmation — only when the launch is already ingested */}
          <AlertDialog open={incentivesSaveConfirm} onOpenChange={(o) => !o && setIncentivesSaveConfirm(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change launch incentives?</AlertDialogTitle>
                <AlertDialogDescription>
                  This Launch already ingested and {launchStatus.toLowerCase()}. Are you sure you want to change these launch incentives?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setIncentivesSaveConfirm(false); setIncentivesEditing(false); toast.success("Launch incentives saved") }}>
                  Save Changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* WhatsApp Message Tab — hidden entirely for manually-created launches */}
        {launch.source === "WhatsApp" && (
        <TabsContent value="whatsapp">
          <Card className="p-6">
              <div className="space-y-4">
                {/* Group header: profile image + clickable name + group id caption */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <img
                    src="/placeholder.svg?height=40&width=40"
                    alt="Group"
                    className="h-10 w-10 flex-shrink-0 rounded-full bg-secondary object-cover"
                  />
                  <div className="min-w-0">
                    <a href="#" target="_blank" rel="noreferrer" className="block w-fit truncate text-sm font-medium hover:underline">
                      Palm Hills — Developer Updates
                    </a>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      Group ID: <IdCopy value="WAG-0421" />
                    </span>
                  </div>
                  <MessageSquare className="ml-auto h-5 w-5 flex-shrink-0 text-green-500" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Ahmed Hassan</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(launch.sentAt)}</span>
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {`New Launch Alert!

Palm Hills Development announces the launch of Palm Hills October - Phase 3

Location: 6th of October
Property Types: Apartments, Villas, Townhouses
Starting Price: 4.5M EGP
Launch Date: January 15, 2024

Payment Plans:
- 10% Down Payment
- Up to 8 Years Installments

Contact us for more details!`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Media Attachments</p>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
          </Card>
        </TabsContent>
        )}

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Audit Logs — coming soon</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                A full activity timeline of every change on this launch (who, what and when) is on its way.
              </p>
            </div>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Coming soon</span>
          </div>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Attachments — coming soon</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Uploading and managing launch media &amp; documents (brochures, masterplans, price lists) will live here.
              </p>
            </div>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Coming soon</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

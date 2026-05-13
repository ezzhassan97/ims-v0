"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowUpDown,
  Baby,
  Bell,
  Bus,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Dumbbell,
  Edit,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  FileText,
  Film,
  Filter,
  Flame,
  GripVertical,
  Group,
  Heart,
  Home,
  Lock,
  Plus,
  Search,
  Shield,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Target,
  Thermometer,
  Trash2,
  Unlock,
  Upload,
  Waves,
  Wind,
  Wrench,
  MoreHorizontal,
  X,
  ZoomIn,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { initialUnits, projectPhases, type Unit } from "@/lib/mock-data"
import { GroupedPropertiesView } from "@/components/grouped-properties-page"

// ── Types ──────────────────────────────────────────────────────────────────────
type Availability = "Available" | "Hold" | "Sold-Off" | "Archived"
type ListingStatus = "Active" | "Hidden"
type SaleType = "Launch" | "Primary" | "Resale" | "Nawy Now" | "Rental" | "Financing"
type EntryType = "Automatic" | "Manual"

interface PropertyRow {
  propertyId: string
  detailedPropertyId: string | null
  entryType: EntryType
  developer: { id: string; name: string; logo: string; url: string }
  project: { id: string; name: string; url: string }
  phase: { id: string; name: string; url: string } | null
  saleType: SaleType
  availability: Availability
  listingStatus: ListingStatus
  unitCode: string
  unitNumber: string | null
  unitModel: string | null
  zone: string | null
  propertyCategory: "Residential" | "Commercial" | "F&B" | "Retail"
  propertyType: string
  propertySubType: string | null
  developerType: string | null
  buildingType: string | null
  buildingNumber: string | null
  floorNumber: number | null
  grossBua: number
  netBua: number | null
  bedrooms: number | null
  bathrooms: number | null
  finishingType: "Core & Shell" | "Semi-finished" | "Fully finished" | "Furnished"
  finishingLevel: "Premium" | "Branded" | "Serviced" | null
  deliveryType: "Off-plan" | "Ready to move"
  deliveryDate: string | null
  unitView: string | null
  unitOrientation: string | null
  openRoofArea: number | null
  roofAnnexArea: number | null
  gardenArea: number | null
  terraceArea: number | null
  landArea: number | null
  storageArea: number | null
  outdoorArea: number | null
  basementArea: number | null
  parking: boolean
  parkingSlots: number | null
  additionalParkingSlots: number | null
  storageIncluded: boolean
  storagePrice: number | null
  outdoorPrice: number | null
  serviced: boolean
  branded: boolean
  amenities: string[]
  services: string[]
  price: number | null
  priceRecords: number[]
  paymentPlans: number
  offers: number
  floorPlans: string[]
  images: string[]
  lastUpdated: string
  createdAt: string
  availabilityUpdatedAt: string
}

type VirtualColId = "pricePerMeter" | "paymentOptions"
type ColId = keyof PropertyRow | VirtualColId

interface ColumnDef {
  id: ColId
  label: string
  width: number
  align?: "left" | "right" | "center"
}

interface SortConfig {
  column: ColId
  direction: "asc" | "desc"
}

interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  conditions: { id: string; column: string; operator: string; value: string }[]
}

// ── Column definitions ─────────────────────────────────────────────────────────
const COLUMNS: ColumnDef[] = [
  { id: "propertyId", label: "Property ID", width: 150 },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 170 },
  { id: "entryType", label: "Entry type", width: 120 },
  { id: "developer", label: "Developer", width: 220 },
  { id: "project", label: "Project", width: 210 },
  { id: "phase", label: "Phase", width: 170 },
  { id: "saleType", label: "Sale type", width: 130 },
  { id: "availability", label: "Availability", width: 140 },
  { id: "listingStatus", label: "Listing status", width: 140 },
  { id: "unitCode", label: "Unit code", width: 140 },
  { id: "unitNumber", label: "Unit number", width: 120 },
  { id: "unitModel", label: "Unit model", width: 120 },
  { id: "zone", label: "Zone", width: 110 },
  { id: "propertyCategory", label: "Property category", width: 160 },
  { id: "propertyType", label: "Property type", width: 150 },
  { id: "propertySubType", label: "Property sub-type", width: 180 },
  { id: "developerType", label: "Developer type", width: 160 },
  { id: "buildingType", label: "Building type", width: 140 },
  { id: "buildingNumber", label: "Building number", width: 150 },
  { id: "floorNumber", label: "Floor number", width: 120, align: "right" },
  { id: "grossBua", label: "Gross BUA", width: 120, align: "right" },
  { id: "netBua", label: "Net BUA", width: 120, align: "right" },
  { id: "bedrooms", label: "Bedrooms", width: 110, align: "right" },
  { id: "bathrooms", label: "Bathrooms", width: 110, align: "right" },
  { id: "finishingType", label: "Finishing type", width: 160 },
  { id: "finishingLevel", label: "Finishing level", width: 150 },
  { id: "deliveryType", label: "Delivery type", width: 140 },
  { id: "deliveryDate", label: "Delivery date", width: 130 },
  { id: "price", label: "Price", width: 200, align: "right" },
  { id: "pricePerMeter", label: "Price per m²", width: 150, align: "right" },
  { id: "paymentOptions", label: "Payment options", width: 230 },
  { id: "unitView", label: "Unit view", width: 150 },
  { id: "unitOrientation", label: "Unit orientation", width: 155 },
  { id: "openRoofArea", label: "Open roof area", width: 140, align: "right" },
  { id: "roofAnnexArea", label: "Roof annex area", width: 145, align: "right" },
  { id: "gardenArea", label: "Garden area", width: 130, align: "right" },
  { id: "terraceArea", label: "Terrace area", width: 130, align: "right" },
  { id: "landArea", label: "Land area", width: 120, align: "right" },
  { id: "storageArea", label: "Storage area", width: 130, align: "right" },
  { id: "outdoorArea", label: "Outdoor area", width: 130, align: "right" },
  { id: "basementArea", label: "Basement area", width: 135, align: "right" },
  { id: "parking", label: "Parking", width: 100, align: "center" },
  { id: "parkingSlots", label: "Parking slots", width: 130, align: "right" },
  { id: "additionalParkingSlots", label: "Additional parking slots", width: 190, align: "right" },
  { id: "storageIncluded", label: "Storage included", width: 140, align: "center" },
  { id: "storagePrice", label: "Storage price", width: 150, align: "right" },
  { id: "outdoorPrice", label: "Outdoor price", width: 150, align: "right" },
  { id: "serviced", label: "Serviced", width: 100, align: "center" },
  { id: "branded", label: "Branded", width: 100, align: "center" },
  { id: "amenities", label: "Amenities", width: 280 },
  { id: "services", label: "Services", width: 250 },
  { id: "floorPlans", label: "Floor plans", width: 220 },
  { id: "images", label: "Images", width: 220 },
  { id: "createdAt", label: "Created at", width: 190 },
  { id: "availabilityUpdatedAt", label: "Availability updated", width: 190 },
  { id: "lastUpdated", label: "Last updated", width: 190 },
]

// ── Static options ─────────────────────────────────────────────────────────────
const availabilityOptions: Availability[] = ["Available", "Hold", "Sold-Off", "Archived"]
const listingStatusOptions: ListingStatus[] = ["Active", "Hidden"]
const saleTypes: SaleType[] = ["Launch", "Primary", "Resale", "Nawy Now", "Rental", "Financing"]
const entryTypes: EntryType[] = ["Automatic", "Manual"]
const imageSeeds = [
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg",
]
const amenitiesPool = ["Pool", "Gym", "Spa", "Kids Area", "Tennis Court", "BBQ Area", "Jogging Track", "Sauna", "Yoga Room", "Cinema"]
const servicesPool = ["Security 24/7", "Concierge", "Maintenance", "Valet Parking", "Housekeeping", "Shuttle Bus", "Laundry"]

const AMENITY_ICONS: Record<string, React.ElementType> = {
  "Pool": Waves,
  "Gym": Dumbbell,
  "Spa": Sparkles,
  "Kids Area": Baby,
  "Tennis Court": Target,
  "BBQ Area": Flame,
  "Jogging Track": Wind,
  "Sauna": Thermometer,
  "Yoga Room": Heart,
  "Cinema": Film,
  "Security 24/7": Shield,
  "Concierge": Bell,
  "Maintenance": Wrench,
  "Valet Parking": Car,
  "Housekeeping": Home,
  "Shuttle Bus": Bus,
  "Laundry": Shirt,
}

// Mock project library images for the upload dialog
const PROJECT_LIBRARY = Array.from({ length: 12 }, (_, i) => ({
  id: `lib-${i}`,
  url: imageSeeds[i % imageSeeds.length],
  name: ["Exterior view", "Lobby", "Pool area", "Bedroom", "Kitchen", "Living room", "Terrace", "Garden", "Clubhouse", "Master bath", "Aerial view", "Facade"][i],
}))

// ── Badge colors ───────────────────────────────────────────────────────────────
const BADGE_CLASS: Record<string, string> = {
  // entry / sale types / statuses (keep existing)
  Automatic: "bg-blue-100 text-blue-700 border-blue-200",
  Manual: "bg-gray-100 text-gray-700 border-gray-200",
  Launch: "bg-amber-100 text-amber-700 border-amber-200",
  Primary: "bg-blue-100 text-blue-700 border-blue-200",
  Resale: "bg-purple-100 text-purple-700 border-purple-200",
  "Nawy Now": "bg-teal-100 text-teal-700 border-teal-200",
  Rental: "bg-orange-100 text-orange-700 border-orange-200",
  Financing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Available: "bg-green-100 text-green-700 border-green-200",
  Hold: "bg-amber-100 text-amber-700 border-amber-200",
  "Sold-Off": "bg-red-100 text-red-700 border-red-200",
  Archived: "bg-gray-100 text-gray-700 border-gray-200",
  Active: "bg-green-100 text-green-700 border-green-200",
  Hidden: "bg-gray-100 text-gray-700 border-gray-200",
  // property category
  Residential: "bg-blue-100 text-blue-700 border-blue-200",
  Commercial: "bg-purple-100 text-purple-700 border-purple-200",
  "F&B": "bg-orange-100 text-orange-700 border-orange-200",
  Retail: "bg-teal-100 text-teal-700 border-teal-200",
  // finishing type
  "Core & Shell": "bg-gray-100 text-gray-700 border-gray-200",
  "Semi-finished": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Fully finished": "bg-green-100 text-green-700 border-green-200",
  Furnished: "bg-sky-100 text-sky-700 border-sky-200",
  // delivery type
  "Off-plan": "bg-amber-100 text-amber-700 border-amber-200",
  "Ready to move": "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const TAG_PALETTE = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-rose-100 text-rose-700 border-rose-200",
]

function tagColor(value: string): string {
  if (BADGE_CLASS[value]) return BADGE_CLASS[value]
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) & 0xffffffff
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]
}

// ── Mock data ──────────────────────────────────────────────────────────────────
function createRows(): PropertyRow[] {
  return Array.from({ length: 3 }).flatMap((_, bi) =>
    initialUnits.map((unit, ui) => mapUnitToProperty(unit, bi, ui)),
  )
}

function mapUnitToProperty(unit: Unit, batchIndex: number, unitIndex: number): PropertyRow {
  const index = batchIndex * initialUnits.length + unitIndex
  const propertyId = `PRP-${String(index + 1).padStart(6, "0")}`
  const isManual = index % 5 === 0
  const saleType = (["Primary", "Resale", "Nawy Now", "Launch", "Rental", "Financing"] as SaleType[])[index % 6]
  const grossBua = unit.grossArea + batchIndex * 8
  const price = index % 9 === 0 ? 0 : 2800000 + grossBua * 16500 + index * 85000
  const floorPlanCount = index % 4 === 0 ? 0 : (index % 3) + 1
  const imageCount = index % 6 === 0 ? 0 : (index % 4) + 1
  const isVillaLike = ["Villa", "Townhouse"].includes(unit.propertyType)
  const furnished = index % 4 === 0
  const projId = `PRJ-${100 + (index % 5)}`
  const phsId = `PHS-${200 + (index % 6)}`
  return {
    propertyId,
    detailedPropertyId: isManual ? null : `DPR-${String(84000 + index).padStart(6, "0")}`,
    entryType: isManual ? "Manual" : "Automatic",
    developer: {
      id: `DEV-${(index % 4) + 1}`,
      name: ["Palm Hills", "Sodic", "Mountain View", "Emaar"][index % 4],
      logo: ["PH", "SD", "MV", "EM"][index % 4],
      url: `/developers/DEV-${(index % 4) + 1}`,
    },
    project: {
      id: projId,
      name: ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"][index % 5],
      url: `/projects/${projId}`,
    },
    phase:
      index % 7 === 0
        ? null
        : {
            id: phsId,
            name: projectPhases[index % projectPhases.length]?.name ?? "Phase 1",
            url: `/phases/${phsId}`,
          },
    saleType,
    availability:
      index % 8 === 0 ? "Hold" : unit.status === "Sold Off" ? "Sold-Off" : index % 13 === 0 ? "Archived" : "Available",
    listingStatus: index % 6 === 0 ? "Hidden" : "Active",
    unitCode: unit.unitCode || `TMP-${propertyId.slice(-4)}`,
    unitNumber: unit.unitCode ? unit.unitCode.split("-").at(-1) ?? null : null,
    unitModel: index % 3 === 0 ? null : `${unit.bedrooms}BR`,
    zone: index % 4 === 0 ? null : `Zone ${String.fromCharCode(65 + (index % 5))}`,
    propertyCategory:
      index % 11 === 0 ? "Commercial" : index % 13 === 0 ? "Retail" : index % 17 === 0 ? "F&B" : "Residential",
    propertyType: unit.propertyType,
    propertySubType:
      index % 3 === 0
        ? null
        : unit.propertyType === "Apartment"
          ? "Garden Apartment"
          : `Corner ${unit.propertyType}`,
    developerType: index % 4 === 0 ? null : `${unit.propertyType} ${unit.bedrooms}BR`,
    buildingType: isVillaLike ? "Standalone" : index % 3 === 0 ? "Cluster" : "Tower",
    buildingNumber: unit.buildingNumber || null,
    floorNumber: isVillaLike ? null : (index % 12) + 1,
    grossBua,
    netBua: index % 5 === 0 ? null : Math.max(45, grossBua - 14),
    bedrooms:
      unit.propertyType === "Apartment" && unit.bedrooms === 1 && index % 4 === 0 ? null : unit.bedrooms,
    bathrooms: index % 6 === 0 ? null : Math.max(1, unit.bedrooms - 1),
    finishingType: furnished ? "Furnished" : (["Core & Shell", "Semi-finished", "Fully finished"] as const)[index % 3],
    finishingLevel: furnished ? (["Premium", "Branded", "Serviced"] as const)[index % 3] : null,
    deliveryType: index % 3 === 0 ? "Ready to move" : "Off-plan",
    deliveryDate: index % 3 === 0 ? null : new Date(2026 + (index % 4), (index * 3) % 12, (index % 28) + 1).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    unitView: index % 4 === 0 ? null : ["Sea view", "Lagoon", "Garden", "Clubhouse"][index % 4],
    unitOrientation: index % 5 === 0 ? null : ["North", "SW", "East", "NE"][index % 4],
    openRoofArea: isVillaLike || index % 5 === 0 ? 20 + index * 3 : null,
    roofAnnexArea: isVillaLike && index % 3 !== 0 ? 15 + index * 2 : null,
    gardenArea: isVillaLike || index % 4 === 1 ? 30 + index * 2 : null,
    terraceArea: index % 3 === 0 ? null : 8 + index,
    landArea: isVillaLike ? grossBua + 90 : null,
    storageArea: index % 4 === 0 ? null : 4 + (index % 8),
    outdoorArea: index % 4 === 0 ? null : 10 + index * 2,
    basementArea: isVillaLike ? 30 + index * 4 : null,
    parking: index % 4 !== 0,
    parkingSlots: index % 5 === 0 ? null : isVillaLike ? 2 : 1,
    additionalParkingSlots: index % 6 === 0 ? null : index % 3,
    storageIncluded: index % 3 === 0,
    storagePrice: index % 3 === 0 && index % 4 !== 0 ? 50000 + index * 5000 : null,
    outdoorPrice: index % 5 === 0 ? null : 30000 + index * 3000,
    serviced: furnished && index % 3 === 2,
    branded: furnished && index % 3 === 1,
    amenities: Array.from({ length: (index % 4) + 1 }, (_, i) => amenitiesPool[(index + i) % amenitiesPool.length]),
    services: index % 3 === 0 ? [] : Array.from({ length: (index % 3) + 1 }, (_, i) => servicesPool[(index + i) % servicesPool.length]),
    price,
    priceRecords:
      index % 4 === 0
        ? [price || 0, price ? price - 120000 : 0, price ? price + 150000 : 0]
        : [price || 0],
    paymentPlans: index % 7 === 0 ? 0 : (index % 4) + 1,
    offers: index % 5 === 0 ? (index % 3) + 1 : 0,
    floorPlans: Array.from({ length: floorPlanCount }, (_, i) => imageSeeds[(index + i) % imageSeeds.length]),
    images: Array.from({ length: imageCount }, (_, i) => imageSeeds[(index + i + 1) % imageSeeds.length]),
    lastUpdated: new Date(Date.now() - (index + 1) * 7 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - (index + 1) * 30 * 24 * 3600000).toISOString(),
    availabilityUpdatedAt: new Date(Date.now() - (index + 1) * 3 * 3600000).toISOString(),
  }
}

// ── Utility helpers ────────────────────────────────────────────────────────────
function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
function formatArea(v: number | null) {
  return v ? `${v.toLocaleString()} m²` : null
}
function formatPrice(v: number | null) {
  if (!v) return null
  return `${v.toLocaleString()} EGP`
}
function relativeTime(iso: string) {
  const h = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3600000))
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.round(d / 30)
  return `${mo}mo ago`
}
function formatTimestamp(iso: string) {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  // en-GB → "13 May 2026"
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${datePart}, ${timePart}`
}

function CopyableText({ value, muted = false }: { value: string | null; muted?: boolean }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <EmptyValue />
  return (
    <span className={cn("group/copy inline-flex items-center gap-1 min-w-0", muted && "text-muted-foreground")}>
      <span className="truncate">{value}</span>
      <button
        className="opacity-0 group-hover/copy:opacity-100 rounded p-0.5 hover:bg-secondary transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 900)
        }}
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </span>
  )
}

function StoryBadge({
  value,
  onChange,
  options,
}: {
  value: string
  onChange?: (v: string) => void
  options?: string[]
}) {
  if (!onChange || !options)
    return (
      <Badge variant="outline" className={cn("border text-xs", BADGE_CLASS[value])}>
        {value}
      </Badge>
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>
          <Badge variant="outline" className={cn("border cursor-pointer text-xs", BADGE_CLASS[value])}>
            {value}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuItem key={o} onClick={() => onChange(o)}>
            {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TagBadge({ value }: { value: string | null }) {
  if (!value) return <EmptyValue />
  return (
    <Badge variant="outline" className={cn("border text-xs whitespace-nowrap", tagColor(value))}>
      {value}
    </Badge>
  )
}

function AmenitiesCell({
  values,
  allOptions,
  type,
  onUpdate,
  onViewInDrawer,
}: {
  values: string[]
  allOptions: string[]
  type: "amenities" | "services"
  onUpdate: (vals: string[]) => void
  onViewInDrawer?: () => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const MAX_VISIBLE = 3
  const visible = values.slice(0, MAX_VISIBLE)
  const extra = values.slice(MAX_VISIBLE)
  const handleEdit = () => (onViewInDrawer ? onViewInDrawer() : setDrawerOpen(true))

  return (
    <>
      <div className="flex items-center gap-1 w-full min-w-0">
        {/* Tags area — clips when too wide */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden flex-nowrap">
          {values.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">None</span>
          ) : (
            <>
              {visible.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-white text-gray-700 text-xs whitespace-nowrap flex-shrink-0 font-medium"
                >
                  {v}
                </span>
              ))}
              {extra.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex-shrink-0 px-1.5 py-0.5 rounded-full border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                      onClick={handleEdit}
                    >
                      +{extra.length}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800 max-w-[200px]">
                    <div className="space-y-0.5 text-xs">
                      {extra.map((v) => <div key={v}>{v}</div>)}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
        {/* Edit button — always visible, never clipped */}
        <button
          className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center border border-border bg-white hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleEdit}
          title={`Edit ${type}`}
        >
          <Edit className="h-3 w-3" />
        </button>
      </div>
      {!onViewInDrawer && (
        <AmenitiesDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          type={type}
          allOptions={allOptions}
          current={values}
          onSave={onUpdate}
        />
      )}
    </>
  )
}

function BooleanMark({ value }: { value: boolean }) {
  return value ? (
    <div className="mx-auto flex items-center justify-center h-5 w-5 rounded-full bg-green-100">
      <Check className="h-3 w-3 text-green-600" />
    </div>
  ) : (
    <div className="mx-auto flex items-center justify-center h-5 w-5 rounded-full bg-red-100">
      <X className="h-3 w-3 text-red-600" />
    </div>
  )
}

function SortArrows({ columnId, sortConfigs }: { columnId: string; sortConfigs: SortConfig[] }) {
  const active = sortConfigs.find((s) => s.column === columnId)
  return (
    <span className="inline-flex flex-col gap-[1px] ml-1 shrink-0">
      <svg
        width="7"
        height="5"
        viewBox="0 0 7 5"
        className={cn(
          "transition-colors",
          active?.direction === "asc"
            ? "text-foreground"
            : "text-muted-foreground/30 group-hover/sort:text-muted-foreground/60",
        )}
        fill="currentColor"
      >
        <path d="M3.5 0L7 5H0L3.5 0Z" />
      </svg>
      <svg
        width="7"
        height="5"
        viewBox="0 0 7 5"
        className={cn(
          "transition-colors",
          active?.direction === "desc"
            ? "text-foreground"
            : "text-muted-foreground/30 group-hover/sort:text-muted-foreground/60",
        )}
        fill="currentColor"
      >
        <path d="M3.5 5L0 0H7L3.5 5Z" />
      </svg>
    </span>
  )
}

function getSortValue(row: PropertyRow, column: ColId) {
  if (column === "pricePerMeter") return row.price && row.grossBua ? row.price / row.grossBua : 0
  if (column === "paymentOptions") return row.paymentPlans
  const v = row[column as keyof PropertyRow]
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "object" && v !== null) {
    if ("name" in v) return (v as any).name
    if ("id" in v) return (v as any).id
  }
  return v ?? ""
}

// ── Image Carousel ─────────────────────────────────────────────────────────────
function ImageCarousel({
  images,
  startIndex,
  onClose,
  onReorder,
  onRemove,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
  onReorder: (imgs: string[]) => void
  onRemove: (idx: number) => void
}) {
  const [current, setCurrent] = useState(startIndex)
  const [filmDrag, setFilmDrag] = useState<number | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const go = (dir: number) => setCurrent((c) => (c + dir + images.length) % images.length)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (confirmRemove !== null) return
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images.length, confirmRemove])

  const doRemove = (idx: number) => {
    onRemove(idx)
    if (current >= images.length - 1) setCurrent(Math.max(0, current - 1))
    setConfirmRemove(null)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex flex-col" onClick={onClose}>
      {/* Remove confirmation */}
      {confirmRemove !== null && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-80 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Remove image?</p>
                <p className="text-xs text-muted-foreground mt-1">This image will be removed from the unit. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmRemove(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => doRemove(confirmRemove)}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <img
          src={images[current]}
          alt={`Image ${current + 1}`}
          className="max-h-[72vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(1)}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {current + 1} / {images.length}
        </span>
      </div>

      {/* Filmstrip */}
      <div
        className="flex-shrink-0 border-t border-white/10 bg-black/70 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => setFilmDrag(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (filmDrag === null || filmDrag === idx) return
                const next = [...images]
                const [moved] = next.splice(filmDrag, 1)
                next.splice(idx, 0, moved)
                const newCurrent = idx === current ? filmDrag : filmDrag === current ? idx : current
                setCurrent(newCurrent)
                setFilmDrag(null)
                onReorder(next)
              }}
              onDragEnd={() => setFilmDrag(null)}
              className={cn(
                "relative flex-shrink-0 cursor-pointer group/film rounded overflow-hidden transition-all",
                current === idx ? "ring-2 ring-white scale-105" : "opacity-60 hover:opacity-100",
                filmDrag === idx && "opacity-30",
              )}
              style={{ width: 72, height: 52 }}
              onClick={() => setCurrent(idx)}
            >
              <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
              <button
                className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 rounded-full p-0.5 text-white opacity-0 group-hover/film:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setConfirmRemove(idx) }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <div className="absolute bottom-0.5 left-0.5">
                <GripVertical className="h-3 w-3 text-white/50" />
              </div>
            </div>
          ))}
          <button
            className="flex-shrink-0 w-[72px] h-[52px] border border-dashed border-white/30 rounded flex items-center justify-center text-white/50 hover:text-white hover:border-white/60 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((f) => onReorder([...images, URL.createObjectURL(f)]))
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Upload Dialog (two tabs) ───────────────────────────────────────────────────
function UploadDialog({
  open,
  onClose,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  onUpload: (urls: string[]) => void
}) {
  const [tab, setTab] = useState<"device" | "library">("device")
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const [libSelected, setLibSelected] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: File[]) =>
    setSelected((prev) => [...prev, ...files.filter((f) => f.type.startsWith("image/"))])

  const handleConfirm = () => {
    if (tab === "device") {
      onUpload(selected.map((f) => URL.createObjectURL(f)))
      setSelected([])
    } else {
      onUpload(PROJECT_LIBRARY.filter((img) => libSelected.has(img.id)).map((img) => img.url))
      setLibSelected(new Set())
    }
    onClose()
  }

  const canConfirm = tab === "device" ? selected.length > 0 : libSelected.size > 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-xl w-[560px] flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h3 className="text-base font-semibold">Add Images</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 mt-4 border-b border-border">
          {([["device", "Upload from device"], ["library", "Project library"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === "device" ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
                )}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drop images here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB each</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = "" }} />
              </div>
              {selected.length > 0 && (
                <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                  {selected.map((f, i) => (
                    <div key={i} className="relative w-16 h-12 rounded overflow-hidden border border-border group flex-shrink-0">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      <button
                        className="absolute top-0 right-0 bg-black/60 hover:bg-red-600 rounded-bl p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelected((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Select images from this project to attach to the unit.
                {libSelected.size > 0 && <span className="ml-1 font-medium text-foreground">{libSelected.size} selected</span>}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PROJECT_LIBRARY.map((img) => {
                  const sel = libSelected.has(img.id)
                  return (
                    <button
                      key={img.id}
                      onClick={() =>
                        setLibSelected((prev) => {
                          const n = new Set(prev)
                          n.has(img.id) ? n.delete(img.id) : n.add(img.id)
                          return n
                        })
                      }
                      className={cn(
                        "relative rounded-lg overflow-hidden border-2 transition-all group",
                        sel ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-border",
                      )}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
                      <div className={cn(
                        "absolute inset-0 bg-black/0 transition-colors",
                        sel && "bg-primary/10",
                        !sel && "group-hover:bg-black/10",
                      )} />
                      {sel && (
                        <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                        <p className="text-white text-[10px] truncate">{img.name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {tab === "device"
              ? `Upload${selected.length > 0 ? ` (${selected.length})` : ""}`
              : `Add${libSelected.size > 0 ? ` (${libSelected.size})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Media Cell (ImageCell) ─────────────────────────────────────────────────────
function MediaCell({
  images,
  onUpdate,
}: {
  images: string[]
  onUpdate: (imgs: string[]) => void
}) {
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselStart, setCarouselStart] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const MAX_VISIBLE = 3

  const visible = images.slice(0, MAX_VISIBLE)
  const extra = images.length - MAX_VISIBLE

  return (
    <>
      <div className="flex items-center gap-1 w-full min-w-0">
        {/* Thumbnails + overflow chip — takes available space, clips if needed */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden flex-nowrap">
          {images.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">None</span>
          ) : (
            <>
              {visible.map((img, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragIdx === null || dragIdx === idx) return
                    const next = [...images]
                    const [moved] = next.splice(dragIdx, 1)
                    next.splice(idx, 0, moved)
                    setDragIdx(null)
                    onUpdate(next)
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  className={cn(
                    "relative group/img rounded overflow-hidden cursor-grab active:cursor-grabbing flex-shrink-0 border border-border",
                    dragIdx === idx && "opacity-30",
                  )}
                  style={{ width: 40, height: 32 }}
                >
                  <img
                    src={img}
                    alt={`img ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCarouselStart(idx)
                      setCarouselOpen(true)
                    }}
                  />
                  <button
                    className="absolute top-0 right-0 bg-black/60 hover:bg-red-600 rounded-bl p-0.5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate(images.filter((_, i) => i !== idx))
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                    <ZoomIn className="h-3 w-3 text-white" />
                  </div>
                </div>
              ))}
              {extra > 0 && (
                <button
                  className="flex-shrink-0 px-1.5 h-8 rounded border border-border bg-secondary text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap"
                  onClick={() => { setCarouselStart(MAX_VISIBLE); setCarouselOpen(true) }}
                >
                  +{extra}
                </button>
              )}
            </>
          )}
        </div>
        {/* Add button — always right-aligned, never clipped */}
        <button
          onClick={() => setUploadOpen(true)}
          className="flex-shrink-0 w-7 h-7 rounded border border-dashed border-border bg-transparent hover:bg-muted hover:border-primary/50 flex items-center justify-center transition-colors"
          title="Add images"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      {carouselOpen && images.length > 0 && (
        <ImageCarousel
          images={images}
          startIndex={Math.min(carouselStart, images.length - 1)}
          onClose={() => setCarouselOpen(false)}
          onReorder={onUpdate}
          onRemove={(idx) => onUpdate(images.filter((_, i) => i !== idx))}
        />
      )}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(urls) => onUpdate([...images, ...urls])}
      />
    </>
  )
}

// ── View Property Drawer ───────────────────────────────────────────────────────
function ViewPropertyDrawer({
  row,
  defaultTab,
  onClose,
  onUpdateRow,
}: {
  row: PropertyRow | null
  defaultTab: string
  onClose: () => void
  onUpdateRow: (id: string, updates: Partial<PropertyRow>) => void
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [amenityDraft, setAmenityDraft] = useState<string[]>([])
  const [serviceDraft, setServiceDraft] = useState<string[]>([])
  const [carouselState, setCarouselState] = useState<{ imgs: string[]; idx: number; field: "images" | "floorPlans" } | null>(null)
  const [uploadState, setUploadState] = useState<"images" | "floorPlans" | null>(null)

  useEffect(() => {
    if (row) {
      setActiveTab(defaultTab)
      setAmenityDraft([...row.amenities])
      setServiceDraft([...row.services])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.propertyId, defaultTab])

  if (!row) return null

  const pricePerM2 = row.price && row.grossBua ? Math.round(row.price / row.grossBua) : null

  const TABS = [
    { id: "unit-details", label: "Unit Details" },
    { id: "payment-plans", label: "Payment Plans" },
    { id: "images", label: row.images.length > 0 ? `Images (${row.images.length})` : "Images" },
    { id: "floor-plans", label: row.floorPlans.length > 0 ? `Floor Plans (${row.floorPlans.length})` : "Floor Plans" },
    { id: "amenities", label: "Amenities" },
    { id: "activity-log", label: "Activity Log" },
    { id: "price-history", label: "Price History" },
  ]

  function Field({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: 1 | 2 }) {
    return (
      <div className={cn("space-y-0.5", span === 2 && "col-span-2")}>
        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</dd>
      </div>
    )
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">{title}</h4>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3">{children}</dl>
      </div>
    )
  }

  const dummyPlans = Array.from({ length: row.paymentPlans }, (_, i) => ({
    id: `plan-${i}`,
    name: ["Standard Plan", "Flexible Plan", "Premium Plan", "Investor Plan"][i % 4],
    downPayment: [10, 15, 20, 25][i % 4],
    installmentPct: [5, 4, 3, 5][i % 4],
    duration: [60, 48, 72, 36][i % 4],
    deliveryPct: [10, 10, 15, 20][i % 4],
    maintenancePct: 8,
    clubhousePct: [5, 6, 7, 5][i % 4],
  }))

  const dummyOffers = Array.from({ length: row.offers }, (_, i) => ({
    id: `offer-${i}`,
    title: ["Early Bird Discount", "Cash Discount", "Investor Package", "Seasonal Offer"][i % 4],
    discount: [5, 10, 7, 8][i % 4],
    validUntil: new Date(Date.now() + (30 + i * 15) * 24 * 3600000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  }))

  const dummyActivity = [
    { icon: "status", label: "Availability changed", detail: "Available → Hold", user: "Sarah M.", time: "2 days ago", colorClass: "text-amber-600 bg-amber-50" },
    { icon: "price", label: "Price updated", detail: `${(row.price ? row.price - 150000 : 0).toLocaleString()} → ${(row.price ?? 0).toLocaleString()} EGP`, user: "Ahmed K.", time: "5 days ago", colorClass: "text-blue-600 bg-blue-50" },
    { icon: "listing", label: "Listing status changed", detail: "Hidden → Active", user: "System", time: "1 week ago", colorClass: "text-green-600 bg-green-50" },
    { icon: "edit", label: "Unit details updated", detail: "Finishing type, floor number", user: "Mariam N.", time: "2 weeks ago", colorClass: "text-purple-600 bg-purple-50" },
    { icon: "create", label: "Property created", detail: `Entry: ${row.entryType}`, user: row.entryType === "Automatic" ? "System" : "Omar F.", time: formatTimestamp(row.createdAt), colorClass: "text-gray-500 bg-gray-100" },
  ]

  const basePrice = row.price ?? 0
  const dummyPriceHistory = [
    { date: formatTimestamp(new Date(Date.now() - 2 * 24 * 3600000).toISOString()), price: basePrice, change: 150000, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 10 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice - 150000), change: -250000, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 25 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice + 100000), change: 100000, user: "Sara M." },
    { date: formatTimestamp(new Date(Date.now() - 60 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice), change: null, user: "System" },
  ]

  const amenityChanged = JSON.stringify(amenityDraft.sort()) !== JSON.stringify([...row.amenities].sort())
  const serviceChanged = JSON.stringify(serviceDraft.sort()) !== JSON.stringify([...row.services].sort())

  return (
    <>
      <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-[760px] max-w-[92vw] flex flex-col p-0 gap-0 overflow-hidden"
        >
          {/* ── Header */}
          <div className="shrink-0 border-b border-border bg-card px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h2 className="text-base font-semibold">{row.unitCode}</h2>
                  <StoryBadge value={row.availability} />
                  <StoryBadge value={row.listingStatus} />
                </div>
                <div className="flex items-center gap-1.5 text-sm flex-wrap mb-2">
                  <span className="font-medium text-foreground">{row.developer.name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{row.project.name}</span>
                  {row.phase && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{row.phase.name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs border", tagColor(row.propertyType))}>
                    {row.propertyType}
                  </Badge>
                  <StoryBadge value={row.saleType} />
                  {row.bedrooms !== null && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{row.bedrooms} BR</span>
                  )}
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {row.grossBua.toLocaleString()} m² GBA
                  </span>
                  <StoryBadge value={row.deliveryType} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {row.price ? (
                  <>
                    <div className="text-xl font-bold tabular-nums">{row.price.toLocaleString()} EGP</div>
                    {pricePerM2 && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {pricePerM2.toLocaleString()} EGP/m²
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm font-medium text-red-500">No price set</div>
                )}
                {row.deliveryDate && (
                  <div className="text-xs text-muted-foreground mt-1">Delivery: {row.deliveryDate}</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tabs bar */}
          <div className="shrink-0 border-b border-border bg-card overflow-x-auto">
            <div className="flex min-w-max px-6">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    activeTab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* Unit Details */}
            {activeTab === "unit-details" && (
              <div className="p-6 space-y-6">
                <Section title="Identity">
                  <Field label="Property ID" value={<CopyableText value={row.propertyId} />} />
                  <Field label="Detailed Property ID" value={<CopyableText value={row.detailedPropertyId} muted />} />
                  <Field label="Entry Type" value={<StoryBadge value={row.entryType} />} />
                  <Field label="Unit Number" value={row.unitNumber} />
                  <Field label="Unit Model" value={row.unitModel} />
                  <Field label="Zone" value={row.zone} />
                </Section>
                <Section title="Classification">
                  <Field label="Category" value={<TagBadge value={row.propertyCategory} />} />
                  <Field label="Type" value={<TagBadge value={row.propertyType} />} />
                  <Field label="Sub-type" value={<TagBadge value={row.propertySubType} />} />
                  <Field label="Developer Type" value={row.developerType} />
                  <Field label="Building Type" value={row.buildingType} />
                  <Field label="Building Number" value={row.buildingNumber} />
                  <Field label="Floor Number" value={row.floorNumber} />
                </Section>
                <Section title="Dimensions">
                  <Field label="Gross BUA" value={formatArea(row.grossBua)} />
                  <Field label="Net BUA" value={formatArea(row.netBua)} />
                  <Field label="Bedrooms" value={row.bedrooms} />
                  <Field label="Bathrooms" value={row.bathrooms} />
                </Section>
                <Section title="Areas">
                  <Field label="Open Roof Area" value={formatArea(row.openRoofArea)} />
                  <Field label="Roof Annex Area" value={formatArea(row.roofAnnexArea)} />
                  <Field label="Garden Area" value={formatArea(row.gardenArea)} />
                  <Field label="Terrace Area" value={formatArea(row.terraceArea)} />
                  <Field label="Land Area" value={formatArea(row.landArea)} />
                  <Field label="Storage Area" value={formatArea(row.storageArea)} />
                  <Field label="Outdoor Area" value={formatArea(row.outdoorArea)} />
                  <Field label="Basement Area" value={formatArea(row.basementArea)} />
                </Section>
                <Section title="Parking & Storage">
                  <Field label="Parking" value={<BooleanMark value={row.parking} />} />
                  <Field label="Parking Slots" value={row.parkingSlots} />
                  <Field label="Additional Parking Slots" value={row.additionalParkingSlots} />
                  <Field label="Storage Included" value={<BooleanMark value={row.storageIncluded} />} />
                  <Field label="Storage Price" value={formatPrice(row.storagePrice)} />
                  <Field label="Outdoor Price" value={formatPrice(row.outdoorPrice)} />
                </Section>
                <Section title="Delivery & Finishing">
                  <Field label="Delivery Type" value={<StoryBadge value={row.deliveryType} />} />
                  <Field label="Delivery Date" value={row.deliveryDate} />
                  <Field label="Finishing Type" value={<TagBadge value={row.finishingType} />} />
                  <Field
                    label="Finishing Level"
                    value={row.finishingType === "Furnished" ? <TagBadge value={row.finishingLevel} /> : null}
                  />
                  <Field label="Serviced" value={<BooleanMark value={row.serviced} />} />
                  <Field label="Branded" value={<BooleanMark value={row.branded} />} />
                </Section>
                <Section title="Views & Orientation">
                  <Field label="Unit View" value={<TagBadge value={row.unitView} />} />
                  <Field label="Unit Orientation" value={<TagBadge value={row.unitOrientation} />} />
                </Section>
                <Section title="Timestamps">
                  <Field label="Created At" value={formatTimestamp(row.createdAt)} />
                  <Field label="Availability Updated" value={formatTimestamp(row.availabilityUpdatedAt)} />
                  <Field label="Last Updated" value={formatTimestamp(row.lastUpdated)} />
                </Section>
              </div>
            )}

            {/* Payment Plans */}
            {activeTab === "payment-plans" && (
              <div className="p-6 space-y-6">
                {/* Price summary card */}
                <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Current Price</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {row.price ? `${row.price.toLocaleString()} EGP` : <span className="text-red-500 text-lg">Not set</span>}
                    </p>
                    {pricePerM2 && (
                      <p className="text-sm text-muted-foreground tabular-nums mt-0.5">
                        {pricePerM2.toLocaleString()} EGP/m²
                      </p>
                    )}
                  </div>
                  {row.priceRecords.length > 1 && (
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground mb-1">All Prices</p>
                      {row.priceRecords.map((p, i) => (
                        <p key={i} className={cn("text-sm tabular-nums", i === 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                          {p.toLocaleString()} EGP
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment plans list */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Payment Plans ({row.paymentPlans})
                  </h4>
                  {row.paymentPlans === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No payment plans attached to this unit.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dummyPlans.map((plan) => (
                        <div key={plan.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-sm">{plan.name}</h5>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {plan.duration / 12}-year plan
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-3 rounded-lg bg-muted/40 p-3">
                            {[
                              { label: "Down Payment", value: `${plan.downPayment}%` },
                              { label: "Instalment", value: `${plan.installmentPct}% / qtr` },
                              { label: "On Delivery", value: `${plan.deliveryPct}%` },
                              { label: "Maintenance", value: `${plan.maintenancePct}%` },
                            ].map(({ label, value }) => (
                              <div key={label} className="text-center">
                                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                                <p className="text-sm font-semibold tabular-nums">{value}</p>
                              </div>
                            ))}
                          </div>
                          {row.price && (
                            <div className="text-xs text-muted-foreground">
                              Down payment amount:{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {Math.round(row.price * plan.downPayment / 100).toLocaleString()} EGP
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Offers */}
                {row.offers > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Active Offers ({row.offers})
                    </h4>
                    <div className="space-y-3">
                      {dummyOffers.map((offer) => (
                        <div key={offer.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-orange-900">{offer.title}</p>
                            <p className="text-xs text-orange-700 mt-0.5">Valid until {offer.validUntil}</p>
                          </div>
                          <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800 text-sm font-bold flex-shrink-0 px-3 py-1">
                            {offer.discount}% off
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {activeTab === "images" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.images.length} {row.images.length === 1 ? "Image" : "Images"}
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setUploadState("images")} className="h-7 text-xs gap-1.5">
                    <Plus className="h-3 w-3" />Add Images
                  </Button>
                </div>
                {row.images.length === 0 ? (
                  <div
                    onClick={() => setUploadState("images")}
                    className="rounded-xl border-2 border-dashed border-border p-14 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No images yet — click to upload</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {row.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselState({ imgs: row.images, idx: i, field: "images" })}
                        className="relative group rounded-lg overflow-hidden border border-border aspect-video hover:border-primary/50 transition-all"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Floor Plans */}
            {activeTab === "floor-plans" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.floorPlans.length} {row.floorPlans.length === 1 ? "Floor Plan" : "Floor Plans"}
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setUploadState("floorPlans")} className="h-7 text-xs gap-1.5">
                    <Plus className="h-3 w-3" />Add Floor Plans
                  </Button>
                </div>
                {row.floorPlans.length === 0 ? (
                  <div
                    onClick={() => setUploadState("floorPlans")}
                    className="rounded-xl border-2 border-dashed border-border p-14 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No floor plans yet — click to upload</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {row.floorPlans.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselState({ imgs: row.floorPlans, idx: i, field: "floorPlans" })}
                        className="relative group rounded-lg overflow-hidden border border-border aspect-video hover:border-primary/50 transition-all"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Amenities */}
            {activeTab === "amenities" && (
              <div className="p-6 space-y-6">
                {/* Amenities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Amenities ({amenityDraft.length} selected)
                    </h4>
                    {amenityChanged && (
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1.5"
                        onClick={() => onUpdateRow(row.propertyId, { amenities: amenityDraft })}>
                        <Check className="h-3 w-3" />Save
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {amenitiesPool.map((name) => {
                      const Icon = AMENITY_ICONS[name] ?? Sparkles
                      const sel = amenityDraft.includes(name)
                      return (
                        <button
                          key={name}
                          onClick={() =>
                            setAmenityDraft((prev) =>
                              sel ? prev.filter((v) => v !== name) : [...prev, name],
                            )
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                            sel
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border bg-card hover:bg-muted text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{name}</span>
                          {sel && <Check className="h-3 w-3 ml-auto flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Services ({serviceDraft.length} selected)
                    </h4>
                    {serviceChanged && (
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1.5"
                        onClick={() => onUpdateRow(row.propertyId, { services: serviceDraft })}>
                        <Check className="h-3 w-3" />Save
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {servicesPool.map((name) => {
                      const Icon = AMENITY_ICONS[name] ?? Wrench
                      const sel = serviceDraft.includes(name)
                      return (
                        <button
                          key={name}
                          onClick={() =>
                            setServiceDraft((prev) =>
                              sel ? prev.filter((v) => v !== name) : [...prev, name],
                            )
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                            sel
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border bg-card hover:bg-muted text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{name}</span>
                          {sel && <Check className="h-3 w-3 ml-auto flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Log */}
            {activeTab === "activity-log" && (
              <div className="p-6">
                <div className="space-y-0 divide-y divide-border">
                  {dummyActivity.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 py-4">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", entry.colorClass)}>
                        {entry.icon === "status" && <ArrowUpDown className="h-3.5 w-3.5" />}
                        {entry.icon === "price" && <span className="text-[9px] font-bold leading-none">EGP</span>}
                        {entry.icon === "listing" && <Eye className="h-3.5 w-3.5" />}
                        {entry.icon === "edit" && <Edit className="h-3.5 w-3.5" />}
                        {entry.icon === "create" && <Plus className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{entry.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className="text-xs font-medium">{entry.user}</p>
                        <p className="text-[11px] text-muted-foreground">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price History */}
            {activeTab === "price-history" && (
              <div className="p-6 space-y-4">
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-right px-4 py-3">Price (EGP)</th>
                        <th className="text-right px-4 py-3">Change</th>
                        <th className="text-left px-4 py-3">Updated by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dummyPriceHistory.map((entry, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{entry.date}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{entry.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-xs">
                            {entry.change === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : entry.change > 0 ? (
                              <span className="text-green-600 font-medium">+{entry.change.toLocaleString()}</span>
                            ) : (
                              <span className="text-red-600 font-medium">{entry.change.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">{entry.user}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>

      {/* Carousel opened from within the drawer */}
      {carouselState && (
        <ImageCarousel
          images={carouselState.imgs}
          startIndex={carouselState.idx}
          onClose={() => setCarouselState(null)}
          onReorder={(imgs) => {
            onUpdateRow(row.propertyId, { [carouselState.field]: imgs })
            setCarouselState((s) => (s ? { ...s, imgs } : null))
          }}
          onRemove={(idx) => {
            const next = carouselState.imgs.filter((_, i) => i !== idx)
            onUpdateRow(row.propertyId, { [carouselState.field]: next })
            if (next.length === 0) setCarouselState(null)
            else setCarouselState((s) => (s ? { ...s, imgs: next } : null))
          }}
        />
      )}

      {/* Upload dialog opened from within the drawer */}
      {uploadState && (
        <UploadDialog
          open
          onClose={() => setUploadState(null)}
          onUpload={(urls) => {
            const field = uploadState
            const current = field === "images" ? row.images : row.floorPlans
            onUpdateRow(row.propertyId, { [field]: [...current, ...urls] })
          }}
        />
      )}
    </>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────
export function DetailedPropertiesView() {
  const [rows, setRows] = useState<PropertyRow[]>(() => createRows())
  const [searchQuery, setSearchQuery] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("all")
  const [saleTypeFilter, setSaleTypeFilter] = useState("all")
  const [entryTypeFilter, setEntryTypeFilter] = useState("all")
  const [listingFilter, setListingFilter] = useState("all")
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [groupBy, setGroupBy] = useState<ColId | "none">("none")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  // Column management
  const [colOrder, setColOrder] = useState<ColId[]>(() => COLUMNS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<ColId>>(new Set())
  const [frozenColIds, setFrozenColIds] = useState<Set<ColId>>(new Set())
  const [showColumnSheet, setShowColumnSheet] = useState(false)
  const [colSearch, setColSearch] = useState("")
  const [draggedColId, setDraggedColId] = useState<ColId | null>(null)
  // Filter / sort popovers
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [groupConnector, setGroupConnector] = useState<"AND" | "OR">("AND")
  // View property drawer
  const [viewDrawer, setViewDrawer] = useState<{ propertyId: string; tab: string } | null>(null)
  const viewDrawerRow = viewDrawer ? rows.find((r) => r.propertyId === viewDrawer.propertyId) ?? null : null
  // Drawers
  const [drawer, setDrawer] = useState<{ type: "prices" | "plans" | "offers"; row: PropertyRow } | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState("")
  // Selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  // Build ordered visible columns
  const orderedColumns = useMemo(
    () =>
      colOrder
        .map((id) => COLUMNS.find((c) => c.id === id)!)
        .filter((c) => c && !hiddenCols.has(c.id)),
    [colOrder, hiddenCols],
  )

  const frozenCols = useMemo(
    () => orderedColumns.filter((c) => frozenColIds.has(c.id)),
    [orderedColumns, frozenColIds],
  )
  const scrollCols = useMemo(
    () => orderedColumns.filter((c) => !frozenColIds.has(c.id)),
    [orderedColumns, frozenColIds],
  )
  const frozenPositions = useMemo(() => {
    const map: Record<string, number> = {}
    let left = 40 // checkbox width
    for (const col of frozenCols) {
      map[col.id] = left
      left += col.width
    }
    return map
  }, [frozenCols])

  // Filtering + sorting
  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase()
    let result = rows.filter((row) => {
      if (availabilityFilter !== "all" && row.availability !== availabilityFilter) return false
      if (saleTypeFilter !== "all" && row.saleType !== saleTypeFilter) return false
      if (entryTypeFilter !== "all" && row.entryType !== entryTypeFilter) return false
      if (listingFilter !== "all" && row.listingStatus !== listingFilter) return false
      if (
        query &&
        ![
          row.propertyId,
          row.detailedPropertyId,
          row.developer.name,
          row.project.name,
          row.project.id,
          row.phase?.name,
          row.unitCode,
          row.unitNumber,
          row.propertyType,
          row.buildingNumber,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      )
        return false
      if (filterGroups.length > 0) {
        const groupResults = filterGroups.map((group) => {
          if (!group.conditions.length) return true
          const cResults = group.conditions.map((cond) => {
            const cv = String((row as any)[cond.column] ?? "").toLowerCase()
            if (cond.operator === "contains") return cv.includes(cond.value.toLowerCase())
            if (cond.operator === "equals") return cv === cond.value.toLowerCase()
            if (cond.operator === "not_contains") return !cv.includes(cond.value.toLowerCase())
            return true
          })
          return group.connector === "AND" ? cResults.every(Boolean) : cResults.some(Boolean)
        })
        const combined =
          groupConnector === "AND" ? groupResults.every(Boolean) : groupResults.some(Boolean)
        if (!combined) return false
      }
      return true
    })
    for (const cfg of sortConfigs) {
      result = [...result].sort((a, b) => {
        const av = getSortValue(a, cfg.column)
        const bv = getSortValue(b, cfg.column)
        const r =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv))
        return cfg.direction === "asc" ? r : -r
      })
    }
    return result
  }, [rows, searchQuery, availabilityFilter, saleTypeFilter, entryTypeFilter, listingFilter, sortConfigs, filterGroups, groupConnector])

  const groupedRows = useMemo(() => {
    if (groupBy === "none") return null
    return filteredRows.reduce<Record<string, PropertyRow[]>>((acc, row) => {
      const key = String(getSortValue(row, groupBy) || "Ungrouped")
      acc[key] = acc[key] ? [...acc[key], row] : [row]
      return acc
    }, {})
  }, [filteredRows, groupBy])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const cardStats = useMemo(
    () =>
      [
        { key: "Launch", label: "Launch Properties" },
        { key: "Primary-Automatic", label: "Primary Automatic" },
        { key: "Primary-Manual", label: "Primary Manual" },
        { key: "Resale", label: "Resale" },
        { key: "Nawy Now", label: "Nawy Now" },
        { key: "Rental", label: "Rentals" },
      ].map(({ key, label }) => {
        const subset =
          key === "Primary-Automatic"
            ? rows.filter((r) => r.saleType === "Primary" && r.entryType === "Automatic")
            : key === "Primary-Manual"
              ? rows.filter((r) => r.saleType === "Primary" && r.entryType === "Manual")
              : rows.filter((r) => r.saleType === key)
        return {
          label,
          listed: subset.filter((r) => r.listingStatus === "Active" && r.availability === "Available").length,
          total: subset.length,
        }
      }),
    [rows],
  )

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const updateRow = (propertyId: string, updates: Partial<PropertyRow>) => {
    setRows((cur) =>
      cur.map((r) =>
        r.propertyId === propertyId
          ? { ...r, ...updates, lastUpdated: new Date().toISOString() }
          : r,
      ),
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? new Set(paginatedRows.map((r) => r.propertyId)) : new Set())
  }

  const handleSelectRow = (id: string, index: number, shiftKey: boolean) => {
    const next = new Set(selectedRows)
    if (shiftKey && lastSelectedIndex !== null) {
      const [s, e] = [Math.min(lastSelectedIndex, index), Math.max(lastSelectedIndex, index)]
      for (let i = s; i <= e; i++) next.add(paginatedRows[i].propertyId)
    } else {
      next.has(id) ? next.delete(id) : next.add(id)
      setLastSelectedIndex(index)
    }
    setSelectedRows(next)
  }

  const toggleSort = (colId: ColId) => {
    setSortConfigs((prev) => {
      const existing = prev.find((s) => s.column === colId)
      if (!existing) return [{ column: colId, direction: "asc" }]
      if (existing.direction === "asc") return [{ column: colId, direction: "desc" }]
      return []
    })
  }

  const hasAnyQuickFilter =
    !!searchQuery ||
    availabilityFilter !== "all" ||
    saleTypeFilter !== "all" ||
    entryTypeFilter !== "all" ||
    listingFilter !== "all"
  const hasAnyFilter = hasAnyQuickFilter || filterGroups.length > 0
  const activeFilterCount = filterGroups.reduce((n, g) => n + g.conditions.length, 0)

  const clearAllFilters = () => {
    setSearchQuery("")
    setAvailabilityFilter("all")
    setSaleTypeFilter("all")
    setEntryTypeFilter("all")
    setListingFilter("all")
    setFilterGroups([])
    setCurrentPage(1)
  }

  const handleColDragOver = (e: React.DragEvent, targetId: ColId) => {
    e.preventDefault()
    if (!draggedColId || draggedColId === targetId) return
    setColOrder((prev) => {
      const next = [...prev]
      const from = next.indexOf(draggedColId)
      const to = next.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      next.splice(from, 1)
      next.splice(to, 0, draggedColId)
      return next
    })
  }

  // ── Cell renderer ────────────────────────────────────────────────────────────
  const renderCell = (row: PropertyRow, column: ColumnDef) => {
    const nil = (v: React.ReactNode) => v ?? <EmptyValue />
    switch (column.id) {
      case "propertyId":
        return (
          <span className="font-mono text-xs font-medium">
            <CopyableText value={row.propertyId} />
          </span>
        )
      case "detailedPropertyId":
        return (
          <span className="font-mono text-xs">
            <CopyableText value={row.detailedPropertyId} />
          </span>
        )
      case "entryType":
        return <StoryBadge value={row.entryType} />
      case "developer":
        return (
          <a
            href={row.developer.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-primary min-w-0 group/devlink"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
              {row.developer.logo}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium underline decoration-transparent group-hover/devlink:decoration-current transition-all">
                {row.developer.name}
              </div>
              <div className="font-mono text-xs">
                <CopyableText value={row.developer.id} muted />
              </div>
            </div>
          </a>
        )
      case "project":
        return (
          <div className="min-w-0">
            <a
              href={row.project.url}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium underline decoration-transparent hover:decoration-current transition-all text-sm"
            >
              {row.project.name}
            </a>
            <div className="font-mono text-xs">
              <CopyableText value={row.project.id} muted />
            </div>
          </div>
        )
      case "phase":
        return row.phase ? (
          <div className="min-w-0">
            <a
              href={row.phase.url}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium underline decoration-transparent hover:decoration-current transition-all text-sm"
            >
              {row.phase.name}
            </a>
            <div className="font-mono text-xs">
              <CopyableText value={row.phase.id} muted />
            </div>
          </div>
        ) : (
          <EmptyValue />
        )
      case "saleType":
        return <StoryBadge value={row.saleType} />
      case "availability":
        return (
          <StoryBadge
            value={row.availability}
            options={availabilityOptions}
            onChange={(v) => updateRow(row.propertyId, { availability: v as Availability })}
          />
        )
      case "listingStatus":
        return (
          <StoryBadge
            value={row.listingStatus}
            options={listingStatusOptions}
            onChange={(v) => updateRow(row.propertyId, { listingStatus: v as ListingStatus })}
          />
        )
      case "unitCode":
        return (
          <span className="font-mono text-xs">
            <CopyableText value={row.unitCode} />
          </span>
        )
      case "propertyCategory":
        return <TagBadge value={row.propertyCategory} />
      case "propertyType":
        return <TagBadge value={row.propertyType} />
      case "propertySubType":
        return <TagBadge value={row.propertySubType} />
      case "finishingType":
        return <TagBadge value={row.finishingType} />
      case "deliveryType":
        return <TagBadge value={row.deliveryType} />
      case "unitView":
        return <TagBadge value={row.unitView} />
      case "unitOrientation":
        return <TagBadge value={row.unitOrientation} />
      case "amenities":
        return (
          <AmenitiesCell
            values={row.amenities}
            allOptions={amenitiesPool}
            type="amenities"
            onUpdate={(vals) => updateRow(row.propertyId, { amenities: vals })}
            onViewInDrawer={() => setViewDrawer({ propertyId: row.propertyId, tab: "amenities" })}
          />
        )
      case "services":
        return (
          <AmenitiesCell
            values={row.services}
            allOptions={servicesPool}
            type="services"
            onUpdate={(vals) => updateRow(row.propertyId, { services: vals })}
            onViewInDrawer={() => setViewDrawer({ propertyId: row.propertyId, tab: "amenities" })}
          />
        )
      case "grossBua":
      case "netBua":
      case "gardenArea":
      case "terraceArea":
      case "landArea":
      case "storageArea":
      case "openRoofArea":
      case "roofAnnexArea":
      case "outdoorArea":
      case "basementArea":
        return nil(formatArea(row[column.id] as number | null))
      case "bedrooms":
      case "bathrooms":
      case "floorNumber":
      case "parkingSlots":
      case "additionalParkingSlots":
        return nil(row[column.id] as number | null)
      case "storagePrice":
      case "outdoorPrice":
        return nil(formatPrice(row[column.id] as number | null))
      case "parking":
      case "storageIncluded":
      case "serviced":
      case "branded":
        return <BooleanMark value={Boolean(row[column.id])} />
      case "finishingLevel":
        return row.finishingType === "Furnished" ? nil(row.finishingLevel) : <EmptyValue />
      case "price":
        if (editingPrice === row.propertyId)
          return (
            <Input
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              onBlur={() => {
                updateRow(row.propertyId, { price: Number(priceDraft.replaceAll(",", "")) || 0 })
                setEditingPrice(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setEditingPrice(null)
              }}
              className="h-7 text-right text-xs tabular-nums"
              autoFocus
            />
          )
        return (
          <button
            className={cn("font-medium hover:text-primary tabular-nums text-right w-full block", !row.price && "text-red-600")}
            onClick={() => {
              setEditingPrice(row.propertyId)
              setPriceDraft(String(row.price ?? 0))
            }}
          >
            {formatPrice(row.price) ?? "0 EGP"}
          </button>
        )
      case "pricePerMeter":
        return row.price && row.grossBua ? (
          <span className="tabular-nums">
            {Math.round(row.price / row.grossBua).toLocaleString()} EGP/m²
          </span>
        ) : (
          <EmptyValue />
        )
      case "paymentOptions":
        return (
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden flex-nowrap">
              {row.priceRecords.length > 1 && (
                <button onClick={() => setDrawer({ type: "prices", row })} className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs bg-white border-border text-gray-700 cursor-pointer hover:bg-muted transition-colors font-medium">
                    {row.priceRecords.length} prices
                  </Badge>
                </button>
              )}
              <button onClick={() => setDrawer({ type: "plans", row })} className="flex-shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs cursor-pointer transition-colors font-medium",
                    row.paymentPlans === 0
                      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-white border-border text-gray-700 hover:bg-muted",
                  )}
                >
                  {row.paymentPlans} plan{row.paymentPlans !== 1 ? "s" : ""}
                </Badge>
              </button>
              {row.offers > 0 && (
                <button onClick={() => setDrawer({ type: "offers", row })} className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-700 cursor-pointer hover:bg-orange-100 transition-colors font-medium">
                    {row.offers} offer{row.offers !== 1 ? "s" : ""}
                  </Badge>
                </button>
              )}
            </div>
            {/* View drawer button — always right-aligned */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewDrawer({ propertyId: row.propertyId, tab: "payment-plans" })}
                  className="flex-shrink-0 h-6 w-6 rounded border border-border bg-white hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View payment options</TooltipContent>
            </Tooltip>
          </div>
        )
      case "floorPlans":
        return (
          <MediaCell
            images={row.floorPlans}
            onUpdate={(imgs) => updateRow(row.propertyId, { floorPlans: imgs })}
          />
        )
      case "images":
        return (
          <MediaCell
            images={row.images}
            onUpdate={(imgs) => updateRow(row.propertyId, { images: imgs })}
          />
        )
      case "createdAt":
        return (
          <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
            {formatTimestamp(row.createdAt)}
          </span>
        )
      case "availabilityUpdatedAt":
        return (
          <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
            {formatTimestamp(row.availabilityUpdatedAt)}
          </span>
        )
      case "lastUpdated":
        return (
          <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
            {formatTimestamp(row.lastUpdated)}
          </span>
        )
      default:
        return nil(row[column.id as keyof PropertyRow] as React.ReactNode)
    }
  }

  // ── Table row renderer ───────────────────────────────────────────────────────
  const renderTableRows = (items: PropertyRow[], offset = 0) =>
    items.map((row, i) => {
      const isSelected = selectedRows.has(row.propertyId)
      const stickyBg = isSelected ? "bg-blue-50" : "bg-card"
      return (
        <div
          key={row.propertyId}
          className={cn(
            "group/row flex min-w-max border-b border-border text-sm",
            isSelected ? "bg-blue-50" : "bg-card hover:bg-muted/40",
          )}
        >
          {/* Checkbox — sticky left-0 */}
          <div
            className={cn(
              "sticky left-0 z-10 flex w-10 shrink-0 items-center justify-center border-r border-border px-2 py-2",
              stickyBg,
            )}
            onClick={(e) => {
              e.stopPropagation()
              handleSelectRow(row.propertyId, offset + i, e.shiftKey)
            }}
          >
            <Checkbox checked={isSelected} onCheckedChange={() => {}} />
          </div>
          {/* Frozen cols — sticky */}
          {frozenCols.map((col) => (
            <div
              key={col.id}
              className={cn(
                "sticky z-10 flex items-center border-r border-border px-3 py-2",
                col.align === "right" && "justify-end text-right",
                col.align === "center" && "justify-center text-center",
                stickyBg,
              )}
              style={{ left: frozenPositions[col.id], width: col.width }}
            >
              {renderCell(row, col)}
            </div>
          ))}
          {/* Scrollable cols */}
          {scrollCols.map((col) => (
            <div
              key={col.id}
              className={cn(
                "flex items-center border-r border-border px-3 py-2",
                col.align === "right" && "justify-end text-right",
                col.align === "center" && "justify-center text-center",
              )}
              style={{ width: col.width }}
            >
              {renderCell(row, col)}
            </div>
          ))}
          {/* Actions — sticky right */}
          <div
            className={cn(
              "sticky right-0 z-10 flex w-12 shrink-0 items-center justify-center border-l border-border py-2",
              stickyBg,
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setViewDrawer({ propertyId: row.propertyId, tab: "unit-details" })}>
                  <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )
    })

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* 6 sale-type cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cardStats.map(({ label, listed, total }) => (
          <SaleTypeCard key={label} label={label} listed={listed} total={total} />
        ))}
      </div>

      {/* Toolbar — flat, no shadow */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        {/* Row 1: search + quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Search properties, projects, unit codes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <ToolbarSelect
            label="Availability"
            value={availabilityFilter}
            values={availabilityOptions}
            onChange={(v) => {
              setAvailabilityFilter(v)
              setCurrentPage(1)
            }}
          />
          <ToolbarSelect
            label="Sale type"
            value={saleTypeFilter}
            values={saleTypes}
            onChange={(v) => {
              setSaleTypeFilter(v)
              setCurrentPage(1)
            }}
          />
          <ToolbarSelect
            label="Entry type"
            value={entryTypeFilter}
            values={entryTypes}
            onChange={(v) => {
              setEntryTypeFilter(v)
              setCurrentPage(1)
            }}
          />
          <ToolbarSelect
            label="Listing"
            value={listingFilter}
            values={listingStatusOptions}
            onChange={(v) => {
              setListingFilter(v)
              setCurrentPage(1)
            }}
          />
        </div>

        {/* Row 2: left = All Filters + Advanced + Clear; right = Sort + Group + Columns */}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAllFilters(true)}>
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              All Filters
            </Button>

            <Popover open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
              <PopoverTrigger asChild>
                <Button
                  variant={filterGroups.length > 0 ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                  Advanced Filter
                  {filterGroups.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[680px] p-4" align="start">
                <AdvancedFilterBuilder
                  columns={COLUMNS}
                  filterGroups={filterGroups}
                  groupConnector={groupConnector}
                  onFilterGroupsChange={setFilterGroups}
                  onConnectorChange={setGroupConnector}
                  onClose={() => setShowAdvancedFilter(false)}
                />
              </PopoverContent>
            </Popover>

            {hasAnyFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort popover */}
            <Popover open={showSortPopover} onOpenChange={setShowSortPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant={sortConfigs.length > 0 ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  Sort
                  {sortConfigs.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {sortConfigs.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Sort by columns</h4>
                    <Button variant="ghost" size="sm" onClick={() => setSortConfigs([])}>
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {sortConfigs.map((cfg, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
                        <span className="text-xs text-muted-foreground w-14 shrink-0">
                          {idx === 0 ? "Sort by" : "Then by"}
                        </span>
                        <Select
                          value={cfg.column}
                          onValueChange={(v) =>
                            setSortConfigs((p) =>
                              p.map((c, i) => (i === idx ? { ...c, column: v as ColId } : c)),
                            )
                          }
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={cfg.direction}
                          onValueChange={(v) =>
                            setSortConfigs((p) =>
                              p.map((c, i) =>
                                i === idx ? { ...c, direction: v as "asc" | "desc" } : c,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setSortConfigs((p) => p.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {sortConfigs.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No sort applied.</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setSortConfigs((p) => [...p, { column: "lastUpdated", direction: "desc" }])
                    }
                    disabled={sortConfigs.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Sort Level
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Group by */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy !== "none" ? "default" : "outline"} size="sm" className="h-8">
                  <Group className="h-3.5 w-3.5 mr-1.5" />
                  Group
                  {groupBy !== "none" && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      1
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy("none")}>No grouping</DropdownMenuItem>
                <DropdownMenuSeparator />
                {(
                  [
                    ["developer", "Developer"],
                    ["project", "Project"],
                    ["phase", "Phase"],
                    ["saleType", "Sale type"],
                    ["availability", "Availability"],
                    ["propertyCategory", "Property category"],
                    ["deliveryType", "Delivery type"],
                  ] as [ColId, string][]
                ).map(([v, l]) => (
                  <DropdownMenuItem key={v} onClick={() => setGroupBy(v)}>
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Columns */}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowColumnSheet(true)}
            >
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Columns
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
        style={{ height: "calc(100vh - 310px)", minHeight: 480 }}
      >
        {/* Table header bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">Properties</span>
            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs px-2">
              {filteredRows.length.toLocaleString()}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Property
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Launch</DropdownMenuItem>
              <DropdownMenuItem>Primary Manual</DropdownMenuItem>
              <DropdownMenuItem>Resale</DropdownMenuItem>
              <DropdownMenuItem>Nawy Now</DropdownMenuItem>
              <DropdownMenuItem>Rental</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Sticky column headers */}
            <div className="sticky top-0 z-20 flex min-w-max border-b border-border bg-muted text-xs font-medium text-muted-foreground">
              {/* Select-all */}
              <div className="sticky left-0 z-30 flex w-10 shrink-0 items-center justify-center border-r border-border bg-muted px-2 py-2">
                <Checkbox
                  checked={
                    paginatedRows.length > 0 &&
                    paginatedRows.every((r) => selectedRows.has(r.propertyId))
                  }
                  onCheckedChange={handleSelectAll}
                />
              </div>
              {/* Frozen col headers */}
              {frozenCols.map((col) => (
                <div
                  key={col.id}
                  className={cn(
                    "sticky z-30 border-r border-border bg-muted px-3 py-2 cursor-grab",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                  style={{ left: frozenPositions[col.id], width: col.width }}
                  draggable
                  onDragStart={() => setDraggedColId(col.id)}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDragEnd={() => setDraggedColId(null)}
                >
                  <button
                    className="flex w-full items-center justify-between transition-colors hover:text-foreground group/sort"
                    onClick={() => toggleSort(col.id)}
                  >
                    <span className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      {col.label}
                    </span>
                    <SortArrows columnId={col.id} sortConfigs={sortConfigs} />
                  </button>
                </div>
              ))}
              {/* Scrollable col headers */}
              {scrollCols.map((col) => (
                <div
                  key={col.id}
                  className={cn(
                    "border-r border-border px-3 py-2 cursor-grab",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                  style={{ width: col.width }}
                  draggable
                  onDragStart={() => setDraggedColId(col.id)}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDragEnd={() => setDraggedColId(null)}
                >
                  <button
                    className="flex w-full items-center justify-between transition-colors hover:text-foreground group/sort"
                    onClick={() => toggleSort(col.id)}
                  >
                    <span className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      {col.label}
                    </span>
                    <SortArrows columnId={col.id} sortConfigs={sortConfigs} />
                  </button>
                </div>
              ))}
              {/* Actions header — sticky right, no label */}
              <div className="sticky right-0 z-30 flex w-12 shrink-0 items-center justify-center border-l border-border bg-muted" />
            </div>

            {/* Body */}
            {groupedRows
              ? Object.entries(groupedRows).map(([group, items]) => {
                  const collapsed = collapsedGroups.has(group)
                  return (
                    <div key={group}>
                      <div
                        className="sticky left-0 z-10 flex cursor-pointer items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2 text-sm font-medium hover:bg-secondary/60"
                        onClick={() =>
                          setCollapsedGroups((p) => {
                            const n = new Set(p)
                            n.has(group) ? n.delete(group) : n.add(group)
                            return n
                          })
                        }
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
                        />
                        {group}
                        <Badge variant="secondary">{items.length}</Badge>
                      </div>
                      {!collapsed && renderTableRows(items)}
                    </div>
                  )
                })
              : renderTableRows(paginatedRows)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <FileDown className="h-4 w-4 mr-1.5" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span>
              {filteredRows.length === 0
                ? "0"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredRows.length)}`}{" "}
              of {filteredRows.length.toLocaleString()} properties
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["10", "25", "50", "100"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs">per page</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1 || !!groupedRows}
                onClick={() => setCurrentPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1 || !!groupedRows}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-1 text-sm">
                Page
                <Input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (v >= 1 && v <= totalPages) setCurrentPage(v)
                  }}
                  className="w-14 h-8 text-center"
                  min={1}
                  max={totalPages}
                  disabled={!!groupedRows}
                />
                of {totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages || !!groupedRows}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages || !!groupedRows}
                onClick={() => setCurrentPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View property drawer */}
      <ViewPropertyDrawer
        row={viewDrawerRow}
        defaultTab={viewDrawer?.tab ?? "unit-details"}
        onClose={() => setViewDrawer(null)}
        onUpdateRow={updateRow}
      />

      {/* Payment options / prices drawer */}
      <PropertyDrawer drawer={drawer} onClose={() => setDrawer(null)} />

      {/* Column customizer sheet — matches advanced-data-grid style */}
      <Sheet open={showColumnSheet} onOpenChange={setShowColumnSheet}>
        <SheetContent className="w-[420px] sm:w-[460px] flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <SheetTitle className="text-base">Customize Columns</SheetTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drag to reorder · toggle visibility · lock to freeze
            </p>
          </SheetHeader>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder="Search columns..."
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
              />
              {colSearch && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setColSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {/* Frozen section */}
            {frozenColIds.size > 0 && !colSearch && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Frozen columns
                </h4>
                {colOrder
                  .filter((id) => frozenColIds.has(id) && !hiddenCols.has(id))
                  .map((colId) => {
                    const col = COLUMNS.find((c) => c.id === colId)!
                    if (!col) return null
                    return (
                      <ColumnSheetRow
                        key={col.id}
                        col={col}
                        isVisible={true}
                        isFrozen={true}
                        isDragging={draggedColId === col.id}
                        onDragStart={() => setDraggedColId(col.id)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (draggedColId && draggedColId !== col.id)
                            handleColDragOver(e, col.id)
                        }}
                        onDragEnd={() => setDraggedColId(null)}
                        onToggleVisibility={() =>
                          setHiddenCols((prev) => {
                            const n = new Set(prev)
                            n.has(col.id) ? n.delete(col.id) : n.add(col.id)
                            return n
                          })
                        }
                        onToggleFreeze={() =>
                          setFrozenColIds((prev) => {
                            const n = new Set(prev)
                            n.has(col.id) ? n.delete(col.id) : n.add(col.id)
                            return n
                          })
                        }
                      />
                    )
                  })}
                <div className="my-3 border-t border-border" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  All columns
                </h4>
              </div>
            )}

            {colOrder
              .filter((colId) => {
                const col = COLUMNS.find((c) => c.id === colId)
                if (!col) return false
                if (colSearch && !col.label.toLowerCase().includes(colSearch.toLowerCase()))
                  return false
                if (!colSearch && frozenColIds.has(colId) && !hiddenCols.has(colId)) return false // already shown above
                return true
              })
              .map((colId) => {
                const col = COLUMNS.find((c) => c.id === colId)!
                if (!col) return null
                const isVisible = !hiddenCols.has(col.id)
                const isFrozen = frozenColIds.has(col.id)
                return (
                  <ColumnSheetRow
                    key={col.id}
                    col={col}
                    isVisible={isVisible}
                    isFrozen={isFrozen}
                    isDragging={draggedColId === col.id}
                    onDragStart={() => setDraggedColId(col.id)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (draggedColId && draggedColId !== col.id) handleColDragOver(e, col.id)
                    }}
                    onDragEnd={() => setDraggedColId(null)}
                    onToggleVisibility={() =>
                      setHiddenCols((prev) => {
                        const n = new Set(prev)
                        n.has(col.id) ? n.delete(col.id) : n.add(col.id)
                        return n
                      })
                    }
                    onToggleFreeze={() =>
                      setFrozenColIds((prev) => {
                        const n = new Set(prev)
                        n.has(col.id) ? n.delete(col.id) : n.add(col.id)
                        return n
                      })
                    }
                  />
                )
              })}
          </div>

          <SheetFooter className="border-t border-border px-6 py-4 flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setHiddenCols(new Set())
                setFrozenColIds(new Set())
                setColOrder(COLUMNS.map((c) => c.id))
                setColSearch("")
              }}
            >
              Reset to default
            </Button>
            <Button className="flex-1" onClick={() => setShowColumnSheet(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* All Filters sheet */}
      <Sheet open={showAllFilters} onOpenChange={setShowAllFilters}>
        <SheetContent className="w-[460px] flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle>All Filters</SheetTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Filter by any column value</p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {[
              {
                label: "Availability",
                values: availabilityOptions,
                state: availabilityFilter,
                setState: setAvailabilityFilter,
              },
              {
                label: "Sale type",
                values: saleTypes,
                state: saleTypeFilter,
                setState: setSaleTypeFilter,
              },
              {
                label: "Entry type",
                values: entryTypes,
                state: entryTypeFilter,
                setState: setEntryTypeFilter,
              },
              {
                label: "Listing status",
                values: listingStatusOptions,
                state: listingFilter,
                setState: setListingFilter,
              },
            ].map(({ label, values, state, setState }) => (
              <div key={label} className="space-y-2">
                <Label className="text-sm font-medium">{label}</Label>
                <Select
                  value={state}
                  onValueChange={(v) => {
                    setState(v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={`All ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {label}</SelectItem>
                    {values.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <SheetFooter className="border-t border-border px-6 py-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                clearAllFilters()
                setShowAllFilters(false)
              }}
            >
              Clear All
            </Button>
            <Button className="flex-1" onClick={() => setShowAllFilters(false)}>
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk actions toast */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-lg bg-foreground px-4 py-3 text-background shadow-lg">
          <span className="font-medium">{selectedRows.size} selected</span>
          <div className="h-4 w-px bg-background/20" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="h-8">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" className="h-8">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-background hover:bg-background/10"
            onClick={() => setSelectedRows(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Column sheet row ───────────────────────────────────────────────────────────
function ColumnSheetRow({
  col,
  isVisible,
  isFrozen,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleVisibility,
  onToggleFreeze,
}: {
  col: ColumnDef
  isVisible: boolean
  isFrozen: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
  onToggleVisibility: () => void
  onToggleFreeze: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors cursor-grab bg-card border-border",
        isDragging && "opacity-40",
        isFrozen && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className={cn("truncate", !isVisible && "text-muted-foreground")}>{col.label}</span>
        {isFrozen && (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10 flex-shrink-0">
            Frozen
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", isFrozen && "text-primary")}
              onClick={onToggleFreeze}
            >
              {isFrozen ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFrozen ? "Unfreeze column" : "Freeze column"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleVisibility}>
              {isVisible ? (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isVisible ? "Hide column" : "Show column"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function AdvancedFilterBuilder({
  columns,
  filterGroups,
  groupConnector,
  onFilterGroupsChange,
  onConnectorChange,
  onClose,
}: {
  columns: ColumnDef[]
  filterGroups: FilterGroup[]
  groupConnector: "AND" | "OR"
  onFilterGroupsChange: (groups: FilterGroup[]) => void
  onConnectorChange: (c: "AND" | "OR") => void
  onClose: () => void
}) {
  const filterableCols = columns.filter(
    (c) => !["floorPlans", "images", "priceRecords", "paymentOptions", "amenities", "services"].includes(c.id),
  )
  const defaultCol = filterableCols[0]?.id ?? "propertyId"

  const addGroup = () =>
    onFilterGroupsChange([
      ...filterGroups,
      {
        id: `g-${Date.now()}`,
        connector: "AND",
        conditions: [{ id: `c-${Date.now()}`, column: defaultCol, operator: "contains", value: "" }],
      },
    ])
  const removeGroup = (gid: string) =>
    onFilterGroupsChange(filterGroups.filter((g) => g.id !== gid))
  const addCondition = (gid: string) =>
    onFilterGroupsChange(
      filterGroups.map((g) =>
        g.id === gid
          ? {
              ...g,
              conditions: [
                ...g.conditions,
                { id: `c-${Date.now()}`, column: defaultCol, operator: "contains", value: "" },
              ],
            }
          : g,
      ),
    )
  const removeCondition = (gid: string, cid: string) =>
    onFilterGroupsChange(
      filterGroups.map((g) =>
        g.id === gid ? { ...g, conditions: g.conditions.filter((c) => c.id !== cid) } : g,
      ),
    )
  const updateCondition = (
    gid: string,
    cid: string,
    updates: Partial<FilterGroup["conditions"][0]>,
  ) =>
    onFilterGroupsChange(
      filterGroups.map((g) =>
        g.id === gid
          ? { ...g, conditions: g.conditions.map((c) => (c.id === cid ? { ...c, ...updates } : c)) }
          : g,
      ),
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Advanced Filter Builder</h4>
        <Button variant="ghost" size="sm" onClick={() => onFilterGroupsChange([])}>
          Clear All
        </Button>
      </div>
      {filterGroups.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground">
          No filter groups. Add one to start.
        </p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {filterGroups.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Groups joined by
              <button
                onClick={() => onConnectorChange(groupConnector === "AND" ? "OR" : "AND")}
                className={cn(
                  "font-semibold px-2.5 py-1 rounded border text-xs transition-colors",
                  groupConnector === "OR"
                    ? "bg-amber-100 text-amber-700 border-amber-300"
                    : "bg-blue-100 text-blue-700 border-blue-300",
                )}
              >
                {groupConnector}
              </button>
              — click to toggle
            </div>
          )}
          {filterGroups.map((group, gi) => (
            <div key={group.id} className="border border-border rounded-lg p-3 space-y-2">
              {gi > 0 && (
                <div className="flex justify-center -mt-5 mb-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      groupConnector === "OR"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-blue-100 text-blue-700 border-blue-200",
                    )}
                  >
                    {groupConnector}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Group {gi + 1}</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={group.connector}
                    onValueChange={(v) =>
                      onFilterGroupsChange(
                        filterGroups.map((g) =>
                          g.id === group.id ? { ...g, connector: v as "AND" | "OR" } : g,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeGroup(group.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {group.conditions.map((cond, ci) => (
                <div key={cond.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">
                    {ci === 0 ? "Where" : group.connector}
                  </span>
                  <Select
                    value={cond.column}
                    onValueChange={(v) => updateCondition(group.id, cond.id, { column: v })}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterableCols.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(group.id, cond.id, { operator: v })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="not_contains">not contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1 h-8 text-xs"
                    value={cond.value}
                    onChange={(e) => updateCondition(group.id, cond.id, { value: e.target.value })}
                    placeholder="value..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeCondition(group.id, cond.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addCondition(group.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Group
        </Button>
        <Button size="sm" onClick={onClose}>
          Apply Filters
        </Button>
      </div>
    </div>
  )
}

function SaleTypeCard({ label, listed, total }: { label: string; listed: number; total: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">
        {listed.toLocaleString()}
        <span className="text-base font-normal text-muted-foreground">/{total.toLocaleString()}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">listed / total</div>
    </div>
  )
}

export function AllPropertiesPage() {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        <div className="px-1 pt-1">
          <p className="text-xs text-muted-foreground mb-1">Properties</p>
          <h1 className="text-2xl font-semibold text-foreground">All Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All Properties View in the inventory, switch between grouped properties on listing and
            detailed properties on E-realty.
          </p>
        </div>
        <Tabs defaultValue="detailed" className="gap-4">
          <TabsList className="bg-card">
            <TabsTrigger value="grouped">Grouped Properties</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Properties</TabsTrigger>
          </TabsList>
          <TabsContent value="grouped" className="mt-0">
            <GroupedPropertiesView />
          </TabsContent>
          <TabsContent value="detailed" className="mt-0">
            <DetailedPropertiesView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ToolbarSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string
  value: string
  values: string[]
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-36">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Amenities / Services Drawer ────────────────────────────────────────────────
function AmenitiesDrawer({
  open,
  onClose,
  type,
  allOptions,
  current,
  onSave,
}: {
  open: boolean
  onClose: () => void
  type: "amenities" | "services"
  allOptions: string[]
  current: string[]
  onSave: (vals: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(current))

  useEffect(() => {
    if (open) setSelected(new Set(current))
  }, [open])

  const toggle = (v: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(v) ? n.delete(v) : n.add(v)
      return n
    })

  const label = type === "amenities" ? "Amenities" : "Services"

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <SheetTitle>{label}</SheetTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select {label.toLowerCase()} available for this unit · {selected.size} selected
          </p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {allOptions.map((opt) => {
              const isSelected = selected.has(opt)
              const Icon = AMENITY_ICONS[opt]
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3.5 text-sm transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:bg-muted/50 text-foreground",
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
                  <span className="flex-1 truncate font-medium">{opt}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 flex gap-2 flex-shrink-0">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onSave(allOptions.filter((o) => selected.has(o)))
              onClose()
            }}
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function PropertyDrawer({
  drawer,
  onClose,
}: {
  drawer: { type: "prices" | "plans" | "offers"; row: PropertyRow } | null
  onClose: () => void
}) {
  const titleMap = { prices: "Price History", plans: "Payment Plans", offers: "Offers" }
  return (
    <Sheet open={!!drawer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[520px] sm:w-[560px]">
        {drawer && (
          <>
            <SheetHeader>
              <SheetTitle>
                {titleMap[drawer.type]} — {drawer.row.propertyId}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {drawer.type === "prices" ? (
                <div className="space-y-2">
                  {drawer.row.priceRecords.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {i === 0 ? "Current price" : `Version ${i}`}
                      </span>
                      <span className="font-medium tabular-nums">{p.toLocaleString()} EGP</span>
                    </div>
                  ))}
                </div>
              ) : drawer.type === "plans" ? (
                <div className="space-y-3">
                  {Array.from({ length: drawer.row.paymentPlans }, (_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Plan {i + 1}</span>
                        <Badge variant="outline">
                          {[5, 10, 15, 20][i % 4]}% down payment
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[36, 48, 60, 84][i % 4]} months installment over{" "}
                        {[3, 4, 5, 7][i % 4]} years
                      </p>
                    </div>
                  ))}
                  {drawer.row.paymentPlans === 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                      No payment plans attached.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: drawer.row.offers }, (_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {["Summer Discount", "Early Bird", "Bundle Deal"][i % 3]}
                        </span>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          {[5, 10, 8][i % 3]}% off
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valid until Q{(i % 4) + 1} 2026
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

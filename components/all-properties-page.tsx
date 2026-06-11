"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowUpDown,
  Baby,
  Bell,
  Building2,
  Bus,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Columns3,
  Copy,
  Dumbbell,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  FileText,
  Film,
  Filter,
  Flame,
  Globe,
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
  User,
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
import { GroupedPropertiesView, type SharedFilterState, type GroupDetailPayload } from "@/components/grouped-properties-page"

// ── Types ──────────────────────────────────────────────────────────────────────
type Availability = "Available" | "Hold" | "Sold-Off" | "Archived"
type ListingStatus = "Active" | "Hidden"
type SaleType = "Launch" | "Primary" | "Resale" | "Nawy Now" | "Rental" | "Financing"
type EntryType = "Automatic" | "Manual"

export interface PropertyRow {
  propertyId: string
  propertyMetadataId: string
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
  source: string | null
  district: string
  area: string
  subarea: string | null
  planType: "Equal" | "Backloaded" | "Frontloaded" | "Cash" | null
  planDuration: string | null
  downpayment: string | null
  monthlyInstallment: string | null
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
export type ColId = keyof PropertyRow | VirtualColId

export interface ColumnDef {
  id: ColId
  label: string
  width: number
  align?: "left" | "right" | "center"
}

interface SortConfig {
  column: string
  direction: "asc" | "desc"
}

interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  conditions: { id: string; column: string; operator: string; value: string }[]
}

// ── Column definitions ─────────────────────────────────────────────────────────
export const COLUMNS: ColumnDef[] = [
  { id: "propertyId", label: "Property ID", width: 150 },
  { id: "propertyMetadataId", label: "Property Metadata ID", width: 185 },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 170 },
  { id: "entryType", label: "Entry type", width: 120 },
  { id: "district", label: "District", width: 130 },
  { id: "area", label: "Area", width: 130 },
  { id: "subarea", label: "Subarea", width: 140 },
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
  { id: "planType", label: "Plan type", width: 140 },
  { id: "planDuration", label: "Plan duration", width: 150 },
  { id: "downpayment", label: "Downpayment", width: 190 },
  { id: "monthlyInstallment", label: "Monthly installment", width: 210 },
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
  { id: "source", label: "Source", width: 150 },
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
export function createRows(): PropertyRow[] {
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
    propertyMetadataId: `PMD-${String(10000 + index).padStart(6, "0")}`,
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
    source: (["Nawy Portal", "Developer Feed", "Manual Entry", "API Sync", null] as (string | null)[])[index % 5],
    district: (["New Cairo", "Sheikh Zayed", "North Coast", "Ain Sokhna", "6th October"])[index % 5],
    area: (["El Shorouk", "Katameya", "Beverly Hills", "Ras El Hekma", "El Gouna"])[index % 5],
    subarea: index % 4 === 0 ? null : (["District A", "Block 5", "Central Hub", "Phase Zone"])[index % 4],
    ...(() => {
      const pt = (["Equal", "Backloaded", "Frontloaded", "Cash"] as const)[index % 4]
      const isCash = pt === "Cash"
      const durYrs = isCash ? null : 4 + (index % 6)
      const durMths = isCash ? null : index % 12
      const downPct = isCash ? null : 10 + (index % 20)
      const downEgp = isCash || !price || !downPct ? null : Math.round(price * downPct / 100)
      const totalMths = durYrs != null ? durYrs * 12 + (durMths ?? 0) : null
      const remPct = downPct != null ? 100 - downPct : null
      const mthPct = remPct != null && totalMths ? Math.round((remPct / totalMths) * 10) / 10 : null
      const mthEgp = price && mthPct ? Math.round(price * mthPct / 100) : null
      return {
        planType: pt,
        planDuration: isCash ? null : durMths ? `${durYrs} Yrs ${durMths} Mth` : `${durYrs} Yrs`,
        downpayment: downPct && downEgp ? `${downPct}% - ${downEgp.toLocaleString()} EGP` : null,
        monthlyInstallment: mthPct && mthEgp ? `${mthPct}% - ${mthEgp.toLocaleString()} EGP` : null,
      }
    })(),
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

/** Icon-only copy button — use when the value text is already rendered separately */
function CopyBtn({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 900)
      }}
      className={cn("rounded p-0.5 hover:bg-secondary transition-colors flex-shrink-0", className)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  )
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
    <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100">
      <Check className="h-3 w-3 text-green-600" />
    </div>
  ) : (
    <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100">
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
  readOnly = false,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
  onReorder: (imgs: string[]) => void
  onRemove: (idx: number) => void
  readOnly?: boolean
}) {
  const [current, setCurrent] = useState(startIndex)
  const [filmDrag, setFilmDrag] = useState<number | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const go = (dir: number) => setCurrent((c) => (c + dir + images.length) % images.length)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.stopPropagation()
      }
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
              draggable={!readOnly}
              onDragStart={readOnly ? undefined : () => setFilmDrag(idx)}
              onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
              onDrop={readOnly ? undefined : (e) => {
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
              onDragEnd={readOnly ? undefined : () => setFilmDrag(null)}
              className={cn(
                "relative flex-shrink-0 cursor-pointer group/film rounded overflow-hidden transition-all",
                current === idx ? "ring-2 ring-white scale-105" : "opacity-60 hover:opacity-100",
                filmDrag === idx && "opacity-30",
              )}
              style={{ width: 72, height: 52 }}
              onClick={() => setCurrent(idx)}
            >
              <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
              {!readOnly && (
                <>
                  <button
                    className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 rounded-full p-0.5 text-white opacity-0 group-hover/film:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setConfirmRemove(idx) }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                  <div className="absolute bottom-0.5 left-0.5">
                    <GripVertical className="h-3 w-3 text-white/50" />
                  </div>
                </>
              )}
            </div>
          ))}
          {!readOnly && (
            <>
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
            </>
          )}
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

  // ordered array of selected lib IDs (for showing order number)
  const libOrder = Array.from(libSelected)

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-xl w-[680px] h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 flex-shrink-0">
          <h3 className="text-base font-semibold">Add Images</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 mt-4 border-b border-border flex-shrink-0">
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

        {/* Body — fixed height, scrollable inside */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "device" ? (
            <div className="space-y-4 h-full">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
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
                <div className="flex gap-2 flex-wrap">
                  {selected.map((f, i) => (
                    <div key={i} className="relative w-20 h-14 rounded overflow-hidden border border-border group flex-shrink-0">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      {/* Order badge */}
                      <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded bg-black/60 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</div>
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
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select images from this project to attach to the unit.
                {libSelected.size > 0 && <span className="ml-1 font-medium text-foreground">{libSelected.size} selected — tap in order you want</span>}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PROJECT_LIBRARY.map((img) => {
                  const sel = libSelected.has(img.id)
                  const order = libOrder.indexOf(img.id) + 1
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
                      <img src={img.url} alt={img.name} className="w-full h-20 object-cover" />
                      <div className={cn(
                        "absolute inset-0 bg-black/0 transition-colors",
                        sel && "bg-primary/10",
                        !sel && "group-hover:bg-black/10",
                      )} />
                      {/* Order badge — top left when selected */}
                      {sel && (
                        <div className="absolute top-1 left-1 h-5 w-5 rounded bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {order}
                        </div>
                      )}
                      {!sel && (
                        <div className="absolute top-1 left-1 h-5 w-5 rounded bg-black/40 text-white/70 text-[10px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
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

// ── Payment Plans types & data ────────────────────────────────────────────────
interface PlanCardData {
  id: string
  name: string
  status: "Active" | "Hidden"
  hasOffer: boolean
  devName: string
  devId: string
  projName: string
  projId: string
  units: number
  available: number
  priceCount: number
  historicalCount: number
  planType: string
  currency: string
  discount: string
  validTill: string
  dp: string
  duration: string
  frequency: string
  instalPct: string
  createdAt: string
  updatedAt: string
  expanded: {
    isCash?: boolean
    priceAfterDiscount?: { original: string; final: string; badge: string } | null
    initialPayments?: Array<{ label: string; pct: string; amt?: string }>
    milestones?: Array<{ name: string; at: string; amt?: string; pct: string }>
    installments?: { pct: string; amt: string; freq: string } | null
    bulks?: Array<{ name: string; at: string; amt?: string; pct: string }>
    attachments?: Array<{ name: string; size: string }>
    conditions?: { andGroups: Array<Array<{ op: "IF" | "OR"; field: string; operator: string; values: string[] }>> }
  }
}
interface PriceGroup { price: number; plans: PlanCardData[] }

const PAYMENT_PLAN_GROUPS: PriceGroup[] = [
  {
    price: 3_500_000,
    plans: [
      {
        id: "50680", name: "Midtown Sky — Equal 8 Years Quarterly", status: "Active", hasOffer: true,
        devName: "G Developments", devId: "DEV-001", projName: "New Giza", projId: "PRJ-220",
        units: 466, available: 312, priceCount: 312, historicalCount: 154,
        planType: "Equal", currency: "EGP", discount: "5%", validTill: "30 Jun 2026",
        dp: "10%", duration: "10 Yrs 6 Ms", frequency: "Quarterly", instalPct: "2.5%",
        createdAt: "12 Jan 2026, 09:30", updatedAt: "18 Apr 2026, 14:15",
        expanded: {
          priceAfterDiscount: { original: "3,675,000 EGP", final: "3,500,000 EGP", badge: "5% Discount" },
          initialPayments: [
            { label: "DP", pct: "10%", amt: "350,000 EGP" }, { label: "Month 1", pct: "2%", amt: "70,000 EGP" },
            { label: "Month 3", pct: "3%", amt: "105,000 EGP" }, { label: "Month 6", pct: "—" },
            { label: "Contractual", pct: "5%", amt: "175,000 EGP" }, { label: "Delivery", pct: "10%", amt: "350,000 EGP" },
          ],
          milestones: [
            { name: "Maintenance", at: "Paid at installment #24", amt: "105,000 EGP", pct: "3%" },
            { name: "Club house", at: "Paid 2 Yrs after contract", amt: "70,000 EGP", pct: "2%" },
          ],
          installments: { pct: "2.5%", amt: "87,500 EGP", freq: "/ Quarter" },
          bulks: [
            { name: "Bulk 1", at: "Paid at installment #10", amt: "175,000 EGP", pct: "5%" },
            { name: "Bulk 2", at: "Paid at installment #14", amt: "175,000 EGP", pct: "5%" },
          ],
          attachments: [{ name: "payment_plan.pdf", size: "2.1 MB" }],
          conditions: { andGroups: [
            [{ op: "IF", field: "Property type", operator: "is any of", values: ["Villa", "Townhouse"] }, { op: "OR", field: "Delivery type", operator: "is", values: ["Ready to move"] }],
            [{ op: "IF", field: "Area (m²)", operator: "≥", values: ["100"] }],
          ]},
        },
      },
      {
        id: "50712", name: "Flash Cash Summer Offer 2026", status: "Active", hasOffer: true,
        devName: "Emaar Misr", devId: "DEV-002", projName: "Marassi", projId: "PRJ-104",
        units: 112, available: 67, priceCount: 89, historicalCount: 23,
        planType: "Cash", currency: "EGP", discount: "12%", validTill: "15 May 2026",
        dp: "—", duration: "—", frequency: "—", instalPct: "—",
        createdAt: "03 Feb 2026, 11:00", updatedAt: "20 Apr 2026, 16:45",
        expanded: {
          isCash: true,
          priceAfterDiscount: { original: "3,977,270 EGP", final: "3,500,000 EGP", badge: "12% Discount" },
          attachments: [{ name: "cash_offer_terms.pdf", size: "1.2 MB" }],
          conditions: { andGroups: [
            [{ op: "IF", field: "Property type", operator: "is any of", values: ["Villa", "Townhouse"] }, { op: "OR", field: "Delivery type", operator: "is", values: ["Ready to move"] }],
            [{ op: "IF", field: "Area (m²)", operator: "≥", values: ["100"] }],
          ]},
        },
      },
    ],
  },
  {
    price: 5_000_000,
    plans: [
      {
        id: "51055", name: "Solana — Equal 10 Years Quarterly", status: "Active", hasOffer: false,
        devName: "Ora Developers", devId: "DEV-007", projName: "Solana", projId: "PRJ-185",
        units: 320, available: 198, priceCount: 220, historicalCount: 85,
        planType: "Equal", currency: "EGP", discount: "—", validTill: "—",
        dp: "10%", duration: "10 Yrs", frequency: "Quarterly", instalPct: "2.25%",
        createdAt: "08 Mar 2026, 10:15", updatedAt: "02 May 2026, 09:30",
        expanded: {
          priceAfterDiscount: null,
          initialPayments: [
            { label: "DP", pct: "10%", amt: "500,000 EGP" }, { label: "Month 3", pct: "5%", amt: "250,000 EGP" },
            { label: "Contractual", pct: "5%", amt: "250,000 EGP" }, { label: "Delivery", pct: "10%", amt: "500,000 EGP" },
          ],
          milestones: [{ name: "Maintenance", at: "Paid at installment #20", amt: "150,000 EGP", pct: "3%" }],
          installments: { pct: "2.25%", amt: "112,500 EGP", freq: "/ Quarter" },
          bulks: [],
          attachments: [{ name: "solana_payment_plan.pdf", size: "1.7 MB" }],
          conditions: { andGroups: [[{ op: "IF", field: "Property type", operator: "is", values: ["Apartment"] }]] },
        },
      },
      {
        id: "51102", name: "Hyde Park — Back Loaded 10 Years Quarterly", status: "Hidden", hasOffer: false,
        devName: "Hyde Park Developments", devId: "DEV-018", projName: "Hyde Park New Cairo", projId: "PRJ-311",
        units: 280, available: 195, priceCount: 210, historicalCount: 70,
        planType: "Backloaded", currency: "EGP", discount: "—", validTill: "—",
        dp: "5%", duration: "12 Yrs", frequency: "Quarterly", instalPct: "4.8%",
        createdAt: "15 Nov 2025, 14:00", updatedAt: "01 Apr 2026, 11:45",
        expanded: {
          priceAfterDiscount: null,
          initialPayments: [
            { label: "DP", pct: "5%", amt: "250,000 EGP" }, { label: "Contractual", pct: "5%", amt: "250,000 EGP" },
            { label: "Delivery", pct: "10%", amt: "500,000 EGP" },
          ],
          milestones: [{ name: "Maintenance", at: "Paid at delivery", amt: "200,000 EGP", pct: "4%" }],
          installments: { pct: "4.8%", amt: "240,000 EGP", freq: "/ Quarter" },
          bulks: [{ name: "Bulk 1", at: "Paid at installment #20", amt: "250,000 EGP", pct: "5%" }],
          attachments: [{ name: "backloaded_plan.pdf", size: "1.8 MB" }],
          conditions: { andGroups: [
            [{ op: "IF", field: "Property type", operator: "is any of", values: ["Villa", "Townhouse"] }, { op: "OR", field: "Delivery type", operator: "is", values: ["Ready to move"] }],
            [{ op: "IF", field: "Area (m²)", operator: "≥", values: ["100"] }],
          ]},
        },
      },
      {
        id: "51230", name: "Mountain View — Investor Premium Package", status: "Active", hasOffer: true,
        devName: "Mountain View", devId: "DEV-011", projName: "iCity October", projId: "PRJ-270",
        units: 540, available: 301, priceCount: 412, historicalCount: 128,
        planType: "Flexible", currency: "EGP", discount: "8%", validTill: "31 Dec 2026",
        dp: "20%", duration: "8 Yrs", frequency: "Semi-Annual", instalPct: "6%",
        createdAt: "01 Jan 2026, 00:00", updatedAt: "10 May 2026, 17:00",
        expanded: {
          priceAfterDiscount: { original: "5,434,782 EGP", final: "5,000,000 EGP", badge: "8% Discount" },
          initialPayments: [
            { label: "DP", pct: "20%", amt: "1,000,000 EGP" }, { label: "Month 6", pct: "5%", amt: "250,000 EGP" },
            { label: "Delivery", pct: "10%", amt: "500,000 EGP" },
          ],
          milestones: [
            { name: "Club Membership", at: "Paid at contract signing", amt: "50,000 EGP", pct: "1%" },
            { name: "Maintenance", at: "Paid at delivery", amt: "150,000 EGP", pct: "3%" },
          ],
          installments: { pct: "6%", amt: "300,000 EGP", freq: "/ Semi-Annual" },
          bulks: [],
          attachments: [{ name: "investor_package.pdf", size: "3.2 MB" }, { name: "payment_schedule.pdf", size: "1.1 MB" }],
          conditions: { andGroups: [[{ op: "IF", field: "Sale type", operator: "is", values: ["Primary"] }]] },
        },
      },
    ],
  },
  {
    price: 6_200_000,
    plans: [
      {
        id: "51445", name: "SODIC Eastown — Exclusive 7 Years Monthly", status: "Active", hasOffer: false,
        devName: "SODIC", devId: "DEV-004", projName: "Eastown Residences", projId: "PRJ-089",
        units: 150, available: 42, priceCount: 95, historicalCount: 38,
        planType: "Equal", currency: "EGP", discount: "3%", validTill: "30 Jun 2026",
        dp: "15%", duration: "7 Yrs", frequency: "Monthly", instalPct: "1.07%",
        createdAt: "20 Dec 2025, 08:00", updatedAt: "05 May 2026, 16:30",
        expanded: {
          priceAfterDiscount: { original: "6,391,752 EGP", final: "6,200,000 EGP", badge: "3% Discount" },
          initialPayments: [
            { label: "DP", pct: "15%", amt: "930,000 EGP" }, { label: "Month 3", pct: "5%", amt: "310,000 EGP" },
            { label: "Contractual", pct: "5%", amt: "310,000 EGP" }, { label: "Delivery", pct: "10%", amt: "620,000 EGP" },
          ],
          milestones: [{ name: "Maintenance", at: "Paid at delivery", amt: "248,000 EGP", pct: "4%" }],
          installments: { pct: "1.07%", amt: "66,340 EGP", freq: "/ Month" },
          bulks: [{ name: "Bulk 1", at: "Paid at installment #36", amt: "310,000 EGP", pct: "5%" }],
          attachments: [{ name: "eastown_exclusive_plan.pdf", size: "2.4 MB" }],
          conditions: { andGroups: [[{ op: "IF", field: "Availability", operator: "is", values: ["Available"] }]] },
        },
      },
    ],
  },
]

function PriceGroup({ group, totalGroups, expandedPlans, setExpandedPlans, readOnly = false }: {
  group: PriceGroup; groupIndex: number; totalGroups: number
  expandedPlans: Set<string>; setExpandedPlans: React.Dispatch<React.SetStateAction<Set<string>>>
  readOnly?: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canDelete = totalGroups > 1
  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold tabular-nums text-foreground whitespace-nowrap">
          {group.price.toLocaleString()} EGP
        </span>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
          {group.plans.length} {group.plans.length === 1 ? "plan" : "plans"}
        </span>
        {/* Delete price button (hidden when read-only) */}
        {!readOnly && (!confirmDelete ? (
          <button
            onClick={() => canDelete && setConfirmDelete(true)}
            title={canDelete ? "Delete price" : "Cannot delete — only one price"}
            className={cn("flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all",
              canDelete ? "text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer" : "text-border cursor-not-allowed opacity-40"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-[6px] flex-shrink-0">
            <span className="text-[11px] text-red-700 font-medium">Delete price?</span>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-[#5A6A85] hover:text-[#0D1B2E] px-1 rounded transition-colors">Cancel</button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-white bg-red-500 hover:bg-red-600 px-1.5 rounded transition-colors font-medium">Delete</button>
          </div>
        ))}
      </div>
      {/* Cards */}
      <div className="flex flex-wrap gap-2.5 items-start">
        {group.plans.map((plan) => (
          <LinkedPlanCard
            key={plan.id}
            plan={plan}
            readOnly={readOnly}
            isExpanded={expandedPlans.has(plan.id)}
            totalInGroup={group.plans.length}
            onToggleExpand={() => setExpandedPlans((prev) => {
              const next = new Set(prev)
              if (next.has(plan.id)) next.delete(plan.id)
              else next.add(plan.id)
              return next
            })}
          />
        ))}
      </div>
    </div>
  )
}

function LinkedPlanCard({ plan, isExpanded, onToggleExpand, totalInGroup, readOnly = false }: { plan: PlanCardData; isExpanded: boolean; onToggleExpand: () => void; totalInGroup: number; readOnly?: boolean }) {
  const [copiedId, setCopiedId] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const copyId = () => {
    navigator.clipboard.writeText(plan.id).catch(() => {})
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 1500)
  }
  const isCashOnly = plan.planType === "Cash"
  const canUnlink = totalInGroup > 1

  return (
    <div className="bg-white border border-border rounded-[10px] w-[320px] min-h-[220px] overflow-hidden flex flex-col hover:shadow-[0_2px_10px_rgba(10,31,68,0.07)] transition-shadow shrink-0">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-[9px] border-b border-border flex flex-col gap-1">
        {/* Name + Actions */}
        <div className="flex items-start justify-between gap-1.5 pb-[7px] border-b border-border">
          <span className="text-[13px] font-semibold text-[#0D1B2E] truncate flex-1 min-w-0" title={plan.name}>{plan.name}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-px">
            <button className="w-[22px] h-[22px] rounded-[4px] border-0 bg-transparent cursor-pointer flex items-center justify-center p-0 text-[#8C9BB5] hover:bg-slate-100 hover:text-[#5A6A85] transition-all" title="View"><Eye className="w-[13px] h-[13px]" /></button>
            {!readOnly && (
              <button
                onClick={() => canUnlink && setConfirmUnlink(true)}
                title={canUnlink ? "Unlink" : "Cannot unlink — only one plan linked"}
                className={cn("w-[22px] h-[22px] rounded-[4px] border-0 bg-transparent flex items-center justify-center p-0 transition-all",
                  canUnlink ? "cursor-pointer text-red-300 hover:bg-red-50 hover:text-red-500" : "cursor-not-allowed text-[#C8D0DC] opacity-40"
                )}
              ><X className="w-3 h-3" /></button>
            )}
          </div>
        </div>
        {/* Unlink confirmation inline */}
        {!readOnly && confirmUnlink && (
          <div className="mt-1 mb-0.5 flex items-center gap-1.5 px-2 py-1.5 bg-red-50 border border-red-200 rounded-[6px]">
            <span className="text-[11px] text-red-700 font-medium flex-1">Unlink this plan?</span>
            <button onClick={() => setConfirmUnlink(false)} className="text-[11px] text-[#5A6A85] hover:text-[#0D1B2E] px-1.5 py-0.5 rounded transition-colors">Cancel</button>
            <button onClick={() => setConfirmUnlink(false)} className="text-[11px] text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors font-medium">Unlink</button>
          </div>
        )}
        {/* ID row */}
        <div className="flex items-center gap-1 justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#8C9BB5] font-mono">{plan.id}</span>
            <button onClick={copyId} className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer text-[#8C9BB5] hover:text-blue-600 flex items-center justify-center p-0 transition-colors" title="Copy ID">
              {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          </div>
          {plan.status === "Active"
            ? <span className="text-[9px] font-semibold text-emerald-600 bg-[#EDFAF4] border border-[#A7F3D0] px-1.5 py-px rounded-full">● Active</span>
            : <span className="text-[9px] font-semibold text-[#8C9BB5] bg-[#F1F3F9] border border-[#E2E8F0] px-1.5 py-px rounded-full">● Hidden</span>}
        </div>
        {/* Dev row */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#5A6A85]">{plan.devName}</span>
          <span className="text-[10px] text-[#8C9BB5] font-mono">{plan.devId}</span>
          {plan.hasOffer && <span className="ml-auto text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-px rounded-full flex-shrink-0">Offer</span>}
        </div>
        {/* Project row */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[#5A6A85] truncate">{plan.projName}</span>
            <span className="text-[10px] text-[#8C9BB5] font-mono flex-shrink-0">{plan.projId}</span>
          </div>
          <div className="relative group/units flex items-center gap-0.5 text-[10px] font-semibold text-[#5A6A85] whitespace-nowrap ml-auto flex-shrink-0">
            {plan.units} units
            <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px] font-bold opacity-70 flex-shrink-0">!</span>
            <div className="hidden group-hover/units:block absolute right-0 top-5 bg-[#0D1B2E] text-white rounded-[6px] px-2.5 py-1.5 text-[11px] whitespace-nowrap z-50 shadow-lg">
              <span className="block leading-[1.75]"><span className="text-emerald-400 font-bold">{plan.available}</span> / {plan.units} Available</span>
              <span className="block leading-[1.75]">{plan.priceCount} Prices</span>
              <span className="block leading-[1.75]">{plan.historicalCount} Historical Prices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="flex flex-col px-3 pt-2.5 pb-2">
        <div className="grid w-full" style={{ gridTemplateColumns: "52px 72px 80px 1fr" }}>
          {[
            { label: "Type", value: plan.planType, type: "text" },
            { label: "Currency", value: plan.currency, type: "text" },
            { label: "Discount", value: plan.discount, type: "disc" },
            { label: "Valid till", value: plan.validTill, type: "vt" },
          ].map(({ label, value, type }) => (
            <div key={label} className="flex flex-col gap-px min-w-0">
              <span className="text-[10px] text-[#8C9BB5] font-medium uppercase whitespace-nowrap">{label}</span>
              {type === "disc" && value !== "—"
                ? <span className="text-[12px] font-semibold text-emerald-600">{value}</span>
                : type === "vt" && value !== "—"
                ? <span className="text-[10px] font-medium text-amber-700">{value}</span>
                : <span className="text-[12px] font-medium text-[#0D1B2E] whitespace-nowrap overflow-hidden text-ellipsis" title={value}>{value}</span>}
            </div>
          ))}
        </div>
        {!isCashOnly && (
          <div className="grid w-full pt-[5px]" style={{ gridTemplateColumns: "52px 72px 80px 1fr" }}>
            {[
              { label: "DP", value: plan.dp },
              { label: "Duration", value: plan.duration },
              { label: "Frequency", value: plan.frequency },
              { label: "Instal %", value: plan.instalPct },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-px min-w-0">
                <span className="text-[10px] text-[#8C9BB5] font-medium uppercase whitespace-nowrap">{label}</span>
                <span className="text-[12px] font-medium text-[#0D1B2E] whitespace-nowrap overflow-hidden text-ellipsis">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timestamps — pushed to bottom */}
      <div className="mt-auto flex items-center gap-3.5 px-3 py-[5px] border-t border-border">
        <span className="text-[10px] text-[#5A6A85] flex items-center gap-1"><span className="font-medium text-[#8C9BB5]">Created</span> {plan.createdAt}</span>
        <span className="text-[10px] text-[#5A6A85] flex items-center gap-1"><span className="font-medium text-[#8C9BB5]">Updated</span> {plan.updatedAt}</span>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 flex items-center justify-between bg-[#F8FAFC] gap-1.5 border-t border-border">
        <div />
        <button onClick={onToggleExpand} className="flex items-center gap-0.5 text-[11px] font-medium text-blue-600 bg-transparent border-0 cursor-pointer px-[5px] py-[3px] rounded-[5px] hover:bg-blue-50 transition-colors">
          Details <ChevronDown className={cn("w-[11px] h-[11px] transition-transform duration-[180ms]", isExpanded && "rotate-180")} />
        </button>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="flex flex-col border-t border-border">
          {/* Price after discount */}
          {plan.expanded.priceAfterDiscount && (
            <div className="px-3 py-[9px] border-b border-border flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">{plan.expanded.isCash ? "Payment" : "Price after discount"}</span>
              <div className="flex flex-col gap-1 px-2.5 py-2 bg-emerald-50 rounded-[5px] border border-[#A7F3D0]">
                <span className="text-[12px] text-[#8C9BB5] line-through">{plan.expanded.priceAfterDiscount.original}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#0D1B2E]">{plan.expanded.priceAfterDiscount.final}</span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-[#A7F3D0] px-1.5 py-px rounded-full">{plan.expanded.priceAfterDiscount.badge}</span>
                </div>
              </div>
            </div>
          )}

          {/* Initial payments */}
          {plan.expanded.initialPayments && plan.expanded.initialPayments.length > 0 && (
            <div className="px-3 py-[9px] border-b border-border flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">Initial payments</span>
              <div className="grid grid-cols-2 gap-1.5">
                {plan.expanded.initialPayments.map((ip) => (
                  <div key={ip.label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#8C9BB5]">{ip.label}</span>
                    <div className="flex flex-col gap-px">
                      <span className="text-[11px] font-medium text-[#0D1B2E]">{ip.pct}</span>
                      {ip.amt && <span className="text-[10px] font-medium text-emerald-600">{ip.amt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {plan.expanded.milestones && plan.expanded.milestones.length > 0 && (
            <div className="px-3 py-[9px] border-b border-border flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">Milestones</span>
              <div className="flex flex-col gap-[3px]">
                {plan.expanded.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-[7px] px-2 py-[5px] bg-[#F8FAFC] rounded-[5px] border border-border">
                    <div className="w-4 h-4 bg-blue-50 text-blue-600 rounded-[3px] text-[9px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-[#0D1B2E]">{m.name}</div>
                      <div className="text-[10px] text-[#8C9BB5] mt-px">{m.at}</div>
                      {m.amt && <div className="text-[10px] text-emerald-600 mt-px font-medium">{m.amt}</div>}
                    </div>
                    <div className="text-[11px] font-semibold text-[#0D1B2E] whitespace-nowrap">{m.pct}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installments */}
          {plan.expanded.installments && (
            <div className="px-3 py-[9px] border-b border-border flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">Installments</span>
              <div className="flex flex-col gap-0 px-2.5 py-[7px] bg-blue-50 rounded-[5px] border border-[#C7D5F8]">
                <div className="flex items-center gap-[5px] py-1">
                  <span className="text-[13px] font-semibold text-blue-600">{plan.expanded.installments.pct}</span>
                  <span className="text-[11px] text-[#8C9BB5]">(</span>
                  <span className="text-[11px] font-medium text-emerald-600">{plan.expanded.installments.amt}</span>
                  <span className="text-[11px] text-[#8C9BB5]">)</span>
                  <span className="text-[11px] text-[#5A6A85] font-medium ml-auto pl-1.5 whitespace-nowrap">{plan.expanded.installments.freq}</span>
                </div>
              </div>
              {plan.expanded.bulks && plan.expanded.bulks.length > 0 && (
                <div className="flex flex-col gap-[3px]">
                  {plan.expanded.bulks.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-[7px] px-2 py-[5px] bg-[#F8FAFC] rounded-[5px] border border-border">
                      <div className="w-4 h-4 bg-blue-50 text-blue-600 rounded-[3px] text-[9px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-[#0D1B2E]">{b.name}</div>
                        <div className="text-[10px] text-[#8C9BB5] mt-px">{b.at}</div>
                        {b.amt && <div className="text-[10px] text-emerald-600 mt-px font-medium">{b.amt}</div>}
                      </div>
                      <div className="text-[11px] font-semibold text-[#0D1B2E] whitespace-nowrap">{b.pct}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {plan.expanded.attachments && plan.expanded.attachments.length > 0 && (
            <div className="px-3 py-[9px] border-b border-border flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">Attachments</span>
              <div className="flex flex-col gap-1.5">
                {plan.expanded.attachments.map((att) => (
                  <div key={att.name} className="flex items-center gap-[7px] px-2 py-1.5 bg-[#F8FAFC] rounded-[6px] border border-border">
                    <div className="w-6 h-6 bg-blue-50 rounded-[5px] flex items-center justify-center flex-shrink-0"><FileText className="w-3 h-3 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-[#0D1B2E] truncate">{att.name}</div>
                      <div className="text-[10px] text-[#8C9BB5]">{att.size}</div>
                    </div>
                    <div className="flex gap-0.5">
                      <button className="w-[22px] h-[22px] rounded-[4px] border-0 bg-transparent cursor-pointer flex items-center justify-center p-0 text-[#8C9BB5] hover:bg-slate-100 hover:text-[#5A6A85] transition-all" title="Download"><FileDown className="w-[11px] h-[11px]" /></button>
                      <button className="w-[22px] h-[22px] rounded-[4px] border-0 bg-transparent cursor-pointer flex items-center justify-center p-0 text-[#8C9BB5] hover:bg-slate-100 hover:text-[#5A6A85] transition-all" title="Open"><Eye className="w-[11px] h-[11px]" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {plan.expanded.conditions && (
            <div className="px-3 py-[9px] flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C9BB5] uppercase tracking-[0.06em]">Conditions</span>
              <div className="flex flex-col gap-1.5">
                {plan.expanded.conditions.andGroups.map((group, gi) => (
                  <div key={gi}>
                    {gi > 0 && (
                      <div className="flex items-center gap-1.5 my-[3px]">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.04em]">AND</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {group.map((rule, ri) => (
                        <div key={ri} className="flex items-start gap-1.5 flex-wrap px-2 py-1.5 bg-[#F8FAFC] rounded-[5px] border border-border">
                          <span className={cn("text-[9px] font-bold text-white rounded-[3px] px-1.5 py-0.5 uppercase tracking-[0.04em] flex-shrink-0 mt-px", rule.op === "IF" ? "bg-blue-600" : "bg-[#7C3AED]")}>{rule.op}</span>
                          <span className="text-[11px] text-[#0D1B2E] font-medium">{rule.field}</span>
                          <span className="text-[11px] text-[#8C9BB5]">{rule.operator}</span>
                          {rule.values.map((v) => <span key={v} className="text-[11px] text-blue-600 font-medium bg-blue-50 rounded-[3px] px-1.5 py-px border border-[#C7D5F8] whitespace-nowrap">{v}</span>)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Media Gallery Tab ─────────────────────────────────────────────────────────
function MediaGalleryTab({
  field, items, label, onUpload, onView, onRemove, onReorder, readOnly = false,
}: {
  field: string; items: string[]; label: string
  onUpload: () => void
  onView: (idx: number) => void
  onRemove: (idx: number) => void
  onReorder: (items: string[]) => void
  readOnly?: boolean
}) {
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDrop = (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) return
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIdx, 0, moved)
    onReorder(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // generate stable dummy IDs per item index
  const imgId = (i: number) => `${field === "images" ? "IMG" : "FLP"}-${String(i + 1).padStart(3, "0")}`

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {items.length} {items.length === 1 ? label : `${label}s`}
        </h4>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={onUpload} className="h-7 text-xs gap-1.5">
            <Plus className="h-3 w-3" />Add {label}s
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <div
          onClick={readOnly ? undefined : onUpload}
          className={cn(
            "rounded-xl border-2 border-dashed border-border p-14 flex flex-col items-center gap-3 transition-colors",
            !readOnly && "cursor-pointer hover:border-primary/40 hover:bg-muted/20",
          )}
        >
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No {label.toLowerCase()}s {readOnly ? "" : "yet — click to upload"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((img, i) => (
            <div
              key={i}
              draggable={!readOnly}
              onDragStart={readOnly ? undefined : () => setDragIndex(i)}
              onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDragOverIndex(i) }}
              onDragEnd={readOnly ? undefined : () => { setDragIndex(null); setDragOverIndex(null) }}
              onDrop={readOnly ? undefined : () => handleDrop(i)}
              className={cn(
                "relative group rounded-lg overflow-hidden border aspect-video transition-all select-none",
                !readOnly && "cursor-grab active:cursor-grabbing",
                dragOverIndex === i && dragIndex !== i ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border hover:border-primary/50",
                dragIndex === i ? "opacity-40" : "opacity-100",
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover pointer-events-none" />

              {/* Order badge — top left */}
              <div className="absolute top-1.5 left-1.5 h-5 min-w-[20px] px-1 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                {i + 1}
              </div>

              {/* Remove button — top right (hidden when read-only) */}
              {!readOnly && (confirmRemove === i ? (
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-md px-1.5 py-1">
                  <span className="text-[10px] text-white/80 font-medium">Remove?</span>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmRemove(null) }} className="text-[10px] text-white/60 hover:text-white transition-colors px-0.5">No</button>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(i); setConfirmRemove(null) }} className="text-[10px] text-red-300 hover:text-red-200 transition-colors font-semibold px-0.5">Yes</button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmRemove(i) }}
                  className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-red-600/90 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-sm"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              ))}

              {/* Image ID + copy — always visible at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/65 to-transparent px-2 pt-4 pb-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/80 font-mono">{imgId(i)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(imgId(i)).catch(() => {}) }}
                    className="w-3.5 h-3.5 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    title="Copy ID"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* Zoom overlay — behind X and ID strip */}
              <div
                onClick={() => confirmRemove === null && onView(i)}
                className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors flex items-center justify-center cursor-pointer"
              >
                <ZoomIn className="h-5 w-5 text-white/0 hover:text-white/70 drop-shadow transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── View Property Drawer ───────────────────────────────────────────────────────
// ── Shared tab panels (used by the unit drawer AND the grouped property details page) ──
// Renders a single tab's content for the given property row. Self-contained state + overlays.
export function PropertyDetailTab({
  tab,
  row,
  onUpdateRow,
  readOnly = false,
}: {
  tab: string
  row: PropertyRow
  onUpdateRow: (id: string, updates: Partial<PropertyRow>) => void
  readOnly?: boolean
}) {
  const [carouselState, setCarouselState] = useState<{ imgs: string[]; idx: number; field: "images" | "floorPlans" } | null>(null)
  const [uploadState, setUploadState] = useState<"images" | "floorPlans" | null>(null)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [auditLogDrawerEntry, setAuditLogDrawerEntry] = useState<{ id: string; action: "Edit" | "Create" | "Delete"; entity: string; label: string; detail: string; user: string; ts: string } | null>(null)
  const [phSort, setPhSort] = useState<{ col: "date" | "price" | "change" | "action" | "user"; dir: "asc" | "desc" }>({ col: "date", dir: "desc" })

  const dummyAuditLogs = [
    { id: "LOG-A8F3C2", action: "Edit" as const, entity: "Properties", label: "Availability changed", detail: "Available → Hold", user: "Sarah M.", ts: formatTimestamp(new Date(Date.now() - 2 * 24 * 3600000).toISOString()) },
    { id: "LOG-B1D7E9", action: "Edit" as const, entity: "Properties", label: "Price updated", detail: `${(row.price ? row.price - 150000 : 0).toLocaleString()} → ${(row.price ?? 0).toLocaleString()} EGP`, user: "Ahmed K.", ts: formatTimestamp(new Date(Date.now() - 5 * 24 * 3600000).toISOString()) },
    { id: "LOG-C4F2A1", action: "Edit" as const, entity: "Properties", label: "Listing status changed", detail: "Hidden → Active", user: "System", ts: formatTimestamp(new Date(Date.now() - 7 * 24 * 3600000).toISOString()) },
    { id: "LOG-D9B5C3", action: "Edit" as const, entity: "Properties", label: "Unit details updated", detail: "Finishing type, floor number", user: "Mariam N.", ts: formatTimestamp(new Date(Date.now() - 14 * 24 * 3600000).toISOString()) },
    { id: "LOG-E2A8F7", action: "Create" as const, entity: "Properties", label: "Property created", detail: `Entry: ${row.entryType}`, user: row.entryType === "Automatic" ? "System" : "Omar F.", ts: formatTimestamp(row.createdAt) },
  ]

  const basePrice = row.price ?? 0
  const dummyPriceHistory = [
    { date: formatTimestamp(new Date(Date.now() - 2 * 24 * 3600000).toISOString()), price: basePrice, change: 150000, action: "Edit" as const, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 10 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice - 150000), change: -250000, action: "Edit" as const, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 25 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice + 100000), change: 100000, action: "Edit" as const, user: "Sara M." },
    { date: formatTimestamp(new Date(Date.now() - 45 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice + 50000), change: null, action: "Create" as const, user: "System" },
    { date: formatTimestamp(new Date(Date.now() - 60 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice - 300000), change: null, action: "Sold Off" as const, user: "Ahmed K." },
  ]

  return (
    <>
      {/* Payment Plans */}
      {tab === "payment-plans" && (
        <div className="p-6 space-y-7">
          {PAYMENT_PLAN_GROUPS.map((group, gi) => (
            <PriceGroup key={gi} group={group} groupIndex={gi} totalGroups={PAYMENT_PLAN_GROUPS.length} expandedPlans={expandedPlans} setExpandedPlans={setExpandedPlans} readOnly={readOnly} />
          ))}
        </div>
      )}

      {/* Images / Gallery */}
      {tab === "images" && (
        <MediaGalleryTab
          field="images"
          items={row.images}
          label="Image"
          readOnly={readOnly}
          onUpload={() => setUploadState("images")}
          onView={(idx) => setCarouselState({ imgs: row.images, idx, field: "images" })}
          onRemove={(idx) => onUpdateRow(row.propertyId, { images: row.images.filter((_, i) => i !== idx) })}
          onReorder={(items) => onUpdateRow(row.propertyId, { images: items })}
        />
      )}

      {/* Floor Plans */}
      {tab === "floor-plans" && (
        <MediaGalleryTab
          field="floorPlans"
          items={row.floorPlans}
          label="Floor Plan"
          readOnly={readOnly}
          onUpload={() => setUploadState("floorPlans")}
          onView={(idx) => setCarouselState({ imgs: row.floorPlans, idx, field: "floorPlans" })}
          onRemove={(idx) => onUpdateRow(row.propertyId, { floorPlans: row.floorPlans.filter((_, i) => i !== idx) })}
          onReorder={(items) => onUpdateRow(row.propertyId, { floorPlans: items })}
        />
      )}

      {/* Entries Logs */}
      {tab === "entries-log" && (
        <div className="p-4 space-y-2.5">
          {[
            { id: "ENT-2026-00814", ts: "14 May 2026, 09:42", createdBy: "Sara Mostafa", status: "Modified" as const },
            { id: "ENT-2026-00791", ts: "11 May 2026, 15:18", createdBy: "Khaled Ibrahim", status: "Unmodified" as const },
            { id: "ENT-2026-00754", ts: "07 May 2026, 11:04", createdBy: "Sara Mostafa", status: "New" as const },
            { id: "ENT-2026-00712", ts: "02 May 2026, 08:55", createdBy: "Ahmed Nour", status: "Returned" as const },
            { id: "ENT-2026-00689", ts: "28 Apr 2026, 16:30", createdBy: "Khaled Ibrahim", status: "Modified" as const },
            { id: "ENT-2026-00651", ts: "23 Apr 2026, 10:12", createdBy: "Sara Mostafa", status: "Missing" as const },
            { id: "ENT-2026-00620", ts: "19 Apr 2026, 13:47", createdBy: "Omar Fathi", status: "Unmodified" as const },
            { id: "ENT-2026-00598", ts: "14 Apr 2026, 09:20", createdBy: "Ahmed Nour", status: "New" as const },
          ].map((entry) => {
            const statusBadge: Record<string, string> = {
              New:        "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400",
              Modified:   "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-400",
              Unmodified: "bg-muted text-muted-foreground border border-border",
              Missing:    "bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/40 dark:text-red-400",
              Returned:   "bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400",
            }
            return (
              <div key={entry.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                <a href={`/entries/${entry.id}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-semibold text-primary hover:underline underline-offset-2 shrink-0 w-36" onClick={(e) => e.stopPropagation()}>
                  {entry.id}
                </a>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 w-24 text-center", statusBadge[entry.status])}>
                  {entry.status}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
                  <User className="h-3 w-3 shrink-0" /><span className="truncate">{entry.createdBy}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-auto">
                  <Clock className="h-3 w-3" />{entry.ts}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Audit Logs */}
      {tab === "activity-log" && (
        <div className="p-4 space-y-2.5">
          {dummyAuditLogs.map((log) => {
            const actionStyle: Record<string, { badge: string; icon: React.ReactNode }> = {
              Create: { badge: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400", icon: <Plus className="h-3 w-3" /> },
              Edit:   { badge: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400",             icon: <Edit className="h-3 w-3" /> },
              Delete: { badge: "bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/40 dark:text-red-400",                  icon: <Trash2 className="h-3 w-3" /> },
            }
            const as = actionStyle[log.action] ?? actionStyle["Edit"]
            return (
              <div key={log.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 group/lid shrink-0">
                  <span className="font-mono text-xs font-semibold text-foreground">{log.id}</span>
                  <CopyBtn value={log.id} className="opacity-0 group-hover/lid:opacity-100 transition-opacity" />
                </span>
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0", as.badge)}>
                  {as.icon}{log.action}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
                  <User className="h-3 w-3 shrink-0" /><span className="truncate">{log.user}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  <Clock className="h-3 w-3" />{log.ts}
                </span>
                <button onClick={(e) => { e.stopPropagation(); setAuditLogDrawerEntry(log) }} className="shrink-0 h-7 w-7 rounded-lg border border-border bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors" title="View log details">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Price History */}
      {tab === "price-history" && (() => {
        type PhCol = "date" | "price" | "change" | "action" | "user"
        const togglePhSort = (col: PhCol) => {
          setPhSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "date" ? "desc" : "asc" }))
        }
        const sorted = [...dummyPriceHistory].sort((a, b) => {
          let cmp = 0
          if (phSort.col === "date")   cmp = a.date.localeCompare(b.date)
          if (phSort.col === "price")  cmp = a.price - b.price
          if (phSort.col === "change") cmp = (a.change ?? 0) - (b.change ?? 0)
          if (phSort.col === "action") cmp = a.action.localeCompare(b.action)
          if (phSort.col === "user")   cmp = a.user.localeCompare(b.user)
          return phSort.dir === "asc" ? cmp : -cmp
        })
        const phActionStyle: Record<string, string> = {
          Create:   "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400",
          Edit:     "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400",
          "Sold Off": "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-400",
        }
        const SortIcon = ({ col }: { col: PhCol }) => (
          phSort.col === col ? <span className="ml-1 inline-block">{phSort.dir === "asc" ? "↑" : "↓"}</span> : <ArrowUpDown className="ml-1 h-3 w-3 inline-block opacity-30" />
        )
        return (
          <div className="p-5">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => togglePhSort("date")}>Date<SortIcon col="date" /></th>
                    <th className="text-right px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => togglePhSort("price")}>Price<SortIcon col="price" /></th>
                    <th className="text-right px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => togglePhSort("change")}>Change<SortIcon col="change" /></th>
                    <th className="text-left px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => togglePhSort("action")}>Action<SortIcon col="action" /></th>
                    <th className="text-left px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => togglePhSort("user")}>Updated by<SortIcon col="user" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((entry, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{entry.date}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-xs">{entry.price.toLocaleString()} <span className="text-muted-foreground font-normal">EGP</span></td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">
                        {entry.change === null ? <span className="text-muted-foreground">—</span> : entry.change > 0 ? <span className="text-green-600 font-medium">+{entry.change.toLocaleString()}</span> : <span className="text-red-600 font-medium">{entry.change.toLocaleString()}</span>}
                      </td>
                      <td className="px-4 py-3"><span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full", phActionStyle[entry.action] ?? "")}>{entry.action}</span></td>
                      <td className="px-4 py-3 text-xs font-medium">{entry.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Carousel */}
      {carouselState && (
        <ImageCarousel
          images={carouselState.imgs}
          startIndex={carouselState.idx}
          readOnly={readOnly}
          onClose={() => setCarouselState(null)}
          onReorder={(imgs) => { onUpdateRow(row.propertyId, { [carouselState.field]: imgs }); setCarouselState((s) => (s ? { ...s, imgs } : null)) }}
          onRemove={(idx) => {
            const next = carouselState.imgs.filter((_, i) => i !== idx)
            onUpdateRow(row.propertyId, { [carouselState.field]: next })
            if (next.length === 0) setCarouselState(null)
            else setCarouselState((s) => (s ? { ...s, imgs: next } : null))
          }}
        />
      )}

      {/* Upload dialog */}
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

      {/* Audit Log detail overlay */}
      {auditLogDrawerEntry && (
        <div className="fixed inset-0 z-[60] flex" onClick={() => setAuditLogDrawerEntry(null)}>
          <div className="flex-1 bg-black/30" />
          <div className="w-[480px] h-full bg-background border-l border-border flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 border-b border-border px-5 pt-5 pb-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Audit Log</p>
                <p className="font-mono text-sm font-bold">{auditLogDrawerEntry.id}</p>
              </div>
              <button onClick={() => setAuditLogDrawerEntry(null)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Action</p>
                  {(() => {
                    const actionStyle: Record<string, { badge: string; icon: React.ReactNode }> = {
                      Create: { badge: "bg-emerald-100 text-emerald-700 border border-emerald-200", icon: <Plus className="h-3 w-3" /> },
                      Edit:   { badge: "bg-blue-100 text-blue-700 border border-blue-200",          icon: <Edit className="h-3 w-3" /> },
                      Delete: { badge: "bg-red-100 text-red-600 border border-red-200",             icon: <Trash2 className="h-3 w-3" /> },
                    }
                    const as = actionStyle[auditLogDrawerEntry.action] ?? actionStyle["Edit"]
                    return <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", as.badge)}>{as.icon}{auditLogDrawerEntry.action}</span>
                  })()}
                </div>
                <div><p className="text-[11px] text-muted-foreground font-medium mb-0.5">Entity</p><p className="text-sm font-medium">{auditLogDrawerEntry.entity}</p></div>
                <div><p className="text-[11px] text-muted-foreground font-medium mb-0.5">Record ID</p><p className="font-mono text-xs font-semibold text-primary">{row.propertyId}</p></div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">User</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><User className="h-3 w-3 text-primary" /></div>
                    <p className="text-sm font-medium">{auditLogDrawerEntry.user}</p>
                  </div>
                </div>
                <div className="col-span-2"><p className="text-[11px] text-muted-foreground font-medium mb-0.5">Timestamp</p><p className="text-sm">{auditLogDrawerEntry.ts}</p></div>
              </div>
              <div className="border-t border-border" />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2">What Changed</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted px-4 py-2 grid grid-cols-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Field</span><span>Before</span><span>After</span>
                  </div>
                  {auditLogDrawerEntry.action === "Create" ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground italic">New record — no previous values.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {auditLogDrawerEntry.label === "Availability changed" && (
                        <div className="px-4 py-2.5 grid grid-cols-3 text-xs"><span className="font-medium text-foreground">Availability</span><span className="text-muted-foreground">Available</span><span className="font-medium text-amber-700">Hold</span></div>
                      )}
                      {auditLogDrawerEntry.label === "Price updated" && (
                        <div className="px-4 py-2.5 grid grid-cols-3 text-xs"><span className="font-medium text-foreground">Price</span><span className="text-muted-foreground">{(row.price ? row.price - 150000 : 0).toLocaleString()} EGP</span><span className="font-medium text-green-700">{(row.price ?? 0).toLocaleString()} EGP</span></div>
                      )}
                      {auditLogDrawerEntry.label === "Listing status changed" && (
                        <div className="px-4 py-2.5 grid grid-cols-3 text-xs"><span className="font-medium text-foreground">Listing Status</span><span className="text-muted-foreground">Hidden</span><span className="font-medium text-green-700">Active</span></div>
                      )}
                      {auditLogDrawerEntry.label === "Unit details updated" && (
                        <>
                          <div className="px-4 py-2.5 grid grid-cols-3 text-xs"><span className="font-medium text-foreground">Finishing Type</span><span className="text-muted-foreground">Standard</span><span className="font-medium">Semi-Finished</span></div>
                          <div className="px-4 py-2.5 grid grid-cols-3 text-xs"><span className="font-medium text-foreground">Floor Number</span><span className="text-muted-foreground">3</span><span className="font-medium">5</span></div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

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
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [auditLogDrawerEntry, setAuditLogDrawerEntry] = useState<{ id: string; action: "Edit" | "Create" | "Delete"; entity: string; label: string; detail: string; user: string; ts: string } | null>(null)
  // price history sort: col + dir
  const [phSort, setPhSort] = useState<{ col: "date" | "price" | "change" | "action" | "user"; dir: "asc" | "desc" }>({ col: "date", dir: "desc" })
  const tabsScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (row) {
      setActiveTab(defaultTab)
      setAmenityDraft([...row.amenities])
      setServiceDraft([...row.services])
      // Always reset media overlays when a new row is loaded — prevents stale state
      setUploadState(null)
      setCarouselState(null)
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
    { id: "entries-log", label: "Entries Logs" },
    { id: "activity-log", label: "Audit Logs" },
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

  const dummyAuditLogs = [
    { id: "LOG-A8F3C2", action: "Edit" as const, entity: "Properties", label: "Availability changed", detail: "Available → Hold", user: "Sarah M.", ts: formatTimestamp(new Date(Date.now() - 2 * 24 * 3600000).toISOString()) },
    { id: "LOG-B1D7E9", action: "Edit" as const, entity: "Properties", label: "Price updated", detail: `${(row.price ? row.price - 150000 : 0).toLocaleString()} → ${(row.price ?? 0).toLocaleString()} EGP`, user: "Ahmed K.", ts: formatTimestamp(new Date(Date.now() - 5 * 24 * 3600000).toISOString()) },
    { id: "LOG-C4F2A1", action: "Edit" as const, entity: "Properties", label: "Listing status changed", detail: "Hidden → Active", user: "System", ts: formatTimestamp(new Date(Date.now() - 7 * 24 * 3600000).toISOString()) },
    { id: "LOG-D9B5C3", action: "Edit" as const, entity: "Properties", label: "Unit details updated", detail: "Finishing type, floor number", user: "Mariam N.", ts: formatTimestamp(new Date(Date.now() - 14 * 24 * 3600000).toISOString()) },
    { id: "LOG-E2A8F7", action: "Create" as const, entity: "Properties", label: "Property created", detail: `Entry: ${row.entryType}`, user: row.entryType === "Automatic" ? "System" : "Omar F.", ts: formatTimestamp(row.createdAt) },
  ]

  const basePrice = row.price ?? 0
  const dummyPriceHistory = [
    { date: formatTimestamp(new Date(Date.now() - 2 * 24 * 3600000).toISOString()), price: basePrice, change: 150000, action: "Edit" as const, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 10 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice - 150000), change: -250000, action: "Edit" as const, user: "Ahmed K." },
    { date: formatTimestamp(new Date(Date.now() - 25 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice + 100000), change: 100000, action: "Edit" as const, user: "Sara M." },
    { date: formatTimestamp(new Date(Date.now() - 45 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice + 50000), change: null, action: "Create" as const, user: "System" },
    { date: formatTimestamp(new Date(Date.now() - 60 * 24 * 3600000).toISOString()), price: Math.max(0, basePrice - 300000), change: null, action: "Sold Off" as const, user: "Ahmed K." },
  ]

  const amenityChanged = JSON.stringify(amenityDraft.sort()) !== JSON.stringify([...row.amenities].sort())
  const serviceChanged = JSON.stringify(serviceDraft.sort()) !== JSON.stringify([...row.services].sort())

  return (
    <>
      <Sheet open={!!row} onOpenChange={(o) => { if (!o && !carouselState && !uploadState) onClose() }}>
        <SheetContent
          side="right"
          className="!w-[720px] !max-w-[93vw] flex flex-col p-0 gap-0 overflow-hidden"
        >
          {/* Quick actions — near the close (X) button */}
          <div className="absolute right-12 top-4 z-20 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.open(`https://www.nawy.com/property/${row.propertyId}`, "_blank", "noopener")}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View on listing website</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.open(`/e-realty/properties/${row.propertyId}`, "_blank", "noopener")}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Building2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View on E-realty platform</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.open(`/properties/grouped/${row.propertyId}`, "_blank", "noopener")}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View and Edit on IMS</TooltipContent>
            </Tooltip>
          </div>

          {/* ── Header */}
          <div className="shrink-0 border-b border-border bg-card px-6 pt-5 pb-4 space-y-3">

            {/* Row 1: Drawer title — Property ID */}
            <div className="flex items-center gap-2 pr-10">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide shrink-0">Property ID</span>
              <h3 className="text-lg font-bold font-mono tracking-wide text-foreground leading-none">{row.propertyId}</h3>
              <CopyBtn value={row.propertyId} />
            </div>

            {/* Row 2: Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <StoryBadge value={row.saleType} />
              <StoryBadge value={row.entryType} />
              <StoryBadge value={row.listingStatus} />
              <StoryBadge value={row.availability} />
            </div>

            {/* Row 3: Developer · Project · Phase */}
            <div className="flex items-start gap-4 flex-wrap">
              {/* Developer */}
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {row.developer.logo}
                </div>
                <div className="flex flex-col leading-snug">
                  <span className="text-sm font-medium text-foreground">{row.developer.name}</span>
                  <span className="text-[11px] text-muted-foreground"><CopyableText value={row.developer.id} muted /></span>
                </div>
              </div>
              <span className="text-muted-foreground/30 mt-1.5">·</span>
              {/* Project */}
              <div className="flex flex-col leading-snug">
                <span className="text-sm font-medium text-foreground">{row.project.name}</span>
                <span className="text-[11px] text-muted-foreground"><CopyableText value={row.project.id} muted /></span>
              </div>
              {/* Phase */}
              {row.phase && (
                <>
                  <span className="text-muted-foreground/30 mt-1.5">·</span>
                  <div className="flex flex-col leading-snug">
                    <span className="text-sm font-medium text-foreground">{row.phase.name}</span>
                    <span className="text-[11px] text-muted-foreground"><CopyableText value={row.phase.id} muted /></span>
                  </div>
                </>
              )}
            </div>

            {/* Property Metadata ID + Detailed Property ID + Unit Code */}
            <div className="flex items-center gap-5 flex-wrap text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Property Metadata ID</span>
                <CopyableText value={row.propertyMetadataId} muted />
              </div>
              {row.detailedPropertyId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Detailed Property ID</span>
                  <CopyableText value={row.detailedPropertyId} muted />
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Unit Code</span>
                <CopyableText value={row.unitCode} muted />
              </div>
            </div>

            {/* Row 4: Property type + Price */}
            <div className="flex items-center justify-between gap-4 pt-0.5">
              <Badge variant="outline" className={cn("text-xs border font-medium", tagColor(row.propertyType))}>
                {row.propertyType}
              </Badge>
              <div className="flex items-center gap-3">
                {row.price ? (
                  <>
                    <span className="text-lg font-bold tabular-nums">
                      {row.price.toLocaleString()}
                      <span className="text-sm font-medium text-muted-foreground ml-1">EGP</span>
                    </span>
                    {pricePerM2 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pricePerM2.toLocaleString()} EGP/m²
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-medium text-red-500">No price set</span>
                )}
              </div>
            </div>

          </div>

          {/* ── Tabs bar with scroll arrows */}
          <div className="shrink-0 border-b border-border bg-card flex items-center">
            <button
              onClick={() => tabsScrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })}
              className="flex-shrink-0 h-full px-2 flex items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r border-border"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div
              ref={tabsScrollRef}
              className="flex-1 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="flex min-w-max">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                      activeTab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => tabsScrollRef.current?.scrollBy({ left: 180, behavior: "smooth" })}
              className="flex-shrink-0 h-full px-2 flex items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l border-border"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* Unit Details */}
            {activeTab === "unit-details" && (
              <div className="p-6 space-y-6">
                <Section title="Identity">
                  {/* Property IDs row */}
                  <Field label="Property ID" value={<CopyableText value={row.propertyId} />} />
                  <Field label="Property Metadata ID" value={<CopyableText value={row.propertyMetadataId} muted />} />
                  {/* Developer + Project on same line */}
                  <Field label="Developer" value={
                    <div className="flex items-center gap-1.5">
                      <span>{row.developer.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono"><CopyableText value={row.developer.id} muted /></span>
                    </div>
                  } />
                  <Field label="Project" value={
                    <div className="flex items-center gap-1.5">
                      <span>{row.project.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono"><CopyableText value={row.project.id} muted /></span>
                    </div>
                  } />
                  {/* Phase under developer/project */}
                  {row.phase && (
                    <Field label="Phase" value={
                      <div className="flex items-center gap-1.5">
                        <span>{row.phase.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono"><CopyableText value={row.phase.id} muted /></span>
                      </div>
                    } span={2} />
                  )}
                  {/* Sale/Entry type above listing/availability */}
                  <Field label="Sale Type" value={<StoryBadge value={row.saleType} />} />
                  <Field label="Entry Type" value={<StoryBadge value={row.entryType} />} />
                  <Field label="Listing Status" value={<StoryBadge value={row.listingStatus} />} />
                  <Field label="Availability" value={<StoryBadge value={row.availability} />} />
                  {/* Detailed Property ID + Unit Code on same line */}
                  <Field label="Detailed Property ID" value={row.detailedPropertyId ? <CopyableText value={row.detailedPropertyId} muted /> : null} />
                  <Field label="Unit Code" value={<CopyableText value={row.unitCode} muted />} />
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
                <Section title="Views & Orientation">
                  <Field label="Unit View" value={<TagBadge value={row.unitView} />} />
                  <Field label="Unit Orientation" value={<TagBadge value={row.unitOrientation} />} />
                </Section>
                <Section title="Timestamps">
                  <div className="col-span-2 flex items-start gap-8 flex-wrap">
                    {[
                      { label: "Created At", value: formatTimestamp(row.createdAt) },
                      { label: "Availability Updated", value: formatTimestamp(row.availabilityUpdatedAt) },
                      { label: "Last Updated", value: formatTimestamp(row.lastUpdated) },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
                        <dd className="text-sm tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* Payment Plans */}
            {/* Shared panels: payment-plans · images · floor-plans · entries-log · activity-log · price-history (view-only here) */}
            <PropertyDetailTab tab={activeTab} row={row} onUpdateRow={onUpdateRow} readOnly />

            {/* Amenities */}
            {activeTab === "amenities" && (
              <div className="p-6 space-y-6">
                {/* Linked Amenities (read-only) */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Amenities ({row.amenities.length})
                  </h4>
                  {row.amenities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No amenities linked.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {row.amenities.map((name) => {
                        const Icon = AMENITY_ICONS[name] ?? Sparkles
                        return (
                          <div key={name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Linked Services (read-only) */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Services ({row.services.length})
                  </h4>
                  {row.services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services linked.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {row.services.map((name) => {
                        const Icon = AMENITY_ICONS[name] ?? Wrench
                        return (
                          <div key={name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}


          </div>


        </SheetContent>
      </Sheet>
    </>
  )
}

interface FilterProps extends SharedFilterState {
  onClearFilters: () => void
  sortConfigs: SortConfig[]
  setSortConfigs: React.Dispatch<React.SetStateAction<SortConfig[]>>
  showColumnSheet: boolean
  setShowColumnSheet: (v: boolean) => void
  filterGroups: FilterGroup[]
  setFilterGroups: React.Dispatch<React.SetStateAction<FilterGroup[]>>
  groupConnector: "AND" | "OR"
  setGroupConnector: React.Dispatch<React.SetStateAction<"AND" | "OR">>
  groupByColumn: string | null
  setGroupByColumn: React.Dispatch<React.SetStateAction<string | null>>
}

// ── EmbeddedPropertyTable — same table used inside grouped property cards ──────
export function EmbeddedPropertyTable({
  rows: initialRows,
  hiddenColumns,
}: {
  rows: PropertyRow[]
  hiddenColumns: ColId[]
}) {
  const [rows, setRows] = useState<PropertyRow[]>(initialRows)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState("")
  const [viewDrawer, setViewDrawer] = useState<{ propertyId: string; tab: string } | null>(null)
  const [drawer, setDrawer] = useState<{ type: "prices" | "plans" | "offers"; row: PropertyRow } | null>(null)
  const [embedSortConfigs, setEmbedSortConfigs] = useState<SortConfig[]>([])

  const updateRow = (id: string, patch: Partial<PropertyRow>) =>
    setRows((prev) => prev.map((r) => (r.propertyId === id ? { ...r, ...patch } : r)))

  const toggleEmbedSort = (colId: ColId) => {
    setEmbedSortConfigs((prev) => {
      const existing = prev.find((s) => s.column === colId)
      if (!existing) return [{ column: colId, direction: "asc" }]
      if (existing.direction === "asc") return [{ column: colId, direction: "desc" }]
      return []
    })
  }

  const sortedRows = useMemo(() => {
    let result = [...rows]
    for (const cfg of embedSortConfigs) {
      result.sort((a, b) => {
        const av = getSortValue(a, cfg.column as ColId)
        const bv = getSortValue(b, cfg.column as ColId)
        if (av < bv) return cfg.direction === "asc" ? -1 : 1
        if (av > bv) return cfg.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return result
  }, [rows, embedSortConfigs])

  const hiddenSet = new Set(hiddenColumns)
  const visibleCols = useMemo(() => {
    const cols = COLUMNS.filter((c) => !hiddenSet.has(c.id))
    // Place unitCode immediately after detailedPropertyId
    const dpIdx = cols.findIndex((c) => c.id === "detailedPropertyId")
    const ucIdx = cols.findIndex((c) => c.id === "unitCode")
    if (dpIdx !== -1 && ucIdx !== -1 && ucIdx !== dpIdx + 1) {
      const [ucCol] = cols.splice(ucIdx, 1)
      cols.splice(dpIdx + 1, 0, ucCol)
    }
    return cols
  }, [hiddenColumns])

  const viewDrawerRow = viewDrawer ? rows.find((r) => r.propertyId === viewDrawer.propertyId) ?? null : null

  // Cell renderer — identical logic to DetailedPropertiesView.renderCell
  const renderCell = (row: PropertyRow, column: ColumnDef): React.ReactNode => {
    const nil = (v: React.ReactNode) => v ?? <EmptyValue />
    switch (column.id) {
      case "propertyId":
        return (
          <span className="inline-flex items-center gap-1 group/pid">
            <a href={`/properties/${row.propertyId}`} target="_blank" rel="noopener noreferrer"
               className="font-mono text-xs font-medium text-primary hover:underline underline-offset-2"
               onClick={(e) => e.stopPropagation()}>
              {row.propertyId}
            </a>
            <CopyBtn value={row.propertyId} className="opacity-0 group-hover/pid:opacity-100 transition-opacity" />
          </span>
        )
      case "propertyMetadataId":
        return <span className="font-mono text-xs"><CopyableText value={row.propertyMetadataId} /></span>
      case "detailedPropertyId":
        return <span className="font-mono text-xs"><CopyableText value={row.detailedPropertyId} /></span>
      case "entryType":
        return <StoryBadge value={row.entryType} />
      case "district":
        return <TagBadge value={row.district} />
      case "area":
        return <TagBadge value={row.area} />
      case "subarea":
        return <TagBadge value={row.subarea} />
      case "planType":
        return row.planType ? <TagBadge value={row.planType} /> : <EmptyValue />
      case "planDuration":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.planDuration)
      case "downpayment":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.downpayment)
      case "monthlyInstallment":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.monthlyInstallment)
      case "source":
        return nil(row.source)
      case "developer":
        return (
          <a href={row.developer.url} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 hover:text-primary min-w-0 group/devlink">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary flex-shrink-0">
              {row.developer.logo}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium underline decoration-transparent group-hover/devlink:decoration-current transition-all">{row.developer.name}</div>
              <div className="font-mono text-xs"><CopyableText value={row.developer.id} muted /></div>
            </div>
          </a>
        )
      case "project":
        return (
          <div className="min-w-0">
            <a href={row.project.url} target="_blank" rel="noreferrer"
               className="truncate font-medium underline decoration-transparent hover:decoration-current transition-all text-sm">
              {row.project.name}
            </a>
            <div className="font-mono text-xs"><CopyableText value={row.project.id} muted /></div>
          </div>
        )
      case "phase":
        return row.phase ? (
          <div className="min-w-0">
            <a href={row.phase.url} target="_blank" rel="noreferrer"
               className="truncate font-medium underline decoration-transparent hover:decoration-current transition-all text-sm">
              {row.phase.name}
            </a>
            <div className="font-mono text-xs"><CopyableText value={row.phase.id} muted /></div>
          </div>
        ) : <EmptyValue />
      case "saleType":
        return <StoryBadge value={row.saleType} />
      case "availability":
        return (
          <StoryBadge value={row.availability} options={availabilityOptions}
            onChange={(v) => updateRow(row.propertyId, { availability: v as Availability })} />
        )
      case "listingStatus":
        return (
          <StoryBadge value={row.listingStatus} options={listingStatusOptions}
            onChange={(v) => updateRow(row.propertyId, { listingStatus: v as ListingStatus })} />
        )
      case "unitCode":
        return <span className="font-mono text-xs"><CopyableText value={row.unitCode} /></span>
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
          <AmenitiesCell values={row.amenities} allOptions={amenitiesPool} type="amenities"
            onUpdate={(vals) => updateRow(row.propertyId, { amenities: vals })}
            onViewInDrawer={() => setViewDrawer({ propertyId: row.propertyId, tab: "amenities" })} />
        )
      case "services":
        return (
          <AmenitiesCell values={row.services} allOptions={servicesPool} type="services"
            onUpdate={(vals) => updateRow(row.propertyId, { services: vals })}
            onViewInDrawer={() => setViewDrawer({ propertyId: row.propertyId, tab: "amenities" })} />
        )
      case "grossBua": case "netBua": case "gardenArea": case "terraceArea": case "landArea":
      case "storageArea": case "openRoofArea": case "roofAnnexArea": case "outdoorArea": case "basementArea":
        return nil(formatArea(row[column.id] as number | null))
      case "bedrooms": case "bathrooms": case "floorNumber": case "parkingSlots": case "additionalParkingSlots":
        return nil(row[column.id] as number | null)
      case "storagePrice": case "outdoorPrice":
        return nil(formatPrice(row[column.id] as number | null))
      case "parking": case "storageIncluded": case "serviced": case "branded":
        return <BooleanMark value={Boolean(row[column.id])} />
      case "finishingLevel":
        return row.finishingType === "Furnished" ? nil(row.finishingLevel) : <EmptyValue />
      case "price":
        if (editingPrice === row.propertyId)
          return (
            <Input value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)}
              onBlur={() => { updateRow(row.propertyId, { price: Number(priceDraft.replaceAll(",", "")) || 0 }); setEditingPrice(null) }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingPrice(null) }}
              className="h-7 text-right text-xs tabular-nums" autoFocus />
          )
        return (
          <button className={cn("font-medium hover:text-primary tabular-nums text-right w-full block", !row.price && "text-red-600")}
            onClick={() => { setEditingPrice(row.propertyId); setPriceDraft(String(row.price ?? 0)) }}>
            {formatPrice(row.price) ?? "0 EGP"}
          </button>
        )
      case "pricePerMeter":
        return row.price && row.netBua
          ? <span className="tabular-nums text-right block">{Math.round(row.price / row.netBua).toLocaleString()} EGP/m²</span>
          : <EmptyValue />
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
        return <MediaCell images={row.floorPlans} onUpdate={(imgs) => updateRow(row.propertyId, { floorPlans: imgs })} />
      case "images":
        return <MediaCell images={row.images} onUpdate={(imgs) => updateRow(row.propertyId, { images: imgs })} />
      case "createdAt":
        return <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">{formatTimestamp(row.createdAt)}</span>
      case "availabilityUpdatedAt":
        return <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">{formatTimestamp(row.availabilityUpdatedAt)}</span>
      case "lastUpdated":
        return <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">{formatTimestamp(row.lastUpdated)}</span>
      default:
        return nil(row[column.id as keyof PropertyRow] as React.ReactNode)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto overscroll-x-contain" style={{ maxHeight: 380 }}>
          <div className="min-w-max">
            {/* Header row */}
            <div className="sticky top-0 z-20 flex border-b border-border bg-muted/80 backdrop-blur-sm">
              {visibleCols.map((col) => (
                <div
                  key={col.id}
                  className={cn(
                    "flex items-center border-r border-border px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap shrink-0",
                    col.align === "right" && "justify-end",
                    col.align === "center" && "justify-center",
                  )}
                  style={{ width: col.width }}
                >
                  <button
                    className="flex w-full items-center justify-between transition-colors hover:text-foreground group/sort"
                    onClick={() => toggleEmbedSort(col.id)}
                  >
                    <span>{col.label}</span>
                    <SortArrows columnId={col.id} sortConfigs={embedSortConfigs} />
                  </button>
                </div>
              ))}
              {/* Actions header */}
              <div className="sticky right-0 z-10 w-12 shrink-0 border-l border-border bg-muted/80" />
            </div>

            {/* Body rows */}
            {sortedRows.map((row) => (
              <div
                key={row.propertyId}
                className="group/row flex border-b border-border last:border-b-0 bg-card hover:bg-muted/40 transition-colors"
                onClick={() => setViewDrawer({ propertyId: row.propertyId, tab: "unit-details" })}
              >
                {visibleCols.map((col) => (
                  <div
                    key={col.id}
                    className={cn(
                      "flex items-center border-r border-border px-3 py-2 text-sm shrink-0",
                      col.align === "right" && "justify-end text-right",
                      col.align === "center" && "justify-center text-center",
                    )}
                    style={{ width: col.width }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderCell(row, col)}
                  </div>
                ))}
                {/* Sticky right action */}
                <div className="sticky right-0 z-10 flex w-12 shrink-0 items-center justify-center border-l border-border bg-card group-hover/row:bg-muted/40 transition-colors">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewDrawer({ propertyId: row.propertyId, tab: "unit-details" }) }}
                        className="h-7 w-7 rounded border border-border bg-white hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View details</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
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

      {/* Mini drawers */}
      <PropertyDrawer drawer={drawer} onClose={() => setDrawer(null)} />
    </>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────
export function DetailedPropertiesView({ filters }: { filters: FilterProps }) {
  const {
    searchQuery,
    developerFilter,
    projectFilter,
    saleTypeFilter,
    availabilityFilter,
    entryTypeFilter,
    listingFilter,
    propertyCategoryFilter,
    propertyTypeFilter,
    propertySubTypeFilter,
    finishingTypeFilter,
    deliveryTypeFilter,
    priceMin,
    priceMax,
    onClearFilters,
    sortConfigs,
    setSortConfigs,
    showColumnSheet,
    setShowColumnSheet,
  } = filters
  const {
    filterGroups,
    setFilterGroups,
    groupConnector,
    setGroupConnector,
    groupByColumn,
    setGroupByColumn,
  } = filters
  const [rows, setRows] = useState<PropertyRow[]>(() => createRows())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  // Column management
  const [colOrder, setColOrder] = useState<ColId[]>(() => COLUMNS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<ColId>>(new Set())
  const [frozenColIds, setFrozenColIds] = useState<Set<ColId>>(new Set())
  const [colSearch, setColSearch] = useState("")
  const [draggedColId, setDraggedColId] = useState<ColId | null>(null)
  // Filter / sort popovers
  const [showSortPopover, setShowSortPopover] = useState(false)
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
    let result = rows.filter((row) => {
      // Search across property ID, detailed property ID, and unit code (OR logic)
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          row.propertyId.toLowerCase().includes(q) ||
          (row.detailedPropertyId ?? "").toLowerCase().includes(q) ||
          row.unitCode.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }
      // Multiselect filters (empty = all)
      if (developerFilter.size > 0 && !developerFilter.has(row.developer.name)) return false
      if (projectFilter.size > 0 && !projectFilter.has(row.project.name)) return false
      if (saleTypeFilter.size > 0 && !saleTypeFilter.has(row.saleType)) return false
      if (availabilityFilter.size > 0 && !availabilityFilter.has(row.availability)) return false
      if (entryTypeFilter.size > 0 && !entryTypeFilter.has(row.entryType)) return false
      if (listingFilter.size > 0 && !listingFilter.has(row.listingStatus)) return false
      if (propertyCategoryFilter.size > 0 && !propertyCategoryFilter.has(row.propertyCategory)) return false
      if (propertyTypeFilter.size > 0 && !propertyTypeFilter.has(row.propertyType)) return false
      if (propertySubTypeFilter.size > 0 && !propertySubTypeFilter.has(row.propertySubType ?? "")) return false
      if (finishingTypeFilter.size > 0 && !finishingTypeFilter.has(row.finishingType)) return false
      if (deliveryTypeFilter.size > 0 && !deliveryTypeFilter.has(row.deliveryType)) return false
      if (priceMin && row.price != null && row.price < Number(priceMin)) return false
      if (priceMax && row.price != null && row.price > Number(priceMax)) return false
      // Advanced filter groups
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
        const combined = groupConnector === "AND" ? groupResults.every(Boolean) : groupResults.some(Boolean)
        if (!combined) return false
      }
      return true
    })
    for (const cfg of sortConfigs) {
      result = [...result].sort((a, b) => {
        const av = getSortValue(a, cfg.column as ColId)
        const bv = getSortValue(b, cfg.column as ColId)
        const r = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        return cfg.direction === "asc" ? r : -r
      })
    }
    return result
  }, [rows, searchQuery, developerFilter, projectFilter, saleTypeFilter, availabilityFilter, entryTypeFilter, listingFilter, propertyCategoryFilter, propertyTypeFilter, propertySubTypeFilter, finishingTypeFilter, deliveryTypeFilter, priceMin, priceMax, sortConfigs, filterGroups, groupConnector])

  const groupedRows = useMemo(() => {
    if (!groupByColumn) return null
    return filteredRows.reduce<Record<string, PropertyRow[]>>((acc, row) => {
      const key = String(getSortValue(row, groupByColumn as ColId) || "Ungrouped")
      acc[key] = acc[key] ? [...acc[key], row] : [row]
      return acc
    }, {})
  }, [filteredRows, groupByColumn])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCollapsedGroups(new Set())
  }, [groupByColumn])

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

  const hasAnyPropsFilter =
    !!searchQuery ||
    developerFilter.size > 0 || projectFilter.size > 0 || saleTypeFilter.size > 0 ||
    availabilityFilter.size > 0 || entryTypeFilter.size > 0 || listingFilter.size > 0 ||
    propertyCategoryFilter.size > 0 || propertyTypeFilter.size > 0 || propertySubTypeFilter.size > 0 ||
    finishingTypeFilter.size > 0 || deliveryTypeFilter.size > 0 || !!priceMin || !!priceMax
  const hasAnyFilter = hasAnyPropsFilter || filterGroups.length > 0
  const activeFilterCount = filterGroups.reduce((n, g) => n + g.conditions.length, 0)

  const clearAllFilters = () => {
    onClearFilters()
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
          <span className="inline-flex items-center gap-1 group/pid">
            <a
              href={`/properties/${row.propertyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs font-medium text-primary hover:underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {row.propertyId}
            </a>
            <CopyBtn value={row.propertyId} className="opacity-0 group-hover/pid:opacity-100 transition-opacity" />
          </span>
        )
      case "propertyMetadataId":
        return (
          <span className="font-mono text-xs">
            <CopyableText value={row.propertyMetadataId} />
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
      case "district":
        return <TagBadge value={row.district} />
      case "area":
        return <TagBadge value={row.area} />
      case "subarea":
        return <TagBadge value={row.subarea} />
      case "planType":
        return row.planType ? <TagBadge value={row.planType} /> : <EmptyValue />
      case "planDuration":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.planDuration)
      case "downpayment":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.downpayment)
      case "monthlyInstallment":
        return row.planType === "Cash" ? <EmptyValue /> : nil(row.monthlyInstallment)
      case "source":
        return nil(row.source)
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
      {/* Table */}
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
        style={{ height: "calc(100vh - 240px)", minHeight: 480 }}
      >
        {/* Table header bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">Properties</span>
            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs px-2">
              {filteredRows.length.toLocaleString()}
            </Badge>
            {groupedRows && (
              <>
                <div className="w-px h-4 bg-border" />
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setCollapsedGroups(new Set(Object.keys(groupedRows)))}>
                  Collapse All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setCollapsedGroups(new Set())}>
                  Expand All
                </Button>
              </>
            )}
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

        {/* Select-all-results banner */}
        {(() => {
          const pageIds = paginatedRows.map((r) => r.propertyId)
          const pageFullySelected = pageIds.length > 0 && pageIds.every((id) => selectedRows.has(id))
          const allResultsSelected =
            filteredRows.length > 0 && filteredRows.every((r) => selectedRows.has(r.propertyId))
          const hasMoreThanPage = filteredRows.length > paginatedRows.length
          if (!pageFullySelected || !hasMoreThanPage) return null
          return (
            <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-blue-50 px-4 py-2 text-xs dark:bg-blue-950/30">
              {allResultsSelected ? (
                <>
                  <span className="text-blue-800 dark:text-blue-200">
                    All <strong>{filteredRows.length.toLocaleString()}</strong> properties across all pages are selected.
                  </span>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                  >
                    Clear selection
                  </button>
                </>
              ) : (
                <>
                  <span className="text-blue-800 dark:text-blue-200">
                    All <strong>{paginatedRows.length}</strong> on this page are selected.
                  </span>
                  <button
                    onClick={() => setSelectedRows(new Set(filteredRows.map((r) => r.propertyId)))}
                    className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                  >
                    Select all {filteredRows.length.toLocaleString()} properties
                  </button>
                </>
              )}
            </div>
          )
        })()}

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

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (() => {
        const selRows = rows.filter(r => selectedRows.has(r.propertyId))
        const allActive = selRows.every(r => r.listingStatus === "Active")

        const handleBulkPublish = () => {
          const next: ListingStatus = allActive ? "Hidden" : "Active"
          selectedRows.forEach(id => updateRow(id, { listingStatus: next }))
        }

        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-zinc-900 text-white rounded-xl shadow-2xl overflow-hidden text-sm select-none">
            {/* Count + select all */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-semibold tabular-nums">{selectedRows.size} selected</span>
              {filteredRows.length > selectedRows.size ? (
                <button
                  onClick={() => setSelectedRows(new Set(filteredRows.map((r) => r.propertyId)))}
                  className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
                >
                  Select all {filteredRows.length.toLocaleString()}
                </button>
              ) : (
                <button
                  onClick={() => setSelectedRows(new Set())}
                  className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="w-px h-8 bg-zinc-700" />

            {/* is Publish */}
            <button
              onClick={handleBulkPublish}
              className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors"
            >
              {allActive
                ? <><EyeOff className="h-3.5 w-3.5 text-zinc-400" /> Hide listing</>
                : <><Eye className="h-3.5 w-3.5 text-zinc-400" /> Publish listing</>
              }
            </button>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors">
                  <FileDown className="h-3.5 w-3.5 text-zinc-400" />
                  Export
                  <ChevronDown className="h-3 w-3 text-zinc-500 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem><FileText className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><FileDown className="h-4 w-4 mr-2" />PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Dismiss */}
            <button
              onClick={() => setSelectedRows(new Set())}
              className="px-3 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })()}

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

// ── FilterDropdown ─────────────────────────────────────────────────────────────
function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
  const isActive = selected.size > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
            isActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground hover:bg-muted",
            className,
          )}
        >
          {label}
          {isActive && (
            <span className={cn(
              "inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-semibold",
              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground",
            )}>
              {selected.size}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <Input
          className="h-7 text-xs mb-2"
          placeholder={`Search ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((opt) => {
            const checked = selected.has(opt)
            return (
              <label
                key={opt}
                className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer hover:bg-muted text-xs"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    const next = new Set(selected)
                    checked ? next.delete(opt) : next.add(opt)
                    onChange(next)
                  }}
                />
                {opt}
              </label>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-1.5 py-2 text-xs text-muted-foreground text-center">No results</p>
          )}
        </div>
        {selected.size > 0 && (
          <button
            className="mt-1.5 w-full text-[11px] text-primary hover:underline text-left px-1.5"
            onClick={() => onChange(new Set())}
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── PriceRangeDropdown ─────────────────────────────────────────────────────────
function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const isActive = !!value && value !== ""
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
            isActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground hover:bg-muted",
            className,
          )}
        >
          {isActive ? value : label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {["All", ...options].map((opt) => {
          const val = opt === "All" ? "" : opt
          const selected = value === val
          return (
            <button
              key={opt}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left",
                selected && "text-primary font-medium",
              )}
              onClick={() => { onChange(val); setOpen(false) }}
            >
              <span className={cn("h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0", selected ? "border-primary bg-primary" : "border-border")}>
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

function PriceRangeDropdown({
  priceMin,
  priceMax,
  onChangeMin,
  onChangeMax,
  className,
}: {
  priceMin: string
  priceMax: string
  onChangeMin: (v: string) => void
  onChangeMax: (v: string) => void
  className?: string
}) {
  const isActive = !!priceMin || !!priceMax
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
            isActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground hover:bg-muted",
            className,
          )}
        >
          Price Range
          {isActive && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-semibold bg-primary-foreground/20 text-primary-foreground">
              1
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Price Range (EGP)</p>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 text-sm"
            placeholder="Min"
            type="number"
            value={priceMin}
            onChange={(e) => onChangeMin(e.target.value)}
          />
          <span className="text-muted-foreground text-sm shrink-0">–</span>
          <Input
            className="h-8 text-sm"
            placeholder="Max"
            type="number"
            value={priceMax}
            onChange={(e) => onChangeMax(e.target.value)}
          />
        </div>
        {isActive && (
          <button
            className="mt-1.5 text-[11px] text-primary hover:underline"
            onClick={() => { onChangeMin(""); onChangeMax("") }}
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── DateRangeDropdown ──────────────────────────────────────────────────────────
function DateRangeDropdown({
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
  className,
}: {
  dateFrom: string
  dateTo: string
  onChangeFrom: (v: string) => void
  onChangeTo: (v: string) => void
  className?: string
}) {
  const isActive = !!dateFrom || !!dateTo
  const label = dateFrom && dateTo
    ? `${dateFrom} – ${dateTo}`
    : dateFrom
    ? `From ${dateFrom}`
    : dateTo
    ? `To ${dateTo}`
    : "Delivery Date"
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap",
            isActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground hover:bg-muted",
            className,
          )}
        >
          {label}
          {isActive && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-semibold bg-primary-foreground/20 text-primary-foreground">
              1
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Delivery Date Range</p>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">From</label>
            <Input className="h-8 text-sm" type="date" value={dateFrom} onChange={(e) => onChangeFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">To</label>
            <Input className="h-8 text-sm" type="date" value={dateTo} onChange={(e) => onChangeTo(e.target.value)} />
          </div>
        </div>
        {isActive && (
          <button
            className="mt-2 text-[11px] text-primary hover:underline"
            onClick={() => { onChangeFrom(""); onChangeTo("") }}
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function AllPropertiesPage({ onOpenGroupDetail }: { onOpenGroupDetail?: (d: GroupDetailPayload) => void } = {}) {
  const allRows = useMemo(() => createRows(), [])

  // ── Shared filter state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [districtFilter, setDistrictFilter] = useState<Set<string>>(new Set())
  const [areaFilter, setAreaFilter] = useState<Set<string>>(new Set())
  const [planTypeFilter, setPlanTypeFilter] = useState<Set<string>>(new Set())
  const [developerFilter, setDeveloperFilter] = useState<Set<string>>(new Set())
  const [projectFilter, setProjectFilter] = useState<Set<string>>(new Set())
  const [saleTypeFilter, setSaleTypeFilter] = useState<Set<string>>(new Set())
  const [availabilityFilter, setAvailabilityFilter] = useState<Set<string>>(new Set())
  const [entryTypeFilter, setEntryTypeFilter] = useState<Set<string>>(new Set())
  const [listingFilter, setListingFilter] = useState<Set<string>>(new Set())
  const [propertyCategoryFilter, setPropertyCategoryFilter] = useState<Set<string>>(new Set())
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<Set<string>>(new Set())
  const [propertySubTypeFilter, setPropertySubTypeFilter] = useState<Set<string>>(new Set())
  const [finishingTypeFilter, setFinishingTypeFilter] = useState<Set<string>>(new Set())
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<Set<string>>(new Set())
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("")
  const [deliveryDateTo, setDeliveryDateTo] = useState("")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [planOfferFilter, setPlanOfferFilter] = useState("")
  // Advanced filter + group state — shared across both tabs
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [groupConnector, setGroupConnector] = useState<"AND" | "OR">("AND")
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)

  const sharedFilters: SharedFilterState = {
    searchQuery,
    districtFilter,
    areaFilter,
    planTypeFilter,
    developerFilter,
    projectFilter,
    saleTypeFilter,
    availabilityFilter,
    entryTypeFilter,
    listingFilter,
    propertyCategoryFilter,
    propertyTypeFilter,
    propertySubTypeFilter,
    finishingTypeFilter,
    deliveryTypeFilter,
    deliveryDateFrom,
    deliveryDateTo,
    priceMin,
    priceMax,
    planOfferFilter,
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setDistrictFilter(new Set())
    setAreaFilter(new Set())
    setPlanTypeFilter(new Set())
    setDeveloperFilter(new Set())
    setProjectFilter(new Set())
    setSaleTypeFilter(new Set())
    setAvailabilityFilter(new Set())
    setEntryTypeFilter(new Set())
    setListingFilter(new Set())
    setPropertyCategoryFilter(new Set())
    setPropertyTypeFilter(new Set())
    setPropertySubTypeFilter(new Set())
    setFinishingTypeFilter(new Set())
    setDeliveryTypeFilter(new Set())
    setDeliveryDateFrom("")
    setDeliveryDateTo("")
    setPriceMin("")
    setPriceMax("")
    setPlanOfferFilter("")
    setFilterGroups([])
    setGroupByColumn(null)
  }

  const hasAnyFilter =
    !!searchQuery ||
    districtFilter.size > 0 || areaFilter.size > 0 || planTypeFilter.size > 0 ||
    developerFilter.size > 0 || projectFilter.size > 0 || saleTypeFilter.size > 0 ||
    availabilityFilter.size > 0 || entryTypeFilter.size > 0 || listingFilter.size > 0 ||
    propertyCategoryFilter.size > 0 || propertyTypeFilter.size > 0 || propertySubTypeFilter.size > 0 ||
    finishingTypeFilter.size > 0 || deliveryTypeFilter.size > 0 ||
    !!deliveryDateFrom || !!deliveryDateTo || !!priceMin || !!priceMax || !!planOfferFilter ||
    filterGroups.length > 0

  // ── Filter options ─────────────────────────────────────────────────────────
  const filterOptions = useMemo(() => ({
    districts:        [...new Set(allRows.map((r) => r.district))].sort(),
    areas:            [...new Set(allRows.map((r) => r.area))].sort(),
    planTypes:        ["Equal", "Backloaded", "Frontloaded", "Cash"],
    developers:       [...new Set(allRows.map((r) => r.developer.name))].sort(),
    projects:         [...new Set(allRows.map((r) => r.project.name))].sort(),
    saleTypes:        saleTypes as string[],
    availability:     availabilityOptions as string[],
    entryTypes:       entryTypes as string[],
    listingStatuses:  listingStatusOptions as string[],
    categories:       [...new Set(allRows.map((r) => r.propertyCategory))].sort(),
    propertyTypes:    [...new Set(allRows.map((r) => r.propertyType))].sort(),
    propertySubTypes: [...new Set(allRows.map((r) => r.propertySubType).filter(Boolean))].sort() as string[],
    finishingTypes:   [...new Set(allRows.map((r) => r.finishingType))].sort(),
    deliveryTypes:    [...new Set(allRows.map((r) => r.deliveryType))].sort(),
  }), [allRows])

  // ── Card stats ─────────────────────────────────────────────────────────────
  const cardStats = useMemo(
    () =>
      [
        { key: "Launch",           label: "Launch Properties" },
        { key: "Primary-Automatic",label: "Primary Automatic" },
        { key: "Primary-Manual",   label: "Primary Manual" },
        { key: "Resale",           label: "Resale" },
        { key: "Nawy Now",         label: "Nawy Now" },
        { key: "Rental",           label: "Rentals" },
      ].map(({ key, label }) => {
        const subset =
          key === "Primary-Automatic" ? allRows.filter((r) => r.saleType === "Primary" && r.entryType === "Automatic")
          : key === "Primary-Manual"  ? allRows.filter((r) => r.saleType === "Primary" && r.entryType === "Manual")
          : allRows.filter((r) => r.saleType === key)
        return {
          label,
          listed: subset.filter((r) => r.listingStatus === "Active" && r.availability === "Available").length,
          total: subset.length,
        }
      }),
    [allRows],
  )

  const [showAllFilters, setShowAllFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("detailed")
  // Sort state — shared across both tabs
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [draggedSortIndex, setDraggedSortIndex] = useState<number | null>(null)
  // Columns sheet — lifted from DetailedPropertiesView so toolbar button can open it
  const [showColumnSheet, setShowColumnSheet] = useState(false)

  const handleSortDragStart = (index: number) => setDraggedSortIndex(index)
  const handleSortDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedSortIndex === null || draggedSortIndex === targetIndex) return
    setSortConfigs((prev) => {
      const next = [...prev]
      const [removed] = next.splice(draggedSortIndex, 1)
      next.splice(targetIndex, 0, removed)
      setDraggedSortIndex(targetIndex)
      return next
    })
  }
  const handleSortDragEnd = () => setDraggedSortIndex(null)

  // Sortable columns per tab
  const DETAILED_SORT_COLS = COLUMNS.filter((c) =>
    ["developer","project","district","area","saleType","availability","listingStatus","entryType",
     "propertyType","finishingType","deliveryDate","price","bedrooms","bathrooms","netBua","grossBua","createdAt","lastUpdated"].includes(c.id)
  )
  const GROUPED_SORT_COLS = [
    { id: "developer",      label: "Developer" },
    { id: "project",        label: "Project" },
    { id: "priceMin",       label: "Price Min" },
    { id: "priceMax",       label: "Price Max" },
    { id: "areaMin",        label: "Area Min" },
    { id: "availableUnits", label: "Available Units" },
    { id: "totalUnits",     label: "Total Units" },
    { id: "bedroom",        label: "Bedrooms" },
    { id: "deliveryDate",   label: "Delivery Date" },
    { id: "createdAt",      label: "Created At" },
  ]
  const activeSortCols = activeTab === "grouped" ? GROUPED_SORT_COLS : DETAILED_SORT_COLS

  const GROUP_COLS = [
    { id: "developer",         label: "Developer" },
    { id: "project",           label: "Project" },
    { id: "district",          label: "District" },
    { id: "area",              label: "Area" },
    { id: "saleType",          label: "Sale Type" },
    { id: "availability",      label: "Availability" },
    { id: "entryType",         label: "Entry Type" },
    { id: "listingStatus",     label: "Listing Status" },
    { id: "propertyCategory",  label: "Property Category" },
    { id: "propertyType",      label: "Property Type" },
    { id: "propertySubType",   label: "Property Subtype" },
    { id: "finishingType",     label: "Finishing Type" },
    { id: "deliveryType",      label: "Delivery Type" },
  ]
  const activeGroupCols = GROUP_COLS

  const filterPropsWithClear: FilterProps = {
    ...sharedFilters,
    onClearFilters: clearAllFilters,
    sortConfigs,
    setSortConfigs,
    showColumnSheet,
    setShowColumnSheet,
    filterGroups,
    setFilterGroups,
    groupConnector,
    setGroupConnector,
    groupByColumn,
    setGroupByColumn,
  }

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

        <Tabs defaultValue="detailed" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="bg-card">
            <TabsTrigger value="grouped">Grouped Properties</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Properties</TabsTrigger>
          </TabsList>

          {/* ── Shared section: analytics cards + filter bar ── */}
          <div className="space-y-3">
            {/* Analytics cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {cardStats.map(({ label, listed, total }) => (
                <SaleTypeCard key={label} label={label} listed={listed} total={total} />
              ))}
            </div>

            {/* Unified toolbar card */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
              {/* Row 1: Search (420px fixed) + 8 primary filters sharing remaining space */}
              <div className="flex items-center gap-2">
                <div className="relative shrink-0 w-[420px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    className="h-8 pl-8 pr-7 w-full text-sm"
                    placeholder={activeTab === "grouped" ? "Search by Property ID, Metadata ID" : "Search by Property ID, Detailed Property ID, Unit Code"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-1 gap-2">
                  <FilterDropdown label="District"       options={filterOptions.districts}       selected={districtFilter}      onChange={setDistrictFilter}      className="flex-1" />
                  <FilterDropdown label="Area"           options={filterOptions.areas}           selected={areaFilter}          onChange={setAreaFilter}          className="flex-1" />
                  <FilterDropdown label="Developer"      options={filterOptions.developers}      selected={developerFilter}     onChange={setDeveloperFilter}     className="flex-1" />
                  <FilterDropdown label="Project"        options={filterOptions.projects}        selected={projectFilter}       onChange={setProjectFilter}       className="flex-1" />
                  <FilterDropdown label="Sale Type"      options={filterOptions.saleTypes}       selected={saleTypeFilter}      onChange={setSaleTypeFilter}      className="flex-1" />
                  <FilterDropdown label="Status"         options={filterOptions.availability}    selected={availabilityFilter}  onChange={setAvailabilityFilter}  className="flex-1" />
                  <FilterDropdown label="Entry Type"     options={filterOptions.entryTypes}      selected={entryTypeFilter}     onChange={setEntryTypeFilter}     className="flex-1" />
                  <FilterDropdown label="Listing Status" options={filterOptions.listingStatuses} selected={listingFilter}       onChange={setListingFilter}       className="flex-1" />
                </div>
              </div>

              {/* Row 2: full width, 9 secondary filters */}
              <div className="flex items-center gap-2">
                <FilterDropdown label="Property Category" options={filterOptions.categories}       selected={propertyCategoryFilter} onChange={setPropertyCategoryFilter} className="flex-1" />
                <FilterDropdown label="Property Type"     options={filterOptions.propertyTypes}    selected={propertyTypeFilter}     onChange={setPropertyTypeFilter}     className="flex-1" />
                <FilterDropdown label="Property Subtype"  options={filterOptions.propertySubTypes} selected={propertySubTypeFilter}  onChange={setPropertySubTypeFilter}  className="flex-1" />
                <FilterDropdown label="Finishing Type"    options={filterOptions.finishingTypes}   selected={finishingTypeFilter}    onChange={setFinishingTypeFilter}    className="flex-1" />
                <FilterDropdown label="Delivery Type"     options={filterOptions.deliveryTypes}    selected={deliveryTypeFilter}     onChange={setDeliveryTypeFilter}     className="flex-1" />
                <DateRangeDropdown dateFrom={deliveryDateFrom} dateTo={deliveryDateTo} onChangeFrom={setDeliveryDateFrom} onChangeTo={setDeliveryDateTo} className="flex-1" />
                <PriceRangeDropdown priceMin={priceMin} priceMax={priceMax} onChangeMin={setPriceMin} onChangeMax={setPriceMax} className="flex-1" />
                <FilterDropdown label="Plan Type"  options={filterOptions.planTypes} selected={planTypeFilter} onChange={setPlanTypeFilter} className="flex-1" />
                <SingleSelectDropdown label="Plan Offer" options={["Offer", "No Offer"]} value={planOfferFilter} onChange={setPlanOfferFilter} className="flex-1" />
              </div>

              {/* Row 2: All Filters + Advanced + Clear | Sort + Group + Columns */}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={hasAnyFilter ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => setShowAllFilters(true)}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    All Filters
                    {hasAnyFilter && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        {[districtFilter, areaFilter, planTypeFilter, developerFilter, projectFilter, saleTypeFilter, availabilityFilter, entryTypeFilter, listingFilter, propertyCategoryFilter, propertyTypeFilter, propertySubTypeFilter, finishingTypeFilter, deliveryTypeFilter].reduce((n, s) => n + s.size, 0) + (priceMin || priceMax ? 1 : 0) + (deliveryDateFrom || deliveryDateTo ? 1 : 0) + (planOfferFilter ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                  <Popover open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
                    <PopoverTrigger asChild>
                      <Button variant={filterGroups.length > 0 ? "default" : "outline"} size="sm" className="h-8">
                        <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                        Advanced Filter
                        {filterGroups.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                            {filterGroups.reduce((acc, g) => acc + g.conditions.length, 0)}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[700px] p-4" align="start">
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
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort popover */}
                  <Popover open={showSortPopover} onOpenChange={setShowSortPopover}>
                    <PopoverTrigger asChild>
                      <Button variant={sortConfigs.length > 0 ? "default" : "outline"} size="sm" className="h-8">
                        <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                        Sort
                        {sortConfigs.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{sortConfigs.length}</Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-4" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Sort by multiple columns</h4>
                          {sortConfigs.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSortConfigs([])}>Clear all</Button>
                          )}
                        </div>
                        {sortConfigs.length > 0 && (
                          <p className="text-xs text-muted-foreground -mt-2">Drag to reorder priority.</p>
                        )}
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {sortConfigs.map((cfg, i) => (
                            <div
                              key={i}
                              draggable
                              onDragStart={() => handleSortDragStart(i)}
                              onDragOver={(e) => handleSortDragOver(e, i)}
                              onDragEnd={handleSortDragEnd}
                              className={cn("flex items-center gap-2 p-2.5 bg-secondary/40 rounded-lg cursor-default", draggedSortIndex === i && "opacity-40")}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                              <span className="text-xs text-muted-foreground w-14 shrink-0">{i === 0 ? "Sort by" : "Then by"}</span>
                              <Select value={cfg.column} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, idx) => idx === i ? { ...c, column: v } : c))}>
                                <SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                                <SelectContent>
                                  {activeSortCols.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select value={cfg.direction} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, idx) => idx === i ? { ...c, direction: v as "asc" | "desc" } : c))}>
                                <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                                  <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSortConfigs((prev) => prev.filter((_, idx) => idx !== i))}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {sortConfigs.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground py-3">No sort applied. Add a level below.</p>
                          )}
                        </div>
                        <Button
                          variant="outline" size="sm" className="w-full h-8"
                          disabled={sortConfigs.length >= 5}
                          onClick={() => setSortConfigs((prev) => [...prev, { column: activeSortCols[0]?.id ?? "", direction: "asc" }])}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />Add sort level
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Group — available in both tabs */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={groupByColumn ? "default" : "outline"} size="sm" className="h-8">
                        <Group className="h-3.5 w-3.5 mr-1.5" />
                        Group
                        {groupByColumn && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                            {activeGroupCols.find((c) => c.id === groupByColumn)?.label ?? groupByColumn}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setGroupByColumn(null)}>No Grouping</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {activeGroupCols.map((opt) => (
                        <DropdownMenuItem key={opt.id} onClick={() => setGroupByColumn(opt.id)}>
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {activeTab === "detailed" && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setShowColumnSheet(true)}>
                      <Columns3 className="h-3.5 w-3.5 mr-1.5" />
                      Columns
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* All Filters drawer — synced with the filter dropdowns above */}
            <Sheet open={showAllFilters} onOpenChange={setShowAllFilters}>
              <SheetContent className="w-[420px] flex flex-col p-0">
                <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
                  <div className="flex items-center justify-between">
                    <SheetTitle>All Filters</SheetTitle>
                    {hasAnyFilter && (
                      <Badge variant="secondary" className="text-[11px]">
                        {[districtFilter, areaFilter, planTypeFilter, developerFilter, projectFilter, saleTypeFilter, availabilityFilter, entryTypeFilter, listingFilter, propertyCategoryFilter, propertyTypeFilter, propertySubTypeFilter, finishingTypeFilter, deliveryTypeFilter].reduce((n, s) => n + s.size, 0) + (priceMin || priceMax ? 1 : 0) + (deliveryDateFrom || deliveryDateTo ? 1 : 0) + (planOfferFilter ? 1 : 0)} active
                      </Badge>
                    )}
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {(
                    [
                      { label: "District",           filter: districtFilter,           setFilter: setDistrictFilter,           options: filterOptions.districts },
                      { label: "Area",               filter: areaFilter,               setFilter: setAreaFilter,               options: filterOptions.areas },
                      { label: "Developer",          filter: developerFilter,          setFilter: setDeveloperFilter,          options: filterOptions.developers },
                      { label: "Project",            filter: projectFilter,            setFilter: setProjectFilter,            options: filterOptions.projects },
                      { label: "Sale Type",          filter: saleTypeFilter,           setFilter: setSaleTypeFilter,           options: filterOptions.saleTypes },
                      { label: "Status",             filter: availabilityFilter,       setFilter: setAvailabilityFilter,       options: filterOptions.availability },
                      { label: "Entry Type",         filter: entryTypeFilter,          setFilter: setEntryTypeFilter,          options: filterOptions.entryTypes },
                      { label: "Listing Status",     filter: listingFilter,            setFilter: setListingFilter,            options: filterOptions.listingStatuses },
                      { label: "Property Category",  filter: propertyCategoryFilter,   setFilter: setPropertyCategoryFilter,   options: filterOptions.categories },
                      { label: "Property Type",      filter: propertyTypeFilter,       setFilter: setPropertyTypeFilter,       options: filterOptions.propertyTypes },
                      { label: "Property Subtype",   filter: propertySubTypeFilter,    setFilter: setPropertySubTypeFilter,    options: filterOptions.propertySubTypes },
                      { label: "Finishing Type",     filter: finishingTypeFilter,      setFilter: setFinishingTypeFilter,      options: filterOptions.finishingTypes },
                      { label: "Delivery Type",      filter: deliveryTypeFilter,       setFilter: setDeliveryTypeFilter,       options: filterOptions.deliveryTypes },
                      { label: "Plan Type",          filter: planTypeFilter,           setFilter: setPlanTypeFilter,           options: filterOptions.planTypes },
                    ] as { label: string; filter: Set<string>; setFilter: (s: Set<string>) => void; options: string[] }[]
                  ).map(({ label, filter, setFilter, options }) => (
                    <div key={label} className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <FilterDropdown label={label} options={options} selected={filter} onChange={setFilter} className="w-full justify-between" />
                      {filter.size > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[...filter].map((v) => (
                            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                              {v}
                              <button onClick={() => { const s = new Set(filter); s.delete(v); setFilter(s) }} className="hover:text-primary/60">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Plan Offer — single select */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Plan Offer</p>
                    <SingleSelectDropdown label="Plan Offer" options={["Offer", "No Offer"]} value={planOfferFilter} onChange={setPlanOfferFilter} className="w-full justify-between" />
                    {planOfferFilter && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                          {planOfferFilter}
                          <button onClick={() => setPlanOfferFilter("")} className="hover:text-primary/60">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Date */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Delivery Date</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] text-muted-foreground mb-1 block">From</label>
                        <Input className="h-8 text-sm" type="date" value={deliveryDateFrom} onChange={(e) => setDeliveryDateFrom(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] text-muted-foreground mb-1 block">To</label>
                        <Input className="h-8 text-sm" type="date" value={deliveryDateTo} onChange={(e) => setDeliveryDateTo(e.target.value)} />
                      </div>
                    </div>
                    {(deliveryDateFrom || deliveryDateTo) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {deliveryDateFrom && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            From: {deliveryDateFrom}
                            <button onClick={() => setDeliveryDateFrom("")} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                          </span>
                        )}
                        {deliveryDateTo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            To: {deliveryDateTo}
                            <button onClick={() => setDeliveryDateTo("")} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price Range */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Price Range (EGP)</p>
                    <div className="flex items-center gap-2">
                      <Input className="h-8 text-sm" placeholder="Min" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
                      <span className="text-muted-foreground text-sm shrink-0">–</span>
                      <Input className="h-8 text-sm" placeholder="Max" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
                    </div>
                    {(priceMin || priceMax) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {priceMin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            Min: {Number(priceMin).toLocaleString()} EGP
                            <button onClick={() => setPriceMin("")} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                          </span>
                        )}
                        {priceMax && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            Max: {Number(priceMax).toLocaleString()} EGP
                            <button onClick={() => setPriceMax("")} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <SheetFooter className="border-t border-border px-5 py-4 flex gap-2 shrink-0">
                  <Button variant="outline" className="flex-1" onClick={() => { clearAllFilters(); setShowAllFilters(false) }}>
                    Clear All
                  </Button>
                  <Button className="flex-1" onClick={() => setShowAllFilters(false)}>
                    Done
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          <TabsContent value="grouped" className="mt-0">
            <GroupedPropertiesView
              filters={sharedFilters}
              sortConfigs={sortConfigs}
              filterGroups={filterGroups}
              groupConnector={groupConnector}
              groupByColumn={groupByColumn}
              onOpenGroupDetail={onOpenGroupDetail}
            />
          </TabsContent>
          <TabsContent value="detailed" className="mt-0">
            <DetailedPropertiesView filters={filterPropsWithClear} />
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

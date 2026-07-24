"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import React from "react"
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpDown,
  Banknote,
  Bath,
  BedDouble,
  Check,
  Clock,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Copy,
  CreditCard,
  Database,
  Edit,
  History,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  Paperclip,
  ScrollText,
  Eye,
  EyeOff,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  Globe,
  Home,
  Info,
  Layers,
  Loader2,
  MapPin,
  MoveRight,
  MoreVertical,
  Pencil,
  Percent,
  Plus,
  Ruler,
  Save,
  Tag,
  Wrench,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TabStrip } from "@/components/table-kit"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EmbeddedPropertyTable, PropertyDetailTab, createRows, type ColId, type PropertyRow } from "@/components/all-properties-page"
import {
  AdditionalInfoTab,
  variationOf,
  type Variation,
  FieldShell,
  TextInput,
  NumberInput,
  SelectInput,
  RangeInput,
  decimalErr,
  priceErr,
  intRangeErr,
  withCommas,
  CURRENCY_OPTIONS,
  FINISHING_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
} from "@/components/additional-info-tab"
import { toast } from "sonner"

export interface SharedFilterState {
  searchQuery: string
  districtFilter: Set<string>
  areaFilter: Set<string>
  planTypeFilter: Set<string>
  developerFilter: Set<string>
  projectFilter: Set<string>
  saleTypeFilter: Set<string>
  availabilityFilter: Set<string>
  entryTypeFilter: Set<string>
  listingFilter: Set<string>
  propertyCategoryFilter: Set<string>
  propertyTypeFilter: Set<string>
  propertySubTypeFilter: Set<string>
  finishingTypeFilter: Set<string>
  deliveryTypeFilter: Set<string>
  deliveryDateFrom: string
  deliveryDateTo: string
  priceMin: string
  priceMax: string
  planOfferFilter: string
}

interface DetailedProperty {
  id: string
  unitCode: string
  unitNumber: string
  unitModel: string
  netBua: number
  grossBua: number
  floor: string
  price: number
  paymentPlan: string
  duration: number
  downpayment: number
  status: "Available" | "Sold" | "Hold" | "Archived"
  offering: "Primary" | "Resale" | "Nawy Now"
  financing: boolean
  nawyNow: boolean
  gardenArea?: number
  roofArea?: number
  roofAnnex?: number
  landArea?: number
  terraceArea?: number
}

export interface EntityRef { name: string; id: string; url: string }

export interface GroupedProperty {
  id: string
  propertyMetadataId: string
  nawyNowId?: string
  resalePropertyId?: string
  financingAvailable?: boolean
  title: string
  description: string
  availableUnits: number
  totalUnits: number
  priceMin: number
  priceMax: number
  areaMin: number
  areaMax: number
  bedroom: number
  bathroom: number
  saleType: "Primary" | "Resale" | "Nawy Now" | "Rental" | "Launch"
  entryType: "Automatic" | "Manual"
  listingStatus: "Published" | "Hidden"
  saleStatus: "Available" | "Sold" | "Hold" | "Archived"
  propertyCategory: string
  propertyType: string
  propertySubType: string
  district: string
  locationArea: string
  subarea: string | null
  locationId: string
  source: string
  developer: EntityRef
  project: EntityRef
  phase: EntityRef | null
  deliveryType: string
  deliveryDate: string
  finishing: string
  createdAt: string
  updatedAt: string
  availabilityUpdatedAt: string
  plans: number
  offers: number
  images: string[]
  floorPlans: string[]
  amenities: string[]
  details: DetailedProperty[]
}

const imagePool = [
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg",
  "/placeholder-logo.png",
  "/placeholder-user.jpg",
]

const badgeClass: Record<string, string> = {
  Automatic: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Manual: "border-gray-200 bg-gray-50 text-gray-700",
  Primary: "border-blue-200 bg-blue-50 text-blue-700",
  Resale: "border-purple-200 bg-purple-50 text-purple-700",
  "Nawy Now": "border-teal-200 bg-teal-50 text-teal-700",
  Rental: "border-orange-200 bg-orange-50 text-orange-700",
  Launch: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Hidden: "border-red-200 bg-red-50 text-red-600",
  "OFF PLAN": "border-amber-200 bg-amber-50 text-amber-700",
  "READY TO MOVE": "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function makeGroups(): GroupedProperty[] {
  const developerData: EntityRef[] = [
    { name: "Lasirena Group", id: "DEV-001", url: "#" },
    { name: "Palm Hills", id: "DEV-002", url: "#" },
    { name: "Sodic", id: "DEV-003", url: "#" },
    { name: "Mountain View", id: "DEV-004", url: "#" },
  ]
  const projectData: EntityRef[] = [
    { name: "Palm Beach Resort", id: "PRJ-1001", url: "#" },
    { name: "New Cairo Gate", id: "PRJ-1002", url: "#" },
    { name: "North Bay", id: "PRJ-1003", url: "#" },
    { name: "Lagoon Heights", id: "PRJ-1004", url: "#" },
  ]
  const phaseData: (EntityRef | null)[] = [
    { name: "Phase 1", id: "PH-201", url: "#" },
    { name: "Phase 2", id: "PH-202", url: "#" },
    null,
    { name: "Phase A", id: "PH-203", url: "#" },
  ]
  const districts = ["New Cairo", "Sheikh Zayed", "North Coast", "Ain Sokhna", "6th October", "Maadi", "Zamalek", "Heliopolis"]
  const locationAreas = ["El Shorouk", "Katameya", "Beverly Hills", "Ras El Hekma", "El Gouna", "Corniche", "Mohandessin", "Dokki"]
  const subareas: (string | null)[] = ["District A", "Block 5", null, "Phase Zone", "Central Hub", null, "Sector B", "West Wing"]
  const locationIds = ["4401", "4402", "4403", "4404", "4405", "4406", "4407", "4408"]
  const amenityPool = [
    ["Swimming Pool", "Gym", "Security", "Parking", "Club House"],
    ["Pool", "Gym", "Playground", "Mall Access", "Concierge"],
    ["Beach Access", "Water Park", "Tennis Court", "Gym", "Security"],
    ["Rooftop Terrace", "Gym", "Smart Home", "Parking", "Pets Allowed"],
    ["Club House", "Pool", "Security", "Kids Area", "BBQ Area"],
    ["Golf Course", "Spa", "Pool", "Gym", "Concierge", "Valet"],
    ["Private Beach", "Gym", "Security", "Club House", "Marina"],
    ["Pool", "Gym", "Parking", "Security", "Playground", "Mall Access"],
  ]
  const sources = ["Nawy Website", "CRM", "Agent", "Direct", "Referral", "Walk-in", "Online Ad", "Partner"]
  const categories = ["Residential", "Commercial", "Residential", "Residential", "Commercial", "Residential", "Residential", "Residential"]
  const propertyTypes = ["Chalet", "Apartment", "Chalet", "Apartment", "Office", "Villa", "Duplex", "Apartment"]
  const propertySubTypes = ["Garden Chalet", "Garden Apartment", "Studio", "Penthouse", "Open Space", "Twin House", "Roof Duplex", "Standard"]
  const compounds = ["Lasirena Palm Beach", "New Cairo Residences", "North Coast Bay", "Lagoon District"]

  // Business rules: sale type → entry type → detailed-property (DP) count per group.
  // Each case repeated `count` times so the demo has ≥3 groups per case (Primary ≥5 total).
  type SaleT = GroupedProperty["saleType"]
  // `financing` = a Resale group with financing available (no separate "Financing" sale type exists).
  const CASES: { saleType: SaleT; entryType: "Manual" | "Automatic"; dp: number; count: number; financing?: boolean }[] = [
    { saleType: "Launch",    entryType: "Manual",    dp: 2, count: 3 },
    { saleType: "Primary",   entryType: "Manual",    dp: 2, count: 3 },
    { saleType: "Primary",   entryType: "Automatic", dp: 5, count: 3 },
    { saleType: "Resale",    entryType: "Manual",    dp: 1, count: 3 },
    { saleType: "Resale",    entryType: "Manual",    dp: 1, count: 3, financing: true },
    { saleType: "Nawy Now",  entryType: "Manual",    dp: 1, count: 3 },
    { saleType: "Rental",    entryType: "Manual",    dp: 1, count: 3 },
  ]
  const plan: { saleType: SaleT; entryType: "Manual" | "Automatic"; dp: number; financing?: boolean }[] = CASES.flatMap((c) =>
    Array.from({ length: c.count }, () => ({ saleType: c.saleType, entryType: c.entryType, dp: c.dp, financing: c.financing })),
  )

  return plan.map((spec, i) => {
    const saleType = spec.saleType
    const units = spec.dp
    const available = i % 4 === 3 ? Math.max(0, units - 1) : units
    const areaBase = 120 + i * 12
    const areaMin = areaBase
    const areaMax = areaBase + 24 + (i % 3) * 12
    const bedrooms = 2 + (i % 4)
    const priceMin = 6_400_000 + i * 875_000
    const priceMax = priceMin + 500_000 + i * 200_000
    const hasAvailable = available > 0
    const saleStatus: "Available" | "Sold" | "Hold" | "Archived" =
      hasAvailable ? "Available" : i % 7 === 0 ? "Hold" : "Sold"

    return {
      id: String(111729 + i * 418),
      propertyMetadataId: String(234000 + i * 137),
      // Resale ⇄ Nawy Now cross-link (Nawy Now units are listed from a resale property)
      nawyNowId: saleType === "Resale" && !spec.financing ? `NN-${String(50100 + i * 17)}` : undefined,
      resalePropertyId: saleType === "Nawy Now" ? `RSL-${String(70200 + i * 23)}` : undefined,
      financingAvailable: saleType === "Resale" && !!spec.financing,
      title: `tamera for sale in ${compounds[i % compounds.length]} with ${bedrooms} bedrooms in ${["Ain Sokhna", "New Cairo", "North Coast", "Sheikh Zayed"][i % 4]} building ${String.fromCharCode(65 + i)}`,
      description: [
        "Grouped by matching project, unit attributes, payment plan, and listing source. Units share the same floor plan, payment schedule, finishing level, and are part of the same phase release under the developer's primary allocation cycle.",
        "Units grouped by matching developer configuration and sale type. All units in this group are primary sale with identical payment terms, delivery timelines, and have been verified against the current CRM records for consistency.",
        "Short description.",
        "Grouped by matching project, payment plan, and listing source. These units are part of the same phase and share identical delivery date, finishing specification, and pricing structure as configured in the CRM system by the listing team.",
        "Grouped by unit attributes, sale type, and payment plan. All listed under the same project phase with identical finishing specs, delivery schedule, and pricing tier. Units were entered automatically via the CRM integration feed.",
        "Units grouped by project and payment plan. Same delivery date, finishing level, and pricing band applied across all units. This group was last verified by the data team on the availability update date shown below.",
        "Grouped by matching developer, project, and phase attributes. Units have identical sale type, listing status, and are part of the same launch campaign with a shared marketing configuration and pricing ceiling.",
        "Grouped by project phase and payment plan. These resale units share the same original purchase configuration, floor plan type, and current listing parameters as submitted by the agent through the resale portal.",
      ][i % 8],
      availableUnits: available,
      totalUnits: units,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      bedroom: bedrooms,
      bathroom: Math.max(1, bedrooms - 1),
      saleType,
      entryType: spec.entryType,
      listingStatus: i % 6 === 0 ? "Hidden" : "Published",
      saleStatus,
      propertyCategory: categories[i % categories.length],
      propertyType: propertyTypes[i % propertyTypes.length],
      propertySubType: propertySubTypes[i % propertySubTypes.length],
      district: districts[i % districts.length],
      locationArea: locationAreas[i % locationAreas.length],
      subarea: subareas[i % subareas.length],
      locationId: locationIds[i % locationIds.length],
      source: sources[i % sources.length],
      developer: developerData[i % developerData.length],
      project: projectData[i % projectData.length],
      phase: phaseData[i % phaseData.length],
      deliveryType: i % 2 === 0 ? "OFF PLAN" : "READY TO MOVE",
      deliveryDate: `202${6 + (i % 3)}-12-01`,
      finishing: i % 2 === 0 ? "FULLY FINISHED" : "SEMI FINISHED",
      createdAt: ["May 1, 2026 · 9:30 AM", "May 2, 2026 · 11:15 AM", "May 3, 2026 · 2:45 PM", "May 4, 2026 · 8:00 AM", "May 5, 2026 · 3:20 PM", "May 6, 2026 · 10:05 AM", "May 7, 2026 · 1:00 PM", "May 8, 2026 · 4:50 PM"][i % 8],
      updatedAt: ["May 3, 2026 · 5:10 PM", "May 4, 2026 · 9:22 AM", "May 5, 2026 · 6:30 PM", "May 6, 2026 · 11:45 AM", "May 7, 2026 · 8:15 AM", "May 8, 2026 · 2:00 PM", "May 9, 2026 · 7:30 AM", "May 10, 2026 · 12:10 PM"][i % 8],
      availabilityUpdatedAt: ["May 2, 2026 · 3:00 PM", "May 3, 2026 · 7:55 AM", "May 4, 2026 · 4:40 PM", "May 5, 2026 · 9:10 AM", "May 6, 2026 · 1:25 PM", "May 7, 2026 · 5:35 PM", "May 8, 2026 · 10:50 AM", "May 9, 2026 · 3:15 PM"][i % 8],
      plans: 1 + (i % 4),
      offers: i % 3,
      images: imagePool.slice(0, 4 + (i % 2)),
      floorPlans: i % 4 === 0 ? [] : imagePool.slice(2, 3),
      amenities: amenityPool[i % amenityPool.length],
      details: Array.from({ length: units }, (_, ui) => ({
        id: String(122679 + i * 100 + ui),
        unitCode: `h${i + 3}${ui + 4}${ui % 2 === 0 ? "grounda" : "groundb"}`,
        unitNumber: "N/A",
        unitModel: `H ${ui % 2 === 0 ? "Ground" : "Typical"}`,
        netBua: areaBase,
        grossBua: areaBase,
        floor: i % 2 === 0 ? "N/A" : String(ui + 1),
        price: priceMin,
        paymentPlan: "tamera",
        duration: 6,
        downpayment: 20,
        status: (ui < available ? "Available" : "Sold") as "Available" | "Sold",
        offering: saleType === "Resale" || saleType === "Nawy Now" ? saleType : "Primary",
        financing: !!spec.financing,
        nawyNow: saleType === "Nawy Now",
        gardenArea: i % 2 === 0 ? 85 : undefined,
        roofArea: i % 3 === 0 ? 40 : undefined,
        roofAnnex: undefined,
        landArea: i % 4 === 0 ? 120 : undefined,
        terraceArea: i % 3 === 1 ? 18 : undefined,
      })),
    }
  })
}

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="group/copy inline-flex items-center gap-1 font-mono">
      <span>{value}</span>
      <button
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary group-hover/copy:opacity-100"
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 900)
        }}
      >
        {copied ? <span className="text-xs text-emerald-600">Copied</span> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </span>
  )
}

function LinkedId({ value, href }: { value: string; href: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="group/copy inline-flex items-center gap-1 font-mono">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {value}
      </a>
      <button
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary group-hover/copy:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 900)
        }}
      >
        {copied ? <span className="text-xs text-emerald-600">Copied</span> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </span>
  )
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={cn("border", badgeClass[value])}>
      {value}
    </Badge>
  )
}

function ImageStrip({ images, emptyLabel, onImageClick }: { images: string[]; emptyLabel: string; onImageClick?: (index: number) => void }) {
  if (images.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyLabel}</div>
  }
  return (
    <div className="flex gap-1.5">
      {images.slice(0, 6).map((image, index) => (
        <button
          key={`${image}-${index}`}
          className="h-10 w-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all shrink-0"
          onClick={() => onImageClick?.(index)}
        >
          <img src={image || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}

function ReadOnlyCarousel({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex)
  const go = (dir: number) => setCurrent((c) => (c + dir + images.length) % images.length)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images.length])

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-end p-3">
        <button className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <img
          src={images[current]}
          alt={`Image ${current + 1}`}
          className="max-h-[75vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(1)}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="flex justify-center gap-2 p-4" onClick={(e) => e.stopPropagation()}>
        {images.map((img, i) => (
          <button
            key={i}
            className={cn("h-12 w-12 rounded border-2 overflow-hidden transition-all", i === current ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-75")}
            onClick={() => setCurrent(i)}
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-")
  return `${day}-${m}-${y}`
}

const SALE_STATUS_CLS: Record<string, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Sold: "border-red-200 bg-red-50 text-red-700",
  Hold: "border-amber-200 bg-amber-50 text-amber-700",
  Archived: "border-gray-200 bg-gray-50 text-gray-500",
}

const STATUS_META: Record<string, { icon: React.ElementType; cls: string; note: string }> = {
  Available: { icon: CheckCircle2, cls: "border-emerald-300 bg-emerald-50 text-emerald-700", note: "Listed and available on the website and E-realty." },
  Hold: { icon: Clock, cls: "border-amber-300 bg-amber-50 text-amber-700", note: "Temporarily closed and hidden from the website and E-realty." },
  Sold: { icon: Banknote, cls: "border-red-300 bg-red-50 text-red-700", note: "Sold and hidden from the website and E-realty." },
  Archived: { icon: Archive, cls: "border-gray-300 bg-gray-100 text-gray-600", note: "Removed and hidden from the Nawy platform — for properties entered by mistake." },
}

function FieldCell({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-xs font-medium text-foreground">{children}</div>
    </div>
  )
}

function EntityCell({ label, icon, entity }: { label: string; icon?: React.ReactNode; entity: EntityRef | null }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      {entity ? (
        <>
          <div className="text-xs font-medium">
            <a href={entity.url} target="_blank" rel="noreferrer" className="hover:underline text-foreground">
              {entity.name}
            </a>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            <CopyableId value={entity.id} />
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">—</div>
      )}
    </div>
  )
}

// Cascading Category → Type → Subtype tree (mock)
export const TYPE_TREE: Record<string, Record<string, string[]>> = {
  Residential: {
    Apartment: ["Standard", "Penthouse", "Garden Apartment", "Studio"],
    Villa: ["Standalone", "Twin House", "Townhouse"],
    Chalet: ["Garden Chalet", "Studio", "Typical"],
    Duplex: ["Roof Duplex", "Garden Duplex"],
  },
  Commercial: {
    Office: ["Open Space", "Partitioned"],
    Retail: ["Shop", "Showroom"],
  },
}

const SALE_STATUS_OPTIONS = ["Available", "Hold", "Sold", "Archived"] as const

/** Ensure a select can always display its seeded value, even if not in the canonical option list (mock data may differ). */
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [...options, current] : options
}

/** Property Type options grouped under their category, ensuring the current selection is always representable. */
export function buildTypeGroups(curCat: string, curType: string): { category: string; types: string[] }[] {
  const groups = Object.entries(TYPE_TREE).map(([category, types]) => ({ category, types: Object.keys(types) }))
  if (curType) {
    const g = groups.find((x) => x.category === curCat)
    if (g) { if (!g.types.includes(curType)) g.types = [...g.types, curType] }
    else groups.push({ category: curCat, types: [curType] })
  }
  return groups
}

interface ContainerForm {
  category: string
  type: string
  subtype: string
  finishing: string
  deliveryType: string
  deliveryDate: string
  grossMin: string
  grossMax: string
  bedrooms: string
  bathrooms: string
  priceMin: string
  priceMax: string
  price: string
  currency: string
}

function seedContainer(group: GroupedProperty): ContainerForm {
  return {
    category: group.propertyCategory,
    type: group.propertyType,
    subtype: group.propertySubType,
    finishing: group.finishing,
    deliveryType: group.deliveryType,
    deliveryDate: group.deliveryDate,
    grossMin: String(group.areaMin),
    grossMax: String(group.areaMax),
    bedrooms: String(group.bedroom),
    bathrooms: String(group.bathroom),
    priceMin: String(group.priceMin),
    priceMax: String(group.priceMax),
    price: String(group.priceMin),
    currency: "EGP",
  }
}

/** Today's date as yyyy-mm-dd (browser local). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function GroupCard({
  group,
  globalIndex,
  allRows,
  isExpanded,
  onToggle,
  hiddenCols,
  isSelected,
  onSelect,
  onView,
  detailView = false,
}: {
  group: GroupedProperty
  globalIndex: number
  allRows: PropertyRow[]
  isExpanded: boolean
  onToggle: () => void
  hiddenCols: ColId[]
  isSelected: boolean
  onSelect: (shiftKey: boolean) => void
  onView: () => void
  /** When rendered inside the details page: no checkbox, edit instead of view, no expand, no media section */
  detailView?: boolean
}) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [descOverflows, setDescOverflows] = useState(false)
  const [carousel, setCarousel] = useState<{ images: string[]; index: number } | null>(null)
  const [listingStatus, setListingStatus] = useState<"Published" | "Hidden">(group.listingStatus)
  const [saleStatus, setSaleStatus] = useState<GroupedProperty["saleStatus"]>(group.saleStatus)
  const [financing, setFinancing] = useState(!!group.financingAvailable)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [ppDrawerOpen, setPpDrawerOpen] = useState(false)
  const descRef = useRef<HTMLParagraphElement>(null)
  const desc = group.description || ""
  const isAvailable = saleStatus === "Available"

  // ── Container edit mode (details page only) ──
  const variation = variationOf(group)
  const isPA = variation === "primary-automatic"
  const rangePrice = variation === "launch" || variation === "primary-manual"
  const isResale = group.saleType === "Resale"
  const [editing, setEditing] = useState(false)
  const [cSaved, setCSaved] = useState<ContainerForm>(() => seedContainer(group))
  const [form, setForm] = useState<ContainerForm>(cSaved)
  const [cErrors, setCErrors] = useState<Record<string, string>>({})
  const [statusDialog, setStatusDialog] = useState(false)
  const [statusPick, setStatusPick] = useState<GroupedProperty["saleStatus"]>(group.saleStatus)
  const [moveOpen, setMoveOpen] = useState(false)

  // ── Mandatory-field rules (edit state) ──
  // All container fields are mandatory except: bedrooms/bathrooms when Residential,
  // and the max of the gross-area and price ranges. For Launch, only Type is mandatory.
  const req = (key: string): boolean => {
    if (isPA) return false
    if (variation === "launch") return key === "type"
    if (key === "grossMax" || key === "priceMax") return false
    if ((key === "bedrooms" || key === "bathrooms") && form.category === "Residential") return false
    return true
  }

  const validateContainer = (f: ContainerForm): Record<string, string> => {
    const e: Record<string, string> = {}
    const reqKey = (key: string): boolean => {
      if (isPA) return false
      if (variation === "launch") return key === "type"
      if (key === "grossMax" || key === "priceMax") return false
      if ((key === "bedrooms" || key === "bathrooms") && f.category === "Residential") return false
      return true
    }
    if (!isPA) {
      // Type (cascading) — mandatory unless exempt
      if (reqKey("type") && (!f.category || !f.type || !f.subtype)) e.type = "Required"
      if (reqKey("finishing") && !f.finishing) e.finishing = "Required"
      if (reqKey("delivery") && (!f.deliveryType || !f.deliveryDate)) e.delivery = "Required"
    }
    // Gross area
    const gMin = decimalErr(f.grossMin, 2000)
    if (gMin) e.grossMin = gMin
    else if (reqKey("grossMin") && !f.grossMin) e.grossMin = "Required"
    const gMax = decimalErr(f.grossMax, 2000)
    if (gMax) e.grossMax = gMax
    if (!gMin && !gMax && f.grossMin && f.grossMax && parseFloat(f.grossMax) < parseFloat(f.grossMin)) e.grossMax = "Max must be ≥ min"
    // Bedrooms / bathrooms
    const bed = intRangeErr(f.bedrooms, 0, 19)
    if (bed) e.bedrooms = bed
    else if (reqKey("bedrooms") && !f.bedrooms) e.bedrooms = "Required"
    const bath = intRangeErr(f.bathrooms, 0, 19)
    if (bath) e.bathrooms = bath
    else if (reqKey("bathrooms") && !f.bathrooms) e.bathrooms = "Required"
    // Price
    if (!isPA) {
      if (rangePrice) {
        const pMin = priceErr(f.priceMin)
        if (pMin) e.priceMin = pMin
        else if (reqKey("priceMin") && !f.priceMin) e.priceMin = "Required"
        const pMax = priceErr(f.priceMax)
        if (pMax) e.priceMax = pMax
        if (!pMin && !pMax && f.priceMin && f.priceMax && parseFloat(f.priceMax) <= parseFloat(f.priceMin)) e.priceMax = "Max must be greater than min"
      } else {
        const p = priceErr(f.price)
        if (p) e.price = p
        else if (reqKey("price") && !f.price) e.price = "Required"
      }
    }
    return e
  }

  const setField = (patch: Partial<ContainerForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      // Cross-field: Delivery Type ⟺ Delivery Date stay consistent
      if (patch.deliveryDate !== undefined && patch.deliveryDate) {
        next.deliveryType = patch.deliveryDate > todayISO() ? "OFF PLAN" : "READY TO MOVE"
      }
      if (patch.deliveryType !== undefined) {
        const future = next.deliveryDate > todayISO()
        if (next.deliveryType === "OFF PLAN" && !future) next.deliveryDate = `${Number(todayISO().slice(0, 4)) + 1}${todayISO().slice(4)}`
        if (next.deliveryType === "READY TO MOVE" && future) next.deliveryDate = todayISO()
      }
      setCErrors(validateContainer(next))
      return next
    })
  }

  const startContainerEdit = () => { setForm({ ...cSaved }); setCErrors({}); setEditing(true) }
  const cancelContainerEdit = () => { setEditing(false); setCErrors({}) }
  const saveContainer = () => {
    const e = validateContainer(form)
    if (Object.keys(e).length) { setCErrors(e); return }
    setCSaved(form)
    setEditing(false)
    toast.success("Property details updated")
  }
  const hasContainerErrors = Object.keys(cErrors).length > 0

  const applyStatusChange = (next: GroupedProperty["saleStatus"]) => {
    setSaleStatus(next)
    if (next !== "Available") setListingStatus("Hidden")
    setStatusDialog(false)
    toast.success(`Status changed to ${next}`)
  }

  const toggleListing = () => {
    if (listingStatus === "Hidden" && saleStatus !== "Available") { toast.error("Only Available listings can be made visible"); return }
    const next = listingStatus === "Published" ? "Hidden" : "Published"
    setListingStatus(next)
    toast.success(next === "Published" ? "Listing is now visible" : "Listing hidden")
  }

  const toggleFinancing = () => {
    setFinancing((f) => {
      const nf = !f
      toast.success(nf ? "Financing allowed" : "Financing disabled")
      return nf
    })
  }

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    // Measure with clamp: scrollHeight > clientHeight means text overflows
    setDescOverflows(el.scrollHeight > el.clientHeight)
  }, [desc])

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden relative", isSelected ? "border-primary ring-1 ring-primary/30" : "border-border")}>

      {/* ── Archive confirmation overlay ── */}
      {confirmArchive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 max-w-xs w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Archive this group?</p>
                <p className="text-xs text-muted-foreground mt-1">This will archive all units in this grouped property. This action can be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmArchive(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setConfirmArchive(false)
                  if (detailView) {
                    setSaleStatus("Archived")
                    setListingStatus("Hidden")
                    setCSaved((s) => ({ ...s, saleStatus: "Archived", visible: false }))
                    toast.success("Group archived")
                  }
                }}
              >
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: IDs · Tags · Action Buttons ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border">
        {/* Checkbox */}
        {!detailView && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {}}
            onClick={(e) => { e.stopPropagation(); onSelect((e as React.MouseEvent).shiftKey) }}
            className="shrink-0"
          />
        )}

        {/* IDs with copy-on-hover */}
        <div className="flex items-center gap-2.5 shrink-0 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            Property ID: <CopyableId value={group.id} />
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            Metadata ID: <CopyableId value={group.propertyMetadataId} />
          </span>
          {group.saleType === "Resale" && group.nawyNowId && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                Nawy Now ID: <LinkedId value={group.nawyNowId} href={`/nawy-now/${group.nawyNowId}`} />
              </span>
            </>
          )}
          {group.saleType === "Resale" && financing && (
            <>
              <span>·</span>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                Financing Available
              </Badge>
            </>
          )}
          {group.saleType === "Nawy Now" && group.resalePropertyId && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                Resale Property: <LinkedId value={group.resalePropertyId} href={`/resale/${group.resalePropertyId}`} />
              </span>
            </>
          )}
        </div>

        {/* Tags — no labels, compact row */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {group.availableUnits} / {group.totalUnits} Available
          </Badge>
          <StatusBadge value={group.saleType} />
          <Badge variant="outline" className={cn("border text-xs", SALE_STATUS_CLS[saleStatus])}>
            {saleStatus}
          </Badge>
          <StatusBadge value={listingStatus} />
          <StatusBadge value={group.entryType} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-border">
          <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="Open on website">
            <ExternalLink className="h-3 w-3" />
          </Button>

          {detailView ? (
            editing ? (
              <>
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={cancelContainerEdit}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="h-6 px-2 text-xs" onClick={saveContainer} disabled={hasContainerErrors}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </>
            ) : (
              <>
                {!isPA && (
                  <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="Edit details" onClick={startContainerEdit}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="More actions">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={toggleListing}>
                      {listingStatus === "Published" ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                      {listingStatus === "Published" ? "Hide Listing" : "Show Listing"}
                    </DropdownMenuItem>
                    {!isPA && (
                      <DropdownMenuItem onClick={() => { setStatusPick(saleStatus); setStatusDialog(true) }}>
                        <ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Change Sale Status
                      </DropdownMenuItem>
                    )}
                    {isResale && (
                      <DropdownMenuItem onClick={toggleFinancing}>
                        <Banknote className="h-3.5 w-3.5 mr-2" /> {financing ? "Disable Financing" : "Allow Financing"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Change Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          ) : (
            <>
              <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="View on IMS" onClick={onView}>
                <Eye className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="More actions">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={toggleListing}>
                    {listingStatus === "Published" ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                    {listingStatus === "Published" ? "Hide Listing" : "Show Listing"}
                  </DropdownMenuItem>
                  {!isPA && (
                    <DropdownMenuItem onClick={() => { setStatusPick(saleStatus); setStatusDialog(true) }}>
                      <ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Change Sale Status
                    </DropdownMenuItem>
                  )}
                  {isResale && (
                    <DropdownMenuItem onClick={toggleFinancing}>
                      <Banknote className="h-3.5 w-3.5 mr-2" /> {financing ? "Disable Financing" : "Allow Financing"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Change Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" onClick={onToggle} title="Expand units">
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Status dot · Title · Description ── */}
      <div className="px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full shrink-0", isAvailable ? "bg-emerald-500" : "bg-red-500")} />
          <Tooltip>
            <TooltipTrigger asChild>
              <h2 className="text-sm font-semibold truncate cursor-default">{group.title}</h2>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <p className="text-xs">{group.title}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-1 pl-4">
          <p
            ref={descRef}
            className={cn("text-xs text-muted-foreground", !descExpanded && "line-clamp-1")}
          >
            {desc || "—"}
          </p>
          {descOverflows && (
            <button
              className="text-[10px] text-primary hover:underline mt-0.5"
              onClick={() => setDescExpanded(p => !p)}
            >
              {descExpanded ? "see less" : "see more"}
            </button>
          )}
        </div>
      </div>

      {/* ── Section 3: Main Info 4-col grid ── */}
      <div className="px-5 py-3 border-b border-border">
        <div className="grid grid-cols-4 gap-x-6 gap-y-3">
          {/* Always read-only entity cells */}
          <EntityCell label="Developer" icon={<Building2 className="h-3 w-3" />} entity={group.developer} />
          <EntityCell label="Project" icon={<Home className="h-3 w-3" />} entity={group.project} />
          <EntityCell label="Phase" icon={<Layers className="h-3 w-3" />} entity={group.phase} />
          {/* Location with Area ID below */}
          <div className="min-w-0">
            <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" /><span>Location</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {[group.district, group.locationArea, group.subarea].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Area — <CopyableId value={group.locationId} />
            </div>
          </div>

          {/* Type — grouped Property Type + dependent Subtype on one line, within one column */}
          <FieldShell label="Type" icon={<Tag className="h-3 w-3" />} required={editing && req("type")} error={editing ? cErrors.type : undefined}>
            {editing && !isPA ? (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <Select
                    value={form.type ? `${form.category}|${form.type}` : undefined}
                    onValueChange={(v) => { const [cat, t] = v.split("|"); setField({ category: cat, type: t, subtype: "" }) }}
                  >
                    <SelectTrigger className={cn("h-8 w-full text-sm", cErrors.type && "border-red-500")}><SelectValue placeholder="Type" /></SelectTrigger>
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
                <div className="flex-1 min-w-0">
                  <SelectInput value={form.subtype} onChange={(v) => setField({ subtype: v })} options={withCurrent(form.category && form.type ? (TYPE_TREE[form.category]?.[form.type] ?? []) : [], form.subtype)} placeholder="Subtype" error={cErrors.type} />
                </div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">{[cSaved.category, cSaved.type, cSaved.subtype].filter(Boolean).join(" · ") || "—"}</div>
            )}
          </FieldShell>

          {/* Finishing */}
          <FieldShell label="Finishing" icon={<Wrench className="h-3 w-3" />} required={editing && req("finishing")} error={editing ? cErrors.finishing : undefined}>
            {editing && !isPA ? (
              <SelectInput value={form.finishing} onChange={(v) => setField({ finishing: v })} options={withCurrent(FINISHING_OPTIONS, form.finishing)} error={cErrors.finishing} />
            ) : (
              <div className="text-xs font-medium text-foreground">{cSaved.finishing || "—"}</div>
            )}
          </FieldShell>

          {/* Delivery — type + date on one line, within one column */}
          <FieldShell label="Delivery" icon={<CalendarDays className="h-3 w-3" />} required={editing && req("delivery")} error={editing ? cErrors.delivery : undefined}>
            {editing && !isPA ? (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <SelectInput value={form.deliveryType} onChange={(v) => setField({ deliveryType: v })} options={DELIVERY_TYPE_OPTIONS} error={cErrors.delivery} />
                </div>
                <div className="flex-1 min-w-0">
                  <Input type="date" value={form.deliveryDate} onChange={(e) => setField({ deliveryDate: e.target.value })} className={cn("h-8 w-full min-w-0 text-sm", cErrors.delivery && "border-red-500")} />
                </div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">{cSaved.deliveryType} · {fmtDate(cSaved.deliveryDate)}</div>
            )}
          </FieldShell>

          {/* Gross Area */}
          <FieldShell label="Gross Area" icon={<Ruler className="h-3 w-3" />} required={editing && req("grossMin")} error={editing ? (cErrors.grossMin || cErrors.grossMax) : undefined}>
            {editing && !isPA ? (
              <RangeInput value={{ min: form.grossMin, max: form.grossMax }} onChange={(r) => setField({ grossMin: r.min, grossMax: r.max })} error={cErrors.grossMin || cErrors.grossMax} />
            ) : (
              <div className="text-xs font-medium text-foreground">{cSaved.grossMin}–{cSaved.grossMax} SQM</div>
            )}
          </FieldShell>

          {/* Source (read-only) */}
          <FieldShell label="Source" icon={<Globe className="h-3 w-3" />}>
            <div className="text-xs font-medium text-foreground">{group.source}</div>
          </FieldShell>

          {/* Bedrooms */}
          <FieldShell label="Bedrooms" icon={<BedDouble className="h-3 w-3" />} required={editing && req("bedrooms")} error={editing ? cErrors.bedrooms : undefined}>
            {editing && !isPA ? (
              <NumberInput value={form.bedrooms} onChange={(v) => setField({ bedrooms: v })} error={cErrors.bedrooms} />
            ) : (
              <div className="text-xs font-medium text-foreground">{cSaved.bedrooms}</div>
            )}
          </FieldShell>

          {/* Bathrooms */}
          <FieldShell label="Bathrooms" icon={<Bath className="h-3 w-3" />} required={editing && req("bathrooms")} error={editing ? cErrors.bathrooms : undefined}>
            {editing && !isPA ? (
              <NumberInput value={form.bathrooms} onChange={(v) => setField({ bathrooms: v })} error={cErrors.bathrooms} />
            ) : (
              <div className="text-xs font-medium text-foreground">{cSaved.bathrooms}</div>
            )}
          </FieldShell>

          {/* Price (+ currency) */}
          <FieldShell label="Price" icon={<Banknote className="h-3 w-3" />} required={editing && (rangePrice ? req("priceMin") : req("price"))} error={editing ? (cErrors.price || cErrors.priceMin || cErrors.priceMax) : undefined}>
            {editing && !isPA ? (
              <div className="flex items-start gap-1.5">
                {rangePrice ? (
                  <RangeInput value={{ min: form.priceMin, max: form.priceMax }} onChange={(r) => setField({ priceMin: r.min, priceMax: r.max })} error={cErrors.priceMin || cErrors.priceMax} format={withCommas} />
                ) : (
                  <NumberInput value={form.price} onChange={(v) => setField({ price: v })} error={cErrors.price} format={withCommas} />
                )}
                <div className="w-20 shrink-0"><SelectInput value={form.currency} onChange={(v) => setField({ currency: v })} options={CURRENCY_OPTIONS} /></div>
              </div>
            ) : (
              <div className="text-xs font-medium text-foreground">
                {rangePrice || isPA
                  ? `${Number(cSaved.priceMin || 0).toLocaleString()} – ${Number(cSaved.priceMax || 0).toLocaleString()}`
                  : Number(cSaved.price || 0).toLocaleString()} {cSaved.currency}
              </div>
            )}
          </FieldShell>

        </div>
      </div>

      {/* ── Section 4: Images · Floor Plans · Amenities · Payment Plans ── */}
      {!detailView && (
      <div className="px-5 py-3 border-b border-border">
        <div className="grid grid-cols-4 gap-x-6">
          {/* Col 1: Images */}
          <div>
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Images</div>
            <ImageStrip images={group.images} emptyLabel="No images" onImageClick={(i) => setCarousel({ images: group.images, index: i })} />
          </div>
          {/* Col 2: Floor Plans */}
          <div>
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Floor Plans</div>
            <ImageStrip images={group.floorPlans} emptyLabel="No floor plans" onImageClick={(i) => setCarousel({ images: group.floorPlans, index: i })} />
          </div>
          {/* Col 3: Amenities & Services */}
          <div>
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Amenities & Services</div>
            <div className="flex flex-wrap gap-1">
              {group.amenities.length > 0
                ? group.amenities.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px] px-1.5 h-4 font-normal border-border bg-secondary/50 text-muted-foreground">
                      {a}
                    </Badge>
                  ))
                : <span className="text-xs text-muted-foreground">—</span>
              }
            </div>
          </div>
          {/* Col 4: Payment Plans — aligns under Price */}
          <div>
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Payment Plans</div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs">
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium">{group.plans}</span>
                <span className="text-muted-foreground">plans</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Percent className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium">{group.offers}</span>
                <span className="text-muted-foreground">offers</span>
              </span>
              <Button variant="outline" size="icon-sm" className="bg-transparent h-5 w-5 ml-0.5" title="View payment plans" onClick={() => setPpDrawerOpen(true)}>
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Timestamps: bottom-right ── */}
      <div className="px-5 py-2 flex justify-end gap-x-4 text-xs text-muted-foreground">
        <span>Created: <span className="text-foreground">{group.createdAt}</span></span>
        <span>·</span>
        <span>Updated: <span className="text-foreground">{group.updatedAt}</span></span>
        <span>·</span>
        <span>Avail. updated: <span className="text-foreground">{group.availabilityUpdatedAt}</span></span>
      </div>

      {/* ── Expanded: Detailed Properties ── */}
      {isExpanded && (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="text-sm font-semibold">Detailed Properties</h3>
            <span className="text-xs text-muted-foreground">({group.details.length} units)</span>
          </div>
          <EmbeddedPropertyTable
            rows={allRows.slice(globalIndex * 3, globalIndex * 3 + group.details.length)}
            hiddenColumns={hiddenCols}
          />
        </div>
      )}

      {/* ── Carousel overlay ── */}
      {carousel && (
        <ReadOnlyCarousel
          images={carousel.images}
          startIndex={carousel.index}
          onClose={() => setCarousel(null)}
        />
      )}

      {/* ── Payment Plans view drawer (read-only compact version of the Payment Plans tab) ── */}
      <Sheet open={ppDrawerOpen} onOpenChange={setPpDrawerOpen}>
        <SheetContent side="right" className="flex h-full w-[480px] flex-col overflow-hidden p-0 max-w-[94vw]!">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              Payment Plans
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {({ launch: "Launch", "primary-manual": "Primary Manual", "primary-automatic": "Primary Automatic", resale: "Resale", "nawy-now": "Nawy Now", rental: "Rental" } as Record<string, string>)[variation] ?? group.saleType}
              </span>
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">{group.id} · {group.project.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const ppUnits = allRows.slice(globalIndex * 3, globalIndex * 3 + group.details.length)
              const ppRepRow = ppUnits[0] ?? allRows[globalIndex % Math.max(1, allRows.length)] ?? allRows[0]
              return ppRepRow ? (
                <PropertyDetailTab tab="payment-plans" row={ppRepRow} onUpdateRow={() => {}} variation={variation} priceRange={{ min: group.priceMin, max: group.priceMax }} readOnly singleColumn />
              ) : (
                <p className="px-6 py-16 text-center text-sm text-muted-foreground">No units in this group.</p>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Change Sale Status dialog ── */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change sale status</DialogTitle>
            <DialogDescription>This property status will be changed accordingly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            {SALE_STATUS_OPTIONS.map((s) => {
              const meta = STATUS_META[s]
              const Icon = meta.icon
              const selected = statusPick === s
              const disabled = s === "Available" && group.availableUnits === 0
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => setStatusPick(s)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    selected ? meta.cls : "border-border hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{s}</div>
                    <div className="text-[11px] opacity-80">{meta.note}</div>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
          <div className="rounded-md bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            {statusPick === "Available" && group.availableUnits === 0 ? (
              <span className="font-medium text-red-600">No available units — this group can't be set to Available.</span>
            ) : statusPick === "Archived" ? (
              <span>Archiving hides this group from the website. You can restore it later by changing the status.</span>
            ) : statusPick !== "Available" ? (
              <span>Setting status to <span className="font-medium text-foreground">{statusPick}</span> will hide it from the website.</span>
            ) : (
              <span>Confirm to set the status to <span className="font-medium text-foreground">{statusPick}</span> for this group.</span>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusDialog(false)}><X className="mr-1 h-3 w-3" /> Cancel</Button>
            <Button size="sm" disabled={statusPick === "Available" && group.availableUnits === 0} onClick={() => applyStatusChange(statusPick)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Project modal ── */}
      <ChangeProjectModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        selectedGroups={[group]}
        eligibleTypes={ALL_SALE_TYPES}
        onConfirm={() => { setMoveOpen(false); toast.success("Compound move scheduled") }}
      />
    </div>
  )
}

interface SortConfig { column: string; direction: "asc" | "desc" }
interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  conditions: { id: string; column: string; operator: string; value: string }[]
}

function getGroupFieldValue(group: GroupedProperty, col: string): string {
  switch (col) {
    case "developer":    return group.developer.name
    case "project":      return group.project.name
    case "phase":        return group.phase?.name ?? "Main Project"
    case "district":     return group.district
    case "locationArea": return group.locationArea
    case "saleType":     return group.saleType
    case "listingStatus": return group.listingStatus
    case "propertyType": return group.propertyType
    case "entryType":    return group.entryType
    default:             return ""
  }
}

function applyAdvancedFilterToGroup(
  group: GroupedProperty,
  fgs: FilterGroup[],
  connector: "AND" | "OR",
): boolean {
  if (fgs.length === 0) return true
  const matchesFg = (fg: FilterGroup) => {
    const results = fg.conditions.map((cond) => {
      const val = getGroupFieldValue(group, cond.column).toLowerCase()
      const cv = cond.value.toLowerCase()
      switch (cond.operator) {
        case "equals":       return val === cv
        case "not_equals":   return val !== cv
        case "contains":     return val.includes(cv)
        case "not_contains": return !val.includes(cv)
        case "starts_with":  return val.startsWith(cv)
        case "ends_with":    return val.endsWith(cv)
        case "is_empty":     return !val
        case "is_not_empty": return !!val
        default:             return true
      }
    })
    return fg.connector === "AND" ? results.every(Boolean) : results.some(Boolean)
  }
  const groupResults = fgs.map(matchesFg)
  return connector === "AND" ? groupResults.every(Boolean) : groupResults.some(Boolean)
}

function getGroupSortValue(group: GroupedProperty, col: string): string | number {
  switch (col) {
    case "developer": return group.developer.name
    case "project": return group.project.name
    case "priceMin": return group.priceMin
    case "priceMax": return group.priceMax
    case "areaMin": return group.areaMin
    case "availableUnits": return group.availableUnits
    case "totalUnits": return group.totalUnits
    case "bedroom": return group.bedroom
    case "deliveryDate": return group.deliveryDate
    case "createdAt": return group.createdAt
    default: return 0
  }
}

// ── Static destination data for Change Compound modal ─────────────────────────
const DEST_DEVELOPERS = [
  { id: "DEV-001", name: "Lasirena Group" },
  { id: "DEV-002", name: "Palm Hills" },
  { id: "DEV-003", name: "Sodic" },
  { id: "DEV-004", name: "Mountain View" },
  { id: "DEV-005", name: "Emaar Misr" },
]

const DEST_PROJECTS: Record<string, { id: string; name: string; phases: { id: string; name: string }[] }[]> = {
  "DEV-001": [
    { id: "PRJ-L1", name: "Palm Beach Resort", phases: [{ id: "PH-L1", name: "Phase 1" }, { id: "PH-L2", name: "Phase 2" }] },
    { id: "PRJ-L2", name: "Lasirena Hub", phases: [{ id: "PH-L3", name: "Phase A" }] },
    { id: "PRJ-L21", name: "Lasirena Bay", phases: [{ id: "PH-L21", name: "Phase 1" }, { id: "PH-L22", name: "Phase 2" }] },
  ],
  "DEV-002": [
    { id: "PRJ-P1", name: "New Cairo Gate", phases: [{ id: "PH-P1", name: "Phase 1" }, { id: "PH-P2", name: "Phase 2" }, { id: "PH-P3", name: "Phase 3" }] },
    { id: "PRJ-P2", name: "Hacienda Bay", phases: [{ id: "PH-P4", name: "Phase 1" }] },
    { id: "PRJ-P21", name: "Badya", phases: [{ id: "PH-P21", name: "Phase 1" }] },
  ],
  "DEV-003": [
    { id: "PRJ-S1", name: "SODIC West", phases: [{ id: "PH-S1", name: "Phase 1" }, { id: "PH-S2", name: "Phase 2" }] },
    { id: "PRJ-S2", name: "Villette", phases: [] },
    { id: "PRJ-S21", name: "Eastown", phases: [{ id: "PH-S21", name: "Phase 1" }] },
  ],
  "DEV-004": [
    { id: "PRJ-M1", name: "North Bay", phases: [{ id: "PH-M1", name: "Phase 1" }, { id: "PH-M2", name: "Phase 2" }] },
    { id: "PRJ-M2", name: "Lagoon Heights", phases: [{ id: "PH-M3", name: "Phase A" }, { id: "PH-M4", name: "Phase B" }] },
    { id: "PRJ-M21", name: "Aliva", phases: [{ id: "PH-M21", name: "Phase 1" }] },
  ],
  "DEV-005": [
    { id: "PRJ-E1", name: "Marassi", phases: [{ id: "PH-E1", name: "Phase 1" }, { id: "PH-E2", name: "Phase 2" }, { id: "PH-E3", name: "Phase 3" }] },
    { id: "PRJ-E2", name: "Cairo Gate", phases: [{ id: "PH-E4", name: "Phase 1" }] },
    { id: "PRJ-E21", name: "Mivida", phases: [{ id: "PH-E21", name: "Phase 1" }] },
  ],
}

// Simulate duplicate unit codes: if destination project ID ends in "1", pretend some codes clash
function simulateDuplicates(unitCodes: string[], destProjectId: string): string[] {
  if (destProjectId.endsWith("1") && unitCodes.length > 0) {
    return unitCodes.slice(0, Math.min(2, unitCodes.length))
  }
  return []
}

// ── Destination status metadata — drives the moved properties' resulting statuses ──

type DestStatusMeta = { listing: "Active" | "Hidden"; primary: "Launch" | "On-Sale" | "On-Hold" | "Sold-Off"; entry: "Automatic" | "Manual" }

/** Deterministic mock statuses per destination project / phase id. */
function destMeta(id: string): DestStatusMeta {
  const n = id.charCodeAt(id.length - 1) + id.length
  return {
    listing: n % 3 === 0 ? "Hidden" : "Active",
    primary: (["On-Sale", "Launch", "On-Sale", "On-Hold"] as const)[n % 4],
    entry: n % 2 === 0 ? "Automatic" : "Manual",
  }
}

const DEST_TONE: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-700",
  Launch: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "On-Sale": "border-emerald-200 bg-emerald-100 text-emerald-700",
  "On-Hold": "border-orange-200 bg-orange-50 text-orange-700",
  "Sold-Off": "border-red-200 bg-red-50 text-red-700",
  Automatic: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Manual: "border-blue-200 bg-blue-100 text-blue-700",
}

function DestTags({ id }: { id: string }) {
  const m = destMeta(id)
  return (
    <span className="inline-flex items-center gap-1">
      {[m.listing, m.primary, m.entry].map(v => (
        <span key={v} className={cn("inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium leading-4", DEST_TONE[v])}>{v}</span>
      ))}
    </span>
  )
}

const isPrimaryAuto = (g: GroupedProperty) => g.saleType === "Primary" && g.entryType === "Automatic"

/**
 * Compact selected-property row — the same component in single and bulk Change
 * Project: ID · Type - Subtype · bedrooms · area range · price range + the tags
 * (sale type, entry type, listing status, sale status; availability for Primary
 * Automatic only). `right` hosts row actions (e.g. similarity decisions).
 */
function PropertyInfoRow({ g, right }: { g: GroupedProperty; right?: React.ReactNode }) {
  const fmtPrice = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString())
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{g.id}</span>
        <span className="shrink-0 text-xs font-medium text-foreground">{g.propertyType}{g.propertySubType ? ` - ${g.propertySubType}` : ""}</span>
        {g.bedroom > 0 && <span className="shrink-0 text-xs text-muted-foreground">{g.bedroom} BR</span>}
        <span className="shrink-0 text-xs text-muted-foreground">{g.areaMin}–{g.areaMax} SQM</span>
        <span className="shrink-0 text-xs text-muted-foreground">{fmtPrice(g.priceMin)} – {fmtPrice(g.priceMax)} EGP</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", badgeClass[g.saleType])}>{g.saleType}</Badge>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", badgeClass[g.entryType])}>{g.entryType}</Badge>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", badgeClass[g.listingStatus])}>{g.listingStatus}</Badge>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium border", SALE_STATUS_CLS[g.saleStatus])}>{g.saleStatus}</Badge>
          {isPrimaryAuto(g) && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">{g.availableUnits} / {g.totalUnits} Available</Badge>
          )}
        </span>
      </div>
      {right}
    </div>
  )
}

/**
 * What moved properties become at the destination — per sale-type bucket, driven
 * by the destination's primary status and entry type:
 *  - Sold-Off destination → everything becomes Sold + Hidden.
 *  - On-Hold destination → Primary becomes Hold + Hidden; Launch keeps its sale
 *    status but is Hidden.
 *  - Otherwise the sale status carries over; an Automatic-entry destination keeps
 *    the moved properties Hidden until its feed syncs, Manual publishes them.
 */
function moveOutcomeLines(destId: string, groups: GroupedProperty[]): { bucket: string; sale: string; listing: "Published" | "Hidden" }[] {
  const m = destMeta(destId)
  const outcomeFor = (bucket: string): { sale: string; listing: "Published" | "Hidden" } => {
    if (m.primary === "Sold-Off") return { sale: "Sold", listing: "Hidden" }
    if (m.primary === "On-Hold") return bucket === "Launch" ? { sale: "Unchanged", listing: "Hidden" } : { sale: "Hold", listing: "Hidden" }
    return { sale: "Unchanged", listing: m.entry === "Automatic" ? "Hidden" : "Published" }
  }
  const buckets: string[] = []
  if (groups.some(g => g.saleType === "Launch")) buckets.push("Launch")
  if (groups.some(g => g.saleType === "Primary")) buckets.push("Primary")
  for (const g of groups) if (!["Launch", "Primary"].includes(g.saleType) && !buckets.includes(g.saleType)) buckets.push(g.saleType)
  return buckets.map(b => ({ bucket: b, ...outcomeFor(b) }))
}

const OUTCOME_TONE: Record<string, string> = {
  Sold: "border-red-200 bg-red-50 text-red-700",
  Hold: "border-amber-200 bg-amber-50 text-amber-700",
  Unchanged: "border-border bg-muted text-muted-foreground",
  Published: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-100 text-red-700",
}

/** "After the move" box — the resulting listing + sale status per bucket at the chosen destination. */
function MoveOutcomeBox({ destId, groups }: { destId: string; groups: GroupedProperty[] }) {
  const tag = (v: string) => <span className={cn("mx-0.5 inline-flex items-center rounded border px-1 py-0 align-[1px] text-[9px] font-medium leading-4", OUTCOME_TONE[v])}>{v}</span>
  return (
    <div className="space-y-1 rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">After the move</p>
      {moveOutcomeLines(destId, groups).map(l => (
        <p key={l.bucket} className="text-[11px] leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{l.bucket}</span> properties → Sale Status {tag(l.sale)} · Listing {tag(l.listing)}
        </p>
      ))}
    </div>
  )
}

/**
 * Similarity check for Launch / Primary-Manual groups: these carry no unit codes,
 * so the review matches on criteria (type · bedrooms · area · finishing) instead.
 * Deterministic mock: roughly half the groups find a similar destination match.
 */
function simulateSimilar(g: GroupedProperty, destProjectId: string): { criteria: string } | null {
  const seed = (g.bedroom + g.bathroom + destProjectId.length + destProjectId.charCodeAt(destProjectId.length - 1)) % 2
  return seed === 0
    ? { criteria: `${g.propertyType} · ${g.bedroom} BR · ${g.areaMin}–${g.areaMax} m² · ${g.finishing}` }
    : null
}

// ── Per-compound destination selector sub-component ───────────────────────────
interface DestSelectorProps {
  value: { devId: string; projectId: string; phaseId: string }
  onChange: (v: { devId: string; projectId: string; phaseId: string }) => void
  lockedDevName: string
  excludeProjectId: string
  excludeProjectName: string
}
function DestSelector({ value, onChange, lockedDevName, excludeProjectId, excludeProjectName }: DestSelectorProps) {
  // Developer is locked to the source developer — units cannot move to a compound under a different developer.
  // The source project is excluded so the destination can never equal the source.
  const projects = (value.devId ? (DEST_PROJECTS[value.devId] ?? []) : [])
    .filter(p => p.id !== excludeProjectId && p.name !== excludeProjectName)
  const phases = projects.find(p => p.id === value.projectId)?.phases ?? []
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Developer <span className="normal-case font-normal">(locked)</span></label>
        <Select value={value.devId} disabled>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue>{lockedDevName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DEST_DEVELOPERS.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Project</label>
        <Select value={value.projectId} onValueChange={v => onChange({ ...value, projectId: v, phaseId: "none" })} disabled={!value.devId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={value.devId ? "Select…" : "— pick dev first"} />
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0
              ? <div className="px-2 py-1.5 text-xs text-muted-foreground">No other project under this developer</div>
              : projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{p.name}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">{p.id}</span>
                    </span>
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phase <span className="normal-case font-normal">(optional)</span></label>
        <Select value={value.phaseId} onValueChange={v => onChange({ ...value, phaseId: v })} disabled={!value.projectId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={!value.projectId ? "— pick project" : phases.length === 0 ? "No phases" : "Select…"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">No specific phase</SelectItem>
            {phases.map(ph => (
              <SelectItem key={ph.id} value={ph.id} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <span>{ph.name}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{ph.id}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* The destination's statuses decide what the moved properties become */}
      {value.projectId && (() => {
        const src = value.phaseId !== "none" ? value.phaseId : value.projectId
        const m = destMeta(src)
        const proj = projects.find(p => p.id === value.projectId)
        const phase = value.phaseId !== "none" ? (proj?.phases ?? []).find(ph => ph.id === value.phaseId) : null
        return (
          <p className="col-span-3 text-[11px] leading-5 text-muted-foreground">
            Moved properties take their <span className="font-medium text-foreground">sale &amp; listing status</span> from the destination —{" "}
            <span className="font-medium text-foreground">{phase ? `${proj?.name} / ${phase.name}` : proj?.name}</span> is{" "}
            <span className={cn("mx-0.5 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium leading-4 align-[1px]", DEST_TONE[m.primary])}>{m.primary}</span>
            <span className={cn("mx-0.5 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium leading-4 align-[1px]", DEST_TONE[m.entry])}>{m.entry} entry</span>
            <span className={cn("mx-0.5 inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium leading-4 align-[1px]", DEST_TONE[m.listing])}>{m.listing}</span>.
          </p>
        )
      })()}
    </div>
  )
}

// ── Bulk Change Listing Status — unit counts by sale type + destination tree ──

const LISTING_META: Record<string, { icon: React.ElementType; cls: string; note: string }> = {
  Published: { icon: Eye, cls: "border-emerald-300 bg-emerald-50 text-emerald-700", note: "Visible on Website and E-realty." },
  Hidden: { icon: EyeOff, cls: "border-red-300 bg-red-50 text-red-700", note: "Hidden from the website and E-realty." },
}

// Sale-type buckets — Primary splits by entry type, each with its own light tone
const SALE_TYPE_BUCKETS: { key: string; match: (g: GroupedProperty) => boolean; cls: string }[] = [
  { key: "Launch", match: g => g.saleType === "Launch", cls: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { key: "Primary Automatic", match: g => g.saleType === "Primary" && g.entryType === "Automatic", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "Primary Manual", match: g => g.saleType === "Primary" && g.entryType === "Manual", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  { key: "Resale", match: g => g.saleType === "Resale", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "Nawy Now", match: g => g.saleType === "Nawy Now", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  { key: "Rentals", match: g => g.saleType === "Rental", cls: "border-red-200 bg-red-50 text-red-600" },
]

/** Plain-text sale-type breakdown, count first: "2 Launch · 1 Resale". */
const saleTypeBreakdown = (gs: GroupedProperty[]) =>
  SALE_TYPE_BUCKETS.map(b => ({ n: gs.filter(b.match).length, key: b.key }))
    .filter(x => x.n > 0)
    .map(x => `${x.n} ${x.key}`)
    .join(" · ")

/**
 * Bulk Change Listing Status — pick Published / Hidden at the top, see the selected
 * properties broken down by sale type, then by developer → project → phase.
 * Developer counts equal the sum of their projects + phases; a main project only
 * shows counts for properties linked directly to it (none when all sit under phases).
 * Only properties not already at the destination status are changed.
 */
function BulkListingDialog({ groups, onClose, onApply }: {
  groups: GroupedProperty[]
  onClose: () => void
  onApply: (target: string, changingIds: string[]) => void
}) {
  const [target, setTarget] = useState("")
  const changing = target ? groups.filter(g => g.listingStatus !== target) : groups

  // developer → project (direct groups + phases) tree of the IMPACTED properties only —
  // the "Properties selected" totals above keep the full selection
  const tree = useMemo(() => {
    const devs = new Map<string, { name: string; id: string; projects: Map<string, { name: string; id: string; direct: GroupedProperty[]; phases: Map<string, { name: string; id: string; groups: GroupedProperty[] }> }> }>()
    for (const g of changing) {
      if (!devs.has(g.developer.id)) devs.set(g.developer.id, { name: g.developer.name, id: g.developer.id, projects: new Map() })
      const d = devs.get(g.developer.id)!
      if (!d.projects.has(g.project.id)) d.projects.set(g.project.id, { name: g.project.name, id: g.project.id, direct: [], phases: new Map() })
      const p = d.projects.get(g.project.id)!
      if (g.phase) {
        if (!p.phases.has(g.phase.id)) p.phases.set(g.phase.id, { name: g.phase.name, id: g.phase.id, groups: [] })
        p.phases.get(g.phase.id)!.groups.push(g)
      } else {
        p.direct.push(g)
      }
    }
    return [...devs.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, target])

  // Plain muted text at each node — colored tags stay in the totals row above only
  const nodeBreakdown = (gs: GroupedProperty[]) => (
    <span className="max-w-[60%] shrink-0 text-right text-[11px] leading-4 tabular-nums text-muted-foreground">{saleTypeBreakdown(gs)}</span>
  )

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:!max-w-3xl p-0 gap-0 flex flex-col" style={{ maxHeight: "88vh" }}>
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>Change Listing Status</DialogTitle>
          <DialogDescription>
            Set Listing status to show or hide the selected properties.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Destination status picker */}
          <div className="grid grid-cols-2 gap-2">
            {["Published", "Hidden"].map(s => {
              const m = LISTING_META[s]
              const Icon = m.icon
              const selected = target === s
              return (
                <button
                  key={s}
                  onClick={() => setTarget(s)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    selected ? m.cls : "border-border hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{s}</div>
                    <div className="text-[11px] opacity-80 leading-snug">{m.note}</div>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Only-changed summary */}
          {target && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm">
              <span><span className="font-semibold">{changing.length}</span> of <span className="font-semibold">{groups.length}</span> selected will change to <span className="font-medium">{target}</span></span>
              {groups.length - changing.length > 0 && (
                <span className="text-xs text-muted-foreground">{groups.length - changing.length} already {target} — no change</span>
              )}
            </div>
          )}

          {/* Properties selected — total + breakdown by sale type (colored tags live here only) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties selected</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground">
                Total {groups.length.toLocaleString()} Properties
              </span>
              {SALE_TYPE_BUCKETS.map(b => {
                const n = groups.filter(b.match).length
                return n > 0 ? (
                  <span key={b.key} className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", b.cls)}>
                    {n.toLocaleString()} {b.key}
                  </span>
                ) : null
              })}
            </div>
          </div>

          {/* Breakdown: developer → project → phase (developer = sum of all below) */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impacted properties by developer, project and phase</p>
            {tree.map(dev => {
              const devGroups = [...dev.projects.values()].flatMap(p => [...p.direct, ...[...p.phases.values()].flatMap(ph => ph.groups)])
              return (
                <div key={dev.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold text-foreground truncate">{dev.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{dev.id}</span>
                    </div>
                    {nodeBreakdown(devGroups)}
                  </div>
                  {[...dev.projects.values()].map(p => (
                    <div key={p.id} className="border-b border-border/70 last:border-b-0">
                      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-muted/20">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{p.id}</span>
                        </div>
                        {/* counts only for properties linked directly to the main project */}
                        {p.direct.length > 0 ? nodeBreakdown(p.direct) : null}
                      </div>
                      {[...p.phases.values()].map(ph => (
                        <div key={ph.id} className="flex items-center justify-between gap-3 pl-8 pr-4 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-muted-foreground truncate">{ph.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{ph.id}</span>
                          </div>
                          {nodeBreakdown(ph.groups)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}><X className="mr-1 h-3 w-3" /> Cancel</Button>
          <Button size="sm" disabled={!target || changing.length === 0} onClick={() => onApply(target, changing.map(g => g.id))}>
            {target && changing.length > 0
              ? `Set ${changing.length} to ${target}`
              : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ChangeProjectModalProps {
  open: boolean
  onClose: () => void
  selectedGroups: GroupedProperty[]
  onConfirm: (moves: { groupIds: string[]; devId: string; projectId: string; phaseId: string | null }[]) => void
  /** Sale types allowed to move. Defaults to bulk-action behavior; details page passes all types. */
  eligibleTypes?: GroupedProperty["saleType"][]
}

const ALL_SALE_TYPES: GroupedProperty["saleType"][] = ["Primary", "Resale", "Nawy Now", "Rental", "Launch"]

function ChangeProjectModal({ open, onClose, selectedGroups, onConfirm, eligibleTypes = ["Primary", "Launch"] }: ChangeProjectModalProps) {
  const isSingle = selectedGroups.length === 1
  const isPA = (g: GroupedProperty) => g.saleType === "Primary" && g.entryType === "Automatic"
  const eligible = selectedGroups.filter(g => eligibleTypes.includes(g.saleType))
  const ineligible = selectedGroups.filter(g => !eligibleTypes.includes(g.saleType))

  // Group eligible by compound key: devId|projectId|phaseId — each compound picks its own destination
  type CompoundGroup = {
    key: string
    devId: string; devName: string
    projectId: string; projectName: string
    phaseId: string | null; phaseName: string | null
    groups: GroupedProperty[]
  }
  const compoundGroups: CompoundGroup[] = useMemo(() => {
    const map = new Map<string, CompoundGroup>()
    for (const g of eligible) {
      const key = `${g.developer.id}|${g.project.id}|${g.phase?.id ?? "none"}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          devId: g.developer.id, devName: g.developer.name,
          projectId: g.project.id, projectName: g.project.name,
          phaseId: g.phase?.id ?? null, phaseName: g.phase?.name ?? null,
          groups: [],
        })
      }
      map.get(key)!.groups.push(g)
    }
    return Array.from(map.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroups])

  type DestState = { devId: string; projectId: string; phaseId: string }
  const [destinations, setDestinations] = useState<Record<string, DestState>>({})
  const [step, setStep] = useState<"select" | "review" | "loading" | "done">("select")
  const [conflictMap, setConflictMap] = useState<Record<string, string[]>>({}) // compound key → duplicate unit codes
  // Similarity decisions for every non-Primary-Automatic property: merge / move as new / drop from the move
  const [simDecisions, setSimDecisions] = useState<Record<string, "similar" | "new" | "exclude">>({})
  // Snapshot for the done screen — confirming clears the parent selection, which empties live-derived counts
  const [doneSnap, setDoneSnap] = useState<{ groups: number; units: number; compounds: number; lines: { from: string; to: string }[] } | null>(null)

  React.useEffect(() => {
    if (open) {
      setStep("select")
      // Pre-select (and lock) each destination developer to its source developer.
      // Note: depend only on `open` — compoundGroups is a fresh array each render.
      const init: Record<string, DestState> = {}
      for (const cg of compoundGroups) init[cg.key] = { devId: cg.devId, projectId: "", phaseId: "none" }
      setDestinations(init)
      setConflictMap({})
      setSimDecisions({})
      setDoneSnap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setDest = (key: string, v: DestState) => setDestinations(prev => ({ ...prev, [key]: v }))
  const allDestinationsSet = compoundGroups.every(cg => destinations[cg.key]?.projectId)

  function handleCheck() {
    const newConflictMap: Record<string, string[]> = {}
    const decisions: Record<string, "similar" | "new" | "exclude"> = {}
    for (const cg of compoundGroups) {
      const dest = destinations[cg.key]
      if (!dest?.projectId) continue
      // Unit-code duplicate check — Primary Automatic only (they carry unit codes)
      const codes = cg.groups.filter(isPA).flatMap(g => g.details.map(d => d.unitCode))
      const dupes = simulateDuplicates(codes, dest.projectId)
      if (dupes.length > 0) newConflictMap[cg.key] = dupes
      // Everything else has no unit codes — similarity check by criteria, defaulting to merge on a match
      for (const g of cg.groups.filter(g => !isPA(g))) {
        decisions[g.id] = simulateSimilar(g, dest.projectId) ? "similar" : "new"
      }
    }
    setConflictMap(newConflictMap)
    setSimDecisions(decisions)
    setStep("review")
  }

  const movedEligible = eligible.filter(g => simDecisions[g.id] !== "exclude")
  const excludedCount = eligible.length - movedEligible.length
  const mergedCount = eligible.filter(g => simDecisions[g.id] === "similar").length
  const totalGroupsMoved = movedEligible.length
  const totalDetailsMoved = movedEligible.reduce((s, g) => s + g.details.length, 0)
  const totalConflicts = Object.values(conflictMap).reduce((s, a) => s + a.length, 0)

  function handleConfirm() {
    const moves = compoundGroups.map(cg => {
      const d = destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }
      return {
        groupIds: cg.groups.filter(g => simDecisions[g.id] !== "exclude").map(g => g.id),
        devId: d.devId,
        projectId: d.projectId,
        phaseId: d.phaseId !== "none" ? d.phaseId : null,
      }
    }).filter(m => m.groupIds.length > 0)
    setDoneSnap({
      groups: totalGroupsMoved,
      units: totalDetailsMoved,
      compounds: compoundGroups.length,
      lines: compoundGroups.map(cg => {
        const d = destinations[cg.key]
        const proj = (DEST_PROJECTS[d?.devId ?? ""] ?? []).find(p => p.id === d?.projectId)
        const dev = DEST_DEVELOPERS.find(x => x.id === d?.devId)
        return proj ? { from: cg.projectName, to: `${dev?.name} · ${proj.name}` } : null
      }).filter((l): l is { from: string; to: string } => l !== null),
    })
    setStep("loading")
    setTimeout(() => {
      onConfirm(moves)
      setStep("done")
    }, 1500)
  }

  // ── Shared building blocks ──────────────────────────────────────────────────

  const destOf = (cg: CompoundGroup) => {
    const dest = destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }
    const destDev = DEST_DEVELOPERS.find(d => d.id === dest.devId)
    const destProj = (DEST_PROJECTS[dest.devId] ?? []).find(p => p.id === dest.projectId)
    const destPhase = dest.phaseId !== "none" ? (destProj?.phases ?? []).find(ph => ph.id === dest.phaseId) : null
    return { dest, destDev, destProj, destPhase }
  }

  /** Source → destination header line for a review card. */
  const routeLine = (cg: CompoundGroup) => {
    const { destDev, destProj, destPhase } = destOf(cg)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{cg.devName} ›</span>
          <span className="text-xs font-semibold text-foreground">{cg.projectName}{cg.phaseName ? ` — ${cg.phaseName}` : ""}</span>
        </div>
        <MoveRight className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs text-muted-foreground">{destDev?.name} ›</span>
          <span className="text-xs font-semibold text-foreground">{destProj?.name}{destPhase ? ` — ${destPhase.name}` : ""}</span>
          {destProj && <DestTags id={destPhase?.id ?? destProj.id} />}
        </div>
      </div>
    )
  }

  /** Unit-code check — Primary Automatic. Informational only: conflicts overwrite on confirm. */
  const unitCodeBlock = (cg: CompoundGroup) => {
    const autoG = cg.groups.filter(isPA)
    if (autoG.length === 0) return null
    const units = autoG.flatMap(g => g.details)
    const dupes = conflictMap[cg.key] ?? []
    const { destProj } = destOf(cg)
    return (
      <div className="space-y-2 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unit-code check · Primary Automatic</p>
          <span className="text-[11px] tabular-nums text-muted-foreground">{units.length} unit code{units.length !== 1 ? "s" : ""} transferring</span>
        </div>
        {dupes.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span><span className="font-semibold">{dupes.length} of {units.length} unit codes already exist in {destProj?.name}</span> — on confirm, the source units <span className="font-semibold">overwrite</span> the matching destination records.</span>
            </p>
            <div className="flex flex-wrap gap-1.5 pl-5">
              {dupes.map(code => (
                <span key={code} className="inline-flex items-center rounded border border-amber-200 bg-white px-2 py-0.5 font-mono text-[10px] text-amber-700">{code}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            No unit code conflicts in {destProj?.name} — all {units.length} units move cleanly.
          </p>
        )}
      </div>
    )
  }

  /** Similarity check — every non-Primary-Automatic property (no unit codes to match on). */
  const similarityBlock = (cg: CompoundGroup) => {
    const simG = cg.groups.filter(g => !isPA(g))
    if (simG.length === 0) return null
    const { dest, destProj } = destOf(cg)
    return (
      <div className="px-5 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Similarity check · No unit codes — matched by criteria</p>
          <span className="text-[11px] tabular-nums text-muted-foreground">{simG.length} propert{simG.length !== 1 ? "ies" : "y"}</span>
        </div>
        <div className="divide-y divide-border/70 rounded-lg border border-border">
          {simG.map(g => {
            const match = simulateSimilar(g, dest.projectId)
            const decision = simDecisions[g.id] ?? (match ? "similar" : "new")
            const opts: { v: "similar" | "new" | "exclude"; label: string; activeCls: string }[] = [
              ...(match ? [{ v: "similar" as const, label: "Merge — same property", activeCls: "bg-emerald-600 text-white" }] : []),
              { v: "new", label: match ? "Different — move as new" : "Move as new", activeCls: "bg-primary text-primary-foreground" },
              { v: "exclude", label: "Exclude", activeCls: "bg-red-600 text-white" },
            ]
            return (
              <div key={g.id} className={cn("space-y-0.5 pb-2", decision === "exclude" && "opacity-50")}>
                <PropertyInfoRow
                  g={g}
                  right={
                    <div className="flex shrink-0 overflow-hidden rounded-md border border-border text-[11px] font-medium">
                      {opts.map(o => (
                        <button
                          key={o.v}
                          onClick={() => setSimDecisions(prev => ({ ...prev, [g.id]: o.v }))}
                          className={cn("whitespace-nowrap px-2 py-1 transition-colors", decision === o.v ? o.activeCls : "text-muted-foreground hover:bg-muted")}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  }
                />
                {match ? (
                  <p className="flex items-start gap-1.5 px-4 text-[11px] text-amber-700">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>Similar property found in <strong>{destProj?.name}</strong> — {match.criteria}. Merging updates it instead of creating a new one.</span>
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5 px-4 text-[11px] text-emerald-700">
                    <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>No similar property in <strong>{destProj?.name}</strong> — it will be created as new.</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const single = eligible[0]
  const singleCg = compoundGroups[0]

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      {/* Compact for a single property; bulk needs room for the selection */}
      <DialogContent className={cn("p-0 gap-0 flex flex-col", isSingle ? "w-[92vw] sm:!max-w-2xl" : "!max-w-5xl w-[95vw] sm:!max-w-5xl")} style={{ maxHeight: "92vh" }}>
        <DialogTitle className="sr-only">Change Project</DialogTitle>
        <DialogDescription className="sr-only">Move the selected properties to a different project.</DialogDescription>

        {/* Header — steps sit next to the title so they never collide with the close button */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border py-4 pl-6 pr-12">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Change Project</h2>
          {/* right-aligned; header pr-12 keeps it clear of the dialog close button */}
          {(step === "select" || step === "review") && (
            <div className="ml-auto flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <span className={cn(step === "select" && "font-semibold text-foreground")}>1 Select</span>
              <ChevronRight className="h-3 w-3" />
              <span className={cn(step === "review" && "font-semibold text-foreground")}>2 Review</span>
            </div>
          )}
          {step === "done" && (
            <Badge className="ml-auto border border-emerald-200 bg-emerald-100 text-xs font-medium text-emerald-700">Done</Badge>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: SELECT ── */}
          {step === "select" && (
            <div className="space-y-4 p-6">

              {isSingle && single ? (
                <>
                  {/* The property being moved — same compact row as bulk, plus its current location */}
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <PropertyInfoRow g={single} />
                    <div className="flex items-center gap-1.5 border-t border-border/70 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        Current: <span className="font-medium text-foreground">{single.developer.name}</span> › <span className="font-medium text-foreground">{single.project.name}{single.phase ? ` — ${single.phase.name}` : ""}</span>
                      </span>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2 rounded-xl border border-border bg-muted/20 px-4 py-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <MoveRight className="h-3 w-3" /> Destination
                    </p>
                    <DestSelector
                      value={destinations[singleCg?.key ?? ""] ?? { devId: "", projectId: "", phaseId: "none" }}
                      onChange={v => singleCg && setDest(singleCg.key, v)}
                      lockedDevName={singleCg?.devName ?? ""}
                      excludeProjectId={singleCg?.projectId ?? ""}
                      excludeProjectName={singleCg?.projectName ?? ""}
                    />
                    {(() => {
                      const d = destinations[singleCg?.key ?? ""]
                      return d?.projectId ? <MoveOutcomeBox destId={d.phaseId !== "none" ? d.phaseId : d.projectId} groups={[single]} /> : null
                    })()}
                  </div>

                  <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-xs text-blue-800">
                      <strong>The property title will be changed.</strong> Titles are auto-generated from the project, phase and developer — moving re-titles it for the destination.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* What's selected — buckets the data-ops user cares about */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground">
                      {eligible.length} moving
                    </span>
                    {SALE_TYPE_BUCKETS.map(b => {
                      const n = eligible.filter(b.match).length
                      return n > 0 ? (
                        <span key={b.key} className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", b.cls)}>
                          {n} {b.key}
                        </span>
                      ) : null
                    })}
                  </div>

                  {ineligible.length > 0 && (
                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs text-amber-800">
                        <span className="font-semibold">{ineligible.length} propert{ineligible.length !== 1 ? "ies" : "y"} skipped</span> — Resale, Nawy Now and Rental can't be moved in bulk. Open them one by one to change their project.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-xs text-blue-800">
                      <strong>Property titles will be changed.</strong> Titles are auto-generated from the project, phase and developer.
                    </p>
                  </div>

                  {eligible.length === 0 ? (
                    <div className="space-y-1 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                      <p className="text-sm font-medium text-foreground">No movable properties selected</p>
                      <p className="text-xs text-muted-foreground">Select Primary or Launch properties to use Change Project.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {compoundGroups.length} source compound{compoundGroups.length !== 1 ? "s" : ""} — set a destination for each
                      </p>
                      {compoundGroups.map(cg => (
                        <div key={cg.key} className="overflow-hidden rounded-xl border border-border bg-card">
                          <div className="border-b border-border bg-muted/50 px-5 py-2.5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{cg.devName}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">{cg.devId}</span>
                              <span className="text-xs text-muted-foreground">›</span>
                              <span className="text-sm font-semibold text-foreground">{cg.projectName}{cg.phaseName ? ` — ${cg.phaseName}` : ""}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">{cg.phaseId ?? cg.projectId}</span>
                              <DestTags id={cg.phaseId ?? cg.projectId} />
                              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{cg.groups.length} propert{cg.groups.length !== 1 ? "ies" : "y"}</span>
                            </div>
                          </div>
                          <div className="divide-y divide-border/70">
                            {cg.groups.map(g => <PropertyInfoRow key={g.id} g={g} />)}
                          </div>
                          <div className="space-y-2 border-t border-border bg-muted/20 px-5 py-3.5">
                            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <MoveRight className="h-3 w-3" /> Destination
                            </p>
                            <DestSelector
                              value={destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }}
                              onChange={v => setDest(cg.key, v)}
                              lockedDevName={cg.devName}
                              excludeProjectId={cg.projectId}
                              excludeProjectName={cg.projectName}
                            />
                            {(() => {
                              const d = destinations[cg.key]
                              return d?.projectId ? <MoveOutcomeBox destId={d.phaseId !== "none" ? d.phaseId : d.projectId} groups={cg.groups} /> : null
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === "review" && (
            <div className="space-y-4 p-6">
              {/* Bulk gets an outcome summary; single keeps it minimal */}
              {!isSingle && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm">
                  <span className="font-medium">{totalGroupsMoved} propert{totalGroupsMoved !== 1 ? "ies" : "y"} will be moved</span>
                  {totalConflicts > 0 ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />{totalConflicts} unit-code conflict{totalConflicts !== 1 ? "s" : ""} (overwritten on confirm)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />No unit-code conflicts
                    </span>
                  )}
                  {mergedCount > 0 && <span className="text-sm font-medium text-emerald-700">{mergedCount} merging as similar</span>}
                  {excludedCount > 0 && <span className="text-sm font-medium text-red-600">{excludedCount} excluded</span>}
                </div>
              )}

              <div className="space-y-4">
                {compoundGroups.map(cg => (
                  <div key={cg.key} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border bg-muted/50 px-5 py-3">{routeLine(cg)}</div>
                    <div className="divide-y divide-border/70">
                      {unitCodeBlock(cg)}
                      {similarityBlock(cg)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRANSFERRING (loading) ── */}
          {step === "loading" && (
            <div className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Transferring…</p>
                <p className="text-sm text-muted-foreground">
                  Moving {totalGroupsMoved} propert{totalGroupsMoved !== 1 ? "ies" : "y"} across {compoundGroups.length} compound{compoundGroups.length !== 1 ? "s" : ""}. Please wait.
                </p>
              </div>
            </div>
          )}

          {/* ── CONFIRMATION (done) ── */}
          {step === "done" && (
            <div className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Transfer complete</p>
                <p className="text-sm text-muted-foreground">
                  {doneSnap?.groups ?? 0} grouped propert{(doneSnap?.groups ?? 0) !== 1 ? "ies" : "y"} · {doneSnap?.units ?? 0} detailed units moved across {doneSnap?.compounds ?? 0} compound{(doneSnap?.compounds ?? 0) !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="mt-2 inline-flex flex-col items-start gap-1 rounded-lg border border-border bg-muted/40 px-5 py-3 text-left">
                {(doneSnap?.lines ?? []).map((l, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{l.from}</span>
                    {" → "}
                    <span className="font-medium text-foreground">{l.to}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — no counts on single moves */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-6 py-4">
          <div className="text-xs text-muted-foreground">
            {!isSingle && step === "select" && eligible.length > 0 && (
              <span>{compoundGroups.length} compound{compoundGroups.length !== 1 ? "s" : ""} · {eligible.length} propert{eligible.length !== 1 ? "ies" : "y"}</span>
            )}
            {step === "review" && totalConflicts > 0 && (
              <span className="font-medium text-amber-600">Conflicting unit codes overwrite the destination on confirm</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === "select" && (
              <>
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleCheck} disabled={!allDestinationsSet || eligible.length === 0}>
                  {isSingle && single ? (isPA(single) ? "Check unit codes" : "Check similarity") : "Run checks"}
                  <MoveRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" onClick={handleConfirm} disabled={totalGroupsMoved === 0}>
                  {totalGroupsMoved === 0 ? "All properties excluded" : "Confirm transfer"}
                </Button>
              </>
            )}
            {step === "loading" && (
              <Button size="sm" disabled>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Transferring…
              </Button>
            )}
            {step === "done" && (
              <Button size="sm" onClick={onClose}>Done</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type GroupDetailPayload = { group: GroupedProperty; allRows: PropertyRow[]; index: number }

// Columns already shown on the grouped-property container card → hidden in the
// embedded per-unit table. Sale status ("availability") and "listingStatus" are
// intentionally kept visible (they belong on both levels).
const GROUPED_HIDDEN_COLS: ColId[] = [
  "propertyId", "propertyMetadataId",
  "developer", "project", "phase",
  "district", "area", "subarea",
  "propertyCategory", "propertyType", "propertySubType",
  "finishingType", "finishingLevel",
  "deliveryType", "deliveryDate",
  "grossBua", "bedrooms", "bathrooms", "price",
  "source", "saleType", "entryType",
  "availabilityUpdatedAt", "priceUpdatedAt", "propertyCreatedAt", "propertyUpdatedAt",
]

const DETAIL_TABS = [
  { value: "additional-info", label: "Additional Info", icon: Info },
  { value: "detailed-properties", label: "Detailed Properties", icon: List },
  { value: "payment-plans", label: "Payment Plans", icon: CreditCard },
  { value: "floor-plans", label: "Floor Plans", icon: LayoutTemplate },
  { value: "gallery", label: "Gallery", icon: ImageIcon },
  { value: "attachments", label: "Attachments", icon: Paperclip },
  { value: "price-history", label: "Price History", icon: History },
  { value: "ingestion-entries", label: "Entries", icon: Database },
  { value: "audit-logs", label: "Audit Logs", icon: ScrollText },
]

// Tabs that reuse the unit-drawer panels (value → PropertyDetailTab tab id)
const SHARED_PANEL_MAP: Record<string, string> = {
  "floor-plans": "floor-plans",
  gallery: "images",
  "payment-plans": "payment-plans",
  "price-history": "price-history",
  "ingestion-entries": "entries-log",
  "audit-logs": "activity-log",
}

// ── Grouped Property details page ───────────────────────────────────────────────
export function GroupedPropertyDetails({
  group,
  allRows,
  index,
  onBack,
}: {
  group: GroupedProperty
  allRows: PropertyRow[]
  index: number
  onBack: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const units = allRows.slice(index * 3, index * 3 + group.details.length)
  // Representative unit row that drives the shared drawer panels (gallery, plans, etc.)
  const [repRow, setRepRow] = useState<PropertyRow | null>(units[0] ?? null)
  const updateRepRow = (_id: string, patch: Partial<PropertyRow>) => setRepRow((r) => (r ? { ...r, ...patch } : r))
  // Entries tab exists only for Primary units (Primary Manual / Primary Automatic).
  const isPrimaryVariation = variationOf(group) === "primary-manual" || variationOf(group) === "primary-automatic"
  const detailTabs = DETAIL_TABS.filter((t) => t.value !== "ingestion-entries" || isPrimaryVariation)

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        {/* Back (above breadcrumb, plain text + icon) */}
        <div className="space-y-2 px-1 pt-1">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <span>Properties</span>
            <ChevronRight className="h-3 w-3" />
            <button onClick={onBack} className="hover:text-foreground hover:underline">All Properties</button>
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[220px] truncate font-medium text-foreground">{group.id}</span>
          </div>
        </div>

        {/* ── Main container: the exact grouped property card ── */}
        <GroupCard
          group={group}
          globalIndex={index}
          allRows={allRows}
          isExpanded={expanded}
          onToggle={() => setExpanded((e) => !e)}
          hiddenCols={GROUPED_HIDDEN_COLS}
          isSelected={false}
          onSelect={() => {}}
          onView={() => {}}
          detailView
        />

        {/* ── Tabs — single-row scrollable icon tabs (shared design system) ── */}
        <Tabs defaultValue="additional-info" className="space-y-4">
          <TabStrip>
            <TabsList className="w-max">
              {detailTabs.map((t) => <TabsTrigger key={t.value} value={t.value}><t.icon className="mr-1.5 h-3.5 w-3.5" />{t.label}</TabsTrigger>)}
            </TabsList>
          </TabStrip>

          <TabsContent value="detailed-properties">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">Detailed Properties</h3>
                <span className="text-xs text-muted-foreground">({group.details.length} units)</span>
              </div>
              <EmbeddedPropertyTable rows={units} hiddenColumns={GROUPED_HIDDEN_COLS} variation={variationOf(group)} />
            </div>
          </TabsContent>

          {detailTabs.filter((t) => t.value !== "detailed-properties").map((t) => {
            const panelTab = SHARED_PANEL_MAP[t.value]
            return (
              <TabsContent key={t.value} value={t.value}>
                {t.value === "additional-info" ? (
                  <AdditionalInfoTab group={group} />
                ) : panelTab ? (
                  <div className="rounded-xl border border-border bg-card">
                    {repRow ? (
                      <PropertyDetailTab tab={panelTab} row={repRow} onUpdateRow={updateRepRow} variation={variationOf(group)} priceRange={{ min: group.priceMin, max: group.priceMax }} />
                    ) : (
                      <div className="px-6 py-16 text-center text-sm text-muted-foreground">No units in this group.</div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">Coming soon.</p>
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}

export function GroupedPropertiesView({
  filters,
  sortConfigs = [],
  filterGroups = [],
  groupConnector = "AND",
  groupByColumn = null,
  scopeProjectName,
  onOpenGroupDetail,
  onCreateProperty,
}: {
  filters: SharedFilterState
  sortConfigs?: SortConfig[]
  filterGroups?: FilterGroup[]
  groupConnector?: "AND" | "OR"
  groupByColumn?: string | null
  /** Project-details embed: keep only this project's cards (falls back to all when mock names don't match). */
  scopeProjectName?: string
  onOpenGroupDetail?: (d: GroupDetailPayload) => void
  onCreateProperty?: (v: Variation) => void
}) {
  const [allGroups, setGroups] = useState<GroupedProperty[]>(() => makeGroups())
  const groups = useMemo(() => {
    if (!scopeProjectName) return allGroups
    const matched = allGroups.filter((g) => g.project.name === scopeProjectName)
    return matched.length ? matched : allGroups
  }, [allGroups, scopeProjectName])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([groups[0]?.id].filter(Boolean)))
  const allRows = useMemo(() => createRows(), [])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const lastSelectedIdxRef = useRef<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [showChangeCompound, setShowChangeCompound] = useState(false)
  const [bulkListingOpen, setBulkListingOpen] = useState(false)

  const openDetail = (group: GroupedProperty, index: number) =>
    onOpenGroupDetail?.({ group, allRows, index })

  const filteredGroups = useMemo(() => {
    const query = filters.searchQuery.toLowerCase()
    const filtered = groups.filter((group) => {
      if (filters.saleTypeFilter.size > 0 && !filters.saleTypeFilter.has(group.saleType)) return false
      if (filters.developerFilter.size > 0 && !filters.developerFilter.has(group.developer.name)) return false
      if (filters.projectFilter.size > 0 && !filters.projectFilter.has(group.project.name)) return false
      if (filters.entryTypeFilter.size > 0 && !filters.entryTypeFilter.has(group.entryType)) return false
      if (filters.listingFilter.size > 0 && !filters.listingFilter.has(group.listingStatus)) return false
      if (filters.propertyTypeFilter.size > 0 && !filters.propertyTypeFilter.has(group.propertyType)) return false
      if (filters.deliveryTypeFilter.size > 0 && !filters.deliveryTypeFilter.has(group.deliveryType)) return false
      if (!query) return true
      return [group.id, group.title, group.developer.name, group.project.name, group.propertyType].some((value) =>
        value.toLowerCase().includes(query),
      )
    })
    const afterAdvanced = filtered.filter((g) => applyAdvancedFilterToGroup(g, filterGroups, groupConnector))
    if (sortConfigs.length === 0) return afterAdvanced
    return [...afterAdvanced].sort((a, b) => {
      for (const cfg of sortConfigs) {
        const aVal = getGroupSortValue(a, cfg.column)
        const bVal = getGroupSortValue(b, cfg.column)
        const cmp = typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal))
        if (cmp !== 0) return cfg.direction === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [groups, filters, sortConfigs, filterGroups, groupConnector])

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const sectionKeys = useMemo(() => {
    if (!groupByColumn) return []
    const keys = new Set<string>()
    paginatedGroups.forEach((g) => keys.add(getGroupFieldValue(g, groupByColumn) || "Other"))
    return Array.from(keys)
  }, [paginatedGroups, groupByColumn])

  const handleCardSelect = (id: string, idx: number, shiftKey: boolean) => {
    setSelectedCards((prev) => {
      const next = new Set(prev)
      if (shiftKey && lastSelectedIdxRef.current !== null) {
        const start = Math.min(lastSelectedIdxRef.current, idx)
        const end = Math.max(lastSelectedIdxRef.current, idx)
        const rangeIds = paginatedGroups.slice(start, end + 1).map((g) => g.id)
        const allSelected = rangeIds.every((rid) => next.has(rid))
        rangeIds.forEach((rid) => (allSelected ? next.delete(rid) : next.add(rid)))
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
        lastSelectedIdxRef.current = idx
      }
      return next
    })
  }

  return (
    <div className="space-y-4">

      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={paginatedGroups.length > 0 && paginatedGroups.every((g) => selectedCards.has(g.id))}
            onCheckedChange={(c) => {
              setSelectedCards((prev) => {
                const next = new Set(prev)
                if (c) paginatedGroups.forEach((g) => next.add(g.id))
                else paginatedGroups.forEach((g) => next.delete(g.id))
                return next
              })
            }}
          />
          <span className="text-sm font-semibold text-foreground">Grouped Properties</span>
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs px-2">
            {filteredGroups.length.toLocaleString()}
          </Badge>
          {groupByColumn && sectionKeys.length > 0 && (
            <>
              <div className="w-px h-4 bg-border" />
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setCollapsedSections(new Set(sectionKeys))}>
                Collapse All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setCollapsedSections(new Set())}>
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
            <DropdownMenuItem onClick={() => onCreateProperty?.("launch")}>Launch</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateProperty?.("primary-manual")}>Primary Manual</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateProperty?.("resale")}>Resale</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateProperty?.("nawy-now")}>Nawy Now</DropdownMenuItem>
            <DropdownMenuItem disabled>Rental</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

        <div className="space-y-4">
          {groupByColumn ? (() => {
            const sections: Record<string, GroupedProperty[]> = {}
            paginatedGroups.forEach((group) => {
              const key = getGroupFieldValue(group, groupByColumn) || "Other"
              sections[key] = sections[key] ? [...sections[key], group] : [group]
            })
            return Object.entries(sections).map(([sectionKey, sectionGroups]) => {
              const isCollapsed = collapsedSections.has(sectionKey)
              return (
                <div key={sectionKey} className="space-y-3">
                  <button
                    className="flex w-full items-center gap-2 px-1 py-1 rounded-md hover:bg-secondary/60 transition-colors group"
                    onClick={() => setCollapsedSections((prev) => {
                      const next = new Set(prev)
                      next.has(sectionKey) ? next.delete(sectionKey) : next.add(sectionKey)
                      return next
                    })}
                  >
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isCollapsed && "-rotate-90")} />
                    <span className="text-sm font-semibold text-foreground">{sectionKey}</span>
                    <Badge variant="secondary" className="text-xs">{sectionGroups.length}</Badge>
                    <div className="flex-1 h-px bg-border" />
                  </button>
                  {!isCollapsed && sectionGroups.map((group) => {
                    const globalIndex = paginatedGroups.indexOf(group)
                    return (
                      <GroupCard
                        key={group.id}
                        group={group}
                        globalIndex={(currentPage - 1) * pageSize + globalIndex}
                        allRows={allRows}
                        isExpanded={expanded.has(group.id)}
                        onToggle={() => toggle(group.id)}
                        hiddenCols={GROUPED_HIDDEN_COLS}
                        isSelected={selectedCards.has(group.id)}
                        onSelect={(shiftKey) => handleCardSelect(group.id, globalIndex, shiftKey)}
                        onView={() => openDetail(group, (currentPage - 1) * pageSize + globalIndex)}
                      />
                    )
                  })}
                </div>
              )
            })
          })() : paginatedGroups.map((group, groupIndex) => {
            const globalIndex = (currentPage - 1) * pageSize + groupIndex
            return (
              <GroupCard
                key={group.id}
                group={group}
                globalIndex={globalIndex}
                allRows={allRows}
                isExpanded={expanded.has(group.id)}
                onToggle={() => toggle(group.id)}
                hiddenCols={GROUPED_HIDDEN_COLS}
                isSelected={selectedCards.has(group.id)}
                onSelect={(shiftKey) => handleCardSelect(group.id, groupIndex, shiftKey)}
                onView={() => openDetail(group, globalIndex)}
              />
            )
          })}
        </div>

      {/* Bulk action floating bar */}
      {selectedCards.size > 0 && (() => {
        const selGroups = groups.filter(g => selectedCards.has(g.id))
        const eligibleTypes: GroupedProperty["saleType"][] = ["Primary", "Launch"]
        const hasEligible = selGroups.some(g => eligibleTypes.includes(g.saleType))
        // Change Project is capped at 10 selected groups
        const tooManyForMove = selGroups.length > 10
        const canMove = hasEligible && !tooManyForMove

        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-zinc-900 text-white rounded-xl shadow-2xl overflow-hidden text-sm select-none">
            {/* Count + Select all */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-semibold tabular-nums">{selectedCards.size} selected</span>
              {filteredGroups.length > selectedCards.size ? (
                <button
                  onClick={() => setSelectedCards(new Set(filteredGroups.map(g => g.id)))}
                  className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
                >
                  Select all {filteredGroups.length.toLocaleString()}
                </button>
              ) : (
                <button
                  onClick={() => setSelectedCards(new Set())}
                  className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Listing status — opens the bulk impact popup; capped at 20 selected */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => selGroups.length <= 20 && setBulkListingOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 transition-colors",
                    selGroups.length <= 20 ? "hover:bg-zinc-800 cursor-pointer" : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Eye className="h-3.5 w-3.5 text-zinc-400" />
                  Listing Status
                </button>
              </TooltipTrigger>
              {selGroups.length > 20 && (
                <TooltipContent side="top" className="text-xs max-w-[240px]">
                  Changing the Listing status is limited to 20 Properties at a time.
                </TooltipContent>
              )}
            </Tooltip>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Change Project — Primary/Launch only, max 10 groups */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => canMove && setShowChangeCompound(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 transition-colors",
                    canMove ? "hover:bg-zinc-800 cursor-pointer" : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-400" />
                  Change Project
                </button>
              </TooltipTrigger>
              {!canMove && (
                <TooltipContent side="top" className="text-xs max-w-[240px]">
                  {tooManyForMove
                    ? "Changing Project action is limited to 10 Properties at a time."
                    : "Only Primary and Launch properties can be moved to a different project."}
                </TooltipContent>
              )}
            </Tooltip>

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
              onClick={() => setSelectedCards(new Set())}
              className="px-3 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })()}

      {/* Bulk listing status */}
      {bulkListingOpen && (
        <BulkListingDialog
          groups={groups.filter(g => selectedCards.has(g.id))}
          onClose={() => setBulkListingOpen(false)}
          onApply={(target, ids) => {
            const idSet = new Set(ids)
            setGroups(prev => prev.map(g => idSet.has(g.id) ? { ...g, listingStatus: target as GroupedProperty["listingStatus"] } : g))
            toast.success(`${ids.length} grouped propert${ids.length !== 1 ? "ies" : "y"} set to ${target}`)
            setBulkListingOpen(false)
            setSelectedCards(new Set())
          }}
        />
      )}

      {/* Change Project Modal */}
      <ChangeProjectModal
        open={showChangeCompound}
        onClose={() => setShowChangeCompound(false)}
        selectedGroups={groups.filter(g => selectedCards.has(g.id))}
        onConfirm={(moves) => {
          setGroups(prev => prev.map(g => {
            const move = moves.find(m => m.groupIds.includes(g.id))
            if (!move) return g
            const dev = DEST_DEVELOPERS.find(d => d.id === move.devId)
            const proj = (DEST_PROJECTS[move.devId] ?? []).find(p => p.id === move.projectId)
            const phase = move.phaseId ? (proj?.phases ?? []).find(ph => ph.id === move.phaseId) ?? null : null
            return {
              ...g,
              developer: dev ? { name: dev.name, id: dev.id, url: "#" } : g.developer,
              project: proj ? { name: proj.name, id: proj.id, url: "#" } : g.project,
              phase: phase ? { name: phase.name, id: phase.id, url: "#" } : g.phase,
            }
          }))
          setSelectedCards(new Set())
        }}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
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
            {filteredGroups.length === 0
              ? "0"
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredGroups.length)}`}{" "}
            of {filteredGroups.length.toLocaleString()} groups
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "10", "25", "50"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs">per page</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-1 text-sm">
              Page
              <Input
                type="number"
                value={currentPage}
                onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v) }}
                className="w-14 h-8 text-center"
                min={1}
                max={totalPages}
              />
              of {totalPages}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}

function AnalyticsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

export function GroupedPropertiesPage() {
  const emptyFilters: SharedFilterState = {
    searchQuery: "",
    districtFilter: new Set(),
    areaFilter: new Set(),
    planTypeFilter: new Set(),
    developerFilter: new Set(),
    projectFilter: new Set(),
    saleTypeFilter: new Set(),
    availabilityFilter: new Set(),
    entryTypeFilter: new Set(),
    listingFilter: new Set(),
    propertyCategoryFilter: new Set(),
    propertyTypeFilter: new Set(),
    propertySubTypeFilter: new Set(),
    finishingTypeFilter: new Set(),
    deliveryTypeFilter: new Set(),
    deliveryDateFrom: "",
    deliveryDateTo: "",
    priceMin: "",
    priceMax: "",
    planOfferFilter: "",
  }
  return (
    <div className="min-h-screen bg-secondary/40 p-4">
      <GroupedPropertiesView filters={emptyFilters} />
    </div>
  )
}

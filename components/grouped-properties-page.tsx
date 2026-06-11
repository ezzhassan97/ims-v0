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
  Edit,
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
  Tag,
  Wrench,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EmbeddedPropertyTable, PropertyDetailTab, createRows, type ColId, type PropertyRow } from "@/components/all-properties-page"

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

interface EntityRef { name: string; id: string; url: string }

interface GroupedProperty {
  id: string
  propertyMetadataId: string
  nawyNowId?: string
  resalePropertyId?: string
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
  saleType: "Primary" | "Resale" | "Nawy Now" | "Rental" | "Launch" | "Financing"
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
  Financing: "border-rose-200 bg-rose-50 text-rose-700",
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Hidden: "border-gray-200 bg-gray-50 text-gray-700",
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
  const CASES: { saleType: SaleT; entryType: "Manual" | "Automatic"; dp: number; count: number }[] = [
    { saleType: "Launch",    entryType: "Manual",    dp: 2, count: 3 },
    { saleType: "Primary",   entryType: "Manual",    dp: 2, count: 3 },
    { saleType: "Primary",   entryType: "Automatic", dp: 5, count: 3 },
    { saleType: "Resale",    entryType: "Manual",    dp: 1, count: 3 },
    { saleType: "Nawy Now",  entryType: "Manual",    dp: 1, count: 3 },
    { saleType: "Financing", entryType: "Manual",    dp: 1, count: 3 },
    { saleType: "Rental",    entryType: "Manual",    dp: 1, count: 3 },
  ]
  const plan: { saleType: SaleT; entryType: "Manual" | "Automatic"; dp: number }[] = CASES.flatMap((c) =>
    Array.from({ length: c.count }, () => ({ saleType: c.saleType, entryType: c.entryType, dp: c.dp })),
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
      nawyNowId: saleType === "Resale" ? `NN-${String(50100 + i * 17)}` : undefined,
      resalePropertyId: saleType === "Nawy Now" ? `RSL-${String(70200 + i * 23)}` : undefined,
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
        financing: saleType === "Financing",
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
  const [confirmArchive, setConfirmArchive] = useState(false)
  const descRef = useRef<HTMLParagraphElement>(null)
  const desc = group.description || ""
  const isAvailable = group.saleStatus === "Available"

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    // Measure with clamp: scrollHeight > clientHeight means text overflows
    setDescOverflows(el.scrollHeight > el.clientHeight)
  }, [desc])

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden relative", isSelected ? "border-primary ring-1 ring-primary/30" : "border-border")}>

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
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setConfirmArchive(false)}>Archive</Button>
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
        <div className="flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground">
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
          <Badge variant="outline" className={cn("border text-xs", SALE_STATUS_CLS[group.saleStatus])}>
            {group.saleStatus}
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
            <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="Edit" onClick={onView}>
              <Pencil className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="View on IMS" onClick={onView}>
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="More actions">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setListingStatus(listingStatus === "Published" ? "Hidden" : "Published")}>
                {listingStatus === "Published" ? "Hide Listing" : "Show Listing"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setConfirmArchive(true)}>
                <Archive className="h-3.5 w-3.5 mr-2 text-red-500" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!detailView && (
            <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" onClick={onToggle} title="Expand units">
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
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
          <FieldCell label="Type" icon={<Tag className="h-3 w-3" />}>
            {[group.propertyCategory, group.propertyType, group.propertySubType].filter(Boolean).join(" · ")}
          </FieldCell>
          <FieldCell label="Finishing" icon={<Wrench className="h-3 w-3" />}>
            {group.finishing}
          </FieldCell>
          <FieldCell label="Delivery" icon={<CalendarDays className="h-3 w-3" />}>
            {group.deliveryType} · {fmtDate(group.deliveryDate)}
          </FieldCell>
          <FieldCell label="Area" icon={<Ruler className="h-3 w-3" />}>
            {group.areaMin}–{group.areaMax} SQM
          </FieldCell>
          <FieldCell label="Source" icon={<Globe className="h-3 w-3" />}>
            {group.source}
          </FieldCell>
          <FieldCell label="Bedrooms" icon={<BedDouble className="h-3 w-3" />}>
            {group.bedroom}
          </FieldCell>
          <FieldCell label="Bathrooms" icon={<Bath className="h-3 w-3" />}>
            {group.bathroom}
          </FieldCell>
          <FieldCell label="Price" icon={<Banknote className="h-3 w-3" />}>
            {group.priceMin.toLocaleString()} – {group.priceMax.toLocaleString()} EGP
          </FieldCell>
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
              <Button variant="outline" size="icon-sm" className="bg-transparent h-5 w-5 ml-0.5" title="View payment plans">
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
              : projects.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
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
            {phases.map(ph => <SelectItem key={ph.id} value={ph.id} className="text-xs">{ph.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface ChangeProjectModalProps {
  open: boolean
  onClose: () => void
  selectedGroups: GroupedProperty[]
  onConfirm: (moves: { groupIds: string[]; devId: string; projectId: string; phaseId: string | null }[]) => void
}

function ChangeProjectModal({ open, onClose, selectedGroups, onConfirm }: ChangeProjectModalProps) {
  const eligibleTypes: GroupedProperty["saleType"][] = ["Primary", "Launch"]
  const eligible = selectedGroups.filter(g => eligibleTypes.includes(g.saleType))
  const ineligible = selectedGroups.filter(g => !eligibleTypes.includes(g.saleType))

  // Count ineligible by type
  const ineligibleByType = ineligible.reduce<Record<string, number>>((acc, g) => {
    acc[g.saleType] = (acc[g.saleType] ?? 0) + 1
    return acc
  }, {})

  // Group eligible by compound key: devId|projectId|phaseId
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
  }, [eligible])

  type DestState = { devId: string; projectId: string; phaseId: string }
  const [destinations, setDestinations] = useState<Record<string, DestState>>({})
  const [step, setStep] = useState<"select" | "review" | "loading" | "done">("select")
  const [conflictMap, setConflictMap] = useState<Record<string, string[]>>({}) // key → duplicate codes

  React.useEffect(() => {
    if (open) {
      setStep("select")
      // Pre-select (and lock) each destination developer to its source developer.
      // Note: depend only on `open` — compoundGroups is a fresh array each render, so
      // including it here would re-fire the effect every render and cause an update loop.
      const init: Record<string, DestState> = {}
      for (const cg of compoundGroups) init[cg.key] = { devId: cg.devId, projectId: "", phaseId: "none" }
      setDestinations(init)
      setConflictMap({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setDest = (key: string, v: DestState) => setDestinations(prev => ({ ...prev, [key]: v }))

  const allDestinationsSet = compoundGroups.every(cg => {
    const d = destinations[cg.key]
    return d && d.devId && d.projectId
  })

  function handleCheckConflicts() {
    const newConflictMap: Record<string, string[]> = {}
    for (const cg of compoundGroups) {
      const dest = destinations[cg.key]
      if (!dest?.projectId) continue
      const codes = cg.groups.flatMap(g => g.details.map(d => d.unitCode))
      const dupes = simulateDuplicates(codes, dest.projectId)
      if (dupes.length > 0) newConflictMap[cg.key] = dupes
    }
    setConflictMap(newConflictMap)
    setStep("review")
  }

  function handleConfirm() {
    const moves = compoundGroups.map(cg => {
      const d = destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }
      return {
        groupIds: cg.groups.map(g => g.id),
        devId: d.devId,
        projectId: d.projectId,
        phaseId: d.phaseId !== "none" ? d.phaseId : null,
      }
    })
    setStep("loading")
    setTimeout(() => {
      onConfirm(moves)
      setStep("done")
    }, 1500)
  }

  const totalGroupsMoved = eligible.length
  const totalDetailsMoved = eligible.reduce((s, g) => s + g.details.length, 0)
  const hasConflicts = Object.keys(conflictMap).length > 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="!max-w-5xl w-[95vw] sm:!max-w-5xl p-0 gap-0 flex flex-col" style={{ maxHeight: "92vh", height: "92vh" }}>
        <DialogTitle className="sr-only">Change Project</DialogTitle>
        <DialogDescription className="sr-only">Move selected Primary and Launch properties to a different project.</DialogDescription>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Change Project</h2>
            {step === "review" && (
              <Badge className="bg-muted text-muted-foreground border border-border text-xs font-medium ml-1">Conflict Check</Badge>
            )}
            {step === "done" && (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium ml-1">Done</Badge>
            )}
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("font-medium", step === "select" ? "text-foreground" : "")}>1 Select</span>
            <ChevronRight className="h-3 w-3" />
            <span className={cn("font-medium", step !== "select" ? "text-foreground" : "")}>2 Review</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: SELECT ── */}
          {step === "select" && (
            <div className="p-6 space-y-5">

              {/* Top summary bar */}
              <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{selectedGroups.length}</span>
                  <span className="text-sm text-muted-foreground">groups selected</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">{eligible.length} eligible</span>
                  <span className="text-xs text-muted-foreground">(Primary · Launch)</span>
                </div>
                {ineligible.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">{ineligible.length} will be skipped</span>
                      <span className="text-xs text-muted-foreground">
                        ({Object.entries(ineligibleByType).map(([t, n]) => `${n} ${t}`).join(" · ")})
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Ineligible callout */}
              {ineligible.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-amber-800">
                      {ineligible.length} {ineligible.length !== 1 ? "properties" : "property"} will be ignored
                    </p>
                    <p className="text-xs text-amber-700">
                      Resale, Nawy Now, and Rental properties cannot be moved to a different project. Only Primary and Launch units will be transferred.
                    </p>
                  </div>
                </div>
              )}

              {eligible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">No eligible groups selected</p>
                  <p className="text-xs text-muted-foreground">Select Primary or Launch properties to use Change Project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {compoundGroups.length} source compound{compoundGroups.length !== 1 ? "s" : ""} — set a destination for each
                  </p>

                  {compoundGroups.map(cg => {
                    // Manual groups don't expose a reliable detailed-unit count — show availability only.
                    // Automatic groups show the unit counts as-is.
                    const autoGroups = cg.groups.filter(g => g.entryType === "Automatic")
                    const manualGroups = cg.groups.filter(g => g.entryType === "Manual")
                    const autoDetails = autoGroups.reduce((s, g) => s + g.details.length, 0)
                    const autoAvailable = autoGroups.reduce((s, g) => s + g.details.filter(d => d.status === "Available").length, 0)
                    const manualAvailable = manualGroups.filter(g => g.availableUnits > 0).length
                    const dest = destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }

                    return (
                      <div key={cg.key} className="rounded-xl border border-border bg-card overflow-hidden">
                        {/* Compound header */}
                        <div className="px-5 py-3 bg-muted/50 border-b border-border">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium text-foreground">{cg.devName}</span>
                            <span>·</span>
                            <span className="font-mono text-[10px]">{cg.devId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {cg.projectName}{cg.phaseName ? ` — ${cg.phaseName}` : ""}
                            </p>
                            <span className="text-xs text-muted-foreground font-mono">· {cg.projectId}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>{cg.groups.length} grouped {cg.groups.length === 1 ? "property" : "properties"}</span>
                            {autoGroups.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{autoDetails} detailed {autoDetails === 1 ? "property" : "properties"}</span>
                                <span className="text-emerald-600 font-medium">({autoAvailable} available)</span>
                              </>
                            )}
                            {manualGroups.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{manualGroups.length} manual</span>
                                <span className="text-emerald-600 font-medium">({manualAvailable} available)</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Individual group rows */}
                        <div className="divide-y divide-border">
                          {cg.groups.map(g => {
                            const avail = g.details.filter(d => d.status === "Available").length
                            const total = g.details.length
                            const isManual = g.entryType === "Manual"
                            const isAvailable = g.availableUnits > 0
                            return (
                              <div key={g.id} className="flex items-center justify-between px-5 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-mono text-muted-foreground shrink-0">{g.id}</span>
                                  <span className="text-xs text-foreground truncate">{g.title}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", badgeClass[g.saleType])}>
                                    {g.saleType}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", badgeClass[g.entryType])}>
                                    {g.entryType}
                                  </Badge>
                                  {isManual ? (
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", isAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600")}>
                                      {isAvailable ? "Available" : "Not available"}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      <span className="font-medium text-emerald-600">{avail} available</span>
                                      <span> / {total} total</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Destination selector */}
                        <div className="px-5 py-4 bg-muted/20 border-t border-border space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <MoveRight className="h-3 w-3" /> Destination
                          </p>
                          <DestSelector
                            value={dest}
                            onChange={v => setDest(cg.key, v)}
                            lockedDevName={cg.devName}
                            excludeProjectId={cg.projectId}
                            excludeProjectName={cg.projectName}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              {/* Summary */}
              <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <span className="text-sm font-medium">{totalGroupsMoved} groups · {totalDetailsMoved} detailed units will be moved</span>
                {hasConflicts ? (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <span className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {Object.values(conflictMap).reduce((s, a) => s + a.length, 0)} unit code conflicts across {Object.keys(conflictMap).length} destination{Object.keys(conflictMap).length !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      No unit code conflicts found
                    </span>
                  </>
                )}
              </div>

              {/* Per-compound review cards */}
              <div className="space-y-4">
                {compoundGroups.map(cg => {
                  const dest = destinations[cg.key] ?? { devId: "", projectId: "", phaseId: "none" }
                  const destDev = DEST_DEVELOPERS.find(d => d.id === dest.devId)
                  const destProj = (DEST_PROJECTS[dest.devId] ?? []).find(p => p.id === dest.projectId)
                  const destPhaseObj = dest.phaseId !== "none" ? (destProj?.phases ?? []).find(ph => ph.id === dest.phaseId) : null
                  const dupes = conflictMap[cg.key] ?? []
                  const allUnits = cg.groups.flatMap(g => g.details)
                  const totalDetails = allUnits.length
                  const availUnits = allUnits.filter(d => d.status === "Available").length
                  const dupeSet = new Set(dupes)
                  const dupeAvail = allUnits.filter(d => dupeSet.has(d.unitCode) && d.status === "Available").length

                  return (
                    <div key={cg.key} className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Source → Destination header */}
                      <div className="px-5 py-3 bg-muted/50 border-b border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">{cg.devName}</span>
                            <span className="text-xs text-muted-foreground">›</span>
                            <span className="text-xs font-semibold text-foreground">{cg.projectName}</span>
                            {cg.phaseName && <span className="text-xs text-muted-foreground">— {cg.phaseName}</span>}
                          </div>
                          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground mx-1" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{destDev?.name ?? "—"}</span>
                            <span className="text-xs text-muted-foreground">›</span>
                            <span className="text-xs font-semibold text-foreground">{destProj?.name ?? "—"}</span>
                            {destPhaseObj && <span className="text-xs text-muted-foreground">— {destPhaseObj.name}</span>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cg.groups.length} grouped · {totalDetails} detailed properties
                        </p>
                      </div>

                      {/* Transfer stats: how many unit IDs move, and how many duplicate */}
                      <div className="flex items-center gap-5 px-5 py-3 border-b border-border bg-muted/20">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unit IDs transferring</span>
                          <span className="text-sm font-semibold text-foreground">
                            {totalDetails} total <span className="font-medium text-emerald-600">({availUnits} available)</span>
                          </span>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Duplicate unit IDs</span>
                          <span className={cn("text-sm font-semibold", dupes.length > 0 ? "text-amber-700" : "text-emerald-700")}>
                            {dupes.length} of {totalDetails} <span className="font-medium text-emerald-600">({dupeAvail} available)</span>
                          </span>
                        </div>
                      </div>

                      {/* Conflict info or clear */}
                      <div className="px-5 py-3">
                        {dupes.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">
                                  {dupes.length} unit code{dupes.length !== 1 ? "s" : ""} ({dupeAvail} available) already exist in <strong>{destProj?.name}</strong>
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  The source units will <strong>overwrite</strong> the matching records in {destProj?.name} — the existing destination records will be replaced.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-6">
                              {dupes.map(code => (
                                <span key={code} className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-mono text-amber-700">{code}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-700">No unit code conflicts in <strong>{destProj?.name}</strong>. All units will be moved cleanly.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Global overwrite note if any conflicts */}
              {hasConflicts && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    <strong>Overwrite behaviour:</strong> When a unit code exists in both source and destination, the source record will replace the destination record. The existing destination data for these unit codes will be overwritten.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSFERRING (loading) ── */}
          {step === "loading" && (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted border-2 border-border">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Transferring units…</p>
                <p className="text-sm text-muted-foreground">
                  Moving {totalDetailsMoved} unit{totalDetailsMoved !== 1 ? "s" : ""} across {compoundGroups.length} compound{compoundGroups.length !== 1 ? "s" : ""}. Please wait.
                </p>
              </div>
            </div>
          )}

          {/* ── CONFIRMATION (done) ── */}
          {step === "done" && (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">Transfer complete</p>
                <p className="text-sm text-muted-foreground">
                  {totalGroupsMoved} grouped propert{totalGroupsMoved !== 1 ? "ies" : "y"} · {totalDetailsMoved} detailed units moved across {compoundGroups.length} compound{compoundGroups.length !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="inline-flex flex-col items-start gap-1 rounded-lg border border-border bg-muted/40 px-5 py-3 text-left mt-2">
                {compoundGroups.map(cg => {
                  const dest = destinations[cg.key]
                  const destProj = (DEST_PROJECTS[dest?.devId ?? ""] ?? []).find(p => p.id === dest?.projectId)
                  const destDev = DEST_DEVELOPERS.find(d => d.id === dest?.devId)
                  return destProj ? (
                    <p key={cg.key} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{cg.projectName}</span>
                      {" → "}
                      <span className="font-medium text-foreground">{destDev?.name} · {destProj.name}</span>
                    </p>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card shrink-0">
          <div className="text-xs text-muted-foreground">
            {step === "select" && eligible.length > 0 && (
              <span>{compoundGroups.length} compound{compoundGroups.length !== 1 ? "s" : ""} · {eligible.length} groups · {eligible.reduce((s, g) => s + g.details.length, 0)} units</span>
            )}
            {step === "review" && hasConflicts && (
              <span className="text-amber-600 font-medium">Source units will overwrite destination on confirm</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === "select" && (
              <>
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleCheckConflicts} disabled={!allDestinationsSet || eligible.length === 0}>
                  Check conflicts
                  <MoveRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" onClick={handleConfirm}>
                  Confirm transfer
                </Button>
              </>
            )}
            {step === "loading" && (
              <Button size="sm" disabled>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
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

const GROUPED_HIDDEN_COLS: ColId[] = [
  "propertyId", "propertyMetadataId", "developer", "project", "phase",
  "entryType", "saleType", "listingStatus", "propertyCategory", "propertyType", "propertySubType",
  "district", "area", "subarea", "source",
]

const DETAIL_TABS = [
  { value: "additional-info", label: "Additional Info" },
  { value: "detailed-properties", label: "Detailed Properties" },
  { value: "floor-plans", label: "Floor Plans" },
  { value: "gallery", label: "Gallery" },
  { value: "payment-plans", label: "Payment Plans" },
  { value: "price-history", label: "Price History" },
  { value: "attachments", label: "Attachments" },
  { value: "ingestion-entries", label: "Entries" },
  { value: "audit-logs", label: "Audit Logs" },
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

        {/* ── Tabs ── */}
        <Tabs defaultValue="additional-info" className="space-y-4">
          <TabsList className="bg-card">
            {DETAIL_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="detailed-properties">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">Detailed Properties</h3>
                <span className="text-xs text-muted-foreground">({group.details.length} units)</span>
              </div>
              <EmbeddedPropertyTable rows={units} hiddenColumns={["developer", "project", "phase", "saleType", "propertyCategory", "propertyType", "propertySubType", "district", "area", "subarea", "source"]} />
            </div>
          </TabsContent>

          {DETAIL_TABS.filter((t) => t.value !== "detailed-properties").map((t) => {
            const panelTab = SHARED_PANEL_MAP[t.value]
            return (
              <TabsContent key={t.value} value={t.value}>
                {panelTab ? (
                  <div className="rounded-xl border border-border bg-card">
                    {repRow ? (
                      <PropertyDetailTab tab={panelTab} row={repRow} onUpdateRow={updateRepRow} />
                    ) : (
                      <div className="px-6 py-16 text-center text-sm text-muted-foreground">No units in this group.</div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">Content for this tab will be defined next (varies by {group.saleType} sale type).</p>
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
  onOpenGroupDetail,
}: {
  filters: SharedFilterState
  sortConfigs?: SortConfig[]
  filterGroups?: FilterGroup[]
  groupConnector?: "AND" | "OR"
  groupByColumn?: string | null
  onOpenGroupDetail?: (d: GroupDetailPayload) => void
}) {
  const [groups, setGroups] = useState<GroupedProperty[]>(() => makeGroups())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([groups[0]?.id].filter(Boolean)))
  const allRows = useMemo(() => createRows(), [])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const lastSelectedIdxRef = useRef<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [showChangeCompound, setShowChangeCompound] = useState(false)

  const openDetail = (group: GroupedProperty, index: number) =>
    onOpenGroupDetail?.({ group, allRows, index })

  const filteredGroups = useMemo(() => {
    const query = filters.searchQuery.toLowerCase()
    const filtered = groups.filter((group) => {
      if (filters.saleTypeFilter.size > 0 && !filters.saleTypeFilter.has(group.saleType)) return false
      if (filters.developerFilter.size > 0 && !filters.developerFilter.has(group.developer.name)) return false
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
        const pageFullySelected = paginatedGroups.length > 0 && paginatedGroups.every((g) => selectedCards.has(g.id))
        const allResultsSelected = filteredGroups.length > 0 && filteredGroups.every((g) => selectedCards.has(g.id))
        const hasMoreThanPage = filteredGroups.length > paginatedGroups.length
        if (!pageFullySelected || !hasMoreThanPage) return null
        return (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs dark:border-blue-900 dark:bg-blue-950/30">
            {allResultsSelected ? (
              <>
                <span className="text-blue-800 dark:text-blue-200">
                  All <strong>{filteredGroups.length.toLocaleString()}</strong> groups across all pages are selected.
                </span>
                <button
                  onClick={() => setSelectedCards(new Set())}
                  className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                >
                  Clear selection
                </button>
              </>
            ) : (
              <>
                <span className="text-blue-800 dark:text-blue-200">
                  All <strong>{paginatedGroups.length}</strong> on this page are selected.
                </span>
                <button
                  onClick={() => setSelectedCards(new Set(filteredGroups.map((g) => g.id)))}
                  className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                >
                  Select all {filteredGroups.length.toLocaleString()} groups
                </button>
              </>
            )}
          </div>
        )
      })()}

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
        // Determine current publish state for toggle label
        const allPublished = selGroups.every(g => g.listingStatus === "Published")

        const handlePublishToggle = () => {
          const next = allPublished ? "Hidden" : "Published"
          setGroups(prev => prev.map(g => selectedCards.has(g.id) ? { ...g, listingStatus: next } : g))
        }

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

            {/* is Publish */}
            <button
              onClick={handlePublishToggle}
              className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors"
            >
              {allPublished
                ? <><EyeOff className="h-3.5 w-3.5 text-zinc-400" /> Unpublish</>
                : <><Eye className="h-3.5 w-3.5 text-zinc-400" /> Publish</>
              }
            </button>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Change Project — only for Primary/Launch */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => hasEligible && setShowChangeCompound(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 transition-colors",
                    hasEligible ? "hover:bg-zinc-800 cursor-pointer" : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-400" />
                  Change Project
                </button>
              </TooltipTrigger>
              {!hasEligible && (
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  Only Primary and Launch properties can be moved to a different project.
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

"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import React from "react"
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Banknote,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Copy,
  Edit,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  Home,
  Layers,
  MapPin,
  MoreVertical,
  Percent,
  Plus,
  Ruler,
  Tag,
  Wrench,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EmbeddedPropertyTable, createRows, type ColId, type PropertyRow } from "@/components/all-properties-page"

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

  return Array.from({ length: 8 }, (_, i) => {
    const units = 2 + (i % 6)
    const available = Math.max(1, units - (i % 3))
    const saleType = (["Primary", "Resale", "Nawy Now", "Rental"] as const)[i % 4]
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
      entryType: i % 5 === 0 ? "Manual" : "Automatic",
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
        offering: saleType === "Rental" ? "Primary" : saleType,
        financing: i % 2 === 1,
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
}: {
  group: GroupedProperty
  globalIndex: number
  allRows: PropertyRow[]
  isExpanded: boolean
  onToggle: () => void
  hiddenCols: ColId[]
  isSelected: boolean
  onSelect: (shiftKey: boolean) => void
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
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => {}}
          onClick={(e) => { e.stopPropagation(); onSelect((e as React.MouseEvent).shiftKey) }}
          className="shrink-0"
        />

        {/* IDs with copy-on-hover */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            Property ID: <CopyableId value={group.id} />
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            Metadata ID: <CopyableId value={group.propertyMetadataId} />
          </span>
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
          <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" title="View on IMS">
            <Eye className="h-3 w-3" />
          </Button>
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
          <Button variant="outline" size="icon-sm" className="bg-transparent h-6 w-6" onClick={onToggle} title="Expand units">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
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

export function GroupedPropertiesView({
  filters,
  sortConfigs = [],
  filterGroups = [],
  groupConnector = "AND",
  groupByColumn = null,
}: {
  filters: SharedFilterState
  sortConfigs?: SortConfig[]
  filterGroups?: FilterGroup[]
  groupConnector?: "AND" | "OR"
  groupByColumn?: string | null
}) {
  const [groups] = useState<GroupedProperty[]>(() => makeGroups())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([groups[0]?.id].filter(Boolean)))
  const allRows = useMemo(() => createRows(), [])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const lastSelectedIdxRef = useRef<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

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

  const GROUPED_HIDDEN_COLS: ColId[] = [
    "propertyId", "propertyMetadataId", "developer", "project", "phase",
    "entryType", "saleType", "listingStatus", "propertyCategory", "propertyType", "propertySubType",
    "district", "area", "subarea", "source",
  ]

  return (
    <div className="space-y-4">

      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">Grouped Properties</span>
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs px-2">
            {filteredGroups.length.toLocaleString()}
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
              />
            )
          })}
        </div>

      {/* Bulk action floating bar */}
      {selectedCards.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-zinc-900 text-white rounded-xl shadow-2xl overflow-hidden text-sm select-none">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-semibold tabular-nums">{selectedCards.size} selected</span>
            <button
              onClick={() => setSelectedCards(new Set(paginatedGroups.map((g) => g.id)))}
              className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
            >
              Select all
            </button>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors">
            <Edit className="h-3.5 w-3.5 text-zinc-400" />
            Edit fields
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            Change status
          </button>
          <div className="w-px h-8 bg-zinc-700" />
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-red-400 hover:text-red-300">
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <div className="w-px h-8 bg-zinc-700" />
          <button onClick={() => setSelectedCards(new Set())} className="px-3 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span>
          {filteredGroups.length === 0
            ? "0"
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredGroups.length)}`}{" "}
          of {filteredGroups.length.toLocaleString()} groups
        </span>
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

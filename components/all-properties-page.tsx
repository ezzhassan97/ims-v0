"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  ImageIcon,
  Search,
  X,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { initialUnits, projectPhases, type Unit } from "@/lib/mock-data"
import { GroupedPropertiesView } from "@/components/grouped-properties-page"

type Availability = "Available" | "Hold" | "Sold-Off" | "Archived"
type ListingStatus = "Active" | "Hidden"
type SaleType = "Launch" | "Primary" | "Resale" | "Nawy Now" | "Rental" | "Financing"
type EntryType = "Automatic" | "Manual"

interface PropertyRow {
  propertyId: string
  detailedPropertyId: string | null
  entryType: EntryType
  developer: { id: string; name: string; logo: string; url: string }
  project: { id: string; name: string }
  phase: { id: string; name: string } | null
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
  gardenArea: number | null
  terraceArea: number | null
  landArea: number | null
  storageArea: number | null
  parkingSlots: number | null
  nannyRoom: boolean
  driversRoom: boolean
  serviced: boolean
  branded: boolean
  price: number | null
  priceRecords: number[]
  paymentPlans: number
  offers: number
  floorPlans: string[]
  images: string[]
  lastUpdated: string
}

interface ColumnDef {
  id: keyof PropertyRow | "pricePerMeter"
  label: string
  width: number
  align?: "left" | "right" | "center"
  pinned?: boolean
  fixed?: boolean
}

const columns: ColumnDef[] = [
  { id: "propertyId", label: "Property ID", width: 150, pinned: true, fixed: true },
  { id: "detailedPropertyId", label: "Detailed Property ID", width: 170 },
  { id: "entryType", label: "Entry type", width: 120 },
  { id: "developer", label: "Developer", width: 190 },
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
  { id: "unitView", label: "Unit view", width: 140 },
  { id: "unitOrientation", label: "Unit orientation", width: 150 },
  { id: "gardenArea", label: "Garden area", width: 130, align: "right" },
  { id: "terraceArea", label: "Terrace area", width: 130, align: "right" },
  { id: "landArea", label: "Land area", width: 120, align: "right" },
  { id: "storageArea", label: "Storage area", width: 130, align: "right" },
  { id: "parkingSlots", label: "Parking slots", width: 130, align: "right" },
  { id: "nannyRoom", label: "Nanny room", width: 120, align: "center" },
  { id: "driversRoom", label: "Drivers room", width: 120, align: "center" },
  { id: "serviced", label: "Serviced", width: 100, align: "center" },
  { id: "branded", label: "Branded", width: 100, align: "center" },
  { id: "price", label: "Price", width: 170, align: "right" },
  { id: "pricePerMeter", label: "Price per m²", width: 150, align: "right" },
  { id: "paymentPlans", label: "Payment plans", width: 140 },
  { id: "offers", label: "Offers", width: 120 },
  { id: "floorPlans", label: "Floor plans", width: 190 },
  { id: "images", label: "Images", width: 190 },
  { id: "lastUpdated", label: "Last updated", width: 140 },
]

const availabilityOptions: Availability[] = ["Available", "Hold", "Sold-Off", "Archived"]
const listingStatusOptions: ListingStatus[] = ["Active", "Hidden"]
const saleTypes: SaleType[] = ["Launch", "Primary", "Resale", "Nawy Now", "Rental", "Financing"]
const entryTypes: EntryType[] = ["Automatic", "Manual"]
const imageSeeds = ["/aerial-view-masterplan-residential-development-blu.jpg", "/luxury-clubhouse-exterior.jpg", "/placeholder.jpg"]

const badgeClass: Record<string, string> = {
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
}

function createRows(): PropertyRow[] {
  return Array.from({ length: 3 }).flatMap((_, batchIndex) =>
    initialUnits.map((unit, unitIndex) => mapUnitToProperty(unit, batchIndex, unitIndex)),
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
    project: { id: `PRJ-${100 + (index % 5)}`, name: ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens"][index % 5] },
    phase: index % 7 === 0 ? null : { id: `PHS-${200 + (index % 6)}`, name: projectPhases[index % projectPhases.length]?.name ?? "Phase 1" },
    saleType,
    availability: index % 8 === 0 ? "Hold" : unit.status === "Sold Off" ? "Sold-Off" : index % 13 === 0 ? "Archived" : "Available",
    listingStatus: index % 6 === 0 ? "Hidden" : "Active",
    unitCode: unit.unitCode || `TMP-${propertyId.slice(-4)}`,
    unitNumber: unit.unitCode ? unit.unitCode.split("-").at(-1) ?? null : null,
    unitModel: index % 3 === 0 ? null : `${unit.bedrooms}BR`,
    zone: index % 4 === 0 ? null : `Zone ${String.fromCharCode(65 + (index % 5))}`,
    propertyCategory: index % 11 === 0 ? "Commercial" : index % 13 === 0 ? "Retail" : index % 17 === 0 ? "F&B" : "Residential",
    propertyType: unit.propertyType,
    propertySubType: index % 3 === 0 ? null : unit.propertyType === "Apartment" ? "Garden Apartment" : `Corner ${unit.propertyType}`,
    developerType: index % 4 === 0 ? null : `${unit.propertyType} ${unit.bedrooms}BR`,
    buildingType: isVillaLike ? "Standalone" : index % 3 === 0 ? "Cluster" : "Tower",
    buildingNumber: unit.buildingNumber || null,
    floorNumber: isVillaLike ? null : (index % 12) + 1,
    grossBua,
    netBua: index % 5 === 0 ? null : Math.max(45, grossBua - 14),
    bedrooms: unit.propertyType === "Apartment" && unit.bedrooms === 1 && index % 4 === 0 ? null : unit.bedrooms,
    bathrooms: index % 6 === 0 ? null : Math.max(1, unit.bedrooms - 1),
    finishingType: furnished ? "Furnished" : (["Core & Shell", "Semi-finished", "Fully finished"] as const)[index % 3],
    finishingLevel: furnished ? (["Premium", "Branded", "Serviced"] as const)[index % 3] : null,
    deliveryType: index % 3 === 0 ? "Ready to move" : "Off-plan",
    deliveryDate: index % 3 === 0 ? null : `Q${(index % 4) + 1} ${2026 + (index % 4)}`,
    unitView: index % 4 === 0 ? null : ["Sea view", "Lagoon", "Garden", "Clubhouse"][index % 4],
    unitOrientation: index % 5 === 0 ? null : ["North", "SW", "East", "NE"][index % 4],
    gardenArea: isVillaLike || index % 4 === 1 ? 30 + index * 2 : null,
    terraceArea: index % 3 === 0 ? null : 8 + index,
    landArea: isVillaLike ? grossBua + 90 : null,
    storageArea: index % 4 === 0 ? null : 4 + (index % 8),
    parkingSlots: index % 5 === 0 ? null : isVillaLike ? 2 : 1,
    nannyRoom: isVillaLike && index % 2 === 0,
    driversRoom: isVillaLike && index % 3 === 0,
    serviced: furnished && index % 3 === 2,
    branded: furnished && index % 3 === 1,
    price,
    priceRecords: index % 4 === 0 ? [price || 0, price ? price - 120000 : 0, price ? price + 150000 : 0] : [price || 0],
    paymentPlans: index % 7 === 0 ? 0 : (index % 4) + 1,
    offers: index % 5 === 0 ? (index % 3) + 1 : 0,
    floorPlans: Array.from({ length: floorPlanCount }, (_, i) => imageSeeds[(index + i) % imageSeeds.length]),
    images: Array.from({ length: imageCount }, (_, i) => imageSeeds[(index + i + 1) % imageSeeds.length]),
    lastUpdated: new Date(Date.now() - (index + 1) * 7 * 3600000).toISOString(),
  }
}

function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}

function formatArea(value: number | null) {
  return value ? `${value.toLocaleString()} m²` : null
}

function formatPrice(value: number | null) {
  if (!value) return null
  return `${value.toLocaleString()} EGP`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.max(1, Math.round(diff / 3600000))
  if (hours < 24) return `${hours} hours ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"} ago`
}

function CopyableText({ value, muted = false }: { value: string | null; muted?: boolean }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <EmptyValue />
  return (
    <span className={cn("group/copy inline-flex items-center gap-1 min-w-0", muted && "text-muted-foreground")}>
      <span className="truncate">{value}</span>
      <button
        className="opacity-0 group-hover/copy:opacity-100 rounded p-0.5 hover:bg-secondary transition-opacity"
        onClick={(event) => {
          event.stopPropagation()
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

function StoryBadge({ value, onChange, options }: { value: string; onChange?: (value: string) => void; options?: string[] }) {
  if (!onChange || !options) {
    return <Badge variant="outline" className={cn("border", badgeClass[value])}>{value}</Badge>
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>
          <Badge variant="outline" className={cn("border cursor-pointer", badgeClass[value])}>
            {value}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onChange(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BooleanMark({ value }: { value: boolean }) {
  return value ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <EmptyValue />
}

function ThumbStrip({ items, emptyLabel, onOpen }: { items: string[]; emptyLabel: string; onOpen: () => void }) {
  if (items.length === 0) {
    return <button className="text-xs font-medium text-red-600 hover:underline" onClick={onOpen}>{emptyLabel}</button>
  }
  return (
    <button className="flex items-center gap-1" onClick={onOpen}>
      {items.slice(0, 3).map((src, index) => (
        <img key={`${src}-${index}`} src={src || "/placeholder.svg"} alt="" className="h-8 w-10 rounded border border-border object-cover" />
      ))}
      {items.length > 3 && <Badge variant="secondary" className="text-[10px]">+{items.length - 3}</Badge>}
    </button>
  )
}

export function DetailedPropertiesView() {
  const [rows, setRows] = useState<PropertyRow[]>(() => createRows())
  const [searchQuery, setSearchQuery] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("all")
  const [saleTypeFilter, setSaleTypeFilter] = useState("all")
  const [entryTypeFilter, setEntryTypeFilter] = useState("all")
  const [listingFilter, setListingFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<ColumnDef["id"]>("lastUpdated")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [groupBy, setGroupBy] = useState<ColumnDef["id"] | "none">("none")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnDef["id"]>>(() => new Set(columns.map((column) => column.id)))
  const [drawer, setDrawer] = useState<{ type: "prices" | "plans" | "offers" | "floorPlans" | "images"; row: PropertyRow } | null>(null)
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceDraft, setPriceDraft] = useState("")

  const visible = columns.filter((column) => visibleColumns.has(column.id))
  const pinned = visible.find((column) => column.pinned)
  const scrollColumns = visible.filter((column) => !column.pinned)

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return rows
      .filter((row) => {
        if (availabilityFilter !== "all" && row.availability !== availabilityFilter) return false
        if (saleTypeFilter !== "all" && row.saleType !== saleTypeFilter) return false
        if (entryTypeFilter !== "all" && row.entryType !== entryTypeFilter) return false
        if (listingFilter !== "all" && row.listingStatus !== listingFilter) return false
        if (!query) return true
        return [
          row.propertyId,
          row.detailedPropertyId,
          row.developer.name,
          row.project.name,
          row.project.id,
          row.phase?.name,
          row.phase?.id,
          row.unitCode,
          row.unitNumber,
          row.propertyType,
          row.buildingNumber,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
      .sort((a, b) => {
        const aValue = getSortValue(a, sortColumn)
        const bValue = getSortValue(b, sortColumn)
        const result = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue))
        return sortDirection === "asc" ? result : -result
      })
  }, [rows, searchQuery, availabilityFilter, saleTypeFilter, entryTypeFilter, listingFilter, sortColumn, sortDirection])

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
  const availableRows = rows.filter((row) => row.availability === "Available").length
  const activeRows = rows.filter((row) => row.listingStatus === "Active").length
  const zeroPriceRows = rows.filter((row) => !row.price).length
  const totalPaymentPlans = rows.reduce((sum, row) => sum + row.paymentPlans, 0)

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const updateRow = (propertyId: string, updates: Partial<PropertyRow>) => {
    setRows((current) => current.map((row) => (row.propertyId === propertyId ? { ...row, ...updates, lastUpdated: new Date().toISOString() } : row)))
  }

  const renderCell = (row: PropertyRow, column: ColumnDef) => {
    const nullText = (value: React.ReactNode) => value ?? <EmptyValue />

    switch (column.id) {
      case "propertyId":
        return <span className="font-mono text-xs font-medium"><CopyableText value={row.propertyId} /></span>
      case "detailedPropertyId":
        return <span className="font-mono text-xs"><CopyableText value={row.detailedPropertyId} /></span>
      case "entryType":
        return <StoryBadge value={row.entryType} />
      case "developer":
        return (
          <a href={row.developer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-primary">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
              {row.developer.logo}
            </span>
            <span className="truncate">{row.developer.name}</span>
          </a>
        )
      case "project":
        return (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.project.name}</div>
            <div className="font-mono text-xs"><CopyableText value={row.project.id} muted /></div>
          </div>
        )
      case "phase":
        return row.phase ? (
          <div className="min-w-0">
            <div className="truncate">{row.phase.name}</div>
            <div className="font-mono text-xs"><CopyableText value={row.phase.id} muted /></div>
          </div>
        ) : <EmptyValue />
      case "saleType":
        return <StoryBadge value={row.saleType} />
      case "availability":
        return <StoryBadge value={row.availability} options={availabilityOptions} onChange={(value) => updateRow(row.propertyId, { availability: value as Availability })} />
      case "listingStatus":
        return <StoryBadge value={row.listingStatus} options={listingStatusOptions} onChange={(value) => updateRow(row.propertyId, { listingStatus: value as ListingStatus })} />
      case "unitCode":
        return <span className="font-mono text-xs"><CopyableText value={row.unitCode} /></span>
      case "grossBua":
      case "netBua":
      case "gardenArea":
      case "terraceArea":
      case "landArea":
      case "storageArea":
        return nullText(formatArea(row[column.id] as number | null))
      case "bedrooms":
      case "bathrooms":
      case "floorNumber":
      case "parkingSlots":
        return nullText(row[column.id] as number | null)
      case "nannyRoom":
      case "driversRoom":
      case "serviced":
      case "branded":
        return <BooleanMark value={Boolean(row[column.id])} />
      case "finishingLevel":
        return row.finishingType === "Furnished" ? nullText(row.finishingLevel) : <EmptyValue />
      case "price":
        if (editingPrice === row.propertyId) {
          return (
            <Input
              value={priceDraft}
              onChange={(event) => setPriceDraft(event.target.value)}
              onBlur={() => {
                updateRow(row.propertyId, { price: Number(priceDraft.replaceAll(",", "")) || 0 })
                setEditingPrice(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur()
                if (event.key === "Escape") setEditingPrice(null)
              }}
              className="h-7 text-right text-xs"
              autoFocus
            />
          )
        }
        return (
          <div className="group/price flex items-center justify-end gap-2">
            <button
              className={cn("font-medium hover:text-primary", !row.price && "text-red-600")}
              onClick={() => {
                setEditingPrice(row.propertyId)
                setPriceDraft(String(row.price ?? 0))
              }}
            >
              {formatPrice(row.price) ?? "0 EGP"}
            </button>
            {row.priceRecords.length > 1 && (
              <button className="opacity-0 group-hover/price:opacity-100 transition-opacity" onClick={() => setDrawer({ type: "prices", row })}>
                <Badge variant="outline" className="text-[10px]">{row.priceRecords.length} prices</Badge>
              </button>
            )}
          </div>
        )
      case "pricePerMeter":
        return row.price && row.grossBua ? `${Math.round(row.price / row.grossBua).toLocaleString()} EGP/m²` : <EmptyValue />
      case "paymentPlans":
        return (
          <button onClick={() => setDrawer({ type: "plans", row })}>
            <Badge variant="outline" className={cn(row.paymentPlans === 0 && "border-red-200 bg-red-50 text-red-600")}>
              {row.paymentPlans} plans
            </Badge>
          </button>
        )
      case "offers":
        return row.offers > 0 ? (
          <button onClick={() => setDrawer({ type: "offers", row })}>
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{row.offers} offers</Badge>
          </button>
        ) : null
      case "floorPlans":
        return <ThumbStrip items={row.floorPlans} emptyLabel="No floor plans" onOpen={() => setDrawer({ type: "floorPlans", row })} />
      case "images":
        return <ThumbStrip items={row.images} emptyLabel="No images" onOpen={() => setDrawer({ type: "images", row })} />
      case "lastUpdated":
        return (
          <Tooltip>
            <TooltipTrigger asChild><span className="text-muted-foreground">{relativeTime(row.lastUpdated)}</span></TooltipTrigger>
            <TooltipContent>{new Date(row.lastUpdated).toLocaleString()}</TooltipContent>
          </Tooltip>
        )
      default:
        return nullText(row[column.id as keyof PropertyRow] as React.ReactNode)
    }
  }

  const renderRows = (items: PropertyRow[]) =>
    items.map((row) => (
      <div key={row.propertyId} className="group/row flex min-w-max border-b border-border bg-card text-sm hover:bg-secondary/25">
        {pinned && (
          <div className="sticky left-0 z-10 flex items-center border-r border-border bg-card px-3 py-2 group-hover/row:bg-secondary/25" style={{ width: pinned.width }}>
            {renderCell(row, pinned)}
          </div>
        )}
        {scrollColumns.map((column) => (
          <div
            key={column.id}
            className={cn("flex items-center border-r border-border px-3 py-2", column.align === "right" && "justify-end text-right", column.align === "center" && "justify-center text-center")}
            style={{ width: column.width }}
          >
            {renderCell(row, column)}
          </div>
        ))}
      </div>
    ))

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <PropertyAnalyticsCard label="Detailed Properties" value={rows.length.toLocaleString()} />
          <PropertyAnalyticsCard label="Available" value={availableRows.toLocaleString()} />
          <PropertyAnalyticsCard label="Active Listings" value={activeRows.toLocaleString()} />
          <PropertyAnalyticsCard label="Missing Price" value={zeroPriceRows.toLocaleString()} tone={zeroPriceRows > 0 ? "danger" : "default"} />
          <PropertyAnalyticsCard label="Payment Plans" value={totalPaymentPlans.toLocaleString()} />
        </div>

        <div className="mb-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 pl-9" placeholder="Search properties, projects, unit codes..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
            <ToolbarSelect label="Availability" value={availabilityFilter} values={availabilityOptions} onChange={setAvailabilityFilter} />
            <ToolbarSelect label="Sale type" value={saleTypeFilter} values={saleTypes} onChange={setSaleTypeFilter} />
            <ToolbarSelect label="Entry type" value={entryTypeFilter} values={entryTypes} onChange={setEntryTypeFilter} />
            <ToolbarSelect label="Listing" value={listingFilter} values={listingStatusOptions} onChange={setListingFilter} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 bg-transparent">
                  <ArrowUpDown className="mr-1.5 h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="p-2 space-y-2">
                  <Label className="text-xs">Column</Label>
                  <Select value={sortColumn} onValueChange={(value) => setSortColumn(value as ColumnDef["id"])}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Label className="text-xs">Direction</Label>
                  <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as "asc" | "desc")}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as ColumnDef["id"] | "none")}>
              <SelectTrigger className="h-9 w-40"><Filter className="mr-1.5 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="phase">Phase</SelectItem>
                <SelectItem value="saleType">Sale type</SelectItem>
                <SelectItem value="availability">Availability</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 bg-transparent">
                  <Columns3 className="mr-1.5 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-y-auto">
                {columns.map((column) => (
                  <DropdownMenuItem key={column.id} onSelect={(event) => event.preventDefault()} className="gap-2">
                    <Checkbox
                      checked={visibleColumns.has(column.id)}
                      disabled={column.fixed}
                      onCheckedChange={() => {
                        if (column.fixed) return
                        setVisibleColumns((current) => {
                          const next = new Set(current)
                          if (next.has(column.id)) next.delete(column.id)
                          else next.add(column.id)
                          return next
                        })
                      }}
                    />
                    <span>{column.label}</span>
                    {column.fixed && <Badge variant="secondary" className="ml-auto text-[10px]">Pinned</Badge>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto h-9 bg-transparent">
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                <DropdownMenuItem><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><FileDown className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex h-[calc(100vh-272px)] min-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              <div className="sticky top-0 z-20 flex min-w-max border-b border-border bg-secondary/60 text-xs font-medium text-muted-foreground">
                {pinned && <div className="sticky left-0 z-30 border-r border-border bg-secondary px-3 py-2" style={{ width: pinned.width }}>{pinned.label}</div>}
                {scrollColumns.map((column) => (
                  <button
                    key={column.id}
                    className={cn("border-r border-border px-3 py-2 text-left hover:text-foreground", column.align === "right" && "text-right", column.align === "center" && "text-center")}
                    style={{ width: column.width }}
                    onClick={() => {
                      if (sortColumn === column.id) setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
                      else setSortColumn(column.id)
                    }}
                  >
                    {column.label}
                  </button>
                ))}
              </div>
              {groupedRows
                ? Object.entries(groupedRows).map(([group, items]) => (
                    <div key={group}>
                      <div className="sticky left-0 z-10 flex items-center gap-2 border-b border-border bg-secondary/35 px-4 py-2 text-sm font-medium">
                        {group} <Badge variant="secondary">{items.length}</Badge>
                      </div>
                      {renderRows(items)}
                    </div>
                  ))
                : renderRows(paginatedRows)}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} properties
            </span>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 bg-transparent" disabled={currentPage === 1 || !!groupedRows} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                Prev
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 bg-transparent" disabled={currentPage === totalPages || !!groupedRows} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                Next
              </Button>
              <span className="pl-2">{visible.length} visible columns</span>
            </div>
          </div>
        </div>
      <PropertyDrawer drawer={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}

function PropertyAnalyticsCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", tone === "danger" && "border-red-200 bg-red-50")}>
      <div className={cn("text-xs font-medium text-muted-foreground", tone === "danger" && "text-red-600")}>{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold text-foreground", tone === "danger" && "text-red-700")}>{value}</div>
    </div>
  )
}

export function AllPropertiesPage() {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-border bg-card px-6 py-5">
          <h1 className="text-2xl font-semibold text-foreground">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The full properties view in the inventory. Switch between grouped supply and detailed unit-level records.
          </p>
        </div>

        <Tabs defaultValue="grouped" className="gap-4">
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

function ToolbarSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-36">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function getSortValue(row: PropertyRow, column: ColumnDef["id"]) {
  if (column === "pricePerMeter") return row.price && row.grossBua ? row.price / row.grossBua : 0
  const value = row[column as keyof PropertyRow]
  if (typeof value === "object" && value !== null) {
    if ("name" in value) return value.name
    if ("id" in value) return value.id
  }
  return value ?? ""
}

function PropertyDrawer({ drawer, onClose }: { drawer: { type: "prices" | "plans" | "offers" | "floorPlans" | "images"; row: PropertyRow } | null; onClose: () => void }) {
  const titleMap = {
    prices: "Prices",
    plans: "Payment Plans",
    offers: "Offers",
    floorPlans: "Floor Plans",
    images: "Images",
  }

  return (
    <Sheet open={!!drawer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[520px] sm:w-[560px]">
        {drawer && (
          <>
            <SheetHeader>
              <SheetTitle>{titleMap[drawer.type]} - {drawer.row.propertyId}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {(drawer.type === "floorPlans" || drawer.type === "images") ? (
                <div className="grid grid-cols-2 gap-3">
                  {(drawer.type === "floorPlans" ? drawer.row.floorPlans : drawer.row.images).map((src, index) => (
                    <img key={`${src}-${index}`} src={src || "/placeholder.svg"} alt="" className="h-36 w-full rounded-lg border border-border object-cover" />
                  ))}
                  {(drawer.type === "floorPlans" ? drawer.row.floorPlans : drawer.row.images).length === 0 && (
                    <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                      No {drawer.type === "floorPlans" ? "floor plans" : "images"} attached.
                    </div>
                  )}
                </div>
              ) : drawer.type === "prices" ? (
                drawer.row.priceRecords.map((price, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm text-muted-foreground">Price record {index + 1}</span>
                    <span className={cn("font-medium", !price && "text-red-600")}>{formatPrice(price) ?? "0 EGP"}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-border p-4">
                  <div className="text-sm text-muted-foreground">{drawer.type === "offers" ? "Active offer plans" : "Linked payment plans"}</div>
                  <div className="mt-2 text-2xl font-semibold">{drawer.type === "offers" ? drawer.row.offers : drawer.row.paymentPlans}</div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

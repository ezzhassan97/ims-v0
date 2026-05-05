"use client"

import { useMemo, useState } from "react"
import {
  Bath,
  BedDouble,
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  ExternalLink,
  Filter,
  Home,
  ImageIcon,
  Layers,
  Plus,
  Ruler,
  Tag,
  Wrench,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  status: "Available" | "Sold"
  offering: "Primary" | "Resale" | "Nawy Now"
  financing: boolean
  nawyNow: boolean
  gardenArea?: number
  roofArea?: number
  roofAnnex?: number
  landArea?: number
  terraceArea?: number
}

interface GroupedProperty {
  id: string
  title: string
  description?: string
  availableUnits: number
  totalUnits: number
  entryType: "Automatic" | "Manual"
  saleType: "Primary" | "Resale" | "Nawy Now" | "Rental"
  listingStatus: "Published" | "Hidden"
  updatedAt: string
  developer: string
  compound: string
  propertyType: string
  deliveryType: string
  deliveryDate: string
  finishing: string
  area: number
  bathroom: number
  bedroom: number
  priceRange: number
  plans: number
  offers: number
  images: string[]
  floorPlans: string[]
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
}

function makeGroups(): GroupedProperty[] {
  const compounds = ["Lasirena Palm Beach", "New Cairo Residences", "North Coast Bay", "Lagoon District"]
  const developers = ["Lasirena Group", "Palm Hills", "Sodic", "Mountain View"]

  return Array.from({ length: 8 }, (_, groupIndex) => {
    const units = 2 + (groupIndex % 6)
    const available = Math.max(1, units - (groupIndex % 3))
    const saleType = (["Primary", "Resale", "Nawy Now", "Rental"] as const)[groupIndex % 4]
    const area = 120 + groupIndex * 12
    const bedrooms = 2 + (groupIndex % 4)
    const price = 6_400_000 + groupIndex * 875_000

    return {
      id: String(111729 + groupIndex * 418),
      title: `tamera for sale in ${compounds[groupIndex % compounds.length]} with ${bedrooms} bedrooms in ${["Ain Sokhna", "New Cairo", "North Coast", "Sheikh Zayed"][groupIndex % 4]} building ${String.fromCharCode(65 + groupIndex)}`,
      description: groupIndex % 3 === 0 ? "N/A" : "Grouped by matching project, unit attributes, payment plan, and listing source.",
      availableUnits: available,
      totalUnits: units,
      entryType: groupIndex % 5 === 0 ? "Manual" : "Automatic",
      saleType,
      listingStatus: groupIndex % 6 === 0 ? "Hidden" : "Published",
      updatedAt: "May 3, 2026, 6:36 PM",
      developer: developers[groupIndex % developers.length],
      compound: compounds[groupIndex % compounds.length],
      propertyType: groupIndex % 2 === 0 ? "Chalet / Garden Chalet" : "Apartment / Garden Apartment",
      deliveryType: groupIndex % 2 === 0 ? "OFF PLAN" : "READY TO MOVE",
      deliveryDate: `202${6 + (groupIndex % 3)}-12-01`,
      finishing: groupIndex % 2 === 0 ? "FULLY FINISHED" : "SEMI FINISHED",
      area,
      bathroom: Math.max(1, bedrooms - 1),
      bedroom: bedrooms,
      priceRange: price,
      plans: 1 + (groupIndex % 4),
      offers: groupIndex % 3,
      images: imagePool.slice(0, 4 + (groupIndex % 2)),
      floorPlans: groupIndex % 4 === 0 ? [] : imagePool.slice(2, 3),
      details: Array.from({ length: units }, (_, unitIndex) => ({
        id: String(122679 + groupIndex * 100 + unitIndex),
        unitCode: `h${groupIndex + 3}${unitIndex + 4}${unitIndex % 2 === 0 ? "grounda" : "groundb"}`,
        unitNumber: "N/A",
        unitModel: `H ${unitIndex % 2 === 0 ? "Ground" : "Typical"}`,
        netBua: area,
        grossBua: area,
        floor: groupIndex % 2 === 0 ? "N/A" : String(unitIndex + 1),
        price,
        paymentPlan: "tamera",
        duration: 6,
        downpayment: 20,
        status: unitIndex < available ? "Available" : "Sold",
        offering: saleType === "Rental" ? "Primary" : saleType,
        financing: groupIndex % 2 === 1,
        nawyNow: saleType === "Nawy Now",
        gardenArea: groupIndex % 2 === 0 ? 85 : undefined,
        roofArea: groupIndex % 3 === 0 ? 40 : undefined,
        roofAnnex: undefined,
        landArea: groupIndex % 4 === 0 ? 120 : undefined,
        terraceArea: groupIndex % 3 === 1 ? 18 : undefined,
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

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold text-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  )
}

function ImageStrip({ images, emptyLabel }: { images: string[]; emptyLabel: string }) {
  if (images.length === 0) {
    return <div className="text-sm font-medium text-red-600">{emptyLabel}</div>
  }
  return (
    <div className="flex gap-2">
      {images.slice(0, 6).map((image, index) => (
        <img key={`${image}-${index}`} src={image || "/placeholder.svg"} alt="" className="h-12 w-12 rounded border border-border object-cover" />
      ))}
    </div>
  )
}

function formatPrice(value: number) {
  return `${value.toLocaleString()} EGP`
}

function area(value?: number) {
  return value ? `${value} m²` : "N/A"
}

export function GroupedPropertiesView() {
  const [groups] = useState<GroupedProperty[]>(() => makeGroups())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([groups[0]?.id].filter(Boolean)))
  const [search, setSearch] = useState("")
  const [saleType, setSaleType] = useState("all")

  const filteredGroups = useMemo(() => {
    const query = search.toLowerCase()
    return groups.filter((group) => {
      if (saleType !== "all" && group.saleType !== saleType) return false
      if (!query) return true
      return [group.id, group.title, group.developer, group.compound, group.propertyType].some((value) =>
        value.toLowerCase().includes(query),
      )
    })
  }, [groups, search, saleType])

  const totalUnits = groups.reduce((sum, group) => sum + group.totalUnits, 0)
  const availableUnits = groups.reduce((sum, group) => sum + group.availableUnits, 0)
  const publishedGroups = groups.filter((group) => group.listingStatus === "Published").length
  const automaticGroups = groups.filter((group) => group.entryType === "Automatic").length
  const totalPlans = groups.reduce((sum, group) => sum + group.plans, 0)

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <AnalyticsCard label="Groups" value={groups.length.toLocaleString()} />
          <AnalyticsCard label="Available Units" value={`${availableUnits}/${totalUnits}`} />
          <AnalyticsCard label="Published" value={publishedGroups.toLocaleString()} />
          <AnalyticsCard label="Automatic" value={automaticGroups.toLocaleString()} />
          <AnalyticsCard label="Payment Plans" value={totalPlans.toLocaleString()} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-24" placeholder="Unit ID" value={search} onChange={(event) => setSearch(event.target.value)} />
            {["Developer", "Project", "Entry type", "Sales status", "Property type"].map((label) => (
              <Button key={label} variant="outline" className="h-9 min-w-32 justify-between bg-transparent text-muted-foreground">
                {label}
                <ChevronDown className="h-4 w-4" />
              </Button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 min-w-32 justify-between bg-transparent text-muted-foreground">
                  {saleType === "all" ? "Sale type" : saleType}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSaleType("all")}>All sale types</DropdownMenuItem>
                {["Primary", "Resale", "Nawy Now", "Rental"].map((type) => (
                  <DropdownMenuItem key={type} onClick={() => setSaleType(type)}>
                    {type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="h-9 bg-transparent">
              Is launch
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-9 bg-transparent">
              <Filter className="h-4 w-4" />
              Expand filter
            </Button>
            <Button variant="ghost" className="ml-auto h-9 text-muted-foreground">
              Clear filter
            </Button>
            <Button className="h-9">Apply filter</Button>
            <Button className="h-9">
              <Plus className="h-4 w-4" />
              Add property
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expanded.has(group.id)
            return (
              <div key={group.id} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h2 className="max-w-[560px] truncate text-base font-semibold">{group.title}</h2>
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <Badge variant="outline" className="font-normal">
                        {group.availableUnits} available / {group.totalUnits} units
                      </Badge>
                      <StatusBadge value={group.entryType} />
                      <StatusBadge value={group.saleType} />
                      <StatusBadge value={group.listingStatus} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                      <span>
                        ID: <CopyableId value={group.id} />
                      </span>
                      <span>Updated: {group.updatedAt}</span>
                    </div>
                    <p className="mt-2 text-sm">Description: {group.description || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" className="bg-transparent">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" className="bg-transparent" onClick={() => toggle(group.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <div className="space-y-4">
                    <DetailItem icon={<Building2 className="h-4 w-4" />} label="Developer" value={group.developer} />
                    <DetailItem icon={<Layers className="h-4 w-4" />} label="Delivery type" value={`${group.deliveryType} / ${group.deliveryDate}`} />
                    <DetailItem icon={<Bath className="h-4 w-4" />} label="Bathroom" value={group.bathroom} />
                    <div>
                      <div className="mb-2 text-sm font-semibold">Images:</div>
                      <ImageStrip images={group.images} emptyLabel="No images" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <DetailItem icon={<Home className="h-4 w-4" />} label="Compound" value={group.compound} />
                    <DetailItem icon={<Wrench className="h-4 w-4" />} label="Finishing" value={group.finishing} />
                    <DetailItem icon={<BedDouble className="h-4 w-4" />} label="Bedroom" value={group.bedroom} />
                    <div>
                      <div className="mb-2 text-sm font-semibold">Floor plans</div>
                      <ImageStrip images={group.floorPlans} emptyLabel="No floor plans" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <DetailItem icon={<Wrench className="h-4 w-4" />} label="Property type" value={group.propertyType} />
                    <DetailItem icon={<Ruler className="h-4 w-4" />} label="Area" value={`${group.area} SQM`} />
                    <DetailItem icon={<span className="font-mono text-xs">$</span>} label="Price Range" value={<strong>{formatPrice(group.priceRange)}</strong>} />
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        Payment Plans <button className="text-xs text-primary">See Details</button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" /> Plans: {group.plans}
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" /> Offers: {group.offers}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 border-t border-border pt-5">
                    <h3 className="mb-4 text-sm font-semibold">Detailed Properties ({group.details.length} units)</h3>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full min-w-[1500px] text-left text-xs">
                        <thead className="bg-secondary/50 text-foreground">
                          <tr>
                            {[
                              "ID",
                              "Unit Code",
                              "Unit Number",
                              "Unit Model",
                              "Net BUA (m²)",
                              "Gross BUA (m²)",
                              "Floor",
                              "Price",
                              "Payment Plan",
                              "Duration",
                              "Downpayment %",
                              "Status",
                              "Offering",
                              "Financing",
                              "Nawy Now",
                              "Garden Area (m²)",
                              "Roof Area (m²)",
                              "Roof Annex (m²)",
                              "Land Area (m²)",
                              "Terrace Area (m²)",
                            ].map((header) => (
                              <th key={header} className="whitespace-nowrap border-b border-border px-4 py-3 font-semibold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.details.map((detail) => (
                            <tr key={detail.id} className="border-b border-border last:border-b-0">
                              <td className="px-4 py-3 font-mono">{detail.id}</td>
                              <td className="px-4 py-3 font-mono">{detail.unitCode}</td>
                              <td className="px-4 py-3">{detail.unitNumber}</td>
                              <td className="px-4 py-3">{detail.unitModel}</td>
                              <td className="px-4 py-3">{area(detail.netBua)}</td>
                              <td className="px-4 py-3">{area(detail.grossBua)}</td>
                              <td className="px-4 py-3">{detail.floor}</td>
                              <td className="px-4 py-3">{detail.price.toLocaleString()}</td>
                              <td className="px-4 py-3">{detail.paymentPlan}</td>
                              <td className="px-4 py-3">{detail.duration}</td>
                              <td className="px-4 py-3">{detail.downpayment}%</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={detail.status === "Available" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>
                                  {detail.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge value={detail.offering} />
                              </td>
                              <td className="px-4 py-3">{detail.financing ? "Yes" : "No"}</td>
                              <td className="px-4 py-3">{detail.nawyNow ? "Yes" : "No"}</td>
                              <td className="px-4 py-3">{area(detail.gardenArea)}</td>
                              <td className="px-4 py-3">{area(detail.roofArea)}</td>
                              <td className="px-4 py-3">{area(detail.roofAnnex)}</td>
                              <td className="px-4 py-3">{area(detail.landArea)}</td>
                              <td className="px-4 py-3">{area(detail.terraceArea)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
  return (
    <div className="min-h-screen bg-secondary/40 p-4">
      <GroupedPropertiesView />
    </div>
  )
}

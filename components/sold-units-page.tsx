"use client"

import { useState, useMemo, useRef } from "react"
import {
  Search,
  X,
  Copy,
  Check,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  TrendingUp,
  ShoppingCart,
  Link2,
  User,
  Phone,
  Mail,
  CreditCard,
  Home,
  Layers,
  Calendar,
  DollarSign,
  BadgeCheck,
  Target,
  SlidersHorizontal,
  MoreHorizontal,
  Pencil,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { soldUnitsData, type SoldUnit } from "@/lib/sold-units-mock"
import { TableCard, TableCardHeader, TableToolbar, TableFooter } from "@/components/table-kit"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return `EGP ${value.toLocaleString("en-US")}`
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `EGP ${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `EGP ${(value / 1_000).toFixed(0)}K`
  return `EGP ${value.toLocaleString()}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  )
}

function getConfidenceColor(v: number) {
  if (v >= 85) return "bg-emerald-500"
  if (v >= 65) return "bg-amber-400"
  return "bg-red-400"
}

function getConfidenceTextColor(v: number) {
  if (v >= 85) return "text-emerald-600"
  if (v >= 65) return "text-amber-500"
  return "text-red-500"
}

// ─── Copy cell ───────────────────────────────────────────────────────────────

function CopyCell({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm text-foreground">{label ?? text}</span>
      <button
        onClick={(e) => { e.stopPropagation(); copy() }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-secondary rounded"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  )
}

// ─── Developer cell ──────────────────────────────────────────────────────────

function DeveloperCell({ dev }: { dev: SoldUnit["developer"] }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(dev.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
        {dev.logo}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground leading-tight">{dev.name}</p>
        <div className="flex items-center gap-1 group mt-0.5">
          <span className="text-[10px] text-muted-foreground font-mono">{dev.id}</span>
          <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity">
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confidence bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getConfidenceColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums w-8 text-right", getConfidenceTextColor(value))}>
        {value}%
      </span>
    </div>
  )
}

// ─── Matching status badge ───────────────────────────────────────────────────

type MatchStatus = "Matched" | "Partial Match" | "No Match"

function getMatchStatus(confidence: number, hasMatch: boolean): MatchStatus {
  if (!hasMatch) return "No Match"
  if (confidence >= 85) return "Matched"
  return "Partial Match"
}

function MatchingStatusBadge({ confidence, hasMatch }: { confidence: number; hasMatch: boolean }) {
  const status = getMatchStatus(confidence, hasMatch)
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
        status === "Matched" && "bg-emerald-100 text-emerald-700",
        status === "Partial Match" && "bg-amber-100 text-amber-700",
        status === "No Match" && "bg-red-100 text-red-600",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0",
          status === "Matched" && "bg-emerald-500",
          status === "Partial Match" && "bg-amber-400",
          status === "No Match" && "bg-red-400",
        )}
      />
      {status}
    </span>
  )
}

// ─── Linked ID cell (clickable, underlined, copy) ────────────────────────────

function LinkedIdCell({ id, href }: { id: string; href?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-1 group">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-0.5"
        >
          {id}
          <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
        </a>
      ) : (
        <span className="font-mono text-xs text-foreground">{id}</span>
      )}
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-secondary rounded"
      >
        {copied
          ? <Check className="h-3 w-3 text-emerald-500" />
          : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  )
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
      {label}
      <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Side Drawer ─────────────────────────────────────────────────────────────

function SaleDrawer({ sale, open, onClose }: { sale: SoldUnit | null; open: boolean; onClose: () => void }) {
  if (!sale) return null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[520px] max-w-full p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base font-semibold">{sale.id}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {sale.project.name} · {formatDate(sale.saleDate)}
              </p>
            </div>
            <Badge
              className={cn(
                "text-xs font-medium",
                sale.saleType === "Primary"
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-100",
              )}
            >
              {sale.saleType}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">

          {/* Owner Info */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Owner Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                <p className="text-sm font-medium">{sale.owner.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">National ID</p>
                <p className="text-sm font-mono">{sale.owner.nationalId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                <p className="text-sm">{sale.owner.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                <p className="text-sm break-all">{sale.owner.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sale Financial Summary */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Sale Financial Summary
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Total Sale Amount</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(sale.saleAmount)}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Down Payment</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(sale.downpayment)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {Math.round((sale.downpayment / sale.saleAmount) * 100)}% of total
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(sale.paymentPlan.installmentAmount)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Over {sale.paymentPlan.installmentYears} yrs</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Plan */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              Payment Plan
            </h3>
            <div className="space-y-2">
              {sale.paymentPlan.milestones.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(m.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Matched Property */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Target className="h-3.5 w-3.5" />
              Matched Property
              <ConfidenceBar value={sale.matchingConfidence} />
            </h3>

            {sale.matchedProperty ? (
              <Card className="p-4 border border-border">
                {/* IDs */}
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Property ID</p>
                    <CopyCell text={sale.matchedProperty.id} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Detailed ID</p>
                    <CopyCell text={sale.matchedProperty.detailedId} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unit Code</p>
                    <p className="text-sm font-mono font-medium">{sale.matchedProperty.unitCode}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      sale.matchedProperty.status === "Available" && "border-emerald-300 text-emerald-700",
                      sale.matchedProperty.status === "Reserved" && "border-amber-300 text-amber-700",
                      sale.matchedProperty.status === "Sold" && "border-red-300 text-red-600",
                    )}
                  >
                    {sale.matchedProperty.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" /> Building</p>
                    <p className="text-sm">{sale.matchedProperty.building}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Floor</p>
                    <p className="text-sm">{sale.matchedProperty.floor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Home className="h-3 w-3" /> Bedrooms</p>
                    <p className="text-sm">{sale.matchedProperty.bedrooms} bed · {sale.matchedProperty.bathrooms} bath</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Layers className="h-3 w-3" /> Gross Area</p>
                    <p className="text-sm">{sale.matchedProperty.grossArea} SQM</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Net Area</p>
                    <p className="text-sm">{sale.matchedProperty.netArea} SQM</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Finishing</p>
                    <p className="text-sm">{sale.matchedProperty.finishingType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Delivery</p>
                    <p className="text-sm">{sale.matchedProperty.deliveryDate}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Listed Price</p>
                    <p className="text-sm font-semibold">{formatCurrency(sale.matchedProperty.price)}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg">
                <Link2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No matched property</p>
                <p className="text-xs text-muted-foreground mt-1">Confidence below threshold ({sale.matchingConfidence}%)</p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="px-6 py-4 border-t border-border bg-secondary/20">
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>Sale date: <span className="text-foreground">{formatDate(sale.saleDate)}</span></span>
              <span>Created: <span className="text-foreground">{formatDateTime(sale.createdAt)}</span></span>
              <span>Updated: <span className="text-foreground">{formatDateTime(sale.updatedAt)}</span></span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortField = keyof Pick<
  SoldUnit,
  "id" | "saleDate" | "saleAmount" | "grossArea" | "matchingConfidence" | "createdAt" | "updatedAt"
>

interface ActiveFilter {
  id: string
  field: string
  label: string
  value: string
}

export function SoldUnitsPage() {
  const data = soldUnitsData

  // Grid state
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("saleDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Filters
  const [saleTypeFilter, setSaleTypeFilter] = useState("")
  const [devFilter, setDevFilter] = useState("")
  const [projFilter, setProjFilter] = useState("")
  const [propTypeFilter, setPropTypeFilter] = useState("")
  const [matchedFilter, setMatchedFilter] = useState("") // "matched" | "unmatched" | ""
  const [confidenceMin, setConfidenceMin] = useState("")
  const [confidenceMax, setConfidenceMax] = useState("")
  const [saleDateFrom, setSaleDateFrom] = useState("")
  const [saleDateTo, setSaleDateTo] = useState("")
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)

  // Drawer
  const [selectedSale, setSelectedSale] = useState<SoldUnit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Clipboard for table cells
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Derived filter options
  const allDevelopers = useMemo(() => [...new Map(data.map((d) => [d.developer.id, d.developer])).values()], [data])
  const allProjects = useMemo(() => [...new Map(data.map((d) => [d.project.id, d.project])).values()], [data])
  const allPropTypes = useMemo(() => [...new Set(data.map((d) => d.propertyType))], [data])

  // Filtering
  const filtered = useMemo(() => {
    let result = [...data]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.developer.name.toLowerCase().includes(q) ||
          r.developer.id.toLowerCase().includes(q) ||
          r.project.name.toLowerCase().includes(q) ||
          r.project.id.toLowerCase().includes(q) ||
          r.propertyType.toLowerCase().includes(q) ||
          (r.matchedPropertyId ?? "").toLowerCase().includes(q) ||
          (r.matchedDetailedPropertyId ?? "").toLowerCase().includes(q),
      )
    }
    if (saleTypeFilter) result = result.filter((r) => r.saleType === saleTypeFilter)
    if (devFilter) result = result.filter((r) => r.developer.id === devFilter)
    if (projFilter) result = result.filter((r) => r.project.id === projFilter)
    if (propTypeFilter) result = result.filter((r) => r.propertyType === propTypeFilter)
    if (matchedFilter === "matched") result = result.filter((r) => r.matchedPropertyId !== null)
    if (matchedFilter === "unmatched") result = result.filter((r) => r.matchedPropertyId === null)
    if (confidenceMin !== "") result = result.filter((r) => r.matchingConfidence >= Number(confidenceMin))
    if (confidenceMax !== "") result = result.filter((r) => r.matchingConfidence <= Number(confidenceMax))
    if (saleDateFrom) result = result.filter((r) => r.saleDate >= saleDateFrom)
    if (saleDateTo) result = result.filter((r) => r.saleDate <= saleDateTo + "T23:59:59")

    // Sort
    result.sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      let cmp = 0
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv
      else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv)
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [data, search, saleTypeFilter, devFilter, projFilter, propTypeFilter, matchedFilter, confidenceMin, confidenceMax, saleDateFrom, saleDateTo, sortField, sortDir])

  // Active filters for chips
  const activeFilterChips: ActiveFilter[] = [
    saleTypeFilter && { id: "saleType", field: "saleType", label: `Type: ${saleTypeFilter}`, value: saleTypeFilter },
    devFilter && { id: "dev", field: "dev", label: `Developer: ${allDevelopers.find((d) => d.id === devFilter)?.name ?? devFilter}`, value: devFilter },
    projFilter && { id: "proj", field: "proj", label: `Project: ${allProjects.find((p) => p.id === projFilter)?.name ?? projFilter}`, value: projFilter },
    propTypeFilter && { id: "propType", field: "propType", label: `Property: ${propTypeFilter}`, value: propTypeFilter },
    matchedFilter && { id: "matched", field: "matched", label: matchedFilter === "matched" ? "Matched" : "Unmatched", value: matchedFilter },
    (confidenceMin !== "" || confidenceMax !== "") && { id: "confidence", field: "confidence", label: `Confidence: ${confidenceMin || "0"}–${confidenceMax || "100"}%`, value: "" },
    (saleDateFrom || saleDateTo) && { id: "saleDate", field: "saleDate", label: `Sale Date: ${saleDateFrom || "…"} → ${saleDateTo || "…"}`, value: "" },
  ].filter(Boolean) as ActiveFilter[]

  const removeFilter = (id: string) => {
    if (id === "saleType") setSaleTypeFilter("")
    if (id === "dev") setDevFilter("")
    if (id === "proj") setProjFilter("")
    if (id === "propType") setPropTypeFilter("")
    if (id === "matched") setMatchedFilter("")
    if (id === "confidence") { setConfidenceMin(""); setConfidenceMax("") }
    if (id === "saleDate") { setSaleDateFrom(""); setSaleDateTo("") }
  }

  const clearAllFilters = () => {
    setSaleTypeFilter("")
    setDevFilter("")
    setProjFilter("")
    setPropTypeFilter("")
    setMatchedFilter("")
    setConfidenceMin("")
    setConfidenceMax("")
    setSaleDateFrom("")
    setSaleDateTo("")
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safeCurrentPage = Math.min(page, totalPages)
  const pageData = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1" />
    if (sortDir === "asc") return <ArrowUp className="h-3.5 w-3.5 text-primary ml-1" />
    return <ArrowDown className="h-3.5 w-3.5 text-primary ml-1" />
  }

  const openDrawer = (sale: SoldUnit) => {
    setSelectedSale(sale)
    setDrawerOpen(true)
  }

  // Stats
  const totalMatched = data.filter((d) => d.matchedPropertyId !== null).length
  const avgConfidence = Math.round(data.reduce((s, d) => s + d.matchingConfidence, 0) / data.length)
  const totalSaleValue = data.reduce((s, d) => s + d.saleAmount, 0)
  const primaryCount = data.filter((d) => d.saleType === "Primary").length

  return (
    <div className="p-6 space-y-5 bg-background min-h-full">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sold Units</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All sales processed through Nawy</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Sales</span>
          </div>
          <p className="text-xl font-bold text-foreground">{data.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Total Value</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrencyShort(totalSaleValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Matched</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {totalMatched}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ {data.length}</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Avg Confidence</span>
          </div>
          <p className="text-xl font-bold text-foreground">{avgConfidence}%</p>
        </div>
      </div>

      {/* Search + Filters toolbar */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by Sale ID, developer, project..."
        activeFilters={activeFilterChips.length}
        onAllFilters={() => setShowFiltersDrawer(true)}
        onAdvancedFilters={() => setShowFiltersDrawer(true)}
        filters={
        <>
          {/* Quick filter: Sale Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", saleTypeFilter && "border-primary text-primary")}>
                {saleTypeFilter || "Sale Type"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setSaleTypeFilter(""); setPage(1) }}>All Types</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSaleTypeFilter("Primary"); setPage(1) }}>Primary</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSaleTypeFilter("Resale"); setPage(1) }}>Resale</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick filter: Developer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 max-w-44", devFilter && "border-primary text-primary")}>
                <span className="truncate">{devFilter ? allDevelopers.find((d) => d.id === devFilter)?.name : "Developer"}</span>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => { setDevFilter(""); setPage(1) }}>All Developers</DropdownMenuItem>
              <DropdownMenuSeparator />
              {allDevelopers.map((d) => (
                <DropdownMenuItem key={d.id} onClick={() => { setDevFilter(d.id); setPage(1) }}>
                  <div>
                    <p className="text-sm">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{d.id}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick filter: Property Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", propTypeFilter && "border-primary text-primary")}>
                {propTypeFilter || "Property Type"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setPropTypeFilter(""); setPage(1) }}>All Types</DropdownMenuItem>
              <DropdownMenuSeparator />
              {allPropTypes.map((t) => (
                <DropdownMenuItem key={t} onClick={() => { setPropTypeFilter(t); setPage(1) }}>{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </>
        }
      />

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterChips.map((f) => (
            <FilterChip key={f.id} label={f.label} onRemove={() => removeFilter(f.id)} />
          ))}
          <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* Table card */}
      <TableCard>
        <TableCardHeader title="Sold Units" count={filtered.length} />
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[1800px]">
          <thead className="sticky top-0 z-10 bg-muted/60 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-36">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("id")}>
                  Sale ID <SortIcon field="id" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-52">Developer</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-44">Project</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Sale Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Property Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("grossArea")}>
                  Gross Area <SortIcon field="grossArea" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("saleAmount")}>
                  Sale Amount <SortIcon field="saleAmount" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-32">Match Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-44">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("matchingConfidence")}>
                  Match Confidence <SortIcon field="matchingConfidence" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Matched Property ID</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Matched Detailed ID</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Matched Price</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("saleDate")}>
                  Sale Date <SortIcon field="saleDate" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("createdAt")}>
                  Created At <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("updatedAt")}>
                  Updated At <SortIcon field="updatedAt" />
                </button>
              </th>
              <th className="sticky right-0 bg-muted/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-l border-border w-14"></th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  No sales found matching your filters.
                </td>
              </tr>
            ) : (
              pageData.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border transition-colors hover:bg-muted/40 cursor-pointer bg-card"
                  onClick={() => openDrawer(sale)}
                >
                  {/* Sale ID */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <LinkedIdCell id={sale.id} />
                  </td>

                  {/* Developer */}
                  <td className="px-4 py-3">
                    <DeveloperCell dev={sale.developer} />
                  </td>

                  {/* Project */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{sale.project.name}</p>
                      <div className="flex items-center gap-1 group mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-muted-foreground font-mono">{sale.project.id}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyId(sale.project.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copiedId === sale.project.id
                            ? <Check className="h-2.5 w-2.5 text-emerald-500" />
                            : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Sale Type */}
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "text-xs font-medium",
                        sale.saleType === "Primary"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-100",
                      )}
                    >
                      {sale.saleType}
                    </Badge>
                  </td>

                  {/* Property Type */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{sale.propertyType}</span>
                  </td>

                  {/* Gross Area */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground tabular-nums">{sale.grossArea} m²</span>
                  </td>

                  {/* Sale Amount — full, not abbreviated */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(sale.saleAmount)}</span>
                  </td>

                  {/* Matching Status */}
                  <td className="px-4 py-3">
                    <MatchingStatusBadge confidence={sale.matchingConfidence} hasMatch={sale.matchedPropertyId !== null} />
                  </td>

                  {/* Matching Confidence */}
                  <td className="px-4 py-3">
                    <ConfidenceBar value={sale.matchingConfidence} />
                  </td>

                  {/* Matched Property ID — clickable, underlined, with copy */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {sale.matchedPropertyId ? (
                      <LinkedIdCell
                        id={sale.matchedPropertyId}
                        href={`/properties/${sale.matchedPropertyId}`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>

                  {/* Matched Detailed Property ID — clickable, underlined, with copy */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {sale.matchedDetailedPropertyId ? (
                      <LinkedIdCell
                        id={sale.matchedDetailedPropertyId}
                        href={`/properties/${sale.matchedDetailedPropertyId}`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>

                  {/* Matched Property Price */}
                  <td className="px-4 py-3">
                    {sale.matchedPropertyPrice !== null ? (
                      <span className="text-sm text-foreground tabular-nums">{formatCurrency(sale.matchedPropertyPrice)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>

                  {/* Sale Date */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground whitespace-nowrap">{formatDate(sale.saleDate)}</span>
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(sale.createdAt)}</span>
                  </td>

                  {/* Updated At */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(sale.updatedAt)}</span>
                  </td>

                  {/* Actions — three-dot dropdown */}
                  <td
                    className="sticky right-0 bg-card border-l border-border px-3 py-3"
                    style={{ boxShadow: "-4px 0 8px -4px rgba(0,0,0,0.06)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openDrawer(sale)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit Matching
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <TableFooter page={safeCurrentPage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="results" />
      </TableCard>

      {/* Advanced Filters Sheet */}
      <Sheet open={showFiltersDrawer} onOpenChange={setShowFiltersDrawer}>
        <SheetContent side="right" className="w-[360px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Advanced Filters</SheetTitle>
              {activeFilterChips.length > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Clear all
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Sale Type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Sale Type</label>
              <div className="flex gap-2">
                {["", "Primary", "Resale"].map((v) => (
                  <button
                    key={v || "all"}
                    onClick={() => { setSaleTypeFilter(v); setPage(1) }}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md border transition-colors",
                      saleTypeFilter === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    {v || "All"}
                  </button>
                ))}
              </div>
            </div>

            {/* Developer */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Developer</label>
              <Select value={devFilter || "all"} onValueChange={(v) => { setDevFilter(v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Developers" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Developers</SelectItem>
                  {allDevelopers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div>
                        <p>{d.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{d.id}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Project</label>
              <Select value={projFilter || "all"} onValueChange={(v) => { setProjFilter(v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Projects" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Projects</SelectItem>
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <p>{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.id}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Property Type</label>
              <Select value={propTypeFilter || "all"} onValueChange={(v) => { setPropTypeFilter(v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Property Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {allPropTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Match Status */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Match Status</label>
              <div className="flex gap-2">
                {[{ v: "", l: "All" }, { v: "matched", l: "Matched" }, { v: "unmatched", l: "Unmatched" }].map(({ v, l }) => (
                  <button
                    key={v || "all"}
                    onClick={() => { setMatchedFilter(v); setPage(1) }}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md border transition-colors",
                      matchedFilter === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Range */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Matching Confidence (%)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={confidenceMin}
                  onChange={(e) => { setConfidenceMin(e.target.value); setPage(1) }}
                  className="h-9 w-20"
                  min={0}
                  max={100}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={confidenceMax}
                  onChange={(e) => { setConfidenceMax(e.target.value); setPage(1) }}
                  className="h-9 w-20"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Sale Date Range */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Sale Date Range</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <Input type="date" value={saleDateFrom} onChange={(e) => { setSaleDateFrom(e.target.value); setPage(1) }} className="h-9" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <Input type="date" value={saleDateTo} onChange={(e) => { setSaleDateTo(e.target.value); setPage(1) }} className="h-9" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button className="w-full" onClick={() => setShowFiltersDrawer(false)}>
              Apply Filters {filtered.length > 0 && `(${filtered.length} results)`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sale Detail Drawer */}
      <SaleDrawer sale={selectedSale} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

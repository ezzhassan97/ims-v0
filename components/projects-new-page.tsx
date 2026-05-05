"use client"

import type React from "react"

import { useMemo, useState } from "react"
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Copy,
  FileDown,
  FileSpreadsheet,
  FileText,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ListingStatus = "Active" | "Hidden"
type PrimaryStatus = "Selling" | "Launching Soon" | "Sold Out" | "On Hold" | "Archived"
type RowKind = "project" | "phase"

interface PropertyMix {
  available: number
  total: number
}

interface ProjectPhaseRow {
  id: string
  name: string
  developer: {
    id: string
    name: string
    logo: string
  }
  area: string
  subarea: string
  listingStatus: ListingStatus
  primaryStatus: PrimaryStatus
  primaryProperties: PropertyMix
  resaleProperties: PropertyMix
  nawyNowProperties: PropertyMix
  rentalProperties: PropertyMix
  brochures: number
  masterplans: number
  floorPlans: number
  paymentPlans: number
  coordinatesUploaded: boolean
  polygonsUploaded: boolean
  mapboxMasterplanUploaded: boolean
  kind: RowKind
  phases?: ProjectPhaseRow[]
}

interface ColumnDef {
  id: keyof ProjectPhaseRow
  label: string
  width: number
  align?: "left" | "right" | "center"
  pinned?: boolean
  fixed?: boolean
}

const columns: ColumnDef[] = [
  { id: "name", label: "Project / Phase", width: 310, pinned: true, fixed: true },
  { id: "developer", label: "Developer", width: 230 },
  { id: "area", label: "Area", width: 150 },
  { id: "subarea", label: "Subarea", width: 160 },
  { id: "listingStatus", label: "Listing Status", width: 140 },
  { id: "primaryStatus", label: "Primary Status", width: 170 },
  { id: "primaryProperties", label: "Primary Properties", width: 180 },
  { id: "resaleProperties", label: "Resale Properties", width: 180 },
  { id: "nawyNowProperties", label: "Nawy Now Properties", width: 190 },
  { id: "rentalProperties", label: "Rental Properties", width: 180 },
  { id: "brochures", label: "Brochures", width: 120, align: "right" },
  { id: "masterplans", label: "Masterplans", width: 130, align: "right" },
  { id: "floorPlans", label: "Floor Plans", width: 130, align: "right" },
  { id: "paymentPlans", label: "Payment Plans", width: 140, align: "right" },
  { id: "coordinatesUploaded", label: "Coordinates", width: 140 },
  { id: "polygonsUploaded", label: "Polygons", width: 130 },
  { id: "mapboxMasterplanUploaded", label: "Mapbox Masterplan", width: 180 },
]

const listingStatuses: ListingStatus[] = ["Active", "Hidden"]
const primaryStatuses: PrimaryStatus[] = ["Selling", "Launching Soon", "Sold Out", "On Hold", "Archived"]

const statusClasses: Record<string, string> = {
  Active: "border-green-200 bg-green-100 text-green-700",
  Hidden: "border-gray-200 bg-gray-100 text-gray-700",
  Selling: "border-green-200 bg-green-100 text-green-700",
  "Launching Soon": "border-amber-200 bg-amber-100 text-amber-700",
  "Sold Out": "border-red-200 bg-red-100 text-red-700",
  "On Hold": "border-orange-200 bg-orange-100 text-orange-700",
  Archived: "border-gray-200 bg-gray-100 text-gray-700",
}

const developers = [
  { id: "DEV-001", name: "Palm Hills", logo: "PH" },
  { id: "DEV-002", name: "Sodic", logo: "SD" },
  { id: "DEV-003", name: "Mountain View", logo: "MV" },
  { id: "DEV-004", name: "Emaar", logo: "EM" },
]

function metric(seed: number, totalBase: number): PropertyMix {
  const total = totalBase + seed * 7
  const available = Math.max(0, total - ((seed * 5) % Math.max(1, total)))
  return { available, total }
}

function makePhase(projectIndex: number, phaseIndex: number, project: Omit<ProjectPhaseRow, "phases">): ProjectPhaseRow {
  const seed = projectIndex * 10 + phaseIndex + 1
  return {
    ...project,
    id: `${project.id}-P${phaseIndex + 1}`,
    name: `Phase ${phaseIndex + 1}`,
    subarea: `${project.subarea} - Cluster ${String.fromCharCode(65 + phaseIndex)}`,
    listingStatus: seed % 4 === 0 ? "Hidden" : "Active",
    primaryStatus: primaryStatuses[seed % primaryStatuses.length],
    primaryProperties: metric(seed, 24),
    resaleProperties: metric(seed + 1, 10),
    nawyNowProperties: metric(seed + 2, 7),
    rentalProperties: metric(seed + 3, 5),
    brochures: seed % 3,
    masterplans: seed % 2,
    floorPlans: 4 + (seed % 9),
    paymentPlans: 2 + (seed % 6),
    coordinatesUploaded: seed % 5 !== 0,
    polygonsUploaded: seed % 4 !== 0,
    mapboxMasterplanUploaded: seed % 3 !== 0,
    kind: "phase",
  }
}

function createRows(): ProjectPhaseRow[] {
  const names = ["New Cairo Residences", "North Coast Bay", "West Gate", "Lagoon District", "Capital Gardens", "East Park"]
  const areas = ["New Cairo", "North Coast", "6th of October", "Mostakbal City", "New Capital", "Sheikh Zayed"]
  const subareas = ["Golden Square", "Ras El Hekma", "West Somid", "Bloomfields", "R7", "Waslet Dahshour"]

  return names.map((name, index) => {
    const developer = developers[index % developers.length]
    const project: Omit<ProjectPhaseRow, "phases"> = {
      id: `PRJ-${String(index + 1).padStart(4, "0")}`,
      name,
      developer,
      area: areas[index],
      subarea: subareas[index],
      listingStatus: index % 5 === 0 ? "Hidden" : "Active",
      primaryStatus: primaryStatuses[index % primaryStatuses.length],
      primaryProperties: metric(index + 4, 80),
      resaleProperties: metric(index + 5, 35),
      nawyNowProperties: metric(index + 6, 18),
      rentalProperties: metric(index + 7, 12),
      brochures: 1 + (index % 4),
      masterplans: index % 2,
      floorPlans: 16 + index * 5,
      paymentPlans: 4 + index,
      coordinatesUploaded: index % 4 !== 0,
      polygonsUploaded: index % 3 !== 0,
      mapboxMasterplanUploaded: index % 2 === 0,
      kind: "project",
    }

    return {
      ...project,
      phases: Array.from({ length: 2 + (index % 3) }, (_, phaseIndex) => makePhase(index, phaseIndex, project)),
    }
  })
}

function CopyableText({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <span className={cn("group/copy inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{value}</span>
      <button
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary group-hover/copy:opacity-100"
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

function StatusBadge({ value }: { value: ListingStatus | PrimaryStatus }) {
  return (
    <Badge variant="outline" className={cn("border", statusClasses[value])}>
      {value}
    </Badge>
  )
}

function UploadBadge({ uploaded }: { uploaded: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border",
        uploaded ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {uploaded ? "Uploaded" : "Not uploaded"}
    </Badge>
  )
}

function ProgressMetric({ value }: { value: PropertyMix }) {
  const pct = value.total > 0 ? Math.round((value.available / value.total) * 100) : 0

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {value.available}/{value.total}
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", pct > 60 ? "bg-green-500" : pct > 25 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function getSortValue(row: ProjectPhaseRow, column: ColumnDef["id"]) {
  const value = row[column]
  if (typeof value === "object" && value !== null) {
    if ("available" in value && "total" in value) return value.available / Math.max(1, value.total)
    if ("name" in value) return value.name
  }
  return value ?? ""
}

export function ProjectsNewPage() {
  const [rows, setRows] = useState<ProjectPhaseRow[]>(() => createRows())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [listingFilter, setListingFilter] = useState("all")
  const [primaryFilter, setPrimaryFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<ColumnDef["id"]>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnDef["id"]>>(() => new Set(columns.map((column) => column.id)))

  const visible = columns.filter((column) => visibleColumns.has(column.id))
  const pinned = visible.find((column) => column.pinned)
  const scrollColumns = visible.filter((column) => !column.pinned)

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return rows
      .filter((row) => {
        if (listingFilter !== "all" && row.listingStatus !== listingFilter) return false
        if (primaryFilter !== "all" && row.primaryStatus !== primaryFilter) return false
        if (!query) return true
        return [row.name, row.id, row.developer.name, row.developer.id, row.area, row.subarea]
          .some((value) => value.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        const aValue = getSortValue(a, sortColumn)
        const bValue = getSortValue(b, sortColumn)
        const result =
          typeof aValue === "number" && typeof bValue === "number"
            ? aValue - bValue
            : String(aValue).localeCompare(String(bValue))
        return sortDirection === "asc" ? result : -result
      })
  }, [rows, searchQuery, listingFilter, primaryFilter, sortColumn, sortDirection])

  const toggleExpanded = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateRow = (id: string, updates: Partial<ProjectPhaseRow>) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id === id) return { ...row, ...updates }
        return {
          ...row,
          phases: row.phases?.map((phase) => (phase.id === id ? { ...phase, ...updates } : phase)),
        }
      }),
    )
  }

  const renderCell = (row: ProjectPhaseRow, column: ColumnDef, depth = 0): React.ReactNode => {
    switch (column.id) {
      case "name":
        return (
          <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: depth * 18 }}>
            {row.kind === "project" ? (
              <button className="rounded p-0.5 hover:bg-secondary" onClick={() => toggleExpanded(row.id)}>
                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedRows.has(row.id) && "rotate-90")} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <div className="min-w-0">
              <div className={cn("truncate font-medium", row.kind === "phase" && "text-muted-foreground")}>{row.name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                <CopyableText value={row.id} />
              </div>
            </div>
          </div>
        )
      case "developer":
        return (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
              {row.developer.logo}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium">{row.developer.name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                <CopyableText value={row.developer.id} />
              </div>
            </div>
          </div>
        )
      case "listingStatus":
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <StatusBadge value={row.listingStatus} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {listingStatuses.map((status) => (
                <DropdownMenuItem key={status} onClick={() => updateRow(row.id, { listingStatus: status })}>
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      case "primaryStatus":
        return <StatusBadge value={row.primaryStatus} />
      case "primaryProperties":
      case "resaleProperties":
      case "nawyNowProperties":
      case "rentalProperties":
        return <ProgressMetric value={row[column.id] as PropertyMix} />
      case "coordinatesUploaded":
      case "polygonsUploaded":
      case "mapboxMasterplanUploaded":
        return <UploadBadge uploaded={Boolean(row[column.id])} />
      default:
        return row[column.id] as React.ReactNode
    }
  }

  const renderRow = (row: ProjectPhaseRow, depth = 0) => (
    <div key={row.id}>
      <div
        className={cn(
          "group/row flex min-w-max border-b border-border bg-card text-sm hover:bg-secondary/25",
          row.kind === "phase" && "bg-secondary/10",
        )}
      >
        {pinned && (
          <div
            className="sticky left-0 z-10 flex items-center border-r border-border bg-card px-3 py-2 group-hover/row:bg-secondary/25"
            style={{ width: pinned.width }}
          >
            {renderCell(row, pinned, depth)}
          </div>
        )}
        {scrollColumns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "flex items-center border-r border-border px-3 py-2",
              column.align === "right" && "justify-end text-right",
              column.align === "center" && "justify-center text-center",
            )}
            style={{ width: column.width }}
          >
            {renderCell(row, column, depth)}
          </div>
        ))}
      </div>
      {row.kind === "project" && expandedRows.has(row.id) && row.phases?.map((phase) => renderRow(phase, depth + 1))}
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Projects New</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project and phase inventory with expandable phase rows and shared project/phase columns.
        </p>
      </div>

      <div className="min-h-0 flex-1 p-4">
        <div className="mb-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder="Search projects, phases, developers..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={listingFilter} onValueChange={setListingFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Listing</SelectItem>
                {listingStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={primaryFilter} onValueChange={setPrimaryFilter}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Primary Status</SelectItem>
                {primaryStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 bg-transparent">
                  <ArrowUpDown className="mr-1.5 h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="space-y-2 p-2">
                  <Select value={sortColumn} onValueChange={(value) => setSortColumn(value as ColumnDef["id"])}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as "asc" | "desc")}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
                    {column.fixed && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        Pinned
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="ml-auto h-9 bg-transparent">
              <FileDown className="mr-1.5 h-4 w-4" />
              Export
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-172px)] flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              <div className="sticky top-0 z-20 flex min-w-max border-b border-border bg-secondary/60 text-xs font-medium text-muted-foreground">
                {pinned && (
                  <div className="sticky left-0 z-30 border-r border-border bg-secondary px-3 py-2" style={{ width: pinned.width }}>
                    {pinned.label}
                  </div>
                )}
                {scrollColumns.map((column) => (
                  <button
                    key={column.id}
                    className={cn(
                      "border-r border-border px-3 py-2 text-left hover:text-foreground",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                    )}
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
              {filteredRows.map((row) => renderRow(row))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {filteredRows.length} projects and {filteredRows.reduce((sum, row) => sum + (row.phases?.length ?? 0), 0)} phases
            </span>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Brochures</span>
              <FileSpreadsheet className="ml-3 h-4 w-4" />
              <span>Payment plans</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

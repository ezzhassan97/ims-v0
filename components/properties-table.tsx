"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Search, ChevronDown, Building2, Hash, AlertTriangle, Layers, Link2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Unit, Building } from "@/lib/mock-data"
import { projectPhases } from "@/lib/mock-data"

interface PropertiesTableProps {
  units: Unit[]
  buildings: Building[]
  onUpdateUnit?: (unitId: string, updates: Partial<Unit>) => void
  headerActions?: React.ReactNode
}

export function PropertiesTable({ units, buildings, onUpdateUnit, headerActions }: PropertiesTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("")
  const [buildingFilter, setBuildingFilter] = useState<string>("")
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [phaseFilter, setPhaseFilter] = useState<string>("")
  const [showWithoutUnitCode, setShowWithoutUnitCode] = useState(false)
  const [showWithoutBuilding, setShowWithoutBuilding] = useState(false)
  const [showMismatchedBuilding, setShowMismatchedBuilding] = useState(false)
  const [editingCell, setEditingCell] = useState<{ unitId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")

  const buildingNames = buildings.map((b) => b.name)
  const propertyTypes = [...new Set(units.map((u) => u.propertyType))]
  const saleTypes = [...new Set(units.map((u) => u.saleType))]

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      if (searchQuery && !unit.unitCode.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (propertyTypeFilter && unit.propertyType !== propertyTypeFilter) {
        return false
      }
      if (buildingFilter && unit.buildingNumber !== buildingFilter) {
        return false
      }
      if (saleTypeFilter && unit.saleType !== saleTypeFilter) {
        return false
      }
      if (statusFilter && unit.status !== statusFilter) {
        return false
      }
      if (phaseFilter && unit.phase !== phaseFilter) {
        return false
      }
      if (showWithoutUnitCode && unit.unitCode !== "") {
        return false
      }
      if (showWithoutBuilding && unit.buildingNumber !== "") {
        return false
      }
      if (showMismatchedBuilding) {
        if (unit.buildingNumber === "" || buildingNames.includes(unit.buildingNumber)) {
          return false
        }
      }
      return true
    })
  }, [
    units,
    searchQuery,
    propertyTypeFilter,
    buildingFilter,
    saleTypeFilter,
    statusFilter,
    phaseFilter,
    showWithoutUnitCode,
    showWithoutBuilding,
    showMismatchedBuilding,
    buildingNames,
  ])

  const analytics = useMemo(() => {
    const totalUnits = filteredUnits.length
    const withUnitCode = filteredUnits.filter((u) => u.unitCode !== "").length
    const withBuildingNumber = filteredUnits.filter((u) => u.buildingNumber !== "").length
    const matchedUnits = filteredUnits.filter((u) => buildingNames.includes(u.buildingNumber)).length

    const primaryTotal = filteredUnits.filter((u) => u.saleType === "Primary").length
    const primaryMatched = filteredUnits.filter(
      (u) => u.saleType === "Primary" && buildingNames.includes(u.buildingNumber),
    ).length
    const primaryPercentage = primaryTotal > 0 ? Math.round((primaryMatched / primaryTotal) * 100) : 0

    const resaleTotal = filteredUnits.filter((u) => u.saleType === "Resale").length
    const resaleMatched = filteredUnits.filter(
      (u) => u.saleType === "Resale" && buildingNames.includes(u.buildingNumber),
    ).length
    const resalePercentage = resaleTotal > 0 ? Math.round((resaleMatched / resaleTotal) * 100) : 0

    const nawyNowTotal = filteredUnits.filter((u) => u.saleType === "Nawy Now").length
    const nawyNowMatched = filteredUnits.filter(
      (u) => u.saleType === "Nawy Now" && buildingNames.includes(u.buildingNumber),
    ).length
    const nawyNowPercentage = nawyNowTotal > 0 ? Math.round((nawyNowMatched / nawyNowTotal) * 100) : 0

    return {
      totalUnits,
      withUnitCode,
      withBuildingNumber,
      matchedUnits,
      primaryTotal,
      primaryMatched,
      primaryPercentage,
      resaleTotal,
      resaleMatched,
      resalePercentage,
      nawyNowTotal,
      nawyNowMatched,
      nawyNowPercentage,
    }
  }, [filteredUnits, buildingNames])

  const getRowHighlight = (unit: Unit) => {
    if (unit.unitCode === "") return "bg-warning/10"
    if (unit.buildingNumber === "") return "bg-warning/10"
    if (unit.buildingNumber !== "" && !buildingNames.includes(unit.buildingNumber)) {
      return "bg-destructive/10"
    }
    return ""
  }

  const handleStartEdit = (unitId: string, field: string, currentValue: string) => {
    setEditingCell({ unitId, field })
    setEditValue(currentValue)
  }

  const handleSaveEdit = () => {
    if (editingCell && onUpdateUnit) {
      onUpdateUnit(editingCell.unitId, { [editingCell.field]: editValue })
    }
    setEditingCell(null)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      setEditingCell(null)
      setEditValue("")
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col">
      <div className="p-4 border-b border-border space-y-4">
        {/* Header with title and actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Units & Filters</h3>
          {headerActions}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Unit Matching Progress by Business Line</h4>

          <div className="flex gap-4">
            {/* Primary Progress Bar */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="font-medium text-foreground">Primary</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics.primaryMatched} / {analytics.primaryTotal} ({analytics.primaryPercentage}%)
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${analytics.primaryPercentage}%` }}
                />
              </div>
            </div>

            {/* Resale Progress Bar */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-400" />
                  <span className="font-medium text-foreground">Resale</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics.resaleMatched} / {analytics.resaleTotal} ({analytics.resalePercentage}%)
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 transition-all duration-300"
                  style={{ width: `${analytics.resalePercentage}%` }}
                />
              </div>
            </div>

            {/* Nawy Now Progress Bar */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-400" />
                  <span className="font-medium text-foreground">Nawy Now</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics.nawyNowMatched} / {analytics.nawyNowTotal} ({analytics.nawyNowPercentage}%)
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 transition-all duration-300"
                  style={{ width: `${analytics.nawyNowPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Units</span>
            </div>
            <p className="text-xl font-bold text-foreground">{analytics.totalUnits}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">Units with Codes</span>
            </div>
            <p className="text-xl font-bold text-foreground">{analytics.withUnitCode}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-chart-3" />
              <span className="text-xs text-muted-foreground">With Building #</span>
            </div>
            <p className="text-xl font-bold text-foreground">{analytics.withBuildingNumber}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Matched Units</span>
            </div>
            <p className="text-xl font-bold text-foreground">{analytics.matchedUnits}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by unit code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-32 bg-transparent">
                {phaseFilter || "Phase"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuItem onClick={() => setPhaseFilter("")}>All Phases</DropdownMenuItem>
              {projectPhases.map((phase) => (
                <DropdownMenuItem key={phase.id} onClick={() => setPhaseFilter(phase.name)}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: phase.color }} />
                    {phase.name}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-32 bg-transparent">
                {saleTypeFilter || "Sale Type"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuItem onClick={() => setSaleTypeFilter("")}>All Sale Types</DropdownMenuItem>
              {saleTypes.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setSaleTypeFilter(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-32 bg-transparent">
                {statusFilter || "Status"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuItem onClick={() => setStatusFilter("")}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Available")}>Available</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Unavailable")}>Unavailable</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-36 bg-transparent">
                {propertyTypeFilter || "Property Type"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuItem onClick={() => setPropertyTypeFilter("")}>All Types</DropdownMenuItem>
              {propertyTypes.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setPropertyTypeFilter(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-36 bg-transparent">
                {buildingFilter || "Building"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => setBuildingFilter("")}>All Buildings</DropdownMenuItem>
              {buildingNames.map((name) => (
                <DropdownMenuItem key={name} onClick={() => setBuildingFilter(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toggle Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch id="without-code" checked={showWithoutUnitCode} onCheckedChange={setShowWithoutUnitCode} />
            <Label htmlFor="without-code" className="text-xs text-muted-foreground cursor-pointer">
              Without Unit Code
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="without-building" checked={showWithoutBuilding} onCheckedChange={setShowWithoutBuilding} />
            <Label htmlFor="without-building" className="text-xs text-muted-foreground cursor-pointer">
              Without Building
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="mismatched" checked={showMismatchedBuilding} onCheckedChange={setShowMismatchedBuilding} />
            <Label htmlFor="mismatched" className="text-xs text-muted-foreground cursor-pointer">
              Mismatched Building
            </Label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Phase</TableHead>
              <TableHead className="text-muted-foreground">Sale Type</TableHead>
              <TableHead className="text-muted-foreground">Unit Code</TableHead>
              <TableHead className="text-muted-foreground">Property Type</TableHead>
              <TableHead className="text-muted-foreground">Bedrooms</TableHead>
              <TableHead className="text-muted-foreground">Gross Area</TableHead>
              <TableHead className="text-muted-foreground">Building Number</TableHead>
              <TableHead className="text-muted-foreground">Matched Building</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.map((unit) => {
              const isUnitCodeEditable = unit.saleType === "Resale" || unit.saleType === "Nawy Now"
              const isEditingBuildingNumber = editingCell?.unitId === unit.id && editingCell?.field === "buildingNumber"
              const isEditingUnitCode = editingCell?.unitId === unit.id && editingCell?.field === "unitCode"

              return (
                <TableRow key={unit.id} className={`border-border ${getRowHighlight(unit)}`}>
                  <TableCell>
                    {unit.phase ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded"
                          style={{
                            backgroundColor: projectPhases.find((p) => p.name === unit.phase)?.color || "#gray",
                          }}
                        />
                        <span className="text-sm">{unit.phase}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                      {unit.saleType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {isEditingUnitCode ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="h-7 w-28 text-sm"
                      />
                    ) : unit.unitCode ? (
                      <span
                        className={isUnitCodeEditable ? "cursor-pointer hover:text-primary" : ""}
                        onClick={() => isUnitCodeEditable && handleStartEdit(unit.id, "unitCode", unit.unitCode)}
                        title={isUnitCodeEditable ? "Click to edit" : ""}
                      >
                        {unit.unitCode}
                      </span>
                    ) : (
                      <span
                        className={`text-muted-foreground italic flex items-center gap-1 ${isUnitCodeEditable ? "cursor-pointer hover:text-primary" : ""}`}
                        onClick={() => isUnitCodeEditable && handleStartEdit(unit.id, "unitCode", "")}
                        title={isUnitCodeEditable ? "Click to add" : ""}
                      >
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        Empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{unit.propertyType}</TableCell>
                  <TableCell>{unit.bedrooms}</TableCell>
                  <TableCell>{unit.grossArea} m²</TableCell>
                  <TableCell>
                    {isEditingBuildingNumber ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="h-7 w-24 text-sm"
                      />
                    ) : unit.buildingNumber ? (
                      <span
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleStartEdit(unit.id, "buildingNumber", unit.buildingNumber)}
                        title="Click to edit"
                      >
                        {unit.buildingNumber}
                      </span>
                    ) : (
                      <span
                        className="text-muted-foreground italic flex items-center gap-1 cursor-pointer hover:text-primary"
                        onClick={() => handleStartEdit(unit.id, "buildingNumber", "")}
                        title="Click to add"
                      >
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        Empty
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {unit.buildingNumber ? (
                      buildingNames.includes(unit.buildingNumber) ? (
                        <span className="text-green-600 font-medium">{unit.buildingNumber}</span>
                      ) : (
                        <span className="text-destructive font-medium">Not Found</span>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={unit.status === "Available" ? "default" : "secondary"}
                      className={
                        unit.status === "Available"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {unit.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {filteredUnits.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No units match the current filters
          </div>
        )}
      </div>
    </div>
  )
}

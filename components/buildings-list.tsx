"use client"

import { useState, useMemo } from "react"
import { Plus, Edit2, Trash2, Search, Filter, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Building } from "@/lib/mock-data"
import { ConfirmDialog } from "./confirm-dialog"
import { BuildingModal } from "./building-modal"
import { BulkRenameModal } from "./bulk-rename-modal"

interface BuildingsListProps {
  buildings: Building[]
  selectedBuildingIds: string[]
  onSelectBuilding: (id: string, multiSelect?: boolean) => void
  onToggleSelection: (id: string) => void
  onUpdateBuilding: (building: Building) => void
  onDeleteBuilding: (id: string) => void
  onAddBuilding: (building: Omit<Building, "id">) => void
  onBulkDelete: (ids: string[]) => void
  onBulkRename: (
    ids: string[],
    pattern: { prefix: string; suffix: string; startNumber: number; padding: number },
  ) => void
  units?: Array<{ buildingNumber: string; phase?: string; saleType?: string }>
}

export function BuildingsList({
  buildings,
  selectedBuildingIds,
  onSelectBuilding,
  onToggleSelection,
  onUpdateBuilding,
  onDeleteBuilding,
  onAddBuilding,
  onBulkDelete,
  onBulkRename,
  units = [],
}: BuildingsListProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false)
  const [buildingToDelete, setBuildingToDelete] = useState<string | null>(null)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false)
  const [selectedBuildingTypes, setSelectedBuildingTypes] = useState<string[]>([])
  const [selectedPhases, setSelectedPhases] = useState<string[]>([])
  const [showNoPhase, setShowNoPhase] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [buildingToEdit, setBuildingToEdit] = useState<Building | null>(null)

  const linkedCount = buildings.filter((b) => b.unitCount > 0).length
  const totalCount = buildings.length

  const availablePhases = useMemo(() => {
    const phases = new Set<string>()
    units.forEach((unit) => {
      if (unit.phase) phases.add(unit.phase)
    })
    return Array.from(phases).sort()
  }, [units])

  const getBuildingPhases = (buildingName: string): string[] => {
    const buildingUnits = units.filter((u) => u.buildingNumber === buildingName)
    const phases = new Set<string>()
    buildingUnits.forEach((unit) => {
      if (unit.phase) phases.add(unit.phase)
    })
    return Array.from(phases)
  }

  const availableBuildingTypes = useMemo(() => {
    const types = new Set<string>()
    buildings.forEach((b) => {
      if (b.buildingType) types.add(b.buildingType)
    })
    return Array.from(types).sort()
  }, [buildings])

  const hasActiveFilters =
    showUnlinkedOnly || selectedBuildingTypes.length > 0 || selectedPhases.length > 0 || showNoPhase

  const filteredBuildings = buildings.filter((building) => {
    const matchesSearch = building.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnlinkedFilter = showUnlinkedOnly ? building.unitCount === 0 : true
    const matchesBuildingType =
      selectedBuildingTypes.length === 0 ||
      (building.buildingType && selectedBuildingTypes.includes(building.buildingType))

    const buildingPhases = getBuildingPhases(building.name)
    let matchesPhaseFilter = true

    if (selectedPhases.length > 0 || showNoPhase) {
      if (showNoPhase && buildingPhases.length === 0) {
        matchesPhaseFilter = true
      } else if (selectedPhases.length > 0) {
        matchesPhaseFilter = buildingPhases.some((phase) => selectedPhases.includes(phase))
      } else {
        matchesPhaseFilter = false
      }
    }

    return matchesSearch && matchesUnlinkedFilter && matchesBuildingType && matchesPhaseFilter
  })

  const toggleBuildingType = (type: string) => {
    setSelectedBuildingTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const togglePhase = (phase: string) => {
    setSelectedPhases((prev) => (prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]))
  }

  const startInlineEdit = (building: Building) => {
    setInlineEditId(building.id)
    setInlineEditValue(building.name)
  }

  const confirmInlineEdit = (building: Building) => {
    if (inlineEditValue.trim() && inlineEditValue.trim() !== building.name) {
      onUpdateBuilding({ ...building, name: inlineEditValue.trim() })
    }
    setInlineEditId(null)
    setInlineEditValue("")
  }

  const cancelInlineEdit = () => {
    setInlineEditId(null)
    setInlineEditValue("")
  }

  const handleDelete = (id: string) => {
    setBuildingToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (buildingToDelete) {
      onDeleteBuilding(buildingToDelete)
      setBuildingToDelete(null)
    }
    setShowDeleteConfirm(false)
  }

  const confirmBulkDelete = () => {
    onBulkDelete(selectedBuildingIds)
    setShowBulkDeleteConfirm(false)
  }

  const handleBulkRename = (pattern: { prefix: string; suffix: string; startNumber: number; padding: number }) => {
    onBulkRename(selectedBuildingIds, pattern)
    setShowBulkRenameModal(false)
  }

  const handleEdit = (building: Building) => {
    setBuildingToEdit(building)
    setShowEditModal(true)
  }

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden min-h-0 w-full max-w-full">
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">Buildings ({totalCount})</h3>
            <span className="text-xs text-muted-foreground">
              {linkedCount}/{totalCount} linked
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-8 w-8 ${hasActiveFilters ? "bg-primary text-primary-foreground border-primary" : ""}`}
                >
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowUnlinkedOnly(!showUnlinkedOnly)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Unlinked Buildings</span>
                    {showUnlinkedOnly && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Phase</span>
                    {(selectedPhases.length > 0 || showNoPhase) && (
                      <span className="ml-auto text-xs text-primary">
                        ({selectedPhases.length + (showNoPhase ? 1 : 0)})
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {availablePhases.map((phase) => (
                      <DropdownMenuItem
                        key={phase}
                        onClick={(e) => {
                          e.preventDefault()
                          togglePhase(phase)
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{phase}</span>
                          {selectedPhases.includes(phase) && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        setShowNoPhase(!showNoPhase)
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>No Phase</span>
                        {showNoPhase && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </DropdownMenuItem>
                    {availablePhases.length === 0 && <DropdownMenuItem disabled>No phases available</DropdownMenuItem>}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Building Type</span>
                    {selectedBuildingTypes.length > 0 && (
                      <span className="ml-auto text-xs text-primary">({selectedBuildingTypes.length})</span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {availableBuildingTypes.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={(e) => {
                          e.preventDefault()
                          toggleBuildingType(type)
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{type}</span>
                          {selectedBuildingTypes.includes(type) && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {availableBuildingTypes.length === 0 && (
                      <DropdownMenuItem disabled>No types available</DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setShowUnlinkedOnly(false)
                        setSelectedBuildingTypes([])
                        setSelectedPhases([])
                        setShowNoPhase(false)
                      }}
                      className="text-destructive"
                    >
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search buildings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {selectedBuildingIds.length > 0 && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent h-8 text-xs"
              onClick={() => setShowBulkRenameModal(true)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Rename ({selectedBuildingIds.length})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete ({selectedBuildingIds.length})
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {filteredBuildings.map((building) => {
          const isSelected = selectedBuildingIds.includes(building.id)
          const buildingPhases = getBuildingPhases(building.name)
          const buildingUnits = units.filter((u) => u.buildingNumber === building.name)

          // Calculate progress by sale type
          const primaryTotal = buildingUnits.filter((u) => u.saleType === "Primary").length
          const resaleTotal = buildingUnits.filter((u) => u.saleType === "Resale").length
          const nawyNowTotal = buildingUnits.filter((u) => u.saleType === "Nawy Now").length
          const total = buildingUnits.length

          const primaryPercentage = total > 0 ? (primaryTotal / total) * 100 : 0
          const resalePercentage = total > 0 ? (resaleTotal / total) * 100 : 0
          const nawyNowPercentage = total > 0 ? (nawyNowTotal / total) * 100 : 0

          return (
            <div
              key={building.id}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected ? "bg-primary/10 border-primary" : "bg-secondary/50 border-border hover:border-primary/50"
              }`}
              onClick={() => onSelectBuilding(building.id)}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(building.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {inlineEditId === building.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmInlineEdit(building)
                          if (e.key === "Escape") cancelInlineEdit()
                        }}
                        className="h-6 text-sm px-1.5"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => confirmInlineEdit(building)}
                      >
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-sm text-foreground truncate">{building.name}</p>
                  )}
                  {building.buildingType && (
                    <p className="text-[10px] text-muted-foreground">{building.buildingType}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {buildingPhases.length > 0 ? buildingPhases.join(", ") : "No Phase"}
                  </p>
                  <p
                    className={`text-[10px] font-medium mt-0.5 ${total === 0 ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {total} Units
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      startInlineEdit(building)
                    }}
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(building.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
        {filteredBuildings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchQuery || hasActiveFilters ? "No buildings match your filters" : "No buildings yet"}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Building"
        description="Deleting this building will remove its marker from the masterplan. Continue?"
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Selected Buildings"
        description={`Are you sure you want to delete ${selectedBuildingIds.length} buildings? This will remove all their markers from the masterplan.`}
        onConfirm={confirmBulkDelete}
      />

      <BuildingModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSave={(name, unitCount) => {
          onAddBuilding({
            name,
            x: 50,
            y: 50,
            unitCount: unitCount || 0,
          })
          setShowAddModal(false)
        }}
      />

      <BulkRenameModal
        open={showBulkRenameModal}
        onOpenChange={setShowBulkRenameModal}
        count={selectedBuildingIds.length}
        selectedNames={buildings.filter((b) => selectedBuildingIds.includes(b.id)).map((b) => b.name)}
        onRename={handleBulkRename}
      />
    </div>
  )
}

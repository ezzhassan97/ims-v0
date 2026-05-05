"use client"

import { cn } from "@/lib/utils"
import type { Building } from "@/lib/mock-data"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  MousePointer2,
  Paintbrush,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Check,
  Upload,
  Maximize2,
  X,
  Layers3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { ConfirmDialog } from "./confirm-dialog"
import { BuildingModal } from "./building-modal"
import { BulkRenameModal } from "./bulk-rename-modal"
import { MasterplanUploadModal } from "./masterplan-upload-modal"
import { BulkUploadBuildingsModal } from "./bulk-upload-buildings-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"

interface MasterplanMapProps {
  buildings: Building[]
  selectedBuildingIds: string[]
  onSelectBuilding: (id: string, multiSelect?: boolean) => void
  onUpdateBuilding: (building: Building) => void
  onDeleteBuilding: (id: string) => void
  onAddBuilding: (building: Omit<Building, "id">) => void
  onBulkDelete: (ids: string[]) => void
  onBulkRename: (ids: string[], pattern: { prefix: string; suffix: string; startNumber: number; padding: number }) => void
  onBulkSelect: (ids: string[]) => void
  onAiExtract: () => void
  onBulkAccept: (ids: string[]) => void
  isAiExtracting: boolean
  aiProgress: number
  hasMasterplan: boolean
  onDeleteMasterplan: () => void
}

interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface LassoPath {
  points: { x: number; y: number }[]
}

interface DimStroke {
  points: { x: number; y: number }[]
}

interface PhasePolygon {
  id: string
  phaseId: string
  points: { x: number; y: number }[]
}

const projectPhases = [
  { id: "phase1", name: "Phase 1", color: "#FF5733" },
  { id: "phase2", name: "Phase 2", color: "#33FF57" },
  { id: "phase3", name: "Phase 3", color: "#3357FF" },
]

export function MasterplanMap({
  buildings,
  selectedBuildingIds,
  onSelectBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  onAddBuilding,
  onBulkDelete,
  onBulkRename,
  onBulkSelect,
  onAiExtract,
  onBulkAccept,
  isAiExtracting,
  aiProgress,
  hasMasterplan,
  onDeleteMasterplan,
}: MasterplanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showMasterplanDeleteConfirm, setShowMasterplanDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false)
  const [buildingToDelete, setBuildingToDelete] = useState<string | null>(null)
  const [addPosition, setAddPosition] = useState({ x: 50, y: 50 })
  const [isAddingDots, setIsAddingDots] = useState(false)
  const [dotCounter, setDotCounter] = useState(1)

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [selectionMode, setSelectionMode] = useState<"rectangle" | "lasso">("rectangle")
  const [lassoPath, setLassoPath] = useState<LassoPath | null>(null)

  const [isDimMode, setIsDimMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [dimStrokes, setDimStrokes] = useState<DimStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<DimStroke | null>(null)

  const [zoom, setZoom] = useState(1)

  const [showMasterplanUploadModal, setShowMasterplanUploadModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPhasingMode, setIsPhasingMode] = useState(false)
  const [phasePolygons, setPhasePolygons] = useState<PhasePolygon[]>([])
  const [currentPhasePolygon, setCurrentPhasePolygon] = useState<{ points: { x: number; y: number }[] } | null>(null)
  const [isDrawingPhase, setIsDrawingPhase] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("")
  const [editingPhasePolygonId, setEditingPhasePolygonId] = useState<string | null>(null)
  const [editPopoverOpen, setEditPopoverOpen] = useState(false)
  const [editPopoverPosition, setEditPopoverPosition] = useState({ x: 0, y: 0 })
  const [showPhasePolygons, setShowPhasePolygons] = useState(true)
  const [showBuildingNames, setShowBuildingNames] = useState(true)
  const selectedBuilding = buildings.find((b) => selectedBuildingIds.length === 1 && selectedBuildingIds[0] === b.id)

  const selectedAiSuggested = buildings.filter((b) => selectedBuildingIds.includes(b.id) && b.isAiSuggested)

  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y
      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  }

  const drawDimOverlay = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
    ctx.lineWidth = 30
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const allStrokes = [...dimStrokes, ...(currentStroke ? [currentStroke] : [])]

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo((stroke.points[0].x / 100) * canvas.width, (stroke.points[0].y / 100) * canvas.height)
      stroke.points.forEach((point, i) => {
        if (i > 0) {
          ctx.lineTo((point.x / 100) * canvas.width, (point.y / 100) * canvas.height)
        }
      })
      ctx.stroke()
    })
  }, [dimStrokes, currentStroke])

  useEffect(() => {
    drawDimOverlay()
  }, [drawDimOverlay])

  useEffect(() => {
    const handleResize = () => drawDimOverlay()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [drawDimOverlay])

  const handleMouseDown = (e: React.MouseEvent, buildingId: string) => {
    if (isDimMode) return
    e.preventDefault()
    e.stopPropagation()
    const building = buildings.find((b) => b.id === buildingId)
    if (!building || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (((e.clientX - rect.left) / rect.width) * 100) / zoom
    const y = (((e.clientY - rect.top) / rect.height) * 100) / zoom

    setDragOffset({ x: x - building.x, y: y - building.y })
    setDragging(buildingId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (((e.clientX - rect.left) / rect.width) * 100) / zoom
    const y = (((e.clientY - rect.top) / rect.height) * 100) / zoom

    if (isDimMode && isDrawing && currentStroke) {
      setCurrentStroke({
        points: [...currentStroke.points, { x, y }],
      })
      return
    }

    if (isSelecting && selectionMode === "lasso" && lassoPath) {
      setLassoPath({
        points: [...lassoPath.points, { x, y }],
      })
      return
    }

    if (isSelecting && selectionBox) {
      setSelectionBox({ ...selectionBox, endX: x, endY: y })
      return
    }

    if (!dragging) return

    let newX = x - dragOffset.x
    let newY = y - dragOffset.y

    newX = Math.max(2, Math.min(98, newX))
    newY = Math.max(2, Math.min(98, newY))

    const building = buildings.find((b) => b.id === dragging)
    if (building) {
      onUpdateBuilding({ ...building, x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    if (isDimMode && isDrawing && currentStroke && currentStroke.points.length > 1) {
      setDimStrokes([...dimStrokes, currentStroke])
      setCurrentStroke(null)
      setIsDrawing(false)
      return
    }

    if (isSelecting && selectionMode === "lasso" && lassoPath && lassoPath.points.length > 2) {
      const selectedIds = buildings
        .filter((b) => isPointInPolygon({ x: b.x, y: b.y }, lassoPath.points))
        .map((b) => b.id)

      if (selectedIds.length > 0) {
        onBulkSelect(selectedIds)
      }

      setLassoPath(null)
      setIsSelecting(false)
      return
    }

    if (isSelecting && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX)
      const maxX = Math.max(selectionBox.startX, selectionBox.endX)
      const minY = Math.min(selectionBox.startY, selectionBox.endY)
      const maxY = Math.max(selectionBox.startY, selectionBox.endY)

      const selectedIds = buildings
        .filter((b) => b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)
        .map((b) => b.id)

      if (selectedIds.length > 0) {
        onBulkSelect(selectedIds)
      }

      setSelectionBox(null)
      setIsSelecting(false)
      return
    }

    setDragging(null)
  }

  const handlePhasePolygonClick = (e: React.MouseEvent, polygonId: string) => {
    if (!isPhasingMode || isDrawingPhase) return
    e.stopPropagation()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setEditingPhasePolygonId(polygonId)
    setEditPopoverOpen(true)
    setEditPopoverPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleUpdatePhasePolygon = (polygonId: string, newPhaseId: string) => {
    setPhasePolygons(phasePolygons.map((p) => (p.id === polygonId ? { ...p, phaseId: newPhaseId } : p)))
    setEditPopoverOpen(false)
    setEditingPhasePolygonId(null)
  }

  const handleDeletePhasePolygon = (id: string) => {
    setPhasePolygons(phasePolygons.filter((p) => p.id !== id))
    setEditPopoverOpen(false)
    setEditingPhasePolygonId(null)
  }

  const getPolygonCenter = (points: { x: number; y: number }[]) => {
    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    return { x: sumX / points.length, y: sumY / points.length }
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (((e.clientX - rect.left) / rect.width) * 100) / zoom
    const y = (((e.clientY - rect.top) / rect.height) * 100) / zoom

    if (isPhasingMode) {
      const clickedPolygon = phasePolygons.find((poly) => isPointInPolygon({ x, y }, poly.points))

      if (clickedPolygon && !isDrawingPhase) {
        handlePhasePolygonClick(e, clickedPolygon.id)
        return
      }

      if (!isDrawingPhase) {
        setIsDrawingPhase(true)
        setCurrentPhasePolygon({ points: [{ x, y }] })
      } else if (currentPhasePolygon) {
        setCurrentPhasePolygon({
          points: [...currentPhasePolygon.points, { x, y }],
        })
      }
      return
    }

    if (isDimMode) {
      setIsDrawing(true)
      setCurrentStroke({ points: [{ x, y }] })
      return
    }

    if (isAddingDots) {
      onAddBuilding({
        name: dotCounter.toString(),
        x,
        y,
        unitCount: 0,
        totalUnits: 0,
        soldUnits: 0,
      })
      setDotCounter((prev) => prev + 1)
      return
    }

    const target = e.target as HTMLElement
    if (target === containerRef.current || target === canvasRef.current || target.closest("[data-map-container]")) {
      setIsSelecting(true)
      if (selectionMode === "lasso") {
        setLassoPath({ points: [{ x, y }] })
      } else {
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
      }
    }
  }

  const handleDotClick = (e: React.MouseEvent, buildingId: string) => {
    if (isDimMode) return
    e.stopPropagation()
    const multiSelect = e.shiftKey
    onSelectBuilding(buildingId, multiSelect)
  }

  const handleDeleteDot = (e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation()
    setBuildingToDelete(buildingId)
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

  const confirmMasterplanDelete = () => {
    onDeleteMasterplan()
    setShowMasterplanDeleteConfirm(false)
  }

  const handleBulkRename = (pattern: { prefix: string; suffix: string; startNumber: number; padding: number }) => {
    onBulkRename(selectedBuildingIds, pattern)
    setShowBulkRenameModal(false)
  }

  const handleUndoDim = () => {
    setDimStrokes((prev) => prev.slice(0, -1))
  }

  const handleClearDim = () => {
    setDimStrokes([])
  }

  const handleCompletePhasePolygon = () => {
    if (currentPhasePolygon && currentPhasePolygon.points.length >= 3) {
      const newPolygon: PhasePolygon = {
        id: `phase-poly-${Date.now()}`,
        phaseId: selectedPhaseId || "", // Empty phase ID allowed
        points: currentPhasePolygon.points,
      }
      setPhasePolygons([...phasePolygons, newPolygon])
      setCurrentPhasePolygon(null)
      setIsDrawingPhase(false)
    }
  }

  const getDotColor = (building: Building) => {
    if (building.isAiSuggested) {
      return "bg-yellow-500" // AI suggested - yellow
    }
    if (!building.totalUnits || building.totalUnits === 0) {
      return "bg-gray-400" // No units linked - grey
    }
    if (building.totalUnits > 0 && building.soldUnits === building.totalUnits) {
      return "bg-red-500" // All sold - red
    }
    return "bg-green-500" // Normal with available units - green
  }

  const getSelectionBoxStyle = () => {
    if (!selectionBox) return {}
    const left = Math.min(selectionBox.startX, selectionBox.endX)
    const top = Math.min(selectionBox.startY, selectionBox.endY)
    const width = Math.abs(selectionBox.endX - selectionBox.startX)
    const height = Math.abs(selectionBox.endY - selectionBox.startY)
    return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }
  }

  const getLassoPathD = () => {
    if (!lassoPath || lassoPath.points.length < 2) return ""
    const firstPoint = lassoPath.points[0]
    let d = `M ${firstPoint.x} ${firstPoint.y}`
    lassoPath.points.slice(1).forEach((point) => {
      d += ` L ${point.x} ${point.y}`
    })
    return d
  }

  const getPhasePolygonPathD = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return ""
    const firstPoint = points[0]
    let d = `M ${firstPoint.x} ${firstPoint.y}`
    points.slice(1).forEach((point) => {
      d += ` L ${point.x} ${point.y}`
    })
    d += " Z"
    return d
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragging(null)
      if (isSelecting) {
        setIsSelecting(false)
        setSelectionBox(null)
        setLassoPath(null)
      }
      if (isDrawing) {
        if (currentStroke && currentStroke.points.length > 1) {
          setDimStrokes((prev) => [...prev, currentStroke])
        }
        setCurrentStroke(null)
        setIsDrawing(false)
      }
      if (isDrawingPhase) {
        handleCompletePhasePolygon()
      }
    }
    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [isSelecting, isDrawing, currentStroke, isDrawingPhase])

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-card p-6"
    : "bg-card border border-border rounded-lg p-4"

  const mapClasses = isFullscreen
    ? "relative w-full h-[calc(100vh-200px)] bg-secondary/50 select-none transition-transform origin-top-left"
    : "relative w-full aspect-[16/9] max-h-[600px] bg-secondary/50 select-none transition-transform origin-top-left"

  if (!hasMasterplan) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg mb-4">No masterplan uploaded</p>
          <Button variant="outline" onClick={() => setShowMasterplanUploadModal(true)}>
            Upload Masterplan
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Masterplan</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Dots, Bulk Upload Buildings, AI Extract group */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-border">
            <Button
              variant={isAddingDots ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!isAddingDots) {
                  setDotCounter(buildings.length + 1)
                }
                setIsAddingDots(!isAddingDots)
                setIsDimMode(false)
                setIsPhasingMode(false)
              }}
            >
              {isAddingDots ? (
                <>
                  <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
                  Done Adding
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Dots
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkUploadModal(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Bulk Upload Buildings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAiExtract}
              disabled={isAiExtracting}
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 bg-transparent"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI Extract
            </Button>
          </div>

          {/* Phasing, Select, Fullscreen group */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={isPhasingMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsPhasingMode(!isPhasingMode)
                setIsAddingDots(false)
                setIsDimMode(false)
                if (isPhasingMode) {
                  setCurrentPhasePolygon(null)
                  setIsDrawingPhase(false)
                }
              }}
            >
              <Layers3 className="h-3.5 w-3.5 mr-1.5" />
              Phasing
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MousePointer2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectionMode("rectangle")}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-4 border border-current rounded-sm" />
                    <span>Rectangle Selection</span>
                    {selectionMode === "rectangle" && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectionMode("lasso")}>
                  <div className="flex items-center gap-2">
                    <Paintbrush className="h-3.5 w-3.5" />
                    <span>Lasso Selection (Freeform)</span>
                    {selectionMode === "lasso" && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {selectedAiSuggested.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAccept(selectedAiSuggested.map((b) => b.id))}
                className="border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Accept ({selectedAiSuggested.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {isAiExtracting && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Extracting buildings with AI...</span>
            <span className="font-medium">{aiProgress}%</span>
          </div>
          <Progress value={aiProgress} className="h-2" />
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative overflow-hidden rounded-lg border border-border">
          <div
            ref={containerRef}
            data-map-container
            className={`${mapClasses} ${
              isAddingDots
                ? "cursor-crosshair"
                : isDimMode
                  ? "cursor-crosshair"
                  : isPhasingMode
                    ? "cursor-crosshair"
                    : selectionMode === "lasso" && isSelecting
                      ? "cursor-crosshair"
                      : ""
            }`}
            onMouseDown={handleContainerMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              backgroundImage: `url('/aerial-view-masterplan-residential-development-blu.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            />

            {isSelecting && selectionMode === "lasso" && lassoPath && lassoPath.points.length > 1 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 15 }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d={getLassoPathD()}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="0.3"
                  strokeDasharray="1 1"
                />
              </svg>
            )}

            {isSelecting && selectionMode === "rectangle" && selectionBox && (
              <div
                className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                style={{ ...getSelectionBoxStyle(), zIndex: 15 }}
              />
            )}

            {/* Floating toggles for phase polygons and building names visibility */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                onClick={() => setShowPhasePolygons(!showPhasePolygons)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-md border transition-colors",
                  showPhasePolygons
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-secondary"
                )}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Phases
              </button>
              <button
                onClick={() => setShowBuildingNames(!showBuildingNames)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-md border transition-colors",
                  showBuildingNames
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-secondary"
                )}
              >
                Names
              </button>
            </div>

            {phasePolygons.length > 0 && showPhasePolygons && (
              <>
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 8 }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {phasePolygons.map((poly) => {
                    const phase = projectPhases.find((p) => p.id === poly.phaseId)
                    const color = phase?.color || "#6b7280"
                    return (
                      <path
                        key={poly.id}
                        d={getPhasePolygonPathD(poly.points)}
                        fill={`${color}15`}
                        stroke={color}
                        strokeWidth="0.6"
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={(e) => handlePhasePolygonClick(e, poly.id)}
                        style={{ pointerEvents: "all" }}
                      />
                    )
                  })}
                </svg>

                {phasePolygons.map((poly) => {
                  const phase = projectPhases.find((p) => p.id === poly.phaseId)
                  const center = getPolygonCenter(poly.points)
                  const color = phase?.color || "#6b7280"
                  return (
                    <div
                      key={`label-${poly.id}`}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${center.x}%`,
                        top: `${center.y}%`,
                        zIndex: 10,
                      }}
                    >
                      <div
                        className="px-3 py-1.5 rounded-md font-semibold text-xs shadow-lg border-2"
                        style={{
                          backgroundColor: color,
                          borderColor: color,
                          color: "white",
                        }}
                      >
                        {phase?.name || "Unassigned"}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {currentPhasePolygon && currentPhasePolygon.points.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 9 }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d={getPhasePolygonPathD(currentPhasePolygon.points)}
                  fill="rgba(99, 102, 241, 0.15)"
                  stroke="#6366f1"
                  strokeWidth="0.7"
                  strokeDasharray="3 2"
                />
                {currentPhasePolygon.points.map((point, idx) => (
                  <circle key={idx} cx={point.x} cy={point.y} r="0.6" fill="#6366f1" stroke="white" strokeWidth="0.2" />
                ))}
              </svg>
            )}

            {!isPhasingMode && (
              <TooltipProvider>
                {buildings.map((building) => {
                  const isSelected = selectedBuildingIds.includes(building.id)
                  const dotColor = getDotColor(building)
                  return (
                    <div key={building.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute transform -translate-x-1/2 transition-all ${
                              dragging === building.id ? "z-20" : "z-10"
                            } ${isDimMode ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
                            style={{ left: `${building.x}%`, top: `${building.y}%` }}
                            onMouseDown={(e) => handleMouseDown(e, building.id)}
                            onClick={(e) => handleDotClick(e, building.id)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              handleDeleteDot(e, building.id)
                            }}
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`relative rounded-full transition-all ${dotColor} ${
                                  isSelected
                                    ? "w-4 h-4 ring-[3px] ring-white shadow-lg"
                                    : "w-3 h-3 hover:w-3.5 hover:h-3.5"
                                }`}
                              />
                              {showBuildingNames && (
                                <span
                                  className={`mt-0.5 text-[8px] font-medium text-white px-1 rounded bg-black/60 whitespace-nowrap max-w-[60px] truncate ${
                                    isSelected ? "bg-black/80" : ""
                                  }`}
                                >
                                  {building.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover text-popover-foreground">
                          <p className="font-medium">{building.name}</p>
                          <p className="text-xs text-muted-foreground">{building.unitCount} units</p>
                          {building.isAiSuggested && (
                            <p className="text-xs text-yellow-600">AI Suggested - Click to accept</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )
                })}
              </TooltipProvider>
            )}

          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
            {selectedBuildingIds.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowBulkRenameModal(true)}
                  className="bg-white/90 hover:bg-white shadow-md"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Rename ({selectedBuildingIds.length})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="shadow-md"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete ({selectedBuildingIds.length})
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}

            <div className="flex flex-col gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                onClick={() => setZoom((prev) => Math.min(prev + 0.25, 2))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] bg-white/90 px-2 py-1 rounded shadow-md z-20">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>AI Suggested</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>No Units</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>All Sold</span>
            </div>
          </div>
        </div>

        {/* Phases Column - appears when phasing mode is active */}
        {isPhasingMode && (
          <div className="w-56 flex-shrink-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border bg-secondary/30">
              <h4 className="text-sm font-medium">Phases</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Select a phase, then click on map to draw
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {projectPhases.map((phase) => (
                <div
                  key={phase.id}
                  onClick={() => setSelectedPhaseId(phase.id)}
                  className={`p-2 rounded-md cursor-pointer transition-all border ${
                    selectedPhaseId === phase.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="text-sm font-medium">{phase.name}</span>
                    {selectedPhaseId === phase.id && (
                      <Check className="h-3.5 w-3.5 ml-auto text-primary" />
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground pl-6">
                    {phasePolygons.filter((p) => p.phaseId === phase.id).length} polygon(s)
                  </div>
                </div>
              ))}
            </div>
            {isDrawingPhase && (
              <div className="p-2 border-t border-border bg-secondary/20 space-y-1.5">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={handleCompletePhasePolygon}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Complete Polygon
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setCurrentPhasePolygon(null)
                    setIsDrawingPhase(false)
                  }}
                >
                  Cancel Drawing
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          Click to select a dot. Shift+click to multi-select. Click and drag on empty area to box-select multiple dots.
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            variant={isDimMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsDimMode(!isDimMode)
              setIsAddingDots(false)
              setIsPhasingMode(false)
            }}
          >
            <Paintbrush className="h-3.5 w-3.5 mr-1.5" />
            Dim
          </Button>

          {isDimMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleUndoDim} disabled={dimStrokes.length === 0}>
                Undo
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearDim} disabled={dimStrokes.length === 0}>
                Clear All
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowMasterplanUploadModal(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMasterplanDeleteConfirm(true)}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Building Marker"
        description="Are you sure you want to delete this building marker?"
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Selected Buildings"
        description={`Are you sure you want to delete ${selectedBuildingIds.length} building markers?`}
        onConfirm={confirmBulkDelete}
      />

      <ConfirmDialog
        open={showMasterplanDeleteConfirm}
        onOpenChange={setShowMasterplanDeleteConfirm}
        title="Delete Masterplan"
        description="Are you sure you want to delete this masterplan? This will remove all building markers."
        onConfirm={confirmMasterplanDelete}
      />

      <BuildingModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        building={selectedBuilding}
        onSave={(name) => {
          if (selectedBuilding) {
            onUpdateBuilding({ ...selectedBuilding, name })
          }
          setShowEditModal(false)
        }}
      />

      <BuildingModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSave={(name, unitCount) => {
          onAddBuilding({
            name,
            x: addPosition.x,
            y: addPosition.y,
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

      <MasterplanUploadModal
        open={showMasterplanUploadModal}
        onOpenChange={setShowMasterplanUploadModal}
        onSelect={(masterplan) => {
          console.log("Selected masterplan:", masterplan)
        }}
      />

      <BulkUploadBuildingsModal
        open={showBulkUploadModal}
        onOpenChange={setShowBulkUploadModal}
        existingBuildings={buildings.map(b => ({ id: b.id, name: b.name, x: b.x, y: b.y }))}
        onUploadComplete={(newBuildings) => {
          newBuildings.forEach((b) => {
            onAddBuilding({
              name: b.name,
              x: b.x,
              y: b.y,
              unitCount: 0,
              totalUnits: 0,
              soldUnits: 0,
            })
          })
        }}
      />

      {editPopoverOpen && editingPhasePolygonId && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-border p-4 z-[100]"
          style={{
            left: editPopoverPosition.x,
            top: editPopoverPosition.y,
            minWidth: "280px",
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-sm">Edit Phase Polygon</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditPopoverOpen(false)
                  setEditingPhasePolygonId(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Assign to Phase:</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                    {projectPhases.find(
                      (p) => p.id === phasePolygons.find((poly) => poly.id === editingPhasePolygonId)?.phaseId,
                    )?.name || "Select Phase"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {projectPhases.map((phase) => (
                    <DropdownMenuItem
                      key={phase.id}
                      onClick={() => handleUpdatePhasePolygon(editingPhasePolygonId, phase.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: phase.color }} />
                        {phase.name}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="pt-2 border-t flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDeletePhasePolygon(editingPhasePolygonId)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
                onClick={() => {
                  setEditPopoverOpen(false)
                  setEditingPhasePolygonId(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

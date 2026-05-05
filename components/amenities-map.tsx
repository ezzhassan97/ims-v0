"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Trash2, Paintbrush, Eraser, Undo2, MousePointer2, Layers3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { type Amenity, projectPhases } from "@/lib/mock-data"
import { ConfirmDialog } from "./confirm-dialog"
import { AmenityIcon } from "./amenity-icon"

interface AmenitiesMapProps {
  amenities: Amenity[]
  selectedAmenityIds: string[]
  onSelectAmenity: (id: string, multiSelect?: boolean) => void
  onUpdateAmenity: (amenity: Amenity) => void
  onDeleteFromMap: (id: string) => void
  onBulkDeleteFromMap: (ids: string[]) => void
  onBulkSelect: (ids: string[]) => void
  onAddPin: (amenityId: string, x: number, y: number) => void
  isAddingPin: boolean
  addingPinForAmenityId: string | null
  onCancelAddPin: () => void
  hasMasterplan: boolean
  showAmenitiesColumn?: boolean
  onToggleAmenitiesColumn?: () => void
}

interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface DimStroke {
  points: { x: number; y: number }[]
}

export function AmenitiesMap({
  amenities,
  selectedAmenityIds,
  onSelectAmenity,
  onUpdateAmenity,
  onDeleteFromMap,
  onBulkDeleteFromMap,
  onBulkSelect,
  onAddPin,
  isAddingPin,
  addingPinForAmenityId,
  onCancelAddPin,
  hasMasterplan,
  showAmenitiesColumn = true,
  onToggleAmenitiesColumn,
}: AmenitiesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [amenityToDelete, setAmenityToDelete] = useState<string | null>(null)

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)

  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null)
  const [showPhasePolygons, setShowPhasePolygons] = useState(false)
  const [showAmenityNames, setShowAmenityNames] = useState(true)

  // Mock phase polygons matching the masterplan-map
  const [phasePolygons] = useState([
    { id: "poly-1", phaseId: "phase-1", points: [{ x: 5, y: 10 }, { x: 35, y: 10 }, { x: 35, y: 50 }, { x: 5, y: 50 }] },
    { id: "poly-2", phaseId: "phase-2", points: [{ x: 35, y: 10 }, { x: 65, y: 10 }, { x: 65, y: 50 }, { x: 35, y: 50 }] },
    { id: "poly-3", phaseId: "phase-3", points: [{ x: 65, y: 10 }, { x: 95, y: 10 }, { x: 95, y: 50 }, { x: 65, y: 50 }] },
    { id: "poly-4", phaseId: "phase-4", points: [{ x: 5, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 90 }, { x: 5, y: 90 }] },
    { id: "poly-5", phaseId: "phase-5", points: [{ x: 50, y: 50 }, { x: 95, y: 50 }, { x: 95, y: 90 }, { x: 50, y: 90 }] },
  ])

  const [isDimMode, setIsDimMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [dimStrokes, setDimStrokes] = useState<DimStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<DimStroke | null>(null)

  const allPins = amenities.flatMap((amenity) =>
    amenity.pins.map((pin) => ({
      ...pin,
      amenityId: amenity.id,
      amenityNameEn: amenity.nameEn,
      amenityNameAr: amenity.nameAr,
      amenityIcon: amenity.icon,
    })),
  )

  const selectedPins = allPins.filter((pin) => selectedAmenityIds.includes(pin.amenityId))
  const addingAmenity = amenities.find((a) => a.id === addingPinForAmenityId)

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

  const handleMouseDown = (e: React.MouseEvent, pinId: string, amenityId: string) => {
    if (isDimMode || isAddingPin) return
    e.preventDefault()
    e.stopPropagation()

    const pin = allPins.find((p) => p.id === pinId)
    if (!pin || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setDragOffset({ x: x - pin.x, y: y - pin.y })
    setDragging(pinId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDimMode && isDrawing && currentStroke) {
      setCurrentStroke({
        points: [...currentStroke.points, { x: e.clientX, y: e.clientY }],
      })
      return
    }

    if (isSelecting && selectionBox) {
      setSelectionBox({ ...selectionBox, endX: e.clientX, endY: e.clientY })
      return
    }

    if (!dragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    let newX = x - dragOffset.x
    let newY = y - dragOffset.y

    newX = Math.max(2, Math.min(98, newX))
    newY = Math.max(2, Math.min(98, newY))

    const pin = allPins.find((p) => p.id === dragging)
    if (pin) {
      const amenity = amenities.find((a) => a.id === pin.amenityId)
      if (amenity) {
        const updatedPins = amenity.pins.map((p) => (p.id === dragging ? { ...p, x: newX, y: newY } : p))
        onUpdateAmenity({ ...amenity, pins: updatedPins })
      }
    }
  }

  const handleMouseUp = () => {
    if (isDimMode && isDrawing && currentStroke && currentStroke.points.length > 1) {
      setDimStrokes([...dimStrokes, currentStroke])
      setCurrentStroke(null)
      setIsDrawing(false)
      return
    }

    if (isSelecting && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX)
      const maxX = Math.max(selectionBox.startX, selectionBox.endX)
      const minY = Math.min(selectionBox.startY, selectionBox.endY)
      const maxY = Math.max(selectionBox.startY, selectionBox.endY)

      const selectedIds = allPins
        .filter((p) => p.x! >= minX && p.x! <= maxX && p.y! >= minY && p.y! <= maxY)
        .map((p) => p.amenityId)

      if (selectedIds.length > 0) {
        onBulkSelect(selectedIds)
      }

      setSelectionBox(null)
      setIsSelecting(false)
      return
    }

    setDragging(null)
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (isDimMode) {
      setIsDrawing(true)
      setCurrentStroke({ points: [{ x, y }] })
      return
    }

    if (isAddingPin && addingPinForAmenityId) {
      onAddPin(addingPinForAmenityId, x, y)
      return
    }

    const target = e.target as HTMLElement
    if (target === containerRef.current || target === canvasRef.current) {
      setIsSelecting(true)
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
    }
  }

  const handlePinClick = (e: React.MouseEvent, amenityId: string) => {
    if (isDimMode || isAddingPin) return
    e.stopPropagation()
    const multiSelect = e.shiftKey
    onSelectAmenity(amenityId, multiSelect)
  }

  const handleDeletePin = (e: React.MouseEvent, pinId: string, amenityId: string) => {
    e.stopPropagation()
    const amenity = amenities.find((a) => a.id === amenityId)
    if (amenity) {
      const updatedPins = amenity.pins.filter((p) => p.id !== pinId)
      onUpdateAmenity({ ...amenity, pins: updatedPins })
    }
  }

  const confirmDelete = () => {
    if (amenityToDelete) {
      onDeleteFromMap(amenityToDelete)
      setAmenityToDelete(null)
    }
    setShowDeleteConfirm(false)
  }

  const confirmBulkDelete = () => {
    onBulkDeleteFromMap(selectedAmenityIds)
    setShowBulkDeleteConfirm(false)
  }

  const handleUndoDim = () => {
    setDimStrokes((prev) => prev.slice(0, -1))
  }

  const handleClearDim = () => {
    setDimStrokes([])
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragging(null)
      if (isSelecting) {
        setIsSelecting(false)
        setSelectionBox(null)
      }
      if (isDrawing) {
        if (currentStroke && currentStroke.points.length > 1) {
          setDimStrokes((prev) => [...prev, currentStroke])
        }
        setCurrentStroke(null)
        setIsDrawing(false)
      }
    }
    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [isSelecting, isDrawing, currentStroke])

  if (!hasMasterplan) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-lg mb-4">No masterplan uploaded</p>
          <Button variant="outline">Upload Masterplan</Button>
        </div>
      </div>
    )
  }

  const getSelectionBoxStyle = () => {
    if (!selectionBox) return {}
    const left = Math.min(selectionBox.startX, selectionBox.endX)
    const top = Math.min(selectionBox.startY, selectionBox.endY)
    const width = Math.abs(selectionBox.endX - selectionBox.startX)
    const height = Math.abs(selectionBox.endY - selectionBox.startY)
    return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Amenities Masterplan</h3>
        <div className="flex items-center gap-2">
          {selectedPins.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove from Map ({selectedPins.length})
            </Button>
          )}

          {isAddingPin && (
            <Button variant="default" size="sm" onClick={onCancelAddPin}>
              <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
              Click on Map to Place "{addingAmenity?.nameEn}"
            </Button>
          )}

          <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
            <Button variant={isDimMode ? "default" : "outline"} size="sm" onClick={() => setIsDimMode(!isDimMode)}>
              <Paintbrush className="h-3.5 w-3.5 mr-1.5" />
              Dim
            </Button>
            {dimStrokes.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleUndoDim}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearDim}>
                  <Eraser className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          <Button
            variant={showAmenitiesColumn ? "default" : "outline"}
            size="sm"
            onClick={onToggleAmenitiesColumn}
            className="border-l border-border ml-1"
          >
            Amenities
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 min-h-[300px] bg-secondary/50 rounded-lg border border-border overflow-hidden select-none ${
          isAddingPin ? "cursor-crosshair" : isDimMode ? "cursor-crosshair" : ""
        }`}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage: `url('/aerial-view-masterplan-residential-development-blu.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} />

        {/* Toggle controls on the masterplan */}
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
            onClick={() => setShowAmenityNames(!showAmenityNames)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-md border transition-colors",
              showAmenityNames
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-secondary"
            )}
          >
            Names
          </button>
        </div>

        {/* Phase Polygons SVG overlay */}
        {showPhasePolygons && phasePolygons.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 4 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {phasePolygons.map((poly) => {
              const phase = projectPhases.find((p) => p.id === poly.phaseId)
              const color = phase?.color || "#6b7280"
              const pointsStr = poly.points.map((p) => `${p.x},${p.y}`).join(" ")
              return (
                <polygon
                  key={poly.id}
                  points={pointsStr}
                  fill={`${color}20`}
                  stroke={color}
                  strokeWidth="0.4"
                />
              )
            })}
          </svg>
        )}

        {isSelecting && selectionBox && (
          <div
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
            style={{ ...getSelectionBoxStyle(), zIndex: 15 }}
          />
        )}

        {allPins.map((pin) => {
          const isSelected = selectedAmenityIds.includes(pin.amenityId)
          const isHovered = hoveredPinId === pin.id
          const hasDetails = pin.descriptionEn || pin.descriptionAr || pin.coverImage
          return (
            <div
              key={pin.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                dragging === pin.id ? "z-20" : isHovered ? "z-30" : "z-10"
              } ${isDimMode || isAddingPin ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onMouseDown={(e) => handleMouseDown(e, pin.id, pin.amenityId)}
              onClick={(e) => handlePinClick(e, pin.amenityId)}
              onMouseEnter={() => !dragging && setHoveredPinId(pin.id)}
              onMouseLeave={() => setHoveredPinId(null)}
              onContextMenu={(e) => {
                e.preventDefault()
                handleDeletePin(e, pin.id, pin.amenityId)
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`relative flex items-center justify-center rounded-full transition-all bg-white shadow-md ${
                    isSelected
                      ? "w-10 h-10 ring-[3px] ring-primary shadow-lg shadow-primary/40"
                      : "w-8 h-8 hover:w-9 hover:h-9"
                  }`}
                >
                  <AmenityIcon
                    icon={pin.amenityIcon}
                    className={`text-primary ${isSelected ? "h-5 w-5" : "h-4 w-4"}`}
                  />
                </div>
                {showAmenityNames && (
                  <span className="mt-0.5 text-[8px] font-medium text-white px-1 rounded bg-primary/80 whitespace-nowrap max-w-[80px] truncate">
                    {pin.amenityNameEn}
                  </span>
                )}
              </div>

              {/* Hover popover card */}
              {isHovered && !dragging && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none">
                  <div className={`bg-card border border-border rounded-lg shadow-xl overflow-hidden ${hasDetails ? "w-56" : "w-auto"}`}>
                    {pin.coverImage && (
                      <div className="w-full h-24 overflow-hidden">
                        <img
                          src={pin.coverImage || "/placeholder.svg"}
                          alt={pin.amenityNameEn}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="font-semibold text-xs text-foreground">{pin.amenityNameEn}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5" dir="rtl">{pin.amenityNameAr}</p>
                      {pin.descriptionEn && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{pin.descriptionEn}</p>
                      )}
                      {pin.descriptionAr && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed" dir="rtl">{pin.descriptionAr}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Click to select a pin. Shift+click to multi-select. Click and drag on empty area to box-select. Right-click to
        remove from map.
      </p>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove from Masterplan"
        description="Are you sure you want to remove this amenity pin from the masterplan?"
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Remove Selected from Masterplan"
        description={`Are you sure you want to remove ${selectedPins.length} amenity pins from the masterplan?`}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Upload, X, ChevronDown, ChevronRight, Trash2, Edit2, Check, GripVertical, Building2, ZoomIn, ZoomOut, Layers3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BulkUploadBuildingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (buildings: Array<{ name: string; x: number; y: number }>) => void
  existingBuildings?: Array<{ id: string; name: string; x: number; y: number }>
}

interface UploadedBuilding {
  id: string
  name: string
  x: number
  y: number
  phase: string // "main" or phase id
}

const projectPhases = [
  { id: "main", name: "Main Compound", color: "#6b7280" },
  { id: "phase-1", name: "Phase 1", color: "#3b82f6" },
  { id: "phase-2", name: "Phase 2", color: "#10b981" },
  { id: "phase-3", name: "Phase 3", color: "#f59e0b" },
  { id: "phase-4", name: "Phase 4", color: "#ef4444" },
]

export function BulkUploadBuildingsModal({ 
  open, 
  onOpenChange, 
  onUploadComplete,
  existingBuildings = []
}: BulkUploadBuildingsModalProps) {
  const [step, setStep] = useState<"upload" | "review">("upload")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedBuildings, setUploadedBuildings] = useState<UploadedBuilding[]>([])
  const [expandedPhases, setExpandedPhases] = useState<string[]>(["main"])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [showBuildingNames, setShowBuildingNames] = useState(false)
  const [draggingBuildingId, setDraggingBuildingId] = useState<string | null>(null)
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null)
  const [showPhasePolygons, setShowPhasePolygons] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith(".svg")) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return

    setUploading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)

          // Mock uploaded buildings with random positions and phases
          const mockBuildings: UploadedBuilding[] = [
            { id: "new-1", name: "Building A1", x: 15, y: 20, phase: "main" },
            { id: "new-2", name: "Building A2", x: 25, y: 25, phase: "main" },
            { id: "new-3", name: "Building B1", x: 35, y: 30, phase: "phase-1" },
            { id: "new-4", name: "Building B2", x: 45, y: 35, phase: "phase-1" },
            { id: "new-5", name: "Villa 1", x: 55, y: 40, phase: "phase-2" },
            { id: "new-6", name: "Villa 2", x: 65, y: 45, phase: "phase-2" },
            { id: "new-7", name: "Townhouse 1", x: 75, y: 50, phase: "phase-3" },
            { id: "new-8", name: "Townhouse 2", x: 85, y: 55, phase: "phase-3" },
          ]
          setUploadedBuildings(mockBuildings)
          setExpandedPhases(["main", "phase-1", "phase-2", "phase-3"])
          setStep("review")
          return 100
        }
        return prev + 10
      })
    }, 150)
  }

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(p => p !== phaseId)
        : [...prev, phaseId]
    )
  }

  const handleRemoveBuilding = (id: string) => {
    setUploadedBuildings(prev => prev.filter(b => b.id !== id))
  }

  const handleStartEdit = (building: UploadedBuilding) => {
    setEditingId(building.id)
    setEditName(building.name)
  }

  const handleSaveEdit = () => {
    if (editingId) {
      setUploadedBuildings(prev => 
        prev.map(b => b.id === editingId ? { ...b, name: editName } : b)
      )
      setEditingId(null)
      setEditName("")
    }
  }

  const handleMoveBuilding = (buildingId: string, newPhase: string) => {
    setUploadedBuildings(prev =>
      prev.map(b => b.id === buildingId ? { ...b, phase: newPhase } : b)
    )
  }

  const handleSave = () => {
    setSaving(true)
    setSaveProgress(0)

    const interval = setInterval(() => {
      setSaveProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          
          // Pass buildings to parent
          onUploadComplete(uploadedBuildings.map(b => ({
            name: b.name,
            x: b.x,
            y: b.y
          })))
          
          // Reset and close
          setTimeout(() => {
            setSaving(false)
            setSaveProgress(0)
            setStep("upload")
            setSelectedFile(null)
            setUploadedBuildings([])
            onOpenChange(false)
          }, 500)
          
          return 100
        }
        return prev + 5
      })
    }, 50)
  }

  const handleClose = () => {
    setStep("upload")
    setSelectedFile(null)
    setUploadedBuildings([])
    setProgress(0)
    onOpenChange(false)
  }

  const getBuildingsByPhase = (phaseId: string) => {
    return uploadedBuildings.filter(b => b.phase === phaseId)
  }

  const handleDragStart = (e: React.MouseEvent, buildingId: string) => {
    e.preventDefault()
    setDraggingBuildingId(buildingId)
    setSelectedBuildingId(buildingId)
  }

  const handleDragMove = (e: React.MouseEvent, containerRect: DOMRect) => {
    if (!draggingBuildingId) return
    
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x))
    const clampedY = Math.max(0, Math.min(100, y))
    
    setUploadedBuildings(prev =>
      prev.map(b => b.id === draggingBuildingId ? { ...b, x: clampedX, y: clampedY } : b)
    )
  }

  const handleDragEnd = () => {
    setDraggingBuildingId(null)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  // Mock phase polygons for display
  const phasePolygons = [
    { id: "poly-1", phaseId: "phase-1", points: [{ x: 30, y: 25 }, { x: 50, y: 25 }, { x: 50, y: 45 }, { x: 30, y: 45 }] },
    { id: "poly-2", phaseId: "phase-2", points: [{ x: 50, y: 35 }, { x: 70, y: 35 }, { x: 70, y: 55 }, { x: 50, y: 55 }] },
    { id: "poly-3", phaseId: "phase-3", points: [{ x: 70, y: 45 }, { x: 90, y: 45 }, { x: 90, y: 65 }, { x: 70, y: 65 }] },
  ]

  const getPhasePolygonPathD = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ""
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }
    path += " Z"
    return path
  }

  // Upload step
  if (step === "upload") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Buildings from SVG</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Select an SVG file containing building markers</p>
              <input type="file" accept=".svg" onChange={handleFileSelect} className="hidden" id="svg-upload" />
              <label htmlFor="svg-upload">
                <Button variant="outline" asChild>
                  <span>Choose SVG File</span>
                </Button>
              </label>
              {selectedFile && <p className="text-sm text-muted-foreground mt-2">Selected: {selectedFile.name}</p>}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing SVG file...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? "Processing..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Fullscreen review step
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] w-[95vw] h-[90vh] !max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Review Uploaded Buildings</h2>
            <Badge variant="secondary" className="text-xs">{uploadedBuildings.length} buildings</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Masterplan Preview */}
          <div className="flex-1 p-4 bg-secondary/20">
            <div className="h-full rounded-lg border border-border overflow-hidden bg-card">
              <div 
                className="relative w-full h-full bg-secondary/30 overflow-hidden"
                onMouseMove={(e) => {
                  if (draggingBuildingId) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    handleDragMove(e, rect)
                  }
                }}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {/* Top right controls - outside zoom */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {/* Phases toggle */}
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
                  {/* Names toggle */}
                  <button
                    onClick={() => setShowBuildingNames(!showBuildingNames)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-md border transition-colors",
                      showBuildingNames
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-secondary"
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Names
                  </button>
                </div>

                {/* Zoom controls - bottom right, outside zoom */}
                <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-2 bg-card border border-border rounded-md shadow-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="px-2 py-1 bg-card border border-border rounded-md shadow-md text-xs text-center font-medium">
                    {Math.round(zoom * 100)}%
                  </div>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-2 bg-card border border-border rounded-md shadow-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                </div>

                {/* Zoomable container */}
                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-200 origin-center"
                  style={{
                    transform: `scale(${zoom})`,
                  }}
                >
                  {/* Masterplan Image */}
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backgroundImage: `url('/aerial-view-masterplan-residential-development-blu.jpg')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  {/* Phase Polygons */}
                  {showPhasePolygons && phasePolygons.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 5 }}
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
                            fill={`${color}20`}
                            stroke={color}
                            strokeWidth="0.5"
                          />
                        )
                      })}
                    </svg>
                  )}
                  
                  {/* Existing Buildings - Blue dots */}
                  {existingBuildings.map((building) => (
                    <div
                      key={building.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${building.x}%`, top: `${building.y}%` }}
                      onMouseEnter={() => setHoveredBuildingId(`existing-${building.id}`)}
                      onMouseLeave={() => setHoveredBuildingId(null)}
                    >
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-md cursor-default" />
                      {/* Tooltip on hover */}
                      {hoveredBuildingId === `existing-${building.id}` && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] whitespace-nowrap shadow-lg z-30">
                          {building.name}
                        </div>
                      )}
                      {/* Permanent label when toggle is on */}
                      {showBuildingNames && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-1 py-0.5 bg-blue-500/90 text-white rounded text-[8px] whitespace-nowrap">
                          {building.name}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Uploaded Buildings - Orange dots (draggable) */}
                  {uploadedBuildings.map((building) => (
                    <div
                      key={building.id}
                      className={cn(
                        "absolute transform -translate-x-1/2 -translate-y-1/2",
                        draggingBuildingId === building.id && "z-50"
                      )}
                      style={{ left: `${building.x}%`, top: `${building.y}%` }}
                      onMouseEnter={() => !draggingBuildingId && setHoveredBuildingId(building.id)}
                      onMouseLeave={() => setHoveredBuildingId(null)}
                    >
                      <div
                        onMouseDown={(e) => handleDragStart(e, building.id)}
                        onClick={() => setSelectedBuildingId(building.id)}
                        className={cn(
                          "w-4 h-4 rounded-full bg-orange-500 border-2 shadow-lg cursor-grab active:cursor-grabbing transition-all",
                          selectedBuildingId === building.id 
                            ? "border-primary ring-2 ring-primary/50 scale-125" 
                            : "border-white hover:scale-110",
                          draggingBuildingId === building.id && "cursor-grabbing scale-125"
                        )}
                      />
                      {/* Tooltip on hover */}
                      {hoveredBuildingId === building.id && !draggingBuildingId && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] whitespace-nowrap shadow-lg z-30">
                          {building.name}
                        </div>
                      )}
                      {/* Permanent label when toggle is on */}
                      {showBuildingNames && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-1 py-0.5 bg-orange-500/90 text-white rounded text-[8px] whitespace-nowrap">
                          {building.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend - outside zoom */}
                <div className="absolute bottom-4 left-4 z-20 bg-card/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
                      <span className="text-muted-foreground">Existing ({existingBuildings.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
                      <span className="text-muted-foreground">New ({uploadedBuildings.length})</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Drag orange dots to reposition</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Buildings List by Phase */}
            <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium">Buildings by Phase</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Edit, remove or move buildings between phases</p>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {projectPhases.map((phase) => {
                  const phaseBuildings = getBuildingsByPhase(phase.id)
                  const isExpanded = expandedPhases.includes(phase.id)
                  
                  return (
                    <div key={phase.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Phase Header */}
                      <button
                        onClick={() => togglePhase(phase.id)}
                        className="w-full flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: phase.color }} 
                          />
                          <span className="text-sm font-medium">{phase.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {phaseBuildings.length}
                        </Badge>
                      </button>

                      {/* Phase Buildings */}
                      {isExpanded && (
                        <div className="divide-y divide-border">
                          {phaseBuildings.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground text-center">
                              No buildings in this phase
                            </div>
                          ) : (
                            phaseBuildings.map((building) => (
                              <div 
                                key={building.id} 
                                className={cn(
                                  "flex items-center gap-2 p-2 hover:bg-secondary/20 transition-colors",
                                  selectedBuildingId === building.id && "bg-primary/10"
                                )}
                                onClick={() => setSelectedBuildingId(building.id)}
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                                
                                {editingId === building.id ? (
                                  <div className="flex-1 flex items-center gap-1">
                                    <Input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="h-7 text-xs"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit()
                                        if (e.key === "Escape") setEditingId(null)
                                      }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 text-xs font-medium truncate">{building.name}</span>
                                    
                                    <Select
                                      value={building.phase}
                                      onValueChange={(value) => handleMoveBuilding(building.id, value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Select phase" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {projectPhases.map((p) => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-2 h-2 rounded" style={{ backgroundColor: p.color }} />
                                              {p.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStartEdit(building)
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveBuilding(building.id)
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border space-y-3">
                {saving && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Saving buildings...</span>
                      <span className="font-medium">{saveProgress}%</span>
                    </div>
                    <Progress value={saveProgress} className="h-2" />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={handleClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSave} 
                    disabled={saving || uploadedBuildings.length === 0}
                  >
                    {saving ? "Saving..." : `Save ${uploadedBuildings.length} Buildings`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
}

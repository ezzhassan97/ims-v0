"use client"

import React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, ArrowUpDown, X, ChevronLeft, ChevronRight, Upload, Copy, Check, Map, Trash2, FileImage, Hash, MapPin, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { projectPhases } from "@/lib/mock-data"

type MasterplanType = "GIS" | "Listing" | "Numbered" | "Project Location"
type FileType = "JPG" | "PNG" | "GeoTiff" | "WEBP"

interface Masterplan {
  id: string
  type: MasterplanType
  phaseId: string | null
  phaseName: string | null
  version: number
  fileType: FileType
  fileSize: number
  imageUrl: string
  updatedAt: Date
}

const mockMasterplans: Masterplan[] = [
  {
    id: "MP-001",
    type: "Listing",
    phaseId: "phase-1",
    phaseName: "Phase 1",
    version: 3,
    fileType: "PNG",
    fileSize: 2450,
    imageUrl: "/placeholder.svg?height=400&width=600",
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "MP-002",
    type: "Listing",
    phaseId: "phase-1",
    phaseName: "Phase 1",
    version: 2,
    fileType: "JPG",
    fileSize: 1800,
    imageUrl: "/placeholder.svg?height=400&width=600",
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "MP-003",
    type: "Numbered",
    phaseId: "phase-2",
    phaseName: "Phase 2",
    version: 1,
    fileType: "PNG",
    fileSize: 3200,
    imageUrl: "/placeholder.svg?height=400&width=600",
    updatedAt: new Date("2024-01-18"),
  },
  {
    id: "MP-004",
    type: "Project Location",
    phaseId: null,
    phaseName: null,
    version: 2,
    fileType: "JPG",
    fileSize: 950,
    imageUrl: "/placeholder.svg?height=400&width=600",
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "MP-005",
    type: "GIS",
    phaseId: "phase-1",
    phaseName: "Phase 1",
    version: 1,
    fileType: "GeoTiff",
    fileSize: 15800,
    imageUrl: "",
    updatedAt: new Date("2024-01-05"),
  },
  {
    id: "MP-006",
    type: "GIS",
    phaseId: "phase-3",
    phaseName: "Phase 3",
    version: 2,
    fileType: "GeoTiff",
    fileSize: 22400,
    imageUrl: "",
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "MP-007",
    type: "Listing",
    phaseId: null,
    phaseName: null,
    version: 1,
    fileType: "WEBP",
    fileSize: 890,
    imageUrl: "/placeholder.svg?height=400&width=600",
    updatedAt: new Date("2024-01-01"),
  },
]

const masterplanTypes: MasterplanType[] = ["GIS", "Listing", "Numbered", "Project Location"]

interface MasterplansTabProps {
  masterplans?: Masterplan[]
  hasPhases?: boolean
}

export function MasterplansTab({ masterplans = mockMasterplans, hasPhases = true }: MasterplansTabProps) {
  const [localMasterplans, setLocalMasterplans] = useState<Masterplan[]>(masterplans)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("updated-desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [uploadStep, setUploadStep] = useState<number>(1) // Declare setUploadStep
  
  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [masterplanToDelete, setMasterplanToDelete] = useState<Masterplan | null>(null)
  
  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MasterplanType | "">("")
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("")
  const [versionAction, setVersionAction] = useState<"new" | "update">("new")
  const [selectedExistingId, setSelectedExistingId] = useState<string>("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Filter masterplans
  const filteredMasterplans = localMasterplans.filter((mp) => {
    const matchesSearch = mp.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || mp.type === typeFilter
    return matchesSearch && matchesType
  })

  // Sort masterplans
  const sortedMasterplans = [...filteredMasterplans].sort((a, b) => {
    if (sortBy === "updated-desc") {
      return (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0)
    }
    return (a.updatedAt?.getTime?.() || 0) - (b.updatedAt?.getTime?.() || 0)
  })

  // Get existing masterplans of selected type for version workflow
  const existingOfType = selectedType
    ? localMasterplans.filter((mp) => mp.type === selectedType).sort((a, b) => b.version - a.version)
    : []

  const formatFileSize = (kb: number) => {
    if (kb < 1024) return `${kb} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const formatDate = (date: Date | undefined | null) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "-"
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getTypeIcon = (type: MasterplanType) => {
    switch (type) {
      case "GIS": return <Globe className="h-3 w-3" />
      case "Listing": return <FileImage className="h-3 w-3" />
      case "Numbered": return <Hash className="h-3 w-3" />
      case "Project Location": return <MapPin className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: MasterplanType) => {
    switch (type) {
      case "GIS": return "bg-orange-50 text-orange-700 border-orange-200"
      case "Listing": return "bg-blue-50 text-blue-700 border-blue-200"
      case "Numbered": return "bg-purple-50 text-purple-700 border-purple-200"
      case "Project Location": return "bg-green-50 text-green-700 border-green-200"
    }
  }

  // Carousel navigation
  const openCarousel = (index: number) => {
    setCarouselIndex(index)
    setCarouselOpen(true)
  }

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % sortedMasterplans.length)
  }

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + sortedMasterplans.length) % sortedMasterplans.length)
  }

  // Delete handlers
  const handleDeleteClick = (mp: Masterplan, e: React.MouseEvent) => {
    e.stopPropagation()
    setMasterplanToDelete(mp)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (masterplanToDelete) {
      setLocalMasterplans((prev) => prev.filter((mp) => mp.id !== masterplanToDelete.id))
      setDeleteDialogOpen(false)
      setMasterplanToDelete(null)
    }
  }

  // Upload modal handlers
  const resetUploadModal = () => {
    setSelectedType("")
    setSelectedPhaseId("")
    setVersionAction("new")
    setSelectedExistingId("")
    setUploadedFile(null)
  }

  const handleUploadClose = () => {
    setUploadModalOpen(false)
    resetUploadModal()
  }

  const handleSave = () => {
    // In real app, would upload file and create/update masterplan
    handleUploadClose()
  }

  const currentCarouselItem = sortedMasterplans[carouselIndex]

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col gap-3 p-3 bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Masterplans</h2>
            <p className="text-xs text-muted-foreground">{sortedMasterplans.length} masterplan(s)</p>
          </div>
          <Button size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Add Masterplan
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search by ID */}
          <div className="relative w-40">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {masterplanTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated-desc">Newest First</SelectItem>
              <SelectItem value="updated-asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {sortedMasterplans.map((mp, index) => (
          <Card
            key={mp.id}
            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => openCarousel(index)}
          >
            {/* Preview */}
            <div className="relative h-28 bg-secondary/30">
              {mp.type === "GIS" ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                  <Map className="h-10 w-10 text-emerald-400" />
                  <span className="text-[10px] text-emerald-300 mt-1">GIS Map</span>
                </div>
              ) : (
                <img
                  src={mp.imageUrl || "/placeholder.svg"}
                  alt={`Masterplan ${mp.id}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Version Badge */}
              <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-semibold">
                v{mp.version}
              </div>
              
              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteClick(mp, e)}
                className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Content */}
            <div className="p-2 space-y-1.5">
              {/* ID with copy */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{mp.id}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(mp.id)
                    }}
                    className="p-0.5 hover:bg-secondary rounded"
                  >
                    {copiedId === mp.id ? (
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Type Badge */}
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 w-full justify-center", getTypeColor(mp.type))}>
                {getTypeIcon(mp.type)}
                <span className="ml-1">{mp.type}</span>
              </Badge>

              {/* Phase Label */}
              <div className="text-[10px] text-muted-foreground">
                {mp.phaseName || "Main Compound"}
              </div>

              {/* File size and Updated */}
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{formatFileSize(mp.fileSize)}</span>
                <span>{formatDate(mp.updatedAt)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {sortedMasterplans.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Map className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No masterplans found</p>
        </div>
      )}

      {/* Fullscreen Carousel */}
      <Dialog open={carouselOpen} onOpenChange={setCarouselOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
          {currentCarouselItem && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              {/* Image or GIS Placeholder */}
              {currentCarouselItem.type === "GIS" ? (
                <div className="flex flex-col items-center justify-center text-white">
                  <Map className="h-24 w-24 text-emerald-400 mb-4" />
                  <p className="text-lg">GIS Masterplan</p>
                  <p className="text-sm text-muted-foreground">{currentCarouselItem.id}</p>
                </div>
              ) : (
                <img
                  src={currentCarouselItem.imageUrl || "/placeholder.svg"}
                  alt={`Masterplan ${currentCarouselItem.id}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {/* Navigation Arrows */}
              {sortedMasterplans.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Info Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono">{currentCarouselItem.id}</span>
                  <Badge className={getTypeColor(currentCarouselItem.type)}>{currentCarouselItem.type}</Badge>
                  <span className="text-sm">v{currentCarouselItem.version}</span>
                  <span className="text-sm text-muted-foreground">{currentCarouselItem.phaseName || "Main Compound"}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(currentCarouselItem.fileSize)}</span>
                  <span>{formatDate(currentCarouselItem.updatedAt)}</span>
                  <span>{carouselIndex + 1} / {sortedMasterplans.length}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Masterplan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete masterplan <span className="font-mono font-semibold">{masterplanToDelete?.id}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Masterplan Modal - Single Column Layout */}
      <Dialog open={uploadModalOpen} onOpenChange={handleUploadClose}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Masterplan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Masterplan Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Masterplan Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {masterplanTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "p-2 border rounded-lg text-center hover:border-primary transition-colors",
                      selectedType === type && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {getTypeIcon(type)}
                      <span className="text-xs font-medium">{type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Link to Phase */}
            {hasPhases && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link to Phase</Label>
                <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Compound</SelectItem>
                    {projectPhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                          {phase.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 3. Previously Uploaded Versions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Previously Uploaded {selectedType && `(${existingOfType.length})`}
                </Label>
                {existingOfType.length > 0 && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={versionAction === "new" ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        setVersionAction("new")
                        setSelectedExistingId("")
                      }}
                    >
                      New Version
                    </Button>
                    <Button
                      type="button"
                      variant={versionAction === "update" ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setVersionAction("update")}
                    >
                      Update Existing
                    </Button>
                  </div>
                )}
              </div>
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {selectedType ? (
                  existingOfType.length > 0 ? (
                    <div className="divide-y divide-border">
                      {existingOfType.map((mp) => (
                        <div
                          key={mp.id}
                          onClick={() => {
                            if (versionAction === "update") {
                              setSelectedExistingId(mp.id)
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2 transition-colors",
                            versionAction === "update" && "cursor-pointer hover:bg-secondary/50",
                            selectedExistingId === mp.id && versionAction === "update" && "bg-primary/10"
                          )}
                        >
                          {/* Thumbnail */}
                          <div className="w-10 h-8 rounded bg-secondary/50 flex-shrink-0 overflow-hidden">
                            {mp.type === "GIS" ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                                <Map className="h-4 w-4 text-emerald-400" />
                              </div>
                            ) : (
                              <img src={mp.imageUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">{mp.id}</span>
                              <Badge className="text-[9px] px-1 py-0 h-4">v{mp.version}</Badge>
                              <span className="text-[10px] text-muted-foreground">{mp.phaseName || "Main"}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{formatDate(mp.updatedAt)}</span>
                          </div>
                          {/* Selection indicator */}
                          {versionAction === "update" && selectedExistingId === mp.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-muted-foreground">
                      <FileImage className="h-6 w-6 mb-1 opacity-50" />
                      <p className="text-xs">No existing {selectedType} masterplans</p>
                    </div>
                  )
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-muted-foreground">
                    <FileImage className="h-6 w-6 mb-1 opacity-50" />
                    <p className="text-xs">Select a type first</p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Upload File */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload File</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept={selectedType === "GIS" ? ".tiff,.tif,.geotiff" : "image/*"}
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                  {uploadedFile ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Click to select file</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedType === "GIS" ? ".tiff, .tif, .geotiff" : "JPG, PNG, WEBP"}
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleUploadClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!selectedType || !uploadedFile || (versionAction === "update" && !selectedExistingId)}
            >
              {versionAction === "new" ? "Create Masterplan" : "Update Masterplan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

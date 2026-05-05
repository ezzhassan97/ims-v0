"use client"

import { useState } from "react"
import { Copy, Check, Unlink, Plus, ImageIcon, Eye, Edit2, MapPin, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { type Amenity, type SystemAmenity, projectPhases } from "@/lib/mock-data"
import { AmenityIcon } from "./amenity-icon"

interface AmenitiesListProps {
  amenities: Amenity[]
  systemAmenities: SystemAmenity[]
  selectedAmenityIds: string[]
  onSelectAmenity: (id: string, multiSelect?: boolean) => void
  onUnlinkAmenity: (id: string) => void
  onLinkAmenities: (ids: string[]) => void
  onUpdateAmenity: (amenity: Amenity) => void
  onAddPinMode: (amenityId: string) => void
  isAddingPin: boolean
  addingPinForAmenityId: string | null
}

export function AmenitiesList({
  amenities,
  systemAmenities,
  selectedAmenityIds,
  onSelectAmenity,
  onUnlinkAmenity,
  onLinkAmenities,
  onUpdateAmenity,
  onAddPinMode,
  isAddingPin,
  addingPinForAmenityId,
}: AmenitiesListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [selectedSystemAmenities, setSelectedSystemAmenities] = useState<string[]>([])
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null)
  const [editingPinId, setEditingPinId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [tempDescriptionEn, setTempDescriptionEn] = useState("")
  const [tempDescriptionAr, setTempDescriptionAr] = useState("")
  const [tempCoverImage, setTempCoverImage] = useState("")

  const linkedAmenities = amenities.filter((a) => a.isLinked)
  const availableSystemAmenities = systemAmenities.filter(
    (sa) => !linkedAmenities.some((la) => la.nameEn === sa.nameEn),
  )

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleToggleSystemAmenity = (id: string) => {
    setSelectedSystemAmenities((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleLinkSelected = () => {
    onLinkAmenities(selectedSystemAmenities)
    setSelectedSystemAmenities([])
    setShowLinkDialog(false)
  }

  const handleViewDetails = (amenity: Amenity) => {
    setEditingAmenity(amenity)
    setTempDescriptionEn(amenity.descriptionEn || "")
    setTempDescriptionAr(amenity.descriptionAr || "")
    setTempCoverImage(amenity.coverImage || "")
    setEditMode(false)
    setShowDetailsDialog(true)
  }

  const handleViewPinDetails = (amenity: Amenity, pinId: string) => {
    const pin = amenity.pins.find((p) => p.id === pinId)
    if (!pin) return

    setEditingAmenity(amenity)
    setEditingPinId(pinId)
    setTempDescriptionEn(pin.descriptionEn || "")
    setTempDescriptionAr(pin.descriptionAr || "")
    setTempCoverImage(pin.coverImage || "")
    setEditMode(false)
    setShowDetailsDialog(true)
  }

  const handleSaveDetails = () => {
    if (editingAmenity && editingPinId) {
      const updatedPins = editingAmenity.pins.map((pin) =>
        pin.id === editingPinId
          ? {
              ...pin,
              descriptionEn: tempDescriptionEn,
              descriptionAr: tempDescriptionAr,
              coverImage: tempCoverImage,
            }
          : pin,
      )
      onUpdateAmenity({ ...editingAmenity, pins: updatedPins })
    } else if (editingAmenity) {
      onUpdateAmenity({
        ...editingAmenity,
        descriptionEn: tempDescriptionEn,
        descriptionAr: tempDescriptionAr,
        coverImage: tempCoverImage,
      })
    }
    setEditMode(false)
    setShowDetailsDialog(false)
    setEditingPinId(null)
  }

  const handleDeletePin = (amenity: Amenity, pinId: string) => {
    const updatedPins = amenity.pins.filter((p) => p.id !== pinId)
    onUpdateAmenity({ ...amenity, pins: updatedPins })
  }

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Project Amenities ({linkedAmenities.length})</h3>
        <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Link
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2 w-full overflow-hidden">
          {linkedAmenities.map((amenity) => {
            const isSelected = selectedAmenityIds.includes(amenity.id)
            const isAddingThisPin = addingPinForAmenityId === amenity.id
            const hasNoPins = amenity.pins.length === 0

            return (
              <Card
                key={amenity.id}
                className={`p-3 cursor-pointer transition-all w-full overflow-hidden ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary/50"
                } ${isAddingThisPin ? "ring-2 ring-green-500 bg-green-50" : ""}`}
                onClick={(e) => {
                  const multiSelect = e.shiftKey
                  onSelectAmenity(amenity.id, multiSelect)
                }}
              >
                <div className="flex items-start gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AmenityIcon icon={amenity.icon} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-foreground truncate">{amenity.nameEn}</p>
                      <Badge
                        variant={amenity.pins.length > 0 ? "default" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                          amenity.pins.length > 0
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {amenity.pins.length > 0
                          ? `${amenity.pins.length} Pin${amenity.pins.length > 1 ? "s" : ""}`
                          : "Not on Map"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{amenity.nameAr}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1 py-0.5 rounded truncate max-w-[80px]">
                        {amenity.id}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyId(amenity.id)
                        }}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        {copiedId === amenity.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      {amenity.phaseId && (() => {
                        const phase = projectPhases.find((p) => p.id === amenity.phaseId)
                        return phase ? (
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />
                            {phase.name}
                          </span>
                        ) : null
                      })()}
                    </div>

                    {amenity.pins.length > 0 && (
                      <div className="mt-2 space-y-1 bg-secondary/30 rounded p-1.5">
                        {amenity.pins.map((pin, idx) => (
                          <div
                            key={pin.id}
                            className="flex items-center justify-between gap-1 text-[10px] bg-card p-1 rounded"
                          >
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">Pin {idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewPinDetails(amenity, pin.id)
                                }}
                              >
                                <Eye className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePin(amenity, pin.id)
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-1.5 text-[11px] ${isAddingThisPin ? "bg-green-100 text-green-700" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddPinMode(amenity.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" />
                        Add Pin
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnlinkAmenity(amenity.id)
                        }}
                      >
                        <Unlink className="h-3 w-3 mr-0.5" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          {linkedAmenities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No amenities linked</p>
              <p className="text-xs mt-1">Click "Link" to add amenities</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Link Amenities Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Amenities</DialogTitle>
            <DialogDescription>Select amenities to link to this project. You can select multiple.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-2">
              {availableSystemAmenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                    selectedSystemAmenities.includes(amenity.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/50"
                  }`}
                  onClick={() => handleToggleSystemAmenity(amenity.id)}
                >
                  <Checkbox
                    checked={selectedSystemAmenities.includes(amenity.id)}
                    onCheckedChange={() => handleToggleSystemAmenity(amenity.id)}
                  />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AmenityIcon icon={amenity.icon} className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{amenity.nameEn}</p>
                    <p className="text-xs text-muted-foreground">{amenity.nameAr}</p>
                  </div>
                </div>
              ))}
              {availableSystemAmenities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All amenities are already linked</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkSelected} disabled={selectedSystemAmenities.length === 0}>
              Link Selected ({selectedSystemAmenities.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingAmenity && (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <AmenityIcon icon={editingAmenity.icon} className="h-4 w-4 text-primary" />
                  </div>
                  {editingAmenity.nameEn} - Pin Details
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {editingAmenity && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Cover Image</Label>
                {editMode ? (
                  <Input
                    value={tempCoverImage}
                    onChange={(e) => setTempCoverImage(e.target.value)}
                    placeholder="Enter image URL..."
                    className="mt-1.5"
                  />
                ) : tempCoverImage ? (
                  <div className="mt-1.5 rounded-lg overflow-hidden border border-border">
                    <img
                      src={tempCoverImage || "/placeholder.svg"}
                      alt={editingAmenity.nameEn}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-1.5 rounded-lg border border-dashed border-border h-40 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No cover image</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Description (English)</Label>
                  {editMode ? (
                    <Textarea
                      value={tempDescriptionEn}
                      onChange={(e) => setTempDescriptionEn(e.target.value)}
                      placeholder="Enter English description..."
                      className="mt-1.5 min-h-[100px]"
                    />
                  ) : tempDescriptionEn ? (
                    <p className="mt-1.5 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                      {tempDescriptionEn}
                    </p>
                  ) : (
                    <div className="mt-1.5 rounded-lg border border-dashed border-border p-4 flex items-center justify-center text-muted-foreground">
                      <p className="text-xs">No description</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Description (Arabic)</Label>
                  {editMode ? (
                    <Textarea
                      value={tempDescriptionAr}
                      onChange={(e) => setTempDescriptionAr(e.target.value)}
                      placeholder="أدخل الوصف بالعربية..."
                      className="mt-1.5 min-h-[100px]"
                      dir="rtl"
                    />
                  ) : tempDescriptionAr ? (
                    <p className="mt-1.5 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg" dir="rtl">
                      {tempDescriptionAr}
                    </p>
                  ) : (
                    <div className="mt-1.5 rounded-lg border border-dashed border-border p-4 flex items-center justify-center text-muted-foreground">
                      <p className="text-xs">لا يوجد وصف</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDetails}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => setEditMode(true)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

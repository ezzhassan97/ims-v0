"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Maximize2 } from "lucide-react"
import { format } from "date-fns"

interface Masterplan {
  id: string
  version: number
  fileName: string
  fileSize: string
  extension: string
  dimensions: { width: number; height: number }
  uploadedAt: Date
  imageUrl: string
}

interface MasterplanUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (masterplan: Masterplan) => void
}

const mockMasterplans: Masterplan[] = [
  {
    id: "1",
    version: 3,
    fileName: "masterplan_v3.jpg",
    fileSize: "2.4 MB",
    extension: "JPG",
    dimensions: { width: 1920, height: 1080 },
    uploadedAt: new Date("2024-01-15"),
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
  },
  {
    id: "2",
    version: 2,
    fileName: "masterplan_v2.jpg",
    fileSize: "2.1 MB",
    extension: "JPG",
    dimensions: { width: 1920, height: 1080 },
    uploadedAt: new Date("2024-01-10"),
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
  },
  {
    id: "3",
    version: 1,
    fileName: "masterplan_v1.png",
    fileSize: "3.2 MB",
    extension: "PNG",
    dimensions: { width: 2560, height: 1440 },
    uploadedAt: new Date("2024-01-05"),
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
  },
]

export function MasterplanUploadModal({ open, onOpenChange, onSelect }: MasterplanUploadModalProps) {
  const [masterplans, setMasterplans] = useState<Masterplan[]>(mockMasterplans)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = () => {
    setUploading(true)
    setTimeout(() => {
      const newMasterplan: Masterplan = {
        id: String(masterplans.length + 1),
        version: Math.max(...masterplans.map((m) => m.version)) + 1,
        fileName: `masterplan_v${Math.max(...masterplans.map((m) => m.version)) + 1}.jpg`,
        fileSize: "2.6 MB",
        extension: "JPG",
        dimensions: { width: 1920, height: 1080 },
        uploadedAt: new Date(),
        imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
      }
      setMasterplans([newMasterplan, ...masterplans])
      setUploading(false)
    }, 1500)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select or Upload Masterplan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Drag and drop a masterplan image or click to browse</p>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload New Masterplan"}
              </Button>
            </div>

            {/* Masterplans Grid */}
            <div>
              <h3 className="text-sm font-medium mb-3">Available Masterplans ({masterplans.length})</h3>
              <div className="grid grid-cols-3 gap-4">
                {masterplans.map((masterplan) => (
                  <div
                    key={masterplan.id}
                    className="border border-border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                  >
                    <div className="relative aspect-video bg-secondary/50">
                      <img
                        src={masterplan.imageUrl || "/placeholder.svg"}
                        alt={masterplan.fileName}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 bg-white/90"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(masterplan.imageUrl)
                        }}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Version {masterplan.version}</span>
                        <span className="text-xs text-muted-foreground">{masterplan.extension}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{masterplan.fileName}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{masterplan.fileSize}</span>
                        <span>
                          {masterplan.dimensions.width}×{masterplan.dimensions.height}px
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(masterplan.uploadedAt, "MMM d, yyyy")}</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onSelect(masterplan)
                          onOpenChange(false)
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Image View */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={selectedImage || "/placeholder.svg"}
            alt="Full screen"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  )
}

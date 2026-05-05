"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface Media {
  id: string
  url: string
  type: "image" | "video"
}

interface MediaGalleryCarouselProps {
  media: Media[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
}

export function MediaGalleryCarousel({ media, open, onOpenChange, initialIndex = 0 }: MediaGalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!media || media.length === 0) return null

  const current = media[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black border-0">
        <div className="relative w-full h-[80vh] flex items-center justify-center bg-black">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Media display */}
          <div className="w-full h-full flex items-center justify-center relative">
            {current.type === "image" ? (
              <img
                src={current.url}
                alt={`Media ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <video
                src={current.url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            )}
          </div>

          {/* Navigation */}
          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              {/* Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {media.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

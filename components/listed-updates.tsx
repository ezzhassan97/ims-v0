"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, Film, Copy, Check, Search, ArrowDown, ArrowUp } from "lucide-react"
import { MediaGalleryCarousel } from "@/components/media-gallery-carousel"
import { ConstructionUpdateDrawer } from "@/components/construction-update-drawer"
import { cn } from "@/lib/utils"
import type { ConstructionUpdate } from "@/lib/mock-data"

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded hover:bg-secondary transition-colors flex-shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  )
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const CLAMP_LINES = 2
const LINE_HEIGHT_PX = 20

function ExpandableDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [clamped, setClamped] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setClamped(el.scrollHeight > CLAMP_LINES * LINE_HEIGHT_PX + 4)
  }, [text])

  return (
    <div className="text-sm text-muted-foreground">
      <p ref={ref} className={cn("leading-5", !expanded && "line-clamp-2")}>
        {text}
      </p>
      {clamped && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary hover:underline mt-0.5 font-medium"
        >
          {expanded ? "see less" : "see more"}
        </button>
      )}
    </div>
  )
}

interface ListedUpdatesProps {
  updates: ConstructionUpdate[]
}

export function ListedUpdates({ updates }: ListedUpdatesProps) {
  const [selectedUpdate, setSelectedUpdate] = useState<ConstructionUpdate | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)
  const [search, setSearch] = useState("")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")

  const listedUpdates = useMemo(() => {
    let result = updates.filter((u) => u.status === "Listed")

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.titleEn.toLowerCase().includes(q) ||
          u.titleAr.toLowerCase().includes(q) ||
          u.collectionId.toLowerCase().includes(q) ||
          (u.listingId ?? "").toLowerCase().includes(q),
      )
    }

    return [...result].sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      return sortDir === "desc" ? diff : -diff
    })
  }, [updates, search, sortDir])

  const handleOpenUpdate = (update: ConstructionUpdate) => {
    setSelectedUpdate(update)
    setShowDrawer(true)
  }

  const handleOpenGallery = (update: ConstructionUpdate, index: number) => {
    setSelectedUpdate(update)
    setGalleryInitialIndex(index)
    setGalleryOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, Collection ID or Listing ID..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          title={sortDir === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          Updated
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {listedUpdates.length} {listedUpdates.length === 1 ? "update" : "updates"}
        {search ? " found" : ""}
      </p>

      {listedUpdates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            {search ? "No updates match your search" : "No listed updates yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {listedUpdates.map((update) => (
            <div
              key={update.id}
              className="border border-blue-200 rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Top bar: IDs + dates */}
              <div className="flex items-center gap-4 px-4 py-2.5 bg-secondary/30 border-b border-border text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground/60">Collection ID:</span>
                  <code className="font-mono text-foreground">{update.collectionId}</code>
                  <CopyButton value={update.collectionId} />
                </span>
                {update.listingId && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground/60">Listing ID:</span>
                      <code className="font-mono text-foreground">{update.listingId}</code>
                      <CopyButton value={update.listingId} />
                    </span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-3 text-[11px]">
                  <span>Created: <span className="text-foreground">{formatDate(update.createdAt)}</span></span>
                  <span>Updated: <span className="text-foreground">{formatDate(update.updatedAt)}</span></span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                {/* Developer + Project row */}
                <div className="flex items-center gap-3 flex-wrap pb-1">
                  <div className="flex items-center gap-2">
                    {update.developerLogo && (
                      <img
                        src={update.developerLogo}
                        alt={update.developerName}
                        className="rounded-full object-cover flex-shrink-0 w-8 h-8"
                      />
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{update.developerName}</span>
                      <span className="text-border">·</span>
                      <code className="font-mono">{update.developerId}</code>
                      <CopyButton value={update.developerId} />
                    </div>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {update.parentProjectName ? (
                        <>{update.parentProjectName} <span className="text-muted-foreground">—</span> {update.projectName}</>
                      ) : update.projectName}
                    </span>
                    <span className="text-border">·</span>
                    <code className="font-mono">{update.projectId}</code>
                    <CopyButton value={update.projectId} />
                  </div>
                </div>

                {/* Title + Listed badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground leading-snug">{update.titleEn}</h3>
                  </div>
                  <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                    Listed
                  </span>
                </div>

                {/* Description with expand */}
                <ExpandableDescription text={update.descriptionEn} />

                {/* Media thumbnails + CTA on same row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {update.media.length > 0 && (
                    <>
                      {update.media.map((media, idx) => (
                        <button
                          key={media.id}
                          onClick={() => handleOpenGallery(update, idx)}
                          className="h-12 w-12 rounded-lg bg-secondary/50 border border-border hover:border-primary overflow-hidden flex items-center justify-center flex-shrink-0 transition-colors"
                        >
                          {media.type === "image" ? (
                            <img
                              src={media.thumbnail || media.url}
                              alt="Media"
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                const t = e.currentTarget
                                t.style.display = "none"
                              }}
                            />
                          ) : (
                            <Film className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {update.media.length} file{update.media.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 bg-transparent"
                      onClick={() => handleOpenUpdate(update)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gallery carousel */}
      {selectedUpdate && (
        <MediaGalleryCarousel
          media={selectedUpdate.media}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          initialIndex={galleryInitialIndex}
        />
      )}

      {/* View-only drawer */}
      {selectedUpdate && (
        <ConstructionUpdateDrawer
          open={showDrawer}
          onOpenChange={setShowDrawer}
          update={selectedUpdate}
        />
      )}
    </div>
  )
}

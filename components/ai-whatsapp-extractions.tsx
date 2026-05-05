"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Copy, Eye, Edit2, Check, Film, ArrowUpDown, ArrowUp, ArrowDown, Search, SlidersHorizontal } from "lucide-react"
import { MediaGalleryCarousel } from "@/components/media-gallery-carousel"
import { ConstructionUpdateDrawer } from "@/components/construction-update-drawer"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ConstructionUpdate } from "@/lib/mock-data"

type SortDir = "desc" | "asc"
type StatusFilter = "Pending Review" | "Rejected" | "Approved Listing" | "Listed"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  "Pending Review": { label: "Pending Review", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  "Rejected":       { label: "Rejected",       className: "border-red-200 bg-red-50 text-red-700" },
  "Approved Listing": { label: "Approved Listing", className: "border-green-200 bg-green-50 text-green-700" },
  "Listed":         { label: "Listed",          className: "border-blue-200 bg-blue-50 text-blue-700" },
}

const CHANGEABLE_STATUSES: Array<ConstructionUpdate["status"]> = ["Pending Review", "Rejected", "Approved Listing"]

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
const LINE_HEIGHT_PX = 20 // approx 1.25rem * 16px

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
      <p
        ref={ref}
        className={cn("leading-5", !expanded && "line-clamp-2")}
      >
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

interface AIWhatsappExtractionsProps {
  updates: ConstructionUpdate[]
  onUpdateChange?: (update: ConstructionUpdate) => void
}

export function AIWhatsappExtractions({ updates, onUpdateChange }: AIWhatsappExtractionsProps) {
  const [selectedUpdate, setSelectedUpdate] = useState<ConstructionUpdate | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null)

  // Search, filter, sort state
  const [search, setSearch] = useState("")
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([])
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // All updates except "Listed" (those live in Listed Updates tab)
  const visibleUpdates = useMemo(() => {
    let result = updates.filter((u) => u.status !== "Listed")

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.titleEn.toLowerCase().includes(q) ||
          u.titleAr.toLowerCase().includes(q) ||
          u.collectionId.toLowerCase().includes(q)
      )
    }

    if (statusFilters.length > 0) {
      result = result.filter((u) => statusFilters.includes(u.status as StatusFilter))
    }

    result = [...result].sort((a, b) => {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      return sortDir === "desc" ? diff : -diff
    })

    return result
  }, [updates, search, statusFilters, sortDir])

  const toggleStatusFilter = (status: StatusFilter) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const handleOpenUpdate = (update: ConstructionUpdate) => {
    setSelectedUpdate(update)
    setShowDrawer(true)
  }

  const handleOpenGallery = (update: ConstructionUpdate, index: number) => {
    setSelectedUpdate(update)
    setGalleryInitialIndex(index)
    setGalleryOpen(true)
  }

  const handleSaveUpdate = (update: ConstructionUpdate) => {
    onUpdateChange?.(update)
    setShowDrawer(false)
  }

  const handleStatusChange = (update: ConstructionUpdate, newStatus: ConstructionUpdate["status"]) => {
    if (newStatus === "Approved Listing") {
      setPendingApproveId(update.id)
      return
    }
    onUpdateChange?.({ ...update, status: newStatus, updatedAt: new Date() })
  }

  const confirmApprove = () => {
    const update = updates.find((u) => u.id === pendingApproveId)
    if (update) {
      const listingId = `LIST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
      onUpdateChange?.({
        ...update,
        status: "Approved Listing",
        listingId,
        updatedAt: new Date(),
      })
    }
    setPendingApproveId(null)
  }

  const pendingApproveUpdate = updates.find((u) => u.id === pendingApproveId)

  return (
    <div className="space-y-4">
      {/* Toolbar: search + filter + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or ID..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 h-9", statusFilters.length > 0 && "border-primary text-primary")}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Status
              {statusFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4">{statusFilters.length}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["Pending Review", "Rejected", "Approved Listing"] as StatusFilter[]).map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusFilters.includes(s)}
                onCheckedChange={() => toggleStatusFilter(s)}
                className="text-sm"
              >
                {s}
              </DropdownMenuCheckboxItem>
            ))}
            {statusFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => setStatusFilters([])}
                  className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 text-left"
                >
                  Clear filters
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort toggle */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
          title={sortDir === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          Updated
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {visibleUpdates.length} {visibleUpdates.length === 1 ? "update" : "updates"}{search || statusFilters.length > 0 ? " found" : ""}
      </p>

      {/* Cards */}
      {visibleUpdates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">No updates match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleUpdates.map((update) => {
            const isApproved = update.status === "Approved Listing"
            const cfg = STATUS_CONFIG[update.status]

            return (
              <div
                key={update.id}
                className={cn(
                  "border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-md",
                  isApproved ? "border-green-200" : "border-border"
                )}
              >
                {/* Top bar: IDs */}
                <div className="flex items-center gap-4 px-4 py-2.5 bg-secondary/30 border-b border-border text-xs text-muted-foreground">
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
                          className="rounded-full object-cover flex-shrink-0 font-extrabold leading-10 w-8 h-8"
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

                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-snug">{update.titleEn}</h3>
                    </div>

                    {/* Status selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn("flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity", cfg.className)}>
                          {cfg.label}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs">Change status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {CHANGEABLE_STATUSES.map((s) => {
                          const c = STATUS_CONFIG[s]
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(update, s)}
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors text-left",
                                update.status === s && "font-medium"
                              )}
                            >
                              <span className={cn("h-2 w-2 rounded-full border flex-shrink-0", c.className)} />
                              {c.label}
                              {update.status === s && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                            </button>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                                  t.parentElement?.classList.add("bg-secondary")
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
                        {isApproved ? (
                          <><Eye className="h-3.5 w-3.5" />View</>
                        ) : (
                          <><Edit2 className="h-3.5 w-3.5" />View / Edit</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approve confirmation dialog */}
      <AlertDialog open={!!pendingApproveId} onOpenChange={(o) => { if (!o) setPendingApproveId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve for Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This construction update{pendingApproveUpdate ? ` "${pendingApproveUpdate.titleEn}"` : ""} will be published to{" "}
              <strong>Nawy Listing</strong> and <strong>E-realty</strong> platforms. Are you sure you want to publish it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>Yes, Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gallery carousel */}
      {selectedUpdate && (
        <MediaGalleryCarousel
          media={selectedUpdate.media}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          initialIndex={galleryInitialIndex}
        />
      )}

      {/* Update drawer */}
      {selectedUpdate && (
        <ConstructionUpdateDrawer
          open={showDrawer}
          onOpenChange={setShowDrawer}
          update={selectedUpdate}
          onSave={handleSaveUpdate}
          onStatusChange={(newStatus) => handleStatusChange(selectedUpdate, newStatus)}
        />
      )}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { GripVertical, ImagePlus, Play, Trash2, Eye, Video } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { IdTag } from "@/components/table-kit"
import { FullscreenViewer } from "@/components/render-images-page"
import { fmtDateTime } from "@/components/projects-list-page"
import type { ProjectRow } from "@/lib/projects-mock"

type MediaKind = "Image" | "Video"
type MediaStatus = "Active" | "Hidden"
type GalleryItem = {
  id: string
  kind: MediaKind
  src: string
  /** Videos show a poster frame in the grid. */
  poster?: string
  status: MediaStatus
  createdAt: string
  updatedAt: string
}

const POOL = [
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg",
  "/modern-apartment-building.png",
]

/** Deterministic per-project gallery — a project's own media only (never its phases'). */
function galleryFor(project?: Partial<ProjectRow>): GalleryItem[] {
  const seed = [...(project?.id ?? "PRJ-0001")].reduce((s, c) => s + c.charCodeAt(0), 0)
  const n = 5 + (seed % 4)
  return Array.from({ length: n }, (_, i) => {
    const isVideo = (seed + i) % 4 === 3
    const day = String(2 + ((seed + i * 3) % 26)).padStart(2, "0")
    return {
      id: `MED-${String(1000 + ((seed * 7 + i * 13) % 900))}`,
      kind: isVideo ? "Video" : "Image",
      src: POOL[(seed + i) % POOL.length],
      poster: isVideo ? POOL[(seed + i + 1) % POOL.length] : undefined,
      status: (seed + i) % 5 === 2 ? "Hidden" : "Active",
      createdAt: `2026-03-${day}T09:30:00Z`,
      updatedAt: `2026-05-${day}T14:00:00Z`,
    }
  })
}

const STATUS_TONE: Record<MediaStatus, string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Hidden: "border-red-200 bg-red-50 text-red-600",
}

/**
 * Project Gallery — the project's own images and videos. Cards are drag-reorderable,
 * each carries its id, status and timestamps, and can be deleted or toggled
 * Active/Hidden. Bulk selection mirrors the other card grids.
 */
export function ProjectGalleryTab({ project }: { project?: Partial<ProjectRow> }) {
  const [items, setItems] = useState<GalleryItem[]>(() => galleryFor(project))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<number | null>(null)

  const images = useMemo(() => items.map((it) => it.poster ?? it.src), [items])
  const counts = {
    images: items.filter((i) => i.kind === "Image").length,
    videos: items.filter((i) => i.kind === "Video").length,
    hidden: items.filter((i) => i.status === "Hidden").length,
  }

  const stamp = () => new Date().toISOString()
  const toggleSel = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const setStatus = (ids: string[], status: MediaStatus) => {
    setItems((prev) => prev.map((it) => (ids.includes(it.id) ? { ...it, status, updatedAt: stamp() } : it)))
    toast.success(`${ids.length} item${ids.length !== 1 ? "s" : ""} set to ${status}`)
  }
  const remove = (ids: string[]) => {
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)))
    setSelected(new Set())
    toast.success(`${ids.length} item${ids.length !== 1 ? "s" : ""} deleted`)
  }
  const addMedia = (kind: MediaKind) => {
    const i = items.length
    setItems((prev) => [...prev, {
      id: `MED-${String(2000 + i)}`,
      kind,
      src: POOL[i % POOL.length],
      poster: kind === "Video" ? POOL[(i + 1) % POOL.length] : undefined,
      status: "Hidden",
      createdAt: stamp(),
      updatedAt: stamp(),
    }])
    toast.success(`${kind} added — Hidden until you activate it`)
  }
  /** Drop `dragId` at the position of `targetId`. */
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return setDragId(null)
    setItems((prev) => {
      const arr = [...prev]
      const from = arr.findIndex((x) => x.id === dragId)
      const to = arr.findIndex((x) => x.id === targetId)
      if (from === -1 || to === -1) return prev
      arr.splice(to, 0, ...arr.splice(from, 1))
      return arr
    })
    setDragId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — counts + add actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Project Gallery</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{items.length}</span>
          <span className="text-xs text-muted-foreground">
            {counts.images} image{counts.images !== 1 ? "s" : ""} · {counts.videos} video{counts.videos !== 1 ? "s" : ""} · {counts.hidden} hidden
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => addMedia("Video")}>
            <Video className="h-3.5 w-3.5" />Add Video
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => addMedia("Image")}>
            <ImagePlus className="h-3.5 w-3.5" />Add Image
          </Button>
        </div>
      </div>

      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        This project's own media only — phases keep their own galleries. Drag a card to reorder; the order is what the website shows.
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border py-12 text-center text-sm text-muted-foreground">
          No media yet — add an image or a video to start the gallery.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it, i) => (
            <div
              key={it.id}
              draggable
              onDragStart={() => setDragId(it.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(it.id)}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "group overflow-hidden rounded-xl border bg-card transition-colors",
                selected.has(it.id) ? "border-primary/50 ring-1 ring-primary/30" : "border-border",
                dragId === it.id && "opacity-50",
              )}
            >
              {/* Media — click to open the fullscreen viewer */}
              <div className="relative">
                <button type="button" onClick={() => setViewer(i)} className="block w-full">
                  <img src={it.poster ?? it.src} alt="" className="h-36 w-full object-cover" />
                  {it.kind === "Video" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"><Play className="h-4 w-4" /></span>
                    </span>
                  )}
                </button>
                {/* Select + drag handle top-left, status tag top-right */}
                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 shadow-sm">
                    <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggleSel(it.id)} className="h-3.5 w-3.5" />
                  </span>
                  <span title="Drag to reorder" className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-white/90 text-muted-foreground shadow-sm">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                </div>
                <span className={cn("absolute right-2 top-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", STATUS_TONE[it.status])}>
                  {it.status}
                </span>
              </div>

              {/* Meta — id, kind, timestamps, per-card actions */}
              <div className="space-y-1.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <IdTag value={it.id} />
                    <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{it.kind}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Created {fmtDateTime(it.createdAt)}</p>
                <p className="text-[10px] text-muted-foreground">Updated {fmtDateTime(it.updatedAt)}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Button
                    variant="outline" size="sm" className="h-7 flex-1 gap-1 text-[11px]"
                    onClick={() => setStatus([it.id], it.status === "Active" ? "Hidden" : "Active")}
                  >
                    <Eye className="h-3 w-3" />{it.status === "Active" ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="outline" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Delete" onClick={() => remove([it.id])}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk bar — status + delete for the selected cards */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="font-medium">{selected.size} selected</span>
          <span className="h-5 w-px bg-zinc-700" />
          <button className="hover:text-emerald-300" onClick={() => setStatus([...selected], "Active")}>Set Active</button>
          <span className="h-5 w-px bg-zinc-700" />
          <button className="hover:text-red-300" onClick={() => setStatus([...selected], "Hidden")}>Set Hidden</button>
          <span className="h-5 w-px bg-zinc-700" />
          <button className="hover:text-red-300" onClick={() => remove([...selected])}>Delete</button>
          <span className="h-5 w-px bg-zinc-700" />
          <button className="text-zinc-400 hover:text-white" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {viewer !== null && (
        <FullscreenViewer
          images={images}
          startIndex={viewer}
          onClose={() => setViewer(null)}
          label={items[viewer]?.kind === "Video" ? "Video" : "Image"}
          caption={items[viewer]?.id}
        />
      )}
    </div>
  )
}

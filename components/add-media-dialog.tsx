"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Search, UploadCloud, Maximize2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const imagePool = [
  "/aerial-view-masterplan-residential-development-blu.jpg", "/luxury-clubhouse-exterior.jpg",
  "/placeholder.jpg", "/placeholder-logo.png", "/placeholder-user.jpg",
]

interface WaItem { id: string; name: string; url: string; from: string }
const WHATSAPP_LIBRARY: WaItem[] = [
  { id: "wa-1", name: "Floor layout — 2BR", url: imagePool[2], from: "Sales Group A" },
  { id: "wa-2", name: "Unit photo — living", url: imagePool[1], from: "Sales Group A" },
  { id: "wa-3", name: "Aerial shot", url: imagePool[0], from: "Marketing" },
  { id: "wa-4", name: "Brochure page 3", url: imagePool[2], from: "Developer Feed" },
  { id: "wa-5", name: "Pool & landscape", url: imagePool[0], from: "Marketing" },
  { id: "wa-6", name: "Clubhouse render", url: imagePool[1], from: "Developer Feed" },
  { id: "wa-7", name: "Roof plan", url: imagePool[2], from: "Sales Group B" },
  { id: "wa-8", name: "Entrance gate", url: imagePool[1], from: "Sales Group B" },
]

export function AddMediaDialog({
  open, onClose, label, onAdd,
}: {
  open: boolean
  onClose: () => void
  label: string
  onAdd: (urls: string[]) => void
}) {
  const [tab, setTab] = useState("upload")
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => { if (open) { setTab("upload"); setQ(""); setPicked(new Set()); setUploads([]); setLightbox(null) } }, [open])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return n ? WHATSAPP_LIBRARY.filter((w) => `${w.name} ${w.from}`.toLowerCase().includes(n)) : WHATSAPP_LIBRARY
  }, [q])

  const toggle = (id: string) => setPicked((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s })
  const simulateUpload = () => setUploads((u) => [...u, imagePool[u.length % imagePool.length]])

  const confirm = () => {
    const urls = tab === "upload" ? uploads : WHATSAPP_LIBRARY.filter((w) => picked.has(w.id)).map((w) => w.url)
    if (urls.length) onAdd(urls)
    onClose()
  }
  const count = tab === "upload" ? uploads.length : picked.size

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Add {label}s</DialogTitle>
          <DialogDescription>Upload from your device or pick from the WhatsApp library.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="px-6 pt-3">
          <TabsList>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp library</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3">
            <button onClick={simulateUpload} className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border py-12 transition-colors hover:border-primary/40 hover:bg-muted/20">
              <UploadCloud className="h-7 w-7 text-primary" />
              <p className="text-sm"><span className="font-medium text-primary">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-muted-foreground">PNG, JPG or PDF</p>
            </button>
            {uploads.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {uploads.map((u, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-border"><img src={u} alt="" className="aspect-video w-full object-cover" /></div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-3">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search WhatsApp media…" className="h-8 pl-8 text-sm" />
            </div>
            <div className="grid max-h-[44vh] grid-cols-3 gap-3 overflow-y-auto">
              {filtered.map((w) => {
                const on = picked.has(w.id)
                return (
                  <div key={w.id} onClick={() => toggle(w.id)} className={cn("group relative cursor-pointer overflow-hidden rounded-lg border text-left transition-all", on ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
                    <img src={w.url} alt={w.name} className="aspect-video w-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setLightbox(w.url) }} className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow transition-opacity hover:bg-black/75 group-hover:opacity-100" title="View full screen"><Maximize2 className="h-3 w-3" /></button>
                    <div className="px-1.5 py-1"><p className="truncate text-[11px] font-medium">{w.name}</p><p className="truncate text-[10px] text-muted-foreground">{w.from}</p></div>
                    {on && <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"><Check className="h-3 w-3" /></div>}
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="col-span-3 py-8 text-center text-sm text-muted-foreground">No matches</p>}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-border px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={count === 0} onClick={confirm}>Add{count > 0 ? ` ${count}` : ""}</Button>
        </DialogFooter>

        {/* Full-screen preview */}
        {lightbox && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-8" onClick={() => setLightbox(null)}>
            <button onClick={() => setLightbox(null)} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" title="Close">
              <X className="h-5 w-5" />
            </button>
            <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

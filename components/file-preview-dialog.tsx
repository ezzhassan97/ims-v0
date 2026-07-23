"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, FileImage, FileSpreadsheet, FileText, FileVideo, Play, ZoomIn, ZoomOut } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IdTag } from "@/components/table-kit"
import { cn } from "@/lib/utils"

// ── Shared large file preview — images (zoom), PDF, video, sheets/CSV (tabbed grid) ──

export type PreviewFileType = "Image" | "Video" | "Sheet" | "Document"

export interface PreviewFile {
  id: string
  name: string
  ext: string
  typeGroup: PreviewFileType
  url?: string
  size?: number
}

const TYPE_TONE: Record<PreviewFileType, string> = {
  Image: "bg-sky-50 text-sky-700 border-sky-200",
  Video: "bg-purple-50 text-purple-700 border-purple-200",
  Sheet: "bg-green-50 text-green-700 border-green-200",
  Document: "bg-rose-50 text-rose-700 border-rose-200",
}
const TYPE_ICON: Record<PreviewFileType, React.ReactNode> = {
  Image: <FileImage className="h-4 w-4 text-sky-600" />,
  Video: <FileVideo className="h-4 w-4 text-purple-600" />,
  Sheet: <FileSpreadsheet className="h-4 w-4 text-green-600" />,
  Document: <FileText className="h-4 w-4 text-rose-600" />,
}

function fmtBytes(b?: number) {
  if (!b) return null
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  return `${Math.round(b / 1_000)} KB`
}

// ── Image: zoom in / out / reset ──────────────────────────────────────────────

function ImagePane({ file }: { file: PreviewFile }) {
  const [zoom, setZoom] = useState(1)
  const src = file.url ?? "/aerial-view-masterplan-residential-development-blu.jpg"
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto bg-muted/40 p-6">
        <div className="flex min-h-full items-center justify-center">
          {/* flex-shrink-0 + max-w-none: otherwise the flex layout cancels the zoom width */}
          <img src={src} alt={file.name} style={{ width: `${zoom * 100}%` }} className="max-w-none flex-shrink-0 rounded-lg border border-border object-contain shadow-sm" />
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-2.5">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <button className="w-14 text-center font-mono text-xs text-muted-foreground hover:text-foreground" onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}><ZoomIn className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  )
}

// ── PDF: mock paginated document viewer with zoom ─────────────────────────────

function PdfPane({ file }: { file: PreviewFile }) {
  const pages = 4 + (file.id.length % 8)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto bg-muted/40 p-6">
        <div className="mx-auto rounded-md border border-border bg-white shadow-sm" style={{ width: `${Math.min(92, 58 * zoom)}%` }}>
          <div className="aspect-[1/1.35] space-y-3 p-8">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-5/6 rounded bg-muted/70" />
            <div className="mt-5 h-36 w-full rounded bg-muted/50" />
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-4/6 rounded bg-muted/70" />
            <div className="h-3 w-5/6 rounded bg-muted/70" />
            <p className="pt-3 text-center font-mono text-[10px] text-muted-foreground">{file.name} — page {page} of {pages}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center justify-center gap-3 border-t border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <span className="w-20 text-center font-mono text-xs text-muted-foreground">Page {page} / {pages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
        <span className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <button className="w-14 text-center font-mono text-xs text-muted-foreground hover:text-foreground" onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  )
}

// ── Video: mock player chrome ─────────────────────────────────────────────────

function VideoPane({ file }: { file: PreviewFile }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-zinc-950 p-6">
      <div className="w-full max-w-4xl">
        <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <img src={file.url ?? "/luxury-clubhouse-exterior.jpg"} alt={file.name} className={cn("h-full w-full object-cover", playing ? "opacity-80" : "opacity-50")} />
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="absolute inset-0 flex items-center justify-center"
          >
            {!playing && (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-105">
                <Play className="ml-1 h-7 w-7 text-zinc-900" />
              </span>
            )}
          </button>
          {/* Timeline */}
          <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
              <div className={cn("h-full rounded-full bg-white transition-all duration-700", playing ? "w-1/3" : "w-0")} />
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-white/80">
              <span>{playing ? "00:41" : "00:00"}</span>
              <span>02:05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sheet / CSV: tabbed spreadsheet grid ──────────────────────────────────────

interface MockSheet { name: string; columns: string[]; rows: (string | number)[][] }

function mockSheetsFor(file: PreviewFile): MockSheet[] {
  const floors = ["Second", "Third", "Fourth", "Fifth"]
  const clinics: MockSheet = {
    name: "NEXUS Clinics",
    columns: ["Building", "Unit", "Floor", "Unit Type", "Unit Area (SQM)", "No Of Exam Rooms", "Unit Price (L.E)"],
    rows: Array.from({ length: 16 }, (_, i) => {
      const floor = 2 + Math.floor(i / 5)
      const num = (i % 5) * 3 + 2
      const area = 65 + ((i * 13) % 55)
      return [`N10`, `N10-0${floor}-${String(num).padStart(2, "0")}`, floors[floor - 2], "Clinic", area, area > 100 ? 2 : 1, area * 221000 + i * 4600]
    }),
  }
  const availability: MockSheet = {
    name: "Availability",
    columns: ["Unit", "Status", "Down Payment", "Installments", "Delivery"],
    rows: Array.from({ length: 12 }, (_, i) => [
      `N10-0${2 + (i % 3)}-${String((i * 2) % 15 + 1).padStart(2, "0")}`,
      i % 4 === 0 ? "Hold" : "Available",
      `${5 + (i % 3) * 5}%`,
      `${6 + (i % 4)} years`,
      `Q${(i % 4) + 1} 202${7 + (i % 2)}`,
    ]),
  }
  const summary: MockSheet = {
    name: "Summary",
    columns: ["Metric", "Value"],
    rows: [["Total Units", 17], ["Available", 13], ["On Hold", 4], ["Avg. Price (L.E)", "19,845,000"], ["File", file.name]],
  }
  return [clinics, availability, summary]
}

const COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function SheetPane({ file }: { file: PreviewFile }) {
  const sheets = mockSheetsFor(file)
  const [active, setActive] = useState(0)
  const sheet = sheets[active]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sheet tabs */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-border bg-card px-4 pt-2">
        {sheets.map((s, i) => (
          <button
            key={s.name} type="button" onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              i === active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.name}
            <span className={cn(
              "rounded-md border px-1.5 py-0 text-[10px] font-medium",
              i === active ? "border-blue-200 bg-blue-100 text-blue-700" : "border-border bg-muted text-muted-foreground",
            )}>
              {s.rows.length}
            </span>
          </button>
        ))}
      </div>
      {/* Grid */}
      <div className="flex-1 overflow-auto bg-card">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="sticky top-0 z-10 w-10 border-b border-r border-border bg-muted/60 px-2 py-1.5 text-center font-mono text-[10px] font-normal text-muted-foreground">#</th>
              {sheet.columns.map((_, ci) => (
                <th key={ci} className="sticky top-0 z-10 border-b border-r border-border bg-muted/60 px-3 py-1.5 text-center font-mono text-[10px] font-normal text-muted-foreground">{COL_LETTERS[ci]}</th>
              ))}
            </tr>
            <tr>
              <td className="border-b border-r border-border bg-muted/30 px-2 py-2 text-center font-mono text-[10px] text-muted-foreground">0</td>
              {sheet.columns.map((c) => (
                <td key={c} className="whitespace-nowrap border-b border-r border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground">{c}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/20">
                <td className="border-b border-r border-border/70 bg-muted/20 px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className="whitespace-nowrap border-b border-r border-border/70 px-3 py-1.5 text-sm text-foreground">{typeof cell === "number" ? cell.toLocaleString() : cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Large in-app preview for any file type — no new tab, no download.
 * Images zoom, PDFs page + zoom, videos play (mock), sheets show tabbed grids.
 */
export function FilePreviewDialog({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const size = fmtBytes(file.size)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] !w-[92vw] !max-w-[1400px] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-card py-3 pl-5 pr-14">
          {TYPE_ICON[file.typeGroup]}
          <DialogTitle className="truncate text-sm font-semibold text-foreground">{file.name}</DialogTitle>
          <IdTag value={file.id} />
          <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", TYPE_TONE[file.typeGroup])}>{file.typeGroup}</span>
          {size && <span className="font-mono text-[11px] text-muted-foreground">{size}</span>}
        </div>
        {/* Body by type */}
        {file.typeGroup === "Image" && <ImagePane file={file} />}
        {file.typeGroup === "Document" && <PdfPane file={file} />}
        {file.typeGroup === "Video" && <VideoPane file={file} />}
        {file.typeGroup === "Sheet" && <SheetPane file={file} />}
      </DialogContent>
    </Dialog>
  )
}

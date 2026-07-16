"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Check, Hand, MapPin, Minus, PenLine, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { IdTag } from "@/components/table-kit"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ── Geometry model ─────────────────────────────────────────────────────────────
export interface Pt { x: number; y: number }
export type GeoLevel = "District" | "Area" | "Subarea" | "Project" | "Phase"
/** Flattened geo entity handed to the global map. */
export interface GeoRef { id: string; name: string; level: GeoLevel; status: "Active" | "Hidden"; pin: Pt | null; polygon: Pt[] | null }
export interface MapLocation { id: string; name: string; kind: string; center: Pt }

export const LEVEL_COLOR: Record<GeoLevel, string> = { District: "#2563eb", Area: "#059669", Subarea: "#d97706", Project: "#7c3aed", Phase: "#0891b2" }

/** Deterministic blob polygon for mock geometry (no Math.random — SSR-hydration safe). */
const BLOB_RM = [1, 0.82, 1.12, 0.9, 1.06, 0.8]
export const blobPolygon = (cx: number, cy: number, r: number): Pt[] =>
  BLOB_RM.map((m, i) => {
    const a = (i * 60 * Math.PI) / 180
    return { x: Math.round(cx + Math.cos(a) * r * m), y: Math.round(cy + Math.sin(a) * r * m * 0.72) }
  })

export function centroid(polygon: Pt[] | null, pin: Pt | null): Pt {
  if (polygon && polygon.length > 0) {
    return {
      x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length,
      y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length,
    }
  }
  return pin ?? { x: 500, y: 350 }
}

const ptsStr = (pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(" ")

/** Ray-casting point-in-polygon test. */
function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function LevelChip({ level }: { level: GeoLevel }) {
  const c = LEVEL_COLOR[level]
  return (
    <span
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}14` }}
    >
      {level}
    </span>
  )
}

// ── Mock basemap (Mapbox-style, fully offline) ────────────────────────────────
const MAP_W = 1000
const MAP_H = 700

function Basemap() {
  return (
    <g>
      <rect x={-2000} y={-2000} width={MAP_W + 4000} height={MAP_H + 4000} fill="#E9ECEE" />
      <rect width={MAP_W} height={MAP_H} fill="#EFEDE5" />
      {/* Mediterranean along the top */}
      <path d="M0,0 H1000 V55 C820,95 640,58 470,86 C300,114 140,82 0,102 Z" fill="#A8D3F2" />
      {/* Gulf of Suez, bottom-right corner */}
      <path d="M1000,700 V510 C948,556 916,618 878,700 Z" fill="#A8D3F2" />
      {/* The Nile */}
      <path d="M470,86 C482,190 438,300 460,420 C480,540 438,618 450,700" fill="none" stroke="#A8D3F2" strokeWidth={18} strokeLinecap="round" />
      {/* Parks / green patches */}
      <ellipse cx={598} cy={205} rx={44} ry={24} fill="#CDE6C3" />
      <ellipse cx={318} cy={522} rx={52} ry={28} fill="#CDE6C3" />
      <ellipse cx={782} cy={302} rx={34} ry={20} fill="#CDE6C3" />
      <ellipse cx={130} cy={260} rx={38} ry={22} fill="#CDE6C3" />
      {/* Minor street grid */}
      {Array.from({ length: 19 }, (_, i) => (i + 1) * 50).map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={MAP_H} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.85} />
      ))}
      {Array.from({ length: 13 }, (_, i) => (i + 1) * 50).map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={MAP_W} y2={y} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.85} />
      ))}
      {/* Arterial roads */}
      <path d="M380,242 C520,178 662,222 700,320 C722,420 560,482 440,442 C358,412 338,300 380,242 Z" fill="none" stroke="#F4D98E" strokeWidth={6} strokeLinecap="round" />
      <path d="M470,252 C620,238 780,268 990,298" fill="none" stroke="#F4D98E" strokeWidth={5} strokeLinecap="round" />
      <path d="M430,300 C340,248 262,190 210,118" fill="none" stroke="#F4D98E" strokeWidth={5} strokeLinecap="round" />
      <path d="M60,652 C200,560 330,470 428,336" fill="none" stroke="#F4D98E" strokeWidth={5} strokeLinecap="round" />
      <path d="M520,420 C640,498 720,556 806,624" fill="none" stroke="#F4D98E" strokeWidth={5} strokeLinecap="round" />
      {/* Labels */}
      <text x={70} y={38} fontSize={15} fill="#5E97C4" fontStyle="italic">Mediterranean Sea</text>
      <text x={890} y={648} fontSize={12} fill="#5E97C4" fontStyle="italic" textAnchor="middle" transform="rotate(-52 890 648)">Gulf of Suez</text>
      <text x={608} y={252} fontSize={11} fill="#9AA3AB" fontStyle="italic" transform="rotate(8 608 252)">Cairo – Suez Rd</text>
      <text x={300} y={205} fontSize={11} fill="#9AA3AB" fontStyle="italic" transform="rotate(-33 300 205)">Cairo – Alex Desert Rd</text>
      <text x={585} y={480} fontSize={11} fill="#9AA3AB" fontStyle="italic" transform="rotate(3 585 480)">Ring Rd</text>
      <text x={640} y={510} fontSize={11} fill="#9AA3AB" fontStyle="italic" transform="rotate(33 640 510)">Sokhna Rd</text>
    </g>
  )
}

// ── Map viewport ───────────────────────────────────────────────────────────────
export interface MapView { cx: number; cy: number; zoom: number }
type PtHandler = (p: Pt, e: React.PointerEvent, mapPerPx: number) => void

function MapSvg({ view, onDown, onMove, onUp, cursor, children }: {
  view: MapView
  onDown?: PtHandler
  onMove?: PtHandler
  onUp?: () => void
  cursor?: string
  children?: React.ReactNode
}) {
  const ref = useRef<SVGSVGElement>(null)
  const vb = { x: view.cx - MAP_W / 2 / view.zoom, y: view.cy - MAP_H / 2 / view.zoom, w: MAP_W / view.zoom, h: MAP_H / view.zoom }
  // preserveAspectRatio="slice" → uniform scale that fills the box, centered crop
  const cvt = (e: React.PointerEvent): [Pt, number] => {
    const r = ref.current!.getBoundingClientRect()
    const s = Math.max(r.width / vb.w, r.height / vb.h)
    const ox = vb.x + (vb.w - r.width / s) / 2
    const oy = vb.y + (vb.h - r.height / s) / 2
    return [{ x: ox + (e.clientX - r.left) / s, y: oy + (e.clientY - r.top) / s }, 1 / s]
  }
  return (
    <svg
      ref={ref}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full touch-none select-none"
      style={{ cursor: cursor ?? "grab" }}
      onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} const [p, mpp] = cvt(e); onDown?.(p, e, mpp) }}
      onPointerMove={(e) => { const [p, mpp] = cvt(e); onMove?.(p, e, mpp) }}
      onPointerUp={() => onUp?.()}
    >
      <Basemap />
      {children}
    </svg>
  )
}

function ZoomControls({ onZoom }: { onZoom: (f: number) => void }) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm">
      <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-secondary" onClick={() => onZoom(1.5)} title="Zoom in">
        <Plus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border" />
      <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-secondary" onClick={() => onZoom(1 / 1.5)} title="Zoom out">
        <Minus className="h-4 w-4" />
      </button>
    </div>
  )
}

function Attribution() {
  return (
    <div className="pointer-events-none absolute bottom-1.5 left-2 z-10 rounded bg-background/75 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      Basemap © Mapbox · mock preview
    </div>
  )
}

function MapSearch({ locations, onGo, className }: { locations: MapLocation[]; onGo: (l: MapLocation) => void; className?: string }) {
  const [q, setQ] = useState("")
  const matches = q.trim()
    ? locations.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()) || l.id.includes(q.trim())).slice(0, 8)
    : []
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or areas…" className="h-8 bg-background pl-8 text-sm shadow-sm" />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 top-9 z-30 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {matches.map((m) => (
            <button
              key={`${m.kind}-${m.id}`}
              type="button"
              onClick={() => { onGo(m); setQ("") }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-secondary"
            >
              <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">{m.kind} · ID: {m.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PinMarker({ pt, color, zoom, onPointerDown, cursor }: {
  pt: Pt; color: string; zoom: number; onPointerDown?: () => void; cursor?: string
}) {
  const k = 1.1 / zoom
  return (
    <g
      transform={`translate(${pt.x},${pt.y}) scale(${k})`}
      onPointerDown={onPointerDown}
      style={{ cursor: cursor ?? (onPointerDown ? "pointer" : undefined) }}
    >
      <path d="M0,0 C-6,-9 -10,-12.5 -10,-17 A10,10 0 1,1 10,-17 C10,-12.5 6,-9 0,0 Z" fill={color} stroke="#fff" strokeWidth={1.5} />
      <circle cx={0} cy={-17} r={3.6} fill="#fff" />
    </g>
  )
}

const zoomFor = (kind: string) => (kind === "District" ? 1.8 : kind === "Project" ? 3.2 : kind === "Subarea" ? 3.6 : 2.6)

function ToolBtn({ icon: Icon, label, active, onClick }: { icon: typeof Hand; label: string; active?: boolean; onClick: () => void }) {
  return (
    <Button
      type="button" variant="outline" size="sm" onClick={onClick}
      className={cn("h-8 gap-1.5 px-2.5 text-xs", active && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

type DragState =
  | { t: "pan"; sx: number; sy: number; cx0: number; cy0: number; mpp: number }
  | { t: "pin"; key?: string }
  | { t: "v"; i: number; key?: string }
  | null

// ── Per-entity draw dialog ─────────────────────────────────────────────────────
export function MapDrawDialog({ name, level, entityId, pin: pin0, polygon: polygon0, locations, backdrop = [], onSave, onClose }: {
  name: string
  level: GeoLevel
  entityId: string
  pin: Pt | null
  polygon: Pt[] | null
  locations: MapLocation[]
  /** Parent geometry rendered faintly for orientation. */
  backdrop?: { pts: Pt[]; color: string }[]
  onSave: (pin: Pt | null, polygon: Pt[] | null) => void
  onClose: () => void
}) {
  const color = LEVEL_COLOR[level]
  const [pin, setPin] = useState<Pt | null>(pin0)
  const [poly, setPoly] = useState<Pt[] | null>(polygon0)
  const [draft, setDraft] = useState<Pt[] | null>(null)
  const [mode, setMode] = useState<"pan" | "pin" | "draw">("pan")
  const [view, setView] = useState<MapView>(() => {
    const c = centroid(polygon0, pin0)
    return { cx: c.x, cy: c.y, zoom: polygon0 || pin0 ? zoomFor(level) : 1 }
  })
  const [error, setError] = useState<string | null>(null)
  const dragRef = useRef<DragState>(null)

  // Any geometry change may resolve the pin-outside-polygon error
  useEffect(() => { setError(null) }, [pin, poly])

  const zoomBy = (f: number) => setView((v) => ({ ...v, zoom: Math.min(8, Math.max(0.75, v.zoom * f)) }))

  const trySave = () => {
    if (pin && poly && poly.length >= 3 && !pointInPolygon(pin, poly)) {
      setError(`The ${level.toLowerCase()} pin must be inside its polygon — move the pin inside the drawn boundary, then save.`)
      return
    }
    onSave(pin, poly)
  }

  const down: PtHandler = (p, e, mpp) => {
    if (dragRef.current) return // a pin/vertex handle claimed this pointer
    if (mode === "pin") { setPin(p); return }
    if (mode === "draw") { setDraft((d) => [...(d ?? []), p]); return }
    dragRef.current = { t: "pan", sx: e.clientX, sy: e.clientY, cx0: view.cx, cy0: view.cy, mpp }
  }
  const move: PtHandler = (p, e) => {
    const d = dragRef.current
    if (!d) return
    if (d.t === "pan") setView((v) => ({ ...v, cx: d.cx0 - (e.clientX - d.sx) * d.mpp, cy: d.cy0 - (e.clientY - d.sy) * d.mpp }))
    else if (d.t === "pin") setPin(p)
    else if (d.t === "v") setPoly((ps) => (ps ? ps.map((q, i) => (i === d.i ? p : q)) : ps))
  }

  const hint =
    mode === "pin" ? "Click the map to place the pin — drag it anytime to adjust."
    : mode === "draw" ? (draft && draft.length >= 3 ? "Keep adding vertices, or press Finish polygon to close it." : "Click the map to add polygon vertices (at least 3).")
    : "Drag to pan. Drag the pin or polygon vertices to adjust. One pin and one polygon per record."

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[84vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-semibold">Draw on Map — {name}</DialogTitle>
          <LevelChip level={level} />
          <IdTag value={entityId} className="text-[11px]" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          <MapSearch locations={locations} onGo={(l) => setView({ cx: l.center.x, cy: l.center.y, zoom: zoomFor(l.kind) })} className="w-64" />
          <div className="mx-1 h-5 w-px bg-border" />
          <ToolBtn icon={Hand} label="Pan" active={mode === "pan"} onClick={() => { setMode("pan"); setDraft(null) }} />
          <ToolBtn icon={MapPin} label="Pin" active={mode === "pin"} onClick={() => setMode("pin")} />
          <ToolBtn icon={PenLine} label="Polygon" active={mode === "draw"} onClick={() => { setMode("draw"); setDraft([]) }} />
          {mode === "draw" && (
            <>
              <Button size="sm" className="h-8 gap-1 px-2.5 text-xs" disabled={!draft || draft.length < 3}
                onClick={() => { setPoly(draft); setDraft(null); setMode("pan") }}>
                <Check className="h-3.5 w-3.5" />Finish polygon
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setDraft(null); setMode("pan") }}>
                <X className="mr-1 h-3.5 w-3.5" />Cancel
              </Button>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {pin && (
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setPin(null)}>
                <Trash2 className="h-3.5 w-3.5" />Remove pin
              </Button>
            )}
            {poly && (
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setPoly(null)}>
                <Trash2 className="h-3.5 w-3.5" />Remove polygon
              </Button>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#EFEDE5]">
          <MapSvg view={view} onDown={down} onMove={move} onUp={() => (dragRef.current = null)} cursor={mode === "pan" ? "grab" : "crosshair"}>
            {backdrop.map((b, i) => (
              <polygon key={i} points={ptsStr(b.pts)} fill={b.color} fillOpacity={0.06} stroke={b.color} strokeOpacity={0.55}
                strokeWidth={1.2 / view.zoom} strokeDasharray={`${6 / view.zoom} ${5 / view.zoom}`} />
            ))}
            {poly && (
              <g>
                <polygon points={ptsStr(poly)} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2 / view.zoom} />
                {poly.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5 / view.zoom} fill="#fff" stroke={color} strokeWidth={2 / view.zoom}
                    style={{ cursor: "move" }} onPointerDown={() => { dragRef.current = { t: "v", i } }} />
                ))}
              </g>
            )}
            {draft && draft.length > 0 && (
              <g>
                <polyline points={ptsStr(draft)} fill="none" stroke={color} strokeWidth={2 / view.zoom} strokeDasharray={`${5 / view.zoom} ${4 / view.zoom}`} />
                {draft.length >= 3 && (
                  <line x1={draft[draft.length - 1].x} y1={draft[draft.length - 1].y} x2={draft[0].x} y2={draft[0].y}
                    stroke={color} strokeOpacity={0.4} strokeWidth={1.5 / view.zoom} strokeDasharray={`${3 / view.zoom} ${3 / view.zoom}`} />
                )}
                {draft.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4.5 / view.zoom} fill={color} stroke="#fff" strokeWidth={1.5 / view.zoom} />
                ))}
              </g>
            )}
            {pin && <PinMarker pt={pin} color={color} zoom={view.zoom} cursor="move" onPointerDown={() => { dragRef.current = { t: "pin" } }} />}
          </MapSvg>
          <ZoomControls onZoom={zoomBy} />
          <Attribution />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          {error ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
          <div className="flex flex-shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={trySave}>Save Geometry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Global map (90% dialog): all layers, toggle / edit / re-link ──────────────
export function GlobalMapDialog({ entities, locations, title = "Areas Map", onSave, onClose }: {
  entities: GeoRef[]
  locations: MapLocation[]
  title?: string
  onSave: (updated: GeoRef[]) => void
  onClose: () => void
}) {
  // Levels present in this map (e.g. District/Area/Subarea, or Project/Phase)
  const levels = [...new Set(entities.map((e) => e.level))]
  const [list, setList] = useState<GeoRef[]>(entities)
  const [layers, setLayers] = useState<Record<GeoLevel, boolean>>({ District: true, Area: true, Subarea: true, Project: true, Phase: true })
  const [undrawnTab, setUndrawnTab] = useState<GeoLevel>(levels[0])
  const [selKey, setSelKey] = useState<string | null>(null)
  const [editGeo, setEditGeo] = useState(false)
  const [drawMode, setDrawMode] = useState<"pin" | "poly" | null>(null)
  const [draft, setDraft] = useState<Pt[] | null>(null)
  const [view, setView] = useState<MapView>({ cx: 500, cy: 350, zoom: 0.95 })
  const dragRef = useRef<DragState>(null)

  const keyOf = (g: GeoRef) => `${g.level}:${g.id}`
  const sel = selKey ? list.find((g) => keyOf(g) === selKey) ?? null : null
  const LABEL_MIN: Record<GeoLevel, number> = { District: 0, Area: 1.4, Subarea: 2.6, Project: 0, Phase: 1.4 }
  const undrawnOf = (lvl: GeoLevel) => list.filter((g) => g.level === lvl && (!g.pin || !g.polygon))

  const zoomBy = (f: number) => setView((v) => ({ ...v, zoom: Math.min(8, Math.max(0.75, v.zoom * f)) }))
  const stopDrawing = () => { setDrawMode(null); setDraft(null) }

  const down: PtHandler = (p, e, mpp) => {
    if (dragRef.current) return
    if (drawMode === "pin" && selKey) {
      setList((ls) => ls.map((g) => (keyOf(g) === selKey ? { ...g, pin: p } : g)))
      stopDrawing()
      return
    }
    if (drawMode === "poly" && selKey) { setDraft((d) => [...(d ?? []), p]); return }
    dragRef.current = { t: "pan", sx: e.clientX, sy: e.clientY, cx0: view.cx, cy0: view.cy, mpp }
  }
  const move: PtHandler = (p, e) => {
    const d = dragRef.current
    if (!d) return
    if (d.t === "pan") setView((v) => ({ ...v, cx: d.cx0 - (e.clientX - d.sx) * d.mpp, cy: d.cy0 - (e.clientY - d.sy) * d.mpp }))
    else if (d.t === "pin") setList((ls) => ls.map((g) => (keyOf(g) === d.key ? { ...g, pin: p } : g)))
    else if (d.t === "v") setList((ls) => ls.map((g) => (keyOf(g) === d.key ? { ...g, polygon: g.polygon!.map((q, i) => (i === d.i ? p : q)) } : g)))
  }

  const relink = (targetId: string) => {
    if (!sel || targetId === sel.id) return
    const target = list.find((g) => g.level === sel.level && g.id === targetId)
    if (!target) return
    setList((ls) => ls.map((g) => {
      if (keyOf(g) === keyOf(sel)) return { ...g, pin: null, polygon: null }
      if (keyOf(g) === keyOf(target)) return { ...g, pin: sel.pin, polygon: sel.polygon }
      return g
    }))
    setSelKey(keyOf(target))
    stopDrawing()
    toast.success(`Geometry re-linked to ${target.name}`)
  }
  const clearGeo = (what: "pin" | "polygon") => {
    if (!selKey) return
    setList((ls) => ls.map((g) => (keyOf(g) === selKey ? { ...g, [what]: null } : g)))
  }

  const visibleLevels = levels.filter((l) => layers[l])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[92vw]">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <span className="hidden text-xs text-muted-foreground sm:block">Toggle layers, click a pin or polygon to select it, then edit its geometry or re-link it.</span>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1 bg-[#EFEDE5]">
            <MapSvg view={view} onDown={down} onMove={move} onUp={() => (dragRef.current = null)} cursor={drawMode ? "crosshair" : "grab"}>
              {visibleLevels.map((lvl) =>
                list.filter((g) => g.level === lvl && g.polygon).map((g) => {
                  const isSel = keyOf(g) === selKey
                  const c = LEVEL_COLOR[lvl]
                  const cen = centroid(g.polygon, g.pin)
                  return (
                    <g key={keyOf(g)}>
                      <polygon
                        points={ptsStr(g.polygon!)} fill={c} fillOpacity={isSel ? 0.35 : 0.15} stroke={c}
                        strokeWidth={(isSel ? 2.6 : 1.4) / view.zoom} style={{ cursor: drawMode ? "crosshair" : "pointer" }}
                        onPointerDown={() => { if (drawMode) return; setSelKey(keyOf(g)) }}
                      />
                      {view.zoom >= LABEL_MIN[lvl] && (
                        <text x={cen.x} y={cen.y} textAnchor="middle" fontSize={(lvl === "District" ? 13 : 11) / view.zoom}
                          fill={c} fontWeight={600} style={{ pointerEvents: "none" }}>
                          {g.name}
                        </text>
                      )}
                      {isSel && editGeo && g.polygon!.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={5 / view.zoom} fill="#fff" stroke={c} strokeWidth={2 / view.zoom}
                          style={{ cursor: "move" }} onPointerDown={() => { dragRef.current = { t: "v", i, key: keyOf(g) } }} />
                      ))}
                    </g>
                  )
                }),
              )}
              {visibleLevels.map((lvl) =>
                list.filter((g) => g.level === lvl && g.pin).map((g) => (
                  <PinMarker
                    key={keyOf(g)} pt={g.pin!} color={LEVEL_COLOR[lvl]} zoom={view.zoom}
                    cursor={drawMode ? "crosshair" : editGeo && keyOf(g) === selKey ? "move" : "pointer"}
                    onPointerDown={() => { if (drawMode) return; setSelKey(keyOf(g)); if (editGeo) dragRef.current = { t: "pin", key: keyOf(g) } }}
                  />
                )),
              )}
              {draft && draft.length > 0 && sel && (
                <g>
                  <polyline points={ptsStr(draft)} fill="none" stroke={LEVEL_COLOR[sel.level]} strokeWidth={2 / view.zoom} strokeDasharray={`${5 / view.zoom} ${4 / view.zoom}`} />
                  {draft.length >= 3 && (
                    <line x1={draft[draft.length - 1].x} y1={draft[draft.length - 1].y} x2={draft[0].x} y2={draft[0].y}
                      stroke={LEVEL_COLOR[sel.level]} strokeOpacity={0.4} strokeWidth={1.5 / view.zoom} strokeDasharray={`${3 / view.zoom} ${3 / view.zoom}`} />
                  )}
                  {draft.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4.5 / view.zoom} fill={LEVEL_COLOR[sel.level]} stroke="#fff" strokeWidth={1.5 / view.zoom} />
                  ))}
                </g>
              )}
            </MapSvg>
            <MapSearch locations={locations} onGo={(l) => setView({ cx: l.center.x, cy: l.center.y, zoom: zoomFor(l.kind) })} className="absolute left-3 top-3 z-10 w-72" />
            <ZoomControls onZoom={zoomBy} />
            <Attribution />
          </div>

          <div className="flex w-[300px] flex-shrink-0 flex-col border-l border-border">
            <div className="border-b border-border p-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</div>
              {levels.map((lvl) => (
                <div key={lvl} className="flex items-center gap-2 py-1">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: LEVEL_COLOR[lvl] }} />
                  <span className="text-sm text-foreground">{lvl}s</span>
                  <span className="text-xs text-muted-foreground">{list.filter((g) => g.level === lvl && (g.pin || g.polygon)).length} drawn</span>
                  <Switch className="ml-auto" checked={layers[lvl]} onCheckedChange={(v) => setLayers((s) => ({ ...s, [lvl]: v }))} />
                </div>
              ))}
            </div>

            {sel ? (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <LevelChip level={sel.level} />
                      <IdTag value={sel.id} className="text-[11px]" />
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">{sel.name}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <span className={cn(
                      "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      sel.status === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700",
                    )}>
                      {sel.status}
                    </span>
                    <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setSelKey(null); setEditGeo(false); stopDrawing() }}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Linked {sel.level.toLowerCase()}</div>
                  <Select value={sel.id} onValueChange={relink}>
                    <SelectTrigger className="h-8 w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {list.filter((g) => g.level === sel.level).map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name} — ID: {g.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Changing this moves the current pin & polygon to the selected {sel.level.toLowerCase()}.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div>
                    <div className="text-sm font-medium text-foreground">Edit geometry</div>
                    <div className="text-[11px] text-muted-foreground">Drag the pin & vertices on the map</div>
                  </div>
                  <Switch checked={editGeo} onCheckedChange={setEditGeo} />
                </div>

                <div className="flex gap-2">
                  {sel.pin ? (
                    <Button variant="outline" size="sm" className="h-8 flex-1 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => clearGeo("pin")}>
                      <Trash2 className="h-3.5 w-3.5" />Pin
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm"
                      className={cn("h-8 flex-1 gap-1 text-xs", drawMode === "pin" && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
                      onClick={() => { setDrawMode("pin"); setDraft(null) }}>
                      <MapPin className="h-3.5 w-3.5" />Draw pin
                    </Button>
                  )}
                  {sel.polygon ? (
                    <Button variant="outline" size="sm" className="h-8 flex-1 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => clearGeo("polygon")}>
                      <Trash2 className="h-3.5 w-3.5" />Polygon
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm"
                      className={cn("h-8 flex-1 gap-1 text-xs", drawMode === "poly" && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
                      onClick={() => { setDrawMode("poly"); setDraft([]) }}>
                      <PenLine className="h-3.5 w-3.5" />Draw polygon
                    </Button>
                  )}
                </div>

                {drawMode && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                    <p className="text-xs leading-4 text-foreground">
                      {drawMode === "pin"
                        ? <>Click the map to place the pin for <span className="font-semibold">{sel.name}</span>.</>
                        : <>Click the map to add polygon vertices for <span className="font-semibold">{sel.name}</span> — {draft?.length ?? 0} added (at least 3).</>}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {drawMode === "poly" && (
                        <Button size="sm" className="h-7 flex-1 gap-1 text-xs" disabled={!draft || draft.length < 3}
                          onClick={() => {
                            setList((ls) => ls.map((g) => (keyOf(g) === selKey ? { ...g, polygon: draft } : g)))
                            stopDrawing()
                          }}>
                          <Check className="h-3 w-3" />Finish
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={stopDrawing}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not Drawn Yet</div>
                <p className="mb-2 mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  Records missing a pin or polygon — click one to select it, then draw it on the map. Or click any shape on the map to inspect it.
                </p>
                <div className="flex rounded-lg bg-secondary p-0.5">
                  {levels.map((lvl) => (
                    <button
                      key={lvl} type="button" onClick={() => setUndrawnTab(lvl)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-xs font-medium transition-colors",
                        undrawnTab === lvl ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {lvl}s
                      <span className={cn(
                        "rounded px-1 text-[10px] font-semibold leading-4",
                        undrawnOf(lvl).length > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
                      )}>
                        {undrawnOf(lvl).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                  {undrawnOf(undrawnTab).map((g) => (
                    <div
                      key={keyOf(g)} onClick={() => setSelKey(keyOf(g))}
                      className="cursor-pointer rounded-lg border border-border bg-card p-2 text-left transition-colors hover:border-muted-foreground/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{g.name}</span>
                        <IdTag value={g.id} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!g.pin && <span className="rounded-md border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-red-700">Missing Pin</span>}
                        {!g.polygon && <span className="rounded-md border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-red-700">Missing Polygon</span>}
                      </div>
                    </div>
                  ))}
                  {undrawnOf(undrawnTab).length === 0 && (
                    <p className="flex items-center justify-center gap-1.5 py-8 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />All {undrawnTab.toLowerCase()}s are fully drawn
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-border p-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={() => onSave(list)}>Save Changes</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

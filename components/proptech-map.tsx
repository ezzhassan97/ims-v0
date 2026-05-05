"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  MapPin,
  Layers,
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Home,
  Building2,
  X,
  Filter,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Maximize2,
  LocateFixed,
  Plus,
  Minus,
  BarChart2,
  Flame,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: string
  name: string
  nameAr: string
  lat: number
  lng: number
  type: "compound" | "district" | "new-city"
  avgPrice: number
  avgPsqm: number
  totalListings: number
  soldLastMonth: number
  yoyChange: number
  momChange: number
  demandScore: number // 0-100
  supplyScore: number // 0-100
  priceHistory: { month: string; price: number; psqm: number }[]
  tags: string[]
  area: string
}

// ─── Mock Egypt proptech data ─────────────────────────────────────────────────

const LOCATIONS: Location[] = [
  {
    id: "new-cairo",
    name: "New Cairo",
    nameAr: "القاهرة الجديدة",
    lat: 30.03,
    lng: 31.47,
    type: "new-city",
    avgPrice: 4_800_000,
    avgPsqm: 18_500,
    totalListings: 3420,
    soldLastMonth: 287,
    yoyChange: 24.5,
    momChange: 1.8,
    demandScore: 88,
    supplyScore: 62,
    priceHistory: [
      { month: "Jul", price: 3_850_000, psqm: 14_800 },
      { month: "Aug", price: 3_920_000, psqm: 15_100 },
      { month: "Sep", price: 4_050_000, psqm: 15_600 },
      { month: "Oct", price: 4_180_000, psqm: 16_100 },
      { month: "Nov", price: 4_400_000, psqm: 17_000 },
      { month: "Dec", price: 4_550_000, psqm: 17_500 },
      { month: "Jan", price: 4_680_000, psqm: 18_000 },
      { month: "Feb", price: 4_800_000, psqm: 18_500 },
    ],
    tags: ["High Demand", "Investment Grade", "Expat Friendly"],
    area: "Greater Cairo",
  },
  {
    id: "october",
    name: "6th of October",
    nameAr: "السادس من أكتوبر",
    lat: 29.97,
    lng: 30.93,
    type: "new-city",
    avgPrice: 2_950_000,
    avgPsqm: 12_200,
    totalListings: 2180,
    soldLastMonth: 194,
    yoyChange: 18.2,
    momChange: 1.2,
    demandScore: 74,
    supplyScore: 71,
    priceHistory: [
      { month: "Jul", price: 2_480_000, psqm: 10_300 },
      { month: "Aug", price: 2_530_000, psqm: 10_500 },
      { month: "Sep", price: 2_600_000, psqm: 10_800 },
      { month: "Oct", price: 2_700_000, psqm: 11_200 },
      { month: "Nov", price: 2_780_000, psqm: 11_500 },
      { month: "Dec", price: 2_850_000, psqm: 11_800 },
      { month: "Jan", price: 2_900_000, psqm: 12_000 },
      { month: "Feb", price: 2_950_000, psqm: 12_200 },
    ],
    tags: ["Affordable", "Family Friendly", "Growing"],
    area: "Greater Cairo",
  },
  {
    id: "new-capital",
    name: "New Administrative Capital",
    nameAr: "العاصمة الإدارية الجديدة",
    lat: 30.05,
    lng: 31.75,
    type: "new-city",
    avgPrice: 5_200_000,
    avgPsqm: 22_000,
    totalListings: 4750,
    soldLastMonth: 312,
    yoyChange: 35.8,
    momChange: 3.1,
    demandScore: 92,
    supplyScore: 44,
    priceHistory: [
      { month: "Jul", price: 3_600_000, psqm: 15_200 },
      { month: "Aug", price: 3_800_000, psqm: 16_100 },
      { month: "Sep", price: 4_050_000, psqm: 17_100 },
      { month: "Oct", price: 4_350_000, psqm: 18_400 },
      { month: "Nov", price: 4_600_000, psqm: 19_500 },
      { month: "Dec", price: 4_900_000, psqm: 20_700 },
      { month: "Jan", price: 5_050_000, psqm: 21_400 },
      { month: "Feb", price: 5_200_000, psqm: 22_000 },
    ],
    tags: ["Hot Market", "Gov. Backed", "Fastest Growing"],
    area: "Greater Cairo",
  },
  {
    id: "zamalek",
    name: "Zamalek",
    nameAr: "الزمالك",
    lat: 30.065,
    lng: 31.22,
    type: "district",
    avgPrice: 6_500_000,
    avgPsqm: 28_000,
    totalListings: 420,
    soldLastMonth: 38,
    yoyChange: 12.4,
    momChange: 0.8,
    demandScore: 68,
    supplyScore: 24,
    priceHistory: [
      { month: "Jul", price: 5_760_000, psqm: 24_900 },
      { month: "Aug", price: 5_820_000, psqm: 25_100 },
      { month: "Sep", price: 5_890_000, psqm: 25_400 },
      { month: "Oct", price: 5_980_000, psqm: 25_800 },
      { month: "Nov", price: 6_100_000, psqm: 26_300 },
      { month: "Dec", price: 6_250_000, psqm: 26_900 },
      { month: "Jan", price: 6_380_000, psqm: 27_500 },
      { month: "Feb", price: 6_500_000, psqm: 28_000 },
    ],
    tags: ["Luxury", "Prestige", "Low Supply"],
    area: "Central Cairo",
  },
  {
    id: "maadi",
    name: "Maadi",
    nameAr: "المعادي",
    lat: 29.96,
    lng: 31.26,
    type: "district",
    avgPrice: 3_800_000,
    avgPsqm: 15_500,
    totalListings: 980,
    soldLastMonth: 89,
    yoyChange: 16.8,
    momChange: 1.1,
    demandScore: 78,
    supplyScore: 55,
    priceHistory: [
      { month: "Jul", price: 3_230_000, psqm: 13_200 },
      { month: "Aug", price: 3_290_000, psqm: 13_400 },
      { month: "Sep", price: 3_360_000, psqm: 13_700 },
      { month: "Oct", price: 3_450_000, psqm: 14_100 },
      { month: "Nov", price: 3_570_000, psqm: 14_600 },
      { month: "Dec", price: 3_670_000, psqm: 15_000 },
      { month: "Jan", price: 3_740_000, psqm: 15_300 },
      { month: "Feb", price: 3_800_000, psqm: 15_500 },
    ],
    tags: ["Expat Hub", "Established", "Tree-lined"],
    area: "South Cairo",
  },
  {
    id: "sheikh-zayed",
    name: "Sheikh Zayed",
    nameAr: "الشيخ زايد",
    lat: 30.04,
    lng: 30.97,
    type: "district",
    avgPrice: 3_600_000,
    avgPsqm: 13_800,
    totalListings: 1620,
    soldLastMonth: 143,
    yoyChange: 22.1,
    momChange: 2.0,
    demandScore: 83,
    supplyScore: 58,
    priceHistory: [
      { month: "Jul", price: 2_930_000, psqm: 11_300 },
      { month: "Aug", price: 2_990_000, psqm: 11_500 },
      { month: "Sep", price: 3_080_000, psqm: 11_900 },
      { month: "Oct", price: 3_180_000, psqm: 12_200 },
      { month: "Nov", price: 3_310_000, psqm: 12_700 },
      { month: "Dec", price: 3_430_000, psqm: 13_200 },
      { month: "Jan", price: 3_520_000, psqm: 13_500 },
      { month: "Feb", price: 3_600_000, psqm: 13_800 },
    ],
    tags: ["Trendy", "Retail Hub", "Mid-Luxury"],
    area: "Greater Cairo",
  },
  {
    id: "north-coast",
    name: "North Coast",
    nameAr: "الساحل الشمالي",
    lat: 31.0,
    lng: 28.1,
    type: "compound",
    avgPrice: 8_500_000,
    avgPsqm: 32_000,
    totalListings: 2100,
    soldLastMonth: 156,
    yoyChange: 42.0,
    momChange: 4.2,
    demandScore: 96,
    supplyScore: 38,
    priceHistory: [
      { month: "Jul", price: 5_950_000, psqm: 22_500 },
      { month: "Aug", price: 6_300_000, psqm: 23_800 },
      { month: "Sep", price: 6_700_000, psqm: 25_300 },
      { month: "Oct", price: 7_100_000, psqm: 26_800 },
      { month: "Nov", price: 7_500_000, psqm: 28_300 },
      { month: "Dec", price: 7_900_000, psqm: 29_800 },
      { month: "Jan", price: 8_200_000, psqm: 31_000 },
      { month: "Feb", price: 8_500_000, psqm: 32_000 },
    ],
    tags: ["Seasonal", "Highest ROI", "Ultra Luxury"],
    area: "Mediterranean Coast",
  },
  {
    id: "sokhna",
    name: "Ain Sokhna",
    nameAr: "العين السخنة",
    lat: 29.6,
    lng: 32.35,
    type: "compound",
    avgPrice: 4_200_000,
    avgPsqm: 19_500,
    totalListings: 1350,
    soldLastMonth: 98,
    yoyChange: 28.4,
    momChange: 2.4,
    demandScore: 81,
    supplyScore: 49,
    priceHistory: [
      { month: "Jul", price: 3_250_000, psqm: 15_100 },
      { month: "Aug", price: 3_380_000, psqm: 15_700 },
      { month: "Sep", price: 3_530_000, psqm: 16_400 },
      { month: "Oct", price: 3_700_000, psqm: 17_200 },
      { month: "Nov", price: 3_850_000, psqm: 17_900 },
      { month: "Dec", price: 4_000_000, psqm: 18_600 },
      { month: "Jan", price: 4_100_000, psqm: 19_000 },
      { month: "Feb", price: 4_200_000, psqm: 19_500 },
    ],
    tags: ["Resort Living", "Weekend Retreat", "Rising"],
    area: "Red Sea",
  },
  {
    id: "heliopolis",
    name: "Heliopolis",
    nameAr: "مصر الجديدة",
    lat: 30.09,
    lng: 31.34,
    type: "district",
    avgPrice: 2_800_000,
    avgPsqm: 11_500,
    totalListings: 1100,
    soldLastMonth: 102,
    yoyChange: 14.6,
    momChange: 0.9,
    demandScore: 72,
    supplyScore: 66,
    priceHistory: [
      { month: "Jul", price: 2_430_000, psqm: 10_000 },
      { month: "Aug", price: 2_470_000, psqm: 10_200 },
      { month: "Sep", price: 2_530_000, psqm: 10_400 },
      { month: "Oct", price: 2_590_000, psqm: 10_700 },
      { month: "Nov", price: 2_650_000, psqm: 10_900 },
      { month: "Dec", price: 2_700_000, psqm: 11_100 },
      { month: "Jan", price: 2_750_000, psqm: 11_300 },
      { month: "Feb", price: 2_800_000, psqm: 11_500 },
    ],
    tags: ["Classic", "Established", "Central"],
    area: "East Cairo",
  },
  {
    id: "new-zayed",
    name: "New Zayed",
    nameAr: "زايد الجديدة",
    lat: 30.08,
    lng: 30.85,
    type: "new-city",
    avgPrice: 2_200_000,
    avgPsqm: 9_800,
    totalListings: 890,
    soldLastMonth: 76,
    yoyChange: 19.8,
    momChange: 1.6,
    demandScore: 70,
    supplyScore: 80,
    priceHistory: [
      { month: "Jul", price: 1_820_000, psqm: 8_100 },
      { month: "Aug", price: 1_870_000, psqm: 8_300 },
      { month: "Sep", price: 1_930_000, psqm: 8_600 },
      { month: "Oct", price: 2_000_000, psqm: 8_900 },
      { month: "Nov", price: 2_050_000, psqm: 9_100 },
      { month: "Dec", price: 2_100_000, psqm: 9_400 },
      { month: "Jan", price: 2_150_000, psqm: 9_600 },
      { month: "Feb", price: 2_200_000, psqm: 9_800 },
    ],
    tags: ["Affordable", "New Development", "Value Pick"],
    area: "West Cairo",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(0)}K`
  return `EGP ${n.toLocaleString()}`
}
function fmtPsqm(n: number) {
  return `EGP ${n.toLocaleString()}/m²`
}

// Egypt center & rough boundary points for SVG map
const EG_BOUNDS = { minLat: 22, maxLat: 31.5, minLng: 24.7, maxLng: 37.2 }

function latLngToXY(
  lat: number,
  lng: number,
  width: number,
  height: number,
): [number, number] {
  const x =
    ((lng - EG_BOUNDS.minLng) / (EG_BOUNDS.maxLng - EG_BOUNDS.minLng)) * width
  const y =
    ((EG_BOUNDS.maxLat - lat) / (EG_BOUNDS.maxLat - EG_BOUNDS.minLat)) * height
  return [x, y]
}

// ─── Heatmap layer helpers ────────────────────────────────────────────────────

type HeatLayer = "none" | "price" | "psqm" | "demand" | "supply"

const HEAT_COLORS: Record<string, [string, string, string]> = {
  price: ["#0ea5e9", "#f59e0b", "#ef4444"],
  psqm: ["#10b981", "#f59e0b", "#dc2626"],
  demand: ["#6366f1", "#8b5cf6", "#ec4899"],
  supply: ["#14b8a6", "#84cc16", "#facc15"],
}

function getHeatColor(
  value: number,
  min: number,
  max: number,
  layer: HeatLayer,
): string {
  if (layer === "none") return "transparent"
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const colors = HEAT_COLORS[layer]
  // lerp through 3 stops
  if (t < 0.5) {
    const tt = t * 2
    return lerpColor(colors[0], colors[1], tt)
  } else {
    const tt = (t - 0.5) * 2
    return lerpColor(colors[1], colors[2], tt)
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0")
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0")
  const bl = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0")
  return `#${r}${g}${bl}`
}

// Approximate Egypt boundary SVG path (simplified)
const EGYPT_PATH =
  "M 68,12 L 80,10 L 100,8 L 118,6 L 130,8 L 138,14 L 148,22 L 155,28 L 160,35 L 162,48 L 158,60 L 152,70 L 148,80 L 145,95 L 140,108 L 136,120 L 130,130 L 122,138 L 112,142 L 100,145 L 88,148 L 78,152 L 68,158 L 55,165 L 45,170 L 38,178 L 30,188 L 22,195 L 15,190 L 10,180 L 8,168 L 10,155 L 12,140 L 14,125 L 18,110 L 22,95 L 28,80 L 35,65 L 42,50 L 50,36 L 58,24 Z"

// ─── Egypt SVG map rendering ──────────────────────────────────────────────────

const MAP_W = 500
const MAP_H = 600

// ─── Popover Card ─────────────────────────────────────────────────────────────

function PriceTrendChart({ data, layer }: { data: Location["priceHistory"]; layer: HeatLayer }) {
  const key = layer === "psqm" ? "psqm" : "price"
  const color = layer === "psqm" ? "#10b981" : "#3b82f6"
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 10, color: "#f1f5f9" }}
          formatter={(v: number) => [layer === "psqm" ? fmtPsqm(v) : fmt(v), ""]}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Area type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} fill="url(#chartGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function LocationPopover({
  location,
  heatLayer,
  onClose,
}: {
  location: Location
  heatLayer: HeatLayer
  onClose: () => void
}) {
  const isUp = location.yoyChange > 0
  const typeColors: Record<string, string> = {
    compound: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    district: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    "new-city": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  }
  const typeLabels: Record<string, string> = {
    compound: "Compound",
    district: "District",
    "new-city": "New City",
  }

  return (
    <div className="absolute top-0 left-full ml-3 z-50 w-72 pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white truncate">{location.name}</h3>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", typeColors[location.type])}>
                  {typeLabels[location.type]}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{location.nameAr} · {location.area}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Key metrics */}
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg. Price</p>
            <p className="text-sm font-bold text-white mt-0.5">{fmt(location.avgPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Price / m²</p>
            <p className="text-sm font-bold text-white mt-0.5">{fmtPsqm(location.avgPsqm)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">YoY Change</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isUp
                ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
              <p className={cn("text-sm font-bold", isUp ? "text-emerald-400" : "text-red-400")}>
                {isUp ? "+" : ""}{location.yoyChange}%
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Listings</p>
            <p className="text-sm font-bold text-white mt-0.5">{location.totalListings.toLocaleString()}</p>
          </div>
        </div>

        {/* Demand / Supply bars */}
        <div className="px-4 pb-3 space-y-2">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500">Demand</span>
              <span className="text-[10px] text-slate-400 font-medium">{location.demandScore}/100</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
                style={{ width: `${location.demandScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500">Supply</span>
              <span className="text-[10px] text-slate-400 font-medium">{location.supplyScore}/100</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
                style={{ width: `${location.supplyScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Price trend chart */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
            {heatLayer === "psqm" ? "Price/m² Trend" : "Price Trend"} (8 months)
          </p>
          <PriceTrendChart data={location.priceHistory} layer={heatLayer} />
        </div>

        {/* Tags */}
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {location.tags.map((tag) => (
            <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Map Pin ──────────────────────────────────────────────────────────────────

function MapPin_({
  location,
  x,
  y,
  heatLayer,
  isActive,
  onHover,
  onLeave,
  onClick,
  heatColor,
}: {
  location: Location
  x: number
  y: number
  heatLayer: HeatLayer
  isActive: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
  heatColor: string
}) {
  const isUp = location.yoyChange > 0
  const pinBg = isActive
    ? "bg-white text-slate-900 shadow-lg shadow-white/20 scale-110"
    : "bg-slate-900/90 text-white border border-slate-600 hover:border-white/60 hover:bg-slate-800"

  return (
    <g transform={`translate(${x}, ${y})`} style={{ cursor: "pointer" }} onClick={onClick}>
      {/* Heatmap circle */}
      <circle
        cx={0}
        cy={0}
        r={location.type === "new-city" ? 32 : location.type === "compound" ? 28 : 22}
        fill={heatColor}
        opacity={heatLayer !== "none" ? 0.35 : 0}
        className="transition-all duration-500"
      />
      <circle
        cx={0}
        cy={0}
        r={location.type === "new-city" ? 22 : location.type === "compound" ? 18 : 14}
        fill={heatColor}
        opacity={heatLayer !== "none" ? 0.18 : 0}
        className="transition-all duration-500"
      />

      {/* Pulse animation for high demand */}
      {location.demandScore >= 88 && (
        <circle cx={0} cy={0} r={12} fill="none" stroke="#f43f5e" strokeWidth={1.5} opacity={0.6}>
          <animate attributeName="r" from="12" to="24" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Pin body */}
      <foreignObject x={-44} y={-18} width={88} height={36}>
        <div
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none whitespace-nowrap",
            pinBg,
          )}
        >
          <span className="flex-shrink-0">
            {location.type === "compound"
              ? "🏖"
              : location.type === "new-city"
              ? "🏙"
              : "🏘"}
          </span>
          <span className="truncate max-w-[56px]">{fmt(location.avgPrice).replace("EGP ", "")}</span>
          <span className={cn("flex-shrink-0", isUp ? "text-emerald-400" : "text-red-400")}>
            {isUp ? "↑" : "↓"}
          </span>
        </div>
      </foreignObject>

      {/* Label below */}
      <text
        x={0}
        y={26}
        textAnchor="middle"
        fontSize={9}
        fill={isActive ? "#ffffff" : "#94a3b8"}
        fontFamily="system-ui"
        className="transition-colors duration-200 pointer-events-none select-none"
      >
        {location.name.length > 14 ? location.name.slice(0, 13) + "…" : location.name}
      </text>
    </g>
  )
}

// ─── Layer legend ─────────────────────────────────────────────────────────────

function HeatLegend({ layer }: { layer: HeatLayer }) {
  if (layer === "none") return null
  const labels: Record<HeatLayer, [string, string, string, string]> = {
    none: ["", "", "", ""],
    price: ["Low Price", "", "", "High Price"],
    psqm: ["Low /m²", "", "", "High /m²"],
    demand: ["Low Demand", "", "", "High Demand"],
    supply: ["Low Supply", "", "", "High Supply"],
  }
  const colors = HEAT_COLORS[layer]
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400">{labels[layer][0]}</span>
      <div
        className="h-2 w-28 rounded-full"
        style={{ background: `linear-gradient(to right, ${colors[0]}, ${colors[1]}, ${colors[2]})` }}
      />
      <span className="text-[10px] text-slate-400">{labels[layer][3]}</span>
    </div>
  )
}

// ─── Main PropTech Map ────────────────────────────────────────────────────────

export function PropTechMap() {
  const [heatLayer, setHeatLayer] = useState<HeatLayer>("price")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Compute heat values for the current layer
  const heatValues = LOCATIONS.map((l) => {
    if (heatLayer === "price") return l.avgPrice
    if (heatLayer === "psqm") return l.avgPsqm
    if (heatLayer === "demand") return l.demandScore
    if (heatLayer === "supply") return l.supplyScore
    return 0
  })
  const heatMin = Math.min(...heatValues)
  const heatMax = Math.max(...heatValues)

  const filteredLocations = LOCATIONS.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.area.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || l.type === typeFilter
    return matchSearch && matchType
  })

  const activeLocation = selectedId
    ? LOCATIONS.find((l) => l.id === selectedId) || null
    : hoveredId
    ? LOCATIONS.find((l) => l.id === hoveredId) || null
    : null

  // Map dimensions scaled to container
  const scale = Math.min(containerSize.w / MAP_W, containerSize.h / MAP_H) * 0.88
  const mapW = MAP_W * scale
  const mapH = MAP_H * scale
  const offsetX = (containerSize.w - mapW) / 2 + pan.x
  const offsetY = (containerSize.h - mapH) / 2 + pan.y

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.6, Math.min(3, z - e.deltaY * 0.001)))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setIsDragging(true)
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current || !isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  const layers: { id: HeatLayer; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "none", label: "No Overlay", icon: <EyeOff className="h-3.5 w-3.5" />, desc: "Show pins only" },
    { id: "price", label: "Price Heat", icon: <DollarSign className="h-3.5 w-3.5" />, desc: "Avg. listing price" },
    { id: "psqm", label: "Price / m²", icon: <BarChart2 className="h-3.5 w-3.5" />, desc: "Price per square meter" },
    { id: "demand", label: "Demand Index", icon: <Flame className="h-3.5 w-3.5" />, desc: "Buyer demand score" },
    { id: "supply", label: "Supply Index", icon: <Home className="h-3.5 w-3.5" />, desc: "Active listings supply" },
  ]

  const stats = [
    { label: "Avg. Price", value: fmt(Math.round(LOCATIONS.reduce((a, b) => a + b.avgPrice, 0) / LOCATIONS.length)), icon: <DollarSign className="h-3.5 w-3.5 text-sky-400" /> },
    { label: "Markets", value: LOCATIONS.length.toString(), icon: <MapPin className="h-3.5 w-3.5 text-violet-400" /> },
    { label: "Total Listings", value: LOCATIONS.reduce((a, b) => a + b.totalListings, 0).toLocaleString(), icon: <Building2 className="h-3.5 w-3.5 text-emerald-400" /> },
    { label: "Avg. YoY", value: `+${(LOCATIONS.reduce((a, b) => a + b.yoyChange, 0) / LOCATIONS.length).toFixed(1)}%`, icon: <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden font-sans">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex-shrink-0 z-20">
        {/* Search */}
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
          {(["all", "new-city", "district", "compound"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                typeFilter === t
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {t === "all" ? "All" : t === "new-city" ? "New Cities" : t === "district" ? "Districts" : "Compounds"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Stats strip */}
        <div className="hidden lg:flex items-center gap-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              {s.icon}
              <div>
                <p className="text-xs font-semibold text-white leading-tight">{s.value}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 hidden lg:block" />

        {/* Layer toggle */}
        <button
          onClick={() => setShowLayerPanel((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            showLayerPanel
              ? "bg-sky-600 border-sky-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-600/50",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Layers
        </button>
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        {/* SVG Map */}
        <div
          ref={containerRef}
          className={cn("absolute inset-0", isDragging ? "cursor-grabbing" : "cursor-grab")}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg width={containerSize.w} height={containerSize.h} className="absolute inset-0">
            <defs>
              <pattern id="grid" width={40 * scale * zoom} height={40 * scale * zoom} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
                <path d={`M ${40 * scale * zoom} 0 L 0 0 0 ${40 * scale * zoom}`} fill="none" stroke="#1e293b" strokeWidth={0.5} />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grid background */}
            <rect width="100%" height="100%" fill="#0a1628" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale * zoom})`}>
              {/* Egypt outline */}
              <path
                d={EGYPT_PATH}
                fill="#0f2744"
                stroke="#1e3a5f"
                strokeWidth={1.5 / (scale * zoom)}
                opacity={0.9}
                transform={`scale(${MAP_W / 170}, ${MAP_H / 210})`}
              />

              {/* Nile River (simplified path) */}
              <path
                d="M 248,580 C 248,560 250,540 252,510 C 254,480 256,460 258,430 C 258,410 255,395 252,370 C 248,345 245,320 248,295 C 252,268 258,248 262,228 C 265,212 268,195 268,178 C 268,158 262,138 258,120"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth={3 / (scale * zoom)}
                opacity={0.5}
                strokeLinecap="round"
              />

              {/* Pins */}
              {filteredLocations.map((loc, i) => {
                const [px, py] = latLngToXY(loc.lat, loc.lng, MAP_W, MAP_H)
                const hv = heatLayer === "price" ? loc.avgPrice
                  : heatLayer === "psqm" ? loc.avgPsqm
                  : heatLayer === "demand" ? loc.demandScore
                  : heatLayer === "supply" ? loc.supplyScore : 0
                const hColor = getHeatColor(hv, heatMin, heatMax, heatLayer)

                return (
                  <MapPin_
                    key={loc.id}
                    location={loc}
                    x={px}
                    y={py}
                    heatLayer={heatLayer}
                    isActive={selectedId === loc.id || hoveredId === loc.id}
                    heatColor={hColor}
                    onHover={() => !selectedId && setHoveredId(loc.id)}
                    onLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId((prev) => prev === loc.id ? null : loc.id)}
                  />
                )
              })}
            </g>
          </svg>
        </div>

        {/* Popover */}
        {activeLocation && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: (() => {
                const [px] = latLngToXY(activeLocation.lat, activeLocation.lng, MAP_W, MAP_H)
                return offsetX + px * scale * zoom + 50
              })(),
              top: (() => {
                const [, py] = latLngToXY(activeLocation.lat, activeLocation.lng, MAP_W, MAP_H)
                return offsetY + py * scale * zoom - 60
              })(),
            }}
          >
            <LocationPopover
              location={activeLocation}
              heatLayer={heatLayer}
              onClose={() => { setSelectedId(null); setHoveredId(null) }}
            />
          </div>
        )}

        {/* Layer panel (slide-in) */}
        {showLayerPanel && (
          <div className="absolute top-3 right-3 z-30 w-56 bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-2.5 border-b border-slate-800">
              <p className="text-xs font-semibold text-white">Map Layers</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Select a data overlay</p>
            </div>
            <div className="p-2 space-y-1">
              {layers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setHeatLayer(l.id); setShowLayerPanel(false) }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                    heatLayer === l.id
                      ? "bg-sky-600/20 text-sky-300 border border-sky-600/40"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent",
                  )}
                >
                  {l.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{l.label}</p>
                    <p className="text-[10px] text-slate-500">{l.desc}</p>
                  </div>
                  {heatLayer === l.id && <div className="h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          {/* Zoom */}
          <div className="flex flex-col bg-slate-900/90 border border-slate-700/60 rounded-lg overflow-hidden shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700/40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Reset */}
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            className="p-2 bg-slate-900/90 border border-slate-700/60 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title="Reset view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wide">
            {heatLayer === "none" ? "No overlay active" : `${layers.find(l => l.id === heatLayer)?.label}`}
          </p>
          <HeatLegend layer={heatLayer} />
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] text-slate-400">Hot market</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🏙</span>
              <span className="text-[10px] text-slate-400">New City</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🏘</span>
              <span className="text-[10px] text-slate-400">District</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🏖</span>
              <span className="text-[10px] text-slate-400">Compound</span>
            </div>
          </div>
        </div>

        {/* Zoom level indicator */}
        <div className="absolute top-3 left-3 z-20 bg-slate-900/80 border border-slate-700/40 rounded-md px-2 py-1">
          <p className="text-[10px] text-slate-400 font-mono">{(zoom * 100).toFixed(0)}%</p>
        </div>

        {/* Instruction hint */}
        {!activeLocation && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/80 border border-slate-700/40 rounded-full px-3 py-1 pointer-events-none">
            <p className="text-[10px] text-slate-400">Hover or click a pin · Scroll to zoom · Drag to pan</p>
          </div>
        )}
      </div>
    </div>
  )
}

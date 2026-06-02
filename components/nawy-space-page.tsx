"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Satellite,
  Camera,
  Building2,
  Layers,
  MapPin,
  BarChart3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Columns3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Ruler,
  Activity,
  Globe,
  Zap,
  ScanSearch,
  GripVertical,
  Group,
  Edit,
  Trash2,
  Plus,
  Check,
  CalendarRange,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ImageQuality = "Medium" | "High" | "Very High" | "Super High" | "Ultra High"
type ImageType = "New" | "Archived"

interface DeveloperInfo {
  id: string
  name: string
  initials: string
  color: string
}

interface SatelliteImage {
  id: string
  developer: DeveloperInfo
  areaId: string
  areaName: string
  projectId: string
  projectName: string
  phaseId: string
  phaseName: string
  quality: ImageQuality
  resolutionM: number
  totalAreaKm2: number
  areaCapturedKm2: number
  costUsd: number
  costEgp: number
  systemRequested: string
  requestedAt: string
  capturedAt: string
  type: ImageType
  satellite: string
  createdAt: string
  updatedAt: string
  metadata: {
    cloudCoverPct: number
    incidenceAngle: number
    sunElevation: number
    sunAzimuth: number
    processingLevel: string
    bandsAvailable: string[]
    bboxMinLat: number
    bboxMaxLat: number
    bboxMinLng: number
    bboxMaxLng: number
  }
}

// ─── Cost rate helper ─────────────────────────────────────────────────────────

function getCostRatePerKm2(system: string): number {
  if (system === "Sentinel-2") return 0
  if (system === "SPOT-7") return 2.5
  if (system === "Pleiades-1A" || system === "Pleiades-1B") return 20
  if (system === "WorldView-2") return 28
  if (system === "WorldView-3") return 35
  return 0
}

function calcCosts(totalArea: number, system: string, multiplier: number): { areaCapturedKm2: number; costUsd: number; costEgp: number } {
  const areaCapturedKm2 = parseFloat((totalArea * multiplier).toFixed(3))
  const costUsd = parseFloat((areaCapturedKm2 * getCostRatePerKm2(system)).toFixed(2))
  const costEgp = parseFloat((costUsd * 50).toFixed(2))
  return { areaCapturedKm2, costUsd, costEgp }
}

// ─── Zoom height helper ────────────────────────────────────────────────────────

function getZoomHeight(system: string): string {
  if (system === "WorldView-3")  return "0.25 – 0.31 m"
  if (system === "WorldView-2")  return "0.46 – 0.52 m"
  if (system === "Pleiades-1A" || system === "Pleiades-1B") return "0.50 – 0.75 m"
  if (system === "SPOT-7")       return "1.5 – 2.0 m"
  if (system === "Sentinel-2")   return "10.0 m"
  return "—"
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SATELLITE_IMAGES: SatelliteImage[] = [
  {
    id: "SAT-2025-001",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-006", areaName: "6th of October",
    projectId: "PJ-0124", projectName: "Palm Hills October",
    phaseId: "PH-0124-02", phaseName: "Phase 2",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 3.24,
    ...calcCosts(3.24, "Pleiades-1A", 1.07),
    systemRequested: "Pleiades-1A",
    requestedAt: "2025-04-10 09:00", capturedAt: "2025-04-15 11:23",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-04-15", updatedAt: "2025-04-16",
    metadata: { cloudCoverPct: 2.1, incidenceAngle: 8.4, sunElevation: 61.2, sunAzimuth: 154.3, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.88, bboxMaxLat: 29.93, bboxMinLng: 30.94, bboxMaxLng: 31.01 },
  },
  {
    id: "SAT-2025-002",
    developer: { id: "DV-002", name: "Emaar Misr", initials: "EM", color: "#b45309" },
    areaId: "AR-014", areaName: "Sahel",
    projectId: "PJ-0055", projectName: "Marassi",
    phaseId: "PH-0055-05", phaseName: "Phase 5",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 7.82,
    ...calcCosts(7.82, "WorldView-3", 1.09),
    systemRequested: "WorldView-3",
    requestedAt: "2025-03-28 08:30", capturedAt: "2025-04-02 10:14",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-02", updatedAt: "2025-04-03",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 5.1, sunElevation: 68.4, sunAzimuth: 162.7, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.96, bboxMaxLat: 31.03, bboxMinLng: 28.42, bboxMaxLng: 28.51 },
  },
  {
    id: "SAT-2025-003",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-006", areaName: "6th of October",
    projectId: "PJ-0088", projectName: "Allegria",
    phaseId: "PH-0088-01", phaseName: "Phase 1",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 2.15,
    ...calcCosts(2.15, "SPOT-7", 1.06),
    systemRequested: "SPOT-7",
    requestedAt: "2024-11-05 10:00", capturedAt: "2024-11-18 09:55",
    type: "Archived", satellite: "SPOT-7", createdAt: "2024-11-18", updatedAt: "2024-11-19",
    metadata: { cloudCoverPct: 5.4, incidenceAngle: 14.2, sunElevation: 52.8, sunAzimuth: 170.1, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.94, bboxMaxLat: 29.98, bboxMinLng: 30.87, bboxMaxLng: 30.93 },
  },
  {
    id: "SAT-2025-004",
    developer: { id: "DV-004", name: "Hyde Park Developments", initials: "HP", color: "#7c3aed" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-0201", projectName: "Hyde Park Estate",
    phaseId: "PH-0201-03", phaseName: "Phase 3",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 5.41,
    ...calcCosts(5.41, "Pleiades-1B", 1.08),
    systemRequested: "Pleiades-1B",
    requestedAt: "2025-03-14 11:00", capturedAt: "2025-03-18 13:02",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-03-18", updatedAt: "2025-03-19",
    metadata: { cloudCoverPct: 1.2, incidenceAngle: 7.8, sunElevation: 63.5, sunAzimuth: 149.2, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.01, bboxMaxLat: 30.08, bboxMinLng: 31.44, bboxMaxLng: 31.52 },
  },
  {
    id: "SAT-2025-005",
    developer: { id: "DV-005", name: "Mountain View", initials: "MV", color: "#059669" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-0312", projectName: "Mountain View iCity",
    phaseId: "PH-0312-04", phaseName: "Phase 4",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 4.28,
    ...calcCosts(4.28, "WorldView-2", 1.10),
    systemRequested: "WorldView-2",
    requestedAt: "2025-02-20 07:00", capturedAt: "2025-02-24 08:41",
    type: "New", satellite: "WorldView-2", createdAt: "2025-02-24", updatedAt: "2025-02-25",
    metadata: { cloudCoverPct: 3.7, incidenceAngle: 11.9, sunElevation: 57.4, sunAzimuth: 158.8, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.04, bboxMaxLat: 30.10, bboxMinLng: 31.55, bboxMaxLng: 31.62 },
  },
  {
    id: "SAT-2025-006",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-014", areaName: "Sahel",
    projectId: "PJ-0441", projectName: "Silversands",
    phaseId: "PH-0441-02", phaseName: "Phase 2",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 2.93,
    ...calcCosts(2.93, "WorldView-3", 1.06),
    systemRequested: "WorldView-3",
    requestedAt: "2025-04-01 06:00", capturedAt: "2025-04-04 07:55",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-04", updatedAt: "2025-04-05",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 4.3, sunElevation: 70.1, sunAzimuth: 165.4, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan", "Coastal"], bboxMinLat: 31.12, bboxMaxLat: 31.17, bboxMinLng: 27.68, bboxMaxLng: 27.74 },
  },
  {
    id: "SAT-2025-007",
    developer: { id: "DV-007", name: "Tatweer Misr", initials: "TM", color: "#0284c7" },
    areaId: "AR-014", areaName: "Sahel",
    projectId: "PJ-0522", projectName: "Fouka Bay",
    phaseId: "PH-0522-01", phaseName: "Phase 1",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 1.87,
    ...calcCosts(1.87, "Pleiades-1A", 1.08),
    systemRequested: "Pleiades-1A",
    requestedAt: "2025-03-05 08:00", capturedAt: "2025-03-09 11:28",
    type: "New", satellite: "Sentinel-2", createdAt: "2025-03-09", updatedAt: "2025-03-10",
    metadata: { cloudCoverPct: 1.8, incidenceAngle: 9.2, sunElevation: 60.8, sunAzimuth: 160.0, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 31.06, bboxMaxLat: 31.10, bboxMinLng: 28.91, bboxMaxLng: 28.96 },
  },
  {
    id: "SAT-2025-008",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-009", areaName: "Sheikh Zayed",
    projectId: "PJ-0610", projectName: "ZED",
    phaseId: "PH-0610-03", phaseName: "Phase 3",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 3.62,
    ...calcCosts(3.62, "SPOT-7", 1.05),
    systemRequested: "SPOT-7",
    requestedAt: "2025-01-18 09:00", capturedAt: "2025-01-28 10:11",
    type: "New", satellite: "SPOT-7", createdAt: "2025-01-28", updatedAt: "2025-01-29",
    metadata: { cloudCoverPct: 8.2, incidenceAngle: 18.4, sunElevation: 43.1, sunAzimuth: 175.6, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.02, bboxMaxLat: 30.08, bboxMinLng: 30.96, bboxMaxLng: 31.04 },
  },
  {
    id: "SAT-2025-009",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-0711", projectName: "Villette",
    phaseId: "PH-0711-02", phaseName: "Phase 2",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 6.14,
    ...calcCosts(6.14, "Pleiades-1B", 1.09),
    systemRequested: "Pleiades-1B",
    requestedAt: "2024-10-12 10:30", capturedAt: "2024-10-17 12:05",
    type: "Archived", satellite: "Pleiades NEO", createdAt: "2024-10-17", updatedAt: "2024-10-18",
    metadata: { cloudCoverPct: 4.1, incidenceAngle: 10.7, sunElevation: 55.9, sunAzimuth: 153.8, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.06, bboxMaxLat: 30.13, bboxMinLng: 31.49, bboxMaxLng: 31.58 },
  },
  {
    id: "SAT-2025-010",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-0802", projectName: "Palm Hills New Cairo",
    phaseId: "PH-0802-01", phaseName: "Phase 1",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 4.77,
    ...calcCosts(4.77, "WorldView-2", 1.07),
    systemRequested: "WorldView-2",
    requestedAt: "2025-04-08 07:00", capturedAt: "2025-04-12 09:33",
    type: "New", satellite: "WorldView-2", createdAt: "2025-04-12", updatedAt: "2025-04-13",
    metadata: { cloudCoverPct: 0.6, incidenceAngle: 6.2, sunElevation: 64.7, sunAzimuth: 151.4, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "Pan"], bboxMinLat: 30.08, bboxMaxLat: 30.15, bboxMinLng: 31.40, bboxMaxLng: 31.48 },
  },
  {
    id: "SAT-2024-011",
    developer: { id: "DV-007", name: "Tatweer Misr", initials: "TM", color: "#0284c7" },
    areaId: "AR-018", areaName: "Ain Sokhna",
    projectId: "PJ-0901", projectName: "Telal El Sokhna",
    phaseId: "PH-0901-04", phaseName: "Phase 4",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 3.09,
    ...calcCosts(3.09, "Pleiades-1A", 1.10),
    systemRequested: "Pleiades-1A",
    requestedAt: "2024-07-22 06:00", capturedAt: "2024-07-27 08:14",
    type: "Archived", satellite: "Sentinel-1", createdAt: "2024-07-27", updatedAt: "2024-07-28",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 8.8, sunElevation: 70.3, sunAzimuth: 145.6, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.62, bboxMaxLat: 29.67, bboxMinLng: 32.31, bboxMaxLng: 32.38 },
  },
  {
    id: "SAT-2024-012",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-006", areaName: "6th of October",
    projectId: "PJ-1002", projectName: "Badya",
    phaseId: "PH-1002-02", phaseName: "Phase 2",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 8.34,
    ...calcCosts(8.34, "WorldView-2", 1.08),
    systemRequested: "WorldView-2",
    requestedAt: "2024-08-10 07:00", capturedAt: "2024-08-14 10:22",
    type: "Archived", satellite: "Copernicus-3", createdAt: "2024-08-14", updatedAt: "2024-08-15",
    metadata: { cloudCoverPct: 2.9, incidenceAngle: 13.1, sunElevation: 67.8, sunAzimuth: 148.2, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.11, bboxMaxLat: 30.21, bboxMinLng: 30.71, bboxMaxLng: 30.82 },
  },
  {
    id: "SAT-2024-013",
    developer: { id: "DV-008", name: "MNHD", initials: "MN", color: "#9d174d" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-1105", projectName: "Sarai",
    phaseId: "PH-1105-03", phaseName: "Phase 3",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 5.22,
    ...calcCosts(5.22, "SPOT-7", 1.06),
    systemRequested: "SPOT-7",
    requestedAt: "2024-05-30 09:00", capturedAt: "2024-06-10 11:40",
    type: "Archived", satellite: "SPOT-7", createdAt: "2024-06-10", updatedAt: "2024-06-11",
    metadata: { cloudCoverPct: 6.8, incidenceAngle: 16.4, sunElevation: 72.1, sunAzimuth: 142.3, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.12, bboxMaxLat: 30.19, bboxMinLng: 31.58, bboxMaxLng: 31.67 },
  },
  {
    id: "SAT-2024-014",
    developer: { id: "DV-009", name: "La Vista Developments", initials: "LV", color: "#92400e" },
    areaId: "AR-018", areaName: "Ain Sokhna",
    projectId: "PJ-1204", projectName: "La Vista Gardens",
    phaseId: "PH-1204-01", phaseName: "Phase 1",
    quality: "Medium", resolutionM: 10,
    totalAreaKm2: 1.43,
    ...calcCosts(1.43, "Sentinel-2", 1.12),
    systemRequested: "Sentinel-2",
    requestedAt: "2024-03-01 00:00", capturedAt: "2024-03-06 09:22",
    type: "Archived", satellite: "Sentinel-2", createdAt: "2024-03-06", updatedAt: "2024-03-07",
    metadata: { cloudCoverPct: 11.4, incidenceAngle: 22.7, sunElevation: 48.3, sunAzimuth: 168.9, processingLevel: "L2A Surface Reflectance", bandsAvailable: ["RGB", "NIR", "SWIR", "Red Edge"], bboxMinLat: 29.58, bboxMaxLat: 29.61, bboxMinLng: 32.40, bboxMaxLng: 32.44 },
  },
  {
    id: "SAT-2025-015",
    developer: { id: "DV-010", name: "Hassan Allam Properties", initials: "HA", color: "#15803d" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-1310", projectName: "The Lake",
    phaseId: "PH-1310-01", phaseName: "Phase 1",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 2.41,
    ...calcCosts(2.41, "WorldView-3", 1.06),
    systemRequested: "WorldView-3",
    requestedAt: "2025-04-14 06:00", capturedAt: "2025-04-17 08:50",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-17", updatedAt: "2025-04-18",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 3.9, sunElevation: 66.2, sunAzimuth: 152.1, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan", "Coastal", "Yellow"], bboxMinLat: 30.02, bboxMaxLat: 30.06, bboxMinLng: 31.36, bboxMaxLng: 31.41 },
  },
  {
    id: "SAT-2025-016",
    developer: { id: "DV-002", name: "Emaar Misr", initials: "EM", color: "#b45309" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-1408", projectName: "Uptown Cairo",
    phaseId: "PH-1408-06", phaseName: "Phase 6",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 7.15,
    ...calcCosts(7.15, "Pleiades-1A", 1.07),
    systemRequested: "Pleiades-1A",
    requestedAt: "2025-03-22 09:00", capturedAt: "2025-03-25 12:18",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-03-25", updatedAt: "2025-03-26",
    metadata: { cloudCoverPct: 3.3, incidenceAngle: 10.2, sunElevation: 60.4, sunAzimuth: 156.7, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.96, bboxMaxLat: 30.04, bboxMinLng: 31.43, bboxMaxLng: 31.52 },
  },
  {
    id: "SAT-2025-017",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-014", areaName: "Sahel",
    projectId: "PJ-1510", projectName: "Riviera",
    phaseId: "PH-1510-01", phaseName: "Phase 1",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 4.67,
    ...calcCosts(4.67, "WorldView-3", 1.09),
    systemRequested: "WorldView-3",
    requestedAt: "2025-04-06 05:30", capturedAt: "2025-04-09 07:44",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-09", updatedAt: "2025-04-10",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 4.7, sunElevation: 69.8, sunAzimuth: 163.3, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 31.18, bboxMaxLat: 31.24, bboxMinLng: 27.41, bboxMaxLng: 27.48 },
  },
  {
    id: "SAT-2025-018",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-001", areaName: "New Cairo",
    projectId: "PJ-1612", projectName: "Eastown",
    phaseId: "PH-1612-05", phaseName: "Phase 5",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 3.88,
    ...calcCosts(3.88, "SPOT-7", 1.08),
    systemRequested: "SPOT-7",
    requestedAt: "2025-02-10 08:00", capturedAt: "2025-02-22 10:30",
    type: "New", satellite: "Sentinel-1", createdAt: "2025-02-22", updatedAt: "2025-02-23",
    metadata: { cloudCoverPct: 7.1, incidenceAngle: 15.8, sunElevation: 50.6, sunAzimuth: 172.4, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.07, bboxMaxLat: 30.12, bboxMinLng: 31.46, bboxMaxLng: 31.53 },
  },
  {
    id: "SAT-2025-019",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-006", areaName: "6th of October",
    projectId: "PJ-1711", projectName: "O West",
    phaseId: "PH-1711-03", phaseName: "Phase 3",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 6.23,
    ...calcCosts(6.23, "Pleiades-1B", 1.06),
    systemRequested: "Pleiades-1B",
    requestedAt: "2025-04-03 10:00", capturedAt: "2025-04-07 12:48",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-04-07", updatedAt: "2025-04-08",
    metadata: { cloudCoverPct: 1.4, incidenceAngle: 8.0, sunElevation: 62.9, sunAzimuth: 155.8, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.99, bboxMaxLat: 30.06, bboxMinLng: 30.76, bboxMaxLng: 30.84 },
  },
  {
    id: "SAT-2024-020",
    developer: { id: "DV-005", name: "Mountain View", initials: "MV", color: "#059669" },
    areaId: "AR-006", areaName: "6th of October",
    projectId: "PJ-1808", projectName: "Mountain View October",
    phaseId: "PH-1808-02", phaseName: "Phase 2",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 2.64,
    ...calcCosts(2.64, "WorldView-2", 1.10),
    systemRequested: "WorldView-2",
    requestedAt: "2024-09-14 07:00", capturedAt: "2024-09-18 09:05",
    type: "Archived", satellite: "WorldView-2", createdAt: "2024-09-18", updatedAt: "2024-09-19",
    metadata: { cloudCoverPct: 4.8, incidenceAngle: 12.6, sunElevation: 65.4, sunAzimuth: 147.9, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "Pan"], bboxMinLat: 30.06, bboxMaxLat: 30.11, bboxMinLng: 30.69, bboxMaxLng: 30.76 },
  },
]

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUALITY_ORDER: ImageQuality[] = ["Medium", "High", "Very High", "Super High", "Ultra High"]

const QUALITY_RESOLUTION: Record<ImageQuality, string> = {
  "Medium":     "10 m",
  "High":       "3 m",
  "Very High":  "1 m",
  "Super High": "0.5 m",
  "Ultra High": "0.25 m",
}

const ALL_COLUMNS = [
  { id: "image",        label: "Image",            alwaysVisible: true },
  { id: "developer",    label: "Developer",         alwaysVisible: true },
  { id: "area",         label: "Area",              alwaysVisible: false },
  { id: "project",      label: "Project",           alwaysVisible: false },
  { id: "phase",        label: "Phase",             alwaysVisible: false },
  { id: "quality",      label: "Quality",           alwaysVisible: false },
  { id: "zoomHeight",   label: "GSD Range",         alwaysVisible: false },
  { id: "projectArea",  label: "Project Area",      alwaysVisible: false },
  { id: "areaCaptured", label: "Area Captured",     alwaysVisible: false },
  { id: "system",       label: "System Requested",  alwaysVisible: false },
  { id: "costUsd",      label: "Cost (USD)",        alwaysVisible: false },
  { id: "costEgp",      label: "Cost (EGP)",        alwaysVisible: false },
  { id: "requested",    label: "Requested",         alwaysVisible: false },
  { id: "captured",     label: "Captured",          alwaysVisible: false },
  { id: "type",         label: "Type",              alwaysVisible: false },
  { id: "satellite",    label: "Satellite",         alwaysVisible: false },
  { id: "createdAt",    label: "Created At",        alwaysVisible: false },
  { id: "updatedAt",    label: "Updated At",        alwaysVisible: false },
]

// ─── Helper: area conversions ──────────────────────────────────────────────────

function convertArea(km2: number) {
  return {
    km2:      km2.toFixed(2),
    m2:       (km2 * 1_000_000).toLocaleString(),
    feddans:  (km2 * 238.095).toFixed(1),
    acres:    (km2 * 247.105).toFixed(1),
    hectares: (km2 * 100).toFixed(1),
  }
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function SatThumbnail({ image, size = "sm" }: { image: SatelliteImage; size?: "sm" | "lg" }) {
  const isCoastal = image.areaName.includes("Sahel") || image.areaName.includes("Sokhna")
  const isUrban   = image.areaName.includes("Cairo") || image.areaName.includes("October") || image.areaName.includes("Zayed")
  const palette   = isCoastal
    ? { bg: "#1a4e6e", a: "#28728a", b: "#e8d9a0", c: "#2e8c66", d: "#4a9cb8" }
    : isUrban
    ? { bg: "#484858", a: "#8a9a88", b: "#c8c8b8", c: "#6a7868", d: "#9a9a8a" }
    : { bg: "#2e5e3e", a: "#4e8a5e", b: "#d8cc8e", c: "#5a9a6a", d: "#7ab888" }

  const h = image.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)

  if (size === "lg") {
    return (
      <div className="w-full h-52 rounded-lg overflow-hidden relative" style={{ backgroundColor: palette.bg }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(${h % 360}deg, ${palette.a}88 0%, ${palette.b}66 35%, ${palette.c}88 65%, ${palette.d}44 100%)` }} />
        <div className="absolute" style={{ top: '0', left: '0', width: `${40 + (h % 20)}%`, height: `${35 + (h % 25)}%`, backgroundColor: palette.a, opacity: 0.75 }} />
        <div className="absolute" style={{ top: '0', right: '0', width: `${30 + (h % 25)}%`, height: `${45 + (h % 20)}%`, backgroundColor: palette.b, opacity: 0.6 }} />
        <div className="absolute" style={{ bottom: '0', left: '0', right: '0', height: `${25 + (h % 15)}%`, backgroundColor: palette.c, opacity: 0.65 }} />
        <div className="absolute" style={{ top: `${25 + (h % 20)}%`, left: `${20 + (h % 15)}%`, width: `${30 + (h % 20)}%`, height: `${25 + (h % 20)}%`, backgroundColor: palette.d, opacity: 0.5 }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-8 h-8 opacity-40">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
            <div className="absolute inset-1 rounded-full border border-white" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
          {image.id}
        </div>
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
          {QUALITY_RESOLUTION[image.quality]}
        </div>
      </div>
    )
  }

  return (
    <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: palette.bg }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(${h % 360}deg, ${palette.a} 0%, ${palette.b}aa 50%, ${palette.c} 100%)` }} />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
    </div>
  )
}

function DeveloperAvatar({ dev }: { dev: DeveloperInfo }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: dev.color }}>
      {dev.initials}
    </div>
  )
}

function QualityBadge({ quality }: { quality: ImageQuality }) {
  const styles: Record<ImageQuality, string> = {
    "Medium":     "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300",
    "High":       "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    "Very High":  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
    "Super High": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    "Ultra High": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  }
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className={cn("text-[11px] font-medium px-1.5 py-0", styles[quality])}>
        {quality}
      </Badge>
      {/* resolution label removed — shown in GSD Range column instead */}
    </div>
  )
}

function TypeBadge({ type }: { type: ImageType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium",
        type === "New"
          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {type}
    </Badge>
  )
}

function SystemBadge({ system }: { system: string }) {
  let cls = "bg-slate-100 text-slate-700 border-slate-200"
  if (system === "Pleiades-1A" || system === "Pleiades-1B") cls = "bg-violet-50 text-violet-700 border-violet-200"
  else if (system === "WorldView-2") cls = "bg-blue-50 text-blue-700 border-blue-200"
  else if (system === "WorldView-3") cls = "bg-cyan-50 text-cyan-700 border-cyan-200"
  else if (system === "SPOT-7") cls = "bg-orange-50 text-orange-700 border-orange-200"
  else if (system === "Sentinel-2") cls = "bg-green-50 text-green-700 border-green-200"
  else if (system === "GeoEye-1") cls = "bg-teal-50 text-teal-700 border-teal-200"

  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium px-1.5 py-0 whitespace-nowrap", cls)}>
      {system}
    </Badge>
  )
}

function AreaTag({ areaName }: { areaName: string }) {
  let cls = "bg-slate-50 text-slate-700 border-slate-200"
  if (areaName === "New Cairo") cls = "bg-blue-50 text-blue-700 border-blue-200"
  else if (areaName === "6th of October") cls = "bg-orange-50 text-orange-700 border-orange-200"
  else if (areaName === "Sahel") cls = "bg-teal-50 text-teal-700 border-teal-200"
  else if (areaName === "Ain Sokhna") cls = "bg-amber-50 text-amber-700 border-amber-200"
  else if (areaName === "Sheikh Zayed") cls = "bg-purple-50 text-purple-700 border-purple-200"

  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium px-1.5 py-0 whitespace-nowrap", cls)}>
      {areaName}
    </Badge>
  )
}

// ─── Sort / Group helpers ──────────────────────────────────────────────────────

type MultiSortConfig = { column: string; direction: "asc" | "desc" }

function SortIcon({ col, configs }: { col: string; configs: MultiSortConfig[] }) {
  const cfg = configs.find((c) => c.column === col)
  if (!cfg) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />
  if (cfg.direction === "asc") return <ArrowUp className="h-3 w-3 ml-1" />
  return <ArrowDown className="h-3 w-3 ml-1" />
}

const IMAGE_SORT_COLS = [
  { id: "id",              label: "Image ID" },
  { id: "developer",       label: "Developer" },
  { id: "areaName",        label: "Area" },
  { id: "projectName",     label: "Project" },
  { id: "phaseName",       label: "Phase" },
  { id: "quality",         label: "Quality" },
  { id: "totalAreaKm2",    label: "Project Area" },
  { id: "areaCapturedKm2", label: "Area Captured" },
  { id: "costUsd",         label: "Cost (USD)" },
  { id: "zoomHeight",      label: "GSD Range" },
  { id: "systemRequested", label: "System Requested" },
  { id: "requestedAt",     label: "Requested" },
  { id: "capturedAt",      label: "Captured" },
  { id: "type",            label: "Type" },
  { id: "createdAt",       label: "Created At" },
]

const IMAGE_GROUP_COLS = [
  { id: "developer",       label: "Developer" },
  { id: "areaName",        label: "Area" },
  { id: "projectName",     label: "Project" },
  { id: "phaseName",       label: "Phase" },
  { id: "quality",         label: "Quality" },
  { id: "type",            label: "Type" },
  { id: "systemRequested", label: "System Requested" },
]

function getGroupValue(row: SatelliteImage, col: string): string {
  switch (col) {
    case "developer":       return row.developer.name
    case "areaName":        return row.areaName
    case "projectName":     return row.projectName
    case "phaseName":       return row.phaseName
    case "quality":         return row.quality
    case "type":            return row.type
    case "systemRequested": return row.systemRequested
    default:                return ""
  }
}

function sortRows(rows: SatelliteImage[], configs: MultiSortConfig[]): SatelliteImage[] {
  if (configs.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const cfg of configs) {
      let va: string | number = "", vb: string | number = ""
      switch (cfg.column) {
        case "id":              va = a.id;                              vb = b.id; break
        case "developer":       va = a.developer.name;                  vb = b.developer.name; break
        case "areaName":        va = a.areaName;                        vb = b.areaName; break
        case "projectName":     va = a.projectName;                     vb = b.projectName; break
        case "phaseName":       va = a.phaseName;                       vb = b.phaseName; break
        case "quality":         va = QUALITY_ORDER.indexOf(a.quality);  vb = QUALITY_ORDER.indexOf(b.quality); break
        case "totalAreaKm2":    va = a.totalAreaKm2;                    vb = b.totalAreaKm2; break
        case "areaCapturedKm2": va = a.areaCapturedKm2;                 vb = b.areaCapturedKm2; break
        case "costUsd":         va = a.costUsd;                         vb = b.costUsd; break
        case "zoomHeight":      va = a.resolutionM;                     vb = b.resolutionM; break
        case "systemRequested": va = a.systemRequested;                 vb = b.systemRequested; break
        case "requestedAt":     va = a.requestedAt;                     vb = b.requestedAt; break
        case "capturedAt":      va = a.capturedAt;                      vb = b.capturedAt; break
        case "type":            va = a.type;                            vb = b.type; break
        case "createdAt":       va = a.createdAt;                       vb = b.createdAt; break
      }
      const r = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb))
      if (r !== 0) return cfg.direction === "desc" ? -r : r
    }
    return 0
  })
}

// ─── Date/time formatter ──────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function formatDateTime(str: string): string {
  if (!str) return "—"
  const [datePart, timePart] = str.split(" ")
  const [y, m, d] = datePart.split("-").map(Number)
  if (!timePart || timePart === "00:00") return `${String(d).padStart(2,"0")} ${MONTHS[m-1]} ${y}`
  const [hr, mn] = timePart.split(":").map(Number)
  const period = hr >= 12 ? "PM" : "AM"
  const h = hr % 12 === 0 ? 12 : hr % 12
  return `${String(d).padStart(2,"0")} ${MONTHS[m-1]} ${y}, ${h}:${String(mn).padStart(2,"0")} ${period}`
}

// ─── Satellite badge ──────────────────────────────────────────────────────────

const SATELLITE_BADGE_COLORS: Record<string, string> = {
  "Sentinel-1":       "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400",
  "Sentinel-2":       "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  "Copernicus-3":     "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
  "Pleiades NEO":     "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
  "Pleiades-1":       "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  "WorldView Legion": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
  "WorldView-2":      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  "WorldView-3":      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400",
  "SPOT-7":           "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
}

function SatelliteBadge({ satellite }: { satellite: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium px-1.5 py-0", SATELLITE_BADGE_COLORS[satellite] ?? "bg-muted text-muted-foreground")}
    >
      {satellite}
    </Badge>
  )
}

// ─── Multi-select filter dropdown ─────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  className?: string
}) {
  const hasVal = selected.size > 0
  const displayLabel = selected.size === 0
    ? label
    : selected.size === 1
    ? [...selected][0]
    : `${label} · ${selected.size}`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasVal ? "default" : "outline"}
          size="sm"
          className={cn("h-8 text-xs justify-between min-w-0 px-2.5", className)}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start" sideOffset={4}>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isChecked = selected.has(opt)
            return (
              <button
                key={opt}
                onClick={() => {
                  const next = new Set(selected)
                  isChecked ? next.delete(opt) : next.add(opt)
                  onChange(next)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                  isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <div className={cn(
                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                  isChecked ? "bg-primary border-primary" : "border-border",
                )}>
                  {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            )
          })}
        </div>
        {selected.size > 0 && (
          <div className="border-t border-border mt-1.5 pt-1.5">
            <button
              onClick={() => onChange(new Set())}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 rounded-md hover:bg-muted transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Date range filter (popover, matches all-properties-page style) ───────────

function DateRangeFilter({
  label,
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
  className,
}: {
  label: string
  dateFrom: string
  dateTo: string
  onChangeFrom: (v: string) => void
  onChangeTo: (v: string) => void
  className?: string
}) {
  const hasVal = !!(dateFrom || dateTo)
  const display = hasVal
    ? [dateFrom && formatDateTime(dateFrom), dateTo && formatDateTime(dateTo)].filter(Boolean).join(" → ")
    : label

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasVal ? "default" : "outline"}
          size="sm"
          className={cn("h-8 text-xs justify-between min-w-0 px-2.5", className)}
        >
          <CalendarRange className="h-3 w-3 mr-1.5 shrink-0 opacity-70" />
          <span className="truncate flex-1 text-left">{display}</span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start" sideOffset={4}>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">{label} Range</p>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">From</label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={dateFrom}
              onChange={(e) => onChangeFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">To</label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={dateTo}
              onChange={(e) => onChangeTo(e.target.value)}
            />
          </div>
          {hasVal && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => { onChangeFrom(""); onChangeTo("") }}
            >
              <X className="h-3 w-3 mr-1" />Clear dates
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Images Tab ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function ImagesTab() {
  // ── Filter state ──
  const [search, setSearch]                     = useState("")
  const [developerFilter, setDeveloper]         = useState<Set<string>>(new Set())
  const [qualityFilter, setQuality]             = useState<Set<string>>(new Set())
  const [typeFilter, setType]                   = useState<Set<string>>(new Set())
  const [projectFilter, setProject]             = useState<Set<string>>(new Set())
  const [areaFilter, setArea]                   = useState<Set<string>>(new Set())
  const [systemFilter, setSystem]               = useState<Set<string>>(new Set())
  const [satelliteFilter, setSatellite]         = useState<Set<string>>(new Set())
  const [requestedFrom, setRequestedFrom]       = useState("")
  const [requestedTo, setRequestedTo]           = useState("")
  // ── Sort state ──
  const [sortConfigs, setSortConfigs]     = useState<MultiSortConfig[]>([])
  const [draggedSortIdx, setDraggedSortIdx] = useState<number | null>(null)
  const [showSortPopover, setShowSortPopover] = useState(false)
  // ── Group state ──
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // ── Selection state ──
  const [selectedRows, setSelectedRows]   = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)
  // ── UI state ──
  const [page, setPage]                   = useState(1)
  const [detailRow, setDetailRow]         = useState<SatelliteImage | null>(null)
  const [visibleCols, setVisibleCols]     = useState<Set<string>>(new Set(ALL_COLUMNS.map((c) => c.id)))

  const uniqueDevelopers = useMemo(
    () => Array.from(new Set(SATELLITE_IMAGES.map((i) => i.developer.name))).sort(),
    [],
  )
  const uniqueProjects = useMemo(
    () => Array.from(new Set(SATELLITE_IMAGES.map((i) => i.projectName))).sort(),
    [],
  )
  const uniqueAreas = useMemo(
    () => Array.from(new Set(SATELLITE_IMAGES.map((i) => i.areaName))).sort(),
    [],
  )
  const uniqueSystems = useMemo(
    () => Array.from(new Set(SATELLITE_IMAGES.map((i) => i.systemRequested))).sort(),
    [],
  )
  const uniqueSatellites = useMemo(
    () => Array.from(new Set(SATELLITE_IMAGES.map((i) => i.satellite))).sort(),
    [],
  )

  const filtered = useMemo(() => {
    let rows = [...SATELLITE_IMAGES]
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) => r.id.toLowerCase().includes(q))
    }
    if (developerFilter.size > 0)  rows = rows.filter((r) => developerFilter.has(r.developer.name))
    if (qualityFilter.size > 0)    rows = rows.filter((r) => qualityFilter.has(r.quality))
    if (typeFilter.size > 0)       rows = rows.filter((r) => typeFilter.has(r.type))
    if (projectFilter.size > 0)    rows = rows.filter((r) => projectFilter.has(r.projectName))
    if (areaFilter.size > 0)       rows = rows.filter((r) => areaFilter.has(r.areaName))
    if (systemFilter.size > 0)     rows = rows.filter((r) => systemFilter.has(r.systemRequested))
    if (satelliteFilter.size > 0)  rows = rows.filter((r) => satelliteFilter.has(r.satellite))
    if (requestedFrom) rows = rows.filter((r) => r.requestedAt.split(" ")[0] >= requestedFrom)
    if (requestedTo)   rows = rows.filter((r) => r.requestedAt.split(" ")[0] <= requestedTo)
    return sortRows(rows, sortConfigs)
  }, [search, developerFilter, qualityFilter, typeFilter, projectFilter, areaFilter, systemFilter, satelliteFilter, requestedFrom, requestedTo, sortConfigs])

  // ── Analysis card totals ──
  const totalAreaCaptured = useMemo(() => filtered.reduce((s, r) => s + r.areaCapturedKm2, 0), [filtered])
  const totalProjectArea  = useMemo(() => filtered.reduce((s, r) => s + r.totalAreaKm2, 0), [filtered])
  const totalCostUsd      = useMemo(() => filtered.reduce((s, r) => s + r.costUsd, 0), [filtered])

  // ── Grouped rows (when group-by is active, skip pagination) ──
  const groupedRows = useMemo(() => {
    if (!groupByColumn) return null
    const map = new Map<string, SatelliteImage[]>()
    for (const row of filtered) {
      const key = getGroupValue(row, groupByColumn)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return map
  }, [filtered, groupByColumn])

  const groupKeys = groupedRows ? Array.from(groupedRows.keys()) : []

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = groupByColumn ? [] : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allDisplayRows = groupByColumn ? filtered : pageRows

  const hasFilter = !!(
    search ||
    developerFilter.size > 0 || qualityFilter.size > 0 || typeFilter.size > 0 ||
    projectFilter.size > 0 || areaFilter.size > 0 || systemFilter.size > 0 ||
    satelliteFilter.size > 0 || requestedFrom || requestedTo
  )

  const clearFilters = () => {
    setSearch("")
    setDeveloper(new Set()); setQuality(new Set()); setType(new Set())
    setProject(new Set()); setArea(new Set()); setSystem(new Set()); setSatellite(new Set())
    setRequestedFrom(""); setRequestedTo(""); setPage(1)
  }

  const vis = (id: string) => visibleCols.has(id)

  const toggleCol = (id: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Sort ──
  const toggleColumnSort = (col: string) => {
    setSortConfigs((prev) => {
      const ex = prev.find((s) => s.column === col)
      if (!ex) return [{ column: col, direction: "asc" }]
      if (ex.direction === "asc") return [{ column: col, direction: "desc" }]
      return []
    })
  }
  const handleSortDragStart = (i: number) => setDraggedSortIdx(i)
  const handleSortDragOver  = (e: React.DragEvent, target: number) => {
    e.preventDefault()
    if (draggedSortIdx === null || draggedSortIdx === target) return
    setSortConfigs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(draggedSortIdx, 1)
      next.splice(target, 0, moved)
      setDraggedSortIdx(target)
      return next
    })
  }
  const handleSortDragEnd = () => setDraggedSortIdx(null)

  // ── Selection ──
  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? new Set(allDisplayRows.map((r) => r.id)) : new Set())
  }
  const handleSelectRow = (id: string, idx: number, shiftKey: boolean) => {
    const next = new Set(selectedRows)
    if (shiftKey && lastSelectedIdx !== null) {
      const [s, e] = [Math.min(lastSelectedIdx, idx), Math.max(lastSelectedIdx, idx)]
      for (let i = s; i <= e; i++) { const r = allDisplayRows[i]; if (r) next.add(r.id) }
    } else {
      next.has(id) ? next.delete(id) : next.add(id)
      setLastSelectedIdx(idx)
    }
    setSelectedRows(next)
  }

  // ── Row renderer ──
  const renderRow = (row: SatelliteImage, flatIdx: number, _localIdx: number) => {
    const isSel = selectedRows.has(row.id)
    const stickyLeftBg = isSel
      ? "bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100"
      : "bg-card group-hover:bg-muted/50"
    const stickyRightBg = isSel
      ? "bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100"
      : "bg-card group-hover:bg-muted/50"

    return (
      <tr
        key={row.id}
        className={cn(
          "border-b border-border cursor-pointer transition-colors group",
          isSel ? "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50" : "hover:bg-muted/50",
        )}
        onClick={() => setDetailRow(row)}
      >
        {/* Checkbox — sticky left */}
        <td
          className={cn("border-r border-border px-3 py-2.5 sticky left-0 z-10", stickyLeftBg)}
          onClick={(e) => { e.stopPropagation(); handleSelectRow(row.id, flatIdx, e.shiftKey) }}
        >
          <Checkbox checked={isSel} onCheckedChange={() => {}} />
        </td>

        {/* Image */}
        <td className="border-r border-border px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <SatThumbnail image={row} size="sm" />
            <div>
              <div className="font-mono text-xs font-semibold text-foreground">{row.id}</div>
              <div className="text-[10px] text-muted-foreground">{row.systemRequested}</div>
            </div>
          </div>
        </td>

        {/* Developer */}
        <td className="border-r border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <DeveloperAvatar dev={row.developer} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{row.developer.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{row.developer.id}</div>
            </div>
          </div>
        </td>

        {vis("area") && (
          <td className="border-r border-border px-3 py-2.5"><AreaTag areaName={row.areaName} /></td>
        )}
        {vis("project") && (
          <td className="border-r border-border px-3 py-2.5">
            <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{row.projectName}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{row.projectId}</div>
          </td>
        )}
        {vis("phase") && (
          <td className="border-r border-border px-3 py-2.5">
            <div className="text-sm text-foreground">{row.phaseName}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{row.phaseId}</div>
          </td>
        )}
        {vis("quality") && (
          <td className="border-r border-border px-3 py-2.5"><QualityBadge quality={row.quality} /></td>
        )}
        {vis("zoomHeight") && (
          <td className="border-r border-border px-3 py-2.5 text-xs font-mono text-foreground whitespace-nowrap">
            {getZoomHeight(row.systemRequested)}
          </td>
        )}
        {vis("projectArea") && (
          <td className="border-r border-border px-3 py-2.5">
            <span className="text-sm font-semibold tabular-nums">{row.totalAreaKm2.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">km²</span>
          </td>
        )}
        {vis("areaCaptured") && (
          <td className="border-r border-border px-3 py-2.5">
            <span className="text-sm font-semibold tabular-nums">{row.areaCapturedKm2.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">km²</span>
          </td>
        )}
        {vis("system") && (
          <td className="border-r border-border px-3 py-2.5"><SystemBadge system={row.systemRequested} /></td>
        )}
        {vis("costUsd") && (
          <td className="border-r border-border px-3 py-2.5">
            <span className="text-sm font-semibold tabular-nums">
              {row.costUsd === 0 ? "Free" : `$${row.costUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </td>
        )}
        {vis("costEgp") && (
          <td className="border-r border-border px-3 py-2.5">
            <span className="text-sm font-semibold tabular-nums">
              {row.costEgp === 0 ? "Free" : `EGP ${row.costEgp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </td>
        )}
        {vis("requested") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.requestedAt)}</td>
        )}
        {vis("captured") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.capturedAt)}</td>
        )}
        {vis("type") && (
          <td className="border-r border-border px-3 py-2.5"><TypeBadge type={row.type} /></td>
        )}
        {vis("satellite") && (
          <td className="border-r border-border px-3 py-2.5"><SatelliteBadge satellite={row.satellite} /></td>
        )}
        {vis("createdAt") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
        )}
        {vis("updatedAt") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.updatedAt)}</td>
        )}

        {/* Sticky action — fixed right, bg tracks selection + hover */}
        <td className={cn(
          "px-3 py-2.5 sticky right-0 z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.12)]",
          stickyRightBg,
        )}>
          <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </td>
      </tr>
    )
  }

  // Column header
  const colTh = (label: string, col: string, extraClass = "") => (
    <th
      className={cn("bg-muted border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap", extraClass)}
      onClick={() => toggleColumnSort(col)}
    >
      <span className="flex items-center hover:text-foreground transition-colors">
        {label}
        <SortIcon col={col} configs={sortConfigs} />
      </span>
    </th>
  )

  return (
    <div className="space-y-3">

      {/* ── Analysis cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Images</p>
          <p className="text-2xl font-semibold tabular-nums">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">total images</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Total Area Captured</p>
          <p className="text-2xl font-semibold tabular-nums">{totalAreaCaptured.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">km²</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Total Project Areas</p>
          <p className="text-2xl font-semibold tabular-nums">{totalProjectArea.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">km²</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
          <p className="text-2xl font-semibold tabular-nums">
            {totalCostUsd === 0
              ? "$0.00"
              : `$${totalCostUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ~EGP {(totalCostUsd * 50).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* ── Filter card ── */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">

        {/* Row 1: Search + Developer + Project + Area + System */}
        <div className="flex items-center gap-2">
          <div className="relative shrink-0 w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pl-8 pr-7 w-full text-sm"
              placeholder="Search by Image ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1) }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <MultiSelectFilter label="Developer"  options={uniqueDevelopers} selected={developerFilter} onChange={(s) => { setDeveloper(s); setPage(1) }} className="w-36" />
          <MultiSelectFilter label="Project"    options={uniqueProjects}   selected={projectFilter}   onChange={(s) => { setProject(s);  setPage(1) }} className="w-32" />
          <MultiSelectFilter label="Area"       options={uniqueAreas}      selected={areaFilter}      onChange={(s) => { setArea(s);     setPage(1) }} className="w-28" />
          <MultiSelectFilter label="System"     options={uniqueSystems}    selected={systemFilter}    onChange={(s) => { setSystem(s);   setPage(1) }} className="w-28" />
        </div>

        {/* Row 2: Satellite + Quality + Type + Requested date range */}
        <div className="flex items-center gap-2">
          <MultiSelectFilter label="Satellite"  options={uniqueSatellites} selected={satelliteFilter} onChange={(s) => { setSatellite(s); setPage(1) }} className="w-36" />
          <MultiSelectFilter label="Quality"    options={QUALITY_ORDER}    selected={qualityFilter}   onChange={(s) => { setQuality(s);  setPage(1) }} className="w-28" />
          <MultiSelectFilter label="Type"       options={["New","Archived"]} selected={typeFilter}    onChange={(s) => { setType(s);     setPage(1) }} className="w-24" />
          <DateRangeFilter
            label="Requested Date"
            dateFrom={requestedFrom}
            dateTo={requestedTo}
            onChangeFrom={(v) => { setRequestedFrom(v); setPage(1) }}
            onChangeTo={(v)   => { setRequestedTo(v);   setPage(1) }}
            className="w-44"
          />
        </div>

        {/* Row 3: Clear All left | Sort + Group + Columns right */}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <div className="flex items-center gap-2">
            {hasFilter && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort popover */}
            <Popover open={showSortPopover} onOpenChange={setShowSortPopover}>
              <PopoverTrigger asChild>
                <Button variant={sortConfigs.length > 0 ? "default" : "outline"} size="sm" className="h-8">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  Sort
                  {sortConfigs.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{sortConfigs.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Sort by multiple columns</h4>
                    {sortConfigs.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSortConfigs([])}>Clear all</Button>
                    )}
                  </div>
                  {sortConfigs.length > 0 && (
                    <p className="text-xs text-muted-foreground -mt-2">Drag to reorder priority.</p>
                  )}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {sortConfigs.map((cfg, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => handleSortDragStart(i)}
                        onDragOver={(e) => handleSortDragOver(e, i)}
                        onDragEnd={handleSortDragEnd}
                        className={cn("flex items-center gap-2 p-2.5 bg-secondary/40 rounded-lg cursor-default", draggedSortIdx === i && "opacity-40")}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <span className="text-xs text-muted-foreground w-14 shrink-0">{i === 0 ? "Sort by" : "Then by"}</span>
                        <Select value={cfg.column} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, idx) => idx === i ? { ...c, column: v } : c))}>
                          <SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                          <SelectContent>
                            {IMAGE_SORT_COLS.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={cfg.direction} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, idx) => idx === i ? { ...c, direction: v as "asc" | "desc" } : c))}>
                          <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                            <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSortConfigs((prev) => prev.filter((_, idx) => idx !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {sortConfigs.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-3">No sort applied. Add a level below.</p>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm" className="w-full h-8"
                    disabled={sortConfigs.length >= 5}
                    onClick={() => setSortConfigs((prev) => [...prev, { column: IMAGE_SORT_COLS[0].id, direction: "asc" }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add sort level
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Group dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupByColumn ? "default" : "outline"} size="sm" className="h-8">
                  <Group className="h-3.5 w-3.5 mr-1.5" />
                  Group
                  {groupByColumn && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {IMAGE_GROUP_COLS.find((c) => c.id === groupByColumn)?.label ?? groupByColumn}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setGroupByColumn(null); setCollapsedGroups(new Set()) }}>No Grouping</DropdownMenuItem>
                <DropdownMenuSeparator />
                {IMAGE_GROUP_COLS.map((opt) => (
                  <DropdownMenuItem key={opt.id} onClick={() => { setGroupByColumn(opt.id); setCollapsedGroups(new Set()) }}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Columns */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Columns3 className="h-3.5 w-3.5 mr-1.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {ALL_COLUMNS.filter((c) => !c.alwaysVisible).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={vis(c.id)}
                    onCheckedChange={() => toggleCol(c.id)}
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
        style={{ height: "calc(100vh - 380px)", minHeight: 480 }}
      >
        {/* Table header bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">Satellite Images</span>
            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-xs px-2">
              {filtered.length.toLocaleString()}
            </Badge>
            {hasFilter && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-xs text-amber-600 font-medium">Filtered</span>
              </>
            )}
            {groupByColumn && groupKeys.length > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
                  onClick={() => setCollapsedGroups(new Set(groupKeys))}>Collapse All</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
                  onClick={() => setCollapsedGroups(new Set())}>Expand All</Button>
              </>
            )}
          </div>
          <Button size="sm" className="h-8">
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Capture New
          </Button>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20">
              <tr>
                {/* Sticky left — checkbox */}
                <th className="bg-muted border-r border-border px-3 py-2 w-10 sticky left-0 z-30">
                  <Checkbox
                    checked={allDisplayRows.length > 0 && allDisplayRows.every((r) => selectedRows.has(r.id))}
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                  />
                </th>
                {colTh("Image",         "id",              "min-w-[180px]")}
                {colTh("Developer",     "developer",       "min-w-[200px]")}
                {vis("area")         && colTh("Area",           "areaName",        "min-w-[130px]")}
                {vis("project")      && colTh("Project",        "projectName",     "min-w-[160px]")}
                {vis("phase")        && <th className="bg-muted border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[140px] whitespace-nowrap">Phase</th>}
                {vis("quality")      && colTh("Quality",        "quality",         "min-w-[110px]")}
                {vis("zoomHeight")   && colTh("GSD Range",      "zoomHeight",      "min-w-[120px]")}
                {vis("projectArea")  && colTh("Project Area",   "totalAreaKm2",    "min-w-[120px]")}
                {vis("areaCaptured") && colTh("Area Captured",  "areaCapturedKm2", "min-w-[130px]")}
                {vis("system")       && colTh("System",         "systemRequested", "min-w-[140px]")}
                {vis("costUsd")      && colTh("Cost (USD)",     "costUsd",         "min-w-[110px]")}
                {vis("costEgp")      && colTh("Cost (EGP)",     "costEgp",         "min-w-[120px]")}
                {vis("requested")    && colTh("Requested",      "requestedAt",     "min-w-[160px]")}
                {vis("captured")     && colTh("Captured",       "capturedAt",      "min-w-[160px]")}
                {vis("type")         && colTh("Type",           "type",            "min-w-[90px]")}
                {vis("satellite")    && colTh("Satellite",      "satellite",       "min-w-[130px]")}
                {vis("createdAt")    && <th className="bg-muted border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[150px] whitespace-nowrap">Created At</th>}
                {vis("updatedAt")    && <th className="bg-muted border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[150px] whitespace-nowrap">Updated At</th>}
                {/* Sticky right — action */}
                <th className="bg-muted px-3 py-2 w-10 sticky right-0 z-30 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.18)]" />
              </tr>
            </thead>
            <tbody>
              {groupedRows
                ? Array.from(groupedRows.entries()).map(([key, groupItems]) => {
                    const isCollapsed = collapsedGroups.has(key)
                    const groupLabel = IMAGE_GROUP_COLS.find((c) => c.id === groupByColumn)?.label ?? groupByColumn
                    return (
                      <>
                        <tr
                          key={`grp-${key}`}
                          className="bg-muted/60 border-b border-border cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => setCollapsedGroups((prev) => {
                            const next = new Set(prev)
                            next.has(key) ? next.delete(key) : next.add(key)
                            return next
                          })}
                        >
                          <td colSpan={100} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !isCollapsed && "rotate-90")} />
                              <span className="text-xs font-semibold text-foreground">{key}</span>
                              <span className="text-[10px] text-muted-foreground">— {groupLabel}</span>
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{groupItems.length}</Badge>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && groupItems.map((row, idx) => renderRow(row, filtered.indexOf(row), idx))}
                      </>
                    )
                  })
                : pageRows.map((row, idx) => renderRow(row, idx, idx))
              }
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground gap-2">
              <ScanSearch className="h-8 w-8 mb-1 opacity-30" />
              No images match the current filters.
              {hasFilter && (
                <Button variant="link" size="sm" className="h-6" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Pagination footer ── */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem><FileText className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><FileDown className="h-4 w-4 mr-2" />PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? "No results"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} images`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…")
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ell-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                ),
              )}
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Bulk actions bar ── */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0 bg-zinc-900 text-white rounded-xl shadow-2xl overflow-hidden text-sm select-none">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-semibold tabular-nums">{selectedRows.size} selected</span>
            <button
              className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
              onClick={() => handleSelectAll(true)}
            >
              Select all
            </button>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors">
            <Edit className="h-3.5 w-3.5 text-zinc-400" />
            Edit fields
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors">
            <Camera className="h-3.5 w-3.5 text-zinc-400" />
            Re-capture
          </button>
          <div className="w-px h-8 bg-zinc-700" />
          <button className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-red-400 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <div className="w-px h-8 bg-zinc-700" />
          <button
            className="px-3 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            onClick={() => setSelectedRows(new Set())}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] flex flex-col p-0">
          {detailRow && (() => {
            const selected = detailRow
            const area = convertArea(selected.totalAreaKm2)
            const capturedArea = convertArea(selected.areaCapturedKm2)
            return (
              <>
                <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5">{selected.id}</Badge>
                    <TypeBadge type={selected.type} />
                    <QualityBadge quality={selected.quality} />
                  </div>
                  <SheetTitle className="text-base font-semibold">
                    {selected.projectName} — {selected.phaseName}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selected.developer.name} · {selected.areaName} · {selected.areaId}
                  </p>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  <SatThumbnail image={selected} size="lg" />

                  {/* Image Details */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Image Details</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: "Image ID",        value: selected.id,                  mono: true },
                        { label: "System",          value: selected.systemRequested,      mono: true },
                        { label: "GSD Range",       value: getZoomHeight(selected.systemRequested) },
                        { label: "Requested At",    value: formatDateTime(selected.requestedAt) },
                        { label: "Captured At",     value: formatDateTime(selected.capturedAt) },
                        { label: "Created At",      value: formatDateTime(selected.createdAt) },
                        { label: "Updated At",      value: formatDateTime(selected.updatedAt) },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className={cn("text-sm", mono ? "font-mono" : "font-medium")}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Cost */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acquisition Cost</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Area Captured</p>
                        <p className="text-sm font-semibold tabular-nums">{selected.areaCapturedKm2.toFixed(3)} km²</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Cost (USD)</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {selected.costUsd === 0
                            ? "Free"
                            : `$${selected.costUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Cost (EGP)</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {selected.costEgp === 0
                            ? "—"
                            : `EGP ${selected.costEgp.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Developer & Project */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Developer & Project</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: "Developer",   value: selected.developer.name },
                        { label: "Dev ID",      value: selected.developer.id,  mono: true },
                        { label: "Area",        value: selected.areaName },
                        { label: "Area ID",     value: selected.areaId,        mono: true },
                        { label: "Project",     value: selected.projectName },
                        { label: "Project ID",  value: selected.projectId,     mono: true },
                        { label: "Phase",       value: selected.phaseName },
                        { label: "Phase ID",    value: selected.phaseId,       mono: true },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className={cn("text-sm", mono ? "font-mono text-xs" : "font-medium")}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Project Area Conversions */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5" />Project Area
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Sq. Kilometres", value: `${area.km2} km²` },
                        { label: "Sq. Metres",     value: `${area.m2} m²` },
                        { label: "Feddans",        value: `${area.feddans} fed` },
                        { label: "Acres",          value: `${area.acres} ac` },
                        { label: "Hectares",       value: `${area.hectares} ha` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm font-semibold tabular-nums">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Acquisition Metadata */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />Acquisition Metadata
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: "Cloud Cover",      value: `${selected.metadata.cloudCoverPct}%` },
                        { label: "Incidence Angle",  value: `${selected.metadata.incidenceAngle}°` },
                        { label: "Sun Elevation",    value: `${selected.metadata.sunElevation}°` },
                        { label: "Sun Azimuth",      value: `${selected.metadata.sunAzimuth}°` },
                        { label: "Processing Level", value: selected.metadata.processingLevel },
                        { label: "Available Bands",  value: selected.metadata.bandsAvailable.join(", ") },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Bounding Box */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />Bounding Box
                    </p>
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div><span className="text-muted-foreground">Min Lat  </span><span className="font-semibold">{selected.metadata.bboxMinLat.toFixed(4)}°</span></div>
                        <div><span className="text-muted-foreground">Max Lat  </span><span className="font-semibold">{selected.metadata.bboxMaxLat.toFixed(4)}°</span></div>
                        <div><span className="text-muted-foreground">Min Lng  </span><span className="font-semibold">{selected.metadata.bboxMinLng.toFixed(4)}°</span></div>
                        <div><span className="text-muted-foreground">Max Lng  </span><span className="font-semibold">{selected.metadata.bboxMaxLng.toFixed(4)}°</span></div>
                      </div>
                      <p className="mt-2 text-muted-foreground text-[10px]">WGS84 / EPSG:4326</p>
                    </div>
                  </div>

                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Construction Analysis Tab ─────────────────────────────────────────────────

function ConstructionAnalysisTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-2">
        <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h2 className="text-base font-semibold text-foreground">Construction Update Analysis</h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        Quarterly construction progress analysis comparing satellite captures against the finalized masterplan.
        Measures progress for construction, landscapes, and waterfronts.
      </p>
      <Badge variant="outline" className="text-xs text-muted-foreground mt-2">Coming Soon</Badge>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function NawySpacePage() {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">

        <div className="px-1 pt-1">
          <p className="text-xs text-muted-foreground mb-1">Market Updates</p>
          <h1 className="text-2xl font-semibold text-foreground">Nawy Space</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sentinel satellite imagery for off-plan real estate projects — track construction progress and compare against final masterplans on a quarterly basis.
          </p>
        </div>

        <Tabs defaultValue="images" className="space-y-4">
          <TabsList className="bg-card">
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="analysis">Construction Update Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="images">
            <ImagesTab />
          </TabsContent>
          <TabsContent value="analysis">
            <ConstructionAnalysisTab />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}

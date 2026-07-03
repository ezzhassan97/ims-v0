"use client"

import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
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
  Copy,
  Download,
  Maximize2,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ImageQuality = "Medium" | "High" | "Very High" | "Super High" | "Ultra High"
type ImageType = "New" | "Archived"
type CapturingStatus = "Queued" | "Requested" | "Captured"

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
  subAreaName: string
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
  capturingStatus: CapturingStatus
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

// GSD derived from satellite constellation name, not ingestion system
function getZoomHeight(satellite: string): string {
  if (satellite.includes("WorldView Legion") || satellite.includes("WorldView-3")) return "0.25 – 0.31 m"
  if (satellite.includes("WorldView-2"))  return "0.46 – 0.52 m"
  if (satellite.includes("Pleiades"))     return "0.50 – 0.75 m"
  if (satellite.includes("SPOT"))         return "1.5 – 2.0 m"
  if (satellite.includes("Sentinel") || satellite.includes("Copernicus")) return "10.0 m"
  return "—"
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SATELLITE_IMAGES: SatelliteImage[] = [
  {
    id: "SAT-2025-001",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    projectId: "PJ-0124", projectName: "Palm Hills October",
    phaseId: "PH-0124-02", phaseName: "Phase 2",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 3.24,
    ...calcCosts(3.24, "Pleiades-1A", 1.07),
    systemRequested: "IMS",
    capturingStatus: "Requested", requestedAt: "2025-04-10 09:00", capturedAt: "2025-04-15 11:23",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-04-15 14:32", updatedAt: "2025-04-16 16:40",
    metadata: { cloudCoverPct: 2.1, incidenceAngle: 8.4, sunElevation: 61.2, sunAzimuth: 154.3, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.88, bboxMaxLat: 29.93, bboxMinLng: 30.94, bboxMaxLng: 31.01 },
  },
  {
    id: "SAT-2025-002",
    developer: { id: "DV-002", name: "Emaar Misr", initials: "EM", color: "#b45309" },
    areaId: "AR-014", areaName: "Sahel", subAreaName: "Sidi Abdel Rahman",
    projectId: "PJ-0055", projectName: "Marassi",
    phaseId: "PH-0055-05", phaseName: "Phase 5",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 7.82,
    ...calcCosts(7.82, "WorldView-3", 1.09),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2025-03-28 08:30", capturedAt: "2025-04-02 10:14",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-02 09:15", updatedAt: "2025-04-03 10:22",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 5.1, sunElevation: 68.4, sunAzimuth: 162.7, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.96, bboxMaxLat: 31.03, bboxMinLng: 28.42, bboxMaxLng: 28.51 },
  },
  {
    id: "SAT-2025-003",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    projectId: "PJ-0088", projectName: "Allegria",
    phaseId: "PH-0088-01", phaseName: "Phase 1",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 2.15,
    ...calcCosts(2.15, "SPOT-7", 1.06),
    systemRequested: "Listing",
    capturingStatus: "Captured", requestedAt: "2024-11-05 10:00", capturedAt: "2024-11-18 09:55",
    type: "Archived", satellite: "SPOT-7", createdAt: "2024-11-18 11:48", updatedAt: "2024-11-19 13:05",
    metadata: { cloudCoverPct: 5.4, incidenceAngle: 14.2, sunElevation: 52.8, sunAzimuth: 170.1, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.94, bboxMaxLat: 29.98, bboxMinLng: 30.87, bboxMaxLng: 30.93 },
  },
  {
    id: "SAT-2025-004",
    developer: { id: "DV-004", name: "Hyde Park Developments", initials: "HP", color: "#7c3aed" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-0201", projectName: "Hyde Park Estate",
    phaseId: "PH-0201-03", phaseName: "Phase 3",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 5.41,
    ...calcCosts(5.41, "Pleiades-1B", 1.08),
    systemRequested: "IMS",
    capturingStatus: "Captured", requestedAt: "2025-03-14 11:00", capturedAt: "2025-03-18 13:02",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-03-18 16:05", updatedAt: "2025-03-19 17:33",
    metadata: { cloudCoverPct: 1.2, incidenceAngle: 7.8, sunElevation: 63.5, sunAzimuth: 149.2, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.01, bboxMaxLat: 30.08, bboxMinLng: 31.44, bboxMaxLng: 31.52 },
  },
  {
    id: "SAT-2025-005",
    developer: { id: "DV-005", name: "Mountain View", initials: "MV", color: "#059669" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-0312", projectName: "Mountain View iCity",
    phaseId: "PH-0312-04", phaseName: "Phase 4",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 4.28,
    ...calcCosts(4.28, "WorldView-2", 1.10),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2025-02-20 07:00", capturedAt: "2025-02-24 08:41",
    type: "New", satellite: "WorldView-2", createdAt: "2025-02-24 08:27", updatedAt: "2025-02-25 09:58",
    metadata: { cloudCoverPct: 3.7, incidenceAngle: 11.9, sunElevation: 57.4, sunAzimuth: 158.8, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.04, bboxMaxLat: 30.10, bboxMinLng: 31.55, bboxMaxLng: 31.62 },
  },
  {
    id: "SAT-2025-006",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-014", areaName: "Sahel", subAreaName: "Sidi Abdel Rahman",
    projectId: "PJ-0441", projectName: "Silversands",
    phaseId: "PH-0441-02", phaseName: "Phase 2",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 2.93,
    ...calcCosts(2.93, "WorldView-3", 1.06),
    systemRequested: "Listing",
    capturingStatus: "Requested", requestedAt: "2025-04-01 06:00", capturedAt: "2025-04-04 07:55",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-04 13:51", updatedAt: "2025-04-05 15:14",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 4.3, sunElevation: 70.1, sunAzimuth: 165.4, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan", "Coastal"], bboxMinLat: 31.12, bboxMaxLat: 31.17, bboxMinLng: 27.68, bboxMaxLng: 27.74 },
  },
  {
    id: "SAT-2025-007",
    developer: { id: "DV-007", name: "Tatweer Misr", initials: "TM", color: "#0284c7" },
    areaId: "AR-014", areaName: "Sahel", subAreaName: "Sidi Abdel Rahman",
    projectId: "PJ-0522", projectName: "Fouka Bay",
    phaseId: "PH-0522-01", phaseName: "Phase 1",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 1.87,
    ...calcCosts(1.87, "Pleiades-1A", 1.08),
    systemRequested: "IMS",
    capturingStatus: "Captured", requestedAt: "2025-03-05 08:00", capturedAt: "2025-03-09 11:28",
    type: "New", satellite: "Sentinel-2", createdAt: "2025-03-09 10:33", updatedAt: "2025-03-10 11:47",
    metadata: { cloudCoverPct: 1.8, incidenceAngle: 9.2, sunElevation: 60.8, sunAzimuth: 160.0, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 31.06, bboxMaxLat: 31.10, bboxMinLng: 28.91, bboxMaxLng: 28.96 },
  },
  {
    id: "SAT-2025-008",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-009", areaName: "Sheikh Zayed", subAreaName: "Beverly Hills",
    projectId: "PJ-0610", projectName: "ZED",
    phaseId: "PH-0610-03", phaseName: "Phase 3",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 3.62,
    ...calcCosts(3.62, "SPOT-7", 1.05),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2025-01-18 09:00", capturedAt: "2025-01-28 10:11",
    type: "New", satellite: "SPOT-7", createdAt: "2025-01-28 15:19", updatedAt: "2025-01-29 16:52",
    metadata: { cloudCoverPct: 8.2, incidenceAngle: 18.4, sunElevation: 43.1, sunAzimuth: 175.6, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.02, bboxMaxLat: 30.08, bboxMinLng: 30.96, bboxMaxLng: 31.04 },
  },
  {
    id: "SAT-2025-009",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-0711", projectName: "Villette",
    phaseId: "PH-0711-02", phaseName: "Phase 2",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 6.14,
    ...calcCosts(6.14, "Pleiades-1B", 1.09),
    systemRequested: "Listing",
    capturingStatus: "Captured", requestedAt: "2024-10-12 10:30", capturedAt: "2024-10-17 12:05",
    type: "Archived", satellite: "Pleiades NEO", createdAt: "2024-10-17 07:42", updatedAt: "2024-10-18 08:19",
    metadata: { cloudCoverPct: 4.1, incidenceAngle: 10.7, sunElevation: 55.9, sunAzimuth: 153.8, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.06, bboxMaxLat: 30.13, bboxMinLng: 31.49, bboxMaxLng: 31.58 },
  },
  {
    id: "SAT-2025-010",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-0802", projectName: "Palm Hills New Cairo",
    phaseId: "PH-0802-01", phaseName: "Phase 1",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 4.77,
    ...calcCosts(4.77, "WorldView-2", 1.07),
    systemRequested: "IMS",
    capturingStatus: "Queued", requestedAt: "2025-04-08 07:00", capturedAt: "2025-04-12 09:33",
    type: "New", satellite: "WorldView-2", createdAt: "2025-04-12 12:58", updatedAt: "2025-04-13 14:26",
    metadata: { cloudCoverPct: 0.6, incidenceAngle: 6.2, sunElevation: 64.7, sunAzimuth: 151.4, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "Pan"], bboxMinLat: 30.08, bboxMaxLat: 30.15, bboxMinLng: 31.40, bboxMaxLng: 31.48 },
  },
  {
    id: "SAT-2024-011",
    developer: { id: "DV-007", name: "Tatweer Misr", initials: "TM", color: "#0284c7" },
    areaId: "AR-018", areaName: "Ain Sokhna", subAreaName: "Galala City",
    projectId: "PJ-0901", projectName: "Telal El Sokhna",
    phaseId: "PH-0901-04", phaseName: "Phase 4",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 3.09,
    ...calcCosts(3.09, "Pleiades-1A", 1.10),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2024-07-22 06:00", capturedAt: "2024-07-27 08:14",
    type: "Archived", satellite: "Sentinel-1", createdAt: "2024-07-27 17:11", updatedAt: "2024-07-28 18:03",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 8.8, sunElevation: 70.3, sunAzimuth: 145.6, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.62, bboxMaxLat: 29.67, bboxMinLng: 32.31, bboxMaxLng: 32.38 },
  },
  {
    id: "SAT-2024-012",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    projectId: "PJ-1002", projectName: "Badya",
    phaseId: "PH-1002-02", phaseName: "Phase 2",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 8.34,
    ...calcCosts(8.34, "WorldView-2", 1.08),
    systemRequested: "Listing",
    capturingStatus: "Captured", requestedAt: "2024-08-10 07:00", capturedAt: "2024-08-14 10:22",
    type: "Archived", satellite: "Copernicus-3", createdAt: "2024-08-14 09:46", updatedAt: "2024-08-15 10:51",
    metadata: { cloudCoverPct: 2.9, incidenceAngle: 13.1, sunElevation: 67.8, sunAzimuth: 148.2, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 30.11, bboxMaxLat: 30.21, bboxMinLng: 30.71, bboxMaxLng: 30.82 },
  },
  {
    id: "SAT-2024-013",
    developer: { id: "DV-008", name: "MNHD", initials: "MN", color: "#9d174d" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-1105", projectName: "Sarai",
    phaseId: "PH-1105-03", phaseName: "Phase 3",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 5.22,
    ...calcCosts(5.22, "SPOT-7", 1.06),
    systemRequested: "IMS",
    capturingStatus: "Captured", requestedAt: "2024-05-30 09:00", capturedAt: "2024-06-10 11:40",
    type: "Archived", satellite: "SPOT-7", createdAt: "2024-06-10 14:03", updatedAt: "2024-06-11 15:38",
    metadata: { cloudCoverPct: 6.8, incidenceAngle: 16.4, sunElevation: 72.1, sunAzimuth: 142.3, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.12, bboxMaxLat: 30.19, bboxMinLng: 31.58, bboxMaxLng: 31.67 },
  },
  {
    id: "SAT-2024-014",
    developer: { id: "DV-009", name: "La Vista Developments", initials: "LV", color: "#92400e" },
    areaId: "AR-018", areaName: "Ain Sokhna", subAreaName: "Galala City",
    projectId: "PJ-1204", projectName: "La Vista Gardens",
    phaseId: "PH-1204-01", phaseName: "Phase 1",
    quality: "Medium", resolutionM: 10,
    totalAreaKm2: 1.43,
    ...calcCosts(1.43, "Sentinel-2", 1.12),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2024-03-01 00:00", capturedAt: "2024-03-06 09:22",
    type: "Archived", satellite: "Sentinel-2", createdAt: "2024-03-06 11:22", updatedAt: "2024-03-07 12:44",
    metadata: { cloudCoverPct: 11.4, incidenceAngle: 22.7, sunElevation: 48.3, sunAzimuth: 168.9, processingLevel: "L2A Surface Reflectance", bandsAvailable: ["RGB", "NIR", "SWIR", "Red Edge"], bboxMinLat: 29.58, bboxMaxLat: 29.61, bboxMinLng: 32.40, bboxMaxLng: 32.44 },
  },
  {
    id: "SAT-2025-015",
    developer: { id: "DV-010", name: "Hassan Allam Properties", initials: "HA", color: "#15803d" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-1310", projectName: "The Lake",
    phaseId: "PH-1310-01", phaseName: "Phase 1",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 2.41,
    ...calcCosts(2.41, "WorldView-3", 1.06),
    systemRequested: "Listing",
    capturingStatus: "Queued", requestedAt: "2025-04-14 06:00", capturedAt: "2025-04-17 08:50",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-17 16:37", updatedAt: "2025-04-18 17:09",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 3.9, sunElevation: 66.2, sunAzimuth: 152.1, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan", "Coastal", "Yellow"], bboxMinLat: 30.02, bboxMaxLat: 30.06, bboxMinLng: 31.36, bboxMaxLng: 31.41 },
  },
  {
    id: "SAT-2025-016",
    developer: { id: "DV-002", name: "Emaar Misr", initials: "EM", color: "#b45309" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-1408", projectName: "Uptown Cairo",
    phaseId: "PH-1408-06", phaseName: "Phase 6",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 7.15,
    ...calcCosts(7.15, "Pleiades-1A", 1.07),
    systemRequested: "IMS",
    capturingStatus: "Captured", requestedAt: "2025-03-22 09:00", capturedAt: "2025-03-25 12:18",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-03-25 08:54", updatedAt: "2025-03-26 09:31",
    metadata: { cloudCoverPct: 3.3, incidenceAngle: 10.2, sunElevation: 60.4, sunAzimuth: 156.7, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.96, bboxMaxLat: 30.04, bboxMinLng: 31.43, bboxMaxLng: 31.52 },
  },
  {
    id: "SAT-2025-017",
    developer: { id: "DV-006", name: "Ora Developers", initials: "OR", color: "#be185d" },
    areaId: "AR-014", areaName: "Sahel", subAreaName: "Sidi Abdel Rahman",
    projectId: "PJ-1510", projectName: "Riviera",
    phaseId: "PH-1510-01", phaseName: "Phase 1",
    quality: "Ultra High", resolutionM: 0.25,
    totalAreaKm2: 4.67,
    ...calcCosts(4.67, "WorldView-3", 1.09),
    systemRequested: "E-realty",
    capturingStatus: "Requested", requestedAt: "2025-04-06 05:30", capturedAt: "2025-04-09 07:44",
    type: "New", satellite: "WorldView Legion", createdAt: "2025-04-09 13:08", updatedAt: "2025-04-10 14:50",
    metadata: { cloudCoverPct: 0.0, incidenceAngle: 4.7, sunElevation: 69.8, sunAzimuth: 163.3, processingLevel: "Pan-sharpened Ortho", bandsAvailable: ["RGB", "NIR", "SWIR", "Pan"], bboxMinLat: 31.18, bboxMaxLat: 31.24, bboxMinLng: 27.41, bboxMaxLng: 27.48 },
  },
  {
    id: "SAT-2025-018",
    developer: { id: "DV-003", name: "SODIC", initials: "SD", color: "#1d4ed8" },
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    projectId: "PJ-1612", projectName: "Eastown",
    phaseId: "PH-1612-05", phaseName: "Phase 5",
    quality: "High", resolutionM: 3,
    totalAreaKm2: 3.88,
    ...calcCosts(3.88, "SPOT-7", 1.08),
    systemRequested: "Listing",
    capturingStatus: "Captured", requestedAt: "2025-02-10 08:00", capturedAt: "2025-02-22 10:30",
    type: "New", satellite: "Sentinel-1", createdAt: "2025-02-22 10:19", updatedAt: "2025-02-23 11:08",
    metadata: { cloudCoverPct: 7.1, incidenceAngle: 15.8, sunElevation: 50.6, sunAzimuth: 172.4, processingLevel: "Ortho Ready", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 30.07, bboxMaxLat: 30.12, bboxMinLng: 31.46, bboxMaxLng: 31.53 },
  },
  {
    id: "SAT-2025-019",
    developer: { id: "DV-001", name: "Palm Hills Developments", initials: "PH", color: "#0d6e4f" },
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    projectId: "PJ-1711", projectName: "O West",
    phaseId: "PH-1711-03", phaseName: "Phase 3",
    quality: "Very High", resolutionM: 1,
    totalAreaKm2: 6.23,
    ...calcCosts(6.23, "Pleiades-1B", 1.06),
    systemRequested: "IMS",
    capturingStatus: "Requested", requestedAt: "2025-04-03 10:00", capturedAt: "2025-04-07 12:48",
    type: "New", satellite: "Pleiades NEO", createdAt: "2025-04-07 15:44", updatedAt: "2025-04-08 16:21",
    metadata: { cloudCoverPct: 1.4, incidenceAngle: 8.0, sunElevation: 62.9, sunAzimuth: 155.8, processingLevel: "Ortho", bandsAvailable: ["RGB", "NIR"], bboxMinLat: 29.99, bboxMaxLat: 30.06, bboxMinLng: 30.76, bboxMaxLng: 30.84 },
  },
  {
    id: "SAT-2024-020",
    developer: { id: "DV-005", name: "Mountain View", initials: "MV", color: "#059669" },
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    projectId: "PJ-1808", projectName: "Mountain View October",
    phaseId: "PH-1808-02", phaseName: "Phase 2",
    quality: "Super High", resolutionM: 0.5,
    totalAreaKm2: 2.64,
    ...calcCosts(2.64, "WorldView-2", 1.10),
    systemRequested: "E-realty",
    capturingStatus: "Captured", requestedAt: "2024-09-14 07:00", capturedAt: "2024-09-18 09:05",
    type: "Archived", satellite: "WorldView-2", createdAt: "2024-09-18 12:31", updatedAt: "2024-09-19 13:55",
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
  { id: "satellite",       label: "Satellite",          alwaysVisible: false },
  { id: "capturingStatus", label: "Capturing Status",   alwaysVisible: false },
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
  if (system === "IMS")      cls = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
  else if (system === "E-realty") cls = "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400"
  else if (system === "Listing")  cls = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"

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
  { id: "systemRequested",  label: "System Requested" },
  { id: "capturingStatus",  label: "Capturing Status" },
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
    case "capturingStatus": return row.capturingStatus
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

// ─── Copy-on-hover ID ─────────────────────────────────────────────────────────

function CopyId({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <span className={cn("inline-flex items-center gap-1 group/cid font-mono text-[10px] text-muted-foreground", className)}>
      {value}
      <button
        onClick={copy}
        className="opacity-0 group-hover/cid:opacity-100 transition-opacity shrink-0"
      >
        {copied
          ? <Check className="h-2.5 w-2.5 text-green-500" />
          : <Copy  className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />}
      </button>
    </span>
  )
}

// ─── Construction Analysis: types + mock data ─────────────────────────────────

type PaceLabel = "Stalled" | "Slow" | "Moderate" | "Fast" | "Very Fast"

interface CategoryProgress {
  pct: number
  from?: number   // prior value (for delta display)
  delta?: number
  driver?: boolean
}

interface ConstructionSnapshot {
  overallPct: number
  categories: {
    siteInfrastructure: CategoryProgress
    structuralProgress:  CategoryProgress
    landscaping:         CategoryProgress
    waterFeatures:       CategoryProgress
  }
  qualitativeText: string
  delta: {
    period:        string
    days:          number
    overallFrom:   number
    velocity:      number
    pace:          PaceLabel
    primaryDriver: string
    deltaSummary:  string
  } | null
}

// ── Helpers ──
// Overall progress color: < 30% orange, < 70% blue, >= 70% green
function progressColor(pct: number): string {
  return pct >= 70 ? "bg-green-500" : pct >= 30 ? "bg-blue-500" : "bg-orange-500"
}

// Quarter helper: "2025-04-15 11:23" → "Q2 2025"
function toQuarter(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number)
  return `Q${Math.ceil(m / 3)} ${y}`
}

// Parse period string "Nov 2024 → Apr 2025" → { before: "Q4 '24", after: "Q2 '25" }
function deltaToQuarters(period: string): { before: string; after: string } {
  const parts = period.split("→").map(s => s.trim())
  const MNS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const parse = (s: string) => {
    const [mon, yr] = s.split(" ")
    const mi = MNS.indexOf(mon) + 1
    return mi > 0 ? `Q${Math.ceil(mi / 3)} '${yr?.slice(2) ?? ""}` : s
  }
  return { before: parse(parts[0] ?? ""), after: parse(parts[1] ?? "") }
}

function CapturingStatusBadge({ status }: { status: CapturingStatus }) {
  const styles: Record<CapturingStatus, string> = {
    "Queued":    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    "Requested": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    "Captured":  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  }
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium px-1.5 py-0", styles[status])}>
      {status}
    </Badge>
  )
}

function catLabel(pct: number): string {
  if (pct >= 95) return "Complete"
  if (pct >= 80) return "Largely Complete"
  if (pct >= 50) return "Advanced"
  if (pct >= 20) return "In Progress"
  return "Early Stage"
}

function paceColor(pace: PaceLabel): string {
  if (pace === "Very Fast") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
  if (pace === "Fast")      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
  if (pace === "Moderate")  return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
  if (pace === "Slow")      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
  return "bg-muted text-muted-foreground"
}

// ── Mock construction data keyed by image ID ──
const CONSTRUCTION_ANALYSIS: Record<string, ConstructionSnapshot> = {
  "SAT-2025-001": {
    overallPct: 68,
    categories: {
      siteInfrastructure: { pct: 88, from: 76, delta: +12, driver: false },
      structuralProgress:  { pct: 71, from: 56, delta: +15, driver: true  },
      landscaping:         { pct: 52, from: 40, delta: +12, driver: true  },
      waterFeatures:       { pct: 41, from: 35, delta: +6,  driver: false },
    },
    qualitativeText: "Palm Hills October Phase 2 shows steady mid-stage advancement. Site infrastructure is largely complete across the eastern cluster. Structural framing has passed the 70% threshold with active work observed in the northern residential blocks.",
    delta: { period: "Nov 2024 → Apr 2025", days: 152, overallFrom: 55, velocity: 0.086, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Between November 2024 and April 2025, structural activity was the dominant driver — approximately 15 additional building footprints showed above-ground framing. Landscaping activity also accelerated meaningfully, particularly in the eastern residential corridors." },
  },
  "SAT-2025-002": {
    overallPct: 75,
    categories: {
      siteInfrastructure: { pct: 92, from: 84, delta: +8,  driver: false },
      structuralProgress:  { pct: 78, from: 65, delta: +13, driver: false },
      landscaping:         { pct: 67, from: 50, delta: +17, driver: true  },
      waterFeatures:       { pct: 64, from: 52, delta: +12, driver: true  },
    },
    qualitativeText: "Marassi Phase 5 stands as one of the most advanced captures in this dataset. Beachfront infrastructure is nearly complete and the central hub landscaping is in full progress. Waterfront feature installation has advanced noticeably since the previous capture.",
    delta: { period: "Sep 2024 → Mar 2025", days: 181, overallFrom: 62, velocity: 0.072, pace: "Moderate", primaryDriver: "Landscaping", deltaSummary: "Landscaping was the primary driver between September 2024 and March 2025, with notable activity across the resort-facing zones. Water feature installation also progressed materially, consistent with the resort's phased delivery schedule." },
  },
  "SAT-2025-003": {
    overallPct: 38,
    categories: {
      siteInfrastructure: { pct: 72, driver: false },
      structuralProgress:  { pct: 31, driver: false },
      landscaping:         { pct: 12, driver: false },
      waterFeatures:       { pct: 8,  driver: false },
    },
    qualitativeText: "This is the first recorded capture of Allegria Phase 1. The site shows early-to-mid stage construction with site infrastructure well underway. Structural activity is concentrated in the southern residential blocks and is approximately one-third complete.",
    delta: null,
  },
  "SAT-2025-004": {
    overallPct: 52,
    categories: {
      siteInfrastructure: { pct: 81, from: 70, delta: +11, driver: false },
      structuralProgress:  { pct: 54, from: 40, delta: +14, driver: true  },
      landscaping:         { pct: 34, from: 26, delta: +8,  driver: false },
      waterFeatures:       { pct: 22, from: 17, delta: +5,  driver: false },
    },
    qualitativeText: "Hyde Park Estate Phase 3 has reached the midpoint of construction. Road infrastructure is largely complete while structural framing has crossed 50% across the villa and apartment clusters. Landscaping is progressing in completed structural zones.",
    delta: { period: "Oct 2024 → Mar 2025", days: 152, overallFrom: 41, velocity: 0.072, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Structural progress was the dominant driver between October 2024 and March 2025, with 14 additional percentage points recorded. Activity was concentrated in the mid-section apartment towers and the villa cluster adjacent to the central park." },
  },
  "SAT-2025-005": {
    overallPct: 61,
    categories: {
      siteInfrastructure: { pct: 87, from: 76, delta: +11, driver: false },
      structuralProgress:  { pct: 64, from: 50, delta: +14, driver: true  },
      landscaping:         { pct: 43, from: 32, delta: +11, driver: true  },
      waterFeatures:       { pct: 33, from: 27, delta: +6,  driver: false },
    },
    qualitativeText: "Mountain View iCity Phase 4 shows sustained advancement across all categories. Structural progress has surpassed 60% with significant activity in the high-density residential towers. Landscaping has been initiated in structurally completed sections, suggesting the project is approaching delivery-readiness in the southern cluster.",
    delta: { period: "Aug 2024 → Feb 2025", days: 184, overallFrom: 48, velocity: 0.071, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Structural progress and landscaping advanced in parallel between August 2024 and February 2025. Structural gains were concentrated in the Phase 4 tower cluster, while landscaping activation began across the early-completing southern zones." },
  },
  "SAT-2025-006": {
    overallPct: 48,
    categories: {
      siteInfrastructure: { pct: 76, from: 65, delta: +11, driver: true  },
      structuralProgress:  { pct: 47, from: 37, delta: +10, driver: false },
      landscaping:         { pct: 34, from: 25, delta: +9,  driver: false },
      waterFeatures:       { pct: 29, from: 22, delta: +7,  driver: false },
    },
    qualitativeText: "Silversands Phase 2 is progressing at a consistent pace across all categories. The coastal infrastructure network — including beachfront access roads and utility corridors — is significantly advanced. Structural activity is concentrated in the premium villa cluster facing the Mediterranean.",
    delta: { period: "Nov 2024 → Apr 2025", days: 150, overallFrom: 38, velocity: 0.067, pace: "Moderate", primaryDriver: "Site Infrastructure", deltaSummary: "Site infrastructure was the primary driver between November 2024 and April 2025, with coastal access roads and utility networks progressing materially. All four categories showed measurable gains, suggesting broad-front construction activity across the site." },
  },
  "SAT-2025-007": {
    overallPct: 44,
    categories: {
      siteInfrastructure: { pct: 78, from: 65, delta: +13, driver: true  },
      structuralProgress:  { pct: 42, from: 32, delta: +10, driver: true  },
      landscaping:         { pct: 22, from: 16, delta: +6,  driver: false },
      waterFeatures:       { pct: 18, from: 13, delta: +5,  driver: false },
    },
    qualitativeText: "Fouka Bay Phase 1 reflects active mid-stage construction with notable gains in both infrastructure and structural categories. The beachfront access corridors are well-established and framing activity is visible across a wide area of the residential zones.",
    delta: { period: "Sep 2024 → Mar 2025", days: 181, overallFrom: 34, velocity: 0.055, pace: "Moderate", primaryDriver: "Site Infrastructure", deltaSummary: "Site infrastructure and structural progress advanced in parallel over this 181-day period. Infrastructure gains were particularly notable in the northern beachfront corridors, while structural framing activated across multiple new residential clusters." },
  },
  "SAT-2025-008": {
    overallPct: 29,
    categories: {
      siteInfrastructure: { pct: 64, driver: false },
      structuralProgress:  { pct: 22, driver: false },
      landscaping:         { pct: 8,  driver: false },
      waterFeatures:       { pct: 5,  driver: false },
    },
    qualitativeText: "This is the first recorded capture of ZED Phase 3. The site is in early construction with primary road networks and utility trenches visible from orbit. Structural above-ground activity is limited to the south-facing villa cluster.",
    delta: null,
  },
  "SAT-2025-009": {
    overallPct: 72,
    categories: {
      siteInfrastructure: { pct: 91, driver: false },
      structuralProgress:  { pct: 75, driver: false },
      landscaping:         { pct: 58, driver: false },
      waterFeatures:       { pct: 47, driver: false },
    },
    qualitativeText: "Villette Phase 2 is in an advanced state of construction. Internal road networks are virtually complete and structural framing has been observed across more than three-quarters of the residential footprint. Landscaping installation is actively progressing in the completed structural zones.",
    delta: null,
  },
  "SAT-2024-011": {
    overallPct: 83,
    categories: {
      siteInfrastructure: { pct: 96, driver: false },
      structuralProgress:  { pct: 88, driver: false },
      landscaping:         { pct: 74, driver: false },
      waterFeatures:       { pct: 68, driver: false },
    },
    qualitativeText: "Telal El Sokhna Phase 4 is in the late stages of construction and approaching handover readiness. Infrastructure is virtually complete. Structural finishing works are ongoing across the remaining units and landscaping is being actively finalized across the resort grounds.",
    delta: null,
  },
  "SAT-2024-012": {
    overallPct: 67,
    categories: {
      siteInfrastructure: { pct: 89, driver: false },
      structuralProgress:  { pct: 71, driver: false },
      landscaping:         { pct: 51, driver: false },
      waterFeatures:       { pct: 42, driver: false },
    },
    qualitativeText: "Badya Phase 2 shows considerable advancement. Site infrastructure is largely complete across the expansive masterplan. Structural activity has covered over 70% of the residential footprint and landscaping installation is underway across completed structural zones.",
    delta: null,
  },
  "SAT-2024-013": {
    overallPct: 45,
    categories: {
      siteInfrastructure: { pct: 79, driver: false },
      structuralProgress:  { pct: 46, driver: false },
      landscaping:         { pct: 25, driver: false },
      waterFeatures:       { pct: 14, driver: false },
    },
    qualitativeText: "Sarai Phase 3 is progressing at a measured pace. Site infrastructure is well-established and structural framing is active across the central and western clusters. Landscaping remains in early stages and is primarily concentrated in completed structural zones near the entrance.",
    delta: null,
  },
  "SAT-2024-014": {
    overallPct: 22,
    categories: {
      siteInfrastructure: { pct: 58, driver: false },
      structuralProgress:  { pct: 18, driver: false },
      landscaping:         { pct: 6,  driver: false },
      waterFeatures:       { pct: 3,  driver: false },
    },
    qualitativeText: "La Vista Gardens Phase 1 is in the early stages of development. Road grading and primary utility installation is underway across approximately 60% of the site. Structural activity is limited to foundations and ground-level framing in the pilot residential cluster.",
    delta: null,
  },
  "SAT-2025-010": {
    overallPct: 57,
    categories: {
      siteInfrastructure: { pct: 83, from: 72, delta: +11, driver: false },
      structuralProgress:  { pct: 60, from: 47, delta: +13, driver: true  },
      landscaping:         { pct: 38, from: 28, delta: +10, driver: false },
      waterFeatures:       { pct: 27, from: 20, delta: +7,  driver: false },
    },
    qualitativeText: "Palm Hills New Cairo Phase 1 has passed the halfway mark with consistent progress across all construction categories. Structural framing has activated in the tower and villa clusters simultaneously, indicating broad-front construction activity.",
    delta: { period: "Oct 2024 → Apr 2025", days: 182, overallFrom: 46, velocity: 0.060, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Structural progress was the dominant driver over this six-month period with 13 percentage points of gain. Activity was distributed across both the apartment towers and the residential villa cluster, with the most significant new framing observed in the Phase 1A tower group." },
  },
  "SAT-2025-015": {
    overallPct: 71,
    categories: {
      siteInfrastructure: { pct: 90, from: 82, delta: +8,  driver: false },
      structuralProgress:  { pct: 74, from: 63, delta: +11, driver: false },
      landscaping:         { pct: 59, from: 43, delta: +16, driver: true  },
      waterFeatures:       { pct: 48, from: 36, delta: +12, driver: true  },
    },
    qualitativeText: "The Lake Phase 1 shows one of the highest progress rates among recent captures. The project is in an advanced stage with landscaping and water feature installation actively accelerating — characteristic of a project approaching its final construction phase.",
    delta: { period: "Jan 2025 → Apr 2025", days: 90, overallFrom: 60, velocity: 0.122, pace: "Fast", primaryDriver: "Landscaping", deltaSummary: "This 90-day window recorded the fastest progress rate in The Lake Phase 1's capture history. Landscaping and water feature installation advanced markedly — 16 and 12 percentage points respectively — consistent with accelerated finishing works ahead of a planned handover window." },
  },
  "SAT-2025-016": {
    overallPct: 63,
    categories: {
      siteInfrastructure: { pct: 88, from: 77, delta: +11, driver: false },
      structuralProgress:  { pct: 66, from: 53, delta: +13, driver: true  },
      landscaping:         { pct: 47, from: 36, delta: +11, driver: false },
      waterFeatures:       { pct: 38, from: 29, delta: +9,  driver: false },
    },
    qualitativeText: "Uptown Cairo Phase 6 is in active mid-stage construction with consistent gains across categories. Structural activity is spread across both the high-rise residential towers and the mid-rise clusters, reflecting a broad-front construction approach.",
    delta: { period: "Sep 2024 → Mar 2025", days: 182, overallFrom: 52, velocity: 0.060, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Structural progress continued as the primary driver between September 2024 and March 2025. Tower framing activity was most notable in the eastern cluster, while site infrastructure completion progressed materially across the western access routes." },
  },
  "SAT-2025-017": {
    overallPct: 55,
    categories: {
      siteInfrastructure: { pct: 82, from: 70, delta: +12, driver: true  },
      structuralProgress:  { pct: 57, from: 44, delta: +13, driver: true  },
      landscaping:         { pct: 39, from: 28, delta: +11, driver: false },
      waterFeatures:       { pct: 30, from: 22, delta: +8,  driver: false },
    },
    qualitativeText: "Riviera Phase 1 is progressing steadily across all construction categories. The coastal location drives a site infrastructure-first approach, which is reflected in the advanced infrastructure score. Structural framing is active across approximately half the residential plots.",
    delta: { period: "Nov 2024 → Apr 2025", days: 150, overallFrom: 43, velocity: 0.080, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Both site infrastructure and structural progress advanced materially between November 2024 and April 2025. Infrastructure gains reflect completion of the coastal access road network, while structural gains are distributed across both the villa cluster and the mid-rise residential blocks." },
  },
  "SAT-2025-018": {
    overallPct: 35,
    categories: {
      siteInfrastructure: { pct: 69, driver: false },
      structuralProgress:  { pct: 28, driver: false },
      landscaping:         { pct: 10, driver: false },
      waterFeatures:       { pct: 6,  driver: false },
    },
    qualitativeText: "Eastown Phase 5 is in early-to-mid construction phase with infrastructure well underway and structural framing recently initiated. The site shows primary road networks established and active foundation work in the northern residential cluster.",
    delta: null,
  },
  "SAT-2025-019": {
    overallPct: 60,
    categories: {
      siteInfrastructure: { pct: 86, from: 74, delta: +12, driver: true  },
      structuralProgress:  { pct: 63, from: 50, delta: +13, driver: true  },
      landscaping:         { pct: 44, from: 33, delta: +11, driver: false },
      waterFeatures:       { pct: 34, from: 26, delta: +8,  driver: false },
    },
    qualitativeText: "O West Phase 3 continues advancing at a consistent pace. The expanded masterplan shows broad-front construction activity with site infrastructure nearing completion across the eastern sectors. Structural framing has activated across approximately two-thirds of planned residential footprints.",
    delta: { period: "Oct 2024 → Apr 2025", days: 182, overallFrom: 49, velocity: 0.060, pace: "Moderate", primaryDriver: "Structural Progress", deltaSummary: "Structural progress and site infrastructure advanced in parallel between October 2024 and April 2025. Infrastructure completion progressed strongly in the eastern sector, while structural framing was activated across new residential clusters in the central zone." },
  },
  "SAT-2024-020": {
    overallPct: 51,
    categories: {
      siteInfrastructure: { pct: 80, driver: false },
      structuralProgress:  { pct: 53, driver: false },
      landscaping:         { pct: 33, driver: false },
      waterFeatures:       { pct: 21, driver: false },
    },
    qualitativeText: "Mountain View October Phase 2 is at the midpoint of construction. Road infrastructure and utilities are well-advanced and structural framing has been observed across just over half the residential footprint. Landscaping is in early-to-mid stage.",
    delta: null,
  },
}

// ─── Shared image card (Nawy Space / Mapbox / Masterplan + polygon) ──────────

type DrawerBase = "Nawy Space" | "Mapbox" | "Masterplan"
const DRAWER_BASES: DrawerBase[] = ["Mapbox", "Nawy Space", "Masterplan"]

function MapBaseRenderer({
  image, base, showPolygon, className,
}: {
  image: SatelliteImage; base: DrawerBase; showPolygon: boolean; className?: string
}) {
  const isCoastal = image.areaName.includes("Sahel") || image.areaName.includes("Sokhna")
  const isUrban   = image.areaName.includes("Cairo") || image.areaName.includes("October") || image.areaName.includes("Zayed")
  const pal = isCoastal
    ? { bg:"#1a4e6e", a:"#28728a", b:"#e8d9a0", c:"#2e8c66", d:"#4a9cb8" }
    : isUrban
    ? { bg:"#484858", a:"#8a9a88", b:"#c8c8b8", c:"#6a7868", d:"#9a9a8a" }
    : { bg:"#2e5e3e", a:"#4e8a5e", b:"#d8cc8e", c:"#5a9a6a", d:"#7ab888" }
  const h = image.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const mbMonth = (h % 12) + 1
  const mbYear  = 2021 + (h % 3)
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {base === "Nawy Space" && (
        <div className="absolute inset-0" style={{ backgroundColor: pal.bg }}>
          <div className="absolute inset-0" style={{ background:`linear-gradient(${h%360}deg,${pal.a}88 0%,${pal.b}55 35%,${pal.c}88 65%,${pal.d}44 100%)` }}/>
          <div className="absolute" style={{ top:"8%",left:"8%",width:`${38+(h%15)}%`,height:`${32+(h%20)}%`,backgroundColor:pal.a,opacity:0.7 }}/>
          <div className="absolute" style={{ top:"8%",right:"8%",width:`${28+(h%20)}%`,height:`${42+(h%15)}%`,backgroundColor:pal.b,opacity:0.55 }}/>
          <div className="absolute" style={{ bottom:"12%",left:"12%",right:"12%",height:`${24+(h%15)}%`,backgroundColor:pal.c,opacity:0.6 }}/>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)",backgroundSize:"56px 56px" }}/>
          <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents:"none" }}>
            <line x1="0" y1="44%" x2="100%" y2="47%" stroke="white" strokeWidth="2"/>
            <line x1="36%" y1="0" x2="39%" y2="100%" stroke="white" strokeWidth="2"/>
            <line x1="64%" y1="0" x2="66%" y2="100%" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
      )}
      {base === "Mapbox" && (
        <div className="absolute inset-0" style={{ backgroundColor:"#e8e6e1" }}>
          <div className="absolute rounded-lg" style={{ top:"10%",left:"6%",width:"22%",height:"26%",backgroundColor:"#cfe3c0" }}/>
          <div className="absolute rounded-lg" style={{ bottom:"14%",right:"10%",width:"26%",height:"30%",backgroundColor:"#cfe3c0" }}/>
          <div className="absolute" style={{ top:"0",right:"0",width:"30%",height:"22%",backgroundColor:"#a9d4e5" }}/>
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents:"none" }}>
            <line x1="0" y1="46%" x2="100%" y2="49%" stroke="#fff" strokeWidth="7"/>
            <line x1="0" y1="46%" x2="100%" y2="49%" stroke="#f4c542" strokeWidth="2.5"/>
            <line x1="38%" y1="0" x2="41%" y2="100%" stroke="#fff" strokeWidth="6"/>
            <line x1="38%" y1="0" x2="41%" y2="100%" stroke="#f4c542" strokeWidth="2"/>
            <line x1="66%" y1="0" x2="68%" y2="100%" stroke="#fff" strokeWidth="4"/>
          </svg>
        </div>
      )}
      {base === "Masterplan" && (
        <div className="absolute inset-0 bg-slate-50">
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage:"linear-gradient(rgba(0,0,0,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.4) 1px,transparent 1px)",backgroundSize:"48px 48px" }}/>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="72%" height="82%" viewBox="0 0 100 100" className="opacity-90">
              <rect width="100" height="100" fill="#eef4fb" stroke="#3b82f6" strokeWidth="0.6"/>
              <rect x="6" y="6" width="38" height="40" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="0.5"/>
              <rect x="56" y="6" width="38" height="40" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="0.5"/>
              <rect x="6" y="56" width="40" height="38" fill="#c7f9cc" stroke="#22c55e" strokeWidth="0.5"/>
              <rect x="56" y="56" width="38" height="38" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="0.5"/>
              <circle cx="50" cy="50" r="7" fill="#fde68a" stroke="#f59e0b" strokeWidth="0.5"/>
              <line x1="0" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeWidth="1"/>
              <line x1="50" y1="0" x2="50" y2="100" stroke="#94a3b8" strokeWidth="1"/>
              <text x="50" y="96" textAnchor="middle" fontSize="3.5" fill="#64748b">{image.projectName}</text>
            </svg>
          </div>
        </div>
      )}
      {showPolygon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-primary bg-primary/10 relative" style={{ width:"52%",height:"56%" }}>
            <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-primary"/>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-primary"/>
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-primary"/>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-primary"/>
          </div>
        </div>
      )}
    </div>
  )
}

function FullscreenMapView({ image, initialBase }: { image: SatelliteImage; initialBase: DrawerBase }) {
  const [base, setBase]               = useState<DrawerBase>(initialBase)
  const [showPolygon, setShowPolygon] = useState(true)
  const h = image.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const mbMonth = (h % 12) + 1; const mbYear = 2021 + (h % 3)
  // Identical logic to ImageCard — pending images show requested date
  const isPendingFull = image.capturingStatus === "Requested" || image.capturingStatus === "Queued"
  const captionLabel = base === "Nawy Space"
    ? isPendingFull
      ? `Requested ${formatDateTime(image.requestedAt)}`
      : `Captured ${formatDateTime(image.capturedAt)}`
    : base === "Mapbox"
    ? `Imagery © Mapbox · ${String(mbMonth).padStart(2,"0")} ${mbYear}`
    : null
  return (
    <div className="relative h-[78vh]">
      <MapBaseRenderer image={image} base={base} showPolygon={showPolygon} className="absolute inset-0 rounded-none" />
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 bg-white/95 rounded-lg px-1.5 py-1 shadow-lg backdrop-blur-sm">
          {DRAWER_BASES.map((b) => (
            <button key={b} onClick={() => setBase(b)}
              className={cn("px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                base === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >{b}</button>
          ))}
        </div>
        <button onClick={() => setShowPolygon((v) => !v)}
          className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium shadow-lg backdrop-blur-sm transition-colors",
            showPolygon ? "bg-primary text-primary-foreground" : "bg-white/95 text-muted-foreground hover:bg-white")}
        >
          <MapPin className="h-3.5 w-3.5" />Polygon
        </button>
      </div>
      {/* ── Bottom-left metadata badge ── */}
      <div className="absolute bottom-3 left-3 z-20 bg-black/65 text-white text-[11px] font-mono px-2.5 py-2 rounded-lg backdrop-blur-sm space-y-0.5">
        {base === "Nawy Space" && <div className="text-white/50 text-[10px]">{image.id}</div>}
        <div className="font-semibold">{image.projectName} — {image.areaName}</div>
        {captionLabel && (
          <div className="flex items-center gap-1.5 pt-0.5 text-white/60">
            <CalendarRange className="h-3 w-3" />
            <span>{captionLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ImageCard({ image }: { image: SatelliteImage }) {
  const [base, setBase]               = useState<DrawerBase>("Nawy Space")
  const [showPolygon, setShowPolygon] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const isPending = image.capturingStatus === "Requested" || image.capturingStatus === "Queued"
  const h = image.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const mbMonth = (h % 12) + 1; const mbYear = 2021 + (h % 3)
  // Same caption logic as FullscreenMapView — for pending Nawy Space show requested date
  const captionLabel = base === "Nawy Space"
    ? isPending
      ? `Requested ${formatDateTime(image.requestedAt)}`
      : `Captured ${formatDateTime(image.capturedAt)}`
    : base === "Mapbox"
    ? `Imagery © Mapbox · ${String(mbMonth).padStart(2,"0")} ${mbYear}`
    : null

  return (
    <>
      {/* All controls overlaid — same layout as FullscreenMapView, just h-52 */}
      <div className="relative rounded-lg overflow-hidden">
        {/* Nawy Space pending placeholder */}
        {base === "Nawy Space" && isPending ? (
          <div className="w-full h-52 bg-zinc-900 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Satellite className="h-10 w-10 text-zinc-500" />
            <div>
              <p className="text-sm font-semibold text-white/80">
                {image.capturingStatus === "Queued" ? "Capture Queued" : "Capture Requested"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Satellite image will be available after the next pass</p>
            </div>
            <CapturingStatusBadge status={image.capturingStatus} />
          </div>
        ) : (
          <MapBaseRenderer image={image} base={base} showPolygon={showPolygon} className="w-full h-52" />
        )}

        {/* Top-right: base switcher + polygon toggle (identical to fullscreen) */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 bg-white/95 rounded-lg px-1.5 py-1 shadow backdrop-blur-sm">
            {DRAWER_BASES.map((b) => (
              <button key={b} onClick={() => setBase(b)}
                className={cn("px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors",
                  base === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >{b}</button>
            ))}
          </div>
          <button onClick={() => setShowPolygon((v) => !v)}
            className={cn("flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg font-medium shadow backdrop-blur-sm transition-colors",
              showPolygon ? "bg-primary text-primary-foreground" : "bg-white/95 text-muted-foreground hover:bg-white")}>
            <MapPin className="h-3 w-3" />Polygon
          </button>
        </div>

        {/* Bottom-left: identical content to FullscreenMapView, only position adjusted for smaller card */}
        <div className="absolute bottom-2 left-2 z-20 bg-black/65 text-white text-[11px] font-mono px-2.5 py-2 rounded-lg backdrop-blur-sm space-y-0.5">
          {base === "Nawy Space" && <div className="text-white/50 text-[10px]">{image.id}</div>}
          <div className="font-semibold">{image.projectName} — {image.areaName}</div>
          {captionLabel && (
            <div className="flex items-center gap-1.5 pt-0.5 text-white/60">
              <CalendarRange className="h-3 w-3" />
              <span>{captionLabel}</span>
            </div>
          )}
        </div>

        {/* Bottom-right: Fullscreen + Download */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
          <button onClick={() => setShowFullscreen(true)}
            className="h-7 w-7 rounded-md bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-colors" title="Full Screen">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-md bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-colors" title="Download">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {showFullscreen && (
        <Dialog open={showFullscreen} onOpenChange={(o) => !o && setShowFullscreen(false)}>
          <DialogContent className="max-w-5xl w-[92vw] p-0 overflow-hidden rounded-xl">
            <DialogTitle className="sr-only">{image.projectName} — Full Screen</DialogTitle>
            <FullscreenMapView image={image} initialBase={base} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// ─── Construction Analysis Panel ─────────────────────────────────────────────

function ConstructionAnalysisPanel({ image }: { image: SatelliteImage }) {
  const data = CONSTRUCTION_ANALYSIS[image.id]

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No construction analysis available for this image.</p>
    </div>
  )

  const cats: { key: keyof typeof data.categories; label: string }[] = [
    { key: "siteInfrastructure", label: "Site & Infrastructure" },
    { key: "structuralProgress",  label: "Structural Progress"  },
    { key: "landscaping",         label: "Landscaping"          },
    { key: "waterFeatures",       label: "Water Features"       },
  ]

  return (
    <div className="space-y-5">
      {/* ── Shared image card ── */}
      <ImageCard image={image} />

      <Separator />

      {/* ── Overall Progress ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
          {data.delta && (
            <Badge variant="outline" className={cn("text-[11px] font-medium", paceColor(data.delta.pace))}>
              {data.delta.pace}
            </Badge>
          )}
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold tabular-nums leading-none">{data.overallPct}%</span>
          {data.delta && (
            <span className="text-sm text-green-600 font-semibold pb-1">
              +{data.overallPct - data.delta.overallFrom} pts vs {data.delta.period.split("→")[0].trim()}
            </span>
          )}
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          {data.delta && (
            <div className="absolute h-full rounded-full bg-muted-foreground/20 transition-all"
              style={{ width: `${data.delta.overallFrom}%` }} />
          )}
          <div
            className={cn("absolute h-full rounded-full transition-all", progressColor(data.overallPct))}
            style={{ width: `${data.overallPct}%` }}
          />
        </div>
      </div>

      {/* ── Category Progress Bars ── */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress by Category</span>
        {cats.map(({ key, label }) => {
          const cat = data.categories[key]
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {label}
                  {cat.driver && <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded px-1 py-0 font-semibold">Driver</span>}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {cat.delta !== undefined && (
                    <span className="text-green-600 text-[11px]">+{cat.delta}</span>
                  )}
                  <span className="font-semibold">{cat.pct}%</span>
                  <span className="text-muted-foreground text-[10px] w-20 text-right">{catLabel(cat.pct)}</span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                {cat.from !== undefined && (
                  <div className="absolute h-full rounded-full bg-muted-foreground/20"
                    style={{ width: `${cat.from}%` }} />
                )}
                <div
                  className={cn("absolute h-full rounded-full transition-all",
                    cat.pct >= 80 ? "bg-green-500" : cat.pct >= 50 ? "bg-blue-500" : cat.pct >= 20 ? "bg-amber-500" : "bg-red-400")}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <Separator />

      {/* ── Qualitative Analysis ── */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qualitative Analysis</span>
        <p className="text-sm text-foreground leading-relaxed">{data.qualitativeText}</p>
      </div>

      {/* ── Delta Analysis (if not first capture) ── */}
      {data.delta && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Delta Analysis</span>
              <span className="text-[11px] text-muted-foreground">{data.delta.period} · {data.delta.days}d</span>
            </div>

            {/* Velocity metric */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Pts Gained</p>
                <p className="text-base font-bold text-foreground tabular-nums">+{data.overallPct - data.delta.overallFrom}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Per Quarter</p>
                <p className="text-base font-bold text-foreground tabular-nums">~{Math.round(data.delta.velocity * 91)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Pace</p>
                <Badge variant="outline" className={cn("text-[11px]", paceColor(data.delta.pace))}>{data.delta.pace}</Badge>
              </div>
            </div>

            {/* Per-category delta table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      {data.delta ? deltaToQuarters(data.delta.period).before : "Before"}
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      {data.delta ? deltaToQuarters(data.delta.period).after : "After"}
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map(({ key, label }) => {
                    const cat = data.categories[key]
                    return (
                      <tr key={key} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground flex items-center gap-1">
                          {label}
                          {cat.driver && <span className="text-[9px] text-primary font-bold">↑</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{cat.from ?? cat.pct}%</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{cat.pct}%</td>
                        <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", (cat.delta ?? 0) > 0 ? "text-green-600" : "text-muted-foreground")}>
                          {cat.delta !== undefined ? `+${cat.delta}` : "—"}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-3 py-2 text-foreground">Overall</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{data.delta.overallFrom}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{data.overallPct}%</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-600">+{data.overallPct - data.delta.overallFrom}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Delta narrative */}
            <div className="rounded-lg border border-border bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
              <p className="text-xs text-foreground leading-relaxed">{data.delta.deltaSummary}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Capture: projects, cost model, recency window ───────────────────────────

interface CaptureProject {
  id: string
  name: string
  developer: string
  areaName: string
  subAreaName: string
  areaKm2: number
  polygonUploaded: boolean
  createdAt: string
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}

// Quality → satellite + per-km² rate (USD)
const QUALITY_CAPTURE: Record<ImageQuality, { satellite: string; rate: number }> = {
  "Ultra High": { satellite: "WorldView-3",  rate: 35 },
  "Super High": { satellite: "WorldView-2",  rate: 28 },
  "Very High":  { satellite: "Pleiades NEO", rate: 20 },
  "High":       { satellite: "SPOT-7",        rate: 2.5 },
  "Medium":     { satellite: "Sentinel-2",    rate: 0 },
}

// Resolution-range labels shown in the capture dialog (no satellite names)
const CAPTURE_QUALITY_LABEL: Record<ImageQuality, string> = {
  "Ultra High": "Ultra-high (0.3–0.4 m)",
  "Super High": "Super-high (0.5–0.6 m)",
  "Very High":  "Very high (0.7–0.8 m)",
  "High":       "High (1–1.5 m)",
  "Medium":     "Medium (3–10 m)",
}
const CAPTURE_QUALITIES: ImageQuality[] = ["Ultra High", "Super High", "Very High", "High"]

// Derive projects from captured images (these have polygons), plus a few without
const CAPTURE_PROJECTS: CaptureProject[] = (() => {
  const seen = new Map<string, CaptureProject>()
  for (const img of SATELLITE_IMAGES) {
    if (!seen.has(img.projectId)) {
      // Established projects — created well over 6 months ago (deterministic 2022–2023)
      const ph = img.projectId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      const createdAt = `${2022 + (ph % 2)}-${String((ph % 12) + 1).padStart(2, "0")}-15`
      seen.set(img.projectId, {
        id: img.projectId, name: img.projectName, developer: img.developer.name,
        areaName: img.areaName, subAreaName: img.subAreaName, areaKm2: img.totalAreaKm2,
        polygonUploaded: true, createdAt,
        bbox: { minLat: img.metadata.bboxMinLat, maxLat: img.metadata.bboxMaxLat, minLng: img.metadata.bboxMinLng, maxLng: img.metadata.bboxMaxLng },
      })
    }
  }
  const arr = Array.from(seen.values())
  // No-polygon projects
  arr.push({ id: "PJ-2100", name: "Cairo Gate", developer: "Emaar Misr", areaName: "Sheikh Zayed", subAreaName: "Beverly Hills", areaKm2: 3.50, polygonUploaded: false, createdAt: "2023-06-01", bbox: { minLat: 30.02, maxLat: 30.06, minLng: 31.00, maxLng: 31.05 } })
  arr.push({ id: "PJ-2205", name: "SODIC West Phase 7", developer: "SODIC", areaName: "6th of October", subAreaName: "Golf District", areaKm2: 4.10, polygonUploaded: false, createdAt: "2023-11-20", bbox: { minLat: 29.95, maxLat: 29.99, minLng: 30.90, maxLng: 30.96 } })
  // Recently created projects (polygon uploaded, no captures yet) — < 6 months
  arr.push({ id: "PJ-2310", name: "Mostakbal City – Green Avenue", developer: "City Edge", areaName: "New Cairo", subAreaName: "Mostakbal City", areaKm2: 5.60, polygonUploaded: true, createdAt: "2025-03-05", bbox: { minLat: 30.10, maxLat: 30.15, minLng: 31.70, maxLng: 31.77 } })
  arr.push({ id: "PJ-2311", name: "Palm Hills Katameya", developer: "Palm Hills Developments", areaName: "New Cairo", subAreaName: "Katameya Heights", areaKm2: 4.20, polygonUploaded: true, createdAt: "2025-02-14", bbox: { minLat: 30.03, maxLat: 30.07, minLng: 31.48, maxLng: 31.54 } })
  arr.push({ id: "PJ-2312", name: "Tatweer Misr – Koun", developer: "Tatweer Misr", areaName: "Sahel", subAreaName: "North Bay", areaKm2: 3.10, polygonUploaded: true, createdAt: "2025-01-20", bbox: { minLat: 31.08, maxLat: 31.12, minLng: 28.80, maxLng: 28.85 } })
  return arr.sort((a, b) => a.name.localeCompare(b.name))
})()

// Reference "now" = latest capture in dataset, used for the 30-day recency window
const DATASET_NOW = (() => {
  const ts = SATELLITE_IMAGES.map((r) => new Date(r.capturedAt.split(" ")[0]).getTime())
  return Math.max(...ts)
})()

// Single consistent "Today" reference used across ALL timeline bars (session date = May 2026)
// Using May 2026 showcases the "overdue" case for projects with past delivery dates
const TIMELINE_TODAY_MS = new Date("2026-05-19").getTime()

function qualityRank(q: ImageQuality) { return QUALITY_ORDER.indexOf(q) }

// ─── Capture New dialog ───────────────────────────────────────────────────────

function CaptureDialog({
  open, onClose, onView,
}: {
  open: boolean
  onClose: () => void
  onView: (img: SatelliteImage) => void
}) {
  const [projectId, setProjectId]   = useState<string>("")
  const [quality, setQuality]       = useState<ImageQuality>("Very High")
  const [captureType, setCaptureType] = useState<ImageType>("New")

  const project = CAPTURE_PROJECTS.find((p) => p.id === projectId) ?? null
  const canCapture = !!project?.polygonUploaded

  // Cost model — capturing area & cost are RANGES (actual tasking footprint varies)
  const rate = QUALITY_CAPTURE[quality].rate
  const projectAreaKm2 = project?.areaKm2 ?? 0
  const capLow  = project ? +(project.areaKm2 * 1.05).toFixed(2) : 0
  const capHigh = project ? +(project.areaKm2 * 1.18).toFixed(2) : 0
  const usdLow  = +(capLow * rate).toFixed(2)
  const usdHigh = +(capHigh * rate).toFixed(2)
  const egpLow  = Math.round(usdLow * 50)
  const egpHigh = Math.round(usdHigh * 50)
  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Previously captured for this project at same-or-higher quality
  const prior = project
    ? SATELLITE_IMAGES
        .filter((r) => r.projectId === project.id && qualityRank(r.quality) >= qualityRank(quality))
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    : []
  const isRecent = (r: SatelliteImage) =>
    new Date(r.capturedAt.split(" ")[0]).getTime() >= DATASET_NOW - 30 * 864e5
  const recent = prior.filter(isRecent)
  const hasRecent = recent.length > 0

  // Recently created project (< 6 months) — capture typically not needed yet
  const recentlyCreated = !!project &&
    new Date(project.createdAt).getTime() >= DATASET_NOW - 182 * 864e5

  // Map palette
  const isCoastal = project ? (project.areaName.includes("Sahel") || project.areaName.includes("Sokhna")) : false
  const isUrban   = project ? (project.areaName.includes("Cairo") || project.areaName.includes("October") || project.areaName.includes("Zayed")) : false
  const pal = isCoastal
    ? { bg:"#1a4e6e", a:"#28728a", b:"#e8d9a0", c:"#2e8c66" }
    : isUrban
    ? { bg:"#484858", a:"#8a9a88", b:"#c8c8b8", c:"#6a7868" }
    : { bg:"#2e5e3e", a:"#4e8a5e", b:"#d8cc8e", c:"#5a9a6a" }
  const ph = project ? project.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[1080px] w-[94vw] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />Capture New Image
          </DialogTitle>
          <DialogDescription>Request a new satellite capture for an off-plan project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Project dropdown ── */}
          <div className="space-y-1.5">
            <Label className="text-xs">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Select a project…" /></SelectTrigger>
              <SelectContent>
                {CAPTURE_PROJECTS.map((p) => {
                  const isNew = new Date(p.createdAt).getTime() >= DATASET_NOW - 182 * 864e5
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        <span className="text-muted-foreground text-xs">· {p.developer}</span>
                        {isNew && <span className="text-blue-600 bg-blue-50 border border-blue-200 text-[10px] font-medium rounded px-1 py-0 leading-4">&lt; 6mo</span>}
                        {!p.polygonUploaded && <span className="text-red-500 text-[10px]">no polygon</span>}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {project && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <CalendarRange className="h-3 w-3" />
                Project created {formatDateTime(project.createdAt)}
              </p>
            )}
            {project && !project.polygonUploaded && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 mt-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">
                  This project has no boundary polygons uploaded. Upload a polygon before requesting a capture.
                </p>
              </div>
            )}
            {project && recentlyCreated && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/40 px-3 py-2 mt-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This project was created less than 6 months ago ({formatDateTime(project.createdAt)}).
                  Construction is likely at an early stage — a new capture may not be needed yet.
                </p>
              </div>
            )}
          </div>

          {/* ── Map (always visible) ── */}
          <div className="relative h-[300px] rounded-lg overflow-hidden border border-border">
            {project ? (
              <>
                <div className="absolute inset-0" style={{ backgroundColor: pal.bg }}>
                  <div className="absolute inset-0" style={{ background:`linear-gradient(${ph%360}deg,${pal.a}88 0%,${pal.b}55 40%,${pal.c}88 100%)` }}/>
                  <div className="absolute" style={{ top:"10%", left:"8%", width:`${40+(ph%15)}%`, height:`${34+(ph%18)}%`, backgroundColor:pal.a, opacity:0.7 }}/>
                  <div className="absolute" style={{ bottom:"12%", right:"10%", width:`${30+(ph%18)}%`, height:`${40+(ph%14)}%`, backgroundColor:pal.b, opacity:0.5 }}/>
                  <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={cn("border-2 relative", project.polygonUploaded ? "border-primary bg-primary/10" : "border-dashed border-red-400 bg-red-400/10")} style={{ width:"50%", height:"54%" }}>
                    <span className={cn("absolute -top-5 left-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/90", project.polygonUploaded ? "text-primary" : "text-red-500")}>
                      {project.polygonUploaded ? "Capture bounds" : "No polygon"}
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 z-10 bg-black/60 text-white text-[11px] font-mono px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                  <span className="font-semibold">{project.name}</span> · {project.areaName}
                </div>
              </>
            ) : (
              /* Generic Mapbox-style basemap when no project chosen */
              <>
                <div className="absolute inset-0" style={{ backgroundColor:"#e8e6e1" }}>
                  <div className="absolute rounded-lg" style={{ top:"14%", left:"8%", width:"24%", height:"28%", backgroundColor:"#cfe3c0" }}/>
                  <div className="absolute rounded-lg" style={{ bottom:"16%", right:"12%", width:"28%", height:"30%", backgroundColor:"#cfe3c0" }}/>
                  <div className="absolute" style={{ top:"0", right:"0", width:"28%", height:"22%", backgroundColor:"#a9d4e5" }}/>
                  <svg className="absolute inset-0 w-full h-full" style={{pointerEvents:"none"}}>
                    <line x1="0" y1="46%" x2="100%" y2="49%" stroke="#fff" strokeWidth="7"/>
                    <line x1="0" y1="46%" x2="100%" y2="49%" stroke="#f4c542" strokeWidth="2.5"/>
                    <line x1="40%" y1="0" x2="43%" y2="100%" stroke="#fff" strokeWidth="6"/>
                    <line x1="40%" y1="0" x2="43%" y2="100%" stroke="#f4c542" strokeWidth="2"/>
                    <line x1="70%" y1="0" x2="72%" y2="100%" stroke="#fff" strokeWidth="4"/>
                  </svg>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-2 shadow text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />Select a project to locate it on the map
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Image Settings: Quality + Type ── */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Image Settings</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Quality</Label>
                <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPTURE_QUALITIES.map((q) => (
                      <SelectItem key={q} value={q}>{CAPTURE_QUALITY_LABEL[q]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capture Type</Label>
                <div className="flex gap-2">
                  {(["New","Archived"] as ImageType[]).map((t) => (
                    <button key={t} onClick={() => setCaptureType(t)}
                      className={cn("flex-1 h-9 rounded-md border text-sm font-medium transition-colors",
                        captureType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
                    >{t === "New" ? "New Capture" : "Archived"}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Areas & Costs (cost = range) ── */}
          {project && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Area & Estimated Cost</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Project Area</p>
                  <p className="text-sm font-semibold tabular-nums">{projectAreaKm2.toFixed(2)} km²</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Capturing Area</p>
                  <p className="text-sm font-semibold tabular-nums">{capLow.toFixed(2)} – {capHigh.toFixed(2)} km²</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Cost (USD)</p>
                  <p className="text-sm font-semibold tabular-nums">{rate === 0 ? "Free" : `${usd(usdLow)} – ${usd(usdHigh)}`}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Cost (EGP)</p>
                  <p className="text-sm font-semibold tabular-nums">{rate === 0 ? "Free" : `${egpLow.toLocaleString("en-US")} – ${egpHigh.toLocaleString("en-US")}`}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Bounding box ── */}
          {project && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />Bounding Box
              </p>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 font-mono text-xs grid grid-cols-2 gap-x-8 gap-y-1">
                <div><span className="text-muted-foreground">Min Lat </span><span className="font-semibold">{project.bbox.minLat.toFixed(4)}°</span></div>
                <div><span className="text-muted-foreground">Max Lat </span><span className="font-semibold">{project.bbox.maxLat.toFixed(4)}°</span></div>
                <div><span className="text-muted-foreground">Min Lng </span><span className="font-semibold">{project.bbox.minLng.toFixed(4)}°</span></div>
                <div><span className="text-muted-foreground">Max Lng </span><span className="font-semibold">{project.bbox.maxLng.toFixed(4)}°</span></div>
              </div>
            </div>
          )}

        {/* ── Previously captured (same-or-higher quality) ── */}
        {prior.length > 0 && (
          <div className={cn(
            "rounded-lg border p-3 space-y-2",
            hasRecent
              ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40"
              : "border-border bg-muted/30",
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", hasRecent ? "text-amber-600" : "text-muted-foreground")} />
              <p className={cn("text-xs", hasRecent ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
                {hasRecent ? (
                  <>
                    This project was captured at <span className="font-semibold">{quality}</span> quality or higher
                    within the <span className="font-semibold">last 30 days</span>. Review the existing
                    {" "}{recent.length} recent capture{recent.length > 1 ? "s" : ""} before requesting a new one to avoid duplicate cost.
                  </>
                ) : (
                  <>
                    This project already has {prior.length} capture{prior.length > 1 ? "s" : ""} at
                    {" "}<span className="font-semibold">{quality}</span> quality or higher in the past month. Review them before requesting a new capture.
                  </>
                )}
              </p>
            </div>
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Image</th>
                    <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Quality</th>
                    <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Captured</th>
                    <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Type</th>
                    <th className="px-2.5 py-1.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {prior.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/40 cursor-pointer" onClick={() => onView(r)}>
                      <td className="px-2.5 py-1.5 font-mono">
                        <span className="inline-flex items-center gap-1.5">
                          {r.id}
                          {isRecent(r) && <span className="text-[9px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/40 rounded px-1 py-0.5">≤30d</span>}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5"><QualityBadge quality={r.quality} /></td>
                      <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{formatDateTime(r.capturedAt)}</td>
                      <td className="px-2.5 py-1.5"><TypeBadge type={r.type} /></td>
                      <td className="px-2.5 py-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canCapture} onClick={onClose}>
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Request Capture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [drawerTab, setDrawerTab]         = useState<"main" | "analysis">("main")
  const [archiveTarget, setArchiveTarget] = useState<SatelliteImage | "bulk" | null>(null)
  const [showCapture, setShowCapture]     = useState(false)
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

  // ── Drawer navigation (derived from filtered — must come after filtered) ──
  const detailIdx  = detailRow ? filtered.findIndex(r => r.id === detailRow.id) : -1
  const canPrev    = detailIdx > 0
  const canNext    = detailIdx < filtered.length - 1
  const goPrev     = () => { if (canPrev) setDetailRow(filtered[detailIdx - 1]) }
  const goNext     = () => { if (canNext) setDetailRow(filtered[detailIdx + 1]) }

  // ── Analysis card totals ──
  const totalAreaCaptured = useMemo(() => filtered.reduce((s, r) => s + r.areaCapturedKm2, 0), [filtered])
  const totalProjectArea  = useMemo(() => filtered.reduce((s, r) => s + r.totalAreaKm2, 0), [filtered])
  const totalCostUsd      = useMemo(() => filtered.reduce((s, r) => s + r.costUsd, 0), [filtered])

  // Last-month / last-quarter costs — computed from all images relative to the latest date in dataset
  const { costLastMonth, costLastQuarter } = useMemo(() => {
    const allDates = SATELLITE_IMAGES.map((r) => new Date(r.requestedAt.split(" ")[0]))
    const maxDate  = new Date(Math.max(...allDates.map((d) => d.getTime())))
    const monthAgo   = new Date(maxDate); monthAgo.setDate(monthAgo.getDate() - 30)
    const quarterAgo = new Date(maxDate); quarterAgo.setDate(quarterAgo.getDate() - 90)
    const inLastMonth   = SATELLITE_IMAGES.filter((r) => { const d = new Date(r.requestedAt.split(" ")[0]); return d >= monthAgo   && d <= maxDate })
    const inLastQuarter = SATELLITE_IMAGES.filter((r) => { const d = new Date(r.requestedAt.split(" ")[0]); return d >= quarterAgo && d <= maxDate })
    return {
      costLastMonth:   inLastMonth.reduce((s, r)   => s + r.costUsd, 0),
      costLastQuarter: inLastQuarter.reduce((s, r) => s + r.costUsd, 0),
    }
  }, [])

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
        onClick={() => { setDetailRow(row); setDrawerTab("main") }}
      >
        {/* Checkbox — sticky left */}
        <td
          className={cn("border-r border-border px-3 py-2.5 sticky left-0 z-10", stickyLeftBg)}
          onClick={(e) => { e.stopPropagation(); handleSelectRow(row.id, flatIdx, e.shiftKey) }}
        >
          <Checkbox checked={isSel} onCheckedChange={() => {}} />
        </td>

        {/* Image — thumbnail + copyable ID, no system caption */}
        <td className="border-r border-border px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <SatThumbnail image={row} size="sm" />
            <CopyId value={row.id} className="font-semibold text-foreground text-[10px]" />
          </div>
        </td>

        {/* Developer — clickable name + copyable ID */}
        <td className="border-r border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <DeveloperAvatar dev={row.developer} />
            <div className="min-w-0">
              <a
                href={`/developers/${row.developer.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-foreground truncate max-w-[160px] block hover:text-primary hover:underline underline-offset-2 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {row.developer.name}
              </a>
              <CopyId value={row.developer.id} />
            </div>
          </div>
        </td>

        {vis("area") && (
          <td className="border-r border-border px-3 py-2.5"><AreaTag areaName={row.areaName} /></td>
        )}
        {vis("project") && (
          <td className="border-r border-border px-3 py-2.5">
            <a
              href={`/projects/${row.projectId}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground truncate max-w-[160px] block hover:text-primary hover:underline underline-offset-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {row.projectName}
            </a>
            <CopyId value={row.projectId} />
          </td>
        )}
        {vis("phase") && (
          <td className="border-r border-border px-3 py-2.5">
            <a
              href={`/phases/${row.phaseId}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-foreground block hover:text-primary hover:underline underline-offset-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {row.phaseName}
            </a>
            <CopyId value={row.phaseId} />
          </td>
        )}
        {vis("quality") && (
          <td className="border-r border-border px-3 py-2.5"><QualityBadge quality={row.quality} /></td>
        )}
        {vis("zoomHeight") && (
          <td className="border-r border-border px-3 py-2.5 text-xs font-mono text-foreground whitespace-nowrap">
            {getZoomHeight(row.satellite)}
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
        {vis("capturingStatus") && (
          <td className="border-r border-border px-3 py-2.5"><CapturingStatusBadge status={row.capturingStatus} /></td>
        )}
        {vis("createdAt") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
        )}
        {vis("updatedAt") && (
          <td className="border-r border-border px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.updatedAt)}</td>
        )}

        {/* Sticky action — fixed right, three-dot dropdown */}
        <td className={cn(
          "px-3 py-2.5 sticky right-0 z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.12)]",
          stickyRightBg,
        )} onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setDetailRow(row); setDrawerTab("main") }}>
                <Eye className="h-4 w-4 mr-2" />View
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setArchiveTarget(row)}>
                <Trash2 className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Cost Last Month</p>
          <p className="text-2xl font-semibold tabular-nums">
            {costLastMonth === 0
              ? "$0.00"
              : `$${costLastMonth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ~EGP {(costLastMonth * 50).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Cost Last Quarter</p>
          <p className="text-2xl font-semibold tabular-nums">
            {costLastQuarter === 0
              ? "$0.00"
              : `$${costLastQuarter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ~EGP {(costLastQuarter * 50).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* ── Filter card ── */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">

        {/* Filters — all on one line, wraps to second line if needed */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative shrink-0 w-56">
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
          <MultiSelectFilter label="Developer"    options={uniqueDevelopers} selected={developerFilter} onChange={(s) => { setDeveloper(s); setPage(1) }} className="w-32" />
          <MultiSelectFilter label="Project"      options={uniqueProjects}   selected={projectFilter}   onChange={(s) => { setProject(s);  setPage(1) }} className="w-28" />
          <MultiSelectFilter label="Area"         options={uniqueAreas}      selected={areaFilter}      onChange={(s) => { setArea(s);     setPage(1) }} className="w-24" />
          <MultiSelectFilter label="System"       options={uniqueSystems}    selected={systemFilter}    onChange={(s) => { setSystem(s);   setPage(1) }} className="w-28" />
          <MultiSelectFilter label="Satellite"    options={uniqueSatellites} selected={satelliteFilter} onChange={(s) => { setSatellite(s); setPage(1) }} className="w-28" />
          <MultiSelectFilter label="Quality"      options={QUALITY_ORDER}    selected={qualityFilter}   onChange={(s) => { setQuality(s);  setPage(1) }} className="w-24" />
          <MultiSelectFilter label="Type"         options={["New","Archived"]} selected={typeFilter}    onChange={(s) => { setType(s);     setPage(1) }} className="w-20" />
          <DateRangeFilter
            label="Date"
            dateFrom={requestedFrom}
            dateTo={requestedTo}
            onChangeFrom={(v) => { setRequestedFrom(v); setPage(1) }}
            onChangeTo={(v)   => { setRequestedTo(v);   setPage(1) }}
            className="w-40"
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
          <Button size="sm" className="h-8" onClick={() => setShowCapture(true)}>
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
                {vis("satellite")        && colTh("Satellite",         "satellite",        "min-w-[130px]")}
                {vis("capturingStatus") && colTh("Capturing Status",  "capturingStatus",  "min-w-[130px]")}
                {vis("createdAt")       && <th className="bg-muted border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[150px] whitespace-nowrap">Created At</th>}
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
            <Camera className="h-3.5 w-3.5 text-zinc-400" />
            Re-Capture
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-red-400 hover:text-red-300"
            onClick={() => setArchiveTarget("bulk")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive
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
        <SheetContent className="w-[620px] sm:max-w-[620px] flex flex-col p-0">
          {detailRow && (() => {
            const selected = detailRow
            const area = convertArea(selected.totalAreaKm2)
            const isPendingImg = selected.capturingStatus === "Requested" || selected.capturingStatus === "Queued"
            return (
              <>
                {/* ── Header ── */}
                <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CopyId value={selected.id} className="font-semibold text-foreground text-[10px]" />
                      <QualityBadge quality={selected.quality} />
                      <TypeBadge type={selected.type} />
                      <CapturingStatusBadge status={selected.capturingStatus} />
                      <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-muted-foreground border-border">
                        {toQuarter(selected.capturedAt)}
                      </Badge>
                    </div>
                    {/* Navigation: prev / counter / next */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={goPrev} disabled={!canPrev}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums min-w-[40px] text-center">
                        {detailIdx + 1} / {filtered.length}
                      </span>
                      <button
                        onClick={goNext} disabled={!canNext}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <SheetTitle className="text-base font-semibold leading-snug">
                      {selected.projectName} — {selected.phaseName}
                    </SheetTitle>
                    <CopyId value={selected.projectId} />
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{selected.developer.name}</p>
                    <CopyId value={selected.developer.id} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selected.areaName}{selected.subAreaName ? ` — ${selected.subAreaName}` : ""}
                  </p>
                </SheetHeader>

                {/* ── Tab switcher ── */}
                <div className="flex shrink-0 border-b border-border px-6">
                  {(["main","analysis"] as const).map((t) => (
                    <button key={t} onClick={() => setDrawerTab(t)}
                      className={cn(
                        "py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors",
                        drawerTab === t
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "main" ? "Main Info" : "Construction Analysis"}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  {drawerTab === "analysis" && (
                    isPendingImg ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                          <Satellite className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No Analysis Available</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Construction analysis will be generated after the satellite image is captured and processed.</p>
                        </div>
                        <CapturingStatusBadge status={selected.capturingStatus} />
                      </div>
                    ) : <ConstructionAnalysisPanel image={selected} />
                  )}

                  {drawerTab === "main" && (
                  <div className="space-y-6">

                  {/* Shared image card (Nawy Space / Mapbox / Masterplan + polygon toggle) */}
                  <ImageCard image={selected} />

                  <Separator />

                  {/* Image Details — tags + timestamps */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Image Details</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">Satellite</p>
                        <SatelliteBadge satellite={selected.satellite} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">System</p>
                        <SystemBadge system={selected.systemRequested} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">Quality</p>
                        <QualityBadge quality={selected.quality} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">Type</p>
                        <TypeBadge type={selected.type} />
                      </div>
                      {[
                        { label: "GSD Range",    value: getZoomHeight(selected.satellite) },
                        { label: "Requested At", value: formatDateTime(selected.requestedAt) },
                        { label: "Captured At",  value: isPendingImg ? "—" : formatDateTime(selected.capturedAt) },
                        { label: "Created At",   value: formatDateTime(selected.createdAt) },
                        { label: "Updated At",   value: formatDateTime(selected.updatedAt) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Imaging Cost */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Imaging Cost</p>
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

                  {/* Project Area */}
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

                  {/* Imaging Metadata */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />Imaging Metadata
                    </p>
                    {isPendingImg ? (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-muted-foreground">
                        <Activity className="h-5 w-5 opacity-30 shrink-0" />
                        <p className="text-xs">Acquisition metadata will be available once the image is captured.</p>
                      </div>
                    ) : (
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
                    )}
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

                  <Separator />

                  {/* Developer & Project — 4 fields in one row, ID below each */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Developer & Project</p>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Developer</p>
                        <p className="text-sm font-medium text-foreground truncate">{selected.developer.name}</p>
                        <CopyId value={selected.developer.id} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Area</p>
                        <p className="text-sm font-medium text-foreground">{selected.areaName}</p>
                        <CopyId value={selected.areaId} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Project</p>
                        <p className="text-sm font-medium text-foreground truncate">{selected.projectName}</p>
                        <CopyId value={selected.projectId} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Phase</p>
                        <p className="text-sm font-medium text-foreground">{selected.phaseName}</p>
                        <CopyId value={selected.phaseId} />
                      </div>
                    </div>
                  </div>

                  </div>
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Capture New dialog ── */}
      <CaptureDialog
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onView={(img) => setDetailRow(img)}
      />

      {/* ── Archive confirmation ── */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              Archive {archiveTarget === "bulk" ? `${selectedRows.size} image${selectedRows.size > 1 ? "s" : ""}` : "image"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget === "bulk"
                ? `This will move ${selectedRows.size} selected image${selectedRows.size > 1 ? "s" : ""} to the archive. Archived images are hidden from the active list but can be restored.`
                : archiveTarget && archiveTarget !== "bulk"
                ? `This will move ${archiveTarget.id} (${archiveTarget.projectName}) to the archive. It can be restored later.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (archiveTarget === "bulk") setSelectedRows(new Set())
                setArchiveTarget(null)
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Project timeline metadata (launch + delivery window) ────────────────────

interface ProjectMeta {
  launchStartDate: string   // when physical construction/site work began
  launchEndDate:   string   // when the public launch/marketing event ended
  createdAt:       string   // when registered in IMS
  deliveryMin:     string
  deliveryMax:     string
}

const PROJECT_METADATA: Record<string, ProjectMeta> = {
  "PJ-0124": { launchStartDate: "2020-11-15", launchEndDate: "2021-02-15", createdAt: "2021-03-15", deliveryMin: "2027-06-01", deliveryMax: "2028-03-01" }, // Palm Hills October
  "PJ-0055": { launchStartDate: "2020-02-01", launchEndDate: "2020-05-01", createdAt: "2020-06-01", deliveryMin: "2026-09-01", deliveryMax: "2027-06-01" }, // Marassi
  "PJ-0088": { launchStartDate: "2022-05-01", launchEndDate: "2022-08-01", createdAt: "2022-09-01", deliveryMin: "2027-12-01", deliveryMax: "2028-09-01" }, // Allegria
  "PJ-0201": { launchStartDate: "2021-11-01", launchEndDate: "2022-02-01", createdAt: "2022-03-01", deliveryMin: "2027-06-01", deliveryMax: "2028-03-01" }, // Hyde Park Estate
  "PJ-0312": { launchStartDate: "2021-02-01", launchEndDate: "2021-05-01", createdAt: "2021-06-01", deliveryMin: "2027-03-01", deliveryMax: "2027-12-01" }, // MV iCity
  "PJ-0441": { launchStartDate: "2022-02-01", launchEndDate: "2022-05-01", createdAt: "2022-06-01", deliveryMin: "2027-12-01", deliveryMax: "2028-09-01" }, // Silversands
  "PJ-0522": { launchStartDate: "2022-05-01", launchEndDate: "2022-08-01", createdAt: "2022-09-01", deliveryMin: "2028-03-01", deliveryMax: "2028-12-01" }, // Fouka Bay
  "PJ-0610": { launchStartDate: "2022-11-01", launchEndDate: "2023-02-01", createdAt: "2023-03-01", deliveryMin: "2028-06-01", deliveryMax: "2029-03-01" }, // ZED
  "PJ-0711": { launchStartDate: "2019-11-01", launchEndDate: "2020-02-01", createdAt: "2020-03-01", deliveryMin: "2025-09-01", deliveryMax: "2026-06-01" }, // Villette (near delivery!)
  "PJ-0802": { launchStartDate: "2022-02-01", launchEndDate: "2022-05-01", createdAt: "2022-06-01", deliveryMin: "2027-09-01", deliveryMax: "2028-06-01" }, // Palm Hills New Cairo
  "PJ-0901": { launchStartDate: "2019-09-01", launchEndDate: "2019-12-01", createdAt: "2020-01-01", deliveryMin: "2025-06-01", deliveryMax: "2025-12-01" }, // Telal El Sokhna (almost done)
  "PJ-1002": { launchStartDate: "2021-02-01", launchEndDate: "2021-05-01", createdAt: "2021-06-01", deliveryMin: "2027-06-01", deliveryMax: "2028-03-01" }, // Badya
  "PJ-1105": { launchStartDate: "2021-11-01", launchEndDate: "2022-02-01", createdAt: "2022-03-01", deliveryMin: "2027-12-01", deliveryMax: "2028-09-01" }, // Sarai
  "PJ-1204": { launchStartDate: "2022-11-01", launchEndDate: "2023-02-01", createdAt: "2023-03-01", deliveryMin: "2028-06-01", deliveryMax: "2029-03-01" }, // La Vista Gardens
  "PJ-1310": { launchStartDate: "2022-02-01", launchEndDate: "2022-05-01", createdAt: "2022-06-01", deliveryMin: "2026-12-01", deliveryMax: "2027-09-01" }, // The Lake
  "PJ-1408": { launchStartDate: "2021-05-01", launchEndDate: "2021-08-01", createdAt: "2021-09-01", deliveryMin: "2027-03-01", deliveryMax: "2027-12-01" }, // Uptown Cairo
  "PJ-1510": { launchStartDate: "2022-05-01", launchEndDate: "2022-08-01", createdAt: "2022-09-01", deliveryMin: "2028-06-01", deliveryMax: "2029-03-01" }, // Riviera
  "PJ-1612": { launchStartDate: "2022-08-01", launchEndDate: "2022-11-01", createdAt: "2022-12-01", deliveryMin: "2028-03-01", deliveryMax: "2028-12-01" }, // Eastown
  "PJ-1711": { launchStartDate: "2021-11-01", launchEndDate: "2022-02-01", createdAt: "2022-03-01", deliveryMin: "2027-09-01", deliveryMax: "2028-06-01" }, // O West
  "PJ-1808": { launchStartDate: "2021-05-01", launchEndDate: "2021-08-01", createdAt: "2021-09-01", deliveryMin: "2027-06-01", deliveryMax: "2028-03-01" }, // MV October
}

// ─── Project Timeline Bar ─────────────────────────────────────────────────────

type RiskLevel = "on-track" | "watch" | "behind" | "critical"

function riskLabel(r: RiskLevel) {
  if (r === "critical") return { text: "Critical", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" }
  if (r === "behind")   return { text: "Behind Schedule", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" }
  if (r === "watch")    return { text: "Watch", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" }
  return { text: "On Track", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" }
}

function ProjectTimelineBar({
  meta, captureDate, overallPct, compact = false,
}: {
  meta: ProjectMeta; captureDate: string; overallPct: number; compact?: boolean
}) {
  // ── Dates ──
  const tsLaunchStart = new Date(meta.launchStartDate).getTime()
  const tsLaunchEnd   = new Date(meta.launchEndDate).getTime()
  const tsCreated     = new Date(meta.createdAt).getTime()
  const tsToday       = TIMELINE_TODAY_MS
  const tsDMin        = new Date(meta.deliveryMin).getTime()
  const tsDMax        = new Date(meta.deliveryMax).getTime()

  const isOverdue = tsToday > tsDMax

  // Bar spans: launchStart → max(dMax, today)
  const barStart = tsLaunchStart
  const barEnd   = Math.max(tsDMax, tsToday)
  const span     = barEnd - barStart
  const pos      = (ts: number) => Math.round(Math.max(0, Math.min(100, ((ts - barStart) / span) * 100)))

  const todayPct   = pos(tsToday)
  const dMinPct    = pos(tsDMin)
  const dMaxPct    = pos(tsDMax)
  const createdPct = pos(tsCreated)
  const lEndPct    = pos(tsLaunchEnd)

  const msToMin    = tsDMin - tsToday
  const monthsLeft = Math.round(msToMin / (30 * 864e5))

  const gap       = todayPct - overallPct
  const fillColor =
    isOverdue && overallPct < 95 ? "bg-red-600"   :
    gap > 20                      ? "bg-red-500"   :
    gap > 10                      ? "bg-amber-500" :
    gap > 0                       ? "bg-yellow-400":
    "bg-green-500"

  const risk: RiskLevel =
    isOverdue && overallPct < 95          ? "critical" :
    (monthsLeft < 6  && overallPct < 80) ? "critical" :
    (monthsLeft < 12 && overallPct < 60) ? "critical" :
    (monthsLeft < 12 && gap > 15)        ? "behind"   :
    (gap > 20)                            ? "behind"   :
    (gap > 10)                            ? "watch"    :
    "on-track"
  const rl = riskLabel(risk)

  const MN  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const fmt = (ts: number) => { const d = new Date(ts); return `${MN[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` }

  const allMarkers = [
    { pct: 0,          date: fmt(tsLaunchStart), name: "Launch Start", isToday: false },
    { pct: lEndPct,    date: fmt(tsLaunchEnd),   name: "Launch End",   isToday: false },
    { pct: createdPct, date: fmt(tsCreated),     name: "Created At",   isToday: false },
    { pct: todayPct,   date: fmt(tsToday),       name: "Today",        isToday: true  },
    { pct: dMinPct,    date: fmt(tsDMin),        name: "Min Delivery", isToday: false },
    { pct: dMaxPct,    date: fmt(tsDMax),        name: "Max Delivery", isToday: false },
  ]

  // Remove markers within 3% of an already-kept one (keep first / more important)
  const deduped = allMarkers.filter((m, i, arr) =>
    !arr.slice(0, i).some(prev => Math.abs(prev.pct - m.pct) < 3)
  )
  const markers = compact
    ? deduped.filter(m => m.pct === 0 || m.isToday || m.pct === dMinPct || m.pct === dMaxPct)
    : deduped

  const safeLeft = (pct: number) => Math.min(96, Math.max(2, pct))
  const anchor   = (pct: number) => pct < 5 ? "none" : pct > 95 ? "translateX(-100%)" : "translateX(-50%)"

  return (
    <div className="space-y-1">
      <div className="relative" style={{ marginTop: "14px", paddingBottom: compact ? "30px" : "42px" }}>

        {/* Overdue zone: faint red background from dMax → today */}
        {isOverdue && (
          <div className="absolute top-0 h-full rounded-r-sm" style={{
            left: `${dMaxPct}%`, right: "0",
            background: "rgba(239,68,68,0.07)",
          }} />
        )}

        {/* Bar track */}
        <div className="h-1.5 rounded-full bg-muted relative overflow-visible">
          {/* Construction progress fill */}
          <div className={cn("absolute left-0 top-0 h-full rounded-full", fillColor)} style={{ width: `${overallPct}%` }} />
        </div>

        {/* Dotted tick lines (extend above and below bar) */}
        {markers.map((m, i) => (
          <div key={i} className="absolute" style={{
            left: `${m.pct}%`, top: "-6px",
            height: "14px", width: "0",
            borderLeft: m.isToday
              ? "2px solid hsl(var(--foreground))"
              : isOverdue && m.pct === dMaxPct
              ? "2px dashed rgba(239,68,68,0.7)"
              : "1.5px dashed hsl(var(--muted-foreground) / 0.45)",
          }} />
        ))}

        {/* Today filled dot */}
        <div className="absolute rounded-full z-10" style={{
          left: `${todayPct}%`, top: "50%",
          width: "9px", height: "9px",
          transform: "translate(-50%, -55%)",
          background: isOverdue ? "rgb(239,68,68)" : "hsl(var(--foreground))",
          border: "1.5px solid hsl(var(--background))",
        }} />

        {/* Construction % — above bar near fill edge */}
        {overallPct > 3 && (
          <div className="absolute text-[8px] font-bold tabular-nums leading-none" style={{
            left: `${safeLeft(overallPct)}%`,
            bottom: "calc(100% + 9px)",
            transform: anchor(overallPct),
            opacity: 0.8,
          }}>
            {overallPct}% built
          </div>
        )}

        {/* Today % — shown ABOVE bar, clearly separate from labels below */}
        <div className="absolute text-[9px] font-bold tabular-nums leading-none" style={{
          left: `${safeLeft(todayPct)}%`,
          bottom: "calc(100% + 9px)",
          transform: anchor(todayPct),
          color: isOverdue ? "rgb(239,68,68)" : "hsl(var(--foreground))",
          marginLeft: Math.abs(todayPct - overallPct) < 10 ? (todayPct > overallPct ? "20px" : "-20px") : "0",
        }}>
          {todayPct}% →
        </div>

        {/* Labels below bar — alternating rows to prevent overlap */}
        {markers.map((m, i) => (
          <div key={i} className="absolute flex flex-col items-center" style={{
            left:      `${safeLeft(m.pct)}%`,
            top:       `${10 + (i % 2 === 0 ? 0 : 12)}px`,
            transform: anchor(m.pct),
          }}>
            <span className={cn("text-[9px] font-medium leading-tight whitespace-nowrap tabular-nums",
              m.isToday
                ? isOverdue ? "text-red-600 dark:text-red-400 font-bold" : "text-foreground font-bold"
                : isOverdue && m.pct === dMaxPct ? "text-red-400"
                : "text-muted-foreground",
            )}>
              {m.date}
            </span>
            {!compact && (
              <span className="text-[7px] leading-none whitespace-nowrap text-muted-foreground/50">{m.name}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={cn(compact ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0", rl.color)}>
          {isOverdue ? "⚠ Overdue" : rl.text}
        </Badge>
        <span className={cn("text-muted-foreground tabular-nums", compact ? "text-[10px]" : "text-[11px]")}>
          {isOverdue ? `${Math.abs(monthsLeft)}mo past delivery` : `${monthsLeft}mo to delivery`}
        </span>
        <span className={cn("font-medium tabular-nums", compact ? "text-[10px]" : "text-[11px]",
          gap > 5 ? "text-amber-600" : gap < -5 ? "text-green-600" : "text-muted-foreground")}>
          {gap > 5 ? `−${gap}pts vs timeline` : gap < -5 ? `+${Math.abs(gap)}pts ahead` : "~on pace"}
        </span>
      </div>
    </div>
  )
}

// ─── Construction Analysis Tab — types & helpers ─────────────────────────────

interface ProjectGroup {
  projectId:    string
  projectName:  string
  developer:    DeveloperInfo
  areaId:       string
  areaName:     string
  subAreaName:  string
  phaseId:      string
  phaseName:    string
  images:       SatelliteImage[]   // sorted oldest → newest
  latestAnalysis: ConstructionSnapshot | null
  district:     string
}

function deriveDistrict(areaName: string): string {
  if (areaName === "New Cairo")          return "Greater Cairo"
  if (areaName === "6th of October" || areaName === "Sheikh Zayed") return "West Cairo"
  if (areaName === "Sahel")              return "North Coast"
  if (areaName === "Ain Sokhna")         return "Red Sea Coast"
  return areaName
}

function generateFullStory(group: ProjectGroup): string {
  const latest   = group.images[group.images.length - 1]
  const analysis = group.latestAnalysis
  if (!analysis) return "No construction analysis data available for this project."
  const date     = formatDateTime(latest.capturedAt)
  let story = `As of ${date}, ${group.projectName} (${group.phaseName}) records ${analysis.overallPct}% overall construction progress. ${analysis.qualitativeText}`
  if (analysis.delta) story += ` ${analysis.delta.deltaSummary}`
  if (group.images.length === 1) story += " This is the first recorded satellite capture for this project. Future captures will enable longitudinal progress tracking and velocity analysis."
  return story
}

// Derive all project groups once (module-level, stable)
const PROJECT_GROUPS: ProjectGroup[] = (() => {
  const map = new Map<string, ProjectGroup>()
  for (const img of SATELLITE_IMAGES) {
    if (!map.has(img.projectId)) {
      map.set(img.projectId, {
        projectId: img.projectId, projectName: img.projectName,
        developer: img.developer,
        areaId: img.areaId, areaName: img.areaName, subAreaName: img.subAreaName,
        phaseId: img.phaseId, phaseName: img.phaseName,
        images: [], latestAnalysis: null,
        district: deriveDistrict(img.areaName),
      })
    }
    map.get(img.projectId)!.images.push(img)
  }
  for (const g of map.values()) {
    g.images.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    const latest = g.images[g.images.length - 1]
    g.latestAnalysis = CONSTRUCTION_ANALYSIS[latest.id] ?? null
  }
  return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName))
})()

const CAT_LABELS: { key: "siteInfrastructure" | "structuralProgress" | "landscaping" | "waterFeatures"; label: string }[] = [
  { key: "siteInfrastructure", label: "Site & Infrastructure" },
  { key: "structuralProgress",  label: "Structural Progress"  },
  { key: "landscaping",         label: "Landscaping"          },
  { key: "waterFeatures",       label: "Water Features"       },
]

// ─── Project Drawer ───────────────────────────────────────────────────────────

function ConstructionProjectDrawer({
  group, open, onClose, onViewImage,
}: {
  group: ProjectGroup | null; open: boolean; onClose: () => void; onViewImage: (img: SatelliteImage) => void
}) {
  const a = group?.latestAnalysis
  const latest = group ? group.images[group.images.length - 1] : null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[640px] sm:max-w-[640px] flex flex-col p-0">
        {group && (
          <>
            <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <CopyId value={group.projectId} className="font-semibold text-foreground text-[10px]" />
                <AreaTag areaName={group.areaName} />
              </div>
              <SheetTitle className="text-base font-semibold">{group.projectName}</SheetTitle>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span>{group.developer.name}</span>
                <span>·</span>
                <span>{group.phaseName}</span>
                {group.subAreaName && <><span>·</span><span>{group.subAreaName}</span></>}
              </div>
              {latest && PROJECT_METADATA[group.projectId] && (
                <div className="pt-1">
                  <ProjectTimelineBar
                    meta={PROJECT_METADATA[group.projectId]}
                    captureDate={latest.capturedAt}
                    overallPct={a?.overallPct ?? 0}
                  />
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Latest image card ── */}
              {latest && <ImageCard image={latest} />}

              {/* ── Current Progress ── */}
              {a && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Progress</p>
                      {a.delta && <Badge variant="outline" className={cn("text-[11px]", paceColor(a.delta.pace))}>{a.delta.pace}</Badge>}
                    </div>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold tabular-nums">{a.overallPct}%</span>
                      {a.delta && <span className="text-sm text-green-600 font-semibold pb-1">+{a.overallPct - a.delta.overallFrom} pts vs {a.delta.period.split("→")[0].trim()}</span>}
                    </div>
                    <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                      {a.delta && <div className="absolute h-full rounded-full bg-muted-foreground/20" style={{ width:`${a.delta.overallFrom}%` }} />}
                      <div className={cn("absolute h-full rounded-full", progressColor(a.overallPct))} style={{ width:`${a.overallPct}%` }} />
                    </div>
                    <div className="space-y-2.5">
                      {CAT_LABELS.map(({ key, label }) => {
                        const cat = a.categories[key]
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-medium">
                                {label}
                                {cat.driver && <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded px-1 py-0 font-semibold">Driver</span>}
                              </span>
                              <span className="flex items-center gap-2 tabular-nums">
                                {cat.delta !== undefined && <span className="text-green-600 text-[11px]">+{cat.delta}</span>}
                                <span className="font-semibold">{cat.pct}%</span>
                                <span className="text-muted-foreground text-[10px] w-18 text-right">{catLabel(cat.pct)}</span>
                              </span>
                            </div>
                            <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                              {cat.from !== undefined && <div className="absolute h-full rounded-full bg-muted-foreground/20" style={{ width:`${cat.from}%` }} />}
                              <div className={cn("absolute h-full rounded-full", cat.pct >= 80 ? "bg-green-500" : cat.pct >= 50 ? "bg-blue-500" : cat.pct >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width:`${cat.pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* ── Full Story ── */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Story</p>
                <p className="text-sm text-foreground leading-relaxed">{generateFullStory(group)}</p>
              </div>

              <Separator />

              {/* ── Capture Timeline ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Capture Timeline</p>
                  <span className="text-[11px] text-muted-foreground">{group.images.length} capture{group.images.length > 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {[...group.images].reverse().map((img, i) => {
                    const imgAnalysis = CONSTRUCTION_ANALYSIS[img.id]
                    const isLatest = i === 0
                    return (
                      <div
                        key={img.id}
                        className="rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors p-3"
                        onClick={() => onViewImage(img)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center mt-1">
                            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", isLatest ? "bg-primary" : "bg-muted-foreground/40")} />
                            {i < group.images.length - 1 && <div className="w-px flex-1 min-h-4 bg-border mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{img.id}</span>
                                {isLatest && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary text-primary">Latest</Badge>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <QualityBadge quality={img.quality} />
                                <TypeBadge type={img.type} />
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground mb-2">{formatDateTime(img.capturedAt)} · {img.systemRequested}</div>
                            {imgAnalysis && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold tabular-nums">{imgAnalysis.overallPct}%</span>
                                {imgAnalysis.delta && (
                                  <span className="text-[11px] text-green-600 font-medium">+{imgAnalysis.overallPct - imgAnalysis.delta.overallFrom} pts</span>
                                )}
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                                  <div className={cn("h-full rounded-full", progressColor(imgAnalysis.overallPct))}
                                    style={{ width:`${imgAnalysis.overallPct}%` }} />
                                </div>
                                {imgAnalysis.delta && (
                                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0", paceColor(imgAnalysis.delta.pace))}>{imgAnalysis.delta.pace}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Enriched Construction Data (Compound → Phase → Capture hierarchy) ───────

type CompoundHealth = "Ahead" | "On Track" | "Monitor" | "Behind" | "Nearly Complete" | "Early Stage"
type PhaseTrend = "Accelerating" | "Steady" | "Decelerating" | "Stalled" | "Recovering"

interface PhaseCapture {
  quarter: string
  date: string
  imageId: string
  constructionPct: number
  timelinePctAtCapture: number
  gapAtCapture: number
  categories: {
    siteInfrastructure: number
    structuralProgress: number
    landscaping: number
    waterFeatures: number
  }
  delta: {
    period: string
    delta: number
    velocityQtly: number
    pace: string
    primaryDriver: string
  } | null
}

interface CompoundPhase {
  phaseId: string
  phaseName: string
  areaKm2: number
  launchDate: string
  minDeliveryDate: string
  maxDeliveryDate: string
  timelinePct: number
  constructionPct: number
  progressGap: number
  health: CompoundHealth
  captures: PhaseCapture[]
  trend: PhaseTrend
  narrative: string
}

interface Compound {
  projectId: string
  projectName: string
  developer: DeveloperInfo
  areaId: string
  areaName: string
  subAreaName: string
  district: string
  earliestLaunch: string
  minDelivery: string
  maxDelivery: string
  totalAreaKm2: number
  timelinePct: number
  constructionPct: number
  progressGap: number
  health: CompoundHealth
  phases: CompoundPhase[]
  projectTimeline: { quarter: string; overallPct: number; timelinePct: number; gap: number }[]
  projectNarrative: string
}

function classifyHealth(constructionPct: number, timelinePct: number): CompoundHealth {
  if (constructionPct >= 90) return "Nearly Complete"
  if (constructionPct < 15 && timelinePct < 15) return "Early Stage"
  const gap = constructionPct - timelinePct
  if (gap >= 15) return "Ahead"
  if (gap >= -5) return "On Track"
  if (gap >= -15) return "Monitor"
  return "Behind"
}

function healthBadgeColor(h: CompoundHealth): string {
  switch (h) {
    case "Ahead":           return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "On Track":        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
    case "Monitor":         return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    case "Behind":          return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    case "Nearly Complete": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
    case "Early Stage":     return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400"
  }
}

function trendBadgeColor(t: PhaseTrend): string {
  switch (t) {
    case "Accelerating": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "Steady":       return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
    case "Decelerating": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
    case "Stalled":      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
    case "Recovering":   return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400"
  }
}

function gapBarFillColor(gap: number): string {
  if (gap >= 10) return "bg-emerald-500"
  if (gap >= 0)  return "bg-green-500"
  if (gap >= -10) return "bg-amber-500"
  return "bg-red-500"
}

function computeTimelinePct(launchDate: string, maxDeliveryDate: string): number {
  const tsLaunch = new Date(launchDate).getTime()
  const tsMax    = new Date(maxDeliveryDate).getTime()
  const span     = tsMax - tsLaunch
  if (span <= 0) return 100
  const elapsed  = TIMELINE_TODAY_MS - tsLaunch
  return Math.round(Math.max(0, Math.min(100, (elapsed / span) * 100)))
}

function monthsUntil(dateStr: string): number {
  const ts = new Date(dateStr).getTime()
  return Math.round((ts - TIMELINE_TODAY_MS) / (30 * 864e5))
}

// ─── Enriched Mock Data (Compounds) ──────────────────────────────────────────

const COMPOUNDS: Compound[] = (() => {
  const devEmaar: DeveloperInfo   = { id: "DV-002", name: "Emaar Misr",               initials: "EM", color: "#b45309" }
  const devPalm: DeveloperInfo    = { id: "DV-001", name: "Palm Hills Developments",  initials: "PH", color: "#0d6e4f" }
  const devMV: DeveloperInfo      = { id: "DV-005", name: "Mountain View",            initials: "MV", color: "#059669" }
  const devOra: DeveloperInfo     = { id: "DV-006", name: "Ora Developers",           initials: "OR", color: "#be185d" }
  const devHyde: DeveloperInfo    = { id: "DV-004", name: "Hyde Park Developments",   initials: "HP", color: "#7c3aed" }

  function mkPhase(p: {
    phaseId: string; phaseName: string; areaKm2: number
    launchDate: string; minDeliveryDate: string; maxDeliveryDate: string
    captures: Omit<PhaseCapture, "timelinePctAtCapture" | "gapAtCapture">[]
    trend: PhaseTrend; narrative: string
  }): CompoundPhase {
    const tlPct = computeTimelinePct(p.launchDate, p.maxDeliveryDate)
    const filled = p.captures.map(c => {
      const capTlPct = computeTimelinePct(p.launchDate, p.maxDeliveryDate)
      return { ...c, timelinePctAtCapture: capTlPct, gapAtCapture: c.constructionPct - capTlPct }
    })
    const latest = filled[filled.length - 1]
    const cPct = latest?.constructionPct ?? 0
    const gap = cPct - tlPct
    return {
      phaseId: p.phaseId, phaseName: p.phaseName, areaKm2: p.areaKm2,
      launchDate: p.launchDate, minDeliveryDate: p.minDeliveryDate, maxDeliveryDate: p.maxDeliveryDate,
      timelinePct: tlPct, constructionPct: cPct, progressGap: gap,
      health: classifyHealth(cPct, tlPct),
      captures: filled, trend: p.trend, narrative: p.narrative,
    }
  }

  function mkCompound(c: {
    projectId: string; projectName: string; developer: DeveloperInfo
    areaId: string; areaName: string; subAreaName: string
    phases: CompoundPhase[]
  }): Compound {
    const phases = c.phases
    const totalArea = phases.reduce((s, p) => s + p.areaKm2, 0)
    const weightedConstruction = phases.reduce((s, p) => s + p.constructionPct * p.areaKm2, 0) / totalArea
    const weightedTimeline     = phases.reduce((s, p) => s + p.timelinePct * p.areaKm2, 0) / totalArea
    const cPct = Math.round(weightedConstruction)
    const tPct = Math.round(weightedTimeline)
    const gap = cPct - tPct

    const launches   = phases.map(p => p.launchDate).sort()
    const minDels    = phases.map(p => p.minDeliveryDate).sort()
    const maxDels    = phases.map(p => p.maxDeliveryDate).sort()

    // Build quarterly project-level timeline from all phase captures
    const qMap = new Map<string, { totalPctArea: number; totalTlArea: number; totalArea: number }>()
    for (const ph of phases) {
      for (const cap of ph.captures) {
        const e = qMap.get(cap.quarter) ?? { totalPctArea: 0, totalTlArea: 0, totalArea: 0 }
        e.totalPctArea += cap.constructionPct * ph.areaKm2
        e.totalTlArea  += cap.timelinePctAtCapture * ph.areaKm2
        e.totalArea    += ph.areaKm2
        qMap.set(cap.quarter, e)
      }
    }
    const projectTimeline = Array.from(qMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([q, e]) => ({
        quarter: q,
        overallPct: Math.round(e.totalPctArea / e.totalArea),
        timelinePct: Math.round(e.totalTlArea / e.totalArea),
        gap: Math.round(e.totalPctArea / e.totalArea) - Math.round(e.totalTlArea / e.totalArea),
      }))

    const health = classifyHealth(cPct, tPct)
    const projectNarrative = `${c.projectName} encompasses ${phases.length} active phases across ${totalArea.toFixed(2)} km². ` +
      `The area-weighted construction stands at ${cPct}% against ${tPct}% of the timeline elapsed, ` +
      `placing the project in "${health}" status. ` +
      phases.map(p => `${p.phaseName} (${p.areaKm2.toFixed(2)} km²) is at ${p.constructionPct}% construction with a ${p.health} health rating.`).join(" ")

    return {
      projectId: c.projectId, projectName: c.projectName, developer: c.developer,
      areaId: c.areaId, areaName: c.areaName, subAreaName: c.subAreaName,
      district: deriveDistrict(c.areaName),
      earliestLaunch: launches[0], minDelivery: minDels[0], maxDelivery: maxDels[maxDels.length - 1],
      totalAreaKm2: totalArea, timelinePct: tPct, constructionPct: cPct, progressGap: gap, health,
      phases, projectTimeline, projectNarrative,
    }
  }

  // ── 1. Uptown Cairo ─────────────────────────────────────────────────────────
  const uptownPhases = [
    mkPhase({
      phaseId: "PH-1408-A", phaseName: "Phase 1 — Levana", areaKm2: 2.1,
      launchDate: "2019-06-01", minDeliveryDate: "2026-03-01", maxDeliveryDate: "2026-12-01",
      captures: [
        { quarter: "Q3 2023", date: "2023-08-12", imageId: "SAT-SIM-UC01", constructionPct: 18, categories: { siteInfrastructure: 45, structuralProgress: 12, landscaping: 4, waterFeatures: 2 }, delta: null },
        { quarter: "Q4 2023", date: "2023-11-20", imageId: "SAT-SIM-UC02", constructionPct: 25, categories: { siteInfrastructure: 55, structuralProgress: 20, landscaping: 8, waterFeatures: 4 }, delta: { period: "Q3 → Q4 2023", delta: 7, velocityQtly: 7, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2024", date: "2024-02-15", imageId: "SAT-SIM-UC03", constructionPct: 34, categories: { siteInfrastructure: 66, structuralProgress: 30, landscaping: 14, waterFeatures: 8 }, delta: { period: "Q4 2023 → Q1 2024", delta: 9, velocityQtly: 9, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2024", date: "2024-05-18", imageId: "SAT-SIM-UC04", constructionPct: 42, categories: { siteInfrastructure: 74, structuralProgress: 40, landscaping: 22, waterFeatures: 14 }, delta: { period: "Q1 → Q2 2024", delta: 8, velocityQtly: 8, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q4 2024", date: "2024-11-10", imageId: "SAT-SIM-UC05", constructionPct: 55, categories: { siteInfrastructure: 84, structuralProgress: 54, landscaping: 35, waterFeatures: 22 }, delta: { period: "Q2 → Q4 2024", delta: 13, velocityQtly: 6.5, pace: "Moderate", primaryDriver: "Landscaping" } },
        { quarter: "Q2 2025", date: "2025-04-20", imageId: "SAT-2025-016", constructionPct: 68, categories: { siteInfrastructure: 91, structuralProgress: 68, landscaping: 48, waterFeatures: 32 }, delta: { period: "Q4 2024 → Q2 2025", delta: 13, velocityQtly: 6.5, pace: "Moderate", primaryDriver: "Structural Progress" } },
      ],
      trend: "Steady", narrative: "Levana has maintained a consistent build pace of approximately 7 points per quarter. Structural work is the dominant activity front, now past the two-thirds mark. Landscaping activation in completed zones is on schedule.",
    }),
    mkPhase({
      phaseId: "PH-1408-B", phaseName: "Phase 2 — The Terraces", areaKm2: 2.6,
      launchDate: "2021-01-01", minDeliveryDate: "2027-06-01", maxDeliveryDate: "2028-03-01",
      captures: [
        { quarter: "Q1 2024", date: "2024-03-05", imageId: "SAT-SIM-UC10", constructionPct: 14, categories: { siteInfrastructure: 38, structuralProgress: 8, landscaping: 2, waterFeatures: 1 }, delta: null },
        { quarter: "Q3 2024", date: "2024-08-22", imageId: "SAT-SIM-UC11", constructionPct: 24, categories: { siteInfrastructure: 52, structuralProgress: 18, landscaping: 8, waterFeatures: 4 }, delta: { period: "Q1 → Q3 2024", delta: 10, velocityQtly: 5, pace: "Slow", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q1 2025", date: "2025-02-10", imageId: "SAT-SIM-UC12", constructionPct: 35, categories: { siteInfrastructure: 64, structuralProgress: 30, landscaping: 16, waterFeatures: 8 }, delta: { period: "Q3 2024 → Q1 2025", delta: 11, velocityQtly: 5.5, pace: "Moderate", primaryDriver: "Structural Progress" } },
      ],
      trend: "Accelerating", narrative: "The Terraces is ramping up after a slower initial phase. Site infrastructure is well-advanced and structural work has picked up meaningfully in the last two quarters.",
    }),
    mkPhase({
      phaseId: "PH-1408-C", phaseName: "Phase 3 — The Residences", areaKm2: 2.45,
      launchDate: "2022-06-01", minDeliveryDate: "2028-06-01", maxDeliveryDate: "2029-06-01",
      captures: [
        { quarter: "Q2 2024", date: "2024-05-25", imageId: "SAT-SIM-UC20", constructionPct: 8, categories: { siteInfrastructure: 22, structuralProgress: 4, landscaping: 1, waterFeatures: 0 }, delta: null },
        { quarter: "Q4 2024", date: "2024-12-01", imageId: "SAT-SIM-UC21", constructionPct: 16, categories: { siteInfrastructure: 38, structuralProgress: 11, landscaping: 4, waterFeatures: 2 }, delta: { period: "Q2 → Q4 2024", delta: 8, velocityQtly: 4, pace: "Slow", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q2 2025", date: "2025-04-15", imageId: "SAT-SIM-UC22", constructionPct: 24, categories: { siteInfrastructure: 50, structuralProgress: 19, landscaping: 8, waterFeatures: 4 }, delta: { period: "Q4 2024 → Q2 2025", delta: 8, velocityQtly: 4, pace: "Slow", primaryDriver: "Site Infrastructure" } },
      ],
      trend: "Steady", narrative: "The Residences is in its early-to-mid construction phase with site infrastructure passing the 50% mark. Structural work is activating as the infrastructure network matures.",
    }),
  ]

  const uptown = mkCompound({
    projectId: "PJ-1408", projectName: "Uptown Cairo", developer: devEmaar,
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "Mokattam Hills",
    phases: uptownPhases,
  })

  // ── 2. Palm Hills October ───────────────────────────────────────────────────
  const palmOctPhases = [
    mkPhase({
      phaseId: "PH-0124-01", phaseName: "Phase 1 — Palm Valley", areaKm2: 1.85,
      launchDate: "2019-11-01", minDeliveryDate: "2026-06-01", maxDeliveryDate: "2027-03-01",
      captures: [
        { quarter: "Q1 2024", date: "2024-02-20", imageId: "SAT-SIM-PO01", constructionPct: 48, categories: { siteInfrastructure: 82, structuralProgress: 46, landscaping: 28, waterFeatures: 18 }, delta: null },
        { quarter: "Q3 2024", date: "2024-08-10", imageId: "SAT-SIM-PO02", constructionPct: 58, categories: { siteInfrastructure: 88, structuralProgress: 56, landscaping: 38, waterFeatures: 25 }, delta: { period: "Q1 → Q3 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2025", date: "2025-01-18", imageId: "SAT-SIM-PO03", constructionPct: 68, categories: { siteInfrastructure: 93, structuralProgress: 67, landscaping: 50, waterFeatures: 35 }, delta: { period: "Q3 2024 → Q1 2025", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Landscaping" } },
      ],
      trend: "Steady", narrative: "Palm Valley is progressing consistently at approximately 5 points per quarter. Infrastructure is near-complete and landscaping has become the dominant activity front.",
    }),
    mkPhase({
      phaseId: "PH-0124-02", phaseName: "Phase 2 — The Oasis", areaKm2: 1.39,
      launchDate: "2020-11-15", minDeliveryDate: "2027-06-01", maxDeliveryDate: "2028-03-01",
      captures: [
        { quarter: "Q3 2023", date: "2023-09-05", imageId: "SAT-SIM-PO10", constructionPct: 22, categories: { siteInfrastructure: 50, structuralProgress: 16, landscaping: 8, waterFeatures: 4 }, delta: null },
        { quarter: "Q1 2024", date: "2024-02-22", imageId: "SAT-SIM-PO11", constructionPct: 32, categories: { siteInfrastructure: 62, structuralProgress: 28, landscaping: 14, waterFeatures: 8 }, delta: { period: "Q3 2023 → Q1 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q3 2024", date: "2024-09-10", imageId: "SAT-SIM-PO12", constructionPct: 40, categories: { siteInfrastructure: 72, structuralProgress: 38, landscaping: 22, waterFeatures: 14 }, delta: { period: "Q1 → Q3 2024", delta: 8, velocityQtly: 4, pace: "Slow", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2025", date: "2025-04-15", imageId: "SAT-2025-001", constructionPct: 48, categories: { siteInfrastructure: 80, structuralProgress: 46, landscaping: 28, waterFeatures: 18 }, delta: { period: "Q3 2024 → Q2 2025", delta: 8, velocityQtly: 2.7, pace: "Slow", primaryDriver: "Structural Progress" } },
      ],
      trend: "Decelerating", narrative: "The Oasis has seen a modest deceleration in pace over the last two quarters. Structural framing is active but the rate has slowed from the earlier ramp-up period.",
    }),
  ]

  const palmOct = mkCompound({
    projectId: "PJ-0124", projectName: "Palm Hills October", developer: devPalm,
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    phases: palmOctPhases,
  })

  // ── 3. Marassi ──────────────────────────────────────────────────────────────
  const marassiPhases = [
    mkPhase({
      phaseId: "PH-0055-03", phaseName: "Phase 3 — Marina", areaKm2: 2.4,
      launchDate: "2019-01-01", minDeliveryDate: "2025-09-01", maxDeliveryDate: "2026-06-01",
      captures: [
        { quarter: "Q1 2023", date: "2023-03-15", imageId: "SAT-SIM-MA01", constructionPct: 44, categories: { siteInfrastructure: 75, structuralProgress: 42, landscaping: 28, waterFeatures: 20 }, delta: null },
        { quarter: "Q3 2023", date: "2023-09-10", imageId: "SAT-SIM-MA02", constructionPct: 56, categories: { siteInfrastructure: 84, structuralProgress: 55, landscaping: 38, waterFeatures: 30 }, delta: { period: "Q1 → Q3 2023", delta: 12, velocityQtly: 6, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2024", date: "2024-02-08", imageId: "SAT-SIM-MA03", constructionPct: 68, categories: { siteInfrastructure: 92, structuralProgress: 68, landscaping: 50, waterFeatures: 42 }, delta: { period: "Q3 2023 → Q1 2024", delta: 12, velocityQtly: 6, pace: "Moderate", primaryDriver: "Landscaping" } },
        { quarter: "Q3 2024", date: "2024-08-18", imageId: "SAT-SIM-MA04", constructionPct: 80, categories: { siteInfrastructure: 96, structuralProgress: 82, landscaping: 65, waterFeatures: 56 }, delta: { period: "Q1 → Q3 2024", delta: 12, velocityQtly: 6, pace: "Moderate", primaryDriver: "Water Features" } },
        { quarter: "Q1 2025", date: "2025-02-20", imageId: "SAT-SIM-MA05", constructionPct: 88, categories: { siteInfrastructure: 98, structuralProgress: 90, landscaping: 78, waterFeatures: 68 }, delta: { period: "Q3 2024 → Q1 2025", delta: 8, velocityQtly: 4, pace: "Moderate", primaryDriver: "Landscaping" } },
      ],
      trend: "Steady", narrative: "Marina is approaching completion with nearly all infrastructure finished and structural work at 90%. The focus has shifted to landscaping and waterfront features as the phase enters its final stage.",
    }),
    mkPhase({
      phaseId: "PH-0055-04", phaseName: "Phase 4 — Bayview", areaKm2: 2.8,
      launchDate: "2020-06-01", minDeliveryDate: "2026-12-01", maxDeliveryDate: "2027-09-01",
      captures: [
        { quarter: "Q2 2023", date: "2023-05-12", imageId: "SAT-SIM-MA10", constructionPct: 22, categories: { siteInfrastructure: 48, structuralProgress: 18, landscaping: 8, waterFeatures: 4 }, delta: null },
        { quarter: "Q4 2023", date: "2023-12-05", imageId: "SAT-SIM-MA11", constructionPct: 34, categories: { siteInfrastructure: 60, structuralProgress: 30, landscaping: 16, waterFeatures: 10 }, delta: { period: "Q2 → Q4 2023", delta: 12, velocityQtly: 6, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2024", date: "2024-06-15", imageId: "SAT-SIM-MA12", constructionPct: 48, categories: { siteInfrastructure: 74, structuralProgress: 46, landscaping: 28, waterFeatures: 20 }, delta: { period: "Q4 2023 → Q2 2024", delta: 14, velocityQtly: 7, pace: "Fast", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2025", date: "2025-03-10", imageId: "SAT-SIM-MA13", constructionPct: 62, categories: { siteInfrastructure: 85, structuralProgress: 62, landscaping: 40, waterFeatures: 32 }, delta: { period: "Q2 2024 → Q1 2025", delta: 14, velocityQtly: 4.7, pace: "Moderate", primaryDriver: "Landscaping" } },
      ],
      trend: "Steady", narrative: "Bayview is maintaining a consistent pace with strong structural momentum. Landscaping has been activated across early-completing residential clusters.",
    }),
    mkPhase({
      phaseId: "PH-0055-05", phaseName: "Phase 5 — Lagoon Villas", areaKm2: 2.62,
      launchDate: "2021-06-01", minDeliveryDate: "2027-12-01", maxDeliveryDate: "2028-09-01",
      captures: [
        { quarter: "Q4 2023", date: "2023-11-22", imageId: "SAT-SIM-MA20", constructionPct: 14, categories: { siteInfrastructure: 35, structuralProgress: 10, landscaping: 4, waterFeatures: 2 }, delta: null },
        { quarter: "Q2 2024", date: "2024-05-28", imageId: "SAT-SIM-MA21", constructionPct: 26, categories: { siteInfrastructure: 50, structuralProgress: 22, landscaping: 10, waterFeatures: 6 }, delta: { period: "Q4 2023 → Q2 2024", delta: 12, velocityQtly: 6, pace: "Moderate", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q1 2025", date: "2025-03-15", imageId: "SAT-2025-002", constructionPct: 38, categories: { siteInfrastructure: 65, structuralProgress: 35, landscaping: 18, waterFeatures: 12 }, delta: { period: "Q2 2024 → Q1 2025", delta: 12, velocityQtly: 4, pace: "Moderate", primaryDriver: "Structural Progress" } },
      ],
      trend: "Steady", narrative: "Lagoon Villas is progressing through its mid-stage construction with infrastructure well-advanced and structural work gaining momentum across the villa clusters.",
    }),
  ]

  const marassi = mkCompound({
    projectId: "PJ-0055", projectName: "Marassi", developer: devEmaar,
    areaId: "AR-014", areaName: "Sahel", subAreaName: "Sidi Abdel Rahman",
    phases: marassiPhases,
  })

  // ── 4. Mountain View iCity ──────────────────────────────────────────────────
  const mvICityPhases = [
    mkPhase({
      phaseId: "PH-0312-03", phaseName: "Phase 3 — Club Park", areaKm2: 2.1,
      launchDate: "2020-06-01", minDeliveryDate: "2026-06-01", maxDeliveryDate: "2027-03-01",
      captures: [
        { quarter: "Q2 2023", date: "2023-06-10", imageId: "SAT-SIM-MV01", constructionPct: 25, categories: { siteInfrastructure: 55, structuralProgress: 20, landscaping: 10, waterFeatures: 6 }, delta: null },
        { quarter: "Q4 2023", date: "2023-12-12", imageId: "SAT-SIM-MV02", constructionPct: 35, categories: { siteInfrastructure: 66, structuralProgress: 32, landscaping: 18, waterFeatures: 10 }, delta: { period: "Q2 → Q4 2023", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2024", date: "2024-06-08", imageId: "SAT-SIM-MV03", constructionPct: 44, categories: { siteInfrastructure: 76, structuralProgress: 42, landscaping: 26, waterFeatures: 16 }, delta: { period: "Q4 2023 → Q2 2024", delta: 9, velocityQtly: 4.5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2025", date: "2025-02-24", imageId: "SAT-2025-005", constructionPct: 55, categories: { siteInfrastructure: 85, structuralProgress: 54, landscaping: 36, waterFeatures: 22 }, delta: { period: "Q2 2024 → Q1 2025", delta: 11, velocityQtly: 3.7, pace: "Slow", primaryDriver: "Landscaping" } },
      ],
      trend: "Decelerating", narrative: "Club Park has seen a gradual deceleration in quarterly velocity despite consistent overall gains. Infrastructure is near-complete and the focus is shifting to landscaping.",
    }),
    mkPhase({
      phaseId: "PH-0312-04", phaseName: "Phase 4 — The Lake District", areaKm2: 2.18,
      launchDate: "2021-02-01", minDeliveryDate: "2027-03-01", maxDeliveryDate: "2027-12-01",
      captures: [
        { quarter: "Q3 2023", date: "2023-08-20", imageId: "SAT-SIM-MV10", constructionPct: 18, categories: { siteInfrastructure: 42, structuralProgress: 14, landscaping: 6, waterFeatures: 3 }, delta: null },
        { quarter: "Q1 2024", date: "2024-01-28", imageId: "SAT-SIM-MV11", constructionPct: 26, categories: { siteInfrastructure: 54, structuralProgress: 22, landscaping: 12, waterFeatures: 6 }, delta: { period: "Q3 2023 → Q1 2024", delta: 8, velocityQtly: 4, pace: "Slow", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q3 2024", date: "2024-09-15", imageId: "SAT-SIM-MV12", constructionPct: 35, categories: { siteInfrastructure: 66, structuralProgress: 32, landscaping: 18, waterFeatures: 10 }, delta: { period: "Q1 → Q3 2024", delta: 9, velocityQtly: 4.5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2025", date: "2025-04-10", imageId: "SAT-SIM-MV13", constructionPct: 42, categories: { siteInfrastructure: 74, structuralProgress: 40, landscaping: 24, waterFeatures: 14 }, delta: { period: "Q3 2024 → Q2 2025", delta: 7, velocityQtly: 2.3, pace: "Slow", primaryDriver: "Structural Progress" } },
      ],
      trend: "Decelerating", narrative: "The Lake District has experienced a slowdown in construction velocity over the last two quarters. Infrastructure is progressing but structural work has not accelerated as expected.",
    }),
  ]

  const mvICity = mkCompound({
    projectId: "PJ-0312", projectName: "Mountain View iCity", developer: devMV,
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    phases: mvICityPhases,
  })

  // ── 5. Badya ────────────────────────────────────────────────────────────────
  const badyaPhases = [
    mkPhase({
      phaseId: "PH-1002-01", phaseName: "Phase 1 — The Core", areaKm2: 2.8,
      launchDate: "2020-02-01", minDeliveryDate: "2026-06-01", maxDeliveryDate: "2027-06-01",
      captures: [
        { quarter: "Q2 2023", date: "2023-05-18", imageId: "SAT-SIM-BD01", constructionPct: 20, categories: { siteInfrastructure: 48, structuralProgress: 16, landscaping: 6, waterFeatures: 3 }, delta: null },
        { quarter: "Q4 2023", date: "2023-11-25", imageId: "SAT-SIM-BD02", constructionPct: 30, categories: { siteInfrastructure: 60, structuralProgress: 26, landscaping: 14, waterFeatures: 8 }, delta: { period: "Q2 → Q4 2023", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2024", date: "2024-06-05", imageId: "SAT-SIM-BD03", constructionPct: 40, categories: { siteInfrastructure: 72, structuralProgress: 38, landscaping: 22, waterFeatures: 14 }, delta: { period: "Q4 2023 → Q2 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2025", date: "2025-02-15", imageId: "SAT-SIM-BD04", constructionPct: 50, categories: { siteInfrastructure: 82, structuralProgress: 48, landscaping: 32, waterFeatures: 20 }, delta: { period: "Q2 2024 → Q1 2025", delta: 10, velocityQtly: 3.3, pace: "Slow", primaryDriver: "Landscaping" } },
      ],
      trend: "Steady", narrative: "The Core has maintained a consistent 10-point gain every two quarters. Structural work is nearing 50% and landscaping is being activated in completed zones.",
    }),
    mkPhase({
      phaseId: "PH-1002-02", phaseName: "Phase 2 — Green Valley", areaKm2: 3.12,
      launchDate: "2021-02-01", minDeliveryDate: "2027-06-01", maxDeliveryDate: "2028-03-01",
      captures: [
        { quarter: "Q1 2024", date: "2024-01-20", imageId: "SAT-SIM-BD10", constructionPct: 15, categories: { siteInfrastructure: 38, structuralProgress: 10, landscaping: 4, waterFeatures: 2 }, delta: null },
        { quarter: "Q3 2024", date: "2024-08-14", imageId: "SAT-2024-012", constructionPct: 25, categories: { siteInfrastructure: 52, structuralProgress: 20, landscaping: 10, waterFeatures: 6 }, delta: { period: "Q1 → Q3 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q1 2025", date: "2025-03-10", imageId: "SAT-SIM-BD12", constructionPct: 34, categories: { siteInfrastructure: 64, structuralProgress: 30, landscaping: 16, waterFeatures: 10 }, delta: { period: "Q3 2024 → Q1 2025", delta: 9, velocityQtly: 4.5, pace: "Moderate", primaryDriver: "Structural Progress" } },
      ],
      trend: "Steady", narrative: "Green Valley is progressing at a moderate pace with consistent gains across all categories. Infrastructure is well-advanced at 64% and structural work has crossed the 30% threshold.",
    }),
    mkPhase({
      phaseId: "PH-1002-03", phaseName: "Phase 3 — The Gardens", areaKm2: 2.42,
      launchDate: "2022-06-01", minDeliveryDate: "2028-06-01", maxDeliveryDate: "2029-06-01",
      captures: [
        { quarter: "Q3 2024", date: "2024-07-28", imageId: "SAT-SIM-BD20", constructionPct: 8, categories: { siteInfrastructure: 22, structuralProgress: 4, landscaping: 1, waterFeatures: 0 }, delta: null },
        { quarter: "Q1 2025", date: "2025-02-22", imageId: "SAT-SIM-BD21", constructionPct: 18, categories: { siteInfrastructure: 40, structuralProgress: 14, landscaping: 5, waterFeatures: 2 }, delta: { period: "Q3 2024 → Q1 2025", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Site Infrastructure" } },
      ],
      trend: "Accelerating", narrative: "The Gardens is in its early construction phase with site infrastructure advancing rapidly. The initial 10-point gain in two quarters suggests a strong ramp-up.",
    }),
  ]

  const badya = mkCompound({
    projectId: "PJ-1002", projectName: "Badya", developer: devOra,
    areaId: "AR-006", areaName: "6th of October", subAreaName: "Golf District",
    phases: badyaPhases,
  })

  // ── 6. Hyde Park Estate ─────────────────────────────────────────────────────
  const hydeParkPhases = [
    mkPhase({
      phaseId: "PH-0201-02", phaseName: "Phase 2 — Park Avenue", areaKm2: 2.6,
      launchDate: "2020-11-01", minDeliveryDate: "2026-09-01", maxDeliveryDate: "2027-06-01",
      captures: [
        { quarter: "Q1 2023", date: "2023-02-10", imageId: "SAT-SIM-HP01", constructionPct: 22, categories: { siteInfrastructure: 50, structuralProgress: 18, landscaping: 8, waterFeatures: 4 }, delta: null },
        { quarter: "Q3 2023", date: "2023-08-18", imageId: "SAT-SIM-HP02", constructionPct: 32, categories: { siteInfrastructure: 62, structuralProgress: 28, landscaping: 16, waterFeatures: 8 }, delta: { period: "Q1 → Q3 2023", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2024", date: "2024-01-22", imageId: "SAT-SIM-HP03", constructionPct: 42, categories: { siteInfrastructure: 74, structuralProgress: 40, landscaping: 24, waterFeatures: 14 }, delta: { period: "Q3 2023 → Q1 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q3 2024", date: "2024-09-05", imageId: "SAT-SIM-HP04", constructionPct: 52, categories: { siteInfrastructure: 84, structuralProgress: 52, landscaping: 34, waterFeatures: 22 }, delta: { period: "Q1 → Q3 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q2 2025", date: "2025-04-05", imageId: "SAT-SIM-HP05", constructionPct: 64, categories: { siteInfrastructure: 91, structuralProgress: 64, landscaping: 45, waterFeatures: 30 }, delta: { period: "Q3 2024 → Q2 2025", delta: 12, velocityQtly: 4, pace: "Moderate", primaryDriver: "Landscaping" } },
      ],
      trend: "Steady", narrative: "Park Avenue has demonstrated remarkable consistency with 10-12 point gains every two quarters. Infrastructure is near completion and landscaping has become a significant activity front.",
    }),
    mkPhase({
      phaseId: "PH-0201-03", phaseName: "Phase 3 — Central Park", areaKm2: 2.81,
      launchDate: "2021-11-01", minDeliveryDate: "2027-06-01", maxDeliveryDate: "2028-03-01",
      captures: [
        { quarter: "Q2 2023", date: "2023-05-15", imageId: "SAT-SIM-HP10", constructionPct: 10, categories: { siteInfrastructure: 28, structuralProgress: 6, landscaping: 2, waterFeatures: 1 }, delta: null },
        { quarter: "Q4 2023", date: "2023-12-08", imageId: "SAT-SIM-HP11", constructionPct: 20, categories: { siteInfrastructure: 44, structuralProgress: 16, landscaping: 8, waterFeatures: 4 }, delta: { period: "Q2 → Q4 2023", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Site Infrastructure" } },
        { quarter: "Q2 2024", date: "2024-06-20", imageId: "SAT-SIM-HP12", constructionPct: 30, categories: { siteInfrastructure: 58, structuralProgress: 26, landscaping: 16, waterFeatures: 8 }, delta: { period: "Q4 2023 → Q2 2024", delta: 10, velocityQtly: 5, pace: "Moderate", primaryDriver: "Structural Progress" } },
        { quarter: "Q1 2025", date: "2025-03-18", imageId: "SAT-2025-004", constructionPct: 42, categories: { siteInfrastructure: 72, structuralProgress: 40, landscaping: 24, waterFeatures: 14 }, delta: { period: "Q2 2024 → Q1 2025", delta: 12, velocityQtly: 4, pace: "Moderate", primaryDriver: "Structural Progress" } },
      ],
      trend: "Accelerating", narrative: "Central Park has been gaining momentum with the latest quarter showing a 12-point jump versus the prior 10-point average. Structural work is the dominant driver as the phase enters mid-construction.",
    }),
  ]

  const hydePark = mkCompound({
    projectId: "PJ-0201", projectName: "Hyde Park Estate", developer: devHyde,
    areaId: "AR-001", areaName: "New Cairo", subAreaName: "5th Settlement",
    phases: hydeParkPhases,
  })

  // ── ZED by Ora Developers: no phases — direct project-level analysis ──
  // SAT-2025-008 in SATELLITE_IMAGES maps to PJ-0610
  const zedTimeline = computeTimelinePct("2023-03-01", "2029-03-01")
  const zed: Compound = {
    projectId: "PJ-0610", projectName: "ZED", developer: { id:"DV-006", name:"Ora Developers", initials:"OR", color:"#be185d" },
    areaId: "AR-009", areaName: "Sheikh Zayed", subAreaName: "Beverly Hills", district: "West Cairo",
    earliestLaunch: "2023-03-01", minDelivery: "2028-06-01", maxDelivery: "2029-03-01",
    totalAreaKm2: 3.62, timelinePct: zedTimeline, constructionPct: 29,
    progressGap: 29 - zedTimeline,
    health: classifyHealth(29, zedTimeline),
    phases: [],   // ← no phases: analysis is directly at project level
    projectTimeline: [
      { quarter: "Q1 2025", overallPct: 22, timelinePct: Math.round(computeTimelinePct("2023-03-01", "2029-03-01") * 0.8), gap: 22 - Math.round(computeTimelinePct("2023-03-01", "2029-03-01") * 0.8) },
      { quarter: "Q2 2025", overallPct: 29, timelinePct: zedTimeline, gap: 29 - zedTimeline },
    ],
    projectNarrative: "ZED is in early construction phase with site infrastructure well underway across approximately 64% of the site. Structural activity is limited to foundations and ground-level framing in the south-facing cluster. At 29% overall construction with " + Math.round(monthsUntil("2028-06-01")) + " months to minimum delivery, the project is currently on track — it has more than enough runway to reach completion at the current pace.",
  }

  return [uptown, palmOct, marassi, mvICity, badya, hydePark, zed].sort((a, b) => a.projectName.localeCompare(b.projectName))
})()

// ─── Two-Track Progress Bar ──────────────────────────────────────────────────

function TwoTrackBar({
  constructionPct, timelinePct, gap, label, compact = false,
}: {
  constructionPct: number; timelinePct: number; gap: number; label?: string; compact?: boolean
}) {
  const fillColor = gapBarFillColor(gap)
  const todayLeft  = Math.min(100, Math.max(0, timelinePct))
  return (
    <div className={cn("space-y-1", compact ? "" : "")}>
      {label && <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>}
      <div className="relative">
        {/* Track */}
        <div className="h-2 rounded-full bg-muted relative overflow-visible">
          {/* Construction fill */}
          <div className={cn("absolute left-0 top-0 h-full rounded-full transition-all", fillColor)} style={{ width: `${constructionPct}%` }} />
        </div>
        {/* Today marker (timeline %) */}
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${todayLeft}%` }}>
          <div className="w-0.5 h-4 bg-foreground rounded-full -translate-x-1/2" />
        </div>
      </div>
      <div className={cn("flex items-center justify-between", compact ? "text-[10px]" : "text-[11px]")}>
        <span className="text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{constructionPct}%</span> built
        </span>
        <span className="text-muted-foreground tabular-nums">
          {timelinePct}% of timeline
        </span>
      </div>
    </div>
  )
}

// ─── Compound Drawer ─────────────────────────────────────────────────────────

function CompoundDrawer({
  compound, open, onClose, onViewImage,
}: {
  compound: Compound | null; open: boolean; onClose: () => void
  onViewImage: (imageId: string, capture: PhaseCapture, phase: CompoundPhase) => void
}) {
  if (!compound) return <Sheet open={false} onOpenChange={() => {}}><SheetContent className="w-[640px] sm:max-w-[640px]" /></Sheet>

  const monthsLeft = monthsUntil(compound.maxDelivery)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[680px] sm:max-w-[680px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <CopyId value={compound.projectId} className="font-semibold text-foreground text-[10px]" />
            <AreaTag areaName={compound.areaName} />
            <Badge variant="outline" className={cn("text-[11px] px-1.5 py-0", healthBadgeColor(compound.health))}>{compound.health}</Badge>
          </div>
          <SheetTitle className="text-base font-semibold">{compound.projectName}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span>{compound.developer.name}</span>
            <span>·</span>
            <span>{compound.phases.length} phases</span>
            <span>·</span>
            <span>{compound.totalAreaKm2.toFixed(2)} km²</span>
            {compound.subAreaName && <><span>·</span><span>{compound.subAreaName}</span></>}
          </div>
          <div className="pt-2">
            <TwoTrackBar constructionPct={compound.constructionPct} timelinePct={compound.timelinePct} gap={compound.progressGap} />
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={cn("font-medium tabular-nums", compound.progressGap >= 0 ? "text-green-600" : "text-amber-600")}>
              {compound.progressGap >= 0 ? `+${compound.progressGap}` : compound.progressGap} pts gap
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground tabular-nums">
              {monthsLeft > 0 ? `${monthsLeft}mo to max delivery` : `${Math.abs(monthsLeft)}mo past delivery`}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Overall category breakdown (from latest captures across phases or direct project) ── */}
          {(() => {
            // Gather categories: for phased projects use latest capture of most advanced phase,
            // for no-phase projects use CONSTRUCTION_ANALYSIS of latest image
            const allProjImgs = SATELLITE_IMAGES.filter(img => img.projectId === compound.projectId)
              .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
            const latestDirectAnalysis = allProjImgs[0] ? CONSTRUCTION_ANALYSIS[allProjImgs[0].id] : null
            const latestPhaseCapture = compound.phases.length > 0
              ? compound.phases.flatMap(p => p.captures).sort((a, b) => b.date.localeCompare(a.date))[0]
              : null
            const cats = latestPhaseCapture
              ? CAT_LABELS.map(({ key, label }) => ({ label, val: latestPhaseCapture.categories[key] }))
              : latestDirectAnalysis
              ? CAT_LABELS.map(({ key, label }) => ({ label, val: latestDirectAnalysis.categories[key].pct }))
              : null
            if (!cats) return null
            return (
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category Breakdown</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {cats.map(({ label, val }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold tabular-nums">{val}% <span className="text-muted-foreground/60 font-normal text-[10px]">{catLabel(val)}</span></span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width:`${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <Separator />

          {/* ── Quarterly progress dots (from projectTimeline or from direct images) ── */}
          {(() => {
            const hasTimeline = compound.projectTimeline.length > 1
            const directImgs = compound.phases.length === 0
              ? SATELLITE_IMAGES.filter(img => img.projectId === compound.projectId).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
              : []
            if (!hasTimeline && directImgs.length === 0) return null
            return (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quarterly Progress</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {hasTimeline
                    ? compound.projectTimeline.map((pt, i, arr) => (
                        <React.Fragment key={pt.quarter}>
                          <div className="flex flex-col items-center">
                            <div className={cn("w-3 h-3 rounded-full", i === arr.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                            <span className="text-[8px] text-muted-foreground mt-0.5 whitespace-nowrap">{pt.quarter}</span>
                            <span className="text-[9px] font-semibold tabular-nums">{pt.overallPct}%</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex flex-col items-center px-1">
                              <div className="w-6 h-px bg-border" />
                              <span className="text-[8px] text-green-600 font-medium">+{arr[i+1].overallPct - pt.overallPct}</span>
                            </div>
                          )}
                        </React.Fragment>
                      ))
                    : directImgs.map((img, i, arr) => (
                        <React.Fragment key={img.id}>
                          <button
                            onClick={() => onViewImage(img.id, { quarter: toQuarter(img.capturedAt), date: img.capturedAt.split(" ")[0], imageId: img.id, constructionPct: CONSTRUCTION_ANALYSIS[img.id]?.overallPct ?? 0, timelinePctAtCapture: 0, gapAtCapture: 0, categories: CONSTRUCTION_ANALYSIS[img.id]?.categories ? { siteInfrastructure: CONSTRUCTION_ANALYSIS[img.id].categories.siteInfrastructure.pct, structuralProgress: CONSTRUCTION_ANALYSIS[img.id].categories.structuralProgress.pct, landscaping: CONSTRUCTION_ANALYSIS[img.id].categories.landscaping.pct, waterFeatures: CONSTRUCTION_ANALYSIS[img.id].categories.waterFeatures.pct } : { siteInfrastructure:0, structuralProgress:0, landscaping:0, waterFeatures:0 }, delta: null }, compound.phases[0] ?? { phaseId:"", phaseName:"", areaKm2: compound.totalAreaKm2, launchDate: compound.earliestLaunch, minDeliveryDate: compound.minDelivery, maxDeliveryDate: compound.maxDelivery, timelinePct: compound.timelinePct, constructionPct: compound.constructionPct, progressGap: compound.progressGap, health: compound.health as CompoundHealth, captures: [], trend:"Steady", narrative:"" })}
                            className="flex flex-col items-center group/dot hover:opacity-80 transition-opacity"
                            title={`View ${toQuarter(img.capturedAt)}`}
                          >
                            <div className={cn("w-3 h-3 rounded-full ring-2 ring-transparent group-hover/dot:ring-primary/40 transition-all", i === arr.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                            <span className="text-[8px] text-muted-foreground mt-0.5 whitespace-nowrap">{toQuarter(img.capturedAt)}</span>
                            <span className="text-[9px] font-semibold tabular-nums">{CONSTRUCTION_ANALYSIS[img.id]?.overallPct ?? "—"}%</span>
                          </button>
                          {i < arr.length - 1 && <div className="w-6 h-px bg-border mx-1 mt-1" />}
                        </React.Fragment>
                      ))
                  }
                </div>
              </div>
            )
          })()}

          <Separator />

          {/* ── Compact images table ── */}
          {(() => {
            const imgs = SATELLITE_IMAGES.filter(img => img.projectId === compound.projectId)
              .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
            if (imgs.length === 0) return null
            return (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Images Taken</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Image</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Quarter</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Quality</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Progress</th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {imgs.map(img => {
                        const a = CONSTRUCTION_ANALYSIS[img.id]
                        return (
                          <tr key={img.id}
                            className="border-t border-border hover:bg-muted/30 cursor-pointer group/row transition-colors"
                            onClick={() => onViewImage(img.id, { quarter: toQuarter(img.capturedAt), date: img.capturedAt.split(" ")[0], imageId: img.id, constructionPct: a?.overallPct ?? 0, timelinePctAtCapture: 0, gapAtCapture: 0, categories: a?.categories ? { siteInfrastructure: a.categories.siteInfrastructure.pct, structuralProgress: a.categories.structuralProgress.pct, landscaping: a.categories.landscaping.pct, waterFeatures: a.categories.waterFeatures.pct } : { siteInfrastructure:0, structuralProgress:0, landscaping:0, waterFeatures:0 }, delta: null }, compound.phases[0] ?? { phaseId:"", phaseName:"", areaKm2: compound.totalAreaKm2, launchDate: compound.earliestLaunch, minDeliveryDate: compound.minDelivery, maxDeliveryDate: compound.maxDelivery, timelinePct: compound.timelinePct, constructionPct: compound.constructionPct, progressGap: compound.progressGap, health: compound.health as CompoundHealth, captures: [], trend:"Steady", narrative:"" })}
                          >
                            <td className="px-3 py-2 font-mono text-primary">{img.id}</td>
                            <td className="px-3 py-2 text-muted-foreground">{toQuarter(img.capturedAt)}</td>
                            <td className="px-3 py-2"><QualityBadge quality={img.quality} /></td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{a?.overallPct ?? "—"}%</td>
                            <td className="px-2 py-2"><Eye className="h-3.5 w-3.5 text-muted-foreground group-hover/row:text-foreground transition-colors" /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          <Separator />

          {/* ── Project Narrative ── */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project Narrative</p>
            <p className="text-sm text-foreground leading-relaxed">{compound.projectNarrative}</p>
          </div>

          <Separator />

          {/* ── Phases ── */}
          {compound.phases.map(phase => {
            const latestCap = phase.captures[phase.captures.length - 1]
            return (
              <div key={phase.phaseId} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{phase.phaseName}</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{phase.areaKm2.toFixed(2)} km²</Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", healthBadgeColor(phase.health))}>{phase.health}</Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", trendBadgeColor(phase.trend))}>{phase.trend}</Badge>
                </div>

                <TwoTrackBar constructionPct={phase.constructionPct} timelinePct={phase.timelinePct} gap={phase.progressGap} compact />

                {/* Category bars */}
                {latestCap && (
                  <div className="space-y-2">
                    {CAT_LABELS.map(({ key, label }) => {
                      const val = latestCap.categories[key]
                      return (
                        <div key={key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-muted-foreground">{label}</span>
                            <span className="font-semibold tabular-nums">{val}%</span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Quarterly dots timeline — each dot clickable */}
                {phase.captures.length > 1 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {phase.captures.map((cap, ci) => (
                      <React.Fragment key={cap.quarter}>
                        <button
                          onClick={() => onViewImage(cap.imageId, cap, phase)}
                          className="flex flex-col items-center group/dot hover:opacity-80 transition-opacity"
                          title={`View ${cap.quarter} capture (${cap.imageId})`}
                        >
                          <div className={cn("w-3 h-3 rounded-full ring-2 ring-transparent group-hover/dot:ring-primary/40 transition-all",
                            ci === phase.captures.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                          <span className="text-[8px] text-muted-foreground mt-0.5 whitespace-nowrap">{cap.quarter}</span>
                          <span className="text-[9px] font-semibold tabular-nums">{cap.constructionPct}%</span>
                        </button>
                        {ci < phase.captures.length - 1 && (
                          <div className="flex flex-col items-center px-1">
                            <div className="w-6 h-px bg-border" />
                            {phase.captures[ci + 1].delta && (
                              <span className="text-[8px] text-green-600 font-medium whitespace-nowrap">+{phase.captures[ci + 1].delta!.delta}</span>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">{phase.narrative}</p>

                {/* Captures table — click any row to drill into that image */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Quarter</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Image</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Progress</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Δ pts</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pace</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Driver</th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {phase.captures.map((cap) => {
                        const isReal = !cap.imageId.startsWith("SAT-SIM")
                        return (
                          <tr key={cap.quarter}
                            className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors group/row"
                            onClick={() => onViewImage(cap.imageId, cap, phase)}
                          >
                            <td className="px-3 py-2 font-medium text-foreground">{cap.quarter}</td>
                            <td className="px-3 py-2">
                              <span className={cn("font-mono", isReal ? "text-primary" : "text-muted-foreground")}>
                                {cap.imageId}
                              </span>
                              {!isReal && <span className="ml-1 text-[9px] text-muted-foreground/60">sim</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{cap.constructionPct}%</td>
                            <td className="px-3 py-2 text-right tabular-nums text-green-600 font-medium">
                              {cap.delta ? `+${cap.delta.delta}` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {cap.delta ? (
                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0", paceColor(cap.delta.pace as PaceLabel))}>
                                  {cap.delta.pace}
                                </Badge>
                              ) : <span className="text-muted-foreground">First</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                              {cap.delta?.primaryDriver || "—"}
                            </td>
                            <td className="px-2 py-2">
                              <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover/row:text-foreground transition-colors" />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <Separator />
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Construction Analysis Tab ────────────────────────────────────────────────

function ConstructionAnalysisTab() {
  // ── Filter state ──
  const [search, setSearch]               = useState("")
  const [districtFilter, setDistrict]     = useState<Set<string>>(new Set())
  const [areaFilter, setArea]             = useState<Set<string>>(new Set())
  const [healthFilter, setHealth]         = useState<Set<string>>(new Set())
  // ── UI state ──
  const [expandedIds, setExpanded]          = useState<Set<string>>(new Set())
  const [drawerCompound, setDrawerCompound] = useState<Compound | null>(null)
  const [drawerPhase, setDrawerPhase]       = useState<{ phase: CompoundPhase; compound: Compound } | null>(null)
  // ── Capture drill-down state ──
  const [detailImage, setDetailImage]       = useState<SatelliteImage | null>(null)
  const [detailImageTab, setDetailImageTab] = useState<"main" | "analysis">("analysis")
  const [detailCapture, setDetailCapture]   = useState<{ capture: PhaseCapture; phase: CompoundPhase; compound: Compound } | null>(null)

  const handleViewImage = (imageId: string, capture: PhaseCapture, phase: CompoundPhase, compoundCtx?: Compound) => {
    const realImg = SATELLITE_IMAGES.find(img => img.id === imageId)
    if (realImg) {
      setDetailImage(realImg)
      setDetailImageTab("analysis")
    } else {
      // resolve compound from argument, then open drawers, then give up gracefully
      const c = compoundCtx ?? drawerCompound ?? drawerPhase?.compound ?? null
      if (c) setDetailCapture({ capture, phase, compound: c })
    }
  }

  // ── Unique filter options ──
  const uniqueDistricts = useMemo(() => Array.from(new Set(COMPOUNDS.map(c => c.district))).sort(), [])
  const uniqueAreas     = useMemo(() => Array.from(new Set(COMPOUNDS.map(c => c.areaName))).sort(), [])
  const uniqueHealths   = useMemo(() => Array.from(new Set(COMPOUNDS.map(c => c.health))).sort(), [])

  // ── Filtered compounds ──
  const filtered = useMemo(() => {
    return COMPOUNDS.filter(c => {
      const q = search.toLowerCase()
      if (search && !c.projectName.toLowerCase().includes(q) && !c.projectId.toLowerCase().includes(q)) return false
      if (districtFilter.size > 0 && !districtFilter.has(c.district)) return false
      if (areaFilter.size > 0 && !areaFilter.has(c.areaName)) return false
      if (healthFilter.size > 0 && !healthFilter.has(c.health)) return false
      return true
    })
  }, [search, districtFilter, areaFilter, healthFilter])

  const hasFilter = !!(search || districtFilter.size || areaFilter.size || healthFilter.size)
  const clearFilters = () => {
    setSearch(""); setDistrict(new Set()); setArea(new Set()); setHealth(new Set())
  }

  // ── Analytics ──
  const totalPhases  = useMemo(() => filtered.reduce((s, c) => s + c.phases.length, 0), [filtered])
  const avgConstPct  = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(filtered.reduce((s, c) => s + c.constructionPct, 0) / filtered.length)
  }, [filtered])
  const totalAreaKm2 = useMemo(() => filtered.reduce((s, c) => s + c.totalAreaKm2, 0), [filtered])
  const phasesAhead  = useMemo(() => filtered.reduce((s, c) => s + c.phases.filter(p => p.health === "Ahead" || p.health === "Nearly Complete").length, 0), [filtered])
  const phasesBehind = useMemo(() => filtered.reduce((s, c) => s + c.phases.filter(p => p.health === "Behind" || p.health === "Monitor").length, 0), [filtered])

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  return (
    <div className="space-y-4">

      {/* ── Analytics cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Projects",            value: String(filtered.length),      sub: "tracked" },
          { label: "Phases",              value: String(totalPhases),          sub: "across all projects" },
          { label: "Avg Construction",    value: `${avgConstPct}%`,            sub: "area-weighted" },
          { label: "Ahead / On Track",    value: String(phasesAhead),          sub: "phases" },
          { label: "Behind / Monitor",    value: String(phasesBehind),         sub: "phases" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter card ── */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative shrink-0 w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input className="h-8 pl-8 pr-7 w-full text-sm" placeholder="Search compound name or ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <MultiSelectFilter label="District" options={uniqueDistricts} selected={districtFilter}
            onChange={s => setDistrict(s)} className="w-32" />
          <MultiSelectFilter label="Area" options={uniqueAreas} selected={areaFilter}
            onChange={s => setArea(s)} className="w-28" />
          <MultiSelectFilter label="Health" options={uniqueHealths} selected={healthFilter}
            onChange={s => setHealth(s)} className="w-28" />
          {hasFilter && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" />Clear All
            </Button>
          )}
        </div>
      </div>

      {/* ── Compound card list ── */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <ScanSearch className="h-8 w-8 opacity-30" />
            No compounds match the current filters.
          </div>
        )}

        {filtered.map(compound => {
          const isExpanded = expandedIds.has(compound.projectId)
          const monthsLeft = monthsUntil(compound.maxDelivery)

          return (
            <div key={compound.projectId} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Card header */}
              <div
                className="flex flex-col gap-2 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(compound.projectId)}
              >
                <div className="flex items-center gap-4">
                  {/* Expand chevron */}
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", isExpanded && "rotate-90")} />

                  {/* Compound info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{compound.projectName}</span>
                      <CopyId value={compound.projectId} />
                      <AreaTag areaName={compound.areaName} />
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", healthBadgeColor(compound.health))}>{compound.health}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span>{compound.developer.name}</span>
                      <span>·</span>
                      <span>{compound.phases.length > 0 ? `${compound.phases.length} phase${compound.phases.length > 1 ? "s" : ""}` : "No phases"}</span>
                      <span>·</span>
                      <span>{compound.totalAreaKm2.toFixed(2)} km²</span>
                      <span>·</span>
                      <span className={cn("tabular-nums font-medium", compound.progressGap >= 0 ? "text-green-600" : "text-amber-600")}>
                        {compound.progressGap >= 0 ? "+" : ""}{compound.progressGap} pts gap
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {monthsLeft > 0 ? `${monthsLeft}mo to delivery` : `${Math.abs(monthsLeft)}mo past`}
                      </span>
                      {(() => {
                        const allCaptures = compound.phases.flatMap(p => p.captures)
                        const latest = allCaptures.reduce((best, c) => c.date > best ? c.date : best, "")
                        return latest ? <><span>·</span><span>Updated {toQuarter(latest)}</span></> : null
                      })()}
                    </div>
                  </div>

                  {/* Progress summary */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right min-w-[60px]">
                      <div className="text-xl font-bold tabular-nums">{compound.constructionPct}%</div>
                      <div className="text-[10px] text-muted-foreground">{compound.timelinePct}% timeline</div>
                    </div>
                    <div className="w-28">
                      <TwoTrackBar constructionPct={compound.constructionPct} timelinePct={compound.timelinePct} gap={compound.progressGap} compact />
                    </div>
                  </div>

                  {/* View button */}
                  <button
                    onClick={e => { e.stopPropagation(); setDrawerCompound(compound) }}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                    title="View Full Analysis"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/10">

                  {/* ── No-phases case: direct project-level analysis ── */}
                  {compound.phases.length === 0 && (() => {
                    const allImgs = SATELLITE_IMAGES.filter(img => img.projectId === compound.projectId)
                    const latestImg = allImgs.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]
                    const latestAnalysis = latestImg ? CONSTRUCTION_ANALYSIS[latestImg.id] : null
                    return (
                      <div className="space-y-3">
                        {/* Dates row */}
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                          <span>Launch: <span className="font-medium text-foreground">{toQuarter(compound.earliestLaunch)}</span></span>
                          <span>Min Delivery: <span className="font-medium text-foreground">{toQuarter(compound.minDelivery)}</span></span>
                          <span>Max Delivery: <span className="font-medium text-foreground">{toQuarter(compound.maxDelivery)}</span></span>
                        </div>
                        <TwoTrackBar constructionPct={compound.constructionPct} timelinePct={compound.timelinePct} gap={compound.progressGap} />
                        {/* Category breakdown from latest image analysis */}
                        {latestAnalysis && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {CAT_LABELS.map(({ key, label }) => {
                              const val = latestAnalysis.categories[key].pct
                              return (
                                <div key={key} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-semibold tabular-nums">{val}%</span>
                                  </div>
                                  <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width: `${val}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{compound.projectNarrative}</p>
                        {/* Quarterly dots — each dot opens image detail on Construction Analysis tab */}
                        {allImgs.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap py-1">
                            {[...allImgs].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).map((img, ci, arr) => (
                              <React.Fragment key={img.id}>
                                <button
                                  onClick={() => { setDetailImage(img); setDetailImageTab("analysis") }}
                                  className="flex flex-col items-center group/dot hover:opacity-80 transition-opacity"
                                  title={`View ${toQuarter(img.capturedAt)} capture (${img.id})`}
                                >
                                  <div className={cn("w-3 h-3 rounded-full ring-2 ring-transparent group-hover/dot:ring-primary/40 transition-all",
                                    ci === arr.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                                  <span className="text-[8px] text-muted-foreground mt-0.5 whitespace-nowrap">{toQuarter(img.capturedAt)}</span>
                                  <span className="text-[9px] font-semibold tabular-nums">
                                    {CONSTRUCTION_ANALYSIS[img.id]?.overallPct ?? "—"}%
                                  </span>
                                </button>
                                {ci < arr.length - 1 && <div className="w-6 h-px bg-border mx-1 mt-1" />}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                        {allImgs.length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic">No satellite images in dataset for this project.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Phases case: phase sub-cards ── */}
                  {compound.phases.map(phase => {
                    const latestCap = phase.captures[phase.captures.length - 1]
                    const lastUpdatedQ = latestCap ? toQuarter(latestCap.date) : null
                    return (
                      <div key={phase.phaseId} className="rounded-lg border border-border bg-card p-3 space-y-2.5">
                        {/* Phase header with View button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{phase.phaseName}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{phase.areaKm2.toFixed(2)} km²</Badge>
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", healthBadgeColor(phase.health))}>{phase.health}</Badge>
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", trendBadgeColor(phase.trend))}>{phase.trend}</Badge>
                            {lastUpdatedQ && <span className="text-[9px] text-muted-foreground">Updated {lastUpdatedQ}</span>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDrawerPhase({ phase, compound }) }}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                            title="View Phase Analysis"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Two-track bar */}
                        <TwoTrackBar constructionPct={phase.constructionPct} timelinePct={phase.timelinePct} gap={phase.progressGap} compact />

                        {/* Quarterly capture dots */}
                        {phase.captures.length > 1 && (
                          <div className="flex items-center gap-1 flex-wrap py-1">
                            {phase.captures.map((cap, ci) => (
                              <React.Fragment key={cap.quarter}>
                                <div className="flex flex-col items-center">
                                  <div className={cn("w-2 h-2 rounded-full", ci === phase.captures.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                                  <span className="text-[7px] text-muted-foreground mt-0.5 whitespace-nowrap">{cap.quarter}</span>
                                  <span className="text-[8px] font-semibold tabular-nums">{cap.constructionPct}%</span>
                                </div>
                                {ci < phase.captures.length - 1 && (
                                  <div className="flex flex-col items-center px-0.5">
                                    <div className="w-4 h-px bg-border" />
                                    {phase.captures[ci + 1].delta && (
                                      <span className="text-[7px] text-green-600 font-medium whitespace-nowrap">+{phase.captures[ci + 1].delta!.delta}</span>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        {/* Category progress bars */}
                        {latestCap && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {CAT_LABELS.map(({ key, label }) => {
                              const val = latestCap.categories[key]
                              return (
                                <div key={key} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-semibold tabular-nums">{val}%</span>
                                  </div>
                                  <div className="relative h-1 rounded-full bg-muted overflow-hidden">
                                    <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width: `${val}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Narrative */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{phase.narrative}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Compound Drawer ── */}
      <CompoundDrawer
        compound={drawerCompound}
        open={!!drawerCompound}
        onClose={() => setDrawerCompound(null)}
        onViewImage={handleViewImage}
      />

      {/* ── Phase Analysis Drawer ── */}
      <Sheet open={!!drawerPhase} onOpenChange={(o) => !o && setDrawerPhase(null)}>
        <SheetContent className="w-[640px] sm:max-w-[640px] flex flex-col p-0">
          {drawerPhase && (() => {
            const { phase, compound } = drawerPhase
            const latestCap = phase.captures[phase.captures.length - 1]
            const lastUpdatedQ = latestCap ? toQuarter(latestCap.date) : null
            return (
              <>
                <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyId value={phase.phaseId} className="font-semibold text-foreground text-[10px]" />
                    <AreaTag areaName={compound.areaName} />
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", healthBadgeColor(phase.health))}>{phase.health}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", trendBadgeColor(phase.trend))}>{phase.trend}</Badge>
                  </div>
                  <SheetTitle className="text-base font-semibold">{compound.projectName} — {phase.phaseName}</SheetTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{compound.developer.name}</span>
                    <span>·</span>
                    <span>{phase.areaKm2.toFixed(2)} km²</span>
                    <span>·</span>
                    <span>{phase.captures.length} capture{phase.captures.length !== 1 ? "s" : ""}</span>
                    {lastUpdatedQ && <><span>·</span><span>Updated {lastUpdatedQ}</span></>}
                  </div>
                  {/* Phase-level timeline */}
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span>Launch: <span className="font-medium text-foreground">{toQuarter(phase.launchDate)}</span></span>
                      <span>Min Del: <span className="font-medium text-foreground">{toQuarter(phase.minDeliveryDate)}</span></span>
                      <span>Max Del: <span className="font-medium text-foreground">{toQuarter(phase.maxDeliveryDate)}</span></span>
                    </div>
                    <TwoTrackBar constructionPct={phase.constructionPct} timelinePct={phase.timelinePct} gap={phase.progressGap} />
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  {/* Category breakdown */}
                  {latestCap && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category Breakdown — {latestCap.quarter}</p>
                      <div className="space-y-2.5">
                        {CAT_LABELS.map(({ key, label }) => {
                          const val = latestCap.categories[key]
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{label}</span>
                                <span className="font-semibold tabular-nums">{val}% <span className="text-muted-foreground font-normal text-[10px]">{catLabel(val)}</span></span>
                              </div>
                              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Narrative */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phase Analysis</p>
                    <p className="text-sm text-foreground leading-relaxed">{phase.narrative}</p>
                  </div>

                  <Separator />

                  {/* Quarterly dot timeline */}
                  {phase.captures.length > 1 && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quarterly Timeline</p>
                      <div className="flex items-end gap-2 flex-wrap">
                        {phase.captures.map((cap, ci) => (
                          <React.Fragment key={cap.quarter}>
                            <button
                              onClick={() => handleViewImage(cap.imageId, cap, phase, compound)}
                              className="flex flex-col items-center group/dot hover:opacity-80 transition-opacity"
                              title={`${cap.quarter} — ${cap.imageId}`}
                            >
                              <div className={cn("w-3 h-3 rounded-full ring-2 ring-transparent group-hover/dot:ring-primary/40 transition-all", ci === phase.captures.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
                              <span className="text-[9px] text-muted-foreground mt-0.5">{cap.quarter}</span>
                              <span className="text-[10px] font-semibold tabular-nums">{cap.constructionPct}%</span>
                            </button>
                            {ci < phase.captures.length - 1 && (
                              <div className="flex flex-col items-center pb-5">
                                <div className="w-8 h-px bg-border" />
                                {phase.captures[ci + 1].delta && (
                                  <span className="text-[9px] text-green-600 font-medium">+{phase.captures[ci + 1].delta!.delta}</span>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Captures table */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Images Taken for This Phase</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Quarter</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Image</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Progress</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Δ</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pace</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Driver</th>
                            <th className="px-2 py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {phase.captures.map(cap => {
                            const isReal = !cap.imageId.startsWith("SAT-SIM")
                            return (
                              <tr key={cap.quarter}
                                className="border-t border-border hover:bg-muted/30 cursor-pointer group/row transition-colors"
                                onClick={() => handleViewImage(cap.imageId, cap, phase, compound)}>
                                <td className="px-3 py-2 font-medium">{cap.quarter}</td>
                                <td className="px-3 py-2">
                                  <span className={cn("font-mono", isReal ? "text-primary" : "text-muted-foreground")}>{cap.imageId}</span>
                                  {!isReal && <span className="ml-1 text-[9px] text-muted-foreground/60">sim</span>}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums">{cap.constructionPct}%</td>
                                <td className="px-3 py-2 text-right text-green-600 font-medium">{cap.delta ? `+${cap.delta.delta}` : "—"}</td>
                                <td className="px-3 py-2">
                                  {cap.delta
                                    ? <Badge variant="outline" className={cn("text-[9px] px-1 py-0", paceColor(cap.delta.pace as PaceLabel))}>{cap.delta.pace}</Badge>
                                    : <span className="text-muted-foreground">First</span>}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{cap.delta?.primaryDriver || "—"}</td>
                                <td className="px-2 py-2"><Eye className="h-3.5 w-3.5 text-muted-foreground group-hover/row:text-foreground transition-colors" /></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Real image detail sheet (reuses same sheet as ImagesTab) ── */}
      <Sheet open={!!detailImage} onOpenChange={(o) => !o && setDetailImage(null)}>
        <SheetContent className="w-[620px] sm:max-w-[620px] flex flex-col p-0">
          {detailImage && (() => {
            const selected = detailImage
            const isPendingImg = selected.capturingStatus === "Requested" || selected.capturingStatus === "Queued"
            return (
              <>
                <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyId value={selected.id} className="font-semibold text-foreground text-[10px]" />
                    <QualityBadge quality={selected.quality} />
                    <TypeBadge type={selected.type} />
                    <CapturingStatusBadge status={selected.capturingStatus} />
                    <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-muted-foreground border-border">
                      {toQuarter(selected.capturedAt)}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <SheetTitle className="text-base font-semibold">{selected.projectName} — {selected.phaseName}</SheetTitle>
                    <CopyId value={selected.projectId} />
                  </div>
                  <p className="text-xs text-muted-foreground">{selected.developer.name} · {selected.areaName}{selected.subAreaName ? ` — ${selected.subAreaName}` : ""}</p>
                </SheetHeader>
                <div className="flex shrink-0 border-b border-border px-6">
                  {(["main","analysis"] as const).map(t => (
                    <button key={t} onClick={() => setDetailImageTab(t)}
                      className={cn("py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors",
                        detailImageTab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                      {t === "main" ? "Main Info" : "Construction Analysis"}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {detailImageTab === "analysis" && (
                    isPendingImg ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                        <Satellite className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold">No Analysis Available</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Construction analysis will be generated after capture.</p>
                      </div>
                    ) : <ConstructionAnalysisPanel image={selected} />
                  )}
                  {detailImageTab === "main" && (
                    <div className="space-y-6">
                      <ImageCard image={selected} />
                      <Separator />
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Image Details</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {[
                            { label: "Satellite",    value: <SatelliteBadge satellite={selected.satellite} /> },
                            { label: "System",       value: <SystemBadge system={selected.systemRequested} /> },
                            { label: "Quality",      value: <QualityBadge quality={selected.quality} /> },
                            { label: "GSD Range",    value: getZoomHeight(selected.satellite) },
                            { label: "Requested At", value: formatDateTime(selected.requestedAt) },
                            { label: "Captured At",  value: isPendingImg ? "—" : formatDateTime(selected.capturedAt) },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                              {typeof value === "string" ? <p className="text-sm font-medium">{value}</p> : value}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Simulated capture detail sheet ── */}
      <Sheet open={!!detailCapture} onOpenChange={(o) => !o && setDetailCapture(null)}>
        <SheetContent className="w-[580px] sm:max-w-[580px] flex flex-col p-0">
          {detailCapture && (() => {
            const { capture, phase, compound } = detailCapture
            const cats: { key: keyof typeof capture.categories; label: string }[] = [
              { key: "siteInfrastructure", label: "Site & Infrastructure" },
              { key: "structuralProgress",  label: "Structural Progress"  },
              { key: "landscaping",         label: "Landscaping"          },
              { key: "waterFeatures",       label: "Water Features"       },
            ]
            return (
              <>
                <SheetHeader className="px-6 py-4 border-b border-border shrink-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px]">{capture.imageId}</Badge>
                    <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">Simulated Data</Badge>
                    {capture.delta && (
                      <Badge variant="outline" className={cn("text-[10px]", paceColor(capture.delta.pace as PaceLabel))}>
                        {capture.delta.pace}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-base font-semibold">
                    {compound.projectName} — {phase.phaseName}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {capture.quarter} · {compound.developer.name} · {compound.areaName}
                  </p>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  {/* Placeholder image */}
                  <div className="w-full h-40 rounded-lg bg-zinc-900 flex flex-col items-center justify-center gap-2 text-center">
                    <Satellite className="h-8 w-8 text-zinc-500" />
                    <p className="text-xs text-zinc-400">Satellite image not in dataset</p>
                    <p className="text-[11px] text-zinc-600 font-mono">{capture.imageId}</p>
                  </div>

                  <Separator />

                  {/* Overall progress */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Construction Progress — {capture.quarter}</p>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold tabular-nums">{capture.constructionPct}%</span>
                      {capture.delta && (
                        <span className="text-sm text-green-600 font-semibold pb-1">+{capture.delta.delta} pts vs {capture.delta.period.split("→")[0].trim()}</span>
                      )}
                    </div>
                    <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("absolute h-full rounded-full", progressColor(capture.constructionPct))} style={{ width:`${capture.constructionPct}%` }} />
                    </div>
                  </div>

                  {/* Category bars */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">By Category</p>
                    {cats.map(({ key, label }) => {
                      const val = capture.categories[key]
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{label}</span>
                            <span className="font-semibold tabular-nums">{val}% <span className="text-muted-foreground font-normal text-[10px]">{catLabel(val)}</span></span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("absolute h-full rounded-full", val >= 80 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : val >= 20 ? "bg-amber-500" : "bg-red-400")} style={{ width:`${val}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Delta summary */}
                  {capture.delta && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Delta — {capture.delta.period}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Pts Gained</p>
                            <p className="text-base font-bold text-green-600">+{capture.delta.delta}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Per Quarter</p>
                            <p className="text-base font-bold">~{Math.round(capture.delta.velocityQtly)}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Primary Driver</p>
                            <p className="text-[11px] font-semibold">{capture.delta.primaryDriver}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

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

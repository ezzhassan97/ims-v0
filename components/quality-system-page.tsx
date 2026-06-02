"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  Filter,
  ChevronRight,
  Eye,
  RefreshCw,
  Activity,
  Zap,
  Building2,
  Hash,
  Calendar,
  MessageCircle,
  Flame,
  MoreHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
  Wifi,
  WifiOff,
  Target,
  ClipboardList,
  GitBranch,
  Layers,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Phone,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "Critical" | "High" | "Medium" | "Low"
type IssueStatus = "Open" | "In Review" | "Resolved" | "Rejected"
type RuleCategory = "Required Fields" | "Format" | "Range" | "Consistency" | "Duplicates" | "Freshness"
type TeamName = "Primary Auto" | "Primary Manual" | "E-realty" | "Dev & Projects" | "Data Coverage"
type CheckState = "pass" | "fail" | null

interface QualityIssue {
  id: string
  title: string
  description: string
  propertyId: string
  severity: Severity
  status: IssueStatus
  team: TeamName
  reporter: string
  assignedTo: string
  createdAt: string
  updatedAt: string
  ruleId?: string
  field?: string
  flaggedValue?: string
  expectedValue?: string
  comments: { author: string; text: string; at: string }[]
}

interface ValidationRule {
  id: string
  name: string
  description: string
  category: RuleCategory
  field: string
  logic: string
  active: boolean
  violationsToday: number
  violationsTotal: number
  lastTriggered: string
  severity: Severity
  autoBlock: boolean
}

interface QueueItem {
  id: string
  propertyId: string
  title: string
  team: TeamName
  entryType: "Automatic" | "Manual"
  submittedBy: string
  submittedAt: string
  priority: "Urgent" | "Normal" | "Low"
  checklistState: Record<string, CheckState>
}

interface TeamCoverageRow {
  team: TeamName
  whatsappGroup: string
  developerCount: number
  projectCount: number
  coverageScore: number
  lastSync: string
  syncStatus: "Live" | "Delayed" | "Offline"
  dailyVolume: number
  openIssues: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const issues: QualityIssue[] = [
  {
    id: "ISS-001",
    title: "Price field is zero on active listing",
    description: "Property has price = 0 EGP while availability is set to Available. This causes it to appear free on Nawy frontend.",
    propertyId: "PROP-84821",
    severity: "Critical",
    status: "Open",
    team: "Primary Auto",
    reporter: "Validation Engine",
    assignedTo: "Ahmed Kamal",
    createdAt: "2026-05-19 09:14",
    updatedAt: "2026-05-19 09:14",
    ruleId: "VR-002",
    field: "price",
    flaggedValue: "0",
    expectedValue: "> 0",
    comments: [{ author: "Ahmed Kamal", text: "Checking source sheet now.", at: "09:25" }],
  },
  {
    id: "ISS-002",
    title: "Project ID references deleted project",
    description: "Unit is linked to project PJ-1092 which was archived. The property appears under an invisible project on the platform.",
    propertyId: "PROP-77345",
    severity: "High",
    status: "In Review",
    team: "Primary Manual",
    reporter: "Nour Saleh",
    assignedTo: "Menna Farouk",
    createdAt: "2026-05-18 14:33",
    updatedAt: "2026-05-19 08:50",
    ruleId: "VR-010",
    field: "projectId",
    flaggedValue: "PJ-1092",
    expectedValue: "Active project ID",
    comments: [
      { author: "Menna Farouk", text: "Project was migrated to PJ-2034. Updating link.", at: "08:50" },
    ],
  },
  {
    id: "ISS-003",
    title: "Missing render images — unit has 0 images",
    description: "Primary listing has no images attached. Per policy, all active listings must have at least 3 render images.",
    propertyId: "PROP-91230",
    severity: "High",
    status: "Open",
    team: "Data Coverage",
    reporter: "Omar Youssef",
    assignedTo: "Unassigned",
    createdAt: "2026-05-19 07:02",
    updatedAt: "2026-05-19 07:02",
    ruleId: "VR-014",
    field: "images",
    flaggedValue: "0",
    expectedValue: ">= 3",
    comments: [],
  },
  {
    id: "ISS-004",
    title: "Delivery date is 3 years in the past",
    description: "Delivery date shows 2023-01 for a unit still listed as Under Construction. Misleads buyers on expected handover.",
    propertyId: "PROP-65401",
    severity: "High",
    status: "Resolved",
    team: "Primary Auto",
    reporter: "Validation Engine",
    assignedTo: "Rania Hassan",
    createdAt: "2026-05-17 11:10",
    updatedAt: "2026-05-18 16:40",
    ruleId: "VR-006",
    field: "deliveryDate",
    flaggedValue: "2023-01",
    expectedValue: "> today",
    comments: [
      { author: "Rania Hassan", text: "Corrected to 2027-Q1 per developer WhatsApp confirmation.", at: "16:40" },
    ],
  },
  {
    id: "ISS-005",
    title: "District and area do not match coordinates",
    description: "Property coordinates fall within New Cairo, but district is tagged as 6th of October. E-realty team flagged during map review.",
    propertyId: "PROP-50293",
    severity: "Medium",
    status: "In Review",
    team: "E-realty",
    reporter: "Khaled Nasser",
    assignedTo: "Sara Magdy",
    createdAt: "2026-05-18 09:55",
    updatedAt: "2026-05-18 13:22",
    ruleId: "VR-011",
    field: "district",
    flaggedValue: "6th of October",
    expectedValue: "New Cairo",
    comments: [{ author: "Sara Magdy", text: "Confirmed via Google Maps. Updating district.", at: "13:22" }],
  },
  {
    id: "ISS-006",
    title: "Duplicate property ID detected",
    description: "Two entries share Property ID PROP-78821. One is automatic ingestion, one manual. Causing duplicate display on website.",
    propertyId: "PROP-78821",
    severity: "Critical",
    status: "Open",
    team: "Primary Manual",
    reporter: "Validation Engine",
    assignedTo: "Mostafa Ibrahim",
    createdAt: "2026-05-19 06:30",
    updatedAt: "2026-05-19 06:30",
    ruleId: "VR-012",
    field: "propertyId",
    flaggedValue: "PROP-78821 (×2)",
    expectedValue: "Unique",
    comments: [],
  },
  {
    id: "ISS-007",
    title: "Floor plan PDF missing for 3-bed units",
    description: "Compound has 3-bed units with no floor plan attached. Data Coverage SLA requires floor plans within 48h of project creation.",
    propertyId: "PJ-3301",
    severity: "Medium",
    status: "Open",
    team: "Data Coverage",
    reporter: "Dina Rashad",
    assignedTo: "Hossam Ali",
    createdAt: "2026-05-18 15:45",
    updatedAt: "2026-05-18 15:45",
    ruleId: "VR-015",
    field: "floorPlans",
    flaggedValue: "null",
    expectedValue: "PDF attached",
    comments: [],
  },
  {
    id: "ISS-008",
    title: "Area (sqm) is 0 for 12 units in batch",
    description: "Sheet row malformed — area column had merged cells and was parsed as 0. Affects 12 units in the same upload batch.",
    propertyId: "BATCH-20240519-04",
    severity: "High",
    status: "Resolved",
    team: "Primary Auto",
    reporter: "Validation Engine",
    assignedTo: "Ahmed Kamal",
    createdAt: "2026-05-16 08:00",
    updatedAt: "2026-05-16 14:30",
    ruleId: "VR-004",
    field: "areaSqm",
    flaggedValue: "0",
    expectedValue: "20 – 1000",
    comments: [{ author: "Ahmed Kamal", text: "Sheet fixed, batch re-ingested successfully.", at: "14:30" }],
  },
  {
    id: "ISS-009",
    title: "Developer logo not uploaded — breaking card UI",
    description: "Dev & Projects team created DV-4421 (Al Burouj) without uploading a logo. The placeholder breaks the listing card layout on web.",
    propertyId: "DV-4421",
    severity: "Medium",
    status: "Open",
    team: "Dev & Projects",
    reporter: "Quality Team",
    assignedTo: "Yasmine Adel",
    createdAt: "2026-05-19 10:05",
    updatedAt: "2026-05-19 10:05",
    ruleId: "VR-013",
    field: "developerLogo",
    flaggedValue: "null",
    expectedValue: "Image URL",
    comments: [],
  },
  {
    id: "ISS-010",
    title: "Bedroom count mismatches property subtype",
    description: "Unit subtype is Studio but bedroom count is 3. Subtype-bedroom mapping rule failed.",
    propertyId: "PROP-61120",
    severity: "Medium",
    status: "Rejected",
    team: "Primary Manual",
    reporter: "Validation Engine",
    assignedTo: "Nour Saleh",
    createdAt: "2026-05-17 16:00",
    updatedAt: "2026-05-18 09:00",
    ruleId: "VR-009",
    field: "bedroomCount",
    flaggedValue: "3",
    expectedValue: "0 (Studio)",
    comments: [
      { author: "Nour Saleh", text: "Developer confirmed this is a 3-bed loft marketed as studio. Rejecting false positive.", at: "09:00" },
    ],
  },
  {
    id: "ISS-011",
    title: "Installment plan total exceeds unit price",
    description: "Payment plan totals EGP 4.2M but listed price is EGP 3.8M. Either price or payment plan data is incorrect.",
    propertyId: "PROP-83940",
    severity: "High",
    status: "Open",
    team: "Primary Manual",
    reporter: "Validation Engine",
    assignedTo: "Unassigned",
    createdAt: "2026-05-19 08:44",
    updatedAt: "2026-05-19 08:44",
    ruleId: "VR-007",
    field: "paymentPlan.total",
    flaggedValue: "4,200,000",
    expectedValue: "<= 3,800,000",
    comments: [],
  },
  {
    id: "ISS-012",
    title: "WhatsApp group linked to wrong developer",
    description: "WA group #WAG-0094 is mapped to Palm Hills but messages reference Emaar. Likely a mis-assignment during group onboarding.",
    propertyId: "WAG-0094",
    severity: "Medium",
    status: "In Review",
    team: "Dev & Projects",
    reporter: "Quality Team",
    assignedTo: "Tarek Samir",
    createdAt: "2026-05-18 11:30",
    updatedAt: "2026-05-19 09:00",
    ruleId: undefined,
    field: "whatsappGroup.developer",
    flaggedValue: "Palm Hills",
    expectedValue: "Emaar",
    comments: [{ author: "Tarek Samir", text: "Investigating with the team lead.", at: "09:00" }],
  },
]

const validationRules: ValidationRule[] = [
  {
    id: "VR-001",
    name: "Price Required",
    description: "All active listings must have a non-null price field.",
    category: "Required Fields",
    field: "price",
    logic: "price IS NOT NULL",
    active: true,
    violationsToday: 3,
    violationsTotal: 142,
    lastTriggered: "Today 09:14",
    severity: "Critical",
    autoBlock: true,
  },
  {
    id: "VR-002",
    name: "Price Non-Zero",
    description: "Price must be greater than 0 for any non-draft listing.",
    category: "Range",
    field: "price",
    logic: "price > 0",
    active: true,
    violationsToday: 1,
    violationsTotal: 88,
    lastTriggered: "Today 09:14",
    severity: "Critical",
    autoBlock: true,
  },
  {
    id: "VR-003",
    name: "Property Type Required",
    description: "propertyType must be one of the approved taxonomy values.",
    category: "Required Fields",
    field: "propertyType",
    logic: "propertyType IN (approved_types)",
    active: true,
    violationsToday: 0,
    violationsTotal: 34,
    lastTriggered: "2026-05-17",
    severity: "High",
    autoBlock: false,
  },
  {
    id: "VR-004",
    name: "Area Range Check",
    description: "Area in sqm must be between 20 and 1000. Values outside this range are likely data entry errors.",
    category: "Range",
    field: "areaSqm",
    logic: "areaSqm BETWEEN 20 AND 1000",
    active: true,
    violationsToday: 2,
    violationsTotal: 211,
    lastTriggered: "Today 08:00",
    severity: "High",
    autoBlock: false,
  },
  {
    id: "VR-005",
    name: "Finishing Type Required",
    description: "finishingType must be populated for all primary units.",
    category: "Required Fields",
    field: "finishingType",
    logic: "finishingType IS NOT NULL",
    active: true,
    violationsToday: 7,
    violationsTotal: 319,
    lastTriggered: "Today 08:55",
    severity: "Medium",
    autoBlock: false,
  },
  {
    id: "VR-006",
    name: "Delivery Date Not in Past",
    description: "deliveryDate for Under Construction units must not be a past date.",
    category: "Consistency",
    field: "deliveryDate",
    logic: "IF status='Under Construction' THEN deliveryDate >= TODAY()",
    active: true,
    violationsToday: 4,
    violationsTotal: 97,
    lastTriggered: "Today 07:30",
    severity: "High",
    autoBlock: false,
  },
  {
    id: "VR-007",
    name: "Payment Plan Total Consistency",
    description: "Sum of installments in payment plan must not exceed the listed unit price.",
    category: "Consistency",
    field: "paymentPlan.total",
    logic: "SUM(installments) <= price",
    active: true,
    violationsToday: 1,
    violationsTotal: 55,
    lastTriggered: "Today 08:44",
    severity: "High",
    autoBlock: false,
  },
  {
    id: "VR-008",
    name: "Floor Number Valid",
    description: "floorNumber must be >= 0 and <= 80. Negative or unrealistic floor numbers are rejected.",
    category: "Range",
    field: "floorNumber",
    logic: "floorNumber BETWEEN 0 AND 80",
    active: true,
    violationsToday: 0,
    violationsTotal: 18,
    lastTriggered: "2026-05-15",
    severity: "Medium",
    autoBlock: false,
  },
  {
    id: "VR-009",
    name: "Bedroom–Subtype Mapping",
    description: "Bedroom count must align with property subtype. Studios must have 0 bedrooms, etc.",
    category: "Consistency",
    field: "bedroomCount",
    logic: "bedroomCount MATCHES subtype_bedroom_map[propertySubType]",
    active: true,
    violationsToday: 1,
    violationsTotal: 73,
    lastTriggered: "Today 07:00",
    severity: "Medium",
    autoBlock: false,
  },
  {
    id: "VR-010",
    name: "Project ID Must Exist",
    description: "projectId must reference an active, non-archived project in the system.",
    category: "Consistency",
    field: "projectId",
    logic: "projectId IN (SELECT id FROM projects WHERE archived=false)",
    active: true,
    violationsToday: 1,
    violationsTotal: 29,
    lastTriggered: "2026-05-18 14:33",
    severity: "High",
    autoBlock: true,
  },
  {
    id: "VR-011",
    name: "District–Coordinates Match",
    description: "Assigned district must match the district polygon that contains the unit's GPS coordinates.",
    category: "Consistency",
    field: "district",
    logic: "district = geo_lookup(lat, lng).district",
    active: true,
    violationsToday: 1,
    violationsTotal: 44,
    lastTriggered: "2026-05-18 09:55",
    severity: "Medium",
    autoBlock: false,
  },
  {
    id: "VR-012",
    name: "No Duplicate Property IDs",
    description: "Property IDs must be globally unique across all ingestion sources.",
    category: "Duplicates",
    field: "propertyId",
    logic: "COUNT(*) WHERE propertyId = x <= 1",
    active: true,
    violationsToday: 1,
    violationsTotal: 16,
    lastTriggered: "Today 06:30",
    severity: "Critical",
    autoBlock: true,
  },
  {
    id: "VR-013",
    name: "Developer Logo Required",
    description: "Every active developer profile must have a logo image URL.",
    category: "Required Fields",
    field: "developerLogo",
    logic: "logoUrl IS NOT NULL AND logoUrl != ''",
    active: true,
    violationsToday: 1,
    violationsTotal: 22,
    lastTriggered: "Today 10:05",
    severity: "Medium",
    autoBlock: false,
  },
  {
    id: "VR-014",
    name: "Minimum Image Count",
    description: "Active listings must have at least 3 images. Zero-image listings are blocked from publishing.",
    category: "Required Fields",
    field: "images",
    logic: "COUNT(images) >= 3",
    active: true,
    violationsToday: 5,
    violationsTotal: 188,
    lastTriggered: "Today 07:02",
    severity: "High",
    autoBlock: true,
  },
  {
    id: "VR-015",
    name: "Floor Plan Coverage",
    description: "Each project must have at least one floor plan per unit type within 48h of creation.",
    category: "Freshness",
    field: "floorPlans",
    logic: "FOREACH unitType: COUNT(floorPlans WHERE unitType=x) >= 1 WITHIN 48h",
    active: false,
    violationsToday: 1,
    violationsTotal: 67,
    lastTriggered: "2026-05-18 15:45",
    severity: "Medium",
    autoBlock: false,
  },
]

const teamChecklists: Record<TeamName, { id: string; label: string }[]> = {
  "Primary Auto": [
    { id: "pa-1", label: "Unit ID matches source sheet" },
    { id: "pa-2", label: "Price is non-zero and within valid range" },
    { id: "pa-3", label: "Property type is set correctly" },
    { id: "pa-4", label: "Finishing type is populated" },
    { id: "pa-5", label: "Area (sqm) is between 20 and 1000" },
    { id: "pa-6", label: "Delivery date is not in the past" },
    { id: "pa-7", label: "Project ID exists and is active" },
    { id: "pa-8", label: "Developer ID exists in system" },
    { id: "pa-9", label: "Floor number is valid (0–80)" },
    { id: "pa-10", label: "Bedroom count matches property subtype" },
    { id: "pa-11", label: "Sale type is set correctly" },
    { id: "pa-12", label: "Availability status is accurate" },
    { id: "pa-13", label: "No duplicate property ID detected" },
    { id: "pa-14", label: "At least 3 images attached" },
  ],
  "Primary Manual": [
    { id: "pm-1", label: "Unit code matches developer format" },
    { id: "pm-2", label: "Price per sqm is within reasonable range" },
    { id: "pm-3", label: "Floor plan is attached" },
    { id: "pm-4", label: "Payment plan is valid and complete" },
    { id: "pm-5", label: "Down payment % is correct" },
    { id: "pm-6", label: "Installment period is valid" },
    { id: "pm-7", label: "Property category is correctly set" },
    { id: "pm-8", label: "District is correctly assigned" },
    { id: "pm-9", label: "Area name is correctly assigned" },
    { id: "pm-10", label: "Compound name matches project" },
    { id: "pm-11", label: "Listing status is appropriate" },
    { id: "pm-12", label: "Contact info is present" },
    { id: "pm-13", label: "Agent notes are clear and complete" },
    { id: "pm-14", label: "Approved by team lead" },
  ],
  "E-realty": [
    { id: "er-1", label: "Building coordinates are accurate" },
    { id: "er-2", label: "Masterplan boundaries are correct" },
    { id: "er-3", label: "Area polygon is complete and closed" },
    { id: "er-4", label: "Building is linked to correct project" },
    { id: "er-5", label: "Floor count is accurate" },
    { id: "er-6", label: "Amenities are correctly tagged" },
    { id: "er-7", label: "Street view is available" },
    { id: "er-8", label: "Map pin is within compound boundary" },
  ],
  "Dev & Projects": [
    { id: "dp-1", label: "Developer name matches legal name" },
    { id: "dp-2", label: "Developer logo is uploaded" },
    { id: "dp-3", label: "Project name is finalized" },
    { id: "dp-4", label: "Project description is complete" },
    { id: "dp-5", label: "Launch date is confirmed" },
    { id: "dp-6", label: "Delivery date matches developer statement" },
    { id: "dp-7", label: "Handover status is up to date" },
    { id: "dp-8", label: "Project location pin is set" },
    { id: "dp-9", label: "Phase information is complete" },
    { id: "dp-10", label: "Project team is assigned in system" },
  ],
  "Data Coverage": [
    { id: "dc-1", label: "Brochure is uploaded and current (< 6 months)" },
    { id: "dc-2", label: "Floor plans cover all unit types" },
    { id: "dc-3", label: "Masterplan is uploaded" },
    { id: "dc-4", label: "Render images available (>= 5)" },
    { id: "dc-5", label: "Payment plan PDF is attached" },
    { id: "dc-6", label: "Project video is linked" },
    { id: "dc-7", label: "Construction update is recent (< 30 days)" },
    { id: "dc-8", label: "WhatsApp group is active and linked" },
  ],
}

const queueItems: QueueItem[] = [
  {
    id: "QI-001",
    propertyId: "PROP-94210",
    title: "Nile Business City – Studio 2F",
    team: "Primary Auto",
    entryType: "Automatic",
    submittedBy: "Auto-Ingest",
    submittedAt: "Today 08:30",
    priority: "Urgent",
    checklistState: {},
  },
  {
    id: "QI-002",
    propertyId: "PROP-94211",
    title: "Nile Business City – 1BR 3F",
    team: "Primary Auto",
    entryType: "Automatic",
    submittedBy: "Auto-Ingest",
    submittedAt: "Today 08:30",
    priority: "Normal",
    checklistState: {},
  },
  {
    id: "QI-003",
    propertyId: "PROP-84500",
    title: "Palm Hills October – Villa 4BR",
    team: "Primary Manual",
    entryType: "Manual",
    submittedBy: "Nour Saleh",
    submittedAt: "Today 09:10",
    priority: "Normal",
    checklistState: {},
  },
  {
    id: "QI-004",
    propertyId: "PJ-3301",
    title: "Marassi Residences Phase 3",
    team: "Dev & Projects",
    entryType: "Manual",
    submittedBy: "Yasmine Adel",
    submittedAt: "Today 07:55",
    priority: "Urgent",
    checklistState: {},
  },
  {
    id: "QI-005",
    propertyId: "AREA-NC-04",
    title: "New Cairo – Area 11 Polygon Update",
    team: "E-realty",
    entryType: "Manual",
    submittedBy: "Khaled Nasser",
    submittedAt: "Yesterday 16:00",
    priority: "Low",
    checklistState: {},
  },
  {
    id: "QI-006",
    propertyId: "PJ-4012",
    title: "Hyde Park Estate – Data Coverage",
    team: "Data Coverage",
    entryType: "Manual",
    submittedBy: "Dina Rashad",
    submittedAt: "Today 06:45",
    priority: "Normal",
    checklistState: {},
  },
  {
    id: "QI-007",
    propertyId: "PROP-71400",
    title: "Sodic East – 2BR Unit 12C",
    team: "Primary Manual",
    entryType: "Manual",
    submittedBy: "Menna Farouk",
    submittedAt: "Today 09:55",
    priority: "Normal",
    checklistState: {},
  },
]

const teamCoverageRows: TeamCoverageRow[] = [
  {
    team: "Primary Auto",
    whatsappGroup: "WAG-0012 · 0034 · 0056",
    developerCount: 28,
    projectCount: 94,
    coverageScore: 91,
    lastSync: "Today 09:00",
    syncStatus: "Live",
    dailyVolume: 12400,
    openIssues: 5,
  },
  {
    team: "Primary Manual",
    whatsappGroup: "WAG-0071 · 0082 · 0091",
    developerCount: 15,
    projectCount: 42,
    coverageScore: 83,
    lastSync: "Today 09:15",
    syncStatus: "Live",
    dailyVolume: 4200,
    openIssues: 4,
  },
  {
    team: "E-realty",
    whatsappGroup: "WAG-0020 · 0021",
    developerCount: 11,
    projectCount: 33,
    coverageScore: 76,
    lastSync: "Today 08:45",
    syncStatus: "Live",
    dailyVolume: 320,
    openIssues: 2,
  },
  {
    team: "Dev & Projects",
    whatsappGroup: "WAG-0101 · 0102 · 0103 · 0104",
    developerCount: 40,
    projectCount: 120,
    coverageScore: 88,
    lastSync: "Today 08:00",
    syncStatus: "Delayed",
    dailyVolume: 890,
    openIssues: 3,
  },
  {
    team: "Data Coverage",
    whatsappGroup: "WAG-0055 · 0066",
    developerCount: 22,
    projectCount: 67,
    coverageScore: 64,
    lastSync: "Yesterday 22:00",
    syncStatus: "Delayed",
    dailyVolume: 210,
    openIssues: 2,
  },
]

// ─── Helper Components ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      className={cn(
        "text-[11px] font-medium",
        severity === "Critical" && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
        severity === "High" && "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
        severity === "Medium" && "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
        severity === "Low" && "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
      )}
      variant="outline"
    >
      {severity === "Critical" && <Flame className="h-2.5 w-2.5 mr-1" />}
      {severity === "High" && <AlertCircle className="h-2.5 w-2.5 mr-1" />}
      {severity === "Medium" && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
      {severity}
    </Badge>
  )
}

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge
      className={cn(
        "text-[11px] font-medium",
        status === "Open" && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
        status === "In Review" && "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
        status === "Resolved" && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
        status === "Rejected" && "bg-muted text-muted-foreground",
      )}
      variant="outline"
    >
      {status === "Open" && <XCircle className="h-2.5 w-2.5 mr-1" />}
      {status === "In Review" && <Clock className="h-2.5 w-2.5 mr-1" />}
      {status === "Resolved" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
      {status}
    </Badge>
  )
}

function TeamBadge({ team }: { team: TeamName }) {
  const colors: Record<TeamName, string> = {
    "Primary Auto": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
    "Primary Manual": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400",
    "E-realty": "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
    "Dev & Projects": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
    "Data Coverage": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  }
  return (
    <Badge className={cn("text-[11px] font-medium", colors[team])} variant="outline">
      {team}
    </Badge>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <Progress
        value={score}
        className={cn(
          "h-1.5 w-20",
          score >= 85 ? "[&>div]:bg-green-500" : score >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500",
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          score >= 85 ? "text-green-600" : score >= 70 ? "text-yellow-600" : "text-red-600",
        )}
      >
        {score}%
      </span>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const openIssues = issues.filter((i) => i.status === "Open").length
  const criticalIssues = issues.filter((i) => i.severity === "Critical" && i.status === "Open").length
  const autoBlockFails = validationRules.filter((r) => r.autoBlock && r.violationsToday > 0).reduce((s, r) => s + r.violationsToday, 0)
  const healthScore = Math.round(
    100 - (openIssues * 3 + criticalIssues * 7 + autoBlockFails * 5),
  )
  const clampedHealth = Math.max(0, Math.min(100, healthScore))

  const recentIssues = [...issues]
    .filter((i) => i.status !== "Resolved" && i.status !== "Rejected")
    .slice(0, 5)

  const topRules = [...validationRules]
    .filter((r) => r.active)
    .sort((a, b) => b.violationsToday - a.violationsToday)
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Open Issues</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-foreground">{openIssues}</div>
            <div className="text-xs text-muted-foreground mt-1">across all teams</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Critical</span>
              <Flame className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">{criticalIssues}</div>
            <div className="text-xs text-muted-foreground mt-1">require immediate action</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Auto-Blocks Today</span>
              <ShieldAlert className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{autoBlockFails}</div>
            <div className="text-xs text-muted-foreground mt-1">entries blocked by rules</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Data Health</span>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <div className={cn("text-3xl font-bold", clampedHealth >= 80 ? "text-green-600" : clampedHealth >= 60 ? "text-yellow-600" : "text-red-600")}>
              {clampedHealth}%
            </div>
            <Progress value={clampedHealth} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Team Health Grid */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Team Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamCoverageRows.map((row) => {
              const teamOpenIssues = issues.filter(
                (i) => i.team === row.team && (i.status === "Open" || i.status === "In Review"),
              ).length
              return (
                <div key={row.team} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TeamBadge team={row.team} />
                      {row.syncStatus === "Live" ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <Wifi className="h-2.5 w-2.5" />Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-yellow-600">
                          <WifiOff className="h-2.5 w-2.5" />Delayed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{row.developerCount} developers</span>
                      <span>{row.projectCount} projects</span>
                      <span>{row.dailyVolume.toLocaleString()} updates/day</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={cn("text-xs font-medium", teamOpenIssues > 0 ? "text-red-600" : "text-muted-foreground")}>
                        {teamOpenIssues} active issues
                      </div>
                    </div>
                    <ScoreBar score={row.coverageScore} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Top Failing Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Failing Rules Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRules.map((rule, i) => (
              <div key={rule.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground font-mono mt-0.5 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{rule.name}</div>
                  <div className="text-[10px] text-muted-foreground">{rule.field}</div>
                </div>
                <div className="text-right">
                  <div className={cn("text-sm font-bold tabular-nums", rule.violationsToday > 3 ? "text-red-600" : "text-orange-600")}>
                    {rule.violationsToday}
                  </div>
                  <div className="text-[10px] text-muted-foreground">fails</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Active Issues</CardTitle>
            <span className="text-xs text-muted-foreground">{recentIssues.length} items</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentIssues.map((issue) => (
            <div key={issue.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <span className="text-[10px] font-mono text-muted-foreground w-16 flex-shrink-0">{issue.id}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{issue.title}</div>
                <div className="text-xs text-muted-foreground">{issue.propertyId} · {issue.reporter} · {issue.createdAt}</div>
              </div>
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={issue.status} />
              <TeamBadge team={issue.team} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Issue Tracker Tab ────────────────────────────────────────────────────────

function IssueTrackerTab() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [teamFilter, setTeamFilter] = useState<string>("all")
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null)
  const [issueList, setIssueList] = useState(issues)
  const [showCreate, setShowCreate] = useState(false)
  const [newComment, setNewComment] = useState("")

  const filtered = useMemo(() => {
    return issueList.filter((i) => {
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.id.toLowerCase().includes(search.toLowerCase()) && !i.propertyId.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== "all" && i.status !== statusFilter) return false
      if (severityFilter !== "all" && i.severity !== severityFilter) return false
      if (teamFilter !== "all" && i.team !== teamFilter) return false
      return true
    })
  }, [issueList, search, statusFilter, severityFilter, teamFilter])

  const handleStatusChange = (issueId: string, newStatus: IssueStatus) => {
    setIssueList((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus, updatedAt: "Just now" } : i)),
    )
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => prev ? { ...prev, status: newStatus } : null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by title, ID, property..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="Primary Auto">Primary Auto</SelectItem>
            <SelectItem value="Primary Manual">Primary Manual</SelectItem>
            <SelectItem value="E-realty">E-realty</SelectItem>
            <SelectItem value="Dev & Projects">Dev & Projects</SelectItem>
            <SelectItem value="Data Coverage">Data Coverage</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Issue
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 px-6 py-2 border-b border-border bg-muted/20 text-xs text-muted-foreground">
        <span><span className="font-semibold text-red-600">{issueList.filter((i) => i.status === "Open").length}</span> Open</span>
        <span><span className="font-semibold text-blue-600">{issueList.filter((i) => i.status === "In Review").length}</span> In Review</span>
        <span><span className="font-semibold text-green-600">{issueList.filter((i) => i.status === "Resolved").length}</span> Resolved</span>
        <span><span className="font-semibold text-muted-foreground">{issueList.filter((i) => i.status === "Rejected").length}</span> Rejected</span>
        <Separator orientation="vertical" className="h-4" />
        <span>{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground w-20">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Property</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">Severity</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-36">Team</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Assigned</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-36">Created</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedIssue(issue)}
              >
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{issue.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground truncate max-w-xs">{issue.title}</div>
                  {issue.ruleId && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Rule: {issue.ruleId} · {issue.field}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{issue.propertyId}</td>
                <td className="px-4 py-3"><SeverityBadge severity={issue.severity} /></td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="px-4 py-3"><TeamBadge team={issue.team} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{issue.assignedTo}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{issue.createdAt}</td>
                <td className="px-4 py-3">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            No issues match the current filters.
          </div>
        )}
      </div>

      {/* Issue Detail Sheet */}
      <Sheet open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selectedIssue && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{selectedIssue.id}</span>
                  <SeverityBadge severity={selectedIssue.severity} />
                  <StatusBadge status={selectedIssue.status} />
                </div>
                <SheetTitle className="text-base leading-snug">{selectedIssue.title}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Property / Entity</div>
                    <div className="font-mono text-xs font-medium">{selectedIssue.propertyId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Team</div>
                    <TeamBadge team={selectedIssue.team} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Reporter</div>
                    <div className="text-sm">{selectedIssue.reporter}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Assigned To</div>
                    <div className="text-sm">{selectedIssue.assignedTo}</div>
                  </div>
                  {selectedIssue.field && (
                    <>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Field</div>
                        <div className="font-mono text-xs">{selectedIssue.field}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Rule</div>
                        <div className="font-mono text-xs">{selectedIssue.ruleId ?? "Manual"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Flagged Value</div>
                        <div className="font-mono text-xs text-red-600">{selectedIssue.flaggedValue}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Expected</div>
                        <div className="font-mono text-xs text-green-600">{selectedIssue.expectedValue}</div>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Description</div>
                  <p className="text-sm text-foreground leading-relaxed">{selectedIssue.description}</p>
                </div>

                <Separator />

                {/* Status actions */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Update Status</div>
                  <div className="flex gap-2 flex-wrap">
                    {(["Open", "In Review", "Resolved", "Rejected"] as IssueStatus[]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selectedIssue.status === s ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => handleStatusChange(selectedIssue.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Comments ({selectedIssue.comments.length})
                  </div>
                  <div className="space-y-3">
                    {selectedIssue.comments.map((c, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{c.author}</span>
                          <span className="text-[10px] text-muted-foreground">{c.at}</span>
                        </div>
                        <p className="text-sm text-foreground">{c.text}</p>
                      </div>
                    ))}
                    {selectedIssue.comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No comments yet.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      className="h-8 text-sm flex-1"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={!newComment.trim()}
                      onClick={() => {
                        if (!newComment.trim()) return
                        const comment = { author: "You", text: newComment, at: "Just now" }
                        setIssueList((prev) =>
                          prev.map((i) =>
                            i.id === selectedIssue.id
                              ? { ...i, comments: [...i.comments, comment] }
                              : i,
                          ),
                        )
                        setSelectedIssue((prev) =>
                          prev ? { ...prev, comments: [...prev.comments, comment] } : null,
                        )
                        setNewComment("")
                      }}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Issue Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report New Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input placeholder="Brief description of the data issue" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Property / Entity ID</Label>
                <Input placeholder="PROP-xxxxx" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Affected Field</Label>
                <Input placeholder="e.g. price, deliveryDate" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Severity</Label>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Team</Label>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary Auto">Primary Auto</SelectItem>
                    <SelectItem value="Primary Manual">Primary Manual</SelectItem>
                    <SelectItem value="E-realty">E-realty</SelectItem>
                    <SelectItem value="Dev & Projects">Dev & Projects</SelectItem>
                    <SelectItem value="Data Coverage">Data Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Describe the issue in detail..." className="text-sm min-h-24 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setShowCreate(false)}>Submit Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Validation Rules Tab ─────────────────────────────────────────────────────

const RULE_CATEGORIES: { label: string; value: RuleCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Required Fields", value: "Required Fields" },
  { label: "Format", value: "Format" },
  { label: "Range", value: "Range" },
  { label: "Consistency", value: "Consistency" },
  { label: "Duplicates", value: "Duplicates" },
  { label: "Freshness", value: "Freshness" },
]

function ValidationRulesTab() {
  const [category, setCategory] = useState<RuleCategory | "all">("all")
  const [search, setSearch] = useState("")
  const [rules, setRules] = useState(validationRules)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (category !== "all" && r.category !== category) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.field.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [rules, category, search])

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            className="pl-8 h-8 w-56 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-green-600 font-semibold">{rules.filter((r) => r.active).length}</span> active
          <span className="mx-1">·</span>
          <span className="text-muted-foreground">{rules.filter((r) => !r.active).length}</span> inactive
        </div>
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Rule
        </Button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
        {RULE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              category === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rules list */}
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {filtered.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              rule.active ? "border-border bg-card" : "border-border/50 bg-muted/10 opacity-60",
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{rule.id}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{rule.category}</Badge>
                  <SeverityBadge severity={rule.severity} />
                  {rule.autoBlock && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200" variant="outline">
                      <ShieldAlert className="h-2.5 w-2.5 mr-1" />Auto-Block
                    </Badge>
                  )}
                </div>
                <div className="font-medium text-sm text-foreground mb-0.5">{rule.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{rule.description}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Logic:</span>
                  <code className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">{rule.logic}</code>
                </div>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <div className={cn("text-lg font-bold tabular-nums", rule.violationsToday > 0 ? "text-red-600" : "text-muted-foreground")}>
                    {rule.violationsToday}
                  </div>
                  <div className="text-[10px] text-muted-foreground">today</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-muted-foreground">{rule.violationsTotal}</div>
                  <div className="text-[10px] text-muted-foreground">all time</div>
                </div>
                <div className="text-right min-w-24">
                  <div className="text-[10px] text-muted-foreground">Last triggered</div>
                  <div className="text-xs">{rule.lastTriggered}</div>
                </div>
                <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            No rules match the current filter.
          </div>
        )}
      </div>

      {/* Create Rule Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Validation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Rule Name</Label>
              <Input placeholder="e.g. Price Non-Zero" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {RULE_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Severity</Label>
                <Select>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Field</Label>
              <Input placeholder="e.g. price, deliveryDate" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logic Expression</Label>
              <Input placeholder="e.g. price > 0" className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Explain what this rule validates and why..." className="text-sm min-h-20 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="autoblock" />
              <Label htmlFor="autoblock" className="text-xs cursor-pointer">Auto-block entries that fail this rule</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setShowCreate(false)}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Review Queues Tab ────────────────────────────────────────────────────────

type ChecklistRecord = Record<string, Record<string, CheckState>>

function ReviewQueuesTab() {
  const [activeTeam, setActiveTeam] = useState<TeamName>("Primary Auto")
  const [checkStates, setCheckStates] = useState<ChecklistRecord>({})

  const teamItems = queueItems.filter((item) => item.team === activeTeam)
  const [expandedItem, setExpandedItem] = useState<string | null>(teamItems[0]?.id ?? null)

  const getCheck = (itemId: string, checkId: string): CheckState => {
    return checkStates[itemId]?.[checkId] ?? null
  }

  const cycleCheck = (itemId: string, checkId: string) => {
    const current = getCheck(itemId, checkId)
    const next: CheckState = current === null ? "pass" : current === "pass" ? "fail" : null
    setCheckStates((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [checkId]: next },
    }))
  }

  const getItemProgress = (itemId: string) => {
    const checklist = teamChecklists[activeTeam]
    const passed = checklist.filter((c) => getCheck(itemId, c.id) === "pass").length
    const failed = checklist.filter((c) => getCheck(itemId, c.id) === "fail").length
    return { passed, failed, total: checklist.length }
  }

  const teams: TeamName[] = ["Primary Auto", "Primary Manual", "E-realty", "Dev & Projects", "Data Coverage"]

  return (
    <div className="flex flex-col h-full">
      {/* Team tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border">
        {teams.map((team) => {
          const count = queueItems.filter((i) => i.team === team).length
          return (
            <button
              key={team}
              onClick={() => {
                setActiveTeam(team)
                setExpandedItem(queueItems.find((i) => i.team === team)?.id ?? null)
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTeam === team
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {team}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0 text-[10px]", activeTeam === team ? "bg-primary-foreground/20" : "bg-muted-foreground/20")}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-3">
        {teamItems.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            No items in queue for this team.
          </div>
        )}

        {teamItems.map((item) => {
          const isExpanded = expandedItem === item.id
          const { passed, failed, total } = getItemProgress(item.id)
          const checklist = teamChecklists[activeTeam]
          const allDone = passed + failed === total

          return (
            <div key={item.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Item header */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{item.id}</span>
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5",
                        item.priority === "Urgent" ? "bg-red-100 text-red-700 border-red-200" : item.priority === "Normal" ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground",
                      )}
                      variant="outline"
                    >
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {item.entryType}
                    </Badge>
                  </div>
                  <div className="font-medium text-sm text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.propertyId} · by {item.submittedBy} · {item.submittedAt}</div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-semibold">{passed}</span>
                      {" / "}
                      <span className="text-red-600 font-semibold">{failed}</span>
                      {" / "}
                      <span>{total}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">pass / fail / total</div>
                  </div>
                  <Progress
                    value={(passed / total) * 100}
                    className={cn("h-1.5 w-20", failed > 0 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
                  />
                  {isExpanded ? <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded checklist */}
              {isExpanded && (
                <div className="border-t border-border">
                  <div className="px-4 py-3 space-y-1.5">
                    {checklist.map((check) => {
                      const state = getCheck(item.id, check.id)
                      return (
                        <div
                          key={check.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                            state === "pass" ? "bg-green-50 dark:bg-green-900/20" : state === "fail" ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-muted/30",
                          )}
                          onClick={() => cycleCheck(item.id, check.id)}
                        >
                          {state === null && <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          {state === "pass" && <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0" />}
                          {state === "fail" && <MinusSquare className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          <span
                            className={cn(
                              "text-sm",
                              state === "pass" ? "text-green-700 dark:text-green-400" : state === "fail" ? "text-red-700 dark:text-red-400 line-through" : "text-foreground",
                            )}
                          >
                            {check.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/10">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={!allDone || failed > 0}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                      disabled={failed === 0}
                    >
                      <Flag className="h-3 w-3 mr-1.5" />
                      Flag Issues
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <ThumbsDown className="h-3 w-3 mr-1.5" />
                      Reject
                    </Button>
                    <div className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">Click items to toggle pass / fail / unset</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Team Coverage Tab ────────────────────────────────────────────────────────

function TeamCoverageTab() {
  const [search, setSearch] = useState("")

  const filtered = teamCoverageRows.filter((r) =>
    !search || r.team.toLowerCase().includes(search.toLowerCase()) || r.whatsappGroup.toLowerCase().includes(search.toLowerCase()),
  )

  const totalDailyVolume = teamCoverageRows.reduce((s, r) => s + r.dailyVolume, 0)
  const avgCoverage = Math.round(teamCoverageRows.reduce((s, r) => s + r.coverageScore, 0) / teamCoverageRows.length)

  return (
    <div className="flex flex-col h-full">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Total Teams</div>
          <div className="text-2xl font-bold">{teamCoverageRows.length}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Daily Volume</div>
          <div className="text-2xl font-bold">{totalDailyVolume.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Avg Coverage Score</div>
          <div className={cn("text-2xl font-bold", avgCoverage >= 80 ? "text-green-600" : "text-yellow-600")}>{avgCoverage}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Live Syncs</div>
          <div className="text-2xl font-bold text-green-600">{teamCoverageRows.filter((r) => r.syncStatus === "Live").length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            className="pl-8 h-8 w-56 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Sync All
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Team</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">WhatsApp Groups</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">Developers</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">Projects</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Coverage Score</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Daily Volume</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">Open Issues</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">Last Sync</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.team} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <TeamBadge team={row.team} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground">{row.whatsappGroup}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{row.developerCount}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{row.projectCount}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ScoreBar score={row.coverageScore} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{row.dailyVolume.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={cn("text-sm font-semibold", row.openIssues > 0 ? "text-red-600" : "text-muted-foreground")}>
                    {row.openIssues}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{row.lastSync}</td>
                <td className="px-4 py-4">
                  {row.syncStatus === "Live" ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Wifi className="h-3 w-3" />Live
                    </span>
                  ) : row.syncStatus === "Delayed" ? (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                      <WifiOff className="h-3 w-3" />Delayed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <WifiOff className="h-3 w-3" />Offline
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WhatsApp channel breakdown */}
      <div className="border-t border-border px-6 py-4 bg-muted/10">
        <div className="text-xs font-semibold text-muted-foreground mb-3">WhatsApp Channel Overview</div>
        <div className="grid grid-cols-5 gap-3">
          {teamCoverageRows.map((row) => (
            <div key={row.team} className="rounded-lg border border-border bg-card p-3">
              <TeamBadge team={row.team} />
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Groups</span>
                  <span className="font-mono">{row.whatsappGroup.split("·").length}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Volume/day</span>
                  <span className="font-mono">{row.dailyVolume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Score</span>
                  <span className={cn("font-mono font-semibold", row.coverageScore >= 85 ? "text-green-600" : row.coverageScore >= 70 ? "text-yellow-600" : "text-red-600")}>
                    {row.coverageScore}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function QualitySystemPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const openCount = issues.filter((i) => i.status === "Open").length
  const critCount = issues.filter((i) => i.severity === "Critical" && i.status === "Open").length
  const queueCount = queueItems.length

  return (
    <div className="flex flex-col h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Quality System</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Data quality monitoring, issue tracking, and validation enforcement across all Data Ops teams
          </p>
        </div>
        <div className="flex items-center gap-3">
          {critCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
              <Flame className="h-3 w-3 mr-1" />
              {critCount} Critical Open
            </Badge>
          )}
          <Badge className="bg-muted text-muted-foreground" variant="outline">
            <ClipboardList className="h-3 w-3 mr-1" />
            {queueCount} In Queue
          </Badge>
          <Badge className={cn("", openCount > 5 ? "bg-red-100 text-red-700 border-red-200" : "bg-muted text-muted-foreground")} variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {openCount} Open Issues
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border px-6 bg-background">
          <TabsList className="h-10 bg-transparent gap-0 p-0">
            {[
              { value: "overview", label: "Overview" },
              { value: "issues", label: "Issue Tracker" },
              { value: "rules", label: "Validation Rules" },
              { value: "queues", label: "Review Queues" },
              { value: "coverage", label: "Team Coverage" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-auto mt-0">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="issues" className="flex-1 flex flex-col min-h-0 mt-0">
          <IssueTrackerTab />
        </TabsContent>
        <TabsContent value="rules" className="flex-1 flex flex-col min-h-0 mt-0">
          <ValidationRulesTab />
        </TabsContent>
        <TabsContent value="queues" className="flex-1 flex flex-col min-h-0 mt-0">
          <ReviewQueuesTab />
        </TabsContent>
        <TabsContent value="coverage" className="flex-1 flex flex-col min-h-0 mt-0">
          <TeamCoverageTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

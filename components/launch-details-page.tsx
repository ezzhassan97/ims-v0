"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LinkedPlanCard, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDrawer } from "@/components/payment-plan-builder"
import { GroupCard, type GroupedProperty } from "@/components/grouped-properties-page"
import { AdditionalInfoTab } from "@/components/additional-info-tab"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Copy,
  Check,
  Edit,
  Save,
  Archive,
  Plus,
  Trash2,
  Link2,
  Upload,
  Eye,
  EyeOff,
  MessageSquare,
  Clock,
  User,
  FileText,
  ImageIcon,
  ChevronDown,
  Search,
  Building2,
  LayoutGrid,
  BedDouble,
  Bath,
  PaintBucket,
  Truck,
  Ruler,
  Tag,
  X,
  GripVertical,
} from "lucide-react"
import { useRef, useEffect, useCallback } from "react"

// --- Searchable Dropdown ---
interface SearchableOption {
  id: string
  label: string
}

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Search...",
}: {
  options: SearchableOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.id === value)

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      o.id.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery("") }}
        className="w-full flex items-center justify-between px-3 py-2 mt-1 text-sm border border-border rounded-md bg-background hover:bg-secondary/30 transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary/30 rounded-md outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); setQuery("") }}
                  className={`w-full flex flex-col items-start px-3 py-2 hover:bg-secondary/50 transition-colors text-left ${value === opt.id ? "bg-secondary/30" : ""}`}
                >
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{opt.id}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const mockDevelopers: SearchableOption[] = [
  { id: "DEV-001", label: "Palm Hills Developments" },
  { id: "DEV-002", label: "Emaar Misr" },
  { id: "DEV-003", label: "Sodic" },
  { id: "DEV-004", label: "Mountain View" },
  { id: "DEV-005", label: "Hyde Park Developments" },
  { id: "DEV-006", label: "Ora Developers" },
]

const mockAreas: SearchableOption[] = [
  { id: "AREA-001", label: "6th of October" },
  { id: "AREA-002", label: "New Cairo" },
  { id: "AREA-003", label: "North Coast" },
  { id: "AREA-004", label: "Sheikh Zayed" },
  { id: "AREA-005", label: "Ain Sokhna" },
  { id: "AREA-006", label: "Heliopolis" },
]

const mockProjects: SearchableOption[] = [
  { id: "PROJ-001", label: "Palm Hills October" },
  { id: "PROJ-002", label: "Westown Residences" },
  { id: "PROJ-003", label: "Cairo Festival City" },
  { id: "PROJ-004", label: "Mountain View iCity" },
  { id: "PROJ-005", label: "Hyde Park Cairo" },
  { id: "PROJ-006", label: "Zed East" },
]

interface Launch {
  id: string
  developer: {
    name: string
    logo: string
    id: string
  }
  projectNameEn: string
  phase: string
  projectLevel: "Main Compound" | "Phase"
  parentProjectId?: string
  area: string
  approvalStatus: "Pending Review" | "Approved" | "Rejected"
  ingestionStatus: "Ingested" | "Not Ingested"
  listingStatus: "Active" | "Hidden"
  launchStatus: "Upcoming" | "Active Launch" | "Finished"
  type: "Launch" | "Release"
  source: "WhatsApp" | "Manual"
  listingCompletion: number
  sentAt?: string | null
  createdAt: string
  updatedAt: string
}

interface LaunchDetailsPageProps {
  launch: Launch
  onBack: () => void
}

interface Offering {
  id: number
  offeringName: string
  isNew: boolean
  keywords: string
  propertyCategory: string
  propertyType: string
  propertySubtype: string
  developerType: string
  bedrooms: string
  bathrooms: string
  finishingType: string
  deliveryType: string
  deliveryDate: string
  grossAreaRange: string
  priceRange: string
  paymentPlansCount: number
  offersCount: number
  listed: boolean
}

const initialOfferings: Offering[] = [
  {
    id: 1,
    offeringName: "Premium Duplex",
    isNew: true,
    keywords: "luxury duplex, city view, modern design, premium finishing, gated community",
    propertyCategory: "Apartments",
    propertyType: "Apartments - Duplex",
    propertySubtype: "Apartments - Duplex",
    developerType: "--",
    bedrooms: "4",
    bathrooms: "3",
    finishingType: "Fully Finished",
    deliveryType: "Off-plan",
    deliveryDate: "Oct. 2027",
    grossAreaRange: "180 - 220 SQM",
    priceRange: "4,500,000 - 6,200,000",
    paymentPlansCount: 2,
    offersCount: 1,
    listed: true,
  },
  {
    id: 2,
    offeringName: "Garden Villa",
    isNew: false,
    keywords: "standalone villa, private garden, golf view, gated community, premium finishing",
    propertyCategory: "Villas",
    propertyType: "Villas - Standalone",
    propertySubtype: "Villas - Standalone",
    developerType: "--",
    bedrooms: "5",
    bathrooms: "4",
    finishingType: "Core & Shell",
    deliveryType: "Off-plan",
    deliveryDate: "Oct. 2028",
    grossAreaRange: "320 - 400 SQM",
    priceRange: "12,000,000 - 18,000,000",
    paymentPlansCount: 3,
    offersCount: 2,
    listed: false,
  },
  {
    id: 3,
    offeringName: "Corner Townhouse",
    isNew: false,
    keywords: "corner unit, townhouse, private entrance, modern design, spacious garden",
    propertyCategory: "Townhouses",
    propertyType: "Townhouses - Corner",
    propertySubtype: "Townhouses - Corner",
    developerType: "--",
    bedrooms: "3",
    bathrooms: "3",
    finishingType: "Semi-Finished",
    deliveryType: "Off-plan",
    deliveryDate: "Mar. 2027",
    grossAreaRange: "250 - 280 SQM",
    priceRange: "8,000,000 - 10,000,000",
    paymentPlansCount: 2,
    offersCount: 0,
    listed: false,
  },
]

// Read-only field with icon
function OfferingField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm text-foreground">{value || "--"}</p>
    </div>
  )
}

// Locked context field (developer / project / phase / location) — read-only even in edit mode
function OfferingContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  )
}

// Inline editable field with icon + validation
function OfferingEditField({
  icon: Icon, label, value, onChange, type = "text", options, error,
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  type?: "text" | "number" | "select"
  options?: string[]
  error?: string
}) {
  const bad = !!error
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {type === "select" && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`h-7 w-full rounded-md border bg-background px-2 text-sm outline-none ${bad ? "border-red-400" : "border-input"}`}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode={type === "number" ? "numeric" : undefined} className={`h-7 text-sm px-2 py-0 ${bad ? "border-red-400 focus-visible:ring-red-400/40" : ""}`} />
      )}
      {bad && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// Parse "4,500,000 - 6,200,000" or "180 - 220 SQM" → [min, max].
function parseRange(s: string): [number, number] {
  const nums = (s.match(/[\d.,]+/g) ?? []).map((x) => Number(x.replace(/,/g, ""))).filter((n) => !Number.isNaN(n))
  if (nums.length >= 2) return [nums[0], nums[1]]
  if (nums.length === 1) return [nums[0], nums[0]]
  return [0, 0]
}

// Convert a free-text delivery like "Oct. 2027" → the YYYY-MM-DD the grouped card expects.
const MONTHS3: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" }
function toISODate(s: string): string {
  const m = s.toLowerCase().match(/([a-z]{3})[a-z.]*\s*(\d{4})/)
  if (m && MONTHS3[m[1]]) return `${m[2]}-${MONTHS3[m[1]]}-01`
  const y = s.match(/\d{4}/)
  return y ? `${y[0]}-01-01` : "2027-01-01"
}

interface MediaItem {
  id: string
  url: string
  name: string
  type: "image" | "floorplan"
}

// Draggable media list
function DraggableMediaList({
  items,
  onReorder,
  onRemove,
  onAdd,
  label,
  icon: Icon,
}: {
  items: MediaItem[]
  onReorder: (items: MediaItem[]) => void
  onRemove: (id: string) => void
  onAdd: (files: FileList) => void
  label: string
  icon: React.ElementType
}) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copy = [...items]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOverItem.current, 0, dragged)
    dragItem.current = null
    dragOverItem.current = null
    onReorder(copy)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && onAdd(e.target.files)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="relative group w-14 h-14 rounded-md bg-secondary border border-border flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
          >
            {item.url.startsWith("blob:") || item.url.startsWith("/") ? (
              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Icon className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <GripVertical className="h-3.5 w-3.5 text-white" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                className="absolute top-0.5 right-0.5"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-md border border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

const mockPaymentPlans: PlanCardData[] = [
  {
    id: "PP-STD-001", name: "Standard Plan", status: "Active", hasOffer: false,
    devName: "Palm Hills", devId: "DEV-001", projName: "Palm Hills October", projId: "PRJ-1001",
    units: 0, available: 0, priceCount: 1, historicalCount: 0,
    planType: "Equal", currency: "EGP", discount: "—", validTill: "—",
    dp: "10%", duration: "8 Yrs", frequency: "Quarterly", instalPct: "—",
    createdAt: "10 Jan 2026, 09:00", updatedAt: "15 Jan 2026, 14:30",
    expanded: { isCash: false },
  },
  {
    id: "PP-PRM-002", name: "Premium Plan", status: "Active", hasOffer: true,
    devName: "Palm Hills", devId: "DEV-001", projName: "Palm Hills October", projId: "PRJ-1001",
    units: 0, available: 0, priceCount: 1, historicalCount: 0,
    planType: "Backloaded", currency: "EGP", discount: "5%", validTill: "—",
    dp: "5%", duration: "10 Yrs", frequency: "Monthly", instalPct: "—",
    createdAt: "11 Jan 2026, 10:00", updatedAt: "14 Jan 2026, 10:15",
    expanded: { isCash: false },
  },
]

const mockAuditLogs = [
  { id: 1, user: "Ahmed Hassan", action: "Updated approval status", timestamp: "2024-01-15 14:30", field: "Approval Status: Under Review → Approved" },
  { id: 2, user: "Sara Ali", action: "Added payment plan", timestamp: "2024-01-14 10:15", field: "Payment Plans" },
  { id: 3, user: "Mohamed Fathy", action: "Updated offering details", timestamp: "2024-01-13 16:45", field: "Property Offerings" },
  { id: 4, user: "System", action: "Launch created", timestamp: "2024-01-10 09:00", field: "Initial creation" },
]

const mockAttachments = [
  { id: 1, name: "Brochure.pdf", type: "PDF", status: "Active", uploadedAt: "2024-01-12" },
  { id: 2, name: "Masterplan.jpg", type: "Image", status: "Active", uploadedAt: "2024-01-12" },
  { id: 3, name: "Price List.xlsx", type: "Excel", status: "Hidden", uploadedAt: "2024-01-11" },
  { id: 4, name: "Floor Plans.pdf", type: "PDF", status: "Active", uploadedAt: "2024-01-10" },
]

export function LaunchDetailsPage({ launch, onBack }: LaunchDetailsPageProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<Launch["approvalStatus"]>(launch.approvalStatus)
  const [ingestionStatus, setIngestionStatus] = useState<Launch["ingestionStatus"]>(launch.ingestionStatus)
  const [listingStatus, setListingStatus] = useState<Launch["listingStatus"]>(launch.listingStatus)
  const [launchStatus, setLaunchStatus] = useState<Launch["launchStatus"]>(launch.launchStatus)
  const [launchType, _setLaunchTypeField] = useState<Launch["type"]>(launch.type)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  // Payment Plans tab — real plan cards + create/edit drawer
  const [plans, setPlans] = useState<PlanCardData[]>(mockPaymentPlans)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanCardData | null>(null)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [projectLevel, setProjectLevel] = useState<"Phase" | "Main Project">("Phase")
  const [selectedDeveloper, setSelectedDeveloper] = useState("DEV-001")
  const [selectedArea, setSelectedArea] = useState("AREA-001")
  const [selectedProject, setSelectedProject] = useState("PROJ-001")
  const [projectNameEn, setProjectNameEn] = useState(launch.projectNameEn)
  const [projectNameAr, setProjectNameAr] = useState("بالم هيلز أكتوبر")
  const [phaseNameEn, setPhaseNameEn] = useState("")
  const [phaseNameAr, setPhaseNameAr] = useState("")
  // Project Details extra fields
  const [projectDescription, setProjectDescription] = useState("")
  const [address, setAddress] = useState("")
  const [totalAreaAcres, setTotalAreaAcres] = useState("")
  const [totalAreaFeddans, setTotalAreaFeddans] = useState("")
  const [totalAreaSqm, setTotalAreaSqm] = useState("")
  const [totalUnitsReleased, setTotalUnitsReleased] = useState("")
  const [totalBuildingsReleased, setTotalBuildingsReleased] = useState("")

  // Launch Details fields
  const [launchFormType, setLaunchFormType] = useState<"Launch" | "Release">("Launch")
  const [eoiMode, setEoiMode] = useState<"overall" | "byType">("overall")
  const [eoiOverallAmount, setEoiOverallAmount] = useState("")
  const [eoiByType, setEoiByType] = useState<{ id: string; name: string; amount: string }[]>([
    { id: "PT-001", name: "Apartments", amount: "" },
  ])
  const [launchStartDate, setLaunchStartDate] = useState("")
  const [launchEndDate, setLaunchEndDate] = useState("")
  const [paymentMethodCheque, setPaymentMethodCheque] = useState(false)
  const [paymentMethodOnline, setPaymentMethodOnline] = useState(false)
  const [paymentMethodCash, setPaymentMethodCash] = useState(false)
  const [paymentMethodBankTransfer, setPaymentMethodBankTransfer] = useState(false)
  const [isRefundable, setIsRefundable] = useState(false)
  const [refundType, setRefundType] = useState<"full" | "partial">("full")
  const [partialRefundValue, setPartialRefundValue] = useState("")
  const [partialRefundType, setPartialRefundType] = useState<"amount" | "percentage">("percentage")
  const [taskeenDate, setTaskeenDate] = useState("")
  const [taskeenAddress, setTaskeenAddress] = useState("")

  // Incentives fields
  const [commissionType, setCommissionType] = useState<"percentage" | "amount">("percentage")
  const [commissionValue, setCommissionValue] = useState("")
  const [brokerNotes, setBrokerNotes] = useState("")
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([
    { id: "c1", name: "", phone: "" },
  ])

  const addContact = () =>
    setContacts((prev) => [...prev, { id: `c${Date.now()}`, name: "", phone: "" }])
  const removeContact = (id: string) =>
    setContacts((prev) => prev.filter((c) => c.id !== id))
  const updateContact = (id: string, field: "name" | "phone", value: string) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))

  const addEoiByType = () =>
    setEoiByType((prev) => [...prev, { id: `PT-${Date.now()}`, name: "", amount: "" }])
  const removeEoiByType = (id: string) =>
    setEoiByType((prev) => prev.filter((e) => e.id !== id))
  const updateEoiByType = (id: string, field: "name" | "amount", value: string) =>
    setEoiByType((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))

  // Offerings state
  const [offerings, setOfferings] = useState<Offering[]>(initialOfferings)
  const [editingOfferingIds, setEditingOfferingIds] = useState<Set<number>>(new Set())
  const [expandedOfferingIds, setExpandedOfferingIds] = useState<Set<number>>(new Set())
  const [deletingOfferingId, setDeletingOfferingId] = useState<number | null>(null)
  const [showAddOffering, setShowAddOffering] = useState(false)
  const [newOffering, setNewOffering] = useState<Offering>({
    id: Date.now(), offeringName: "", isNew: false, keywords: "", propertyCategory: "",
    propertyType: "", propertySubtype: "", developerType: "", bedrooms: "", bathrooms: "",
    finishingType: "", deliveryType: "Off-plan", deliveryDate: "", grossAreaRange: "",
    priceRange: "", paymentPlansCount: 0, offersCount: 0, listed: false,
  })

  // Per-offering media
  const [offeringImages, setOfferingImages] = useState<Record<number, MediaItem[]>>({
    1: [{ id: "img-1", url: "/placeholder.svg", name: "photo1.jpg", type: "image" }],
    2: [{ id: "img-2", url: "/placeholder.svg", name: "photo2.jpg", type: "image" }],
    3: [],
  })
  const [offeringFloorPlans, setOfferingFloorPlans] = useState<Record<number, MediaItem[]>>({
    1: [{ id: "fp-1", url: "/placeholder.svg", name: "plan1.jpg", type: "floorplan" }],
    2: [],
    3: [],
  })

  const toggleEditOffering = (id: number) => {
    setEditingOfferingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const updateOffering = (id: number, field: keyof Offering, value: string) => {
    setOfferings((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o))
  }

  const confirmDelete = () => {
    setOfferings((prev) => prev.filter((o) => o.id !== deletingOfferingId))
    setDeletingOfferingId(null)
  }

  // Add appends a NEW blank card already in edit state (no dialog / form).
  const addOffering = () => {
    const id = Date.now()
    setOfferings((prev) => [...prev, {
      id, offeringName: "New offering", isNew: true, keywords: "", propertyCategory: "",
      propertyType: "", propertySubtype: "", developerType: "", bedrooms: "", bathrooms: "",
      finishingType: "", deliveryType: "Off-plan", deliveryDate: "", grossAreaRange: "",
      priceRange: "", paymentPlansCount: 0, offersCount: 0, listed: false,
    }])
    setOfferingImages((prev) => ({ ...prev, [id]: [] }))
    setOfferingFloorPlans((prev) => ({ ...prev, [id]: [] }))
    setEditingOfferingIds((prev) => new Set(prev).add(id))
    setExpandedOfferingIds((prev) => new Set(prev).add(id))
  }

  const toggleExpandOffering = (id: number) =>
    setExpandedOfferingIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const setOfferingListed = (id: number, val: boolean) => {
    setOfferings((prev) => prev.map((o) => (o.id === id ? { ...o, listed: val } : o)))
    if (val) setEditingOfferingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // Map a launch offering to a GroupedProperty so it renders with the REAL grouped-property
  // card (collapsed) + AdditionalInfoTab (expanded).
  const offeringToGroup = (o: Offering): GroupedProperty => {
    const [priceMin, priceMax] = parseRange(o.priceRange)
    const [areaMin, areaMax] = parseRange(o.grossAreaRange)
    return {
      id: `LOFF-${o.id}`,
      propertyMetadataId: `PMD-${o.id}`,
      title: o.offeringName,
      description: o.keywords,
      availableUnits: o.offersCount,
      totalUnits: o.offersCount + o.paymentPlansCount,
      priceMin, priceMax, areaMin, areaMax,
      bedroom: Number(o.bedrooms) || 0,
      bathroom: Number(o.bathrooms) || 0,
      saleType: "Launch",
      entryType: "Manual",
      listingStatus: o.listed ? "Published" : "Hidden",
      saleStatus: "Available",
      propertyCategory: o.propertyCategory,
      propertyType: o.propertyType,
      propertySubType: o.propertySubtype,
      district: launch.area,
      locationArea: launch.area,
      subarea: null,
      locationId: "0000",
      source: launch.source,
      developer: { name: launch.developer.name, id: launch.developer.id, url: "#" },
      project: { name: launch.projectNameEn, id: "PRJ-LAUNCH", url: "#" },
      phase: launch.phase ? { name: launch.phase, id: "PH-LAUNCH", url: "#" } : null,
      deliveryType: o.deliveryType,
      deliveryDate: toISODate(o.deliveryDate),
      finishing: o.finishingType,
      createdAt: launch.createdAt,
      updatedAt: launch.updatedAt,
      availabilityUpdatedAt: launch.updatedAt,
      plans: o.paymentPlansCount,
      offers: o.offersCount,
      images: (offeringImages[o.id] ?? []).map((m) => m.url),
      floorPlans: (offeringFloorPlans[o.id] ?? []).map((m) => m.url),
      amenities: [],
      details: [],
    }
  }

  const addMediaFiles = (offeringId: number, type: "image" | "floorplan", files: FileList) => {
    const newItems: MediaItem[] = Array.from(files).map((f) => ({
      id: `${type}-${Date.now()}-${f.name}`,
      url: URL.createObjectURL(f),
      name: f.name,
      type,
    }))
    if (type === "image") {
      setOfferingImages((prev) => ({ ...prev, [offeringId]: [...(prev[offeringId] ?? []), ...newItems] }))
    } else {
      setOfferingFloorPlans((prev) => ({ ...prev, [offeringId]: [...(prev[offeringId] ?? []), ...newItems] }))
    }
  }

  const removeMedia = (offeringId: number, type: "image" | "floorplan", mediaId: string) => {
    if (type === "image") {
      setOfferingImages((prev) => ({ ...prev, [offeringId]: (prev[offeringId] ?? []).filter((m) => m.id !== mediaId) }))
    } else {
      setOfferingFloorPlans((prev) => ({ ...prev, [offeringId]: (prev[offeringId] ?? []).filter((m) => m.id !== mediaId) }))
    }
  }

  const copyToClipboard = (text: string, key: string = "default") => {
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getApprovalStatusBadge = (status: Launch["approvalStatus"]) => {
    const map: Record<Launch["approvalStatus"], string> = {
      "Approved": "bg-green-100 text-green-700 hover:bg-green-100",
      "Pending Review": "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      "Rejected": "bg-red-100 text-red-700 hover:bg-red-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getIngestionStatusBadge = (status: Launch["ingestionStatus"]) => {
    const map: Record<Launch["ingestionStatus"], string> = {
      "Ingested": "bg-green-100 text-green-700 hover:bg-green-100",
      "Not Ingested": "bg-gray-100 text-gray-600 hover:bg-gray-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getListingStatusBadge = (status: Launch["listingStatus"]) => {
    const map: Record<Launch["listingStatus"], string> = {
      "Active": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      "Hidden": "bg-gray-100 text-gray-600 hover:bg-gray-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getLaunchStatusBadge = (status: Launch["launchStatus"]) => {
    const map: Record<Launch["launchStatus"], string> = {
      "Active Launch": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      "Upcoming": "bg-blue-100 text-blue-700 hover:bg-blue-100",
      "Finished": "bg-purple-100 text-purple-700 hover:bg-purple-100",
    }
    return <Badge className={map[status]}>{status}</Badge>
  }

  const getTypeBadge = (t: Launch["type"]) =>
    <Badge variant="outline">{t}</Badge>

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Launches
      </Button>

      {/* Main Details Container */}
      <Card className="p-6">
        {/* Top row: identity + actions */}
        <div className="flex items-start justify-between mb-5">
          {/* Left: logo + names */}
          <div className="flex items-center gap-4">
            <img
              src={launch.developer.logo || "/placeholder.svg"}
              alt={launch.developer.name}
              className="h-16 w-16 rounded-lg object-cover bg-secondary flex-shrink-0"
            />
            <div className="space-y-0.5">
              {/* Project name */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{launch.projectNameEn}</h1>
                {/* Level tag */}
                <Badge variant={launch.projectLevel === "Phase" ? "secondary" : "outline"} className="text-xs">
                  {launch.projectLevel === "Phase" ? "Phase" : "Main Project"}
                </Badge>
              </div>
              {/* Developer name + ID */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground font-medium">{launch.developer.name}</span>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground font-mono">{launch.developer.id}</span>
                <button onClick={() => copyToClipboard(launch.developer.id, "dev")} className="p-0.5 hover:bg-secondary rounded">
                  {copiedId === "dev" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
              {/* Parent project — only if Phase */}
              {launch.projectLevel === "Phase" && launch.parentProjectId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Parent:</span>
                  <span className="text-xs text-muted-foreground">{launch.parentProjectId}</span>
                  <button onClick={() => copyToClipboard(launch.parentProjectId!, "parent")} className="p-0.5 hover:bg-secondary rounded">
                    {copiedId === "parent" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </button>
                </div>
              )}
              {/* Launch ID */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Launch ID:</span>
                <span className="text-xs text-muted-foreground font-mono">{launch.id}</span>
                <button onClick={() => copyToClipboard(launch.id, "launch")} className="p-0.5 hover:bg-secondary rounded">
                  {copiedId === "launch" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: all editable status dropdowns + type + delete */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Approval Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-8">
                  {getApprovalStatusBadge(approvalStatus)}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["Pending Review", "Approved", "Rejected"] as Launch["approvalStatus"][]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setApprovalStatus(s)}>{getApprovalStatusBadge(s)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ingestion Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-8">
                  {getIngestionStatusBadge(ingestionStatus)}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["Ingested", "Not Ingested"] as Launch["ingestionStatus"][]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setIngestionStatus(s)}>{getIngestionStatusBadge(s)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Listing Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-8">
                  {getListingStatusBadge(listingStatus)}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["Active", "Hidden"] as Launch["listingStatus"][]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setListingStatus(s)}>{getListingStatusBadge(s)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Launch Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-8">
                  {getLaunchStatusBadge(launchStatus)}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["Upcoming", "Active Launch", "Finished"] as Launch["launchStatus"][]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setLaunchStatus(s)}>{getLaunchStatusBadge(s)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Type */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-transparent h-8">
                  {getTypeBadge(launchType)}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["Launch", "Release"] as Launch["type"][]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => _setLaunchTypeField(s)}>{getTypeBadge(s)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete — red icon button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-5 gap-6 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Source</p>
            <Badge variant="outline">{launch.source}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Phase</p>
            <p className="text-sm font-medium">{launch.phase || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Area</p>
            <p className="text-sm">{launch.area}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created At</p>
            <p className="text-sm">{formatDate(launch.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Updated At</p>
            <p className="text-sm">{formatDate(launch.updatedAt)}</p>
          </div>
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Launch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{launch.id}</strong> — <strong>{launch.projectNameEn}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setDeleteConfirmOpen(false); onBack() }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabbed Container */}
      <Tabs defaultValue={launch.source === "WhatsApp" ? "whatsapp" : "project"} className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-0.5">
          {launch.source === "WhatsApp" && (
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-card">WhatsApp Messages</TabsTrigger>
          )}
          <TabsTrigger value="project" className="data-[state=active]:bg-card">Project Details</TabsTrigger>
          <TabsTrigger value="launch-info" className="data-[state=active]:bg-card">Launch Details</TabsTrigger>
          <TabsTrigger value="incentives" className="data-[state=active]:bg-card">Launch Incentives</TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-card">Payment Plans</TabsTrigger>
          <TabsTrigger value="offerings" className="data-[state=active]:bg-card">Property Offerings</TabsTrigger>
          <TabsTrigger value="attachments" className="data-[state=active]:bg-card">Attachments</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-card">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Project Details Tab */}
        <TabsContent value="project">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

              {/* Developer — searchable dropdown */}
              <div>
                <Label>Developer</Label>
                <SearchableDropdown
                  options={mockDevelopers}
                  value={selectedDeveloper}
                  onChange={setSelectedDeveloper}
                  placeholder="Select developer..."
                />
              </div>

              {/* Area — searchable dropdown */}
              <div>
                <Label>Area</Label>
                <SearchableDropdown
                  options={mockAreas}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Select area..."
                />
              </div>

              {/* Project Level */}
              <div>
                <Label>Project Level</Label>
                <Select value={projectLevel} onValueChange={(v) => setProjectLevel(v as "Phase" | "Main Project")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phase">Phase</SelectItem>
                    <SelectItem value="Main Project">Main Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer to keep grid aligned */}
              <div />

              {projectLevel === "Phase" ? (
                <>
                  <div className="col-span-2">
                    <Label>Project Name</Label>
                    <SearchableDropdown
                      options={mockProjects}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      placeholder="Select project..."
                    />
                  </div>
                  <div>
                    <Label>Phase Name (EN)</Label>
                    <Input value={phaseNameEn} onChange={(e) => setPhaseNameEn(e.target.value)} placeholder="e.g. Phase 1" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phase Name (AR)</Label>
                    <Input value={phaseNameAr} onChange={(e) => setPhaseNameAr(e.target.value)} placeholder="مثال: المرحلة الأولى" className="mt-1" dir="rtl" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Project Name (EN)</Label>
                    <Input value={projectNameEn} onChange={(e) => setProjectNameEn(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Project Name (AR)</Label>
                    <Input value={projectNameAr} onChange={(e) => setProjectNameAr(e.target.value)} className="mt-1" dir="rtl" />
                  </div>
                </>
              )}

              {/* Project Description */}
              <div className="col-span-2">
                <Label>Project Description</Label>
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the project..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full project address" className="mt-1" />
              </div>

              {/* Total Project Area */}
              <div className="col-span-2">
                <Label className="mb-2 block">Total Project Area</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Acres</p>
                    <Input value={totalAreaAcres} onChange={(e) => setTotalAreaAcres(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Feddans</p>
                    <Input value={totalAreaFeddans} onChange={(e) => setTotalAreaFeddans(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SQM</p>
                    <Input value={totalAreaSqm} onChange={(e) => setTotalAreaSqm(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Total Units Released */}
              <div>
                <Label>Total Units Released</Label>
                <Input value={totalUnitsReleased} onChange={(e) => setTotalUnitsReleased(e.target.value)} placeholder="e.g. 248" className="mt-1" type="number" />
              </div>

              {/* Total Buildings Released */}
              <div>
                <Label>Total Buildings Released</Label>
                <Input value={totalBuildingsReleased} onChange={(e) => setTotalBuildingsReleased(e.target.value)} placeholder="e.g. 12" className="mt-1" type="number" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Property Offerings Tab */}
        <TabsContent value="offerings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{offerings.length} offering{offerings.length !== 1 ? "s" : ""} · {offerings.filter((o) => o.listed).length} listed</p>
              <Button size="sm" onClick={addOffering}>
                <Plus className="h-4 w-4 mr-2" />
                Add Offering
              </Button>
            </div>

            {offerings.map((offering, i) => {
              const g = offeringToGroup(offering)
              return (
                <GroupCard
                  key={offering.id}
                  group={g}
                  globalIndex={i}
                  allRows={[]}
                  isExpanded={expandedOfferingIds.has(offering.id)}
                  onToggle={() => toggleExpandOffering(offering.id)}
                  hiddenCols={[]}
                  isSelected={false}
                  onSelect={() => {}}
                  onView={() => {}}
                  renderExpanded={<AdditionalInfoTab group={g} />}
                />
              )
            })}
          </div>

          {/* Add Offering Dialog */}
          <Dialog open={showAddOffering} onOpenChange={setShowAddOffering}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Offering</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1">
                  <Label>Offering Name</Label>
                  <Input value={newOffering.offeringName} onChange={(e) => setNewOffering((p) => ({ ...p, offeringName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Category</Label>
                  <Input value={newOffering.propertyCategory} onChange={(e) => setNewOffering((p) => ({ ...p, propertyCategory: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Type</Label>
                  <Input value={newOffering.propertyType} onChange={(e) => setNewOffering((p) => ({ ...p, propertyType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Property Sub-type</Label>
                  <Input value={newOffering.propertySubtype} onChange={(e) => setNewOffering((p) => ({ ...p, propertySubtype: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Developer Type</Label>
                  <Input value={newOffering.developerType} onChange={(e) => setNewOffering((p) => ({ ...p, developerType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Bedrooms</Label>
                  <Input value={newOffering.bedrooms} onChange={(e) => setNewOffering((p) => ({ ...p, bedrooms: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Bathrooms</Label>
                  <Input value={newOffering.bathrooms} onChange={(e) => setNewOffering((p) => ({ ...p, bathrooms: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Finishing Type</Label>
                  <Input value={newOffering.finishingType} onChange={(e) => setNewOffering((p) => ({ ...p, finishingType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Delivery Type</Label>
                  <Input value={newOffering.deliveryType} onChange={(e) => setNewOffering((p) => ({ ...p, deliveryType: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Delivery Date</Label>
                  <Input value={newOffering.deliveryDate} onChange={(e) => setNewOffering((p) => ({ ...p, deliveryDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Gross Area Range</Label>
                  <Input value={newOffering.grossAreaRange} onChange={(e) => setNewOffering((p) => ({ ...p, grossAreaRange: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Price Range</Label>
                  <Input value={newOffering.priceRange} onChange={(e) => setNewOffering((p) => ({ ...p, priceRange: e.target.value }))} />
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button variant="outline" onClick={() => setShowAddOffering(false)}>Cancel</Button>
                <Button onClick={addOffering}>Add Offering</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={deletingOfferingId !== null} onOpenChange={(o) => !o && setDeletingOfferingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Offering</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this offering? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Payment Plans Tab */}
        <TabsContent value="payment">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Payment Plans</h3>
                <p className="text-xs text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Existing Plan
                </Button>
                <Button size="sm" onClick={() => { setEditingPlan(null); setPlanDrawerOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Plan
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <LinkedPlanCard
                  key={plan.id}
                  plan={plan}
                  isExpanded={expandedPlanId === plan.id}
                  onToggleExpand={() => setExpandedPlanId((id) => (id === plan.id ? null : plan.id))}
                  totalInGroup={plans.length}
                  fullWidth
                  onView={() => { setEditingPlan(plan); setPlanDrawerOpen(true) }}
                  onRemove={() => setDeletingPlanId(plan.id)}
                />
              ))}
              {plans.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No payment plans yet — click "Create New Plan".</p>
              )}
            </div>
          </Card>

          <PaymentPlanDrawer
            open={planDrawerOpen}
            onClose={() => { setPlanDrawerOpen(false); setEditingPlan(null) }}
            title={editingPlan ? "Edit Payment Plan" : "Add Payment Plan"}
            submitLabel={editingPlan ? "Save Changes" : "Save Plan"}
            onSave={(saved) => {
              if (editingPlan) setPlans((ps) => ps.map((p) => (p.id === editingPlan.id ? { ...saved, id: p.id } : p)))
              else setPlans((ps) => [...ps, saved])
            }}
          />

          <AlertDialog open={deletingPlanId !== null} onOpenChange={(o) => !o && setDeletingPlanId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Payment Plan</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete this payment plan? This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setPlans((ps) => ps.filter((p) => p.id !== deletingPlanId)); setDeletingPlanId(null) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Launch Details Tab */}
        <TabsContent value="launch-info">
          <Card className="p-6 space-y-8">

            {/* Launch Type + Dates */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Launch Info</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Launch Type</Label>
                  <Select value={launchType} onValueChange={(v) => setLaunchType(v as "Launch" | "Release")}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Launch">Launch</SelectItem>
                      <SelectItem value="Release">Release</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Launch Start Date</Label>
                  <Input type="date" value={launchStartDate} onChange={(e) => setLaunchStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Launch End Date</Label>
                  <Input type="date" value={launchEndDate} onChange={(e) => setLaunchEndDate(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* EOI */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Expression of Interest (EOI)</h3>
              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEoiMode("overall")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${eoiMode === "overall" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    Overall EOI Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setEoiMode("byType")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${eoiMode === "byType" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                  >
                    EOI by Property Type
                  </button>
                </div>

                {eoiMode === "overall" ? (
                  <div className="max-w-xs">
                    <Label>EOI Amount (EGP)</Label>
                    <Input value={eoiOverallAmount} onChange={(e) => setEoiOverallAmount(e.target.value)} placeholder="e.g. 50,000" className="mt-1" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eoiByType.map((entry) => (
                      <div key={entry.id} className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label className="text-xs">Property Type Name</Label>
                          <Input value={entry.name} onChange={(e) => updateEoiByType(entry.id, "name", e.target.value)} placeholder="e.g. Apartments" className="mt-1 h-9" />
                        </div>
                        <div className="w-36">
                          <Label className="text-xs">EOI Amount (EGP)</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <Input value={entry.amount} onChange={(e) => updateEoiByType(entry.id, "amount", e.target.value)} placeholder="50,000" className="h-9" />
                          </div>
                        </div>
                        
                        <button type="button" onClick={() => removeEoiByType(entry.id)} className="mb-0.5 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addEoiByType} className="flex items-center gap-1 text-sm text-primary hover:opacity-80 mt-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Property Type
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* EOI Payment Methods */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">EOI Payment Methods Allowed</h3>
              <div className="flex flex-wrap gap-6">
                {[
                  { id: "cheque", label: "Cheque", value: paymentMethodCheque, setter: setPaymentMethodCheque },
                  { id: "online", label: "Online", value: paymentMethodOnline, setter: setPaymentMethodOnline },
                  { id: "cash", label: "Cash", value: paymentMethodCash, setter: setPaymentMethodCash },
                  { id: "bank", label: "Bank Transfer", value: paymentMethodBankTransfer, setter: setPaymentMethodBankTransfer },
                ].map(({ id, label, value, setter }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Switch id={id} checked={value} onCheckedChange={setter} />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Refundability */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Refundability</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch id="refundable" checked={isRefundable} onCheckedChange={setIsRefundable} />
                  <Label htmlFor="refundable">Refundable</Label>
                </div>
                {isRefundable && (
                  <div className="ml-0 pl-4 border-l-2 border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setRefundType("full")}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${refundType === "full" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                      >
                        Full Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundType("partial")}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${refundType === "partial" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary/50"}`}
                      >
                        Partial Refund
                      </button>
                    </div>
                    {refundType === "partial" && (
                      <div className="flex items-end gap-3 max-w-sm">
                        <div className="flex-1">
                          <Label className="text-xs">Partial Refund Value</Label>
                          <Input value={partialRefundValue} onChange={(e) => setPartialRefundValue(e.target.value)} placeholder="e.g. 50" className="mt-1 h-9" />
                        </div>
                        <Select value={partialRefundType} onValueChange={(v) => setPartialRefundType(v as "amount" | "percentage")}>
                          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="amount">Amount (EGP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Taskeen Info */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4">Taskeen Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taskeen Date</Label>
                  <Input type="date" value={taskeenDate} onChange={(e) => setTaskeenDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Taskeen Address</Label>
                  <Input value={taskeenAddress} onChange={(e) => setTaskeenAddress(e.target.value)} placeholder="e.g. Sales Center, 6th October" className="mt-1" />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Incentives Tab */}
        <TabsContent value="incentives">
          <Card className="p-6 space-y-8">

            {/* Brokerage / Agent Incentives */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Brokerage / Agent Incentives</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Commission</Label>
                  <div className="flex items-end gap-3 max-w-sm">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                      <Input
                        value={commissionValue}
                        onChange={(e) => setCommissionValue(e.target.value)}
                        placeholder={commissionType === "percentage" ? "e.g. 3" : "e.g. 50,000"}
                        className="h-9"
                      />
                    </div>
                    <Select value={commissionType} onValueChange={(v) => setCommissionType(v as "percentage" | "amount")}>
                      <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="amount">Amount (EGP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Additional Broker / Agent Incentive Notes</Label>
                  <Textarea
                    value={brokerNotes}
                    onChange={(e) => setBrokerNotes(e.target.value)}
                    placeholder="Any additional incentives, bonuses, or conditions for agents..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Contact Info</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-1 text-sm text-primary hover:opacity-80 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Contact
                </button>
              </div>
              <div className="space-y-3">
                {contacts.map((contact, idx) => (
                  <div key={contact.id} className="flex items-end gap-3">
                    <div className="w-6 text-xs text-muted-foreground pb-2 text-center">{idx + 1}</div>
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs mb-1 block">Name</Label>}
                      <Input
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                        placeholder="Contact name"
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs mb-1 block">Phone Number</Label>}
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                        placeholder="+20 100 000 0000"
                        className="h-9"
                        type="tel"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="pb-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No contacts added yet.</p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* WhatsApp Message Tab */}
        <TabsContent value="whatsapp">
          <Card className="p-6">
            {launch.source === "WhatsApp" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">WhatsApp Message</p>
                    <p className="text-sm text-muted-foreground">Received from group: Developer Updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Ahmed Hassan</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(launch.sentAt)}</span>
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {`New Launch Alert!

Palm Hills Development announces the launch of Palm Hills October - Phase 3

Location: 6th of October
Property Types: Apartments, Villas, Townhouses
Starting Price: 4.5M EGP
Launch Date: January 15, 2024

Payment Plans:
- 10% Down Payment
- Up to 8 Years Installments

Contact us for more details!`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Media Attachments</p>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>This launch was created manually</p>
                <p className="text-sm">No WhatsApp message associated</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card className="p-6">
            <h3 className="font-medium mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {mockAuditLogs.map((log, index) => (
                <div key={log.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {index < mockAuditLogs.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{log.user}</p>
                      <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{log.field}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Media & Documents</h3>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {mockAttachments.map((attachment) => (
                <Card key={attachment.id} className="p-3">
                  <div className="h-24 bg-secondary rounded-lg flex items-center justify-center mb-3">
                    {attachment.type === "Image" ? (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">{attachment.type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      {attachment.status === "Active" ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

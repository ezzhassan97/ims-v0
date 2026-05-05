"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Columns3,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
  Star,
  X,
  Plus,
  GripVertical,
  Lock,
  Unlock,
  Check,
  Group,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  CalendarIcon,
  ZoomIn,
  MoreHorizontal,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"

// Types
export interface DataRow {
  id: string
  avatar: {
    image: string
    title: string
    caption: string
  }
  profile: {
    image: string
    name: string
    profileId: string
  }
  progress: number
  rating: number
  status: string
  tags: string[]
  text: string
  number: number
  date: string
  timestamp: string
  checkbox: boolean
  boolean: boolean
  reference: {
    label: string
    url: string
  }
  currency: number
  email: string
  phone: string
  department: string
  priority: string
  images: string[]
  hasChildren?: boolean
  childRows?: ChildRow[]
  nestedRows?: DataRow[]
}

interface ChildRow {
  id: string
  label: string
  status: string
  priority: string
  amount: number
  date: string
  assignee: string
  progress: number
}

export interface Column {
  id: string
  label: string
  type: string
  width: number
  visible: boolean
  frozen: boolean
  fixed?: boolean // Fixed columns can't be hidden
}

interface SortConfig {
  column: string
  direction: "asc" | "desc"
}

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

interface FilterGroup {
  id: string
  connector: "AND" | "OR"
  conditions: FilterCondition[]
}

interface GridOption {
  value: string
  label?: string
}

interface AdvancedDataGridProps {
  initialData?: DataRow[]
  initialColumns?: Column[]
  quickFilterOptions?: {
    status?: string[]
    priority?: string[]
    department?: string[]
  }
  quickFilterLabels?: {
    status?: string
    priority?: string
    department?: string
  }
  groupByOptions?: GridOption[]
}

// Mock Data
const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Design", "Product"]
const statuses = ["Active", "Inactive", "Pending", "Archived", "Draft"]
const priorities = ["Critical", "High", "Medium", "Low"]
const tagOptions = ["Frontend", "Backend", "DevOps", "UI/UX", "Mobile", "Data", "Security", "QA", "PM", "Lead"]

const generateMockData = (count: number): DataRow[] => {
  const firstNames = [
    "John",
    "Jane",
    "Mike",
    "Sarah",
    "Tom",
    "Emily",
    "David",
    "Lisa",
    "James",
    "Anna",
    "Chris",
    "Maria",
    "Ahmed",
    "Fatima",
    "Omar",
    "Layla",
  ]
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Hassan",
    "Ali",
    "Mohamed",
    "Ibrahim",
  ]

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const tagCount = Math.floor(Math.random() * 4) + 1
    const selectedTags = [...tagOptions].sort(() => 0.5 - Math.random()).slice(0, tagCount)

    return {
      id: `ROW-${String(i + 1).padStart(4, "0")}`,
      avatar: {
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}${i}`,
        title: `${firstName} ${lastName}`,
        caption: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      },
      profile: {
        image: `https://api.dicebear.com/7.x/personas/svg?seed=${lastName}${firstName}${i}`,
        name: `${firstName} ${lastName}`,
        profileId: `PRF-${String(i + 1).padStart(5, "0")}`,
      },
      progress: Math.floor(Math.random() * 101),
      rating: Math.floor(Math.random() * 5) + 1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      tags: selectedTags,
      text: `Project ${String.fromCharCode(65 + (i % 26))}-${Math.floor(Math.random() * 1000)}`,
      number: Math.floor(Math.random() * 10000),
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      checkbox: Math.random() > 0.5,
      boolean: Math.random() > 0.5,
      reference: {
        label: `REF-${String(i + 1).padStart(5, "0")}`,
        url: `https://example.com/reference/${i + 1}`,
      },
      currency: Math.floor(Math.random() * 100000) + 1000,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      images: Array.from({ length: Math.floor(Math.random() * 5) }, (_, k) => `https://picsum.photos/seed/${i * 10 + k}/400/300`),
      hasChildren: i % 3 === 0 && i % 4 !== 0,
      childRows: i % 3 === 0 && i % 4 !== 0
        ? Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, j) => ({
            id: `ROW-${String(i + 1).padStart(4, "0")}-CHILD-${j + 1}`,
            label: `Sub-task ${j + 1} of ${String.fromCharCode(65 + (i % 26))}-${i + 1}`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            amount: Math.floor(Math.random() * 50000) + 500,
            date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            assignee: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            progress: Math.floor(Math.random() * 101),
          }))
        : undefined,
      nestedRows: i % 4 === 0
        ? Array.from({ length: Math.floor(Math.random() * 2) + 2 }, (_, j) => {
            const nFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
            const nLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
            const nTagCount = Math.floor(Math.random() * 3) + 1
            const nTags = [...tagOptions].sort(() => 0.5 - Math.random()).slice(0, nTagCount)
            return {
              id: `ROW-${String(i + 1).padStart(4, "0")}-N${j + 1}`,
              avatar: {
                image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nFirstName}${nLastName}nested${j}`,
                title: `${nFirstName} ${nLastName}`,
                caption: `${nFirstName.toLowerCase()}.${nLastName.toLowerCase()}@company.com`,
              },
              profile: {
                image: `https://api.dicebear.com/7.x/personas/svg?seed=${nLastName}${nFirstName}nested${j}`,
                name: `${nFirstName} ${nLastName}`,
                profileId: `PRF-N${String(i * 10 + j + 1).padStart(5, "0")}`,
              },
              progress: Math.floor(Math.random() * 101),
              rating: Math.floor(Math.random() * 5) + 1,
              status: statuses[Math.floor(Math.random() * statuses.length)],
              tags: nTags,
              text: `Sub-${String.fromCharCode(65 + (i % 26))}-${j + 1}`,
              number: Math.floor(Math.random() * 5000),
              date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              checkbox: Math.random() > 0.5,
              boolean: Math.random() > 0.5,
              reference: {
                label: `REF-N${String(i * 10 + j + 1).padStart(5, "0")}`,
                url: `https://example.com/reference/nested/${i}-${j}`,
              },
              currency: Math.floor(Math.random() * 50000) + 500,
              email: `${nFirstName.toLowerCase()}.${nLastName.toLowerCase()}@company.com`,
              phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
              department: departments[Math.floor(Math.random() * departments.length)],
              priority: priorities[Math.floor(Math.random() * priorities.length)],
              images: [],
              hasChildren: false,
            }
          })
        : undefined,
    }
  })
}

const initialColumns: Column[] = [
  { id: "select", label: "", type: "select", width: 40, visible: true, frozen: true, fixed: true },
  { id: "expand", label: "", type: "expand", width: 40, visible: true, frozen: true, fixed: true },
  { id: "id", label: "ID", type: "id", width: 110, visible: true, frozen: false },
  { id: "avatar", label: "User", type: "avatar", width: 280, visible: true, frozen: false },
  { id: "profile", label: "Profile", type: "profile", width: 260, visible: true, frozen: false },
  { id: "status", label: "Status", type: "status", width: 110, visible: true, frozen: false },
  { id: "priority", label: "Priority", type: "priority", width: 110, visible: true, frozen: false },
  { id: "progress", label: "Progress", type: "progress", width: 150, visible: true, frozen: false },
  { id: "rating", label: "Rating", type: "rating", width: 130, visible: true, frozen: false },
  { id: "tags", label: "Tags", type: "tags", width: 200, visible: true, frozen: false },
  { id: "text", label: "Project", type: "text", width: 150, visible: true, frozen: false },
  { id: "number", label: "Quantity", type: "number", width: 100, visible: true, frozen: false },
  { id: "currency", label: "Amount", type: "currency", width: 120, visible: true, frozen: false },
  { id: "date", label: "Date", type: "date", width: 120, visible: true, frozen: false },
  { id: "timestamp", label: "Last Updated", type: "timestamp", width: 180, visible: true, frozen: false },
  { id: "email", label: "Email", type: "email", width: 200, visible: true, frozen: false },
  { id: "phone", label: "Phone", type: "phone", width: 150, visible: true, frozen: false },
  { id: "department", label: "Department", type: "department", width: 130, visible: true, frozen: false },
  { id: "checkbox", label: "Verified", type: "checkbox", width: 80, visible: true, frozen: false },
  { id: "boolean", label: "Active", type: "boolean", width: 80, visible: true, frozen: false },
  { id: "reference", label: "Reference", type: "reference", width: 140, visible: true, frozen: false },
  { id: "images", label: "Images", type: "images", width: 220, visible: true, frozen: false },
  { id: "quickActions", label: "Actions", type: "quickActions", width: 120, visible: true, frozen: false, fixed: false },
  { id: "actions", label: "", type: "actions", width: 52, visible: true, frozen: true, fixed: true },
]

// Toast component for update notifications
function UpdateToast({ show, loading }: { show: boolean; loading: boolean }) {
  if (!show) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-card border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3">
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Updating record...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm">Record updated successfully</span>
        </>
      )}
    </div>
  )
}

function SortArrows({ columnId, sortConfigs }: { columnId: string; sortConfigs: SortConfig[] }) {
  const active = sortConfigs.find((s) => s.column === columnId)
  return (
    <span className="inline-flex flex-col gap-[1px] ml-0.5">
      <svg
        width="7"
        height="5"
        viewBox="0 0 7 5"
        className={cn(
          "transition-colors",
          active?.direction === "asc" ? "text-foreground" : "text-muted-foreground/30 group-hover/sort:text-muted-foreground/60",
        )}
        fill="currentColor"
      >
        <path d="M3.5 0L7 5H0L3.5 0Z" />
      </svg>
      <svg
        width="7"
        height="5"
        viewBox="0 0 7 5"
        className={cn(
          "transition-colors",
          active?.direction === "desc" ? "text-foreground" : "text-muted-foreground/30 group-hover/sort:text-muted-foreground/60",
        )}
        fill="currentColor"
      >
        <path d="M3.5 5L0 0H7L3.5 5Z" />
      </svg>
    </span>
  )
}

function ProfileCell({ row, onEdit }: { row: DataRow; onEdit: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(row.profile.profileId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-1 rounded w-full group/profile"
      onClick={onEdit}
    >
      <img
        src={row.profile.image || "/placeholder.svg"}
        alt={row.profile.name}
        className="w-8 h-8 rounded-md object-cover flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{row.profile.name}</div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground font-mono">{row.profile.profileId}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover/profile:opacity-100 transition-opacity p-0.5 hover:bg-secondary rounded flex-shrink-0"
          >
            {copied
              ? <Check className="h-2.5 w-2.5 text-emerald-500" />
              : <Copy className="h-2.5 w-2.5 text-muted-foreground" />
            }
          </button>
        </div>
      </div>
      <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover/profile:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  )
}

// ── Image Carousel (fullscreen) ──────────────────────────────────────────────
function ImageCarousel({
  images,
  startIndex,
  onClose,
  onReorder,
  onRemove,
  onAdd,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
  onReorder: (imgs: string[]) => void
  onRemove: (idx: number) => void
  onAdd: () => void
}) {
  const [current, setCurrent] = useState(startIndex)
  const [filmDrag, setFilmDrag] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const go = (dir: number) =>
    setCurrent((c) => (c + dir + images.length) % images.length)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images.length])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Main view */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <img
          src={images[current]}
          alt={`Image ${current + 1}`}
          className="max-h-[75vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
          onClick={() => go(1)}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {current + 1} / {images.length}
        </span>
      </div>

      {/* Filmstrip */}
      <div
        className="flex-shrink-0 border-t border-white/10 bg-black/60 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => setFilmDrag(idx)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => {
                e.preventDefault()
                if (filmDrag === null || filmDrag === idx) return
                const next = [...images]
                const [moved] = next.splice(filmDrag, 1)
                next.splice(idx, 0, moved)
                const newCurrent = idx === current ? filmDrag : filmDrag === current ? idx : current
                setCurrent(newCurrent)
                setFilmDrag(null)
                onReorder(next)
              }}
              onDragEnd={() => setFilmDrag(null)}
              className={cn(
                "relative flex-shrink-0 cursor-pointer group/film rounded overflow-hidden transition-all",
                current === idx ? "ring-2 ring-white scale-105" : "opacity-60 hover:opacity-100",
                filmDrag === idx && "opacity-30",
              )}
              onClick={() => setCurrent(idx)}
              style={{ width: 72, height: 52 }}
            >
              <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
              <button
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 rounded-full p-0.5 text-white opacity-0 group-hover/film:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onRemove(idx); if (current >= images.length - 1) setCurrent(Math.max(0, current - 1)) }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <div className="absolute bottom-0.5 left-0.5">
                <GripVertical className="h-3 w-3 text-white/50" />
              </div>
            </div>
          ))}
          {/* Add button */}
          <button
            className="flex-shrink-0 w-[72px] h-[52px] border border-dashed border-white/30 rounded flex items-center justify-center text-white/50 hover:text-white hover:border-white/60 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((f) => {
                const url = URL.createObjectURL(f)
                onReorder([...images, url])
              })
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: (urls: string[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"))
    setSelected((prev) => [...prev, ...images])
  }

  const handleConfirm = () => {
    const urls = selected.map((f) => URL.createObjectURL(f))
    onUpload(urls)
    setSelected([])
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-[480px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Upload Images</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Drop images here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB each</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = "" }} />
        </div>

        {/* Preview selected */}
        {selected.length > 0 && (
          <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
            {selected.map((f, i) => (
              <div key={i} className="relative w-16 h-12 rounded overflow-hidden border border-border group">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                <button
                  className="absolute top-0 right-0 bg-black/60 hover:bg-red-600 rounded-bl p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setSelected((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0}>
            Upload {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Image Cell ────────────────────────────────────────────────────────────────
function ImageCell({
  images,
  rowId,
  onUpdate,
}: {
  images: string[]
  rowId: string
  onUpdate: (imgs: string[]) => void
}) {
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselStart, setCarouselStart] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const MAX_VISIBLE = 3

  const visible = images.slice(0, MAX_VISIBLE)
  const extra = images.length - MAX_VISIBLE

  return (
    <>
      <div className="flex items-center gap-1" style={{ width: "max-content" }}>
        {visible.map((img, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIdx === null || dragIdx === idx) return
              const next = [...images]
              const [moved] = next.splice(dragIdx, 1)
              next.splice(idx, 0, moved)
              setDragIdx(null)
              onUpdate(next)
            }}
            onDragEnd={() => setDragIdx(null)}
            className={cn(
              "relative group/img rounded overflow-hidden cursor-grab active:cursor-grabbing flex-shrink-0 border border-border",
              dragIdx === idx && "opacity-30",
            )}
            style={{ width: 40, height: 32 }}
          >
            <img
              src={img}
              alt={`img ${idx + 1}`}
              className="w-full h-full object-cover"
              onClick={(e) => { e.stopPropagation(); setCarouselStart(idx); setCarouselOpen(true) }}
            />
            <button
              className="absolute top-0 right-0 bg-black/60 hover:bg-red-600 rounded-bl p-0.5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onUpdate(images.filter((_, i) => i !== idx)) }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
              <ZoomIn className="h-3 w-3 text-white" />
            </div>
          </div>
        ))}
        {extra > 0 && (
          <button
            className="flex-shrink-0 px-1.5 h-8 rounded border border-border bg-secondary text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap"
            onClick={() => { setCarouselStart(MAX_VISIBLE); setCarouselOpen(true) }}
          >
            +{extra}
          </button>
        )}
        {/* Add button — always visible at the end */}
        <button
          onClick={() => setUploadOpen(true)}
          className="flex-shrink-0 w-8 h-8 rounded border border-dashed border-border bg-transparent hover:bg-muted hover:border-primary/50 flex items-center justify-center transition-colors"
          title="Add images"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {carouselOpen && (
        <ImageCarousel
          images={images}
          startIndex={carouselStart}
          onClose={() => setCarouselOpen(false)}
          onReorder={onUpdate}
          onRemove={(idx) => onUpdate(images.filter((_, i) => i !== idx))}
          onAdd={() => {}}
        />
      )}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(urls) => onUpdate([...images, ...urls])}
      />
    </>
  )
}

export function AdvancedDataGrid({
  initialData,
  initialColumns: providedColumns,
  quickFilterOptions,
  quickFilterLabels,
  groupByOptions,
}: AdvancedDataGridProps = {}) {
  // State
  const defaultColumns = providedColumns ?? initialColumns
  const [data, setData] = useState<DataRow[]>(() => initialData ?? generateMockData(150))
  const [columns, setColumns] = useState<Column[]>(defaultColumns)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [groupConnector, setGroupConnector] = useState<"AND" | "OR">("AND")
  const [allFilters, setAllFilters] = useState<Record<string, string>>({})
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({})
  const [deptFilter, setDeptFilter] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [editRating, setEditRating] = useState<number>(0)
  const [editAvatar, setEditAvatar] = useState<{ title: string; caption: string }>({ title: "", caption: "" })
  const [editProfile, setEditProfile] = useState<{ name: string; profileId: string; image: string }>({ name: "", profileId: "", image: "" })
  const [profileSearch, setProfileSearch] = useState("")
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [showSortDrawer, setShowSortDrawer] = useState(false)
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [draggedSortIndex, setDraggedSortIndex] = useState<number | null>(null)
  const [showUpdateToast, setShowUpdateToast] = useState(false)
  const [toastLoading, setToastLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const statusOptions = quickFilterOptions?.status ?? statuses
  const priorityOptions = quickFilterOptions?.priority ?? priorities
  const departmentOptions = quickFilterOptions?.department ?? departments
  const filterLabels = {
    status: quickFilterLabels?.status ?? "Status",
    priority: quickFilterLabels?.priority ?? "Priority",
    department: quickFilterLabels?.department ?? "Department",
  }
  const groupingOptions = groupByOptions ?? [
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "department", label: "Department" },
  ]

  const tableRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth)
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Show bulk actions when rows are selected
  useEffect(() => {
    setShowBulkActions(selectedRows.size > 0)
  }, [selectedRows])

  // Show toast when editing completes
  const showSaveToast = () => {
    setToastLoading(true)
    setShowUpdateToast(true)
    setTimeout(() => {
      setToastLoading(false)
      setTimeout(() => {
        setShowUpdateToast(false)
      }, 2000)
    }, 800)
  }

  // Filter and sort data
  const processedData = useCallback(() => {
    let result = [...data]

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) =>
        Object.values(row).some((value) => {
          if (typeof value === "string") return value.toLowerCase().includes(query)
          if (typeof value === "object" && value !== null) {
            return Object.values(value).some((v) => typeof v === "string" && v.toLowerCase().includes(query))
          }
          return false
        }),
      )
    }

    // Department multi-filter
    if (deptFilter.length > 0) {
      result = result.filter((row) => deptFilter.includes(row.department))
    }

    // Quick filters
    Object.entries(quickFilters).forEach(([column, value]) => {
      if (value && value !== "all") {
        result = result.filter((row) => {
          const cellValue = row[column as keyof DataRow]
          if (typeof cellValue === "string") return cellValue === value
          return false
        })
      }
    })

    // All filters drawer filters
    Object.entries(allFilters).forEach(([column, value]) => {
      if (value && value !== "all" && value !== "") {
        result = result.filter((row) => {
          const cellValue = row[column as keyof DataRow]
          if (typeof cellValue === "string") return cellValue.toLowerCase().includes(value.toLowerCase())
          if (typeof cellValue === "number") return cellValue === Number(value)
          return false
        })
      }
    })

    // Date range filter
    if (dateRange?.from) {
      result = result.filter((row) => new Date(row.date) >= dateRange.from!)
    }
    if (dateRange?.to) {
      result = result.filter((row) => new Date(row.date) <= dateRange.to!)
    }

    // Advanced filter groups
    if (filterGroups.length > 0) {
      result = result.filter((row) => {
        const groupResults = filterGroups.map((group) => {
          if (group.conditions.length === 0) return true

          const conditionResults = group.conditions.map((condition) => {
            const cellValue = row[condition.column as keyof DataRow]

            if (typeof cellValue === "string") {
              switch (condition.operator) {
                case "equals":
                  return cellValue === condition.value
                case "not_equals":
                  return cellValue !== condition.value
                case "contains":
                  return cellValue.toLowerCase().includes(condition.value.toLowerCase())
                case "not_contains":
                  return !cellValue.toLowerCase().includes(condition.value.toLowerCase())
                case "starts_with":
                  return cellValue.toLowerCase().startsWith(condition.value.toLowerCase())
                case "ends_with":
                  return cellValue.toLowerCase().endsWith(condition.value.toLowerCase())
                case "is_empty":
                  return cellValue === ""
                case "is_not_empty":
                  return cellValue !== ""
                default:
                  return true
              }
            } else if (typeof cellValue === "number") {
              const numValue = Number.parseFloat(condition.value)
              switch (condition.operator) {
                case "equals":
                  return cellValue === numValue
                case "not_equals":
                  return cellValue !== numValue
                case "greater_than":
                  return cellValue > numValue
                case "less_than":
                  return cellValue < numValue
                case "greater_or_equal":
                  return cellValue >= numValue
                case "less_or_equal":
                  return cellValue <= numValue
                default:
                  return true
              }
            }
            return true
          })

          return group.connector === "OR"
            ? conditionResults.some(Boolean)
            : conditionResults.every(Boolean)
        })

        // Combine group results using the single global groupConnector
        if (groupConnector === "OR") return groupResults.some(Boolean)
        return groupResults.every(Boolean)
      })
    }

    // Sorting
    if (sortConfigs.length > 0) {
      result.sort((a, b) => {
        for (const config of sortConfigs) {
          const aVal = a[config.column as keyof DataRow]
          const bVal = b[config.column as keyof DataRow]

          let comparison = 0
          if (typeof aVal === "string" && typeof bVal === "string") {
            comparison = aVal.localeCompare(bVal)
          } else if (typeof aVal === "number" && typeof bVal === "number") {
            comparison = aVal - bVal
          }

          if (comparison !== 0) {
            return config.direction === "asc" ? comparison : -comparison
          }
        }
        return 0
      })
    }

    return result
  }, [data, searchQuery, quickFilters, deptFilter, allFilters, filterGroups, sortConfigs, dateRange])

  const filteredData = processedData()

  // Group data
  const groupedData = useCallback(() => {
    if (!groupByColumn) return null

    const groups: Record<string, DataRow[]> = {}
    filteredData.forEach((row) => {
      const key = String(row[groupByColumn as keyof DataRow] || "Ungrouped")
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    })
    return groups
  }, [filteredData, groupByColumn])

  const groups = groupedData()

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = groups ? null : filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageRows = paginatedData || filteredData
      setSelectedRows(new Set(pageRows.map((row) => row.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (rowId: string, index: number, shiftKey: boolean) => {
    const newSelected = new Set(selectedRows)

    if (shiftKey && lastSelectedIndex !== null) {
      const currentData = paginatedData || filteredData
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)

      for (let i = start; i <= end; i++) {
        newSelected.add(currentData[i].id)
      }
    } else {
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId)
      } else {
        newSelected.add(rowId)
      }
      setLastSelectedIndex(index)
    }

    setSelectedRows(newSelected)
  }

  // Edit handlers
  const handleStartEdit = (rowId: string, column: string, value: any) => {
    setEditingCell({ rowId, column })
    if (column === "tags") {
      setEditTags(value as string[])
    } else if (column === "rating") {
      setEditRating(value as number)
    } else if (column === "avatar") {
      setEditAvatar({ title: value.title, caption: value.caption })
    } else if (column === "profile") {
      setEditProfile({ name: value.name, profileId: value.profileId, image: value.image })
      setProfileSearch(value.name)
    } else {
      setEditValue(String(value))
    }
  }

  const handleSaveEdit = () => {
    if (!editingCell) return

    setData((prev) =>
      prev.map((row) => {
        if (row.id === editingCell.rowId) {
          const column = editingCell.column as keyof DataRow
          if (column === "number" || column === "currency" || column === "progress") {
            return { ...row, [column]: Number.parseFloat(editValue) || 0 }
          }
          if (column === "tags") {
            return { ...row, tags: editTags }
          }
          if (column === "rating") {
            return { ...row, rating: editRating }
          }
          if (column === "avatar") {
            return { ...row, avatar: { ...row.avatar, title: editAvatar.title, caption: editAvatar.caption } }
          }
          if (column === "profile") {
            return { ...row, profile: { ...row.profile, name: editProfile.name, profileId: editProfile.profileId, image: editProfile.image || row.profile.image } }
          }
          if (column === "checkbox" || column === "boolean") {
            return { ...row, [column]: editValue === "true" }
          }
          return { ...row, [column]: editValue }
        }
        return row
      }),
    )
    setEditingCell(null)
    setEditValue("")
    setEditTags([])
    setEditRating(0)
    showSaveToast()
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
    setEditTags([])
    setEditRating(0)
    setEditAvatar({ title: "", caption: "" })
    setEditProfile({ name: "", profileId: "", image: "" })
    setProfileSearch("")

  }

  // Column handlers
  const handleToggleColumn = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId)
    if (column?.fixed) return // Can't hide fixed columns
    setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, visible: !col.visible } : col)))
  }

  const handleFreezeColumn = (columnId: string) => {
    const columnIndex = columns.findIndex((c) => c.id === columnId)
    const column = columns[columnIndex]

    if (column.frozen) {
      // Unfreezing - check if any columns after it are frozen
      const hasLaterFrozen = columns.slice(columnIndex + 1).some((c) => c.frozen && c.id !== "actions")
      if (hasLaterFrozen) return // Can't unfreeze if later columns are frozen
      setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, frozen: false } : col)))
    } else {
      // Freezing - check if all columns before it are frozen
      const unfrozenBefore = columns
        .slice(0, columnIndex)
        .filter((c) => !c.frozen && c.id !== "select" && c.id !== "expand" && c.id !== "actions")
      if (unfrozenBefore.length > 0) return // Can't freeze if earlier columns aren't frozen
      setColumns((prev) => prev.map((col) => (col.id === columnId ? { ...col, frozen: true } : col)))
    }
  }

  const handleColumnDragStart = (columnId: string) => {
    setDraggedColumn(columnId)
  }

  const handleColumnDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === targetColumnId) return

    setColumns((prev) => {
      const newColumns = [...prev]
      const draggedIndex = newColumns.findIndex((c) => c.id === draggedColumn)
      const targetIndex = newColumns.findIndex((c) => c.id === targetColumnId)

      const [removed] = newColumns.splice(draggedIndex, 1)
      newColumns.splice(targetIndex, 0, removed)

      return newColumns
    })
  }

  const handleColumnDragEnd = () => {
    setDraggedColumn(null)
  }

  // Sort handlers
  const handleSort = (columnId: string) => {
    setSortConfigs((prev) => {
      const existing = prev.find((s) => s.column === columnId)
      if (!existing) {
        return [{ column: columnId, direction: "asc" }]
      }
      if (existing.direction === "asc") {
        return [{ column: columnId, direction: "desc" }]
      }
      return []
    })
  }

  const handleSortDragStart = (index: number) => {
    setDraggedSortIndex(index)
  }

  const handleSortDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedSortIndex === null || draggedSortIndex === targetIndex) return

    setSortConfigs((prev) => {
      const newConfigs = [...prev]
      const [removed] = newConfigs.splice(draggedSortIndex, 1)
      newConfigs.splice(targetIndex, 0, removed)
      setDraggedSortIndex(targetIndex)
      return newConfigs
    })
  }

  const handleSortDragEnd = () => {
    setDraggedSortIndex(null)
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Add filter group
  const addFilterGroup = () => {
    setFilterGroups((prev) => [
      ...prev,
      {
        id: `group-${Date.now()}`,
        connector: "AND",
        conditions: [{ id: `cond-${Date.now()}`, column: defaultFilterColumnId, operator: "contains", value: "" }],
      },
    ])

  }

  // Remove filter group
  const removeFilterGroup = (groupId: string) => {
    setFilterGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  // Add condition to group
  const addConditionToGroup = (groupId: string) => {
    setFilterGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                { id: `cond-${Date.now()}`, column: defaultFilterColumnId, operator: "contains", value: "" },
              ],
            }
          : group,
      ),
    )
  }

  // Toggle group collapse
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Render cell content
  const renderCell = (row: DataRow, column: Column, rowIndex: number) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.column === column.id

    switch (column.type) {
      case "select":
        return (
          <div
            className="flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectRow(row.id, rowIndex, e.shiftKey)
            }}
          >
            <Checkbox
              checked={selectedRows.has(row.id)}
              onCheckedChange={() => {}}
            />
          </div>
        )
      // Added expand column rendering
      case "expand":
        return (
          <button
            onClick={() => {
              setExpandedRows((prev) => {
                const next = new Set(prev)
                if (next.has(row.id)) {
                  next.delete(row.id)
                } else {
                  next.add(row.id)
                }
                return next
              })
            }}
            className="hover:bg-secondary rounded p-0.5"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedRows.has(row.id) && "rotate-90")} />
          </button>
        )

      case "id":
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono">{row.id}</span>
            <button
              onClick={() => copyToClipboard(row.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-secondary rounded"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )

      case "avatar":
        if (isEditing) {
          return (
            <div className="flex items-center gap-2 w-full">
              <img
                src={row.avatar.image || "/placeholder.svg"}
                alt={row.avatar.title}
                className="w-8 h-8 rounded-md object-cover flex-shrink-0"
              />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <Input
                  value={editAvatar.title}
                  onChange={(e) => setEditAvatar((prev) => ({ ...prev, title: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit()
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                  placeholder="Full name"
                  className="h-6 text-xs px-1.5 py-0"
                  autoFocus
                />
                <Input
                  value={editAvatar.caption}
                  onChange={(e) => setEditAvatar((prev) => ({ ...prev, caption: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit()
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                  onBlur={handleSaveEdit}
                  placeholder="Email"
                  className="h-6 text-xs px-1.5 py-0"
                />
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={handleSaveEdit} className="p-0.5 hover:bg-emerald-100 rounded text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleCancelEdit} className="p-0.5 hover:bg-secondary rounded text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        }
        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-1 rounded w-full"
            onClick={() => handleStartEdit(row.id, column.id, row.avatar)}
          >
            <img
              src={row.avatar.image || "/placeholder.svg"}
              alt={row.avatar.title}
              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{row.avatar.title}</div>
              <div className="text-xs text-muted-foreground truncate">{row.avatar.caption}</div>
            </div>
            <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )

      case "profile": {
        const profileOptions = data.map((d) => d.profile)
        const filtered = profileOptions.filter(
          (p) =>
            p.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
            p.profileId.toLowerCase().includes(profileSearch.toLowerCase()),
        )
        if (isEditing) {
          return (
            <div className="flex items-center gap-2 w-full">
              <img
                src={editProfile.image || row.profile.image || "/placeholder.svg"}
                alt={editProfile.name}
                className="w-8 h-8 rounded-md object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0 relative">
                <Input
                  value={profileSearch}
                  onChange={(e) => {
                    setProfileSearch(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                  placeholder="Search profiles..."
                  className="h-6 text-xs px-1.5 py-0"
                  autoFocus
                />
                {profileSearch.trim() !== "" && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filtered.slice(0, 8).map((p) => (
                      <button
                        key={p.profileId}
                        type="button"
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary text-left"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setEditProfile({ name: p.name, profileId: p.profileId, image: p.image })
                          setProfileSearch("")
                          // save immediately after selection
                          setData((prev) =>
                            prev.map((r) =>
                              r.id === row.id
                                ? { ...r, profile: { ...r.profile, name: p.name, profileId: p.profileId, image: p.image } }
                                : r,
                            ),
                          )
                          setEditingCell(null)
                          showSaveToast()
                        }}
                      >
                        <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.profileId}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button onClick={handleCancelEdit} className="p-0.5 hover:bg-secondary rounded text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        }
        return (
          <ProfileCell
            row={row}
            onEdit={() => handleStartEdit(row.id, column.id, row.profile)}
          />
        )
      }

      case "progress":
        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Progress value={Number(editValue)} className="h-2 flex-1 min-w-[60px]" />
              <Input
                type="number"
                min={0}
                max={100}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit()
                  if (e.key === "Escape") handleCancelEdit()
                }}
                className="h-7 text-xs w-16"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          )
        }
        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.progress)}
          >
            <Progress value={row.progress} className="h-2 flex-1 min-w-[60px]" />
            <span className="text-xs text-muted-foreground w-9 text-right">{row.progress}%</span>
          </div>
        )

      case "rating":
        if (isEditing) {
          return (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setEditRating(i + 1)
                    setTimeout(() => {
                      setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, rating: i + 1 } : r)))
                      setEditingCell(null)
                      showSaveToast()
                    }, 100)
                  }}
                  className="hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      i < editRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
          )
        }
        return (
          <div
            className="flex items-center gap-0.5 cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.rating)}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < row.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
                )}
              />
            ))}
          </div>
        )

      case "status":
        if (isEditing) {
          return (
            <Select
              value={editValue}
              onValueChange={(v) => {
                setEditValue(v)
                setTimeout(() => {
                  setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: v } : r)))
                  setEditingCell(null)
                  showSaveToast()
                }, 100)
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        const statusColors: Record<string, string> = {
          Active: "bg-green-100 text-green-700",
          Available: "bg-green-100 text-green-700",
          Inactive: "bg-gray-100 text-gray-700",
          Pending: "bg-yellow-100 text-yellow-700",
          Archived: "bg-blue-100 text-blue-700",
          Draft: "bg-purple-100 text-purple-700",
          "Sold Off": "bg-gray-100 text-gray-700",
        }
        return (
          <Badge
            variant="secondary"
            className={cn("text-xs cursor-pointer", statusColors[row.status])}
            onClick={() => handleStartEdit(row.id, column.id, row.status)}
          >
            {row.status}
          </Badge>
        )

      case "priority":
        if (isEditing) {
          return (
            <Select
              value={editValue}
              onValueChange={(v) => {
                setEditValue(v)
                setTimeout(() => {
                  setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, priority: v } : r)))
                  setEditingCell(null)
                  showSaveToast()
                }, 100)
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        const priorityColors: Record<string, string> = {
          Critical: "bg-red-100 text-red-700",
          High: "bg-orange-100 text-orange-700",
          Medium: "bg-blue-100 text-blue-700",
          Low: "bg-green-100 text-green-700",
          Primary: "bg-blue-100 text-blue-700",
          Resale: "bg-emerald-100 text-emerald-700",
          "Nawy Now": "bg-orange-100 text-orange-700",
        }
        return (
          <Badge
            variant="secondary"
            className={cn("text-xs cursor-pointer", priorityColors[row.priority])}
            onClick={() => handleStartEdit(row.id, column.id, row.priority)}
          >
            {row.priority}
          </Badge>
        )

      case "tags":
        if (isEditing) {
          return (
            <Popover open={true} onOpenChange={(open) => !open && handleSaveEdit()}>
              <PopoverTrigger asChild>
                <div className="flex flex-wrap gap-1 p-1 bg-secondary/50 rounded min-w-[150px] cursor-pointer">
                  {editTags.length > 0 ? (
                    editTags.map((tag) => (
                      <Badge key={tag} variant="default" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Select tags...</span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {tagOptions.map((tag) => (
                    <div
                      key={tag}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-secondary/50",
                        editTags.includes(tag) && "bg-primary/10",
                      )}
                      onClick={() => {
                        if (editTags.includes(tag)) {
                          setEditTags(editTags.filter((t) => t !== tag))
                        } else {
                          setEditTags([...editTags, tag])
                        }
                      }}
                    >
                      <Checkbox checked={editTags.includes(tag)} className="h-4 w-4" />
                      <span className="text-sm">{tag}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-2 pt-2">
                  <Button size="sm" className="w-full h-7 text-xs" onClick={handleSaveEdit}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )
        }
        return (
          <div
            className="flex flex-wrap gap-1 cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.tags)}
          >
            {row.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {row.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{row.tags.length - 2}
              </Badge>
            )}
          </div>
        )

      case "text":
        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row[column.id as keyof DataRow] as string)}
          >
            {row[column.id as keyof DataRow] as string}
          </span>
        )

      case "number":
        if (isEditing) {
          return (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, String(row.number))}
          >
            {row.number.toLocaleString()}
          </span>
        )

      case "currency":
        if (isEditing) {
          return (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, String(row.currency))}
          >
            ${row.currency.toLocaleString()}
          </span>
        )

      case "date":
        if (isEditing) {
          return (
            <Input
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.date)}
          >
            {new Date(row.date).toLocaleDateString()}
          </span>
        )

      case "timestamp":
        return <span className="text-xs">{new Date(row.timestamp).toLocaleString()}</span>

      case "checkbox":
        return (
          <Checkbox
            checked={row.checkbox}
            onCheckedChange={(checked) => {
              setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, checkbox: !!checked } : r)))
              showSaveToast()
            }}
          />
        )

      case "boolean":
        return (
          <button
            onClick={() => {
              setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, boolean: !r.boolean } : r)))
              showSaveToast()
            }}
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center cursor-pointer",
              row.boolean ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
            )}
          >
            {row.boolean ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </button>
        )

      case "reference":
        return (
          <a
            href={row.reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            {row.reference.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        )

      case "email":
        if (isEditing) {
          return (
            <Input
              type="email"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="text-xs truncate cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.email)}
          >
            {row.email}
          </span>
        )

      case "phone":
        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-xs"
              autoFocus
            />
          )
        }
        return (
          <span
            className="text-xs cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.phone)}
          >
            {row.phone}
          </span>
        )

      case "department":
        if (isEditing) {
          return (
            <Select
              value={editValue}
              onValueChange={(v) => {
                setEditValue(v)
                setTimeout(() => {
                  setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, department: v } : r)))
                  setEditingCell(null)
                  showSaveToast()
                }, 100)
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        return (
          <span
            className="cursor-pointer hover:bg-secondary/50 px-1 rounded"
            onClick={() => handleStartEdit(row.id, column.id, row.department)}
          >
            {row.department}
          </span>
        )

      case "images":
        return (
          <ImageCell
            images={row.images}
            rowId={row.id}
            onUpdate={(imgs) =>
              setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, images: imgs } : r)))
            }
          />
        )

      case "quickActions": {
        const qaList = [
          { icon: Eye, label: "View" },
          { icon: Edit, label: "Edit" },
          { icon: Trash2, label: "Delete" },
        ] as { icon: React.ElementType; label: string }[]
        return (
          <div className="flex items-center gap-1">
            {qaList.map(({ icon: Icon, label }) => (
              <div key={label} className="relative group/qa">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-7 w-7 bg-card border-border shadow-none",
                    label === "Delete" && "hover:border-destructive/60 hover:text-destructive",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded bg-foreground px-2 py-0.5 text-[11px] text-background whitespace-nowrap opacity-0 group-hover/qa:opacity-100 transition-opacity z-50 shadow-sm">
                  {label}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </span>
              </div>
            ))}
          </div>
        )
      }

      case "actions":
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )

      default:
        return null
    }
  }

  // Get visible columns
  const visibleColumns = columns.filter((c) => c.visible)
  // Filtered to exclude the fixed select and expand columns from the general frozenColumns logic
  const frozenDataColumns = visibleColumns.filter(
    (c) => c.frozen && c.id !== "select" && c.id !== "expand" && c.id !== "actions",
  )
  const scrollableColumns = visibleColumns.filter((c) => !c.frozen)
  const actionsColumn = visibleColumns.find((c) => c.id === "actions")

  const frozenWidth = useMemo(() => {
    return frozenDataColumns.reduce((sum, col) => sum + col.width, 0) + 40 + 40 // +40 for select column +40 for expand column
  }, [frozenDataColumns])

  // Get filterable columns for drawer
  const filterableColumns = columns.filter(
    (c) => !["select", "actions", "avatar", "checkbox", "boolean", "reference", "expand"].includes(c.type),
  )
  const defaultFilterColumnId = filterableColumns[0]?.id ?? "id"

  // Count active all filters
  const activeAllFiltersCount = Object.values(allFilters).filter((v) => v && v !== "all" && v !== "").length

  const hasActiveDateRange = !!(dateRange?.from || dateRange?.to)
  const hasAnyFilter = !!searchQuery || hasActiveDateRange || activeAllFiltersCount > 0 || filterGroups.length > 0 || deptFilter.length > 0 || Object.values(quickFilters).some((v) => v && v !== "all")

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* ── Unified toolbar container ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-3">
        {/* Row 1: search + quick filters + date range */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-9 h-9"
            />
          </div>

          {/* Status */}
          <Select value={quickFilters.status || "all"} onValueChange={(v) => { setQuickFilters((prev) => ({ ...prev, status: v })); setCurrentPage(1) }}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder={filterLabels.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filterLabels.status}</SelectItem>
              {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={quickFilters.priority || "all"} onValueChange={(v) => { setQuickFilters((prev) => ({ ...prev, priority: v })); setCurrentPage(1) }}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder={filterLabels.priority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filterLabels.priority}</SelectItem>
              {priorityOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Department multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 min-w-[140px] justify-between font-normal bg-background",
                  deptFilter.length > 0 ? "border-primary/60 text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {deptFilter.length === 0
                    ? filterLabels.department
                    : deptFilter.length === 1
                    ? deptFilter[0]
                    : `${deptFilter.length} ${filterLabels.department.toLowerCase()}s`}
                </span>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {deptFilter.length > 0 && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setDeptFilter([]); setCurrentPage(1) }}
                      className="rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              <div className="max-h-60 overflow-y-auto">
                {departmentOptions.map((d) => {
                  const checked = deptFilter.includes(d)
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setDeptFilter((prev) => checked ? prev.filter((x) => x !== d) : [...prev, d])
                        setCurrentPage(1)
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-secondary transition-colors text-left"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        checked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background",
                      )}>
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className="truncate">{d}</span>
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date range picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-2 text-sm font-normal bg-background",
                  hasActiveDateRange ? "border-primary/60 text-foreground" : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toLocaleDateString()} – {dateRange.to.toLocaleDateString()}
                    </>
                  ) : (
                    dateRange.from.toLocaleDateString()
                  )
                ) : (
                  "Date range"
                )}
                {hasActiveDateRange && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setDateRange(undefined); setCurrentPage(1) }}
                    className="ml-1 rounded-full hover:bg-muted p-0.5 -mr-1"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => { setDateRange(range); setCurrentPage(1) }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear all filters */}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchQuery("")
                setQuickFilters({})
                setDeptFilter([])
                setDateRange(undefined)
                setAllFilters({})
                setFilterGroups([])
                setCurrentPage(1)
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Row 2: advanced controls + CTAs */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            {/* All Filters */}
            <Button
              variant={activeAllFiltersCount > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllFilters(true)}
              className="h-8 bg-transparent"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              All Filters
              {activeAllFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {activeAllFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Advanced Filter */}
            <Popover open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
              <PopoverTrigger asChild>
                <Button variant={filterGroups.length > 0 ? "default" : "outline"} size="sm" className="h-8 bg-transparent">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                  Advanced Filter
                  {filterGroups.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {filterGroups.reduce((acc, g) => acc + g.conditions.length, 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-[700px] p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Advanced Filter Builder</h4>
                  <Button variant="ghost" size="sm" onClick={() => setFilterGroups([])}>
                    Clear All
                  </Button>
                </div>

                {filterGroups.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No filter groups. Add a group to start filtering.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {filterGroups.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Groups are joined by</span>
                        <button
                          onClick={() => setGroupConnector((prev) => (prev === "AND" ? "OR" : "AND"))}
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded border transition-colors",
                            groupConnector === "OR"
                              ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                              : "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
                          )}
                        >
                          {groupConnector}
                        </button>
                        <span className="text-xs text-muted-foreground">— click to toggle</span>
                      </div>
                    )}
                    {filterGroups.map((group, groupIndex) => (
                      <div key={group.id} className="border border-border rounded-lg p-3 space-y-3">
                        {groupIndex > 0 && (
                          <div className="flex justify-center -mt-6 mb-1">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              groupConnector === "OR"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-blue-100 text-blue-700 border-blue-200",
                            )}>
                              {groupConnector}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Condition Group {groupIndex + 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={group.connector}
                              onValueChange={(v) => {
                                setFilterGroups((prev) =>
                                  prev.map((g) => (g.id === group.id ? { ...g, connector: v as "AND" | "OR" } : g)),
                                )
                              }}
                            >
                              <SelectTrigger className="w-20 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeFilterGroup(group.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {group.conditions.map((condition, condIndex) => (
                          <div key={condition.id} className="flex items-center gap-2">
                            {condIndex > 0 && (
                              <span className="text-xs text-muted-foreground w-8">{group.connector}</span>
                            )}
                            {condIndex === 0 && <span className="text-xs text-muted-foreground w-8">Where</span>}
                            <Select
                              value={condition.column}
                              onValueChange={(v) => {
                                setFilterGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          conditions: g.conditions.map((c) =>
                                            c.id === condition.id ? { ...c, column: v } : c,
                                          ),
                                        }
                                      : g,
                                  ),
                                )
                              }}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Column" />
                              </SelectTrigger>
                              <SelectContent>
                                {filterableColumns.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={condition.operator}
                              onValueChange={(v) => {
                                setFilterGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          conditions: g.conditions.map((c) =>
                                            c.id === condition.id ? { ...c, operator: v } : c,
                                          ),
                                        }
                                      : g,
                                  ),
                                )
                              }}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not equals</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="not_contains">Not contains</SelectItem>
                                <SelectItem value="starts_with">Starts with</SelectItem>
                                <SelectItem value="ends_with">Ends with</SelectItem>
                                <SelectItem value="greater_than">Greater than</SelectItem>
                                <SelectItem value="less_than">Less than</SelectItem>
                                <SelectItem value="greater_or_equal">Greater or equal</SelectItem>
                                <SelectItem value="less_or_equal">Less or equal</SelectItem>
                                <SelectItem value="is_empty">Is empty</SelectItem>
                                <SelectItem value="is_not_empty">Is not empty</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={condition.value}
                              onChange={(e) => {
                                setFilterGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          conditions: g.conditions.map((c) =>
                                            c.id === condition.id ? { ...c, value: e.target.value } : c,
                                          ),
                                        }
                                      : g,
                                  ),
                                )
                              }}
                              placeholder="Value"
                              className="flex-1 h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setFilterGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? { ...g, conditions: g.conditions.filter((c) => c.id !== condition.id) }
                                      : g,
                                  ),
                                )
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addConditionToGroup(group.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Condition
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={addFilterGroup}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Condition Group
                  </Button>
                  <Button size="sm" onClick={() => setShowAdvancedFilter(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort */}
            <Popover open={showSortDrawer} onOpenChange={setShowSortDrawer}>
              <PopoverTrigger asChild>
                <Button variant={sortConfigs.length > 0 ? "default" : "outline"} size="sm" className="h-8 bg-transparent">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  Sort
                  {sortConfigs.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {sortConfigs.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Sort by Multiple Columns</h4>
                    <Button variant="ghost" size="sm" onClick={() => setSortConfigs([])}>Clear All</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Drag to reorder priority.</p>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {sortConfigs.map((config, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleSortDragStart(index)}
                        onDragOver={(e) => handleSortDragOver(e, index)}
                        onDragEnd={handleSortDragEnd}
                        className={cn("flex items-center gap-2 p-3 bg-secondary/30 rounded-lg", draggedSortIndex === index && "opacity-50")}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="text-xs text-muted-foreground w-16">{index === 0 ? "Sort by" : "Then by"}</span>
                        <Select value={config.column} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, column: v } : c)))}>
                          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                          <SelectContent>{filterableColumns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={config.direction} onValueChange={(v) => setSortConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, direction: v as "asc" | "desc" } : c)))}>
                          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSortConfigs((prev) => prev.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {sortConfigs.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No sort applied.</p>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => setSortConfigs((prev) => [...prev, { column: defaultFilterColumnId, direction: "asc" }])} disabled={sortConfigs.length >= 5}>
                    <Plus className="h-4 w-4 mr-1.5" />Add Sort Level
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Group By */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupByColumn ? "default" : "outline"} size="sm" className="h-8 bg-transparent">
                  <Group className="h-3.5 w-3.5 mr-1.5" />
                  Group
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupByColumn(null)}>No Grouping</DropdownMenuItem>
                <DropdownMenuSeparator />
                {groupingOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setGroupByColumn(option.value)}>
                    {option.label ?? option.value}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Customizer */}
            <Button variant="outline" size="sm" onClick={() => setShowColumnCustomizer(true)} className="h-8 bg-transparent">
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Columns
            </Button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card flex flex-col min-h-0">
        <div ref={tableRef} className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-secondary/50 border-b border-border">
              {/* Fixed select and expand columns */}
              <div className="flex sticky left-0 z-30 bg-secondary/50" style={{ minWidth: frozenWidth }}>
                <div
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border"
                  style={{ width: 40 }}
                >
                  <Checkbox
                    checked={
                      (paginatedData || filteredData).length > 0 &&
                      (paginatedData || filteredData).every((row) => selectedRows.has(row.id))
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                {/* Expand column header */}
                <div
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border"
                  style={{ width: 40 }}
                />
                {/* Frozen data columns (excluding select and expand which are now separate) */}
                {frozenDataColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border"
                    style={{ width: column.width }}
                    draggable={!column.fixed}
                    onDragStart={() => !column.fixed && handleColumnDragStart(column.id)}
                    onDragOver={(e) => handleColumnDragOver(e, column.id)}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <button
                      onClick={() => handleSort(column.id)}
                      className="flex items-center justify-between w-full hover:text-foreground transition-colors group/sort"
                    >
                      <span className="flex items-center gap-1">
                        {!column.fixed && <GripVertical className="h-3 w-3 cursor-grab" />}
                        {column.label}
                      </span>
                      <SortArrows columnId={column.id} sortConfigs={sortConfigs} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Scrollable columns */}
              <div className="flex flex-1">
                {scrollableColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border"
                    style={{ width: column.width }}
                    draggable
                    onDragStart={() => handleColumnDragStart(column.id)}
                    onDragOver={(e) => handleColumnDragOver(e, column.id)}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <button
                      onClick={() => handleSort(column.id)}
                      className="flex items-center justify-between w-full hover:text-foreground transition-colors group/sort"
                    >
                      <span className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 cursor-grab" />
                        {column.label}
                      </span>
                      <SortArrows columnId={column.id} sortConfigs={sortConfigs} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions column - frozen right */}
              {actionsColumn && (
                <div
                  className="flex items-center justify-center px-3 py-2 sticky right-0 bg-secondary/50 border-l border-border"
                  style={{ width: actionsColumn.width }}
                />
              )}
            </div>

            {/* Body */}
            {groups
              ? // Grouped view
                Object.entries(groups).map(([groupKey, groupRows]) => (
                  <div key={groupKey}>
                    <div
                      className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-b border-border sticky left-0 cursor-pointer"
                      onClick={() => toggleGroupCollapse(groupKey)}
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", collapsedGroups.has(groupKey) && "-rotate-90")}
                      />
                      <span className="font-medium text-sm">{groupKey}</span>
                      <Badge variant="secondary" className="ml-2">
                        {groupRows.length}
                      </Badge>
                    </div>
                    {!collapsedGroups.has(groupKey) &&
                      groupRows.map((row, idx) => (
                        <DataRowComponent
                          key={row.id}
                          row={row}
                          rowIndex={idx}
                          frozenColumns={frozenDataColumns}
                          scrollableColumns={scrollableColumns}
                          actionsColumn={actionsColumn}
                          frozenWidth={frozenWidth}
                          renderCell={renderCell}
                          selectedRows={selectedRows}
                          expandedRows={expandedRows}
                          setExpandedRows={setExpandedRows}
                          onSelectRow={handleSelectRow}
                          containerWidth={containerWidth}
                        />
                      ))}
                  </div>
                ))
              : // Regular view
                paginatedData?.map((row, idx) => (
                  <DataRowComponent
                    key={row.id}
                    row={row}
                    rowIndex={idx}
                    frozenColumns={frozenDataColumns}
                    scrollableColumns={scrollableColumns}
                    actionsColumn={actionsColumn}
                    frozenWidth={frozenWidth}
                    renderCell={renderCell}
                    selectedRows={selectedRows}
                    expandedRows={expandedRows}
                    setExpandedRows={setExpandedRows}
                    onSelectRow={handleSelectRow}
                    containerWidth={containerWidth}
                  />
                ))}
          </div>
        </div>

        {/* Footer - Pagination */}
        {!groups && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
            {/* Export Button */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 bg-transparent">
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)}{" "}
                  of {filteredData.length} results
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-transparent"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-transparent"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm">Page</span>
                  <Input
                    type="number"
                    value={currentPage}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value)
                      if (val >= 1 && val <= totalPages) setCurrentPage(val)
                    }}
                    className="w-14 h-8 text-center"
                    min={1}
                    max={totalPages}
                  />
                  <span className="text-sm">of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-transparent"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-transparent"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Toast */}
      {showBulkActions && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="font-medium">{selectedRows.size} selected</span>
          <div className="h-4 w-px bg-background/20" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="h-8">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button size="sm" variant="secondary" className="h-8">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicate
            </Button>
            <Button size="sm" variant="destructive" className="h-8">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-background hover:bg-background/10"
            onClick={() => setSelectedRows(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Update Toast */}
      <UpdateToast show={showUpdateToast} loading={toastLoading} />

      {/* All Filters Drawer */}
      <Sheet open={showAllFilters} onOpenChange={setShowAllFilters}>
        <SheetContent className="w-[500px] sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <SheetTitle className="text-lg">All Filters</SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">Filter by any column value</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              {filterableColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <Label className="text-sm font-medium">{column.label}</Label>
                  {["status", "priority", "department"].includes(column.id) ? (
                    <Select
                      value={allFilters[column.id] || "all"}
                      onValueChange={(v) => setAllFilters((prev) => ({ ...prev, [column.id]: v }))}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder={`Select ${column.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {column.id === "status" &&
                          statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        {column.id === "priority" &&
                          priorityOptions.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        {column.id === "department" &&
                          departmentOptions.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`Filter by ${column.label.toLowerCase()}...`}
                      value={allFilters[column.id] || ""}
                      onChange={(e) => setAllFilters((prev) => ({ ...prev, [column.id]: e.target.value }))}
                      className="h-10"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setAllFilters({})}>
                Clear All
              </Button>
              <Button className="flex-1" onClick={() => setShowAllFilters(false)}>
                Apply Filters
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Column Customizer Sheet */}
      <Sheet open={showColumnCustomizer} onOpenChange={setShowColumnCustomizer}>
        <SheetContent className="w-[500px] sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <SheetTitle className="text-lg">Customize Columns</SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Drag to reorder columns. Fixed columns cannot be hidden.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Fixed columns section */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fixed Columns</h4>
              <div className="space-y-2">
                {columns
                  .filter((c) => c.fixed && c.id !== "select" && c.id !== "expand" && c.id !== "actions")
                  .map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/30"
                      draggable
                      onDragStart={() => handleColumnDragStart(column.id)}
                      onDragOver={(e) => handleColumnDragOver(e, column.id)}
                      onDragEnd={handleColumnDragEnd}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="text-sm font-medium">{column.label}</span>
                        <Badge variant="outline" className="text-xs">
                          Fixed
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleFreezeColumn(column.id)}
                          title={column.frozen ? "Unfreeze column" : "Freeze column"}
                        >
                          {column.frozen ? (
                            <Lock className="h-4 w-4 text-primary" />
                          ) : (
                            <Unlock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="border-t border-border mb-6" />

            {/* Customizable columns section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Customizable Columns
              </h4>
              <div className="space-y-2">
                {columns
                  .filter((c) => !c.fixed)
                  .map((column) => {
                    const columnIndex = columns.findIndex((col) => col.id === column.id)
                    const canFreeze =
                      columns
                        .slice(0, columnIndex)
                        .filter((c) => !c.frozen && c.id !== "select" && c.id !== "expand" && c.id !== "actions")
                        .length === 0
                    const canUnfreeze = !columns.slice(columnIndex + 1).some((c) => c.frozen && c.id !== "actions")
                    const freezeDisabled = column.frozen ? !canUnfreeze : !canFreeze

                    return (
                      <div
                        key={column.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card border-border"
                        draggable
                        onDragStart={() => handleColumnDragStart(column.id)}
                        onDragOver={(e) => handleColumnDragOver(e, column.id)}
                        onDragEnd={handleColumnDragEnd}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm">{column.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleFreezeColumn(column.id)}
                            disabled={freezeDisabled}
                            title={
                              freezeDisabled
                                ? column.frozen
                                  ? "Unfreeze columns after this first"
                                  : "Freeze columns before this first"
                                : column.frozen
                                  ? "Unfreeze column"
                                  : "Freeze column"
                            }
                          >
                            {column.frozen ? (
                              <Lock className="h-4 w-4 text-primary" />
                            ) : (
                              <Unlock
                                className={cn(
                                  "h-4 w-4",
                                  freezeDisabled ? "text-muted-foreground/30" : "text-muted-foreground",
                                )}
                              />
                            )}
                          </Button>
                          <Switch checked={column.visible} onCheckedChange={() => handleToggleColumn(column.id)} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setColumns(defaultColumns)}>
              Reset to Default
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Separate DataRow component for expandable rows
function DataRowComponent({
  row,
  rowIndex,
  frozenColumns,
  scrollableColumns,
  actionsColumn,
  frozenWidth,
  renderCell,
  selectedRows,
  expandedRows,
  setExpandedRows,
  onSelectRow,
  containerWidth,
}: {
  row: DataRow
  rowIndex: number
  frozenColumns: Column[]
  scrollableColumns: Column[]
  actionsColumn: Column | undefined
  frozenWidth: number
  renderCell: (row: DataRow, column: Column, rowIndex: number) => React.ReactNode
  selectedRows: Set<string>
  expandedRows: Set<string>
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>
  onSelectRow: (rowId: string, index: number, shiftKey: boolean) => void
  containerWidth: number
}) {
  const isExpanded = expandedRows.has(row.id)
  const isSelected = selectedRows.has(row.id)

  const allDataColumns = [...frozenColumns, ...scrollableColumns]
  const firstDataColumn = allDataColumns.find(
    (col) => !col.fixed && col.id !== "select" && col.id !== "expand" && col.id !== "actions",
  )
  const isFirstDataColumnFrozen = frozenColumns.length > 0

  return (
    <>
      <div className={cn("flex border-b border-border group", isSelected && "bg-primary/5")}>
        {/* Frozen section: select + expand + frozen data columns — all in one sticky wrapper, matching the header */}
        <div
          className={cn("flex sticky left-0 z-10 bg-card transition-colors", isSelected && "bg-primary/5")}
          style={{ minWidth: frozenWidth }}
        >
          {/* Select checkbox */}
          <div
            className="flex items-center justify-center px-3 py-2 text-sm border-r border-border cursor-pointer flex-shrink-0"
            style={{ width: 40 }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectRow(row.id, rowIndex, e.shiftKey)
            }}
          >
            <Checkbox checked={isSelected} onCheckedChange={() => {}} />
          </div>

          {/* Expand toggle */}
          <div
            className="flex items-center justify-center px-3 py-2 text-sm border-r border-border flex-shrink-0"
            style={{ width: 40 }}
          >
            <button
              onClick={() => {
                setExpandedRows((prev) => {
                  const next = new Set(prev)
                  if (next.has(row.id)) next.delete(row.id)
                  else next.add(row.id)
                  return next
                })
              }}
              className={cn(
                "hover:bg-secondary rounded p-0.5 relative",
                row.nestedRows && "text-violet-600",
                row.hasChildren && !row.nestedRows && "text-primary",
              )}
              title={
                row.nestedRows
                  ? `${row.nestedRows.length} nested rows`
                  : row.hasChildren
                  ? `${row.childRows?.length} child rows`
                  : "Row details"
              }
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
              {row.nestedRows && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
              )}
              {row.hasChildren && !row.nestedRows && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>

          {/* Frozen data columns */}
          {frozenColumns.map((column) => (
            <div
              key={column.id}
              className={cn(
                "flex items-center px-3 py-2 text-sm border-r border-border flex-shrink-0",
              )}
              style={{ width: column.width }}
            >
              {renderCell(row, column, rowIndex)}
            </div>
          ))}
        </div>

        {/* Scrollable columns */}
        <div className="flex flex-1">
          {scrollableColumns.map((column) => (
            <div
              key={column.id}
              className={cn(
                "flex items-center px-3 py-2 text-sm border-r border-border transition-colors",
                isSelected && "bg-primary/5",
              )}
              style={{ width: column.width }}
            >
              {renderCell(row, column, rowIndex)}
            </div>
          ))}
        </div>

        {/* Actions column - frozen right */}
        {actionsColumn && (
          <div
            className={cn(
              "flex items-center justify-center sticky right-0 bg-card border-l border-border transition-colors",
              isSelected && "bg-primary/5",
            )}
            style={{ width: actionsColumn.width }}
          >
            {renderCell(row, actionsColumn, rowIndex)}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          className="sticky left-0 border-b border-border"
          style={{ width: containerWidth || "100%" }}
        >
          {row.nestedRows && row.nestedRows.length > 0 ? (
            /* ── Nested full rows (same columns) ── */
            <div className="overflow-x-auto bg-secondary/30 [scrollbar-width:thin]">
            <div className="border-l-2 border-violet-400/60 ml-[80px] bg-secondary/20 min-w-max">
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-violet-600 font-medium uppercase tracking-wide border-b border-border/50">
                <div className="w-0.5 h-3 bg-violet-400 rounded-full" />
                {row.nestedRows.length} nested rows
              </div>
              {row.nestedRows.map((nestedRow, ni) => (
                <div
                  key={nestedRow.id}
                  className={cn("flex border-b border-border/50 last:border-b-0 hover:bg-secondary/40 transition-colors")}
                >
                  {/* Indent spacer aligns nested cells under the frozen section offset */}
                  <div className="flex" style={{ minWidth: frozenWidth - 80 }}>
                    {frozenColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center px-3 py-2 text-sm border-r border-border/50 flex-shrink-0"
                        style={{ width: column.width }}
                      >
                        {renderCell(nestedRow, column, ni)}
                      </div>
                    ))}
                  </div>
                  {scrollableColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center px-3 py-2 text-sm border-r border-border/50 flex-shrink-0"
                      style={{ width: column.width }}
                    >
                      {renderCell(nestedRow, column, ni)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            </div>
          ) : row.hasChildren && row.childRows && row.childRows.length > 0 ? (
            /* ── Child rows panel ── */
            <div className="overflow-x-auto bg-secondary/30 [scrollbar-width:thin]">
            <div className="py-2 px-4 min-w-max">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <div className="w-0.5 h-3 bg-primary rounded-full" />
                {row.childRows.length} sub-tasks
              </div>
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                {/* Child table header */}
                <div className="flex items-center border-b border-border bg-secondary/50 text-xs font-medium text-muted-foreground">
                  <div className="w-6 flex-shrink-0 border-r border-border py-2 px-2 text-center">#</div>
                  <div className="flex-1 min-w-[200px] px-3 py-2 border-r border-border">Label</div>
                  <div className="w-28 px-3 py-2 border-r border-border flex-shrink-0">Status</div>
                  <div className="w-24 px-3 py-2 border-r border-border flex-shrink-0">Priority</div>
                  <div className="w-32 px-3 py-2 border-r border-border flex-shrink-0">Assignee</div>
                  <div className="w-28 px-3 py-2 border-r border-border flex-shrink-0">Amount</div>
                  <div className="w-24 px-3 py-2 border-r border-border flex-shrink-0">Date</div>
                  <div className="w-36 px-3 py-2 flex-shrink-0">Progress</div>
                </div>

                {/* Child rows */}
                {row.childRows.map((child, ci) => {
                  const statusColors: Record<string, string> = {
                    Active: "bg-emerald-100 text-emerald-700",
                    Inactive: "bg-secondary text-muted-foreground",
                    Pending: "bg-amber-100 text-amber-700",
                    Archived: "bg-secondary text-muted-foreground",
                    Draft: "bg-blue-100 text-blue-700",
                  }
                  const priorityColors: Record<string, string> = {
                    Critical: "text-red-600",
                    High: "text-orange-500",
                    Medium: "text-amber-500",
                    Low: "text-muted-foreground",
                  }
                  return (
                    <div
                      key={child.id}
                      className={cn(
                        "flex items-center text-sm border-border hover:bg-secondary/40 transition-colors",
                        ci < row.childRows!.length - 1 && "border-b",
                      )}
                    >
                      <div className="w-6 flex-shrink-0 border-r border-border py-2 px-2 text-center text-xs text-muted-foreground">
                        {ci + 1}
                      </div>
                      <div className="flex-1 min-w-[200px] px-3 py-2 border-r border-border font-medium truncate">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-3 rounded-full bg-border flex-shrink-0" />
                          {child.label}
                        </div>
                      </div>
                      <div className="w-28 px-3 py-2 border-r border-border flex-shrink-0">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[child.status] ?? "bg-secondary text-muted-foreground")}>
                          {child.status}
                        </span>
                      </div>
                      <div className={cn("w-24 px-3 py-2 border-r border-border flex-shrink-0 text-xs font-medium", priorityColors[child.priority])}>
                        {child.priority}
                      </div>
                      <div className="w-32 px-3 py-2 border-r border-border flex-shrink-0 text-xs truncate">
                        {child.assignee}
                      </div>
                      <div className="w-28 px-3 py-2 border-r border-border flex-shrink-0 font-mono text-xs">
                        ${child.amount.toLocaleString()}
                      </div>
                      <div className="w-24 px-3 py-2 border-r border-border flex-shrink-0 text-xs text-muted-foreground">
                        {child.date}
                      </div>
                      <div className="w-36 px-3 py-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Progress value={child.progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-7 text-right">{child.progress}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </div>
          ) : (
            /* ── Detail info panel ── */
            <div className="p-4 bg-secondary/30 overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <div className="w-0.5 h-3 bg-muted-foreground/40 rounded-full" />
                Row details
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{row.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p>{row.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p>{row.department}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">All Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {row.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reference</Label>
                  <a
                    href={row.reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {row.reference.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p>{new Date(row.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

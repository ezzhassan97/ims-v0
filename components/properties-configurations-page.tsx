"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Check,
  ChevronDown,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Home,
  Layers,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── Reference data ─────────────────────────────────────────────────────────────
const DEVELOPERS = ["Palm Hills", "SODIC", "Mountain View", "Emaar Misr", "Lasirena Group", "Hassan Allam", "Tatweer Misr"]
const PROPERTY_TYPES = ["Apartment", "Villa", "Chalet", "Duplex", "Townhouse", "Penthouse", "Studio", "Office", "Retail", "Clinic"]

// Compounds as a nested tree: main project → phases. Phaseless mains are selectable directly.
interface CompoundNode { name: string; phases: string[] }
const COMPOUND_TREE: CompoundNode[] = [
  { name: "Marassi", phases: ["Marassi — Phase 1", "Marassi — Phase 2", "Marassi — Phase 3"] },
  { name: "Palm Hills October", phases: ["Palm Hills October — Phase 1", "Palm Hills October — Phase 2"] },
  { name: "SODIC West", phases: ["SODIC West — Villette", "SODIC West — Eastown"] },
  { name: "North Bay", phases: ["North Bay — Phase 1", "North Bay — Phase 2"] },
  { name: "Mountain View iCity", phases: ["Mountain View iCity — District 1", "Mountain View iCity — District 2"] },
  { name: "Hacienda Bay", phases: [] },
  { name: "Villette", phases: [] },
  { name: "Bloomfields", phases: [] },
]
const leavesOfNode = (c: CompoundNode) => (c.phases.length > 0 ? c.phases : [c.name])
const ALL_COMPOUND_LEAVES = COMPOUND_TREE.flatMap(leavesOfNode)
const phaseShort = (p: string) => p.split("—").pop()!.trim()

// Collapse a flat list of selected leaves into compact display chips ("Marassi (all)", phase names, …)
function summarizeCompounds(selected: string[]): string[] {
  const set = new Set(selected)
  const chips: string[] = []
  for (const c of COMPOUND_TREE) {
    if (c.phases.length === 0) {
      if (set.has(c.name)) chips.push(c.name)
    } else {
      const sel = c.phases.filter((p) => set.has(p))
      if (sel.length === 0) continue
      if (sel.length === c.phases.length) chips.push(`${c.name} (all)`)
      else sel.forEach((p) => chips.push(p))
    }
  }
  return chips
}

// ── Types ────────────────────────────────────────────────────────────────────
type DevTypeStatus = "Active" | "Inactive"
interface DevType {
  id: string
  nameEn: string
  nameAr: string
  developer: string // single developer
  compounds: string[] // selected leaves (phases, or phaseless main names)
  propertyTypes: string[]
  availableUnits: number
  totalUnits: number
  status: DevTypeStatus
  createdAt: string
  updatedAt: string
}

// Fields managed by the create/edit form (units are derived from linked properties)
type DevTypeForm = Pick<DevType, "nameEn" | "nameAr" | "developer" | "compounds" | "propertyTypes" | "status">

const BASE_TS = new Date("2026-05-18T13:00:00Z").getTime()

const SEED: Omit<DevType, "id" | "createdAt" | "updatedAt">[] = [
  {
    nameEn: "iVilla",
    nameAr: "آي فيلا",
    developer: "SODIC",
    compounds: ["SODIC West — Villette", "SODIC West — Eastown"],
    propertyTypes: ["Villa", "Townhouse"],
    availableUnits: 128,
    totalUnits: 340,
    status: "Active",
  },
  {
    nameEn: "Svilla",
    nameAr: "إس فيلا",
    developer: "SODIC",
    compounds: ["SODIC West — Villette"],
    propertyTypes: ["Villa", "Penthouse"],
    availableUnits: 76,
    totalUnits: 210,
    status: "Active",
  },
  {
    nameEn: "S - Loft",
    nameAr: "إس لوفت",
    developer: "Palm Hills",
    compounds: ["Palm Hills October — Phase 1", "Palm Hills October — Phase 2"],
    propertyTypes: ["Apartment", "Studio", "Duplex"],
    availableUnits: 240,
    totalUnits: 512,
    status: "Active",
  },
  {
    nameEn: "Premium Condos",
    nameAr: "شقق بريميوم",
    developer: "Emaar Misr",
    compounds: ["Marassi — Phase 1", "Marassi — Phase 2", "Marassi — Phase 3"],
    propertyTypes: ["Apartment", "Penthouse"],
    availableUnits: 34,
    totalUnits: 96,
    status: "Active",
  },
  {
    nameEn: "Luxury Apartment",
    nameAr: "شقة فاخرة",
    developer: "Mountain View",
    compounds: ["Mountain View iCity — District 1", "Mountain View iCity — District 2"],
    propertyTypes: ["Apartment", "Townhouse"],
    availableUnits: 0,
    totalUnits: 148,
    status: "Inactive",
  },
  {
    nameEn: "Garden Villas",
    nameAr: "فيلات الحديقة",
    developer: "Hassan Allam",
    compounds: ["Hacienda Bay"],
    propertyTypes: ["Villa", "Townhouse"],
    availableUnits: 18,
    totalUnits: 60,
    status: "Inactive",
  },
]

const INITIAL_DEV_TYPES: DevType[] = SEED.map((s, i) => ({
  ...s,
  id: `DVT-${String(101 + i)}`,
  updatedAt: new Date(BASE_TS - i * 86_400_000 * 2.3).toISOString(),
  createdAt: new Date(BASE_TS - i * 86_400_000 * 2.3 - 30 * 86_400_000).toISOString(),
}))

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDate()
  const mon = MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${day} ${mon} ${year}, ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
}

// Estimate how editing a developer type affects the titles of its linked units.
// Prototype heuristic (no live linkage engine): derived from the mapping diff.
interface TitleImpact { removed: number; added: number; retitled: number }
function computeTitleImpact(initial: DevType, form: DevTypeForm): TitleImpact {
  const PER = 7 // dummy "units per mapping item"
  const devChanged = initial.developer !== form.developer
  const nameChanged = initial.nameEn !== form.nameEn || initial.nameAr !== form.nameAr

  const initC = new Set(initial.compounds)
  const formC = new Set(form.compounds)
  const compoundsAdded = form.compounds.filter((c) => !initC.has(c)).length
  const compoundsRemoved = initial.compounds.filter((c) => !formC.has(c)).length
  const initP = new Set(initial.propertyTypes)
  const formP = new Set(form.propertyTypes)
  const ptAdded = form.propertyTypes.filter((p) => !initP.has(p)).length
  const ptRemoved = initial.propertyTypes.filter((p) => !formP.has(p)).length

  let removed = 0
  let added = 0
  let retitled = 0
  if (devChanged) {
    // Moving to another developer: the whole current set loses the title; a fresh set gains it.
    removed = initial.totalUnits
    added = (compoundsAdded + ptAdded + 1) * PER
  } else {
    removed = (compoundsRemoved + ptRemoved) * PER
    added = (compoundsAdded + ptAdded) * PER
    if (nameChanged) retitled = Math.max(0, initial.totalUnits - removed)
  }
  return { removed, added, retitled }
}

// ── Copyable ID (copy icon on hover) ───────────────────────────────────────────
function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="group/copy inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
      title="Copy ID"
    >
      {id}
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover/copy:opacity-100" />}
    </button>
  )
}

// ── Linked-units indicator (available / total) ──────────────────────────────────
function LinkedUnits({ available, total }: { available: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>
  const pct = Math.round((available / total) * 100)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center gap-1 text-xs tabular-nums">
          <span className={cn("font-semibold", available === 0 ? "text-muted-foreground" : "text-emerald-600")}>{available}</span>
          <span className="text-muted-foreground">/ {total}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="px-3 py-2 text-[11px]">
        {available} available of {total} linked properties ({pct}%)
      </TooltipContent>
    </Tooltip>
  )
}

// ── Flat searchable multi-select (developer filter, property types, status) ──────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  width,
  searchable = true,
  triggerClassName,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  width?: string
  searchable?: boolean
  triggerClassName?: string
}) {
  const [q, setQ] = useState("")
  const filtered = useMemo(() => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options), [q, options])
  const hasVal = selected.size > 0
  const display = selected.size === 0 ? label : selected.size === 1 ? [...selected][0] : `${label} · ${selected.size}`
  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger asChild>
        <Button variant={hasVal ? "default" : "outline"} size="sm" className={cn("h-8 justify-between min-w-0 px-2.5 text-xs", width, triggerClassName)}>
          <span className="truncate">{display}</span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start" sideOffset={4}>
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="h-8 pl-7 text-xs" />
          </div>
        )}
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {filtered.map((opt) => {
            const isChecked = selected.has(opt)
            return (
              <button
                key={opt}
                onClick={() => {
                  const next = new Set(selected)
                  isChecked ? next.delete(opt) : next.add(opt)
                  onChange(next)
                }}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors", isChecked ? "bg-primary/10 text-primary" : "hover:bg-muted")}
              >
                <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors", isChecked ? "border-primary bg-primary" : "border-border")}>
                  {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
        </div>
        {hasVal && (
          <div className="mt-1.5 border-t border-border pt-1.5">
            <button onClick={() => onChange(new Set())} className="w-full rounded-md py-1 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Clear selection</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Nested compound select (main project → phases) ───────────────────────────────
function NestedCompoundSelect({
  selected,
  onChange,
  label = "Compounds",
  triggerClassName,
}: {
  selected: Set<string>
  onChange: (s: Set<string>) => void
  label?: string
  triggerClassName?: string
}) {
  const [q, setQ] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const m = (t: string) => t.toLowerCase().includes(q.toLowerCase())
  const visible = useMemo(() => {
    if (!q) return COMPOUND_TREE
    return COMPOUND_TREE.map((c) => {
      if (m(c.name)) return c
      const ph = c.phases.filter(m)
      return ph.length ? { ...c, phases: ph } : null
    }).filter(Boolean) as CompoundNode[]
  }, [q])

  const mainState = (c: CompoundNode): "all" | "some" | "none" => {
    const leaves = leavesOfNode(c)
    const sel = leaves.filter((l) => selected.has(l)).length
    return sel === 0 ? "none" : sel === leaves.length ? "all" : "some"
  }
  const toggleMain = (c: CompoundNode) => {
    const leaves = leavesOfNode(c)
    const next = new Set(selected)
    if (mainState(c) === "all") leaves.forEach((l) => next.delete(l))
    else leaves.forEach((l) => next.add(l))
    onChange(next)
  }
  const toggleLeaf = (l: string) => {
    const next = new Set(selected)
    next.has(l) ? next.delete(l) : next.add(l)
    onChange(next)
  }
  const hasVal = selected.size > 0

  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger asChild>
        <Button variant={hasVal ? "default" : "outline"} size="sm" className={cn("h-8 justify-between min-w-0 px-2.5 text-xs", triggerClassName)}>
          <span className="truncate">{hasVal ? `${label} · ${selected.size}` : label}</span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" sideOffset={4}>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search compounds…" className="h-8 pl-7 text-xs" />
        </div>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {visible.map((c) => {
            const st = mainState(c)
            const hasPhases = c.phases.length > 0
            const isExpanded = expanded.has(c.name) || !!q
            return (
              <div key={c.name}>
                <div className="flex items-center gap-1">
                  {hasPhases ? (
                    <button
                      onClick={() => setExpanded((prev) => { const n = new Set(prev); n.has(c.name) ? n.delete(c.name) : n.add(c.name); return n })}
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                  ) : (
                    <span className="w-4" />
                  )}
                  <button onClick={() => toggleMain(c)} className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs hover:bg-muted">
                    <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border", st === "all" ? "border-primary bg-primary" : st === "some" ? "border-primary bg-primary/20" : "border-border")}>
                      {st === "all" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      {st === "some" && <Minus className="h-2.5 w-2.5 text-primary" />}
                    </span>
                    <span className="truncate font-medium">{c.name}</span>
                    {hasPhases && <span className="ml-auto text-[10px] text-muted-foreground">{c.phases.length} phases</span>}
                  </button>
                </div>
                {hasPhases && isExpanded && (
                  <div className="ml-6 space-y-0.5 border-l border-border pl-2">
                    {c.phases.map((p) => {
                      const checked = selected.has(p)
                      return (
                        <button key={p} onClick={() => toggleLeaf(p)} className={cn("flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs", checked ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
                          <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary" : "border-border")}>
                            {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </span>
                          <span className="truncate">{phaseShort(p)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {visible.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
        </div>
        {hasVal && (
          <div className="mt-1.5 border-t border-border pt-1.5">
            <button onClick={() => onChange(new Set())} className="w-full rounded-md py-1 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Clear selection</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ── Chip list cell ──────────────────────────────────────────────────────────────
function ChipList({ values, max = 2, tone = "default" }: { values: string[]; max?: number; tone?: "default" | "blue" | "violet" }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>
  const shown = values.slice(0, max)
  const rest = values.length - shown.length
  const toneCls =
    tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" : tone === "violet" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-border bg-muted/60 text-foreground"
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((v) => (
        <span key={v} className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium", toneCls)}>{v}</span>
      ))}
      {rest > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">+{rest}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs px-3 py-2">
            <div className="flex flex-col gap-0.5">{values.slice(max).map((v) => <span key={v} className="text-[11px]">{v}</span>)}</div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// ── Add / Edit drawer ─────────────────────────────────────────────────────────
function DevTypeEditor({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: DevType | null
  onClose: () => void
  onSave: (data: DevTypeForm, id: string | null) => void
}) {
  const [nameEn, setNameEn] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [developer, setDeveloper] = useState("")
  const [compounds, setCompounds] = useState<Set<string>>(new Set())
  const [propertyTypes, setPropertyTypes] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<DevTypeStatus>("Active")
  const [confirm, setConfirm] = useState<{ form: DevTypeForm; impact: TitleImpact } | null>(null)

  useEffect(() => {
    if (open) {
      setNameEn(initial?.nameEn ?? "")
      setNameAr(initial?.nameAr ?? "")
      setDeveloper(initial?.developer ?? "")
      setCompounds(new Set(initial?.compounds ?? []))
      setPropertyTypes(new Set(initial?.propertyTypes ?? []))
      setStatus(initial?.status ?? "Active")
      setConfirm(null)
    }
  }, [open, initial])

  const canSave = nameEn.trim().length > 0 && nameAr.trim().length > 0 && developer.length > 0

  const buildForm = (): DevTypeForm => ({ nameEn: nameEn.trim(), nameAr: nameAr.trim(), developer, compounds: [...compounds], propertyTypes: [...propertyTypes], status })
  const handleSave = () => {
    const form = buildForm()
    if (initial) setConfirm({ form, impact: computeTitleImpact(initial, form) })
    else onSave(form, null)
  }

  const removeCompoundChip = (chip: string) => {
    const next = new Set(compounds)
    if (chip.endsWith(" (all)")) {
      const mainName = chip.slice(0, chip.length - 6)
      COMPOUND_TREE.find((c) => c.name === mainName)?.phases.forEach((p) => next.delete(p))
    } else {
      next.delete(chip)
    }
    setCompounds(next)
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-[560px] flex-col p-0 sm:max-w-[560px]">
        <div className="border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold">{initial ? "Edit Developer Type" : "New Developer Type"}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {initial ? `Update ${initial.nameEn} and its mapping.` : "Define a developer type and link it to a developer, compounds, and property types."}
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {initial && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Currently linked: <strong className={initial.availableUnits === 0 ? "text-muted-foreground" : "text-emerald-600"}>{initial.availableUnits}</strong> available / <strong>{initial.totalUnits}</strong> total units. Saving changes may update these units&apos; titles.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name (English) <span className="text-red-500">*</span></label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Premium Residential" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Name (Arabic) <span className="text-red-500">*</span></label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: سكني فاخر" dir="rtl" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Developer <span className="text-red-500">*</span></label>
            <Select value={developer} onValueChange={setDeveloper}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select developer…" /></SelectTrigger>
              <SelectContent>{DEVELOPERS.map((d) => <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Compounds — nested */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /> Linked Compounds
              {compounds.size > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{compounds.size}</Badge>}
            </label>
            <NestedCompoundSelect selected={compounds} onChange={setCompounds} triggerClassName="w-full" />
            <p className="text-[11px] text-muted-foreground">Select a main compound to include all its phases, or expand to pick individual phases.</p>
            {compounds.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {summarizeCompounds([...compounds]).map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {chip}
                    <button onClick={() => removeCompoundChip(chip)} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Property types */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Home className="h-3.5 w-3.5 text-muted-foreground" /> Linked Property Types
              {propertyTypes.size > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{propertyTypes.size}</Badge>}
            </label>
            <MultiSelect label="Select property types" options={PROPERTY_TYPES} selected={propertyTypes} onChange={setPropertyTypes} triggerClassName="w-full" />
            {propertyTypes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[...propertyTypes].map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {v}
                    <button onClick={() => { const n = new Set(propertyTypes); n.delete(v); setPropertyTypes(n) }} className="hover:text-primary/60"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-xs text-muted-foreground">{status === "Active" ? "Visible and usable in mappings" : "Hidden from active use"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{status}</span>
              <Switch checked={status === "Active"} onCheckedChange={(c) => setStatus(c ? "Active" : "Inactive")} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave}>
            {initial ? "Save changes" : "Create developer type"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    {/* Edit confirmation — unit title impact */}
    <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm changes</DialogTitle>
        </DialogHeader>
        {confirm && (() => {
          const { added, removed, retitled } = confirm.impact
          const none = added === 0 && removed === 0 && retitled === 0
          return (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">
                {none ? "These changes don't affect any linked unit titles." : "Saving these changes will update the titles of the linked units:"}
              </p>
              {!none && (
                <div className="space-y-2">
                  {added > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <Plus className="mt-0.5 h-4 w-4 shrink-0" />
                      <span><strong>{added}</strong> unit{added !== 1 ? "s" : ""} will have the developer type <strong>added</strong> to {added !== 1 ? "their" : "its"} title.</span>
                    </div>
                  )}
                  {removed > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                      <span><strong>{removed}</strong> unit{removed !== 1 ? "s" : ""} will have the developer type <strong>removed</strong> from {removed !== 1 ? "their" : "its"} title.</span>
                    </div>
                  )}
                  {retitled > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <Pencil className="mt-0.5 h-4 w-4 shrink-0" />
                      <span><strong>{retitled}</strong> unit{retitled !== 1 ? "s" : ""} will have {retitled !== 1 ? "their titles" : "its title"} <strong>updated</strong> to the new name “{confirm.form.nameEn}”.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button size="sm" onClick={() => { if (confirm) onSave(confirm.form, initial?.id ?? null); setConfirm(null) }}>Confirm &amp; save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

// ── View drawer (read-only) ──────────────────────────────────────────────────────
function ViewDrawer({ devType, onClose, onEdit, onDelete }: { devType: DevType | null; onClose: () => void; onEdit: (d: DevType) => void; onDelete: (d: DevType) => void }) {
  if (!devType) return null
  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  )
  return (
    <Sheet open={!!devType} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-[560px] flex-col p-0 sm:max-w-[560px]">
        <div className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{devType.nameEn}</h2>
            <Badge variant="outline" className={cn("ml-1 text-xs", devType.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500")}>{devType.status}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-sm text-muted-foreground" dir="rtl">{devType.nameAr}</span>
            <CopyId id={devType.id} />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Section label="Developer">
              <p className="flex items-center gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{devType.developer}</p>
            </Section>
            <Section label="Linked Units">
              <p className="text-sm tabular-nums">
                <span className={cn("font-semibold", devType.availableUnits === 0 ? "text-muted-foreground" : "text-emerald-600")}>{devType.availableUnits}</span>
                <span className="text-muted-foreground"> / {devType.totalUnits} properties</span>
                {devType.totalUnits > 0 && <span className="ml-1 text-xs text-muted-foreground">({Math.round((devType.availableUnits / devType.totalUnits) * 100)}% available)</span>}
              </p>
            </Section>
          </div>
          <Section label={`Linked Compounds · ${devType.compounds.length}`}>
            {devType.compounds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {summarizeCompounds(devType.compounds).map((c) => (
                  <span key={c} className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs">{c}</span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No compounds linked.</p>}
          </Section>
          <Section label={`Linked Property Types · ${devType.propertyTypes.length}`}>
            {devType.propertyTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {devType.propertyTypes.map((p) => (
                  <span key={p} className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{p}</span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No property types linked.</p>}
          </Section>
          <Separator />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Section label="Created at"><p className="text-sm">{formatDateTime(devType.createdAt)}</p></Section>
            <Section label="Last updated"><p className="text-sm">{formatDateTime(devType.updatedAt)}</p></Section>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(devType)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" onClick={() => onEdit(devType)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Bulk edit mapping dialog ─────────────────────────────────────────────────────
// Compact list of the developer types a bulk change will apply to
function AffectedTypesList({ targets }: { targets: DevType[] }) {
  return (
    <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border">
      {targets.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{t.nameEn}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">{t.propertyTypes.length} property type{t.propertyTypes.length !== 1 ? "s" : ""}</span>
        </div>
      ))}
    </div>
  )
}

// Bulk edit mapping — property types only
type PTAction = "add" | "remove" | "removeAll"
function BulkMappingDialog({ open, targets, onClose, onApply }: { open: boolean; targets: DevType[]; onClose: () => void; onApply: (action: PTAction, values: string[]) => void }) {
  const [action, setAction] = useState<PTAction>("add")
  const [propertyTypes, setPropertyTypes] = useState<Set<string>>(new Set())
  const count = targets.length

  useEffect(() => {
    if (open) { setAction("add"); setPropertyTypes(new Set()) }
  }, [open])

  const canApply = action === "removeAll" || propertyTypes.size > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /> Bulk edit property types</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Applying to {count} selected developer type{count !== 1 ? "s" : ""}</p>
            <AffectedTypesList targets={targets} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Action</label>
            <Select value={action} onValueChange={(v) => setAction(v as PTAction)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add property types</SelectItem>
                <SelectItem value="remove">Remove property types</SelectItem>
                <SelectItem value="removeAll">Remove all property types</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "removeAll" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              This will clear <strong>all</strong> property types from the {count} selected developer type{count !== 1 ? "s" : ""}.
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Property types to {action === "add" ? "add" : "remove"}</label>
              <MultiSelect label="Select property types" options={PROPERTY_TYPES} selected={propertyTypes} onChange={setPropertyTypes} triggerClassName="w-full" />
              {propertyTypes.size > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[...propertyTypes].map((p) => <span key={p} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">{p}</span>)}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canApply} onClick={() => onApply(action, [...propertyTypes])}>
            {action === "removeAll" ? "Remove all" : action === "add" ? `Add ${propertyTypes.size || ""} property type${propertyTypes.size !== 1 ? "s" : ""}` : `Remove ${propertyTypes.size || ""} property type${propertyTypes.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Shared list of affected dev types with their unit counts (used by status-change & delete)
function AffectedUnitsList({ targets }: { targets: DevType[] }) {
  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border">
      {targets.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{t.nameEn}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{t.id}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums">
            <span className={cn("font-semibold", t.availableUnits === 0 ? "text-muted-foreground" : "text-emerald-600")}>{t.availableUnits}</span>
            <span className="text-muted-foreground"> / {t.totalUnits} units</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Bulk change status
function ChangeStatusDialog({ targets, onClose, onConfirm }: { targets: DevType[] | null; onClose: () => void; onConfirm: (status: DevTypeStatus) => void }) {
  const [status, setStatus] = useState<DevTypeStatus>("Active")
  useEffect(() => { if (targets) setStatus("Active") }, [targets])
  if (!targets) return null
  const count = targets.length
  const totalUnits = targets.reduce((s, t) => s + t.totalUnits, 0)
  const availableUnits = targets.reduce((s, t) => s + t.availableUnits, 0)

  return (
    <Dialog open={!!targets} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /> Change status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Set <strong>{count}</strong> developer type{count !== 1 ? "s" : ""} to</span>
            <Select value={status} onValueChange={(v) => setStatus(v as DevTypeStatus)}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Affected developer types &amp; linked units</p>
            <AffectedUnitsList targets={targets} />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            The titles of the <strong>{availableUnits}</strong> available (of <strong>{totalUnits}</strong> total) linked unit{totalUnits !== 1 ? "s" : ""} will be updated accordingly to reflect the new status.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(status)}>Change to {status}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation ──────────────────────────────────────────────────────────
function DeleteDialog({ targets, onClose, onConfirm }: { targets: DevType[] | null; onClose: () => void; onConfirm: () => void }) {
  if (!targets) return null
  const count = targets.length
  const totalUnits = targets.reduce((s, t) => s + t.totalUnits, 0)
  const availableUnits = targets.reduce((s, t) => s + t.availableUnits, 0)
  return (
    <Dialog open={!!targets} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Delete {count} developer type{count !== 1 ? "s" : ""}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">Affected developer types &amp; linked units</p>
            <AffectedUnitsList targets={targets} />
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
            The titles of the <strong>{availableUnits}</strong> available (of <strong>{totalUnits}</strong> total) linked unit{totalUnits !== 1 ? "s" : ""} will be updated accordingly. <strong>This action cannot be undone.</strong>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={onConfirm}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete {count !== 1 ? `${count} types` : "type"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Developer Types tab ─────────────────────────────────────────────────────────
function DeveloperTypesTab() {
  const [rows, setRows] = useState<DevType[]>(INITIAL_DEV_TYPES)
  const [search, setSearch] = useState("")
  const [developerFilter, setDeveloperFilter] = useState<Set<string>>(new Set())
  const [compoundFilter, setCompoundFilter] = useState<Set<string>>(new Set())
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<{ initial: DevType | null } | null>(null)
  const [viewTarget, setViewTarget] = useState<DevType | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<DevType[] | null>(null)
  const [statusTargets, setStatusTargets] = useState<DevType[] | null>(null)
  const [showBulkMapping, setShowBulkMapping] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.nameEn.toLowerCase().includes(q) && !r.nameAr.includes(q) && !r.id.toLowerCase().includes(q)) return false
      if (developerFilter.size > 0 && !developerFilter.has(r.developer)) return false
      if (compoundFilter.size > 0 && !r.compounds.some((c) => compoundFilter.has(c))) return false
      if (propertyTypeFilter.size > 0 && !r.propertyTypes.some((p) => propertyTypeFilter.has(p))) return false
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false
      return true
    })
  }, [rows, search, developerFilter, compoundFilter, propertyTypeFilter, statusFilter])

  const hasFilters = !!search || developerFilter.size > 0 || compoundFilter.size > 0 || propertyTypeFilter.size > 0 || statusFilter.size > 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize])

  useEffect(() => { setCurrentPage((p) => Math.min(p, totalPages)) }, [totalPages])
  useEffect(() => { setCurrentPage(1) }, [search, developerFilter, compoundFilter, propertyTypeFilter, statusFilter, pageSize])

  const clearAll = () => { setSearch(""); setDeveloperFilter(new Set()); setCompoundFilter(new Set()); setPropertyTypeFilter(new Set()); setStatusFilter(new Set()) }
  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const saveDevType = (data: DevTypeForm, id: string | null) => {
    const now = new Date(BASE_TS).toISOString()
    if (id) setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data, updatedAt: now } : r)))
    else {
      const nextNum = rows.reduce((m, r) => Math.max(m, parseInt(r.id.replace("DVT-", "")) || 0), 100) + 1
      setRows((prev) => [{ ...data, id: `DVT-${nextNum}`, availableUnits: 0, totalUnits: 0, createdAt: now, updatedAt: now }, ...prev])
    }
    setEditor(null)
  }

  const performDelete = (ids: string[]) => {
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n })
    setDeleteTargets(null)
    setViewTarget(null)
  }

  const applyBulkPropertyTypes = (action: PTAction, values: string[]) => {
    const now = new Date(BASE_TS).toISOString()
    setRows((prev) =>
      prev.map((r) => {
        if (!selected.has(r.id)) return r
        if (action === "removeAll") return { ...r, propertyTypes: [], updatedAt: now }
        const cur = new Set(r.propertyTypes)
        if (action === "add") values.forEach((v) => cur.add(v))
        else values.forEach((v) => cur.delete(v))
        return { ...r, propertyTypes: [...cur], updatedAt: now }
      }),
    )
    setShowBulkMapping(false)
  }

  const applyStatusChange = (status: DevTypeStatus) => {
    const now = new Date(BASE_TS).toISOString()
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status, updatedAt: now } : r)))
    setStatusTargets(null)
  }

  const selectedRows = rows.filter((r) => selected.has(r.id))

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <div className="relative w-80 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, description or ID" className="h-8 w-full pl-8 pr-7 text-sm" />
            {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <MultiSelect label="Developer" options={DEVELOPERS} selected={developerFilter} onChange={setDeveloperFilter} width="flex-1" />
            <NestedCompoundSelect label="Compound" selected={compoundFilter} onChange={setCompoundFilter} triggerClassName="flex-1" />
            <MultiSelect label="Property Type" options={PROPERTY_TYPES} selected={propertyTypeFilter} onChange={setPropertyTypeFilter} width="flex-1" />
            <MultiSelect label="Status" options={["Active", "Inactive"]} selected={statusFilter} onChange={setStatusFilter} width="flex-1" searchable={false} />
          </div>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}><X className="mr-1 h-3.5 w-3.5" /> Clear All</Button>
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={paginated.length > 0 && paginated.every((r) => selected.has(r.id))}
              onCheckedChange={(c) => setSelected((prev) => { const n = new Set(prev); if (c) paginated.forEach((r) => n.add(r.id)); else paginated.forEach((r) => n.delete(r.id)); return n })}
            />
            <span className="text-sm font-semibold text-foreground">Developer Types</span>
            <Badge className="border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100">{filtered.length.toLocaleString()}</Badge>
            {hasFilters && <span className="text-xs text-muted-foreground">Filtered</span>}
          </div>
          <Button size="sm" className="h-8" onClick={() => setEditor({ initial: null })}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Developer Type</Button>
        </div>

        {/* Select-all banner */}
        {(() => {
          const pageFull = paginated.length > 0 && paginated.every((r) => selected.has(r.id))
          const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.id))
          const more = filtered.length > paginated.length
          if (!pageFull || !more) return null
          return (
            <div className="flex items-center justify-center gap-2 border-b border-border bg-blue-50 px-4 py-2 text-xs dark:bg-blue-950/30">
              {allSel ? (
                <><span className="text-blue-800 dark:text-blue-200">All <strong>{filtered.length}</strong> developer types are selected.</span><button onClick={() => setSelected(new Set())} className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Clear selection</button></>
              ) : (
                <><span className="text-blue-800 dark:text-blue-200">All <strong>{paginated.length}</strong> on this page are selected.</span><button onClick={() => setSelected(new Set(filtered.map((r) => r.id)))} className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">Select all {filtered.length}</button></>
              )}
            </div>
          )
        })()}

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
              <div className="rounded-full bg-secondary p-4"><Layers className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-sm font-medium">No developer types found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or filters, or add a new developer type.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 border-r border-border bg-muted px-3 py-2" />
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">Developer Type</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Developer Type (AR)</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">Developer</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">Compounds</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">Property Types</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Linked Units</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Created At</th>
                  <th className="border-r border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Last Updated</th>
                  <th className="sticky right-0 z-20 w-12 bg-muted px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const isSelected = selected.has(r.id)
                  return (
                    <tr key={r.id} className={cn("group border-b border-border transition-colors", isSelected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50")}>
                      <td className="border-r border-border px-3 py-2.5" onClick={(e) => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(r.id)} /></td>
                      <td className="border-r border-border px-3 py-2.5">
                        <span className="font-medium text-foreground">{r.nameEn}</span>
                        <div className="mt-0.5"><CopyId id={r.id} /></div>
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-sm" dir="rtl">{r.nameAr}</td>
                      <td className="border-r border-border px-3 py-2.5"><ChipList values={[r.developer]} tone="blue" /></td>
                      <td className="border-r border-border px-3 py-2.5"><ChipList values={summarizeCompounds(r.compounds)} /></td>
                      <td className="border-r border-border px-3 py-2.5"><ChipList values={r.propertyTypes} tone="violet" /></td>
                      <td className="border-r border-border px-3 py-2.5"><LinkedUnits available={r.availableUnits} total={r.totalUnits} /></td>
                      <td className="border-r border-border px-3 py-2.5"><Badge variant="outline" className={cn("text-xs", r.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500")}>{r.status}</Badge></td>
                      <td className="border-r border-border px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                      <td className="border-r border-border px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.updatedAt)}</td>
                      <td className="sticky right-0 z-10 bg-card px-3 py-2.5 group-hover:bg-muted/50">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => setViewTarget(r)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditor({ initial: r })}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTargets([r])} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8"><FileDown className="mr-1.5 h-4 w-4" />Export<ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                  <DropdownMenuItem><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><FileDown className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span>{`${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`} of {filtered.length.toLocaleString()} types</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{["10", "20", "30", "50"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1 px-1 text-sm">Page<Input type="number" value={currentPage} onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v) }} className="h-8 w-14 text-center" min={1} max={totalPages} />of {totalPages}</div>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 select-none items-center gap-0 overflow-hidden rounded-xl bg-zinc-900 text-sm text-white shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="font-semibold tabular-nums">{selected.size} selected</span>
            {filtered.length > selected.size ? (
              <button onClick={() => setSelected(new Set(filtered.map((r) => r.id)))} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Select all {filtered.length}</button>
            ) : (
              <button onClick={() => setSelected(new Set())} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Clear</button>
            )}
          </div>
          <div className="h-8 w-px bg-zinc-700" />
          <button onClick={() => setShowBulkMapping(true)} className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"><Home className="h-3.5 w-3.5 text-zinc-400" /> Edit property types</button>
          <div className="h-8 w-px bg-zinc-700" />
          <button onClick={() => setStatusTargets(selectedRows)} className="flex items-center gap-1.5 px-4 py-2.5 transition-colors hover:bg-zinc-800"><ArrowRightLeft className="h-3.5 w-3.5 text-zinc-400" /> Change status</button>
          <div className="h-8 w-px bg-zinc-700" />
          <button onClick={() => setDeleteTargets(selectedRows)} className="flex items-center gap-1.5 px-4 py-2.5 text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          <div className="h-8 w-px bg-zinc-700" />
          <button onClick={() => setSelected(new Set())} className="px-3 py-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Editor / view / dialogs */}
      <DevTypeEditor open={!!editor} initial={editor?.initial ?? null} onClose={() => setEditor(null)} onSave={saveDevType} />
      <ViewDrawer
        devType={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={(d) => { setViewTarget(null); setEditor({ initial: d }) }}
        onDelete={(d) => setDeleteTargets([d])}
      />
      <BulkMappingDialog open={showBulkMapping} targets={selectedRows} onClose={() => setShowBulkMapping(false)} onApply={applyBulkPropertyTypes} />
      <ChangeStatusDialog targets={statusTargets} onClose={() => setStatusTargets(null)} onConfirm={applyStatusChange} />
      <DeleteDialog targets={deleteTargets} onClose={() => setDeleteTargets(null)} onConfirm={() => deleteTargets && performDelete(deleteTargets.map((t) => t.id))} />
    </div>
  )
}

// ── Placeholder tab ──────────────────────────────────────────────────────────────
function ComingSoonTab({ title }: { title: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-center">
      <div className="rounded-full bg-secondary p-4"><Layers className="h-8 w-8 text-muted-foreground" /></div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">This configuration is under development.</p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export function PropertiesConfigurationsPage() {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-4">
        <div className="px-1 pt-1">
          <p className="mb-1 text-xs text-muted-foreground">General Configurations</p>
          <h1 className="text-2xl font-semibold text-foreground">Properties Configurations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage property-level configurations — developer types, mappings, and classification rules across the inventory.</p>
        </div>

        <Tabs defaultValue="developer-types" className="space-y-4">
          <TabsList>
            <TabsTrigger value="developer-types">Developer Types</TabsTrigger>
            <TabsTrigger value="property-types">Property Types</TabsTrigger>
            <TabsTrigger value="finishing-types">Finishing Types</TabsTrigger>
          </TabsList>

          <TabsContent value="developer-types"><DeveloperTypesTab /></TabsContent>
          <TabsContent value="property-types"><ComingSoonTab title="Property Types" /></TabsContent>
          <TabsContent value="finishing-types"><ComingSoonTab title="Finishing Types" /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

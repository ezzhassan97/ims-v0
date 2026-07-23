"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  Search, X, Filter, SlidersHorizontal, ArrowUp, ArrowDown, ArrowUpDown, Group as GroupIcon, Columns3, ChevronDown, Check, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GripVertical, Lock, Unlock, Eye, EyeOff, Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Shared filter option shape ────────────────────────────────────────────────
export type FilterOption = { value: string; label: string; sublabel?: string }
function normalizeOptions(options: (string | FilterOption)[]): FilterOption[] {
  return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o))
}

/**
 * Canonical ID chip used EVERYWHERE across the project — tiny mono, muted, copy-on-hover.
 * Format: an entity-prefixed value (DEV-001, PRJ-0004) shows as-is; a bare value shows "ID: 542".
 * Never "ID# …". Always this size (text-[10px]) so IDs stay smaller than names/tags.
 */
export function IdTag({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const shown = label ?? (/^[A-Za-z]{1,6}[-_]/.test(value) ? value : `ID: ${value}`)
  return (
    <span className={cn("group/id inline-flex items-center gap-1 font-mono text-[10px] leading-none text-muted-foreground", className)}>
      {shown}
      {/* span, not button — IdTag renders inside picker option <button>s and buttons can't nest */}
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
        className="cursor-pointer opacity-0 transition-opacity group-hover/id:opacity-100"
        title="Copy ID"
      >
        {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 hover:text-foreground" />}
      </span>
    </span>
  )
}

/**
 * Lighter-than-rows vertical column separators — apply to every table's `<table>` className.
 * Rows use `divide-border`; columns use `border-border/50` so they read as secondary.
 */
export const COL_SEP =
  "[&_thead_th:not(:last-child)]:border-r [&_thead_th:not(:last-child)]:border-border/50 [&_tbody_td:not(:last-child)]:border-r [&_tbody_td:not(:last-child)]:border-border/50"

/** Canonical single-select filter — flat h-8 white trigger, optional search. Use on every table page. */
export function FilterSelect({
  label, value, options, onChange, className, searchable, width = "w-52",
}: {
  label: string
  value: string
  options: (string | FilterOption)[]
  onChange: (v: string) => void
  className?: string
  /** Force a search box (auto-enabled when > 6 options). */
  searchable?: boolean
  width?: string
}) {
  const opts = normalizeOptions(options)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const showSearch = searchable ?? opts.length > 6

  useEffect(() => { if (open && showSearch) setTimeout(() => inputRef.current?.focus(), 40) }, [open, showSearch])
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const selected = opts.find((o) => o.value === value)
  const filtered = opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
  const active = value !== "" && value !== "all"

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-sm transition-colors hover:bg-muted/50",
          active ? "border-primary text-primary" : "border-input text-foreground",
        )}
      >
        {/* Placeholder muted like FilterMultiSelect so mixed filter rows read uniformly */}
        <span className={cn("truncate text-left", !active && "text-muted-foreground")}>{active && selected ? selected.label : label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className={cn("absolute left-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-md", width)}>
          {showSearch && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-md border border-input bg-white py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60" />
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            <button onClick={() => { onChange(""); setOpen(false); setQ("") }} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary", !active && "text-primary")}>
              <span className="flex h-3.5 w-3.5 items-center justify-center">{!active && <Check className="h-3.5 w-3.5" />}</span>
              {label}
            </button>
            {filtered.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); setQ("") }} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary", value === o.value && "bg-primary/5")}>
                <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center">{value === o.value && <Check className="h-3.5 w-3.5 text-primary" />}</span>
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sublabel && <span className="block truncate font-mono text-[10px] text-muted-foreground">{o.sublabel}</span>}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No results</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/** Canonical multi-select filter — flat h-8 white trigger with count badge, searchable. Use on every table page. */
export function FilterMultiSelect({
  label, options, value, onChange, className, width = "w-52", tone = "primary",
}: {
  label: string
  options: (string | FilterOption)[]
  value: string[]
  onChange: (v: string[]) => void
  className?: string
  width?: string
  /** Active-state colour: "primary" (blue) or "danger" (red, matches the detailed-properties filters). */
  tone?: "primary" | "danger"
}) {
  const activeBorder = tone === "danger" ? "border-red-400 text-red-600" : "border-primary text-primary"
  const activeBadge = tone === "danger" ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
  const opts = normalizeOptions(options)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40) }, [open])
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-sm transition-colors hover:bg-muted/50",
          value.length > 0 ? activeBorder : "border-input text-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate text-left">
          <span className={cn(value.length === 0 && "text-muted-foreground")}>{label}</span>
          {value.length > 0 && <span className={cn("inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold", activeBadge)}>{value.length}</span>}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className={cn("absolute left-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-md", width)}>
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((o) => (
              <div key={o.value} role="option" aria-selected={value.includes(o.value)} onClick={() => toggle(o.value)} className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary", value.includes(o.value) && "bg-primary/5")}>
                <Checkbox checked={value.includes(o.value)} className="pointer-events-none h-4 w-4 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sublabel && <span className="block truncate font-mono text-[10px] text-muted-foreground">{o.sublabel}</span>}
                </span>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No results</p>}
          </div>
          {value.length > 0 && (
            <div className="border-t border-border p-2"><button onClick={() => { onChange([]); setQ("") }} className="text-xs text-primary hover:underline">Clear all</button></div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Unified date-range filter — a single dropdown with From/To date pickers.
 * Use this for EVERY date-range filter across the project (never two loose date inputs).
 */
export function DateRangeFilter({
  dateFrom, dateTo, onChangeFrom, onChangeTo, label = "Date Range", className, withTime = false,
}: {
  dateFrom: string
  dateTo: string
  onChangeFrom: (v: string) => void
  onChangeTo: (v: string) => void
  label?: string
  className?: string
  /** Use datetime-local pickers (date + time) instead of date-only. */
  withTime?: boolean
}) {
  const isActive = !!dateFrom || !!dateTo
  const short = (v: string) => (withTime ? v.replace("T", " ") : v)
  const display = dateFrom && dateTo ? `${short(dateFrom)} – ${short(dateTo)}` : dateFrom ? `From ${short(dateFrom)}` : dateTo ? `To ${short(dateTo)}` : label
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Same typography/tones as FilterSelect so mixed filter rows read uniformly */}
        <button className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-white px-2.5 text-sm transition-colors hover:bg-muted/50",
          isActive ? "border-primary text-primary" : "border-input text-muted-foreground",
          className,
        )}>
          {display}
          {isActive && <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-foreground/20 px-1 text-[10px] font-semibold">1</span>}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
        <div className="space-y-2">
          <div><label className="mb-1 block text-[11px] text-muted-foreground">From</label><Input className="h-8 text-sm" type={withTime ? "datetime-local" : "date"} value={dateFrom} onChange={(e) => onChangeFrom(e.target.value)} /></div>
          <div><label className="mb-1 block text-[11px] text-muted-foreground">To</label><Input className="h-8 text-sm" type={withTime ? "datetime-local" : "date"} value={dateTo} onChange={(e) => onChangeTo(e.target.value)} /></div>
        </div>
        {isActive && <button onClick={() => { onChangeFrom(""); onChangeTo("") }} className="mt-2 w-full rounded-md border-t border-border pt-2 text-center text-xs text-muted-foreground hover:text-foreground">Clear</button>}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Shared table design system (reference: the All Properties → Detailed Properties table).
 * Flat (no shadows), white header with title + blue count tag + optional CTA, a search/filter
 * toolbar with a divider before the control actions, a pagination footer, and a floating black
 * bulk-action bar on selection. Use these across every main table page for consistency.
 */

// ── Flat card wrapper ─────────────────────────────────────────────────────────
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>{children}</div>
}

// ── White header: title + blue count tag + optional CTA ───────────────────────
export function TableCardHeader({ title, count, extra, cta }: { title: string; count?: number; /** Rendered after the count chip (e.g. a second label + count). */ extra?: React.ReactNode; cta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{count.toLocaleString()}</span>
        )}
        {extra}
      </div>
      {cta}
    </div>
  )
}

// ── Search + filters toolbar with a divider before the control actions ────────
export function TableToolbar({
  search, onSearch, searchPlaceholder = "Search…", filters,
  activeFilters = 0, onAllFilters, onAdvancedFilters, onSort, onColumns, groupControl, sortControl,
  hideAdvanced = false, hideGroup = false,
}: {
  search: string
  onSearch: (v: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  activeFilters?: number
  onAllFilters?: () => void
  onAdvancedFilters?: () => void
  onSort?: () => void
  onColumns?: () => void
  /** Optional custom Group control (e.g. a Group-by dropdown). Falls back to a plain "Group" button. */
  groupControl?: React.ReactNode
  /** Optional custom Sort control (e.g. a multi-level sort dropdown). Falls back to a plain "Sort" button. */
  sortControl?: React.ReactNode
  /** Hide the Advanced Filters button (tables without an advanced builder). */
  hideAdvanced?: boolean
  /** Hide the Group control entirely (tables without grouping). */
  hideGroup?: boolean
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
      {/* Row 1: search + page-provided filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className="h-8 pl-8 pr-7 text-sm" />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          )}
        </div>
        {filters}
      </div>

      {/* Divider + control actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex items-center gap-2">
          <Button variant={activeFilters > 0 ? "default" : "outline"} size="sm" className="h-8 gap-1.5" onClick={onAllFilters}>
            <Filter className="h-3.5 w-3.5" />All Filters
            {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-semibold">{activeFilters}</span>}
          </Button>
          {!hideAdvanced && <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAdvancedFilters}><SlidersHorizontal className="h-3.5 w-3.5" />Advanced Filters</Button>}
        </div>
        <div className="flex items-center gap-2">
          {sortControl ?? <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onSort}><ArrowUpDown className="h-3.5 w-3.5" />Sort</Button>}
          {hideGroup ? null : (groupControl ?? <Button variant="outline" size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />Group</Button>)}
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onColumns}><Columns3 className="h-3.5 w-3.5" />Columns</Button>
        </div>
      </div>
    </div>
  )
}

// ── Pagination footer ─────────────────────────────────────────────────────────
export function TableFooter({
  page, pageSize, total, onPage, onPageSize, label = "results", pageSizes = [10, 25, 50, 100],
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize: (n: number) => void
  label?: string
  pageSizes?: number[]
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
        <span className="font-semibold text-foreground">{total.toLocaleString()}</span> {label}
      </p>
      <div className="flex items-center gap-3">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => <SelectItem key={n} value={String(n)} className="text-xs">{n} / page</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(1)} disabled={page === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page - 1)} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <span className="px-3 text-xs font-medium tabular-nums text-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  )
}

// ── Floating black bulk-action bar ────────────────────────────────────────────
export function FloatingBulkBar({
  count, total, onSelectAll, onClear, children,
}: {
  count: number
  total: number
  onSelectAll: () => void
  onClear: () => void
  children?: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 select-none items-center gap-0 overflow-hidden rounded-xl bg-zinc-900 text-sm text-white shadow-2xl">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="font-semibold tabular-nums">{count} selected</span>
        {total > count ? (
          <button onClick={onSelectAll} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Select all {total.toLocaleString()}</button>
        ) : (
          <button onClick={onClear} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white">Clear</button>
        )}
      </div>
      {children}
      <div className="h-8 w-px bg-zinc-700" />
      <button onClick={onClear} className="px-3 py-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  )
}

export function BulkBarButton({ icon, children, danger, onClick }: { icon?: React.ReactNode; children: React.ReactNode; danger?: boolean; onClick?: () => void }) {
  return (
    <>
      <div className="h-8 w-px bg-zinc-700" />
      <button onClick={onClick} className={cn("flex items-center gap-1.5 px-4 py-2.5 transition-colors", danger ? "text-red-300 hover:bg-red-950/50" : "hover:bg-zinc-800")}>
        {icon}{children}
      </button>
    </>
  )
}

/**
 * Canonical "All Filters" side drawer — EVERY table's All Filters button opens this,
 * containing the same filter controls (same order/state) as the toolbar, with
 * Apply Filters + Clear Filters fixed at the bottom.
 */
export function FiltersDrawer({
  open, onClose, activeCount, onClear, children, title = "All Filters",
}: {
  open: boolean
  onClose: () => void
  activeCount: number
  onClear: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="flex w-[420px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            {activeCount > 0 && (
              <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">{activeCount} active</span>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={onClear} disabled={activeCount === 0}>
            <X className="h-3.5 w-3.5 mr-1" />Clear Filters
          </Button>
          <Button size="sm" className="h-8" onClick={onClose}>Apply Filters</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Labelled field wrapper for FiltersDrawer contents. */
export function FilterDrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {children}
    </div>
  )
}

// ── Customize Columns sheet (drag to reorder · toggle visibility · freeze) ────
export type ManagedColumn = { id: string; label: string }

/**
 * Canonical Customize Columns drawer (reference: detailed properties table).
 * Drag rows to reorder, eye to show/hide, lock to freeze (sticky-left) a column.
 */
export function ColumnsSheet({
  open, onClose, columns, order, onOrderChange, hidden, onHiddenChange, frozen, onFrozenChange,
}: {
  open: boolean
  onClose: () => void
  columns: ManagedColumn[]
  order: string[]
  onOrderChange: (o: string[]) => void
  hidden: Set<string>
  onHiddenChange: (h: Set<string>) => void
  frozen: Set<string>
  onFrozenChange: (f: Set<string>) => void
}) {
  const [q, setQ] = useState("")
  const dragIdx = useRef<number | null>(null)
  const byId = new Map(columns.map((c) => [c.id, c]))
  const rows = order.filter((id) => byId.has(id) && byId.get(id)!.label.toLowerCase().includes(q.toLowerCase()))
  const isDefault = hidden.size === 0 && frozen.size === 0 && order.join("|") === columns.map((c) => c.id).join("|")

  const toggleIn = (set: Set<string>, apply: (s: Set<string>) => void, id: string) => {
    const n = new Set(set)
    if (n.has(id)) n.delete(id); else n.add(id)
    apply(n)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="flex w-[420px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle>Customize Columns</SheetTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">Drag to reorder · toggle visibility · lock to freeze</p>
        </SheetHeader>

        <div className="shrink-0 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search columns…" className="h-8 pl-8 text-sm" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
          {rows.map((id) => {
            const col = byId.get(id)!
            const orderIdx = order.indexOf(id)
            const isFrozen = frozen.has(id)
            const isVisible = !hidden.has(id)
            return (
              <div
                key={id}
                draggable={!q}
                onDragStart={() => { dragIdx.current = orderIdx }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (q || dragIdx.current === null || dragIdx.current === orderIdx) return
                  const arr = [...order]
                  arr.splice(orderIdx, 0, ...arr.splice(dragIdx.current, 1))
                  dragIdx.current = orderIdx
                  onOrderChange(arr)
                }}
                onDragEnd={() => { dragIdx.current = null }}
                className={cn(
                  "flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors",
                  !q && "cursor-grab",
                  isFrozen ? "border-primary/30 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className={cn("truncate", !isVisible && "text-muted-foreground line-through")}>{col.label}</span>
                  {isFrozen && <Badge variant="outline" className="flex-shrink-0 border-primary/40 bg-primary/10 text-[10px] text-primary">Frozen</Badge>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", isFrozen && "text-primary")} title={isFrozen ? "Unfreeze column" : "Freeze column"} onClick={() => toggleIn(frozen, onFrozenChange, id)}>
                    {isFrozen ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title={isVisible ? "Hide column" : "Show column"} onClick={() => toggleIn(hidden, onHiddenChange, id)}>
                    {isVisible ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No columns match.</p>}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground"
            disabled={isDefault}
            onClick={() => { onOrderChange(columns.map((c) => c.id)); onHiddenChange(new Set()); onFrozenChange(new Set()) }}
          >
            Reset
          </Button>
          <Button size="sm" className="h-8" onClick={onClose}>Done</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Scrollable tab strip (design system) ──────────────────────────────────────
/**
 * Wrap a TabsList in this when the tabs can overflow: the native scrollbar is
 * hidden and left/right chevrons appear to scroll the strip (trackpad still works).
 */
export function TabStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = () => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  useEffect(() => {
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" })
  const overflows = canLeft || canRight

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {overflows && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canLeft}
          className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors", canLeft ? "hover:bg-secondary hover:text-foreground" : "opacity-40")}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div ref={ref} onScroll={update} className="no-scrollbar overflow-x-auto">
        {children}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canRight}
          className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors", canRight ? "hover:bg-secondary hover:text-foreground" : "opacity-40")}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ── Generic multi-level sort control (design system) ──────────────────────────
export type SortLevel = { key: string; dir: "asc" | "desc" }

/**
 * Canonical multi-level Sort button: add levels, pick a field, asc/desc per level,
 * levels are ranked in order. Use this for EVERY table/grid Sort button.
 */
export function MultiSortControl({ fields, sorts, onChange }: {
  fields: { key: string; label: string }[]
  sorts: SortLevel[]
  onChange: (next: SortLevel[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dragIdx = useRef<number | null>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const used = new Set(sorts.map((s) => s.key))
  const available = fields.filter((f) => !used.has(f.key))

  return (
    <div ref={ref} className="relative">
      <Button variant={sorts.length ? "default" : "outline"} size="sm" className="h-8 gap-1.5" onClick={() => setOpen((v) => !v)}>
        <ArrowUpDown className="h-3.5 w-3.5" />Sort
        {sorts.length > 0 && <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px] font-semibold">{sorts.length}</span>}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-md">
          <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Multi-level sort</p>
          {sorts.length === 0 && <p className="px-3 py-1.5 text-xs text-muted-foreground">No sort applied — add a level below.</p>}
          {sorts.map((s, i) => (
            <div
              key={s.key}
              className="flex cursor-grab items-center gap-2 px-3 py-1.5 active:cursor-grabbing"
              draggable
              onDragStart={() => { dragIdx.current = i }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragIdx.current === null || dragIdx.current === i) return
                const arr = [...sorts]
                arr.splice(i, 0, ...arr.splice(dragIdx.current, 1))
                dragIdx.current = i
                onChange(arr)
              }}
              onDragEnd={() => { dragIdx.current = null }}
            >
              <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <span className="w-4 text-[11px] text-muted-foreground">{i + 1}.</span>
              <span className="flex-1 text-sm">{fields.find((f) => f.key === s.key)?.label ?? s.key}</span>
              <button onClick={() => onChange(sorts.map((x, j) => (j === i ? { ...x, dir: "asc" } : x)))} className={cn("rounded p-1", s.dir === "asc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} title="Ascending"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => onChange(sorts.map((x, j) => (j === i ? { ...x, dir: "desc" } : x)))} className={cn("rounded p-1", s.dir === "desc" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} title="Descending"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => onChange(sorts.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-red-600" title="Remove level"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {available.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Add level</p>
              {available.map((f) => (
                <button key={f.key} onClick={() => onChange([...sorts, { key: f.key, dir: "asc" }])} className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-secondary">+ {f.label}</button>
              ))}
            </>
          )}
          {sorts.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <button onClick={() => { onChange([]); setOpen(false) }} className="flex w-full items-center px-3 py-1.5 text-left text-sm text-red-600 hover:bg-secondary">Clear sort</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Project dropdown grouped by main project (design system) ──────────────────
export type ProjectTreeNode = {
  id: string
  name: string
  status?: "Active" | "Hidden"
  phases: { id: string; name: string; status?: "Active" | "Hidden" }[]
}
/** Single-mode selection: the main project itself or one phase. */
export type ProjectTreeSelection = { kind: "project" | "phase"; id: string; label: string; projectIds: string[] } | null

function ProjStatusTag({ status }: { status?: "Active" | "Hidden" }) {
  if (!status) return null
  return (
    <span className={cn(
      "inline-flex flex-shrink-0 items-center whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-medium",
      status === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-600",
    )}>
      {status}
    </span>
  )
}

/**
 * Canonical searchable Project dropdown, grouped by main project.
 *  - multi: checkbox per row over a plain id set. Checking the MAIN row cascades to all
 *    its phases (tri-state when partially selected); "Main project only" selects just the
 *    main id; phases toggle individually.
 *  - single (default): same rows, no checkboxes — clicking the main row picks the main
 *    project, clicking a phase picks that phase; the picked row is highlighted.
 */
export function ProjectTreeSelect({ label = "Project", projects, value, onChange, values = [], onValuesChange, multi = false, className }: {
  label?: string
  projects: ProjectTreeNode[]
  /** Single mode */
  value?: ProjectTreeSelection
  onChange?: (v: ProjectTreeSelection) => void
  /** Multi mode — the selected project/phase ids */
  values?: string[]
  onValuesChange?: (ids: string[]) => void
  multi?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40) }, [open])
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const needle = q.trim().toLowerCase()
  const visible = projects
    .map((p) => {
      const phaseHits = p.phases.filter((ph) => ph.name.toLowerCase().includes(needle))
      const selfHit = p.name.toLowerCase().includes(needle)
      if (!needle || selfHit) return { ...p, phases: p.phases }
      if (phaseHits.length) return { ...p, phases: phaseHits }
      return null
    })
    .filter(Boolean) as ProjectTreeNode[]

  const set = new Set(values)
  const toggleIds = (ids: string[], on: boolean) => {
    const next = new Set(set)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    onValuesChange?.([...next])
  }

  const active = multi ? values.length > 0 : !!value
  const nameOf = (id: string) => {
    for (const p of projects) {
      if (p.id === id) return p.name
      const ph = p.phases.find((x) => x.id === id)
      if (ph) return ph.name
    }
    return id
  }
  const triggerLabel = multi
    ? (values.length === 0 ? label : values.length === 1 ? nameOf(values[0]) : `${label} · ${values.length}`)
    : (value ? value.label : label)

  const CheckBox = ({ state }: { state: "on" | "off" | "some" }) => (
    <span className={cn(
      "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border transition-colors",
      state === "off" ? "border-border bg-white" : "border-primary bg-primary",
    )}>
      {state === "on" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
      {state === "some" && <Minus className="h-2.5 w-2.5 text-primary-foreground" />}
    </span>
  )

  /** Numeric-only ids in the caption — "ID: 1204", never internal prefixes. */
  const showId = (id: string) => {
    const digits = id.replace(/\D/g, "")
    return digits ? `ID: ${digits}` : null
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-sm transition-colors hover:bg-muted/50",
          active ? "border-primary text-primary" : "border-input text-foreground",
        )}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-md">
          <div className="border-b border-border p-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or phases…" className="w-full rounded-md border border-input bg-white py-1 pl-7 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-0.5">
            <button
              onClick={() => { if (multi) onValuesChange?.([]); else { onChange?.(null); setOpen(false); setQ("") } }}
              className={cn("flex w-full items-center px-2.5 py-1 text-left text-[13px] hover:bg-secondary", !active && "font-medium text-primary")}
            >
              {multi && values.length > 0 ? "Clear selection" : `All ${label}s`}
            </button>
            {visible.map((p) => {
              const familyIds = [p.id, ...p.phases.map((ph) => ph.id)]
              const selectedInFamily = familyIds.filter((id) => set.has(id)).length
              const mainState: "on" | "off" | "some" =
                selectedInFamily === familyIds.length ? "on" : selectedInFamily > 0 ? "some" : "off"
              const isMainSingle = value?.kind === "project" && value.id === p.id
              return (
                <div key={p.id}>
                  {/* Main project — multi: cascades to all phases · single: picks the main project */}
                  <button
                    onClick={() => {
                      if (multi) toggleIds(familyIds, mainState !== "on")
                      else { onChange?.({ kind: "project", id: p.id, label: p.name, projectIds: [p.id] }); setOpen(false); setQ("") }
                    }}
                    className={cn("flex w-full items-center gap-1.5 px-2.5 py-1 text-left hover:bg-secondary", (multi ? mainState !== "off" : isMainSingle) && "bg-primary/5")}
                  >
                    {multi && <CheckBox state={mainState} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight">{p.name}</span>
                      {showId(p.id) && <span className="font-mono text-[10px] text-muted-foreground">{showId(p.id)}</span>}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1.5">
                      {p.phases.length > 0 && (
                        <span className="whitespace-nowrap text-[10px] text-muted-foreground">{p.phases.length} Phase{p.phases.length === 1 ? "" : "s"}</span>
                      )}
                      <ProjStatusTag status={p.status} />
                    </span>
                  </button>
                  {/* Main project only — multi mode: just the main id, no phases */}
                  {multi && p.phases.length > 0 && (
                    <button
                      onClick={() => toggleIds([p.id], !set.has(p.id))}
                      className={cn("flex w-full items-center gap-1.5 py-1 pl-8 pr-2.5 text-left hover:bg-secondary", set.has(p.id) && "bg-primary/5")}
                    >
                      <CheckBox state={set.has(p.id) ? "on" : "off"} />
                      <span className="flex-1 text-xs text-muted-foreground">Main project only</span>
                    </button>
                  )}
                  {/* Phases — toggle individually */}
                  {p.phases.map((ph) => {
                    const phOn = multi ? set.has(ph.id) : value?.kind === "phase" && value.id === ph.id
                    return (
                      <button
                        key={ph.id}
                        onClick={() => {
                          if (multi) toggleIds([ph.id], !set.has(ph.id))
                          else { onChange?.({ kind: "phase", id: ph.id, label: ph.name, projectIds: [ph.id] }); setOpen(false); setQ("") }
                        }}
                        className={cn("flex w-full items-center gap-1.5 py-1 pl-8 pr-2.5 text-left hover:bg-secondary", phOn && "bg-primary/5")}
                      >
                        {multi && <CheckBox state={phOn ? "on" : "off"} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] leading-tight">{ph.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{[showId(ph.id), `in ${p.name}`].filter(Boolean).join(" · ")}</span>
                        </span>
                        <ProjStatusTag status={ph.status} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {visible.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No results</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Per-group mini pager (design system) ──────────────────────────────────────
/**
 * Subtle pagination inside a group-by section — real data can put thousands of
 * rows/cards in one group. Renders "start–end of total" + tiny chevrons.
 */
export function GroupPager({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-[11px] font-normal text-muted-foreground" onClick={(e) => e.stopPropagation()}>
      {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <button
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </span>
  )
}

// ── Shared rich dropdowns — grouped Areas (area → subareas) and Developers ────
export type AreaPick = { level: "Area" | "Subarea"; id: string; name: string; parent?: string }

const LEVEL_TAG = {
  Area: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Subarea: "border-amber-200 bg-amber-50 text-amber-700",
}

/**
 * Canonical area dropdown used across the system: areas group their subareas
 * (indented), every row shows its ID, subareas caption their parent area.
 */
export function AreaTreeSelect({ tree, value, onChange, className, placeholder = "Select area or subarea…" }: {
  tree: { id: string; name: string; subareas: { id: string; name: string }[] }[]
  value: AreaPick | null
  onChange: (v: AreaPick) => void
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const needle = q.trim().toLowerCase()
  const groups = tree
    .map((a) => ({ ...a, subareas: a.subareas.filter((s) => !needle || s.name.toLowerCase().includes(needle)) }))
    .filter((a) => !needle || a.name.toLowerCase().includes(needle) || a.subareas.length > 0)
  const pick = (v: AreaPick) => { onChange(v); setOpen(false); setQ("") }
  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-white px-2.5 text-sm transition-colors hover:bg-muted/50", value ? "text-foreground" : "text-muted-foreground")}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate text-left">
          {value ? (
            <>
              <span className="truncate">{value.name}</span>
              <span className={cn("inline-flex flex-shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium", LEVEL_TAG[value.level])}>{value.level}</span>
            </>
          ) : placeholder}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-full rounded-md border border-border bg-popover p-1 shadow-md">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search areas & subareas…" className="mb-1 h-7 text-xs" autoFocus />
          <div className="max-h-64 overflow-y-auto">
            {groups.map((a) => (
              <div key={a.id}>
                <button
                  type="button" onClick={() => pick({ level: "Area", id: a.id, name: a.name })}
                  className={cn("flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-muted", value?.id === a.id && "bg-primary/5")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{a.name}</span>
                    <IdTag value={a.id} />
                  </span>
                  <span className={cn("inline-flex flex-shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium", LEVEL_TAG.Area)}>Area</span>
                </button>
                {a.subareas.map((s) => (
                  <button
                    key={s.id} type="button" onClick={() => pick({ level: "Subarea", id: s.id, name: s.name, parent: a.name })}
                    className={cn("flex w-full items-center justify-between gap-2 rounded py-1.5 pl-7 pr-2 text-left hover:bg-muted", value?.id === s.id && "bg-primary/5")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{s.name}</span>
                      <span className="flex items-center gap-1.5">
                        <IdTag value={s.id} />
                        <span className="text-[10px] text-muted-foreground">· {a.name}</span>
                      </span>
                    </span>
                    <span className={cn("inline-flex flex-shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium", LEVEL_TAG.Subarea)}>Subarea</span>
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/** Canonical developer dropdown: name + listing-status tag, ID captioned below. */
export function DeveloperSelect({ developers, value, onChange, className, placeholder = "Select developer…" }: {
  developers: { id: string; name: string; status?: "Active" | "Hidden" }[]
  value: string
  onChange: (id: string) => void
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ("") } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const selected = developers.find((d) => d.id === value)
  const list = developers.filter((d) => !q.trim() || `${d.name} ${d.id}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-white px-2.5 text-sm transition-colors hover:bg-muted/50", selected ? "text-foreground" : "text-muted-foreground")}
      >
        <span className="truncate text-left">{selected?.name ?? placeholder}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-full rounded-md border border-border bg-popover p-1 shadow-md">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search developers…" className="mb-1 h-7 text-xs" autoFocus />
          <div className="max-h-64 overflow-y-auto">
            {list.map((d) => (
              <button
                key={d.id} type="button" onClick={() => { onChange(d.id); setOpen(false); setQ("") }}
                className={cn("flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-muted", value === d.id && "bg-primary/5")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{d.name}</span>
                  <IdTag value={d.id} />
                </span>
                {d.status && (
                  <span className={cn(
                    "inline-flex flex-shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium",
                    d.status === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700",
                  )}>
                    {d.status}
                  </span>
                )}
              </button>
            ))}
            {list.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import type React from "react"
import {
  Search, X, Filter, SlidersHorizontal, ArrowUpDown, Group as GroupIcon, Columns3,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
export function TableCardHeader({ title, count, cta }: { title: string; count?: number; cta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{count.toLocaleString()}</span>
        )}
      </div>
      {cta}
    </div>
  )
}

// ── Search + filters toolbar with a divider before the control actions ────────
export function TableToolbar({
  search, onSearch, searchPlaceholder = "Search…", filters,
  activeFilters = 0, onAllFilters, onAdvancedFilters, onSort, onColumns, groupControl,
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
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAdvancedFilters}><SlidersHorizontal className="h-3.5 w-3.5" />Advanced Filters</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onSort}><ArrowUpDown className="h-3.5 w-3.5" />Sort</Button>
          {groupControl ?? <Button variant="outline" size="sm" className="h-8 gap-1.5"><GroupIcon className="h-3.5 w-3.5" />Group</Button>}
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
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
          <span className="font-semibold text-foreground">{total.toLocaleString()}</span> {label}
        </p>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => <SelectItem key={n} value={String(n)} className="text-xs">{n} / page</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(1)} disabled={page === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page - 1)} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="px-3 text-xs font-medium tabular-nums text-foreground">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
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

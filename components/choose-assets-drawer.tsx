"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Search, SlidersHorizontal } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface AssetItem {
  id: string
  [key: string]: unknown
}

export type FilterSpec<T> =
  | { key: keyof T; label: string; options: string[]; boolean?: false }
  | { key: keyof T; label: string; boolean: true; options?: never }

/**
 * Generic "Choose from project" drawer: search + a filter popover + multi-select.
 * `layout="list"` renders each item as a full card (with a side checkbox); `layout="grid"` renders tiles.
 */
export function ChooseAssetsDrawer<T extends AssetItem>({
  open, onClose, title, description, items, searchKeys, searchPlaceholder = "Search…",
  filters = [], renderItem, alreadySelectedIds = [], onConfirm, layout = "list",
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  items: T[]
  searchKeys: (keyof T)[]
  searchPlaceholder?: string
  filters?: FilterSpec<T>[]
  renderItem: (item: T, ctx: { selected: boolean; toggle: () => void; disabled: boolean }) => React.ReactNode
  alreadySelectedIds?: string[]
  onConfirm: (selected: T[]) => void
  layout?: "list" | "grid"
}) {
  const [q, setQ] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => { if (open) { setQ(""); setActiveFilters({}); setPicked(new Set()) } }, [open])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((it) => {
      if (needle) {
        const hay = searchKeys.map((k) => String(it[k] ?? "")).join(" ").toLowerCase()
        if (!hay.includes(needle)) return false
      }
      for (const f of filters) {
        const set = activeFilters[String(f.key)]
        if (!set || set.size === 0) continue
        if (f.boolean) { if (String(it[f.key]) !== "true") return false }
        else if (!set.has(String(it[f.key]))) return false
      }
      return true
    })
  }, [items, q, activeFilters, filters, searchKeys])

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleFilter = (key: string, value: string) => setActiveFilters((prev) => {
    const next = { ...prev }; const set = new Set(next[key] ?? []); set.has(value) ? set.delete(value) : set.add(value); next[key] = set; return next
  })
  const activeFilterCount = Object.values(activeFilters).reduce((n, s) => n + s.size, 0)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className={cn("flex h-full max-w-[94vw] flex-col overflow-hidden p-0", layout === "list" ? "w-[420px]" : "w-[480px]")}>
        <SheetHeader className="shrink-0 space-y-2 border-b border-border px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="h-8 pl-8 text-sm" />
            </div>
            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="relative h-8 w-8 shrink-0" title="Filter">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{activeFilterCount}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3 p-3">
                  {filters.map((f) => (
                    <div key={String(f.key)} className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                      {f.boolean ? (
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Only {f.label.toLowerCase()}</span>
                          <Switch checked={!!activeFilters[String(f.key)]?.has("true")} onCheckedChange={() => toggleFilter(String(f.key), "true")} />
                        </label>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {f.options.map((opt) => {
                            const on = activeFilters[String(f.key)]?.has(opt)
                            return (
                              <button key={opt} onClick={() => toggleFilter(String(f.key), opt)}
                                className={cn("rounded-full border px-2 py-0.5 text-[11px] transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {activeFilterCount > 0 && (
                    <button onClick={() => setActiveFilters({})} className="w-full rounded-md border-t border-border pt-2 text-center text-xs text-muted-foreground hover:text-foreground">Clear filters</button>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {layout === "grid" ? (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((it) => {
                const isPicked = picked.has(it.id); const isExisting = alreadySelectedIds.includes(it.id)
                return (
                  <button key={it.id} disabled={isExisting} onClick={() => toggle(it.id)}
                    className={cn("relative overflow-hidden rounded-lg border text-left transition-all", isExisting ? "cursor-not-allowed opacity-50" : isPicked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
                    {renderItem(it, { selected: isPicked || isExisting, toggle: () => toggle(it.id), disabled: isExisting })}
                    {(isPicked || isExisting) && <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"><Check className="h-3 w-3" /></div>}
                  </button>
                )
              })}
              {filtered.length === 0 && <p className="col-span-3 px-2 py-10 text-center text-sm text-muted-foreground">No matches</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((it) => {
                const isPicked = picked.has(it.id); const isExisting = alreadySelectedIds.includes(it.id)
                return (
                  <div key={it.id} className={cn(isExisting && "pointer-events-none opacity-50")}>
                    {renderItem(it, { selected: isPicked || isExisting, toggle: () => toggle(it.id), disabled: isExisting })}
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="px-2 py-10 text-center text-sm text-muted-foreground">No matches</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-4">
          <span className="text-xs text-muted-foreground">{picked.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={picked.size === 0} onClick={() => onConfirm(items.filter((i) => picked.has(i.id)))}>Add{picked.size > 0 ? ` ${picked.size}` : ""}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

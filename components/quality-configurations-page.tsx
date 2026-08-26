"use client"

import { useMemo, useState } from "react"
import { Building2, Check, ChevronDown, Download, LayoutGrid, ListTree, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCard, TableCardHeader, IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import { QC_TAXONOMY, QC_ENTITIES, nextSubtypeId, type QcTaxonomy, type QcEntity, type QcCategory, type QcType } from "@/lib/quality-config-mock"
import { PROP_ISSUE_SEVERITIES, SEVERITY_COLORS, type PropIssueSeverity } from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

const ENTITY_META: Record<QcEntity, { label: string; icon: React.ReactNode }> = {
  Property: { label: "Properties", icon: <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> },
  Project: { label: "Projects", icon: <Building2 className="mr-1.5 h-3.5 w-3.5" /> },
  Developer: { label: "Developers", icon: <Users className="mr-1.5 h-3.5 w-3.5" /> },
}

function SumTag({ sum, label = "Σ" }: { sum: number; label?: string }) {
  const ok = sum === 100
  return (
    <span className={cn(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
      ok ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700",
    )}>
      {label} {sum}%
    </span>
  )
}

/** Priority tag with a dropdown to change it — category level only. */
function PriorityPicker({ value, onChange }: { value: PropIssueSeverity; onChange: (p: PropIssueSeverity) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", SEVERITY_COLORS[value])}>
          {value}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {PROP_ISSUE_SEVERITIES.filter((p) => p !== value).map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)}>
            <span className={cn("mr-2 h-2 w-2 rounded-full", SEVERITY_COLORS[p].split(" ")[0])} />{p}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ActiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        active ? "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "border-red-200 bg-red-100 text-red-700 hover:bg-red-200",
      )}
      title="Toggle Active / Hidden"
    >
      {active ? "Active" : "Hidden"}
    </button>
  )
}

function WeightInput({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <div className="relative shrink-0">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-18 pr-6 text-right text-sm tabular-nums"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
    </div>
  )
}

export function QualityConfigurationsPage() {
  const [taxonomy, setTaxonomy] = useState<QcTaxonomy>(() => structuredClone(QC_TAXONOMY))
  const [entity, setEntity] = useState<QcEntity>("Property")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Subtype CRUD state: editing an existing one, or adding under a type
  const [editingSub, setEditingSub] = useState<{ id: string; draft: string } | null>(null)
  const [addingUnder, setAddingUnder] = useState<{ typId: string; draft: string } | null>(null)

  const cats = taxonomy[entity]
  const setCats = (updater: (prev: QcCategory[]) => QcCategory[]) =>
    setTaxonomy((prev) => ({ ...prev, [entity]: updater(prev[entity]) }))

  const typeCount = cats.reduce((s, c) => s + c.types.length, 0)
  const subtypeCount = cats.reduce((s, c) => s + c.types.reduce((x, t) => x + t.subtypes.length, 0), 0)
  const catSum = cats.reduce((s, c) => s + c.weight, 0)

  const clamp = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))

  const patchCat = (catId: string, patch: Partial<QcCategory>) =>
    setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, ...patch } : c)))
  const patchType = (catId: string, typId: string, patch: Partial<QcType>) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id === typId ? { ...t, ...patch } : t)) })))
  const patchSubtypes = (catId: string, typId: string, fn: (subs: QcType["subtypes"]) => QcType["subtypes"]) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id === typId ? { ...t, subtypes: fn(t.subtypes) } : t)) })))

  const problems = useMemo(() => (cats.length && catSum !== 100 ? [`Category scores sum to ${catSum}%`] : []), [cats, catSum])

  const exportJson = () => {
    const payload = {
      entity,
      exportedAt: new Date().toISOString(),
      categories: cats.map((c) => ({
        id: c.id,
        name: c.name,
        priority: c.priority,
        status: c.active ? "Active" : "Hidden",
        score: c.weight,
        types: c.types.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.active ? "Active" : "Hidden",
          subtypes: t.subtypes.map((s) => ({ id: s.id, name: s.name, status: s.active ? "Active" : "Hidden" })),
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `quality-configurations-${entity.toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Quality configuration exported as JSON")
  }

  const save = () => {
    if (problems.length) {
      toast.error(problems[0] + " — category scores must sum to 100%")
      return
    }
    toast.success("Quality configuration saved")
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quality Configurations</h1>
          <p className="text-sm text-muted-foreground">
            Property fields are the categories — priority and score live on the category; subtypes can be added, renamed or removed.
          </p>
        </div>

        <Tabs value="classification" className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="classification" className="data-[state=active]:bg-card">
              <ListTree className="mr-1.5 h-3.5 w-3.5" />Issues Classification
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={entity} onValueChange={(v) => setEntity(v as QcEntity)} className="w-full">
          <TabsList className="bg-secondary">
            {QC_ENTITIES.map((e) => (
              <TabsTrigger key={e} value={e} className="data-[state=active]:bg-card">
                {ENTITY_META[e].icon}{ENTITY_META[e].label}
                {e === "Property" ? (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                    {taxonomy[e].length}
                  </span>
                ) : (
                  <span className="ml-1.5 inline-flex h-4 items-center justify-center rounded border border-gray-200 bg-gray-100 px-1 text-[10px] font-semibold text-gray-500">Soon</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {entity !== "Property" ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-24 text-center">
            <ListTree className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{ENTITY_META[entity].label} taxonomy is coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">Property fields are live — project and developer issue taxonomies follow the same structure.</p>
          </div>
        ) : (
          <TableCard>
            <TableCardHeader
              title={`${ENTITY_META[entity].label} Categories`}
              count={cats.length}
              extra={
                <>
                  <span className="ml-1 text-sm font-semibold text-foreground">Types</span>
                  <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{typeCount}</span>
                  <span className="ml-1 text-sm font-semibold text-foreground">Subtypes</span>
                  <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{subtypeCount}</span>
                  {cats.length > 0 && <span className="ml-2"><SumTag sum={catSum} label="Categories Σ" /></span>}
                </>
              }
              cta={
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportJson}>
                    <Download className="h-3.5 w-3.5" />Export JSON
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5" onClick={save}>Save Changes</Button>
                </div>
              }
            />
            {problems.length > 0 && (
              <div className="mx-4 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold">{problems[0]} — category scores must sum to exactly 100%.</p>
              </div>
            )}
            <div className="space-y-4 p-4">
              {cats.map((c) => (
                <div key={c.id} className={cn("rounded-xl border border-border bg-card", !c.active && "opacity-60")}>
                  {/* Category — the only level with priority + score */}
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <ColorTag value={c.name} />
                      <IdTag value={c.id} />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{c.types.length} type{c.types.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityPicker value={c.priority} onChange={(p) => patchCat(c.id, { priority: p })} />
                      <ActiveToggle active={c.active} onToggle={() => patchCat(c.id, { active: !c.active })} />
                      <span className="hidden text-xs text-muted-foreground sm:inline">Score</span>
                      <WeightInput value={c.weight} onChange={(v) => patchCat(c.id, { weight: clamp(v) })} />
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {c.types.map((t) => {
                      const open = expanded.has(t.id)
                      return (
                        <div key={t.id} className={cn(!t.active && "opacity-60")}>
                          <div className="flex items-center justify-between gap-2 px-4 py-2">
                            <button
                              className={cn("flex min-w-0 flex-1 items-center gap-2 text-left", t.subtypes.length === 0 && addingUnder?.typId !== t.id && "cursor-default")}
                              onClick={t.subtypes.length > 0 ? () => toggle(t.id) : undefined}
                            >
                              {t.subtypes.length > 0
                                ? <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                                : <span className="w-4 shrink-0" />}
                              <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                              <IdTag value={t.id} />
                              {t.subtypes.length > 0 && <span className="whitespace-nowrap text-xs text-muted-foreground">{t.subtypes.length} subtypes</span>}
                            </button>
                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => { setAddingUnder({ typId: t.id, draft: "" }); setExpanded((prev) => new Set(prev).add(t.id)) }}
                              >
                                <Plus className="h-3 w-3" />Subtype
                              </Button>
                              <ActiveToggle active={t.active} onToggle={() => patchType(c.id, t.id, { active: !t.active })} />
                            </div>
                          </div>
                          {(open || addingUnder?.typId === t.id) && (
                            <>
                              {t.subtypes.map((s) => (
                                <div key={s.id} className={cn("flex items-center justify-between gap-2 bg-primary/5 py-1.5 pl-12 pr-4", !s.active && "opacity-60")}>
                                  {editingSub?.id === s.id ? (
                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                      <Input
                                        value={editingSub.draft}
                                        onChange={(e) => setEditingSub({ id: s.id, draft: e.target.value })}
                                        className="h-7 max-w-72 bg-card text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && editingSub.draft.trim()) {
                                            patchSubtypes(c.id, t.id, (subs) => subs.map((x) => (x.id === s.id ? { ...x, name: editingSub.draft.trim() } : x)))
                                            setEditingSub(null)
                                          }
                                          if (e.key === "Escape") setEditingSub(null)
                                        }}
                                      />
                                      <button
                                        className="flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
                                        onClick={() => {
                                          if (!editingSub.draft.trim()) return
                                          patchSubtypes(c.id, t.id, (subs) => subs.map((x) => (x.id === s.id ? { ...x, name: editingSub.draft.trim() } : x)))
                                          setEditingSub(null)
                                        }}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setEditingSub(null)}>
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate text-sm text-foreground">{s.name}</span>
                                      <IdTag value={s.id} />
                                    </div>
                                  )}
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <ActiveToggle
                                      active={s.active}
                                      onToggle={() => patchSubtypes(c.id, t.id, (subs) => subs.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))}
                                    />
                                    <button
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                      title="Rename subtype"
                                      onClick={() => setEditingSub({ id: s.id, draft: s.name })}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                      title="Delete subtype"
                                      onClick={() => {
                                        patchSubtypes(c.id, t.id, (subs) => subs.filter((x) => x.id !== s.id))
                                        toast.success(`Subtype "${s.name}" deleted`)
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {addingUnder?.typId === t.id && (
                                <div className="flex items-center gap-1.5 bg-primary/5 py-1.5 pl-12 pr-4">
                                  <Input
                                    value={addingUnder.draft}
                                    onChange={(e) => setAddingUnder({ typId: t.id, draft: e.target.value })}
                                    placeholder="New subtype name…"
                                    className="h-7 max-w-72 bg-card text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && addingUnder.draft.trim()) {
                                        patchSubtypes(c.id, t.id, (subs) => [...subs, { id: nextSubtypeId(), name: addingUnder.draft.trim(), active: true }])
                                        setAddingUnder(null)
                                        toast.success("Subtype added")
                                      }
                                      if (e.key === "Escape") setAddingUnder(null)
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    disabled={!addingUnder.draft.trim()}
                                    onClick={() => {
                                      patchSubtypes(c.id, t.id, (subs) => [...subs, { id: nextSubtypeId(), name: addingUnder.draft.trim(), active: true }])
                                      setAddingUnder(null)
                                      toast.success("Subtype added")
                                    }}
                                  >
                                    Add
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAddingUnder(null)}>Cancel</Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TableCard>
        )}
      </div>
    </div>
  )
}

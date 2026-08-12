"use client"

import { useMemo, useState } from "react"
import { Building2, ChevronDown, LayoutGrid, ListTree, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCard, TableCardHeader, IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import { QC_TAXONOMY, QC_ENTITIES, type QcTaxonomy, type QcEntity, type QcCategory } from "@/lib/quality-config-mock"
import { PROP_ISSUE_SEVERITIES, SEVERITY_COLORS, type PropIssueSeverity } from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

const ENTITY_META: Record<QcEntity, { label: string; icon: React.ReactNode }> = {
  Property: { label: "Properties", icon: <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> },
  Project: { label: "Projects", icon: <Building2 className="mr-1.5 h-3.5 w-3.5" /> },
  Developer: { label: "Developers", icon: <Users className="mr-1.5 h-3.5 w-3.5" /> },
}

/** Weight-sum tag — emerald at exactly 100%, red otherwise. */
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

/** Priority tag with a dropdown to change it (the only classification edit allowed besides score/active). */
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

/** Active/Hidden toggle tag. */
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

/** Stable identity (hoisted) so inputs keep focus across re-renders while typing. */
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

  const cats = taxonomy[entity]
  const setCats = (updater: (prev: QcCategory[]) => QcCategory[]) =>
    setTaxonomy((prev) => ({ ...prev, [entity]: updater(prev[entity]) }))

  const typeCount = cats.reduce((s, c) => s + c.types.length, 0)
  const subtypeCount = cats.reduce((s, c) => s + c.types.reduce((x, t) => x + t.subtypes.length, 0), 0)
  const catSum = cats.reduce((s, c) => s + c.weight, 0)

  const problems = useMemo(() => {
    const out: string[] = []
    if (cats.length && catSum !== 100) out.push(`Category scores sum to ${catSum}%`)
    for (const c of cats) {
      const ts = c.types.reduce((s, t) => s + t.weight, 0)
      if (c.types.length && ts !== 100) out.push(`Type scores in "${c.name}" sum to ${ts}%`)
      for (const t of c.types) {
        const ss = t.subtypes.reduce((s, x) => s + x.weight, 0)
        if (t.subtypes.length && ss !== 100) out.push(`Subtype scores in "${c.name} → ${t.name}" sum to ${ss}%`)
      }
    }
    return out
  }, [cats, catSum])

  const clamp = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))

  // Per-level patchers (score / priority / active) — structure itself is fixed
  const patchCat = (catId: string, patch: Partial<QcCategory>) =>
    setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, ...patch } : c)))
  const patchType = (catId: string, typId: string, patch: object) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id === typId ? { ...t, ...patch } : t)) })))
  const patchSub = (catId: string, typId: string, subId: string, patch: object) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : {
      ...c,
      types: c.types.map((t) => (t.id !== typId ? t : { ...t, subtypes: t.subtypes.map((s) => (s.id === subId ? { ...s, ...patch } : s)) })),
    })))

  const save = () => {
    if (problems.length) {
      toast.error(problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : "") + " — every level must sum to 100%")
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
            The issue taxonomy is fixed — property fields are the categories, each with its types and subtypes. Configure the priority, score and visibility of each.
          </p>
        </div>

        {/* Single tab for now — future configuration tabs slot in here */}
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
              cta={<Button size="sm" className="h-8 gap-1.5" onClick={save}>Save Changes</Button>}
            />
            {problems.length > 0 && (
              <div className="mx-4 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold">Scores need rebalancing — every level must sum to exactly 100%:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {problems.slice(0, 6).map((p) => <li key={p}>{p}</li>)}
                  {problems.length > 6 && <li>+{problems.length - 6} more…</li>}
                </ul>
              </div>
            )}
            <div className="space-y-4 p-4">
              {cats.map((c) => {
                const typeSum = c.types.reduce((s, t) => s + t.weight, 0)
                return (
                  <div key={c.id} className={cn("rounded-xl border border-border bg-card", !c.active && "opacity-60")}>
                    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <ColorTag value={c.name} />
                        <IdTag value={c.id} />
                        {c.types.length > 0 && <SumTag sum={typeSum} label="Types Σ" />}
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
                        const subSum = t.subtypes.reduce((s, x) => s + x.weight, 0)
                        const open = expanded.has(t.id)
                        return (
                          <div key={t.id} className={cn(!t.active && "opacity-60")}>
                            <div className="flex items-center justify-between gap-2 px-4 py-2">
                              <button
                                className={cn("flex min-w-0 flex-1 items-center gap-2 text-left", t.subtypes.length === 0 && "cursor-default")}
                                onClick={t.subtypes.length > 0 ? () => toggle(t.id) : undefined}
                              >
                                {t.subtypes.length > 0
                                  ? <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                                  : <span className="w-4 shrink-0" />}
                                <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                                <IdTag value={t.id} />
                                {t.subtypes.length > 0 && (
                                  <>
                                    <span className="whitespace-nowrap text-xs text-muted-foreground">{t.subtypes.length} subtypes</span>
                                    <SumTag sum={subSum} label="Subtypes Σ" />
                                  </>
                                )}
                              </button>
                              <div className="flex shrink-0 items-center gap-2">
                                <PriorityPicker value={t.priority} onChange={(p) => patchType(c.id, t.id, { priority: p })} />
                                <ActiveToggle active={t.active} onToggle={() => patchType(c.id, t.id, { active: !t.active })} />
                                <WeightInput value={t.weight} onChange={(v) => patchType(c.id, t.id, { weight: clamp(v) })} />
                              </div>
                            </div>
                            {open && t.subtypes.map((s) => (
                              <div key={s.id} className={cn("flex items-center justify-between gap-2 bg-primary/5 py-1.5 pl-12 pr-4", !s.active && "opacity-60")}>
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-sm text-foreground">{s.name}</span>
                                  <IdTag value={s.id} />
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <PriorityPicker value={s.priority} onChange={(p) => patchSub(c.id, t.id, s.id, { priority: p })} />
                                  <ActiveToggle active={s.active} onToggle={() => patchSub(c.id, t.id, s.id, { active: !s.active })} />
                                  <WeightInput value={s.weight} onChange={(v) => patchSub(c.id, t.id, s.id, { weight: clamp(v) })} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </TableCard>
        )}
      </div>
    </div>
  )
}

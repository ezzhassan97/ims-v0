"use client"

import { useMemo, useState } from "react"
import {
  Building2, ChevronDown, LayoutGrid, ListTree, MoreHorizontal, Pencil, Plus, Trash2, Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCard, TableCardHeader, IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import { QC_TAXONOMY, QC_ENTITIES, nextQcId, type QcTaxonomy, type QcEntity, type QcCategory } from "@/lib/quality-config-mock"
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

function CountChip({ n, word }: { n: number; word: string }) {
  return (
    <span className="whitespace-nowrap rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      {n} {word}{n !== 1 ? "s" : ""}
    </span>
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
        className="h-8 w-20 pr-6 text-right text-sm tabular-nums"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
    </div>
  )
}

type NameDialogState =
  | { mode: "add"; level: "category" | "type" | "subtype"; catId?: string; typId?: string }
  | { mode: "rename"; level: "category" | "type" | "subtype"; catId: string; typId?: string; subId?: string; current: string }

type DeleteDialogState = { level: "category" | "type" | "subtype"; catId: string; typId?: string; subId?: string; name: string; childrenNote: string | null }

export function QualityConfigurationsPage() {
  const [taxonomy, setTaxonomy] = useState<QcTaxonomy>(() => structuredClone(QC_TAXONOMY))
  const [entity, setEntity] = useState<QcEntity>("Property")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [nameDlg, setNameDlg] = useState<NameDialogState | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [deleteDlg, setDeleteDlg] = useState<DeleteDialogState | null>(null)

  const cats = taxonomy[entity]
  const setCats = (updater: (prev: QcCategory[]) => QcCategory[]) =>
    setTaxonomy((prev) => ({ ...prev, [entity]: updater(prev[entity]) }))

  const typeCount = cats.reduce((s, c) => s + c.types.length, 0)
  const subtypeCount = cats.reduce((s, c) => s + c.types.reduce((x, t) => x + t.subtypes.length, 0), 0)
  const catSum = cats.reduce((s, c) => s + c.weight, 0)

  const problems = useMemo(() => {
    const out: string[] = []
    if (cats.length && catSum !== 100) out.push(`Category weights sum to ${catSum}%`)
    for (const c of cats) {
      const ts = c.types.reduce((s, t) => s + t.weight, 0)
      if (c.types.length && ts !== 100) out.push(`Types in "${c.name}" sum to ${ts}%`)
      for (const t of c.types) {
        const ss = t.subtypes.reduce((s, x) => s + x.weight, 0)
        if (t.subtypes.length && ss !== 100) out.push(`Subtypes in "${c.name} → ${t.name}" sum to ${ss}%`)
      }
    }
    return out
  }, [cats, catSum])

  const clamp = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))

  const setCatWeight = (catId: string, v: string) =>
    setCats((prev) => prev.map((c) => (c.id === catId ? { ...c, weight: clamp(v) } : c)))
  const setTypeWeight = (catId: string, typId: string, v: string) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id === typId ? { ...t, weight: clamp(v) } : t)) })))
  const setSubWeight = (catId: string, typId: string, subId: string, v: string) =>
    setCats((prev) => prev.map((c) => (c.id !== catId ? c : {
      ...c,
      types: c.types.map((t) => (t.id !== typId ? t : { ...t, subtypes: t.subtypes.map((s) => (s.id === subId ? { ...s, weight: clamp(v) } : s)) })),
    })))

  const save = () => {
    if (problems.length) {
      toast.error(problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : "") + " — every level must sum to 100%")
      return
    }
    toast.success("Issue classification saved")
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const openAdd = (level: "category" | "type" | "subtype", catId?: string, typId?: string) => {
    setNameDraft("")
    setNameDlg({ mode: "add", level, catId, typId })
  }
  const openRename = (level: "category" | "type" | "subtype", current: string, catId: string, typId?: string, subId?: string) => {
    setNameDraft(current)
    setNameDlg({ mode: "rename", level, catId, typId, subId, current })
  }

  const submitName = () => {
    const name = nameDraft.trim()
    if (!name || !nameDlg) return
    if (nameDlg.mode === "add") {
      // ponytail: new items start at 0% weight — the sum tags go red until rebalanced
      if (nameDlg.level === "category") {
        setCats((prev) => [...prev, { id: nextQcId("CAT", taxonomy), name, weight: 0, types: [] }])
      } else if (nameDlg.level === "type") {
        setCats((prev) => prev.map((c) => c.id !== nameDlg.catId ? c : { ...c, types: [...c.types, { id: nextQcId("TYP", taxonomy), name, weight: 0, subtypes: [] }] }))
      } else {
        setCats((prev) => prev.map((c) => c.id !== nameDlg.catId ? c : {
          ...c,
          types: c.types.map((t) => t.id !== nameDlg.typId ? t : { ...t, subtypes: [...t.subtypes, { id: nextQcId("SUB", taxonomy), name, weight: 0 }] }),
        }))
        if (nameDlg.typId) setExpanded((prev) => new Set(prev).add(nameDlg.typId!))
      }
      toast.success(`${nameDlg.level[0].toUpperCase() + nameDlg.level.slice(1)} "${name}" added`)
    } else {
      setCats((prev) => prev.map((c) => {
        if (c.id !== nameDlg.catId) return c
        if (nameDlg.level === "category") return { ...c, name }
        return {
          ...c,
          types: c.types.map((t) => {
            if (t.id !== nameDlg.typId) return t
            if (nameDlg.level === "type") return { ...t, name }
            return { ...t, subtypes: t.subtypes.map((s) => (s.id === nameDlg.subId ? { ...s, name } : s)) }
          }),
        }
      }))
      toast.success(`Renamed to "${name}"`)
    }
    setNameDlg(null)
  }

  const confirmDelete = () => {
    if (!deleteDlg) return
    const { level, catId, typId, subId } = deleteDlg
    if (level === "category") setCats((prev) => prev.filter((c) => c.id !== catId))
    else if (level === "type") setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.filter((t) => t.id !== typId) })))
    else setCats((prev) => prev.map((c) => (c.id !== catId ? c : { ...c, types: c.types.map((t) => (t.id !== typId ? t : { ...t, subtypes: t.subtypes.filter((s) => s.id !== subId) })) })))
    toast.success(`Deleted "${deleteDlg.name}"`)
    setDeleteDlg(null)
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quality Configurations</h1>
          <p className="text-sm text-muted-foreground">Manage the issue taxonomy — categories, types and subtypes per entity — and their scoring weights</p>
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
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">
                  {taxonomy[e].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => openAdd("category")}>
                  <Plus className="h-3.5 w-3.5" />Add Category
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={save}>Save Changes</Button>
              </div>
            }
          />
          {problems.length > 0 && (
            <div className="mx-4 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">Weights need rebalancing — every level must sum to exactly 100%:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
          <div className="space-y-4 p-4">
            {cats.map((c) => {
              const typeSum = c.types.reduce((s, t) => s + t.weight, 0)
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <ColorTag value={c.name} />
                      <IdTag value={c.id} />
                      <CountChip n={c.types.length} word="Type" />
                      {c.types.length > 0 && <SumTag sum={typeSum} label="Types Σ" />}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">Category weight</span>
                      <WeightInput value={c.weight} onChange={(v) => setCatWeight(c.id, v)} />
                      <Button variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => openAdd("type", c.id)}>
                        <Plus className="h-3 w-3" />Add Type
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openRename("category", c.name, c.id)}><Pencil className="mr-2 h-3.5 w-3.5" />Rename</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteDlg({
                              level: "category", catId: c.id, name: c.name,
                              childrenNote: c.types.length ? `${c.types.length} type${c.types.length !== 1 ? "s" : ""} and ${c.types.reduce((s, t) => s + t.subtypes.length, 0)} subtype(s) under this category will also be deleted.` : null,
                            })}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {c.types.map((t) => {
                      const subSum = t.subtypes.reduce((s, x) => s + x.weight, 0)
                      const open = expanded.has(t.id)
                      return (
                        <div key={t.id}>
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => toggle(t.id)}>
                              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                              <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                              <IdTag value={t.id} />
                              <span className="whitespace-nowrap text-xs text-muted-foreground">{t.subtypes.length} subtype{t.subtypes.length !== 1 ? "s" : ""}</span>
                              {t.subtypes.length > 0 && <SumTag sum={subSum} label="Subtypes Σ" />}
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <WeightInput value={t.weight} onChange={(v) => setTypeWeight(c.id, t.id, v)} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => openRename("type", t.name, c.id, t.id)}><Pencil className="mr-2 h-3.5 w-3.5" />Rename</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAdd("subtype", c.id, t.id)}><Plus className="mr-2 h-3.5 w-3.5" />Add Subtype</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteDlg({
                                      level: "type", catId: c.id, typId: t.id, name: t.name,
                                      childrenNote: t.subtypes.length ? `${t.subtypes.length} subtype${t.subtypes.length !== 1 ? "s" : ""} under this type will also be deleted.` : null,
                                    })}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {open && t.subtypes.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 bg-primary/5 py-2 pl-12 pr-4">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm text-foreground">{s.name}</span>
                                <IdTag value={s.id} />
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <WeightInput value={s.weight} onChange={(v) => setSubWeight(c.id, t.id, s.id, v)} />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => openRename("subtype", s.name, c.id, t.id, s.id)}><Pencil className="mr-2 h-3.5 w-3.5" />Rename</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteDlg({ level: "subtype", catId: c.id, typId: t.id, subId: s.id, name: s.name, childrenNote: null })}>
                                      <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    {c.types.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">No types yet — add the first one.</p>
                    )}
                  </div>
                </div>
              )
            })}
            {cats.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">No categories for this entity yet.</p>
            )}
          </div>
        </TableCard>

        {/* Add / Rename dialog */}
        <Dialog open={!!nameDlg} onOpenChange={(o) => { if (!o) setNameDlg(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {nameDlg?.mode === "add" ? `Add ${nameDlg.level}` : `Rename ${nameDlg?.level}`}
              </DialogTitle>
            </DialogHeader>
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={`${(nameDlg?.level ?? "item")[0].toUpperCase() + (nameDlg?.level ?? "item").slice(1)} name`}
              className="h-9"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") submitName() }}
            />
            {nameDlg?.mode === "add" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                New items start with a 0% weight — rebalance the weights below before saving.
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setNameDlg(null)}>Cancel</Button>
              <Button size="sm" className="h-8" onClick={submitName} disabled={!nameDraft.trim()}>
                {nameDlg?.mode === "add" ? "Add" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm dialog */}
        <Dialog open={!!deleteDlg} onOpenChange={(o) => { if (!o) setDeleteDlg(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete {deleteDlg?.level}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground">
              Are you sure you want to delete <span className="font-semibold">{deleteDlg?.name}</span>?
            </p>
            {deleteDlg?.childrenNote && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{deleteDlg.childrenNote}</div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setDeleteDlg(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="h-8" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

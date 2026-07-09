"use client"

import { useMemo, useState } from "react"
import { ChevronRight, Home, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LinkedPlanCard, type PlanCardData } from "@/components/all-properties-page"
import { PaymentPlanDrawer } from "@/components/payment-plan-builder"
import { PaymentPlanDetailsDrawer } from "@/components/payment-plan-details-drawer"
import { TableCard, TableCardHeader, TableFooter, FilterSelect } from "@/components/table-kit"

// ── Mock data (deterministic, modeled on the production listing) ───────────────
type PlanRow = PlanCardData & { phase: string | null; createdIso: string; updatedIso: string }

const DEVS = [
  { name: "LMD", id: "72", proj: { name: "One - Ninety", id: "344" } },
  { name: "Naia Developments", id: "253", proj: { name: "Naia Bay", id: "930" } },
  { name: "Palm Hills Developments", id: "16", proj: { name: "97 Hills", id: "1841" } },
  { name: "Palm Hills Developments", id: "16", proj: { name: "PX", id: "1154" } },
]
const PLAN_TYPES = ["Cash", "Equal", "Back Loaded", "Front Loaded"]
const FREQUENCIES = ["Monthly", "Quarterly", "Semi-Annual"]
// name + its owning developer/project (index into DEVS) + phase, so cards stay consistent
const SEEDS: { name: string; dev: number; phase: string | null }[] = [
  { name: "LMD CASH", dev: 0, phase: null },
  { name: "Naia Bay-Phase 1", dev: 1, phase: "Phase 1" },
  { name: "Naia Bay-Phase 2", dev: 1, phase: "Phase 2" },
  { name: "97 hills dis 1", dev: 2, phase: null },
  { name: "97 hills dis 2", dev: 2, phase: "Phase 1" },
  { name: "97 hills dis 3", dev: 2, phase: null },
  { name: "97 hills dis 4", dev: 2, phase: "Phase 1" },
  { name: "px 1 dis 1", dev: 3, phase: null },
  { name: "px 1 dis 2", dev: 3, phase: null },
  { name: "px 1 dis 3", dev: 3, phase: null },
  { name: "px 1 dis 5", dev: 3, phase: null },
  { name: "One Ninety Equal 10", dev: 0, phase: null },
  { name: "Naia flexible 8", dev: 1, phase: "Phase 2" },
  { name: "PX front 5", dev: 3, phase: null },
  { name: "97 Hills equal 12", dev: 2, phase: "Phase 1" },
  { name: "LMD back 6", dev: 0, phase: null },
]
const BASE = new Date("2026-07-09T18:00:00").getTime()

function fmtTs(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, "0")} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

const PLANS: PlanRow[] = Array.from({ length: 24 }, (_, i) => {
  const seed = SEEDS[i % SEEDS.length]
  const dev = DEVS[seed.dev]
  const type = PLAN_TYPES[i % PLAN_TYPES.length]
  const isCash = type === "Cash"
  const createdIso = new Date(BASE - (i + 3) * 86_400_000 * 1.3).toISOString()
  const updatedIso = new Date(BASE - i * 3_600_000 * 7).toISOString()
  const discount = i % 3 === 0 ? "—" : `${(12 + ((i * 7) % 28)) + 0.15}%`
  return {
    id: String(59_695 - i * 3),
    name: SEEDS.length > i ? seed.name : `${seed.name} v${Math.floor(i / SEEDS.length) + 1}`,
    status: "Active",
    hasOffer: i % 5 === 0,
    devName: dev.name,
    devId: dev.id,
    projName: dev.proj.name,
    projId: dev.proj.id,
    units: [4, 3, 5, 74, 219][i % 5],
    available: [2, 1, 3, 40, 120][i % 5],
    priceCount: (i % 3) + 1,
    historicalCount: i % 4,
    planType: type,
    currency: i % 6 === 5 ? "USD" : "EGP",
    discount,
    validTill: "—",
    dp: isCash ? "100%" : `${[10, 20, 2.83, 5][i % 4]}%`,
    duration: isCash ? "—" : `${(i % 9) + 4} Yrs`,
    frequency: isCash ? "—" : FREQUENCIES[i % FREQUENCIES.length],
    instalPct: isCash || i % 2 === 0 ? "—" : `${(i % 3) + 1}%`,
    createdAt: fmtTs(createdIso),
    updatedAt: fmtTs(updatedIso),
    createdIso,
    updatedIso,
    phase: seed.phase,
    expanded: { isCash },
  }
})

const SORT_OPTIONS = ["Last updated ↓", "Last updated ↑", "Created ↓", "Created ↑", "Name A–Z"]

// ── Page ───────────────────────────────────────────────────────────────────────
export function PaymentPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>(PLANS)
  const [search, setSearch] = useState("")
  const [developerF, setDeveloperF] = useState("")
  const [projectF, setProjectF] = useState("")
  const [phaseF, setPhaseF] = useState("")
  const [typeF, setTypeF] = useState("")
  const [frequencyF, setFrequencyF] = useState("")
  const [currencyF, setCurrencyF] = useState("")
  const [offerF, setOfferF] = useState("")
  const [sortBy, setSortBy] = useState("Last updated ↓")

  const [detailsPlan, setDetailsPlan] = useState<PlanCardData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanCardData | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<PlanRow | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const developers = [...new Map(PLANS.map((p) => [p.devId, { value: p.devName, label: p.devName, sublabel: `ID: ${p.devId}` }])).values()]
  const projects = [...new Map(PLANS.map((p) => [p.projId, { value: p.projName, label: p.projName, sublabel: `ID: ${p.projId}` }])).values()]
  const phases = [...new Set(PLANS.map((p) => p.phase).filter(Boolean))] as string[]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = plans.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
      if (developerF && p.devName !== developerF) return false
      if (projectF && p.projName !== projectF) return false
      if (phaseF && p.phase !== phaseF) return false
      if (typeF && p.planType !== typeF) return false
      if (frequencyF && p.frequency !== frequencyF) return false
      if (currencyF && p.currency !== currencyF) return false
      if (offerF === "Offer" && !p.hasOffer) return false
      if (offerF === "No Offer" && p.hasOffer) return false
      return true
    })
    const sorted = [...result]
    switch (sortBy) {
      case "Last updated ↑": sorted.sort((a, b) => a.updatedIso.localeCompare(b.updatedIso)); break
      case "Created ↓": sorted.sort((a, b) => b.createdIso.localeCompare(a.createdIso)); break
      case "Created ↑": sorted.sort((a, b) => a.createdIso.localeCompare(b.createdIso)); break
      case "Name A–Z": sorted.sort((a, b) => a.name.localeCompare(b.name)); break
      default: sorted.sort((a, b) => b.updatedIso.localeCompare(a.updatedIso))
    }
    return sorted
  }, [plans, search, developerF, projectF, phaseF, typeF, frequencyF, currencyF, offerF, sortBy])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const hasFilters = !!search || !!developerF || !!projectF || !!phaseF || !!typeF || !!frequencyF || !!currencyF || !!offerF
  const clearAll = () => {
    setSearch(""); setDeveloperF(""); setProjectF(""); setPhaseF(""); setTypeF("")
    setFrequencyF(""); setCurrencyF(""); setOfferF(""); setPage(1)
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3" />
          <span>Projects Attachments</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Payment Plans</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Plans</h1>
          <p className="text-sm text-muted-foreground">View and manage all primary payment plans in the system</p>
        </div>

        {/* Search + filters */}
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-80 shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by plan name or ID"
                className="h-8 w-full pl-8 pr-7 text-sm"
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <FilterSelect label="Developer" value={developerF} options={developers} onChange={(v) => { setDeveloperF(v); setPage(1) }} className="w-48" />
            <FilterSelect label="Project" value={projectF} options={projects} onChange={(v) => { setProjectF(v); setPage(1) }} className="w-44" />
            <FilterSelect label="Phase" value={phaseF} options={phases} onChange={(v) => { setPhaseF(v); setPage(1) }} className="w-36" />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
            <FilterSelect label="Plan type" value={typeF} options={PLAN_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-40" />
            <FilterSelect label="Frequency" value={frequencyF} options={FREQUENCIES} onChange={(v) => { setFrequencyF(v); setPage(1) }} className="w-40" />
            <FilterSelect label="Currency" value={currencyF} options={["EGP", "USD"]} onChange={(v) => { setCurrencyF(v); setPage(1) }} className="w-36" />
            <FilterSelect label="Offer" value={offerF} options={["Offer", "No Offer"]} onChange={(v) => { setOfferF(v); setPage(1) }} className="w-32" />
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sort</span>
              <FilterSelect label="Sort" value={sortBy} options={SORT_OPTIONS} onChange={(v) => setSortBy(v || "Last updated ↓")} className="w-44" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearAll}>
                <X className="mr-1 h-3.5 w-3.5" />Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Plans grid */}
        <TableCard>
          <TableCardHeader
            title="Payment Plans"
            count={filtered.length}
            cta={
              <Button size="sm" className="gap-1.5" onClick={() => { setEditingPlan(null); setDrawerOpen(true) }}>
                <Plus className="h-4 w-4" />Add payment plan
              </Button>
            }
          />
          {filtered.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">No payment plans match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageRows.map((plan) => (
                <LinkedPlanCard
                  key={plan.id}
                  plan={plan}
                  fullWidth
                  hideFooter
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  totalInGroup={pageRows.length}
                  onView={() => setDetailsPlan(plan)}
                  onRemove={() => setDeletingPlan(plan)}
                  removeConfirm={false}
                />
              ))}
            </div>
          )}
          <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="plans" />
        </TableCard>
      </div>

      {/* View drawer (read-only, Edit at the bottom) */}
      <PaymentPlanDetailsDrawer
        plan={detailsPlan}
        onClose={() => setDetailsPlan(null)}
        onEdit={() => { setEditingPlan(detailsPlan); setDetailsPlan(null); setDrawerOpen(true) }}
      />

      {/* Create / edit drawer */}
      <PaymentPlanDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingPlan(null) }}
        title={editingPlan ? "Edit Payment Plan" : "Add Payment Plan"}
        submitLabel={editingPlan ? "Save Changes" : "Save Plan"}
        onSave={(saved) => {
          if (editingPlan) {
            const nowIso = new Date().toISOString()
            setPlans((ps) => ps.map((p) => (p.id === editingPlan.id
              ? { ...p, ...saved, id: p.id, createdAt: p.createdAt, createdIso: p.createdIso, updatedIso: nowIso, updatedAt: fmtTs(nowIso) }
              : p)))
            toast.success("Payment plan updated")
          } else {
            const nowIso = new Date().toISOString()
            setPlans((ps) => {
              const nextId = String(Math.max(0, ...ps.map((p) => Number(p.id)).filter(Number.isFinite)) + 1)
              return [{ ...(saved as PlanRow), id: nextId, phase: null, createdIso: nowIso, updatedIso: nowIso, createdAt: fmtTs(nowIso), updatedAt: fmtTs(nowIso) }, ...ps]
            })
            toast.success("Payment plan created")
          }
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(o) => !o && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPlan && (
                <>Deleting <span className="font-semibold text-foreground">{deletingPlan.name}</span> (ID: {deletingPlan.id}) removes it from the system and unlinks it from any properties. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingPlan) {
                  setPlans((ps) => ps.filter((p) => p.id !== deletingPlan.id))
                  toast.success(`${deletingPlan.name} deleted`)
                }
                setDeletingPlan(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

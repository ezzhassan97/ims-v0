"use client"

import { useMemo, useState } from "react"
import { Eye, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { COL_SEP } from "@/components/table-kit"
import { StoryBadge, type PropertyRow } from "@/components/all-properties-page"
import { mockRules } from "@/components/validation-rules-page"
import {
  addQualityReport, nextReportId, setPendingReport, ruleViolatesUnit,
  type QualityReport, type ReportRule,
} from "@/lib/quality-reports-mock"
import { cn } from "@/lib/utils"

// The property-entity validation rules, snapshotted into ReportRule shape.
const PROPERTY_RULES: ReportRule[] = mockRules
  .filter((r) => r.entity === "Property" && r.isActive)
  .map((r) => ({ id: r.id, name: r.name, description: r.description, type: r.type }))

function RuleCard({
  rule, selected, unitCount, onToggle,
}: {
  rule: ReportRule
  selected: boolean
  unitCount: number
  onToggle: () => void
}) {
  const blocking = rule.type === "Blocking"
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        blocking ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40",
        !selected && "opacity-45",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex min-w-0 cursor-pointer items-start gap-2">
          <Checkbox className="mt-0.5 h-4 w-4" checked={selected} onCheckedChange={onToggle} />
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", blocking ? "text-red-700" : "text-amber-700")}>
            {rule.name}
            <Eye className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </span>
        </label>
        <span className={cn(
          "shrink-0 whitespace-nowrap rounded-md border bg-card px-2 py-0.5 text-xs font-medium tabular-nums",
          blocking ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700",
        )}>
          {unitCount} Unit{unitCount !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">ID: {rule.id}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{rule.description}</p>
    </div>
  )
}

/** Bulk action "Validation Rules": review the selected units + pick the rules,
 *  then generate a Data Quality Report. */
export function ValidationReportDialog({
  rows, onClose,
}: {
  rows: PropertyRow[]
  onClose: () => void
}) {
  const [selectedRules, setSelectedRules] = useState<Set<string>>(() => new Set(PROPERTY_RULES.map((r) => r.id)))

  const unitCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const rule of PROPERTY_RULES) m.set(rule.id, rows.filter((row) => ruleViolatesUnit(rule, row.propertyId)).length)
    return m
  }, [rows])

  const blocking = PROPERTY_RULES.filter((r) => r.type === "Blocking")
  const warning = PROPERTY_RULES.filter((r) => r.type === "Warning")

  const toggle = (id: string) =>
    setSelectedRules((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const generate = () => {
    const report: QualityReport = {
      id: nextReportId(),
      kind: "Validation Rules",
      entity: "Properties",
      createdBy: "Ezz H.",
      createdAt: new Date().toISOString(),
      units: rows.map((r) => ({
        propertyId: r.propertyId,
        detailedPropertyId: r.detailedPropertyId,
        unitCode: r.unitCode,
        developer: { id: r.developer.id, name: r.developer.name },
        project: { id: r.project.id, name: r.project.name },
        phase: r.phase ? { id: r.phase.id, name: r.phase.name } : null,
      })),
      rules: PROPERTY_RULES.filter((r) => selectedRules.has(r.id)),
      progressPct: 0,
      openedIssues: [],
    }
    addQualityReport(report)
    setPendingReport(report.id)
    toast.success(`Report ${report.id} generated — ${report.units.length} units × ${report.rules.length} rules`)
    onClose()
    // Navigate to Data Quality Reports (the app shell listens for this)
    window.dispatchEvent(new CustomEvent("ims:navigate", { detail: "Data Quality Reports" }))
  }

  const RuleSection = ({ title, tone, rules }: { title: string; tone: "red" | "amber"; rules: ReportRule[] }) => (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <span className={cn(
          "rounded-md border px-2 py-0.5 text-xs font-medium",
          tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700",
        )}>
          {rules.length} rule{rules.length !== 1 ? "s" : ""}
        </span>
      </div>
      {rules.map((r) => (
        <RuleCard key={r.id} rule={r} selected={selectedRules.has(r.id)} unitCount={unitCounts.get(r.id) ?? 0} onToggle={() => toggle(r.id)} />
      ))}
    </div>
  )

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="flex h-[82vh] !max-w-[1200px] w-[94vw] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Run Validation Rules
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{rows.length} units</span>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{selectedRules.size} rules</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Review the selected units and untick any rule you don't want in this report, then generate.</p>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px] divide-x divide-border">
          {/* Left — compact table of the selected units */}
          <div className="min-h-0 overflow-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border">
                  {["Property ID", "Detailed Property ID", "Unit Code", "Project", "Sale Type", "Status", "Price"].map((h) => (
                    <th key={h} className={cn("whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", COL_SEP)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.propertyId} className="bg-card">
                    <td className={cn("whitespace-nowrap px-3 py-1.5 font-mono text-[10px]", COL_SEP)}>{r.propertyId}</td>
                    <td className={cn("whitespace-nowrap px-3 py-1.5 font-mono text-[10px] text-muted-foreground", COL_SEP)}>{r.detailedPropertyId ?? "—"}</td>
                    <td className={cn("whitespace-nowrap px-3 py-1.5 font-mono text-[10px] text-muted-foreground", COL_SEP)}>{r.unitCode ?? "—"}</td>
                    <td className={cn("whitespace-nowrap px-3 py-1.5 text-xs", COL_SEP)}>{r.project.name}</td>
                    <td className={cn("px-3 py-1.5", COL_SEP)}><StoryBadge value={r.saleType} /></td>
                    <td className={cn("px-3 py-1.5", COL_SEP)}><StoryBadge value={r.availability} /></td>
                    <td className={cn("whitespace-nowrap px-3 py-1.5 text-right text-xs tabular-nums", COL_SEP)}>{r.price ? `${r.price.toLocaleString()} EGP` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right — the rules, blocked and warning */}
          <div className="min-h-0 space-y-5 overflow-y-auto bg-secondary/30 p-4">
            <RuleSection title="Blocking Rules" tone="red" rules={blocking} />
            <RuleSection title="Warning Rules" tone="amber" rules={warning} />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-3">
          <p className="mr-auto self-center text-xs text-muted-foreground">
            {selectedRules.size === 0 ? "Select at least one rule" : `${rows.length} units × ${selectedRules.size} rules`}
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8" disabled={selectedRules.size === 0} onClick={generate}>Generate Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { IdTag } from "@/components/table-kit"
import { ColorTag } from "@/components/projects-list-page"
import {
  PROJECT_ISSUE_FIELDS, PROJECT_ISSUE_FIELD_GROUPS, PROJECT_AMENITY_LIBRARY,
  projectFieldTaxonomy, projectFieldPriority, addProjectIssues, nextProjectIssueId,
  type ProjectIssueField, type ProjectIssue,
} from "@/lib/project-issues-mock"
import { DATA_OPS_TEAM, SEVERITY_COLORS, type IssueTypeDef, type IssueDetails } from "@/lib/property-issues-mock"
import type { ProjectRow } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"

// ── Mock current values derived from the project row ─────────────────────────
const idNum = (row: ProjectRow) => Number(row.id.replace(/\D/g, "")) || 0

/** The project's current mock amenities (deterministic subset of the library). */
export function projectAmenities(row: ProjectRow): string[] {
  const n = idNum(row)
  return PROJECT_AMENITY_LIBRARY.filter((_, i) => (n + i) % 3 !== 0)
}

function currentText(row: ProjectRow, field: ProjectIssueField): string | null {
  const n = idNum(row)
  switch (field.id) {
    case "projectNameEn": return row.name
    case "projectNameAr": return n % 4 === 0 ? null : `${row.name} (AR)`
    case "listingStatus": return row.listingStatus
    case "entryType": return row.entryType
    case "primaryStatus": return row.primaryStatus
    case "developer": return row.developer.name
    case "areaSubarea": return `${row.area} · ${row.subarea}`
    case "location": return `${row.district}, ${row.area}`
    case "polygon": return n % 3 === 0 ? null : "Drawn"
    case "organizations": return row.organizations.length === 2 ? "Nawy & Partners" : row.organizations[0]
    case "category": return row.category
    case "projectType": return row.projectType
    case "projectSubtype": return row.projectSubtype || null
    case "description": return row.seoDescription ? "Available" : null
    case "metadata": return n % 2 === 0 ? "Complete" : null
    case "brochure": return row.brochureCount > 0 ? `${row.brochureCount} file${row.brochureCount !== 1 ? "s" : ""}` : null
    case "listingMasterplan": return row.listingMasterplan ? "Uploaded" : null
    case "gisMasterplan": return row.gisMasterplan ? "Uploaded" : null
    case "numberedMasterplan": return n % 2 === 1 ? "Uploaded" : null
    case "gallery": return row.galleryImages.length > 0 ? `${row.galleryImages.length} items` : null
    case "logo": return n % 5 === 0 ? null : "Uploaded"
    case "amenities": return `${projectAmenities(row).length} amenities`
    default: return null
  }
}

/** Same has-value rule as properties: value present → no "Missing …" types;
 *  value absent → only the Missing type. */
function availableTypes(field: ProjectIssueField, row: ProjectRow): IssueTypeDef[] {
  const tax = projectFieldTaxonomy(field).filter((t) => t.active)
  if (field.kind === "amenities") return tax
  const has = currentText(row, field) != null
  const isMissing = (t: IssueTypeDef) => t.type.startsWith("Missing")
  return has ? tax.filter((t) => !isMissing(t)) : tax.filter(isMissing)
}

interface FieldDraft {
  type: string
  subtype: string | null
  expected: string
  description: string
  addItems: string[]
  removeItems: string[]
}

function emptyDraft(field: ProjectIssueField, row: ProjectRow): FieldDraft {
  const t = availableTypes(field, row)[0] ?? projectFieldTaxonomy(field)[0]
  return { type: t.type, subtype: t.subtypes?.[0] ?? null, expected: "", description: "", addItems: [], removeItems: [] }
}

const STATUS_TAG: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Hidden: "bg-red-100 text-red-700 border-red-200",
  Automatic: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Manual: "bg-blue-100 text-blue-700 border-blue-200",
  Launch: "bg-green-50 text-green-700 border-green-200",
  "On-Sale": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "On-Hold": "bg-orange-50 text-orange-700 border-orange-200",
  "Sold-Off": "bg-red-50 text-red-600 border-red-200",
}

function SmallTag({ value }: { value: string }) {
  return STATUS_TAG[value]
    ? <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_TAG[value])}>{value}</span>
    : <ColorTag value={value} />
}

let assignSeq = 0

export function ReportProjectIssueDrawer({
  row, onClose, onSubmitted,
}: {
  row: ProjectRow | null
  onClose: () => void
  onSubmitted?: (issues: ProjectIssue[]) => void
}) {
  const [q, setQ] = useState("")
  const [drafts, setDrafts] = useState<Map<string, FieldDraft>>(new Map())

  const visibleFields = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? PROJECT_ISSUE_FIELDS.filter((f) => f.label.toLowerCase().includes(needle)) : PROJECT_ISSUE_FIELDS
  }, [q])

  if (!row) return null

  const currentAmenities = projectAmenities(row)
  const missingAmenityOptions = PROJECT_AMENITY_LIBRARY.filter((a) => !currentAmenities.includes(a))

  const toggleField = (field: ProjectIssueField, on: boolean) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      if (on) n.set(field.id, emptyDraft(field, row)); else n.delete(field.id)
      return n
    })
  const patchDraft = (fieldId: string, patch: Partial<FieldDraft>) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) n.set(fieldId, { ...cur, ...patch })
      return n
    })
  const toggleIn = (fieldId: string, key: "addItems" | "removeItems", item: string) =>
    setDrafts((prev) => {
      const n = new Map(prev)
      const cur = n.get(fieldId)
      if (cur) {
        const arr = cur[key].includes(item) ? cur[key].filter((x) => x !== item) : [...cur[key], item]
        n.set(fieldId, { ...cur, [key]: arr })
      }
      return n
    })

  const typeDefOf = (field: ProjectIssueField, d: FieldDraft): IssueTypeDef =>
    projectFieldTaxonomy(field).find((t) => t.type === d.type) ?? projectFieldTaxonomy(field)[0]

  const problemOf = (field: ProjectIssueField, d: FieldDraft): string | null => {
    if (field.kind === "amenities") return d.addItems.length + d.removeItems.length === 0 ? "select what to add or remove" : null
    if (field.valueType === "enum" && typeDefOf(field, d).type.startsWith("Wrong") && !d.expected) return "select the correct value"
    return null
  }

  const invalids = [...drafts.entries()].filter(([fieldId, d]) => {
    const field = PROJECT_ISSUE_FIELDS.find((f) => f.id === fieldId)!
    return problemOf(field, d) != null
  })

  const submit = () => {
    if (drafts.size === 0) return
    const now = new Date().toISOString()
    const created: ProjectIssue[] = [...drafts.entries()].map(([fieldId, d]) => {
      const field = PROJECT_ISSUE_FIELDS.find((f) => f.id === fieldId)!
      let def = typeDefOf(field, d)
      if (field.kind === "amenities") {
        const derived = d.addItems.length && d.removeItems.length ? "Amenities Update" : d.addItems.length ? "Missing Amenity" : "Wrong Amenity"
        def = projectFieldTaxonomy(field).find((t) => t.type === derived) ?? def
      }
      const assignedTo = DATA_OPS_TEAM[assignSeq++ % DATA_OPS_TEAM.length]
      const details: IssueDetails | undefined =
        field.kind === "amenities" ? { amenitiesAdd: d.addItems, amenitiesRemove: d.removeItems } : undefined
      return {
        id: nextProjectIssueId(),
        source: "Data Quality" as const,
        severity: projectFieldPriority(field),
        status: "To Do" as const,
        fieldId: field.id,
        fieldLabel: field.label,
        type: def.type,
        subtype: d.subtype,
        description: [
          `${field.label} — ${def.type.toLowerCase()}${d.subtype ? `: ${d.subtype.toLowerCase()}` : ""}`,
          d.description.trim(),
        ].filter(Boolean).join(" — "),
        expected: d.expected || null,
        current: currentText(row, field),
        reportedBy: "Ezz H.",
        assignedTo,
        developer: { id: row.developer.id, name: row.developer.name },
        project: { id: row.id, name: row.name },
        projectLevel: row.isPhase ? "Phase" as const : "Project" as const,
        listingStatus: row.listingStatus,
        primaryStatus: row.primaryStatus,
        entryType: row.entryType,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
        closedAt: null,
        comments: [],
        activity: [{ id: `PAC-${now}-${field.id}`, kind: "created" as const, actor: "Ezz H.", at: now, detail: "Issue created — To Do" }],
        details,
      }
    })
    addProjectIssues(created)
    toast.success(`${created.length} project issue${created.length !== 1 ? "s" : ""} reported and auto-assigned`)
    onSubmitted?.(created)
    onClose()
  }

  const ChipPicker = ({ options, selected, onToggle, tone }: { options: string[]; selected: string[]; onToggle: (o: string) => void; tone: "add" | "remove" }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.length === 0 && <span className="text-[11px] text-muted-foreground">Nothing available.</span>}
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
              on
                ? tone === "add" ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-red-300 bg-red-100 text-red-700"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {o}
          </button>
        )
      })}
    </div>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[620px] !max-w-[93vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 gap-2 border-b border-border bg-card px-5 py-4">
          <SheetTitle className="text-base font-semibold">Report a Project Issue</SheetTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-semibold text-foreground">{row.name}</span>
            <IdTag value={row.id} />
            <SmallTag value={row.isPhase ? "Phase" : "Project"} />
            <SmallTag value={row.listingStatus} />
            <SmallTag value={row.primaryStatus} />
            <SmallTag value={row.entryType} />
          </div>
          <p className="text-xs text-muted-foreground">{row.developer.name} · {row.area}{row.subarea ? ` · ${row.subarea}` : ""}</p>
        </SheetHeader>

        <div className="shrink-0 border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fields…" className="h-8 pl-8 pr-7 text-sm" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Check every field that has an issue, classify it, and give the correct value. One ticket is created per field and auto-assigned to data operations.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {PROJECT_ISSUE_FIELD_GROUPS.map((group) => {
            const fields = visibleFields.filter((f) => f.group === group)
            if (fields.length === 0) return null
            return (
              <div key={group}>
                <p className="sticky top-0 z-10 border-b border-border bg-muted/80 px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{group}</p>
                <div className="divide-y divide-border">
                  {fields.map((field) => {
                    const draft = drafts.get(field.id)
                    const tax = availableTypes(field, row)
                    const def = draft ? typeDefOf(field, draft) : tax[0] ?? projectFieldTaxonomy(field)[0]
                    const problem = draft ? problemOf(field, draft) : null
                    const current = currentText(row, field)
                    return (
                      <div key={field.id} className="px-5 py-2.5">
                        <label className="flex cursor-pointer items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5">
                            <Checkbox className="h-4 w-4" checked={!!draft} onCheckedChange={(v) => toggleField(field, !!v)} />
                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                          </span>
                          {field.valueType === "enum" && current
                            ? <SmallTag value={current} />
                            : <span className="max-w-[220px] truncate text-xs text-muted-foreground">{current ?? "—"}</span>}
                        </label>

                        {draft && (
                          <div className="mt-2.5 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                            {field.kind !== "amenities" && (
                              <div className={cn("grid gap-2", def.subtypes ? "grid-cols-2" : "grid-cols-1")}>
                                <div className="space-y-1">
                                  <p className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                    Type
                                    <span className={cn("rounded border px-1 py-px text-[9px] font-semibold", SEVERITY_COLORS[projectFieldPriority(field)])}>{projectFieldPriority(field)}</span>
                                  </p>
                                  <Select value={draft.type} onValueChange={(v) => {
                                    const t = projectFieldTaxonomy(field).find((x) => x.type === v) ?? projectFieldTaxonomy(field)[0]
                                    patchDraft(field.id, { type: v, subtype: t.subtypes?.[0] ?? null, expected: "" })
                                  }}>
                                    <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {tax.map((t) => <SelectItem key={t.type} value={t.type} className="text-sm">{t.type}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {def.subtypes && (
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-medium text-muted-foreground">Subtype</p>
                                    <Select value={draft.subtype ?? ""} onValueChange={(v) => patchDraft(field.id, { subtype: v })}>
                                      <SelectTrigger className="h-8 bg-card text-sm"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {def.subtypes.map((s) => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            )}

                            {field.kind === "amenities" && (
                              <>
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-medium text-foreground">Missing — should be added</p>
                                  <ChipPicker options={missingAmenityOptions} selected={draft.addItems} onToggle={(o) => toggleIn(field.id, "addItems", o)} tone="add" />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-medium text-foreground">
                                    Wrong — should be removed
                                    {problem && <span className="ml-1 text-red-600">— required</span>}
                                  </p>
                                  <ChipPicker options={currentAmenities} selected={draft.removeItems} onToggle={(o) => toggleIn(field.id, "removeItems", o)} tone="remove" />
                                </div>
                              </>
                            )}

                            {/* Expected result — enums pick the correct value, text fields type it */}
                            {field.kind === "value" && field.id !== "polygon" && def.type.startsWith("Wrong") && (
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  Correct value / expected result
                                  {problem === "select the correct value" && <span className="ml-1 text-red-600">— required</span>}
                                </p>
                                {field.valueType === "enum" ? (
                                  <Select value={draft.expected || undefined} onValueChange={(v) => patchDraft(field.id, { expected: v })}>
                                    <SelectTrigger className="h-8 bg-card text-sm"><SelectValue placeholder={`Select the correct ${field.label.toLowerCase()}…`} /></SelectTrigger>
                                    <SelectContent>
                                      {(field.options ?? []).filter((o) => o !== current).map((o) => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={draft.expected}
                                    onChange={(e) => patchDraft(field.id, { expected: e.target.value })}
                                    placeholder={`Expected ${field.label.toLowerCase()}${current ? ` (current: ${current})` : ""}`}
                                    className="h-8 bg-card text-sm"
                                  />
                                )}
                              </div>
                            )}

                            <div className="space-y-1">
                              <p className="text-[11px] font-medium text-muted-foreground">Description</p>
                              <Input
                                value={draft.description}
                                onChange={(e) => patchDraft(field.id, { description: e.target.value })}
                                placeholder="Describe the issue (optional)"
                                className="h-8 bg-card text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {visibleFields.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No fields match "{q}".</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {drafts.size === 0 ? "No fields selected" : `${drafts.size} issue${drafts.size !== 1 ? "s" : ""} will be created`}
            {invalids.length > 0 && <span className="ml-1 text-red-600">— complete the required inputs</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8" disabled={drafts.size === 0 || invalids.length > 0} onClick={submit}>
              Report {drafts.size > 0 ? `${drafts.size} Issue${drafts.size !== 1 ? "s" : ""}` : "Issues"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

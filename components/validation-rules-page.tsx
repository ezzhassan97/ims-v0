"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Calendar, MoreHorizontal, ToggleRight, Filter } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { RuleBuilderModal } from "@/components/rule-builder-modal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TableCard, TableCardHeader, TableFooter, TableToolbar, FiltersDrawer, FilterDrawerField, FilterSelect, MultiSortControl, IdTag, type SortLevel } from "@/components/table-kit"
import { Tag, fmtDateTime } from "@/components/projects-list-page"

export interface ValidationRule {
  id: string
  name: string
  description: string // Added description field
  entity: "Developer" | "Project" | "Property"
  type: "Warning" | "Blocking"
  conditions: any
  createdAt: string
  updatedAt: string
  isActive: boolean
}

const RULE_TONES: Record<ValidationRule["type"], string> = {
  Warning: "bg-amber-50 text-amber-700 border-amber-200",
  Blocking: "bg-red-100 text-red-700 border-red-200",
}

const HANDWRITTEN: ValidationRule[] = [
  {
    id: "VR-001",
    name: "Low Price Warning for New Giza Properties",
    description:
      "Flags properties in New Giza compound that are priced unusually low (below 2M EGP) for manual review.",
    entity: "Property",
    type: "Warning",
    conditions: {
      operator: "AND",
      conditions: [
        { field: "compound", operator: "equals", value: "New Giza" },
        { field: "price", operator: "lessThan", value: 2000000 },
      ],
    },
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    isActive: true,
  },
  {
    id: "VR-002",
    name: "Invalid Garden Unit Configuration",
    description: "Blocks units that claim to have a garden area but are located on upper floors (above ground floor).",
    entity: "Property",
    type: "Blocking",
    conditions: {
      operator: "AND",
      conditions: [
        { field: "floorNumber", operator: "greaterThan", value: 1 },
        { field: "gardenArea", operator: "greaterThan", value: 1 },
      ],
    },
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-12T09:15:00Z",
    isActive: true,
  },
  {
    id: "VR-003",
    name: "Missing Developer Contact Information",
    description: "Warns when developer records are missing essential contact details like email or phone number.",
    entity: "Developer",
    type: "Warning",
    conditions: {
      operator: "OR",
      conditions: [
        { field: "email", operator: "isEmpty", value: null },
        { field: "phone", operator: "isEmpty", value: null },
      ],
    },
    createdAt: "2024-01-08T11:00:00Z",
    updatedAt: "2024-01-08T11:00:00Z",
    isActive: false,
  },
  {
    id: "VR-004",
    name: "Missing Project Delivery Date",
    description: "Warns when projects are missing delivery date information which is essential for customer decisions.",
    entity: "Project",
    type: "Warning",
    conditions: {
      operator: "AND",
      conditions: [{ field: "deliveryDate", operator: "isEmpty", value: null }],
    },
    createdAt: "2024-01-20T09:30:00Z",
    updatedAt: "2024-01-20T09:30:00Z",
    isActive: true,
  },
]

// Deterministic filler up to 30 rules across the three entities.
const RULE_TEMPLATES: Record<ValidationRule["entity"], { name: string; description: string; field: string; op: string; value: string | number }[]> = {
  Property: [
    { name: "Zero Built-Up Area", description: "Blocks properties published with a zero or missing built-up area.", field: "builtUpArea", op: "lessThanOrEqual", value: 0 },
    { name: "Delivery Before Launch", description: "Warns when a unit's delivery date is earlier than its project launch date.", field: "deliveryDate", op: "lessThan", value: "launchDate" },
    { name: "Price Per Meter Outlier", description: "Flags units priced above 400K EGP per square meter for review.", field: "pricePerMeter", op: "greaterThan", value: 400000 },
    { name: "Bedrooms Without Bathrooms", description: "Blocks units with 3+ bedrooms and no bathrooms recorded.", field: "bathrooms", op: "isEmpty", value: "" },
    { name: "Duplicate Unit Number", description: "Warns when two units in the same building share a unit number.", field: "unitNumber", op: "contains", value: "duplicate" },
    { name: "Garden Area Exceeds Land", description: "Blocks units whose garden area is larger than the total land area.", field: "gardenArea", op: "greaterThan", value: "landArea" },
  ],
  Project: [
    { name: "Project Without Location", description: "Blocks projects published without coordinates or a polygon.", field: "coordinates", op: "isEmpty", value: "" },
    { name: "Missing Masterplan", description: "Warns when an On-Sale project has no listing masterplan uploaded.", field: "listingMasterplan", op: "isEmpty", value: "" },
    { name: "Phase Without Parent", description: "Blocks phases that lost their parent project reference.", field: "mainProject", op: "isEmpty", value: "" },
    { name: "Stale SEO Description", description: "Warns when a project's SEO description hasn't been updated in a year.", field: "seoUpdatedAt", op: "lessThan", value: "1y" },
  ],
  Developer: [
    { name: "Developer Without Logo", description: "Warns when a developer record is missing its logo asset.", field: "logo", op: "isEmpty", value: "" },
    { name: "Hidden Developer With Active Projects", description: "Blocks hiding a developer that still has Active-listed projects.", field: "activeProjects", op: "greaterThan", value: 0 },
    { name: "Missing WhatsApp Group", description: "Warns when a developer has no linked WhatsApp group.", field: "whatsappGroups", op: "isEmpty", value: "" },
  ],
}

function seedRules(): ValidationRule[] {
  const out: ValidationRule[] = [...HANDWRITTEN]
  const entities: ValidationRule["entity"][] = ["Property", "Project", "Developer"]
  let n = out.length
  let i = 0
  while (n < 30) {
    const entity = entities[i % 3]
    const tpl = RULE_TEMPLATES[entity][Math.floor(i / 3) % RULE_TEMPLATES[entity].length]
    const cycle = Math.floor(i / (RULE_TEMPLATES[entity].length * 3))
    n++
    const day = String(2 + (i % 26)).padStart(2, "0")
    out.push({
      id: `VR-${String(n).padStart(3, "0")}`,
      name: cycle ? `${tpl.name} #${cycle + 1}` : tpl.name,
      description: tpl.description,
      entity,
      type: i % 3 === 1 ? "Blocking" : "Warning",
      conditions: { operator: "AND", conditions: [{ field: tpl.field, operator: tpl.op, value: tpl.value }] },
      createdAt: `2026-06-${day}T09:30:00Z`,
      updatedAt: `2026-07-${day}T14:00:00Z`,
      isActive: i % 4 !== 2,
    })
    i++
  }
  return out
}

const mockRules: ValidationRule[] = seedRules()

export function ValidationRulesPage() {
  const [rules, setRules] = useState<ValidationRule[]>(mockRules)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"Property" | "Project" | "Developer">("Property") // Added tab state
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [search, setSearch] = useState("")
  const [sorts, setSorts] = useState<SortLevel[]>([{ key: "updatedAt", dir: "desc" }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const handleAddRule = (rule: Omit<ValidationRule, "id" | "createdAt" | "updatedAt">) => {
    const newRule: ValidationRule = {
      ...rule,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRules([newRule, ...rules])
    setIsAddModalOpen(false)
  }

  const handleEditRule = (rule: ValidationRule) => {
    setRules(rules.map((r) => (r.id === rule.id ? { ...rule, updatedAt: new Date().toISOString() } : r)))
    setEditingRule(null)
  }

  const handleDeleteRule = () => {
    if (deletingRuleId) {
      setRules(rules.filter((r) => r.id !== deletingRuleId))
      setDeletingRuleId(null)
    }
  }

  const handleToggleActive = (id: string) => {
    setRules(
      rules.map((r) =>
        r.id === id
          ? {
              ...r,
              isActive: !r.isActive,
              updatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
  }

  const generateRuleDescription = (conditions: any): string => {
    if (!conditions) return "No conditions defined"

    const formatCondition = (cond: any): string => {
      if (cond.conditions) {
        const parts = cond.conditions.map((c: any) => formatCondition(c))
        return `(${parts.join(` ${cond.operator} `)})`
      }
      const operatorText: Record<string, string> = {
        equals: "equals",
        notEquals: "does not equal",
        greaterThan: "is greater than",
        lessThan: "is less than",
        greaterThanOrEqual: "is greater than or equal to",
        lessThanOrEqual: "is less than or equal to",
        contains: "contains",
        notContains: "does not contain",
        isEmpty: "is empty",
        isNotEmpty: "is not empty",
      }
      const op = operatorText[cond.operator] || cond.operator
      if (cond.operator === "isEmpty" || cond.operator === "isNotEmpty") {
        return `${cond.field} ${op}`
      }
      return `${cond.field} ${op} "${cond.value}"`
    }

    return formatCondition(conditions)
  }

  const filteredRules = rules
    .filter((rule) => {
      if (rule.entity !== activeTab) return false
      if (search && !`${rule.id} ${rule.name}`.toLowerCase().includes(search.toLowerCase())) return false
      if (filterType && rule.type !== filterType) return false
      if (filterStatus && (filterStatus === "Active" ? !rule.isActive : rule.isActive)) return false
      return true
    })
    .sort((a, b) => {
      for (const s of sorts.length ? sorts : [{ key: "updatedAt", dir: "desc" as const }]) {
        const va = new Date(a[s.key as "createdAt" | "updatedAt"]).getTime()
        const vb = new Date(b[s.key as "createdAt" | "updatedAt"]).getTime()
        if (va !== vb) return s.dir === "asc" ? va - vb : vb - va
      }
      return 0
    })
  const pagedRules = filteredRules.slice((page - 1) * pageSize, page * pageSize)
  const countOf = (entity: ValidationRule["entity"]) => rules.filter((r) => r.entity === entity).length

  const ruleCard = (rule: ValidationRule) => (
    <div key={rule.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/40">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
            <IdTag value={rule.id} />
            <Tag value={rule.type} cls={RULE_TONES[rule.type]} />
          </div>
          <p className="text-sm text-muted-foreground">{rule.description}</p>
          <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
            {generateRuleDescription(rule.conditions)}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Created: {fmtDateTime(rule.createdAt)}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Updated: {fmtDateTime(rule.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Tag value={rule.isActive ? "Active" : "Inactive"} cls={rule.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingRule(rule)}><Pencil className="h-4 w-4 mr-2" />Edit Rule</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(rule.id)}>
                <ToggleRight className="h-4 w-4 mr-2" />Set {rule.isActive ? "Inactive" : "Active"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingRuleId(rule.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete Rule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  const switchTab = (t: typeof activeTab) => { setActiveTab(t); setPage(1) }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Validation Rules</h1>
        <p className="text-sm text-muted-foreground">Build and manage data quality rules to ensure accuracy and validity.</p>
      </div>

      {/* Entity tabs */}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {(["Property", "Project", "Developer"] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => switchTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t} Rules
            <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-medium text-blue-700">{countOf(t)}</span>
          </button>
        ))}
      </div>

      {/* Toolbar — canonical: search + filters, divider, list controls */}
      <TableToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Rule name or ID"
        filters={
          <>
            <FilterSelect label="Type" value={filterType} options={["Warning", "Blocking"]} onChange={(v) => { setFilterType(v); setPage(1) }} className="w-36" />
            <FilterSelect label="Status" value={filterStatus} options={["Active", "Inactive"]} onChange={(v) => { setFilterStatus(v); setPage(1) }} className="w-36" />
          </>
        }
        activeFilters={(filterType ? 1 : 0) + (filterStatus ? 1 : 0)}
        onAllFilters={() => setFiltersOpen(true)}
        sortControl={
          <MultiSortControl
            fields={[{ key: "updatedAt", label: "Updated At" }, { key: "createdAt", label: "Created At" }]}
            sorts={sorts}
            onChange={(next) => { setSorts(next); setPage(1) }}
          />
        }
        hideAdvanced
        hideGroup
        hideColumns
      />

      <TableCard>
        <TableCardHeader
          title={`${activeTab} Rules`}
          count={filteredRules.length}
          cta={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Add Rule
            </Button>
          }
        />
      </TableCard>

      {/* Rule cards sit directly on the page background */}
      <div className="space-y-3">
        {pagedRules.map(ruleCard)}
        {pagedRules.length === 0 && (
          <div className="space-y-3 rounded-xl border border-border bg-card py-10 text-center">
            <div className="flex justify-center"><div className="rounded-full bg-secondary p-4"><Filter className="h-8 w-8 text-muted-foreground" /></div></div>
            <div>
              <h3 className="font-medium text-foreground">No rules found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filterType || filterStatus || search ? "Try adjusting your search or filters" : `Create your first ${activeTab} validation rule to get started`}
              </p>
            </div>
          </div>
        )}
      </div>

      <TableCard>
        <TableFooter page={page} pageSize={pageSize} total={filteredRules.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="rules" />
      </TableCard>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={(filterType ? 1 : 0) + (filterStatus ? 1 : 0)}
        onClear={() => { setFilterType(""); setFilterStatus(""); setPage(1) }}
      >
        <FilterDrawerField label="Type">
          <FilterSelect label="Type" value={filterType} options={["Warning", "Blocking"]} onChange={(v) => { setFilterType(v); setPage(1) }} className="w-full" />
        </FilterDrawerField>
        <FilterDrawerField label="Status">
          <FilterSelect label="Status" value={filterStatus} options={["Active", "Inactive"]} onChange={(v) => { setFilterStatus(v); setPage(1) }} className="w-full" />
        </FilterDrawerField>
      </FiltersDrawer>

      {/* Modals */}
      <RuleBuilderModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleAddRule}
        rule={null}
        entity={activeTab}
      />
      {editingRule && (
        <RuleBuilderModal
          open={true}
          onOpenChange={(open) => !open && setEditingRule(null)}
          onSave={handleEditRule}
          rule={editingRule}
          entity={editingRule.entity}
        />
      )}
      <ConfirmDialog
        open={deletingRuleId !== null}
        onOpenChange={(open) => !open && setDeletingRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Delete Validation Rule"
        description="Are you sure you want to delete this rule? This action cannot be undone."
      />
    </div>
  )
}

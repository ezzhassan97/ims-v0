"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, AlertTriangle, ShieldAlert, Filter, Calendar, ArrowUpDown } from "lucide-react"
import { RuleBuilderModal } from "@/components/rule-builder-modal"
import { ConfirmDialog } from "@/components/confirm-dialog"

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

const mockRules: ValidationRule[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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

export function ValidationRulesPage() {
  const [rules, setRules] = useState<ValidationRule[]>(mockRules)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"Property" | "Project" | "Developer">("Property") // Added tab state
  const [filterType, setFilterType] = useState<string>("All")
  const [filterStatus, setFilterStatus] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

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
      const entityMatch = rule.entity === activeTab
      const typeMatch = filterType === "All" || rule.type === filterType
      const statusMatch = filterStatus === "All" || (filterStatus === "Active" ? rule.isActive : !rule.isActive)
      return entityMatch && typeMatch && statusMatch
    })
    .sort((a, b) => {
      const dateA = new Date(a[sortBy]).getTime()
      const dateB = new Date(b[sortBy]).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const RulesList = () => (
    <>
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
          >
            <option value="All">All Types</option>
            <option value="Warning">Warning</option>
            <option value="Blocking">Blocking</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
          >
            <option value="createdAt">Created At</option>
            <option value="updatedAt">Updated At</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          <div className="ml-auto text-sm text-muted-foreground">
            {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Header Row */}
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-foreground">{rule.name}</h3>
                  {rule.type === "Blocking" ? (
                    <Badge variant="destructive" className="text-xs">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Blocking
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Warning
                    </Badge>
                  )}
                  {!rule.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{rule.description}</p>

                {/* Condition Preview */}
                <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2 leading-relaxed font-mono">
                  {generateRuleDescription(rule.conditions)}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created: {formatDate(rule.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Updated: {formatDate(rule.updatedAt)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant={rule.isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleActive(rule.id)}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingRule(rule)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeletingRuleId(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredRules.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-secondary">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-foreground">No rules found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filterType !== "All" || filterStatus !== "All"
                  ? "Try adjusting your filters"
                  : `Create your first ${activeTab} validation rule to get started`}
              </p>
            </div>
          </div>
        </Card>
      )}
    </>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Validation Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage data quality rules to ensure accuracy and validity
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="Property" className="data-[state=active]:bg-card">
            Property Rules
          </TabsTrigger>
          <TabsTrigger value="Project" className="data-[state=active]:bg-card">
            Project Rules
          </TabsTrigger>
          <TabsTrigger value="Developer" className="data-[state=active]:bg-card">
            Developer Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="Property" className="space-y-4 mt-4">
          <RulesList />
        </TabsContent>

        <TabsContent value="Project" className="space-y-4 mt-4">
          <RulesList />
        </TabsContent>

        <TabsContent value="Developer" className="space-y-4 mt-4">
          <RulesList />
        </TabsContent>
      </Tabs>

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

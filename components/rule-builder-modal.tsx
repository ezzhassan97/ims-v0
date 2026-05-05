"use client"

import React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, Check, ChevronsUpDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ValidationRule } from "@/components/validation-rules-page"

interface Condition {
  field: string
  operator: string
  value: any
}

interface ConditionGroup {
  operator: "AND" | "OR"
  conditions: (Condition | ConditionGroup)[]
}

type FieldType = "text" | "numeric" | "date" | "boolean" | "list"

interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  listOptions?: string[]
}

const propertyFields: FieldDefinition[] = [
  { key: "unit_id", label: "Unit ID", type: "text" },
  { key: "building_number", label: "Building Number", type: "text" },
  { key: "price", label: "Price", type: "numeric" },
  { key: "gross_area", label: "Gross Area", type: "numeric" },
  { key: "delivery_date", label: "Delivery Date", type: "date" },
  { key: "nanny", label: "Nanny", type: "boolean" },
  { key: "is_serviced", label: "Is Serviced", type: "boolean" },
  { key: "property_type", label: "Property Type", type: "list", listOptions: ["Apartment", "Villa", "Townhouse", "Duplex", "Penthouse", "Studio", "Chalet"] },
  { key: "finishing_type", label: "Finishing Type", type: "list", listOptions: ["Fully Finished", "Semi Finished", "Core & Shell", "Furnished", "Not Finished"] },
]

const operatorsByType: Record<FieldType, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Not Contains" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
  ],
  numeric: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not Equals" },
    { value: "greaterThan", label: "Greater Than" },
    { value: "lessThan", label: "Less Than" },
    { value: "greaterThanOrEqual", label: ">= (Greater or Equal)" },
    { value: "lessThanOrEqual", label: "<= (Less or Equal)" },
    { value: "between", label: "Between" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
  ],
  date: [
    { value: "equals", label: "On" },
    { value: "notEquals", label: "Not On" },
    { value: "greaterThan", label: "After" },
    { value: "lessThan", label: "Before" },
    { value: "greaterThanOrEqual", label: "On or After" },
    { value: "lessThanOrEqual", label: "On or Before" },
    { value: "between", label: "Between" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
  ],
  boolean: [
    { value: "equals", label: "Is" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
  ],
  list: [
    { value: "equals", label: "Is" },
    { value: "notEquals", label: "Is Not" },
    { value: "in", label: "Is Any Of" },
    { value: "notIn", label: "Is None Of" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
  ],
}

const noValueOperators = ["isEmpty", "isNotEmpty"]

function getFieldDef(fieldKey: string): FieldDefinition | undefined {
  return propertyFields.find((f) => f.key === fieldKey)
}

function getOperatorsForField(fieldKey: string) {
  const fieldDef = getFieldDef(fieldKey)
  if (!fieldDef) return operatorsByType.text
  return operatorsByType[fieldDef.type]
}

// Mock data for Areas, Developers, Projects
const mockAreas = [
  { id: "AREA-001", name: "New Cairo" },
  { id: "AREA-002", name: "6th of October" },
  { id: "AREA-003", name: "North Coast" },
  { id: "AREA-004", name: "New Capital" },
  { id: "AREA-005", name: "Sheikh Zayed" },
]

const mockDevelopers = [
  { id: "DEV-001", name: "Palm Hills Development", areaIds: ["AREA-001", "AREA-002"] },
  { id: "DEV-002", name: "Emaar Misr", areaIds: ["AREA-004", "AREA-001"] },
  { id: "DEV-003", name: "Sodic", areaIds: ["AREA-005", "AREA-002"] },
  { id: "DEV-004", name: "Mountain View", areaIds: ["AREA-001", "AREA-003"] },
  { id: "DEV-005", name: "Ora Developers", areaIds: ["AREA-004"] },
  { id: "DEV-006", name: "Hyde Park", areaIds: ["AREA-001"] },
  { id: "DEV-007", name: "Tatweer Misr", areaIds: ["AREA-003", "AREA-001"] },
]

interface MockProject {
  id: string
  name: string
  listingStatus: "Active" | "Hidden"
  developerId: string
  areaId: string
  parentCompoundId: string | null
  parentCompoundName: string | null
}

const mockProjects: MockProject[] = [
  // Palm Hills - New Cairo compounds
  { id: "PRJ-001", name: "Palm Hills New Cairo", listingStatus: "Active", developerId: "DEV-001", areaId: "AREA-001", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-002", name: "The Village", listingStatus: "Active", developerId: "DEV-001", areaId: "AREA-001", parentCompoundId: "PRJ-001", parentCompoundName: "Palm Hills New Cairo" },
  { id: "PRJ-003", name: "Palm Parks", listingStatus: "Hidden", developerId: "DEV-001", areaId: "AREA-001", parentCompoundId: "PRJ-001", parentCompoundName: "Palm Hills New Cairo" },
  // Palm Hills - October compounds
  { id: "PRJ-004", name: "Palm Hills October", listingStatus: "Active", developerId: "DEV-001", areaId: "AREA-002", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-005", name: "Woodville", listingStatus: "Active", developerId: "DEV-001", areaId: "AREA-002", parentCompoundId: "PRJ-004", parentCompoundName: "Palm Hills October" },
  // Emaar Misr
  { id: "PRJ-006", name: "Marassi", listingStatus: "Active", developerId: "DEV-002", areaId: "AREA-004", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-007", name: "Marassi Shores", listingStatus: "Active", developerId: "DEV-002", areaId: "AREA-004", parentCompoundId: "PRJ-006", parentCompoundName: "Marassi" },
  { id: "PRJ-008", name: "Mivida", listingStatus: "Active", developerId: "DEV-002", areaId: "AREA-001", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-009", name: "Mivida Gardens", listingStatus: "Hidden", developerId: "DEV-002", areaId: "AREA-001", parentCompoundId: "PRJ-008", parentCompoundName: "Mivida" },
  // Sodic
  { id: "PRJ-010", name: "Sodic East", listingStatus: "Active", developerId: "DEV-003", areaId: "AREA-001", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-011", name: "The Estates", listingStatus: "Active", developerId: "DEV-003", areaId: "AREA-005", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-012", name: "VYE", listingStatus: "Active", developerId: "DEV-003", areaId: "AREA-005", parentCompoundId: "PRJ-011", parentCompoundName: "The Estates" },
  // Mountain View
  { id: "PRJ-013", name: "Mountain View iCity", listingStatus: "Active", developerId: "DEV-004", areaId: "AREA-001", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-014", name: "Mountain View Chillout Park", listingStatus: "Hidden", developerId: "DEV-004", areaId: "AREA-001", parentCompoundId: "PRJ-013", parentCompoundName: "Mountain View iCity" },
  { id: "PRJ-015", name: "Mountain View North Coast", listingStatus: "Active", developerId: "DEV-004", areaId: "AREA-003", parentCompoundId: null, parentCompoundName: null },
  // Ora Developers
  { id: "PRJ-016", name: "ZED East", listingStatus: "Active", developerId: "DEV-005", areaId: "AREA-004", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-017", name: "ZED Park", listingStatus: "Active", developerId: "DEV-005", areaId: "AREA-004", parentCompoundId: "PRJ-016", parentCompoundName: "ZED East" },
  // Hyde Park
  { id: "PRJ-018", name: "Hyde Park New Cairo", listingStatus: "Active", developerId: "DEV-006", areaId: "AREA-001", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-019", name: "Hyde Park Garden Lakes", listingStatus: "Hidden", developerId: "DEV-006", areaId: "AREA-001", parentCompoundId: "PRJ-018", parentCompoundName: "Hyde Park New Cairo" },
  // Tatweer Misr
  { id: "PRJ-020", name: "Il Monte Galala", listingStatus: "Active", developerId: "DEV-007", areaId: "AREA-003", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-021", name: "Fouka Bay", listingStatus: "Active", developerId: "DEV-007", areaId: "AREA-003", parentCompoundId: null, parentCompoundName: null },
  { id: "PRJ-022", name: "D-Bay", listingStatus: "Active", developerId: "DEV-007", areaId: "AREA-003", parentCompoundId: "PRJ-021", parentCompoundName: "Fouka Bay" },
]

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  onClear,
  placeholder,
  renderOption,
}: {
  label: string
  options: { id: string; label: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClear: () => void
  placeholder: string
  renderOption?: (option: { id: string; label: string }) => React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full min-h-[38px] px-3 py-1.5 border border-border rounded-md bg-background text-sm text-left"
        >
          <span className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedIds.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selectedIds.length > 0 && selectedIds.length <= 2 &&
              selectedIds.map((id) => {
                const opt = options.find((o) => o.id === id)
                return (
                  <Badge key={id} variant="secondary" className="text-[11px] gap-1 py-0">
                    {opt?.label ?? id}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(id)
                      }}
                    />
                  </Badge>
                )
              })}
            {selectedIds.length > 2 && (
              <Badge variant="secondary" className="text-[11px] py-0">{selectedIds.length} selected</Badge>
            )}
          </span>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {selectedIds.length > 0 && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-[260px] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">No results found</p>
              )}
              {filtered.map((option) => {
                const isSelected = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onToggle(option.id)}
                    className={cn(
                      "flex items-start gap-2 w-full px-2 py-1.5 rounded text-left transition-colors",
                      isSelected ? "bg-primary/10" : "hover:bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-4 w-4 mt-0.5 rounded border flex-shrink-0 transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {renderOption ? renderOption(option) : <span className="text-sm">{option.label}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Projects multi-select with compound grouping
function ProjectsMultiSelect({
  projects,
  selectedIds,
  onToggle,
  onClear,
}: {
  projects: MockProject[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClear: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Group projects: main compounds first, then subcompounds underneath, sorted alphabetically
  const groupedProjects = useMemo(() => {
    const mainCompounds = projects
      .filter((p) => p.parentCompoundId === null)
      .sort((a, b) => a.name.localeCompare(b.name))

    const groups: { main: MockProject; subs: MockProject[] }[] = []

    for (const main of mainCompounds) {
      const subs = projects
        .filter((p) => p.parentCompoundId === main.id)
        .sort((a, b) => a.name.localeCompare(b.name))
      groups.push({ main, subs })
    }

    // Also include orphan subcompounds whose parent might have been filtered out
    const allGroupedIds = new Set(groups.flatMap((g) => [g.main.id, ...g.subs.map((s) => s.id)]))
    const orphans = projects.filter((p) => !allGroupedIds.has(p.id) && p.parentCompoundId !== null)
    if (orphans.length > 0) {
      for (const o of orphans.sort((a, b) => a.name.localeCompare(b.name))) {
        groups.push({ main: o, subs: [] })
      }
    }

    return groups
  }, [projects])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedProjects
    const q = search.toLowerCase()
    return groupedProjects
      .map((g) => ({
        main: g.main,
        subs: g.subs.filter((s) => s.name.toLowerCase().includes(q)),
        mainMatches: g.main.name.toLowerCase().includes(q),
      }))
      .filter((g) => g.mainMatches || g.subs.length > 0)
      .map((g) => ({
        main: g.main,
        subs: g.mainMatches ? groupedProjects.find((og) => og.main.id === g.main.id)?.subs ?? g.subs : g.subs,
      }))
  }, [groupedProjects, search])

  const allProjectOptions = projects.map((p) => ({ id: p.id, label: p.name }))

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-sm">Projects</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full min-h-[38px] px-3 py-1.5 border border-border rounded-md bg-background text-sm text-left"
        >
          <span className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedIds.length === 0 && <span className="text-muted-foreground">Select projects...</span>}
            {selectedIds.length > 0 && selectedIds.length <= 2 &&
              selectedIds.map((id) => {
                const proj = allProjectOptions.find((o) => o.id === id)
                return (
                  <Badge key={id} variant="secondary" className="text-[11px] gap-1 py-0">
                    {proj?.label ?? id}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(id)
                      }}
                    />
                  </Badge>
                )
              })}
            {selectedIds.length > 2 && (
              <Badge variant="secondary" className="text-[11px] py-0">{selectedIds.length} selected</Badge>
            )}
          </span>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {selectedIds.length > 0 && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {filteredGroups.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">No projects found</p>
              )}
              {filteredGroups.map((group) => (
                <div key={group.main.id} className="mb-1">
                  {/* Main compound */}
                  <button
                    type="button"
                    onClick={() => onToggle(group.main.id)}
                    className={cn(
                      "flex items-start gap-2 w-full px-2 py-1.5 rounded text-left transition-colors",
                      selectedIds.includes(group.main.id) ? "bg-primary/10" : "hover:bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-4 w-4 mt-0.5 rounded border flex-shrink-0 transition-colors",
                      selectedIds.includes(group.main.id) ? "bg-primary border-primary" : "border-border"
                    )}>
                      {selectedIds.includes(group.main.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{group.main.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                            group.main.listingStatus === "Active"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {group.main.listingStatus}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Main</p>
                    </div>
                  </button>

                  {/* Subcompounds */}
                  {group.subs.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onToggle(sub.id)}
                      className={cn(
                        "flex items-start gap-2 w-full pl-7 pr-2 py-1.5 rounded text-left transition-colors",
                        selectedIds.includes(sub.id) ? "bg-primary/10" : "hover:bg-secondary"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-4 w-4 mt-0.5 rounded border flex-shrink-0 transition-colors",
                        selectedIds.includes(sub.id) ? "bg-primary border-primary" : "border-border"
                      )}>
                        {selectedIds.includes(sub.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{sub.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                              sub.listingStatus === "Active"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            )}
                          >
                            {sub.listingStatus}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{sub.parentCompoundName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Dynamic value input based on field type and operator
function ConditionValueInput({
  fieldDef,
  fieldType,
  operator,
  value,
  onChange,
}: {
  fieldDef: FieldDefinition | undefined
  fieldType: FieldType
  operator: string
  value: any
  onChange: (val: any) => void
}) {
  // Boolean: simple true/false select
  if (fieldType === "boolean") {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    )
  }

  // List type: single select for equals/notEquals, multi-select chips for in/notIn
  if (fieldType === "list" && fieldDef?.listOptions) {
    const options = fieldDef.listOptions

    if (operator === "in" || operator === "notIn") {
      const selectedValues: string[] = Array.isArray(value) ? value : []
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1 min-h-[30px] px-2.5 py-1.5 border border-border rounded-md bg-background">
            {selectedValues.length === 0 && (
              <span className="text-sm text-muted-foreground">Select values...</span>
            )}
            {selectedValues.map((v) => (
              <Badge key={v} variant="secondary" className="text-[11px] gap-1 py-0">
                {v}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onChange(selectedValues.filter((sv) => sv !== v))}
                />
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {options.filter((o) => !selectedValues.includes(o)).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange([...selectedValues, opt])}
                className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                + {opt}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Single select
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  // Numeric: between needs two inputs
  if (fieldType === "numeric" && operator === "between") {
    const rangeVal = typeof value === "object" && value !== null ? value : { min: "", max: "" }
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={rangeVal.min ?? ""}
          onChange={(e) => onChange({ ...rangeVal, min: e.target.value })}
          placeholder="Min"
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground flex-shrink-0">to</span>
        <Input
          type="number"
          value={rangeVal.max ?? ""}
          onChange={(e) => onChange({ ...rangeVal, max: e.target.value })}
          placeholder="Max"
          className="flex-1"
        />
      </div>
    )
  }

  // Numeric: regular input
  if (fieldType === "numeric") {
    return (
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter number..."
        className="w-full"
      />
    )
  }

  // Date: between needs two date inputs
  if (fieldType === "date" && operator === "between") {
    const rangeVal = typeof value === "object" && value !== null ? value : { from: "", to: "" }
    return (
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={rangeVal.from ?? ""}
          onChange={(e) => onChange({ ...rangeVal, from: e.target.value })}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground flex-shrink-0">to</span>
        <Input
          type="date"
          value={rangeVal.to ?? ""}
          onChange={(e) => onChange({ ...rangeVal, to: e.target.value })}
          className="flex-1"
        />
      </div>
    )
  }

  // Date: single date input
  if (fieldType === "date") {
    return (
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    )
  }

  // Text: default text input
  return (
    <Input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="w-full"
    />
  )
}

interface RuleBuilderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: any) => void
  rule: ValidationRule | null
  entity: "Developer" | "Project" | "Property"
}

export function RuleBuilderModal({ open, onOpenChange, onSave, rule, entity: initialEntity }: RuleBuilderModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [entity] = useState<"Developer" | "Project" | "Property">(initialEntity)
  const [type, setType] = useState<"Warning" | "Blocking">("Warning")
  const [isActive, setIsActive] = useState(true)
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([
    {
      operator: "AND",
      conditions: [{ field: "", operator: "equals", value: "" }],
    },
  ])

  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setDescription(rule.description)
      setType(rule.type)
      setIsActive(rule.isActive)
      setSelectedAreaIds(rule.areaIds ?? [])
      setSelectedDeveloperIds(rule.developerIds ?? [])
      setSelectedProjectIds(rule.projectIds ?? [])
      if (rule.conditions) {
        setConditionGroups([rule.conditions])
      }
    } else {
      setName("")
      setDescription("")
      setType("Warning")
      setIsActive(true)
      setSelectedAreaIds([])
      setSelectedDeveloperIds([])
      setSelectedProjectIds([])
      setConditionGroups([
        {
          operator: "AND",
          conditions: [{ field: "", operator: "equals", value: "" }],
        },
      ])
    }
  }, [rule, open])

  // Dependent filtering: developers filtered by selected areas
  const filteredDevelopers = useMemo(() => {
    if (selectedAreaIds.length === 0) return mockDevelopers
    return mockDevelopers.filter((d) => d.areaIds.some((aId) => selectedAreaIds.includes(aId)))
  }, [selectedAreaIds])

  // Projects filtered by selected areas AND selected developers
  const filteredProjects = useMemo(() => {
    let result = mockProjects
    if (selectedAreaIds.length > 0) {
      result = result.filter((p) => selectedAreaIds.includes(p.areaId))
    }
    if (selectedDeveloperIds.length > 0) {
      result = result.filter((p) => selectedDeveloperIds.includes(p.developerId))
    }
    return result
  }, [selectedAreaIds, selectedDeveloperIds])

  // When area filter changes, clean up developer/project selections that no longer match
  useEffect(() => {
    if (selectedAreaIds.length > 0) {
      const validDevIds = filteredDevelopers.map((d) => d.id)
      setSelectedDeveloperIds((prev) => prev.filter((id) => validDevIds.includes(id)))
    }
  }, [selectedAreaIds, filteredDevelopers])

  useEffect(() => {
    const validProjIds = filteredProjects.map((p) => p.id)
    setSelectedProjectIds((prev) => prev.filter((id) => validProjIds.includes(id)))
  }, [filteredProjects])

  const toggleArea = (id: string) => {
    setSelectedAreaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const toggleDeveloper = (id: string) => {
    setSelectedDeveloperIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const addConditionToGroup = (groupIndex: number) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].conditions.push({ field: "", operator: "equals", value: "" })
    setConditionGroups(newGroups)
  }

  const removeConditionFromGroup = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].conditions.splice(conditionIndex, 1)
    if (newGroups[groupIndex].conditions.length === 0) {
      newGroups.splice(groupIndex, 1)
    }
    setConditionGroups(newGroups)
  }

  const updateCondition = (groupIndex: number, conditionIndex: number, field: keyof Condition, value: any) => {
    const newGroups = [...conditionGroups]
    const condition = newGroups[groupIndex].conditions[conditionIndex] as Condition
    if (field === "field") {
      // When field changes, reset operator and value to match new type
      const fieldDef = getFieldDef(value)
      const ops = fieldDef ? operatorsByType[fieldDef.type] : operatorsByType.text
      condition.field = value
      condition.operator = ops[0]?.value ?? "equals"
      condition.value = fieldDef?.type === "boolean" ? "true" : fieldDef?.type === "list" ? [] : ""
    } else if (field === "operator") {
      condition.operator = value
      // Reset value if switching to no-value operator
      if (noValueOperators.includes(value)) {
        condition.value = ""
      }
    } else {
      condition[field] = value
    }
    setConditionGroups(newGroups)
  }

  const addConditionGroup = () => {
    setConditionGroups([
      ...conditionGroups,
      {
        operator: "AND",
        conditions: [{ field: "", operator: "equals", value: "" }],
      },
    ])
  }

  const toggleGroupOperator = (groupIndex: number) => {
    const newGroups = [...conditionGroups]
    newGroups[groupIndex].operator = newGroups[groupIndex].operator === "AND" ? "OR" : "AND"
    setConditionGroups(newGroups)
  }

  const handleSave = () => {
    const finalConditions =
      conditionGroups.length === 1
        ? conditionGroups[0]
        : {
            operator: "OR" as const,
            conditions: conditionGroups,
          }

    const ruleData = {
      name,
      description,
      entity,
      type,
      isActive,
      areaIds: selectedAreaIds,
      developerIds: selectedDeveloperIds,
      projectIds: selectedProjectIds,
      conditions: finalConditions,
      ...(rule ? { id: rule.id, createdAt: rule.createdAt } : {}),
    }

    onSave(ruleData)
  }

  const isValid =
    name.trim() !== "" && description.trim() !== "" && conditionGroups.some((g) => g.conditions.length > 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!w-[50vw] !max-w-[50vw] p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex-shrink-0">
          <SheetTitle>{rule ? "Edit Validation Rule" : "Create Validation Rule"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-6 py-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter rule name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule checks for and why it's important..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                >
                  <option value="Warning">Warning</option>
                  <option value="Blocking">Blocking</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Scope section: Areas, Developers, Projects */}
            <div className="border border-border rounded-lg p-4 space-y-4 bg-secondary/5">
              <Label className="text-sm font-semibold">Scope</Label>

              <MultiSelectDropdown
                label="Areas"
                options={mockAreas.map((a) => ({ id: a.id, label: a.name }))}
                selectedIds={selectedAreaIds}
                onToggle={toggleArea}
                onClear={() => setSelectedAreaIds([])}
                placeholder="All areas"
              />

              <MultiSelectDropdown
                label="Developers"
                options={filteredDevelopers.map((d) => ({ id: d.id, label: d.name }))}
                selectedIds={selectedDeveloperIds}
                onToggle={toggleDeveloper}
                onClear={() => setSelectedDeveloperIds([])}
                placeholder="All developers"
              />

              <ProjectsMultiSelect
                projects={filteredProjects}
                selectedIds={selectedProjectIds}
                onToggle={toggleProject}
                onClear={() => setSelectedProjectIds([])}
              />
            </div>
          </div>

          {/* Condition Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Conditions</Label>
              <Button variant="outline" size="sm" onClick={addConditionGroup}>
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </Button>
            </div>

            {conditionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">Group {groupIndex + 1}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupOperator(groupIndex)}
                      className="h-7 text-xs"
                    >
                      {group.operator}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addConditionToGroup(groupIndex)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>

                {group.conditions.map((condition, conditionIndex) => {
                  const cond = condition as Condition
                  const fieldDef = getFieldDef(cond.field)
                  const fieldType = fieldDef?.type ?? "text"
                  const availableOperators = getOperatorsForField(cond.field)
                  const showValue = !noValueOperators.includes(cond.operator)

                  return (
                    <div key={conditionIndex} className="space-y-2 bg-background rounded-md p-3 border border-border/50">
                      {conditionIndex > 0 && (
                        <div className="flex items-center gap-2 -mt-1 mb-1">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.operator}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        {/* Field selector */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Field</span>
                          <select
                            value={cond.field}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, "field", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background"
                          >
                            <option value="">Select field...</option>
                            {propertyFields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label} ({f.type})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Operator selector */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Operator</span>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, "operator", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background"
                          >
                            {availableOperators.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Value input - dynamic by type */}
                        {showValue && (
                          <div className={cn("min-w-0 space-y-1", cond.operator === "between" ? "flex-[1.5]" : "flex-1")}>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Value</span>
                            <ConditionValueInput
                              fieldDef={fieldDef}
                              fieldType={fieldType}
                              operator={cond.operator}
                              value={cond.value}
                              onChange={(val) => updateCondition(groupIndex, conditionIndex, "value", val)}
                            />
                          </div>
                        )}

                        {/* Delete button */}
                        <div className="flex-shrink-0 pt-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeConditionFromGroup(groupIndex, conditionIndex)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              {rule ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

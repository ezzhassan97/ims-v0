// Data Quality → Quality Configurations — the issue taxonomy
// (category = property field → types → optional subtypes).
//
// Priority and score live on the CATEGORY level (issues inherit the category
// priority as severity). Types carry only Active/Hidden. Subtypes are the one
// CRUD-able level: create / rename / delete, plus Active/Hidden.
//
// Category scores must sum to 100%.

import { ISSUE_FIELDS, fieldTaxonomy, fieldPriority, distribute, type PropIssueSeverity } from "./property-issues-mock"

export type QcEntity = "Property" | "Project" | "Developer"

export interface QcSubtype {
  id: string // SUB-001
  name: string
  active: boolean
}

export interface QcType {
  id: string // TYP-001
  name: string
  active: boolean
  subtypes: QcSubtype[] // may be empty — not all types have subtypes
}

export interface QcCategory {
  id: string // CAT-001
  name: string
  weight: number // score — sums to 100 across categories
  priority: PropIssueSeverity
  active: boolean
  types: QcType[]
}

export type QcTaxonomy = Record<QcEntity, QcCategory[]>

let catSeq = 0
let typSeq = 0
let subSeq = 0
const pad = (n: number) => String(n).padStart(3, "0")

export const QC_TAXONOMY: QcTaxonomy = {
  // Property categories ARE the reportable property fields (single source of
  // truth: ISSUE_FIELDS + fieldTaxonomy in property-issues-mock).
  Property: (() => {
    const catW = distribute(100, ISSUE_FIELDS.length)
    return ISSUE_FIELDS.map((f, i) => ({
      id: `CAT-${pad(++catSeq)}`,
      name: f.label,
      weight: catW[i],
      priority: fieldPriority(f),
      active: true,
      types: fieldTaxonomy(f).map((t) => ({
        id: `TYP-${pad(++typSeq)}`,
        name: t.type,
        active: t.active,
        subtypes: (t.subtypes ?? []).map((s) => ({
          id: `SUB-${pad(++subSeq)}`,
          name: s,
          active: true,
        })),
      })),
    }))
  })(),
  Project: [],
  Developer: [],
}

let newSubSeq = 500
export function nextSubtypeId(): string {
  return `SUB-${pad(++newSubSeq)}`
}

export const QC_ENTITIES: QcEntity[] = ["Property", "Project", "Developer"]

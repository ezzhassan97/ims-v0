// Data Quality → Quality Configurations — the FIXED issue taxonomy
// (category = property field → types → optional subtypes) with the three
// editable knobs per node: priority (Critical…Lowest), score weight, and
// Active/Hidden. The catalog itself (names/structure) is not editable.
//
// Weights sum to 100 at every level: subtypes within a type, types within a
// category, categories within an entity.

import { ISSUE_FIELDS, fieldTaxonomy, distribute, type PropIssueSeverity } from "./property-issues-mock"

export type QcEntity = "Property" | "Project" | "Developer"

export interface QcSubtype {
  id: string // SUB-001
  name: string
  weight: number
  priority: PropIssueSeverity
  active: boolean
}

export interface QcType {
  id: string // TYP-001
  name: string
  weight: number
  priority: PropIssueSeverity
  active: boolean
  subtypes: QcSubtype[] // may be empty — not all types have subtypes
}

export interface QcCategory {
  id: string // CAT-001
  name: string
  weight: number
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
    return ISSUE_FIELDS.map((f, i) => {
      const tax = fieldTaxonomy(f)
      const tW = distribute(100, tax.length)
      return {
        id: `CAT-${pad(++catSeq)}`,
        name: f.label,
        weight: catW[i],
        priority: tax[0].priority,
        active: true,
        types: tax.map((t, j) => {
          const subs = t.subtypes ?? []
          const sW = distribute(100, subs.length)
          return {
            id: `TYP-${pad(++typSeq)}`,
            name: t.type,
            weight: tW[j],
            priority: t.priority,
            active: t.active,
            subtypes: subs.map((s, k) => ({
              id: `SUB-${pad(++subSeq)}`,
              name: s,
              weight: sW[k],
              priority: t.priority,
              active: true,
            })),
          }
        }),
      }
    })
  })(),
  Project: [],
  Developer: [],
}

export const QC_ENTITIES: QcEntity[] = ["Property", "Project", "Developer"]

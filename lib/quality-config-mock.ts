// Data Quality → Quality Configurations — issue taxonomy (category → type → subtype)
// per entity, with scoring weights. Invariant the UI enforces: subtype weights sum
// to 100 within a type, type weights sum to 100 within a category, and category
// weights sum to 100 within an entity.

export type QcEntity = "Property" | "Project" | "Developer"

export interface QcSubtype {
  id: string // SUB-101
  name: string
  weight: number // % of its parent type
}

export interface QcType {
  id: string // TYP-11
  name: string
  weight: number // % of its parent category
  subtypes: QcSubtype[]
}

export interface QcCategory {
  id: string // CAT-1
  name: string
  weight: number // % of the entity
  types: QcType[]
}

export type QcTaxonomy = Record<QcEntity, QcCategory[]>

let catSeq = 0
let typSeq = 0
let subSeq = 0

function sub(name: string, weight: number): QcSubtype {
  return { id: `SUB-${String(++subSeq).padStart(3, "0")}`, name, weight }
}
function typ(name: string, weight: number, subtypes: QcSubtype[]): QcType {
  return { id: `TYP-${String(++typSeq).padStart(3, "0")}`, name, weight, subtypes }
}
function cat(name: string, weight: number, types: QcType[]): QcCategory {
  return { id: `CAT-${String(++catSeq).padStart(3, "0")}`, name, weight, types }
}

export const QC_TAXONOMY: QcTaxonomy = {
  Property: [
    cat("Pricing", 30, [
      typ("Incorrect Data", 50, [
        sub("Price mismatch with price list", 60),
        sub("Wrong currency or unit", 40),
      ]),
      typ("Missing Data", 30, [
        sub("No price set", 70),
        sub("Missing maintenance / storage price", 30),
      ]),
      typ("Outdated Data", 20, [
        sub("Stale after sheet ingestion", 100),
      ]),
    ]),
    cat("Areas & Sizes", 25, [
      typ("Incorrect Data", 60, [
        sub("Gross BUA mismatch", 50),
        sub("Net larger than gross", 30),
        sub("Land/garden area implausible", 20),
      ]),
      typ("Missing Data", 40, [
        sub("Missing BUA", 60),
        sub("Missing outdoor areas", 40),
      ]),
    ]),
    cat("Unit Info", 25, [
      typ("Incorrect Data", 40, [
        sub("Bedrooms/bathrooms wrong", 50),
        sub("Floor number inconsistent", 50),
      ]),
      typ("Duplicate", 35, [
        sub("Duplicate unit number", 100),
      ]),
      typ("Formatting", 25, [
        sub("Unit code format", 60),
        sub("Naming convention", 40),
      ]),
    ]),
    cat("Availability", 20, [
      typ("Outdated Data", 100, [
        sub("Sold on CRM but Available here", 70),
        sub("Hold expired", 30),
      ]),
    ]),
  ],
  Project: [
    cat("Location", 40, [
      typ("Incorrect Data", 70, [
        sub("Coordinates outside district", 60),
        sub("Polygon overlaps neighbour", 40),
      ]),
      typ("Missing Data", 30, [
        sub("No coordinates", 50),
        sub("No polygon", 50),
      ]),
    ]),
    cat("Masterplans", 30, [
      typ("Outdated Data", 60, [
        sub("Old listing masterplan revision", 100),
      ]),
      typ("Missing Data", 40, [
        sub("No GIS masterplan", 60),
        sub("No listing masterplan", 40),
      ]),
    ]),
    cat("Media", 15, [
      typ("Incorrect Data", 100, [
        sub("Low-res / watermarked renders", 70),
        sub("Wrong project imagery", 30),
      ]),
    ]),
    cat("General Info", 15, [
      typ("Missing Data", 55, [
        sub("SEO description missing", 100),
      ]),
      typ("Formatting", 45, [
        sub("Phase naming inconsistent", 100),
      ]),
    ]),
  ],
  Developer: [
    cat("General Info", 50, [
      typ("Outdated Data", 60, [
        sub("Founded year / portfolio counts", 100),
      ]),
      typ("Duplicate", 40, [
        sub("Description duplicated across languages", 100),
      ]),
    ]),
    cat("Media", 30, [
      typ("Incorrect Data", 100, [
        sub("Logo stretched / off-brand", 100),
      ]),
    ]),
    cat("Contacts", 20, [
      typ("Outdated Data", 100, [
        sub("WhatsApp group link expired", 60),
        sub("Sales contact unreachable", 40),
      ]),
    ]),
  ],
}

export const QC_ENTITIES: QcEntity[] = ["Property", "Project", "Developer"]

/** Next mock id for items created in the UI. */
export function nextQcId(prefix: "CAT" | "TYP" | "SUB", taxonomy: QcTaxonomy): string {
  let max = 0
  for (const cats of Object.values(taxonomy)) {
    for (const c of cats) {
      if (prefix === "CAT") max = Math.max(max, Number(c.id.slice(4)))
      for (const t of c.types) {
        if (prefix === "TYP") max = Math.max(max, Number(t.id.slice(4)))
        if (prefix === "SUB") for (const s of t.subtypes) max = Math.max(max, Number(s.id.slice(4)))
      }
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`
}

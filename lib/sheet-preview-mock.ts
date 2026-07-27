// Raw workbook grids behind the shared Sheet Preview — deliberately messy, the way
// developer sheets actually arrive: some tabs start at A1, some carry title/blank rows
// before the header, some are indented into the sheet, and some aren't units at all.

export interface SheetGridTab {
  name: string
  /** Raw cell grid — row 0 is the first spreadsheet row, so junk above the header is visible. */
  grid: (string | number | null)[][]
  /** Ingestable unit rows (0 when the tab isn't a unit table) */
  unitRows: number
  /** Where the real header sits — drives the normalized output grid */
  headerRow: number
  headerCol: number
  /** Non-unit tabs (cover sheets, terms, legends) are excluded from the output by default */
  isUnits: boolean
}

const UNIT_COLS = ["Unit Code", "Type", "Category", "Project", "Delivery", "BUA", "Land", "Price", "Maint."]
const TYPES = ["I-VILLA R", "I-VILLA S", "I-VILLA T", "I-VILLA U", "I-VILLA V", "I-VILLA W"]
const CATS = ["Villa", "I-Villa Roof Garden", "I-Villa Sky Garden", "Apartment", "Townhouse"]

/** Deterministic unit row (no Date.now / Math.random — SSR and client must match). */
function unitRow(project: string, i: number): (string | number)[] {
  return [
    `${project.slice(0, 3).toUpperCase()}-${220 + (i % 40)}-${["A4", "C4", "B2"][i % 3]}-${(i % 9) + 1}`,
    TYPES[i % TYPES.length],
    CATS[i % CATS.length],
    project,
    `Jan ${(i % 27) + 1}, 2026`,
    160 + ((i * 7) % 90),
    i % 4 === 0 ? 0 : 60 + ((i * 5) % 120),
    (4_800_000 + i * 137_000).toLocaleString("en-US"),
    (450_000 + (i % 6) * 50_000).toLocaleString("en-US"),
  ]
}

function pad(len: number): null[] {
  return Array.from({ length: len }, () => null)
}

/** Clean tab — header at A1, data straight after. */
function cleanTab(name: string, rows: number): SheetGridTab {
  return {
    name,
    grid: [UNIT_COLS, ...Array.from({ length: rows }, (_, i) => unitRow(name, i))],
    unitRows: rows,
    headerRow: 0,
    headerCol: 0,
    isUnits: true,
  }
}

/** Messy tab — title/blank rows above the header and the table indented by two columns. */
function offsetTab(name: string, rows: number, titleRows: string[], indent: number): SheetGridTab {
  const grid: (string | number | null)[][] = [
    ...titleRows.map((t) => [t, ...pad(UNIT_COLS.length + indent - 1)]),
    pad(UNIT_COLS.length + indent),
    [...pad(indent), ...UNIT_COLS],
    ...Array.from({ length: rows }, (_, i) => [...pad(indent), ...unitRow(name, i)]),
  ]
  return { name, grid, unitRows: rows, headerRow: titleRows.length + 1, headerCol: indent, isUnits: true }
}

/** Not a unit table at all — a legend/terms tab that should be ignored on ingestion. */
function notesTab(name: string): SheetGridTab {
  const grid: (string | number | null)[][] = [
    ["Payment terms — 2026 price list", null, null, null],
    [null, null, null, null],
    ["Plan", "Down payment", "Years", "Notes"],
    ["Standard", "10%", 8, "Quarterly instalments"],
    ["Premium", "5%", 10, "Monthly instalments, 4% discount"],
    ["Cash", "100%", 0, "12% discount"],
    [null, null, null, null],
    ["* Prices exclude maintenance and club membership.", null, null, null],
    ["* Delivery dates are indicative and subject to change.", null, null, null],
  ]
  return { name, grid, unitRows: 0, headerRow: 2, headerCol: 0, isUnits: false }
}

export const SHEET_TABS: SheetGridTab[] = [
  cleanTab("Marassi", 119),
  offsetTab("Uptown Cairo", 56, ["Uptown Cairo — Inventory update", "Issued 12 Jan 2026 · Sales dept."], 2),
  offsetTab("Mivida", 76, ["MIVIDA RESALE + PRIMARY"], 0),
  notesTab("Payment Terms"),
  cleanTab("Soul", 56),
]

/** Output grid — header normalized to the top-left corner, junk rows/columns dropped. */
export function normalizedGrid(tab: SheetGridTab): (string | number | null)[][] {
  return tab.grid.slice(tab.headerRow).map((row) => row.slice(tab.headerCol))
}

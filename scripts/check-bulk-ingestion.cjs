// Runnable check for the bulk-ingestion pipeline (no test suite in this repo).
//   node scripts/check-bulk-ingestion.cjs
// Asserts the message parser and that AI completion clears every clean path
// while still stopping where a person has to decide.

const path = require("path")
const assert = require("assert")
const root = path.join(__dirname, "..")
const { createJiti } = require(path.join(root, "node_modules/jiti"))
const jiti = createJiti(__filename, { alias: { "@": root } })
const B = jiti(path.join(root, "lib/bulk-ingestion.ts"))
const F = jiti(path.join(root, "lib/bulk-entry-flow.ts"))
const M = jiti(path.join(root, "lib/ingestion-mock.ts"))

// 1. A broker message becomes one row per unit line
const rows = B.parseMessage("F1", [
  "Good morning team 🌞",
  "🔥 Zed Towers — Phase 2 new release",
  "• Apartments 2BR 120-135 sqm from 6.2M",
  "• Duplex 4BR 240 m² 13.9M",
  "Delivery Q4 2027 · Semi finished",
], "Fallback")
assert.strictEqual(rows.length, 2)
assert.strictEqual(rows[0].v.project, "Zed Towers — Phase 2")
assert.deepStrictEqual([rows[0].v.propertyType, rows[0].v.bedrooms, rows[0].v.bua, rows[0].v.buaTo, rows[0].v.price], ["Apartment", "2", "120", "135", "6.2M"])
assert.strictEqual(rows[1].v.price, "13.9M", "area must not be read as price")
assert.deepStrictEqual([rows[0].v.deliveryDate, rows[0].v.finishing], ["Q4 2027", "Semi finished"])

// 2. Delivery text normalizes to the period's last day
assert.strictEqual(B.parseDelivery("Q3 2027", "DMY").iso, "2027-09-30")
assert.strictEqual(B.parseDelivery("Sep 2027", "DMY").iso, "2027-09-30")
assert.strictEqual(B.parseDelivery("03/04/2028", "DMY").iso, "2028-04-03")
assert.strictEqual(B.parseDelivery("03/04/2028", "MDY").iso, "2028-03-04")
assert.ok(B.parseDelivery("Ready", "DMY").ready)

// 3. AI walks each entry type to Final Check — or stops on a real human decision
const cat = { floorPlans: [{ id: "FP-1", unitType: "Apartment", bedrooms: 2, areaSqm: 120 }], renders: [{ id: "R1" }, { id: "R2" }, { id: "R3" }] }
function finalBlocking(entry) {
  const seed = B.seedFor(entry.files, entry.projects, entry.dataType)
  let w = F.initialWork(entry, seed)
  for (const key of F.STEP_KEYS) {
    const p = F.computePipeline(seed, w)
    if (!F.isSkipped(key, p)) w = { ...w, ...F.aiComplete(key, w, p, cat).patch }
  }
  return F.stepStatus("final", w, F.computePipeline(seed, w)).blocking
}
const pick = (fn) => M.ENTRIES.find((e) => e.developer && fn(e))
assert.strictEqual(finalBlocking(pick((e) => e.dataType === "Automatic" && M.isSheetOnly(e))), 0, "automatic sheet clears")
assert.strictEqual(finalBlocking(pick((e) => e.dataType === "Automatic" && e.fileType === "PDF")), 0, "automatic pdf clears")
assert.strictEqual(finalBlocking(pick((e) => e.dataType === "Manual" && e.fileType === "Text")), 0, "manual text clears")
assert.strictEqual(finalBlocking(pick((e) => e.dataType === "Manual" && e.fileType === "Image")), 0, "manual photos clear")
// A zero-price unit the database doesn't know can't be fixed by AI — a person must decide
assert.strictEqual(finalBlocking(pick((e) => e.dataType === "Automatic" && e.fileType === "Mixed")), 1, "mixed stops on the zero price")

console.log("bulk ingestion checks passed")

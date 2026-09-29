// Runnable check for the bulk-ingestion pipeline (no test suite in this repo).
//   node scripts/check-bulk-ingestion.cjs
// Asserts the parsers, the rule engine and that AI completion clears every
// stage up to Final check — while still stopping where a person has to decide.

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

// 2. Formats — delivery lands on the period's last day, numbers lose their shorthand
assert.strictEqual(B.parseDelivery("Q3 2027", "DMY").iso, "2027-09-30")
assert.strictEqual(B.parseDelivery("03/04/2028", "DMY").iso, "2028-04-03")
assert.strictEqual(B.parseDelivery("03/04/2028", "MDY").iso, "2028-03-04")
assert.ok(B.parseDelivery("Ready", "DMY").ready)
assert.strictEqual(B.parseNumberCell("price", "4.8M").value, 4_800_000)
assert.strictEqual(B.parseNumberCell("bua", "132 m²").value, 132)
assert.strictEqual(B.parseNumberCell("floor", "G").value, 0)

// 3. Rule engine — duplicates keep the latest row, lookups fill only blanks and zeros
const r = (id, v, dbId) => ({ id, idx: 0, src: "", v, dbId })
const db = new Map([["U-1", { id: "U-1", projectId: "P", label: "", status: "Available", lastSeen: "", v: { price: 5_000_000, land: 200 } }]])
const ctx = { dbById: db, projectData: () => ({}) }
const deduped = B.applyActions([r("a", { unitCode: "X-1" }), r("b", { unitCode: "x 1" })], [{ id: "d", kind: "dedupe", keep: "latest", title: "", detail: "", scope: {}, origin: "new" }], ctx)
assert.deepStrictEqual(deduped.rows.map((x) => x.id), ["b"])
const looked = B.applyActions([r("a", { price: "0", land: 150 }, "U-1")], [{ id: "l", kind: "lookup", lookup: "unit", fields: ["price", "land"], title: "", detail: "", scope: {}, origin: "new" }], ctx)
assert.deepStrictEqual([looked.rows[0].v.price, looked.rows[0].v.land], [5_000_000, 150])

// 4. Standardization — unknown values wait for a person, with an AI guess limited to IMS values
const std = B.standardizeRows([r("a", { finishing: "Premium" })], B.fieldsFor("Automatic", []), { vocab: {}, choices: {}, aiChoices: new Set(), dateFormat: "DMY" })
assert.strictEqual(std.unknown[0].raw, "Premium")
assert.strictEqual(std.unknown[0].suggestion.value, "Fully Finished")

// 5. AI walks each entry type to Final check — or stops on a real human decision
function run(entry) {
  const seed = B.seedFor(entry.files, entry.projects, entry.dataType)
  let w = F.initialWork(entry, seed)
  const stops = []
  for (const key of F.STAGE_KEYS.slice(0, -1)) {
    const p = F.computePipeline(seed, w)
    if (F.isSkipped(key, p)) continue
    w = { ...w, ...F.aiComplete(key, w, p).patch }
    if (key === "setup" && !w.coverage) w = { ...w, coverage: "partial" }
    const after = F.stageStatus(key, w, F.computePipeline(seed, w))
    if (after.blocking) stops.push(`${key}: ${after.note}`)
  }
  return { stops, pipe: F.computePipeline(seed, w), w }
}
const pick = (fn) => M.ENTRIES.find((e) => e.developer && fn(e))
const autoSheet = run(pick((e) => e.dataType === "Automatic" && M.isSheetOnly(e) && e.developer.id === "DEV-001"))
assert.deepStrictEqual(autoSheet.stops, [], "automatic sheet clears every stage")
assert.deepStrictEqual(run(pick((e) => e.dataType === "Automatic" && e.fileType === "PDF")).stops, [], "automatic pdf clears")
assert.deepStrictEqual(run(pick((e) => e.dataType === "Manual" && e.fileType === "Text")).stops, [], "manual text clears")
assert.deepStrictEqual(run(pick((e) => e.dataType === "Manual" && e.fileType === "Image")).stops, [], "manual photos clear")
// A zero-price unit IMS doesn't know can't be fixed by AI — Review stops for a person
const mixed = run(pick((e) => e.dataType === "Automatic" && e.fileType === "Mixed"))
assert.ok(mixed.stops.some((s) => s.startsWith("review")), `mixed stops at review: ${mixed.stops.join("; ")}`)
// A developer with no history runs AI-first — proposals for every action it would have saved
const fresh = pick((e) => e.developer.id === "DEV-003" && e.dataType === "Automatic" && M.isSheetOnly(e))
const freshSeed = B.seedFor(fresh.files, fresh.projects, fresh.dataType)
assert.ok(F.computePipeline(freshSeed, F.initialWork(fresh, freshSeed)).proposals.some((p) => p.verb === "add"), "new developer gets AI proposals")

// 6. Grouping — card identity is the set of grouping values; a new config changes cards vs the site
const g = autoSheet.pipe
const regrouped = B.compareCards(B.buildCards(g.matched, { fields: ["finishing"], bucket: 100 }, g.planOfRow), B.currentCards(g.matched, g.dbById, g.groupCfg, g.planOfRow))
assert.ok(regrouped.some((c) => c.status === "Merged"), "a coarser config merges cards")

console.log("bulk ingestion checks passed")

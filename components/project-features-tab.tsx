"use client"

import { useState } from "react"
import { Check, ConciergeBell, Dumbbell, Landmark, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCard, TableCardHeader, FilterMultiSelect, FilterSelect } from "@/components/table-kit"
import { toast } from "sonner"

const AMENITY_OPTIONS = ["Swimming Pool", "Gym", "Clubhouse", "Kids Area", "Cycling Lanes", "Sports Courts", "Spa", "Commercial Strip", "Central Park", "Lagoon"]
const SERVICE_OPTIONS = ["Security 24/7", "Maintenance", "Housekeeping", "Concierge", "Landscaping", "Facility Management", "Shuttle Bus", "Valet Parking"]
const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Duplex", "Studio", "Penthouse", "Chalet", "Office", "Retail"]

interface LandmarkRow { id: string; nameEn: string; nameAr: string; km: string; min: string }
interface OfferingRow { id: string; type: string; count: string }

const LANDMARKS0: LandmarkRow[] = [
  { id: "9101", nameEn: "Cairo International Airport", nameAr: "مطار القاهرة الدولي", km: "24", min: "28" },
  { id: "9102", nameEn: "American University in Cairo", nameAr: "الجامعة الأمريكية بالقاهرة", km: "7.5", min: "12" },
  { id: "9103", nameEn: "Cairo Festival City", nameAr: "كايرو فستيفال سيتي", km: "10", min: "15" },
]
const OFFERINGS0: OfferingRow[] = [
  { id: "9201", type: "Apartment", count: "240" },
  { id: "9202", type: "Villa", count: "56" },
  { id: "9203", type: "Townhouse", count: "82" },
]

function ChipList({ values, onRemove }: { values: string[]; onRemove: (v: string) => void }) {
  if (values.length === 0) return <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {v}
          <button type="button" className="text-blue-500 hover:text-blue-800" onClick={() => onRemove(v)}><X className="h-3 w-3" /></button>
        </span>
      ))}
    </div>
  )
}

/** Save (✓) / cancel (✕) pair for inline edit rows. */
function InlineActions({ canSave, onSave, onCancel }: { canSave: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground" disabled={!canSave} onClick={onSave}>
        <Check className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

/** Features tab: amenities & services multi-selects, landmarks list, property offerings — lists edit inline, no popups. */
export function ProjectFeaturesTab() {
  const [amenities, setAmenities] = useState<string[]>(["Swimming Pool", "Gym", "Clubhouse"])
  const [services, setServices] = useState<string[]>(["Security 24/7", "Maintenance"])
  const [landmarks, setLandmarks] = useState<LandmarkRow[]>(LANDMARKS0)
  const [offerings, setOfferings] = useState<OfferingRow[]>(OFFERINGS0)

  // Inline landmark editing — "new" while adding, a row id while editing
  const [editLm, setEditLm] = useState<string | null>(null)
  const [lmDraft, setLmDraft] = useState<Omit<LandmarkRow, "id">>({ nameEn: "", nameAr: "", km: "", min: "" })
  const lmSet = (k: keyof typeof lmDraft) => (v: string) => setLmDraft((d) => ({ ...d, [k]: v }))
  const lmValid = lmDraft.nameEn.trim() !== "" && lmDraft.km.trim() !== "" && lmDraft.min.trim() !== ""
  const startLm = (row?: LandmarkRow) => {
    setLmDraft(row ? { nameEn: row.nameEn, nameAr: row.nameAr, km: row.km, min: row.min } : { nameEn: "", nameAr: "", km: "", min: "" })
    setEditLm(row?.id ?? "new")
  }
  const saveLm = () => {
    const d = { nameEn: lmDraft.nameEn.trim(), nameAr: lmDraft.nameAr.trim(), km: lmDraft.km.trim(), min: lmDraft.min.trim() }
    if (editLm === "new") {
      setLandmarks((prev) => [...prev, { id: String(9100 + Math.max(0, ...prev.map((x) => Number(x.id) - 9100)) + 1), ...d }])
      toast.success(`${d.nameEn} added`)
    } else {
      setLandmarks((prev) => prev.map((x) => (x.id === editLm ? { ...x, ...d } : x)))
      toast.success(`${d.nameEn} updated`)
    }
    setEditLm(null)
  }

  // Inline offering editing
  const [editOf, setEditOf] = useState<string | null>(null)
  const [ofDraft, setOfDraft] = useState<Omit<OfferingRow, "id">>({ type: "", count: "" })
  const usedTypes = offerings.filter((o) => o.id !== editOf).map((o) => o.type)
  // A property type can only be offered once — exclude the ones already used
  const typeOptions = PROPERTY_TYPES.filter((t) => !usedTypes.includes(t))
  const ofValid = ofDraft.type !== "" && ofDraft.count.trim() !== ""
  const startOf = (row?: OfferingRow) => {
    setOfDraft(row ? { type: row.type, count: row.count } : { type: "", count: "" })
    setEditOf(row?.id ?? "new")
  }
  const saveOf = () => {
    const d = { type: ofDraft.type, count: ofDraft.count.trim() }
    if (editOf === "new") {
      setOfferings((prev) => [...prev, { id: String(9200 + Math.max(0, ...prev.map((x) => Number(x.id) - 9200)) + 1), ...d }])
      toast.success(`${d.type} offering added`)
    } else {
      setOfferings((prev) => prev.map((x) => (x.id === editOf ? { ...x, ...d } : x)))
      toast.success(`${d.type} offering updated`)
    }
    setEditOf(null)
  }

  const lmEditRow = (
    <div className="flex items-center gap-2 bg-primary/5 px-5 py-2.5">
      <Input value={lmDraft.nameEn} onChange={(e) => lmSet("nameEn")(e.target.value)} placeholder="Name En" className="h-8 flex-1 text-sm" autoFocus />
      <Input value={lmDraft.nameAr} onChange={(e) => lmSet("nameAr")(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" className="h-8 flex-1 text-sm" />
      <Input value={lmDraft.km} onChange={(e) => lmSet("km")(e.target.value)} placeholder="km" className="h-8 w-20 text-sm" />
      <Input value={lmDraft.min} onChange={(e) => lmSet("min")(e.target.value)} placeholder="min" className="h-8 w-20 text-sm" />
      <InlineActions canSave={lmValid} onSave={saveLm} onCancel={() => setEditLm(null)} />
    </div>
  )

  const ofEditRow = (
    <div className="flex items-center gap-2 bg-primary/5 px-5 py-2.5">
      <FilterSelect label="Select property type…" value={ofDraft.type} options={typeOptions} onChange={(v) => setOfDraft((d) => ({ ...d, type: v }))} className="w-56" width="w-56" />
      <Input value={ofDraft.count} onChange={(e) => setOfDraft((d) => ({ ...d, count: e.target.value }))} placeholder="Count" className="h-8 w-28 text-sm" />
      <span className="flex-1" />
      <InlineActions canSave={ofValid} onSave={saveOf} onCancel={() => setEditOf(null)} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Amenities & Services */}
      <TableCard>
        <TableCardHeader title="Amenities & Services" />
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />Amenities</div>
            <FilterMultiSelect label="Select amenities" options={AMENITY_OPTIONS} value={amenities} onChange={setAmenities} className="w-full" width="w-full" />
            <ChipList values={amenities} onRemove={(v) => setAmenities((prev) => prev.filter((x) => x !== v))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><ConciergeBell className="h-3.5 w-3.5 text-muted-foreground" />Services</div>
            <FilterMultiSelect label="Select services" options={SERVICE_OPTIONS} value={services} onChange={setServices} className="w-full" width="w-full" />
            <ChipList values={services} onRemove={(v) => setServices((prev) => prev.filter((x) => x !== v))} />
          </div>
        </div>
      </TableCard>

      {/* Landmarks — inline add/edit */}
      <TableCard>
        <TableCardHeader
          title="Landmarks"
          count={landmarks.length}
          cta={<Button size="sm" className="h-8 gap-1.5" disabled={editLm === "new"} onClick={() => startLm()}><Plus className="h-3.5 w-3.5" />Add Landmark</Button>}
        />
        {landmarks.length === 0 && editLm !== "new" ? (
          <p className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground"><Landmark className="h-4 w-4" />No landmarks added yet</p>
        ) : (
          <div className="divide-y divide-border">
            {landmarks.map((l) =>
              editLm === l.id ? (
                <div key={l.id}>{lmEditRow}</div>
              ) : (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{l.nameEn}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.nameAr || "—"}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm text-muted-foreground">{l.km} km</span>
                  <span className="whitespace-nowrap text-sm text-muted-foreground">{l.min} min</span>
                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startLm(l)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { setLandmarks((prev) => prev.filter((x) => x.id !== l.id)); toast.success(`${l.nameEn} removed`) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ),
            )}
            {editLm === "new" && lmEditRow}
          </div>
        )}
      </TableCard>

      {/* Property offerings — inline add/edit, a type can only be offered once.
          overflow-visible while editing so the type dropdown isn't clipped by the card. */}
      <TableCard className={editOf ? "overflow-visible" : undefined}>
        <TableCardHeader
          title="Property Offerings"
          count={offerings.length}
          cta={<Button size="sm" className="h-8 gap-1.5" disabled={editOf === "new"} onClick={() => startOf()}><Plus className="h-3.5 w-3.5" />Add Offering</Button>}
        />
        {offerings.length === 0 && editOf !== "new" ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No property offerings yet</p>
        ) : (
          <div className="divide-y divide-border">
            {offerings.map((o) =>
              editOf === o.id ? (
                <div key={o.id}>{ofEditRow}</div>
              ) : (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="inline-flex items-center whitespace-nowrap rounded-md border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{o.type}</span>
                  <span className="flex-1 text-sm text-foreground"><span className="font-semibold">{o.count}</span> <span className="text-muted-foreground">units</span></span>
                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startOf(o)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { setOfferings((prev) => prev.filter((x) => x.id !== o.id)); toast.success(`${o.type} offering removed`) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ),
            )}
            {editOf === "new" && ofEditRow}
          </div>
        )}
      </TableCard>
    </div>
  )
}

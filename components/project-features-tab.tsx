"use client"

import { useState } from "react"
import { Landmark, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TableCard, TableCardHeader, FilterMultiSelect, FilterSelect, IdTag } from "@/components/table-kit"
import { cn } from "@/lib/utils"
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

function LandmarkDialog({ initial, onClose, onSave }: { initial?: LandmarkRow; onClose: () => void; onSave: (l: Omit<LandmarkRow, "id">) => void }) {
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "")
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "")
  const [km, setKm] = useState(initial?.km ?? "")
  const [min, setMin] = useState(initial?.min ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit Landmark" : "Add Landmark"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <div className="text-xs font-medium text-foreground">Name En</div>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Cairo International Airport" className="h-9 text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <div className="text-xs font-medium text-foreground">Name Ar</div>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Travelling Distance (km)</div>
            <Input value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 12" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Travelling Time (min)</div>
            <Input value={min} onChange={(e) => setMin(e.target.value)} placeholder="e.g. 15" className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!nameEn.trim() || !km.trim() || !min.trim()} onClick={() => onSave({ nameEn: nameEn.trim(), nameAr: nameAr.trim(), km: km.trim(), min: min.trim() })}>
            {initial ? "Save Changes" : "Add Landmark"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OfferingDialog({ initial, usedTypes, onClose, onSave }: { initial?: OfferingRow; usedTypes: string[]; onClose: () => void; onSave: (o: Omit<OfferingRow, "id">) => void }) {
  const [type, setType] = useState(initial?.type ?? "")
  const [count, setCount] = useState(initial?.count ?? "")
  // A property type can only be offered once — exclude the ones already used (keep the one being edited)
  const options = PROPERTY_TYPES.filter((t) => t === initial?.type || !usedTypes.includes(t))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{initial ? "Edit Offering" : "Add Offering"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Property Type</div>
            <FilterSelect label="Select property type…" value={type} options={options} onChange={setType} className="w-full" width="w-full" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">Count</div>
            <Input value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 120" className="h-9 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!type || !count.trim()} onClick={() => onSave({ type, count: count.trim() })}>
            {initial ? "Save Changes" : "Add Offering"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Features tab: amenities & services multi-selects, landmarks list, property offerings. */
export function ProjectFeaturesTab() {
  const [amenities, setAmenities] = useState<string[]>(["Swimming Pool", "Gym", "Clubhouse"])
  const [services, setServices] = useState<string[]>(["Security 24/7", "Maintenance"])
  const [landmarks, setLandmarks] = useState<LandmarkRow[]>(LANDMARKS0)
  const [offerings, setOfferings] = useState<OfferingRow[]>(OFFERINGS0)
  const [landmarkDlg, setLandmarkDlg] = useState<{ initial?: LandmarkRow } | null>(null)
  const [offeringDlg, setOfferingDlg] = useState<{ initial?: OfferingRow } | null>(null)

  return (
    <div className="space-y-4">
      {/* Amenities & Services */}
      <TableCard>
        <TableCardHeader title="Amenities & Services" />
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Sparkles className="h-3.5 w-3.5 text-muted-foreground" />Amenities</div>
            <FilterMultiSelect label="Select amenities" options={AMENITY_OPTIONS} value={amenities} onChange={setAmenities} className="w-full" width="w-full" />
            <ChipList values={amenities} onRemove={(v) => setAmenities((prev) => prev.filter((x) => x !== v))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Sparkles className="h-3.5 w-3.5 text-muted-foreground" />Services</div>
            <FilterMultiSelect label="Select services" options={SERVICE_OPTIONS} value={services} onChange={setServices} className="w-full" width="w-full" />
            <ChipList values={services} onRemove={(v) => setServices((prev) => prev.filter((x) => x !== v))} />
          </div>
        </div>
      </TableCard>

      {/* Landmarks */}
      <TableCard>
        <TableCardHeader
          title="Landmarks"
          count={landmarks.length}
          cta={<Button size="sm" className="h-8 gap-1.5" onClick={() => setLandmarkDlg({})}><Plus className="h-3.5 w-3.5" />Add Landmark</Button>}
        />
        {landmarks.length === 0 ? (
          <p className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground"><Landmark className="h-4 w-4" />No landmarks added yet</p>
        ) : (
          <div className="divide-y divide-border">
            {landmarks.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{l.nameEn}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.nameAr || "—"}</p>
                </div>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{l.km} km</span>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{l.min} min</span>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setLandmarkDlg({ initial: l })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { setLandmarks((prev) => prev.filter((x) => x.id !== l.id)); toast.success(`${l.nameEn} removed`) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TableCard>

      {/* Property offerings */}
      <TableCard>
        <TableCardHeader
          title="Property Offerings"
          count={offerings.length}
          cta={<Button size="sm" className="h-8 gap-1.5" onClick={() => setOfferingDlg({})}><Plus className="h-3.5 w-3.5" />Add Offering</Button>}
        />
        {offerings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No property offerings yet</p>
        ) : (
          <div className="divide-y divide-border">
            {offerings.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                <span className="inline-flex items-center whitespace-nowrap rounded-md border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{o.type}</span>
                <span className="flex-1 text-sm text-foreground"><span className="font-semibold">{o.count}</span> <span className="text-muted-foreground">units</span></span>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setOfferingDlg({ initial: o })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { setOfferings((prev) => prev.filter((x) => x.id !== o.id)); toast.success(`${o.type} offering removed`) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TableCard>

      {landmarkDlg && (
        <LandmarkDialog
          initial={landmarkDlg.initial}
          onClose={() => setLandmarkDlg(null)}
          onSave={(l) => {
            if (landmarkDlg.initial) {
              setLandmarks((prev) => prev.map((x) => (x.id === landmarkDlg.initial!.id ? { ...x, ...l } : x)))
              toast.success(`${l.nameEn} updated`)
            } else {
              setLandmarks((prev) => [...prev, { id: String(9100 + prev.length + Math.max(...prev.map((x) => Number(x.id) - 9100), 0) + 1), ...l }])
              toast.success(`${l.nameEn} added`)
            }
            setLandmarkDlg(null)
          }}
        />
      )}
      {offeringDlg && (
        <OfferingDialog
          initial={offeringDlg.initial}
          usedTypes={offerings.map((o) => o.type)}
          onClose={() => setOfferingDlg(null)}
          onSave={(o) => {
            if (offeringDlg.initial) {
              setOfferings((prev) => prev.map((x) => (x.id === offeringDlg.initial!.id ? { ...x, ...o } : x)))
              toast.success(`${o.type} offering updated`)
            } else {
              setOfferings((prev) => [...prev, { id: String(9200 + prev.length + Math.max(...prev.map((x) => Number(x.id) - 9200), 0) + 1), ...o }])
              toast.success(`${o.type} offering added`)
            }
            setOfferingDlg(null)
          }}
        />
      )}
    </div>
  )
}

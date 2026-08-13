"use client"

// Metadata tab — shared by the project details page and the developer details
// page. Two sections:
//   1. Metadata — key/value rows; keys come from the master list managed on the
//      Project/Developers Configurations pages, values are typed per key.
//   2. AI Summary — read-only accordions of the AI-generated content summaries.

import { useState } from "react"
import { MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMetaKeys, type MetaKey, type MetaKind, type MetaType } from "@/lib/metadata-mock"

export const META_TYPE_TONES: Record<MetaType, string> = {
  numeric: "border-blue-200 bg-blue-50 text-blue-700",
  date: "border-purple-200 bg-purple-50 text-purple-700",
  text: "border-border bg-muted text-muted-foreground",
  boolean: "border-emerald-200 bg-emerald-50 text-emerald-700",
  enum: "border-amber-200 bg-amber-50 text-amber-700",
}

export function MetaTypeTag({ type }: { type: MetaType }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-medium", META_TYPE_TONES[type])}>{type}</span>
}

interface MetaValue { keyId: string; value: string }

/** Deterministic seed values so both tabs open populated. */
const SEED_VALUES: Record<MetaKind, MetaValue[]> = {
  project: [
    { keyId: "PMK-009", value: "15" },
    { keyId: "PMK-010", value: "85" },
    { keyId: "PMK-011", value: "1400000" },
    { keyId: "PMK-012", value: "7" },
    { keyId: "PMK-007", value: "370" },
    { keyId: "PMK-005", value: "980000" },
    { keyId: "PMK-003", value: "Open-to-sea Lagoon" },
    { keyId: "PMK-001", value: "Yes" },
  ],
  developer: [
    { keyId: "DMK-001", value: "1980" },
    { keyId: "DMK-002", value: "32" },
    { keyId: "DMK-005", value: "Family Business" },
    { keyId: "DMK-006", value: "New Cairo, Egypt" },
  ],
}

interface SummarySection { title: string; paragraphs: string[]; bullets?: { label: string; text: string }[] }

const AI_SUMMARIES: Record<MetaKind, SummarySection[]> = {
  project: [
    {
      title: "Project Overview",
      paragraphs: [
        "A coastal flagship spanning roughly 600 feddans with a 15% footprint and 85% open spaces, positioned as a fully integrated year-round destination rather than a seasonal resort.",
      ],
      bullets: [
        { label: "Waterfront", text: "1.4M sqm beach area with a 22km-long open-to-sea lagoon promenade." },
        { label: "Marinas", text: "An international marina (370 berths) plus a 120-berth dry rock marina." },
        { label: "Golf", text: "A 980K sqm championship golf course threads through the residential clusters." },
      ],
    },
    {
      title: "Masterplan & Phasing",
      paragraphs: [
        "Seven gated entrances feed a spine road connecting the residential phases; delivery follows a phased model with infrastructure ahead of units. A single free-zone parcel anchors the commercial district.",
      ],
    },
    {
      title: "Amenities & Lifestyle",
      paragraphs: [
        "Artificial swimmable lagoons (850K sqm) and the open-to-sea lagoon (1.1M sqm) form the core lifestyle offer, supported by clubhouse, retail promenade and sports facilities.",
      ],
    },
    {
      title: "Full Description",
      paragraphs: [
        "The project combines primary residences and seasonal homes across villas, twinhouses and chalets. The masterplan privileges water frontage: most clusters sit within 400m of a swimmable edge, and the promenade doubles as a retail and dining destination during peak season.",
        "Construction status is off-plan with early phases in delivery; the fact sheet highlights hardscape/softscape integration as the design signature.",
      ],
    },
  ],
  developer: [
    {
      title: "Portfolio Overview",
      paragraphs: [
        "With over 32 projects across Egypt, the developer maintains a bifurcated portfolio of primary residences and seasonal resorts.",
      ],
      bullets: [
        { label: "Residential (El Patio)", text: "Highlights include El Patio Oro (New Cairo) and the massive 910-acre La Vista City in the New Administrative Capital." },
        { label: "Coastal (La Vista)", text: "Significant holdings include La Vista Ras El Hekma on the North Coast and La Vista Ray in Ain Sokhna, the latter featuring Asian-inspired aesthetics." },
        { label: "Commercial", text: "D Line in El Sheikh Zayed serves as a key commercial and administrative asset." },
      ],
    },
    {
      title: "Biography",
      paragraphs: [
        "A family business founded in 1980, the developer grew from contracting roots into one of Egypt's most consistent residential brands, known for delivering on schedule without external financing.",
      ],
    },
    {
      title: "Competition and Partnership",
      paragraphs: [
        "Competes primarily with mid-to-premium coastal developers; partnerships are rare and vertically integrated construction keeps margins in-house.",
      ],
    },
    {
      title: "Market Positioning and Perception",
      paragraphs: [
        "Perceived as a safe-delivery brand with conservative launch pricing and steady appreciation; buyer base skews repeat customers and referrals.",
      ],
    },
    {
      title: "Full Description",
      paragraphs: [
        "The portfolio is characterized by a phased delivery model and a consistent focus on 'hardscape' and 'softscape' integration. Coastal assets anchor the brand while the city portfolio drives recurring cash flow.",
      ],
    },
  ],
}

const boolOpts = ["Yes", "No"]

/** Value input matched to the key's data type. */
function ValueInput({ k, value, onChange }: { k: MetaKey; value: string; onChange: (v: string) => void }) {
  if (k.type === "boolean" || k.type === "enum") {
    const opts = k.type === "boolean" ? boolOpts : k.options ?? []
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Select value" /></SelectTrigger>
        <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    )
  }
  return (
    <div className="relative w-48">
      <Input
        type={k.type === "numeric" ? "number" : k.type === "date" ? "date" : "text"}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={k.type === "text" ? "Value" : undefined}
        className={cn("h-8 text-sm", k.unit && "pr-12")}
      />
      {k.unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] uppercase text-muted-foreground">{k.unit}</span>}
    </div>
  )
}

const fmtValue = (k: MetaKey, v: string) => {
  if (k.type === "numeric" && v !== "" && !Number.isNaN(Number(v))) return `${Number(v).toLocaleString("en-US")}${k.unit ? ` ${k.unit}` : ""}`
  return v || "—"
}

export function MetadataTab({ kind }: { kind: MetaKind }) {
  const keys = useMetaKeys(kind)
  const keyOf = (id: string) => keys.find((k) => k.id === id)
  const [values, setValues] = useState<MetaValue[]>(() => SEED_VALUES[kind].filter((v) => keyOf(v.keyId)))
  const [adding, setAdding] = useState(false)
  const [addKeyId, setAddKeyId] = useState("")
  const [addValue, setAddValue] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const availableKeys = keys.filter((k) => !values.some((v) => v.keyId === k.id))
  const addKey = addKeyId ? keyOf(addKeyId) : undefined

  const saveNew = () => {
    if (!addKey || !addValue) return
    setValues((vs) => [...vs, { keyId: addKey.id, value: addValue }])
    setAdding(false); setAddKeyId(""); setAddValue("")
    toast.success(`${addKey.name} added`)
  }

  return (
    <div className="space-y-4">
      {/* ── Metadata ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Metadata</h3>
          <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{values.length}</span>
          <span className="text-[11px] text-muted-foreground">Keys are managed on the {kind === "project" ? "Project" : "Developers"} Configurations page</span>
          <Button size="sm" className="ml-auto h-8 gap-1.5" onClick={() => setAdding(true)} disabled={adding || availableKeys.length === 0}>
            <Plus className="h-3.5 w-3.5" />Add Metadata
          </Button>
        </div>

        {adding && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-3">
            <Select value={addKeyId} onValueChange={(v) => { setAddKeyId(v); setAddValue("") }}>
              <SelectTrigger className="h-8 w-64 text-sm"><SelectValue placeholder="Select metadata key" /></SelectTrigger>
              <SelectContent>
                {availableKeys.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    <span className="flex items-center gap-2">{k.name}<MetaTypeTag type={k.type} /></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addKey && <ValueInput k={addKey} value={addValue} onChange={setAddValue} />}
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setAdding(false); setAddKeyId(""); setAddValue("") }}>Cancel</Button>
              <Button size="sm" className="h-8" disabled={!addKey || !addValue} onClick={saveNew}>Add</Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border/60">
          {values.map((v) => {
            const k = keyOf(v.keyId)
            if (!k) return null
            const editing = editingId === v.keyId
            return (
              <div key={v.keyId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{k.name}</span>
                    <MetaTypeTag type={k.type} />
                  </span>
                  <span className="font-mono text-[10px] leading-none text-muted-foreground">{k.id}</span>
                </div>
                {editing ? (
                  <>
                    <ValueInput k={k} value={editValue} onChange={setEditValue} />
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" className="h-8" disabled={!editValue} onClick={() => {
                      setValues((vs) => vs.map((x) => (x.keyId === v.keyId ? { ...x, value: editValue } : x)))
                      setEditingId(null)
                      toast.success(`${k.name} updated`)
                    }}>Save</Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{fmtValue(k, v.value)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingId(v.keyId); setEditValue(v.value) }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />Edit Value
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          setValues((vs) => vs.filter((x) => x.keyId !== v.keyId))
                          toast.success(`${k.name} removed`)
                        }}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            )
          })}
          {values.length === 0 && !adding && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No metadata yet — add the first key.</p>
          )}
        </div>
      </div>

    </div>
  )
}

/** AI Summary — its own details tab: read-only accordions of the AI-generated content. */
export function AiSummaryTab({ kind }: { kind: MetaKind }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />Summarized by AI — read-only
        </span>
      </div>
      <Accordion type="multiple" className="px-4">
        {AI_SUMMARIES[kind].map((s) => (
          <AccordionItem key={s.title} value={s.title}>
            <AccordionTrigger className="text-sm font-medium">{s.title}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm leading-6 text-foreground">
                {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                {s.bullets && (
                  <ul className="list-disc space-y-1 pl-5">
                    {s.bullets.map((b) => (
                      <li key={b.label}><span className="font-semibold">{b.label}:</span> {b.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

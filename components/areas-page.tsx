"use client"

import { useState } from "react"
import { ChevronRight, FileText, HelpCircle, Home, Map, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IdTag } from "@/components/table-kit"
import { SeoTab, FaqsTab } from "@/components/developers-page"
import { cn } from "@/lib/utils"

// ─── Mock hierarchy: District > Area > Subarea ────────────────────────────────

interface Subarea { id: string; name: string }
interface Area { id: string; name: string; nameAr: string; subareas: Subarea[] }
interface District { id: string; name: string; areas: Area[] }

let sid = 800
const sub = (...names: string[]): Subarea[] => names.map((name) => ({ id: String(++sid), name }))

const DISTRICTS: District[] = [
  {
    id: "101", name: "New Cairo",
    areas: [
      { id: "201", name: "5th Settlement", nameAr: "التجمع الخامس", subareas: sub("Golden Square", "North Investors", "South Investors", "Lotus") },
      { id: "202", name: "1st Settlement", nameAr: "التجمع الأول", subareas: sub("El Banafseg", "El Yasmeen") },
      { id: "203", name: "Katameya", nameAr: "القطامية", subareas: sub("Katameya Heights", "Katameya Dunes") },
      { id: "204", name: "El Shorouk", nameAr: "الشروق", subareas: sub("Shorouk City Center", "El Kronfol") },
    ],
  },
  {
    id: "102", name: "6th of October",
    areas: [
      { id: "205", name: "West Somid", nameAr: "غرب سوميد", subareas: sub("West Somid Central", "Industrial Zone Edge") },
      { id: "206", name: "Sheikh Zayed", nameAr: "الشيخ زايد", subareas: sub("Beverly Hills", "Zayed 2000", "Waslet Dahshour") },
      { id: "207", name: "October Gardens", nameAr: "حدائق أكتوبر", subareas: sub("O West", "Cleopatra Square") },
    ],
  },
  {
    id: "103", name: "North Coast",
    areas: [
      { id: "208", name: "Ras El Hekma", nameAr: "رأس الحكمة", subareas: sub("El Hekma Bay", "Mountain View Ras El Hekma") },
      { id: "209", name: "Sidi Abdelrahman", nameAr: "سيدي عبد الرحمن", subareas: sub("Marassi", "Hacienda Bay") },
      { id: "210", name: "El Alamein", nameAr: "العلمين", subareas: sub("New Alamein Towers", "Downtown Alamein", "Latin District") },
    ],
  },
  {
    id: "104", name: "New Capital",
    areas: [
      { id: "211", name: "R7", nameAr: "الحي السابع", subareas: sub("R7 Central", "The Loft") },
      { id: "212", name: "R8", nameAr: "الحي الثامن", subareas: sub("Midtown Sky", "La Capitale") },
      { id: "213", name: "Downtown", nameAr: "وسط البلد", subareas: sub("Financial District", "Tourist Towers") },
    ],
  },
  {
    id: "105", name: "Ain Sokhna",
    areas: [
      { id: "214", name: "Galala", nameAr: "الجلالة", subareas: sub("Il Monte Galala", "Galala Resort") },
      { id: "215", name: "Zafarana Road", nameAr: "طريق الزعفرانة", subareas: sub("Telal Sokhna", "La Vista Gardens") },
    ],
  },
]

const ALL_AREAS: (Area & { district: string })[] = DISTRICTS.flatMap((d) => d.areas.map((a) => ({ ...a, district: d.name })))

// ─── Hierarchy column primitives ──────────────────────────────────────────────

function ColumnCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

function ColumnRow({ name, id, childCount, childLabel, selected, onClick }: {
  name: string; id: string; childCount?: number; childLabel?: string; selected?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary",
      )}
    >
      <span className="min-w-0">
        <span className={cn("block truncate text-sm", selected ? "font-semibold text-primary" : "font-medium text-foreground")}>{name}</span>
        <IdTag value={id} />
      </span>
      {childCount !== undefined && (
        <span className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {childCount} {childLabel}
          {onClick && <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AreasPage() {
  // Map hierarchy selection
  const [districtId, setDistrictId] = useState<string>(DISTRICTS[0].id)
  const [areaId, setAreaId] = useState<string>(DISTRICTS[0].areas[0].id)
  const district = DISTRICTS.find((d) => d.id === districtId) ?? DISTRICTS[0]
  const area = district.areas.find((a) => a.id === areaId) ?? district.areas[0]

  // SEO / FAQs working area
  const [workAreaId, setWorkAreaId] = useState<string>(ALL_AREAS[0].id)
  const workArea = ALL_AREAS.find((a) => a.id === workAreaId) ?? ALL_AREAS[0]

  const areaSelector = (
    <ColumnCard title="Areas" count={ALL_AREAS.length}>
      {ALL_AREAS.map((a) => (
        <ColumnRow key={a.id} name={a.name} id={a.id} selected={a.id === workAreaId} onClick={() => setWorkAreaId(a.id)} />
      ))}
    </ColumnCard>
  )

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Areas</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Areas</h1>
          <p className="text-sm text-muted-foreground">Manage the location hierarchy, SEO content and FAQs per area</p>
        </div>

        <Tabs defaultValue="hierarchy" className="w-full">
          <TabsList>
            <TabsTrigger value="hierarchy"><Map className="mr-1.5 h-3.5 w-3.5" />Map Hierarchy</TabsTrigger>
            <TabsTrigger value="seo"><FileText className="mr-1.5 h-3.5 w-3.5" />SEO</TabsTrigger>
            <TabsTrigger value="faqs"><HelpCircle className="mr-1.5 h-3.5 w-3.5" />FAQs</TabsTrigger>
          </TabsList>

          {/* ── Map Hierarchy: District > Area > Subarea miller columns ── */}
          <TabsContent value="hierarchy" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <ColumnCard title="Districts" count={DISTRICTS.length}>
                {DISTRICTS.map((d) => (
                  <ColumnRow
                    key={d.id} name={d.name} id={d.id}
                    childCount={d.areas.length} childLabel={d.areas.length === 1 ? "area" : "areas"}
                    selected={d.id === districtId}
                    onClick={() => { setDistrictId(d.id); setAreaId(d.areas[0]?.id ?? "") }}
                  />
                ))}
              </ColumnCard>

              <ColumnCard title={`Areas — ${district.name}`} count={district.areas.length}>
                {district.areas.map((a) => (
                  <ColumnRow
                    key={a.id} name={a.name} id={a.id}
                    childCount={a.subareas.length} childLabel={a.subareas.length === 1 ? "subarea" : "subareas"}
                    selected={a.id === areaId}
                    onClick={() => setAreaId(a.id)}
                  />
                ))}
              </ColumnCard>

              <ColumnCard title={`Subareas — ${area?.name ?? "—"}`} count={area?.subareas.length ?? 0}>
                {(area?.subareas ?? []).map((s) => (
                  <ColumnRow key={s.id} name={s.name} id={s.id} />
                ))}
                {(area?.subareas ?? []).length === 0 && (
                  <p className="flex items-center justify-center gap-1.5 py-10 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />No subareas</p>
                )}
              </ColumnCard>
            </div>
          </TabsContent>

          {/* ── SEO: pick an area on the left, edit its SEO on the right ── */}
          <TabsContent value="seo" className="mt-4">
            <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
              {areaSelector}
              <SeoTab key={workArea.id} entity={{ name: workArea.name, nameAr: workArea.nameAr, descriptionEn: `${workArea.name} is one of ${workArea.district}'s most in-demand areas.`, descriptionAr: `${workArea.nameAr} من أكثر المناطق طلبًا.` }} />
            </div>
          </TabsContent>

          {/* ── FAQs: pick an area on the left, manage its FAQs on the right ── */}
          <TabsContent value="faqs" className="mt-4">
            <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
              {areaSelector}
              <FaqsTab key={workArea.id} entityName={workArea.name} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

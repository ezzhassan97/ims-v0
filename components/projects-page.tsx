"use client"

import { useState } from "react"
import {
  Home, ChevronRight, ClipboardList, Sparkles, Globe, HelpCircle, Rocket, Layers, CreditCard,
  Image as ImageIcon, Images, LayoutTemplate, Building2, Map, Trees, Building as BuildingIcon, HardHat,
  Database, Paperclip, ScrollText, Braces, SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectHeader } from "@/components/project-header"
import { PROJECTS, type ProjectRow } from "@/lib/projects-mock"
import { MasterplanMap } from "@/components/masterplan-map"
import { BuildingsList } from "@/components/buildings-list"
import { PropertiesTable } from "@/components/properties-table"
import { SplittingRules } from "@/components/splitting-rules"
import { AmenitiesList } from "@/components/amenities-list"
import { AmenitiesMap } from "@/components/amenities-map"
import { SeoTab, FaqsTab } from "@/components/developers-page"
import { ProjectFeaturesTab } from "@/components/project-features-tab"
import { MetadataTab, AiSummaryTab } from "@/components/metadata-tab"
import { Switch } from "@/components/ui/switch"
import { MasterplansPage } from "@/components/masterplans-page"
import { ConstructionUpdatesPage } from "@/components/construction-updates-page"
import { RenderImagesPage } from "@/components/render-images-page"
import { LaunchesPage } from "@/components/launches-page"
import { AllPropertiesPage } from "@/components/all-properties-page"
import { PaymentPlansPage } from "@/components/payment-plans-page"
import { ComingSoon } from "@/components/coming-soon"
import { ProjectsPage } from "@/components/projects-list-page"
import { ProjectGalleryTab } from "@/components/project-gallery-tab"
import { IngestionEntriesPage } from "@/components/ingestion-entries-page"
import { TabStrip } from "@/components/table-kit"
import {
  type Building,
  type Unit,
  type SplittingRule,
  type Amenity,
  type FAQ,
  type ConstructionUpdate,
  initialBuildings,
  initialUnits,
  initialSplittingRules,
  initialAmenities,
  initialFAQs,
  initialConstructionUpdates,
  systemAmenities,
} from "@/lib/mock-data"

export function ProjectDetails({ project, onBack }: { project?: ProjectRow; onBack?: () => void }) {
  // Phases + sub-projects under this main project — feeds the Phases tab's table
  const childRows = PROJECTS.filter((p) => p.mainProject?.id === project?.id)
  // Entries scope: a main project matches itself and every child; a phase matches itself
  const scopeIds = project ? [project.id, ...childRows.map((c) => c.id)] : []
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [splittingRules, setSplittingRules] = useState<SplittingRule[]>(initialSplittingRules)
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([])
  const [hasMasterplan, setHasMasterplan] = useState(true)

  const [isAiExtracting, setIsAiExtracting] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)

  const [amenities, setAmenities] = useState<Amenity[]>(initialAmenities)
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([])
  const [isAddingAmenityPin, setIsAddingAmenityPin] = useState(false)
  const [addingPinForAmenityId, setAddingPinForAmenityId] = useState<string | null>(null)
  const [showAmenitiesColumn, setShowAmenitiesColumn] = useState(true)

  const [faqs, setFaqs] = useState<FAQ[]>(initialFAQs)

  const [constructionUpdates, setConstructionUpdates] = useState<ConstructionUpdate[]>(initialConstructionUpdates)

  const handleSelectBuilding = (id: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedBuildingIds((prev) => (prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]))
    } else {
      setSelectedBuildingIds([id])
    }
  }

  const handleBulkSelect = (ids: string[]) => {
    setSelectedBuildingIds(ids)
  }

  const handleToggleSelection = (id: string) => {
    setSelectedBuildingIds((prev) => (prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]))
  }

  const handleUpdateBuilding = (building: Building) => {
    setBuildings((prev) => prev.map((b) => (b.id === building.id ? building : b)))
  }

  const handleDeleteBuilding = (id: string) => {
    setBuildings((prev) => prev.filter((b) => b.id !== id))
    setSelectedBuildingIds((prev) => prev.filter((bid) => bid !== id))
  }

  const handleAddBuilding = (building: Omit<Building, "id">) => {
    const newId = Math.max(...buildings.map((b) => Number.parseInt(b.id)), 0) + 1
    setBuildings((prev) => [...prev, { ...building, id: newId.toString() }])
  }

  const handleBulkDelete = (ids: string[]) => {
    setBuildings((prev) => prev.filter((b) => !ids.includes(b.id)))
    setSelectedBuildingIds([])
  }

  const handleBulkRename = (
    ids: string[],
    pattern: { prefix: string; suffix: string; startNumber: number; padding: number },
  ) => {
    setBuildings((prev) =>
      prev.map((b) => {
        if (ids.includes(b.id)) {
          const index = ids.indexOf(b.id)
          const num = pattern.startNumber + index
          const paddedNum = pattern.padding > 0 ? num.toString().padStart(pattern.padding, "0") : ""
          return { ...b, name: `${pattern.prefix}${paddedNum}${pattern.suffix}` }
        }
        return b
      }),
    )
  }

  const handleAiExtract = () => {
    setIsAiExtracting(true)
    setAiProgress(0)

    const interval = setInterval(() => {
      setAiProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsAiExtracting(false)

          const aiBuildings: Building[] = [
            { id: "ai-1", name: "AI-1", x: 10, y: 40, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
            { id: "ai-2", name: "AI-2", x: 30, y: 35, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
            { id: "ai-3", name: "AI-3", x: 60, y: 40, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
            { id: "ai-4", name: "AI-4", x: 80, y: 35, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
            { id: "ai-5", name: "AI-5", x: 45, y: 70, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
            { id: "ai-6", name: "AI-6", x: 20, y: 65, unitCount: 0, isAiSuggested: true, totalUnits: 0, soldUnits: 0 },
          ]
          setBuildings((prev) => [...prev, ...aiBuildings])

          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleBulkAccept = (ids: string[]) => {
    setBuildings((prev) =>
      prev.map((b) => (ids.includes(b.id) ? { ...b, isAiSuggested: false, totalUnits: 10, soldUnits: 0 } : b)),
    )
    setSelectedBuildingIds([])
  }

  const handleDeleteMasterplan = () => {
    setHasMasterplan(false)
    setBuildings([])
    setSelectedBuildingIds([])
  }

  const handleDeleteRule = (id: string) => {
    setSplittingRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleAddRule = () => {
    // Mock - would open drawer
  }

  const handleUpdateUnit = (unitId: string, updates: Partial<Unit>) => {
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...updates } : u)))
  }

  const handleSelectAmenity = (id: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]))
    } else {
      setSelectedAmenityIds([id])
    }
  }

  const handleAmenityBulkSelect = (ids: string[]) => {
    setSelectedAmenityIds(ids)
  }

  const handleUnlinkAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isLinked: false, isDrawn: false, x: undefined, y: undefined } : a)),
    )
    setSelectedAmenityIds((prev) => prev.filter((aid) => aid !== id))
  }

  const handleLinkAmenities = (systemAmenityIds: string[]) => {
    const newAmenities: Amenity[] = systemAmenityIds.map((saId) => {
      const sa = systemAmenities.find((s) => s.id === saId)!
      const newId = (Math.max(...amenities.map((a) => Number.parseInt(a.id)), 0) + 1).toString()
      return {
        id: newId,
        nameEn: sa.nameEn,
        nameAr: sa.nameAr,
        icon: sa.icon,
        isLinked: true,
        isDrawn: false,
      }
    })
    setAmenities((prev) => [...prev, ...newAmenities])
  }

  const handleUpdateAmenity = (amenity: Amenity) => {
    setAmenities((prev) => prev.map((a) => (a.id === amenity.id ? amenity : a)))
  }

  const handleDeleteAmenityFromMap = (id: string) => {
    setAmenities((prev) => prev.map((a) => (a.id === id ? { ...a, pins: [] } : a)))
    setSelectedAmenityIds((prev) => prev.filter((aid) => aid !== id))
  }

  const handleBulkDeleteAmenityFromMap = (ids: string[]) => {
    setAmenities((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, pins: [] } : a)))
    setSelectedAmenityIds([])
  }

  const handleAddPinMode = (amenityId: string) => {
    setIsAddingAmenityPin(true)
    setAddingPinForAmenityId(amenityId)
  }

  const handleAddAmenityPin = (amenityId: string, x: number, y: number) => {
    setAmenities((prev) =>
      prev.map((a) => {
        if (a.id === amenityId) {
          const newPinId = `pin-${Date.now()}`
          return {
            ...a,
            pins: [...a.pins, { id: newPinId, x, y }],
          }
        }
        return a
      }),
    )
    setIsAddingAmenityPin(false)
    setAddingPinForAmenityId(null)
  }

  const handleCancelAddPin = () => {
    setIsAddingAmenityPin(false)
    setAddingPinForAmenityId(null)
  }

  const handleAddFAQ = (faq: Omit<FAQ, "id" | "createdAt" | "updatedAt">) => {
    const newId = (Math.max(...faqs.map((f) => Number.parseInt(f.id)), 0) + 1).toString()
    setFaqs((prev) => [
      ...prev,
      {
        ...faq,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  }

  const handleUpdateFAQ = (faq: FAQ) => {
    setFaqs((prev) => prev.map((f) => (f.id === faq.id ? faq : f)))
  }

  const handleDeleteFAQ = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id))
  }

  const handleReorderFAQs = (reorderedFAQs: FAQ[]) => {
    setFaqs(reorderedFAQs)
  }

  const handleUpdateConstructionUpdate = (update: ConstructionUpdate) => {
    setConstructionUpdates((prev) => prev.map((u) => (u.id === update.id ? update : u)))
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {onBack && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button onClick={onBack} className="flex items-center hover:text-foreground"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={onBack} className="hover:text-foreground hover:underline">Projects</button>
            {project && <><ChevronRight className="h-3 w-3" /><span className="font-medium text-foreground">{project.name}</span></>}
          </div>
        )}
        <ProjectHeader project={project} />

        <Tabs defaultValue="features" className="w-full">
          {/* Single-row scrollable icon tabs — scales as tabs keep growing */}
          <TabStrip>
            <TabsList className="w-max">
              {[
                { value: "features", label: "Features", icon: ClipboardList },
                { value: "metadata", label: "Metadata", icon: Braces },
                { value: "seo", label: "SEO", icon: Globe },
                { value: "ai-summary", label: "AI Summary", icon: Sparkles },
                { value: "faqs", label: "FAQs", icon: HelpCircle },
                { value: "launches", label: "Launches", icon: Rocket },
                // Phases only exist under a main project
                ...(project?.isPhase ? [] : [{ value: "phases", label: "Phases", icon: Layers }]),
                { value: "project-gallery", label: "Project Gallery", icon: Images },
                { value: "payment-plans", label: "Payment Plans", icon: CreditCard },
                { value: "render-images", label: "Render Images", icon: ImageIcon },
                { value: "floor-plans", label: "Floor Plans", icon: LayoutTemplate },
                { value: "properties", label: "Properties", icon: Building2 },
                { value: "masterplans", label: "Masterplans", icon: Map },
                { value: "amenities", label: "Masterplan Amenities", icon: Trees },
                { value: "buildings", label: "Masterplan Buildings", icon: BuildingIcon },
                { value: "construction-updates", label: "Construction Updates", icon: HardHat },
                { value: "ingestion-entries", label: "Ingestion Entries", icon: Database },
                { value: "attachments", label: "Attachments", icon: Paperclip },
                { value: "configurations", label: "Configurations", icon: SlidersHorizontal },
                { value: "audit-logs", label: "Audit Logs", icon: ScrollText },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="data-[state=active]:bg-card">
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabStrip>

          {/* Not built yet → coming soon */}
          <TabsContent value="features" className="mt-4">
            <ProjectFeaturesTab />
          </TabsContent>

          <TabsContent value="metadata" className="mt-4">
            <MetadataTab kind="project" />
          </TabsContent>

          <TabsContent value="ai-summary" className="mt-4">
            <AiSummaryTab kind="project" />
          </TabsContent>

          <TabsContent value="configurations" className="mt-4">
            <ProjectConfigFlagsTab />
          </TabsContent>

          {["floor-plans", "attachments", "audit-logs"].map((value) => (
            <TabsContent key={value} value={value} className="mt-4">
              <ComingSoon pageName={value === "seo" ? "SEO" : value.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")} />
            </TabsContent>
          ))}

          {/* Phases — the same projects table, scoped to this main project's children */}
          {!project?.isPhase && (
            <TabsContent value="phases" className="mt-4">
              <ProjectsPage embedded hideDeveloperFilter rows={childRows} />
            </TabsContent>
          )}

          <TabsContent value="project-gallery" className="mt-4">
            <ProjectGalleryTab project={project} />
          </TabsContent>

          {/* Data ingestion entries — the global entries tables, scoped to this project */}
          <TabsContent value="ingestion-entries" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Data ingestion entries</h3>
              <p className="text-xs text-muted-foreground">Sheet and manual entries that include this {project?.isPhase ? "phase" : "project or its phases"}</p>
            </div>
            <Tabs defaultValue="sheets" className="w-full">
              <TabsList className="w-max">
                <TabsTrigger value="sheets" className="gap-1.5"><Database className="h-3.5 w-3.5" />Automatic Sheets</TabsTrigger>
                <TabsTrigger value="manual" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Manual Grouped</TabsTrigger>
              </TabsList>
              <TabsContent value="sheets" className="mt-4">
                <IngestionEntriesPage key="sheets" mode="sheets" embedded scopeProjectIds={scopeIds} />
              </TabsContent>
              <TabsContent value="manual" className="mt-4">
                <IngestionEntriesPage key="manual" mode="manual" embedded scopeProjectIds={scopeIds} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="launches" className="mt-4">
            <LaunchesPage
              embedded
              scopeProject={{
                id: project?.id,
                phaseIds: childRows.map((c) => c.id),
                name: project?.name ?? "",
                isPhase: project?.isPhase ?? false,
                mainProject: project?.mainProject?.name,
                developer: project?.developer?.name,
                area: project?.area,
                phases: project && !project.isPhase ? PROJECTS.filter((p) => p.isPhase && p.mainProject?.id === project.id).map((p) => p.name) : [],
              }}
            />
          </TabsContent>

          <TabsContent value="payment-plans" className="mt-4">
            <PaymentPlansPage embedded />
          </TabsContent>

          <TabsContent value="properties" className="mt-4">
            <ProjectPropertiesTab scope={{ name: project?.name ?? "", isPhase: project?.isPhase ?? false, mainProject: project?.mainProject?.name }} />
          </TabsContent>

          <TabsContent value="render-images" className="mt-4">
            <RenderImagesPage embedded scopeProject={{ name: project?.name ?? "", isPhase: project?.isPhase ?? false }} />
          </TabsContent>

          <TabsContent value="masterplans" className="mt-4">
            <MasterplansPage embedded scopeProject={{ name: project?.name ?? "", isPhase: project?.isPhase ?? false, mainProject: project?.mainProject?.name }} />
          </TabsContent>

          <TabsContent value="amenities" className="mt-4">
            <div className={`grid grid-cols-1 ${showAmenitiesColumn ? "lg:grid-cols-[1fr_280px]" : "lg:grid-cols-1"} gap-4 h-[700px]`}>
              <AmenitiesMap
                amenities={amenities}
                selectedAmenityIds={selectedAmenityIds}
                onSelectAmenity={handleSelectAmenity}
                onUpdateAmenity={handleUpdateAmenity}
                onDeleteFromMap={handleDeleteAmenityFromMap}
                onBulkDeleteFromMap={handleBulkDeleteAmenityFromMap}
                onBulkSelect={handleAmenityBulkSelect}
                onAddPin={handleAddAmenityPin}
                isAddingPin={isAddingAmenityPin}
                addingPinForAmenityId={addingPinForAmenityId}
                onCancelAddPin={handleCancelAddPin}
                hasMasterplan={hasMasterplan}
                showAmenitiesColumn={showAmenitiesColumn}
                onToggleAmenitiesColumn={() => setShowAmenitiesColumn(!showAmenitiesColumn)}
              />
              {showAmenitiesColumn && (
                <AmenitiesList
                  amenities={amenities}
                  systemAmenities={systemAmenities}
                  selectedAmenityIds={selectedAmenityIds}
                  onSelectAmenity={handleSelectAmenity}
                  onUnlinkAmenity={handleUnlinkAmenity}
                  onLinkAmenities={handleLinkAmenities}
                  onUpdateAmenity={handleUpdateAmenity}
                  onAddPinMode={handleAddPinMode}
                  isAddingPin={isAddingAmenityPin}
                  addingPinForAmenityId={addingPinForAmenityId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="buildings" className="mt-4 space-y-4">
            <MasterplanMap
              buildings={buildings}
              selectedBuildingIds={selectedBuildingIds}
              onSelectBuilding={handleSelectBuilding}
              onUpdateBuilding={handleUpdateBuilding}
              onDeleteBuilding={handleDeleteBuilding}
              onAddBuilding={handleAddBuilding}
              onBulkDelete={handleBulkDelete}
              onBulkRename={handleBulkRename}
              onBulkSelect={handleBulkSelect}
              onAiExtract={handleAiExtract}
              onBulkAccept={handleBulkAccept}
              isAiExtracting={isAiExtracting}
              aiProgress={aiProgress}
              hasMasterplan={hasMasterplan}
              onDeleteMasterplan={handleDeleteMasterplan}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
              <div className="lg:h-[700px]">
                <PropertiesTable 
                  units={units} 
                  buildings={buildings} 
                  onUpdateUnit={handleUpdateUnit}
                  headerActions={
                    <SplittingRules rules={splittingRules} onDeleteRule={handleDeleteRule} onAddRule={handleAddRule} />
                  }
                />
              </div>

              <div className="lg:h-[700px]">
                <BuildingsList
                  buildings={buildings}
                  selectedBuildingIds={selectedBuildingIds}
                  onSelectBuilding={handleSelectBuilding}
                  onToggleSelection={handleToggleSelection}
                  onUpdateBuilding={handleUpdateBuilding}
                  onDeleteBuilding={handleDeleteBuilding}
                  onAddBuilding={handleAddBuilding}
                  onBulkDelete={handleBulkDelete}
                  onBulkRename={handleBulkRename}
                  units={units} // Added units prop so BuildingsList can calculate unit counts and phases
                />
              </div>
            </div>
          </TabsContent>

          {/* SEO & FAQs — exactly the same components as developer details */}
          <TabsContent value="seo" className="mt-4">
            <SeoTab
              key={project?.name}
              entity={{
                name: project?.name ?? "",
                nameAr: project?.name ?? "",
                descriptionEn: `${project?.name ?? ""} is one of ${project?.area ?? "the area"}'s most in-demand projects.`,
                descriptionAr: `${project?.name ?? ""} من أكثر المشروعات طلبًا.`,
              }}
            />
          </TabsContent>
          <TabsContent value="faqs" className="mt-4">
            <FaqsTab key={project?.name} entityName={project?.name ?? ""} />
          </TabsContent>

          <TabsContent value="construction-updates" className="mt-4">
            <ConstructionUpdatesPage
              embedded
              updates={constructionUpdates}
              onUpdateChange={handleUpdateConstructionUpdate}
              onCreate={(u) => setConstructionUpdates((prev) => [u, ...prev])}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Properties tab — sale-type scoping pills over the embedded properties view ──

const SALE_TABS = [
  { key: "all", label: "All" },
  { key: "launch", label: "Launch", saleType: "Launch" },
  { key: "primary-auto", label: "Primary Automatic", saleType: "Primary", entryType: "Automatic" },
  { key: "primary-manual", label: "Primary Manual", saleType: "Primary", entryType: "Manual" },
  { key: "resale", label: "Resale", saleType: "Resale" },
  { key: "nawy-now", label: "Nawy Now", saleType: "Nawy Now" },
  { key: "rentals", label: "Rentals", saleType: "Rental" },
] as const

function ProjectPropertiesTab({ scope }: { scope: { name: string; isPhase: boolean; mainProject?: string } }) {
  const [sale, setSale] = useState<string>("all")
  const t = SALE_TABS.find((x) => x.key === sale) ?? SALE_TABS[0]
  return (
    <div className="space-y-4">
      <Tabs value={sale} onValueChange={setSale}>
        <TabsList className="w-max bg-muted">
          {SALE_TABS.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="data-[state=active]:bg-card">{s.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {/* Key remount per scope keeps every tab's filters/pagination clean */}
      <AllPropertiesPage
        key={sale}
        embedded
        scopeProject={scope}
        fixedSaleType={"saleType" in t ? t.saleType : undefined}
        fixedEntryType={"entryType" in t ? t.entryType : undefined}
      />
    </div>
  )
}

// ─── Configurations tab — project-level flags ─────────────────────────────────

function ProjectConfigFlagsTab() {
  const [unlocked, setUnlocked] = useState(false)
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Configurations</h3>
        <span className="text-[11px] text-muted-foreground">Project-level flags</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Nawy Unlocked Supported</p>
          <p className="text-[11px] text-muted-foreground">Whether this project participates in the Nawy Unlocked program</p>
        </div>
        <Switch
          checked={unlocked}
          onCheckedChange={(v) => { setUnlocked(v); toast.success(`Nawy Unlocked ${v ? "enabled" : "disabled"} for this project`) }}
        />
      </div>
    </div>
  )
}

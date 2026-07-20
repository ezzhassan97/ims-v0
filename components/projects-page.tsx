"use client"

import { useState } from "react"
import {
  Home, ChevronRight, Sparkles, Globe, HelpCircle, Rocket, Layers, CreditCard,
  Image as ImageIcon, LayoutTemplate, Building2, Map, Trees, Building as BuildingIcon, HardHat,
  Database, Paperclip, ScrollText,
} from "lucide-react"
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
import { MasterplansPage } from "@/components/masterplans-page"
import { ConstructionUpdatesTab } from "@/components/construction-updates-tab"
import { RenderImagesPage } from "@/components/render-images-page"
import { LaunchesPage } from "@/components/launches-page"
import { AllPropertiesPage } from "@/components/all-properties-page"
import { PaymentPlansPage } from "@/components/payment-plans-page"
import { ComingSoon } from "@/components/coming-soon"
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
                { value: "features", label: "Features", icon: Sparkles },
                { value: "seo", label: "SEO", icon: Globe },
                { value: "faqs", label: "FAQs", icon: HelpCircle },
                { value: "launches", label: "Launches", icon: Rocket },
                // Phases only exist under a main project
                ...(project?.isPhase ? [] : [{ value: "phases", label: "Phases", icon: Layers }]),
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

          {["phases", "floor-plans", "ingestion-entries", "attachments", "audit-logs"].map((value) => (
            <TabsContent key={value} value={value} className="mt-4">
              <ComingSoon pageName={value === "seo" ? "SEO" : value.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")} />
            </TabsContent>
          ))}

          <TabsContent value="launches" className="mt-4">
            <LaunchesPage
              embedded
              scopeProject={{
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
            <AllPropertiesPage embedded scopeProject={{ name: project?.name ?? "", isPhase: project?.isPhase ?? false, mainProject: project?.mainProject?.name }} />
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
            <ConstructionUpdatesTab
              updates={constructionUpdates}
              onUpdateChange={handleUpdateConstructionUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

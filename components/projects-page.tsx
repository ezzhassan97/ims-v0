"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectHeader } from "@/components/project-header"
import { MasterplanMap } from "@/components/masterplan-map"
import { BuildingsList } from "@/components/buildings-list"
import { PropertiesTable } from "@/components/properties-table"
import { SplittingRules } from "@/components/splitting-rules"
import { AmenitiesList } from "@/components/amenities-list"
import { AmenitiesMap } from "@/components/amenities-map"
import { FAQsTab } from "@/components/faqs-tab"
import { MasterplansTab } from "@/components/masterplans-tab"
import { ConstructionUpdatesTab } from "@/components/construction-updates-tab"
import {
  type Building,
  type Unit,
  type SplittingRule,
  type Amenity,
  type FAQ,
  type MasterplanFile,
  type ConstructionUpdate,
  initialBuildings,
  initialUnits,
  initialSplittingRules,
  initialAmenities,
  initialFAQs,
  initialMasterplans,
  initialConstructionUpdates,
  systemAmenities,
} from "@/lib/mock-data"

export function ProjectsPage() {
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

  const [masterplans, setMasterplans] = useState<MasterplanFile[]>(initialMasterplans)

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
        <ProjectHeader />

        <Tabs defaultValue="buildings" className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="masterplans" className="data-[state=active]:bg-card">
              Masterplans
            </TabsTrigger>
            <TabsTrigger value="amenities" className="data-[state=active]:bg-card">
              Masterplan Amenities
            </TabsTrigger>
            <TabsTrigger value="buildings" className="data-[state=active]:bg-card">
              Masterplan Buildings
            </TabsTrigger>
            <TabsTrigger value="faqs" className="data-[state=active]:bg-card">
              FAQs
            </TabsTrigger>
            <TabsTrigger value="construction-updates" className="data-[state=active]:bg-card">
              Construction Updates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="masterplans" className="mt-4">
            <MasterplansTab masterplans={masterplans} />
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

          <TabsContent value="faqs" className="mt-4">
            <FAQsTab
              faqs={faqs}
              onAddFAQ={handleAddFAQ}
              onUpdateFAQ={handleUpdateFAQ}
              onDeleteFAQ={handleDeleteFAQ}
              onReorderFAQs={handleReorderFAQs}
            />
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

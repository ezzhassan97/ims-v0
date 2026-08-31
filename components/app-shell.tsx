"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProjectsPage } from "@/components/projects-list-page"
import { ComingSoon } from "@/components/coming-soon"
import { TestingPlayground } from "@/components/testing-playground"
import { ValidationRulesPage } from "@/components/validation-rules-page"
import { LaunchesPage } from "@/components/launches-page"
import { SoldUnitsPage } from "@/components/sold-units-page"
import { AuditLogsPage } from "@/components/audit-logs-page"
import { ConstructionUpdatesPage } from "@/components/construction-updates-page"
import { WhatsAppMediaPage } from "@/components/whatsapp-media-page"
import { WhatsAppGroupsPage } from "@/components/whatsapp-groups-page"
import { WhatsAppConfigurationsPage } from "@/components/whatsapp-configurations-page"
import { AllPropertiesPage } from "@/components/all-properties-page"
import { DevelopersPage } from "@/components/developers-page"
import { AreasPage } from "@/components/areas-page"
import { NawySpacePage } from "@/components/nawy-space-page"
import { RenderImagesPage } from "@/components/render-images-page"
import { PaymentPlansPage } from "@/components/payment-plans-page"
import { MasterplansPage } from "@/components/masterplans-page"
import { BrochuresPage } from "@/components/brochures-page"
import { FloorPlansPage } from "@/components/floor-plans-page"
import { PropertiesConfigurationsPage } from "@/components/properties-configurations-page"
import { IngestionEntriesPage } from "@/components/ingestion-entries-page"
import { SheetEntryDetailsPage } from "@/components/sheet-entry-details-page"
import { ManualEntryDetailsPage } from "@/components/manual-entry-details-page"
import type { IngestionEntry, IngestionMode } from "@/lib/ingestion-mock"
import { GroupedPropertyDetails, type GroupDetailPayload } from "@/components/grouped-properties-page"
import { CreatePropertyPage } from "@/components/create-property-page"
import type { Variation } from "@/components/additional-info-tab"
import { cn } from "@/lib/utils"

export function AppShell() {
  const [activePage, setActivePage] = useState("Projects")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [groupDetail, setGroupDetail] = useState<GroupDetailPayload | null>(null)
  const [createProperty, setCreateProperty] = useState<Variation | null>(null)
  const [sheetEntry, setSheetEntry] = useState<{ entry: IngestionEntry; mode: IngestionMode } | null>(null)

  const renderContent = () => {
    if (createProperty) {
      return <CreatePropertyPage variation={createProperty} onBack={() => setCreateProperty(null)} />
    }
    if (sheetEntry) {
      return sheetEntry.mode === "sheets"
        ? <SheetEntryDetailsPage entry={sheetEntry.entry} onBack={() => setSheetEntry(null)} />
        : <ManualEntryDetailsPage entry={sheetEntry.entry} onBack={() => setSheetEntry(null)} />
    }
    if (groupDetail) {
      return <GroupedPropertyDetails group={groupDetail.group} allRows={groupDetail.allRows} index={groupDetail.index} onBack={() => setGroupDetail(null)} />
    }
    switch (activePage) {
      case "Projects":
        return <ProjectsPage />
      case "Launches":
        return <LaunchesPage />
      {/* key: sale-type pages share one component — without a key the previous page's filter state leaks across navigation */}
      case "All Properties":
        return <AllPropertiesPage key="all" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Launch Properties":
        return <AllPropertiesPage key="launch" fixedSaleType="Launch" pageTitle="Launch Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Primary Properties":
        return <AllPropertiesPage key="primary" fixedSaleType="Primary" pageTitle="Primary Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Resale Properties":
        return <AllPropertiesPage key="resale" fixedSaleType="Resale" pageTitle="Resale Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Nawy Now Properties":
        return <AllPropertiesPage key="nawy-now" fixedSaleType="Nawy Now" pageTitle="Nawy Now Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Rental Properties":
        return <AllPropertiesPage key="rental" fixedSaleType="Rental" pageTitle="Rental Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Areas":
        return <AreasPage />
      case "Developers":
        return <DevelopersPage />
      case "Testing Playground":
        return <TestingPlayground />
      case "Nawy Space":
        return <NawySpacePage />
      case "Render Images":
        return <RenderImagesPage />
      case "Payment Plans":
        return <PaymentPlansPage />
      case "Masterplans":
        return <MasterplansPage />
      case "Brochures":
        return <BrochuresPage />
      case "Floor Plans":
        return <FloorPlansPage />
      case "Properties Bulk Ingestion":
        // Structured entries open the sheets wizard, unstructured the manual one
        return <IngestionEntriesPage onView={(e) => setSheetEntry({ entry: e, mode: e.dataType === "Structured Detailed" ? "sheets" : "manual" })} />
      case "Properties Configurations":
        return <PropertiesConfigurationsPage />
      case "Validation Rules":
        return <ValidationRulesPage />
      case "Sold Units":
        return <SoldUnitsPage />
      case "Audit Logs":
        return <AuditLogsPage />
      case "Construction Updates":
        return <ConstructionUpdatesPage />
      case "Whatsapp Groups":
        return <WhatsAppGroupsPage />
      case "Whatsapp Media":
        return <WhatsAppMediaPage />
      case "Whatsapp Configurations":
        return <WhatsAppConfigurationsPage />
      default:
        return <ComingSoon pageName={activePage} />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onPageChange={(p) => { setActivePage(p); setGroupDetail(null); setCreateProperty(null); setSheetEntry(null) }} activePage={activePage} onCollapseChange={setSidebarCollapsed} />
      <main className={cn("flex-1 overflow-auto transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        {renderContent()}
      </main>
    </div>
  )
}

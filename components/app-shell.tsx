"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProjectsPage } from "@/components/projects-list-page"
import { ComingSoon } from "@/components/coming-soon"
import { TestingPlayground } from "@/components/testing-playground"
import { ValidationRulesPage } from "@/components/validation-rules-page"
import { LaunchesPage } from "@/components/launches-page"
import { AreasFAQsPage } from "@/components/areas-faqs-page"
import { SoldUnitsPage } from "@/components/sold-units-page"
import { AuditLogsPage } from "@/components/audit-logs-page"
import { ConstructionUpdatesPage } from "@/components/construction-updates-page"
import { WhatsAppMediaPage } from "@/components/whatsapp-media-page"
import { WhatsAppGroupsPage } from "@/components/whatsapp-groups-page"
import { WhatsAppConfigurationsPage } from "@/components/whatsapp-configurations-page"
import { AllPropertiesPage } from "@/components/all-properties-page"
import { DevelopersPage } from "@/components/developers-page"
import { AreasPage } from "@/components/areas-page"
import { QualitySystemPage } from "@/components/quality-system-page"
import { NawySpacePage } from "@/components/nawy-space-page"
import { RenderImagesPage } from "@/components/render-images-page"
import { PaymentPlansPage } from "@/components/payment-plans-page"
import { MasterplansPage } from "@/components/masterplans-page"
import { PropertiesConfigurationsPage } from "@/components/properties-configurations-page"
import { GroupedPropertyDetails, type GroupDetailPayload } from "@/components/grouped-properties-page"
import { CreatePropertyPage } from "@/components/create-property-page"
import type { Variation } from "@/components/additional-info-tab"
import { cn } from "@/lib/utils"

export function AppShell() {
  const [activePage, setActivePage] = useState("Projects")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [groupDetail, setGroupDetail] = useState<GroupDetailPayload | null>(null)
  const [createProperty, setCreateProperty] = useState<Variation | null>(null)

  const renderContent = () => {
    if (createProperty) {
      return <CreatePropertyPage variation={createProperty} onBack={() => setCreateProperty(null)} />
    }
    if (groupDetail) {
      return <GroupedPropertyDetails group={groupDetail.group} allRows={groupDetail.allRows} index={groupDetail.index} onBack={() => setGroupDetail(null)} />
    }
    switch (activePage) {
      case "Projects":
        return <ProjectsPage />
      case "Launches":
        return <LaunchesPage />
      case "All Properties":
        return <AllPropertiesPage onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Primary Properties":
        return <AllPropertiesPage fixedSaleType="Primary" pageTitle="Primary Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Resale Properties":
        return <AllPropertiesPage fixedSaleType="Resale" pageTitle="Resale Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Nawy Now Properties":
        return <AllPropertiesPage fixedSaleType="Nawy Now" pageTitle="Nawy Now Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Rental Properties":
        return <AllPropertiesPage fixedSaleType="Rental" pageTitle="Rental Properties" onOpenGroupDetail={setGroupDetail} onCreateProperty={setCreateProperty} />
      case "Areas":
        return <AreasPage />
      case "Developers":
        return <DevelopersPage />
      case "Testing Playground":
        return <TestingPlayground />
      case "Quality System":
        return <QualitySystemPage />
      case "Nawy Space":
        return <NawySpacePage />
      case "Render Images":
        return <RenderImagesPage />
      case "Payment Plans":
        return <PaymentPlansPage />
      case "Masterplans":
        return <MasterplansPage />
      case "Properties Configurations":
        return <PropertiesConfigurationsPage />
      case "Validation Rules":
        return <ValidationRulesPage />
      case "Areas FAQs":
        return <AreasFAQsPage />
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
      <Sidebar onPageChange={(p) => { setActivePage(p); setGroupDetail(null); setCreateProperty(null) }} activePage={activePage} onCollapseChange={setSidebarCollapsed} />
      <main className={cn("flex-1 overflow-auto transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        {renderContent()}
      </main>
    </div>
  )
}

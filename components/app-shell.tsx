"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProjectsPage } from "@/components/projects-page"
import { ComingSoon } from "@/components/coming-soon"
import { TestingPlayground } from "@/components/testing-playground"
import { ValidationRulesPage } from "@/components/validation-rules-page"
import { LaunchesPage } from "@/components/launches-page"
import { AreasFAQsPage } from "@/components/areas-faqs-page"
import { SoldUnitsPage } from "@/components/sold-units-page"
import { AuditLogsPage } from "@/components/audit-logs-page"
import { ConstructionUpdatesPage } from "@/components/construction-updates-page"
import { WhatsAppMediaPage } from "@/components/whatsapp-media-page"
import { WhatsAppConfigurationsPage } from "@/components/whatsapp-configurations-page"
import { AllPropertiesPage } from "@/components/all-properties-page"
import { QualitySystemPage } from "@/components/quality-system-page"
import { NawySpacePage } from "@/components/nawy-space-page"
import { ProjectsNewPage } from "@/components/projects-new-page"
import { RenderImagesPage } from "@/components/render-images-page"
import { cn } from "@/lib/utils"

export function AppShell() {
  const [activePage, setActivePage] = useState("Projects")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderContent = () => {
    switch (activePage) {
      case "Projects":
        return <ProjectsPage />
      case "Projects New":
        return <ProjectsNewPage />
      case "Launches":
        return <LaunchesPage />
      case "All Properties":
        return <AllPropertiesPage />
      case "Testing Playground":
        return <TestingPlayground />
      case "Quality System":
        return <QualitySystemPage />
      case "Nawy Space":
        return <NawySpacePage />
      case "Render Images":
        return <RenderImagesPage />
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
      <Sidebar onPageChange={setActivePage} activePage={activePage} onCollapseChange={setSidebarCollapsed} />
      <main className={cn("flex-1 overflow-auto transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        {renderContent()}
      </main>
    </div>
  )
}

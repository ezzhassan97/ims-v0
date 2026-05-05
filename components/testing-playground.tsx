"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { AdvancedDataGrid } from "@/components/advanced-data-grid"
import { PropTechMap } from "@/components/proptech-map"

const tabs = [
  { id: "data-grid", label: "Data Grid" },
  { id: "map", label: "Map" },
  { id: "forms", label: "Forms" },
  { id: "charts", label: "Charts" },
  { id: "modals", label: "Modals" },
]

export function TestingPlayground() {
  const [activeTab, setActiveTab] = useState("data-grid")

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Testing Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          UI flows and components for demo purposes and design references
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "data-grid" && <AdvancedDataGrid />}
        {activeTab === "map" && <PropTechMap />}
        {activeTab !== "data-grid" && activeTab !== "map" && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Coming Soon</p>
              <p className="text-sm text-muted-foreground/60 mt-1">This tab is under development</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

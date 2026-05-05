"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIWhatsappExtractions } from "@/components/ai-whatsapp-extractions"
import { ListedUpdates } from "@/components/listed-updates"
import type { ConstructionUpdate } from "@/lib/mock-data"

interface ConstructionUpdatesTabProps {
  updates: ConstructionUpdate[]
  onUpdateChange?: (update: ConstructionUpdate) => void
}

export function ConstructionUpdatesTab({ updates, onUpdateChange }: ConstructionUpdatesTabProps) {
  const [localUpdates, setLocalUpdates] = useState(updates)

  const handleUpdateChange = (update: ConstructionUpdate) => {
    setLocalUpdates((prev) => prev.map((u) => (u.id === update.id ? update : u)))
    onUpdateChange?.(update)
  }

  const pendingCount = localUpdates.filter((u) => u.status === "Pending Review").length
  const rejectedCount = localUpdates.filter((u) => u.status === "Rejected").length
  const listedCount = localUpdates.filter((u) => u.status === "Listed").length

  return (
    <Tabs defaultValue="ai-whatsapp" className="w-full">
      <TabsList className="bg-secondary w-full justify-start">
        <TabsTrigger value="ai-whatsapp" className="data-[state=active]:bg-card">
          AI WhatsApp Extractions
          <span className="ml-2 flex items-center gap-1">
            {rejectedCount > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                {rejectedCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {pendingCount}
              </span>
            )}
            {listedCount > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {listedCount}
              </span>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger value="listed-updates" className="data-[state=active]:bg-card">
          Listed Updates
          <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
            {listedCount}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ai-whatsapp" className="mt-4">
        <AIWhatsappExtractions updates={localUpdates} onUpdateChange={handleUpdateChange} />
      </TabsContent>

      <TabsContent value="listed-updates" className="mt-4">
        <ListedUpdates updates={localUpdates} />
      </TabsContent>
    </Tabs>
  )
}

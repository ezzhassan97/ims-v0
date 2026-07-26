"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { DeveloperSelect, ProjectTreeSelect, type ProjectTreeNode, type ProjectTreeSelection } from "@/components/table-kit"
import { PROJECTS, type ProjectRow } from "@/lib/projects-mock"

/** Existing-project picker data — system projects grouped main → phases with listing statuses. */
export function sysProjectTree(devId?: string): ProjectTreeNode[] {
  return PROJECTS.filter((p) => !p.isPhase && (!devId || p.developer.id === devId)).map((p) => ({
    id: p.id, name: p.name, status: p.listingStatus,
    phases: PROJECTS.filter((ph) => ph.isPhase && ph.mainProject?.id === p.id).map((ph) => ({ id: ph.id, name: ph.name, status: ph.listingStatus })),
  }))
}

export const SYS_DEVELOPERS = [...new Map(PROJECTS.map((p) => [p.developer.id, { id: p.developer.id, name: p.developer.name }])).values()]

/** Link a not-yet-ingested launch to an already-existing system project/phase. */
export function LinkProjectDialog({ launch, onClose, onConfirm }: {
  launch: { id: string; projectNameEn: string; phase: string }
  onClose: () => void
  onConfirm: (row: ProjectRow, isPhase: boolean) => void
}) {
  const [devId, setDevId] = useState("")
  const [sel, setSel] = useState<ProjectTreeSelection>(null)
  const row = sel ? PROJECTS.find((p) => p.id === sel.id) : undefined
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      {/* No scroll container — the pickers overlay past the dialog bounds. */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Link to Existing Project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{launch.projectNameEn}{launch.phase ? ` — ${launch.phase}` : ""}</span> ({launch.id}) will be linked to an existing project or phase — ingestion updates it in place, and names and area come from the linked record.
        </p>
        <div className="grid grid-cols-2 gap-4 py-1">
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <DeveloperSelect developers={SYS_DEVELOPERS} value={devId} onChange={(v) => { setDevId(v); setSel(null) }} placeholder="Select developer…" />
          </div>
          <div className="space-y-1.5">
            <Label>Project / Phase</Label>
            <ProjectTreeSelect projects={sysProjectTree(devId || undefined)} value={sel} onChange={setSel} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={onClose}>Cancel</Button>
          <Button disabled={!row} onClick={() => row && onConfirm(row, sel?.kind === "phase")}>Link Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

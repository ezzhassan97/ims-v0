"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Building } from "@/lib/mock-data"

interface BuildingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  building?: Building | null
  onSave: (name: string, unitCount?: number) => void
}

export function BuildingModal({ open, onOpenChange, building, onSave }: BuildingModalProps) {
  const [name, setName] = useState("")
  const [unitCount, setUnitCount] = useState(0)

  useEffect(() => {
    if (building) {
      setName(building.name)
      setUnitCount(building.unitCount)
    } else {
      setName("")
      setUnitCount(0)
    }
  }, [building, open])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), unitCount)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{building ? "Edit Building" : "Add Building"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Building Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter building name..."
              className="bg-secondary/50"
            />
          </div>
          {!building && (
            <div className="space-y-2">
              <Label htmlFor="units" className="text-foreground">
                Number of Units
              </Label>
              <Input
                id="units"
                type="number"
                value={unitCount}
                onChange={(e) => setUnitCount(Number.parseInt(e.target.value) || 0)}
                placeholder="Enter unit count..."
                className="bg-secondary/50"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {building ? "Save Changes" : "Add Building"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

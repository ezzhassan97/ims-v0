"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface BulkRenameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  selectedNames: string[]
  onRename: (pattern: { prefix: string; suffix: string; startNumber: number; padding: number }) => void
}

export function BulkRenameModal({ open, onOpenChange, count, selectedNames, onRename }: BulkRenameModalProps) {
  const [prefix, setPrefix] = useState("B-")
  const [suffix, setSuffix] = useState("")
  const [startNumber, setStartNumber] = useState(1)
  const [padding, setPadding] = useState(2)
  const [useNumbers, setUseNumbers] = useState(true)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPrefix("B-")
      setSuffix("")
      setStartNumber(1)
      setPadding(2)
      setUseNumbers(true)
    }
  }, [open])

  const handleRename = () => {
    onRename({ prefix, suffix, startNumber, padding: useNumbers ? padding : 0 })
  }

  const generatePreview = () => {
    const previews: string[] = []
    for (let i = 0; i < Math.min(count, 5); i++) {
      const num = startNumber + i
      const paddedNum = useNumbers ? num.toString().padStart(padding, "0") : ""
      previews.push(`${prefix}${paddedNum}${suffix}`)
    }
    if (count > 5) {
      previews.push("...")
    }
    return previews
  }

  const previews = generatePreview()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Rename {count} Buildings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Apply a naming pattern to all selected buildings (similar to Figma)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prefix */}
          <div className="space-y-2">
            <Label htmlFor="prefix" className="text-foreground">
              Prefix
            </Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g., B-, Building-, Tower-"
              className="bg-secondary/50"
            />
          </div>

          {/* Numbering section */}
          <div className="space-y-3 p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="useNumbers"
                checked={useNumbers}
                onCheckedChange={(checked) => setUseNumbers(checked as boolean)}
              />
              <Label htmlFor="useNumbers" className="text-foreground cursor-pointer">
                Add sequential numbers
              </Label>
            </div>

            {useNumbers && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="startNumber" className="text-sm text-muted-foreground">
                    Start from
                  </Label>
                  <Input
                    id="startNumber"
                    type="number"
                    min={0}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number.parseInt(e.target.value) || 0)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="padding" className="text-sm text-muted-foreground">
                    Number padding
                  </Label>
                  <Select value={padding.toString()} onValueChange={(v) => setPadding(Number.parseInt(v))}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1, 2, 3...</SelectItem>
                      <SelectItem value="2">01, 02, 03...</SelectItem>
                      <SelectItem value="3">001, 002, 003...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Suffix */}
          <div className="space-y-2">
            <Label htmlFor="suffix" className="text-foreground">
              Suffix (optional)
            </Label>
            <Input
              id="suffix"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g., -A, -North"
              className="bg-secondary/50"
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Preview:</p>
            <div className="flex flex-wrap gap-2">
              {previews.map((preview, index) => (
                <span
                  key={index}
                  className={`text-sm font-mono px-2 py-1 rounded ${
                    preview === "..." ? "text-muted-foreground" : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  {preview}
                </span>
              ))}
            </div>
          </div>

          {/* Current names reference */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Current names:</p>
            <p className="truncate">
              {selectedNames.slice(0, 5).join(", ")}
              {selectedNames.length > 5 ? "..." : ""}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename}>
            Rename {count} Building{count > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

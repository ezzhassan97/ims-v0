"use client"

import { useState } from "react"
import { Trash2, Play, Wand2, BookMarked, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { SplittingRule } from "@/lib/mock-data"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface SplittingRulesProps {
  rules: SplittingRule[]
  onDeleteRule: (id: string) => void
  onAddRule: () => void
}

export function SplittingRules({ rules, onDeleteRule }: SplittingRulesProps) {
  const [showSavedActionsDrawer, setShowSavedActionsDrawer] = useState(false)
  const [showTransformDrawer, setShowTransformDrawer] = useState(false)
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk">("single")
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)

  const handleSelectAction = (id: string) => {
    setSelectedActions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedActions.length === rules.length) {
      setSelectedActions([])
    } else {
      setSelectedActions(rules.map((r) => r.id))
    }
  }

  const handleDeleteSingle = (id: string) => {
    setSingleDeleteId(id)
    setDeleteTarget("single")
    setShowDeleteConfirm(true)
  }

  const handleBulkDelete = () => {
    if (selectedActions.length === 0) return
    setDeleteTarget("bulk")
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (deleteTarget === "single" && singleDeleteId) {
      onDeleteRule(singleDeleteId)
      setSingleDeleteId(null)
    } else if (deleteTarget === "bulk") {
      selectedActions.forEach((id) => onDeleteRule(id))
      setSelectedActions([])
    }
    setShowDeleteConfirm(false)
  }

  const handleApplyAll = () => {
    // Mock: Apply all saved actions
    console.log("Applying all saved actions:", rules.map((r) => r.id))
  }

  const handleApplySelected = () => {
    if (selectedActions.length === 0) return
    // Mock: Apply selected actions
    console.log("Applying selected actions:", selectedActions)
  }

  return (
    <>
      {/* Two CTA Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTransformDrawer(true)}
        >
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Transform
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSavedActionsDrawer(true)}
        >
          <BookMarked className="h-3.5 w-3.5 mr-1.5" />
          Saved Actions
          {rules.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
              {rules.length}
            </span>
          )}
        </Button>
      </div>

      {/* Transform Drawer - Empty for now */}
      <Sheet open={showTransformDrawer} onOpenChange={setShowTransformDrawer}>
        <SheetContent className="bg-card border-border w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="text-foreground">Transform</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Wand2 className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm text-center">Transform options will appear here</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Saved Actions Drawer */}
      <Sheet open={showSavedActionsDrawer} onOpenChange={setShowSavedActionsDrawer}>
        <SheetContent className="bg-card border-border w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Saved Actions</SheetTitle>
          </SheetHeader>

          {/* Actions Header */}
          {rules.length > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedActions.length === rules.length && rules.length > 0}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                  Select All ({selectedActions.length}/{rules.length})
                </label>
              </div>
              {selectedActions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Selected
                </Button>
              )}
            </div>
          )}

          {/* Actions List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BookMarked className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No saved actions</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    selectedActions.includes(rule.id)
                      ? "bg-primary/5 border-primary/30"
                      : "bg-secondary/30 border-border hover:border-border/80"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedActions.includes(rule.id)}
                      onCheckedChange={() => handleSelectAction(rule.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {rule.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteSingle(rule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {rules.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={handleApplySelected}
                  disabled={selectedActions.length === 0}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Apply Selected ({selectedActions.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleApplyAll}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Apply All
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "single"
                ? "Are you sure you want to delete this action? This cannot be undone."
                : `Are you sure you want to delete ${selectedActions.length} selected action(s)? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

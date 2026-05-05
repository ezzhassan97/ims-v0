"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, GripVertical, Pencil, Trash2, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FAQModal } from "@/components/faq-modal"
import type { FAQ } from "@/lib/mock-data"
import { format } from "date-fns"

interface FAQsTabProps {
  faqs: FAQ[]
  onAddFAQ: (faq: Omit<FAQ, "id" | "createdAt" | "updatedAt">) => void
  onUpdateFAQ: (faq: FAQ) => void
  onDeleteFAQ: (id: string) => void
  onReorderFAQs: (faqs: FAQ[]) => void
}

export function FAQsTab({ faqs, onAddFAQ, onUpdateFAQ, onDeleteFAQ, onReorderFAQs }: FAQsTabProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null)
  const [isAddingFAQ, setIsAddingFAQ] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [languageTab, setLanguageTab] = useState<"en" | "ar">("en")

  const filteredFAQs = faqs.filter((faq) => faq.language === languageTab)
  const sortedFAQs = [...filteredFAQs].sort((a, b) => a.rank - b.rank)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newFAQs = [...sortedFAQs]
    const [draggedFAQ] = newFAQs.splice(draggedIndex, 1)
    newFAQs.splice(index, 0, draggedFAQ)

    const rerankedFAQs = newFAQs.map((faq, idx) => ({
      ...faq,
      rank: idx + 1,
    }))

    onReorderFAQs(rerankedFAQs)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleToggleStatus = (faq: FAQ) => {
    onUpdateFAQ({
      ...faq,
      status: faq.status === "Active" ? "Hidden" : "Active",
      updatedAt: new Date(),
    })
  }

  const handleDelete = (id: string) => {
    onDeleteFAQ(id)
    setDeleteConfirmId(null)
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedFAQs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFAQs(newExpanded)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">Manage project FAQs per language</p>
        </div>
        <Button onClick={() => setIsAddingFAQ(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add FAQ
        </Button>
      </div>

      {/* Language Tab Switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setLanguageTab("en")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            languageTab === "en"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          English ({faqs.filter(f => f.language === "en").length})
        </button>
        <button
          type="button"
          onClick={() => setLanguageTab("ar")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            languageTab === "ar"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          Arabic ({faqs.filter(f => f.language === "ar").length})
        </button>
      </div>

      <div className="grid gap-3">
        {sortedFAQs.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No FAQs added yet</p>
            <Button onClick={() => setIsAddingFAQ(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Your First FAQ
            </Button>
          </Card>
        ) : (
          sortedFAQs.map((faq, index) => {
            const isExpanded = expandedFAQs.has(faq.id)
            return (
              <Card
                key={faq.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-3 transition-all ${
                  draggedIndex === index ? "opacity-50 scale-95" : "hover:shadow-md cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            #{faq.rank}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-foreground mb-2" dir={faq.language === "ar" ? "rtl" : "ltr"}>{faq.question}</h3>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={faq.status === "Active"}
                          onCheckedChange={() => handleToggleStatus(faq)}
                          id={`status-${faq.id}`}
                        />
                        <Button variant="ghost" size="sm" onClick={() => setEditingFAQ(faq)} className="h-7 w-7 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(faq.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground bg-secondary/30 rounded p-2.5 mb-2" dir={faq.language === "ar" ? "rtl" : "ltr"}>
                      <div
                        className={isExpanded ? "" : "line-clamp-2"}
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                      {faq.answer.length > 150 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(faq.id)}
                          className="h-5 px-2 mt-1 text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              See less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              See more
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(faq.createdAt, "MMM dd, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(faq.updatedAt, "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {deleteConfirmId && (
        <ConfirmDialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
          onConfirm={() => handleDelete(deleteConfirmId)}
          title="Delete FAQ"
          description="Are you sure you want to delete this FAQ? This action cannot be undone."
        />
      )}

      {isAddingFAQ && (
        <FAQModal
          open={isAddingFAQ}
          onOpenChange={setIsAddingFAQ}
          onSave={(faq) => {
            onAddFAQ(faq)
            setIsAddingFAQ(false)
          }}
        />
      )}

      {editingFAQ && (
        <FAQModal
          open={!!editingFAQ}
          onOpenChange={(open) => !open && setEditingFAQ(null)}
          faq={editingFAQ}
          onSave={(faq) => {
            onUpdateFAQ({ ...faq, id: editingFAQ.id, createdAt: editingFAQ.createdAt, updatedAt: new Date() })
            setEditingFAQ(null)
          }}
        />
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import type { FAQ } from "@/lib/mock-data"

interface FAQModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (faq: Omit<FAQ, "id" | "createdAt" | "updatedAt">) => void
  faq?: FAQ
}

export function FAQModal({ open, onOpenChange, onSave, faq }: FAQModalProps) {
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [rank, setRank] = useState(1)
  const [status, setStatus] = useState<"Active" | "Hidden">("Active")

  const isEditing = !!faq

  useEffect(() => {
    if (faq) {
      setLanguage(faq.language)
      setQuestion(faq.question)
      setAnswer(faq.answer)
      setRank(faq.rank)
      setStatus(faq.status)
    } else {
      setLanguage("en")
      setQuestion("")
      setAnswer("")
      setRank(1)
      setStatus("Active")
    }
  }, [faq, open])

  const isArabic = language === "ar"
  const dir = isArabic ? "rtl" : "ltr"

  const handleSave = () => {
    if (!question.trim() || !answer.trim()) {
      return
    }
    onSave({
      language,
      question,
      answer,
      rank,
      status,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: "45vw", maxWidth: "45vw" }} className="max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">{isEditing ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
        </DialogHeader>

        {/* Language Selector - only shown when adding new */}
        {!isEditing && (
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Label className="text-xs text-muted-foreground">Language:</Label>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setLanguage("en"); setQuestion(""); setAnswer("") }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  language === "en"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => { setLanguage("ar"); setQuestion(""); setAnswer("") }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  language === "ar"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                Arabic (العربية)
              </button>
            </div>
          </div>
        )}

        {/* Show current language badge when editing */}
        {isEditing && (
          <div className="pb-3 border-b border-border">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              isArabic ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
            }`}>
              {isArabic ? "Arabic (العربية)" : "English"}
            </span>
          </div>
        )}

        <div className="space-y-3 mt-1">
          <div className="space-y-1">
            <Label htmlFor="question" className="text-xs">
              Question <span className="text-destructive">*</span>
            </Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isArabic ? "أدخل السؤال بالعربية" : "Enter question in English"}
              dir={dir}
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="answer" className="text-xs">
              Answer <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              placeholder={isArabic ? "أدخل الإجابة بالعربية" : "Enter answer in English"}
              dir={dir}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label htmlFor="rank" className="text-xs">
              Display Order <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rank"
              type="number"
              min="1"
              value={rank}
              onChange={(e) => setRank(Number.parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">
              Status <span className="text-destructive">*</span>
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "Active" | "Hidden")}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="Active">Active</option>
              <option value="Hidden">Hidden</option>
            </select>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim()}
          >
            {isEditing ? "Update FAQ" : "Add FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  MapPin,
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FAQModal } from "@/components/faq-modal"
import type { FAQ } from "@/lib/mock-data"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Area {
  id: string
  name: string
  nameAr: string
  parentId: string | null
  parentName: string | null
  district: string | null
  type: "Area" | "Subarea"
}

const mockAreas: Area[] = [
  { id: "AREA-001", name: "New Cairo", nameAr: "القاهرة الجديدة", parentId: null, parentName: null, district: "Cairo Governorate", type: "Area" },
  { id: "AREA-002", name: "6th of October", nameAr: "السادس من أكتوبر", parentId: null, parentName: null, district: "Giza Governorate", type: "Area" },
  { id: "AREA-003", name: "North Coast", nameAr: "الساحل الشمالي", parentId: null, parentName: null, district: "Matrouh Governorate", type: "Area" },
  { id: "AREA-004", name: "New Capital", nameAr: "العاصمة الإدارية", parentId: null, parentName: null, district: "Cairo Governorate", type: "Area" },
  { id: "AREA-005", name: "Sheikh Zayed", nameAr: "الشيخ زايد", parentId: null, parentName: null, district: "Giza Governorate", type: "Area" },
  { id: "AREA-006", name: "Fifth Settlement", nameAr: "التجمع الخامس", parentId: "AREA-001", parentName: "New Cairo", district: null, type: "Subarea" },
  { id: "AREA-007", name: "First Settlement", nameAr: "التجمع الأول", parentId: "AREA-001", parentName: "New Cairo", district: null, type: "Subarea" },
  { id: "AREA-008", name: "Katameya", nameAr: "القطامية", parentId: "AREA-001", parentName: "New Cairo", district: null, type: "Subarea" },
  { id: "AREA-009", name: "Mostakbal City", nameAr: "مدينة المستقبل", parentId: "AREA-001", parentName: "New Cairo", district: null, type: "Subarea" },
  { id: "AREA-010", name: "Dreamland", nameAr: "دريم لاند", parentId: "AREA-002", parentName: "6th of October", district: null, type: "Subarea" },
  { id: "AREA-011", name: "Palm Hills", nameAr: "بالم هيلز", parentId: "AREA-002", parentName: "6th of October", district: null, type: "Subarea" },
  { id: "AREA-012", name: "Sidi Abdel Rahman", nameAr: "سيدي عبدالرحمن", parentId: "AREA-003", parentName: "North Coast", district: null, type: "Subarea" },
  { id: "AREA-013", name: "Ras El Hekma", nameAr: "رأس الحكمة", parentId: "AREA-003", parentName: "North Coast", district: null, type: "Subarea" },
]

const generateMockFAQs = (areaId: string): FAQ[] => {
  const baseFAQs: Omit<FAQ, "id">[] = [
    {
      language: "en",
      question: "What are the main attractions in this area?",
      answer: "This area features numerous shopping malls, international schools, medical centers, and recreational facilities including sports clubs and parks.",
      rank: 1,
      status: "Active",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      language: "en",
      question: "What is the average property price in this area?",
      answer: "Property prices vary significantly based on the specific location, property type, and finishing level. Contact us for detailed pricing information.",
      rank: 2,
      status: "Active",
      createdAt: new Date("2024-01-12"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      language: "en",
      question: "Is this area suitable for families?",
      answer: "Yes, this area is highly suitable for families with excellent schools, healthcare facilities, and family-friendly amenities.",
      rank: 3,
      status: "Hidden",
      createdAt: new Date("2024-01-08"),
      updatedAt: new Date("2024-01-13"),
    },
    {
      language: "ar",
      question: "ما هي المعالم الرئيسية في هذه المنطقة؟",
      answer: "تتميز هذه المنطقة بالعديد من مراكز التسوق والمدارس الدولية والمراكز الطبية والمرافق الترفيهية بما في ذلك النوادي الرياضية والحدائق.",
      rank: 1,
      status: "Active",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      language: "ar",
      question: "ما هو متوسط سعر العقارات في هذه المنطقة؟",
      answer: "تختلف أسعار العقارات بشكل كبير بناءً على الموقع المحدد ونوع العقار ومستوى التشطيب. تواصل معنا للحصول على معلومات تفصيلية عن الأسعار.",
      rank: 2,
      status: "Active",
      createdAt: new Date("2024-01-12"),
      updatedAt: new Date("2024-01-14"),
    },
    {
      language: "ar",
      question: "هل هذه المنطقة مناسبة للعائلات؟",
      answer: "نعم، هذه المنطقة مناسبة جداً للعائلات مع وجود مدارس ممتازة ومرافق صحية ووسائل راحة مناسبة للعائلات.",
      rank: 3,
      status: "Hidden",
      createdAt: new Date("2024-01-08"),
      updatedAt: new Date("2024-01-13"),
    },
  ]

  return baseFAQs.map((faq, index) => ({
    ...faq,
    id: `${areaId}-FAQ-${index + 1}`,
  }))
}

export function AreasFAQsPage() {
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [areaFAQs, setAreaFAQs] = useState<Record<string, FAQ[]>>({})

  // FAQ management state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null)
  const [isAddingFAQ, setIsAddingFAQ] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [areaLangTab, setAreaLangTab] = useState<"en" | "ar">("en")

  const filteredAreas = mockAreas.filter(
    (area) =>
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.nameAr.includes(searchTerm) ||
      area.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSelectArea = (area: Area) => {
    setSelectedArea(area)
    // Initialize FAQs for the area if not already loaded
    if (!areaFAQs[area.id]) {
      setAreaFAQs((prev) => ({
        ...prev,
        [area.id]: generateMockFAQs(area.id),
      }))
    }
  }

  const currentFAQs = selectedArea ? areaFAQs[selectedArea.id] || [] : []
  const filteredFAQs = currentFAQs.filter((faq) => faq.language === areaLangTab)
  const sortedFAQs = [...filteredFAQs].sort((a, b) => a.rank - b.rank)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index || !selectedArea) return

    const newFAQs = [...sortedFAQs]
    const [draggedFAQ] = newFAQs.splice(draggedIndex, 1)
    newFAQs.splice(index, 0, draggedFAQ)

    const rerankedFAQs = newFAQs.map((faq, idx) => ({
      ...faq,
      rank: idx + 1,
    }))

    setAreaFAQs((prev) => ({
      ...prev,
      [selectedArea.id]: rerankedFAQs,
    }))
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleToggleStatus = (faq: FAQ) => {
    if (!selectedArea) return
    const updatedFAQ = {
      ...faq,
      status: faq.status === "Active" ? "Hidden" : "Active",
      updatedAt: new Date(),
    } as FAQ
    setAreaFAQs((prev) => ({
      ...prev,
      [selectedArea.id]: prev[selectedArea.id].map((f) => (f.id === faq.id ? updatedFAQ : f)),
    }))
  }

  const handleDelete = (id: string) => {
    if (!selectedArea) return
    setAreaFAQs((prev) => ({
      ...prev,
      [selectedArea.id]: prev[selectedArea.id].filter((f) => f.id !== id),
    }))
    setDeleteConfirmId(null)
  }

  const handleAddFAQ = (faq: Omit<FAQ, "id" | "createdAt" | "updatedAt">) => {
    if (!selectedArea) return
    const newFAQ: FAQ = {
      ...faq,
      id: `${selectedArea.id}-FAQ-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setAreaFAQs((prev) => ({
      ...prev,
      [selectedArea.id]: [...(prev[selectedArea.id] || []), newFAQ],
    }))
    setIsAddingFAQ(false)
  }

  const handleUpdateFAQ = (faq: FAQ) => {
    if (!selectedArea) return
    setAreaFAQs((prev) => ({
      ...prev,
      [selectedArea.id]: prev[selectedArea.id].map((f) => (f.id === faq.id ? faq : f)),
    }))
    setEditingFAQ(null)
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
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Areas FAQs</h1>
        <p className="text-sm text-muted-foreground">Manage FAQs for different areas with bilingual support</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        {/* Left Column - Areas List */}
        <Card className="flex-shrink-0 flex flex-col overflow-hidden w-[300px]">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                onClick={() => handleSelectArea(area)}
                className={cn(
                  "px-2 py-1.5 cursor-pointer transition-all rounded-md hover:bg-secondary/50 opacity-100 border-[0.2px] border-gray-300",
                  selectedArea?.id === area.id && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground font-mono">{area.id}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(area.id)
                      }}
                      className="p-0.5 hover:bg-secondary rounded"
                    >
                      {copiedId === area.id ? (
                        <Check className="h-2.5 w-2.5 text-green-500" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1 py-0 h-4",
                      area.type === "Area"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}
                  >
                    {area.type}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <h3 className="text-xs font-medium text-foreground leading-tight">{area.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-medium" dir="rtl">
                    {area.nameAr}
                  </p>
                </div>

                {(area.parentName || area.district) && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                    <MapPin className="h-2 w-2" />
                    <span className="font-medium">{area.parentName ? `Parent: ${area.parentName}` : `District: ${area.district}`}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column - FAQs */}
        <div className="flex-1 overflow-hidden">
          {selectedArea ? (
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedArea.name} FAQs</h2>
                    <p className="text-sm text-muted-foreground">
                      {sortedFAQs.length} FAQ{sortedFAQs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button onClick={() => setIsAddingFAQ(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add FAQ
                  </Button>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
                  <button
                    type="button"
                    onClick={() => setAreaLangTab("en")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      areaLangTab === "en"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    English ({currentFAQs.filter(f => f.language === "en").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaLangTab("ar")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      areaLangTab === "ar"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    Arabic ({currentFAQs.filter(f => f.language === "ar").length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedFAQs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted-foreground mb-4">No FAQs added for this area yet</p>
                    <Button onClick={() => setIsAddingFAQ(true)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Your First FAQ
                    </Button>
                  </div>
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
                        className={cn(
                          "p-3 transition-all",
                          draggedIndex === index
                            ? "opacity-50 scale-95"
                            : "hover:shadow-md cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    #{faq.rank}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      faq.status === "Active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                    )}
                                  >
                                    {faq.status}
                                  </Badge>
                                </div>
                                <h3 className="font-medium text-foreground mb-1" dir={faq.language === "ar" ? "rtl" : "ltr"}>{faq.question}</h3>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Switch
                                  checked={faq.status === "Active"}
                                  onCheckedChange={() => handleToggleStatus(faq)}
                                  id={`status-${faq.id}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingFAQ(faq)}
                                  className="h-7 w-7 p-0"
                                >
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
                              {faq.answer.length > 100 && (
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
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-center p-8">
              <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select an Area</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose an area from the list on the left to view and manage its FAQs
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
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
          onSave={handleAddFAQ}
        />
      )}

      {editingFAQ && (
        <FAQModal
          open={!!editingFAQ}
          onOpenChange={(open) => !open && setEditingFAQ(null)}
          faq={editingFAQ}
          onSave={(faq) => {
            handleUpdateFAQ({
              ...faq,
              id: editingFAQ.id,
              createdAt: editingFAQ.createdAt,
              updatedAt: new Date(),
            })
          }}
        />
      )}
    </div>
  )
}

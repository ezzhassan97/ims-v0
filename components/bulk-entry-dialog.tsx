"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ClipboardPaste, FileUp, Loader2, MessageCircle, Sparkles, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { DeveloperSelect, ProjectTreeSelect } from "@/components/table-kit"
import { UploadFromWhatsAppDialog } from "@/components/whatsapp-configurations-page"
import { CategoryMultiSelect, FILE_ICON, Segmented, TAG, TONE_TAG, fmtSize } from "@/components/bulk-entry-steps"
import { KIND_OF, detectFile, type FileDetection } from "@/lib/bulk-ingestion"
import { PROJECTS, PROJECT_DEVELOPERS, buildProjectTreeNodes } from "@/lib/projects-mock"
import {
  ENTRIES, ENTRY_USERS, SALE_TYPES,
  type EntryDataType, type EntryFileKind, type IngestionEntry, type IngestionSource, type PropertyCategory, type SaleType,
} from "@/lib/ingestion-mock"

interface Pending {
  key: string
  content?: string
  name: string
  kind: EntryFileKind
  size: number
  origin: IngestionSource
  progress: number
  det: FileDetection | null
  hint?: { developerName?: string; projects?: string[] }
}

const kindOfName = (name: string): EntryFileKind => {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["xlsx", "xls", "csv"].includes(ext)) return "Sheet"
  if (ext === "pdf") return "PDF"
  if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) return "Image"
  return "Text"
}

/** Project names a pasted message mentions → the developer and projects it's about. */
function hintFromText(text: string) {
  const lower = text.toLowerCase()
  const hits = PROJECTS.filter((p) => !p.isPhase && lower.includes(p.name.toLowerCase()))
  return hits.length ? { developerName: hits[0].developer.name, projects: hits.map((p) => p.name) } : undefined
}

export function BulkEntryDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (e: IngestionEntry) => void }) {
  const [files, setFiles] = useState<Pending[]>([])
  const [waOpen, setWaOpen] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState("")
  const [devId, setDevId] = useState("")
  const [devTouched, setDevTouched] = useState(false)
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [projTouched, setProjTouched] = useState(false)
  const [saleType, setSaleType] = useState<SaleType | "">("")
  const [dataType, setDataType] = useState<EntryDataType>("Manual")
  const [dataTouched, setDataTouched] = useState(false)
  const [categories, setCategories] = useState<PropertyCategory[]>(["Residential"])
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const reset = () => {
    setFiles([]); setPasting(false); setText(""); setDevId(""); setDevTouched(false); setProjectIds([]); setProjTouched(false)
    setSaleType(""); setDataType("Manual"); setDataTouched(false); setCategories(["Residential"])
  }
  const close = () => { reset(); onClose() }

  // Simulated upload: every file streams in, then the detector reads it
  useEffect(() => {
    if (!files.some((f) => f.progress < 100)) return
    const t = setInterval(() => {
      setFiles((fs) => fs.map((f) => {
        if (f.progress >= 100) return f
        const progress = Math.min(100, f.progress + 18 + (f.size % 11))
        return { ...f, progress, det: progress >= 100 ? detectFile(f.name, f.kind, f.hint) : null }
      }))
    }, 160)
    return () => clearInterval(t)
  }, [files])

  const add = (items: Omit<Pending, "key" | "progress" | "det">[]) =>
    setFiles((fs) => [...fs, ...items.map((it) => ({ ...it, key: `f${++seq.current}`, progress: 0, det: null }))])

  const detected = files.filter((f) => f.det)
  const devName = PROJECT_DEVELOPERS.find((d) => d.id === devId)?.name
  // Majority vote across files decides the developer, unless the user picked one
  const detectedDev = useMemo(() => {
    const votes = new Map<string, number>()
    detected.forEach((f) => { if (f.det?.developerName) votes.set(f.det.developerName, (votes.get(f.det.developerName) ?? 0) + 1) })
    const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? PROJECT_DEVELOPERS.find((d) => d.name === top[0]) : undefined
  }, [detected])
  useEffect(() => { if (!devTouched && detectedDev && detectedDev.id !== devId) { setDevId(detectedDev.id); if (!projTouched) setProjectIds([]) } }, [detectedDev, devTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const { ids: detectedProjects, matched: projectsMatched } = useMemo(() => {
    if (!devId) return { ids: [] as string[], matched: false }
    const names = new Set(detected.flatMap((f) => f.det?.projectNames ?? []))
    const own = PROJECTS.filter((p) => !p.isPhase && p.developer.id === devId)
    const hits = own.filter((p) => names.has(p.name))
    return { ids: (hits.length ? hits : own.slice(0, 1)).map((p) => p.id), matched: hits.length > 0 }
  }, [detected, devId])
  useEffect(() => { if (!projTouched && detectedProjects.join() !== projectIds.join()) setProjectIds(detectedProjects) }, [detectedProjects, projTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const withCodes = detected.filter((f) => f.det?.hasUnitCodes).length
  useEffect(() => { if (!dataTouched && detected.length) setDataType(withCodes > detected.length / 2 ? "Automatic" : "Manual") }, [withCodes, detected.length, dataTouched])
  useEffect(() => {
    if (!detected.length) return
    const cats = [...new Set(detected.flatMap((f) => f.det?.categories ?? []))] as PropertyCategory[]
    setCategories((cur) => [...new Set([...cur, ...cats])])
  }, [detected.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const conflicts = detected.filter((f) => devName && f.det?.developerName && f.det.developerName !== devName)
  const uploading = files.some((f) => f.progress < 100)
  const blockers = [
    !files.length && "Add at least one file",
    uploading && "Wait for uploads to finish",
    !devId && "Pick the developer",
    !projectIds.length && "Pick at least one project",
    !saleType && "Pick the sale type",
    !categories.length && "Pick a property category",
    conflicts.length > 0 && `${conflicts.length} file${conflicts.length > 1 ? "s belong" : " belongs"} to another developer`,
  ].filter(Boolean) as string[]
  const projTree = useMemo(() => buildProjectTreeNodes((p) => !devId || p.developer.id === devId), [devId])

  const create = () => {
    if (blockers.length) return
    const dev = PROJECT_DEVELOPERS.find((d) => d.id === devId)!
    const kinds = files.map((f) => f.kind)
    const now = new Date().toISOString()
    const id = `ENT-${1001 + ENTRIES.length}`
    const entry: IngestionEntry = {
      id,
      fileName: files[0].name,
      files: files.map((f) => ({ name: f.name, kind: f.kind, size: f.size, origin: f.origin, content: f.content })),
      developer: { id: dev.id, name: dev.name, logo: dev.logo },
      projects: projectIds.map((pid) => { const p = PROJECTS.find((x) => x.id === pid); return { id: pid, name: p?.name ?? pid, main: p?.mainProject?.name ?? null } }),
      stage: "Initial Setup",
      saleType: saleType as SaleType,
      dataType,
      uploadedBy: ENTRY_USERS[0],
      fileType: kinds.every((k) => k === kinds[0]) ? kinds[0] : "Mixed",
      source: files[0].origin,
      categories,
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
      groupedProperties: 0,
      detailedProperties: 0,
      totalTimeSec: 0,
      activeTimeSec: 0,
    }
    // ponytail: the module-level ENTRIES array is the store the list re-reads on mount
    ENTRIES.unshift(entry)
    toast.success(`${id} created — continue with Initial Setup`)
    reset()
    onCreated(entry)
  }

  const field = (label: string, bad: boolean, children: React.ReactNode, hint?: React.ReactNode) => (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground">{label}<span className="text-red-500">*</span></p>
      {children}
      {hint && <p className={cn("mt-1 flex items-center gap-1 text-[11px]", bad ? "text-red-600" : "text-muted-foreground")}>{hint}</p>}
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="flex max-h-[90vh] !w-[94vw] !max-w-[1080px] flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-lg font-bold text-foreground">New ingestion entry</DialogTitle>
            <p className="text-sm text-muted-foreground">Drop sheets, PDFs, photos of price lists or paste a WhatsApp message — every file is read as it uploads.</p>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Sources */}
            <div className="space-y-3 p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDrag(false)
                  add([...e.dataTransfer.files].map((f) => ({ name: f.name, kind: kindOfName(f.name), size: f.size || 1000, origin: "Device" as const })))
                }}
                className={cn("flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors", drag ? "border-primary bg-primary/5" : "border-border")}
              >
                <Upload className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag &amp; drop files here</p>
                <p className="text-xs text-muted-foreground">XLSX · CSV · PDF · JPG · PNG · TXT — several at once, one developer per entry</p>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => inputRef.current?.click()}><FileUp className="h-3.5 w-3.5" />Browse files</Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setWaOpen(true)}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" />Choose from WhatsApp</Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setPasting((v) => !v)}><ClipboardPaste className="h-3.5 w-3.5" />Paste text</Button>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    add([...(e.target.files ?? [])].map((f) => ({ name: f.name, kind: kindOfName(f.name), size: f.size || 1000, origin: "Device" as const })))
                    e.target.value = ""
                  }}
                />
              </div>

              {pasting && (
                <div className="rounded-xl border border-border p-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder={"Paste a broker message, e.g.\n🔥 West Gate — Phase 2 new release\n• Apartments 2BR 120-135 sqm from 6.2M"}
                    className="w-full resize-none rounded-md border border-input bg-white p-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPasting(false); setText("") }}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" disabled={!text.trim()} onClick={() => {
                      add([{ name: `pasted-message-${files.filter((f) => f.kind === "Text").length + 1}.txt`, kind: "Text", size: new Blob([text]).size, origin: "WhatsApp", hint: hintFromText(text), content: text }])
                      setText(""); setPasting(false)
                    }}>Add message</Button>
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f) => {
                    const conflict = conflicts.includes(f)
                    return (
                      <div key={f.key} className={cn("rounded-lg border p-2.5", conflict ? "border-red-300 bg-red-50/40" : "border-border")}>
                        <div className="flex items-center gap-2.5">
                          {FILE_ICON[KIND_OF[f.kind]]}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">{f.kind} · {fmtSize(f.size)} · {f.origin}</p>
                          </div>
                          {f.progress < 100 ? (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{f.progress}%</span>
                          ) : (
                            <span className={cn(TAG, f.det?.hasUnitCodes ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700")}>{f.det?.hasUnitCodes ? "Unit codes" : "No unit codes"}</span>
                          )}
                          <button type="button" title="Remove file" onClick={() => setFiles((fs) => fs.filter((x) => x.key !== f.key))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
                        </div>
                        {f.progress < 100 ? (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.progress}%` }} /></div>
                        ) : f.det && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6">
                            <span className={cn(TAG, TONE_TAG.muted)}>{f.det.summary}</span>
                            {f.det.developerName
                              ? <span className={cn(TAG, conflict ? TONE_TAG.error : "border-border bg-card text-foreground")}><Sparkles className="h-3 w-3 text-violet-500" />{f.det.developerName} · {f.det.developerConf}%</span>
                              : <span className={cn(TAG, TONE_TAG.warn)}>Developer not detected</span>}
                            {f.det.projectNames.slice(0, 2).map((p) => <span key={p} className={cn(TAG, "border-border bg-card text-foreground")}>{p}</span>)}
                            {f.det.categories.map((c) => <span key={c} className={cn(TAG, "border-border bg-card text-muted-foreground")}>{c}</span>)}
                          </div>
                        )}
                        {conflict && (
                          <p className="mt-1.5 flex items-center gap-1 pl-6 text-[11px] text-red-700">
                            <AlertTriangle className="h-3 w-3" />This file is {f.det?.developerName}&apos;s — an entry has one developer.
                            <button className="font-medium underline" onClick={() => setFiles((fs) => fs.filter((x) => x.key !== f.key))}>Remove it</button>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Entry settings */}
            <div className="space-y-4 border-t border-border bg-muted/30 p-6 lg:border-l lg:border-t-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Sparkles className="h-3.5 w-3.5 text-violet-500" />Entry settings<span className="font-normal text-muted-foreground">· filled from the files</span></p>
              {field("Developer", !devId && files.length > 0, (
                <DeveloperSelect developers={PROJECT_DEVELOPERS} value={devId} onChange={(id) => { setDevId(id); setDevTouched(true); setProjectIds([]); setProjTouched(false) }} className="w-full" />
              ), detectedDev && !devTouched ? <><Sparkles className="h-3 w-3 text-violet-500" />Detected in {detected.filter((f) => f.det?.developerName === detectedDev.name).length} of {detected.length} files</> : undefined)}
              {field("Projects", !projectIds.length && !!devId, (
                <ProjectTreeSelect multi projects={projTree} values={projectIds} onValuesChange={(ids) => { setProjectIds(ids); setProjTouched(true) }} className="w-full" />
              ), !projTouched && projectIds.length ? (projectsMatched
                ? <><Sparkles className="h-3 w-3 text-violet-500" />Matched from file names and content</>
                : <span className="text-amber-700">Suggested — the files mention projects we couldn&apos;t match, please confirm</span>) : undefined)}
              {field("Sale type", false, (
                <Segmented value={saleType} options={SALE_TYPES} onChange={(v) => setSaleType(v)} />
              ), "You decide — it isn't in the files")}
              {field("Data type", false, (
                <Segmented value={dataType} options={["Automatic", "Manual"] as const} onChange={(v) => { setDataType(v); setDataTouched(true) }} />
              ), detected.length ? <><Sparkles className="h-3 w-3 text-violet-500" />{withCodes ? `Unit codes in ${withCodes} of ${detected.length} files` : "No unit codes — grouped properties"}</> : "Automatic = rows carry unit codes")}
              {field("Property categories", !categories.length, <CategoryMultiSelect value={categories} onChange={setCategories} />)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
            <p className={cn("text-sm", blockers.length && files.length ? "text-red-600" : "text-muted-foreground")}>
              {files.length ? `${files.length} file${files.length > 1 ? "s" : ""} · ${fmtSize(files.reduce((n, f) => n + f.size, 0))}${blockers.length ? ` · ${blockers[0]}` : " · ready"}` : "No files yet"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button disabled={blockers.length > 0} onClick={create}>Create entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UploadFromWhatsAppDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        multiple
        lockedDeveloper={devName && PROJECT_DEVELOPERS.some((d) => d.name === devName) ? devName : null}
        onProceed={(items) => add(items.map((it) => ({
          name: /\.[a-z0-9]+$/i.test(it.fileName) ? it.fileName : `${it.fileName}.${it.fileExt.toLowerCase()}`,
          kind: it.fileTypeGroup === "Sheet" ? "Sheet" : it.fileTypeGroup === "Image" ? "Image" : "PDF",
          size: it.fileSize,
          origin: "WhatsApp" as const,
          hint: { developerName: it.developerName, projects: it.projects },
        })))}
      />
    </>
  )
}

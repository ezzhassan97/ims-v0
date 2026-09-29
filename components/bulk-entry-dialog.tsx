"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ClipboardPaste, FileUp, Library, Loader2, MessageCircle, Scissors, Sparkles, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { DeveloperSelect, ProjectTreeSelect } from "@/components/table-kit"
import { UploadFromWhatsAppDialog } from "@/components/whatsapp-configurations-page"
import { CategoryMultiSelect, FILE_ICON, Field, Segmented, TAG, TONE_TAG, fmtSize } from "@/components/bulk-entry-kit"
import { KIND_OF, detectFile, plural, type FileDetection } from "@/lib/bulk-ingestion"
import { PROJECTS, PROJECT_DEVELOPERS, buildProjectTreeNodes } from "@/lib/projects-mock"
import {
  ENTRIES, ENTRY_USERS, SALE_TYPES,
  type EntryDataType, type EntryFileKind, type IngestionEntry, type IngestionSource, type PropertyCategory, type SaleType,
} from "@/lib/ingestion-mock"

const MAX_FILES = 5

interface Pending {
  key: string
  content?: string
  name: string
  kind: EntryFileKind
  size: number
  origin: IngestionSource
  progress: number
  det: FileDetection | null
  hint?: { developerName?: string; projects?: string[]; fromGroup?: boolean }
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

/** A finalized entry already carried a file with this name — the fingerprint says it's the same file. */
const alreadyIngested = (name: string) => ENTRIES.find((e) => e.stage === "Finalized" && e.files.some((f) => f.name === name))

export function BulkEntryDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (e: IngestionEntry) => void }) {
  const [files, setFiles] = useState<Pending[]>([])
  const [waOpen, setWaOpen] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState("")
  const [devId, setDevId] = useState("")
  const [devTouched, setDevTouched] = useState(false)
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [projTouched, setProjTouched] = useState(false)
  const [saleType, setSaleType] = useState<SaleType>("Primary")
  const [dataType, setDataType] = useState<EntryDataType>("Automatic")
  const [dataTouched, setDataTouched] = useState(false)
  const [categories, setCategories] = useState<PropertyCategory[]>(["Residential"])
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const reset = () => {
    setFiles([]); setPasting(false); setText(""); setDevId(""); setDevTouched(false); setProjectIds([]); setProjTouched(false)
    setSaleType("Primary"); setDataType("Automatic"); setDataTouched(false); setCategories(["Residential"])
  }
  const close = () => { reset(); onClose() }

  // Simulated upload: every file streams in, then the guard reads it — rules first, light AI for docs the rules can't place
  useEffect(() => {
    if (!files.some((f) => f.progress < 100)) return
    const t = setInterval(() => {
      setFiles((fs) => fs.map((f) => {
        if (f.progress >= 100) return f
        const progress = Math.min(100, f.progress + 18 + (f.size % 11))
        return { ...f, progress, det: progress >= 100 ? detectFile(f.name, f.kind, f.size, { ...f.hint, text: f.content }) : null }
      }))
    }, 160)
    return () => clearInterval(t)
  }, [files])

  const add = (items: Omit<Pending, "key" | "progress" | "det">[]) => {
    const room = MAX_FILES - files.length
    if (items.length > room) toast.warning(`An entry holds up to ${MAX_FILES} files — ${plural(items.length - room, "file")} left out`)
    setFiles((fs) => [...fs, ...items.slice(0, Math.max(0, room)).map((it) => ({ ...it, key: `f${++seq.current}`, progress: 0, det: null }))])
  }

  const detected = files.filter((f) => f.det)
  const listings = detected.filter((f) => f.det?.availability)
  const devName = PROJECT_DEVELOPERS.find((d) => d.id === devId)?.name
  // Majority vote across the price lists decides the developer, unless the user picked one
  const detectedDev = useMemo(() => {
    const votes = new Map<string, number>()
    listings.forEach((f) => { if (f.det?.developerName) votes.set(f.det.developerName, (votes.get(f.det.developerName) ?? 0) + 1) })
    const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? PROJECT_DEVELOPERS.find((d) => d.name === top[0]) : undefined
  }, [listings])
  useEffect(() => { if (!devTouched && detectedDev && detectedDev.id !== devId) { setDevId(detectedDev.id); if (!projTouched) setProjectIds([]) } }, [detectedDev, devTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const { ids: detectedProjects, matched: projectsMatched } = useMemo(() => {
    if (!devId) return { ids: [] as string[], matched: false }
    const names = new Set(listings.flatMap((f) => f.det?.projectNames ?? []))
    const own = PROJECTS.filter((p) => !p.isPhase && p.developer.id === devId)
    const hits = own.filter((p) => names.has(p.name))
    return { ids: (hits.length ? hits : own.slice(0, 1)).map((p) => p.id), matched: hits.length > 0 }
  }, [listings, devId])
  useEffect(() => { if (!projTouched && detectedProjects.join() !== projectIds.join()) setProjectIds(detectedProjects) }, [detectedProjects, projTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  const withCodes = listings.filter((f) => f.det?.hasUnitCodes).length
  useEffect(() => { if (!dataTouched && listings.length) setDataType(withCodes > listings.length / 2 ? "Automatic" : "Manual") }, [withCodes, listings.length, dataTouched])
  useEffect(() => {
    if (!listings.length) return
    const cats = [...new Set(listings.flatMap((f) => f.det?.categories ?? []))] as PropertyCategory[]
    setCategories((cur) => [...new Set([...cur, ...cats])])
  }, [listings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // The guard — one developer and one entry type per entry; mixed files split into entries before one exists
  const groups = useMemo(() => {
    const m = new Map<string, Pending[]>()
    listings.forEach((f) => {
      const k = `${f.det?.developerName ?? "Unknown developer"}|${f.det?.hasUnitCodes ? "Automatic" : "Manual"}`
      m.set(k, [...(m.get(k) ?? []), f])
    })
    return [...m.entries()].map(([k, fs]) => ({ key: k, developer: k.split("|")[0], dataType: k.split("|")[1] as EntryDataType, files: fs }))
  }, [listings])
  const mixed = groups.length > 1
  const notListings = detected.filter((f) => !f.det?.availability)
  const uploading = files.some((f) => f.progress < 100)
  const blockers = [
    !files.length && "Add at least one file",
    uploading && "Wait for uploads to finish",
    !listings.length && files.length > 0 && !uploading && "No price list among the files",
    mixed && "These files belong to more than one entry",
    notListings.length > 0 && "File or remove the non-price-list files",
    !devId && "Pick the developer",
    !projectIds.length && "Pick at least one project",
    !categories.length && "Pick a property category",
  ].filter(Boolean) as string[]
  const projTree = useMemo(() => buildProjectTreeNodes((p) => !devId || p.developer.id === devId), [devId])

  const makeEntry = (fs: Pending[], dev: (typeof PROJECT_DEVELOPERS)[number] | undefined, dt: EntryDataType, projIds: string[]): IngestionEntry => {
    const kinds = fs.map((f) => f.kind)
    const now = new Date().toISOString()
    return {
      id: `ENT-${1001 + ENTRIES.length}`,
      fileName: fs[0].name,
      files: fs.map((f) => ({ name: f.name, kind: f.kind, size: f.size, origin: f.origin, content: f.content })),
      developer: dev ? { id: dev.id, name: dev.name, logo: dev.logo } : null,
      projects: projIds.map((pid) => { const p = PROJECTS.find((x) => x.id === pid); return { id: pid, name: p?.name ?? pid, main: p?.mainProject?.name ?? null } }),
      stage: "Initial Setup",
      saleType,
      dataType: dt,
      uploadedBy: ENTRY_USERS[0],
      fileType: kinds.every((k) => k === kinds[0]) ? kinds[0] : "Mixed",
      source: fs[0].origin,
      categories,
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
      groupedProperties: 0,
      detailedProperties: 0,
      totalTimeSec: 0,
      activeTimeSec: 0,
      coverage: "",
    }
  }

  const create = () => {
    if (blockers.length) return
    const dev = PROJECT_DEVELOPERS.find((d) => d.id === devId)
    const entry = makeEntry(listings, dev, dataType, projectIds)
    // ponytail: the module-level ENTRIES array is the store the list re-reads on mount
    ENTRIES.unshift(entry)
    toast.success(`${entry.id} created — continue with Initial Setup`)
    reset()
    onCreated(entry)
  }
  const split = () => {
    const created = groups.map((g) => {
      const dev = PROJECT_DEVELOPERS.find((d) => d.name === g.developer)
      const names = new Set(g.files.flatMap((f) => f.det?.projectNames ?? []))
      const projIds = PROJECTS.filter((p) => !p.isPhase && p.developer.id === dev?.id && names.has(p.name)).map((p) => p.id)
      const e = makeEntry(g.files, dev, g.dataType, projIds.length ? projIds : PROJECTS.filter((p) => !p.isPhase && p.developer.id === dev?.id).slice(0, 1).map((p) => p.id))
      ENTRIES.unshift(e)
      return e
    })
    toast.success(`Split into ${plural(created.length, "entry", "entries")} — ${created.map((e) => e.id).join(", ")}`)
    reset()
    onCreated(created[created.length - 1])
  }
  const fileAway = (f: Pending) => {
    setFiles((fs) => fs.filter((x) => x.key !== f.key))
    const proj = f.det?.projectNames[0] ?? PROJECTS.find((p) => p.id === projectIds[0])?.name ?? "the project"
    toast.success(`${f.name} attached to ${proj}'s library as ${f.det?.docKind?.toLowerCase() ?? "a document"}`)
  }

  const fromWhatsApp = files.length > 0 && files.every((f) => f.origin === "WhatsApp")

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="flex max-h-[90vh] !w-[94vw] !max-w-[1080px] flex-col gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-lg font-bold text-foreground">New ingestion entry</DialogTitle>
            <p className="text-sm text-muted-foreground">Up to {MAX_FILES} files — sheets, PDFs, photos of price lists or a pasted message. One developer, one sale type and one entry type per entry.</p>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3 p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); add([...e.dataTransfer.files].map((f) => ({ name: f.name, kind: kindOfName(f.name), size: f.size || 1000, origin: "Device" as const }))) }}
                className={cn("flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors", drag ? "border-primary bg-primary/5" : "border-border", files.length >= MAX_FILES && "opacity-50")}
              >
                <Upload className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag &amp; drop files here</p>
                <p className="text-xs text-muted-foreground">XLSX · CSV · PDF · JPG · PNG · TXT — {files.length}/{MAX_FILES} files</p>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={files.length >= MAX_FILES} onClick={() => inputRef.current?.click()}><FileUp className="h-3.5 w-3.5" />Browse files</Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={files.length >= MAX_FILES} onClick={() => setWaOpen(true)}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" />Choose from WhatsApp</Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={files.length >= MAX_FILES} onClick={() => setPasting((v) => !v)}><ClipboardPaste className="h-3.5 w-3.5" />Paste text</Button>
                </div>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { add([...(e.target.files ?? [])].map((f) => ({ name: f.name, kind: kindOfName(f.name), size: f.size || 1000, origin: "Device" as const }))); e.target.value = "" }} />
              </div>

              {pasting && (
                <div className="rounded-xl border border-border p-3">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={"Paste a broker message, e.g.\n🔥 West Gate — Phase 2 new release\n• Apartments 2BR 120-135 sqm from 6.2M"} className="w-full resize-none rounded-md border border-input bg-white p-2 text-sm outline-none focus:border-primary" />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPasting(false); setText("") }}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" disabled={!text.trim()} onClick={() => { add([{ name: `pasted-message-${files.filter((f) => f.kind === "Text").length + 1}.txt`, kind: "Text", size: new Blob([text]).size, origin: "WhatsApp", hint: hintFromText(text), content: text }]); setText(""); setPasting(false) }}>Add message</Button>
                  </div>
                </div>
              )}

              {mixed && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900"><Scissors className="h-4 w-4" />These look like {plural(groups.length, "entry", "entries")}</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-amber-950">
                    {groups.map((g) => <li key={g.key}>· {g.developer} · {g.dataType === "Automatic" ? "with codes" : "no codes"} — {g.files.map((f) => f.name).join(", ")}</li>)}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={split}><Scissors className="h-3.5 w-3.5" />Split into {groups.length} entries</Button>
                    <span className="self-center text-[11px] text-amber-900">or remove the files that don&apos;t belong</span>
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f) => {
                    const dupe = f.det ? alreadyIngested(f.name) : undefined
                    const other = mixed && f.det?.availability && groups[0] && !groups[0].files.includes(f)
                    return (
                      <div key={f.key} className={cn("rounded-lg border p-2.5", other ? "border-amber-300 bg-amber-50/30" : f.det && !f.det.availability ? "border-sky-200 bg-sky-50/30" : "border-border")}>
                        <div className="flex items-center gap-2.5">
                          {FILE_ICON[KIND_OF[f.kind]]}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">{f.kind} · {fmtSize(f.size)} · {f.origin}</p>
                          </div>
                          {f.progress < 100 && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{f.progress}%</span>}
                          <button type="button" title="Remove file" onClick={() => setFiles((fs) => fs.filter((x) => x.key !== f.key))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
                        </div>
                        {f.progress < 100 ? (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.progress}%` }} /></div>
                        ) : f.det && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6">
                            {f.det.developerName
                              ? <span className={cn(TAG, "border-border bg-card text-foreground")}>{f.det.how === "AI" && <Sparkles className="h-3 w-3 text-violet-500" />}{f.det.developerName} · {f.det.how}</span>
                              : <span className={cn(TAG, TONE_TAG.warn)}>Developer not detected</span>}
                            {f.det.availability
                              ? <span className={cn(TAG, f.det.hasUnitCodes ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700")}>{f.det.hasUnitCodes ? `With codes · ${f.det.unitCodes}` : "No codes · ranges"}</span>
                              : <span className={cn(TAG, TONE_TAG.info)}>{f.det.docKind} — not a price list</span>}
                            <span className={cn(TAG, TONE_TAG.muted)}>{f.det.summary}</span>
                          </div>
                        )}
                        {f.det && !f.det.availability && (
                          <div className="mt-1.5 flex items-center gap-2 pl-6 text-[11px]">
                            <Button size="sm" variant="outline" className="h-6 gap-1 bg-white px-2 text-[11px]" onClick={() => fileAway(f)}><Library className="h-3 w-3" />Attach to the project library</Button>
                            <span className="text-muted-foreground">It feeds Floor Plans, Payment Plans or Media later.</span>
                          </div>
                        )}
                        {dupe && <p className="mt-1.5 flex items-center gap-1 pl-6 text-[11px] text-amber-800"><AlertTriangle className="h-3 w-3" />Already ingested in {dupe.id} — same fingerprint. Remove it unless the developer re-sent it on purpose.</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-border bg-muted/30 p-6 lg:border-l lg:border-t-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Sparkles className="h-3.5 w-3.5 text-violet-500" />Entry<span className="font-normal text-muted-foreground">· detected, then confirmed</span></p>
              <Field label="Developer" required hint={detectedDev && !devTouched ? <><Sparkles className="h-3 w-3 text-violet-500" />Detected in {listings.filter((f) => f.det?.developerName === detectedDev.name).length} of {listings.length} files</> : undefined}>
                <DeveloperSelect developers={PROJECT_DEVELOPERS} value={devId} onChange={(id) => { setDevId(id); setDevTouched(true); setProjectIds([]); setProjTouched(false) }} className="w-full" />
              </Field>
              <Field label="Sale type" required hint={fromWhatsApp ? "The WhatsApp group's default — change it if the files say otherwise" : "Your pick — files rarely show it"}>
                <Segmented value={saleType} options={SALE_TYPES} onChange={setSaleType} size="sm" />
              </Field>
              <Field label="Entry type" required hint={listings.length ? <><Sparkles className="h-3 w-3 text-violet-500" />{withCodes ? `Unit codes in ${withCodes} of ${listings.length} files` : "Ranges without codes"}</> : "From the headers once files are read"}>
                <Segmented value={dataType} options={["Automatic", "Manual"] as const} labels={{ Automatic: "With unit codes", Manual: "No codes" }} onChange={(v) => { setDataType(v); setDataTouched(true) }} size="sm" />
              </Field>
              <Field label="Projects" required hint={!projTouched && projectIds.length ? (projectsMatched ? <><Sparkles className="h-3 w-3 text-violet-500" />Matched from file names and content</> : <span className="text-amber-700">Suggested — confirm in Initial Setup</span>) : undefined}>
                <ProjectTreeSelect multi projects={projTree} values={projectIds} onValuesChange={(ids) => { setProjectIds(ids); setProjTouched(true) }} className="w-full" />
              </Field>
              <Field label="Property categories" required><CategoryMultiSelect value={categories} onChange={setCategories} /></Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
            <p className={cn("text-sm", blockers.length && files.length ? "text-red-600" : "text-muted-foreground")}>
              {files.length ? `${plural(files.length, "file")} · ${fmtSize(files.reduce((n, f) => n + f.size, 0))}${blockers.length ? ` · ${blockers[0]}` : " · ready"}` : "No files yet"}
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
          hint: { developerName: it.developerName, projects: it.projects, fromGroup: true },
        })))}
      />
    </>
  )
}

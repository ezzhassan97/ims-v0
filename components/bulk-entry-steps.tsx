"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, FilePlus2, GripVertical,
  Info, MoreHorizontal, Pencil, Plus, RotateCw, ScanText, Sparkles, Trash2, Undo2, Wand2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DeveloperSelect, IdTag, ProjectTreeSelect } from "@/components/table-kit"
import { fmtDateTime } from "@/components/projects-list-page"
import { SheetPreviewCard, displayCell, type CellMark, type GridSheet } from "@/components/sheet-preview"
import {
  CategoryMultiSelect, DataPane, Field, FilterEditor, FILE_ICON, FilesView, MiniStat, OriginTag, PanelCard, Segmented, SourceViewer,
  TAG, TONE_TAG, ToConfirm, Workspace, customColsOf, fieldLabel, fileMeta, fmtSize, rowTitle, unitTable, useFocus,
  type Extra, type GridFocus, type SourceHighlight, type StageCtx,
} from "@/components/bulk-entry-kit"
import {
  ACTION_KINDS, FIELD_LABEL, FINISHING_TYPES, PROPERTY_TYPES, DELIVERY_TYPES, applyActions, extractRows, filtersText, fmtInt, hashStr,
  mapTargets, matchesFilters, normCode, plural, txt,
  type Action, type ActionKind, type Cell, type CleanupGroup, type CleanupItem, type FieldDef, type FieldKey, type ProjectRule, type RowFilter, type URow,
} from "@/lib/bulk-ingestion"
import { addRow, editCell, type Work } from "@/lib/bulk-entry-flow"
import { projectData, resaleUnitsOf } from "@/lib/ingestion-rules-mock"
import { PROJECT_DEVELOPERS, buildProjectTreeNodes } from "@/lib/projects-mock"
import { ENTRIES, ENTRY_USERS, SALE_TYPES } from "@/lib/ingestion-mock"
import { launchLabel, launchesForProject } from "@/lib/launches-mock"

const src: Extra = { col: { key: "_src", label: "Source" }, get: (r) => r.src }
const empty = (text: string) => <p className="py-3 text-center text-xs text-muted-foreground">{text}</p>

/* ── Stage 1 · Initial setup — confirm who and what, clean every file (removals only) ── */

const DETECT_ICON = { error: CircleAlert, warn: AlertTriangle, info: Info } as const
const DETECT_TONE = { error: "text-red-600", warn: "text-amber-600", info: "text-sky-600" } as const

export function StageSetup({ ctx }: { ctx: StageCtx }) {
  const { work, set, pipe, seed } = ctx
  const [fileId, setFileId] = useState(seed.files[0]?.id ?? "")
  const [tab, setTab] = useState<string | undefined>(undefined)
  const [focus, setFocus] = useFocus(ctx)
  const [viewReq, setViewReq] = useState<{ view: "input" | "output" | "diff"; key: number } | undefined>(undefined)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const file = seed.files.find((f) => f.id === fileId) ?? seed.files[0]
  const toggle = (id: string) => set((w) => ({ applied: w.applied.includes(id) ? w.applied.filter((x) => x !== id) : [...w.applied, id] }))
  const setMany = (ids: string[], on: boolean) => set((w) => ({ applied: on ? [...new Set([...w.applied, ...ids])] : w.applied.filter((x) => !ids.includes(x)) }))
  const projTree = useMemo(() => buildProjectTreeNodes((p) => !work.developerId || p.developer.id === work.developerId), [work.developerId])
  const pendingAll = pipe.detections.flatMap((g) => g.items).filter((i) => !pipe.applied.has(i.id))
  const perUnit = work.saleType === "Resale" || work.saleType === "Nawy Now"
  const launches = useMemo(() => work.projectIds.flatMap((id) => launchesForProject(id)), [work.projectIds])
  const resale = useMemo(() => resaleUnitsOf(ctx.entry.id, pipe.options[0]?.mainName ?? "the project"), [ctx.entry.id, pipe.options])

  // Detection highlights on the original sheet
  const marks = useMemo(() => {
    const row = new Map<string, CellMark>()
    const col = new Map<string, CellMark>()
    const cell = new Map<string, CellMark>()
    pipe.detections.forEach((g) => g.items.forEach((it) => {
      const done = pipe.applied.has(it.id)
      if (g.kind === "empty-cols" && it.cols) col.set(`${it.tab}|${it.cols[0]}`, { tone: "error", note: `Completely empty column${done ? " — removed in the output" : ""}` })
      else if (g.kind === "merged" && it.rows && it.cols) it.rows.forEach((n) => cell.set(`${it.tab}|r${n}|${it.cols![0]}`, { tone: "warn", note: `Merged cell${done ? " — unmerged and filled down in the output" : " — unmerge to fill every row"}` }))
      else if (it.rows && g.tone !== "info") it.rows.forEach((n) => row.set(`${it.tab}|r${n}`, { tone: done ? "ok" : g.tone === "error" ? "error" : "warn", note: `${g.title}${done ? " — removed in the output" : " — not applied yet"}` }))
    }))
    work.applied.filter((x) => x.startsWith("drop-row:")).forEach((x) => { const [, , t, r] = x.split(":"); row.set(`${t}|r${r}`, { tone: "ok", note: "Dropped by you" }) })
    return { row, col, cell }
  }, [pipe.detections, pipe.applied, work.applied])

  const focusItem = (it: CleanupItem) => {
    setFileId(it.fileId)
    if (it.tab) setTab(it.tab)
    setFocus(it.rows?.length ? { sheet: it.tab, rowIds: it.rows.map((n) => `r${n}`), label: it.label } : null)
    setViewReq({ view: "input", key: Date.now() })
  }

  const sheets: GridSheet[] = pipe.setup.filter((s) => s.fileId === file?.id).map((s) => ({ name: s.tab, input: s.input, output: s.output, badge: `header row ${s.header}` }))
  const excludedCols = Object.fromEntries(pipe.setup.filter((s) => s.fileId === file?.id).map((s) => [s.tab, s.input.cols.map((c) => c.key).filter((k) => pipe.applied.has(`drop-col:${s.fileId}:${s.tab}:${k}`) || pipe.applied.has(`empty-col:${s.fileId}:${s.tab}:${k}`))]))
  const miss = { dev: !work.developerId, proj: !work.projectIds.length, sale: !work.saleType, cat: !work.categories.length, cov: !work.coverage }

  const fileChips = (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {seed.files.map((f) => {
        const removed = pipe.applied.has(`remove-file:${f.id}`)
        const issues = pipe.detections.flatMap((g) => g.items).filter((i) => i.fileId === f.id && !pipe.applied.has(i.id)).length
        return (
          <button key={f.id} type="button" onClick={() => { setFileId(f.id); setFocus(null); setTab(undefined) }} title={f.name}
            className={cn("flex max-w-[220px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors", f.id === file?.id ? "border-primary bg-primary/5 font-semibold text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground", removed && "opacity-50")}>
            {FILE_ICON[f.kind]}<span className={cn("truncate", removed && "line-through")}>{f.name}</span>
            {issues > 0 && !removed && <span className={cn(TAG, TONE_TAG.warn, "px-1 py-0 text-[10px]")}>{issues}</span>}
          </button>
        )
      })}
    </div>
  )

  const left = !file ? null : pipe.applied.has(`remove-file:${file.id}`) ? (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2">{fileChips}</div>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">This file is dropped from the entry. <button className="ml-1 text-primary hover:underline" onClick={() => toggle(`remove-file:${file.id}`)}>Restore it</button></div>
    </div>
  ) : file.kind === "sheet" ? (
    <SheetPreviewCard
      key={file.id}
      fill
      titleSlot={fileChips}
      sheets={sheets}
      initialView="output"
      viewLabels={{ input: "Original", output: "Cleaned" }}
      forceView={viewReq ?? (ctx.aiRun ? { view: "diff", key: ctx.aiRun } : undefined)}
      ignored={pipe.setup.filter((s) => s.fileId === file.id && s.ignored).map((s) => s.tab)}
      onToggleIgnore={(t) => toggle(`ignore-tab:${file.id}:${t}`)}
      onToggleColumn={(t, c) => toggle(pipe.applied.has(`empty-col:${file.id}:${t}:${c}`) ? `empty-col:${file.id}:${t}:${c}` : `drop-col:${file.id}:${t}:${c}`)}
      excludedCols={excludedCols}
      activeSheet={tab}
      onActiveSheetChange={(t) => { setTab(t); setFocus(null) }}
      markRow={(t, rowId, view) => (view === "input" ? marks.row.get(`${t}|${rowId}`) : null)}
      markCol={(t, c, view) => (view === "input" ? marks.col.get(`${t}|${c}`) : null)}
      markCell={(t, rowId, c, view) => (view === "input" ? marks.cell.get(`${t}|${rowId}|${c}`) : null)}
      focus={focus}
      onClearFocus={() => setFocus(null)}
      bulkActions={({ sheet, rowIds, clear }) => (
        <>
          <Button variant="outline" size="sm" className="h-7 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => { setMany(rowIds.map((id) => `drop-row:${file.id}:${sheet}:${id.slice(1)}`), true); toast.success(`${plural(rowIds.length, "row")} dropped`); clear() }}>
            <Trash2 className="h-3 w-3" />Drop rows
          </Button>
          {rowIds.length === 1 && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { set((w) => ({ headerRow: { ...w.headerRow, [`${file.id}:${sheet}`]: Number(rowIds[0].slice(1)) } })); toast.success(`Row ${rowIds[0].slice(1)} is the header of ${sheet}`); clear() }}>
              Set as header row
            </Button>
          )}
        </>
      )}
    />
  ) : (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        {fileChips}
        <div className="flex items-center gap-1.5">
          {file.image?.rotated && <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => toggle(`rotate:${file.id}`)}><RotateCw className="h-3.5 w-3.5" />{pipe.applied.has(`rotate:${file.id}`) ? "Undo rotate" : "Rotate upright"}</Button>}
          <Button variant="outline" size="sm" className="h-7 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => toggle(`remove-file:${file.id}`)}><Trash2 className="h-3.5 w-3.5" />Drop file</Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          {file.kind === "pdf" ? "Pages with no prices are dropped before extraction reads the file — keep or drop any page." : file.kind === "text" ? "Highlighted lines are noise — they're removed so extraction reads fewer tokens. Click a line to keep or remove it." : file.image?.kind === "render" ? "A render, not a price list — dropped from extraction and added to the project's render pool." : "The photo as it arrived — turn it upright before it's read."}
        </p>
        <SourceViewer file={file} applied={pipe.applied} onToggle={toggle} />
      </div>
    </div>
  )

  const right = (
    <>
      <PanelCard title="Who and what" subtitle="Pre-filled from the upload — confirm or correct.">
        <div className="space-y-3">
          <Field label="Developer" required invalid={miss.dev}>
            <DeveloperSelect developers={PROJECT_DEVELOPERS} value={work.developerId} onChange={(id) => set((w) => ({ developerId: id, projectIds: id === w.developerId ? w.projectIds : [] }))} className="w-full" />
          </Field>
          <Field label="Projects and phases" required invalid={miss.proj}>
            <ProjectTreeSelect multi projects={projTree} values={work.projectIds} onValuesChange={(ids) => set({ projectIds: ids })} className="w-full" />
          </Field>
          <Field label="Sale type" required invalid={miss.sale} hint="Your pick — files rarely show it">
            <Segmented value={work.saleType} options={SALE_TYPES} onChange={(v) => set({ saleType: v })} invalid={miss.sale} size="sm" />
          </Field>
          <Field label="Entry type" required hint={pipe.sheetOnly ? `${fmtInt(pipe.setup.filter((s) => !s.ignored).reduce((n, s) => n + s.output.rows.length, 0))} rows · unit-code column found` : undefined}>
            <Segmented value={work.dataType} options={["Automatic", "Manual"] as const} labels={{ Automatic: "With unit codes", Manual: "No codes · ranges" }} onChange={(v) => set({ dataType: v })} size="sm" />
          </Field>
          <Field label="Property categories" required invalid={miss.cat}>
            <CategoryMultiSelect value={work.categories} onChange={(v) => set({ categories: v })} />
          </Field>
          <Field label="Coverage" required invalid={miss.cov} hint={work.coverage === "full" ? "Units IMS lists that these files don't are missing — decided in Final check." : work.coverage === "partial" ? "Only the units in these files change — the rest stay untouched." : "Do the files list the projects' whole availability?"}>
            <div className="flex items-center gap-2">
              <div className="flex-1"><Segmented value={work.coverage} options={["full", "partial"] as const} labels={{ full: "Full inventory", partial: "Partial update" }} onChange={(v) => { set({ coverage: v }); ctx.confirm(["coverage"]) }} invalid={miss.cov} size="sm" /></div>
              <ToConfirm ctx={ctx} id="coverage" />
            </div>
          </Field>
          {work.saleType === "Launch" && (
            <Field label="Launch record" required invalid={!work.launchId}>
              <select value={work.launchId} onChange={(e) => { set({ launchId: e.target.value }); ctx.confirm(["launch"]) }} className={cn("h-9 w-full rounded-md border bg-white px-2 text-sm outline-none", work.launchId ? "border-input" : "border-red-300")}>
                <option value="">Select the launch…</option>
                {launches.map((l) => <option key={l.id} value={l.id}>{launchLabel(l)}</option>)}
                <option value="new">New launch record</option>
              </select>
            </Field>
          )}
          {perUnit && (
            <Field label="Owner" required invalid={!work.owner.name} hint={<><ToConfirm ctx={ctx} id="owner" /></>}>
              <div className="grid grid-cols-2 gap-1.5">
                <input value={work.owner.name} onChange={(e) => set((w) => ({ owner: { ...w.owner, name: e.target.value } }))} placeholder="Name" className={cn("h-9 rounded-md border bg-white px-2 text-sm outline-none", work.owner.name ? "border-input" : "border-red-300")} />
                <input value={work.owner.phone} onChange={(e) => set((w) => ({ owner: { ...w.owner, phone: e.target.value } }))} placeholder="Phone" className="h-9 rounded-md border border-input bg-white px-2 text-sm outline-none" />
              </div>
            </Field>
          )}
          {work.saleType === "Nawy Now" && (
            <Field label="Linked resale unit" required invalid={!work.linkedUnit}>
              <select value={work.linkedUnit} onChange={(e) => { set({ linkedUnit: e.target.value }); ctx.confirm(["linked"]) }} className={cn("h-9 w-full rounded-md border bg-white px-2 text-sm outline-none", work.linkedUnit ? "border-input" : "border-red-300")}>
                <option value="">Select the owner&apos;s resale unit…</option>
                {resale.map((u) => <option key={u.id} value={u.id}>{u.id} · {u.label}</option>)}
                {work.linkedUnit && !resale.some((u) => u.id === work.linkedUnit) && <option value={work.linkedUnit}>{work.linkedUnit}</option>}
              </select>
            </Field>
          )}
        </div>
      </PanelCard>

      <PanelCard
        title="Files"
        subtitle="Up to 5 per entry — the originals stay viewable at every stage."
        right={<AddFile ctx={ctx} />}
      >
        <div className="space-y-1.5">
          {seed.files.map((f) => {
            const removed = pipe.applied.has(`remove-file:${f.id}`)
            const tabs = pipe.setup.filter((s) => s.fileId === f.id)
            return (
              <div key={f.id} className={cn("rounded-lg border border-border px-2 py-1.5", removed && "opacity-60")}>
                <div className="flex items-center gap-2">
                  {FILE_ICON[f.kind]}
                  <button type="button" onClick={() => setFileId(f.id)} className={cn("min-w-0 flex-1 truncate text-left text-xs font-medium hover:text-primary", removed && "line-through")}>{f.name}</button>
                  <span className="text-[11px] text-muted-foreground">{fileMeta(f)} · {fmtSize(f.size)}</span>
                  <button type="button" title={removed ? "Restore file" : "Drop file"} onClick={() => toggle(`remove-file:${f.id}`)} className="text-muted-foreground hover:text-red-600">{removed ? <Undo2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</button>
                </div>
                {tabs.length > 0 && !removed && (
                  <div className="mt-1 space-y-0.5 border-t border-border pt-1">
                    {tabs.map((s) => (
                      <div key={s.tab} className="flex items-center gap-2 text-[11px]">
                        <Checkbox className="h-3.5 w-3.5" checked={!s.ignored} onCheckedChange={() => toggle(`ignore-tab:${f.id}:${s.tab}`)} />
                        <button type="button" onClick={() => { setFileId(f.id); setTab(s.tab) }} className={cn("min-w-0 flex-1 truncate text-left hover:text-primary", s.ignored && "text-muted-foreground line-through")}>{s.tab}</button>
                        {!s.ignored && (
                          <label className="flex items-center gap-1 text-muted-foreground">Header row
                            <input type="number" min={1} value={work.headerRow[`${f.id}:${s.tab}`] ?? s.header} onChange={(e) => set((w) => ({ headerRow: { ...w.headerRow, [`${f.id}:${s.tab}`]: Math.max(1, Number(e.target.value) || 1) } }))} className="h-6 w-12 rounded border border-input bg-white px-1 text-[11px] outline-none" />
                          </label>
                        )}
                        <span className="w-14 text-right text-muted-foreground">{s.ignored ? "dropped" : `${s.output.rows.length} rows`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </PanelCard>

      <PanelCard
        title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />Checks &amp; cleanup</>}
        subtitle="Removals only — no cell is edited. Click an item to see it."
        right={pendingAll.length > 0
          ? <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => { setMany(pendingAll.map((i) => i.id), true); toast.success(`${plural(pendingAll.length, "cleanup")} applied`); setViewReq({ view: "diff", key: Date.now() }) }}>Apply all ({pendingAll.length})</Button>
          : <span className={cn(TAG, TONE_TAG.ok)}><Check className="h-3 w-3" />All applied</span>}
      >
        <div className="space-y-2">
          {pipe.detections.length === 0 && empty("Nothing to clean — the files look good.")}
          {pipe.detections.map((g) => <DetectionGroup key={g.kind} g={g} applied={pipe.applied} open={openGroups.includes(g.kind)} onOpen={() => setOpenGroups((o) => (o.includes(g.kind) ? o.filter((x) => x !== g.kind) : [...o, g.kind]))} onToggle={toggle} onSetMany={setMany} onFocus={focusItem} />)}
        </div>
      </PanelCard>

      <PreviousEntry ctx={ctx} />
    </>
  )
  return <Workspace left={left} right={right} />
}

function AddFile({ ctx }: { ctx: StageCtx }) {
  const [open, setOpen] = useState(false)
  const count = ctx.seed.files.length
  const add = (kind: "Sheet" | "PDF" | "Image" | "Text") => {
    const slug = (ctx.pipe.options[0]?.mainName ?? "project").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const name = kind === "Sheet" ? `${slug}-inventory-update.xlsx` : kind === "PDF" ? `${slug}-price-list-update.pdf` : kind === "Image" ? `${slug}-price-list-photo-${count + 1}.jpg` : `${slug}-message.txt`
    ctx.set((w) => ({ addedFiles: [...w.addedFiles, { name, kind, size: kind === "Sheet" ? 212_000 : kind === "PDF" ? 3_100_000 : kind === "Image" ? 790_000 : 2_100, origin: "Device" }] }))
    toast.success(`${name} added — it runs through the same checks`)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={count >= 5} title={count >= 5 ? "An entry holds up to 5 files" : undefined}><FilePlus2 className="h-3.5 w-3.5" />Add file</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {(["Sheet", "PDF", "Image", "Text"] as const).map((k) => (
          <button key={k} type="button" onClick={() => add(k)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-secondary">{k === "Text" ? "Pasted text" : k === "Image" ? "Photo" : k}</button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function DetectionGroup({ g, applied, open, onOpen, onToggle, onSetMany, onFocus }: {
  g: CleanupGroup; applied: Set<string>; open: boolean; onOpen: () => void
  onToggle: (id: string) => void; onSetMany: (ids: string[], on: boolean) => void; onFocus: (it: CleanupItem) => void
}) {
  const Icon = DETECT_ICON[g.tone]
  const done = g.items.filter((i) => applied.has(i.id)).length
  const all = done === g.items.length
  return (
    <div className={cn("rounded-lg border", all ? "border-emerald-200 bg-emerald-50/30" : "border-border")}>
      <div className="flex items-start gap-2 px-2.5 py-2">
        <button type="button" onClick={onOpen} className="mt-0.5 text-muted-foreground hover:text-foreground">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button>
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", all ? "text-emerald-600" : DETECT_TONE[g.tone])} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-medium leading-5 text-foreground">{g.title} <span className="text-muted-foreground">· {g.items.length}</span></p>
          <p className="text-[11px] leading-4 text-muted-foreground">{g.detail}</p>
          {g.learned && <p className="mt-0.5 text-[10px] font-medium text-slate-600">From this developer&apos;s past choices</p>}
        </button>
        {all ? (
          <button type="button" onClick={() => onSetMany(g.items.map((i) => i.id), false)} className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-emerald-700 hover:text-foreground" title="Undo"><Check className="h-3 w-3" />Applied</button>
        ) : (
          <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onSetMany(g.items.map((i) => i.id), true)}>Apply{done ? ` ${g.items.length - done}` : ""}</Button>
        )}
      </div>
      {open && (
        <div className="space-y-0.5 border-t border-border px-2.5 py-1.5">
          {g.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
              <Checkbox className="h-3.5 w-3.5" checked={applied.has(it.id)} onCheckedChange={() => onToggle(it.id)} />
              <button type="button" onClick={() => onFocus(it)} className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-primary" title="Show in the sheet">{it.label}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** The developer's last finalized entries — what changed since. */
function PreviousEntry({ ctx }: { ctx: StageCtx }) {
  const { entry, work, pipe } = ctx
  const [i, setI] = useState(0)
  const prev = useMemo(() => {
    const real = ENTRIES.filter((e) => e.developer?.id === work.developerId && e.id !== entry.id && e.stage === "Finalized").map((e) => ({ id: e.id, name: e.fileName, by: e.uploadedBy, at: e.finalizedAt ?? e.updatedAt }))
    const h = hashStr(entry.id)
    const synth = [1, 2, 3].map((k) => ({ id: `ENT-0${900 + ((h + k * 37) % 99)}`, name: entry.fileName.replace(/\d+\./, `${k}.`), by: ENTRY_USERS[(h + k) % ENTRY_USERS.length], at: new Date(Date.UTC(2026, 0, 30 - k * 9, 11)).toISOString() }))
    return [...real, ...synth].slice(0, 3)
  }, [entry, work.developerId])
  if (!work.developerId || !prev.length) return null
  const p = prev[i]
  const h = hashStr(p.id)
  const delta = (h % 17) - 5
  const units = 180 + (h % 260)
  return (
    <PanelCard
      title="Previous entry"
      subtitle={<span className="flex flex-wrap items-center gap-1"><IdTag value={p.id} /> · finalized {fmtDateTime(p.at)} by {p.by}</span>}
      right={
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => setI((v) => v - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <span className="text-[11px] text-muted-foreground">{i + 1}/{prev.length}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === prev.length - 1} onClick={() => setI((v) => v + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        <span className={cn(TAG, delta >= 0 ? TONE_TAG.ok : TONE_TAG.error)}>{delta >= 0 ? "+" : ""}{delta} rows since</span>
        {pipe.sheetOnly && <span className={cn(TAG, TONE_TAG.ok)}>+2 columns · Garden, Notes</span>}
        {pipe.sheetOnly && <span className={cn(TAG, TONE_TAG.error)}>1 tab removed</span>}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">It ingested {units} units — {Math.round(units * 0.42)} new, {Math.round(units * 0.23)} modified, {h % 19} missing.</p>
    </PanelCard>
  )
}

/* ── Stage 2 · Extraction — source on the left, IMS rows next to it ───── */

export function StageExtraction({ ctx }: { ctx: StageCtx }) {
  const { pipe, seed, work, set } = ctx
  const docFiles = seed.files.filter((f) => f.kind !== "sheet" && !pipe.applied.has(`remove-file:${f.id}`) && f.extracted?.length)
  const [fileId, setFileId] = useState(docFiles[0]?.id ?? "")
  const [active, setActive] = useState<{ rowId: string; col: string } | null>(null)
  const [by, setBy] = useState<"page" | "project">("page")
  const [focus, setFocus] = useFocus(ctx)
  const base = useMemo(() => extractRows(seed.files, pipe.applied, new Set(work.reread)), [seed.files, pipe.applied, work.reread])
  const row = pipe.extracted.find((r) => r.id === active?.rowId)
  const avg = useMemo(() => {
    const all = pipe.extracted.flatMap((r) => Object.values(r.conf ?? {}).filter((c): c is number => typeof c === "number"))
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0
  }, [pipe.extracted])
  const lowSet = useMemo(() => new Map(pipe.lowCells.map((c) => [`${c.rowId}|${c.field}`, c.conf])), [pipe.lowCells])
  const pageOf = (r: URow) => (r.page ? `${seed.files.find((f) => f.id === r.fileId)?.name ?? ""} · p.${r.page}` : r.src.replace(/ · (row|L)\s?\d+$/, ""))
  const projOf = (r: URow) => txt(r.v.project) || "No project"
  const groups = useMemo(() => {
    const m = new Map<string, URow[]>()
    pipe.extracted.forEach((r) => { const k = by === "page" ? pageOf(r) : projOf(r); m.set(k, [...(m.get(k) ?? []), r]) })
    return [...m.entries()]
  }, [pipe.extracted, by]) // eslint-disable-line react-hooks/exhaustive-deps
  const sheets: GridSheet[] = groups.map(([name, rows]) => ({ name, badge: `${rows.filter((r) => Object.keys(r.conf ?? {}).some((k) => lowSet.has(`${r.id}|${k}`))).length || ""}`, output: unitTable(rows, pipe.fields, [src]) }))
  const [sheetName, setSheetName] = useState<string | undefined>(undefined)
  useEffect(() => { if (row) setSheetName(by === "page" ? pageOf(row) : projOf(row)) }, [row?.id, by]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (rowId: string, col: string) => {
    setActive({ rowId, col })
    const r = pipe.extracted.find((x) => x.id === rowId)
    if (r?.fileId) setFileId(r.fileId)
  }
  const next = () => {
    const i = active ? pipe.lowCells.findIndex((c) => c.rowId === active.rowId && c.field === active.col) : -1
    const c = pipe.lowCells[(i + 1) % Math.max(1, pipe.lowCells.length)]
    if (c) pick(c.rowId, c.field)
  }
  const accept = (cells: { rowId: string; field: string }[]) => {
    if (!cells.length) return
    set((w) => ({ accepted: [...new Set([...w.accepted, ...cells.map((c) => `${c.rowId}|${c.field}`)])] }))
    toast.success(`${plural(cells.length, "cell")} accepted as read`)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("input, select, textarea, [contenteditable]")) return
      if (e.key === "n" || e.key === "N") { e.preventDefault(); next() }
      if ((e.key === "a" || e.key === "A") && active && lowSet.has(`${active.rowId}|${active.col}`)) { e.preventDefault(); accept([{ rowId: active.rowId, field: active.col }]); next() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }) // re-bound every render so it sees the latest selection

  const token = row && active ? displayCell(base.find((b) => b.id === row.id)?.v[active.col as FieldKey] ?? row.v[active.col as FieldKey]) : undefined
  const rawTok = row && active ? txt(seed.files.find((f) => f.id === row.fileId)?.extracted?.find((x) => x.id === row.id)?.v[active.col as FieldKey]) : undefined
  const highlight: SourceHighlight | undefined = row?.fileId ? { fileId: row.fileId, line: row.line ?? 0, page: row.page, token: rawTok || token } : undefined
  const edits = Object.entries(work.extractEdits.set).flatMap(([rowId, fields]) => Object.entries(fields ?? {}).map(([f, v]) => ({ rowId, field: f, from: base.find((b) => b.id === rowId)?.v[f as FieldKey] ?? null, to: v as Cell })))
  const lowFiles = [...new Set(pipe.lowCells.map((c) => pipe.extracted.find((r) => r.id === c.rowId)?.fileId).filter((x): x is string => !!x))]

  const left = (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:grid-cols-2">
      <FilesView
        files={docFiles}
        fileId={fileId}
        onFile={setFileId}
        applied={pipe.applied}
        highlight={highlight}
        titleSlot={<span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><ScanText className="h-3.5 w-3.5 text-muted-foreground" />Source</span>}
        onLineClick={(fid, line, page) => {
          const r = pipe.extracted.find((x) => x.fileId === fid && (x.line ?? -1) === line && (!page || x.page === page))
          if (r) pick(r.id, active?.col && active.col in r.v ? active.col : "price")
        }}
        page={row?.page ?? (docFiles.find((f) => f.id === fileId)?.kind === "pdf" ? 2 : undefined)}
      />
      <SheetPreviewCard
        fill
        titleSlot={<span className="text-[13px] font-semibold text-foreground">Extracted rows</span>}
        sheets={sheets}
        activeSheet={sheetName}
        onActiveSheetChange={setSheetName}
        editable
        forceView={ctx.aiRun ? { view: "output", key: ctx.aiRun } : undefined}
        onEdit={(_, rowId, key, value) => { if (pipe.fields.some((f) => f.key === key)) set((w) => ({ extractEdits: editCell(w.extractEdits, rowId, key as FieldKey, value) })) }}
        onDeleteRows={(_, ids) => { set((w) => ({ extractEdits: { ...w.extractEdits, deleted: [...new Set([...w.extractEdits.deleted, ...ids])] } })); toast.success(`${plural(ids.length, "row")} removed`) }}
        onAddRow={() => set((w) => ({ extractEdits: addRow(w.extractEdits, pipe.extracted) }))}
        markCell={(_, rowId, key) => {
          const c = lowSet.get(`${rowId}|${key}`)
          return c !== undefined ? { tone: c < 60 ? "error" : "warn", note: `Read with ${c}% confidence — check it against the source` } : null
        }}
        onCellClick={(_, rowId, col) => pick(rowId, col)}
        activeCell={active}
        activeRowId={active?.rowId}
        focus={focus}
        onClearFocus={() => setFocus(null)}
      />
    </div>
  )

  const right = (
    <>
      <PanelCard title="Extraction">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Rows" value={pipe.extracted.length} />
          <MiniStat label="Files" value={docFiles.length} />
          <MiniStat label="Confidence" value={`${avg}%`} tone={pipe.lowCells.length ? "warn" : "ok"} />
        </div>
        <div className="mt-2.5">
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Tabs</p>
          <Segmented value={by} options={["page", "project"] as const} labels={{ page: "Per page", project: "Per project" }} onChange={setBy} size="sm" />
        </div>
      </PanelCard>

      <PanelCard
        title={<>{pipe.lowCells.length ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}Low confidence</>}
        tone={pipe.lowCells.length ? "warn" : undefined}
        right={<span className={cn(TAG, pipe.lowCells.length ? TONE_TAG.warn : TONE_TAG.ok)}>{pipe.lowCells.length} left</span>}
      >
        {pipe.lowCells.length ? (
          <>
            <p className="text-xs text-muted-foreground">Confidence mixes the model&apos;s score with checks: the value parses as the field&apos;s type, sits in its range and agrees with the row.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={next}>Next low cell <kbd className="rounded border border-white/40 px-1 text-[10px]">N</kbd></Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={!active || !lowSet.has(`${active.rowId}|${active.col}`)} onClick={() => { if (active) { accept([{ rowId: active.rowId, field: active.col }]); next() } }}>Accept <kbd className="rounded border border-border px-1 text-[10px]">A</kbd></Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setFocus({ rowIds: [...new Set(pipe.lowCells.map((c) => c.rowId))], label: "rows with low-confidence cells" })}>Low confidence only</Button>
            </div>
            <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
              {pipe.lowCells.map((c) => {
                const r = pipe.extracted.find((x) => x.id === c.rowId)
                return (
                  <button key={`${c.rowId}|${c.field}`} type="button" onClick={() => pick(c.rowId, c.field)} className={cn("flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/60", active?.rowId === c.rowId && active.col === c.field && "bg-primary/5")}>
                    <span className="min-w-0 truncate"><b className="font-medium">{FIELD_LABEL[c.field]}</b> · {displayCell(r?.v[c.field]) || "—"} <span className="text-muted-foreground">· row {r?.idx}</span></span>
                    <span className={cn(TAG, c.conf < 60 ? TONE_TAG.error : TONE_TAG.warn)}>{c.conf}%</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : <p className="text-xs text-muted-foreground">Every cell is confident — nothing left to check.</p>}
      </PanelCard>

      {lowFiles.length > 0 && (
        <PanelCard title="Re-read with the high-accuracy model" subtitle="On request only — for dense or blurry pages.">
          <div className="space-y-1">
            {lowFiles.map((fid) => {
              const f = seed.files.find((x) => x.id === fid)
              return (
                <div key={fid} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">{f && FILE_ICON[f.kind]}<span className="truncate">{f?.name}</span></span>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" disabled={work.reread.includes(fid)} onClick={() => { set((w) => ({ reread: [...w.reread, fid] })); toast.success(`${f?.name} re-read`) }}>{work.reread.includes(fid) ? "Re-read" : "Re-read"}</Button>
                </div>
              )
            })}
          </div>
        </PanelCard>
      )}

      <PanelCard title="Edit log" subtitle="Every correction is kept — the developer's frequent ones go into their next prompt.">
        {edits.length ? (
          <div className="space-y-1">
            {edits.map((e) => {
              const r = pipe.extracted.find((x) => x.id === e.rowId)
              return (
                <div key={`${e.rowId}|${e.field}`} className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="font-medium">{FIELD_LABEL[e.field as FieldKey]}</span><span className="text-muted-foreground">· row {r?.idx}</span>
                  <span className="text-muted-foreground line-through">{displayCell(e.from) || "—"}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /><b>{displayCell(e.to) || "—"}</b>
                  <ToConfirm ctx={ctx} id={`extract:${e.rowId}|${e.field}`} />
                </div>
              )
            })}
          </div>
        ) : <p className="text-xs text-muted-foreground">No corrections yet. Click a cell to edit it with a typed input — dates, dropdowns from IMS lists, numbers.</p>}
      </PanelCard>
    </>
  )
  return <Workspace left={left} right={right} />
}

/* ── Stage 3 · Mapping — all tabs stacked, each header mapped once ─────── */

export function StageMapping({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const targets = mapTargets(work.dataType)
  const required = new Set(work.dataType === "Automatic" ? ["unitCode", "propertyType", "bua", "price"] : ["propertyType", "bua", "price"])
  const custom = customColsOf(pipe.mapped)
  const byTarget = useMemo(() => {
    const m = new Map<string, string[]>()
    pipe.headers.forEach((h) => { if (h.target) m.set(h.target, [...(m.get(h.target) ?? []), h.raw]) })
    return m
  }, [pipe.headers])
  const choose = (key: string, target: string) => { set((w) => ({ headerMap: { ...w.headerMap, [key]: target } })); ctx.confirm([`header:${key}`]) }
  const hasSheets = pipe.headers.length > 0
  const sheets: GridSheet[] = [{
    name: "All tabs",
    input: hasSheets ? pipe.stacked : undefined,
    output: unitTable(pipe.mapped, pipe.fields, [src, { col: { key: "_tab", label: "Tab" }, get: (r) => r.tab ?? (r.fileId ? "Extracted" : null) }], custom),
  }]
  const templateHits = pipe.headers.filter((h) => h.origin === "Template").length

  const right = (
    <>
      {pipe.requiredMissing.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><CircleAlert className="h-3.5 w-3.5" />Required fields without a column</p>
          <p className="mt-0.5 text-xs text-red-800">{pipe.requiredMissing.map((f) => FIELD_LABEL[f]).join(", ")} — pick the column that carries each.</p>
        </div>
      ) : hasSheets && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><Check className="mr-1 inline h-3.5 w-3.5" />Every required field has a column.</div>
      )}

      {hasSheets ? (
        <PanelCard
          title="Headers"
          subtitle={`${plural(pipe.headers.length, "distinct header")} across ${plural(pipe.setup.filter((s) => !s.ignored).length, "tab")} — each mapped once.`}
          right={<span className={cn(TAG, TONE_TAG.muted)}>{templateHits}/{pipe.headers.length} from template</span>}
        >
          <div className="space-y-2">
            {pipe.headers.map((h) => {
              const merged = h.target && (byTarget.get(h.target)?.length ?? 0) > 1 ? byTarget.get(h.target)! : null
              return (
                <div key={h.key} className={cn("rounded-lg border p-2", h.pending ? "border-violet-200 bg-violet-50/40" : !h.target ? "border-dashed border-border" : "border-border")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-foreground">“{h.raw}”{h.tabs.length > 1 && <span className="text-[10px] font-normal text-muted-foreground">in {h.tabs.length} tabs</span>}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{h.samples.join(" · ") || "no values"}</p>
                    </div>
                    {h.origin === "AI · to confirm" ? <ToConfirm ctx={ctx} id={`header:${h.key}`} /> : <OriginTag origin={h.pending ? "Suggestion" : h.origin} />}
                  </div>
                  <select
                    value={h.target}
                    onChange={(e) => choose(h.key, e.target.value)}
                    className={cn("mt-1.5 h-8 w-full rounded-md border bg-white px-1.5 text-xs outline-none", h.target ? "border-input" : required.has(h.pending?.target ?? "") ? "border-red-300" : "border-input")}
                  >
                    <option value="">— Not mapped (ignored) —</option>
                    <optgroup label="IMS fields">
                      {targets.map((t) => <option key={t.key} value={t.key}>{t.label}{required.has(t.key) ? " *" : ""}</option>)}
                    </optgroup>
                    <optgroup label="Developer custom fields">
                      {[...new Set([...custom, h.raw])].map((c) => <option key={c} value={`custom:${c}`}>Custom · {c}</option>)}
                    </optgroup>
                  </select>
                  {h.pending && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-violet-800"><Sparkles className="mr-0.5 inline h-3 w-3" />AI: {h.pending.target.startsWith("custom:") ? `custom field “${h.pending.target.slice(7)}”` : fieldLabel(h.pending.target)} · {h.pending.conf}%</span>
                      <Button size="sm" variant="outline" className="h-6 border-violet-300 px-2 text-[11px] text-violet-800" onClick={() => choose(h.key, h.pending!.target)}>Accept</Button>
                    </div>
                  )}
                  {merged && <p className="mt-1 text-[11px] text-muted-foreground">Merged with {merged.filter((x) => x !== h.raw).map((x) => `“${x}”`).join(", ")} → one {fieldLabel(h.target)} field.</p>}
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">On Next, these pairs join {pipe.devName || "the developer"}&apos;s template for {work.saleType || "this sale type"} — the next sheet maps itself.</p>
        </PanelCard>
      ) : (
        <PanelCard title="Nothing to map">
          <p className="text-xs text-muted-foreground">Extracted data already uses IMS fields — this stage passes itself. {plural(pipe.extracted.length, "row")} arrive mapped.</p>
        </PanelCard>
      )}
    </>
  )
  return <Workspace left={<DataPane ctx={ctx} sheets={sheets} grid={{ viewLabels: { input: "Stacked tabs", output: "IMS fields" }, focus, onClearFocus: () => setFocus(null) }} />} right={right} />
}

/* ── Stage 4 · Project assignment — name match → rules → known codes → AI ── */

const HOW_ORDER = ["Name match", "Rule", "Known code", "Suggestion", "No project"] as const

export function StageProjects({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [adding, setAdding] = useState(false)
  const label = (id?: string) => pipe.options.find((o) => o.id === id)?.label ?? "—"
  const howOf = (r: URow) => (r.projectId ? r.how ?? "Rule" : r.how === "Suggestion" ? "Suggestion" : "No project")
  const counts = HOW_ORDER.map((h) => ({ h, rows: pipe.assigned.filter((r) => howOf(r) === h) }))
  const savedRules = pipe.rules.filter((r) => r.origin === "saved")
  const newRules = work.projectRules
  const ruleRows = (r: ProjectRule) => pipe.assigned.filter((x) => matchesFilters(x, r.filters)).length
  const sheets: GridSheet[] = [{
    name: "Rows",
    input: unitTable(pipe.mapped, pipe.fields, [src]),
    output: unitTable(pipe.assigned, pipe.fields, [{ col: { key: "_how", label: "Assigned by" }, get: howOf }, { col: { key: "_sug", label: "Suggested project" }, get: (r) => (r.suggested ? label(r.suggested) : null) }, src]),
  }]
  const accept = (r: ProjectRule) => { set((w) => ({ projectRules: [...w.projectRules, { ...r, origin: "ai" }] })); toast.success(`Rule saved — ${filtersText(r.filters)} → ${label(r.projectId)}`) }

  const assignSelected = (rowIds: string[], projectId: string) => {
    const rows = pipe.assigned.filter((r) => rowIds.includes(r.id))
    const shared = (["building", "model", "phase"] as FieldKey[]).find((f) => { const v = txt(rows[0]?.v[f]); return v && rows.every((r) => txt(r.v[f]) === v) && pipe.assigned.filter((r) => txt(r.v[f]) === v).length === rows.length })
    const filters: RowFilter[] = shared ? [{ field: shared, op: "is", value: txt(rows[0].v[shared]) }] : [{ field: "unitCode", op: "in", value: rows.map((r) => txt(r.v.unitCode) || r.id).join(", ") }]
    set((w) => ({ projectRules: [...w.projectRules, { id: `rule-${Date.now()}`, filters, projectId, origin: "new" }] }))
    toast.success(`${plural(rows.length, "row")} → ${label(projectId)}, saved as a rule`)
  }

  const ruleCard = (r: ProjectRule, kind: "saved" | "new") => {
    const off = work.disabledRules.includes(r.id)
    return (
      <div key={r.id} className={cn("rounded-lg border p-2", off ? "border-dashed border-border opacity-60" : "border-border")}>
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-xs"><b className="font-medium">{filtersText(r.filters)}</b><ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />{label(r.projectId)}</p>
          {kind === "saved"
            ? <Switch checked={!off} onCheckedChange={(v) => set((w) => ({ disabledRules: v ? w.disabledRules.filter((x) => x !== r.id) : [...w.disabledRules, r.id] }))} />
            : <button type="button" onClick={() => set((w) => ({ projectRules: w.projectRules.filter((x) => x.id !== r.id) }))} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {r.origin === "ai" && work.toConfirm.includes(`rule:${r.id}`) ? <ToConfirm ctx={ctx} id={`rule:${r.id}`} /> : <OriginTag origin={kind === "saved" ? "Saved" : r.origin === "ai" ? "AI" : "New"} />}
          <span>{plural(ruleRows(r), "row")}</span>
          {r.note && <span>· {r.note}</span>}
        </div>
      </div>
    )
  }

  const right = (
    <>
      <PanelCard title="How rows got their project">
        <div className="grid grid-cols-2 gap-2">
          {counts.map(({ h, rows }) => (
            <MiniStat key={h} label={h} value={rows.length} tone={h === "No project" && rows.length ? "error" : h === "Suggestion" && rows.length ? "violet" : undefined} onClick={rows.length ? () => setFocus({ rowIds: rows.map((r) => r.id), label: `rows by ${h.toLowerCase()}` }) : undefined} />
          ))}
        </div>
      </PanelCard>

      {pipe.suggestions.length > 0 && (
        <PanelCard tone="ai" title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />Suggested rules</>} subtitle="Filter rules, never per-row answers. Accept → saved for the developer.">
          <div className="space-y-2">
            {pipe.suggestions.map((r) => (
              <div key={r.id} className="rounded-lg border border-violet-200 bg-card p-2">
                <p className="text-xs"><b className="font-medium">{filtersText(r.filters)}</b><ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />{label(r.projectId)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{r.note} · {r.conf}%</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => accept(r)}>Accept as rule</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => set((w) => ({ dismissedSuggestions: [...w.dismissedSuggestions, r.id] }))}>Dismiss</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setFocus({ rowIds: pipe.assigned.filter((x) => matchesFilters(x, r.filters)).map((x) => x.id), label: "rows this rule would assign" })}>Show rows</Button>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      <PanelCard title={`${pipe.devName || "Developer"}'s rules`} subtitle="Per project and phase — they run after name matching." right={<Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setAdding(true)}><Plus className="h-3 w-3" />Add rule</Button>}>
        <div className="space-y-2">
          {savedRules.length === 0 && newRules.length === 0 && empty("No rules yet — names and known codes placed every row so far.")}
          {savedRules.map((r) => ruleCard(r, "saved"))}
          {newRules.map((r) => ruleCard(r, "new"))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Select rows in the grid to assign them — the selection is saved as a rule.</p>
      </PanelCard>
      <RuleDialog open={adding} onClose={() => setAdding(false)} fields={pipe.fields.filter((f) => f.key !== "project")} options={pipe.options.map((o) => ({ id: o.id, label: o.label }))} onSave={(filters, projectId) => { set((w) => ({ projectRules: [...w.projectRules, { id: `rule-${Date.now()}`, filters, projectId, origin: "new" }] })); setAdding(false) }} />
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} grid={{
        initialGroupBy: "_how",
        focus, onClearFocus: () => setFocus(null),
        markCell: (_, rowId, key, view) => (view !== "input" && key === "_how" && !pipe.assigned.find((r) => r.id === rowId)?.projectId ? { tone: "error", note: "No project yet" } : null),
        bulkActions: ({ rowIds, clear }) => <AssignProject options={pipe.options.map((o) => ({ id: o.id, label: o.label }))} onPick={(id) => { assignSelected(rowIds, id); clear() }} />,
      }} />}
      right={right}
    />
  )
}

function AssignProject({ options, onPick }: { options: { id: string; label: string }[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">Assign to project</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {options.map((o) => <button key={o.id} type="button" onClick={() => { onPick(o.id); setOpen(false) }} className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-secondary">{o.label}</button>)}
      </PopoverContent>
    </Popover>
  )
}

function RuleDialog({ open, onClose, fields, options, onSave }: { open: boolean; onClose: () => void; fields: FieldDef[]; options: { id: string; label: string }[]; onSave: (f: RowFilter[], projectId: string) => void }) {
  const [filters, setFilters] = useState<RowFilter[]>([{ field: "building", op: "contains", value: "" }])
  const [projectId, setProjectId] = useState(options[0]?.id ?? "")
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-base font-semibold">New project rule</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">Rows matching every filter go to the project — saved for the developer.</p>
        <FilterEditor fields={fields} value={filters} onChange={setFilters} />
        <Field label="Project or phase" required>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none">
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!filters.length || !projectId} onClick={() => onSave(filters, projectId)}>Save rule</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Stage 5 · Transformation — saved, reusable actions ─────────────────── */

export function StageTransform({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [editing, setEditing] = useState<Action | null>(null)
  const custom = customColsOf(pipe.transformed)
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.assigned, pipe.fields, [], custom), output: unitTable(pipe.transformed, pipe.fields, [], custom) }]
  const ids = pipe.actions.map((a) => a.id)
  const move = (id: string, dir: -1 | 1) => {
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    const next = [...ids];[next[i], next[j]] = [next[j], next[i]]
    set({ actionOrder: next })
  }
  const toggleOn = (id: string, on: boolean) => set((w) => ({ disabledActions: on ? w.disabledActions.filter((x) => x !== id) : [...w.disabledActions, id] }))
  const saveAction = (a: Action) => {
    set((w) => a.origin === "saved"
      ? { editedActions: { ...w.editedActions, [a.id]: a } }
      : { actions: w.actions.some((x) => x.id === a.id) ? w.actions.map((x) => (x.id === a.id ? a : x)) : [...w.actions, a] })
    setEditing(null)
    toast.success(`${a.title} — saved`)
  }
  const blank = (kind: ActionKind, patch: Partial<Action> = {}): Action => ({ id: `act-${Date.now()}`, kind, title: "", detail: "", scope: { developer: pipe.devName, project: pipe.options.find((o) => !o.isPhase)?.label, saleType: work.saleType, entryType: work.dataType }, origin: "new", ...patch })
  const acceptProposal = (ids: string[]) => {
    const props = pipe.proposals.filter((p) => ids.includes(p.id))
    set((w) => ({
      actions: [...w.actions, ...props.filter((p) => p.verb === "add").map((p) => ({ ...p.action, origin: "new" as const }))],
      disabledActions: [...new Set([...w.disabledActions, ...props.filter((p) => p.verb === "drop").map((p) => p.action.id)])],
      dismissedProposals: [...w.dismissedProposals, ...props.filter((p) => p.verb === "keep").map((p) => p.id)],
    }))
  }
  const byVerb = (v: string) => pipe.proposals.filter((p) => p.verb === v)

  const right = (
    <>
      <PanelCard
        title="Mandatory fields"
        tone={pipe.mandatory.some((m) => m.blocking) || pipe.duplicates.length ? "error" : undefined}
        subtitle="After every action ran — fix with an action so the next entry is fixed too."
      >
        {!pipe.mandatory.length && !pipe.duplicates.length ? <p className="text-xs text-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5" />No blank required values, no duplicate codes.</p> : (
          <div className="space-y-1.5">
            {pipe.duplicates.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/50 px-2 py-1.5">
                <button type="button" onClick={() => setFocus({ rowIds: pipe.duplicates.flat(), label: "duplicate unit codes" })} className="text-left text-xs text-red-800 hover:underline"><b>{pipe.duplicates.length}</b> unit code{pipe.duplicates.length > 1 ? "s" : ""} appear twice</button>
                <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => set((w) => ({ actions: [...w.actions, { ...blank("dedupe"), id: "act-dedupe", keep: "latest", title: "Keep the latest row per unit code", detail: "Duplicate codes fixed in bulk" }] }))}>Fix in bulk</Button>
              </div>
            )}
            {pipe.mandatory.map((m) => (
              <div key={m.field} className={cn("flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5", m.blocking ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/40")}>
                <button type="button" onClick={() => setFocus({ rowIds: m.rowIds, label: `units missing ${FIELD_LABEL[m.field].toLowerCase()}` })} className={cn("text-left text-xs hover:underline", m.blocking ? "text-red-800" : "text-amber-900")}>
                  <b>{m.rowIds.length}</b> unit{m.rowIds.length > 1 ? "s" : ""} missing {FIELD_LABEL[m.field].toLowerCase()}{!m.blocking && " · optional"}
                </button>
                <Button size="sm" variant="outline" className="h-6 bg-white px-2 text-[11px]" onClick={() => setEditing(blank(pipe.matched.some((r) => r.dbId) && m.field !== "deliveryDate" ? "lookup" : m.field === "deliveryDate" ? "lookup" : "fill", { field: m.field, fields: [m.field], lookup: m.field === "deliveryDate" ? "project" : "unit", filters: [{ field: m.field, op: "blank" }] }))}>
                  Create fill action
                </Button>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="Actions"
        subtitle="Saved actions replay first, in order. Switch one off for this entry, or edit it for the developer."
        right={<Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setEditing(blank("fill"))}><Plus className="h-3 w-3" />Add action</Button>}
      >
        <div className="space-y-2">
          {pipe.actions.length === 0 && empty("No actions yet.")}
          {pipe.actions.map((a, i) => (
            <div key={a.id} className={cn("rounded-lg border p-2", !a.enabled ? "border-dashed border-border opacity-60" : a.hits.length ? "border-emerald-200 bg-emerald-50/20" : "border-border")}>
              <div className="flex items-start gap-1.5">
                <div className="flex flex-col pt-0.5 text-muted-foreground">
                  <button type="button" disabled={i === 0} onClick={() => move(a.id, -1)} className="hover:text-foreground disabled:opacity-30" title="Run earlier"><ArrowUp className="h-3 w-3" /></button>
                  <button type="button" disabled={i === pipe.actions.length - 1} onClick={() => move(a.id, 1)} className="hover:text-foreground disabled:opacity-30" title="Run later"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-5 text-foreground">{a.title}</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">{a.detail}{a.filters?.length ? ` · where ${filtersText(a.filters)}` : ""}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {work.toConfirm.includes(`action:${a.id}`) ? <ToConfirm ctx={ctx} id={`action:${a.id}`} /> : <OriginTag origin={work.editedActions[a.id] ? "Edited" : a.origin === "saved" ? "Saved" : a.origin === "ai" ? "AI" : "New"} />}
                    <span className="truncate text-[10px] text-muted-foreground">{[a.scope.developer, a.scope.project, a.scope.saleType, a.scope.entryType === "Automatic" ? "with codes" : a.scope.entryType ? "no codes" : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                  {a.health && <p className="mt-0.5 text-[10px] text-muted-foreground">Held up on {a.health.applied - a.health.overridden} of {a.health.applied} entries{a.lastUsed ? ` · last used ${displayCell(a.lastUsed, "date")}` : ""}</p>}
                  <button type="button" disabled={!a.hits.length} onClick={() => setFocus({ rowIds: a.hits, label: a.title })} className="mt-0.5 text-[11px] font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                    {plural(a.hits.length, "row")} {a.enabled ? (a.kind === "dedupe" ? "removed" : "changed") : "would change"}
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Switch checked={a.enabled} onCheckedChange={(v) => toggleOn(a.id, v)} title="On for this entry" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(a)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem>
                      {a.origin !== "saved" && <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => set((w) => ({ actions: w.actions.filter((x) => x.id !== a.id) }))}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        tone="ai"
        title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />AI suggestions</>}
        subtitle="Sees sample rows and every saved action — answers keep, modify, add or drop."
        right={!pipe.showProposals ? <Button size="sm" variant="outline" className="h-7 gap-1 border-violet-300 px-2 text-xs text-violet-800" onClick={() => set({ suggested: true })}><Wand2 className="h-3 w-3" />Suggest actions</Button> : byVerb("add").length + byVerb("drop").length > 0 ? <Button size="sm" className="h-7 px-2 text-xs" onClick={() => acceptProposal(pipe.proposals.map((p) => p.id))}>Accept all</Button> : undefined}
      >
        {!pipe.showProposals ? <p className="text-xs text-muted-foreground">Ask when the layout is new or saved actions keep getting overridden.</p> : pipe.proposals.length === 0 ? <p className="text-xs text-muted-foreground">Nothing to add — the saved actions cover this layout.</p> : (
          <div className="space-y-2">
            {(["add", "modify", "drop", "keep"] as const).map((verb) => byVerb(verb).length > 0 && (
              <div key={verb}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{verb}</p>
                <div className="space-y-1.5">
                  {byVerb(verb).map((p) => (
                    <div key={p.id} className="rounded-lg border border-border p-2">
                      <p className="text-xs font-medium">{p.action.title}</p>
                      <p className="text-[11px] text-muted-foreground">{p.reason}</p>
                      {verb !== "keep" && (
                        <div className="mt-1.5 flex gap-1.5">
                          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => acceptProposal([p.id])}>{verb === "drop" ? "Switch off" : "Accept"}</Button>
                          {verb === "add" && <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setEditing({ ...p.action, origin: "new" })}>Edit first</Button>}
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => set((w) => ({ dismissedProposals: [...w.dismissedProposals, p.id] }))}>Dismiss</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
      {editing && <ActionEditor ctx={ctx} action={editing} onClose={() => setEditing(null)} onSave={saveAction} />}
    </>
  )
  return <Workspace left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{ focus, onClearFocus: () => setFocus(null) }} />} right={right} />
}

/** One action — kind, target, parameters, row filters and scope, with a live preview count. */
export function ActionEditor({ ctx, action, onClose, onSave }: { ctx: StageCtx; action: Action; onClose: () => void; onSave: (a: Action) => void }) {
  const { pipe } = ctx
  const [a, setA] = useState<Action>(action)
  const fields = pipe.fields
  const patch = (p: Partial<Action>) => setA((x) => ({ ...x, ...p }))
  const fieldDef = fields.find((f) => f.key === a.field)
  const box = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none focus:border-primary"
  const preview = useMemo(() => applyActions(pipe.assigned, [a], { dbById: pipe.dbById, projectData }).hits[a.id]?.length ?? 0, [a, pipe.assigned, pipe.dbById])
  const autoTitle = (x: Action): string => {
    const f = x.field ? FIELD_LABEL[x.field] : ""
    switch (x.kind) {
      case "fill": return `${f} → “${x.value ?? ""}”`
      case "lookup": return `Fill ${(x.fields ?? []).map((k) => FIELD_LABEL[k]).join(", ") || "fields"} from the ${x.lookup === "project" ? "project" : x.lookup === "previous" ? "previous entry" : "matched IMS unit"}`
      case "replace": return `${f}: “${x.find ?? ""}” → “${x.replace ?? ""}”`
      case "split": return x.split === "type-beds" ? "Split bedrooms out of the type" : x.split === "range" ? `Split the ${f} range into from / to` : `Split ${x.from?.[0] ? FIELD_LABEL[x.from[0]] : ""} on “${x.sep ?? ""}”`
      case "merge": return `${f} = ${(x.from ?? []).map((k) => FIELD_LABEL[k]).join(` “${x.sep ?? "-"}” `)}`
      case "formula": return x.formula === "per-sqm" ? "Price per m² → total price" : x.formula === "delivery-type" ? "Delivery type from the delivery text" : `${f} × ${x.factor ?? 1}`
      case "dedupe": return `Keep the ${x.keep ?? "latest"} row per unit code`
    }
  }
  const ok = a.kind === "dedupe" || a.kind === "split" || (a.kind === "formula" && (a.formula !== "multiply" || (a.field && a.factor))) || (a.kind === "lookup" && a.fields?.length) || (a.kind === "fill" && a.field && a.value) || (a.kind === "replace" && a.field && a.find) || (a.kind === "merge" && a.field && (a.from?.length ?? 0) >= 2)
  const valueInput = fieldDef?.options ? (
    <select value={a.value ?? ""} onChange={(e) => patch({ value: e.target.value })} className={box}><option value="">—</option>{fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
  ) : fieldDef?.type === "date" ? (
    <input type="date" value={a.value ?? ""} onChange={(e) => patch({ value: e.target.value })} className={box} />
  ) : <input value={a.value ?? ""} onChange={(e) => patch({ value: e.target.value })} placeholder="Value" className={box} inputMode={fieldDef?.type === "number" || fieldDef?.type === "money" ? "decimal" : undefined} />
  const fieldSelect = (value: FieldKey | undefined, onChange: (k: FieldKey) => void) => (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value as FieldKey)} className={box}><option value="">Field…</option>{fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="border-b border-border px-5 py-3">
          <DialogTitle className="text-base font-semibold">{action.title ? "Edit action" : "New action"}</DialogTitle>
          <p className="text-xs text-muted-foreground">Actions are the only way sheet data changes — saved and replayed on the developer&apos;s next entry.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Field label="Action">
            <select value={a.kind} onChange={(e) => patch({ kind: e.target.value as ActionKind })} className={box} disabled={action.origin === "saved"}>
              {ACTION_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">{ACTION_KINDS.find((k) => k.kind === a.kind)?.hint}</p>
          </Field>
          {a.kind === "fill" && <div className="grid grid-cols-2 gap-2"><Field label="Field">{fieldSelect(a.field, (k) => patch({ field: k, value: "" }))}</Field><Field label="Value">{valueInput}</Field></div>}
          {a.kind === "lookup" && (
            <>
              <Field label="From">
                <Segmented value={a.lookup ?? "unit"} options={["unit", "project", "previous"] as const} labels={{ unit: "Matched IMS unit", project: "Project data", previous: "Previous entry" }} onChange={(v) => patch({ lookup: v })} size="sm" />
              </Field>
              <Field label="Fill these blanks">
                <div className="flex flex-wrap gap-1.5">
                  {fields.filter((f) => f.key !== "project" && f.key !== "unitCode").map((f) => {
                    const on = a.fields?.includes(f.key)
                    return <button key={f.key} type="button" onClick={() => patch({ fields: on ? a.fields?.filter((x) => x !== f.key) : [...(a.fields ?? []), f.key] })} className={cn(TAG, on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>{f.label}</button>
                  })}
                </div>
              </Field>
            </>
          )}
          {a.kind === "replace" && <div className="grid grid-cols-3 gap-2"><Field label="Field">{fieldSelect(a.field, (k) => patch({ field: k }))}</Field><Field label="Find"><input value={a.find ?? ""} onChange={(e) => patch({ find: e.target.value })} className={box} /></Field><Field label="Replace with"><input value={a.replace ?? ""} onChange={(e) => patch({ replace: e.target.value })} className={box} /></Field></div>}
          {a.kind === "split" && (
            <Field label="How">
              <Segmented value={a.split ?? "type-beds"} options={["type-beds", "range", "separator"] as const} labels={{ "type-beds": "Type + bedrooms", range: "Range → from / to", separator: "On a separator" }} onChange={(v) => patch({ split: v, field: v === "type-beds" ? "propertyType" : v === "range" ? "bua" : a.field })} size="sm" />
              {a.split === "range" && <div className="mt-2">{fieldSelect(a.field, (k) => patch({ field: k }))}</div>}
              {a.split === "separator" && <div className="mt-2 grid grid-cols-3 gap-2">{fieldSelect(a.from?.[0], (k) => patch({ from: [k] }))}<input value={a.sep ?? ""} onChange={(e) => patch({ sep: e.target.value })} placeholder="Separator" className={box} />{fieldSelect(a.field, (k) => patch({ field: k }))}</div>}
            </Field>
          )}
          {a.kind === "merge" && <div className="grid grid-cols-4 gap-2">{fieldSelect(a.from?.[0], (k) => patch({ from: [k, a.from?.[1] ?? "building"] }))}<input value={a.sep ?? "-"} onChange={(e) => patch({ sep: e.target.value })} className={box} />{fieldSelect(a.from?.[1], (k) => patch({ from: [a.from?.[0] ?? "building", k] }))}{fieldSelect(a.field, (k) => patch({ field: k }))}</div>}
          {a.kind === "formula" && (
            <Field label="Formula">
              <Segmented value={a.formula ?? "per-sqm"} options={["per-sqm", "multiply", "delivery-type"] as const} labels={{ "per-sqm": "Price per m² × BUA", multiply: "Multiply", "delivery-type": "Delivery type" }} onChange={(v) => patch({ formula: v, field: v === "per-sqm" ? "price" : v === "delivery-type" ? "deliveryType" : a.field })} size="sm" />
              {a.formula === "multiply" && <div className="mt-2 grid grid-cols-2 gap-2">{fieldSelect(a.field, (k) => patch({ field: k }))}<input type="number" value={a.factor ?? ""} onChange={(e) => patch({ factor: Number(e.target.value) })} placeholder="× factor" className={box} /></div>}
            </Field>
          )}
          {a.kind === "dedupe" && <Field label="Keep"><Segmented value={a.keep ?? "latest"} options={["latest", "first"] as const} labels={{ latest: "Latest row", first: "First row" }} onChange={(v) => patch({ keep: v })} size="sm" /></Field>}
          {a.kind !== "dedupe" && (
            <Field label="Only rows where">
              <FilterEditor fields={fields} value={a.filters ?? []} onChange={(f) => patch({ filters: f })} />
            </Field>
          )}
          <Field label="Saved for">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className={cn(TAG, TONE_TAG.muted)}>{a.scope.developer || "Developer"}</span>
              <button type="button" onClick={() => patch({ scope: { ...a.scope, project: a.scope.project ? undefined : pipe.options.find((o) => !o.isPhase)?.label } })} className={cn(TAG, a.scope.project ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{a.scope.project ? `Project · ${a.scope.project}` : "Every project"}</button>
              <button type="button" onClick={() => patch({ scope: { ...a.scope, saleType: a.scope.saleType ? "" : ctx.work.saleType } })} className={cn(TAG, a.scope.saleType ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{a.scope.saleType || "Every sale type"}</button>
              <button type="button" onClick={() => patch({ scope: { ...a.scope, entryType: a.scope.entryType ? undefined : ctx.work.dataType } })} className={cn(TAG, a.scope.entryType ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{a.scope.entryType ? (a.scope.entryType === "Automatic" ? "With codes" : "No codes") : "Every entry type"}</button>
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className={cn(TAG, preview ? TONE_TAG.ok : TONE_TAG.muted)}>Would change {plural(preview, "row")}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!ok} onClick={() => onSave({ ...a, title: a.origin === "saved" && action.title ? action.title : autoTitle(a), detail: a.detail || ACTION_KINDS.find((k) => k.kind === a.kind)?.label || "" })}>Save action</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Stage 6 · Standardization — every value an IMS value ──────────────── */

export function StageStandard({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const [showKnown, setShowKnown] = useState(false)
  const custom = customColsOf(pipe.standardized)
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.transformed, pipe.fields, [], custom), output: unitTable(pipe.standardized, pipe.fields, [], custom) }]
  const choose = (field: FieldKey, raw: string, value: string) => { set((w) => ({ valueChoices: { ...w.valueChoices, [`${field}:${raw}`]: value } })); ctx.confirm([`value:${field}:${raw}`]) }
  const bySource = useMemo(() => {
    const m = new Map<string, number>()
    pipe.known.forEach((k) => m.set(k.source, (m.get(k.source) ?? 0) + k.rows))
    return [...m.entries()]
  }, [pipe.known])
  const unknownByField = useMemo(() => {
    const m = new Map<FieldKey, typeof pipe.unknown>()
    pipe.unknown.forEach((u) => m.set(u.field, [...(m.get(u.field) ?? []), u]))
    return [...m.entries()]
  }, [pipe.unknown])
  const formats = pipe.known.filter((k) => k.source === "Format")
  const aiChosen = pipe.known.filter((k) => k.source === "AI · to confirm")

  const right = (
    <>
      <PanelCard
        title={pipe.unknown.length ? <><CircleAlert className="h-3.5 w-3.5 text-red-600" />Values not in IMS yet</> : <><Check className="h-3.5 w-3.5 text-emerald-600" />Every value is known</>}
        tone={pipe.unknown.length ? "error" : undefined}
        subtitle="One choice maps every row with that value — and joins the developer's vocabulary."
      >
        {!pipe.unknown.length ? <p className="text-xs text-muted-foreground">{pipe.extracted.length && !pipe.headers.length ? "Extracted values arrive typed — this stage passed itself." : "Known values came from the developer's vocabulary, IMS lists and the format parsers."}</p> : (
          <div className="space-y-3">
            {unknownByField.map(([field, list]) => {
              const def = pipe.fields.find((f) => f.key === field)
              return (
                <div key={field}>
                  <p className="mb-1 text-xs font-semibold text-foreground">{FIELD_LABEL[field]}</p>
                  <div className="space-y-1.5">
                    {list.map((u) => (
                      <div key={u.raw} className="rounded-lg border border-red-200 bg-red-50/30 p-1.5">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setFocus({ rowIds: u.rowIds, label: `${FIELD_LABEL[field]} “${u.raw}”` })} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-red-800 hover:underline">“{u.raw}” · {plural(u.rowIds.length, "row")}</button>
                          {def?.options ? (
                            <select value="" onChange={(e) => e.target.value && choose(field, u.raw, e.target.value)} className="h-7 w-36 rounded-md border border-red-300 bg-white px-1 text-xs outline-none">
                              <option value="">Map to…</option>
                              {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : def?.type === "date" ? (
                            <input type="date" onChange={(e) => e.target.value && choose(field, u.raw, e.target.value)} className="h-7 w-36 rounded-md border border-red-300 bg-white px-1 text-xs outline-none" />
                          ) : (
                            <input placeholder="Number" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLInputElement).value) choose(field, u.raw, (e.target as HTMLInputElement).value) }} className="h-7 w-28 rounded-md border border-red-300 bg-white px-1.5 text-xs outline-none" />
                          )}
                        </div>
                        {u.suggestion && (
                          <button type="button" onClick={() => choose(field, u.raw, u.suggestion!.value)} className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:underline"><Sparkles className="h-3 w-3" />Use “{u.suggestion.value}” · {u.suggestion.conf}%</button>
                        )}
                        {u.note && <p className="mt-1 text-[11px] text-muted-foreground">{u.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PanelCard>

      {aiChosen.length > 0 && (
        <PanelCard tone="ai" title={<><Sparkles className="h-3.5 w-3.5 text-violet-500" />AI choices to confirm</>} subtitle="Limited to the field's IMS values. Confirmed choices join the vocabulary.">
          <div className="space-y-1">
            {aiChosen.map((k) => (
              <div key={`${k.field}|${k.raw}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate"><span className="text-muted-foreground">{FIELD_LABEL[k.field]}:</span> “{k.raw}” <ArrowRight className="inline h-3 w-3 text-muted-foreground" /> <b>{displayCell(k.to)}</b></span>
                <button type="button" onClick={() => ctx.confirm([`value:${k.field}:${k.raw}`])} className="text-[11px] font-medium text-violet-700 hover:underline">Confirm</button>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      <PanelCard title="Formats">
        <Field label="Dates" hint={pipe.ambiguous ? `${plural(pipe.ambiguous, "date")} like 03/04/2028 read either way — this decides.` : "Quarters, months and years land on the period's last day."}>
          <Segmented value={work.dateFormat === "DMY" ? "DD/MM/YYYY" : "MM/DD/YYYY"} options={["DD/MM/YYYY", "MM/DD/YYYY"] as const} onChange={(v) => set({ dateFormat: v === "DD/MM/YYYY" ? "DMY" : "MDY" })} size="sm" />
        </Field>
        <p className="mt-2.5 text-xs font-semibold text-foreground">Numbers</p>
        <p className="text-[11px] text-muted-foreground">{formats.filter((f) => f.field === "price" || f.field === "priceTo").length ? `${plural(formats.filter((f) => f.field === "price" || f.field === "priceTo").reduce((n, f) => n + f.rows, 0), "price")} parsed — shorthand like 4.8M, separators and EGP.` : "Prices arrive as plain numbers."} {formats.filter((f) => f.field === "bua" || f.field === "bedrooms").length ? `Areas and bedrooms lose their units (“132 m²” → 132).` : ""}</p>
      </PanelCard>

      <PanelCard title="Known values" right={<button type="button" onClick={() => setShowKnown((v) => !v)} className="text-[11px] font-medium text-primary hover:underline">{showKnown ? "Hide" : "Show"}</button>}>
        <div className="flex flex-wrap gap-1.5">
          {bySource.map(([source, n]) => <span key={source} className="inline-flex items-center gap-1 text-[11px]"><OriginTag origin={source} /><b>{n}</b></span>)}
          {!bySource.length && <span className="text-xs text-muted-foreground">Every value was already an IMS value.</span>}
        </div>
        {showKnown && (
          <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
            {pipe.known.slice(0, 80).map((k) => (
              <div key={`${k.field}|${k.raw}|${k.source}`} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate"><span className="text-muted-foreground">{FIELD_LABEL[k.field]}</span> “{k.raw}” → <b>{displayCell(k.to)}</b></span>
                <span className="text-muted-foreground">{k.rows}</span>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{
        focus, onClearFocus: () => setFocus(null),
        markCell: (_, rowId, key, view) => { if (view === "input") return null; const note = pipe.invalid.get(`${rowId}|${key}`); return note ? { tone: "error", note } : null },
      }} />}
      right={right}
    />
  )
}

/* ── Stage 7 · Matching — each row's twin in IMS ────────────────────────── */

const STATUS_LABEL = { new: "New", modified: "Modified", unmodified: "Unmodified", returned: "Returned", review: "Needs a decision" } as const

export function StageMatching({ ctx }: { ctx: StageCtx }) {
  const { pipe, work, set } = ctx
  const [focus, setFocus] = useFocus(ctx)
  const auto = work.dataType === "Automatic"
  const by = (s: string) => pipe.matched.filter((r) => (r.match?.status ?? "new") === s)
  const review = by("review")
  const custom = customColsOf(pipe.matched)
  const extra: Extra[] = [
    { col: { key: "_match", label: "Match" }, get: (r) => STATUS_LABEL[r.match?.status ?? "new"] },
    { col: { key: "_db", label: auto ? "IMS unit" : "IMS offering" }, get: (r) => (r.match?.dbId && r.match.status !== "new" ? `${pipe.dbById.get(r.match.dbId)?.label ?? ""} · ${r.match.dbId}` : null) },
    { col: { key: "_changed", label: "Changed fields" }, get: (r) => (r.match?.changed?.length ? r.match.changed.map((f) => FIELD_LABEL[f]).join(", ") : null) },
    { col: { key: "_conf", label: "Confidence" }, get: (r) => (r.match?.conf ? `${r.match.conf}%` : null) },
  ]
  const sheets: GridSheet[] = [{ name: "Units", input: unitTable(pipe.standardized, pipe.fields, [], custom), output: unitTable(pipe.matched, pipe.fields, extra, custom) }]
  const pick = (rowId: string, dbId: string) => { set((w) => ({ matchOverrides: { ...w.matchOverrides, [rowId]: dbId } })); ctx.confirm([`match:${rowId}`]) }
  const tiles = [
    { s: "new", tone: "blue" as const }, { s: "modified", tone: "warn" as const }, { s: "unmodified", tone: "muted" as const }, { s: "returned", tone: "violet" as const },
  ]

  const right = (
    <>
      <PanelCard title={auto ? "Matched by unit code" : "Matched by similarity"} subtitle={auto ? "Code + project across phases — found at Project Assignment, status on the final values." : "Area and price overlap, type, bedrooms, finishing, delivery."}>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => { const rows = by(t.s); return <MiniStat key={t.s} label={STATUS_LABEL[t.s as keyof typeof STATUS_LABEL]} value={rows.length} tone={rows.length ? t.tone : undefined} onClick={rows.length ? () => setFocus({ rowIds: rows.map((r) => r.id), label: `${t.s} rows` }) : undefined} /> })}
        </div>
        {!auto && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs"><span className="font-medium text-foreground">Similarity threshold</span><span className={cn(TAG, TONE_TAG.info)}>{work.threshold}%</span></div>
            <input type="range" min={50} max={95} step={5} value={work.threshold} onChange={(e) => set({ threshold: Number(e.target.value) })} className="mt-1.5 w-full accent-[hsl(var(--primary))]" />
            <p className="text-[11px] text-muted-foreground">Above it rows match on their own; between 50% and it they wait for you. Matched offerings inherit their plans and media.</p>
          </div>
        )}
      </PanelCard>

      {review.length > 0 && (
        <PanelCard tone="warn" title={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Uncertain matches</>} right={<span className={cn(TAG, TONE_TAG.warn)}>{review.length}</span>}>
          <div className="space-y-2">
            {review.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-2">
                <p className="text-[13px] font-medium text-foreground">{rowTitle(r)}</p>
                <p className="text-[11px] text-muted-foreground">{txt(r.v.project)} · row {r.idx}</p>
                <div className="mt-1.5 space-y-1">
                  {(r.match?.candidates ?? []).map((c) => (
                    <button key={c.dbId} type="button" onClick={() => pick(r.id, c.dbId)} className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-left text-xs hover:border-primary hover:bg-primary/5">
                      <span className="min-w-0 truncate">{c.label} <span className="text-muted-foreground">· {c.dbId}</span></span>
                      <span className={cn(TAG, c.conf >= 75 ? TONE_TAG.ok : TONE_TAG.warn)}>{c.conf}%</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => pick(r.id, "new")} className="w-full rounded-md border border-dashed border-border px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground">It&apos;s new — create it</button>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {pipe.conflicts.length > 0 && (
        <PanelCard tone="error" title={<><CircleAlert className="h-3.5 w-3.5 text-red-600" />Code conflicts</>} subtitle="These codes exist in IMS under a project outside this entry.">
          <div className="space-y-2">
            {pipe.conflicts.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-2">
                <p className="text-xs"><b className="font-mono">{txt(r.v.unitCode)}</b> · in IMS under <b>{r.conflict}</b></p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => pick(r.id, "new")}>Create it here as new</Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => { const d = pipe.db.find((x) => normCode(x.code) === normCode(r.v.unitCode)); if (d) pick(r.id, d.id) }}>Same unit — move it here</Button>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      <PanelCard title="Records this entry doesn't carry" subtitle={work.coverage === "full" ? "Listed here, decided in Final check (default Sold)." : "Partial update — they stay untouched."} right={<span className={cn(TAG, pipe.missing.length && work.coverage === "full" ? TONE_TAG.error : TONE_TAG.muted)}>{pipe.missing.length}</span>}>
        {pipe.missing.length ? (
          <div className="max-h-40 space-y-0.5 overflow-y-auto">
            {pipe.missing.slice(0, 40).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-mono">{d.code ?? d.label}</span>
                <span className="text-[11px] text-muted-foreground">last seen {fmtDateTime(d.lastSeen).split(",")[0]}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Every IMS record in these projects is in the entry.</p>}
      </PanelCard>
    </>
  )
  return (
    <Workspace
      left={<DataPane ctx={ctx} sheets={sheets} title="Units" grid={{
        focus, onClearFocus: () => setFocus(null),
        markCell: (_, rowId, key, view) => {
          if (view === "input") return null
          const r = pipe.matched.find((x) => x.id === rowId)
          if (key === "_match") { const s = r?.match?.status; return s === "review" ? { tone: "warn", note: "Pick a match in the panel" } : s === "new" ? { tone: "info", note: r?.match?.how } : s === "returned" ? { tone: "ok", note: "Sold or archived in IMS — comes back" } : null }
          if (r?.match?.changed?.includes(key as FieldKey)) { const d = pipe.dbById.get(r.match.dbId!); return { tone: "warn", note: `IMS today: ${displayCell(d?.v[key as FieldKey], pipe.fields.find((f) => f.key === key)?.type) || "—"}` } }
          return null
        },
      }} />}
      right={right}
    />
  )
}

export { GripVertical, Undo2 }

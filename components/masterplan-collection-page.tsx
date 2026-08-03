"use client"

// Masterplan Collection — the Data Ops ↔ Dev Relations workflow for chasing
// missing numbered masterplans:
//   To Do (Data Ops researches) → Pending Collection (Dev Relations asks the
//   developer, uploads) → Pending Review (Data Ops reviews) → Ingested, or
//   rejected with a reason back to Pending Collection.
// Rows are the real PROJECTS that are missing a numbered (listing) masterplan.

import { useMemo, useRef, useState } from "react"
import {
  Building2, Layers, GitBranch, MoreHorizontal, Eye, Upload, MessageSquare,
  ClipboardCheck, Send, CheckCircle, XCircle, Search as SearchIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCard, TableCardHeader, TableFooter, FilterSelect, IdTag, COL_SEP } from "@/components/table-kit"
import { PROJECTS, type ProjectRow } from "@/lib/projects-mock"
import { Tag, LISTING_COLORS, ENTRY_COLORS, PRIMARY_COLORS, fmtDateTime } from "@/components/projects-list-page"

// ─── Workflow model ───────────────────────────────────────────────────────────

type CollStatus = "To Do" | "Pending Collection" | "Pending Review" | "Ingested"

const STATUS_COLORS: Record<CollStatus, string> = {
  "To Do": "bg-blue-100 text-blue-700 border-blue-200",
  "Pending Collection": "bg-amber-50 text-amber-700 border-amber-200",
  "Pending Review": "bg-indigo-100 text-indigo-700 border-indigo-200",
  Ingested: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

interface CollComment { author: "Data Ops" | "Dev Relations"; text: string; at: string }

interface CollItem {
  status: CollStatus
  /** Set when Data Ops rejected the last upload — cleared on the next upload. */
  rejection?: string
  upload?: { name: string; url: string; at: string }
  comments: CollComment[]
  updatedAt: string
}

const DEMO_MP = "/aerial-view-masterplan-residential-development-blu.jpg"

/** Every project/phase/sub missing a numbered (listing) masterplan enters the queue. */
function seedItems(): Map<string, CollItem> {
  const map = new Map<string, CollItem>()
  const missing = PROJECTS.filter((p) => !p.listingMasterplan)
  missing.forEach((p, i) => {
    const day = String(10 + (i % 18)).padStart(2, "0")
    const at = `2026-07-${day}T09:30:00Z`
    if (i % 4 === 1) {
      map.set(p.id, { status: "Pending Collection", comments: [
        { author: "Data Ops", text: "Couldn't find a numbered masterplan in the shared drive or the developer portal.", at },
      ], updatedAt: at })
    } else if (i % 4 === 3) {
      map.set(p.id, {
        status: "Pending Review",
        upload: { name: `numbered-masterplan-${p.id.toLowerCase()}.png`, url: DEMO_MP, at },
        comments: [{ author: "Dev Relations", text: "Got the high-res numbered masterplan from the developer's marketing team.", at }],
        updatedAt: at,
      })
    } else if (i % 8 === 6) {
      map.set(p.id, {
        status: "Pending Collection",
        rejection: "Resolution too low — unit numbers unreadable when zoomed.",
        comments: [
          { author: "Dev Relations", text: "Uploaded the masterplan from the sales kit.", at },
          { author: "Data Ops", text: "Rejected: resolution too low — unit numbers unreadable when zoomed.", at },
        ],
        updatedAt: at,
      })
    } else {
      map.set(p.id, { status: "To Do", comments: [], updatedAt: at })
    }
  })
  return map
}

const nowIso = () => new Date().toISOString()

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "data-ops" | "dev-relations"

export function MasterplanCollectionPage() {
  const queue = useMemo(() => PROJECTS.filter((p) => !p.listingMasterplan), [])
  const [items, setItems] = useState<Map<string, CollItem>>(seedItems)
  const [tab, setTab] = useState<TabKey>("data-ops")
  const [search, setSearch] = useState("")
  const [statusF, setStatusF] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewing, setViewing] = useState<ProjectRow | null>(null)
  const [dialog, setDialog] = useState<
    | { kind: "handoff" | "upload" | "review" | "comment"; p: ProjectRow }
    | null
  >(null)

  const itemOf = (p: ProjectRow) => items.get(p.id)!
  const patch = (id: string, fn: (it: CollItem) => CollItem) =>
    setItems((prev) => { const n = new Map(prev); n.set(id, fn(n.get(id)!)); return n })

  // ── Transitions ─────────────────────────────────────────────────────────────

  const markPendingCollection = (p: ProjectRow, note: string) => {
    patch(p.id, (it) => ({
      ...it, status: "Pending Collection", updatedAt: nowIso(),
      comments: note.trim() ? [...it.comments, { author: "Data Ops", text: note.trim(), at: nowIso() }] : it.comments,
    }))
    setDialog(null)
    toast.success(`${p.name} handed off to Dev Relations for masterplan collection`)
  }

  const uploadMasterplan = (p: ProjectRow, file: { name: string; url: string }) => {
    patch(p.id, (it) => ({
      ...it, status: "Pending Review", rejection: undefined, updatedAt: nowIso(),
      upload: { ...file, at: nowIso() },
    }))
    setDialog(null)
    toast.success(`${p.name} masterplan uploaded — pending Data Ops review`)
  }

  const acceptAndIngest = (p: ProjectRow) => {
    patch(p.id, (it) => ({ ...it, status: "Ingested", updatedAt: nowIso() }))
    // The ingested numbered masterplan now exists on the project itself
    const row = PROJECTS.find((x) => x.id === p.id)
    if (row) row.listingMasterplan = true
    setDialog(null)
    toast.success(`${p.name} masterplan ingested — it now appears on the Masterplans page and the project's Masterplans tab`)
  }

  const reject = (p: ProjectRow, reason: string) => {
    patch(p.id, (it) => ({
      ...it, status: "Pending Collection", rejection: reason, updatedAt: nowIso(),
      comments: [...it.comments, { author: "Data Ops", text: `Rejected: ${reason}`, at: nowIso() }],
    }))
    setDialog(null)
    toast.success(`${p.name} masterplan rejected — back with Dev Relations`)
  }

  const addComment = (p: ProjectRow, author: CollComment["author"], text: string) => {
    patch(p.id, (it) => ({ ...it, updatedAt: nowIso(), comments: [...it.comments, { author, text, at: nowIso() }] }))
    setDialog(null)
    toast.success("Comment added")
  }

  // ── Funnel measurement ──────────────────────────────────────────────────────

  const count = (s: CollStatus) => queue.filter((p) => itemOf(p).status === s).length
  const remaining = queue.length - count("Ingested")
  const stats: { label: string; value: number; sub: string; cls?: string }[] = [
    { label: "Remaining", value: remaining, sub: "projects still need a numbered masterplan" },
    { label: "To Do", value: count("To Do"), sub: "with Data Ops — research & check", cls: STATUS_COLORS["To Do"] },
    { label: "Pending Collection", value: count("Pending Collection"), sub: "with Dev Relations — chasing developers", cls: STATUS_COLORS["Pending Collection"] },
    { label: "Pending Review", value: count("Pending Review"), sub: "uploads awaiting Data Ops review", cls: STATUS_COLORS["Pending Review"] },
    { label: "Ingested", value: count("Ingested"), sub: "collected & live on Masterplans", cls: STATUS_COLORS.Ingested },
  ]

  // ── Rows per tab ────────────────────────────────────────────────────────────

  const TAB_STATUSES: Record<TabKey, CollStatus[]> = {
    "data-ops": ["To Do", "Pending Review"],
    "dev-relations": ["Pending Collection"],
  }
  const tabRows = queue.filter((p) => TAB_STATUSES[tab].includes(itemOf(p).status))
  const filtered = tabRows.filter((p) => {
    if (search && !`${p.id} ${p.name} ${p.mainProject?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusF && itemOf(p).status !== statusF) return false
    return true
  })
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const switchTab = (t: TabKey) => { setTab(t); setStatusF(""); setPage(1) }

  // ── Row bits ────────────────────────────────────────────────────────────────

  const levelIcon = (p: ProjectRow) =>
    p.isPhase ? <Layers className="h-4 w-4" /> : p.isSubProject ? <GitBranch className="h-4 w-4" /> : <Building2 className="h-4 w-4" />

  const rowMenu = (p: ProjectRow) => {
    const it = itemOf(p)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(p)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
          <DropdownMenuSeparator />
          {it.status === "To Do" && (
            <DropdownMenuItem onClick={() => setDialog({ kind: "handoff", p })}>
              <Send className="h-4 w-4 mr-2" />Mark Pending Collection
            </DropdownMenuItem>
          )}
          {it.status === "Pending Collection" && (
            <DropdownMenuItem onClick={() => setDialog({ kind: "upload", p })}>
              <Upload className="h-4 w-4 mr-2" />Upload Masterplan
            </DropdownMenuItem>
          )}
          {it.status === "Pending Review" && (
            <DropdownMenuItem onClick={() => setDialog({ kind: "review", p })}>
              <ClipboardCheck className="h-4 w-4 mr-2" />Review Masterplan
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDialog({ kind: "comment", p })}>
            <MessageSquare className="h-4 w-4 mr-2" />Add Comment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Masterplan Collection</h1>
        <p className="text-sm text-muted-foreground">
          Chase the numbered masterplans projects are missing — Data Ops research and review, Dev Relations collect from developers.
        </p>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
              {s.cls
                ? <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", s.cls)}>{s.label}</span>
                : <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</span>}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Team tabs */}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {([
          { key: "data-ops" as TabKey, label: "Data Ops", count: count("To Do") + count("Pending Review") },
          { key: "dev-relations" as TabKey, label: "Dev Relations", count: count("Pending Collection") },
        ]).map((t) => (
          <button
            key={t.key} type="button" onClick={() => switchTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0 text-[11px] font-medium text-blue-700">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Project name or ID" className="h-8 bg-white pl-8" />
        </div>
        {tab === "data-ops" && (
          <FilterSelect label="Status" value={statusF} options={["To Do", "Pending Review"]} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-40" />
        )}
      </div>

      <TableCard>
        <TableCardHeader title={tab === "data-ops" ? "Data Ops Queue" : "Dev Relations Queue"} count={filtered.length} />
        <div className="overflow-x-auto">
          <table className={cn("w-max min-w-full text-sm", COL_SEP)}>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Project Name</th>
                <th className="px-4 py-2.5">Developer</th>
                <th className="px-4 py-2.5">Area</th>
                <th className="px-4 py-2.5">District</th>
                <th className="px-4 py-2.5">Listing</th>
                <th className="px-4 py-2.5">Primary</th>
                <th className="px-4 py-2.5">Entry Type</th>
                <th className="px-4 py-2.5">Collection Status</th>
                <th className="px-4 py-2.5">Comments</th>
                <th className="px-4 py-2.5">Updated At</th>
                <th className="sticky right-0 z-10 bg-muted/40 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((p) => {
                const it = itemOf(p)
                return (
                  <tr key={p.id} className="group bg-card hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{levelIcon(p)}</span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                            {p.name}
                            {p.isPhase && <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1 py-0 text-[9px] font-medium leading-4 text-blue-700">Phase</span>}
                            {p.isSubProject && <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1 py-0 text-[9px] font-medium leading-4 text-indigo-700">Sub-Project</span>}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <IdTag value={p.id} />
                            {p.mainProject && <span className="truncate text-[10px] text-muted-foreground">in {p.mainProject.name}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm text-foreground">{p.developer.name}</p>
                      <IdTag value={p.developer.id} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted-foreground">{p.area}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted-foreground">{p.district}</td>
                    <td className="px-4 py-2.5"><Tag value={p.listingStatus} cls={LISTING_COLORS[p.listingStatus]} /></td>
                    <td className="px-4 py-2.5"><Tag value={p.primaryStatus} cls={PRIMARY_COLORS[p.primaryStatus]} /></td>
                    <td className="px-4 py-2.5"><Tag value={p.entryType} cls={ENTRY_COLORS[p.entryType]} /></td>
                    <td className="px-4 py-2.5">
                      <Tag value={it.status} cls={STATUS_COLORS[it.status]} />
                      {it.rejection && <p className="mt-1 max-w-52 truncate text-[11px] text-red-600" title={it.rejection}>{it.rejection}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {it.comments.length > 0 ? (
                        <button type="button" onClick={() => setViewing(p)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />{it.comments.length}
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(it.updatedAt)}</td>
                    <td className="sticky right-0 z-10 bg-card px-2 py-2.5 text-right group-hover:bg-muted/30">{rowMenu(p)}</td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing in this queue — all caught up.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="projects" />
      </TableCard>

      {/* View drawer — status, upload preview, comment thread */}
      <ViewDrawer
        p={viewing}
        item={viewing ? items.get(viewing.id) : undefined}
        onClose={() => setViewing(null)}
        onAction={(kind) => viewing && setDialog({ kind, p: viewing })}
      />

      {dialog?.kind === "handoff" && <HandoffDialog p={dialog.p} onClose={() => setDialog(null)} onConfirm={(note) => markPendingCollection(dialog.p, note)} />}
      {dialog?.kind === "upload" && <UploadDialog p={dialog.p} rejection={itemOf(dialog.p).rejection} onClose={() => setDialog(null)} onConfirm={(f) => uploadMasterplan(dialog.p, f)} />}
      {dialog?.kind === "review" && (
        <ReviewDialog p={dialog.p} upload={itemOf(dialog.p).upload} onClose={() => setDialog(null)} onAccept={() => acceptAndIngest(dialog.p)} onReject={(reason) => reject(dialog.p, reason)} />
      )}
      {dialog?.kind === "comment" && (
        <CommentDialog p={dialog.p} author={tab === "data-ops" ? "Data Ops" : "Dev Relations"} onClose={() => setDialog(null)} onConfirm={(author, text) => addComment(dialog.p, author, text)} />
      )}
    </div>
  )
}

// ─── Context header shared by the dialogs ─────────────────────────────────────

function ProjectContext({ p }: { p: ProjectRow }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
        <div className="flex items-center gap-1.5">
          <IdTag value={p.id} />
          {p.mainProject && <span className="truncate text-[10px] text-muted-foreground">in {p.mainProject.name}</span>}
        </div>
      </div>
      <span className="max-w-28 truncate text-xs text-muted-foreground">{p.developer.name}</span>
      <Tag value={p.listingStatus} cls={LISTING_COLORS[p.listingStatus]} />
      <Tag value={p.primaryStatus} cls={PRIMARY_COLORS[p.primaryStatus]} />
    </div>
  )
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function HandoffDialog({ p, onClose, onConfirm }: { p: ProjectRow; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Mark Pending Collection</DialogTitle></DialogHeader>
        <ProjectContext p={p} />
        <p className="text-sm text-muted-foreground">
          Couldn't find the numbered masterplan? Hand it to <span className="font-medium text-foreground">Dev Relations</span> to collect it from the developer.
        </p>
        <div className="space-y-1.5">
          <Label>Note for Dev Relations <span className="font-normal text-muted-foreground">· optional</span></Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where you already looked, what's needed…" rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(note)}>Mark Pending Collection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UploadDialog({ p, rejection, onClose, onConfirm }: { p: ProjectRow; rejection?: string; onClose: () => void; onConfirm: (f: { name: string; url: string }) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; url: string } | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Upload Numbered Masterplan</DialogTitle></DialogHeader>
        <ProjectContext p={p} />
        {rejection && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs leading-4 text-red-600">
            Last upload was rejected: <span className="font-medium">{rejection}</span>
          </p>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setFile({ name: f.name, url: URL.createObjectURL(f) })
          e.target.value = ""
        }} />
        {file ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <img src={file.url} alt={file.name} className="max-h-56 w-full object-cover" />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="truncate text-xs text-muted-foreground">{file.name}</span>
              <Button variant="outline" size="sm" className="h-7 bg-transparent" onClick={() => fileInput.current?.click()}>Replace</Button>
            </div>
          </div>
        ) : (
          <button
            type="button" onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile({ name: f.name, url: URL.createObjectURL(f) }) }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="rounded-full bg-secondary p-3"><Upload className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm font-medium">Click to choose the masterplan or drag & drop</p>
            <p className="text-xs text-muted-foreground">High-resolution numbered masterplan · PNG, JPG</p>
          </button>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!file} onClick={() => file && onConfirm(file)}>Upload for Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDialog({ p, upload, onClose, onAccept, onReject }: {
  p: ProjectRow
  upload?: { name: string; url: string; at: string }
  onClose: () => void
  onAccept: () => void
  onReject: (reason: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Review Masterplan</DialogTitle></DialogHeader>
        <ProjectContext p={p} />
        {upload && (
          <div className="overflow-hidden rounded-lg border border-border">
            <img src={upload.url} alt={upload.name} className="max-h-72 w-full object-cover" />
            <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{upload.name}</span>
              <span>Uploaded {fmtDateTime(upload.at)}</span>
            </div>
          </div>
        )}
        {rejecting ? (
          <div className="space-y-1.5">
            <Label>Rejection reason <span className="text-red-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with this masterplan?" rows={3} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Accepting ingests this masterplan — it appears on the <span className="font-medium text-foreground">Masterplans</span> page and the project's <span className="font-medium text-foreground">Masterplans</span> tab.
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {rejecting ? (
            <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject Masterplan
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setRejecting(true)}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={onAccept}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />Accept & Ingest
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CommentDialog({ p, author, onClose, onConfirm }: {
  p: ProjectRow
  author: CollComment["author"]
  onClose: () => void
  onConfirm: (author: CollComment["author"], text: string) => void
}) {
  const [text, setText] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Comment</DialogTitle></DialogHeader>
        <ProjectContext p={p} />
        <div className="space-y-1.5">
          <Label>Comment as <span className="font-semibold">{author}</span></Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add context for the other team…" rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!text.trim()} onClick={() => onConfirm(author, text.trim())}>Add Comment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View drawer ──────────────────────────────────────────────────────────────

function ViewDrawer({ p, item, onClose, onAction }: {
  p: ProjectRow | null
  item?: CollItem
  onClose: () => void
  onAction: (kind: "handoff" | "upload" | "review" | "comment") => void
}) {
  if (!p || !item) return null
  const nextAction =
    item.status === "To Do" ? { kind: "handoff" as const, label: "Mark Pending Collection", icon: Send }
    : item.status === "Pending Collection" ? { kind: "upload" as const, label: "Upload Masterplan", icon: Upload }
    : item.status === "Pending Review" ? { kind: "review" as const, label: "Review Masterplan", icon: ClipboardCheck }
    : null
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <div className="border-b border-border bg-card px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">{p.name}</SheetTitle>
          <div className="mt-0.5 flex items-center gap-1.5">
            <IdTag value={p.id} />
            {p.mainProject && <span className="text-[10px] text-muted-foreground">in {p.mainProject.name}</span>}
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag value={p.listingStatus} cls={LISTING_COLORS[p.listingStatus]} />
            <Tag value={p.primaryStatus} cls={PRIMARY_COLORS[p.primaryStatus]} />
            <Tag value={p.entryType} cls={ENTRY_COLORS[p.entryType]} />
            <span className="h-4 w-px bg-border" />
            <Tag value={item.status} cls={STATUS_COLORS[item.status]} />
          </div>
          {item.rejection && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs leading-4 text-red-600">
              Last upload rejected: <span className="font-medium">{item.rejection}</span>
            </p>
          )}
          {item.upload && (
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={item.upload.url} alt={item.upload.name} className="max-h-56 w-full object-cover" />
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">{item.upload.name}</span>
                <span>{fmtDateTime(item.upload.at)}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comments ({item.comments.length})</p>
            {item.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
            {item.comments.map((c, i) => (
              <div key={i} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0 text-[10px] font-medium",
                    c.author === "Data Ops" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}>{c.author}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtDateTime(c.at)}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => onAction("comment")}>
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />Add Comment
          </Button>
          {nextAction && (
            <Button size="sm" onClick={() => onAction(nextAction.kind)}>
              <nextAction.icon className="mr-1.5 h-3.5 w-3.5" />{nextAction.label}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDot, CirclePlus, Clock, Eye, LayoutGrid, Loader2, MessageSquare,
  ExternalLink, FileImage, Globe, Info, MoreHorizontal, Paperclip, ScrollText, Send, Sparkles, SquareKanban,
  Table2, UserRound, UsersRound, X, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  TableCard, TableCardHeader, TableToolbar, TableFooter, FilterMultiSelect, DateRangeFilter,
  FloatingBulkBar, BulkBarButton, MultiSortControl, ColumnsSheet, IdTag, COL_SEP,
  type SortLevel,
} from "@/components/table-kit"
import { ColorTag, fmtDateTime } from "@/components/projects-list-page"
import { IssueStatusTag, IssueSeverityTag, IssueSourceTag } from "@/components/data-issues-page"
import {
  projectFieldCurrent, projectAmenities, projectServices, projectDescriptionHtml, projectMediaItems,
  PROJECT_METADATA_PREVIEW,
} from "@/components/report-project-issue-drawer"
import { IssueKanban, SWIMLANE_LABEL, type SwimlaneKey } from "@/components/issue-kanban"
import {
  PROJECT_ISSUES, PROJECT_ISSUE_FIELDS, PROJECT_FIELD_BY_ID, ALL_PROJECT_ISSUE_TYPES, openProjectIssuesFor,
  type ProjectIssue,
} from "@/lib/project-issues-mock"
import {
  PROP_ISSUE_STATUSES, PROP_ISSUE_SEVERITIES, PROP_ISSUE_SOURCES, STATUS_COLORS, SEVERITY_COLORS,
  ALL_PEOPLE, ALL_REPORTERS, isCriticalSeverity, type PropIssueStatus, type PropIssueSeverity, type IssueActivity,
} from "@/lib/property-issues-mock"
import { PROJECTS, PROJECT_DEVELOPERS, type ProjectRow } from "@/lib/projects-mock"
import { cn } from "@/lib/utils"

// ── Small shared bits (mirror the properties data-issues page exactly) ────────
function PersonCell({ name, muted }: { name: string | null; muted?: boolean }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const initials = name === "System" ? "SYS" : name.split(" ").map((x) => x[0]).join("").slice(0, 2)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
        name === "System" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary",
      )}>
        {initials}
      </span>
      <span className={cn("text-sm", muted && "text-muted-foreground")}>{name}</span>
    </span>
  )
}

function StatCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
        {value.toLocaleString()}
        {total != null && total > 0 && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{Math.round((value / total) * 100)}%</span>}
      </p>
    </div>
  )
}

// Status / assignee / archive patches (same shape as the property tracking drawer's)
let actSeq = 0
const actId = () => `PACT-N${++actSeq}`
function statusPatch(iss: ProjectIssue, next: PropIssueStatus, actor = "Ezz H."): Partial<ProjectIssue> {
  const now = new Date().toISOString()
  return {
    status: next,
    updatedAt: now,
    ...(next === "Resolved" ? { resolvedAt: now, closedAt: null } : {}),
    ...(next === "Closed" ? { closedAt: now } : {}),
    ...(next === "To Do" || next === "In Progress" || next === "Invalid" ? { resolvedAt: null, closedAt: null } : {}),
    activity: [...iss.activity, { id: actId(), kind: "status" as const, actor, at: now, detail: `Status changed: ${iss.status} → ${next}` }],
  }
}
function assigneePatch(iss: ProjectIssue, person: string | null, actor = "Ezz H."): Partial<ProjectIssue> {
  const now = new Date().toISOString()
  return {
    assignedTo: person,
    updatedAt: now,
    activity: [...iss.activity, { id: actId(), kind: "assigned" as const, actor, at: now, detail: person ? `Assigned to ${person}` : "Unassigned" }],
  }
}
function archivePatch(iss: ProjectIssue, archived: boolean, actor = "Ezz H."): Partial<ProjectIssue> {
  const now = new Date().toISOString()
  return {
    archived,
    updatedAt: now,
    activity: [...iss.activity, { id: actId(), kind: "status" as const, actor, at: now, detail: archived ? "Issue archived" : "Issue restored" }],
  }
}

const ACT_ICON: Record<IssueActivity["kind"], React.ReactNode> = {
  created: <CirclePlus className="h-3 w-3" />,
  status: <Clock className="h-3 w-3" />,
  assigned: <UserRound className="h-3 w-3" />,
}

// ── Embedded project info panel (pane 3 of the drawer) ────────────────────────
const PANEL_SECTIONS: { title: string; fieldIds: string[] }[] = [
  { title: "Identity", fieldIds: ["projectNameEn", "projectNameAr", "listingStatus", "entryType", "primaryStatus"] },
  { title: "Placement", fieldIds: ["developer", "area", "subarea", "location", "mapCoordinates", "polygon", "organizations"] },
  { title: "Classification", fieldIds: ["category", "projectType", "projectSubtype", "manualRank"] },
  { title: "Content", fieldIds: ["descriptionEn", "descriptionAr", "metadata"] },
  { title: "Attachments", fieldIds: ["logo", "coverImage", "gallery", "brochure", "listingMasterplan", "gisMasterplan", "numberedMasterplan"] },
]
const ENUM_FIELD_IDS = new Set(["listingStatus", "entryType", "primaryStatus", "organizations", "category", "projectType"])

function ProjectInfoPanel({
  row, issues, currentIssue, onIssueFieldClick,
}: {
  row: ProjectRow
  issues: ProjectIssue[]
  currentIssue: ProjectIssue
  onIssueFieldClick: (fieldLabel: string) => void
}) {
  const highlight = useMemo(() => {
    const m = new Map<string, PropIssueSeverity>()
    for (const i of issues) if (!m.has(i.fieldLabel)) m.set(i.fieldLabel, i.severity)
    return m
  }, [issues])

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => {
    const severity = highlight.get(label)
    const blocking = severity != null && isCriticalSeverity(severity)
    const focus = label === currentIssue.fieldLabel
    const dimmed = severity != null && !focus
    return (
      <div
        className={cn(
          "space-y-0.5",
          // Horizontal-only negative margin — a vertical one makes adjacent
          // highlighted fields swallow the grid gap and clash into each other.
          severity && (blocking ? "-mx-2 rounded-md border border-red-300 bg-red-50 px-2 py-1.5" : "-mx-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5"),
          severity && focus && "ring-2 ring-offset-1 ring-red-400/70",
          dimmed && "opacity-40",
          severity && "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/30",
        )}
        title={severity ? `${severity} issue — click to open` : undefined}
        onClick={severity ? () => onIssueFieldClick(label) : undefined}
      >
        <p className={cn("text-[11px] font-medium text-muted-foreground", severity && cn("flex items-center gap-1", blocking ? "text-red-700" : "text-amber-700"))}>
          {severity && <AlertTriangle className="h-3 w-3" />}
          {label}
          {severity && (
            <span className={cn(
              "ml-auto rounded-md border px-1.5 py-px text-[10px] font-semibold",
              blocking ? "border-red-300 bg-red-100 text-red-700" : "border-amber-300 bg-amber-100 text-amber-700",
            )}>
              {severity} issue
            </span>
          )}
        </p>
        <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
      </div>
    )
  }

  const valueOf = (fieldId: string): React.ReactNode => {
    const field = PROJECT_FIELD_BY_ID.get(fieldId)!
    const v = projectFieldCurrent(row, field)
    if (v == null) return null
    return ENUM_FIELD_IDS.has(fieldId) ? <ColorTag value={v} /> : v
  }

  const amenities = projectAmenities(row)
  const services = projectServices(row)

  // Which tab a field lives in — the panel follows the focused issue's field
  const tabOfLabel = (label: string): "main" | "seo" | "attachments" => {
    const group = [...PROJECT_FIELD_BY_ID.values()].find((f) => f.label === label)?.group
    return group === "Content" ? "seo" : group === "Attachments" ? "attachments" : "main"
  }
  const [tab, setTab] = useState<"main" | "seo" | "attachments">(() => tabOfLabel(currentIssue.fieldLabel))
  useEffect(() => { setTab(tabOfLabel(currentIssue.fieldLabel)) }, [currentIssue.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [brochureOpen, setBrochureOpen] = useState(false)

  const chipList = (items: string[]) => (
    <span className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((a) => (
        <span key={a} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-foreground">
          <Sparkles className="h-3 w-3 text-muted-foreground" />{a}
        </span>
      ))}
    </span>
  )

  const HTML_PREVIEW_CLS = "max-h-44 overflow-y-auto rounded-md border border-border bg-card px-2.5 py-2 text-xs leading-snug text-foreground [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_li]:list-disc [&_p]:mb-1.5 [&_ul]:mb-1.5 [&_ul]:pl-4"

  // Attachment card — same highlight/focus/dim behavior as Field. Pass `item`
  // to render a single file (gallery images, brochure files) instead of the
  // whole field.
  const AttachmentCard = ({ fieldId, item, label }: { fieldId: string; item?: { name: string; src: string }; label?: string }) => {
    const field = PROJECT_FIELD_BY_ID.get(fieldId)!
    const items = item ? [item] : projectMediaItems(row, field)
    const severity = highlight.get(field.label)
    const blocking = severity != null && isCriticalSeverity(severity)
    const focus = field.label === currentIssue.fieldLabel
    const dimmed = severity != null && !focus
    const isBrochure = fieldId === "brochure"
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-card",
          severity ? (blocking ? "border-red-300" : "border-amber-300") : "border-border",
          severity && focus && "ring-2 ring-offset-1 ring-red-400/70",
          dimmed && "opacity-40",
          (severity || (isBrochure && items.length > 0)) && "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/30",
        )}
        title={severity ? `${severity} issue — click to open` : isBrochure && items.length ? "Open brochure" : undefined}
        onClick={severity ? () => onIssueFieldClick(field.label) : isBrochure && items.length ? () => setBrochureOpen(true) : undefined}
      >
        {items.length === 0 ? (
          <div className="flex h-20 items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">Missing</div>
        ) : isBrochure ? (
          <div className="flex h-20 items-center justify-center gap-2 bg-muted/40 text-muted-foreground">
            <ScrollText className="h-6 w-6" />
            {!item && <span className="text-xs font-medium">{items.length} file{items.length !== 1 ? "s" : ""}</span>}
          </div>
        ) : items.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={items[0].src || "/placeholder.svg"} alt={field.label} className="h-20 w-full object-cover" />
        ) : (
          <div className="grid h-20 grid-cols-2 gap-px bg-border">
            {items.slice(0, 4).map((it) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={it.name} src={it.src || "/placeholder.svg"} alt={it.name} className="h-full w-full object-cover" />
            ))}
          </div>
        )}
        <div className={cn("flex items-center gap-1 border-t px-2 py-1.5", severity ? (blocking ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50") : "border-border")}>
          {severity && <AlertTriangle className={cn("h-3 w-3 shrink-0", blocking ? "text-red-700" : "text-amber-700")} />}
          <span className={cn("truncate text-[11px] font-medium", severity ? (blocking ? "text-red-700" : "text-amber-700") : "text-foreground")}>{label ?? field.label}</span>
          {isBrochure && items.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); setBrochureOpen(true) }}
              className="ml-auto shrink-0 text-[10px] font-medium tabular-nums text-primary hover:underline"
            >
              {item ? "Open" : `Open ${items.length} file${items.length !== 1 ? "s" : ""}`}
            </button>
          ) : (
            <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {items.length === 0 ? "—" : items.length === 1 ? "1 file" : `${items.length} files`}
            </span>
          )}
        </div>
      </div>
    )
  }

  const descEn = projectDescriptionHtml(row, "en")
  const descAr = projectDescriptionHtml(row, "ar")
  const metadataCurrent = projectFieldCurrent(row, PROJECT_FIELD_BY_ID.get("metadata")!)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-2 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{row.developer.logo}</span>
          <span className="text-sm font-semibold text-foreground">{row.name}</span>
          <IdTag value={row.id} />
          <ColorTag value={row.isPhase ? "Phase" : "Project"} />
          <button
            title="Open project details in a new tab"
            onClick={() => window.open(`/projects/${row.id}`, "_blank", "noopener")}
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ColorTag value={row.listingStatus} />
          <ColorTag value={row.primaryStatus} />
          <ColorTag value={row.entryType} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {row.developer.name} · {row.area}{row.subarea ? ` · ${row.subarea}` : ""}
          {row.mainProject ? ` · Main: ${row.mainProject.name}` : ""}
        </p>
      </div>

      {/* Tab strip — same underline style as the property details drawer; sticky */}
      <div className="sticky top-0 z-10 flex border-b border-border bg-card">
        {([
          ["main", "Main Info", Info],
          ["seo", "SEO", Globe],
          ["attachments", "Attachments", Paperclip],
        ] as const).map(([id, label, IconCmp]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <IconCmp className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      <div className="space-y-5 px-4 py-4">
        {tab === "main" && (
          <>
            {PANEL_SECTIONS.filter((sec) => !["Content", "Attachments"].includes(sec.title)).map((sec) => (
              <div key={sec.title} className="space-y-3">
                <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {sec.fieldIds.map((fid) => (
                    <Field key={fid} label={PROJECT_FIELD_BY_ID.get(fid)!.label} value={valueOf(fid)} />
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-3">
              <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amenities</h4>
              <Field label="Project Amenities" value={chipList(amenities)} />
              <Field label="Services" value={chipList(services)} />
            </div>

            <div className="space-y-3">
              <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timestamps</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm tabular-nums text-foreground">{fmtDateTime(row.createdAt)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Updated At</p>
                  <p className="text-sm tabular-nums text-foreground">{fmtDateTime(row.updatedAt)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "seo" && (
          <div className="space-y-3">
            <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Content</h4>
            <Field
              label="Project Description En"
              value={descEn ? <div className={HTML_PREVIEW_CLS} dangerouslySetInnerHTML={{ __html: descEn }} /> : null}
            />
            <Field
              label="Project Description Ar"
              value={descAr ? <div dir="rtl" className={HTML_PREVIEW_CLS} dangerouslySetInnerHTML={{ __html: descAr }} /> : null}
            />
            <Field
              label="Project Metadata"
              value={metadataCurrent ? (
                <div className="space-y-1 rounded-md border border-border bg-card px-2.5 py-2">
                  {PROJECT_METADATA_PREVIEW.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium tabular-nums text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            />
          </div>
        )}

        {tab === "attachments" && (() => {
          const galleryItems = projectMediaItems(row, PROJECT_FIELD_BY_ID.get("gallery")!)
          const brochureItems = projectMediaItems(row, PROJECT_FIELD_BY_ID.get("brochure")!)
          const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
            <div className="space-y-3">
              <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
              <div className="grid grid-cols-2 gap-3">{children}</div>
            </div>
          )
          return (
            <>
              <Section title="Project Logo"><AttachmentCard fieldId="logo" /></Section>
              <Section title="Project Cover Image"><AttachmentCard fieldId="coverImage" /></Section>
              <Section title="Gallery">
                {galleryItems.length === 0
                  ? <AttachmentCard fieldId="gallery" />
                  : galleryItems.map((it) => <AttachmentCard key={it.name} fieldId="gallery" item={it} label={it.name} />)}
              </Section>
              <Section title="Masterplans">
                <AttachmentCard fieldId="listingMasterplan" />
                <AttachmentCard fieldId="gisMasterplan" />
                <AttachmentCard fieldId="numberedMasterplan" />
              </Section>
              <Section title="Brochures">
                {brochureItems.length === 0
                  ? <AttachmentCard fieldId="brochure" />
                  : brochureItems.map((it) => <AttachmentCard key={it.name} fieldId="brochure" item={it} label={it.name} />)}
              </Section>
            </>
          )
        })()}
      </div>

      {/* Brochure viewer */}
      <Dialog open={brochureOpen} onOpenChange={setBrochureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Brochure — {row.name}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto">
            {projectMediaItems(row, PROJECT_FIELD_BY_ID.get("brochure")!).map((it) => (
              <div key={it.name} className="overflow-hidden rounded-lg border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.src || "/placeholder.svg"} alt={it.name} className="h-32 w-full object-cover" />
                <div className="flex items-center gap-1.5 border-t border-border px-2 py-1.5">
                  <FileImage className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs font-medium text-foreground">{it.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">PDF</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Tracking drawer — issue details | comments & logs | the project itself ────
export function ProjectIssueDrawer({
  issue, list, onStep, onClose, onSetStatus, onSetAssignee, onAddComment,
}: {
  issue: ProjectIssue | null
  list?: ProjectIssue[]
  onStep: (next: ProjectIssue) => void
  onClose: () => void
  onSetStatus: (issue: ProjectIssue, s: PropIssueStatus) => void
  onSetAssignee: (issue: ProjectIssue, p: string | null) => void
  onAddComment: (issue: ProjectIssue, text: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [midTab, setMidTab] = useState<"comments" | "logs">("comments")
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(false)

  const projectIssues = useMemo(() => {
    if (!issue) return []
    const open = openProjectIssuesFor(issue.entityId)
    return open.some((i) => i.id === issue.id) ? open : [issue, ...open]
  }, [issue])

  if (!issue) return null
  const idx = list ? list.findIndex((r) => r.id === issue.id) : -1
  const projectRow = PROJECTS.find((p) => p.id === issue.entityId) ?? null

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[105px_1fr] items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground">{children}</span>
    </div>
  )
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
  )

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex !w-[1400px] !max-w-[97vw] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex min-w-0 items-center gap-2.5">
              <SheetTitle className="text-base font-semibold">Project Issue</SheetTitle>
              <IdTag value={issue.id} />
              <IssueSourceTag source={issue.source} />
              <IssueSeverityTag severity={issue.severity} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {projectIssues.length > 1 && (
                <Button
                  variant={issuesPanelOpen ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setIssuesPanelOpen((v) => !v)}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {projectIssues.length} issues on this project
                </Button>
              )}
              {idx >= 0 && list && list.length > 1 && (
                <div className="ml-1 flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx <= 0} onClick={() => onStep(list[idx - 1])}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="px-1 text-xs tabular-nums text-muted-foreground">{idx + 1}/{list.length.toLocaleString()}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx >= list.length - 1} onClick={() => onStep(list[idx + 1])}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,4fr)] divide-x divide-border">
          {/* Pane 1 — issue details */}
          <div className="min-w-0 space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-2.5">
              <SectionTitle>Issue Details</SectionTitle>
              <Row label="Status">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button><IssueStatusTag status={issue.status} chevron /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {PROP_ISSUE_STATUSES.filter((s) => s !== issue.status).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => onSetStatus(issue, s)}>
                        <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </Row>
              <Row label="Priority"><IssueSeverityTag severity={issue.severity} /></Row>
              <Row label="Assigned To">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <UserRound className="h-3 w-3" />{issue.assignedTo ?? "Unassigned"}<ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto">
                    {ALL_PEOPLE.map((p) => (
                      <DropdownMenuItem key={p} onClick={() => onSetAssignee(issue, p)}>{p}</DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onSetAssignee(issue, null)}>Unassigned</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Row>
              <Row label="Reported By">{issue.reportedBy}</Row>
              <Row label="Reporter Type"><IssueSourceTag source={issue.source} /></Row>
              <Row label="Category"><ColorTag value={issue.fieldLabel} /></Row>
              <Row label="Type"><ColorTag value={issue.type} /></Row>
              <Row label="Subtype">{issue.subtype ? <ColorTag value={issue.subtype} /> : <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Project">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{issue.project.name}</span>
                  <IdTag value={issue.project.id} />
                </span>
              </Row>
              <Row label="Phase">
                {issue.phase ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm">{issue.phase.name}</span>
                    <IdTag value={issue.phase.id} />
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </Row>
              <Row label="Developer">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm">{issue.developer.name}</span>
                  <IdTag value={issue.developer.id} />
                </span>
              </Row>
            </div>

            <div className="space-y-3">
              <SectionTitle>Description</SectionTitle>
              <p className="min-w-0 break-words text-sm leading-relaxed text-foreground">{issue.description}</p>
              {(issue.details?.amenitiesRemove?.length || issue.details?.amenitiesAdd?.length) ? (
                <div className="space-y-2">
                  {!!issue.details?.amenitiesRemove?.length && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-red-700">Wrong — should be removed</p>
                      <div className="flex flex-wrap gap-1.5">
                        {issue.details.amenitiesRemove.map((a) => (
                          <span key={a} className="rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!!issue.details?.amenitiesAdd?.length && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-emerald-700">Missing — should be added</p>
                      <div className="flex flex-wrap gap-1.5">
                        {issue.details.amenitiesAdd.map((a) => (
                          <span key={a} className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {(issue.expected || issue.current) && (
              <div className="space-y-3">
                <SectionTitle>Expected Result</SectionTitle>
                <div className="space-y-2">
                  {issue.current && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Current</p>
                      <p className="text-sm text-red-700">{issue.current}</p>
                    </div>
                  )}
                  {issue.expected && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Expected</p>
                      <p className="text-sm text-emerald-700">{issue.expected}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <SectionTitle>Timeline</SectionTitle>
              <Row label="Created At">{fmtDateTime(issue.createdAt)}</Row>
              <Row label="Updated At">{fmtDateTime(issue.updatedAt)}</Row>
              <Row label="Resolved At">{issue.resolvedAt ? fmtDateTime(issue.resolvedAt) : <span className="text-muted-foreground">—</span>}</Row>
              <Row label="Closed At">{issue.closedAt ? fmtDateTime(issue.closedAt) : <span className="text-muted-foreground">—</span>}</Row>
            </div>
          </div>

          {/* Pane 2 — comments | logs */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
              <button
                onClick={() => setMidTab("comments")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  midTab === "comments" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="h-3 w-3" />Comments
                <span className="rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{issue.comments.length}</span>
              </button>
              <button
                onClick={() => setMidTab("logs")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  midTab === "logs" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ScrollText className="h-3 w-3" />Logs
                <span className="rounded border border-blue-200 bg-blue-100 px-1 text-[10px] font-semibold text-blue-700">{issue.activity.length}</span>
              </button>
            </div>

            {midTab === "comments" ? (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {issue.comments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>}
                  {issue.comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {c.author.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{c.author}</p>
                          <p className="shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(c.at)}</p>
                        </div>
                        <p className="mt-0.5 rounded-lg rounded-tl-none border border-border bg-muted/40 px-2.5 py-1.5 text-sm leading-snug text-foreground">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a comment…"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim()) { onAddComment(issue, draft.trim()); setDraft("") }
                    }}
                  />
                  <Button size="sm" className="h-8 gap-1.5" disabled={!draft.trim()} onClick={() => { onAddComment(issue, draft.trim()); setDraft("") }}>
                    <Send className="h-3.5 w-3.5" />Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {[...issue.activity].sort((a, b) => a.at.localeCompare(b.at)).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">{ACT_ICON[a.kind]}</span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-foreground/80">{a.detail}</p>
                      <p className="text-[10px]">{a.actor} · {fmtDateTime(a.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pane 3 — the project itself */}
          <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
            {projectRow ? (
              <ProjectInfoPanel
                row={projectRow}
                issues={projectIssues}
                currentIssue={issue}
                onIssueFieldClick={(label) => {
                  const target = projectIssues.find((i) => i.fieldLabel === label)
                  if (target) onStep(target)
                }}
              />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Project not found in the current mock rows.</p>
            )}

            {issuesPanelOpen && (
              <div className="absolute inset-y-0 right-0 z-30 flex w-80 flex-col border-l border-border bg-card shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
                  <p className="text-sm font-semibold text-foreground">Open issues on this project</p>
                  <button onClick={() => setIssuesPanelOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                  {projectIssues.map((i) => {
                    const active = i.id === issue.id
                    return (
                      <button
                        key={i.id}
                        onClick={() => { onStep(i); setIssuesPanelOpen(false) }}
                        className={cn("block w-full space-y-1 px-4 py-2.5 text-left transition-colors", active ? "bg-primary/5" : "hover:bg-muted/50")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-foreground")}>{i.fieldLabel}</span>
                          <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", SEVERITY_COLORS[i.severity])}>{i.severity}</span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{i.type}{i.subtype ? ` — ${i.subtype}` : ""}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-medium", STATUS_COLORS[i.status])}>{i.status}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
                          {active && <span className="text-[10px] font-medium text-primary">· viewing</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── The page ──────────────────────────────────────────────────────────────────
const SORT_FIELDS = [
  { id: "severity", label: "Severity" },
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created At" },
  { id: "updatedAt", label: "Updated At" },
  { id: "resolvedAt", label: "Resolved At" },
  { id: "closedAt", label: "Closed At" },
]

function sortVal(r: ProjectIssue, key: string): string | number {
  switch (key) {
    case "severity": return PROP_ISSUE_SEVERITIES.indexOf(r.severity)
    case "status": return PROP_ISSUE_STATUSES.indexOf(r.status)
    case "createdAt": return r.createdAt
    case "updatedAt": return r.updatedAt
    case "resolvedAt": return r.resolvedAt ?? ""
    case "closedAt": return r.closedAt ?? ""
    default: return ""
  }
}

const DEV_OPTIONS = PROJECT_DEVELOPERS.map((d) => d.name)
const PROJ_OPTIONS = Array.from(new Set(PROJECTS.map((p) => p.name))).sort()

const COLS = [
  { id: "id", label: "Issue ID", width: 120 },
  { id: "source", label: "Reported By Type", width: 130 },
  { id: "severity", label: "Severity", width: 100 },
  { id: "status", label: "Status", width: 130 },
  { id: "field", label: "Issue Category", width: 150 },
  { id: "type", label: "Issue Type", width: 150 },
  { id: "description", label: "Description", width: 240 },
  { id: "expected", label: "Expected Result", width: 150 },
  { id: "reportedBy", label: "Reported By", width: 140 },
  { id: "assignedTo", label: "Assigned To", width: 140 },
  { id: "developer", label: "Developer", width: 170 },
  { id: "project", label: "Project", width: 180 },
  { id: "phase", label: "Phase", width: 130 },
  { id: "listingStatus", label: "Listing Status", width: 115 },
  { id: "primaryStatus", label: "Primary Status", width: 120 },
  { id: "entryType", label: "Entry Type", width: 110 },
  { id: "createdAt", label: "Created At", width: 160 },
  { id: "updatedAt", label: "Updated At", width: 160 },
  { id: "resolvedAt", label: "Resolved At", width: 160 },
  { id: "closedAt", label: "Closed At", width: 160 },
]
const SORTABLE_COLS = new Map<string, string>([
  ["severity", "severity"], ["status", "status"],
  ["createdAt", "createdAt"], ["updatedAt", "updatedAt"], ["resolvedAt", "resolvedAt"], ["closedAt", "closedAt"],
])

// Group by — any issue or project attribute; the kanban swimlanes reuse the
// subset it supports, other keys group the table only.
const GROUP_OPTIONS: { id: string; label: string }[] = [
  { id: "field", label: "Issue Category" },
  { id: "type", label: "Issue Type" },
  { id: "subtype", label: "Issue Subtype" },
  { id: "status", label: "Status" },
  { id: "reportedBy", label: "Reported By" },
  { id: "assignedTo", label: "Assigned To" },
  { id: "developer", label: "Developer" },
  { id: "project", label: "Project" },
  { id: "phase", label: "Phase" },
  { id: "listingStatus", label: "Listing Status" },
  { id: "primaryStatus", label: "Primary Status" },
  { id: "entryType", label: "Entry Type" },
]
const GROUP_LABEL = new Map(GROUP_OPTIONS.map((g) => [g.id, g.label]))

function laneOfIssue(x: ProjectIssue, key: string): string {
  switch (key) {
    case "field": return x.fieldLabel
    case "type": return x.type
    case "subtype": return x.subtype ?? "No subtype"
    case "status": return x.status
    case "reportedBy": return x.reportedBy
    case "assignedTo": return x.assignedTo ?? "Unassigned"
    case "developer": return x.developer.name
    case "project": return x.project.name
    case "phase": return x.phase?.name ?? "No phase"
    case "listingStatus": return x.listingStatus
    case "primaryStatus": return x.primaryStatus
    case "entryType": return x.entryType
    default: return ""
  }
}
const SWIMLANE_KEYS = new Set<string>(["reportedBy", "assignedTo", "developer", "project"])

export function ProjectIssuesPage() {
  const [version, setVersion] = useState(0)
  const issues = useMemo(() => [...PROJECT_ISSUES], [version])
  const patchIssue = (iss: ProjectIssue, patch: Partial<ProjectIssue>) => {
    for (const s of PROJECT_ISSUES) if (s.id === iss.id) Object.assign(s, patch)
    setVersion((v) => v + 1)
    setTrackIssue((cur) => (cur && cur.id === iss.id ? { ...cur, ...patch } : cur))
  }

  const [q, setQ] = useState("")
  const [statusF, setStatusF] = useState<string[]>([])
  const [severityF, setSeverityF] = useState<string[]>([])
  const [sourceF, setSourceF] = useState<string[]>([])
  const [fieldF, setFieldF] = useState<string[]>([])
  const [typeF, setTypeF] = useState<string[]>([])
  const [devF, setDevF] = useState<string[]>([])
  const [projF, setProjF] = useState<string[]>([])
  const [reporterF, setReporterF] = useState<string[]>([])
  const [assigneeF, setAssigneeF] = useState<string[]>([])
  const [createdR, setCreatedR] = useState({ from: "", to: "" })
  const [updatedR, setUpdatedR] = useState({ from: "", to: "" })
  const [resolvedR, setResolvedR] = useState({ from: "", to: "" })
  const [closedR, setClosedR] = useState({ from: "", to: "" })
  const [sorts, setSorts] = useState<SortLevel[]>([{ field: "createdAt", dir: "desc" }])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [trackIssue, setTrackIssue] = useState<ProjectIssue | null>(null)
  // Header toggles + view
  const [showArchived, setShowArchived] = useState(false)
  const [myIssues, setMyIssues] = useState(false)
  const [view, setView] = useState<"table" | "kanban">("table")
  // Group by — groups the table AND acts as the kanban swimlane
  const [groupBy, setGroupBy] = useState<string>("none")
  const swimlane: SwimlaneKey = SWIMLANE_KEYS.has(groupBy) ? (groupBy as SwimlaneKey) : "none"
  // Columns control
  const [showColumns, setShowColumns] = useState(false)
  const [colOrder, setColOrder] = useState<string[]>(COLS.map((c) => c.id))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [frozenCols, setFrozenCols] = useState<Set<string>>(new Set())
  // Archive confirmation
  const [confirmArchive, setConfirmArchive] = useState<ProjectIssue | null>(null)

  const visibleCols = colOrder
    .map((id) => COLS.find((c) => c.id === id)!)
    .filter((c) => c && !hiddenCols.has(c.id))
  const frozenLeft = (colId: string) => {
    let left = 40
    for (const c of visibleCols) {
      if (c.id === colId) break
      if (frozenCols.has(c.id)) left += c.width
    }
    return left
  }

  const inRange = (v: string | null, r: { from: string; to: string }) => {
    if (!r.from && !r.to) return true
    if (!v) return false
    if (r.from && v < r.from) return false
    if (r.to && v > r.to) return false
    return true
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = issues.filter((r) => {
      if (!!r.archived !== showArchived) return false
      if (myIssues && r.assignedTo !== "Ezz H.") return false
      if (needle && ![r.id, r.description, r.project.name, r.project.id, r.phase?.name ?? "", r.developer.name].some((x) => x.toLowerCase().includes(needle))) return false
      if (statusF.length && !statusF.includes(r.status)) return false
      if (severityF.length && !severityF.includes(r.severity)) return false
      if (sourceF.length && !sourceF.includes(r.source)) return false
      if (fieldF.length && !fieldF.includes(r.fieldLabel)) return false
      if (typeF.length && !typeF.includes(r.type)) return false
      if (devF.length && !devF.includes(r.developer.name)) return false
      if (projF.length && !projF.includes(r.project.name)) return false
      if (reporterF.length && !reporterF.includes(r.reportedBy)) return false
      if (assigneeF.length && !assigneeF.includes(r.assignedTo ?? "Unassigned")) return false
      if (!inRange(r.createdAt, createdR)) return false
      if (!inRange(r.updatedAt, updatedR)) return false
      if (!inRange(r.resolvedAt, resolvedR)) return false
      if (!inRange(r.closedAt, closedR)) return false
      return true
    })
    const laneOf = (x: ProjectIssue) => laneOfIssue(x, groupBy)
    return [...rows].sort((a, b) => {
      if (groupBy !== "none") {
        const g = laneOf(a).localeCompare(laneOf(b))
        if (g !== 0) return g
      }
      for (const s of sorts) {
        const av = sortVal(a, s.field), bv = sortVal(b, s.field)
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp
      }
      return 0
    })
  }, [issues, q, showArchived, myIssues, groupBy, statusF, severityF, sourceF, fieldF, typeF, devF, projF, reporterF, assigneeF, createdR, updatedR, resolvedR, closedR, sorts])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const live = useMemo(() => issues.filter((i) => !i.archived), [issues])
  const archivedCount = issues.length - live.length
  const stats = useMemo(() => ({
    total: live.length,
    todo: live.filter((i) => i.status === "To Do").length,
    inProgress: live.filter((i) => i.status === "In Progress").length,
    resolved: live.filter((i) => i.status === "Resolved").length,
    closed: live.filter((i) => i.status === "Closed").length,
    invalid: live.filter((i) => i.status === "Invalid").length,
  }), [live])

  const activeFilterCount =
    [statusF, severityF, sourceF, fieldF, typeF, devF, projF, reporterF, assigneeF].filter((f) => f.length > 0).length +
    [createdR, updatedR, resolvedR, closedR].filter((r) => r.from || r.to).length

  const bulkApply = (fn: (iss: ProjectIssue) => Partial<ProjectIssue>, label: string) => {
    const targets = filtered.filter((r) => selected.has(r.id))
    targets.forEach((t) => patchIssue(t, fn(t)))
    setSelected(new Set())
    toast.success(`${targets.length} issue${targets.length !== 1 ? "s" : ""} — ${label}`)
  }

  const cycleHeaderSort = (fieldId: string) =>
    setSorts((prev) => {
      const cur = prev.length === 1 && prev[0].field === fieldId ? prev[0] : null
      if (!cur) return [{ field: fieldId, dir: "asc" }]
      if (cur.dir === "asc") return [{ field: fieldId, dir: "desc" }]
      return []
    })

  const ts = (v: string | null) =>
    v ? <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(v)}</span> : <span className="text-muted-foreground">—</span>

  /** Shared row/card actions — View, assignment, status transitions, archive/restore. */
  const menuItems = (r: ProjectIssue) => (
    <>
      <DropdownMenuItem onClick={() => setTrackIssue(r)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => { patchIssue(r, assigneePatch(r, "Ezz H.")); toast.success("Assigned to you") }}><UserRound className="mr-2 h-3.5 w-3.5" />Assign to Me</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger><UsersRound className="mr-2 h-3.5 w-3.5" />Change Assignee</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-72 w-44 overflow-y-auto">
          {ALL_PEOPLE.map((p) => (
            <DropdownMenuItem key={p} onClick={() => { patchIssue(r, assigneePatch(r, p)); toast.success(`Assigned to ${p}`) }}>{p}</DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { patchIssue(r, assigneePatch(r, null)); toast.success("Unassigned") }}>Unassigned</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      {PROP_ISSUE_STATUSES.filter((s) => s !== r.status).map((s) => (
        <DropdownMenuItem
          key={s}
          className={s === "Invalid" ? "text-red-600 focus:text-red-600" : undefined}
          onClick={() => { patchIssue(r, statusPatch(r, s)); toast.success(`Issue moved to ${s}`) }}
        >
          <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      {r.archived ? (
        <DropdownMenuItem onClick={() => { patchIssue(r, archivePatch(r, false)); toast.success(`${r.id} restored`) }}>
          <ArchiveRestore className="mr-2 h-3.5 w-3.5" />Restore
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => setConfirmArchive(r)}>
          <Archive className="mr-2 h-3.5 w-3.5" />Archive
        </DropdownMenuItem>
      )}
    </>
  )

  const renderCell = (r: ProjectIssue, colId: string) => {
    switch (colId) {
      case "id": return <IdTag value={r.id} />
      case "source": return <IssueSourceTag source={r.source} />
      case "severity": return <IssueSeverityTag severity={r.severity} />
      case "status": return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer"><IssueStatusTag status={r.status} chevron /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {PROP_ISSUE_STATUSES.filter((s) => s !== r.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => patchIssue(r, statusPatch(r, s))}>
                <span className={cn("mr-2 h-2 w-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />{s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
      case "field": return <ColorTag value={r.fieldLabel} />
      case "type": return <ColorTag value={r.type} />
      case "description": return <span className="block max-w-[240px] truncate text-sm" title={r.description}>{r.description}</span>
      case "expected": return r.expected ? <span className="block max-w-[150px] truncate text-sm" title={r.expected}>{r.expected}</span> : <span className="text-muted-foreground">—</span>
      case "reportedBy": return <PersonCell name={r.reportedBy} />
      case "assignedTo": return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 whitespace-nowrap hover:opacity-80">
              <PersonCell name={r.assignedTo} muted={!r.assignedTo} />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-44 overflow-y-auto">
            {ALL_PEOPLE.map((p) => (
              <DropdownMenuItem key={p} onClick={() => patchIssue(r, assigneePatch(r, p))}>{p}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => patchIssue(r, assigneePatch(r, null))}>Unassigned</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      case "developer": return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{r.developer.logo}</span>
          <div>
            <button
              className="block text-sm font-medium text-foreground hover:underline"
              onClick={() => window.open(`/developers/${r.developer.id}`, "_blank", "noopener")}
            >
              {r.developer.name}
            </button>
            <IdTag value={r.developer.id} />
          </div>
        </div>
      )
      case "project": return (
        <div className="whitespace-nowrap">
          <button
            className="block text-sm font-medium text-foreground hover:underline"
            onClick={() => window.open(`/projects/${r.project.id}`, "_blank", "noopener")}
          >
            {r.project.name}
          </button>
          <IdTag value={r.project.id} />
        </div>
      )
      case "phase": return r.phase ? (
        <div className="whitespace-nowrap">
          <button
            className="block text-sm text-foreground hover:underline"
            onClick={() => window.open(`/projects/${r.project.id}/phases/${r.phase!.id}`, "_blank", "noopener")}
          >
            {r.phase.name}
          </button>
          <IdTag value={r.phase.id} />
        </div>
      ) : <span className="text-muted-foreground">—</span>
      case "listingStatus": return <ColorTag value={r.listingStatus} />
      case "primaryStatus": return <ColorTag value={r.primaryStatus} />
      case "entryType": return <ColorTag value={r.entryType} />
      case "createdAt": return ts(r.createdAt)
      case "updatedAt": return ts(r.updatedAt)
      case "resolvedAt": return ts(r.resolvedAt)
      case "closedAt": return ts(r.closedAt)
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects Data Issues</h1>
          <p className="text-sm text-muted-foreground">Issue tracking for project data — reported by the quality team, sales agents, or raised automatically by validation rules</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Total Issues" value={stats.total} />
          <StatCard icon={<CircleDot className="h-3.5 w-3.5 text-gray-500" />} label="To Do" value={stats.todo} total={stats.total} />
          <StatCard icon={<Loader2 className="h-3.5 w-3.5 text-amber-500" />} label="In Progress" value={stats.inProgress} total={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />} label="Resolved" value={stats.resolved} total={stats.total} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} label="Closed" value={stats.closed} total={stats.total} />
          <StatCard icon={<XCircle className="h-3.5 w-3.5 text-red-500" />} label="Invalid" value={stats.invalid} total={stats.total} />
        </div>

        <TableToolbar
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          searchPlaceholder="Search by issue ID, description, project, phase or developer"
          hideAdvanced
          activeFilters={activeFilterCount}
          onColumns={() => setShowColumns(true)}
          filters={
            <>
              <FilterMultiSelect label="Developer" value={devF} options={DEV_OPTIONS} onChange={(v) => { setDevF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Project" value={projF} options={PROJ_OPTIONS} onChange={(v) => { setProjF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Status" value={statusF} options={PROP_ISSUE_STATUSES} onChange={(v) => { setStatusF(v); setPage(1) }} className="w-32" />
              <FilterMultiSelect label="Severity" value={severityF} options={PROP_ISSUE_SEVERITIES} onChange={(v) => { setSeverityF(v); setPage(1) }} className="w-32" />
              <FilterMultiSelect label="Reported By Type" value={sourceF} options={PROP_ISSUE_SOURCES} onChange={(v) => { setSourceF(v); setPage(1) }} className="w-40" />
              <FilterMultiSelect label="Issue Category" value={fieldF} options={PROJECT_ISSUE_FIELDS.map((f) => f.label)} onChange={(v) => { setFieldF(v); setPage(1) }} className="w-38" />
              <FilterMultiSelect label="Issue Type" value={typeF} options={ALL_PROJECT_ISSUE_TYPES} onChange={(v) => { setTypeF(v); setPage(1) }} className="w-34" />
              <FilterMultiSelect label="Reported By" value={reporterF} options={ALL_REPORTERS} onChange={(v) => { setReporterF(v); setPage(1) }} className="w-36" />
              <FilterMultiSelect label="Assigned To" value={assigneeF} options={["Unassigned", ...ALL_PEOPLE]} onChange={(v) => { setAssigneeF(v); setPage(1) }} className="w-36" />
              <DateRangeFilter label="Created At" dateFrom={createdR.from} dateTo={createdR.to} onChangeFrom={(v) => { setCreatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setCreatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
              <DateRangeFilter label="Updated At" dateFrom={updatedR.from} dateTo={updatedR.to} onChangeFrom={(v) => { setUpdatedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setUpdatedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
              <DateRangeFilter label="Resolved At" dateFrom={resolvedR.from} dateTo={resolvedR.to} onChangeFrom={(v) => { setResolvedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setResolvedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
              <DateRangeFilter label="Closed At" dateFrom={closedR.from} dateTo={closedR.to} onChangeFrom={(v) => { setClosedR((r) => ({ ...r, from: v })); setPage(1) }} onChangeTo={(v) => { setClosedR((r) => ({ ...r, to: v })); setPage(1) }} withTime />
            </>
          }
          sortControl={<MultiSortControl fields={SORT_FIELDS} sorts={sorts} onChange={setSorts} />}
          groupControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={groupBy === "none" ? "outline" : "default"} size="sm" className="h-8 gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />{groupBy === "none" ? "Group by" : GROUP_LABEL.get(groupBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
                <DropdownMenuItem onClick={() => setGroupBy("none")} className="text-sm">No grouping</DropdownMenuItem>
                <DropdownMenuSeparator />
                {GROUP_OPTIONS.map((g) => (
                  <DropdownMenuItem key={g.id} onClick={() => setGroupBy(g.id)} className="text-sm">{g.label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <TableCard>
          <TableCardHeader
            title={showArchived ? "Archived Issues" : "Issues"}
            count={filtered.length}
            cta={
              <div className="flex items-center gap-2">
                <Button
                  variant={myIssues ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => { setMyIssues((v) => !v); setPage(1) }}
                >
                  <UserRound className="h-3.5 w-3.5" />My Issues
                </Button>
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5"
                  title="Show archived issues"
                  onClick={() => { setShowArchived((v) => !v); setSelected(new Set()); setPage(1) }}
                >
                  <Archive className="h-3.5 w-3.5" />Archived
                  <span className={cn(
                    "rounded border px-1 text-[10px] font-semibold tabular-nums",
                    showArchived ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-blue-200 bg-blue-100 text-blue-700",
                  )}>
                    {archivedCount}
                  </span>
                </Button>
                <div className="flex items-center overflow-hidden rounded-md border border-border">
                  <button
                    className={cn("flex h-8 w-9 items-center justify-center transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
                    title="Table view"
                    onClick={() => setView("table")}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className={cn("flex h-8 w-9 items-center justify-center transition-colors", view === "kanban" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
                    title="Kanban view"
                    onClick={() => setView("kanban")}
                  >
                    <SquareKanban className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            }
          />
          {view === "kanban" ? (
            <div className="p-4">
              <IssueKanban
                issues={filtered}
                swimlane={swimlane}
                onOpen={(i) => setTrackIssue(i)}
                onStatusChange={(i, s) => { patchIssue(i, statusPatch(i, s)); toast.success(`${i.id} moved to ${s}`) }}
                renderMenuItems={menuItems}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className={cn("w-max min-w-full text-sm", COL_SEP)}>
                  <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="sticky left-0 z-20 w-10 bg-muted/60 py-2.5 pl-4 pr-0">
                        <Checkbox
                          className="h-4 w-4"
                          checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                          onCheckedChange={(v) => {
                            setSelected((prev) => {
                              const n = new Set(prev)
                              pageRows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)))
                              return n
                            })
                          }}
                        />
                      </th>
                      {visibleCols.map((c) => {
                        const fieldId = SORTABLE_COLS.get(c.id)
                        const s = fieldId && sorts.length === 1 && sorts[0].field === fieldId ? sorts[0] : null
                        return (
                          <th
                            key={c.id}
                            className={cn("whitespace-nowrap px-3 py-2.5 text-left", frozenCols.has(c.id) && "sticky z-20 bg-muted/60")}
                            style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                          >
                            {fieldId ? (
                              <button onClick={() => cycleHeaderSort(fieldId)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                                {c.label}
                                {s ? (s.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                              </button>
                            ) : c.label}
                          </th>
                        )
                      })}
                      <th className="sticky right-0 z-20 w-12 bg-muted/60" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((r, ri) => {
                      const laneOf = (x: ProjectIssue) => laneOfIssue(x, groupBy)
                      const showGroupHeader = groupBy !== "none" && (ri === 0 || laneOf(pageRows[ri - 1]) !== laneOf(r))
                      return (
                        <Fragment key={r.id}>
                          {showGroupHeader && (
                            <tr className="border-y border-border bg-muted/50">
                              <td colSpan={visibleCols.length + 2} className="sticky left-0 px-4 py-1.5">
                                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                  {laneOf(r)}
                                  <span className="rounded-md border border-blue-200 bg-blue-100 px-1.5 py-px text-[10px] font-semibold tabular-nums text-blue-700">
                                    {pageRows.filter((x) => laneOf(x) === laneOf(r)).length}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          )}
                          {(
                      <tr key={r.id} className={cn("bg-card hover:bg-muted/40", selected.has(r.id) && "bg-primary/5")}>
                        <td className="sticky left-0 z-10 w-10 bg-card py-1.5 pl-4 pr-0">
                          <Checkbox
                            className="h-4 w-4"
                            checked={selected.has(r.id)}
                            onCheckedChange={(v) => setSelected((prev) => { const n = new Set(prev); v ? n.add(r.id) : n.delete(r.id); return n })}
                          />
                        </td>
                        {visibleCols.map((c) => (
                          <td
                            key={c.id}
                            className={cn("px-3 py-1.5 align-middle", frozenCols.has(c.id) && "sticky z-10 bg-card")}
                            style={frozenCols.has(c.id) ? { left: frozenLeft(c.id), minWidth: c.width } : undefined}
                          >
                            {renderCell(r, c.id)}
                          </td>
                        ))}
                        <td className="sticky right-0 z-10 w-12 border-l border-border bg-card p-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex h-full min-h-[36px] w-12 items-center justify-center text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {menuItems(r)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                          )}
                        </Fragment>
                      )
                    })}
                    {pageRows.length === 0 && (
                      <tr><td colSpan={visibleCols.length + 2} className="px-4 py-12 text-center text-sm text-muted-foreground">{showArchived ? "No archived issues." : "No issues match the current filters."}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1) }} label="issues" />
            </>
          )}
        </TableCard>

        <FloatingBulkBar
          count={selected.size}
          total={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((r) => r.id)))}
          onClear={() => setSelected(new Set())}
        >
          {showArchived ? (
            <BulkBarButton onClick={() => bulkApply((t) => archivePatch(t, false), "restored")}>Restore</BulkBarButton>
          ) : (
            <>
              <BulkBarButton onClick={() => bulkApply((t) => assigneePatch(t, "Ezz H."), "assigned to me")}>Assign to Me</BulkBarButton>
              <BulkBarButton onClick={() => bulkApply((t) => statusPatch(t, "Resolved"), "marked resolved")}>Mark Resolved</BulkBarButton>
              <BulkBarButton onClick={() => bulkApply((t) => statusPatch(t, "Closed"), "closed")}>Close</BulkBarButton>
            </>
          )}
        </FloatingBulkBar>

        <ColumnsSheet
          open={showColumns}
          onClose={() => setShowColumns(false)}
          columns={COLS}
          order={colOrder}
          onOrderChange={setColOrder}
          hidden={hiddenCols}
          onHiddenChange={setHiddenCols}
          frozen={frozenCols}
          onFrozenChange={setFrozenCols}
        />

        {/* Archive confirmation */}
        <Dialog open={!!confirmArchive} onOpenChange={(o) => { if (!o) setConfirmArchive(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><Archive className="h-4 w-4" />Archive issue {confirmArchive?.id}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Archived issues are hidden from the table and the kanban board. You can view and restore them anytime from the <span className="font-medium text-foreground">Archived</span> toggle above the table.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setConfirmArchive(null)}>Cancel</Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  if (confirmArchive) { patchIssue(confirmArchive, archivePatch(confirmArchive, true)); toast.success(`${confirmArchive.id} archived`) }
                  setConfirmArchive(null)
                }}
              >
                <Archive className="h-3.5 w-3.5" />Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProjectIssueDrawer
          issue={trackIssue}
          list={filtered}
          onStep={setTrackIssue}
          onClose={() => setTrackIssue(null)}
          onSetStatus={(iss, s) => patchIssue(iss, statusPatch(iss, s))}
          onSetAssignee={(iss, p) => patchIssue(iss, assigneePatch(iss, p))}
          onAddComment={(iss, text) => {
            const now = new Date().toISOString()
            patchIssue(iss, { comments: [...iss.comments, { id: `PCM-N${now}`, author: "Ezz H.", text, at: now }], updatedAt: now })
          }}
        />
      </div>
    </div>
  )
}

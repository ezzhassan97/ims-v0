"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ColorTag } from "@/components/projects-list-page"
import {
  PROP_ISSUE_STATUSES, SEVERITY_COLORS,
  type PropIssueStatus, type PropIssueSeverity, type PropIssueSource,
} from "@/lib/property-issues-mock"
import { cn } from "@/lib/utils"

// Generic kanban board shared by the Properties and Projects data-issues
// pages — columns are ALWAYS the issue statuses; swimlanes are the kanban
// equivalent of the table's Group by. Pointer-based drag & drop (no lib, no
// HTML5 DnD — that conflicted with card clicks): press, move past a small
// threshold to lift the card, release over a column to change its status.
// A plain click (below the threshold) still opens the issue drawer.

export interface KanbanIssue {
  id: string
  status: PropIssueStatus
  severity: PropIssueSeverity
  source: PropIssueSource
  fieldLabel: string
  type: string
  description: string
  assignedTo: string | null
  reportedBy: string
  developer: { name: string }
  project: { name: string }
}

export type SwimlaneKey = "none" | "reportedBy" | "assignedTo" | "developer" | "project"
export const SWIMLANE_LABEL: Record<SwimlaneKey, string> = {
  none: "No swimlanes", reportedBy: "Reported By", assignedTo: "Assigned To", developer: "Developer", project: "Project",
}

function laneKeyOf(i: KanbanIssue, key: SwimlaneKey): string {
  switch (key) {
    case "reportedBy": return i.reportedBy
    case "assignedTo": return i.assignedTo ?? "Unassigned"
    case "developer": return i.developer.name
    case "project": return i.project.name
    default: return ""
  }
}

const STATUS_DOT: Record<PropIssueStatus, string> = {
  "To Do": "bg-gray-400",
  "In Progress": "bg-amber-500",
  Resolved: "bg-blue-500",
  Closed: "bg-emerald-500",
  Invalid: "bg-red-500",
}

function Card<T extends KanbanIssue>({
  issue, onOpen, renderMenuItems, dragging, onGrab,
}: {
  issue: T
  onOpen: (i: T) => void
  renderMenuItems?: (i: T) => React.ReactNode
  dragging: boolean
  onGrab: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onGrab}
      onClick={() => onOpen(issue)}
      className={cn(
        "cursor-grab space-y-1.5 rounded-lg border border-border bg-card p-2.5 transition-[opacity,border-color,box-shadow] hover:border-primary/40 hover:shadow-sm active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">{issue.id}</span>
        <span className="flex items-center gap-1">
          <span className={cn("whitespace-nowrap rounded-md border px-1.5 py-px text-[10px] font-medium", SEVERITY_COLORS[issue.severity])}>{issue.severity}</span>
          {renderMenuItems && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                {renderMenuItems(issue)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <ColorTag value={issue.fieldLabel} />
      </div>
      <p className="line-clamp-2 text-xs leading-snug text-foreground">{issue.description}</p>
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold",
            issue.assignedTo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}>
            {issue.assignedTo ? issue.assignedTo.split(" ").map((x) => x[0]).join("").slice(0, 2) : "—"}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">{issue.project.name}</span>
        </span>
        <span className={cn("shrink-0 whitespace-nowrap rounded-md border px-1.5 py-px text-[9px] font-medium", "border-border bg-muted/40 text-muted-foreground")}>{issue.source}</span>
      </div>
    </div>
  )
}

export function IssueKanban<T extends KanbanIssue>({
  issues, swimlane, onOpen, onStatusChange, renderMenuItems,
}: {
  issues: T[]
  swimlane: SwimlaneKey
  onOpen: (i: T) => void
  onStatusChange: (i: T, next: PropIssueStatus) => void
  renderMenuItems?: (i: T) => React.ReactNode
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null) // `${lane}|${status}`
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Pointer drag state — refs so window listeners always see the latest values
  const grabRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const dragOverRef = useRef<string | null>(null)

  const onGrab = (e: React.MouseEvent, issue: T) => {
    if (e.button !== 0) return
    // Don't start a drag from interactive bits inside the card (the ⋯ menu)
    if ((e.target as HTMLElement).closest("button")) return
    grabRef.current = { id: issue.id, x: e.clientX, y: e.clientY }
    didDragRef.current = false
    const move = (ev: MouseEvent) => {
      const g = grabRef.current
      if (!g) return
      if (!didDragRef.current) {
        if (Math.hypot(ev.clientX - g.x, ev.clientY - g.y) < 5) return
        didDragRef.current = true
        setDragId(g.id)
      }
      ev.preventDefault() // no text selection while dragging
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const key = (el?.closest("[data-drop-key]") as HTMLElement | null)?.dataset.dropKey ?? null
      if (dragOverRef.current !== key) {
        dragOverRef.current = key
        setDragOver(key)
      }
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
      const g = grabRef.current
      const key = dragOverRef.current
      grabRef.current = null
      dragOverRef.current = null
      setDragId(null)
      setDragOver(null)
      if (didDragRef.current && g && key) {
        const status = key.split("|").pop() as PropIssueStatus
        const dropped = issues.find((i) => i.id === g.id)
        if (dropped && dropped.status !== status) onStatusChange(dropped, status)
      }
      // The browser fires click right after mouseup — keep it suppressed until then
      setTimeout(() => { didDragRef.current = false }, 0)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  const lanes = useMemo(() => {
    if (swimlane === "none") return [{ label: "", issues }]
    const m = new Map<string, T[]>()
    for (const i of issues) {
      const k = laneKeyOf(i, swimlane)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(i)
    }
    return [...m.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, iss]) => ({ label, issues: iss }))
  }, [issues, swimlane])

  // Flat Jira-style column: light gray panel, uppercase header inside, no card wrapper
  const Column = ({ lane, status, cards }: { lane: string; status: PropIssueStatus; cards: T[] }) => {
    const key = `${lane}|${status}`
    return (
      <div
        data-drop-key={key}
        className={cn(
          "flex w-[264px] shrink-0 flex-col rounded-lg bg-muted/50 ring-1 ring-transparent transition-[background-color,box-shadow]",
          dragOver === key && "bg-primary/5 ring-primary/40",
        )}
      >
        <div className="flex shrink-0 items-center gap-1.5 px-3 pb-1.5 pt-2.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{status}</span>
          {cards.length > 0 && <span className="rounded bg-card px-1 text-[10px] font-semibold tabular-nums text-muted-foreground">{cards.length}</span>}
        </div>
        <div
          className={cn("min-h-[48px] flex-1 space-y-1.5 px-1.5 pb-1.5", swimlane === "none" && "overflow-y-auto")}
          style={swimlane === "none" ? { maxHeight: "calc(100vh - 330px)" } : undefined}
        >
          {cards.map((i) => (
            <Card
              key={i.id}
              issue={i}
              onOpen={(iss) => { if (!didDragRef.current) onOpen(iss) }}
              renderMenuItems={renderMenuItems}
              dragging={dragId === i.id}
              onGrab={(e) => onGrab(e, i)}
            />
          ))}
        </div>
      </div>
    )
  }

  // One horizontal scroller for the whole board so columns align across lanes
  return (
    <div className="overflow-x-auto">
      <div className={cn("min-w-max space-y-5", dragId && "select-none")}>
        {lanes.map(({ label, issues: laneIssues }) => {
          const isCollapsed = collapsed.has(label)
          return (
            <div key={label || "__all"}>
              {swimlane !== "none" && (
                <button
                  onClick={() => setCollapsed((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })}
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {label === "Unassigned" ? "—" : label.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                  </span>
                  {label}
                  <span className="text-xs font-normal text-muted-foreground">({laneIssues.length} issue{laneIssues.length !== 1 ? "s" : ""})</span>
                </button>
              )}
              {!isCollapsed && (
                <div className="flex gap-2">
                  {PROP_ISSUE_STATUSES.map((status) => (
                    <Column key={status} lane={label} status={status} cards={laneIssues.filter((i) => i.status === status)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

// Launch lifecycle dialogs — Set Active / Close Launch. They live here, not in
// launches-page, because launches-page already imports launch-details-page and
// both pages need these (same reason link-project-dialog.tsx exists).

import { useState } from "react"
import { ArrowRight, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IdTag } from "@/components/table-kit"
import { Tag, LISTING_COLORS, ENTRY_COLORS, PRIMARY_COLORS } from "@/components/projects-list-page"
import { type ProjectRow, type ProjPrimaryStatus } from "@/lib/projects-mock"
import { type Launch } from "@/lib/launches-mock"

const LAUNCH_STATUS_TONE: Record<Launch["launchStatus"], string> = {
  Active: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Upcoming: "border-blue-200 bg-blue-50 text-blue-700",
  Closed: "border-border bg-muted text-muted-foreground",
}

/** Context summary shown at the top of every launch action dialog. */
export function LaunchSummary({ launch }: { launch: Launch }) {
  const fields: [string, string][] = [
    ["Developer", launch.developer.name],
    ["Area", launch.area],
    ["Project", launch.projectNameEn],
    ...(launch.phase ? ([["Phase", launch.phase]] as [string, string][]) : []),
  ]
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 p-3">
      {fields.map(([k, v]) => (
        <div key={k}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
          <p className="truncate text-sm font-medium text-foreground">{v}</p>
        </div>
      ))}
    </div>
  )
}

export function ActionDialog({
  title, launch, message, children, confirmLabel, confirmClass, confirmDisabled, onClose, onConfirm,
}: {
  title: string
  launch?: Launch
  message?: string
  children?: React.ReactNode
  confirmLabel: string
  confirmClass?: string
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg" style={{ maxHeight: "88vh" }}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {launch && <LaunchSummary launch={launch} />}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {children}
        </div>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" className="bg-transparent" onClick={onClose}>Cancel</Button>
          <Button size="sm" className={confirmClass} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Opt-out card: the linked project's primary status follows the launch unless unticked. */
export function PrimarySyncCard({ project, target, checked, onToggle, note }: {
  project: ProjectRow
  target: ProjPrimaryStatus
  checked: boolean
  onToggle: () => void
  note?: string
}) {
  const launchProps = project.primaryStatusProps.launch.grouped
  const paG = project.primaryByEntry.Automatic.grouped
  const pmG = project.primaryByEntry.Manual.grouped
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Also change the linked project's primary status — untick to leave it unchanged:
      </p>
      <div className="rounded-lg border border-border">
        <div className="space-y-1 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Checkbox checked={checked} onCheckedChange={onToggle} className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
              <IdTag value={project.id} />
            </div>
            <Tag value={project.listingStatus} cls={LISTING_COLORS[project.listingStatus]} />
            <Tag value={project.entryType} cls={ENTRY_COLORS[project.entryType]} />
            <Tag value={project.primaryStatus} cls={PRIMARY_COLORS[project.primaryStatus]} />
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            {checked
              ? <Tag value={target} cls={PRIMARY_COLORS[target]} />
              : <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Unchanged</span>}
          </div>
          {checked && (
            <div className="pl-7 text-[10px] text-muted-foreground">
              Properties Impacted: <span className="font-medium text-foreground">{launchProps}</span> Launch,{" "}
              <span className="font-medium text-foreground">{paG}</span> Primary Automatic,{" "}
              <span className="font-medium text-foreground">{pmG}</span> Primary Manual
            </div>
          )}
        </div>
      </div>
      {!project.isPhase && note && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-4 text-blue-800">{note}</p>
      )}
    </div>
  )
}

export function ActivateDialog({ launch, conflict, project, onClose, onConfirm }: {
  launch: Launch
  conflict?: Launch
  project?: ProjectRow
  onClose: () => void
  onConfirm: (startDate: string, syncProject: boolean) => void
}) {
  const [startDate, setStartDate] = useState(launch.startDate ?? "")
  // The launch may have started collecting EOIs before it was recorded — but not long before.
  const minStart = (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString().slice(0, 10) })()
  const byType = launch.eoiByType ?? []
  const needsSync = !!project && project.primaryStatus !== "Launch"
  const [sync, setSync] = useState(true)

  return (
    <ActionDialog
      title="Activate Launch"
      launch={launch}
      message="Setting this launch to Active makes it live across Nawy's system. Pick the date it started collecting EOIs."
      confirmLabel="Activate Launch"
      confirmClass="bg-emerald-600 text-white hover:bg-emerald-700"
      confirmDisabled={!startDate}
      onClose={onClose}
      onConfirm={() => onConfirm(startDate, needsSync && sync)}
    >
      {conflict && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Only one launch can be active per project or phase. <span className="font-semibold">{conflict.projectNameEn}{conflict.phase ? ` — ${conflict.phase}` : ""} ({conflict.id})</span> is currently active and will be <span className="font-semibold">Closed</span> when this launch is activated.
        </div>
      )}

      {/* Launch status transition */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">Launch status</span>
        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", LAUNCH_STATUS_TONE[launch.launchStatus])}>{launch.launchStatus}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", LAUNCH_STATUS_TONE.Active)}>Active</span>
      </div>

      <div className="space-y-1.5">
        <Label>Launch Start Date <span className="text-red-500">*</span></Label>
        <Input type="date" min={minStart} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-4 text-blue-800">
          The date this launch started collecting EOIs — can't be more than 2 months in the past.
        </p>
      </div>

      {/* EOI reservation fees carried by this launch */}
      {launch.type === "Launch" && (
        <div className="rounded-lg border border-border">
          <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">EOI Reservation Fee</p>
          {byType.length > 0 ? (
            <div className="divide-y divide-border">
              {byType.map((e) => (
                <div key={e.type} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{e.type}</span>
                  <span className="font-medium tabular-nums">{e.amount.toLocaleString("en-US")} EGP</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2.5 text-sm">
              {launch.eoiAmount ? <span className="font-medium tabular-nums">{launch.eoiAmount.toLocaleString("en-US")} EGP</span> : <span className="text-muted-foreground">No EOI set</span>}
              <span className="ml-1.5 text-xs text-muted-foreground">for every property type</span>
            </p>
          )}
        </div>
      )}

      {needsSync && project && (
        <PrimarySyncCard
          project={project}
          target="Launch"
          checked={sync}
          onToggle={() => setSync((v) => !v)}
          note="Phases keep their own primary status — change them from the project's own Change Primary Status action."
        />
      )}
    </ActionDialog>
  )
}

export function CloseLaunchDialog({ launch, project, onClose, onConfirm }: {
  launch: Launch
  project?: ProjectRow
  onClose: () => void
  onConfirm: (endDate: string, nextPrimary?: ProjPrimaryStatus) => void
}) {
  const [endDate, setEndDate] = useState("")
  const canSync = !!project && project.primaryStatus === "Launch"
  const [sync, setSync] = useState(true)
  const [target, setTarget] = useState<ProjPrimaryStatus>("On-Sale")
  return (
    <ActionDialog
      title="Close Launch"
      launch={launch}
      message="A notification will be sent to the sales portal to flag EOIs collected after this date."
      confirmLabel="Close Launch"
      confirmClass="bg-red-600 text-white hover:bg-red-700"
      confirmDisabled={!endDate}
      onClose={onClose}
      onConfirm={() => onConfirm(endDate, canSync && sync ? target : undefined)}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">Launch status</span>
        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", LAUNCH_STATUS_TONE[launch.launchStatus])}>{launch.launchStatus}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", LAUNCH_STATUS_TONE.Closed)}>Closed</span>
      </div>

      <div className="space-y-1.5">
        <Label>Launch End Date <span className="text-red-500">*</span></Label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {canSync && project && (
        <>
          <div>
            <div className="mb-1.5 text-xs font-medium text-foreground">Move the project's primary status to</div>
            <div className="grid grid-cols-3 gap-2">
              {(["On-Sale", "On-Hold", "Sold-Off"] as ProjPrimaryStatus[]).map((s) => (
                <button
                  key={s} type="button" disabled={!sync} onClick={() => setTarget(s)}
                  className={cn(
                    "flex items-center justify-center rounded-lg border py-2 transition-colors",
                    !sync ? "cursor-not-allowed border-border opacity-45"
                    : target === s ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <Tag value={s} cls={PRIMARY_COLORS[s]} />
                </button>
              ))}
            </div>
          </div>
          <PrimarySyncCard
            project={project}
            target={target}
            checked={sync}
            onToggle={() => setSync((v) => !v)}
            note="Phases keep their own primary status — change them from the project's own Change Primary Status action."
          />
        </>
      )}
    </ActionDialog>
  )
}

"use client"

import { useMemo, useState } from "react"
import {
  Search, PanelRightClose, PanelRightOpen, FileText, ImageIcon, Video, Sheet as SheetIcon,
  Users, Sparkles, Info, CornerUpLeft, Download, Rocket, TrendingUp, Paperclip, Check,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { IdTag } from "@/components/table-kit"
import { cn } from "@/lib/utils"
import type { WaGroup } from "@/components/whatsapp-groups-page"
import {
  CHAT_GROUPS, membersFor, messagesFor, summariesFor, mediaFor, lastMessageOf, previewOf,
  fmtDay, fmtTime, type WaChatMessage, type WaChatMedia,
} from "@/lib/whatsapp-chats-mock"

const LABEL_TONE: Record<string, string> = {
  Developer: "border-blue-200 bg-blue-100 text-blue-700",
  Product: "border-purple-200 bg-purple-50 text-purple-700",
  Internal: "border-amber-200 bg-amber-50 text-amber-700",
  Other: "border-border bg-muted text-muted-foreground",
}
const TAG = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"

const FILE_ICON: Record<string, React.ElementType> = {
  Document: FileText, Image: ImageIcon, Video: Video, Sheet: SheetIcon,
}
const fileSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`)

/** What the ingestion pulled out of a message — the reason this chat matters to IMS. */
function ExtractionTag({ kind, id, label }: { kind: string; id: string; label: string }) {
  const tone =
    kind === "Launch" ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : kind === "Market Update" ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700"
  const Icon = kind === "Launch" ? Rocket : kind === "Market Update" ? TrendingUp : Paperclip
  return (
    <span className={cn("mt-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", tone)}>
      <Icon className="h-3 w-3" />
      {kind} · {label}
      <span className="font-mono opacity-70">{id}</span>
    </span>
  )
}

function MediaChip({ media, className }: { media: WaChatMedia; className?: string }) {
  const Icon = FILE_ICON[media.typeGroup] ?? FileText
  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5", className)}>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground">{media.fileName}</span>
        <span className="text-[10px] text-muted-foreground">{media.ext} · {fileSize(media.size)}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </div>
  )
}

function Bubble({ m }: { m: WaChatMessage }) {
  const own = m.sender.org === "Nawy"
  return (
    <div className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[min(560px,78%)] rounded-xl border px-3 py-2",
        own ? "border-emerald-200 bg-emerald-50" : "border-border bg-card",
      )}>
        {!own && <p className="mb-0.5 text-[11px] font-semibold text-primary">{m.sender.name}</p>}
        {m.replyTo && (
          <p className="mb-1 flex gap-1.5 rounded border-l-2 border-primary/40 bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
            <CornerUpLeft className="mt-px h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{m.replyTo}</span>
          </p>
        )}
        {m.media && <MediaChip media={m.media} className={cn(m.text && "mb-1.5")} />}
        {m.text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.text}</p>}
        {m.extraction && <ExtractionTag {...m.extraction} />}
        <p className={cn("mt-1 text-[10px] tabular-nums text-muted-foreground", own ? "text-right" : "text-left")}>
          {fmtTime(m.at)}
        </p>
      </div>
    </div>
  )
}

// ── right panel tabs ──────────────────────────────────────────────────────────
function DetailsTab({ g }: { g: WaGroup }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center">
        <img src={g.image} alt="" className="h-16 w-16 rounded-full" />
        <p className="text-sm font-semibold text-foreground">{g.name}</p>
        <IdTag value={g.id} />
        <span className={cn(TAG, LABEL_TONE[g.label])}>{g.label}</span>
      </div>
      <div className="rounded-xl border border-border bg-card px-3 py-1">
        <Row label="Developer" value={g.developer ? g.developer.name : <span className="text-muted-foreground">Not linked</span>} />
        <Row label="Status" value={
          <span className={cn(TAG, g.status === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>{g.status}</span>
        } />
        <Row label="Connected phone" value={<span className="font-mono text-[11px]">{g.connectedPhone}</span>} />
        <Row label="JID" value={<span className="break-all font-mono text-[10px]">{g.jid}</span>} />
        <Row label="Members" value={g.members.toLocaleString()} />
        <Row label="Total media" value={g.totalMedia.toLocaleString()} />
        <Row label="Classified media" value={g.classified.toLocaleString()} />
        <Row label="Created at" value={g.createdAt.replace("T", ", ").slice(0, 17)} />
        <Row label="Last message" value={g.lastMessageSent.replace("T", ", ").slice(0, 17)} />
      </div>
    </div>
  )
}

function MediaTab({ g }: { g: WaGroup }) {
  const items = mediaFor(g)
  if (items.length === 0) return <p className="py-10 text-center text-xs text-muted-foreground">No media shared in this chat.</p>
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.id} className="rounded-lg border border-border bg-card p-2">
          <MediaChip media={m} className="border-0 bg-transparent p-0" />
          <div className="mt-1.5 flex items-center justify-between gap-2 pl-6">
            <span className={cn(TAG, "border-border bg-muted px-1.5 py-0 text-[10px] text-muted-foreground")}>{m.mediaClass}</span>
            <span className="text-[10px] text-muted-foreground">{m.sender} · {fmtTime(m.at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SummariesTab({ g }: { g: WaGroup }) {
  return (
    <div className="space-y-2">
      {summariesFor(g).map((s) => (
        <div key={s.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{s.date}</span>
            <span className={cn(TAG, "border-border bg-muted px-1.5 py-0 text-[10px] text-muted-foreground")}>{s.tag}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{s.messages} messages</span>
            <span className={cn(TAG, "px-1.5 py-0 text-[10px]", s.processed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
              {s.processed ? "Processed" : "Pending"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{s.summary}</p>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Inquiries</p>
            {s.inquiries.map((i) => (
              <div key={i.id} className="flex items-start gap-1.5 text-[11px]">
                {i.status === "Resolved"
                  ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  : <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                <span className={cn("flex-1", i.status === "Resolved" ? "text-muted-foreground line-through" : "text-foreground")}>{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MembersTab({ g }: { g: WaGroup }) {
  const members = membersFor(g)
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] text-muted-foreground">
        Showing {members.length} of {g.members.toLocaleString()} members
      </p>
      {members.map((m) => (
        <div key={m.phone} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground">{m.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{m.phone}</span>
          </span>
          {m.role === "Admin" && <span className={cn(TAG, "px-1.5 py-0 text-[10px] border-blue-200 bg-blue-50 text-blue-700")}>Admin</span>}
          <span className={cn(TAG, "px-1.5 py-0 text-[10px]", m.org === "Nawy" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>
            {m.org}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export function WhatsAppChatsPage() {
  const groups = useMemo(
    () => [...CHAT_GROUPS].sort((a, b) => b.lastMessageSent.localeCompare(a.lastMessageSent)),
    [],
  )
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "")
  const [q, setQ] = useState("")
  const [panel, setPanel] = useState(true)

  const active = groups.find((g) => g.id === activeId) ?? groups[0]
  const visible = groups.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()))
  const messages = useMemo(() => (active ? messagesFor(active) : []), [active])

  // group messages under a date separator
  const days = useMemo(() => {
    const out: { day: string; items: WaChatMessage[] }[] = []
    for (const m of messages) {
      const day = fmtDay(new Date(m.at))
      const last = out[out.length - 1]
      if (last?.day === day) last.items.push(m)
      else out.push({ day, items: [m] })
    }
    return out
  }, [messages])

  if (!active) return null

  return (
    <div className="relative flex h-screen overflow-hidden bg-secondary/40">
      {/* ── chats ── */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-card">
        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">Whatsapp Chats</h1>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{groups.length}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats…" className="h-8 pl-8 text-xs" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {visible.map((g) => {
            const last = lastMessageOf(g)
            return (
              <button
                key={g.id}
                onClick={() => setActiveId(g.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary/70",
                  g.id === activeId && "bg-primary/5",
                )}
              >
                <img src={g.image} alt="" className="h-9 w-9 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{g.name}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{fmtTime(last.at)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{previewOf(last)}</span>
                  <span className="mt-1 flex items-center gap-1">
                    <span className={cn(TAG, "px-1.5 py-0 text-[10px]", LABEL_TONE[g.label])}>{g.label}</span>
                    {g.status === "Inactive" && <span className={cn(TAG, "px-1.5 py-0 text-[10px] border-border bg-muted text-muted-foreground")}>Inactive</span>}
                  </span>
                </span>
              </button>
            )
          })}
          {visible.length === 0 && <p className="px-4 py-10 text-center text-xs text-muted-foreground">No chat matches “{q}”.</p>}
        </div>
      </aside>

      {/* ── conversation ── */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-2.5">
          <img src={active.image} alt="" className="h-9 w-9 rounded-full" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate text-sm font-semibold text-foreground">{active.name}</h2>
              <span className={cn(TAG, "px-1.5 py-0 text-[10px]", LABEL_TONE[active.label])}>{active.label}</span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {active.members.toLocaleString()} members
              {active.developer && <> · {active.developer.name}</>}
              {" · "}{active.totalMedia.toLocaleString()} media
            </p>
          </div>
          <button
            onClick={() => setPanel((v) => !v)}
            title={panel ? "Hide group details" : "Show group details"}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary"
          >
            {panel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {days.map((d) => (
            <div key={d.day} className="space-y-2">
              <div className="sticky top-0 z-10 flex justify-center">
                <span className="rounded-md border border-border bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">{d.day}</span>
              </div>
              {d.items.map((m) => <Bubble key={m.id} m={m} />)}
            </div>
          ))}
          <p className="pt-2 text-center text-[10px] text-muted-foreground">
            Read-only — messages are ingested from WhatsApp, not sent from IMS.
          </p>
        </div>
      </section>

      {/* ── group details ── */}
      {panel && (
        <aside className="absolute right-0 top-0 z-20 flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-secondary/30 shadow-lg lg:static lg:z-auto lg:shadow-none">
          <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border bg-card px-3 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1 gap-1 px-1 text-[11px]"><Info className="h-3.5 w-3.5" />Details</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 gap-1 px-1 text-[11px]"><ImageIcon className="h-3.5 w-3.5" />Media</TabsTrigger>
                <TabsTrigger value="ai" className="flex-1 gap-1 px-1 text-[11px]"><Sparkles className="h-3.5 w-3.5" />AI</TabsTrigger>
                <TabsTrigger value="members" className="flex-1 gap-1 px-1 text-[11px]"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <TabsContent value="details" className="mt-0"><DetailsTab g={active} /></TabsContent>
              <TabsContent value="media" className="mt-0"><MediaTab g={active} /></TabsContent>
              <TabsContent value="ai" className="mt-0"><SummariesTab g={active} /></TabsContent>
              <TabsContent value="members" className="mt-0"><MembersTab g={active} /></TabsContent>
            </div>
          </Tabs>
        </aside>
      )}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import {
  Search, PanelRightClose, PanelRightOpen, FileText, ImageIcon, Video, Sheet as SheetIcon,
  Users, Sparkles, Info, CornerUpLeft, Download, Rocket, TrendingUp, Paperclip, Check,
  Play, Mic, X, SlidersHorizontal, MessageSquareText, ChartColumnBig,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { FilterSelect, IdTag } from "@/components/table-kit"
import { Battery, GroupAnalytics } from "@/components/whatsapp-analytics-page"
import { mediaPipeline, SERIES, STATE_COLOR } from "@/lib/whatsapp-analytics"
import { cn } from "@/lib/utils"
import type { WaGroup } from "@/components/whatsapp-groups-page"
import {
  CHAT_GROUPS, membersFor, messagesFor, summariesFor, mediaFor, lastMessageOf, previewOf,
  searchAllMessages, searchTextOf, kindOf, fmtDay, fmtTime, fmtDateTime, fmtDuration,
  type WaChatMessage, type WaChatMedia, type WaClassGuess,
} from "@/lib/whatsapp-chats-mock"

const LABEL_TONE: Record<string, string> = {
  Developer: "border-blue-200 bg-blue-100 text-blue-700",
  Product: "border-purple-200 bg-purple-50 text-purple-700",
  Internal: "border-amber-200 bg-amber-50 text-amber-700",
  Other: "border-border bg-muted text-muted-foreground",
}
const TAG = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
const MUTED_TAG = "border-border bg-muted text-muted-foreground"

const FILE_ICON: Record<string, React.ElementType> = {
  Document: FileText, Image: ImageIcon, Video: Video, Sheet: SheetIcon,
}
const fileSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`)

/** The applied media class — hover shows the classifier's top three and when it ran. */
function ClassTag({ classes, classifiedAt, className }: { classes: WaClassGuess[]; classifiedAt: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(TAG, MUTED_TAG, "cursor-help px-1.5 py-0 text-[10px]", className)}>{classes[0].name}</span>
      </TooltipTrigger>
      <TooltipContent className="w-56 space-y-1.5 p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Top classes</p>
        {classes.map((c, i) => (
          <div key={c.name} className="space-y-0.5">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className={cn(i === 0 && "font-semibold")}>{c.name}</span>
              <span className="tabular-nums opacity-80">{c.confidence}%</span>
            </div>
            <span className="block h-1 overflow-hidden rounded-full bg-white/20">
              <span className={cn("block h-full rounded-full", i === 0 ? "bg-emerald-400" : "bg-white/50")} style={{ width: `${c.confidence}%` }} />
            </span>
          </div>
        ))}
        <p className="border-t border-white/20 pt-1.5 text-[10px] opacity-70">Classified {fmtDateTime(classifiedAt)}</p>
      </TooltipContent>
    </Tooltip>
  )
}

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

/** Voice note — play affordance, waveform, duration, and the transcript the AI produced. */
function VoiceNote({ v, own }: { v: { durationSec: number; wave: number[]; transcript?: string }; own: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          own ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground",
        )}>
          <Play className="h-3 w-3 fill-current" />
        </span>
        <span className="flex h-7 flex-1 items-center gap-[2px]">
          {v.wave.map((h, i) => (
            <span key={i} className={cn("w-[2px] rounded-full", own ? "bg-emerald-600/50" : "bg-muted-foreground/40")} style={{ height: `${Math.round(h * 24)}px` }} />
          ))}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{fmtDuration(v.durationSec)}</span>
      </div>
      {v.transcript && (
        <p className="flex gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] italic leading-relaxed text-muted-foreground">
          <Mic className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{v.transcript}</span>
        </p>
      )}
    </div>
  )
}

function Bubble({ m, highlight }: { m: WaChatMessage; highlight?: string }) {
  const own = m.sender.org === "Nawy"
  const mark = (t: string) => {
    const q = highlight?.trim()
    if (!q || q.length < 2) return t
    const i = t.toLowerCase().indexOf(q.toLowerCase())
    if (i < 0) return t
    return (<>{t.slice(0, i)}<mark className="rounded bg-amber-200 px-0.5">{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>)
  }
  return (
    <div className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[min(560px,78%)] rounded-xl border px-3 py-2",
        own ? "border-emerald-200 bg-emerald-50" : "border-border bg-card",
      )}>
        <p className="mb-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn("text-[11px] font-semibold", own ? "text-emerald-700" : "text-primary")}>{m.sender.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{m.sender.phone}</span>
        </p>
        {m.replyTo && (
          <p className="mb-1 flex gap-1.5 rounded border-l-2 border-primary/40 bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
            <CornerUpLeft className="mt-px h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{m.replyTo}</span>
          </p>
        )}
        {m.voice && <VoiceNote v={m.voice} own={own} />}
        {m.media && <MediaChip media={m.media} className={cn(m.text && "mb-1.5")} />}
        {m.text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{mark(m.text)}</p>}
        {m.media && (
          <span className="mt-1.5 flex items-center gap-1.5">
            <ClassTag classes={m.media.classes} classifiedAt={m.media.classifiedAt} />
          </span>
        )}
        {m.extraction && <ExtractionTag {...m.extraction} />}
        <div className={cn("mt-1 flex items-center gap-1.5", own ? "justify-end" : "justify-start")}>
          {m.reactions?.map((r) => (
            <Tooltip key={r.emoji}>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-0.5 rounded-full border border-border bg-background px-1.5 py-px text-[11px] leading-none">
                  {r.emoji}<span className="text-[10px] text-muted-foreground">{r.by.length}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{r.by.join(", ")}</TooltipContent>
            </Tooltip>
          ))}
          <span className="text-[10px] tabular-nums text-muted-foreground">{fmtTime(m.at)}</span>
        </div>
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
          <span className={cn(TAG, g.status === "Active" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : MUTED_TAG)}>{g.status}</span>
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

/** Media of the chat as a grid — same pipeline framing as the analytics page:
 *  classified → assigned to a project → embedded. */
function MediaTab({ g }: { g: WaGroup }) {
  const all = useMemo(() => mediaFor(g), [g])
  const pipe = useMemo(() => mediaPipeline({ groupId: g.id }), [g])
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [cls, setCls] = useState("")
  const [state, setState] = useState("")
  const types = [...new Set(all.map((m) => m.typeGroup))]
  const classes = [...new Set(all.map((m) => m.mediaClass))]
  const items = all.filter((m) =>
    (!q || m.fileName.toLowerCase().includes(q.trim().toLowerCase()) || m.projects.some((p) => p.toLowerCase().includes(q.trim().toLowerCase()))) &&
    (!type || m.typeGroup === type) &&
    (!cls || m.mediaClass === cls) &&
    (!state || m.embedding === state))

  const stateTone: Record<string, string> = {
    Embedded: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Failed: "border-red-200 bg-red-50 text-red-700",
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
        <Battery label="Classified" r={pipe.classified} />
        <Battery label="Assigned to a project" r={pipe.assigned} color={SERIES[0]} />
        <Battery label="Embedded" r={pipe.embedded!} color={SERIES[3]} note={pipe.failed ? `${pipe.failed} failed` : undefined} />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file or project…" className="h-8 bg-card pl-8 text-xs" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <FilterSelect label="Type" value={type} options={types} onChange={setType} width="w-full" />
        <FilterSelect label="Class" value={cls} options={classes} onChange={setCls} width="w-full" />
        <FilterSelect label="Embedding" value={state} options={["Embedded", "Pending", "Failed"]} onChange={setState} width="w-full" />
      </div>
      <p className="text-[10px] text-muted-foreground">{items.length} of {all.length} files</p>

      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => {
          const Icon = FILE_ICON[m.typeGroup] ?? FileText
          return (
            <div key={m.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative flex aspect-square items-center justify-center bg-muted/60">
                <Icon className="h-8 w-8 text-muted-foreground/70" />
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white"
                  title={`Embedding: ${m.embedding}`}
                  style={{ background: m.embedding === "Embedded" ? STATE_COLOR.done : m.embedding === "Failed" ? STATE_COLOR.failed : STATE_COLOR.pending }}
                />
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-[11px] font-medium text-foreground" title={m.fileName}>{m.fileName}</p>
                <p className="text-[10px] text-muted-foreground">{m.ext} · {fileSize(m.size)}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <ClassTag classes={m.classes} classifiedAt={m.classifiedAt} />
                  <span className={cn(TAG, "px-1.5 py-0 text-[10px]", stateTone[m.embedding])}>{m.embedding}</span>
                </div>
                {m.projects.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {m.projects.map((p) => (
                      <span key={p} className={cn(TAG, "border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] text-blue-700")}>{p}</span>
                    ))}
                  </div>
                ) : (
                  <span className={cn(TAG, MUTED_TAG, "px-1.5 py-0 text-[10px]")}>Not assigned</span>
                )}
                <p className="text-[10px] text-muted-foreground">{m.sender} · {fmtTime(m.at)}</p>
              </div>
            </div>
          )
        })}
      </div>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          {all.length === 0 ? "No media shared in this chat." : "No file matches these filters."}
        </p>
      )}
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
            <span className={cn(TAG, MUTED_TAG, "px-1.5 py-0 text-[10px]")}>{s.tag}</span>
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
          <span className={cn(TAG, "px-1.5 py-0 text-[10px]", m.org === "Nawy" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : MUTED_TAG)}>
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
  const [panel, setPanel] = useState(true)

  // chat list: global search + filters
  const [q, setQ] = useState("")
  const [showChatFilters, setShowChatFilters] = useState(false)
  const [labelF, setLabelF] = useState("")
  const [devF, setDevF] = useState("")
  const [statusF, setStatusF] = useState("")

  // per-chat search + filter
  const [chatQ, setChatQ] = useState("")
  const [kindF, setKindF] = useState("")
  const [showChatSearch, setShowChatSearch] = useState(false)

  const active = groups.find((g) => g.id === activeId) ?? groups[0]
  const needle = q.trim().toLowerCase()

  const visibleGroups = groups.filter((g) =>
    (!needle || g.name.toLowerCase().includes(needle)) &&
    (!labelF || g.label === labelF) &&
    (!devF || g.developer?.name === devF) &&
    (!statusF || g.status === statusF))
  const messageHits = useMemo(() => searchAllMessages(q), [q])
  const chatFilterCount = [labelF, devF, statusF].filter(Boolean).length

  const allMessages = useMemo(() => (active ? messagesFor(active) : []), [active])
  const messages = allMessages.filter((m) =>
    (!chatQ.trim() || searchTextOf(m).includes(chatQ.trim().toLowerCase())) &&
    (!kindF || kindOf(m) === kindF.toLowerCase()))

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

  const openChatAt = (groupId: string, text: string) => {
    setActiveId(groupId)
    setQ("")
    setShowChatSearch(true)
    setChatQ(text)
  }

  if (!active) return null

  return (
    <div className="relative flex h-screen overflow-hidden bg-secondary/40">
      {/* ── chats ── */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-card">
        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">Whatsapp Chats</h1>
            <span className="rounded-md border border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700">{groups.length}</span>
            <button
              onClick={() => setShowChatFilters((v) => !v)}
              title="Filter chats"
              className={cn(
                "ml-auto flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium transition-colors hover:bg-secondary",
                chatFilterCount > 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters{chatFilterCount > 0 && ` · ${chatFilterCount}`}
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats and messages…" className="h-8 pl-8 pr-7 text-xs" />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {showChatFilters && (
            <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-2">
              <FilterSelect label="Label" value={labelF} options={[...new Set(groups.map((g) => g.label))]} onChange={setLabelF} width="w-full" />
              <FilterSelect label="Developer" value={devF} options={[...new Set(groups.map((g) => g.developer?.name).filter(Boolean) as string[])]} onChange={setDevF} width="w-full" />
              <FilterSelect label="Status" value={statusF} options={["Active", "Inactive"]} onChange={setStatusF} width="w-full" />
              {chatFilterCount > 0 && (
                <button onClick={() => { setLabelF(""); setDevF(""); setStatusF("") }} className="text-[11px] font-medium text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {needle.length >= 2 && (
            <p className="bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Chats · {visibleGroups.length}
            </p>
          )}
          {visibleGroups.map((g) => {
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
                    {g.status === "Inactive" && <span className={cn(TAG, MUTED_TAG, "px-1.5 py-0 text-[10px]")}>Inactive</span>}
                  </span>
                </span>
              </button>
            )
          })}
          {visibleGroups.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">No chat matches.</p>
          )}

          {/* global message search — every chat, not just the open one */}
          {needle.length >= 2 && (
            <>
              <p className="bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Messages · {messageHits.length}
              </p>
              {messageHits.map(({ group, message }) => (
                <button
                  key={message.id}
                  onClick={() => openChatAt(group.id, q)}
                  className="flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-secondary/70"
                >
                  <img src={group.image} alt="" className="h-7 w-7 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">{group.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(message.at)}</span>
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      <span className="text-foreground">{message.sender.name}:</span> {previewOf(message)}
                    </span>
                  </span>
                </button>
              ))}
              {messageHits.length === 0 && (
                <p className="px-4 py-4 text-center text-xs text-muted-foreground">No message matches “{q}”.</p>
              )}
            </>
          )}
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
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => { setShowChatSearch((v) => !v); if (showChatSearch) { setChatQ(""); setKindF("") } }}
              title="Search in this chat"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary",
                showChatSearch ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPanel((v) => !v)}
              title={panel ? "Hide group details" : "Show group details"}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary"
            >
              {panel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {showChatSearch && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-5 py-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={chatQ} onChange={(e) => setChatQ(e.target.value)} placeholder={`Search in ${active.name}…`} className="h-8 pl-8 text-xs" />
            </div>
            <FilterSelect label="Message type" value={kindF} options={["Text", "Media", "Voice"]} onChange={setKindF} width="w-40" />
            <span className="text-[11px] text-muted-foreground">
              {messages.length} of {allMessages.length} messages
            </span>
            {(chatQ || kindF) && (
              <button onClick={() => { setChatQ(""); setKindF("") }} className="text-[11px] font-medium text-primary hover:underline">Clear</button>
            )}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {days.map((d) => (
            <div key={d.day} className="space-y-2">
              <div className="sticky top-0 z-10 flex justify-center">
                <span className="rounded-md border border-border bg-card px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">{d.day}</span>
              </div>
              {d.items.map((m) => <Bubble key={m.id} m={m} highlight={chatQ} />)}
            </div>
          ))}
          {days.length === 0 && (
            <p className="flex flex-col items-center gap-1 py-16 text-center text-xs text-muted-foreground">
              <MessageSquareText className="h-5 w-5" />
              No message in this chat matches the search.
            </p>
          )}
          <p className="pt-2 text-center text-[10px] text-muted-foreground">
            Read-only — messages are ingested from WhatsApp, not sent from IMS.
          </p>
        </div>
      </section>

      {/* ── group details ── */}
      {panel && (
        <aside className="absolute right-0 top-0 z-20 flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-secondary/30 shadow-lg xl:static xl:z-auto xl:shadow-none">
          <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border bg-card px-3 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1 gap-1 px-1 text-[11px]"><Info className="h-3.5 w-3.5" />Details</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 gap-1 px-1 text-[11px]"><ImageIcon className="h-3.5 w-3.5" />Media</TabsTrigger>
                <TabsTrigger value="stats" className="flex-1 gap-1 px-1 text-[11px]"><ChartColumnBig className="h-3.5 w-3.5" />Stats</TabsTrigger>
                <TabsTrigger value="ai" className="flex-1 gap-1 px-1 text-[11px]"><Sparkles className="h-3.5 w-3.5" />AI</TabsTrigger>
                <TabsTrigger value="members" className="flex-1 gap-1 px-1 text-[11px]"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <TabsContent value="details" className="mt-0"><DetailsTab g={active} /></TabsContent>
              <TabsContent value="media" className="mt-0"><MediaTab g={active} /></TabsContent>
              <TabsContent value="stats" className="mt-0"><GroupAnalytics group={active} /></TabsContent>
              <TabsContent value="ai" className="mt-0"><SummariesTab g={active} /></TabsContent>
              <TabsContent value="members" className="mt-0"><MembersTab g={active} /></TabsContent>
            </div>
          </Tabs>
        </aside>
      )}
    </div>
  )
}

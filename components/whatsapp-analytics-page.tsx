"use client"

import { useMemo, useState } from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  MessageSquareText, Paperclip, Mic, PackageSearch, Megaphone, Users,
  Tags, FolderTree, Binary, Rocket, HandCoins, Boxes,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter, FilterSelect } from "@/components/table-kit"
import { cn } from "@/lib/utils"
import type { WaGroup } from "@/components/whatsapp-groups-page"
import { CHAT_GROUPS, classOf, fmtDateTime, MARKET_CLASSES, type WaMsgClass } from "@/lib/whatsapp-chats-mock"
import {
  DEVELOPERS, SERIES, STATE_COLOR, activitySeries, askedVsSent, askers, classPipeline,
  dateBounds, embeddingSplit, headline, marketByDeveloper, marketClassSplit, marketFeed,
  mediaClasses, mediaPipeline, mediaTypes, membersOfGroup, messageClasses, messagePipeline,
  requestAnswerRate, requestFeed, scopedGroups, senders, topDevelopers, topGroups, topMembers,
  topProjects, topicsOfGroup, type ActivityPoint, type Bucket, type Granularity, type Ratio, type Scope,
} from "@/lib/whatsapp-analytics"

const GRANULARITIES: Granularity[] = ["Hour", "Day", "Week", "Month"]
const AXIS = { fontSize: 10, fill: "#94a3b8" }
const TOOLTIP = {
  contentStyle: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11, color: "#f1f5f9" },
  labelStyle: { color: "#94a3b8", fontSize: 10 },
  cursor: { fill: "rgba(148,163,184,0.12)" },
}

// ── shells ────────────────────────────────────────────────────────────────────
export function ChartCard({ title, hint, action, children, className }: {
  title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function StatTile({ label, value, hint, icon: Icon }: {
  label: string; value: number | string; hint?: string; icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold leading-7 tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A metric that is a share of something — "12 / 48" with the bar underneath. */
export function RatioTile({ label, r, hint, icon: Icon, color = SERIES[0] }: {
  label: string; r: Ratio; hint?: string; icon: React.ElementType; color?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1 leading-7">
        <span className="text-xl font-semibold tabular-nums text-foreground">{r.done.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">/ {r.total.toLocaleString()}</span>
        <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color }}>{r.pct}%</span>
      </p>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: color }} />
      </span>
      {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Ranked rows with the bar behind the label — every row carries its own value. */
export function BarList({ items, unit = "messages", color = SERIES[0], compact }: {
  items: Bucket[]; unit?: string; color?: string; compact?: boolean
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">Nothing in this range.</p>
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.key} className="relative" title={`${it.label} · ${it.value} ${unit}`}>
          <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/60">
            <span
              className="absolute inset-y-0 left-0 rounded-md"
              style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? color, opacity: 0.14 }}
              aria-hidden
            />
            <span className="relative z-10 flex min-w-0 items-center gap-2">
              {it.image && <img src={it.image} alt="" className="h-5 w-5 shrink-0 rounded-full" />}
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-foreground">{it.label}</span>
                {!compact && it.sub && <span className="block truncate text-[10px] text-muted-foreground">{it.sub}</span>}
              </span>
            </span>
            <span className="relative z-10 shrink-0 text-xs font-semibold tabular-nums text-foreground">{it.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** A single coverage bar — the "battery": how much of a set reached a step. */
export function Battery({ label, r, color = STATE_COLOR.done, note }: {
  label: string; r: Ratio; color?: string; note?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{r.done}</span> / {r.total} · {r.pct}%
        </span>
      </div>
      <span className="block h-2 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full transition-[width]" style={{ width: `${r.pct}%`, background: color }} />
      </span>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  )
}

/** Horizontal stacked bar — segments keep a 2px gap so they never blur together. */
export function StackedRow({ label, total, segments }: {
  label: string; total: number; segments: { key: string; value: number; color: string }[]
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">{total}</span>
      </div>
      <span className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted">
        {segments.filter((s) => s.value > 0).map((s) => (
          <span
            key={s.key}
            title={`${s.key}: ${s.value}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / Math.max(1, total)) * 100}%`, background: s.color }}
          />
        ))}
      </span>
    </div>
  )
}

export function Legend2({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function DonutCard({ items, height = 170, unit = "files" }: { items: Bucket[]; height?: number; unit?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total === 0) return <p className="py-10 text-center text-xs text-muted-foreground">Nothing in this range.</p>
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {items.map((i) => <Cell key={i.key} fill={i.color ?? SERIES[0]} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={(v: number, n: string) => [`${v} ${unit} · ${Math.round((v / total) * 100)}%`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none tabular-nums text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: i.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{i.value}</span>
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round((i.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ActivityChart({ data, height = 220, compact }: { data: ActivityPoint[]; height?: number; compact?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {["messages", "media", "voice"].map((k, i) => (
            <linearGradient key={k} id={`wa-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={34} />
        <Tooltip {...TOOLTIP} cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "3 3" }} />
        {!compact && <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />}
        <Area type="monotone" dataKey="messages" name="Messages" stroke={SERIES[0]} strokeWidth={2} fill="url(#wa-messages)" dot={false} />
        <Area type="monotone" dataKey="media" name="Media" stroke={SERIES[1]} strokeWidth={2} fill="url(#wa-media)" dot={false} />
        <Area type="monotone" dataKey="voice" name="Voice notes" stroke={SERIES[2]} strokeWidth={2} fill="url(#wa-voice)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AskedVsSentChart({ data, askLabel, sentLabel }: {
  data: { name: string; asked: number; sent: number }[]; askLabel: string; sentLabel: string
}) {
  if (data.length === 0) return <p className="py-10 text-center text-xs text-muted-foreground">Nothing in this range.</p>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={46} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="sent" name={sentLabel} fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="asked" name={askLabel} fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const CLASS_TONE: Record<string, string> = {
  "New Launch": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Payment Plan": "border-violet-200 bg-violet-50 text-violet-700",
  "Price Update": "border-amber-200 bg-amber-50 text-amber-700",
  "Delivery Update": "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Availability Update": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Availability Request": "border-orange-200 bg-orange-50 text-orange-700",
  "Material Sent": "border-blue-200 bg-blue-50 text-blue-700",
  "Material Request": "border-orange-200 bg-orange-50 text-orange-700",
  "Unit Offer": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Offer Request": "border-orange-200 bg-orange-50 text-orange-700",
}

/** The message feeds under the charts — what the numbers are actually made of. */
function MessageFeed({ items, empty }: { items: { group: WaGroup; m: ReturnType<typeof classOf> extends never ? never : any }[]; empty: string }) {
  if (items.length === 0) return <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border/70">
      {items.map(({ group, m }) => (
        <li key={m.id} className="flex items-start gap-2.5 py-2">
          <img src={group.image} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">{m.sender.name}</span>
              <span className="text-[10px] text-muted-foreground">{group.name}</span>
              <span className={cn("rounded-md border px-1.5 py-0 text-[10px] font-medium", CLASS_TONE[classOf(m)] ?? "border-border bg-muted text-muted-foreground")}>
                {classOf(m)}
              </span>
              <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{fmtDateTime(m.at)}</span>
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {m.text ?? m.voice?.transcript ?? m.media?.fileName ?? "—"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ── the Stats tab of one chat ─────────────────────────────────────────────────
export function GroupAnalytics({ group }: { group: WaGroup }) {
  const scope: Scope = { groupId: group.id }
  const h = headline(scope)
  const pipe = mediaPipeline(scope)
  const data = useMemo(() => activitySeries("Day", scope), [group.id])
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Messages" value={h.messages} icon={MessageSquareText} />
        <RatioTile label="Members" r={h.members} icon={Users} color={SERIES[3]} />
        <RatioTile label="Media classified" r={h.media} icon={Paperclip} color={SERIES[1]} />
        <RatioTile label="Voice classified" r={h.voice} icon={Mic} color={SERIES[2]} />
      </div>
      <ChartCard title="Activity" hint="Last 14 days">
        <ActivityChart data={data} height={130} compact />
      </ChartCard>
      <ChartCard title="Pipeline" hint="Files in this chat">
        <div className="space-y-2.5">
          <Battery label="Classified" r={pipe.classified} />
          <Battery label="Assigned to a project" r={pipe.assigned} color={SERIES[0]} />
          <Battery label="Embedded" r={pipe.embedded!} color={SERIES[3]} note={pipe.failed ? `${pipe.failed} failed` : undefined} />
        </div>
      </ChartCard>
      <ChartCard title="Most active members">
        <BarList items={membersOfGroup(group, 5)} compact />
      </ChartCard>
      <ChartCard title="Message classes" hint={`${h.availability.total} availability updates`}>
        <BarList items={topicsOfGroup(group).slice(0, 5)} color={SERIES[3]} compact />
      </ChartCard>
      <ChartCard title="Media by class">
        <DonutCard items={mediaClasses(scope)} height={130} />
      </ChartCard>
    </div>
  )
}

// ── the page ──────────────────────────────────────────────────────────────────
export function WhatsAppAnalyticsPage() {
  const [developer, setDeveloper] = useState("")
  const [groupName, setGroupName] = useState("")
  const bounds = useMemo(() => dateBounds(), [])
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [gran, setGran] = useState<Granularity>("Day")

  const groupOptions = CHAT_GROUPS.filter((g) => !developer || g.developer?.name === developer).map((g) => g.name)
  const groupId = CHAT_GROUPS.find((g) => g.name === groupName)?.id
  const scope: Scope = { developer: developer || undefined, groupId, from: from || undefined, to: to || undefined }
  const scopeKey = `${developer}|${groupId ?? ""}|${from}|${to}`

  const h = useMemo(() => headline(scope), [scopeKey])
  const activity = useMemo(() => activitySeries(gran, scope), [gran, scopeKey])
  const mediaPipe = useMemo(() => mediaPipeline(scope), [scopeKey])
  const msgPipe = useMemo(() => messagePipeline(scope), [scopeKey])
  const filtered = Boolean(developer || groupName || from || to)
  const scopeLabel = groupName || developer || "All groups"

  return (
    <div className="min-h-screen space-y-4 bg-secondary/40 p-6">
      <div>
        <h1 className="text-xl font-semibold">WhatsApp Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Who is active, what comes in, how much of it is classified — across every connected group.
        </p>
      </div>

      {/* global filters — they scope every tab */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <FilterSelect label="Developer" value={developer} options={DEVELOPERS} onChange={(v) => { setDeveloper(v); setGroupName("") }} width="w-56" />
        <FilterSelect label="Group" value={groupName} options={groupOptions} onChange={setGroupName} width="w-60" />
        <DateRangeFilter label="Date range" dateFrom={from} dateTo={to} onChangeFrom={setFrom} onChangeTo={setTo} />
        <span className="text-[11px] text-muted-foreground">
          {bounds.min} → {bounds.max} available
        </span>
        {filtered && (
          <button onClick={() => { setDeveloper(""); setGroupName(""); setFrom(""); setTo("") }} className="ml-auto text-xs font-medium text-primary hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Boxes className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="classification" className="gap-1.5"><Tags className="h-3.5 w-3.5" />Classification</TabsTrigger>
          <TabsTrigger value="availability" className="gap-1.5"><PackageSearch className="h-3.5 w-3.5" />Availability</TabsTrigger>
          <TabsTrigger value="market" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Market Updates</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Messages" value={h.messages} icon={MessageSquareText} hint={scopeLabel} />
            <RatioTile label="Members active" r={h.members} icon={Users} color={SERIES[3]} hint={`of ${h.members.total.toLocaleString()} in ${scopedGroups(scope).length} groups`} />
            <RatioTile label="Media classified" r={h.media} icon={Paperclip} color={SERIES[1]} hint={`${h.media.total - h.media.done} still unclassified`} />
            <RatioTile label="Voice classified" r={h.voice} icon={Mic} color={SERIES[2]} hint={`${h.voice.total - h.voice.done} to transcribe`} />
            <StatTile label="Availability updates" value={h.availability.total} icon={PackageSearch} hint={`${h.availability.fromMessages} messages · ${h.availability.fromFiles} files`} />
            <StatTile label="Market updates" value={h.market.total} icon={Megaphone} hint={h.market.byClass.slice(0, 2).map((c) => `${c.value} ${c.label.toLowerCase()}`).join(" · ")} />
          </div>

          <Section title="Activity">
            <ChartCard
              title="Activity over time"
              hint={scopeLabel}
              action={
                <div className="flex overflow-hidden rounded-md border border-border text-[11px] font-medium">
                  {GRANULARITIES.map((g) => (
                    <button key={g} onClick={() => setGran(g)} className={cn("px-2.5 py-1 transition-colors", gran === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                      {g}
                    </button>
                  ))}
                </div>
              }
            >
              <ActivityChart data={activity} />
            </ChartCard>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <ChartCard title="Developers" hint="Messages in their groups"><BarList items={topDevelopers(scope)} /></ChartCard>
              <ChartCard title="Groups" hint="Busiest conversations"><BarList items={topGroups(scope)} color={SERIES[1]} /></ChartCard>
              <ChartCard title="Members" hint="Nawy and developer side"><BarList items={topMembers(scope)} color={SERIES[3]} /></ChartCard>
            </div>
          </Section>

          <Section title="Availability updates">
            <div className="grid gap-3 lg:grid-cols-3">
              <ChartCard title="Who asks" hint="Availability, material or an offer">
                <BarList items={askers(scope)} unit="requests" color={SERIES[2]} />
              </ChartCard>
              <ChartCard title="Who delivers" hint="Updates, material and unit offers sent">
                <BarList items={senders(scope)} unit="deliveries" color={SERIES[1]} />
              </ChartCard>
              <ChartCard title="Asked vs delivered" hint="Availability, per group">
                <AskedVsSentChart data={askedVsSent(scope, "Availability Request", "Availability Update", 5)} askLabel="We asked" sentLabel="Updates sent" />
              </ChartCard>
            </div>
          </Section>

          <Section title="Classification">
            <div className="grid gap-3 lg:grid-cols-3">
              <ChartCard title="Coverage" hint="Everything received in this range">
                <div className="space-y-3">
                  <Battery label="Messages classified" r={msgPipe.classified} color={SERIES[0]} />
                  <Battery label="Messages assigned to a project" r={msgPipe.assigned} color={SERIES[3]} />
                  <Battery label="Files classified" r={mediaPipe.classified} />
                  <Battery label="Files assigned to a project" r={mediaPipe.assigned} color={SERIES[0]} />
                  <Battery label="Files embedded" r={mediaPipe.embedded!} color={SERIES[3]} note={mediaPipe.failed ? `${mediaPipe.failed} failed` : undefined} />
                </div>
              </ChartCard>
              <ChartCard title="Message classification" hint="What the classifier filed them as">
                <BarList items={messageClasses(scope).slice(0, 7)} color={SERIES[0]} compact />
              </ChartCard>
              <ChartCard title="Media classification">
                <DonutCard items={mediaClasses(scope)} />
              </ChartCard>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <ChartCard title="Project assignment" hint="Files and messages attached to each project">
                <BarList items={topProjects(scope)} unit="records" color={SERIES[5]} compact />
              </ChartCard>
              <ChartCard title="By file type"><DonutCard items={mediaTypes(scope)} /></ChartCard>
            </div>
          </Section>
        </TabsContent>

        {/* ── CLASSIFICATION ───────────────────────────────────────────────── */}
        <TabsContent value="classification" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <RatioTile label="Messages classified" r={msgPipe.classified} icon={Tags} color={SERIES[0]} />
            <RatioTile label="Messages assigned" r={msgPipe.assigned} icon={FolderTree} color={SERIES[3]} />
            <RatioTile label="Files classified" r={mediaPipe.classified} icon={Tags} color={SERIES[1]} />
            <RatioTile label="Files assigned" r={mediaPipe.assigned} icon={FolderTree} color={SERIES[0]} />
            <RatioTile label="Files embedded" r={mediaPipe.embedded!} icon={Binary} color={SERIES[3]} hint={`${mediaPipe.failed} failed · files only`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Where files stand" hint="Classify → assign → embed. Embedding applies to files only.">
              <div className="space-y-3">
                <Battery label="Classified" r={mediaPipe.classified} />
                <Battery label="Assigned to a project" r={mediaPipe.assigned} color={SERIES[0]} />
                <Battery label="Embedded" r={mediaPipe.embedded!} color={SERIES[3]} />
                <div className="pt-1">
                  <StackedRow
                    label="Embedding state"
                    total={mediaPipe.total}
                    segments={embeddingSplit(scope).map((b) => ({ key: b.label, value: b.value, color: b.color! }))}
                  />
                  <div className="mt-1.5">
                    <Legend2 items={embeddingSplit(scope).map((b) => ({ label: `${b.label} · ${b.value}`, color: b.color! }))} />
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Pipeline by media class" hint="How far each class got">
              <div className="space-y-2.5">
                {classPipeline(scope).map((r) => (
                  <StackedRow
                    key={r.name}
                    label={r.name}
                    total={r.total}
                    segments={[
                      { key: "Embedded", value: r.embedded, color: STATE_COLOR.done },
                      { key: "Assigned, not embedded", value: r.assigned, color: SERIES[0] },
                      { key: "Waiting", value: r.waiting, color: STATE_COLOR.pending },
                      { key: "Failed", value: r.failed, color: STATE_COLOR.failed },
                    ]}
                  />
                ))}
                <Legend2 items={[
                  { label: "Embedded", color: STATE_COLOR.done },
                  { label: "Assigned", color: SERIES[0] },
                  { label: "Waiting", color: STATE_COLOR.pending },
                  { label: "Failed", color: STATE_COLOR.failed },
                ]} />
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Message classes"><BarList items={messageClasses(scope)} color={SERIES[0]} compact /></ChartCard>
            <ChartCard title="Media classes"><DonutCard items={mediaClasses(scope)} /></ChartCard>
            <ChartCard title="Project assignment" hint="Across files and messages">
              <BarList items={topProjects(scope)} unit="records" color={SERIES[5]} compact />
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── AVAILABILITY ─────────────────────────────────────────────────── */}
        <TabsContent value="availability" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Availability updates" value={h.availability.total} icon={PackageSearch} hint={`${h.availability.fromMessages} messages · ${h.availability.fromFiles} files`} />
            <StatTile label="Availability requests" value={requestFeed(scope, ["Availability Request"], 9999).length} icon={PackageSearch} />
            <StatTile label="Material requests" value={requestFeed(scope, ["Material Request"], 9999).length} icon={Paperclip} />
            <StatTile label="Unit offer requests" value={requestFeed(scope, ["Offer Request"], 9999).length} icon={HandCoins} />
            <RatioTile label="Answered in 6h" r={requestAnswerRate(scope)} icon={MessageSquareText} color={SERIES[1]} hint="A developer replied after the ask" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Who asks for availability or material" hint="Nawy side">
              <BarList items={askers(scope, ["Availability Request", "Material Request"])} unit="requests" color={SERIES[2]} />
            </ChartCard>
            <ChartCard title="Who sends availability or material" hint="Developer side">
              <BarList items={senders(scope, ["Availability Update", "Material Sent"])} unit="deliveries" color={SERIES[1]} />
            </ChartCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Availability: asked vs sent">
              <AskedVsSentChart data={askedVsSent(scope, "Availability Request", "Availability Update", 5)} askLabel="We asked" sentLabel="Updates sent" />
            </ChartCard>
            <ChartCard title="Material: asked vs sent">
              <AskedVsSentChart data={askedVsSent(scope, "Material Request", "Material Sent", 5)} askLabel="We asked" sentLabel="Material sent" />
            </ChartCard>
            <ChartCard title="Unit offers: asked vs sent">
              <AskedVsSentChart data={askedVsSent(scope, "Offer Request", "Unit Offer", 5)} askLabel="We asked" sentLabel="Offers sent" />
            </ChartCard>
          </div>

          <ChartCard title="Latest requests" hint="Availability, material and unit offers">
            <MessageFeed items={requestFeed(scope)} empty="No request in this range." />
          </ChartCard>
        </TabsContent>

        {/* ── MARKET UPDATES ───────────────────────────────────────────────── */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Market updates" value={h.market.total} icon={Megaphone} hint={scopeLabel} />
            {MARKET_CLASSES.map((c, i) => (
              <StatTile
                key={c}
                label={c}
                value={marketClassSplit(scope).find((b) => b.label === c)?.value ?? 0}
                icon={c === "New Launch" ? Rocket : c === "Payment Plan" ? HandCoins : c === "Price Update" ? Megaphone : PackageSearch}
              />
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="What kind of update" hint="Launches, payment plans, prices and delivery news">
              <DonutCard items={marketClassSplit(scope)} unit="updates" />
            </ChartCard>
            <ChartCard title="Per developer" hint="Who tells us the most, and about what">
              <div className="space-y-2.5">
                {marketByDeveloper(scope).map((d) => (
                  <StackedRow
                    key={d.name}
                    label={d.name}
                    total={d.total}
                    segments={MARKET_CLASSES.map((c, i) => ({ key: c, value: (d[c] as number) ?? 0, color: SERIES[i] }))}
                  />
                ))}
                <Legend2 items={MARKET_CLASSES.map((c, i) => ({ label: c, color: SERIES[i] }))} />
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Who sends market updates" hint="Developer side">
              <BarList items={senders(scope, MARKET_CLASSES)} unit="updates" color={SERIES[3]} />
            </ChartCard>
            <ChartCard title="Groups carrying the news">
              <BarList items={topGroups(scope)} color={SERIES[1]} />
            </ChartCard>
          </div>

          <ChartCard title="Latest market updates" hint="Straight from the groups">
            <MessageFeed items={marketFeed(scope)} empty="No market update in this range." />
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

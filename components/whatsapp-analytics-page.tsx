"use client"

import { useMemo, useState } from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  MessageSquareText, Paperclip, Mic, PackageSearch, Sparkles, Users,
} from "lucide-react"
import { FilterSelect } from "@/components/table-kit"
import { cn } from "@/lib/utils"
import type { WaGroup } from "@/components/whatsapp-groups-page"
import { CHAT_GROUPS } from "@/lib/whatsapp-chats-mock"
import {
  SERIES, activitySeries, availabilityAsks, availabilityBalance, availabilitySenders,
  materialsByClass, materialsByType, membersOfGroup, topDevelopers, topGroups, topMembers,
  topicsOfGroup, totals, type ActivityPoint, type Bucket, type Granularity,
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Ranked rows with the bar behind the label — every row carries its own value, so
 *  identity never rests on colour. */
export function BarList({ items, unit = "messages", color = SERIES[0], compact }: {
  items: Bucket[]; unit?: string; color?: string; compact?: boolean
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">Nothing yet.</p>
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.key} className="group relative" title={`${it.label} · ${it.value} ${unit}`}>
          <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/60">
            <span
              className="absolute inset-y-0 left-0 rounded-md transition-[width]"
              style={{ width: `${(it.value / max) * 100}%`, background: color, opacity: 0.14 }}
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

/** Share of a whole — the total sits in the hole, every slice is also named in the legend. */
export function DonutCard({ items, height = 170 }: { items: Bucket[]; height?: number }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total === 0) return <p className="py-10 text-center text-xs text-muted-foreground">No media yet.</p>
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items} dataKey="value" nameKey="label"
              innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="#fff" strokeWidth={2}
            >
              {items.map((i) => <Cell key={i.key} fill={i.color ?? SERIES[0]} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={(v: number, n: string) => [`${v} files · ${Math.round((v / total) * 100)}%`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none tabular-nums text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground">files</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: i.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{i.value}</span>
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
              {Math.round((i.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Messages / media / voice on one count axis. */
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

/** Availability updates the developer sent vs the ones we had to ask for. */
function BalanceChart({ data }: { data: { name: string; sent: number; asked: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={46} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="sent" name="Updates sent" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="asked" name="We asked" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── the Analytics tab of one chat ─────────────────────────────────────────────
export function GroupAnalytics({ group }: { group: WaGroup }) {
  const t = totals(group.id)
  const data = useMemo(() => activitySeries("Day", group.id), [group.id])
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Messages" value={t.messages} icon={MessageSquareText} />
        <StatTile label="Members active" value={t.members} icon={Users} />
        <StatTile label="Media" value={t.media} icon={Paperclip} />
        <StatTile label="Voice notes" value={t.voice} icon={Mic} />
      </div>
      <ChartCard title="Activity" hint="Last 14 days">
        <ActivityChart data={data} height={130} compact />
      </ChartCard>
      <ChartCard title="Most active members">
        <BarList items={membersOfGroup(group, 5)} compact />
      </ChartCard>
      <ChartCard title="What this group talks about" hint={`${t.availability} availability messages`}>
        <BarList items={topicsOfGroup(group).slice(0, 5)} unit="messages" color={SERIES[3]} compact />
      </ChartCard>
      <ChartCard title="Materials by class">
        <DonutCard items={materialsByClass(group.id)} height={130} />
      </ChartCard>
    </div>
  )
}

// ── the page ──────────────────────────────────────────────────────────────────
export function WhatsAppAnalyticsPage() {
  const [gran, setGran] = useState<Granularity>("Day")
  const [groupF, setGroupF] = useState("")
  const groupId = CHAT_GROUPS.find((g) => g.name === groupF)?.id
  const t = useMemo(() => totals(groupId), [groupId])
  const activity = useMemo(() => activitySeries(gran, groupId), [gran, groupId])

  return (
    <div className="min-h-screen space-y-4 bg-secondary/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">WhatsApp Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Who is active, what comes in, and when — across every connected group.
          </p>
        </div>
        <FilterSelect
          label="Group" value={groupF} options={CHAT_GROUPS.map((g) => g.name)}
          onChange={setGroupF} width="w-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Messages" value={t.messages} icon={MessageSquareText} hint={groupF || "All groups"} />
        <StatTile label="Members active" value={t.members} icon={Users} />
        <StatTile label="Media received" value={t.media} icon={Paperclip} />
        <StatTile label="Voice notes" value={t.voice} icon={Mic} />
        <StatTile label="Availability msgs" value={t.availability} icon={PackageSearch} />
        <StatTile label="Extracted records" value={t.extractions} icon={Sparkles} />
      </div>

      <ChartCard
        title="Activity over time"
        hint={groupF ? groupF : "Every group combined"}
        action={
          <div className="flex overflow-hidden rounded-md border border-border text-[11px] font-medium">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                onClick={() => setGran(g)}
                className={cn(
                  "px-2.5 py-1 transition-colors",
                  gran === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        }
      >
        <ActivityChart data={activity} />
      </ChartCard>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most active</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="Developers" hint="Messages in their groups">
            <BarList items={topDevelopers()} />
          </ChartCard>
          <ChartCard title="Groups" hint="Busiest conversations">
            <BarList items={topGroups()} color={SERIES[1]} />
          </ChartCard>
          <ChartCard title="Members" hint="Nawy and developer side">
            <BarList items={topMembers()} color={SERIES[3]} />
          </ChartCard>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Availability updates</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="Who sends them most" hint="Developer side, unprompted">
            <BarList items={availabilitySenders()} unit="updates" color={SERIES[1]} />
          </ChartCard>
          <ChartCard title="Who we ask most" hint="Groups Nawy chases for availability">
            <BarList items={availabilityAsks()} unit="requests" color={SERIES[2]} />
          </ChartCard>
          <ChartCard title="Sent vs asked" hint="A tall orange bar means we are chasing them">
            <BalanceChart data={availabilityBalance(5)} />
          </ChartCard>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Materials received</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="By file type">
            <DonutCard items={materialsByType(groupId)} />
          </ChartCard>
          <ChartCard title="By class" hint="Applied classification">
            <DonutCard items={materialsByClass(groupId)} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

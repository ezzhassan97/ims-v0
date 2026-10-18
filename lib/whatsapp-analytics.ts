// Aggregations behind the Whatsapp Analytics page and the Analytics tab of a chat.
// Everything is derived from the chat mock, so a number here always matches what the
// conversation shows. Activity over a longer horizon (week / month) is generated per
// group — the chat itself only carries the last few days.
import { WA_GROUPS, type WaGroup } from "@/components/whatsapp-groups-page"
import { messagesFor, type WaChatMessage, type WaTopic } from "@/lib/whatsapp-chats-mock"
import type { FileTypeGroup, MediaClass } from "@/lib/whatsapp-media-mock"

/** Categorical slots, fixed order — never cycled, never reassigned by rank. */
export const SERIES = ["#1d4ed8", "#059669", "#ea580c", "#7c3aed", "#e11d48", "#0891b2"] as const
/** Sequential ramp (one hue, light → dark) for magnitude. */
export const RAMP = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"] as const

export interface Bucket {
  key: string
  label: string
  value: number
  /** Caption under the label — group, developer, phone… */
  sub?: string
  /** Avatar / logo for the row. */
  image?: string
  color?: string
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── the corpus ────────────────────────────────────────────────────────────────
let _all: { group: WaGroup; m: WaChatMessage }[] | null = null
/** Every message of every group, paired with its group. */
export function allMessages() {
  return (_all ??= WA_GROUPS.flatMap((group) => messagesFor(group).map((m) => ({ group, m }))))
}

const rank = (map: Map<string, Bucket>, limit = 6) =>
  [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit)

const bump = (map: Map<string, Bucket>, key: string, seed: Omit<Bucket, "value">) => {
  const cur = map.get(key)
  if (cur) cur.value += 1
  else map.set(key, { ...seed, value: 1 })
}

// ── most active ───────────────────────────────────────────────────────────────
export function topDevelopers(limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of allMessages()) {
    if (!group.developer) continue
    bump(map, group.developer.id, { key: group.developer.id, label: group.developer.name, image: group.developer.logo, sub: `${group.name}` })
  }
  return rank(map, limit)
}

export function topGroups(limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of allMessages()) {
    bump(map, group.id, { key: group.id, label: group.name, image: group.image, sub: group.developer?.name ?? "Not linked" })
  }
  return rank(map, limit)
}

export function topMembers(limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of allMessages()) {
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: `${m.sender.org} · ${group.name}` })
  }
  return rank(map, limit)
}

// ── availability ──────────────────────────────────────────────────────────────
/** Developer side: who volunteers availability updates. */
export function availabilitySenders(limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of allMessages()) {
    if (m.topic !== "availability" || m.isRequest) continue
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: group.name })
  }
  return rank(map, limit)
}

/** Nawy side: the groups we chase for availability. */
export function availabilityAsks(limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of allMessages()) {
    if (m.topic !== "availability" || !m.isRequest) continue
    bump(map, group.id, { key: group.id, label: group.name, image: group.image, sub: group.developer?.name ?? "Not linked" })
  }
  return rank(map, limit)
}

/** Updates sent vs updates asked for, per group — the gap is the point. */
export function availabilityBalance(limit = 6) {
  const rows = new Map<string, { group: WaGroup; sent: number; asked: number }>()
  for (const { group, m } of allMessages()) {
    if (m.topic !== "availability") continue
    const r = rows.get(group.id) ?? { group, sent: 0, asked: 0 }
    if (m.isRequest) r.asked += 1
    else r.sent += 1
    rows.set(group.id, r)
  }
  return [...rows.values()]
    .sort((a, b) => b.sent + b.asked - (a.sent + a.asked))
    .slice(0, limit)
    .map((r) => ({ name: r.group.name.replace(/^Nawy ?- ?/, ""), sent: r.sent, asked: r.asked }))
}

// ── materials ─────────────────────────────────────────────────────────────────
export function materialsByType(groupId?: string): Bucket[] {
  const map = new Map<FileTypeGroup, number>()
  for (const { group, m } of allMessages()) {
    if (!m.media || (groupId && group.id !== groupId)) continue
    map.set(m.media.typeGroup, (map.get(m.media.typeGroup) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ key: label, label, value, color: SERIES[i % SERIES.length] }))
}

export function materialsByClass(groupId?: string): Bucket[] {
  const map = new Map<MediaClass, number>()
  for (const { group, m } of allMessages()) {
    if (!m.media || (groupId && group.id !== groupId)) continue
    map.set(m.media.mediaClass, (map.get(m.media.mediaClass) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ key: label, label, value, color: SERIES[i % SERIES.length] }))
}

// ── activity over time ────────────────────────────────────────────────────────
export type Granularity = "Hour" | "Day" | "Week" | "Month"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Daily volume per group over ~26 weeks — the chat only holds the last few days. */
function dailyVolume(group: WaGroup, days: number) {
  const seed = hash(group.id)
  const end = new Date(group.lastMessageSent + "Z")
  const scale = 1 + (group.members % 7) / 4
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end.getTime() - (days - 1 - i) * 86_400_000)
    const n = seed + i * 37
    const weekend = d.getUTCDay() === 5 || d.getUTCDay() === 6
    const base = (6 + (n % 14)) * scale * (weekend ? 0.35 : 1)
    const messages = Math.max(0, Math.round(base))
    return {
      date: d,
      messages,
      media: Math.round(messages * (0.18 + (n % 9) / 60)),
      voice: Math.round(messages * (0.08 + (n % 5) / 70)),
    }
  })
}

export interface ActivityPoint { label: string; messages: number; media: number; voice: number }

/** Activity series for one group or, with no id, for every group combined. */
export function activitySeries(g: Granularity, groupId?: string): ActivityPoint[] {
  const groups = groupId ? WA_GROUPS.filter((x) => x.id === groupId) : WA_GROUPS
  if (groups.length === 0) return []

  if (g === "Hour") {
    // a day's shape: quiet at night, two business peaks
    const weight = [1, 1, 1, 1, 1, 2, 4, 9, 18, 26, 31, 29, 22, 19, 24, 28, 26, 21, 16, 12, 9, 6, 4, 2]
    const total = groups.reduce((s, x) => s + dailyVolume(x, 28).reduce((a, d) => a + d.messages, 0), 0)
    const sum = weight.reduce((a, b) => a + b, 0)
    return weight.map((w, h) => {
      const messages = Math.round((total * w) / sum)
      return {
        label: `${String(h).padStart(2, "0")}:00`,
        messages,
        media: Math.round(messages * 0.22),
        voice: Math.round(messages * 0.1),
      }
    })
  }

  const days = g === "Day" ? 14 : g === "Week" ? 84 : 180
  const perDay = groups.map((x) => dailyVolume(x, days))
  const merged = perDay[0].map((_, i) => ({
    date: perDay[0][i].date,
    messages: perDay.reduce((s, arr) => s + arr[i].messages, 0),
    media: perDay.reduce((s, arr) => s + arr[i].media, 0),
    voice: perDay.reduce((s, arr) => s + arr[i].voice, 0),
  }))

  if (g === "Day") {
    return merged.map((d) => ({
      label: `${DOW[d.date.getUTCDay()]} ${d.date.getUTCDate()}`,
      messages: d.messages, media: d.media, voice: d.voice,
    }))
  }

  const size = g === "Week" ? 7 : 30
  const out: ActivityPoint[] = []
  for (let i = 0; i < merged.length; i += size) {
    const chunk = merged.slice(i, i + size)
    if (chunk.length < size / 2) continue
    const first = chunk[0].date
    out.push({
      label: g === "Week"
        ? `${first.getUTCDate()} ${MONTHS[first.getUTCMonth()]}`
        : `${MONTHS[first.getUTCMonth()]} ${String(first.getUTCFullYear()).slice(2)}`,
      messages: chunk.reduce((s, d) => s + d.messages, 0),
      media: chunk.reduce((s, d) => s + d.media, 0),
      voice: chunk.reduce((s, d) => s + d.voice, 0),
    })
  }
  return out
}

// ── headline numbers ──────────────────────────────────────────────────────────
export interface Totals { messages: number; media: number; voice: number; members: number; availability: number; extractions: number }

export function totals(groupId?: string): Totals {
  const rows = allMessages().filter(({ group }) => !groupId || group.id === groupId)
  const members = new Set(rows.map(({ m }) => m.sender.phone))
  return {
    messages: rows.length,
    media: rows.filter(({ m }) => m.media).length,
    voice: rows.filter(({ m }) => m.voice).length,
    members: members.size,
    availability: rows.filter(({ m }) => m.topic === "availability").length,
    extractions: rows.filter(({ m }) => m.extraction).length,
  }
}

/** Messages per sender inside one group — the chat's Analytics tab. */
export function membersOfGroup(group: WaGroup, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const m of messagesFor(group)) {
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: m.sender.org })
  }
  return rank(map, limit)
}

/** What the group talks about. */
export function topicsOfGroup(group: WaGroup): Bucket[] {
  const map = new Map<WaTopic, number>()
  for (const m of messagesFor(group)) map.set(m.topic, (map.get(m.topic) ?? 0) + 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ key: label, label, value, color: SERIES[i % SERIES.length] }))
}

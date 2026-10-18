// Aggregations behind the Whatsapp Analytics page and the Stats tab of a chat.
// Everything is derived from the chat mock, so a number here always matches what the
// conversation shows. Activity over a longer horizon (week / month) is generated per
// group — the chat itself only carries the last couple of weeks.
import { WA_GROUPS, type WaGroup } from "@/components/whatsapp-groups-page"
import {
  classOf, messagesFor, MARKET_CLASSES, REQUEST_CLASSES,
  type WaChatMessage, type WaMsgClass, type WaTopic,
} from "@/lib/whatsapp-chats-mock"
import type { FileTypeGroup, MediaClass } from "@/lib/whatsapp-media-mock"

/** Categorical slots, fixed order — never cycled, never reassigned by rank. */
export const SERIES = ["#1d4ed8", "#059669", "#ea580c", "#7c3aed", "#e11d48", "#0891b2"] as const
/** Sequential ramp (one hue, light → dark) for magnitude. */
export const RAMP = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"] as const
/** Pipeline states have fixed colours wherever they appear. */
export const STATE_COLOR = { done: "#059669", pending: "#f59e0b", failed: "#e11d48", none: "#cbd5e1" }

export interface Bucket {
  key: string
  label: string
  value: number
  /** Caption under the label — group, developer, phone… */
  sub?: string
  image?: string
  color?: string
}

export interface Ratio { done: number; total: number; pct: number }
const ratio = (done: number, total: number): Ratio => ({ done, total, pct: total ? Math.round((done / total) * 100) : 0 })

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── the corpus + the global filter ────────────────────────────────────────────
export interface Scope {
  developer?: string
  groupId?: string
  /** ISO date (yyyy-mm-dd), inclusive. */
  from?: string
  to?: string
}

export interface Row { group: WaGroup; m: WaChatMessage }

let _all: Row[] | null = null
const corpus = () => (_all ??= WA_GROUPS.flatMap((group) => messagesFor(group).map((m) => ({ group, m }))))

/** Every message matching the page's global filters. */
export function rows(s: Scope = {}): Row[] {
  return corpus().filter(({ group, m }) => {
    if (s.groupId && group.id !== s.groupId) return false
    if (s.developer && group.developer?.name !== s.developer) return false
    if (s.from && m.at.slice(0, 10) < s.from) return false
    if (s.to && m.at.slice(0, 10) > s.to) return false
    return true
  })
}

/** The groups a scope covers — members totals come from here. */
export function scopedGroups(s: Scope = {}): WaGroup[] {
  return WA_GROUPS.filter((g) =>
    (!s.groupId || g.id === s.groupId) && (!s.developer || g.developer?.name === s.developer))
}

export const DEVELOPERS = [...new Set(WA_GROUPS.map((g) => g.developer?.name).filter(Boolean) as string[])].sort()
/** The window the mock actually covers, for the date inputs. */
export function dateBounds() {
  const ds = corpus().map(({ m }) => m.at.slice(0, 10)).sort()
  return { min: ds[0], max: ds[ds.length - 1] }
}

const rank = (map: Map<string, Bucket>, limit = 6) =>
  [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit)

const bump = (map: Map<string, Bucket>, key: string, seed: Omit<Bucket, "value">, by = 1) => {
  const cur = map.get(key)
  if (cur) cur.value += by
  else map.set(key, { ...seed, value: by })
}

const counts = <T extends string>(xs: T[]): Bucket[] => {
  const map = new Map<T, number>()
  for (const x of xs) map.set(x, (map.get(x) ?? 0) + 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ key: label, label, value, color: SERIES[i % SERIES.length] }))
}

// ── headline cards ────────────────────────────────────────────────────────────
export interface Headline {
  messages: number
  members: Ratio
  media: Ratio
  voice: Ratio
  availability: { total: number; fromMessages: number; fromFiles: number }
  market: { total: number; byClass: Bucket[] }
}

export function headline(s: Scope = {}): Headline {
  const rs = rows(s)
  const active = new Set(rs.map(({ m }) => m.sender.phone)).size
  const totalMembers = scopedGroups(s).reduce((sum, g) => sum + g.members, 0)

  const media = rs.filter(({ m }) => m.media)
  const voice = rs.filter(({ m }) => m.voice)
  const fromMessages = rs.filter(({ m }) => classOf(m) === "Availability Update").length
  const fromFiles = media.filter(({ m }) => m.media!.carries === "Availability").length
  const marketMsgs = rs.filter(({ m }) => MARKET_CLASSES.includes(classOf(m)))
  const marketFiles = media.filter(({ m }) => ["Launch", "Price", "Offer"].includes(m.media!.carries))

  return {
    messages: rs.length,
    members: ratio(active, totalMembers),
    media: ratio(media.filter(({ m }) => m.media!.mediaClass !== "Unclassified").length, media.length),
    // a voice note is "classified" once the topic model has run on its transcript
    voice: ratio(voice.filter(({ m }) => m.classified).length, voice.length),
    availability: { total: fromMessages + fromFiles, fromMessages, fromFiles },
    market: {
      total: marketMsgs.length + marketFiles.length,
      byClass: counts([...marketMsgs.map(({ m }) => classOf(m)), ...marketFiles.map(({ m }) => `${m.media!.carries} file` as WaMsgClass)]),
    },
  }
}

// ── most active ───────────────────────────────────────────────────────────────
export function topDevelopers(s: Scope = {}, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group } of rows(s)) {
    if (!group.developer) continue
    bump(map, group.developer.id, { key: group.developer.id, label: group.developer.name, image: group.developer.logo, sub: group.name })
  }
  return rank(map, limit)
}

export function topGroups(s: Scope = {}, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group } of rows(s)) {
    bump(map, group.id, { key: group.id, label: group.name, image: group.image, sub: group.developer?.name ?? "Not linked" })
  }
  return rank(map, limit)
}

export function topMembers(s: Scope = {}, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of rows(s)) {
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: `${m.sender.org} · ${group.name}` })
  }
  return rank(map, limit)
}

// ── requests vs deliveries ────────────────────────────────────────────────────
/** People asking — availability, material or an offer. */
export function askers(s: Scope = {}, classes: WaMsgClass[] = REQUEST_CLASSES, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of rows(s)) {
    if (!classes.includes(classOf(m))) continue
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: group.name })
  }
  return rank(map, limit)
}

/** People delivering — availability updates, material or unit offers. */
export function senders(s: Scope = {}, classes: WaMsgClass[] = ["Availability Update", "Material Sent", "Unit Offer"], limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { group, m } of rows(s)) {
    if (!classes.includes(classOf(m))) continue
    bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: group.name })
  }
  return rank(map, limit)
}

/** Asked vs delivered per group, for one pair of classes. */
export function askedVsSent(s: Scope = {}, ask: WaMsgClass, send: WaMsgClass, limit = 6) {
  const map = new Map<string, { name: string; asked: number; sent: number }>()
  for (const { group, m } of rows(s)) {
    const c = classOf(m)
    if (c !== ask && c !== send) continue
    const r = map.get(group.id) ?? { name: group.name.replace(/^Nawy ?- ?/, ""), asked: 0, sent: 0 }
    if (c === ask) r.asked += 1
    else r.sent += 1
    map.set(group.id, r)
  }
  return [...map.values()].sort((a, b) => b.asked + b.sent - (a.asked + a.sent)).slice(0, limit)
}

/** Response time proxy: requests that got an answer in the same chat within 6h. */
export function requestAnswerRate(s: Scope = {}): Ratio {
  const byGroup = new Map<string, WaChatMessage[]>()
  for (const { group, m } of rows(s)) {
    const arr = byGroup.get(group.id) ?? []
    arr.push(m)
    byGroup.set(group.id, arr)
  }
  let asked = 0
  let answered = 0
  for (const ms of byGroup.values()) {
    ms.forEach((m, i) => {
      if (!REQUEST_CLASSES.includes(classOf(m))) return
      asked += 1
      const deadline = new Date(m.at).getTime() + 6 * 3_600_000
      if (ms.slice(i + 1).some((x) => x.sender.org === "Developer" && new Date(x.at).getTime() <= deadline)) answered += 1
    })
  }
  return ratio(answered, asked)
}

// ── classification & assignment ───────────────────────────────────────────────
export function messageClasses(s: Scope = {}): Bucket[] {
  return counts(rows(s).filter(({ m }) => m.classified).map(({ m }) => classOf(m)))
}

export function mediaClasses(s: Scope = {}): Bucket[] {
  return counts(rows(s).filter(({ m }) => m.media).map(({ m }) => m.media!.mediaClass as MediaClass))
}

export function mediaTypes(s: Scope = {}): Bucket[] {
  return counts(rows(s).filter(({ m }) => m.media).map(({ m }) => m.media!.typeGroup as FileTypeGroup))
}

export interface Pipeline {
  total: number
  classified: Ratio
  assigned: Ratio
  /** Files only — messages are never embedded. */
  embedded?: Ratio
  failed?: number
}

export function mediaPipeline(s: Scope = {}): Pipeline {
  const ms = rows(s).filter(({ m }) => m.media).map(({ m }) => m.media!)
  return {
    total: ms.length,
    classified: ratio(ms.filter((x) => x.mediaClass !== "Unclassified").length, ms.length),
    assigned: ratio(ms.filter((x) => x.projects.length > 0).length, ms.length),
    embedded: ratio(ms.filter((x) => x.embedding === "Embedded").length, ms.length),
    failed: ms.filter((x) => x.embedding === "Failed").length,
  }
}

export function messagePipeline(s: Scope = {}): Pipeline {
  const ms = rows(s).map(({ m }) => m)
  return {
    total: ms.length,
    classified: ratio(ms.filter((x) => x.classified).length, ms.length),
    assigned: ratio(ms.filter((x) => x.projects.length > 0).length, ms.length),
  }
}

/** Embedding state of every file — fixed colours, fixed order. */
export function embeddingSplit(s: Scope = {}): Bucket[] {
  const ms = rows(s).filter(({ m }) => m.media).map(({ m }) => m.media!)
  const order: [string, string][] = [["Embedded", STATE_COLOR.done], ["Pending", STATE_COLOR.pending], ["Failed", STATE_COLOR.failed]]
  return order.map(([label, color]) => ({ key: label, label, color, value: ms.filter((x) => x.embedding === label).length }))
}

/** Projects things were assigned to, files and messages together. */
export function topProjects(s: Scope = {}, limit = 8): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const { m } of rows(s)) {
    for (const p of m.media?.projects ?? []) bump(map, p, { key: p, label: p, sub: "files" })
    for (const p of m.projects) bump(map, p, { key: p, label: p, sub: "messages" })
  }
  return rank(map, limit)
}

/** Per media class: how far down the pipeline its files got — a stacked bar row. */
export function classPipeline(s: Scope = {}) {
  const ms = rows(s).filter(({ m }) => m.media).map(({ m }) => m.media!)
  const classes = [...new Set(ms.map((x) => x.mediaClass))]
  return classes
    .map((c) => {
      const items = ms.filter((x) => x.mediaClass === c)
      const embedded = items.filter((x) => x.embedding === "Embedded").length
      const assigned = items.filter((x) => x.projects.length > 0 && x.embedding !== "Embedded").length
      const failed = items.filter((x) => x.embedding === "Failed").length
      return { name: c, embedded, assigned, waiting: items.length - embedded - assigned - failed, failed, total: items.length }
    })
    .sort((a, b) => b.total - a.total)
}

// ── market updates ────────────────────────────────────────────────────────────
export function marketClassSplit(s: Scope = {}): Bucket[] {
  return counts(rows(s).map(({ m }) => classOf(m)).filter((c) => MARKET_CLASSES.includes(c)))
}

/** Market updates per developer, split by class — a stacked bar. */
export function marketByDeveloper(s: Scope = {}, limit = 6) {
  const map = new Map<string, Record<string, number> & { name: string; total: number }>()
  for (const { group, m } of rows(s)) {
    const c = classOf(m)
    if (!MARKET_CLASSES.includes(c) || !group.developer) continue
    const r = map.get(group.developer.id) ?? ({ name: group.developer.name, total: 0 } as Record<string, number> & { name: string; total: number })
    r[c] = ((r[c] as number) ?? 0) + 1
    r.total += 1
    map.set(group.developer.id, r)
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit)
}

/** The newest market-update messages — the feed under the charts. */
export function marketFeed(s: Scope = {}, limit = 12) {
  return rows(s)
    .filter(({ m }) => MARKET_CLASSES.includes(classOf(m)))
    .sort((a, b) => b.m.at.localeCompare(a.m.at))
    .slice(0, limit)
}

/** The newest open requests — the feed on the availability tab. */
export function requestFeed(s: Scope = {}, classes: WaMsgClass[] = REQUEST_CLASSES, limit = 12) {
  return rows(s)
    .filter(({ m }) => classes.includes(classOf(m)))
    .sort((a, b) => b.m.at.localeCompare(a.m.at))
    .slice(0, limit)
}

// ── activity over time ────────────────────────────────────────────────────────
export type Granularity = "Hour" | "Day" | "Week" | "Month"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Daily volume per group over a long horizon — the chat only holds the last fortnight. */
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

export function activitySeries(g: Granularity, s: Scope = {}): ActivityPoint[] {
  const groups = scopedGroups(s)
  if (groups.length === 0) return []

  if (g === "Hour") {
    const weight = [1, 1, 1, 1, 1, 2, 4, 9, 18, 26, 31, 29, 22, 19, 24, 28, 26, 21, 16, 12, 9, 6, 4, 2]
    const total = groups.reduce((sum, x) => sum + dailyVolume(x, 28).reduce((a, d) => a + d.messages, 0), 0)
    const w = weight.reduce((a, b) => a + b, 0)
    return weight.map((x, h) => {
      const messages = Math.round((total * x) / w)
      return { label: `${String(h).padStart(2, "0")}:00`, messages, media: Math.round(messages * 0.22), voice: Math.round(messages * 0.1) }
    })
  }

  const days = g === "Day" ? 14 : g === "Week" ? 84 : 180
  const perDay = groups.map((x) => dailyVolume(x, days))
  const merged = perDay[0].map((_, i) => ({
    date: perDay[0][i].date,
    messages: perDay.reduce((sum, arr) => sum + arr[i].messages, 0),
    media: perDay.reduce((sum, arr) => sum + arr[i].media, 0),
    voice: perDay.reduce((sum, arr) => sum + arr[i].voice, 0),
  }))

  if (g === "Day") {
    return merged.map((d) => ({ label: `${DOW[d.date.getUTCDay()]} ${d.date.getUTCDate()}`, messages: d.messages, media: d.media, voice: d.voice }))
  }

  const size = g === "Week" ? 7 : 30
  const out: ActivityPoint[] = []
  for (let i = 0; i < merged.length; i += size) {
    const chunk = merged.slice(i, i + size)
    if (chunk.length < size / 2) continue
    const first = chunk[0].date
    out.push({
      label: g === "Week" ? `${first.getUTCDate()} ${MONTHS[first.getUTCMonth()]}` : `${MONTHS[first.getUTCMonth()]} ${String(first.getUTCFullYear()).slice(2)}`,
      messages: chunk.reduce((a, d) => a + d.messages, 0),
      media: chunk.reduce((a, d) => a + d.media, 0),
      voice: chunk.reduce((a, d) => a + d.voice, 0),
    })
  }
  return out
}

// ── one group (the chat's Stats tab) ──────────────────────────────────────────
export function membersOfGroup(group: WaGroup, limit = 6): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const m of messagesFor(group)) bump(map, m.sender.phone, { key: m.sender.phone, label: m.sender.name, sub: m.sender.org })
  return rank(map, limit)
}

export function topicsOfGroup(group: WaGroup): Bucket[] {
  return counts(messagesFor(group).map((m) => classOf(m)))
}

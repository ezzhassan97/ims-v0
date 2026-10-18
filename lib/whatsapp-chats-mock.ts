// Message-level mock for the Whatsapp Chats page. Groups come from WA_GROUPS (the
// Whatsapp Groups table); messages, members and AI day summaries are generated per
// group, deterministically, so a chat looks the same on every render.
import { WA_GROUPS, type WaGroup } from "@/components/whatsapp-groups-page"
import { WA_CONTACTS } from "@/lib/wa-contacts-mock"
import type { FileTypeGroup, MediaClass } from "@/lib/whatsapp-media-mock"

export type SenderOrg = "Nawy" | "Developer"

/** What a message is about — drives the availability and topic analytics. */
export type WaTopic = "availability" | "price" | "payment" | "delivery" | "launch" | "offer" | "material" | "general"

export interface WaChatMember {
  name: string
  phone: string
  org: SenderOrg
  role: "Admin" | "Member"
}

/** One candidate of the media classifier, highest confidence first. */
export interface WaClassGuess {
  name: MediaClass
  confidence: number
}

/** A file is classified, then assigned to projects, then embedded — in that order. */
export type WaEmbedding = "Embedded" | "Pending" | "Failed"

/** What a file tells us, beyond its format — availability can arrive as a sheet. */
export type WaCarries = "Availability" | "Price" | "Launch" | "Offer" | "None"

export interface WaChatMedia {
  fileName: string
  ext: string
  typeGroup: FileTypeGroup
  /** The applied class — always classes[0].name. Unclassified ⇒ the classifier passed. */
  mediaClass: MediaClass
  /** Top candidates of the classifier. */
  classes: WaClassGuess[]
  classifiedAt: string
  /** bytes */
  size: number
  /** Projects this file was assigned to — empty means not assigned yet. */
  projects: string[]
  /** Files are embedded after classification and assignment. */
  embedding: WaEmbedding
  carries: WaCarries
}

export interface WaVoiceNote {
  durationSec: number
  /** Bar heights 0..1 for the waveform. */
  wave: number[]
  transcript?: string
}

export interface WaReaction {
  emoji: string
  by: string[]
}

/** What the ingestion pulled out of this message, when it pulled anything. */
export interface WaExtraction {
  kind: "Launch" | "Market Update" | "Media"
  id: string
  label: string
}

export interface WaChatMessage {
  id: string
  groupId: string
  sender: WaChatMember
  /** ISO */
  at: string
  text?: string
  media?: WaChatMedia
  voice?: WaVoiceNote
  reactions?: WaReaction[]
  /** Snippet of the message this one replies to. */
  replyTo?: string
  extraction?: WaExtraction
  topic: WaTopic
  /** Nawy asking the developer, rather than the developer telling us. */
  isRequest: boolean
  /** The classifier has run on this message. */
  classified: boolean
  /** Projects this message was assigned to — empty means not assigned yet. */
  projects: string[]
}

/**
 * The class a message is filed under — topic plus direction. This is what the
 * classification, availability and market-update views count.
 */
export type WaMsgClass =
  | "Availability Update" | "Availability Request"
  | "Material Sent" | "Material Request"
  | "Unit Offer" | "Offer Request"
  | "New Launch" | "Payment Plan" | "Price Update" | "Delivery Update"
  | "General"

export function classOf(m: WaChatMessage): WaMsgClass {
  switch (m.topic) {
    case "availability": return m.isRequest ? "Availability Request" : "Availability Update"
    case "material": return m.isRequest ? "Material Request" : "Material Sent"
    case "offer": return m.isRequest ? "Offer Request" : "Unit Offer"
    case "launch": return "New Launch"
    case "payment": return "Payment Plan"
    case "price": return "Price Update"
    case "delivery": return "Delivery Update"
    default: return "General"
  }
}

/** Classes that make up a market update. */
export const MARKET_CLASSES: WaMsgClass[] = ["New Launch", "Payment Plan", "Price Update", "Delivery Update"]
/** Classes where someone is asking us or the developer for something. */
export const REQUEST_CLASSES: WaMsgClass[] = ["Availability Request", "Material Request", "Offer Request"]

export interface WaDaySummary {
  id: string
  /** "Saturday - 04 July 2026" */
  date: string
  tag: string
  messages: number
  processed: boolean
  summary: string
  inquiries: { id: string; text: string; status: "Open" | "Resolved" }[]
}

// ── deterministic helpers ─────────────────────────────────────────────────────
const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
const pick = <T,>(xs: T[], n: number) => xs[n % xs.length]
/**
 * Spreads a strided counter over the whole range — see the media flags below.
 * Multiplying by an odd constant keeps the input's divisibility (media lands on
 * every 4th message, so `n % 6` could only ever hit three values); this is the
 * murmur3 finalizer, which actually avalanches.
 */
const mix = (n: number) => {
  let x = n | 0
  x = Math.imul(x ^ (x >>> 16), 2246822507)
  x = Math.imul(x ^ (x >>> 13), 3266489909)
  return (x ^ (x >>> 16)) >>> 0
}

const DEV_FIRST = ["Ahmed", "Mohamed", "Mostafa", "Hany", "Tarek", "Amr", "Sherif", "Khaled", "Mahmoud", "Rania"]
const DEV_LAST = ["Sabry", "ElSayed", "Gamal", "Shawky", "Aboulella", "Nassar", "Zaki", "Hegazy", "Lotfy", "Darwish"]

const TEXTS_DEV = [
  "Good morning all 👋 attached the updated price list for this month.",
  "Reminder: 10% discount on cash offers ends Thursday.",
  "New phase launching next week — details and payment plans to follow.",
  "Delivery for the 2-bed units moved to Q3 2027, kindly update your clients.",
  "Availability update: only 4 units left in the garden apartments.",
  "Payment plan changed to 10% down payment over 8 years.",
  "Kindly note the office will be closed Friday.",
  "We have a limited resale inventory, prices below launch.",
]
const TEXTS_NAWY = [
  "Need an offer for a 2-bed, prime location, delivery within 2 years.",
  "Any 3-bed available with 5 months delivery?",
  "Could you share the latest payment plans please?",
  "Client asking about the clubhouse delivery date.",
  "Is the discount applicable on the villas too?",
  "Can you confirm the maintenance fees on this phase?",
  "Received, thank you 🙏",
  "Please share the floor plan for the 110 sqm unit.",
]

/** Index-aligned with TEXTS_DEV / VOICE_DEV and TEXTS_NAWY / VOICE_NAWY. */
const TOPICS_DEV: WaTopic[] = ["price", "price", "launch", "delivery", "availability", "payment", "general", "availability"]
const TOPICS_NAWY: WaTopic[] = ["offer", "availability", "payment", "delivery", "price", "general", "general", "material"]
const TOPICS_VOICE_DEV: WaTopic[] = ["payment", "availability", "delivery"]
const TOPICS_VOICE_NAWY: WaTopic[] = ["offer", "material", "offer"]

const VOICE_DEV = [
  "Explains the new payment plan and the cash discount deadline.",
  "Walks through availability in the current phase, unit by unit.",
  "Answers the delivery question: handover starts Q3 2027.",
]
const VOICE_NAWY = [
  "Asks for a 3-bed offer for a client visiting this weekend.",
  "Follows up on the floor plan request from yesterday.",
  "Confirms the client accepted the offer, asks for the reservation form.",
]

const EMOJIS = ["👍", "❤️", "🔥", "🙏", "✅"]

const FILES: { fileName: string; ext: string; typeGroup: FileTypeGroup; size: number; top: MediaClass }[] = [
  { fileName: "MALIV 2 BED 110 M new.pdf", ext: "PDF", typeGroup: "Document", size: 3_420_000, top: "Brochure" },
  { fileName: "Price list - July 2026.xlsx", ext: "XLSX", typeGroup: "Sheet", size: 240_000, top: "Unclassified" },
  { fileName: "2 bed - 110 SQM.pdf", ext: "PDF", typeGroup: "Document", size: 2_100_000, top: "Floor Plan" },
  { fileName: "Residential offer 2 bedrooms 99m.pdf", ext: "PDF", typeGroup: "Document", size: 2_900_000, top: "Brochure" },
  { fileName: "2AD1276B468F64418F59.jpg", ext: "JPG", typeGroup: "Image", size: 540_000, top: "Render" },
  { fileName: "Masterplan - Phase 3.jpg", ext: "JPG", typeGroup: "Image", size: 980_000, top: "Map Location" },
  { fileName: "Launch teaser.mp4", ext: "MP4", typeGroup: "Video", size: 12_400_000, top: "Video" },
  { fileName: "Commercial offer for M-C9-RG-15.pdf", ext: "PDF", typeGroup: "Document", size: 1_740_000, top: "Brochure" },
]
const ALL_CLASSES: MediaClass[] = ["Brochure", "Floor Plan", "Map Location", "Render", "Video", "Unclassified"]

/** Projects a file or message can be assigned to, per developer group. */
const PROJECT_POOL = [
  "Marassi", "Eastown", "SODIC West", "Badya", "Palm Hills October",
  "Mountain View iCity", "Uptown Cairo", "Patterns", "Creek Town", "Hacienda Bay",
]

/** Top-3 classifier candidates: the applied class first, then two plausible runners-up. */
function classGuesses(top: MediaClass, n: number): WaClassGuess[] {
  const rest = ALL_CLASSES.filter((c) => c !== top)
  const first = 72 + (n % 25)                       // 72–96
  const second = Math.max(4, Math.round((100 - first) * 0.6) - (n % 3))
  const third = Math.max(2, 100 - first - second - (n % 4))
  return [
    { name: top, confidence: first },
    { name: pick(rest, n), confidence: second },
    { name: pick(rest, n + 2), confidence: third },
  ]
}

const SUMMARY_TEXTS = [
  "The conversation covered inquiries about offers and availability. Brokers asked for two-bedroom units in prime locations with delivery within two years, and for three-bedroom availability. The developer shared an updated price list and confirmed a cash discount ending this week.",
  "Mostly availability questions. The developer confirmed four garden apartments remain in the current phase and that delivery for two-bedroom units moved to Q3 2027. Two inquiries were resolved with shared payment plans.",
  "A new phase was announced with payment plans to follow. Brokers requested floor plans and asked whether the discount applies to villas; both are still open.",
  "General discussion on maintenance fees and clubhouse delivery. No offers were shared and no inventory changed.",
]

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export const fmtDay = (d: Date) => `${DAY_NAMES[d.getUTCDay()]} - ${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
export const fmtTime = (iso: string) => {
  const d = new Date(iso)
  const h = d.getUTCHours()
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}, ${fmtTime(iso)}`
}
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

// ── members ───────────────────────────────────────────────────────────────────
export function membersFor(group: WaGroup): WaChatMember[] {
  const seed = hash(group.id)
  const nawy: WaChatMember[] = WA_CONTACTS.slice(0, 4).map((c) => ({
    name: c.name, phone: c.phone, org: "Nawy", role: c.role,
  }))
  const devSide = Array.from({ length: 6 }, (_, i) => {
    const n = seed + i * 7
    return {
      name: `${pick(DEV_FIRST, n)} ${pick(DEV_LAST, n * 3)}`,
      phone: `+2 01${(seed + i * 13) % 10} ${String(1000 + ((seed + i * 977) % 9000))} ${String(1000 + ((seed + i * 311) % 9000))}`,
      org: "Developer" as const,
      role: (i === 0 ? "Admin" : "Member") as "Admin" | "Member",
    }
  })
  return [...nawy, ...devSide]
}

// ── messages ──────────────────────────────────────────────────────────────────
/** ~4 days of traffic, newest last. */
export function messagesFor(group: WaGroup): WaChatMessage[] {
  const seed = hash(group.id)
  const people = membersFor(group)
  const nawyPeople = people.filter((p) => p.org === "Nawy")
  const devPeople = people.filter((p) => p.org === "Developer")
  const base = new Date(group.lastMessageSent + "Z")
  const count = 48 + (seed % 40)
  const out: WaChatMessage[] = []

  // uneven gaps (roughly 0.4–8h) — evenly spaced messages would make every
  // response time identical, which is exactly what the analytics measure
  const offsets: number[] = []
  let acc = 0
  for (let k = 0; k < count; k++) { offsets.push(acc); acc += 0.4 + (mix(seed + k * 31) % 1000) / 130 }

  for (let i = count - 1; i >= 0; i--) {
    const n = seed + i * 17
    const fromDev = n % 3 !== 0
    const sender = fromDev ? pick(devPeople, n) : pick(nawyPeople, n)
    // walk backwards from the group's last message: ~2.6h apart, so it spans ~4 days
    const at = new Date(base.getTime() - offsets[i] * 3_600_000).toISOString()
    const isVoice = n % 6 === 0
    const withMedia = !isVoice && fromDev && n % 4 === 0
    const text = fromDev ? pick(TEXTS_DEV, n) : pick(TEXTS_NAWY, n)

    let media: WaChatMedia | undefined
    if (withMedia) {
      const f = pick(FILES, Math.floor(n / 5) + i)
      const classes = classGuesses(f.top, n)
      // a file runs classification → project assignment → embedding, and can stall at any step
      const assigned = mix(n) % 100 >= 17
      const isClassified = classes[0].name !== "Unclassified"
      media = {
        fileName: f.fileName, ext: f.ext, typeGroup: f.typeGroup, size: f.size,
        mediaClass: classes[0].name, classes,
        classifiedAt: new Date(new Date(at).getTime() + 90_000).toISOString(),
        projects: assigned ? [pick(PROJECT_POOL, mix(n)), ...(mix(n + 1) % 100 < 12 ? [pick(PROJECT_POOL, mix(n + 4))] : [])] : [],
        embedding: !isClassified || !assigned ? "Pending" : mix(n + 7) % 100 < 9 ? "Failed" : "Embedded",
        carries: pick(["Availability", "Price", "Launch", "Offer", "None", "None"] as const, mix(n + 3)),
      }
    }

    const voice: WaVoiceNote | undefined = isVoice
      ? {
          durationSec: 14 + (n % 86),
          wave: Array.from({ length: 28 }, (_, k) => 0.25 + ((n * (k + 3)) % 100) / 133),
          transcript: fromDev ? pick(VOICE_DEV, n) : pick(VOICE_NAWY, n),
        }
      : undefined

    let extraction: WaExtraction | undefined
    if (media) {
      extraction = { kind: "Media", id: `WM-${String(1000 + (n % 9000))}`, label: media.mediaClass }
    } else if (fromDev && n % 7 === 0) {
      extraction = { kind: "Launch", id: `LNC-${String(200 + (n % 80))}`, label: "New launch detected" }
    } else if (fromDev && n % 5 === 0) {
      extraction = { kind: "Market Update", id: `MU-${String(400 + (n % 90))}`, label: "Price update detected" }
    }

    const reactions: WaReaction[] | undefined = n % 5 === 0
      ? [
          { emoji: pick(EMOJIS, n), by: [pick(people, n).name, pick(people, n + 4).name].slice(0, 1 + (n % 2)) },
          ...(n % 10 === 0 ? [{ emoji: pick(EMOJIS, n + 3), by: [pick(people, n + 6).name] }] : []),
        ]
      : undefined

    const topic: WaTopic = isVoice
      ? (fromDev ? pick(TOPICS_VOICE_DEV, n) : pick(TOPICS_VOICE_NAWY, n))
      : media
        ? "material"
        : (fromDev ? pick(TOPICS_DEV, n) : pick(TOPICS_NAWY, n))

    out.push({
      id: `${group.id}-m${count - i}`,
      groupId: group.id,
      sender,
      at,
      text: isVoice ? undefined : media ? (n % 2 === 0 ? text : undefined) : text,
      media,
      voice,
      reactions,
      replyTo: !fromDev && !isVoice && n % 6 === 0 ? pick(TEXTS_DEV, n + 1) : undefined,
      extraction,
      topic,
      isRequest: !fromDev,
      classified: n % 9 !== 0,
      projects: n % 5 === 0 ? [] : [pick(PROJECT_POOL, n + 2)],
    })
  }
  return out
}

export const lastMessageOf = (group: WaGroup) => {
  const ms = messagesFor(group)
  return ms[ms.length - 1]
}

/** One-line preview for the chat list. */
export const previewOf = (m?: WaChatMessage) =>
  !m ? "" : m.text ? m.text : m.voice ? `🎤 Voice note · ${fmtDuration(m.voice.durationSec)}` : m.media ? `📎 ${m.media.fileName}` : ""

/** The haystack a message is searched by — text, voice transcript and file name. */
export const searchTextOf = (m: WaChatMessage) =>
  [m.text, m.voice?.transcript, m.media?.fileName, m.sender.name, m.sender.phone].filter(Boolean).join(" ").toLowerCase()

export type MessageKind = "text" | "media" | "voice"
export const kindOf = (m: WaChatMessage): MessageKind => (m.voice ? "voice" : m.media ? "media" : "text")

// ── AI day summaries ──────────────────────────────────────────────────────────
export function summariesFor(group: WaGroup): WaDaySummary[] {
  const seed = hash(group.id)
  const base = new Date(group.lastMessageSent + "Z")
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(base.getTime() - i * 86_400_000)
    const n = seed + i * 29
    return {
      id: `${group.id}-s${i + 1}`,
      date: fmtDay(d),
      tag: pick(["unit offer", "price update", "availability", "general"], n),
      messages: 4 + (n % 9),
      processed: i > 0 || n % 3 !== 0,
      summary: pick(SUMMARY_TEXTS, n),
      inquiries: Array.from({ length: 1 + (n % 3) }, (_, k) => ({
        id: `${group.id}-i${i}${k}`,
        text: pick(TEXTS_NAWY, n + k * 5),
        status: ((n + k) % 3 === 0 ? "Resolved" : "Open") as "Open" | "Resolved",
      })),
    }
  })
}

/** Media shared in a group, newest first — the right panel's Media tab. */
export function mediaFor(group: WaGroup): (WaChatMedia & { id: string; at: string; sender: string })[] {
  return messagesFor(group)
    .filter((m) => m.media)
    .map((m) => ({ ...m.media!, id: m.id, at: m.at, sender: m.sender.name }))
    .reverse()
}

/** Messages matching a query across every group — the global search in the chat list. */
export function searchAllMessages(q: string, limit = 40) {
  const needle = q.trim().toLowerCase()
  if (needle.length < 2) return []
  const hits: { group: WaGroup; message: WaChatMessage }[] = []
  for (const group of WA_GROUPS) {
    for (const message of messagesFor(group)) {
      if (searchTextOf(message).includes(needle)) hits.push({ group, message })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}

export const CHAT_GROUPS = WA_GROUPS

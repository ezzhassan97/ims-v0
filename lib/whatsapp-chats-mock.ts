// Message-level mock for the Whatsapp Chats page. Groups come from WA_GROUPS (the
// Whatsapp Groups table); messages, members and AI day summaries are generated per
// group, deterministically, so a chat looks the same on every render.
import { WA_GROUPS, type WaGroup } from "@/components/whatsapp-groups-page"
import { WA_CONTACTS } from "@/lib/wa-contacts-mock"
import type { FileTypeGroup, MediaClass } from "@/lib/whatsapp-media-mock"

export type SenderOrg = "Nawy" | "Developer"

export interface WaChatMember {
  name: string
  phone: string
  org: SenderOrg
  role: "Admin" | "Member"
}

export interface WaChatMedia {
  fileName: string
  ext: string
  typeGroup: FileTypeGroup
  mediaClass: MediaClass
  /** bytes */
  size: number
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
  /** Snippet of the message this one replies to. */
  replyTo?: string
  extraction?: WaExtraction
}

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

const FILES: WaChatMedia[] = [
  { fileName: "MALIV 2 BED 110 M new.pdf", ext: "PDF", typeGroup: "Document", mediaClass: "Brochure", size: 3_420_000 },
  { fileName: "Price list - July 2026.xlsx", ext: "XLSX", typeGroup: "Sheet", mediaClass: "Unclassified", size: 240_000 },
  { fileName: "2 bed - 110 SQM.pdf", ext: "PDF", typeGroup: "Document", mediaClass: "Floor Plan", size: 2_100_000 },
  { fileName: "Residential offer 2 bedrooms 99m.pdf", ext: "PDF", typeGroup: "Document", mediaClass: "Brochure", size: 2_900_000 },
  { fileName: "2AD1276B468F64418F59.jpg", ext: "JPG", typeGroup: "Image", mediaClass: "Render", size: 540_000 },
  { fileName: "Masterplan - Phase 3.jpg", ext: "JPG", typeGroup: "Image", mediaClass: "Map Location", size: 980_000 },
  { fileName: "Launch teaser.mp4", ext: "MP4", typeGroup: "Video", mediaClass: "Video", size: 12_400_000 },
  { fileName: "Commercial offer for M-C9-RG-15.pdf", ext: "PDF", typeGroup: "Document", mediaClass: "Brochure", size: 1_740_000 },
]

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
  const count = 16 + (seed % 9)
  const out: WaChatMessage[] = []

  for (let i = count - 1; i >= 0; i--) {
    const n = seed + i * 17
    const fromDev = n % 3 !== 0
    const sender = fromDev ? pick(devPeople, n) : pick(nawyPeople, n)
    // walk backwards from the group's last message: ~2.6h apart, so it spans ~4 days
    const at = new Date(base.getTime() - i * 2.6 * 3_600_000).toISOString()
    const withMedia = fromDev && n % 4 === 0
    const text = fromDev ? pick(TEXTS_DEV, n) : pick(TEXTS_NAWY, n)
    const media = withMedia ? pick(FILES, n) : undefined

    let extraction: WaExtraction | undefined
    if (media) {
      extraction = { kind: "Media", id: `WM-${String(1000 + (n % 9000))}`, label: media.mediaClass }
    } else if (fromDev && n % 7 === 0) {
      extraction = { kind: "Launch", id: `LNC-${String(200 + (n % 80))}`, label: "New launch detected" }
    } else if (fromDev && n % 5 === 0) {
      extraction = { kind: "Market Update", id: `MU-${String(400 + (n % 90))}`, label: "Price update detected" }
    }

    out.push({
      id: `${group.id}-m${count - i}`,
      groupId: group.id,
      sender,
      at,
      text: media ? (n % 2 === 0 ? text : undefined) : text,
      media,
      replyTo: !fromDev && n % 6 === 0 ? pick(TEXTS_DEV, n + 1) : undefined,
      extraction,
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
  !m ? "" : m.text ? m.text : m.media ? `📎 ${m.media.fileName}` : ""

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

export const CHAT_GROUPS = WA_GROUPS

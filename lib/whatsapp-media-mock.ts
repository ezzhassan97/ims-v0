// Grouped file types (user-facing) map to raw extensions
export type FileTypeGroup = "Image" | "Video" | "Sheet" | "Document"
export type MediaClass = "Brochure" | "Floor Plan" | "Map Location" | "Render" | "Video" | "Unclassified"

export interface WhatsAppMediaItem {
  id: string
  fileName: string
  fileExt: string          // raw extension: PDF, JPG, PNG, MP4, DOCX, XLSX, CSV …
  fileTypeGroup: FileTypeGroup
  fileSize: number         // bytes
  mediaClasses: MediaClass[]
  projects: string[]
  senderPhone: string
  message: string
  url?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
  // Developer
  developerId: string
  developerName: string
  developerLogo: string
}

export const ALL_PROJECTS = [
  "Marassi", "Marassi Street", "Eastown", "SODIC West",
  "Badya", "Badya Phase 1", "Palm Hills October",
  "Mountain View iCity", "Mountain View Hyde Park",
  "Uptown Cairo", "Patterns",
]

export const ALL_DEVELOPERS = [
  { id: "DEV-001", name: "Emaar Misr",    logo: "https://api.dicebear.com/7.x/initials/svg?seed=EM&backgroundColor=1d4ed8&fontColor=ffffff" },
  { id: "DEV-002", name: "SODIC",         logo: "https://api.dicebear.com/7.x/initials/svg?seed=SO&backgroundColor=0f766e&fontColor=ffffff" },
  { id: "DEV-003", name: "Palm Hills",    logo: "https://api.dicebear.com/7.x/initials/svg?seed=PH&backgroundColor=7c3aed&fontColor=ffffff" },
  { id: "DEV-004", name: "Mountain View", logo: "https://api.dicebear.com/7.x/initials/svg?seed=MV&backgroundColor=b45309&fontColor=ffffff" },
]

function rndDate(daysAgo: number) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d }

function extToGroup(ext: string): FileTypeGroup {
  const e = ext.toUpperCase()
  if (["JPG","JPEG","PNG","GIF","WEBP","HEIC"].includes(e)) return "Image"
  if (["MP4","MOV","AVI","MKV","WEBM"].includes(e)) return "Video"
  if (["XLSX","XLS","CSV"].includes(e)) return "Sheet"
  return "Document"
}

const RAW_ITEMS: Array<{ name: string; ext: string; size: number }> = [
  { name: "MALIV 2 BED 110 M new.pdf",                     ext: "PDF",  size: 3_420_000 },
  { name: "2 bed - 110 SQM.pdf",                           ext: "PDF",  size: 2_100_000 },
  { name: "MALIV 1 BED 75 M new.pdf",                      ext: "PDF",  size: 1_850_000 },
  { name: "Residential offer for 99m- 2 bedrooms.pdf",     ext: "PDF",  size: 4_230_000 },
  { name: "2AD1276B468F64418F59",                           ext: "JPG",  size:   540_000 },
  { name: "Residential offer 2 bedrooms 99m.pdf",          ext: "PDF",  size: 2_900_000 },
  { name: "Commercial offer for M-C9-RG-15.pdf",           ext: "PDF",  size: 1_740_000 },
  { name: "2AD454E9AEB1843A3593",                           ext: "JPG",  size:   320_000 },
  { name: "2A11514FAD00BA519F2D",                           ext: "JPG",  size:   780_000 },
  { name: "2A8EF8413FE682EA3A58",                           ext: "MP4",  size: 18_500_000 },
  { name: "Floor plan Tower A level 5.pdf",                 ext: "PDF",  size: 5_100_000 },
  { name: "Uptown Cairo Phase 3 Brochure.pdf",              ext: "PDF",  size: 8_200_000 },
  { name: "Eastown Residences - Unit Layout.jpg",           ext: "JPG",  size:   990_000 },
  { name: "Badya master plan final.pdf",                    ext: "PDF",  size: 6_300_000 },
  { name: "Palm Hills Oct - Payment Schedule.xlsx",         ext: "XLSX", size:   240_000 },
  { name: "MV Hyde Park site map.jpg",                      ext: "JPG",  size: 1_200_000 },
  { name: "SODIC West Commercial Units.pdf",                ext: "PDF",  size: 3_800_000 },
  { name: "Emaar Misr - Investor Deck Q1.pdf",              ext: "PDF",  size: 9_400_000 },
  { name: "Site plan aerial view.jpg",                      ext: "JPG",  size: 2_100_000 },
  { name: "Construction progress video April.mp4",          ext: "MP4",  size: 52_000_000 },
  { name: "2B3F9A1CD5E6784F12A0",                           ext: "PNG",  size:   430_000 },
  { name: "Compound amenities map.jpg",                     ext: "JPG",  size: 1_600_000 },
  { name: "Phase 2 handover checklist.docx",                ext: "DOCX", size:   180_000 },
  { name: "Marassi unit specification sheet.pdf",           ext: "PDF",  size: 4_700_000 },
  { name: "Uptown Cairo landscape render.jpg",              ext: "JPG",  size: 3_300_000 },
]

const MEDIA_CLASSES: MediaClass[] = ["Brochure", "Floor Plan", "Map Location", "Render", "Video", "Unclassified"]
const PROJECT_SETS = [
  ["Marassi", "Marassi Street"],
  ["Marassi Street", "Marassi"],
  ["Marassi"],
  ["Eastown"],
  ["SODIC West", "Eastown"],
  ["Badya", "Badya Phase 1"],
  ["Palm Hills October"],
  ["Mountain View iCity"],
  ["Mountain View Hyde Park", "Mountain View iCity"],
  ["Uptown Cairo"],
  ["Patterns", "Marassi"],
]

export const whatsappMediaItems: WhatsAppMediaItem[] = Array.from({ length: 50 }, (_, i) => {
  const dev   = ALL_DEVELOPERS[i % ALL_DEVELOPERS.length]
  const raw   = RAW_ITEMS[i % RAW_ITEMS.length]
  const daysCreated = i * 0.3 + 0.5
  const createdAt   = rndDate(daysCreated)
  const updatedAt   = new Date(createdAt.getTime() + (i % 5) * 3_600_000)
  return {
    id: `wm-${String(i + 1).padStart(3, "0")}`,
    fileName: raw.name,
    fileExt: raw.ext,
    fileTypeGroup: extToGroup(raw.ext),
    fileSize: raw.size + (i % 7) * 50_000,
    mediaClasses: [MEDIA_CLASSES[i % MEDIA_CLASSES.length]],
    projects: PROJECT_SETS[i % PROJECT_SETS.length],
    senderPhone: `2015${String(33391065 + i)}@c.us`,
    message: raw.name,
    createdAt,
    updatedAt,
    developerId: dev.id,
    developerName: dev.name,
    developerLogo: dev.logo,
  }
})

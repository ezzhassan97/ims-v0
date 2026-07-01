export type DevPriority = "Lowest" | "Low" | "Medium" | "High" | "Highest"
export type DevListingStatus = "Active" | "Hidden"
export type DevOrg = "Nawy" | "Partners"

export interface Developer {
  id: number
  name: string
  nameEn: string
  nameAr: string
  officialName: string
  logo: string
  priority: DevPriority
  listingStatus: DevListingStatus
  organizations: DevOrg[]
  whatsappGroup: { id: string; name: string; image: string } | null
  projectsListed: number
  projectsTotal: number
  phasesListed: number
  phasesTotal: number
  createdAt: string
  updatedAt: string
  nawyEligible: boolean
  descriptionEn: string
  descriptionAr: string
}

const LOGOS = [
  "/placeholder-logo.png",
  "/luxury-clubhouse-exterior.jpg",
  "/aerial-view-masterplan-residential-development-blu.jpg",
  "/placeholder.jpg",
  "/placeholder-user.jpg",
]

const NAMES: Array<{ name: string; ar: string; official: string }> = [
  { name: "Palm Hills Developments", ar: "بالم هيلز للتطوير", official: "Palm Hills Developments Co. S.A.E." },
  { name: "SODIC", ar: "سوديك", official: "Sixth of October Development & Investment Co." },
  { name: "Emaar Misr", ar: "إعمار مصر", official: "Emaar Misr for Development S.A.E." },
  { name: "Mountain View", ar: "ماونتن فيو", official: "DMG — Mountain View" },
  { name: "Ora Developers", ar: "أورا للتطوير", official: "Ora Developers Egypt" },
  { name: "Hyde Park Developments", ar: "هايد بارك للتطوير", official: "Hyde Park for Real Estate Development" },
  { name: "Tatweer Misr", ar: "تطوير مصر", official: "Tatweer Misr for Real Estate Investment" },
  { name: "Madinet Masr", ar: "مدينة مصر", official: "Madinet Masr for Housing & Development" },
  { name: "City Edge Developments", ar: "سيتي إيدج", official: "City Edge for Real Estate Development" },
  { name: "Marakez", ar: "مراكز", official: "Marakez for Real Estate Investment" },
  { name: "Misr Italia Properties", ar: "مصر إيطاليا", official: "Misr Italia Properties S.A.E." },
  { name: "Al Ahly Sabbour", ar: "الأهلي صبور", official: "Al Ahly for Real Estate Development" },
  { name: "TMG Holding", ar: "طلعت مصطفى", official: "Talaat Moustafa Group Holding" },
  { name: "Nawy Developments", ar: "ناوي للتطوير", official: "Nawy Real Estate Development" },
  { name: "New Giza", ar: "نيو جيزة", official: "New Giza for Real Estate Development" },
  { name: "IL Cazar", ar: "إل كازار", official: "IL Cazar Developments" },
  { name: "Roya Developments", ar: "رؤية للتطوير", official: "Roya for Investment & Tourism Development" },
  { name: "Iwan Developments", ar: "إيوان", official: "Iwan Developments S.A.E." },
  { name: "Redcon Properties", ar: "ردكون", official: "Redcon for Trading & Distribution" },
  { name: "Bin Baz Developments", ar: "بن باز", official: "Bin Baz Group for Development" },
  { name: "33 Developments", ar: "33 للتطوير", official: "33 Property Developments" },
  { name: "Gates Developments", ar: "جيتس للتطوير", official: "Gates for Real Estate Development" },
  { name: "Saudi Egyptian Developers", ar: "السعودية المصرية", official: "Saudi Egyptian for Development" },
  { name: "PRE Developments", ar: "بي آر إي", official: "Pyramids Real Estate Developments" },
]

const PRIORITIES: DevPriority[] = ["Highest", "High", "Medium", "Low", "Lowest"]
const WA_GROUPS: Array<{ id: string; name: string; image: string } | null> = [
  null,
  { id: "WA-8801", name: "Sales Group A", image: "/placeholder-user.jpg" },
  { id: "WA-8814", name: "Partners Feed", image: "/placeholder-logo.png" },
  { id: "WA-8822", name: "Developer Broadcast", image: "/luxury-clubhouse-exterior.jpg" },
  null,
  { id: "WA-8830", name: "New Launches", image: "/aerial-view-masterplan-residential-development-blu.jpg" },
]

// Deterministic pseudo-random so SSR/CSR match (no Date.now / Math.random).
export const DEVELOPERS: Developer[] = NAMES.map((n, i) => {
  const listed = (i * 7) % 9
  const total = listed + ((i * 3) % 5)
  const phasesTotal = (i * 5) % 7
  const day = ((i * 13) % 27) + 1
  const monthIdx = (i % 6) + 1
  const pad = (v: number) => String(v).padStart(2, "0")
  return {
    id: 542 - i,
    name: n.name,
    nameEn: n.name,
    nameAr: n.ar,
    officialName: n.official,
    logo: LOGOS[i % LOGOS.length],
    priority: PRIORITIES[i % PRIORITIES.length],
    listingStatus: i % 3 === 0 ? "Active" : "Hidden",
    organizations: i % 4 === 0 ? ["Nawy", "Partners"] : i % 4 === 1 ? ["Partners"] : ["Nawy"],
    whatsappGroup: WA_GROUPS[i % WA_GROUPS.length],
    projectsListed: listed,
    projectsTotal: total,
    phasesListed: Math.max(0, phasesTotal - ((i * 2) % 3)),
    phasesTotal,
    createdAt: `2026-${pad(monthIdx)}-${pad(day)}T${pad(9 + (i % 8))}:${pad((i * 11) % 60)}:00`,
    updatedAt: `2026-06-${pad(((i * 3) % 27) + 1)}T${pad(10 + (i % 6))}:${pad((i * 7) % 60)}:00`,
    nawyEligible: i % 3 !== 1,
    descriptionEn: `${n.name} is a leading real estate developer delivering integrated communities across Egypt.`,
    descriptionAr: `${n.ar} من كبرى شركات التطوير العقاري في مصر.`,
  }
})

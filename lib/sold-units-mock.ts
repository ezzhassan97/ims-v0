// Mock data for Sold Units page

export interface SoldUnit {
  id: string // Sale ID
  developer: {
    id: string
    name: string
    logo: string
  }
  project: {
    id: string
    name: string
  }
  saleType: "Primary" | "Resale"
  propertyType: string
  grossArea: number // sqm
  saleAmount: number // EGP
  matchingConfidence: number // 0-100
  matchedPropertyId: string | null
  matchedDetailedPropertyId: string | null
  matchedPropertyPrice: number | null
  saleDate: string // ISO
  createdAt: string // ISO
  updatedAt: string // ISO
  // Extended fields for drawer
  owner: {
    name: string
    phone: string
    email: string
    nationalId: string
  }
  downpayment: number
  paymentPlan: {
    installmentYears: number
    installmentPercentage: number
    installmentAmount: number
    milestones: { label: string; percentage: number; amount: number; dueDate: string }[]
  }
  matchedProperty: {
    id: string
    detailedId: string
    unitCode: string
    building: string
    floor: number
    bedrooms: number
    bathrooms: number
    grossArea: number
    netArea: number
    finishingType: string
    deliveryDate: string
    price: number
    status: string
  } | null
}

const developers = [
  { id: "DEV-001", name: "Palm Hills Developments", logo: "PH" },
  { id: "DEV-002", name: "Emaar Misr", logo: "EM" },
  { id: "DEV-003", name: "Sodic", logo: "SD" },
  { id: "DEV-004", name: "Mountain View", logo: "MV" },
  { id: "DEV-005", name: "Hyde Park Developments", logo: "HP" },
  { id: "DEV-006", name: "Ora Developers", logo: "OR" },
]

const projects = [
  { id: "PROJ-001", name: "Palm Hills October", devId: "DEV-001" },
  { id: "PROJ-002", name: "Westown Residences", devId: "DEV-001" },
  { id: "PROJ-003", name: "Uptown Cairo", devId: "DEV-002" },
  { id: "PROJ-004", name: "Cairo Festival City", devId: "DEV-002" },
  { id: "PROJ-005", name: "Eas Town", devId: "DEV-003" },
  { id: "PROJ-006", name: "Mountain View iCity", devId: "DEV-004" },
  { id: "PROJ-007", name: "Hyde Park Cairo", devId: "DEV-005" },
  { id: "PROJ-008", name: "Zed East", devId: "DEV-006" },
]

const propertyTypes = ["Apartment", "Villa", "Townhouse", "Duplex", "Studio", "Penthouse", "Chalet"]

const ownerNames = [
  { name: "Ahmed Hassan", phone: "+20 100 123 4567", email: "ahmed.hassan@gmail.com", nationalId: "28901234567890" },
  { name: "Sara Mohamed", phone: "+20 112 987 6543", email: "sara.m@outlook.com", nationalId: "29512345678901" },
  { name: "Omar El-Sayed", phone: "+20 100 555 7890", email: "omar.elsayed@yahoo.com", nationalId: "30023456789012" },
  { name: "Layla Ibrahim", phone: "+20 101 234 5678", email: "layla.i@gmail.com", nationalId: "29734567890123" },
  { name: "Khaled Mansour", phone: "+20 115 678 9012", email: "k.mansour@company.com", nationalId: "28845678901234" },
  { name: "Nour Ali", phone: "+20 100 345 6789", email: "nourali@gmail.com", nationalId: "30156789012345" },
  { name: "Hana Abdel-Aziz", phone: "+20 112 456 7890", email: "hana.aa@hotmail.com", nationalId: "29667890123456" },
  { name: "Youssef Karim", phone: "+20 101 567 8901", email: "ykarim@gmail.com", nationalId: "28978901234567" },
]

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randDate(daysAgo: number, daysAgoEnd = 0) {
  const ms = Date.now() - randBetween(daysAgoEnd, daysAgo) * 86400000
  return new Date(ms).toISOString()
}

function formatId(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(5, "0")}`
}

export function generateSoldUnits(count = 80): SoldUnit[] {
  return Array.from({ length: count }, (_, i) => {
    const dev = developers[i % developers.length]
    const proj = projects[i % projects.length]
    const saleType: "Primary" | "Resale" = i % 3 === 0 ? "Resale" : "Primary"
    const propType = propertyTypes[i % propertyTypes.length]
    const grossArea = randBetween(80, 420)
    const saleAmount = randBetween(2_000_000, 18_000_000)
    const confidence = randBetween(35, 100)
    const isMatched = confidence >= 70
    const matchedPropertyId = isMatched ? formatId("PROP", randBetween(1000, 9999)) : null
    const matchedDetailedPropertyId = isMatched ? formatId("DPROP", randBetween(10000, 99999)) : null
    const matchedPropertyPrice = isMatched ? saleAmount + randBetween(-500_000, 500_000) : null
    const saleDate = randDate(730, 1)
    const createdAt = randDate(730, 1)
    const updatedAt = randDate(30, 0)
    const owner = ownerNames[i % ownerNames.length]
    const downpayment = Math.round(saleAmount * (randBetween(10, 30) / 100))
    const installmentYears = randBetween(3, 10)
    const installmentPercentage = 100 - Math.round((downpayment / saleAmount) * 100)
    const installmentAmount = saleAmount - downpayment

    const milestones = [
      { label: "Down Payment", percentage: Math.round((downpayment / saleAmount) * 100), amount: downpayment, dueDate: saleDate.split("T")[0] },
      { label: "Upon Delivery", percentage: 10, amount: Math.round(saleAmount * 0.1), dueDate: "2027-06-01" },
      {
        label: "Annual Installment",
        percentage: installmentPercentage - 10,
        amount: installmentAmount - Math.round(saleAmount * 0.1),
        dueDate: "2024-2027 (Quarterly)",
      },
    ]

    const matchedProperty = isMatched
      ? {
          id: matchedPropertyId!,
          detailedId: matchedDetailedPropertyId!,
          unitCode: `U-${randBetween(100, 999)}`,
          building: `Building ${String.fromCharCode(65 + (i % 8))}`,
          floor: randBetween(1, 20),
          bedrooms: randBetween(1, 5),
          bathrooms: randBetween(1, 4),
          grossArea,
          netArea: Math.round(grossArea * 0.82),
          finishingType: ["Fully Finished", "Semi-Finished", "Core & Shell"][i % 3],
          deliveryDate: `Q${randBetween(1, 4)} ${randBetween(2025, 2029)}`,
          price: matchedPropertyPrice!,
          status: ["Available", "Reserved", "Sold"][i % 3],
        }
      : null

    return {
      id: formatId("SALE", i + 1),
      developer: dev,
      project: proj,
      saleType,
      propertyType: propType,
      grossArea,
      saleAmount,
      matchingConfidence: confidence,
      matchedPropertyId,
      matchedDetailedPropertyId,
      matchedPropertyPrice,
      saleDate,
      createdAt,
      updatedAt,
      owner,
      downpayment,
      paymentPlan: {
        installmentYears,
        installmentPercentage,
        installmentAmount,
        milestones,
      },
      matchedProperty,
    }
  })
}

export const soldUnitsData = generateSoldUnits(80)

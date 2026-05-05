export interface Building {
  id: string
  name: string
  x: number
  y: number
  unitCount: number
  isAiSuggested?: boolean
  totalUnits?: number
  soldUnits?: number
  buildingType?: string
}

export interface Unit {
  id: string
  saleType: "Primary" | "Resale" | "Nawy Now"
  unitCode: string
  propertyType: "Apartment" | "Villa" | "Townhouse" | "Penthouse" | "Duplex"
  bedrooms: number
  grossArea: number
  buildingNumber: string
  status: "Available" | "Sold Off"
  phase?: string // Added phase field
}

export interface SplittingRule {
  id: string
  name: string
  description: string
}

export interface AmenityPin {
  id: string
  x: number
  y: number
  coverImage?: string
  descriptionEn?: string
  descriptionAr?: string
}

export interface Amenity {
  id: string
  nameEn: string
  nameAr: string
  icon: string
  isLinked: boolean
  pins: AmenityPin[] // Updated from single x,y to array of pins
  phaseId?: string
}

export interface SystemAmenity {
  id: string
  nameEn: string
  nameAr: string
  icon: string
}

export const systemAmenities: SystemAmenity[] = [
  { id: "sa-1", nameEn: "Swimming Pool", nameAr: "حمام سباحة", icon: "waves" },
  { id: "sa-2", nameEn: "Gym & Fitness", nameAr: "صالة رياضية", icon: "dumbbell" },
  { id: "sa-3", nameEn: "Kids Playground", nameAr: "ملعب أطفال", icon: "baby" },
  { id: "sa-4", nameEn: "Tennis Court", nameAr: "ملعب تنس", icon: "tennis-ball" },
  { id: "sa-5", nameEn: "Basketball Court", nameAr: "ملعب كرة سلة", icon: "circle-dot" },
  { id: "sa-6", nameEn: "Clubhouse", nameAr: "نادي اجتماعي", icon: "home" },
  { id: "sa-7", nameEn: "Mosque", nameAr: "مسجد", icon: "building" },
  { id: "sa-8", nameEn: "Parking", nameAr: "موقف سيارات", icon: "car" },
  { id: "sa-9", nameEn: "Security Gate", nameAr: "بوابة أمنية", icon: "shield" },
  { id: "sa-10", nameEn: "Shopping Center", nameAr: "مركز تسوق", icon: "shopping-bag" },
  { id: "sa-11", nameEn: "Spa & Wellness", nameAr: "سبا وعافية", icon: "sparkles" },
  { id: "sa-12", nameEn: "Running Track", nameAr: "مضمار جري", icon: "footprints" },
  { id: "sa-13", nameEn: "BBQ Area", nameAr: "منطقة شواء", icon: "flame" },
  { id: "sa-14", nameEn: "Garden", nameAr: "حديقة", icon: "trees" },
  { id: "sa-15", nameEn: "Medical Center", nameAr: "مركز طبي", icon: "plus" },
]

export const initialBuildings: Building[] = [
  { id: "1", name: "Building 01", x: 15, y: 20, unitCount: 24, totalUnits: 24, soldUnits: 5, buildingType: "BDT2" },
  { id: "2", name: "Building 02", x: 35, y: 15, unitCount: 18, totalUnits: 18, soldUnits: 18, buildingType: "BDT2" }, // All sold - RED
  { id: "3", name: "Building 03", x: 55, y: 25, unitCount: 32, totalUnits: 32, soldUnits: 10, buildingType: "VLL" },
  { id: "4", name: "Building 04", x: 75, y: 20, unitCount: 20, totalUnits: 20, soldUnits: 8, buildingType: "TH1" },
  { id: "5", name: "Building 05", x: 25, y: 50, unitCount: 28, totalUnits: 0, soldUnits: 0, buildingType: "BDT2" }, // No units - GREY
  { id: "6", name: "Building 06", x: 50, y: 55, unitCount: 16, totalUnits: 16, soldUnits: 16, buildingType: "VLL" }, // All sold - RED
  { id: "7", name: "Building 07", x: 70, y: 50, unitCount: 22, totalUnits: 22, soldUnits: 3, buildingType: "TH1" },
  { id: "8", name: "Building 08", x: 40, y: 75, unitCount: 30, totalUnits: 0, soldUnits: 0, buildingType: "APT" }, // No units - GREY
]

export const initialUnits: Unit[] = [
  {
    id: "1",
    saleType: "Primary",
    unitCode: "APT-001",
    propertyType: "Apartment",
    bedrooms: 2,
    grossArea: 120,
    buildingNumber: "Building 01",
    status: "Available",
    phase: "Phase 1",
  },
  {
    id: "2",
    saleType: "Primary",
    unitCode: "APT-002",
    propertyType: "Apartment",
    bedrooms: 3,
    grossArea: 150,
    buildingNumber: "Building 01",
    status: "Sold Off",
    phase: "Phase 1",
  },
  {
    id: "3",
    saleType: "Resale",
    unitCode: "VIL-001",
    propertyType: "Villa",
    bedrooms: 4,
    grossArea: 280,
    buildingNumber: "Building 02",
    status: "Available",
    phase: "Phase 2",
  },
  {
    id: "4",
    saleType: "Primary",
    unitCode: "",
    propertyType: "Apartment",
    bedrooms: 1,
    grossArea: 85,
    buildingNumber: "Building 03",
    status: "Available",
    phase: "Phase 3",
  },
  {
    id: "5",
    saleType: "Nawy Now",
    unitCode: "TWN-001",
    propertyType: "Townhouse",
    bedrooms: 3,
    grossArea: 200,
    buildingNumber: "Building 04",
    status: "Available",
    phase: "Phase 4",
  },
  {
    id: "6",
    saleType: "Primary",
    unitCode: "APT-003",
    propertyType: "Apartment",
    bedrooms: 2,
    grossArea: 115,
    buildingNumber: "",
    status: "Available",
    phase: "Phase 5",
  },
  {
    id: "7",
    saleType: "Resale",
    unitCode: "PNT-001",
    propertyType: "Penthouse",
    bedrooms: 4,
    grossArea: 320,
    buildingNumber: "Building 05",
    status: "Sold Off",
    phase: "Phase 1",
  },
  {
    id: "8",
    saleType: "Primary",
    unitCode: "APT-004",
    propertyType: "Apartment",
    bedrooms: 2,
    grossArea: 118,
    buildingNumber: "Building 99",
    status: "Available",
    phase: "Phase 2",
  },
  {
    id: "9",
    saleType: "Primary",
    unitCode: "DPX-001",
    propertyType: "Duplex",
    bedrooms: 3,
    grossArea: 180,
    buildingNumber: "Building 06",
    status: "Available",
    phase: "Phase 3",
  },
  {
    id: "10",
    saleType: "Nawy Now",
    unitCode: "",
    propertyType: "Apartment",
    bedrooms: 1,
    grossArea: 78,
    buildingNumber: "Building 07",
    status: "Available",
    phase: "Phase 4",
  },
  {
    id: "11",
    saleType: "Primary",
    unitCode: "APT-005",
    propertyType: "Apartment",
    bedrooms: 3,
    grossArea: 145,
    buildingNumber: "Building 08",
    status: "Sold Off",
    phase: "Phase 5",
  },
  {
    id: "12",
    saleType: "Resale",
    unitCode: "VIL-002",
    propertyType: "Villa",
    bedrooms: 5,
    grossArea: 350,
    buildingNumber: "",
    status: "Available",
    phase: "Phase 1",
  },
  {
    id: "13",
    saleType: "Primary",
    unitCode: "APT-006",
    propertyType: "Apartment",
    bedrooms: 2,
    grossArea: 122,
    buildingNumber: "Building 01",
    status: "Available",
    phase: "Phase 2",
  },
  {
    id: "14",
    saleType: "Primary",
    unitCode: "TWN-002",
    propertyType: "Townhouse",
    bedrooms: 4,
    grossArea: 240,
    buildingNumber: "Building Unknown",
    status: "Available",
    phase: "Phase 3",
  },
  {
    id: "15",
    saleType: "Nawy Now",
    unitCode: "APT-007",
    propertyType: "Apartment",
    bedrooms: 1,
    grossArea: 72,
    buildingNumber: "Building 02",
    status: "Sold Off",
    phase: "Phase 4",
  },
  {
    id: "16",
    saleType: "Primary",
    unitCode: "",
    propertyType: "Penthouse",
    bedrooms: 5,
    grossArea: 400,
    buildingNumber: "Building 03",
    status: "Available",
    phase: "Phase 5",
  },
  {
    id: "17",
    saleType: "Resale",
    unitCode: "DPX-002",
    propertyType: "Duplex",
    bedrooms: 4,
    grossArea: 220,
    buildingNumber: "Building 04",
    status: "Available",
    phase: "Phase 1",
  },
  {
    id: "18",
    saleType: "Primary",
    unitCode: "APT-008",
    propertyType: "Apartment",
    bedrooms: 1,
    grossArea: 110,
    buildingNumber: "",
    status: "Sold Off",
    phase: "Phase 2",
  },
  {
    id: "19",
    saleType: "Primary",
    unitCode: "APT-009",
    propertyType: "Apartment",
    bedrooms: 3,
    grossArea: 155,
    buildingNumber: "Building 05",
    status: "Available",
    phase: "Phase 3",
  },
  {
    id: "20",
    saleType: "Nawy Now",
    unitCode: "VIL-003",
    propertyType: "Villa",
    bedrooms: 4,
    grossArea: 300,
    buildingNumber: "Building 06",
    status: "Available",
    phase: "Phase 4",
  },
  {
    id: "21",
    saleType: "Primary",
    unitCode: "APT-010",
    propertyType: "Apartment",
    bedrooms: 1,
    grossArea: 68,
    buildingNumber: "Building 07",
    status: "Sold Off",
    phase: "Phase 5",
  },
  {
    id: "22",
    saleType: "Resale",
    unitCode: "",
    propertyType: "Townhouse",
    bedrooms: 3,
    grossArea: 195,
    buildingNumber: "Building 08",
    status: "Available",
    phase: "Phase 1",
  },
  {
    id: "23",
    saleType: "Primary",
    unitCode: "APT-011",
    propertyType: "Apartment",
    bedrooms: 2,
    grossArea: 125,
    buildingNumber: "Non-Existent",
    status: "Available",
    phase: "Phase 2",
  },
  {
    id: "24",
    saleType: "Primary",
    unitCode: "PNT-002",
    propertyType: "Penthouse",
    bedrooms: 3,
    grossArea: 280,
    buildingNumber: "Building 01",
    status: "Available",
    phase: "Phase 3",
  },
]

export const initialSplittingRules: SplittingRule[] = [
  { id: "1", name: "Rule 1", description: "Split Unit Code by '-' and take first segment as Building Number" },
  { id: "2", name: "Rule 2", description: "Extract numeric suffix from Building Name" },
  { id: "3", name: "Rule 3", description: "Map property type prefix to building zone" },
]

export const initialAmenities: Amenity[] = [
  {
    id: "1",
    nameEn: "Swimming Pool",
    nameAr: "حمام سباحة",
    icon: "waves",
    isLinked: true,
    phaseId: "phase-1",
    pins: [{ id: "pin-1", x: 20, y: 35 }],
  },
  {
    id: "2",
    nameEn: "Gym & Fitness",
    nameAr: "صالة رياضية",
    icon: "dumbbell",
    isLinked: true,
    phaseId: "phase-2",
    pins: [
      { id: "pin-2", x: 45, y: 25, descriptionEn: "Main gym facility", descriptionAr: "المنشأة الرياضية الرئيسية" },
      { id: "pin-3", x: 75, y: 45, descriptionEn: "Secondary gym", descriptionAr: "الصالة الرياضية الثانوية" },
    ],
  },
  { id: "3", nameEn: "Kids Playground", nameAr: "ملعب أطفال", icon: "baby", isLinked: true, phaseId: "phase-3", pins: [] },
  {
    id: "4",
    nameEn: "Clubhouse",
    nameAr: "نادي اجتماعي",
    icon: "home",
    isLinked: true,
    phaseId: "phase-1",
    pins: [
      {
        id: "pin-4",
        x: 70,
        y: 60,
        coverImage: "/luxury-clubhouse-exterior.jpg",
        descriptionEn: "A premium clubhouse with modern amenities and stunning views.",
        descriptionAr: "نادي اجتماعي فاخر مع مرافق حديثة ومناظر خلابة.",
      },
    ],
  },
  {
    id: "5",
    nameEn: "Parking",
    nameAr: "موقف سيارات",
    icon: "car",
    isLinked: true,
    phaseId: "phase-4",
    pins: [{ id: "pin-5", x: 85, y: 40 }],
  },
]

export interface FAQ {
  id: string
  language: "en" | "ar"
  question: string
  answer: string
  rank: number
  status: "Active" | "Hidden"
  createdAt: Date
  updatedAt: Date
}

export const initialFAQs: FAQ[] = [
  {
    id: "1",
    language: "en",
    question: "What are the payment plans available?",
    answer:
      "<p>We offer <strong>flexible payment plans</strong> ranging from 5 to 10 years with installments starting at 10% down payment.</p><ul><li>5 years plan with 15% down payment</li><li>7 years plan with 10% down payment</li><li>10 years plan with 10% down payment</li></ul>",
    rank: 1,
    status: "Active",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "2",
    language: "en",
    question: "What amenities are included?",
    answer:
      "<p>The project includes world-class amenities:</p><ul><li>Swimming pools</li><li>Gym and fitness center</li><li>Kids playground</li><li>Clubhouse</li><li>Tennis and basketball courts</li></ul>",
    rank: 2,
    status: "Active",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    language: "en",
    question: "When is the delivery date?",
    answer: "<p>The project is scheduled for delivery in <strong>Q4 2026</strong>.</p>",
    rank: 3,
    status: "Hidden",
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date("2024-01-18"),
  },
  {
    id: "4",
    language: "ar",
    question: "ما هي خطط الدفع المتاحة؟",
    answer:
      "<p>نحن نقدم <strong>خطط دفع مرنة</strong> تتراوح من 5 إلى 10 سنوات مع أقساط تبدأ من 10٪ دفعة أولى.</p><ul><li>خطة 5 سنوات مع 15٪ دفعة أولى</li><li>خطة 7 سنوات مع 10٪ دفعة أولى</li><li>خطة 10 سنوات مع 10٪ دفعة أولى</li></ul>",
    rank: 1,
    status: "Active",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "5",
    language: "ar",
    question: "ما هي المرافق المتضمنة؟",
    answer:
      "<p>يتضمن المشروع مرافق عالمية المستوى:</p><ul><li>حمامات سباحة</li><li>صالة رياضية ومركز للياقة البدنية</li><li>ملعب للأطفال</li><li>نادي اجتماعي</li><li>ملاعب التنس وكرة السلة</li></ul>",
    rank: 2,
    status: "Active",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "6",
    language: "ar",
    question: "متى موعد التسليم؟",
    answer: "<p>من المقرر تسليم المشروع في <strong>الربع الرابع 2026</strong>.</p>",
    rank: 3,
    status: "Hidden",
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date("2024-01-18"),
  },
]

export interface MasterplanFile {
  id: string
  version: number
  imageUrl: string
  type: "Listing Masterplan" | "Numbered Masterplan" | "GIS Masterplan"
  resolution: "High" | "Med" | "Low"
  dimensions: { width: number; height: number }
  fileSize: number // in KB
  uploadedAt: Date
}

export const initialMasterplans: MasterplanFile[] = [
  {
    id: "mp-1",
    version: 3,
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
    type: "Numbered Masterplan",
    resolution: "High",
    dimensions: { width: 4096, height: 2160 },
    fileSize: 3840,
    uploadedAt: new Date("2024-01-20"),
  },
  {
    id: "mp-2",
    version: 2,
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
    type: "GIS Masterplan",
    resolution: "Med",
    dimensions: { width: 2048, height: 1080 },
    fileSize: 1920,
    uploadedAt: new Date("2024-01-15"),
  },
  {
    id: "mp-3",
    version: 1,
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
    type: "Listing Masterplan",
    resolution: "High",
    dimensions: { width: 3840, height: 2160 },
    fileSize: 3200,
    uploadedAt: new Date("2024-01-10"),
  },
  {
    id: "mp-4",
    version: 4,
    imageUrl: "/aerial-view-masterplan-residential-development-blu.jpg",
    type: "Numbered Masterplan",
    resolution: "Low",
    dimensions: { width: 1920, height: 1080 },
    fileSize: 980,
    uploadedAt: new Date("2024-01-22"),
  },
]

export interface Phase {
  id: string
  name: string
  color: string
}

export interface PhasePolygon {
  id: string
  phaseId: string
  points: { x: number; y: number }[]
}

export const projectPhases: Phase[] = [
  { id: "phase-1", name: "Phase 1", color: "#3b82f6" }, // blue
  { id: "phase-2", name: "Phase 2", color: "#10b981" }, // green
  { id: "phase-3", name: "Phase 3", color: "#f59e0b" }, // amber
  { id: "phase-4", name: "Phase 4", color: "#ef4444" }, // red
  { id: "phase-5", name: "Phase 5", color: "#8b5cf6" }, // purple
]

export const projectInfo = {
  name: "Palm Hills October",
  developer: "Palm Hills Development",
  location: "New Cairo, Egypt",
  totalUnits: 248,
}

export interface ConstructionUpdate {
  id: string
  collectionId: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  media: Array<{
    id: string
    url: string
    type: "image" | "video"
    thumbnail?: string
  }>
  status: "Pending Review" | "Rejected" | "Approved Listing" | "Listed"
  listingId?: string
  createdAt: Date
  updatedAt: Date
  // Developer & Project metadata
  developerId: string
  developerName: string
  developerLogo?: string
  projectId: string
  projectName: string
  parentProjectName?: string // present if this project is a phase/child
}

export const initialConstructionUpdates: ConstructionUpdate[] = [
  {
    id: "cu-1",
    collectionId: "COL-2024-001",
    titleEn: "Foundation Work Progress",
    titleAr: "تقدم أعمال الأساس",
    descriptionEn: "Foundation work for phase 2 is now 85% complete. All concrete pouring has been completed successfully.",
    descriptionAr: "أعمال الأساس في المرحلة 2 اكتملت بنسبة 85%. تم إكمال جميع عمليات صب الخرسانة بنجاح.",
    media: [
      { id: "m1", url: "/construction-1.jpg", type: "image", thumbnail: "/construction-1-thumb.jpg" },
      { id: "m2", url: "/construction-2.jpg", type: "image", thumbnail: "/construction-2-thumb.jpg" },
      { id: "m3", url: "/construction-video-1.mp4", type: "video", thumbnail: "/video-1-thumb.jpg" },
    ],
    status: "Pending Review",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-22"),
    developerId: "DEV-001",
    developerName: "Emaar Misr",
    developerLogo: "https://api.dicebear.com/7.x/initials/svg?seed=EM&backgroundColor=1d4ed8&fontColor=ffffff",
    projectId: "PRJ-1001",
    projectName: "Marassi Phase 2",
    parentProjectName: "Marassi",
  },
  {
    id: "cu-2",
    collectionId: "COL-2024-002",
    titleEn: "Structural Steel Installation",
    titleAr: "تركيب الهياكل الحديدية",
    descriptionEn: "Steel frame installation for the main towers has begun. 40% of the steel structure is now in place.",
    descriptionAr: "بدأ تركيب الهياكل الحديدية للأبراج الرئيسية. تم وضع 40% من الهيكل الحديدي.",
    media: [
      { id: "m4", url: "/steel-1.jpg", type: "image", thumbnail: "/steel-1-thumb.jpg" },
      { id: "m5", url: "/steel-2.jpg", type: "image", thumbnail: "/steel-2-thumb.jpg" },
    ],
    status: "Listed",
    listingId: "LIST-2024-042",
    createdAt: new Date("2024-02-18"),
    updatedAt: new Date("2024-02-20"),
    developerId: "DEV-002",
    developerName: "SODIC",
    developerLogo: "https://api.dicebear.com/7.x/initials/svg?seed=SO&backgroundColor=0f766e&fontColor=ffffff",
    projectId: "PRJ-1002",
    projectName: "Eastown",
  },
  {
    id: "cu-3",
    collectionId: "COL-2024-003",
    titleEn: "Landscape Development",
    titleAr: "تطوير المناظر الطبيعية",
    descriptionEn: "Landscaping work in the common areas has been rejected due to design changes. Awaiting new specifications.",
    descriptionAr: "تم رفض أعمال تنسيق الحدائق في المناطق المشتركة بسبب تغييرات التصميم. بانتظار المواصفات الجديدة.",
    media: [
      { id: "m6", url: "/landscape-1.jpg", type: "image", thumbnail: "/landscape-1-thumb.jpg" },
    ],
    status: "Rejected",
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-19"),
    developerId: "DEV-003",
    developerName: "Palm Hills",
    developerLogo: "https://api.dicebear.com/7.x/initials/svg?seed=PH&backgroundColor=7c3aed&fontColor=ffffff",
    projectId: "PRJ-1003",
    projectName: "Badya Phase 1",
    parentProjectName: "Badya",
  },
  {
    id: "cu-4",
    collectionId: "COL-2024-004",
    titleEn: "MEP Systems Installation",
    titleAr: "تركيب أنظمة MEP",
    descriptionEn: "Mechanical, Electrical, and Plumbing systems installation is progressing on schedule for phase 1.",
    descriptionAr: "يتقدم تركيب أنظمة الأنابيب والكهربائية والميكانيكية وفقاً للجدول الزمني للمرحلة 1.",
    media: [
      { id: "m7", url: "/mep-1.jpg", type: "image", thumbnail: "/mep-1-thumb.jpg" },
      { id: "m8", url: "/mep-2.jpg", type: "image", thumbnail: "/mep-2-thumb.jpg" },
      { id: "m9", url: "/mep-3.jpg", type: "image", thumbnail: "/mep-3-thumb.jpg" },
    ],
    status: "Pending Review",
    createdAt: new Date("2024-02-12"),
    updatedAt: new Date("2024-02-21"),
    developerId: "DEV-001",
    developerName: "Emaar Misr",
    developerLogo: "https://api.dicebear.com/7.x/initials/svg?seed=EM&backgroundColor=1d4ed8&fontColor=ffffff",
    projectId: "PRJ-1004",
    projectName: "Uptown Cairo",
  },
]

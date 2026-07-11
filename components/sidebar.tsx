"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Satellite,
  Building2,
  Rocket,
  FolderKanban,
  Paperclip,
  FileText,
  Map,
  Layers,
  ImageIcon,
  Video,
  CreditCard,
  Home,
  Package,
  Repeat,
  Clock,
  Store,
  Key,
  Settings,
  SlidersHorizontal,
  MapPin,
  Database,
  FileSpreadsheet,
  Layers2,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Users,
  UsersRound,
  Cog,
  BarChart3,
  TrendingUp,
  Activity,
  PieChart,
  Sparkles,
  Newspaper,
  Rss,
  HardHat,
  FileBarChart,
  FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface NavItem {
  label: string
  icon: React.ReactNode
  children?: NavItem[]
  isGreyed?: boolean
}

const navItems: NavItem[] = [
  {
    label: "Dashboards",
    icon: <LayoutDashboard className="h-4 w-4" />,
    children: [
      { label: "Inventory Supply Analysis", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Primary Ingestion Performance", icon: <TrendingUp className="h-4 w-4" /> },
      { label: "E-realty Ingestion Performance", icon: <Activity className="h-4 w-4" /> },
      { label: "Resale Ingestion Performance", icon: <PieChart className="h-4 w-4" /> },
      { label: "Data Quality Analysis", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: "Areas",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    label: "Developers",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    label: "Whatsapp",
    icon: <WhatsAppIcon className="h-4 w-4" />,
    children: [
      { label: "Whatsapp Groups", icon: <UsersRound className="h-4 w-4" /> },
      { label: "Whatsapp Media", icon: <ImageIcon className="h-4 w-4" /> },
      { label: "Whatsapp Configurations", icon: <Cog className="h-4 w-4" /> },
    ],
  },
  {
    label: "Market Updates",
    icon: <Newspaper className="h-4 w-4" />,
    children: [
      { label: "Nawy Space", icon: <Satellite className="h-4 w-4" /> },
      { label: "Newsfeed Posts", icon: <Rss className="h-4 w-4" /> },
      { label: "Construction Updates", icon: <HardHat className="h-4 w-4" /> },
      { label: "Market Research Reports", icon: <FileBarChart className="h-4 w-4" /> },
    ],
  },
  {
    label: "Launches",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    label: "Projects",
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    label: "Projects Attachments",
    icon: <Paperclip className="h-4 w-4" />,
    children: [
      { label: "Brochures", icon: <FileText className="h-4 w-4" /> },
      { label: "Masterplan", icon: <Map className="h-4 w-4" /> },
      { label: "Floor Plans", icon: <Layers className="h-4 w-4" /> },
      { label: "Render Images", icon: <ImageIcon className="h-4 w-4" /> },
      { label: "Media Library", icon: <Video className="h-4 w-4" /> },
      { label: "Payment Plans", icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
  {
    label: "Properties",
    icon: <Home className="h-4 w-4" />,
    children: [
      { label: "All Properties", icon: <Package className="h-4 w-4" /> },
      { label: "Primary Properties", icon: <Home className="h-4 w-4" /> },
      { label: "Resale Properties", icon: <Repeat className="h-4 w-4" /> },
      { label: "Nawy Now Properties", icon: <Clock className="h-4 w-4" /> },
      { label: "Resale Marketplace", icon: <Store className="h-4 w-4" /> },
      { label: "Rental Properties", icon: <Key className="h-4 w-4" /> },
      { label: "Sold Units", icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    label: "Data Ingestion",
    icon: <Database className="h-4 w-4" />,
    children: [
      { label: "Automatic Sheets Entries", icon: <FileSpreadsheet className="h-4 w-4" /> },
      { label: "Manual Grouped Entries", icon: <Layers2 className="h-4 w-4" /> },
    ],
  },
  {
    label: "Data Validation",
    icon: <ShieldCheck className="h-4 w-4" />,
    children: [
      { label: "Quality System", icon: <Activity className="h-4 w-4" /> },
      { label: "Validation Rules", icon: <ShieldCheck className="h-4 w-4" /> },
      { label: "Data Issues", icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
  {
    label: "General Configurations",
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: "Properties Configurations", icon: <SlidersHorizontal className="h-4 w-4" /> },
      { label: "Project Configurations", icon: <FolderKanban className="h-4 w-4" /> },
      { label: "Map Configurations", icon: <MapPin className="h-4 w-4" /> },
      { label: "Areas FAQs", icon: <MapPin className="h-4 w-4" /> },
    ],
  },
  {
    label: "Audit Logs",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    label: "Users Management",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Testing Playground",
    icon: <FlaskConical className="h-4 w-4" />,
    isGreyed: true,
  },
]

interface SidebarProps {
  onPageChange: (page: string) => void
  activePage: string
  onCollapseChange?: (collapsed: boolean) => void
}

interface NavItemComponentProps {
  item: NavItem
  isCollapsed: boolean
  level?: number
  onPageChange: (page: string) => void
  activePage: string
}

function isChildActive(item: NavItem, activePage: string): boolean {
  if (!item.children) return false
  return item.children.some((child) => child.label === activePage || isChildActive(child, activePage))
}

function NavItemComponent({ item, isCollapsed, level = 0, onPageChange, activePage }: NavItemComponentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const hasChildren = item.children && item.children.length > 0
  const isActive = activePage === item.label
  const hasActiveChild = isChildActive(item, activePage)
  const isParentOfActiveCollapsed = isCollapsed && hasChildren && hasActiveChild

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false)
      }
    }

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPopup])

  const handleClick = () => {
    if (hasChildren) {
      if (isCollapsed && level === 0) {
        setShowPopup((prev) => !prev)
        setShowTooltip(false)
      } else {
        setIsOpen(!isOpen)
      }
    } else {
      onPageChange(item.label)
      setShowPopup(false)
    }
  }

  const handlePopupItemClick = (label: string) => {
    onPageChange(label)
    setShowPopup(false)
  }

  const buttonContent = (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={() => isCollapsed && level === 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        level > 0 && "pl-8",
        isCollapsed && level === 0 && "justify-center px-2",
        isActive || isParentOfActiveCollapsed
          ? "bg-primary text-primary-foreground"
          : item.isGreyed
            ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {hasChildren && (
            <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
          )}
        </>
      )}
    </button>
  )

  return (
    <div className="relative">
      {isCollapsed && level === 0 ? (
        <Tooltip open={showTooltip && !showPopup} delayDuration={100}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        buttonContent
      )}

      {hasChildren && isCollapsed && level === 0 && showPopup && (
        <div
          ref={popupRef}
          className="fixed ml-2 z-[100] bg-card border border-border rounded-lg shadow-lg py-2 min-w-52"
          style={{
            left: buttonRef.current ? buttonRef.current.getBoundingClientRect().right + 8 : 0,
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().top : 0,
          }}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
            {item.label}
          </div>
          {item.children!.map((child) => (
            <button
              key={child.label}
              onClick={() => handlePopupItemClick(child.label)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                activePage === child.label
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
              )}
            >
              <span className="flex-shrink-0">{child.icon}</span>
              <span className="text-left truncate">{child.label}</span>
            </button>
          ))}
        </div>
      )}

      {hasChildren && isOpen && !isCollapsed && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavItemComponent
              key={child.label}
              item={child}
              isCollapsed={isCollapsed}
              level={level + 1}
              onPageChange={onPageChange}
              activePage={activePage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onPageChange, activePage, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 flex-shrink-0 z-40",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          {!isCollapsed && <span className="font-semibold text-foreground truncate">Masterplan</span>}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 flex-shrink-0", isCollapsed && "mx-auto")}
            onClick={handleCollapseToggle}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.label}
              item={item}
              isCollapsed={isCollapsed}
              onPageChange={onPageChange}
              activePage={activePage}
            />
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  )
}

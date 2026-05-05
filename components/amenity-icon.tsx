"use client"

import type React from "react"

import {
  Waves,
  Dumbbell,
  Baby,
  CircleDot,
  Home,
  Building,
  Car,
  Shield,
  ShoppingBag,
  Sparkles,
  Footprints,
  Flame,
  Trees,
  Plus,
  MapPin,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  waves: Waves,
  dumbbell: Dumbbell,
  baby: Baby,
  "tennis-ball": CircleDot,
  "circle-dot": CircleDot,
  home: Home,
  building: Building,
  car: Car,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  footprints: Footprints,
  flame: Flame,
  trees: Trees,
  plus: Plus,
}

interface AmenityIconProps {
  icon: string
  className?: string
}

export function AmenityIcon({ icon, className = "h-4 w-4" }: AmenityIconProps) {
  const IconComponent = iconMap[icon] || MapPin
  return <IconComponent className={className} />
}

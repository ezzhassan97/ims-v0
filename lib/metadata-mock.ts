"use client"

import { useSyncExternalStore } from "react"

// ─── Metadata keys — the master lists managed from the configuration pages ────
// Projects and developers each have a dynamic list of metadata KEYS (name +
// data type). Details pages pick a key from the list and attach a VALUE —
// structuring the unstructured facts that arrive in fact sheets and brochures.

export type MetaType = "numeric" | "date" | "text" | "boolean" | "enum"
export const META_TYPES: MetaType[] = ["numeric", "date", "text", "boolean", "enum"]

export interface MetaKey {
  id: string
  name: string
  type: MetaType
  /** Shown as a suffix on numeric values — "sqm", "%", "berths"… */
  unit?: string
  /** Allowed values when type is "enum". */
  options?: string[]
}

export type MetaKind = "project" | "developer"

const PROJECT_KEYS: MetaKey[] = [
  { id: "PMK-001", name: "Beachfront", type: "boolean" },
  { id: "PMK-002", name: "Project Depth", type: "numeric", unit: "m" },
  { id: "PMK-003", name: "Waterbody", type: "enum", options: ["Sea", "Open-to-sea Lagoon", "Artificial Lagoon", "Lake", "None"] },
  { id: "PMK-004", name: "Greenery Area", type: "numeric", unit: "sqm" },
  { id: "PMK-005", name: "Golf Course Area", type: "numeric", unit: "sqm" },
  { id: "PMK-006", name: "Open Sea Lagoons", type: "numeric", unit: "sqm" },
  { id: "PMK-007", name: "International Marina", type: "numeric", unit: "berths" },
  { id: "PMK-008", name: "Dry Rock Marina", type: "numeric", unit: "berths" },
  { id: "PMK-009", name: "Footprint", type: "numeric", unit: "%" },
  { id: "PMK-010", name: "Open Spaces", type: "numeric", unit: "%" },
  { id: "PMK-011", name: "Beach Area", type: "numeric", unit: "sqm" },
  { id: "PMK-012", name: "Number of Gates", type: "numeric" },
  { id: "PMK-013", name: "Promenade Length", type: "numeric", unit: "km" },
  { id: "PMK-014", name: "Artificial Swimmable Lagoons", type: "numeric", unit: "sqm" },
  { id: "PMK-015", name: "Free Zones", type: "numeric" },
  { id: "PMK-016", name: "First Delivery Date", type: "date" },
  { id: "PMK-017", name: "Master Architect", type: "text" },
]

const DEVELOPER_KEYS: MetaKey[] = [
  { id: "DMK-001", name: "Founded Year", type: "numeric" },
  { id: "DMK-002", name: "Number of Projects", type: "numeric" },
  { id: "DMK-003", name: "Land Bank", type: "numeric", unit: "sqm" },
  { id: "DMK-004", name: "Stock Exchange Listed", type: "boolean" },
  { id: "DMK-005", name: "Ownership", type: "enum", options: ["Private", "Public", "Family Business", "Joint Venture"] },
  { id: "DMK-006", name: "Headquarters", type: "text" },
  { id: "DMK-007", name: "Annual Delivery Rate", type: "numeric", unit: "units/yr" },
  { id: "DMK-008", name: "First Project Delivery", type: "date" },
]

// ─── Tiny store — the config pages write, the details tabs read ───────────────

const stores: Record<MetaKind, { keys: MetaKey[]; listeners: Set<() => void> }> = {
  project: { keys: PROJECT_KEYS, listeners: new Set() },
  developer: { keys: DEVELOPER_KEYS, listeners: new Set() },
}

export function useMetaKeys(kind: MetaKind): MetaKey[] {
  const s = stores[kind]
  return useSyncExternalStore(
    (cb) => { s.listeners.add(cb); return () => { s.listeners.delete(cb) } },
    () => s.keys,
    () => s.keys,
  )
}

function mutate(kind: MetaKind, next: MetaKey[]) {
  stores[kind].keys = next
  stores[kind].listeners.forEach((l) => l())
}

export function addMetaKey(kind: MetaKind, k: Omit<MetaKey, "id">): MetaKey {
  const prefix = kind === "project" ? "PMK" : "DMK"
  const nextNum = Math.max(0, ...stores[kind].keys.map((x) => Number(x.id.slice(4)))) + 1
  const created: MetaKey = { ...k, id: `${prefix}-${String(nextNum).padStart(3, "0")}` }
  mutate(kind, [...stores[kind].keys, created])
  return created
}

export function updateMetaKey(kind: MetaKind, id: string, patch: Partial<Omit<MetaKey, "id">>) {
  mutate(kind, stores[kind].keys.map((k) => (k.id === id ? { ...k, ...patch } : k)))
}

export function removeMetaKey(kind: MetaKind, id: string) {
  mutate(kind, stores[kind].keys.filter((k) => k.id !== id))
}

// Per-developer contacts — managed in the developer details Contacts tab and offered
// (alongside the default Nawy contacts) when creating a WhatsApp group for the developer.

export interface DevContact {
  id: string
  name: string
  title: string
  phone: string
  email?: string
  /** The WhatsApp group this contact joined — a developer can be linked to several groups. */
  joinedGroup: { id: string; name: string } | null
}

const POOL: Array<Omit<DevContact, "id" | "joinedGroup">> = [
  { name: "Mahmoud Adel", title: "Sales Director", phone: "+2 010 0123 4567", email: "m.adel@example.com" },
  { name: "Nour Hassan", title: "Marketing Lead", phone: "+2 010 6987 6543", email: "n.hassan@example.com" },
  { name: "Omar Zaki", title: "Partnerships Manager", phone: "+2 011 1222 3344", email: "o.zaki@example.com" },
  { name: "Salma Ibrahim", title: "Inventory Coordinator", phone: "+2 012 8555 7788" },
  { name: "Hany Mostafa", title: "CEO Office", phone: "+2 015 0444 9911", email: "h.mostafa@example.com" },
]

/**
 * Deterministic contacts for a developer. Some joined the developer's linked group,
 * one joined a secondary group, the rest haven't joined any group yet.
 */
export function devContactsFor(devId: number | string, linkedGroup: { id: string; name: string } | null): DevContact[] {
  const seed = typeof devId === "number" ? devId : devId.length
  const count = 3 + (seed % 3) // 3–5 contacts
  const secondary = { id: `WA-77${String(seed).slice(-2).padStart(2, "0")}`, name: "Launch Updates" }
  return Array.from({ length: count }, (_, i) => {
    const base = POOL[(seed + i) % POOL.length]
    const joinedGroup = i === 0 && linkedGroup ? linkedGroup : i === 1 ? secondary : null
    return { id: `DC-${String(seed).slice(-2).padStart(2, "0")}${i + 1}`, ...base, joinedGroup }
  })
}

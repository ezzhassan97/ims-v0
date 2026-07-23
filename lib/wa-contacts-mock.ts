// Default WhatsApp group contacts — configured in WhatsApp Configurations → Contacts.
// These are the people automatically added to every WhatsApp group created for a new developer.

export interface WaContact {
  id: string
  name: string
  phone: string
  role: "Admin" | "Member"
}

/** Internal users offered in the contact-name dropdown (name can also be free text). */
export const WA_USERS = ["Ezz Hassan", "Sara Adel", "Omar Farouk", "Nour ElDin", "Youssef Kamal", "Laila Mostafa", "Karim Fathy"]

export const WA_CONTACTS: WaContact[] = [
  { id: "CT-001", name: "Ezz Hassan", phone: "+2 010 1234 5678", role: "Admin" },
  { id: "CT-002", name: "Sara Adel", phone: "+2 011 2345 6789", role: "Admin" },
  { id: "CT-003", name: "Omar Farouk", phone: "+2 012 3456 7890", role: "Member" },
  { id: "CT-004", name: "Nour ElDin", phone: "+2 015 4567 8901", role: "Member" },
]

// ── Connected phones — the numbers this WhatsApp solution runs on ─────────────
// One shared number today; each phone will carry its own groups/contacts later.

export interface WaPhone {
  id: string
  name: string
  phone: string
}

export const CONNECTED_PHONES: WaPhone[] = [
  { id: "PH-001", name: "Nawy Main", phone: "+2 010 2258 8846" },
  { id: "PH-002", name: "Nawy Launches", phone: "+2 010 1144 7733" },
]

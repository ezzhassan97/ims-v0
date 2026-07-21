"use client"

import { useState } from "react"
import { ArrowLeft, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { DevPriority, DevListingStatus, DevOrg } from "@/lib/developers-mock"

const PRIORITY_OPTS: DevPriority[] = ["Lowest", "Low", "Medium", "High", "Highest"]

/** Separate creation form for a new developer (opened from the Developers "Add developer" button). */
export function DeveloperCreatePage({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  const [logo, setLogo] = useState<string | null>(null)
  const [nameEn, setNameEn] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [officialName, setOfficialName] = useState("")
  const [priority, setPriority] = useState<DevPriority>("Medium")
  const [orgs, setOrgs] = useState<DevOrg[]>([])
  const [listing, setListing] = useState<DevListingStatus>("Hidden")
  const [nawyEligible, setNawyEligible] = useState(false)

  const canSave = !!nameEn.trim() && !!nameAr.trim() && !!officialName.trim()
  const toggleOrg = (o: DevOrg) => setOrgs((os) => (os.includes(o) ? os.filter((x) => x !== o) : [...os, o]))

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="space-y-4 p-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
        <div><h1 className="text-2xl font-bold text-foreground">Add Developer</h1><p className="text-sm text-muted-foreground">Create a new real estate developer.</p></div>

        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">Basic info</h3>

          {/* Logo upload */}
          <label className="relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border py-10 transition-colors hover:border-primary/40 hover:bg-muted/20">
            {logo ? (
              <>
                <img src={logo} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
                <button onClick={(e) => { e.preventDefault(); setLogo(null) }} className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/20"><X className="h-3.5 w-3.5" /></button>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-primary" />
                <p className="text-sm"><span className="font-medium text-primary">Browse</span> or drag and drop</p>
                <p className="text-xs text-muted-foreground">JPG or PNG (recommended size 160×160 px)</p>
              </>
            )}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo(URL.createObjectURL(f)) }} />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Developer name (EN)" required><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Type..." className="h-10" /></Field>
            <Field label="Developer name (AR)" required><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="...اكتب" className="h-10 text-right" /></Field>
          </div>

          <Field label="Developer Official name" required><Input value={officialName} onChange={(e) => setOfficialName(e.target.value)} placeholder="Type..." className="h-10" /></Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as DevPriority)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Organization">
              <div className="flex h-10 items-center gap-2">
                {(["Nawy", "Partners"] as DevOrg[]).map((o) => (
                  <button key={o} onClick={() => toggleOrg(o)} className={cn("rounded-md border px-3 py-1.5 text-sm font-medium transition-colors", orgs.includes(o) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{o}</button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Listing Status">
              <Select value={listing} onValueChange={(v) => setListing(v as DevListingStatus)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Hidden">Hidden</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Nawy eligible"><div className="flex h-10 items-center"><Switch checked={nawyEligible} onCheckedChange={setNawyEligible} /></div></Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button disabled={!canSave} onClick={onCreate}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm text-muted-foreground">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      {children}
    </div>
  )
}

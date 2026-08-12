"use client"

// Project / Developers Configurations — master lists of the metadata KEYS the
// details pages can attach values to. Classification tabs are placeholders.

import { useState } from "react"
import { Braces, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IdTag } from "@/components/table-kit"
import { MetaTypeTag } from "@/components/metadata-tab"
import { addMetaKey, removeMetaKey, updateMetaKey, useMetaKeys, META_TYPES, type MetaKind, type MetaKey, type MetaType } from "@/lib/metadata-mock"

function KeyForm({ initial, onCancel, onSave }: {
  initial?: MetaKey
  onCancel: () => void
  onSave: (k: { name: string; type: MetaType; unit?: string; options?: string[] }) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState<MetaType>(initial?.type ?? "numeric")
  const [unit, setUnit] = useState(initial?.unit ?? "")
  const [options, setOptions] = useState(initial?.options?.join(", ") ?? "")
  const canSave = name.trim() !== "" && (type !== "enum" || options.trim() !== "")
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" className="h-8 w-56 text-sm" />
      <Select value={type} onValueChange={(v) => setType(v as MetaType)}>
        <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{META_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
      </Select>
      {type === "numeric" && <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (sqm, %, …)" className="h-8 w-36 text-sm" />}
      {type === "enum" && <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Options, comma-separated" className="h-8 w-72 text-sm" />}
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-8" disabled={!canSave} onClick={() => onSave({
          name: name.trim(),
          type,
          unit: type === "numeric" && unit.trim() ? unit.trim() : undefined,
          options: type === "enum" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
        })}>{initial ? "Save" : "Add Key"}</Button>
      </div>
    </div>
  )
}

function MetaKeysManager({ kind }: { kind: MetaKind }) {
  const keys = useMetaKeys(kind)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const label = kind === "project" ? "Projects" : "Developers"

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{label} Metadata Keys</h3>
        <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{keys.length}</span>
        <span className="text-[11px] text-muted-foreground">The master list the Metadata tab picks from</span>
        <Button size="sm" className="ml-auto h-8 gap-1.5" onClick={() => { setAdding(true); setEditingId(null) }} disabled={adding}>
          <Plus className="h-3.5 w-3.5" />Add Key
        </Button>
      </div>

      {adding && (
        <KeyForm
          onCancel={() => setAdding(false)}
          onSave={(k) => { const created = addMetaKey(kind, k); setAdding(false); toast.success(`${created.name} added to the ${label.toLowerCase()} metadata keys`) }}
        />
      )}

      <div className="divide-y divide-border/60">
        {keys.map((k) => (
          editingId === k.id ? (
            <KeyForm
              key={k.id} initial={k}
              onCancel={() => setEditingId(null)}
              onSave={(patch) => { updateMetaKey(kind, k.id, patch); setEditingId(null); toast.success(`${patch.name} updated`) }}
            />
          ) : (
            <div key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{k.name}</span>
                  <MetaTypeTag type={k.type} />
                  {k.unit && <span className="text-[10px] uppercase text-muted-foreground">{k.unit}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <IdTag value={k.id} />
                  {k.options && <span className="truncate text-[11px] text-muted-foreground">{k.options.join(" · ")}</span>}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditingId(k.id); setAdding(false) }}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { removeMetaKey(kind, k.id); toast.success(`${k.name} removed`) }}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

function ConfigPage({ kind }: { kind: MetaKind }) {
  const label = kind === "project" ? "Project" : "Developers"
  const plural = kind === "project" ? "Projects" : "Developers"
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{label} Configurations</h1>
        <p className="text-sm text-muted-foreground">
          Classification and metadata settings that structure the unstructured facts arriving in fact sheets and brochures.
        </p>
      </div>
      <Tabs defaultValue="metadata" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="classification" className="gap-1.5 data-[state=active]:bg-card"><Layers className="h-3.5 w-3.5" />{plural} Classification</TabsTrigger>
          <TabsTrigger value="metadata" className="gap-1.5 data-[state=active]:bg-card"><Braces className="h-3.5 w-3.5" />{plural} Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="classification" className="mt-4">
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-sm font-semibold text-foreground">{plural} Classification</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </TabsContent>
        <TabsContent value="metadata" className="mt-4">
          <MetaKeysManager kind={kind} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ProjectConfigurationsPage() {
  return <ConfigPage kind="project" />
}

export function DevelopersConfigurationsPage() {
  return <ConfigPage kind="developer" />
}

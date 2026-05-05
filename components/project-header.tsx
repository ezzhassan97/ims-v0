import { Building2, MapPin, User, Home } from "lucide-react"
import { projectInfo } from "@/lib/mock-data"

export function ProjectHeader() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{projectInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Project Overview</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Developer</p>
              <p className="text-sm font-medium text-foreground">{projectInfo.developer}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium text-foreground">{projectInfo.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Units</p>
              <p className="text-sm font-medium text-foreground">{projectInfo.totalUnits}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

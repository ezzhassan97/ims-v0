import { Construction } from "lucide-react"

interface ComingSoonProps {
  pageName: string
}

export function ComingSoon({ pageName }: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center h-full min-h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-secondary">
            <Construction className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{pageName}</h2>
          <p className="text-muted-foreground">This page is under development</p>
        </div>
        <div className="text-sm text-muted-foreground/60">Coming Soon</div>
      </div>
    </div>
  )
}

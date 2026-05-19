import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function PerfilSistemaBadge({ sistema }: { sistema: boolean }) {
  if (!sistema) return null
  return (
    <Badge
      variant="secondary"
      className="border-0 bg-indigo-100 text-indigo-800 hover:bg-indigo-100"
    >
      Sistema
    </Badge>
  )
}

export function PerfilAtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0",
        ativo
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
          : "bg-muted text-muted-foreground hover:bg-muted",
      )}
    >
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  )
}

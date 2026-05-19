import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function PerfilSistemaBadge({ sistema }: { sistema: boolean }) {
  if (!sistema) return null
  return (
    <Badge
      variant="outline"
      className="border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/15"
    >
      Sistema
    </Badge>
  )
}

export function PerfilAtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        ativo
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"
          : "border-white/10 bg-white/[0.06] text-white/45 hover:bg-white/[0.06]",
      )}
    >
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  )
}

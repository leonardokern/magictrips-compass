import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  STATUS_CLIENTE_LABEL,
  TIPO_CLIENTE_LABEL,
  type StatusCliente,
  type TipoCliente,
} from "@/lib/schemas/cliente"

const STATUS_STYLES: Record<StatusCliente, string> = {
  lead: "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/15",
  ativo:
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15",
  inativo: "bg-white/[0.06] text-white/45 border-white/10 hover:bg-white/[0.06]",
}

const TIPO_STYLES: Record<TipoCliente, string> = {
  regular: "bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/15",
  faturado:
    "bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/15",
}

export function StatusClienteBadge({ status }: { status: StatusCliente }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {STATUS_CLIENTE_LABEL[status]}
    </Badge>
  )
}

export function TipoClienteBadge({ tipo }: { tipo: TipoCliente }) {
  return (
    <Badge variant="outline" className={cn(TIPO_STYLES[tipo])}>
      {TIPO_CLIENTE_LABEL[tipo]}
    </Badge>
  )
}

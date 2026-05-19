import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  STATUS_CLIENTE_LABEL,
  TIPO_CLIENTE_LABEL,
  type StatusCliente,
  type TipoCliente,
} from "@/lib/schemas/cliente"

const STATUS_STYLES: Record<StatusCliente, string> = {
  lead: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  ativo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  inativo: "bg-muted text-muted-foreground hover:bg-muted",
}

const TIPO_STYLES: Record<TipoCliente, string> = {
  regular: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  faturado: "bg-violet-100 text-violet-800 hover:bg-violet-100",
}

export function StatusClienteBadge({ status }: { status: StatusCliente }) {
  return (
    <Badge variant="secondary" className={cn("border-0", STATUS_STYLES[status])}>
      {STATUS_CLIENTE_LABEL[status]}
    </Badge>
  )
}

export function TipoClienteBadge({ tipo }: { tipo: TipoCliente }) {
  return (
    <Badge variant="secondary" className={cn("border-0", TIPO_STYLES[tipo])}>
      {TIPO_CLIENTE_LABEL[tipo]}
    </Badge>
  )
}

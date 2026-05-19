import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TIPO_FORNECEDOR_LABEL, type TipoFornecedor } from "@/lib/schemas/fornecedor"

const TIPO_STYLES: Record<TipoFornecedor, string> = {
  consolidador: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  cia_aerea: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  hotel: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  operadora: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  outros: "border-white/15 bg-white/[0.06] text-white/70",
}

export function TipoFornecedorBadge({ tipo }: { tipo: TipoFornecedor | null }) {
  if (!tipo) {
    return (
      <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/45">
        —
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn(TIPO_STYLES[tipo])}>
      {TIPO_FORNECEDOR_LABEL[tipo]}
    </Badge>
  )
}

export function FornecedorAtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        ativo
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
          : "border-white/10 bg-white/[0.06] text-white/45",
      )}
    >
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  )
}

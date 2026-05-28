/**
 * Labels e classes de cor dos status de venda.
 *
 * O status `em_revisao` tem rótulo diferente conforme quem está olhando:
 * - **Agente (sem permissão de aprovar):** "Necessita Revisão" — é uma
 *   chamada para ação dele.
 * - **Gerente/Admin (com permissão de aprovar):** "Em Revisão" — é o
 *   estado atual da venda (que ele já mandou devolver).
 */

export type VendaStatus =
  | "rascunho"
  | "em_revisao"
  | "pendente_validacao"
  | "aprovado"
  | "cancelado"

const STATUS_LABEL_BASE: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em Revisão",
  pendente_validacao: "Aguardando aprovação",
  aprovado: "Aprovada",
  cancelado: "Cancelada",
}

export const STATUS_CHIP: Record<string, string> = {
  rascunho: "border-white/15 bg-white/[0.04] text-white/55",
  em_revisao: "border-orange-400/40 bg-orange-400/10 text-orange-300",
  pendente_validacao: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  aprovado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  cancelado: "border-rose-500/30 bg-rose-500/10 text-rose-300",
}

/** Retorna o rótulo do status de venda contextualizado por perfil. */
export function getStatusLabel(
  status: string,
  ctx?: { podeAprovar?: boolean },
): string {
  if (status === "em_revisao" && !ctx?.podeAprovar) {
    return "Necessita Revisão"
  }
  return STATUS_LABEL_BASE[status] ?? status
}

/** Retorna a classe de chip para o status. */
export function getStatusChip(status: string): string {
  return STATUS_CHIP[status] ?? STATUS_CHIP.rascunho!
}

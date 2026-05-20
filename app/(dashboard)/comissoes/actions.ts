"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { comissaoUpdateSchema } from "@/lib/schemas/comissao"
import type { ActionResult } from "@/app/(dashboard)/clientes/actions"

/**
 * Atualiza o percentual de uma regra de comissão.
 * Apenas o percentual (e opcionalmente a observação) — empresa+origem são fixas.
 */
export async function updateComissaoRegra(
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "comissoes", "editar")) {
    return { ok: false, error: "Sem permissão para editar comissões." }
  }

  const parsed = comissaoUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const { id, percentual, observacao } = parsed.data
  const supabase = await createClient()

  // Snapshot antes pra audit_logs
  const { data: antes } = await supabase
    .from("comissoes_regras")
    .select("id, empresa_id, origem_id, percentual, observacao")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Regra não encontrada." }

  const { error } = await supabase
    .from("comissoes_regras")
    .update({ percentual, observacao: observacao ?? null })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await supabase.from("audit_logs").insert({
    usuario_id: user.id,
    empresa_id: antes.empresa_id,
    acao: "editar",
    entidade: "comissao_regra",
    entidade_id: id,
    dados_antes: { percentual: antes.percentual, observacao: antes.observacao },
    dados_depois: { percentual, observacao: observacao ?? null },
  })

  revalidatePath("/comissoes")
  return { ok: true }
}

function flattenFieldErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, msgs] of Object.entries(errors)) {
    if (msgs && msgs.length > 0 && msgs[0]) out[k] = msgs[0]
  }
  return out
}

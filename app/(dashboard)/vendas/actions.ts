"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { vendaCreateSchema } from "@/lib/schemas/venda"
import type { ActionResult } from "@/app/(dashboard)/clientes/actions"

function flatten(errors: Record<string, string[] | undefined>) {
  const out: Record<string, string> = {}
  for (const [k, msgs] of Object.entries(errors)) {
    if (msgs && msgs.length > 0 && msgs[0]) out[k] = msgs[0]
  }
  return out
}

/**
 * Cria uma venda completa (status `pendente_validacao`) via RPC transacional.
 * A RPC `criar_venda_completa` no banco insere cliente novo (se necessário),
 * venda, produtos, passageiros, cobrança e os lembretes pros aprovadores.
 */
export async function criarVenda(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireCurrentUser()
  if (!can(user, "vendas", "criar")) {
    return { ok: false, error: "Sem permissão para criar vendas." }
  }

  const parsed = vendaCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    }
  }

  const supabase = await createClient()
  const { data: vendaId, error } = await supabase.rpc(
    "criar_venda_completa",
    {
      // Cast pra Json — Supabase aceita objects/arrays serializáveis
      p_payload: JSON.parse(JSON.stringify(parsed.data)),
    },
  )

  if (error) {
    return {
      ok: false,
      error: error.message,
    }
  }

  revalidatePath("/vendas")
  revalidatePath("/dashboard")
  return { ok: true, data: { id: vendaId as unknown as string } }
}

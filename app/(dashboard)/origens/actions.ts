"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import {
  origemCreateSchema,
  origemUpdateSchema,
} from "@/lib/schemas/origem-venda"
import type { ActionResult } from "@/app/(dashboard)/clientes/actions"

function flatten(errors: Record<string, string[] | undefined>) {
  const out: Record<string, string> = {}
  for (const [k, msgs] of Object.entries(errors)) {
    if (msgs && msgs.length > 0 && msgs[0]) out[k] = msgs[0]
  }
  return out
}

/**
 * Cria uma origem nova e já seeda as regras de comissão por empresa.
 * Recebe um array de { empresa_id, percentual } com 1 entry por empresa ativa.
 */
export async function createOrigem(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireCurrentUser()
  if (!can(user, "comissoes", "editar")) {
    return { ok: false, error: "Sem permissão para criar origens." }
  }

  const parsed = origemCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    }
  }

  const { nome, comissoes } = parsed.data
  const supabase = await createClient()

  // Próximo `ordem` é (max + 1) — pra a nova origem aparecer no fim
  const { data: maxRow } = await supabase
    .from("origens_venda")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle()
  const proximaOrdem = (maxRow?.ordem ?? -1) + 1

  const { data: nova, error } = await supabase
    .from("origens_venda")
    .insert({ nome, ordem: proximaOrdem, ativo: true })
    .select("id")
    .single()

  if (error || !nova) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Já existe uma origem com esse nome.",
        fieldErrors: { nome: "Nome já em uso." },
      }
    }
    return { ok: false, error: error?.message ?? "Falha ao criar origem." }
  }

  // Seed comissões por empresa
  const rows = comissoes.map((c) => ({
    empresa_id: c.empresa_id,
    origem_id: nova.id,
    percentual: c.percentual,
  }))
  if (rows.length > 0) {
    await supabase.from("comissoes_regras").insert(rows)
  }

  await supabase.from("audit_logs").insert({
    usuario_id: user.id,
    empresa_id: null,
    acao: "criar",
    entidade: "origem_venda",
    entidade_id: nova.id,
    dados_depois: { nome, comissoes },
  })

  revalidatePath("/origens")
  revalidatePath("/comissoes")
  return { ok: true, data: { id: nova.id } }
}

export async function updateOrigem(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "comissoes", "editar")) {
    return { ok: false, error: "Sem permissão." }
  }

  const parsed = origemUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    }
  }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from("origens_venda")
    .select("id, nome, ativo, ordem")
    .eq("id", id)
    .single()
  if (!antes) return { ok: false, error: "Origem não encontrada." }

  // 1. Atualiza nome / ativo
  const updates: { nome?: string; ativo?: boolean } = {}
  if (parsed.data.nome !== undefined) updates.nome = parsed.data.nome
  if (parsed.data.ativo !== undefined) updates.ativo = parsed.data.ativo
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("origens_venda")
      .update(updates)
      .eq("id", id)
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "Já existe uma origem com esse nome.",
          fieldErrors: { nome: "Nome já em uso." },
        }
      }
      return { ok: false, error: error.message }
    }
  }

  // 2. Comissões por empresa (UPSERT por par empresa+origem)
  if (parsed.data.comissoes && parsed.data.comissoes.length > 0) {
    const rows = parsed.data.comissoes.map((c) => ({
      empresa_id: c.empresa_id,
      origem_id: id,
      percentual: c.percentual,
    }))
    const { error: upsertErr } = await supabase
      .from("comissoes_regras")
      .upsert(rows, { onConflict: "empresa_id,origem_id" })
    if (upsertErr) return { ok: false, error: upsertErr.message }
  }

  await supabase.from("audit_logs").insert({
    usuario_id: user.id,
    empresa_id: null,
    acao: "editar",
    entidade: "origem_venda",
    entidade_id: id,
    dados_antes: antes,
    dados_depois: { ...antes, ...updates, comissoes: parsed.data.comissoes },
  })

  revalidatePath("/origens")
  revalidatePath("/comissoes")
  return { ok: true }
}

export async function deleteOrigem(id: string): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "comissoes", "editar")) {
    return { ok: false, error: "Sem permissão para excluir." }
  }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from("origens_venda")
    .select("id, nome")
    .eq("id", id)
    .single()
  if (!antes) return { ok: false, error: "Origem não encontrada." }

  // CASCADE cuida das comissoes_regras + perfis_comissoes ligadas
  const { error } = await supabase
    .from("origens_venda")
    .delete()
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await supabase.from("audit_logs").insert({
    usuario_id: user.id,
    empresa_id: null,
    acao: "excluir",
    entidade: "origem_venda",
    entidade_id: id,
    dados_antes: antes,
  })

  revalidatePath("/origens")
  revalidatePath("/comissoes")
  return { ok: true }
}

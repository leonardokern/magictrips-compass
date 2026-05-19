"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import {
  perfilCreateSchema,
  perfilUpdateSchema,
  sanitizarPermissoes,
} from "@/lib/schemas/perfil"
import { permissoesTodas } from "@/lib/constants/permissoes"
import type { ActionResult } from "@/app/(dashboard)/clientes/actions"

const PERFIL_ADMIN = "Administrador"

/**
 * Cria um novo perfil customizado (sistema=false).
 * Apenas Administrador.
 */
export async function createPerfil(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "criar")) {
    return { ok: false, error: "Sem permissão para criar perfis." }
  }

  const parsed = perfilCreateSchema.safeParse(raw)
  if (!parsed.success) {
    const err = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flattenFieldErrors(err),
    }
  }

  const { nome, permissoes } = parsed.data
  const supabase = await createClient()

  // Bloqueia colisão com nomes de perfis fixos
  if (
    ["Administrador", "Gerente", "Agente"]
      .map((n) => n.toLowerCase())
      .includes(nome.toLowerCase())
  ) {
    return {
      ok: false,
      error: "Este nome é reservado para um perfil do sistema.",
      fieldErrors: { nome: "Nome reservado." },
    }
  }

  const { data: novo, error } = await supabase
    .from("perfis_acesso")
    .insert({
      nome,
      sistema: false,
      ativo: true,
      permissoes: sanitizarPermissoes(permissoes),
    })
    .select("id")
    .single()

  if (error || !novo) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Já existe um perfil com esse nome.",
        fieldErrors: { nome: "Nome já em uso." },
      }
    }
    return { ok: false, error: error?.message ?? "Falha ao criar perfil." }
  }

  await logAudit(user.id, "criar", novo.id, null, {
    nome,
    permissoes,
    sistema: false,
  })

  revalidatePath("/perfis")
  return { ok: true, data: { id: novo.id } }
}

/**
 * Atualiza um perfil existente.
 *  - Administrador: read-only (não permite update)
 *  - Perfis sistema=true: nome bloqueado (mantém o original), permissões editáveis
 *  - Perfis sistema=false: tudo editável
 */
export async function updatePerfil(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "editar")) {
    return { ok: false, error: "Sem permissão para editar perfis." }
  }

  const parsed = perfilUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from("perfis_acesso")
    .select("id, nome, sistema, permissoes, ativo")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Perfil não encontrado." }

  if (antes.nome === PERFIL_ADMIN) {
    return {
      ok: false,
      error:
        "O perfil Administrador tem acesso total automático e não é editável.",
    }
  }

  const updates: { nome?: string; permissoes?: Record<string, Record<string, boolean>> } = {}
  if (parsed.data.permissoes !== undefined) {
    updates.permissoes = sanitizarPermissoes(parsed.data.permissoes)
  }
  // Nome só pode mudar em perfis NÃO-sistema. Trigger no banco também protege.
  if (parsed.data.nome !== undefined && !antes.sistema) {
    updates.nome = parsed.data.nome
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Nada a atualizar." }
  }

  const { error } = await supabase
    .from("perfis_acesso")
    .update(updates)
    .eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Já existe um perfil com esse nome.",
        fieldErrors: { nome: "Nome já em uso." },
      }
    }
    return { ok: false, error: error.message }
  }

  await logAudit(user.id, "editar", id, antes, { ...antes, ...updates })

  revalidatePath("/perfis")
  revalidatePath(`/perfis/${id}`)
  return { ok: true }
}

/**
 * Ativa/desativa um perfil. Apenas perfis sistema=false.
 */
export async function togglePerfilAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "editar")) {
    return { ok: false, error: "Sem permissão." }
  }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from("perfis_acesso")
    .select("id, nome, sistema, ativo")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Perfil não encontrado." }
  if (antes.sistema) {
    return { ok: false, error: "Perfis do sistema não podem ser desativados." }
  }

  const { error } = await supabase
    .from("perfis_acesso")
    .update({ ativo })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logAudit(user.id, "editar", id, antes, { ...antes, ativo })

  revalidatePath("/perfis")
  revalidatePath(`/perfis/${id}`)
  return { ok: true }
}

/**
 * Exclui um perfil customizado (sistema=false).
 * Bloqueia se houver usuários atrelados.
 */
export async function deletePerfil(id: string): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "excluir")) {
    return { ok: false, error: "Sem permissão para excluir perfis." }
  }

  const supabase = await createClient()
  const { data: antes } = await supabase
    .from("perfis_acesso")
    .select("id, nome, sistema, permissoes")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Perfil não encontrado." }
  if (antes.sistema) {
    return { ok: false, error: "Perfis do sistema não podem ser excluídos." }
  }

  const { count } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("perfil_id", id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Existem ${count} usuários neste perfil. Mude-os de perfil antes de excluir.`,
    }
  }

  const { error } = await supabase.from("perfis_acesso").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit(user.id, "excluir", id, antes, null)

  revalidatePath("/perfis")
  redirect("/perfis")
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locais (exportação a partir do módulo de clientes seria override)
// ─────────────────────────────────────────────────────────────────────────────

export async function resetPermissoesAdmin() {
  // Helper raramente usado — garante que o perfil Administrador tem TODAS as
  // permissões marcadas (sincroniza com o catálogo). Pode ser chamado após
  // adicionar um módulo novo.
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "editar")) {
    return { ok: false as const, error: "Sem permissão." }
  }
  const supabase = await createClient()
  await supabase
    .from("perfis_acesso")
    .update({ permissoes: permissoesTodas(true) })
    .eq("nome", PERFIL_ADMIN)
  revalidatePath("/perfis")
  return { ok: true as const }
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

async function logAudit(
  usuarioId: string,
  acao: "criar" | "editar" | "excluir",
  entidadeId: string,
  antes: unknown,
  depois: unknown,
) {
  const supabase = await createClient()
  await supabase.from("audit_logs").insert({
    usuario_id: usuarioId,
    empresa_id: null, // perfis são globais (não pertencem a empresa)
    acao,
    entidade: "perfil_acesso",
    entidade_id: entidadeId,
    dados_antes: antes as never,
    dados_depois: depois as never,
  })
}

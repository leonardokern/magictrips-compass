"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { clienteBaseSchema, type ClienteFormValues } from "@/lib/schemas/cliente"
import { onlyDigits } from "@/lib/utils/formatters"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/**
 * Cria um novo cliente.
 * Valida zod + checa duplicidade de CPF/email por empresa + audit log.
 */
export async function createCliente(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "criar")) {
    return { ok: false, error: "Você não tem permissão para criar clientes." }
  }

  const parsed = clienteBaseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const values = parsed.data
  const supabase = await createClient()

  // Dedup explícito (além do UNIQUE constraint) — pra UX melhor que erro 23505
  const dup = await checkDuplicateCpfOrEmail(values.empresa_id, values.cpf, values.email)
  if (dup) {
    return { ok: false, error: dup.message, fieldErrors: dup.fieldErrors }
  }

  const { data: novo, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: values.empresa_id,
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      cpf: values.cpf,
      data_nascimento: values.data_nascimento || null,
      endereco: sanitizeEndereco(values.endereco),
      origem: values.origem || null,
      tipo: values.tipo,
      dia_faturamento:
        values.tipo === "faturado" ? (values.dia_faturamento as number) : null,
      status: values.status,
      observacoes: values.observacoes || null,
    })
    .select("id")
    .single()

  if (error || !novo) {
    return { ok: false, error: error?.message ?? "Falha ao salvar cliente." }
  }

  await logAudit(user.id, values.empresa_id, "criar", novo.id, null, values)

  revalidatePath("/clientes")
  return { ok: true, data: { id: novo.id } }
}

/**
 * Atualiza um cliente existente.
 */
export async function updateCliente(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "editar")) {
    return { ok: false, error: "Você não tem permissão para editar clientes." }
  }

  const parsed = clienteBaseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const values = parsed.data
  const supabase = await createClient()

  // Snapshot antes pra audit_logs
  const { data: antes } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Cliente não encontrado." }

  // Dedup ignorando o próprio id
  const dup = await checkDuplicateCpfOrEmail(values.empresa_id, values.cpf, values.email, id)
  if (dup) {
    return { ok: false, error: dup.message, fieldErrors: dup.fieldErrors }
  }

  const { error } = await supabase
    .from("clientes")
    .update({
      nome: values.nome,
      email: values.email,
      telefone: values.telefone,
      cpf: values.cpf,
      data_nascimento: values.data_nascimento || null,
      endereco: sanitizeEndereco(values.endereco),
      origem: values.origem || null,
      tipo: values.tipo,
      dia_faturamento:
        values.tipo === "faturado" ? (values.dia_faturamento as number) : null,
      status: values.status,
      observacoes: values.observacoes || null,
    })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logAudit(user.id, antes.empresa_id, "editar", id, antes, values)

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

/**
 * Exclui um cliente (apenas Administrador).
 * Só permite se o cliente não tem vendas vinculadas.
 */
export async function deleteCliente(id: string): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "excluir")) {
    return { ok: false, error: "Apenas o Administrador pode excluir clientes." }
  }

  const supabase = await createClient()

  // Bloqueia se tem vendas (mesmo canceladas — preserva integridade histórica)
  const { count } = await supabase
    .from("vendas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este cliente possui vendas registradas e não pode ser excluído. Inative-o em vez disso.",
    }
  }

  const { data: antes } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single()

  if (!antes) return { ok: false, error: "Cliente não encontrado." }

  const { error } = await supabase.from("clientes").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit(user.id, antes.empresa_id, "excluir", id, antes, null)

  revalidatePath("/clientes")
  redirect("/clientes")
}

/**
 * Procura cliente por CPF dentro de uma empresa.
 * Usado pelo formulário para alertar duplicidade on-blur.
 */
export async function lookupClientePorCpf(
  empresaId: string,
  cpf: string,
): Promise<{ id: string; nome: string } | null> {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "ler")) return null

  const cpfLimpo = onlyDigits(cpf)
  if (cpfLimpo.length !== 11) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("empresa_id", empresaId)
    .eq("cpf", cpfLimpo)
    .maybeSingle()

  return data ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────────────────────────────────────

async function checkDuplicateCpfOrEmail(
  empresaId: string,
  cpf: string,
  email: string,
  exceptId?: string,
): Promise<{ message: string; fieldErrors: Record<string, string> } | null> {
  const supabase = await createClient()

  const buildQuery = (col: "cpf" | "email", value: string) => {
    let q = supabase
      .from("clientes")
      .select("id", { head: true, count: "exact" })
      .eq("empresa_id", empresaId)
      .eq(col, value)
    if (exceptId) q = q.neq("id", exceptId)
    return q
  }

  const [cpfQ, emailQ] = await Promise.all([
    buildQuery("cpf", cpf),
    buildQuery("email", email),
  ])

  if ((cpfQ.count ?? 0) > 0) {
    return {
      message: "Já existe um cliente com este CPF nesta empresa.",
      fieldErrors: { cpf: "CPF já cadastrado nesta empresa." },
    }
  }
  if ((emailQ.count ?? 0) > 0) {
    return {
      message: "Já existe um cliente com este e-mail nesta empresa.",
      fieldErrors: { email: "E-mail já cadastrado nesta empresa." },
    }
  }
  return null
}

function sanitizeEndereco(endereco: ClienteFormValues["endereco"]) {
  if (!endereco) return null
  const entries = Object.entries(endereco).filter(([, v]) => v != null && v !== "")
  if (entries.length === 0) return null
  return Object.fromEntries(entries)
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
  empresaId: string | null,
  acao: "criar" | "editar" | "excluir",
  entidadeId: string,
  antes: unknown,
  depois: unknown,
) {
  const supabase = await createClient()
  await supabase.from("audit_logs").insert({
    usuario_id: usuarioId,
    empresa_id: empresaId,
    acao,
    entidade: "cliente",
    entidade_id: entidadeId,
    dados_antes: antes as never,
    dados_depois: depois as never,
  })
}

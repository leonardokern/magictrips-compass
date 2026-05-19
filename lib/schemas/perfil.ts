import { z } from "zod"
import { todasPermissoesValidas } from "@/lib/constants/permissoes"

const PERMS_VALIDAS = todasPermissoesValidas()

/**
 * Schema do JSONB de permissões. Aceita qualquer estrutura {modulo: {acao: bool}}
 * mas o Server Action descarta pares inválidos antes de persistir.
 */
export const permissoesSchema = z.record(
  z.string(),
  z.record(z.string(), z.boolean()),
)

export type PermissoesValue = z.infer<typeof permissoesSchema>

export const perfilCreateSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(60, "Nome muito longo"),
  permissoes: permissoesSchema,
})

export const perfilUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(60).optional(),
  permissoes: permissoesSchema.optional(),
})

/**
 * Normaliza um JSONB de permissões removendo pares (modulo, acao) que não
 * existem no catálogo atual. Garante que dados antigos não vazem.
 */
export function sanitizarPermissoes(input: PermissoesValue): PermissoesValue {
  const out: PermissoesValue = {}
  for (const [modulo, acoes] of Object.entries(input ?? {})) {
    if (!acoes || typeof acoes !== "object") continue
    const moduloLimpo: Record<string, boolean> = {}
    for (const [acao, val] of Object.entries(acoes)) {
      if (PERMS_VALIDAS.has(`${modulo}.${acao}`)) {
        moduloLimpo[acao] = Boolean(val)
      }
    }
    if (Object.keys(moduloLimpo).length > 0) {
      out[modulo] = moduloLimpo
    }
  }
  return out
}

export type PerfilCreateInput = z.infer<typeof perfilCreateSchema>
export type PerfilUpdateInput = z.infer<typeof perfilUpdateSchema>

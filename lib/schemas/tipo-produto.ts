import { z } from "zod"

/** Tipos de campo aceitos no catálogo. */
export const TIPOS_CAMPO = [
  "texto",
  "numero",
  "data",
  "dropdown",
  "sim_nao",
] as const
export type TipoCampo = (typeof TIPOS_CAMPO)[number]

export const TIPO_CAMPO_LABEL: Record<TipoCampo, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  dropdown: "Lista (dropdown)",
  sim_nao: "Sim/Não",
}

// ── Tipo de Produto ──────────────────────────────────────────────────────────

export const tipoProdutoVinculoCampoSchema = z.object({
  campo_id: z.string().uuid(),
  obrigatorio: z.boolean(),
  ordem: z.number().int().min(0),
})

export const tipoProdutoCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(60, "Nome muito longo"),
  campos: z.array(tipoProdutoVinculoCampoSchema),
})

export const tipoProdutoUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(60).optional(),
  ativo: z.boolean().optional(),
  campos: z.array(tipoProdutoVinculoCampoSchema).optional(),
})

export type TipoProdutoVinculoCampo = z.infer<typeof tipoProdutoVinculoCampoSchema>
export type TipoProdutoCreateInput = z.infer<typeof tipoProdutoCreateSchema>
export type TipoProdutoUpdateInput = z.infer<typeof tipoProdutoUpdateSchema>

// ── Campo Extra ──────────────────────────────────────────────────────────────

export const campoOpcaoSchema = z.object({
  /** Pode vir sem id quando é uma opção nova ainda não persistida. */
  id: z.string().uuid().optional(),
  valor: z.string().trim().min(1, "Valor obrigatório").max(80),
  ordem: z.number().int().min(0).default(0),
})

export const campoExtraCreateSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome muito curto").max(60),
    tipo_campo: z.enum(TIPOS_CAMPO),
    placeholder: z.string().trim().max(120).optional().nullable(),
    opcoes: z.array(campoOpcaoSchema).optional(),
  })
  .refine(
    (v) =>
      v.tipo_campo !== "dropdown" || (v.opcoes && v.opcoes.length >= 1),
    {
      message: "Dropdown precisa de ao menos uma opção.",
      path: ["opcoes"],
    },
  )

export const campoExtraUpdateSchema = z
  .object({
    nome: z.string().trim().min(2).max(60).optional(),
    tipo_campo: z.enum(TIPOS_CAMPO).optional(),
    placeholder: z.string().trim().max(120).optional().nullable(),
    ativo: z.boolean().optional(),
    opcoes: z.array(campoOpcaoSchema).optional(),
  })
  .refine(
    (v) =>
      v.tipo_campo === undefined ||
      v.tipo_campo !== "dropdown" ||
      (v.opcoes && v.opcoes.length >= 1),
    {
      message: "Dropdown precisa de ao menos uma opção.",
      path: ["opcoes"],
    },
  )

export type CampoOpcao = z.infer<typeof campoOpcaoSchema>
export type CampoExtraCreateInput = z.infer<typeof campoExtraCreateSchema>
export type CampoExtraUpdateInput = z.infer<typeof campoExtraUpdateSchema>

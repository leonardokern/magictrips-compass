import { z } from "zod"

/** Percentual de comissão por empresa pra uma origem específica. */
export const comissaoEmpresaSchema = z.object({
  empresa_id: z.string().uuid(),
  percentual: z
    .number({ invalid_type_error: "Use apenas números" })
    .min(0, "Mínimo 0")
    .max(100, "Máximo 100"),
})

export const origemCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  comissoes: z
    .array(comissaoEmpresaSchema)
    .min(1, "Informe a comissão para ao menos uma empresa"),
})

export const origemUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(80).optional(),
  ativo: z.boolean().optional(),
  comissoes: z.array(comissaoEmpresaSchema).optional(),
})

export type OrigemCreateInput = z.infer<typeof origemCreateSchema>
export type OrigemUpdateInput = z.infer<typeof origemUpdateSchema>

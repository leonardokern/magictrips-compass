import { z } from "zod"

export const cartaoCreateSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(60, "Nome muito longo"),
  banco: z.string().trim().max(60).optional().nullable(),
  empresa_id: z.string().uuid("Empresa inválida"),
  usuario_id: z.string().uuid("Responsável inválido"),
  dia_vencimento: z
    .number({ invalid_type_error: "Informe um dia" })
    .int()
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  dia_fechamento: z
    .number({ invalid_type_error: "Informe um dia" })
    .int()
    .min(1)
    .max(31)
    .optional()
    .nullable(),
})

export const cartaoUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(60).optional(),
  banco: z.string().trim().max(60).optional().nullable(),
  empresa_id: z.string().uuid().optional(),
  usuario_id: z.string().uuid().optional(),
  dia_vencimento: z.number().int().min(1).max(31).optional(),
  dia_fechamento: z.number().int().min(1).max(31).optional().nullable(),
  ativo: z.boolean().optional(),
})

export type CartaoCreateInput = z.infer<typeof cartaoCreateSchema>
export type CartaoUpdateInput = z.infer<typeof cartaoUpdateSchema>

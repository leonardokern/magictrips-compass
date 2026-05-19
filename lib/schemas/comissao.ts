import { z } from "zod"

export const ORIGENS_COMISSAO = [
  "Cliente Antigo",
  "Tráfego Pago",
  "Remarketing",
  "Landing Page",
  "Chat Online",
  "Redes Sociais",
  "Indicação de Cliente",
  "Indicação dos Sócios",
  "Lead Próprio do Agente",
  "Parceiros",
  "Outros",
] as const

export type OrigemComissao = (typeof ORIGENS_COMISSAO)[number]

/** Origens classificadas como marketing online (flag_marketing=true). */
export const ORIGENS_MARKETING_ONLINE: OrigemComissao[] = [
  "Tráfego Pago",
  "Remarketing",
  "Landing Page",
  "Chat Online",
  "Redes Sociais",
]

export const comissaoUpdateSchema = z.object({
  id: z.string().uuid(),
  percentual: z
    .number({ invalid_type_error: "Use apenas números" })
    .min(0, "Mínimo 0")
    .max(100, "Máximo 100"),
  observacao: z.string().trim().max(200).optional().nullable(),
})

export type ComissaoUpdateInput = z.infer<typeof comissaoUpdateSchema>

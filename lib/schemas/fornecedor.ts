import { z } from "zod"
import { cnpjValido } from "@/lib/utils/validators"
import { onlyDigits } from "@/lib/utils/formatters"

export const tipoFornecedorSchema = z.enum([
  "consolidador",
  "cia_aerea",
  "hotel",
  "operadora",
  "outros",
])

export type TipoFornecedor = z.infer<typeof tipoFornecedorSchema>

export const fornecedorSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(150, "Nome muito longo"),
  cnpj: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine(cnpjValido, "CNPJ inválido"),
  tipo: tipoFornecedorSchema.optional().or(z.literal("")),
})

export type FornecedorFormValues = z.infer<typeof fornecedorSchema>

export const TIPO_FORNECEDOR_LABEL: Record<TipoFornecedor, string> = {
  consolidador: "Consolidador",
  cia_aerea: "Cia. Aérea",
  hotel: "Hotel",
  operadora: "Operadora",
  outros: "Outros",
}

export const TIPOS_FORNECEDOR_OPCOES: { value: TipoFornecedor; label: string }[] = [
  { value: "consolidador", label: "Consolidador" },
  { value: "cia_aerea", label: "Cia. Aérea" },
  { value: "hotel", label: "Hotel" },
  { value: "operadora", label: "Operadora" },
  { value: "outros", label: "Outros" },
]

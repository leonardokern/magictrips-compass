import { z } from "zod"
import { cpfValido, emailValido, telefoneValido } from "@/lib/utils/validators"
import { onlyDigits } from "@/lib/utils/formatters"

/**
 * Schema canônico de cliente — usado em criar/editar (Server Action + Form).
 *
 * Convenções:
 *  - CPF e telefone são SALVOS sem máscara (apenas dígitos)
 *  - dia_faturamento só é exigido se tipo='faturado'
 *  - endereço é jsonb opcional com sub-campos opcionais
 */

const enderecoSchema = z
  .object({
    rua: z.string().trim().max(200).optional(),
    numero: z.string().trim().max(20).optional(),
    complemento: z.string().trim().max(100).optional(),
    bairro: z.string().trim().max(100).optional(),
    cidade: z.string().trim().max(100).optional(),
    estado: z
      .string()
      .trim()
      .length(2, "UF deve ter 2 letras")
      .optional()
      .or(z.literal("")),
    cep: z
      .string()
      .transform((v) => onlyDigits(v))
      .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos")
      .optional(),
  })
  .partial()

export const tipoClienteSchema = z.enum(["regular", "faturado"])
export const statusClienteSchema = z.enum(["lead", "ativo", "inativo"])

export const clienteBaseSchema = z
  .object({
    empresa_id: z.string().uuid("Empresa inválida"),
    nome: z
      .string()
      .trim()
      .min(2, "Nome muito curto")
      .max(200, "Nome muito longo"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine(emailValido, "E-mail inválido"),
    telefone: z
      .string()
      .transform((v) => onlyDigits(v))
      .refine(telefoneValido, "Telefone deve ter 10 ou 11 dígitos"),
    cpf: z
      .string()
      .transform((v) => onlyDigits(v))
      .refine(cpfValido, "CPF inválido"),
    data_nascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .optional()
      .or(z.literal("")),
    endereco: enderecoSchema.optional(),
    origem: z.string().trim().max(100).optional().or(z.literal("")),
    tipo: tipoClienteSchema.default("regular"),
    dia_faturamento: z
      .number()
      .int()
      .min(1, "Mínimo 1")
      .max(31, "Máximo 31")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: statusClienteSchema.default("lead"),
    observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (v) => v.tipo === "regular" || (v.dia_faturamento && v.dia_faturamento >= 1),
    {
      message: "Cliente faturado exige dia de faturamento",
      path: ["dia_faturamento"],
    },
  )

export type ClienteFormValues = z.infer<typeof clienteBaseSchema>
export type TipoCliente = z.infer<typeof tipoClienteSchema>
export type StatusCliente = z.infer<typeof statusClienteSchema>

/**
 * Labels PT-BR pra exibir nas UIs.
 */
export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  regular: "Regular",
  faturado: "Faturado",
}

export const STATUS_CLIENTE_LABEL: Record<StatusCliente, string> = {
  lead: "Lead",
  ativo: "Ativo",
  inativo: "Inativo",
}

export const ORIGENS_CLIENTE = [
  "Instagram",
  "Site",
  "Indicação",
  "Manual",
  "Tráfego Pago",
  "Outro",
] as const

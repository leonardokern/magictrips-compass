import { onlyDigits } from "./formatters"

/**
 * Valida CPF brasileiro pelos dígitos verificadores.
 * Aceita com ou sem máscara.
 */
export function cpfValido(cpf: string | null | undefined): boolean {
  const d = onlyDigits(cpf)
  if (d.length !== 11) return false

  // Rejeita sequências repetidas (000…000, 111…111, etc) — comuns em fake CPFs
  if (/^(\d)\1{10}$/.test(d)) return false

  // 1º dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(d[9])) return false

  // 2º dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === Number(d[10])
}

/**
 * Email simples — boundary checks (RFC completo seria pesado demais).
 * Exige domínio com pelo menos um ponto (TLD).
 */
export function emailValido(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Telefone brasileiro: 10 (fixo) ou 11 (celular) dígitos.
 */
export function telefoneValido(tel: string | null | undefined): boolean {
  const d = onlyDigits(tel)
  return d.length === 10 || d.length === 11
}

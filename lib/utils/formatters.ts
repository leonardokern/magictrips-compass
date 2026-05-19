/**
 * Formatadores de dados (somente leitura).
 * Toda entrada de dados validados deve guardar a versão "limpa" no banco.
 */

/**
 * Apenas dígitos. "123.456.789-00" → "12345678900"
 */
export function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "")
}

/**
 * Formata CPF: "12345678900" → "123.456.789-00"
 * Aceita string com ou sem máscara.
 */
export function formatCpf(cpf: string | null | undefined): string {
  const d = onlyDigits(cpf)
  if (d.length !== 11) return cpf ?? ""
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/**
 * Formata telefone brasileiro:
 *  - 11 dígitos (celular): "(11) 91234-5678"
 *  - 10 dígitos (fixo):    "(11) 1234-5678"
 *  - menos: retorna como veio
 */
export function formatTelefone(tel: string | null | undefined): string {
  const d = onlyDigits(tel)
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return tel ?? ""
}

/**
 * "2026-05-19" (ISO) → "19/05/2026"
 * Aceita date string ISO ou Date.
 */
export function formatDateBr(iso: string | Date | null | undefined): string {
  if (!iso) return ""
  const d = typeof iso === "string" ? new Date(`${iso}T00:00:00`) : iso
  if (Number.isNaN(d.getTime())) return ""
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  return `${dia}/${mes}/${d.getFullYear()}`
}

/**
 * "19/05/2026" → "2026-05-19" (ISO date sem timezone)
 * Retorna null se inválida.
 */
export function parseDateBr(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim())
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const iso = `${yyyy}-${mm}-${dd}`
  const test = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(test.getTime())) return null
  return iso
}

/**
 * Valor numérico → "R$ 1.234,56"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Parser de valores monetários com soma de componentes.
 *
 * Aceita formatos como:
 *   "2382,06"               → 2382.06
 *   "2.382,06"              → 2382.06
 *   "2382,06 + 200,00"      → 2582.06
 *   "1.000,00+200,00 +50"   → 1250.00
 *   "2382.06"               → 2382.06   (formato US)
 *
 * Útil para o Relatório de Venda onde o agente costuma somar componentes
 * direto no campo (ex: tarifa + taxa = total).
 *
 * Retorna NaN se o input for inválido.
 */
export function parseValorComSoma(input: string | number | null | undefined): number {
  if (input == null || input === "") return 0
  if (typeof input === "number") return input

  const trimmed = input.trim()
  if (!trimmed) return 0

  // Quebra em parcelas pelo "+"
  const partes = trimmed.split("+").map((p) => p.trim()).filter((p) => p.length > 0)
  if (partes.length === 0) return NaN

  let total = 0
  for (const parte of partes) {
    const n = parseMoeda(parte)
    if (Number.isNaN(n)) return NaN
    total += n
  }
  return Number(total.toFixed(2))
}

/**
 * Converte uma string monetária pt-BR ou US para número.
 *   "2.382,06" → 2382.06
 *   "2382.06"  → 2382.06
 *   "2382"     → 2382
 *   "R$ 100,5" → 100.5
 */
function parseMoeda(input: string): number {
  // Remove tudo que não é número, vírgula, ponto ou sinal
  const limpo = input.replace(/[^\d,.-]/g, "")
  if (!limpo) return NaN

  const temVirgula = limpo.includes(",")
  const temPonto = limpo.includes(".")

  let normalizado: string
  if (temVirgula && temPonto) {
    // Formato pt-BR: ponto = milhar, vírgula = decimal
    normalizado = limpo.replace(/\./g, "").replace(",", ".")
  } else if (temVirgula) {
    // Só vírgula → decimal
    normalizado = limpo.replace(",", ".")
  } else {
    // Só ponto ou nada → assume formato US ou inteiro
    normalizado = limpo
  }

  const n = Number.parseFloat(normalizado)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Formata número como BRL com 2 casas decimais.
 *   1234.5 → "R$ 1.234,50"
 */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

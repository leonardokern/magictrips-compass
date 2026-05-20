import type { Metadata } from "next"
import { EmConstrucao } from "@/components/dashboard/em-construcao"

export const metadata: Metadata = { title: "Fluxo de Caixa" }

export default function FluxoDeCaixaPage() {
  return (
    <EmConstrucao
      titulo="Fluxo de Caixa"
      descricao="Visão consolidada de entradas e saídas por período, projeção de saldo e relatório por empresa."
    />
  )
}

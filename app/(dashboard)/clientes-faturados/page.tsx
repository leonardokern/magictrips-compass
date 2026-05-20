import type { Metadata } from "next"
import { EmConstrucao } from "@/components/dashboard/em-construcao"

export const metadata: Metadata = { title: "Clientes Faturados" }

export default function ClientesFaturadosPage() {
  return (
    <EmConstrucao
      titulo="Clientes Faturados"
      descricao="Ciclos de faturamento mensal, fechamento, geração de fatura PDF e envio pro cliente."
    />
  )
}

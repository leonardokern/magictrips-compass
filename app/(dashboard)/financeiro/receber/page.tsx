import type { Metadata } from "next"
import { EmConstrucao } from "@/components/dashboard/em-construcao"

export const metadata: Metadata = { title: "Contas a Receber" }

export default function ContasReceberPage() {
  return (
    <EmConstrucao
      titulo="Contas a Receber"
      descricao="Parcelas a receber dos clientes — listagem, baixa de pagamento, conciliação com cartões e exportação."
    />
  )
}

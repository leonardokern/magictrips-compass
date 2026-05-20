import type { Metadata } from "next"
import { EmConstrucao } from "@/components/dashboard/em-construcao"

export const metadata: Metadata = { title: "Contas a Pagar" }

export default function ContasPagarPage() {
  return (
    <EmConstrucao
      titulo="Contas a Pagar"
      descricao="Parcelas a pagar pros fornecedores — agenda de pagamentos, cartões da agência, baixa de pagamento."
    />
  )
}

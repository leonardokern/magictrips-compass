import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { FornecedorForm } from "@/components/fornecedores/fornecedor-form"
import type { TipoFornecedor } from "@/lib/schemas/fornecedor"

export const metadata: Metadata = {
  title: "Editar fornecedor",
}

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCurrentUser()
  if (!can(user, "fornecedores", "editar")) redirect("/fornecedores")

  const { id } = await params
  const supabase = await createClient()
  const { data: f } = await supabase
    .from("fornecedores")
    .select("id, nome, cnpj, tipo")
    .eq("id", id)
    .maybeSingle()

  if (!f) notFound()

  return (
    <div className="space-y-6">
      <Link
        href={`/fornecedores/${f.id}`}
        className="inline-flex items-center text-sm text-white/55 hover:text-white"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {f.nome}
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Editar fornecedor
        </h2>
      </div>

      <FornecedorForm
        mode="edit"
        id={f.id}
        initial={{
          nome: f.nome,
          cnpj: f.cnpj,
          tipo: f.tipo as TipoFornecedor | null,
        }}
      />
    </div>
  )
}

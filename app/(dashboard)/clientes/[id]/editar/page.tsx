import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { ClienteForm } from "@/components/clientes/cliente-form"
import type { ClienteFormValues } from "@/lib/schemas/cliente"

export const metadata: Metadata = {
  title: "Editar cliente",
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "editar")) redirect("/clientes")

  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, nome, email, telefone, cpf, data_nascimento, endereco, origem, tipo, dia_faturamento, status, observacoes, empresa_id",
    )
    .eq("id", id)
    .maybeSingle()

  if (!cliente) notFound()

  const isAdminMaster = user.empresa === null
  let empresas: { id: string; nome: string }[] = []
  if (isAdminMaster) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
    empresas = data ?? []
  } else if (user.empresa) {
    empresas = [{ id: user.empresa.id, nome: user.empresa.nome }]
  }

  const initial: Partial<ClienteFormValues> & { id: string } = {
    id: cliente.id,
    empresa_id: cliente.empresa_id,
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    cpf: cliente.cpf,
    data_nascimento: cliente.data_nascimento ?? "",
    endereco: (cliente.endereco as ClienteFormValues["endereco"]) ?? {},
    origem: cliente.origem ?? "",
    tipo: cliente.tipo as "regular" | "faturado",
    dia_faturamento: cliente.dia_faturamento ?? undefined,
    status: cliente.status as "lead" | "ativo" | "inativo",
    observacoes: cliente.observacoes ?? "",
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/clientes/${cliente.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {cliente.nome}
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Editar cliente</h2>
        <p className="text-sm text-muted-foreground">
          Atualize as informações do cliente.
        </p>
      </div>

      <ClienteForm
        mode="edit"
        empresas={empresas}
        defaultEmpresaId={cliente.empresa_id}
        lockEmpresa={!isAdminMaster}
        initial={initial}
      />
    </div>
  )
}

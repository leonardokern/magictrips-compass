import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { ClienteForm } from "@/components/clientes/cliente-form"

export const metadata: Metadata = {
  title: "Novo cliente",
}

export default async function NovoClientePage() {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "criar")) redirect("/clientes")

  const isAdminMaster = user.empresa === null
  const supabase = await createClient()

  // Empresas disponíveis
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/clientes"
          className="inline-flex items-center hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Clientes
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Novo cliente</h2>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo cliente regular ou faturado.
        </p>
      </div>

      <ClienteForm
        mode="create"
        empresas={empresas}
        defaultEmpresaId={user.empresa?.id}
        lockEmpresa={!isAdminMaster}
      />
    </div>
  )
}

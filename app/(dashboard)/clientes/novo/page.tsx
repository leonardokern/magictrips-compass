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

  const isAdminMaster = user.acessaTodasEmpresas
  const supabase = await createClient()

  // Empresas disponíveis: todas as ativas (RLS filtra pelas que o usuário pode ver)
  const { data: empresasData } = await supabase
    .from("empresas")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome")
  const empresas = empresasData ?? []

  // Trava empresa quando o usuário só tem 1 (default = essa única)
  const empresaUnica = empresas.length === 1 ? empresas[0]! : null

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
        defaultEmpresaId={empresaUnica?.id}
        lockEmpresa={Boolean(empresaUnica)}
      />
    </div>
  )
}

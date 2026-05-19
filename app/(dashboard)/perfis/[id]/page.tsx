import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { PerfilForm } from "@/components/perfis/perfil-form"
import { DeletePerfilButton } from "@/components/perfis/delete-perfil-button"
import {
  PerfilAtivoBadge,
  PerfilSistemaBadge,
} from "@/components/perfis/perfil-badges"
import type { PermissoesValue } from "@/lib/schemas/perfil"

export const metadata: Metadata = {
  title: "Perfil",
}

export default async function PerfilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Apenas o Administrador pode gerenciar perfis.
      </div>
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from("perfis_acesso")
    .select("id, nome, sistema, ativo, permissoes")
    .eq("id", id)
    .maybeSingle()

  if (!perfil) notFound()

  const { count: usuariosCount } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("perfil_id", id)

  const podeExcluir =
    can(user, "perfis", "excluir") && !perfil.sistema && (usuariosCount ?? 0) === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/perfis"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Perfis de acesso
        </Link>
        {podeExcluir && (
          <DeletePerfilButton perfilId={perfil.id} perfilNome={perfil.nome} />
        )}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{perfil.nome}</h2>
          <PerfilSistemaBadge sistema={perfil.sistema} />
          <PerfilAtivoBadge ativo={perfil.ativo} />
        </div>
        <p className="text-sm text-muted-foreground">
          {usuariosCount ?? 0}{" "}
          {usuariosCount === 1
            ? "usuário neste perfil"
            : "usuários neste perfil"}
        </p>
      </div>

      <PerfilForm
        mode="edit"
        id={perfil.id}
        nome={perfil.nome}
        sistema={perfil.sistema}
        ativo={perfil.ativo}
        permissoes={(perfil.permissoes as PermissoesValue) ?? {}}
      />
    </div>
  )
}

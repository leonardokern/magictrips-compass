import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import {
  PerfilAtivoBadge,
  PerfilSistemaBadge,
} from "@/components/perfis/perfil-badges"

export const metadata: Metadata = {
  title: "Perfis de acesso",
}

export default async function PerfisPage() {
  const user = await requireCurrentUser()
  if (!can(user, "perfis", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Apenas o Administrador pode gerenciar perfis de acesso.
      </div>
    )
  }

  const supabase = await createClient()

  const { data: perfis } = await supabase
    .from("perfis_acesso")
    .select("id, nome, sistema, ativo, created_at")
    .order("sistema", { ascending: false })
    .order("nome")

  // Conta usuários por perfil (em paralelo)
  const counts = await Promise.all(
    (perfis ?? []).map(async (p) => {
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("perfil_id", p.id)
      return [p.id, count ?? 0] as const
    }),
  )
  const usuariosPorPerfil = Object.fromEntries(counts)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Perfis de acesso
          </h2>
          <p className="text-sm text-muted-foreground">
            Defina o que cada perfil pode fazer em cada módulo do sistema.
            Os 3 perfis do sistema (Administrador, Gerente, Agente) não podem
            ser excluídos.
          </p>
        </div>

        {can(user, "perfis", "criar") && (
          <Button asChild>
            <Link href="/perfis/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo perfil
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usuários</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!perfis || perfis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum perfil cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              perfis.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/perfis/${p.id}`}
                      className="hover:underline"
                    >
                      {p.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {p.sistema ? (
                      <PerfilSistemaBadge sistema />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Customizado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PerfilAtivoBadge ativo={p.ativo} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {usuariosPorPerfil[p.id] ?? 0}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, ChevronLeft, FileText, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { formatCnpj } from "@/lib/utils/formatters"
import {
  FornecedorAtivoBadge,
  TipoFornecedorBadge,
} from "@/components/fornecedores/fornecedor-badges"
import { FornecedorAcoes } from "@/components/fornecedores/fornecedor-acoes"
import type { TipoFornecedor } from "@/lib/schemas/fornecedor"

export const metadata: Metadata = {
  title: "Fornecedor",
}

export default async function FornecedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCurrentUser()
  const { id } = await params

  if (!can(user, "fornecedores", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Você não tem permissão para ver fornecedores.
      </div>
    )
  }

  const supabase = await createClient()
  const { data: f } = await supabase
    .from("fornecedores")
    .select("id, nome, cnpj, tipo, ativo, created_at")
    .eq("id", id)
    .maybeSingle()

  if (!f) notFound()

  // Contagem de produtos vendidos com esse fornecedor (stub p/ futuro)
  const { count: produtosCount } = await supabase
    .from("venda_produtos")
    .select("id", { count: "exact", head: true })
    .eq("fornecedor_id", id)

  const permEditar = can(user, "fornecedores", "editar")
  const permExcluir = can(user, "fornecedores", "excluir")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/fornecedores"
          className="inline-flex items-center text-sm text-white/55 hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Fornecedores
        </Link>

        {permEditar && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
          >
            <Link href={`/fornecedores/${f.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Building2 className="h-7 w-7 text-white/60" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {f.nome}
            </h2>
            <TipoFornecedorBadge tipo={f.tipo as TipoFornecedor | null} />
            <FornecedorAtivoBadge ativo={f.ativo} />
          </div>
          <p className="font-mono text-sm text-white/55">{formatCnpj(f.cnpj)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="CNPJ">
              <code className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white">
                {formatCnpj(f.cnpj)}
              </code>
            </Row>
            <Row label="Tipo">
              <TipoFornecedorBadge tipo={f.tipo as TipoFornecedor | null} />
            </Row>
            <Row label="Cadastrado em">
              {new Date(f.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Row>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <FileText className="h-4 w-4 text-white/60" />
              Uso em vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/65">
              {produtosCount === 0
                ? "Este fornecedor ainda não foi usado em nenhuma venda."
                : `${produtosCount} ${
                    produtosCount === 1 ? "produto vendido" : "produtos vendidos"
                  } com este fornecedor.`}
            </p>
            <p className="mt-2 text-xs text-white/45">
              A listagem detalhada de vendas será exibida quando o módulo for
              entregue.
            </p>
          </CardContent>
        </Card>
      </div>

      {(permEditar || permExcluir) && (
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <FornecedorAcoes
              id={f.id}
              nome={f.nome}
              ativo={f.ativo}
              permEditar={permEditar}
              permExcluir={permExcluir}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <div className="mt-0.5 text-white">{children}</div>
    </div>
  )
}

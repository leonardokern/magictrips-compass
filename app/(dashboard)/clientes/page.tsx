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
import { formatCpf, formatTelefone } from "@/lib/utils/formatters"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import {
  StatusClienteBadge,
  TipoClienteBadge,
} from "@/components/clientes/status-badge"
import type { StatusCliente, TipoCliente } from "@/lib/schemas/cliente"

export const metadata: Metadata = {
  title: "Clientes",
}

const PAGE_SIZE = 20

type SearchParams = Promise<{
  q?: string
  tipo?: string
  status?: string
  empresa?: string
  page?: string
}>

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireCurrentUser()
  if (!can(user, "clientes", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Você não tem permissão para ver clientes.
      </div>
    )
  }

  const sp = await searchParams
  const q = sp.q?.trim() || ""
  const tipo = (sp.tipo as TipoCliente | undefined) ?? undefined
  const status = (sp.status as StatusCliente | undefined) ?? undefined
  const empresaFiltro = sp.empresa || undefined
  const page = Math.max(1, Number(sp.page ?? "1"))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const isAdminMaster = user.empresa === null

  const supabase = await createClient()

  // Empresas (só para Administrador Master)
  let empresas: { id: string; nome: string }[] = []
  if (isAdminMaster) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
    empresas = data ?? []
  }

  // Build query
  let query = supabase
    .from("clientes")
    .select(
      "id, nome, email, telefone, cpf, tipo, status, empresa_id",
      { count: "exact" },
    )
    .order("nome")
    .range(from, to)

  if (q) {
    // Buscar por nome OU email OU CPF (CPF é dígitos puros no banco)
    const cpfDigits = q.replace(/\D/g, "")
    const ors: string[] = [`nome.ilike.%${q}%`, `email.ilike.%${q}%`]
    if (cpfDigits.length > 0) ors.push(`cpf.ilike.%${cpfDigits}%`)
    query = query.or(ors.join(","))
  }
  if (tipo) query = query.eq("tipo", tipo)
  if (status) query = query.eq("status", status)
  if (empresaFiltro && isAdminMaster) {
    query = query.eq("empresa_id", empresaFiltro)
  }

  const { data: clientes, count, error } = await query

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Erro ao carregar clientes: {error.message}
      </div>
    )
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Clientes</h2>
          <p className="mt-1 text-sm text-white/55">
            {total} {total === 1 ? "cliente cadastrado" : "clientes cadastrados"}
          </p>
        </div>

        {can(user, "clientes", "criar") && (
          <Button asChild className="bg-nexus-bright text-white hover:bg-nexus-bright-soft">
            <Link href="/clientes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo cliente
            </Link>
          </Button>
        )}
      </div>

      <ClientesFilters
        q={q}
        tipo={tipo}
        status={status}
        empresaId={empresaFiltro}
        empresas={empresas}
        showEmpresaFilter={isAdminMaster}
      />

      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/55">Nome</TableHead>
              <TableHead className="text-white/55">CPF</TableHead>
              <TableHead className="text-white/55">E-mail</TableHead>
              <TableHead className="text-white/55">Telefone</TableHead>
              <TableHead className="text-white/55">Tipo</TableHead>
              <TableHead className="text-white/55">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!clientes || clientes.length === 0 ? (
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center text-sm text-white/45">
                  {q || tipo || status
                    ? "Nenhum cliente encontrado com esses filtros."
                    : "Nenhum cliente cadastrado ainda."}
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer border-white/[0.06] hover:bg-white/[0.025]"
                >
                  <TableCell className="font-medium text-white">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/75">{formatCpf(c.cpf)}</TableCell>
                  <TableCell className="text-sm text-white/55">{c.email}</TableCell>
                  <TableCell className="text-sm text-white/75">{formatTelefone(c.telefone)}</TableCell>
                  <TableCell>
                    <TipoClienteBadge tipo={c.tipo as TipoCliente} />
                  </TableCell>
                  <TableCell>
                    <StatusClienteBadge status={c.status as StatusCliente} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/55">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
              >
                <Link
                  href={`/clientes?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(sp).filter(([, v]) => v != null),
                    ),
                    page: String(page - 1),
                  } as Record<string, string>).toString()}`}
                >
                  Anterior
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
              >
                <Link
                  href={`/clientes?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(sp).filter(([, v]) => v != null),
                    ),
                    page: String(page + 1),
                  } as Record<string, string>).toString()}`}
                >
                  Próxima
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

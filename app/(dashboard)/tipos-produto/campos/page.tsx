import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
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
import { NovoCampoExtraButton } from "@/components/tipos-produto/novo-campo-extra-button"
import { CampoExtraRowActions } from "@/components/tipos-produto/campo-extra-row-actions"
import {
  TIPO_CAMPO_LABEL,
  type CampoOpcao,
  type TipoCampo,
} from "@/lib/schemas/tipo-produto"

export const metadata: Metadata = {
  title: "Campos dos produtos",
}

export default async function CamposExtraPage() {
  const user = await requireCurrentUser()
  if (!can(user, "tipos_produto", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Você não tem permissão para ver campos.
      </div>
    )
  }

  const supabase = await createClient()
  const [{ data: campos }, { data: opcoes }, { data: vinculos }] =
    await Promise.all([
      supabase
        .from("campos_extra")
        .select("id, nome, tipo_campo, placeholder, ativo, created_at")
        .order("nome"),
      supabase
        .from("campos_extra_opcoes")
        .select("id, campo_id, valor, ordem")
        .eq("ativo", true)
        .order("ordem"),
      supabase
        .from("tipos_produto_campos")
        .select("campo_id, tipo_produto_id, tipos_produto(nome)"),
    ])

  // Agrupa opções por campo
  const opcoesPorCampo = new Map<string, CampoOpcao[]>()
  for (const o of opcoes ?? []) {
    const arr = opcoesPorCampo.get(o.campo_id) ?? []
    arr.push({ id: o.id, valor: o.valor, ordem: o.ordem })
    opcoesPorCampo.set(o.campo_id, arr)
  }

  // Agrupa nomes de tipos que usam cada campo
  const tiposPorCampo = new Map<string, string[]>()
  for (const v of vinculos ?? []) {
    const nome = v.tipos_produto?.nome
    if (!nome) continue
    const arr = tiposPorCampo.get(v.campo_id) ?? []
    arr.push(nome)
    tiposPorCampo.set(v.campo_id, arr)
  }

  const podeEditar = can(user, "tipos_produto", "editar")
  const podeExcluir = can(user, "tipos_produto", "excluir")

  return (
    <div className="space-y-6">
      <Link
        href="/tipos-produto"
        className="inline-flex items-center text-sm text-white/55 hover:text-white"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Tipos de Produto
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Campos dos produtos
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Catálogo de campos extras que podem ser vinculados a um tipo de
            produto. Define nome, tipo (texto, número, data, lista, sim/não) e
            opções (no caso de listas).
          </p>
        </div>
        {can(user, "tipos_produto", "criar") && <NovoCampoExtraButton />}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/55">Nome</TableHead>
              <TableHead className="text-white/55">Tipo</TableHead>
              <TableHead className="text-white/55">Detalhes</TableHead>
              <TableHead className="text-white/55">Em uso</TableHead>
              <TableHead className="text-white/55">Status</TableHead>
              <TableHead className="text-right text-white/55">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!campos || campos.length === 0 ? (
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-sm text-white/45"
                >
                  Nenhum campo cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              campos.map((c) => {
                const ops = opcoesPorCampo.get(c.id) ?? []
                const tipos = tiposPorCampo.get(c.id) ?? []
                const tipoCampo = c.tipo_campo as TipoCampo
                return (
                  <TableRow
                    key={c.id}
                    className="border-white/[0.06] hover:bg-white/[0.025]"
                  >
                    <TableCell className="font-medium text-white">
                      {c.nome}
                    </TableCell>
                    <TableCell className="text-sm text-white/75">
                      {TIPO_CAMPO_LABEL[tipoCampo] ?? tipoCampo}
                    </TableCell>
                    <TableCell className="text-xs text-white/55">
                      {tipoCampo === "dropdown" ? (
                        ops.length === 0 ? (
                          <span className="text-amber-300">
                            Sem opções cadastradas
                          </span>
                        ) : (
                          <span>
                            {ops.length}{" "}
                            {ops.length === 1 ? "opção" : "opções"}
                          </span>
                        )
                      ) : c.placeholder ? (
                        <span className="font-mono text-white/45">
                          “{c.placeholder}”
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tipos.length === 0 ? (
                        <span className="text-white/40">Não vinculado</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {tipos.map((t, i) => (
                            <span
                              key={`${c.id}-${t}-${i}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/75"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.ativo ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
                          Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CampoExtraRowActions
                        campo={{
                          id: c.id,
                          nome: c.nome,
                          tipo_campo: tipoCampo,
                          placeholder: c.placeholder,
                          ativo: c.ativo,
                          opcoes: ops,
                        }}
                        podeEditar={podeEditar}
                        podeExcluir={podeExcluir}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

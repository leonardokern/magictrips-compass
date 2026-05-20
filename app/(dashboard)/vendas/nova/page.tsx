import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { VendaWizard } from "@/components/vendas/venda-wizard"

export const metadata: Metadata = { title: "Nova venda" }

export default async function NovaVendaPage() {
  const user = await requireCurrentUser()
  if (!can(user, "vendas", "criar")) {
    redirect("/vendas")
  }

  const supabase = await createClient()

  // Empresas que o usuário vê
  const empresas = user.acessaTodasEmpresas
    ? (
        await supabase
          .from("empresas")
          .select("id, nome, slug")
          .eq("ativo", true)
          .order("nome")
      ).data ?? []
    : user.empresas.map((e) => ({ id: e.id, nome: e.nome, slug: e.slug }))

  const [
    { data: clientes },
    { data: fornecedores },
    { data: cartoes },
    { data: origens },
    { data: tipos },
    { data: vinculos },
    { data: campos },
    { data: opcoes },
    { data: usuariosAtivos },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, cpf, email, empresa_id")
      .eq("status", "ativo")
      .order("nome"),
    supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("cartoes")
      .select("id, nome, banco, empresa_id, dia_vencimento")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("origens_venda")
      .select("id, nome")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("tipos_produto")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("tipos_produto_campos")
      .select("tipo_produto_id, campo_id, obrigatorio, ordem"),
    supabase
      .from("campos_extra")
      .select("id, nome, tipo_campo, placeholder")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("campos_extra_opcoes")
      .select("campo_id, valor, ordem")
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome"),
  ])

  // Monta tipos com seus vínculos
  const vinculosPorTipo = new Map<string, { campo_id: string; obrigatorio: boolean; ordem: number }[]>()
  for (const v of vinculos ?? []) {
    const arr = vinculosPorTipo.get(v.tipo_produto_id) ?? []
    arr.push({ campo_id: v.campo_id, obrigatorio: v.obrigatorio, ordem: v.ordem })
    vinculosPorTipo.set(v.tipo_produto_id, arr)
  }
  const tiposProduto = (tipos ?? []).map((t) => ({
    id: t.id,
    nome: t.nome,
    campos: vinculosPorTipo.get(t.id) ?? [],
  }))

  // Monta campos com opcoes
  const opcoesPorCampo = new Map<string, { valor: string }[]>()
  for (const o of opcoes ?? []) {
    const arr = opcoesPorCampo.get(o.campo_id) ?? []
    arr.push({ valor: o.valor })
    opcoesPorCampo.set(o.campo_id, arr)
  }
  const camposExtra = (campos ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo_campo: c.tipo_campo,
    placeholder: c.placeholder,
    opcoes: opcoesPorCampo.get(c.id) ?? [],
  }))

  const podeTrocarAgente = can(user, "vendas", "aprovar")

  const defaultEmpresaId =
    empresas.length === 1 ? empresas[0]!.id : undefined

  return (
    <VendaWizard
      empresas={empresas}
      defaultEmpresaId={defaultEmpresaId}
      clientes={clientes ?? []}
      fornecedores={fornecedores ?? []}
      cartoes={cartoes ?? []}
      origens={origens ?? []}
      tiposProduto={tiposProduto}
      camposExtra={camposExtra}
      usuariosAgentes={usuariosAtivos ?? []}
      usuarioLogadoId={user.id}
      podeTrocarAgente={podeTrocarAgente}
    />
  )
}

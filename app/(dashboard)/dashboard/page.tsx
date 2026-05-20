import type { Metadata } from "next"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { createClient } from "@/lib/supabase/server"
import { AreaChartCard } from "@/components/dashboard/charts/area-chart-card"
import { BarChartCard } from "@/components/dashboard/charts/bar-chart-card"
import { DonutChartCard } from "@/components/dashboard/charts/donut-chart-card"
import { LineChartCard } from "@/components/dashboard/charts/line-chart-card"

export const metadata: Metadata = {
  title: "Início",
}

// Cores para as empresas (alinhadas com a paleta Nexus)
const EMPRESA_COR: Record<string, string> = {
  "magic-trips": "#004E5A",
  "del-mondo": "#1498D5",
}
const COR_FALLBACK = "#46B1E0"

function formatDiaLabel(d: Date): string {
  // "Jul 1" em pt-BR fica "1 jul"
  return d
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "")
}

function buildDailySeries(
  rows: { created_at: string }[],
  days: number,
): { label: string; value: number }[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const slots = Array.from({ length: days }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() - (days - 1 - i))
    return { date: d, value: 0 }
  })

  for (const r of rows) {
    const c = new Date(r.created_at)
    c.setHours(0, 0, 0, 0)
    const slot = slots.find((s) => s.date.getTime() === c.getTime())
    if (slot) slot.value += 1
  }

  return slots.map((s) => ({
    label: formatDiaLabel(s.date),
    value: s.value,
  }))
}

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const supabase = await createClient()

  const dataLimite28 = new Date()
  dataLimite28.setDate(dataLimite28.getDate() - 27)
  dataLimite28.setHours(0, 0, 0, 0)

  const dataLimite7 = new Date()
  dataLimite7.setDate(dataLimite7.getDate() - 6)
  dataLimite7.setHours(0, 0, 0, 0)

  // Queries em paralelo: counts, séries temporais, lista de empresas
  const [
    { count: totalClientes },
    { count: clientesFaturados },
    { count: vendasPendentes },
    { count: totalUsuarios },
    { data: clientes28 },
    { data: clientes7 },
    { data: empresas },
  ] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "faturado"),
    supabase
      .from("vendas")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente_validacao"),
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true),
    supabase
      .from("clientes")
      .select("created_at, tipo, empresa_id")
      .gte("created_at", dataLimite28.toISOString())
      .order("created_at"),
    supabase
      .from("clientes")
      .select("created_at, tipo")
      .gte("created_at", dataLimite7.toISOString())
      .order("created_at"),
    supabase.from("empresas").select("id, nome, slug").eq("ativo", true).order("nome"),
  ])

  // Distribuição de clientes por empresa
  const distrPorEmpresa = new Map<string, number>()
  for (const c of clientes28 ?? []) {
    distrPorEmpresa.set(c.empresa_id, (distrPorEmpresa.get(c.empresa_id) ?? 0) + 1)
  }
  const donutData = (empresas ?? []).map((e) => ({
    label: e.nome,
    value: distrPorEmpresa.get(e.id) ?? 0,
    color: EMPRESA_COR[e.slug] ?? COR_FALLBACK,
  }))
  const donutTotal = donutData.reduce((acc, d) => acc + d.value, 0)

  // Série diária pro chart principal (28 dias)
  const serie28 = buildDailySeries(clientes28 ?? [], 28)
  const total28 = serie28.reduce((acc, p) => acc + p.value, 0)

  // Série pro line chart (7 dias)
  const serie7 = buildDailySeries(clientes7 ?? [], 7)
  const total7 = serie7.reduce((acc, p) => acc + p.value, 0)

  // Bar chart: 7 dias, divindo regular vs faturado
  const slotsHoje = new Date()
  slotsHoje.setHours(0, 0, 0, 0)
  const slots7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(slotsHoje)
    d.setDate(d.getDate() - (6 - i))
    return { date: d, regular: 0, faturado: 0 }
  })
  for (const c of clientes7 ?? []) {
    const dia = new Date(c.created_at)
    dia.setHours(0, 0, 0, 0)
    const slot = slots7.find((s) => s.date.getTime() === dia.getTime())
    if (!slot) continue
    if (c.tipo === "faturado") slot.faturado += 1
    else slot.regular += 1
  }
  const barData = slots7.map((s) => ({
    label: formatDiaLabel(s.date),
    value: s.regular,
    value2: s.faturado,
  }))

  // Empresas list — quantos clientes em cada
  const empresasComCount = (empresas ?? []).map((e) => ({
    ...e,
    clientes: distrPorEmpresa.get(e.id) ?? 0,
    cor: EMPRESA_COR[e.slug] ?? COR_FALLBACK,
  }))

  return (
    <div className="space-y-6">
      {/* Grid top: chart grande à esquerda + card de distribuição à direita */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Big chart — 2/3 width */}
        <Card className="border-white/[0.06] bg-white/[0.02] lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Novos clientes
                </CardTitle>
                <p className="mt-0.5 text-xs text-white/45">Últimos 28 dias</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {total28}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
                  no período
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <AreaChartCard data={serie28} tooltipSuffix="cliente(s)" />
            </div>
          </CardContent>
        </Card>

        {/* Distribuição + sub-stats — 1/3 width */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold text-white">
                Distribuição
              </CardTitle>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                últimos 28d
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-40">
              {donutTotal > 0 ? (
                <DonutChartCard
                  data={donutData}
                  centerValue={String(donutTotal)}
                  centerLabel="clientes"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/40">
                  Sem cadastros no período
                </div>
              )}
            </div>

            {/* Legenda das fatias */}
            <div className="space-y-1.5">
              {donutData.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-white/75">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.label}
                  </span>
                  <span className="tabular-nums text-white/55">{d.value}</span>
                </div>
              ))}
            </div>

            {/* Sub-stat cards (2x2) */}
            <div className="grid grid-cols-2 gap-2">
              <SubStat
                label="Total clientes"
                value={totalClientes ?? 0}
                hint={`${clientesFaturados ?? 0} faturados`}
              />
              <SubStat
                label="Usuários"
                value={totalUsuarios ?? 0}
                hint="ativos"
              />
              <SubStat
                label="Aprovação"
                value={vendasPendentes ?? 0}
                hint="vendas pendentes"
                accent={(vendasPendentes ?? 0) > 0 ? "amber" : undefined}
              />
              <SubStat
                label="Este mês"
                value={total28}
                hint="novos clientes"
                accent="bright"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid bottom: 2 charts à esquerda + empresas à direita */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Line chart pequeno */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Cadastros recentes
                </CardTitle>
                <p className="mt-0.5 text-xs text-white/45">Últimos 7 dias</p>
              </div>
              <p className="text-xl font-semibold tabular-nums text-white">
                {total7}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <LineChartCard data={serie7} />
            </div>
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Por tipo de cliente
                </CardTitle>
                <p className="mt-0.5 text-xs text-white/45">Últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-white/55">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-nexus-bright" />
                  Regular
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Faturado
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <BarChartCard data={barData} showSecondary />
            </div>
          </CardContent>
        </Card>

        {/* Empresas */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold text-white">
                Empresas
              </CardTitle>
              {can(user, "clientes", "ler") && (
                <Link
                  href="/clientes"
                  className="text-xs text-nexus-bright hover:text-nexus-bright-soft"
                >
                  Ver todos
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="-mt-1 space-y-1">
              <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/[0.05] pb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                <span>Nome</span>
                <span>Clientes</span>
              </div>
              {empresasComCount.length === 0 ? (
                <p className="py-4 text-center text-xs text-white/45">
                  Sem empresas ativas.
                </p>
              ) : (
                empresasComCount.map((e) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {e.nome}
                      </p>
                      <p className="text-[11px] text-white/45">{e.slug}</p>
                    </div>
                    <span
                      className="rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums"
                      style={{
                        color: e.cor,
                        borderColor: `${e.cor}55`,
                        backgroundColor: `${e.cor}15`,
                      }}
                    >
                      {e.clientes}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faixa de hint sobre dados pendentes */}
      {vendasPendentes === 0 && totalClientes === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/55">
          <TrendingUp className="h-4 w-4 shrink-0 text-nexus-bright" />
          Cadastre clientes e registre vendas para ver os números preencherem
          estes cards.
        </div>
      )}
    </div>
  )
}

function SubStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint?: string
  accent?: "bright" | "amber"
}) {
  const valueColor =
    accent === "amber"
      ? "text-amber-300"
      : accent === "bright"
        ? "text-nexus-bright"
        : "text-white"
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[10px] text-white/40">{hint}</p>
      )}
    </div>
  )
}

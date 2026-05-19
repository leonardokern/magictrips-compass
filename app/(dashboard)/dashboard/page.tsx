import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  Trophy,
  Users,
  Wallet,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { createClient } from "@/lib/supabase/server"
import { KpiCard } from "@/components/dashboard/kpi-card"
import {
  StatusClienteBadge,
  TipoClienteBadge,
} from "@/components/clientes/status-badge"
import type { StatusCliente, TipoCliente } from "@/lib/schemas/cliente"

export const metadata: Metadata = {
  title: "Início",
}

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const primeiroNome = user.nome.split(" ")[0]
  const supabase = await createClient()

  // KPIs: o que dá pra mostrar de verdade agora.
  // Demais KPIs (receita, comissão, ticket médio, ranking) virão com Vendas.
  const [
    { count: totalClientes },
    { count: clientesAtivos },
    { count: clientesFaturados },
    { count: vendasPendentes },
  ] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo"),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "faturado"),
    supabase
      .from("vendas")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente_validacao"),
  ])

  // Últimos clientes cadastrados (preview da atividade recente)
  const { data: ultimosClientes } = await supabase
    .from("clientes")
    .select("id, nome, tipo, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Olá, {primeiroNome}
            <span className="ml-2">👋</span>
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Visão geral do Compass · {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {can(user, "clientes", "criar") && (
          <Button asChild className="bg-indigo-500 text-white hover:bg-indigo-400">
            <Link href="/clientes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo cliente
            </Link>
          </Button>
        )}
      </div>

      {/* KPIs principais */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Resumo
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Clientes ativos"
            value={clientesAtivos ?? 0}
            hint={`de ${totalClientes ?? 0} cadastrados`}
            icon={Users}
            accent="indigo"
            href="/clientes?status=ativo"
          />
          <KpiCard
            label="Clientes faturados"
            value={clientesFaturados ?? 0}
            hint="ciclo mensal"
            icon={ClipboardCheck}
            accent="violet"
            href="/clientes?tipo=faturado"
          />
          <KpiCard
            label="Aguardando aprovação"
            value={vendasPendentes ?? 0}
            hint={
              (vendasPendentes ?? 0) === 0
                ? "Sem pendências"
                : "vendas para revisar"
            }
            icon={CalendarClock}
            accent="amber"
            href={
              can(user, "vendas", "aprovar") ? "/vendas?status=pendente_validacao" : undefined
            }
          />
          <KpiCard
            label="Receita do mês"
            value={null}
            hint="vendas aprovadas no mês"
            icon={Wallet}
            accent="emerald"
            empty
          />
        </div>
      </section>

      {/* Grid principal: atividade + placeholders de analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Atividade recente */}
        <Card className="border-white/[0.06] bg-white/[0.02] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold text-white">
                Últimos clientes cadastrados
              </CardTitle>
              <p className="mt-0.5 text-xs text-white/45">
                Atividade mais recente da sua empresa
              </p>
            </div>
            {can(user, "clientes", "ler") && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/60 hover:bg-white/[0.04] hover:text-white"
              >
                <Link href="/clientes">Ver todos</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!ultimosClientes || ultimosClientes.length === 0 ? (
              <EmptyState
                title="Nenhum cliente ainda"
                description="Cadastre o primeiro cliente para começar a usar o sistema."
                actionLabel={can(user, "clientes", "criar") ? "Cadastrar cliente" : undefined}
                actionHref="/clientes/novo"
              />
            ) : (
              <ul className="-mx-2 divide-y divide-white/[0.05]">
                {ultimosClientes.map((c) => (
                  <li key={c.id} className="px-2">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-md py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-white/80">
                          {getInitials(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {c.nome}
                          </p>
                          <p className="text-xs text-white/45">
                            {formatRelativeDate(c.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TipoClienteBadge tipo={c.tipo as TipoCliente} />
                        <StatusClienteBadge status={c.status as StatusCliente} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ranking de agentes — placeholder */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
              <Trophy className="h-4 w-4 text-amber-400" />
              Top agentes
            </CardTitle>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
              Em breve
            </span>
          </CardHeader>
          <CardContent>
            <SkeletonRanking />
            <p className="mt-3 text-xs text-white/45">
              Ranking por receita e comissão será exibido aqui quando o módulo de
              Vendas for entregue.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mais analytics futuros */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
              <BarChart3 className="h-4 w-4 text-violet-400" />
              Receita mensal
            </CardTitle>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
              Em breve
            </span>
          </CardHeader>
          <CardContent>
            <SkeletonChart />
            <p className="mt-3 text-xs text-white/45">
              Comparativo mês a mês entre Magic Trips e Del Mondo.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              Top produtos vendidos
            </CardTitle>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
              Em breve
            </span>
          </CardHeader>
          <CardContent>
            <SkeletonBars />
            <p className="mt-3 text-xs text-white/45">
              Aéreo, Hotel, Cruzeiro, Pacotes — distribuição por tipo de produto.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Users className="h-4 w-4 text-white/60" />
      </div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-white/45">{description}</p>
      {actionLabel && actionHref && (
        <Button
          asChild
          size="sm"
          className="mt-4 bg-indigo-500 text-white hover:bg-indigo-400"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}

function SkeletonRanking() {
  return (
    <div className="space-y-3">
      {[68, 52, 38, 28].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-medium text-white/60">
            {i + 1}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-20 rounded-full bg-white/[0.06]" />
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-amber-500/40 to-amber-500/0"
              style={{ width: `${w}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonChart() {
  const heights = [40, 65, 50, 75, 60, 85, 70, 90, 55, 80, 70, 95]
  return (
    <div className="flex h-32 items-end gap-1.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-gradient-to-t from-violet-500/20 to-violet-500/5"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

function SkeletonBars() {
  const items = [
    { label: "Aéreo", value: 78, color: "from-emerald-500/40 to-emerald-500/0" },
    { label: "Pacote", value: 62, color: "from-sky-500/40 to-sky-500/0" },
    { label: "Hotel", value: 45, color: "from-indigo-500/40 to-indigo-500/0" },
    { label: "Cruzeiro", value: 28, color: "from-violet-500/40 to-violet-500/0" },
    { label: "Outros", value: 12, color: "from-amber-500/40 to-amber-500/0" },
  ]
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-white/55">{item.label}</span>
            <span className="text-white/30">—</span>
          </div>
          <div
            className={`h-1.5 rounded-full bg-gradient-to-r ${item.color}`}
            style={{ width: `${item.value}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Hoje"
  if (diffDays === 1) return "Ontem"
  if (diffDays < 7) return `${diffDays} dias atrás`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

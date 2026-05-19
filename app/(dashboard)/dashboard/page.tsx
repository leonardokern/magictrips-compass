import type { Metadata } from "next"
import { ShieldCheck, Building2, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"

export const metadata: Metadata = {
  title: "Início",
}

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const primeiroNome = user.nome.split(" ")[0]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Olá, {primeiroNome}
          <span className="ml-2">👋</span>
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Bem-vindo ao Compass. Os módulos serão liberados conforme cada feature for entregue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-white/60" />}
          label="Perfil"
          value={user.perfil.nome}
        />
        <SummaryCard
          icon={<Building2 className="h-4 w-4 text-white/60" />}
          label="Empresa"
          value={user.empresa?.nome ?? "Todas"}
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4 text-emerald-400" />}
          label="Status"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-emerald-300">Ativo</span>
            </span>
          }
        />
      </div>

      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base text-white">Próximos passos (V1.0)</CardTitle>
          <CardDescription className="text-white/55">
            Roadmap dos módulos a serem entregues nesta fase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-white/65">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              CRUD de clientes (regular + faturado)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              CRUD de fornecedores
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              Tipos de produto + campos dinâmicos
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              Relatório de Venda (cabeçalho + N produtos + cobrança)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              Workflow de aprovação Agente → Gerente
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              Exportação CSV/Excel para Otoos
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/10">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

import type { Metadata } from "next"
import { Info, Sparkles, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentUser } from "@/lib/hooks/use-current-user"
import { can } from "@/lib/hooks/use-permissions"
import { RegraInput } from "@/components/comissoes/regra-input"
import { ORIGENS_MARKETING_ONLINE } from "@/lib/schemas/comissao"

export const metadata: Metadata = {
  title: "Comissões",
}

type Regra = {
  id: string
  empresa_id: string
  origem: string
  percentual: number
  observacao: string | null
}

type Empresa = { id: string; nome: string; slug: string }

const EMPRESA_ACCENT: Record<string, { ring: string; bg: string; chip: string }> = {
  "magic-trips": {
    ring: "from-indigo-500/30 via-indigo-500/10 to-transparent",
    bg: "bg-indigo-500/10",
    chip: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300",
  },
  "del-mondo": {
    ring: "from-amber-500/30 via-amber-500/10 to-transparent",
    bg: "bg-amber-500/10",
    chip: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
}

function accentFor(p: number): "low" | "mid" | "high" {
  if (p >= 45) return "high"
  if (p >= 25) return "mid"
  return "low"
}

export default async function ComissoesPage() {
  const user = await requireCurrentUser()
  if (!can(user, "comissoes", "ler")) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Você não tem permissão para ver comissões.
      </div>
    )
  }

  const podeEditar = can(user, "comissoes", "editar")

  const supabase = await createClient()
  const [{ data: empresas = [] }, { data: regras = [] }] = await Promise.all([
    supabase.from("empresas").select("id, nome, slug").eq("ativo", true).order("nome"),
    supabase.from("comissoes_regras").select("id, empresa_id, origem, percentual, observacao"),
  ])

  const regrasPorEmpresa = new Map<string, Regra[]>()
  for (const r of (regras ?? []) as Regra[]) {
    const arr = regrasPorEmpresa.get(r.empresa_id) ?? []
    arr.push(r)
    regrasPorEmpresa.set(r.empresa_id, arr)
  }

  // Estatísticas: média e faixa por empresa
  const stats = new Map<string, { min: number; max: number; media: number }>()
  for (const [empId, arr] of regrasPorEmpresa) {
    const valores = arr.map((r) => Number(r.percentual))
    stats.set(empId, {
      min: Math.min(...valores),
      max: Math.max(...valores),
      media: valores.reduce((a, b) => a + b, 0) / valores.length,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Comissões
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Defina o percentual de comissão padrão por empresa e origem do lead.
          O sistema aplica automaticamente ao calcular a comissão do vendedor em
          cada venda aprovada.
        </p>
      </div>

      {/* Aviso pra Agente que cai aqui sem permissão de editar */}
      {!podeEditar && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Você tem permissão apenas para visualizar. Para editar, fale com o
          Administrador.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {(empresas as Empresa[]).map((empresa) => {
          const accent = EMPRESA_ACCENT[empresa.slug] ?? EMPRESA_ACCENT["magic-trips"]!
          const arr = regrasPorEmpresa.get(empresa.id) ?? []
          arr.sort((a, b) => a.origem.localeCompare(b.origem, "pt-BR"))
          const s = stats.get(empresa.id)

          return (
            <Card
              key={empresa.id}
              className="relative overflow-hidden border-white/[0.06] bg-white/[0.02]"
            >
              {/* Glow sutil no topo */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -top-32 left-0 right-0 h-64 bg-gradient-to-b ${accent.ring}`}
              />

              <CardHeader className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-white">
                      {empresa.nome}
                    </CardTitle>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-white/45">
                      {empresa.slug === "magic-trips"
                        ? "Régua dinâmica 30/40/50"
                        : "Regra fixa 12%"}
                    </p>
                  </div>

                  {s && (
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/45">
                          Média
                        </p>
                        <p className="text-lg font-semibold text-white tabular-nums">
                          {s.media.toFixed(1)}%
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${accent.chip}`}>
                        {s.min === s.max
                          ? `${s.min.toFixed(0)}% fixo`
                          : `${s.min.toFixed(0)}–${s.max.toFixed(0)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="relative space-y-1">
                {arr.map((r) => {
                  const isOnline = (ORIGENS_MARKETING_ONLINE as readonly string[]).includes(
                    r.origem,
                  )
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/[0.025]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/85">{r.origem}</span>
                        {isOnline && (
                          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-violet-300">
                            online
                          </span>
                        )}
                      </div>
                      <RegraInput
                        id={r.id}
                        initialValue={Number(r.percentual)}
                        readOnly={!podeEditar}
                        accent={accentFor(Number(r.percentual))}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Card explicativo da régua */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Como a régua funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/65">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p>
              <strong className="text-white">50%</strong> — Lead próprio do
              agente (relacionamento pessoal, sem custo pra empresa).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              <strong className="text-white">40%</strong> — Indicações gerais,
              carteira comum, parceiros, cliente antigo.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p>
              <strong className="text-white">30%</strong> — Leads gerados pela
              empresa (tráfego pago, LP, chat, redes sociais).
            </p>
          </div>
          <div className="mt-3 rounded-md border border-white/[0.06] bg-white/[0.03] p-3 text-xs">
            <strong className="text-white">Exceções administrativas:</strong>{" "}
            o gerente pode sobrescrever o percentual diretamente na venda no
            momento da aprovação (campo "Comissão do vendedor"). A matriz aqui
            define apenas o padrão.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Construction } from "lucide-react"

type Props = {
  /** Nome do módulo, ex: "Vendas". */
  titulo: string
  /** Descrição curta do que esse módulo vai fazer. */
  descricao?: string
}

/**
 * Placeholder usado nas rotas cujo módulo ainda não foi construído.
 * Exibe um estado vazio amigável com ícone e mensagem.
 */
export function EmConstrucao({ titulo, descricao }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        {titulo}
      </h2>

      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-nexus-bright/30 bg-nexus-bright/10">
          <Construction className="h-7 w-7 text-nexus-bright" />
        </div>

        <div className="max-w-md space-y-1.5">
          <p className="text-lg font-semibold text-white">Em construção</p>
          <p className="text-sm text-white/55">
            {descricao ??
              `O módulo de ${titulo} está em desenvolvimento e estará disponível em breve.`}
          </p>
        </div>

        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300">
          em breve
        </span>
      </div>
    </div>
  )
}

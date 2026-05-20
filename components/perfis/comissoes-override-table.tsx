"use client"

import { Input } from "@/components/ui/input"

type Regra = {
  origem_id: string
  origem: string
  defaultPercentual: number
}

type Props = {
  regras: Regra[]
  /** Valores que admin já definiu (origem_id → percentual). */
  valores: Record<string, number>
  onChange: (origemId: string, percentual: number) => void
  onReset: (origemId: string) => void
  disabled?: boolean
}

export function ComissoesOverrideTable({
  regras,
  valores,
  onChange,
  onReset,
  disabled,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="border-b border-white/[0.06] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/55">
              Origem do lead
            </th>
            <th className="border-b border-white/[0.06] px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/55">
              Padrão da empresa
            </th>
            <th className="border-b border-white/[0.06] px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/55">
              % deste perfil
            </th>
            <th className="border-b border-white/[0.06] px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/55">
              {" "}
            </th>
          </tr>
        </thead>
        <tbody>
          {regras.map((r) => {
            const valorAtual = valores[r.origem_id] ?? r.defaultPercentual
            const customizado = valores[r.origem_id] !== undefined
            return (
              <tr
                key={r.origem_id}
                className="transition-colors hover:bg-white/[0.025]"
              >
                <td className="border-b border-white/[0.04] px-4 py-2.5 text-sm text-white/85">
                  {r.origem}
                </td>
                <td className="border-b border-white/[0.04] px-3 py-2.5 text-right text-sm tabular-nums text-white/55">
                  {r.defaultPercentual.toFixed(1)}%
                </td>
                <td className="border-b border-white/[0.04] px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Number.isFinite(valorAtual) ? valorAtual : ""}
                      onChange={(e) => {
                        const num = Number.parseFloat(e.target.value)
                        if (Number.isFinite(num)) onChange(r.origem_id, num)
                      }}
                      disabled={disabled}
                      className={
                        "h-8 w-20 border-white/10 bg-white/[0.03] text-right tabular-nums text-sm " +
                        (customizado ? "text-nexus-bright" : "text-white/85")
                      }
                    />
                    <span className="text-xs text-white/40">%</span>
                  </div>
                </td>
                <td className="border-b border-white/[0.04] px-3 py-2.5 text-right">
                  {customizado ? (
                    <button
                      type="button"
                      onClick={() => onReset(r.origem_id)}
                      disabled={disabled}
                      className="text-[11px] uppercase tracking-wider text-white/45 hover:text-white"
                    >
                      Resetar
                    </button>
                  ) : (
                    <span className="text-[11px] uppercase tracking-wider text-white/30">
                      padrão
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

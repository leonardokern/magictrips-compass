"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MODULOS_PERMISSAO } from "@/lib/constants/permissoes"
import type { PermissoesValue } from "@/lib/schemas/perfil"

type Props = {
  value: PermissoesValue
  onChange: (next: PermissoesValue) => void
  /** Marca todos os checkboxes como true e desabilita interação. */
  readOnlyAllTrue?: boolean
  /** Desabilita interação mas mantém valores reais. */
  disabled?: boolean
}

export function PermissoesEditor({
  value,
  onChange,
  readOnlyAllTrue,
  disabled,
}: Props) {
  function toggle(modulo: string, acao: string, checked: boolean) {
    if (readOnlyAllTrue || disabled) return
    const next: PermissoesValue = {
      ...value,
      [modulo]: { ...(value[modulo] ?? {}), [acao]: checked },
    }
    onChange(next)
  }

  function toggleModulo(modulo: string, todasAcoes: string[], checked: boolean) {
    if (readOnlyAllTrue || disabled) return
    const moduloPerms: Record<string, boolean> = {}
    for (const a of todasAcoes) moduloPerms[a] = checked
    onChange({ ...value, [modulo]: moduloPerms })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MODULOS_PERMISSAO.map((mod) => {
        const perms = value[mod.key] ?? {}
        const todasAcoes = mod.acoes.map((a) => a.key)
        const todasMarcadas = readOnlyAllTrue
          ? true
          : todasAcoes.every((a) => perms[a])
        const algumaMarcada = readOnlyAllTrue
          ? true
          : todasAcoes.some((a) => perms[a])

        return (
          <Card key={mod.key}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">
                    {mod.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={
                      todasMarcadas
                        ? true
                        : algumaMarcada
                          ? "indeterminate"
                          : false
                    }
                    disabled={readOnlyAllTrue || disabled}
                    onCheckedChange={(c) =>
                      toggleModulo(mod.key, todasAcoes, c === true)
                    }
                  />
                  Tudo
                </label>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {mod.acoes.map((acao) => {
                const checked = readOnlyAllTrue
                  ? true
                  : Boolean(perms[acao.key])
                return (
                  <label
                    key={acao.key}
                    className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted/40"
                    title={acao.hint}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={readOnlyAllTrue || disabled}
                      onCheckedChange={(c) =>
                        toggle(mod.key, acao.key, c === true)
                      }
                    />
                    <span className="flex-1">{acao.label}</span>
                  </label>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

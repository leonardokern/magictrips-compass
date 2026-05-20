"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Tag } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createOrigem, updateOrigem } from "@/app/(dashboard)/origens/actions"

type Empresa = { id: string; nome: string; slug: string }

type ModeProps =
  | { mode: "create" }
  | {
      mode: "edit"
      id: string
      initial: {
        nome: string
        comissoes: Record<string, number> // empresa_id → percentual
      }
    }

type Props = ModeProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresas: Empresa[]
}

type FormState = {
  nome: string
  /** empresa_id → percentual (default 0) */
  comissoes: Record<string, number>
}

export function OrigemFormModal(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [v, setV] = useState<FormState>({ nome: "", comissoes: {} })

  const isCreate = props.mode === "create"

  useEffect(() => {
    if (!props.open) return
    setErrors({})
    if (props.mode === "edit") {
      setV({ nome: props.initial.nome, comissoes: props.initial.comissoes })
    } else {
      const blank: Record<string, number> = {}
      for (const e of props.empresas) blank[e.id] = 0
      setV({ nome: "", comissoes: blank })
    }
  }, [props.open, props.mode, props.empresas])

  function setNome(val: string) {
    setV((s) => ({ ...s, nome: val }))
    if (errors.nome) setErrors((e) => ({ ...e, nome: "" }))
  }
  function setComissao(empresaId: string, val: number) {
    setV((s) => ({ ...s, comissoes: { ...s.comissoes, [empresaId]: val } }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (v.nome.trim().length < 2) {
      setErrors({ nome: "Informe um nome com pelo menos 2 caracteres." })
      return
    }

    const comissoes = props.empresas.map((emp) => ({
      empresa_id: emp.id,
      percentual: Number(v.comissoes[emp.id] ?? 0),
    }))

    startTransition(async () => {
      if (isCreate) {
        const r = await createOrigem({ nome: v.nome.trim(), comissoes })
        if (!r.ok) {
          if (r.fieldErrors) setErrors(r.fieldErrors)
          toast.error(r.error)
          return
        }
        toast.success("Origem criada.")
        props.onOpenChange(false)
        router.refresh()
        return
      }
      const r = await updateOrigem(props.id, {
        nome: v.nome.trim(),
        comissoes,
      })
      if (!r.ok) {
        if (r.fieldErrors) setErrors(r.fieldErrors)
        toast.error(r.error)
        return
      }
      toast.success("Origem atualizada.")
      props.onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(o) => {
        if (!o) setErrors({})
        props.onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-nexus-bright" />
            {isCreate ? "Nova origem de venda" : "Editar origem"}
          </DialogTitle>
          <DialogDescription>
            Defina o nome da origem e o percentual de comissão padrão em cada
            empresa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
              <Tag className="h-3.5 w-3.5" />
              Nome da origem
            </Label>
            <Input
              value={v.nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Indicação de Sócio, Tráfego Pago"
              maxLength={80}
              required
            />
            {errors.nome && (
              <p className="mt-1 text-[11px] text-destructive">{errors.nome}</p>
            )}
          </div>

          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
              <Building2 className="h-3.5 w-3.5" />
              Comissão padrão por empresa
            </Label>
            <div className="space-y-2">
              {props.empresas.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5"
                >
                  <span className="text-sm text-white/85">{emp.nome}</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={v.comissoes[emp.id] ?? 0}
                      onChange={(e) =>
                        setComissao(emp.id, Number.parseFloat(e.target.value))
                      }
                      className="h-8 w-24 border-white/10 bg-white/[0.04] text-right tabular-nums"
                    />
                    <span className="text-xs text-white/40">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
            >
              {isPending
                ? "Salvando…"
                : isCreate
                  ? "Criar origem"
                  : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

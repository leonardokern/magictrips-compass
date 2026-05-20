"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Hash, Layers } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TIPOS_FORNECEDOR_OPCOES,
  type TipoFornecedor,
} from "@/lib/schemas/fornecedor"
import { formatCnpj, onlyDigits } from "@/lib/utils/formatters"
import {
  createFornecedor,
  updateFornecedor,
} from "@/app/(dashboard)/fornecedores/actions"

type ModeProps =
  | { mode: "create" }
  | {
      mode: "edit"
      id: string
      initial: {
        nome: string
        cnpj: string
        tipo: TipoFornecedor | null
      }
    }

type Props = ModeProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormState = {
  nome: string
  cnpj: string
  tipo: TipoFornecedor | ""
}

const EMPTY: FormState = { nome: "", cnpj: "", tipo: "" }

export function FornecedorFormModal(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [v, setV] = useState<FormState>(EMPTY)

  const isCreate = props.mode === "create"

  useEffect(() => {
    if (!props.open) return
    setErrors({})
    if (props.mode === "edit") {
      setV({
        nome: props.initial.nome,
        cnpj: props.initial.cnpj,
        tipo: props.initial.tipo ?? "",
      })
    } else {
      setV(EMPTY)
    }
  }, [props.open, props.mode])

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const payload = {
      nome: v.nome,
      cnpj: onlyDigits(v.cnpj),
      tipo: v.tipo || undefined,
    }

    startTransition(async () => {
      if (isCreate) {
        const r = await createFornecedor(payload)
        if (!r.ok) {
          if (r.fieldErrors) setErrors(r.fieldErrors)
          toast.error(r.error)
          return
        }
        toast.success("Fornecedor criado.")
        props.onOpenChange(false)
        router.refresh()
        return
      }
      const r = await updateFornecedor(props.id, payload)
      if (!r.ok) {
        if (r.fieldErrors) setErrors(r.fieldErrors)
        toast.error(r.error)
        return
      }
      toast.success("Fornecedor atualizado.")
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-nexus-bright" />
            {isCreate ? "Novo fornecedor" : "Editar fornecedor"}
          </DialogTitle>
          <DialogDescription>
            Cadastre o fornecedor com CNPJ único para usar nas vendas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Nome"
            icon={<Building2 className="h-3.5 w-3.5" />}
            error={errors.nome}
          >
            <Input
              value={v.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="ex: OTT Viagens"
              required
            />
          </Field>

          <Field
            label="CNPJ"
            icon={<Hash className="h-3.5 w-3.5" />}
            error={errors.cnpj}
          >
            <Input
              value={formatCnpj(v.cnpj)}
              onChange={(e) => update("cnpj", e.target.value)}
              maxLength={18}
              placeholder="00.000.000/0000-00"
              className="font-mono"
              required
            />
          </Field>

          <Field
            label="Tipo"
            icon={<Layers className="h-3.5 w-3.5" />}
            error={errors.tipo}
          >
            <Select
              value={v.tipo || undefined}
              onValueChange={(val) => update("tipo", val as TipoFornecedor)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_FORNECEDOR_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

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
                  ? "Criar fornecedor"
                  : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
        {icon}
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

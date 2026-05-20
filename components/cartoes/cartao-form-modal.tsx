"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  CalendarClock,
  CreditCard,
  Landmark,
  UserCog,
} from "lucide-react"
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
  createCartao,
  updateCartao,
} from "@/app/(dashboard)/cartoes/actions"

type Empresa = { id: string; nome: string }
type Usuario = { id: string; nome: string }

type ModeProps =
  | { mode: "create" }
  | {
      mode: "edit"
      id: string
      initial: {
        nome: string
        banco: string | null
        empresa_id: string
        usuario_id: string
        dia_vencimento: number
        dia_fechamento: number | null
      }
    }

type Props = ModeProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresas: Empresa[]
  usuarios: Usuario[]
}

type FormState = {
  nome: string
  banco: string
  empresa_id: string
  usuario_id: string
  dia_vencimento: string
  dia_fechamento: string
}

const EMPTY: FormState = {
  nome: "",
  banco: "",
  empresa_id: "",
  usuario_id: "",
  dia_vencimento: "",
  dia_fechamento: "",
}

export function CartaoFormModal(props: Props) {
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
        banco: props.initial.banco ?? "",
        empresa_id: props.initial.empresa_id,
        usuario_id: props.initial.usuario_id,
        dia_vencimento: String(props.initial.dia_vencimento),
        dia_fechamento: props.initial.dia_fechamento
          ? String(props.initial.dia_fechamento)
          : "",
      })
    } else {
      setV({
        ...EMPTY,
        empresa_id: props.empresas.length === 1 ? props.empresas[0]!.id : "",
      })
    }
  }, [props.open, props.mode, props.empresas])

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const dia_vencimento = Number.parseInt(v.dia_vencimento, 10)
    const dia_fechamento = v.dia_fechamento
      ? Number.parseInt(v.dia_fechamento, 10)
      : null

    const payload = {
      nome: v.nome.trim(),
      banco: v.banco.trim() || null,
      empresa_id: v.empresa_id,
      usuario_id: v.usuario_id,
      dia_vencimento,
      dia_fechamento,
    }

    startTransition(async () => {
      const r = isCreate
        ? await createCartao(payload)
        : await updateCartao(props.id, payload)
      if (!r.ok) {
        if (r.fieldErrors) setErrors(r.fieldErrors)
        toast.error(r.error)
        return
      }
      toast.success(isCreate ? "Cartão criado." : "Cartão atualizado.")
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
            <CreditCard className="h-4 w-4 text-nexus-bright" />
            {isCreate ? "Novo cartão" : "Editar cartão"}
          </DialogTitle>
          <DialogDescription>
            Cartão da agência usado pra pagar fornecedores. Define o
            responsável e o ciclo de fechamento/vencimento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Apelido do cartão"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            error={errors.nome}
          >
            <Input
              value={v.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="Ex: Itaú Final 1234"
              maxLength={60}
              required
            />
          </Field>

          <Field
            label="Banco"
            icon={<Landmark className="h-3.5 w-3.5" />}
            error={errors.banco}
            hint="Opcional."
          >
            <Input
              value={v.banco}
              onChange={(e) => update("banco", e.target.value)}
              placeholder="Ex: Itaú, Nubank, Santander"
              maxLength={60}
            />
          </Field>

          <Field
            label="Empresa"
            icon={<Building2 className="h-3.5 w-3.5" />}
            error={errors.empresa_id}
          >
            <Select
              value={v.empresa_id || undefined}
              onValueChange={(val) => update("empresa_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {props.empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Usuário responsável"
            icon={<UserCog className="h-3.5 w-3.5" />}
            error={errors.usuario_id}
          >
            <Select
              value={v.usuario_id || undefined}
              onValueChange={(val) => update("usuario_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {props.usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Dia de vencimento"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              error={errors.dia_vencimento}
              hint="1 a 31"
            >
              <Input
                type="number"
                min={1}
                max={31}
                value={v.dia_vencimento}
                onChange={(e) => update("dia_vencimento", e.target.value)}
                placeholder="Ex: 10"
                required
              />
            </Field>
            <Field
              label="Dia de fechamento (opcional)"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              error={errors.dia_fechamento}
              hint="Quando a fatura fecha"
            >
              <Input
                type="number"
                min={1}
                max={31}
                value={v.dia_fechamento}
                onChange={(e) => update("dia_fechamento", e.target.value)}
                placeholder="Ex: 3"
              />
            </Field>
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
                  ? "Criar cartão"
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
  hint,
  children,
}: {
  label: string
  icon?: React.ReactNode
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
        {icon}
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-white/40">{hint}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, MapPin, StickyNote, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { ORIGENS_CLIENTE, type ClienteFormValues } from "@/lib/schemas/cliente"
import {
  createCliente,
  updateCliente,
  lookupClientePorCpf,
  type ActionResult,
} from "@/app/(dashboard)/clientes/actions"
import {
  formatCpf,
  formatTelefone,
  onlyDigits,
} from "@/lib/utils/formatters"

type Empresa = { id: string; nome: string }

type ModeProps =
  | { mode: "create" }
  | {
      mode: "edit"
      id: string
      initial: Partial<ClienteFormValues>
    }

type Props = ModeProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresas: Empresa[]
  /** Pré-seleciona empresa (usado quando usuário tem 1 empresa). */
  defaultEmpresaId?: string
  /** Bloqueia o select de empresa (não-Admin). */
  lockEmpresa?: boolean
}

type FormState = ClienteFormValues

const EMPTY: FormState = {
  empresa_id: "",
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  data_nascimento: "",
  endereco: {},
  origem: "",
  tipo: "regular",
  dia_faturamento: undefined,
  status: "lead",
  observacoes: "",
}

export function ClienteFormModal(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateAlert, setDuplicateAlert] = useState<{
    id: string
    nome: string
  } | null>(null)
  const [v, setV] = useState<FormState>(EMPTY)

  const isCreate = props.mode === "create"

  useEffect(() => {
    if (!props.open) return
    setErrors({})
    setDuplicateAlert(null)
    if (props.mode === "edit") {
      setV({
        ...EMPTY,
        empresa_id: props.defaultEmpresaId ?? "",
        ...props.initial,
      })
    } else {
      setV({ ...EMPTY, empresa_id: props.defaultEmpresaId ?? "" })
    }
  }, [props.open, props.mode, props.defaultEmpresaId])

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }))
  }

  async function checkCpfDuplicado() {
    if (!isCreate) return
    if (!v.empresa_id) return
    const cpfLimpo = onlyDigits(v.cpf)
    if (cpfLimpo.length !== 11) {
      setDuplicateAlert(null)
      return
    }
    const found = await lookupClientePorCpf(v.empresa_id, cpfLimpo)
    setDuplicateAlert(found)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    startTransition(async () => {
      const payload = {
        ...v,
        cpf: onlyDigits(v.cpf),
        telefone: onlyDigits(v.telefone),
        dia_faturamento:
          v.tipo === "faturado" && v.dia_faturamento
            ? Number(v.dia_faturamento)
            : undefined,
      }

      const result: ActionResult<{ id: string }> = isCreate
        ? await createCliente(payload)
        : await updateCliente(props.id, payload).then((r) =>
            r.ok ? { ok: true } : r,
          )

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors)
        toast.error(result.error)
        return
      }

      toast.success(
        isCreate ? "Cliente criado." : "Cliente atualizado.",
      )
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-nexus-bright" />
            {isCreate ? "Novo cliente" : "Editar cliente"}
          </DialogTitle>
          <DialogDescription>
            Cadastro do cliente — usado nas vendas e ciclos de faturamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Dados principais */}
          <Section icon={<User className="h-3.5 w-3.5" />} title="Dados principais">
            <div className="grid gap-4 sm:grid-cols-2">
              {!props.lockEmpresa && (
                <Field label="Empresa *" error={errors.empresa_id}>
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
              )}

              <Field
                label="Nome *"
                error={errors.nome}
                className="sm:col-span-2"
              >
                <Input
                  value={v.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  required
                />
              </Field>

              <Field label="CPF *" error={errors.cpf}>
                <Input
                  value={formatCpf(v.cpf)}
                  onChange={(e) => update("cpf", e.target.value)}
                  onBlur={checkCpfDuplicado}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                {duplicateAlert && isCreate && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    Já existe cliente com este CPF:{" "}
                    <a
                      href={`/clientes/${duplicateAlert.id}`}
                      className="font-medium underline"
                    >
                      {duplicateAlert.nome}
                    </a>
                  </p>
                )}
              </Field>

              <Field label="Data de nascimento" error={errors.data_nascimento}>
                <Input
                  type="date"
                  value={v.data_nascimento ?? ""}
                  onChange={(e) => update("data_nascimento", e.target.value)}
                />
              </Field>

              <Field label="E-mail *" error={errors.email}>
                <Input
                  type="email"
                  value={v.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                />
              </Field>

              <Field label="Telefone *" error={errors.telefone}>
                <Input
                  value={formatTelefone(v.telefone)}
                  onChange={(e) => update("telefone", e.target.value)}
                  placeholder="(11) 91234-5678"
                  maxLength={15}
                  required
                />
              </Field>
            </div>
          </Section>

          {/* Classificação */}
          <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Classificação">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tipo *" error={errors.tipo}>
                <Select
                  value={v.tipo}
                  onValueChange={(val) =>
                    update("tipo", val as "regular" | "faturado")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="faturado">Faturado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {v.tipo === "faturado" && (
                <Field
                  label="Dia de faturamento *"
                  error={errors.dia_faturamento}
                  hint="Dia do mês em que a fatura fecha"
                >
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={(v.dia_faturamento as number | undefined) ?? ""}
                    onChange={(e) =>
                      update(
                        "dia_faturamento",
                        e.target.value
                          ? (Number(e.target.value) as never)
                          : (undefined as never),
                      )
                    }
                    placeholder="20"
                  />
                </Field>
              )}

              <Field label="Status *" error={errors.status}>
                <Select
                  value={v.status}
                  onValueChange={(val) =>
                    update("status", val as "lead" | "ativo" | "inativo")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Origem" error={errors.origem}>
                <Select
                  value={v.origem || undefined}
                  onValueChange={(val) => update("origem", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_CLIENTE.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Endereço */}
          <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Endereço">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="CEP">
                <Input
                  value={v.endereco?.cep ?? ""}
                  onChange={(e) =>
                    update("endereco", { ...v.endereco, cep: e.target.value })
                  }
                  placeholder="00000-000"
                  maxLength={9}
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={v.endereco?.cidade ?? ""}
                  onChange={(e) =>
                    update("endereco", {
                      ...v.endereco,
                      cidade: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="UF">
                <Input
                  value={v.endereco?.estado ?? ""}
                  maxLength={2}
                  onChange={(e) =>
                    update("endereco", {
                      ...v.endereco,
                      estado: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SP"
                />
              </Field>
              <Field label="Rua" className="sm:col-span-2">
                <Input
                  value={v.endereco?.rua ?? ""}
                  onChange={(e) =>
                    update("endereco", { ...v.endereco, rua: e.target.value })
                  }
                />
              </Field>
              <Field label="Número">
                <Input
                  value={v.endereco?.numero ?? ""}
                  onChange={(e) =>
                    update("endereco", {
                      ...v.endereco,
                      numero: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Complemento" className="sm:col-span-2">
                <Input
                  value={v.endereco?.complemento ?? ""}
                  onChange={(e) =>
                    update("endereco", {
                      ...v.endereco,
                      complemento: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Bairro">
                <Input
                  value={v.endereco?.bairro ?? ""}
                  onChange={(e) =>
                    update("endereco", {
                      ...v.endereco,
                      bairro: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </Section>

          {/* Observações */}
          <Section icon={<StickyNote className="h-3.5 w-3.5" />} title="Observações">
            <Textarea
              value={v.observacoes ?? ""}
              onChange={(e) => update("observacoes", e.target.value)}
              rows={3}
              placeholder="Anotações internas, preferências, restrições..."
            />
          </Section>

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
              {isPending ? "Salvando…" : isCreate ? "Criar cliente" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-[11px] font-medium text-white/70">
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

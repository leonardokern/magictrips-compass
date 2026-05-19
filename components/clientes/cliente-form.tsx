"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ORIGENS_CLIENTE,
  type ClienteFormValues,
} from "@/lib/schemas/cliente"
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

type Props = {
  mode: "create" | "edit"
  empresas: Empresa[]
  defaultEmpresaId?: string  // pré-selecionada (única empresa do usuário)
  lockEmpresa?: boolean      // não-Admin não troca empresa
  initial?: Partial<ClienteFormValues> & { id?: string }
}

type FormState = ClienteFormValues & { id?: string }

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

export function ClienteForm({
  mode,
  empresas,
  defaultEmpresaId,
  lockEmpresa,
  initial,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateAlert, setDuplicateAlert] = useState<{
    id: string
    nome: string
  } | null>(null)

  const [v, setV] = useState<FormState>({
    ...EMPTY,
    empresa_id: defaultEmpresaId ?? "",
    ...initial,
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setV((s) => ({ ...s, [key]: value }))
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: "" }))
    }
  }

  async function checkCpfDuplicado() {
    if (mode !== "create") return
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

      const result: ActionResult<{ id: string }> =
        mode === "create"
          ? await createCliente(payload)
          : await updateCliente(initial?.id ?? "", payload).then((r) =>
              r.ok ? { ok: true } : r,
            )

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors)
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "create"
          ? "Cliente criado com sucesso."
          : "Cliente atualizado com sucesso.",
      )

      if (mode === "create" && "data" in result && result.data?.id) {
        router.push(`/clientes/${result.data.id}`)
      } else if (mode === "edit" && initial?.id) {
        router.push(`/clientes/${initial.id}`)
      } else {
        router.push("/clientes")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados principais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!lockEmpresa && (
            <Field label="Empresa *" error={errors.empresa_id}>
              <Select
                value={v.empresa_id || undefined}
                onValueChange={(val) => update("empresa_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Nome *" error={errors.nome} className="md:col-span-2">
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
            {duplicateAlert && mode === "create" && (
              <p className="mt-1 text-xs text-amber-700">
                Já existe um cliente com este CPF:{" "}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Tipo *" error={errors.tipo}>
            <Select
              value={v.tipo}
              onValueChange={(val) => update("tipo", val as "regular" | "faturado")}
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
              hint="Dia do mês em que a fatura fecha (padrão 20)"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="CEP" className="md:col-span-1">
            <Input
              value={v.endereco?.cep ?? ""}
              onChange={(e) =>
                update("endereco", { ...v.endereco, cep: e.target.value })
              }
              placeholder="00000-000"
              maxLength={9}
            />
          </Field>
          <Field label="Cidade" className="md:col-span-1">
            <Input
              value={v.endereco?.cidade ?? ""}
              onChange={(e) =>
                update("endereco", { ...v.endereco, cidade: e.target.value })
              }
            />
          </Field>
          <Field label="UF" className="md:col-span-1">
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
          <Field label="Rua" className="md:col-span-2">
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
                update("endereco", { ...v.endereco, numero: e.target.value })
              }
            />
          </Field>
          <Field label="Complemento" className="md:col-span-2">
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
                update("endereco", { ...v.endereco, bairro: e.target.value })
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={v.observacoes ?? ""}
            onChange={(e) => update("observacoes", e.target.value)}
            rows={4}
            placeholder="Anotações internas, preferências, restrições..."
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : mode === "create"
              ? "Criar cliente"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
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
    <div className={className ? className : ""}>
      <Label className="mb-1.5 block text-xs font-medium">{label}</Label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

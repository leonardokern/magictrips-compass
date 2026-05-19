"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, ShieldCheck, User2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
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
import { SenhaProvisoriaDialog } from "./senha-provisoria-dialog"
import { derivarIniciais } from "@/lib/utils/password"
import {
  createUsuario,
  updateUsuario,
} from "@/app/(dashboard)/usuarios/actions"

type Perfil = { id: string; nome: string }
type Empresa = { id: string; nome: string }

type ModeProps =
  | {
      mode: "create"
    }
  | {
      mode: "edit"
      id: string
      initial: {
        nome: string
        email: string
        iniciais: string | null
        perfil_id: string
        empresa_id: string | null
      }
    }

type Props = ModeProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfis: Perfil[]
  empresas: Empresa[]
  /** Callback após sucesso (criar ou editar). */
  onSuccess?: (id: string) => void
}

type FormState = {
  nome: string
  email: string
  iniciais: string
  iniciaisManual: boolean
  perfil_id: string
  empresa_id: string | null
}

const EMPTY: FormState = {
  nome: "",
  email: "",
  iniciais: "",
  iniciaisManual: false,
  perfil_id: "",
  empresa_id: null,
}

export function UsuarioFormModal(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [senhaProv, setSenhaProv] = useState<{ senha: string; nome: string } | null>(null)
  const [v, setV] = useState<FormState>(EMPTY)

  const isCreate = props.mode === "create"

  // Sincroniza initial quando o modal abre (em edit)
  useEffect(() => {
    if (!props.open) return
    if (props.mode === "edit") {
      setV({
        nome: props.initial.nome,
        email: props.initial.email,
        iniciais: props.initial.iniciais ?? "",
        iniciaisManual: Boolean(props.initial.iniciais),
        perfil_id: props.initial.perfil_id,
        empresa_id: props.initial.empresa_id,
      })
    } else {
      setV(EMPTY)
    }
    setErrors({})
  }, [props.open, props.mode, isCreate])

  // perfil selecionado → controla obrigatoriedade de empresa
  const perfilSelecionado = useMemo(
    () => props.perfis.find((p) => p.id === v.perfil_id),
    [props.perfis, v.perfil_id],
  )
  const ehAdmin = perfilSelecionado?.nome === "Administrador"

  const iniciaisDisplay = v.iniciaisManual
    ? v.iniciais
    : v.iniciais || derivarIniciais(v.nome)

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((s) => ({ ...s, [k]: val }))
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    startTransition(async () => {
      const payload = {
        nome: v.nome,
        email: v.email,
        perfil_id: v.perfil_id,
        empresa_id: ehAdmin ? null : v.empresa_id,
        iniciais: iniciaisDisplay,
      }

      if (isCreate) {
        const r = await createUsuario(payload)
        if (!r.ok) {
          if (r.fieldErrors) setErrors(r.fieldErrors)
          toast.error(r.error)
          return
        }
        if (r.data) {
          setSenhaProv({ senha: r.data.senhaProvisoria, nome: payload.nome })
          props.onSuccess?.(r.data.id)
        }
        return
      }

      // edit
      const r = await updateUsuario(props.id, payload)
      if (!r.ok) {
        if (r.fieldErrors) setErrors(r.fieldErrors)
        toast.error(r.error)
        return
      }
      toast.success("Usuário atualizado.")
      props.onOpenChange(false)
      props.onSuccess?.(props.id)
      router.refresh()
    })
  }

  return (
    <>
      <Dialog
        open={props.open && !senhaProv}
        onOpenChange={(o) => {
          if (!o) setErrors({})
          props.onOpenChange(o)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {isCreate ? (
                <>
                  <User2 className="h-4 w-4 text-indigo-400" />
                  Novo usuário
                </>
              ) : (
                <>
                  <User2 className="h-4 w-4 text-indigo-400" />
                  Editar usuário
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? "Uma senha provisória será gerada após criar. O usuário trocará no primeiro acesso."
                : "Atualize os dados de acesso. E-mail e senha são alterados separadamente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Preview do avatar + nome */}
            <div className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/15 text-sm font-semibold text-indigo-300">
                {iniciaisDisplay || "—"}
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  value={v.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  placeholder="Nome completo"
                  className="border-white/10 bg-white/[0.04] placeholder:text-white/30"
                  required
                />
                {errors.nome && (
                  <p className="text-xs text-destructive">{errors.nome}</p>
                )}
              </div>
            </div>

            {/* E-mail (só create — edit não permite mudar) */}
            <Field
              label="E-mail"
              icon={<Mail className="h-3.5 w-3.5" />}
              error={errors.email}
            >
              <Input
                type="email"
                value={v.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={!isCreate}
                placeholder="usuario@magictrips.com.br"
                required
              />
              {!isCreate && (
                <p className="mt-1 text-[11px] text-white/40">
                  E-mail não é editável após criação.
                </p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {/* Perfil */}
              <Field
                label="Perfil"
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                error={errors.perfil_id}
              >
                <Select
                  value={v.perfil_id || undefined}
                  onValueChange={(val) => update("perfil_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.perfis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Empresa */}
              <Field
                label="Empresa"
                icon={<Building2 className="h-3.5 w-3.5" />}
                error={errors.empresa_id}
                hint={ehAdmin ? "Acessa todas" : undefined}
              >
                <Select
                  value={v.empresa_id ?? (ehAdmin ? "todas" : undefined)}
                  onValueChange={(val) =>
                    update("empresa_id", val === "todas" ? null : val)
                  }
                  disabled={ehAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ehAdmin && <SelectItem value="todas">Todas</SelectItem>}
                    {props.empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Iniciais */}
            <Field label="Iniciais" hint="Auto-derivadas do nome. Override opcional.">
              <Input
                value={iniciaisDisplay}
                onChange={(e) => {
                  setV((s) => ({
                    ...s,
                    iniciaisManual: true,
                    iniciais: e.target.value.toUpperCase(),
                  }))
                }}
                maxLength={4}
                placeholder="MM"
                className="w-24 text-center font-mono font-semibold tabular-nums"
              />
            </Field>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button" disabled={isPending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-500 text-white hover:bg-indigo-400"
              >
                {isPending
                  ? "Salvando..."
                  : isCreate
                    ? "Criar usuário"
                    : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {senhaProv && (
        <SenhaProvisoriaDialog
          open
          onClose={() => {
            setSenhaProv(null)
            props.onOpenChange(false)
            router.refresh()
          }}
          senha={senhaProv.senha}
          contexto="criar"
          nome={senhaProv.nome}
        />
      )}
    </>
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

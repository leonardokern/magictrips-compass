"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Percent, Power, ShieldCheck, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { PerfilFormModal } from "./perfil-form-modal"
import { togglePerfilAtivo } from "@/app/(dashboard)/perfis/actions"
import type { PerfilTipo, PermissoesValue } from "@/lib/schemas/perfil"
import { cn } from "@/lib/utils"

type Empresa = { id: string; nome: string; slug: string }

type Props = {
  perfil: {
    id: string
    nome: string
    tipo: PerfilTipo
    empresa_id: string | null
    permissoes: PermissoesValue
    ativo: boolean
    comissoes: Record<string, number>
  }
  empresas: Empresa[]
  usuariosCount: number
  podeEditar: boolean
}

export function PerfilRowActions({
  perfil,
  empresas,
  usuariosCount,
  podeEditar,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1)
  const [isPending, startTransition] = useTransition()

  const isAdmin = perfil.nome === "Administrador"
  const podeInativar = usuariosCount === 0
  const toggleDisabled =
    isPending || isAdmin || (perfil.ativo && !podeInativar)

  function abrirEditar(step: 1 | 2 | 3 = 1) {
    setModalStep(step)
    setOpen(true)
  }

  function onToggle() {
    const novoAtivo = !perfil.ativo
    startTransition(async () => {
      const r = await togglePerfilAtivo(perfil.id, novoAtivo)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(novoAtivo ? "Perfil ativado." : "Perfil inativado.")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {podeEditar && !isAdmin && (
        <>
          <IconAction
            icon={Pencil}
            label="Editar"
            onClick={() => abrirEditar(1)}
            tone="bright"
          />
          <IconAction
            icon={ShieldCheck}
            label="Permissões"
            onClick={() => abrirEditar(2)}
            tone="bright"
          />
          {perfil.tipo === "agente" && (
            <IconAction
              icon={Percent}
              label="Comissões"
              onClick={() => abrirEditar(3)}
              tone="bright"
            />
          )}
          <IconAction
            icon={Power}
            label={
              perfil.ativo
                ? podeInativar
                  ? "Inativar"
                  : `Existem ${usuariosCount} usuário(s) — não dá pra inativar`
                : "Ativar"
            }
            onClick={onToggle}
            disabled={toggleDisabled}
            tone={perfil.ativo ? "amber" : "emerald"}
          />
        </>
      )}

      <PerfilFormModal
        mode="edit"
        id={perfil.id}
        initial={{
          nome: perfil.nome,
          tipo: perfil.tipo,
          empresa_id: perfil.empresa_id,
          permissoes: perfil.permissoes,
          comissoes: perfil.comissoes,
        }}
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
        initialStep={modalStep}
      />
    </div>
  )
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone: "neutral" | "bright" | "amber" | "emerald" | "rose"
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: "text-white/60 hover:bg-white/[0.06] hover:text-white",
    bright:
      "text-nexus-bright/80 hover:bg-nexus-bright/10 hover:text-nexus-bright",
    amber: "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200",
    emerald:
      "text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-200",
    rose: "text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30",
        toneClass[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

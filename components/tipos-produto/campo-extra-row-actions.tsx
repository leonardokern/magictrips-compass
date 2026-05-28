"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Power, Trash2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { LoaderButton } from "@/components/ui/loader-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CampoExtraFormModal } from "./campo-extra-form-modal"
import {
  deleteCampoExtra,
  toggleCampoExtraAtivo,
} from "@/app/(dashboard)/tipos-produto/actions"
import { cn } from "@/lib/utils"
import { IconTooltip } from "@/components/ui/tooltip"
import type { CampoOpcao, TipoCampo } from "@/lib/schemas/tipo-produto"

type Props = {
  campo: {
    id: string
    nome: string
    tipo_campo: TipoCampo
    placeholder: string | null
    ativo: boolean
    opcoes: CampoOpcao[]
  }
  podeEditar: boolean
  podeExcluir: boolean
  /** Callback após qualquer mutação (criar/editar/inativar/excluir). */
  onSuccess?: () => void
}

export function CampoExtraRowActions({
  campo,
  podeEditar,
  podeExcluir,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onToggle() {
    const novoAtivo = !campo.ativo
    startTransition(async () => {
      const r = await toggleCampoExtraAtivo(campo.id, novoAtivo)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(novoAtivo ? "Campo ativado." : "Campo inativado.")
      router.refresh()
      onSuccess?.()
    })
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteCampoExtra(campo.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Campo excluído.")
      setConfirmOpen(false)
      router.refresh()
      onSuccess?.()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {podeEditar && (
        <>
          <IconAction
            icon={Pencil}
            label="Editar"
            onClick={() => setEditOpen(true)}
            tone="bright"
          />
          <IconAction
            icon={Power}
            label={campo.ativo ? "Inativar" : "Ativar"}
            onClick={onToggle}
            disabled={isPending}
            tone={campo.ativo ? "amber" : "emerald"}
          />
        </>
      )}

      {podeExcluir && (
        <IconAction
          icon={Trash2}
          label="Remover"
          onClick={() => setConfirmOpen(true)}
          tone="rose"
        />
      )}

      <CampoExtraFormModal
        mode="edit"
        id={campo.id}
        initial={{
          nome: campo.nome,
          tipo_campo: campo.tipo_campo,
          placeholder: campo.placeholder,
          opcoes: campo.opcoes,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onSuccess}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir campo?</DialogTitle>
            <DialogDescription>
              Isso remove <strong>{campo.nome}</strong> e suas opções. Não dá
              pra excluir se ele estiver vinculado a algum tipo de produto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <LoaderButton
              variant="destructive"
              onClick={onDelete}
              loading={isPending}
            >
              Excluir
            </LoaderButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Icon button ─────────────────────────────────────────────────────────────

type Tone = "neutral" | "bright" | "amber" | "emerald" | "rose"

type IconActionProps = {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone: Tone
}

function IconAction({ icon: Icon, label, onClick, disabled, tone }: IconActionProps) {
  const toneClass: Record<Tone, string> = {
    neutral:
      "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
    bright:
      "border-nexus-bright/25 bg-nexus-bright/[0.08] text-nexus-bright hover:border-nexus-bright/50 hover:bg-nexus-bright/15",
    amber:
      "border-amber-500/25 bg-amber-500/[0.08] text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/15 hover:text-amber-200",
    emerald:
      "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/15 hover:text-emerald-200",
    rose:
      "border-rose-500/25 bg-rose-500/[0.08] text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-200",
  }
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          toneClass[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    </IconTooltip>
  )
}

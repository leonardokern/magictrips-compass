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
import { TipoProdutoFormModal } from "./tipo-produto-form-modal"
import {
  deleteTipoProduto,
  toggleTipoProdutoAtivo,
} from "@/app/(dashboard)/tipos-produto/actions"
import type {
  TipoCampo,
  TipoProdutoVinculoCampo,
} from "@/lib/schemas/tipo-produto"
import { cn } from "@/lib/utils"

type CampoExtra = { id: string; nome: string; tipo_campo: TipoCampo }

type Props = {
  tipo: {
    id: string
    nome: string
    ativo: boolean
    icone: string | null
    campos: TipoProdutoVinculoCampo[]
  }
  camposDisponiveis: CampoExtra[]
  podeEditar: boolean
  podeExcluir: boolean
}

export function TipoProdutoRowActions({
  tipo,
  camposDisponiveis,
  podeEditar,
  podeExcluir,
}: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onToggle() {
    const novoAtivo = !tipo.ativo
    startTransition(async () => {
      const r = await toggleTipoProdutoAtivo(tipo.id, novoAtivo)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(novoAtivo ? "Tipo ativado." : "Tipo inativado.")
      router.refresh()
    })
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteTipoProduto(tipo.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Tipo excluído.")
      setConfirmOpen(false)
      router.refresh()
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
            label={tipo.ativo ? "Inativar" : "Ativar"}
            onClick={onToggle}
            disabled={isPending}
            tone={tipo.ativo ? "amber" : "emerald"}
          />
        </>
      )}

      {podeExcluir && (
        <IconAction
          icon={Trash2}
          label="Remover"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          tone="rose"
        />
      )}

      <TipoProdutoFormModal
        mode="edit"
        id={tipo.id}
        initial={{ nome: tipo.nome, icone: tipo.icone, campos: tipo.campos }}
        open={editOpen}
        onOpenChange={setEditOpen}
        camposDisponiveis={camposDisponiveis}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tipo?</DialogTitle>
            <DialogDescription>
              Isso remove <strong className="text-white">{tipo.nome}</strong> e
              todos os vínculos com campos. Vendas que já usaram este tipo
              bloqueiam a exclusão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <LoaderButton
              onClick={onDelete}
              loading={isPending}
              className="bg-rose-500 text-white hover:bg-rose-500/90"
            >
              Excluir
            </LoaderButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Icon action (padrão Nexus) ────────────────────────────────────────────

type Tone = "neutral" | "bright" | "amber" | "emerald" | "rose"

type IconActionProps = {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone: Tone
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: IconActionProps) {
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        toneClass[tone],
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

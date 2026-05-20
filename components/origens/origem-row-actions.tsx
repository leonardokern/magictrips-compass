"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OrigemFormModal } from "./origem-form-modal"
import { deleteOrigem } from "@/app/(dashboard)/origens/actions"

type Empresa = { id: string; nome: string; slug: string }

type Props = {
  origem: {
    id: string
    nome: string
    comissoes: Record<string, number>
  }
  empresas: Empresa[]
}

export function OrigemRowActions({ origem, empresas }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onConfirmDelete() {
    startTransition(async () => {
      const r = await deleteOrigem(origem.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Origem excluída.")
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setEditOpen(true)}
        className="h-8 px-2 text-xs text-white/75 hover:bg-white/[0.05] hover:text-white"
      >
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Editar
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirmOpen(true)}
        className="h-8 px-2 text-xs text-rose-300/85 hover:bg-rose-500/10 hover:text-rose-200"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Remover
      </Button>

      <OrigemFormModal
        mode="edit"
        id={origem.id}
        initial={{ nome: origem.nome, comissoes: origem.comissoes }}
        open={editOpen}
        onOpenChange={setEditOpen}
        empresas={empresas}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir origem?</DialogTitle>
            <DialogDescription>
              Isso remove <strong>{origem.nome}</strong> e todas as regras de
              comissão dela em cada empresa, além de overrides em perfis. Não dá
              pra desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isPending}
            >
              {isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

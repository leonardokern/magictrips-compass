"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Power, Trash2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  deleteFornecedor,
  toggleFornecedorAtivo,
} from "@/app/(dashboard)/fornecedores/actions"

type Props = {
  id: string
  nome: string
  ativo: boolean
  permEditar: boolean
  permExcluir: boolean
}

export function FornecedorAcoes({
  id,
  nome,
  ativo,
  permEditar,
  permExcluir,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [toggleDialog, setToggleDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)

  function handleToggle() {
    startTransition(async () => {
      const r = await toggleFornecedorAtivo(id, !ativo)
      setToggleDialog(false)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(ativo ? "Fornecedor desativado." : "Fornecedor ativado.")
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteFornecedor(id)
      if (r && !r.ok) {
        toast.error(r.error)
        setDeleteDialog(false)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {permEditar && (
        <Dialog open={toggleDialog} onOpenChange={setToggleDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
            >
              <Power className="mr-2 h-4 w-4" />
              {ativo ? "Desativar" : "Ativar"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {ativo ? "Desativar" : "Ativar"} {nome}
              </DialogTitle>
              <DialogDescription>
                {ativo
                  ? "Fornecedor desativado não aparece nos dropdowns de novas vendas. Vendas existentes permanecem intactas."
                  : "Reativa o fornecedor, voltando a aparecer nos dropdowns de venda."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handleToggle}
                className={
                  ativo
                    ? "bg-amber-500 text-white hover:bg-amber-400"
                    : "bg-emerald-500 text-white hover:bg-emerald-400"
                }
              >
                {ativo ? "Desativar" : "Ativar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {permExcluir && (
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir {nome}</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. Se este fornecedor estiver
                vinculado a alguma venda, a exclusão será bloqueada — desative-o
                em vez disso.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

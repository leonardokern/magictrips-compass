"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Power, Trash2 } from "lucide-react"
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
import { CartaoFormModal } from "./cartao-form-modal"
import {
  deleteCartao,
  toggleCartaoAtivo,
} from "@/app/(dashboard)/cartoes/actions"

type Empresa = { id: string; nome: string }
type Usuario = { id: string; nome: string }

type Props = {
  cartao: {
    id: string
    nome: string
    banco: string | null
    empresa_id: string
    usuario_id: string
    dia_vencimento: number
    dia_fechamento: number | null
    ativo: boolean
  }
  empresas: Empresa[]
  usuarios: Usuario[]
  podeEditar: boolean
  podeExcluir: boolean
}

export function CartaoRowActions({
  cartao,
  empresas,
  usuarios,
  podeEditar,
  podeExcluir,
}: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onToggle() {
    const novoAtivo = !cartao.ativo
    startTransition(async () => {
      const r = await toggleCartaoAtivo(cartao.id, novoAtivo)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(novoAtivo ? "Cartão ativado." : "Cartão inativado.")
      router.refresh()
    })
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteCartao(cartao.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Cartão excluído.")
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {podeEditar && (
        <>
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
            onClick={onToggle}
            disabled={isPending}
            className={
              "h-8 px-2 text-xs " +
              (cartao.ativo
                ? "text-amber-300/85 hover:bg-amber-500/10 hover:text-amber-200"
                : "text-emerald-300/85 hover:bg-emerald-500/10 hover:text-emerald-200")
            }
          >
            <Power className="mr-1 h-3.5 w-3.5" />
            {cartao.ativo ? "Inativar" : "Ativar"}
          </Button>
        </>
      )}

      {podeExcluir && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          className="h-8 px-2 text-xs text-rose-300/85 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Remover
        </Button>
      )}

      <CartaoFormModal
        mode="edit"
        id={cartao.id}
        initial={{
          nome: cartao.nome,
          banco: cartao.banco,
          empresa_id: cartao.empresa_id,
          usuario_id: cartao.usuario_id,
          dia_vencimento: cartao.dia_vencimento,
          dia_fechamento: cartao.dia_fechamento,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        empresas={empresas}
        usuarios={usuarios}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cartão?</DialogTitle>
            <DialogDescription>
              Isso remove <strong>{cartao.nome}</strong>. Não dá pra excluir se
              o cartão já estiver em parcelas a pagar ou venda. Inative em vez
              de excluir nesses casos.
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
              onClick={onDelete}
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

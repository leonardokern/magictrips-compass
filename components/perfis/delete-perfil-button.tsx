"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
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
import { deletePerfil } from "@/app/(dashboard)/perfis/actions"

export function DeletePerfilButton({
  perfilId,
  perfilNome,
}: {
  perfilId: string
  perfilNome: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePerfil(perfilId)
      if (result && !result.ok) {
        toast.error(result.error)
        setOpen(false)
      } else {
        toast.success("Perfil excluído.")
        router.push("/perfis")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir perfil</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o perfil{" "}
            <strong>{perfilNome}</strong>? Esta ação não pode ser desfeita. Se
            existirem usuários atrelados a este perfil, a exclusão será
            bloqueada — mude os usuários de perfil antes.
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
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

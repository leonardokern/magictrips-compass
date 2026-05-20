"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartaoFormModal } from "./cartao-form-modal"

type Empresa = { id: string; nome: string }
type Usuario = { id: string; nome: string }

export function NovoCartaoButton({
  empresas,
  usuarios,
}: {
  empresas: Empresa[]
  usuarios: Usuario[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo cartão
      </Button>
      <CartaoFormModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
        usuarios={usuarios}
      />
    </>
  )
}

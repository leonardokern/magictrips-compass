"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FornecedorFormModal } from "./fornecedor-form-modal"
import type { TipoFornecedor } from "@/lib/schemas/fornecedor"

type Props = {
  id: string
  initial: {
    nome: string
    cnpj: string
    tipo: TipoFornecedor | null
  }
}

export function EditarFornecedorButton({ id, initial }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
      >
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Button>
      <FornecedorFormModal
        mode="edit"
        id={id}
        initial={initial}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

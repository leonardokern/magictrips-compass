"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClienteFormModal } from "./cliente-form-modal"
import type { ClienteFormValues } from "@/lib/schemas/cliente"

type Empresa = { id: string; nome: string }

type Props = {
  id: string
  initial: Partial<ClienteFormValues>
  empresas: Empresa[]
  defaultEmpresaId?: string
  lockEmpresa?: boolean
}

export function EditarClienteButton({
  id,
  initial,
  empresas,
  defaultEmpresaId,
  lockEmpresa,
}: Props) {
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
      <ClienteFormModal
        mode="edit"
        id={id}
        initial={initial}
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
        defaultEmpresaId={defaultEmpresaId}
        lockEmpresa={lockEmpresa}
      />
    </>
  )
}

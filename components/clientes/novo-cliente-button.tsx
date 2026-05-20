"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClienteFormModal } from "./cliente-form-modal"

type Empresa = { id: string; nome: string }

type Props = {
  empresas: Empresa[]
  defaultEmpresaId?: string
  lockEmpresa?: boolean
}

export function NovoClienteButton({
  empresas,
  defaultEmpresaId,
  lockEmpresa,
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo cliente
      </Button>
      <ClienteFormModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
        defaultEmpresaId={defaultEmpresaId}
        lockEmpresa={lockEmpresa}
      />
    </>
  )
}

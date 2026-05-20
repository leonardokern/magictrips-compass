"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PerfilFormModal } from "./perfil-form-modal"
import type { PerfilTipo, PermissoesValue } from "@/lib/schemas/perfil"

type Empresa = { id: string; nome: string; slug: string }

type Props = {
  id: string
  initial: {
    nome: string
    tipo: PerfilTipo
    empresa_id: string | null
    permissoes: PermissoesValue
    comissoes: Record<string, number>
  }
  empresas: Empresa[]
}

export function EditarPerfilButton({ id, initial, empresas }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
      >
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Button>
      <PerfilFormModal
        mode="edit"
        id={id}
        initial={initial}
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
      />
    </>
  )
}

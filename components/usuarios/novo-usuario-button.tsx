"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UsuarioFormModal } from "./usuario-form-modal"

type Perfil = { id: string; nome: string; empresa_id: string | null }
type Empresa = { id: string; nome: string; slug: string }

type Props = {
  perfis: Perfil[]
  empresas: Empresa[]
}

export function NovoUsuarioButton({ perfis, empresas }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo usuário
      </Button>
      <UsuarioFormModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        perfis={perfis}
        empresas={empresas}
      />
    </>
  )
}

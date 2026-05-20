"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TipoProdutoFormModal } from "./tipo-produto-form-modal"
import type { TipoCampo } from "@/lib/schemas/tipo-produto"

type CampoExtra = { id: string; nome: string; tipo_campo: TipoCampo }

export function NovoTipoProdutoButton({
  camposDisponiveis,
}: {
  camposDisponiveis: CampoExtra[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo tipo
      </Button>
      <TipoProdutoFormModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        camposDisponiveis={camposDisponiveis}
      />
    </>
  )
}

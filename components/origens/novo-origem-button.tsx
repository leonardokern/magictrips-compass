"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrigemFormModal } from "./origem-form-modal"

type Empresa = { id: string; nome: string; slug: string }

export function NovoOrigemButton({ empresas }: { empresas: Empresa[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nova origem
      </Button>
      <OrigemFormModal
        mode="create"
        open={open}
        onOpenChange={setOpen}
        empresas={empresas}
      />
    </>
  )
}

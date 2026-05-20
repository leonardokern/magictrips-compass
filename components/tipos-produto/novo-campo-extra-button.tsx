"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CampoExtraFormModal } from "./campo-extra-form-modal"

export function NovoCampoExtraButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo campo
      </Button>
      <CampoExtraFormModal mode="create" open={open} onOpenChange={setOpen} />
    </>
  )
}

"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/app/(dashboard)/actions"

type Props = {
  nome: string
  iniciais: string | null
  email: string
  perfil: string
}

export function UserMenu({ nome, iniciais, email, perfil }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-white">
          {iniciais ?? nome.charAt(0).toUpperCase()}
        </div>
        <div className="hidden flex-col text-xs leading-tight sm:flex">
          <span className="font-medium text-white">{nome}</span>
          <span className="text-white/45">
            {perfil} · {email}
          </span>
        </div>
      </div>

      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          title="Sair"
          className="text-white/60 hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

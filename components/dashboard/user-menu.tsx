"use client"

type Props = {
  nome: string
  iniciais: string | null
  /** Mantido na assinatura por compatibilidade — não é mais exibido. */
  email?: string
  perfil: string
}

export function UserMenu({ nome, iniciais, perfil }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden flex-col items-end text-right text-xs leading-tight sm:flex">
        <span className="font-medium text-white">{nome}</span>
        <span className="mt-1 text-white/45">{perfil}</span>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-white">
        {iniciais ?? nome.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}

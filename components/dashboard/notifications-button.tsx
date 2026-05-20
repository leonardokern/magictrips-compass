"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { dispensarLembrete } from "@/app/(dashboard)/notificacoes/actions"

export type LembreteItem = {
  id: string
  tipo: string
  mensagem: string
  referencia_tipo: string | null
  referencia_id: string | null
  data_lembrete: string
}

type Props = {
  lembretes: LembreteItem[]
}

const TIPO_ICONE: Record<string, React.ReactNode> = {
  venda_pendente_validacao: <ShoppingCart className="h-3.5 w-3.5" />,
}

const TIPO_LABEL: Record<string, string> = {
  venda_pendente_validacao: "Venda aguardando aprovação",
}

export function NotificationsButton({ lembretes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasUnread = lembretes.length > 0

  function abrirReferencia(l: LembreteItem) {
    if (l.referencia_tipo === "venda" && l.referencia_id) {
      // Dispensa o lembrete e navega
      startTransition(async () => {
        await dispensarLembrete(l.id)
        setOpen(false)
        router.push(`/vendas/${l.referencia_id}`)
      })
    }
  }

  function dispensar(l: LembreteItem, e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      await dispensarLembrete(l.id)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Notificações"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white",
        )}
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-card/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <p className="text-sm font-medium text-white">Notificações</p>
              <span className="text-[10px] uppercase tracking-wider text-white/45">
                {lembretes.length}{" "}
                {lembretes.length === 1 ? "pendente" : "pendentes"}
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {lembretes.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-white/45">
                  Nada novo por aqui. Você está em dia.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {lembretes.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => abrirReferencia(l)}
                        disabled={isPending}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-nexus-bright/30 bg-nexus-bright/10 text-nexus-bright">
                          {TIPO_ICONE[l.tipo] ?? <Bell className="h-3.5 w-3.5" />}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {TIPO_LABEL[l.tipo] ?? l.tipo}
                          </p>
                          <p className="mt-0.5 text-xs text-white/55">
                            {l.mensagem}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => dispensar(l, e)}
                          className="shrink-0 text-[10px] uppercase tracking-wider text-white/40 hover:text-white"
                        >
                          ✕
                        </button>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-white/[0.06] px-4 py-2 text-center">
              <Link
                href="/vendas?status=pendente_validacao"
                onClick={() => setOpen(false)}
                className="text-[11px] uppercase tracking-wider text-nexus-bright hover:text-nexus-bright-soft"
              >
                Ver todas as pendências
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

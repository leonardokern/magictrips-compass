"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Busca por ID da venda ou nome do cliente. Atualiza o querystring `?q=`
 * com debounce de 300ms — o server component refaz a fetch automaticamente
 * via Next App Router.
 *
 * Reseta a paginação ao mudar o termo (limpa `?page` do URL).
 */
export function VendasSearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inicial = searchParams.get("q") ?? ""
  const [value, setValue] = useState(inicial)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza quando o querystring mudar por outro caminho (ex: back/forward)
  useEffect(() => {
    setValue(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial])

  function aplicarFiltro(novo: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (novo.trim()) params.set("q", novo.trim())
    else params.delete("q")
    // Sempre volta pra primeira página ao mudar a busca
    params.delete("page")
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  function onChange(novo: string) {
    setValue(novo)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => aplicarFiltro(novo), 300)
  }

  function limpar() {
    setValue("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    aplicarFiltro("")
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-md">
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border bg-white/[0.02] px-3 transition-colors",
          value
            ? "border-nexus-bright/30"
            : "border-white/10 hover:border-white/20 focus-within:border-nexus-bright/40",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-nexus-bright" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-white/45" />
        )}
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault()
              limpar()
            }
          }}
          placeholder="Buscar por ID ou cliente…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
        {value && (
          <button
            type="button"
            onClick={limpar}
            aria-label="Limpar busca"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

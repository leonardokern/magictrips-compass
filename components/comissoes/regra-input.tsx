"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateComissaoRegra } from "@/app/(dashboard)/comissoes/actions"
import { toast } from "sonner"

type Props = {
  id: string
  initialValue: number
  /** Quando true, input é read-only (sem permissão de editar). */
  readOnly?: boolean
  /** Cor do indicador de % (auto-derivada de faixa) */
  accent?: "low" | "mid" | "high"
}

/**
 * Input numérico com auto-save por debounce (800ms).
 * Mostra spinner durante save e check verde após sucesso (sumindo em 1.5s).
 */
export function RegraInput({ id, initialValue, readOnly, accent }: Props) {
  const [value, setValue] = useState<string>(String(initialValue))
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  )
  const [, startTransition] = useTransition()
  const timerRef = useRef<number | undefined>(undefined)

  // Reseta o "saved" depois de um tempo
  useEffect(() => {
    if (status !== "saved") return
    const t = window.setTimeout(() => setStatus("idle"), 1500)
    return () => window.clearTimeout(t)
  }, [status])

  function trigger(newValueStr: string) {
    setValue(newValueStr)
    if (readOnly) return

    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const n = Number(newValueStr)
      if (Number.isNaN(n) || n < 0 || n > 100) {
        setStatus("error")
        toast.error("Valor inválido. Use entre 0 e 100.")
        return
      }
      if (n === initialValue) {
        setStatus("idle")
        return
      }

      setStatus("saving")
      startTransition(async () => {
        const r = await updateComissaoRegra({
          id,
          percentual: n,
          observacao: null,
        })
        if (!r.ok) {
          setStatus("error")
          toast.error(r.error)
        } else {
          setStatus("saved")
        }
      })
    }, 800)
  }

  return (
    <div className="relative w-full">
      <input
        type="number"
        step="0.01"
        min={0}
        max={100}
        value={value}
        onChange={(e) => trigger(e.target.value)}
        readOnly={readOnly}
        className={cn(
          "h-9 w-full rounded-md border bg-white/[0.04] pl-3 pr-14 text-right text-sm font-semibold tabular-nums text-white transition-all",
          "focus:outline-none focus:ring-1",
          status === "saving" && "border-nexus-bright/40 ring-nexus-bright/20",
          status === "saved" && "border-emerald-500/40 ring-emerald-500/20",
          status === "error" && "border-red-500/40 ring-red-500/20",
          status === "idle" && "border-white/10 focus:border-white/30 focus:ring-white/20",
          accent === "high" && status === "idle" && "text-emerald-300",
          accent === "mid" && status === "idle" && "text-amber-300",
          accent === "low" && status === "idle" && "text-sky-300",
          readOnly && "cursor-not-allowed opacity-70",
        )}
      />
      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-white/45">
        {status === "saving" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-nexus-bright" />
        )}
        {status === "saved" && (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        )}
        {status === "idle" && <span>%</span>}
        {status === "error" && <span className="text-red-300">!</span>}
      </div>
    </div>
  )
}

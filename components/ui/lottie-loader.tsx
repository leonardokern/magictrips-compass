"use client"

import { useMemo } from "react"
import Lottie from "lottie-react"
import animationData from "@/lib/lottie/loader.json"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  /** Cor primária no formato HEX. Default = nexus-bright (#1498D5). */
  color?: string
}

/**
 * Animação Lottie reutilizável usada como spinner de carregamento.
 * Recolore todos os fills e strokes do JSON original pra cor da marca.
 */
export function LottieLoader({ className, color = "#1498D5" }: Props) {
  const data = useMemo(() => recolorLottie(animationData, color), [color])
  return (
    <Lottie
      animationData={data}
      loop
      autoplay
      className={cn("h-32 w-32", className)}
    />
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return [r / 255, g / 255, b / 255]
}

/**
 * Lottie codifica fill (ty=fl) e stroke (ty=st) com `c.k = [r,g,b,a]` em valores
 * 0..1. Esta função clona o JSON e substitui todos esses valores pela cor alvo.
 */
function recolorLottie<T>(input: T, hex: string): T {
  const rgb = hexToRgbNorm(hex)
  const clone = JSON.parse(JSON.stringify(input))
  walk(clone, rgb)
  return clone as T
}

function walk(node: unknown, rgb: [number, number, number]): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, rgb)
    return
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>
    if ((obj.ty === "fl" || obj.ty === "st") && obj.c && typeof obj.c === "object") {
      const c = obj.c as { k?: unknown }
      if (Array.isArray(c.k) && c.k.length >= 3 && typeof c.k[0] === "number") {
        const alpha = typeof c.k[3] === "number" ? c.k[3] : 1
        c.k = [rgb[0], rgb[1], rgb[2], alpha]
      }
    }
    for (const key in obj) walk(obj[key], rgb)
  }
}

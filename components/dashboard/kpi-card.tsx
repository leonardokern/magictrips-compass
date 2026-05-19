import { cn } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

type Props = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: LucideIcon
  href?: string
  accent?: "nexus" | "emerald" | "violet" | "amber" | "sky"
  /** True quando o valor é placeholder/em-construção — exibe texto "Em breve". */
  empty?: boolean
}

const ACCENT_STYLES: Record<NonNullable<Props["accent"]>, string> = {
  nexus: "border-nexus-bright/35 bg-nexus-bright/10 text-nexus-bright",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-300",
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = "nexus",
  empty,
}: Props) {
  const baseClass = cn(
    "group relative flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all",
    href && "hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04]",
  )

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-white/45">
          {label}
        </p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            ACCENT_STYLES[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-1">
        {empty ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/60">
            Em breve
          </span>
        ) : (
          <p className="text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        )}
        {hint && <p className="text-xs text-white/45">{hint}</p>}
      </div>

      {href && (
        <ArrowUpRight className="absolute right-5 bottom-5 h-4 w-4 text-white/30 transition-all group-hover:text-white/70" />
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {inner}
      </Link>
    )
  }
  return <div className={baseClass}>{inner}</div>
}

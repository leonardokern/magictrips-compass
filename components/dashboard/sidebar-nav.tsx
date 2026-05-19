"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NavItem = {
  href: string
  label: string
  icon: string
}

export type NavSection = {
  label: string
  items: NavItem[]
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  vendas: ShoppingCart,
  clientes: Users,
  receber: Wallet,
  pagar: Receipt,
  caixa: TrendingUp,
  faturados: Building2,
  cartoes: CreditCard,
  fornecedores: Package,
  usuarios: UserCog,
  perfis: Shield,
  comissoes: Percent,
  auditoria: History,
}

type Props = {
  sections: NavSection[]
}

export function SidebarNav({ sections }: Props) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-5 px-3">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
            {section.label}
          </p>
          {section.items.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard
            const ativo =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  ativo
                    ? "bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18)]"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    ativo
                      ? "text-indigo-400"
                      : "text-white/50 group-hover:text-white/80",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  Package,
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
  auditoria: History,
}

type Props = {
  items: NavItem[]
}

export function SidebarNav({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
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
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              ativo
                ? "bg-white/[0.08] text-white"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {/* Indicador lateral discreto quando ativo */}
            {ativo && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-white"
              />
            )}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                ativo ? "text-white" : "text-white/50 group-hover:text-white/80",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

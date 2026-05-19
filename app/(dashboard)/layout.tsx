import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getCurrentUser } from "@/lib/hooks/use-current-user"
import { buildPermissions } from "@/lib/hooks/use-permissions"
import { SidebarNav, type NavItem } from "@/components/dashboard/sidebar-nav"
import { UserMenu } from "@/components/dashboard/user-menu"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const perms = buildPermissions(user)

  // Itens da sidebar — filtrados por permissão
  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Início", icon: "dashboard" },
    ...(perms.can("vendas", "ler")
      ? [{ href: "/vendas", label: "Vendas", icon: "vendas" }]
      : []),
    ...(perms.can("clientes", "ler")
      ? [{ href: "/clientes", label: "Clientes", icon: "clientes" }]
      : []),
    ...(perms.can("financeiro", "ler")
      ? [
          { href: "/financeiro/receber", label: "Contas a Receber", icon: "receber" },
          { href: "/financeiro/pagar", label: "Contas a Pagar", icon: "pagar" },
          { href: "/fluxo-de-caixa", label: "Fluxo de Caixa", icon: "caixa" },
          { href: "/clientes-faturados", label: "Clientes Faturados", icon: "faturados" },
        ]
      : []),
    ...(perms.can("cartoes", "ler")
      ? [{ href: "/cartoes", label: "Cartões da Agência", icon: "cartoes" }]
      : []),
    ...(perms.can("fornecedores", "ler")
      ? [{ href: "/fornecedores", label: "Fornecedores", icon: "fornecedores" }]
      : []),
    ...(perms.can("usuarios", "ler")
      ? [{ href: "/usuarios", label: "Usuários", icon: "usuarios" }]
      : []),
    ...(perms.can("perfis", "ler")
      ? [{ href: "/perfis", label: "Perfis de Acesso", icon: "perfis" }]
      : []),
    ...(perms.can("auditoria", "ler")
      ? [{ href: "/auditoria", label: "Auditoria", icon: "auditoria" }]
      : []),
  ]

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-neutral-950 md:flex">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6"
        >
          <Image
            src="/brand/compass-icon.png"
            alt="Compass"
            width={32}
            height={32}
            className="h-7 w-7 select-none object-contain"
            style={{ filter: "invert(1) brightness(1.4)" }}
          />
          <span className="text-base font-semibold tracking-tight text-white">
            Compass
          </span>
        </Link>

        {/* Nav */}
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <SidebarNav items={navItems} />
        </div>

        {/* Footer: contexto da empresa */}
        <div className="border-t border-white/[0.06] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            {user.empresa ? "Empresa" : "Acesso"}
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {user.empresa?.nome ?? "Todas as empresas"}
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.06] bg-neutral-950/80 px-6 backdrop-blur-md">
          <h1 className="text-sm font-medium text-white/70">
            {user.empresa?.nome ?? "Administração geral"}
          </h1>
          <UserMenu
            nome={user.nome}
            iniciais={user.iniciais}
            email={user.email}
            perfil={user.perfil.nome}
          />
        </header>

        <main className="flex-1 overflow-y-auto bg-neutral-950 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

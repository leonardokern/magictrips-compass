import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getCurrentUser } from "@/lib/hooks/use-current-user"
import { buildPermissions } from "@/lib/hooks/use-permissions"
import { SidebarNav, type NavItem, type NavSection } from "@/components/dashboard/sidebar-nav"
import { UserMenu } from "@/components/dashboard/user-menu"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const perms = buildPermissions(user)

  // Navigation organizada em seções — facilita escalar quando entrar mais módulos
  const sections: NavSection[] = [
    {
      label: "Visão geral",
      items: [{ href: "/dashboard", label: "Início", icon: "dashboard" }],
    },
    {
      label: "Operação",
      items: [
        ...(perms.can("vendas", "ler")
          ? [{ href: "/vendas", label: "Vendas", icon: "vendas" } as NavItem]
          : []),
        ...(perms.can("clientes", "ler")
          ? [{ href: "/clientes", label: "Clientes", icon: "clientes" } as NavItem]
          : []),
        ...(perms.can("fornecedores", "ler")
          ? [
              {
                href: "/fornecedores",
                label: "Fornecedores",
                icon: "fornecedores",
              } as NavItem,
            ]
          : []),
      ],
    },
    {
      label: "Financeiro",
      items: [
        ...(perms.can("financeiro", "ler")
          ? [
              {
                href: "/financeiro/receber",
                label: "Contas a Receber",
                icon: "receber",
              } as NavItem,
              {
                href: "/financeiro/pagar",
                label: "Contas a Pagar",
                icon: "pagar",
              } as NavItem,
              {
                href: "/fluxo-de-caixa",
                label: "Fluxo de Caixa",
                icon: "caixa",
              } as NavItem,
              {
                href: "/clientes-faturados",
                label: "Clientes Faturados",
                icon: "faturados",
              } as NavItem,
            ]
          : []),
        ...(perms.can("cartoes", "ler")
          ? [{ href: "/cartoes", label: "Cartões da Agência", icon: "cartoes" } as NavItem]
          : []),
      ],
    },
    {
      label: "Administração",
      items: [
        ...(perms.can("usuarios", "ler")
          ? [{ href: "/usuarios", label: "Usuários", icon: "usuarios" } as NavItem]
          : []),
        ...(perms.can("perfis", "ler")
          ? [{ href: "/perfis", label: "Perfis de Acesso", icon: "perfis" } as NavItem]
          : []),
        ...(perms.can("comissoes", "ler")
          ? [{ href: "/comissoes", label: "Comissões", icon: "comissoes" } as NavItem]
          : []),
        ...(perms.can("auditoria", "ler")
          ? [{ href: "/auditoria", label: "Auditoria", icon: "auditoria" } as NavItem]
          : []),
      ],
    },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Halo radial — duas cores da marca Nexus se mesclando */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 25% -15%, rgba(20,152,213,0.18), transparent 60%), " +
            "radial-gradient(ellipse 70% 45% at 90% -10%, rgba(0,78,90,0.28), transparent 65%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar flutuante */}
        <div className="hidden p-3 md:flex">
          <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-64 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl">
            {/* Brand */}
            <Link
              href="/dashboard"
              className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-nexus-bright/30 bg-nexus-bright/10">
                <Image
                  src="/brand/nexus-icon.png"
                  alt="Nexus"
                  width={28}
                  height={28}
                  className="h-6 w-6 select-none object-contain"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-white">
                  Nexus
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Magic Trips
                </span>
              </div>
            </Link>

            {/* Nav */}
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
              <SidebarNav sections={sections} />
            </div>

            {/* Footer — contexto de empresa */}
            <div className="border-t border-white/[0.06] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                {user.empresa ? "Empresa" : "Acesso"}
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {user.empresa?.nome ?? "Todas as empresas"}
              </p>
            </div>
          </aside>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.06] bg-background/70 px-6 backdrop-blur-md md:px-8">
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

          <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

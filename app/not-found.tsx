import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Página não encontrada",
}

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* Halo radial discreto com as cores da marca */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 25% -15%, rgba(20,152,213,0.18), transparent 60%), " +
            "radial-gradient(ellipse 70% 45% at 90% -10%, rgba(0,78,90,0.28), transparent 65%)",
        }}
      />

      <div className="relative z-10 flex max-w-md flex-col items-center gap-6 text-center">
        <Image
          src="/brand/nexus-icon.png"
          alt="Nexus"
          width={72}
          height={72}
          className="h-16 w-16 select-none object-contain [filter:brightness(0)_invert(1)]"
        />

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-nexus-bright/70">
            Erro 404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Página não encontrada
          </h1>
          <p className="text-sm text-white/55">
            O endereço que você tentou abrir não existe ou foi movido. Volte
            pro início pra continuar de onde parou.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            asChild
            className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o início
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-white/65 hover:bg-white/[0.04] hover:text-white"
          >
            <Link href="/clientes">
              <Compass className="mr-2 h-4 w-4" />
              Ir pra clientes
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

import type { Metadata } from "next"
import Image from "next/image"
import { BeamsBackground } from "@/components/ui/beams-background"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Entrar",
}

type Props = {
  searchParams: Promise<{ erro?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <BeamsBackground intensity="medium" className="flex min-h-screen items-center justify-center">
      <div className="flex min-h-screen flex-col items-center justify-between px-4 py-10">
        {/* spacer top */}
        <div aria-hidden className="hidden md:block md:h-8" />

        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          {/* Logo principal Compass (PNG preto → invertido pra branco) */}
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/brand/compass-logo.png"
              alt="Compass — Magic Trips"
              width={180}
              height={180}
              priority
              className="h-32 w-32 select-none object-contain"
              style={{ filter: "invert(1) brightness(1.4)" }}
            />
          </div>

          {/* Card glass */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6 space-y-1.5 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-white/60">
                Entre com suas credenciais para acessar o sistema.
              </p>
            </div>

            <LoginForm avisoInativo={erro === "inativo"} />
          </div>
        </div>

        {/* Footer com logos das empresas */}
        <footer className="mt-8 flex w-full max-w-md flex-col items-center gap-4 pt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Plataforma interna de
          </p>
          <div className="flex items-center justify-center gap-10">
            <Image
              src="/brand/magic-trips-white.png"
              alt="Magic Trips"
              width={160}
              height={56}
              className="h-12 w-auto select-none object-contain opacity-70 transition-opacity hover:opacity-100"
            />
            <div className="h-8 w-px bg-white/10" aria-hidden />
            <Image
              src="/brand/del-mondo-white.png"
              alt="Del Mondo"
              width={160}
              height={56}
              className="h-10 w-auto select-none object-contain opacity-70 transition-opacity hover:opacity-100"
            />
          </div>
        </footer>
      </div>
    </BeamsBackground>
  )
}

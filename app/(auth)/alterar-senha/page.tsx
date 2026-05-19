import type { Metadata } from "next"
import Image from "next/image"
import { BeamsBackground } from "@/components/ui/beams-background"

export const metadata: Metadata = {
  title: "Alterar senha",
}

export default function AlterarSenhaPage() {
  return (
    <BeamsBackground intensity="medium" className="flex min-h-screen items-center justify-center">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          <Image
            src="/brand/compass-logo.png"
            alt="Compass — Magic Trips"
            width={384}
            height={384}
            priority
            className="h-64 w-64 select-none object-contain"
            style={{ filter: "invert(1) brightness(1.4)" }}
          />

          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md">
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Alterar senha
              </h1>
              <p className="text-sm text-white/60">
                Você precisa criar uma nova senha antes de continuar. Este
                formulário será implementado em breve.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BeamsBackground>
  )
}

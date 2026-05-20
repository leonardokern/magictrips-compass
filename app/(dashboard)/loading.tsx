import { LottieLoader } from "@/components/ui/lottie-loader"

export default function DashboardLoading() {
  return (
    <>
      {/* Top progress bar — animação CSS contínua na cor nexus-bright */}
      <div className="fixed left-0 right-0 top-0 z-30 h-0.5 overflow-hidden">
        <div className="nexus-progress h-full w-full bg-gradient-to-r from-transparent via-nexus-bright to-transparent" />
      </div>

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <LottieLoader className="h-80 w-80" />
        <span className="text-sm text-white/55">Carregando…</span>
      </div>
    </>
  )
}

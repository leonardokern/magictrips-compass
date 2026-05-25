/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @react-pdf/renderer usa módulos Node.js (canvas, etc.) —
  // precisa ficar fora do bundle do servidor para não quebrar.
  // Next 14: vai dentro de `experimental.serverComponentsExternalPackages`.
  // (Em Next 15 vira `serverExternalPackages` no topo — migrar quando subir versão.)
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
}

export default nextConfig

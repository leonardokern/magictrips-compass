"use client"

import Image from "next/image"
import { Building2, Hash } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FornecedorAtivoBadge,
  TipoFornecedorBadge,
} from "@/components/fornecedores/fornecedor-badges"
import { formatCnpj } from "@/lib/utils/formatters"
import type { TipoFornecedor } from "@/lib/schemas/fornecedor"

type TipoProduto = { id: string; nome: string; icone: string | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fornecedor: {
    id: string
    nome: string
    cnpj: string
    tipo: TipoFornecedor | null
    ativo: boolean
    tiposProdutoIds: string[]
  }
  tiposProduto: TipoProduto[]
}

export function FornecedorViewModal({ open, onOpenChange, fornecedor: f, tiposProduto }: Props) {
  const tiposVinculados = tiposProduto.filter((tp) => f.tiposProdutoIds.includes(tp.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-nexus-bright" />
            Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabeçalho com nome e status */}
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              <Building2 className="h-5 w-5 text-white/50" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{f.nome}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <TipoFornecedorBadge tipo={f.tipo} />
                <FornecedorAtivoBadge ativo={f.ativo} />
              </div>
            </div>
          </div>

          {/* CNPJ */}
          <Row icon={<Hash className="h-3.5 w-3.5 text-white/40" />} label="CNPJ">
            <code className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-sm text-white">
              {formatCnpj(f.cnpj)}
            </code>
          </Row>

          {/* Tipos de produto atendidos */}
          {tiposVinculados.length > 0 && (
            <Row label="Tipos de produto atendidos">
              <div className="flex flex-wrap gap-1.5">
                {tiposVinculados.map((tp) => (
                  <span
                    key={tp.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-nexus-bright/20 bg-nexus-bright/[0.07] px-2 py-1 text-xs text-nexus-bright"
                  >
                    {tp.icone && (
                      <span className="relative block h-3.5 w-3.5 shrink-0">
                        <Image
                          src={`/icons/tipos-produto/${tp.icone}.png`}
                          alt={tp.nome}
                          fill
                          className="object-contain"
                          style={{
                            filter:
                              "brightness(0) saturate(100%) invert(55%) sepia(90%) saturate(400%) hue-rotate(175deg)",
                          }}
                        />
                      </span>
                    )}
                    {tp.nome}
                  </span>
                ))}
              </div>
            </Row>
          )}

        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}

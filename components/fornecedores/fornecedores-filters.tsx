"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TIPOS_FORNECEDOR_OPCOES } from "@/lib/schemas/fornecedor"

type Props = {
  q?: string
  tipo?: string
  status?: string
}

export function FornecedoresFilters({ q, tipo, status }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (!value || value === "todos") next.delete(key)
    else next.set(key, value)
    next.delete("page")
    startTransition(() => router.push(`/fornecedores?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por nome ou CNPJ..."
        defaultValue={q ?? ""}
        onChange={(e) => {
          const value = e.target.value
          window.clearTimeout((window as unknown as { __qDebounce?: number }).__qDebounce)
          ;(window as unknown as { __qDebounce?: number }).__qDebounce =
            window.setTimeout(() => updateParam("q", value), 300)
        }}
        className="max-w-sm"
      />

      <Select
        value={tipo ?? "todos"}
        onValueChange={(v) => updateParam("tipo", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          {TIPOS_FORNECEDOR_OPCOES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status ?? "todos"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="inativo">Inativo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

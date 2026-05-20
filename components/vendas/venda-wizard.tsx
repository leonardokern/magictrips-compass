"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  UserCog,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClienteCombobox, type ClienteOption } from "./cliente-combobox"
import { criarVenda } from "@/app/(dashboard)/vendas/actions"
import {
  COBRANCA_TIPO_LABEL,
  COBRANCA_TIPOS,
  PGTO_FORMA_LABEL,
  PGTO_FORMAS,
  TIPO_COMISSAO_LABEL,
  TIPOS_COMISSAO,
  type CobrancaTipo,
  type PgtoForma,
} from "@/lib/schemas/venda"
import { formatBRL, parseValorComSoma } from "@/lib/utils/sum-parser"
import { formatCpf, formatTelefone, onlyDigits } from "@/lib/utils/formatters"

// ─────────────────────────────────────────────────────────────────────────────
// Tipos das props (dados pré-carregados do server)
// ─────────────────────────────────────────────────────────────────────────────

type Empresa = { id: string; nome: string; slug: string }
type Usuario = { id: string; nome: string }
type Fornecedor = { id: string; nome: string }
type Cartao = {
  id: string
  nome: string
  banco: string | null
  empresa_id: string
  dia_vencimento: number
}
type Origem = { id: string; nome: string }

type CampoExtra = {
  id: string
  nome: string
  tipo_campo: string
  placeholder: string | null
  opcoes: { valor: string }[]
}
type TipoProduto = {
  id: string
  nome: string
  campos: { campo_id: string; obrigatorio: boolean; ordem: number }[]
}

type Props = {
  empresas: Empresa[]
  defaultEmpresaId?: string
  clientes: ClienteOption[]
  fornecedores: Fornecedor[]
  cartoes: Cartao[]
  origens: Origem[]
  tiposProduto: TipoProduto[]
  camposExtra: CampoExtra[]
  usuariosAgentes: Usuario[]
  usuarioLogadoId: string
  /** Se o usuário tem permissão de aprovar (Admin/Gerente). Mostra select de vendedor. */
  podeTrocarAgente: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado interno do wizard
// ─────────────────────────────────────────────────────────────────────────────

type ProdutoState = {
  id: string // local uuid pra key
  tipo_produto_id: string
  fornecedor_id: string | null
  fornecedor_nome: string
  localizador: string
  localizador_fornecedor: string
  destino: string
  data_inicio_viagem: string
  data_fim_viagem: string
  tipo_comissao: string
  /** input livre, parseado no submit */
  valor_venda_str: string
  valor_custo_str: string
  rav_str: string
  rav_extra_cliente_str: string
  rav_extra_fornecedor_str: string
  comissao_vendedor_str: string
  valores_extras: Record<string, string>
  pgto_forma: PgtoForma | ""
  pgto_cartao_id: string
  pgto_valor_total_str: string
  pgto_entrada_str: string
  pgto_num_parcelas: number
  pgto_valor_parcela_str: string
  pgto_data_debito: string
}

type CobrancaItemState = {
  tipo: CobrancaTipo
  valor_total_str: string
  num_parcelas: number
  valor_parcela_str: string
  plataforma_link: string
  taxa_adquirente_str: string
  valor_liquido_str: string
  data_inicio: string
  data_primeiro_recebimento: string
  observacoes: string
}

type PassageiroState = {
  id: string
  nome: string
  cpf: string
  data_nascimento: string
}

type ClienteNovoState = {
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  tipo: "regular" | "faturado"
  dia_faturamento: string
}

const STEPS = [
  { num: 1, label: "Identificação", icon: User },
  { num: 2, label: "Produtos", icon: ShoppingCart },
  { num: 3, label: "Cobrança", icon: CreditCard },
  { num: 4, label: "Passageiros", icon: Users },
  { num: 5, label: "Revisão", icon: Check },
] as const

const INDICACAO_OPCOES = [30, 40, 50]

function novoProduto(): ProdutoState {
  return {
    id: crypto.randomUUID(),
    tipo_produto_id: "",
    fornecedor_id: null,
    fornecedor_nome: "",
    localizador: "",
    localizador_fornecedor: "",
    destino: "",
    data_inicio_viagem: "",
    data_fim_viagem: "",
    tipo_comissao: "",
    valor_venda_str: "",
    valor_custo_str: "",
    rav_str: "",
    rav_extra_cliente_str: "0",
    rav_extra_fornecedor_str: "0",
    comissao_vendedor_str: "",
    valores_extras: {},
    pgto_forma: "",
    pgto_cartao_id: "",
    pgto_valor_total_str: "",
    pgto_entrada_str: "0",
    pgto_num_parcelas: 1,
    pgto_valor_parcela_str: "",
    pgto_data_debito: "",
  }
}

function novoPassageiro(nome = ""): PassageiroState {
  return {
    id: crypto.randomUUID(),
    nome,
    cpf: "",
    data_nascimento: "",
  }
}

function novoItemCobranca(): CobrancaItemState {
  return {
    tipo: "pix",
    valor_total_str: "",
    num_parcelas: 1,
    valor_parcela_str: "",
    plataforma_link: "",
    taxa_adquirente_str: "",
    valor_liquido_str: "",
    data_inicio: "",
    data_primeiro_recebimento: "",
    observacoes: "",
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function VendaWizard(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Identificação
  const [empresaId, setEmpresaId] = useState(props.defaultEmpresaId ?? "")
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10))
  const [clienteValue, setClienteValue] = useState<string | "novo" | null>(null)
  const [clienteNovo, setClienteNovo] = useState<ClienteNovoState>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    data_nascimento: "",
    tipo: "regular",
    dia_faturamento: "20",
  })
  const [pax, setPax] = useState(1)
  const [origem, setOrigem] = useState("")
  const [indicacao, setIndicacao] = useState<number>(40)
  const [agenteId, setAgenteId] = useState(props.usuarioLogadoId)
  const [observacoesGerais, setObservacoesGerais] = useState("")

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoState[]>([novoProduto()])

  // Cobrança
  const [cobrancaItens, setCobrancaItens] = useState<CobrancaItemState[]>([
    novoItemCobranca(),
  ])
  const [cobrancaObs, setCobrancaObs] = useState("")

  // Passageiros
  const [passageiros, setPassageiros] = useState<PassageiroState[]>([])

  // Cliente combobox: filtra pela empresa selecionada
  const clientesDaEmpresa = useMemo(
    () => props.clientes.filter((c) => c.empresa_id === empresaId),
    [props.clientes, empresaId],
  )

  // Cartões da empresa
  const cartoesDaEmpresa = useMemo(
    () => props.cartoes.filter((c) => c.empresa_id === empresaId),
    [props.cartoes, empresaId],
  )

  // Quando troca de cliente, popula passageiros default com nome do cliente
  function aplicarPassageiroDefault() {
    if (passageiros.length > 0) return
    if (clienteValue === "novo" && clienteNovo.nome) {
      setPassageiros([novoPassageiro(clienteNovo.nome)])
    } else if (clienteValue && clienteValue !== "novo") {
      const c = props.clientes.find((x) => x.id === clienteValue)
      if (c) setPassageiros([novoPassageiro(c.nome)])
    }
  }

  // Total geral da venda (soma valor_venda dos produtos)
  const totalVenda = useMemo(() => {
    return produtos.reduce(
      (acc, p) => acc + (parseValorComSoma(p.valor_venda_str) || 0),
      0,
    )
  }, [produtos])

  // ── Validação por step ────────────────────────────────────────────────────

  function validarStep1(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!empresaId) e.empresa_id = "Selecione a empresa."
    if (!dataVenda) e.data_venda = "Informe a data da venda."
    if (!clienteValue) e.cliente_id = "Selecione um cliente ou cadastre um novo."
    if (clienteValue === "novo") {
      if (clienteNovo.nome.trim().length < 2)
        e.novo_nome = "Informe o nome do cliente."
      if (!clienteNovo.cpf || onlyDigits(clienteNovo.cpf).length !== 11)
        e.novo_cpf = "CPF inválido."
      if (!clienteNovo.email) e.novo_email = "E-mail obrigatório."
      if (!clienteNovo.telefone) e.novo_telefone = "Telefone obrigatório."
    }
    if (pax < 1) e.pax = "PAX precisa ser ≥ 1."
    return e
  }

  function validarStep2(): Record<string, string> {
    const e: Record<string, string> = {}
    if (produtos.length === 0) e.produtos = "Adicione ao menos um produto."
    produtos.forEach((p, i) => {
      if (!p.tipo_produto_id) e[`produto_${i}_tipo`] = "Tipo obrigatório."
      if (!p.fornecedor_nome) e[`produto_${i}_fornecedor`] = "Fornecedor obrigatório."
      const venda = parseValorComSoma(p.valor_venda_str)
      const custo = parseValorComSoma(p.valor_custo_str)
      if (!venda || venda <= 0)
        e[`produto_${i}_valor_venda`] = "Valor de venda inválido."
      if (Number.isNaN(custo))
        e[`produto_${i}_valor_custo`] = "Valor de custo inválido."

      // Campos extras obrigatórios
      const tp = props.tiposProduto.find((t) => t.id === p.tipo_produto_id)
      if (tp) {
        for (const v of tp.campos) {
          if (!v.obrigatorio) continue
          const valor = p.valores_extras[v.campo_id]
          if (!valor || (typeof valor === "string" && valor.trim() === "")) {
            const campo = props.camposExtra.find((c) => c.id === v.campo_id)
            e[`produto_${i}_extra_${v.campo_id}`] = `${campo?.nome ?? "Campo"} obrigatório.`
          }
        }
      }
    })
    return e
  }

  function validarStep3(): Record<string, string> {
    const e: Record<string, string> = {}
    if (cobrancaItens.length === 0)
      e.cobranca_itens = "Adicione ao menos uma forma de cobrança."
    cobrancaItens.forEach((it, i) => {
      const v = parseValorComSoma(it.valor_total_str)
      if (!v || v <= 0) e[`cobranca_${i}_valor`] = "Valor inválido."
    })
    return e
  }

  function avancar() {
    let errs: Record<string, string> = {}
    if (step === 1) errs = validarStep1()
    if (step === 2) errs = validarStep2()
    if (step === 3) errs = validarStep3()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const first = Object.values(errs)[0]
      if (first) toast.error(first)
      return
    }
    setErrors({})
    if (step === 1) aplicarPassageiroDefault()
    if (step < 5) setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)
  }

  function voltar() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)
  }

  // ── Submit final ──────────────────────────────────────────────────────────

  function onSubmit() {
    // valida todos
    const errs = { ...validarStep1(), ...validarStep2(), ...validarStep3() }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const first = Object.values(errs)[0]
      if (first) toast.error(first)
      return
    }

    const payload = construirPayload()

    startTransition(async () => {
      const r = await criarVenda(payload)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Venda enviada para aprovação.")
      router.push(`/vendas/${r.data?.id}`)
    })
  }

  function construirPayload() {
    const produtosPayload = produtos.map((p, i) => ({
      ordem: i + 1,
      tipo_produto_id: p.tipo_produto_id,
      fornecedor_id: p.fornecedor_id,
      fornecedor_nome: p.fornecedor_nome,
      localizador: p.localizador || null,
      localizador_fornecedor: p.localizador_fornecedor || null,
      destino: p.destino || null,
      data_inicio_viagem: p.data_inicio_viagem || null,
      data_fim_viagem: p.data_fim_viagem || null,
      valores_extras: p.valores_extras,
      tipo_comissao: p.tipo_comissao || null,
      valor_venda: parseValorComSoma(p.valor_venda_str),
      valor_custo: parseValorComSoma(p.valor_custo_str),
      rav: p.rav_str ? parseValorComSoma(p.rav_str) : null,
      rav_extra_cliente: parseValorComSoma(p.rav_extra_cliente_str) || 0,
      rav_extra_fornecedor: parseValorComSoma(p.rav_extra_fornecedor_str) || 0,
      comissao_vendedor: p.comissao_vendedor_str
        ? parseValorComSoma(p.comissao_vendedor_str)
        : null,
      pgto_forma: p.pgto_forma || null,
      pgto_cartao_id: p.pgto_cartao_id || null,
      pgto_valor_total: p.pgto_valor_total_str
        ? parseValorComSoma(p.pgto_valor_total_str)
        : null,
      pgto_entrada: parseValorComSoma(p.pgto_entrada_str) || 0,
      pgto_num_parcelas: p.pgto_num_parcelas,
      pgto_valor_parcela: p.pgto_valor_parcela_str
        ? parseValorComSoma(p.pgto_valor_parcela_str)
        : null,
      pgto_data_debito: p.pgto_data_debito || null,
    }))

    const itensCobranca = cobrancaItens.map((it) => ({
      tipo: it.tipo,
      valor_total: parseValorComSoma(it.valor_total_str),
      num_parcelas: it.num_parcelas,
      valor_parcela: it.valor_parcela_str
        ? parseValorComSoma(it.valor_parcela_str)
        : null,
      plataforma_link: it.plataforma_link || null,
      taxa_adquirente: it.taxa_adquirente_str
        ? parseValorComSoma(it.taxa_adquirente_str)
        : null,
      valor_liquido: it.valor_liquido_str
        ? parseValorComSoma(it.valor_liquido_str)
        : null,
      data_inicio: it.data_inicio || null,
      data_primeiro_recebimento: it.data_primeiro_recebimento || null,
      observacoes: it.observacoes || null,
    }))

    const cobrancaTotal = itensCobranca.reduce(
      (acc, it) => acc + (it.valor_total || 0),
      0,
    )

    return {
      empresa_id: empresaId,
      data_venda: dataVenda,
      cliente_id: clienteValue !== "novo" ? clienteValue : null,
      cliente_novo:
        clienteValue === "novo"
          ? {
              nome: clienteNovo.nome.trim(),
              email: clienteNovo.email.trim().toLowerCase(),
              telefone: onlyDigits(clienteNovo.telefone),
              cpf: onlyDigits(clienteNovo.cpf),
              data_nascimento: clienteNovo.data_nascimento || null,
              tipo: clienteNovo.tipo,
              dia_faturamento:
                clienteNovo.tipo === "faturado"
                  ? Number(clienteNovo.dia_faturamento)
                  : null,
            }
          : null,
      pax,
      origem: origem || null,
      indicacao_percentual: indicacao,
      observacoes: observacoesGerais || null,
      usuario_id: agenteId,
      produtos: produtosPayload,
      passageiros: passageiros.map((p, i) => ({
        ordem: i + 1,
        nome: p.nome,
        cpf: p.cpf ? onlyDigits(p.cpf) : null,
        data_nascimento: p.data_nascimento || null,
      })),
      cobranca: {
        valor_total: cobrancaTotal,
        observacoes: cobrancaObs || null,
        itens: itensCobranca,
      },
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Nova venda
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Preencha o relatório de venda em 5 passos. Ao enviar, fica em
            <span className="font-medium text-amber-300"> aguardando aprovação</span> e
            os gerentes são notificados.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
          Passo {step} de 5
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        {STEPS.map((s) => {
          const Icon = s.icon
          const ativo = step === s.num
          const passado = step > s.num
          return (
            <li
              key={s.num}
              className={
                "flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wider " +
                (ativo
                  ? "bg-nexus-bright/15 text-nexus-bright"
                  : passado
                    ? "text-emerald-300/80"
                    : "text-white/45")
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">
                {s.num}. {s.label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Conteúdo do passo */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {step === 1 && (
          <Step1
            empresas={props.empresas}
            empresaId={empresaId}
            setEmpresaId={(id) => {
              setEmpresaId(id)
              setClienteValue(null)
            }}
            dataVenda={dataVenda}
            setDataVenda={setDataVenda}
            clientes={clientesDaEmpresa}
            clienteValue={clienteValue}
            setClienteValue={setClienteValue}
            clienteNovo={clienteNovo}
            setClienteNovo={setClienteNovo}
            pax={pax}
            setPax={setPax}
            origens={props.origens}
            origem={origem}
            setOrigem={setOrigem}
            indicacao={indicacao}
            setIndicacao={setIndicacao}
            agentes={props.usuariosAgentes}
            agenteId={agenteId}
            setAgenteId={setAgenteId}
            podeTrocarAgente={props.podeTrocarAgente}
            observacoes={observacoesGerais}
            setObservacoes={setObservacoesGerais}
            errors={errors}
          />
        )}

        {step === 2 && (
          <Step2Produtos
            produtos={produtos}
            setProdutos={setProdutos}
            tiposProduto={props.tiposProduto}
            camposExtra={props.camposExtra}
            fornecedores={props.fornecedores}
            cartoes={cartoesDaEmpresa}
            errors={errors}
          />
        )}

        {step === 3 && (
          <Step3Cobranca
            itens={cobrancaItens}
            setItens={setCobrancaItens}
            obs={cobrancaObs}
            setObs={setCobrancaObs}
            totalVenda={totalVenda}
            errors={errors}
          />
        )}

        {step === 4 && (
          <Step4Passageiros
            passageiros={passageiros}
            setPassageiros={setPassageiros}
            pax={pax}
          />
        )}

        {step === 5 && (
          <Step5Revisao
            empresaNome={
              props.empresas.find((e) => e.id === empresaId)?.nome ?? "—"
            }
            dataVenda={dataVenda}
            cliente={
              clienteValue === "novo"
                ? clienteNovo.nome
                : props.clientes.find((c) => c.id === clienteValue)?.nome ?? "—"
            }
            clienteNovoFlag={clienteValue === "novo"}
            pax={pax}
            agenteNome={
              props.usuariosAgentes.find((u) => u.id === agenteId)?.nome ?? "—"
            }
            indicacao={indicacao}
            origem={origem}
            produtos={produtos.map((p) => ({
              tipoNome:
                props.tiposProduto.find((t) => t.id === p.tipo_produto_id)
                  ?.nome ?? "—",
              fornecedor: p.fornecedor_nome,
              destino: p.destino,
              valorVenda: parseValorComSoma(p.valor_venda_str),
              valorCusto: parseValorComSoma(p.valor_custo_str),
              comissao: p.comissao_vendedor_str
                ? parseValorComSoma(p.comissao_vendedor_str)
                : 0,
              rav: p.rav_str ? parseValorComSoma(p.rav_str) : 0,
            }))}
            cobranca={cobrancaItens.map((it) => ({
              tipo: COBRANCA_TIPO_LABEL[it.tipo],
              valor: parseValorComSoma(it.valor_total_str),
              parcelas: it.num_parcelas,
            }))}
            passageiros={passageiros.map((p) => p.nome)}
          />
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={voltar}
          disabled={step === 1 || isPending}
          className="text-white/70 hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        {step < 5 ? (
          <Button
            type="button"
            onClick={avancar}
            disabled={isPending}
            className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
          >
            Continuar
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="bg-nexus-bright text-white hover:bg-nexus-bright-soft"
          >
            {isPending ? "Enviando…" : "Enviar para aprovação"}
            <Check className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Identificação
// ─────────────────────────────────────────────────────────────────────────────

function Step1(props: {
  empresas: Empresa[]
  empresaId: string
  setEmpresaId: (id: string) => void
  dataVenda: string
  setDataVenda: (v: string) => void
  clientes: ClienteOption[]
  clienteValue: string | "novo" | null
  setClienteValue: (v: string | "novo" | null) => void
  clienteNovo: ClienteNovoState
  setClienteNovo: React.Dispatch<React.SetStateAction<ClienteNovoState>>
  pax: number
  setPax: (n: number) => void
  origens: Origem[]
  origem: string
  setOrigem: (v: string) => void
  indicacao: number
  setIndicacao: (n: number) => void
  agentes: Usuario[]
  agenteId: string
  setAgenteId: (id: string) => void
  podeTrocarAgente: boolean
  observacoes: string
  setObservacoes: (v: string) => void
  errors: Record<string, string>
}) {
  const e = props.errors
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Empresa" icon={<Building2 className="h-3.5 w-3.5" />} error={e.empresa_id}>
          <Select
            value={props.empresaId || undefined}
            onValueChange={props.setEmpresaId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {props.empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Data da venda" icon={<CalendarDays className="h-3.5 w-3.5" />} error={e.data_venda}>
          <Input
            type="date"
            value={props.dataVenda}
            onChange={(ev) => props.setDataVenda(ev.target.value)}
          />
        </Field>

        <Field label="PAX (passageiros)" error={e.pax}>
          <Input
            type="number"
            min={1}
            value={props.pax}
            onChange={(ev) => props.setPax(Number(ev.target.value) || 1)}
          />
        </Field>
      </div>

      <Field
        label="Cliente"
        icon={<User className="h-3.5 w-3.5" />}
        error={e.cliente_id}
        hint={!props.empresaId ? "Selecione a empresa primeiro." : undefined}
      >
        <ClienteCombobox
          clientes={props.clientes}
          value={props.clienteValue}
          onChange={props.setClienteValue}
          disabled={!props.empresaId}
        />
      </Field>

      {props.clienteValue === "novo" && (
        <div className="rounded-lg border border-nexus-bright/30 bg-nexus-bright/[0.04] p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-nexus-bright">
            Dados do novo cliente
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" error={e.novo_nome}>
              <Input
                value={props.clienteNovo.nome}
                onChange={(ev) =>
                  props.setClienteNovo((s) => ({ ...s, nome: ev.target.value }))
                }
                required
              />
            </Field>
            <Field label="CPF" error={e.novo_cpf}>
              <Input
                value={formatCpf(props.clienteNovo.cpf)}
                onChange={(ev) =>
                  props.setClienteNovo((s) => ({ ...s, cpf: ev.target.value }))
                }
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </Field>
            <Field label="E-mail" error={e.novo_email}>
              <Input
                type="email"
                value={props.clienteNovo.email}
                onChange={(ev) =>
                  props.setClienteNovo((s) => ({ ...s, email: ev.target.value }))
                }
              />
            </Field>
            <Field label="Telefone" error={e.novo_telefone}>
              <Input
                value={formatTelefone(props.clienteNovo.telefone)}
                onChange={(ev) =>
                  props.setClienteNovo((s) => ({
                    ...s,
                    telefone: ev.target.value,
                  }))
                }
                placeholder="(11) 91234-5678"
                maxLength={15}
              />
            </Field>
            <Field label="Data de nascimento">
              <Input
                type="date"
                value={props.clienteNovo.data_nascimento}
                onChange={(ev) =>
                  props.setClienteNovo((s) => ({
                    ...s,
                    data_nascimento: ev.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Tipo de cliente">
              <Select
                value={props.clienteNovo.tipo}
                onValueChange={(v) =>
                  props.setClienteNovo((s) => ({
                    ...s,
                    tipo: v as "regular" | "faturado",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {props.clienteNovo.tipo === "faturado" && (
              <Field label="Dia de faturamento" hint="Dia do mês que a fatura fecha (padrão 20).">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={props.clienteNovo.dia_faturamento}
                  onChange={(ev) =>
                    props.setClienteNovo((s) => ({
                      ...s,
                      dia_faturamento: ev.target.value,
                    }))
                  }
                />
              </Field>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Origem do lead">
          <Select
            value={props.origem || undefined}
            onValueChange={props.setOrigem}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {props.origens.map((o) => (
                <SelectItem key={o.id} value={o.nome}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Indicação (%)">
          <Select
            value={String(props.indicacao)}
            onValueChange={(v) => props.setIndicacao(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDICACAO_OPCOES.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {p}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Agente responsável"
          icon={<UserCog className="h-3.5 w-3.5" />}
          hint={
            !props.podeTrocarAgente
              ? "Você é o agente desta venda."
              : undefined
          }
        >
          <Select
            value={props.agenteId}
            onValueChange={props.setAgenteId}
            disabled={!props.podeTrocarAgente}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {props.agentes.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Observações gerais (opcional)">
        <Textarea
          value={props.observacoes}
          onChange={(ev) => props.setObservacoes(ev.target.value)}
          rows={2}
          placeholder="Notas internas sobre a venda…"
        />
      </Field>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Produtos
// ─────────────────────────────────────────────────────────────────────────────

function Step2Produtos(props: {
  produtos: ProdutoState[]
  setProdutos: React.Dispatch<React.SetStateAction<ProdutoState[]>>
  tiposProduto: TipoProduto[]
  camposExtra: CampoExtra[]
  fornecedores: Fornecedor[]
  cartoes: Cartao[]
  errors: Record<string, string>
}) {
  function adicionarProduto() {
    props.setProdutos((s) => [...s, novoProduto()])
  }
  function removerProduto(id: string) {
    props.setProdutos((s) => s.filter((p) => p.id !== id))
  }
  function moverProduto(idx: number, delta: -1 | 1) {
    props.setProdutos((s) => {
      const novo = s.slice()
      const dest = idx + delta
      if (dest < 0 || dest >= novo.length) return s
      ;[novo[idx], novo[dest]] = [novo[dest]!, novo[idx]!]
      return novo
    })
  }

  function patch(id: string, patchFn: (p: ProdutoState) => Partial<ProdutoState>) {
    props.setProdutos((s) =>
      s.map((p) => (p.id === id ? { ...p, ...patchFn(p) } : p)),
    )
  }

  return (
    <div className="space-y-6">
      {props.produtos.map((p, i) => {
        const tp = props.tiposProduto.find((t) => t.id === p.tipo_produto_id)
        const camposDoTipo = tp
          ? tp.campos
              .slice()
              .sort((a, b) => a.ordem - b.ordem)
              .map((v) => ({
                vinculo: v,
                campo: props.camposExtra.find((c) => c.id === v.campo_id),
              }))
              .filter((x) => x.campo)
          : []
        return (
          <div
            key={p.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Produto {i + 1}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moverProduto(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-white/45 hover:text-white disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moverProduto(i, 1)}
                  disabled={i === props.produtos.length - 1}
                  className="rounded p-1 text-white/45 hover:text-white disabled:opacity-30"
                  aria-label="Descer"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {props.produtos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerProduto(p.id)}
                    className="rounded p-1 text-rose-300/70 hover:text-rose-200"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Tipo de produto"
                error={props.errors[`produto_${i}_tipo`]}
              >
                <Select
                  value={p.tipo_produto_id || undefined}
                  onValueChange={(v) =>
                    patch(p.id, () => ({
                      tipo_produto_id: v,
                      valores_extras: {},
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.tiposProduto.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Fornecedor"
                error={props.errors[`produto_${i}_fornecedor`]}
              >
                <Select
                  value={p.fornecedor_id || undefined}
                  onValueChange={(v) => {
                    const f = props.fornecedores.find((x) => x.id === v)
                    patch(p.id, () => ({
                      fornecedor_id: v,
                      fornecedor_nome: f?.nome ?? "",
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Localizador (cliente)">
                <Input
                  value={p.localizador}
                  onChange={(ev) =>
                    patch(p.id, () => ({ localizador: ev.target.value }))
                  }
                />
              </Field>

              <Field label="Localizador (fornecedor)">
                <Input
                  value={p.localizador_fornecedor}
                  onChange={(ev) =>
                    patch(p.id, () => ({
                      localizador_fornecedor: ev.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Destino" className="sm:col-span-2">
                <Input
                  value={p.destino}
                  onChange={(ev) =>
                    patch(p.id, () => ({ destino: ev.target.value }))
                  }
                />
              </Field>

              <Field label="Data início viagem">
                <Input
                  type="date"
                  value={p.data_inicio_viagem}
                  onChange={(ev) =>
                    patch(p.id, () => ({
                      data_inicio_viagem: ev.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Data fim viagem (opcional)">
                <Input
                  type="date"
                  value={p.data_fim_viagem}
                  onChange={(ev) =>
                    patch(p.id, () => ({
                      data_fim_viagem: ev.target.value,
                    }))
                  }
                />
              </Field>

              {/* Campos dinâmicos do tipo */}
              {camposDoTipo.map(({ vinculo, campo }) => {
                if (!campo) return null
                const val = p.valores_extras[campo.id] ?? ""
                const err =
                  props.errors[`produto_${i}_extra_${campo.id}`]
                return (
                  <Field
                    key={campo.id}
                    label={`${campo.nome}${vinculo.obrigatorio ? " *" : ""}`}
                    error={err}
                  >
                    {campo.tipo_campo === "dropdown" ? (
                      <Select
                        value={val || undefined}
                        onValueChange={(v) =>
                          patch(p.id, (prev) => ({
                            valores_extras: {
                              ...prev.valores_extras,
                              [campo.id]: v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={campo.placeholder ?? "Selecione"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {campo.opcoes.map((o) => (
                            <SelectItem key={o.valor} value={o.valor}>
                              {o.valor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : campo.tipo_campo === "data" ? (
                      <Input
                        type="date"
                        value={val}
                        onChange={(ev) =>
                          patch(p.id, (prev) => ({
                            valores_extras: {
                              ...prev.valores_extras,
                              [campo.id]: ev.target.value,
                            },
                          }))
                        }
                      />
                    ) : campo.tipo_campo === "numero" ? (
                      <Input
                        type="number"
                        value={val}
                        onChange={(ev) =>
                          patch(p.id, (prev) => ({
                            valores_extras: {
                              ...prev.valores_extras,
                              [campo.id]: ev.target.value,
                            },
                          }))
                        }
                        placeholder={campo.placeholder ?? ""}
                      />
                    ) : campo.tipo_campo === "sim_nao" ? (
                      <Select
                        value={val || undefined}
                        onValueChange={(v) =>
                          patch(p.id, (prev) => ({
                            valores_extras: {
                              ...prev.valores_extras,
                              [campo.id]: v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={val}
                        onChange={(ev) =>
                          patch(p.id, (prev) => ({
                            valores_extras: {
                              ...prev.valores_extras,
                              [campo.id]: ev.target.value,
                            },
                          }))
                        }
                        placeholder={campo.placeholder ?? ""}
                      />
                    )}
                  </Field>
                )
              })}

              <Field label="Tipo de comissão">
                <Select
                  value={p.tipo_comissao || undefined}
                  onValueChange={(v) =>
                    patch(p.id, () => ({ tipo_comissao: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_COMISSAO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_COMISSAO_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Valores financeiros */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-white/45">
                Valores
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Valor de venda"
                  hint={
                    p.valor_venda_str
                      ? formatBRL(parseValorComSoma(p.valor_venda_str))
                      : "Aceita soma: 2382,06 + 200,00"
                  }
                  error={props.errors[`produto_${i}_valor_venda`]}
                >
                  <Input
                    value={p.valor_venda_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({ valor_venda_str: ev.target.value }))
                    }
                    placeholder="2.382,06 + 200,00"
                  />
                </Field>
                <Field
                  label="Valor de custo"
                  hint={
                    p.valor_custo_str
                      ? formatBRL(parseValorComSoma(p.valor_custo_str))
                      : "Custo total do produto"
                  }
                  error={props.errors[`produto_${i}_valor_custo`]}
                >
                  <Input
                    value={p.valor_custo_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({ valor_custo_str: ev.target.value }))
                    }
                    placeholder="2.360,16"
                  />
                </Field>
                <Field
                  label="RAV"
                  hint={
                    p.rav_str
                      ? formatBRL(parseValorComSoma(p.rav_str))
                      : "Aceita soma"
                  }
                >
                  <Input
                    value={p.rav_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({ rav_str: ev.target.value }))
                    }
                    placeholder="210,90 + 11,00"
                  />
                </Field>
                <Field label="RAV extra (cliente)">
                  <Input
                    value={p.rav_extra_cliente_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        rav_extra_cliente_str: ev.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="RAV extra (fornecedor)">
                  <Input
                    value={p.rav_extra_fornecedor_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        rav_extra_fornecedor_str: ev.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Comissão do vendedor"
                  hint={
                    p.comissao_vendedor_str
                      ? formatBRL(parseValorComSoma(p.comissao_vendedor_str))
                      : "Valor pago ao agente"
                  }
                >
                  <Input
                    value={p.comissao_vendedor_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        comissao_vendedor_str: ev.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>

            {/* Pagamento ao fornecedor */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-white/45">
                Pagamento ao fornecedor
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Forma de pagamento">
                  <Select
                    value={p.pgto_forma || undefined}
                    onValueChange={(v) =>
                      patch(p.id, () => ({ pgto_forma: v as PgtoForma }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PGTO_FORMAS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {PGTO_FORMA_LABEL[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {p.pgto_forma === "cartao" && (
                  <Field label="Cartão da agência">
                    <Select
                      value={p.pgto_cartao_id || undefined}
                      onValueChange={(v) =>
                        patch(p.id, () => ({ pgto_cartao_id: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {props.cartoes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} (venc. {c.dia_vencimento})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field label="Data débito / primeiro pagamento">
                  <Input
                    type="date"
                    value={p.pgto_data_debito}
                    onChange={(ev) =>
                      patch(p.id, () => ({ pgto_data_debito: ev.target.value }))
                    }
                  />
                </Field>

                <Field label="Valor total">
                  <Input
                    value={p.pgto_valor_total_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        pgto_valor_total_str: ev.target.value,
                      }))
                    }
                    placeholder="2.360,16"
                  />
                </Field>

                <Field label="Entrada">
                  <Input
                    value={p.pgto_entrada_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({ pgto_entrada_str: ev.target.value }))
                    }
                  />
                </Field>

                <Field label="Número de parcelas">
                  <Input
                    type="number"
                    min={1}
                    value={p.pgto_num_parcelas}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        pgto_num_parcelas: Number(ev.target.value) || 1,
                      }))
                    }
                  />
                </Field>

                <Field label="Valor da parcela">
                  <Input
                    value={p.pgto_valor_parcela_str}
                    onChange={(ev) =>
                      patch(p.id, () => ({
                        pgto_valor_parcela_str: ev.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={adicionarProduto}
        className="border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar outro produto
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Cobrança
// ─────────────────────────────────────────────────────────────────────────────

function Step3Cobranca(props: {
  itens: CobrancaItemState[]
  setItens: React.Dispatch<React.SetStateAction<CobrancaItemState[]>>
  obs: string
  setObs: (v: string) => void
  totalVenda: number
  errors: Record<string, string>
}) {
  function adicionar() {
    props.setItens((s) => [...s, novoItemCobranca()])
  }
  function remover(idx: number) {
    props.setItens((s) => s.filter((_, i) => i !== idx))
  }
  function patch(idx: number, p: Partial<CobrancaItemState>) {
    props.setItens((s) =>
      s.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    )
  }

  const totalCobrado = props.itens.reduce(
    (acc, it) => acc + (parseValorComSoma(it.valor_total_str) || 0),
    0,
  )
  const diferenca = Math.abs(totalCobrado - props.totalVenda)
  const cobre = diferenca < 0.01

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">
              Total da venda
            </p>
            <p className="text-base font-semibold tabular-nums text-white">
              {formatBRL(props.totalVenda)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/45">
              Total cobrado
            </p>
            <p
              className={
                "text-base font-semibold tabular-nums " +
                (cobre ? "text-emerald-300" : "text-amber-300")
              }
            >
              {formatBRL(totalCobrado)}
            </p>
          </div>
        </div>
        {!cobre && (
          <p className="text-xs text-amber-300">
            Diferença de {formatBRL(diferenca)} entre venda e cobrança.
          </p>
        )}
      </div>

      {props.itens.map((it, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              Cobrança {i + 1}
            </p>
            {props.itens.length > 1 && (
              <button
                type="button"
                onClick={() => remover(i)}
                className="rounded p-1 text-rose-300/70 hover:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Forma de pagamento">
              <Select
                value={it.tipo}
                onValueChange={(v) => patch(i, { tipo: v as CobrancaTipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COBRANCA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {COBRANCA_TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Valor"
              error={props.errors[`cobranca_${i}_valor`]}
              hint={
                it.valor_total_str
                  ? formatBRL(parseValorComSoma(it.valor_total_str))
                  : "Aceita soma"
              }
            >
              <Input
                value={it.valor_total_str}
                onChange={(ev) =>
                  patch(i, { valor_total_str: ev.target.value })
                }
              />
            </Field>

            <Field label="Número de parcelas">
              <Input
                type="number"
                min={1}
                value={it.num_parcelas}
                onChange={(ev) =>
                  patch(i, { num_parcelas: Number(ev.target.value) || 1 })
                }
              />
            </Field>

            <Field label="Valor da parcela">
              <Input
                value={it.valor_parcela_str}
                onChange={(ev) =>
                  patch(i, { valor_parcela_str: ev.target.value })
                }
              />
            </Field>

            <Field label="Data primeiro recebimento">
              <Input
                type="date"
                value={it.data_primeiro_recebimento}
                onChange={(ev) =>
                  patch(i, { data_primeiro_recebimento: ev.target.value })
                }
              />
            </Field>

            <Field label="Plataforma / link (opcional)">
              <Input
                value={it.plataforma_link}
                onChange={(ev) =>
                  patch(i, { plataforma_link: ev.target.value })
                }
                placeholder="PagSeguro, Cielo…"
              />
            </Field>

            {(it.tipo === "cartao_credito" || it.tipo === "cartao_debito") && (
              <>
                <Field label="Taxa adquirente (R$)">
                  <Input
                    value={it.taxa_adquirente_str}
                    onChange={(ev) =>
                      patch(i, { taxa_adquirente_str: ev.target.value })
                    }
                  />
                </Field>
                <Field label="Valor líquido (R$)">
                  <Input
                    value={it.valor_liquido_str}
                    onChange={(ev) =>
                      patch(i, { valor_liquido_str: ev.target.value })
                    }
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={adicionar}
        className="border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar outra forma de cobrança
      </Button>

      <Field label="Observações da cobrança (opcional)">
        <Textarea
          value={props.obs}
          onChange={(ev) => props.setObs(ev.target.value)}
          rows={2}
        />
      </Field>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Passageiros
// ─────────────────────────────────────────────────────────────────────────────

function Step4Passageiros(props: {
  passageiros: PassageiroState[]
  setPassageiros: React.Dispatch<React.SetStateAction<PassageiroState[]>>
  pax: number
}) {
  function adicionar() {
    props.setPassageiros((s) => [...s, novoPassageiro()])
  }
  function remover(id: string) {
    props.setPassageiros((s) => s.filter((p) => p.id !== id))
  }
  function patch(id: string, p: Partial<PassageiroState>) {
    props.setPassageiros((s) =>
      s.map((px) => (px.id === id ? { ...px, ...p } : px)),
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/55">
        PAX informado: <span className="text-white">{props.pax}</span>. Cadastre
        os passageiros aqui — todos serão associados a todos os produtos da
        venda. Granularidade por produto vem em V1.1.
      </p>

      {props.passageiros.map((p, i) => (
        <div
          key={p.id}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              Passageiro {i + 1}
            </p>
            {props.passageiros.length > 1 && (
              <button
                type="button"
                onClick={() => remover(p.id)}
                className="rounded p-1 text-rose-300/70 hover:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome">
              <Input
                value={p.nome}
                onChange={(ev) => patch(p.id, { nome: ev.target.value })}
              />
            </Field>
            <Field label="CPF (opcional)">
              <Input
                value={formatCpf(p.cpf)}
                onChange={(ev) => patch(p.id, { cpf: ev.target.value })}
                maxLength={14}
              />
            </Field>
            <Field label="Data de nascimento (opcional)">
              <Input
                type="date"
                value={p.data_nascimento}
                onChange={(ev) =>
                  patch(p.id, { data_nascimento: ev.target.value })
                }
              />
            </Field>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={adicionar}
        className="border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar passageiro
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Revisão
// ─────────────────────────────────────────────────────────────────────────────

function Step5Revisao(props: {
  empresaNome: string
  dataVenda: string
  cliente: string
  clienteNovoFlag: boolean
  pax: number
  agenteNome: string
  indicacao: number
  origem: string
  produtos: {
    tipoNome: string
    fornecedor: string
    destino: string
    valorVenda: number
    valorCusto: number
    comissao: number
    rav: number
  }[]
  cobranca: { tipo: string; valor: number; parcelas: number }[]
  passageiros: string[]
}) {
  const totalVenda = props.produtos.reduce((a, p) => a + p.valorVenda, 0)
  const totalCusto = props.produtos.reduce((a, p) => a + p.valorCusto, 0)
  const totalComissao = props.produtos.reduce((a, p) => a + p.comissao, 0)
  const totalRav = props.produtos.reduce((a, p) => a + p.rav, 0)
  const lucroBruto = totalVenda - totalCusto - totalComissao
  const totalCobranca = props.cobranca.reduce((a, c) => a + c.valor, 0)

  return (
    <div className="space-y-5">
      <Bloco titulo="Identificação">
        <Row label="Empresa" value={props.empresaNome} />
        <Row label="Data da venda" value={formatDateBR(props.dataVenda)} />
        <Row
          label="Cliente"
          value={
            <span>
              {props.cliente}
              {props.clienteNovoFlag && (
                <span className="ml-2 rounded-full border border-nexus-bright/30 bg-nexus-bright/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-nexus-bright">
                  novo
                </span>
              )}
            </span>
          }
        />
        <Row label="Agente" value={props.agenteNome} />
        <Row label="PAX" value={`${props.pax} passageiro(s)`} />
        <Row label="Indicação" value={`${props.indicacao}%`} />
        {props.origem && <Row label="Origem do lead" value={props.origem} />}
      </Bloco>

      <Bloco titulo={`Produtos (${props.produtos.length})`}>
        <div className="overflow-hidden rounded-lg border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/45">
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Fornecedor / destino</th>
                <th className="px-3 py-2 text-right">Venda</th>
                <th className="px-3 py-2 text-right">Custo</th>
                <th className="px-3 py-2 text-right">RAV</th>
                <th className="px-3 py-2 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {props.produtos.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="px-3 py-2 text-white/85">{p.tipoNome}</td>
                  <td className="px-3 py-2 text-white/65">
                    {p.fornecedor}
                    {p.destino ? ` · ${p.destino}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/85">
                    {formatBRL(p.valorVenda)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/55">
                    {formatBRL(p.valorCusto)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/65">
                    {formatBRL(p.rav)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/65">
                    {formatBRL(p.comissao)}
                  </td>
                </tr>
              ))}
              <tr className="bg-white/[0.03] font-medium">
                <td className="px-3 py-2 text-white/65" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white">
                  {formatBRL(totalVenda)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/65">
                  {formatBRL(totalCusto)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/85">
                  {formatBRL(totalRav)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/85">
                  {formatBRL(totalComissao)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Bloco>

      <Bloco titulo="Cobrança do cliente">
        <ul className="space-y-1.5 text-sm">
          {props.cobranca.map((c, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-white/75">
                {c.tipo}
                {c.parcelas > 1 && (
                  <span className="ml-2 text-xs text-white/45">
                    {c.parcelas}x
                  </span>
                )}
              </span>
              <span className="tabular-nums text-white">
                {formatBRL(c.valor)}
              </span>
            </li>
          ))}
          <li className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2 font-medium">
            <span className="text-white/85">Total cobrado</span>
            <span className="tabular-nums text-white">
              {formatBRL(totalCobranca)}
            </span>
          </li>
        </ul>
      </Bloco>

      <Bloco titulo={`Passageiros (${props.passageiros.length})`}>
        <ul className="flex flex-wrap gap-2 text-sm">
          {props.passageiros.map((nome, i) => (
            <li
              key={i}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/80"
            >
              {nome}
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="Resultado da venda">
        <Row
          label="Total venda"
          value={
            <span className="text-base font-semibold tabular-nums text-white">
              {formatBRL(totalVenda)}
            </span>
          }
        />
        <Row label="Custo total" value={formatBRL(totalCusto)} />
        <Row label="Comissão do vendedor" value={formatBRL(totalComissao)} />
        <Row
          label="Lucro bruto"
          value={
            <span
              className={
                "tabular-nums font-semibold " +
                (lucroBruto >= 0 ? "text-emerald-300" : "text-rose-300")
              }
            >
              {formatBRL(lucroBruto)}
            </span>
          }
        />
      </Bloco>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────────────────────────────────────

function Bloco({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
        {titulo}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/55">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function Field({
  label,
  icon,
  error,
  hint,
  children,
  className,
}: {
  label: string
  icon?: React.ReactNode
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
        {icon}
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-white/40">{hint}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function formatDateBR(iso: string): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

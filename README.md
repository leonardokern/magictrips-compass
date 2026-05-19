# Nexus

Plataforma interna de gestão da **Magic Trips** e **Del Mondo**.

> Substitui o fluxo atual (Google Forms + WhatsApp + planilha + Otoos) por um sistema único: agente registra a venda → gerente aprova → parcelas geradas automaticamente → exportação para Otoos.

## Stack

- **Next.js 14** (App Router + RSC) + TypeScript strict
- **Tailwind CSS 3** + shadcn/ui
- **Supabase** (PostgreSQL + RLS + Auth + Storage + Edge Functions)
- **Resend** (email transacional)
- **Vercel** (deploy)

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env.local
# preencher .env.local com os valores reais

# 3. Subir o dev server
npm run dev
```

Acesse `http://localhost:3000`.

## Identidade visual

| Token | Cor | Origem |
|---|---|---|
| `bg-nexus-deep` | `#004E5A` | Magic Trips (teal escuro) |
| `bg-nexus-bright` | `#1498D5` | Del Mondo (azul brilhante) |

Base sempre em **dark mode** (HSL teal-black). As duas cores acima são os accents principais — usadas em botões primários, sidebar ativo, badges e gradients.

## Estrutura

```
app/                    # Next.js App Router
├── (auth)/login/       # tela de login
└── (dashboard)/        # rotas autenticadas
components/
├── ui/                 # shadcn/ui primitivos
├── dashboard/          # sidebar, header, KPI card
└── <domínio>/          # clientes, fornecedores, usuários, perfis, comissões
lib/
├── supabase/           # client.ts + server.ts + middleware.ts
├── hooks/              # use-current-user, use-permissions
├── schemas/            # zod schemas por domínio
├── utils/              # formatters, validators, password
└── constants/          # catálogo de permissões
types/database.types.ts # gerado pelo Supabase MCP
supabase/
├── migrations/         # SQL versionado
└── seed.sql            # seed do usuário admin
```

## Banco de dados

Schema completo aplicado via migrations em `supabase/migrations/`. RLS habilitado em todas as tabelas. Para regenerar os tipos:

```bash
# Via Supabase MCP:
# generate_typescript_types → types/database.types.ts
```

## Convenções

- Interface 100% em **português brasileiro**
- Valores monetários: **R$** com 2 casas decimais
- Datas: **DD/MM/YYYY** na UI, ISO 8601 no banco
- Cores: sempre via **tokens semânticos** (`bg-background`, `text-foreground`, `bg-nexus-deep`, `bg-nexus-bright`) — nunca `bg-white`, `text-black`
- Vendas: **nunca deletar**, apenas cancelar
- Audit: toda ação crítica gera registro em `audit_logs`

## Credenciais iniciais

| Usuário | Senha |
|---|---|
| `adm@magictrips.com.br` | `adminmagic` |

**Trocar a senha após o primeiro login em produção.**

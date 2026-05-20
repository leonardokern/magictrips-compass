-- =============================================================================
-- 028 — Vendas: permissões + status default + RPC criar_venda_completa
-- =============================================================================
-- 1. Concede permissões de vendas a Gerente (ler/aprovar) e Agentes (ler/criar/editar).
-- 2. Muda o default de vendas.status para 'pendente_validacao' (entrava como rascunho).
-- 3. RPC criar_venda_completa(jsonb) — insere tudo (cliente novo se necessário,
--    venda, produtos, passageiros, cobrança) e cria lembretes pros aprovadores.
-- =============================================================================

-- 1. Permissões nos perfis sistema
UPDATE perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
  'vendas',
  jsonb_build_object('ler', true, 'criar', false, 'editar', false, 'aprovar', true, 'excluir', false)
)
WHERE nome = 'Gerente';

UPDATE perfis_acesso
SET permissoes = permissoes || jsonb_build_object(
  'vendas',
  jsonb_build_object('ler', true, 'criar', true, 'editar', true, 'aprovar', false, 'excluir', false)
)
WHERE nome IN ('Agente Magic Trips', 'Agente Del Mondo');

-- 2. Default de status passa a ser pendente_validacao
ALTER TABLE vendas ALTER COLUMN status SET DEFAULT 'pendente_validacao';

-- Índices úteis pra listagem
CREATE INDEX IF NOT EXISTS vendas_empresa_status_idx ON vendas(empresa_id, status);
CREATE INDEX IF NOT EXISTS vendas_usuario_idx ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS lembretes_destinatario_status_idx
  ON lembretes(destinatario_id, status);

-- 3. RPC transacional
CREATE OR REPLACE FUNCTION criar_venda_completa(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_empresa_id     uuid := (p_payload->>'empresa_id')::uuid;
  v_data_venda     date := (p_payload->>'data_venda')::date;
  v_cliente_id     uuid := nullif(p_payload->>'cliente_id', '')::uuid;
  v_cliente_novo   jsonb := p_payload->'cliente_novo';
  v_pax            int  := COALESCE((p_payload->>'pax')::int, 1);
  v_origem         text := p_payload->>'origem';
  v_indicacao      numeric := nullif(p_payload->>'indicacao_percentual', '')::numeric;
  v_observacoes    text := p_payload->>'observacoes';
  v_usuario_id     uuid := COALESCE(nullif(p_payload->>'usuario_id', '')::uuid, v_uid);

  v_produtos       jsonb := COALESCE(p_payload->'produtos', '[]'::jsonb);
  v_passageiros    jsonb := COALESCE(p_payload->'passageiros', '[]'::jsonb);
  v_cobranca       jsonb := p_payload->'cobranca';

  v_venda_id       uuid;
  v_cobranca_id    uuid;
  v_produto        jsonb;
  v_produto_id     uuid;
  v_passageiro     jsonb;
  v_passageiro_id  uuid;
  v_item           jsonb;
  v_tipo_produto   record;
  v_passageiros_ids uuid[] := ARRAY[]::uuid[];

  v_perm_criar     text;
  v_user_empresas  uuid[];
  v_destinatario   record;
BEGIN
  -- Auth check: usuário precisa estar logado
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  -- Permissão: vendas.criar
  SELECT permissoes->'vendas'->>'criar' INTO v_perm_criar
  FROM usuarios u JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = v_uid;
  IF v_perm_criar IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Sem permissão para criar vendas.' USING ERRCODE = '42501';
  END IF;

  -- Empresa: precisa ser uma das empresas do usuário
  v_user_empresas := app_user_empresas();
  IF NOT (v_empresa_id = ANY(v_user_empresas)) THEN
    RAISE EXCEPTION 'Empresa fora do escopo do usuário.' USING ERRCODE = '42501';
  END IF;

  -- Cliente: usa existente OU cria novo
  IF v_cliente_id IS NULL AND v_cliente_novo IS NULL THEN
    RAISE EXCEPTION 'Cliente obrigatório.' USING ERRCODE = '22023';
  END IF;

  IF v_cliente_id IS NULL THEN
    -- Cria cliente novo
    IF v_cliente_novo->>'nome' IS NULL OR v_cliente_novo->>'cpf' IS NULL THEN
      RAISE EXCEPTION 'Cliente novo precisa de nome e CPF.' USING ERRCODE = '22023';
    END IF;

    -- Detecta duplicate por CPF na empresa
    SELECT id INTO v_cliente_id FROM clientes
    WHERE empresa_id = v_empresa_id AND cpf = v_cliente_novo->>'cpf';

    IF v_cliente_id IS NULL THEN
      INSERT INTO clientes (
        empresa_id, nome, email, telefone, cpf, data_nascimento,
        tipo, dia_faturamento, status
      ) VALUES (
        v_empresa_id,
        v_cliente_novo->>'nome',
        COALESCE(v_cliente_novo->>'email', ''),
        COALESCE(v_cliente_novo->>'telefone', ''),
        v_cliente_novo->>'cpf',
        nullif(v_cliente_novo->>'data_nascimento', '')::date,
        COALESCE(v_cliente_novo->>'tipo', 'regular'),
        nullif(v_cliente_novo->>'dia_faturamento', '')::int,
        'ativo'
      )
      RETURNING id INTO v_cliente_id;
    END IF;
  END IF;

  -- Cria a venda em status pendente_validacao
  INSERT INTO vendas (
    empresa_id, cliente_id, usuario_id, data_venda, origem,
    indicacao_percentual, pax, status, observacoes
  ) VALUES (
    v_empresa_id, v_cliente_id, v_usuario_id, v_data_venda, v_origem,
    v_indicacao, v_pax, 'pendente_validacao', v_observacoes
  )
  RETURNING id INTO v_venda_id;

  -- Produtos
  FOR v_produto IN SELECT * FROM jsonb_array_elements(v_produtos)
  LOOP
    -- Resolve tipo_produto_nome via lookup
    SELECT id, nome INTO v_tipo_produto
    FROM tipos_produto
    WHERE id = (v_produto->>'tipo_produto_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tipo de produto inválido.' USING ERRCODE = '23503';
    END IF;

    INSERT INTO venda_produtos (
      venda_id, ordem,
      tipo_produto_id, tipo_produto_nome,
      fornecedor_id, fornecedor_nome,
      localizador, localizador_fornecedor, destino,
      data_inicio_viagem, data_fim_viagem,
      valores_extras, tipo_comissao,
      valor_venda, valor_custo,
      rav, rav_extra_cliente, rav_extra_fornecedor,
      comissao_vendedor,
      pgto_forma, pgto_cartao_id, pgto_valor_total,
      pgto_entrada, pgto_num_parcelas, pgto_valor_parcela,
      pgto_data_debito
    ) VALUES (
      v_venda_id,
      COALESCE((v_produto->>'ordem')::int, 1),
      v_tipo_produto.id,
      v_tipo_produto.nome,
      nullif(v_produto->>'fornecedor_id', '')::uuid,
      COALESCE(v_produto->>'fornecedor_nome', ''),
      v_produto->>'localizador',
      v_produto->>'localizador_fornecedor',
      v_produto->>'destino',
      nullif(v_produto->>'data_inicio_viagem', '')::date,
      nullif(v_produto->>'data_fim_viagem', '')::date,
      COALESCE(v_produto->'valores_extras', '{}'::jsonb),
      v_produto->>'tipo_comissao',
      (v_produto->>'valor_venda')::numeric,
      (v_produto->>'valor_custo')::numeric,
      nullif(v_produto->>'rav', '')::numeric,
      COALESCE((v_produto->>'rav_extra_cliente')::numeric, 0),
      COALESCE((v_produto->>'rav_extra_fornecedor')::numeric, 0),
      nullif(v_produto->>'comissao_vendedor', '')::numeric,
      v_produto->>'pgto_forma',
      nullif(v_produto->>'pgto_cartao_id', '')::uuid,
      nullif(v_produto->>'pgto_valor_total', '')::numeric,
      COALESCE((v_produto->>'pgto_entrada')::numeric, 0),
      COALESCE((v_produto->>'pgto_num_parcelas')::int, 1),
      nullif(v_produto->>'pgto_valor_parcela', '')::numeric,
      nullif(v_produto->>'pgto_data_debito', '')::date
    )
    RETURNING id INTO v_produto_id;
  END LOOP;

  -- Passageiros (insere; se array vazio, cria 1 com nome do cliente)
  IF jsonb_array_length(v_passageiros) = 0 THEN
    INSERT INTO venda_passageiros (venda_id, nome, ordem)
    SELECT v_venda_id, c.nome, 1
    FROM clientes c WHERE c.id = v_cliente_id
    RETURNING id INTO v_passageiro_id;
    v_passageiros_ids := array_append(v_passageiros_ids, v_passageiro_id);
  ELSE
    FOR v_passageiro IN SELECT * FROM jsonb_array_elements(v_passageiros)
    LOOP
      INSERT INTO venda_passageiros (
        venda_id, nome, cpf, data_nascimento, ordem
      ) VALUES (
        v_venda_id,
        v_passageiro->>'nome',
        v_passageiro->>'cpf',
        nullif(v_passageiro->>'data_nascimento', '')::date,
        COALESCE((v_passageiro->>'ordem')::int, 1)
      )
      RETURNING id INTO v_passageiro_id;
      v_passageiros_ids := array_append(v_passageiros_ids, v_passageiro_id);
    END LOOP;
  END IF;

  -- Associação N:M passageiro-produto (default: todos passageiros em todos produtos)
  INSERT INTO venda_produto_passageiros (venda_produto_id, venda_passageiro_id)
  SELECT vp.id, unnest(v_passageiros_ids)
  FROM venda_produtos vp
  WHERE vp.venda_id = v_venda_id;

  -- Cobrança (1 cobranca + N itens)
  IF v_cobranca IS NOT NULL THEN
    INSERT INTO cobranca_cliente (venda_id, valor_total, observacoes)
    VALUES (
      v_venda_id,
      (v_cobranca->>'valor_total')::numeric,
      v_cobranca->>'observacoes'
    )
    RETURNING id INTO v_cobranca_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cobranca->'itens', '[]'::jsonb))
    LOOP
      INSERT INTO cobranca_cliente_itens (
        cobranca_id, tipo, valor_total, num_parcelas, valor_parcela,
        plataforma_link, taxa_adquirente, valor_liquido,
        data_inicio, data_primeiro_recebimento, fornecedor_destino, observacoes
      ) VALUES (
        v_cobranca_id,
        v_item->>'tipo',
        (v_item->>'valor_total')::numeric,
        COALESCE((v_item->>'num_parcelas')::int, 1),
        nullif(v_item->>'valor_parcela', '')::numeric,
        v_item->>'plataforma_link',
        nullif(v_item->>'taxa_adquirente', '')::numeric,
        nullif(v_item->>'valor_liquido', '')::numeric,
        nullif(v_item->>'data_inicio', '')::date,
        nullif(v_item->>'data_primeiro_recebimento', '')::date,
        v_item->>'fornecedor_destino',
        v_item->>'observacoes'
      );
    END LOOP;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (
    usuario_id, empresa_id, acao, entidade, entidade_id, dados_depois
  ) VALUES (
    v_uid, v_empresa_id, 'criar', 'venda', v_venda_id, p_payload
  );

  -- Lembretes pros usuários com vendas.aprovar = true (Admin/Gerente),
  -- excluindo o próprio agente que criou.
  FOR v_destinatario IN
    SELECT DISTINCT u.id
    FROM usuarios u
    JOIN perfis_acesso p ON p.id = u.perfil_id
    WHERE u.ativo = true
      AND u.id <> v_usuario_id
      AND p.permissoes->'vendas'->>'aprovar' = 'true'
  LOOP
    INSERT INTO lembretes (
      tipo, referencia_tipo, referencia_id,
      destinatario_id, empresa_id,
      data_lembrete, mensagem, status
    ) VALUES (
      'venda_pendente_validacao', 'venda', v_venda_id,
      v_destinatario.id, v_empresa_id,
      CURRENT_DATE,
      'Nova venda aguardando aprovação.',
      'pendente'
    );
  END LOOP;

  RETURN v_venda_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION criar_venda_completa FROM anon, public;
GRANT EXECUTE ON FUNCTION criar_venda_completa TO authenticated, service_role;

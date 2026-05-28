-- =============================================================================
-- 054 — Novo tipo de lembrete: venda_excluida
-- =============================================================================
-- A RPC excluir_venda (migration 045) insere um lembrete pro agente quando
-- sua venda é apagada, mas estava reusando o tipo 'venda_em_revisao' — que
-- o frontend mapeia para o título "Venda devolvida para revisão". Resultado:
-- o usuário recebia uma notificação com título errado.
--
-- Esta migration:
--   1. Adiciona 'venda_excluida' ao CHECK de lembretes.tipo
--   2. Atualiza excluir_venda para inserir o lembrete com o tipo correto
--   3. Faz backfill: lembretes já criados com tipo='venda_em_revisao' cuja
--      mensagem contém "foi excluída do sistema" são re-tipados.
-- =============================================================================

-- ── 1. Expande o CHECK do tipo ───────────────────────────────────────────────
-- Inclui também 'agenda_compartilhada' (já em uso no banco mas que nunca foi
-- adicionado oficialmente ao CHECK — aproveita a migration pra consolidar).
ALTER TABLE lembretes DROP CONSTRAINT IF EXISTS lembretes_tipo_check;
ALTER TABLE lembretes ADD CONSTRAINT lembretes_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'faturamento_fechamento',
    'faturamento_vencimento',
    'cartao_vencimento',
    'parcela_atrasada',
    'venda_pendente_validacao',
    'venda_aprovada',
    'venda_em_revisao',
    'venda_excluida',
    'agenda_compartilhada'
  ]));

-- ── 2. Backfill de lembretes preexistentes ───────────────────────────────────
UPDATE lembretes
SET tipo = 'venda_excluida'
WHERE tipo = 'venda_em_revisao'
  AND mensagem LIKE '%foi excluída do sistema%';

-- ── 3. Atualiza excluir_venda para usar o tipo correto ───────────────────────
CREATE OR REPLACE FUNCTION public.excluir_venda(
  p_venda_id uuid,
  p_motivo   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_perm_excluir  text;
  v_empresa_id    uuid;
  v_identificador text;
  v_status        text;
  v_usuario_id    uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT permissoes->'vendas'->>'excluir' INTO v_perm_excluir
  FROM usuarios u JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = v_uid;

  IF v_perm_excluir IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Sem permissão para excluir vendas.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id, identificador, status, usuario_id
    INTO v_empresa_id, v_identificador, v_status, v_usuario_id
    FROM vendas WHERE id = p_venda_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = '02000';
  END IF;

  -- Audit log antes da deleção física (preserva histórico)
  INSERT INTO audit_logs (usuario_id, empresa_id, acao, entidade, entidade_id, dados_depois)
  VALUES (
    v_uid, v_empresa_id, 'excluir', 'venda', p_venda_id,
    jsonb_build_object(
      'identificador',  v_identificador,
      'status_anterior', v_status,
      'usuario_id',     v_usuario_id,
      'motivo',         p_motivo
    )
  );

  -- Notifica o responsável (se outro usuário) que a venda foi removida
  IF v_usuario_id IS NOT NULL AND v_usuario_id <> v_uid THEN
    INSERT INTO lembretes (
      tipo, referencia_tipo, referencia_id,
      destinatario_id, empresa_id,
      data_lembrete, mensagem, status
    ) VALUES (
      'venda_excluida', 'venda', NULL,
      v_usuario_id, v_empresa_id,
      CURRENT_DATE,
      'A venda ' || v_identificador || ' foi excluída do sistema'
      || COALESCE(' — motivo: ' || p_motivo, '') || '.',
      'pendente'
    );
  END IF;

  -- DELETE em cascade pra venda_produtos, venda_passageiros, cobranca_cliente.
  -- parcelas_receber NO ACTION: limpamos manualmente (V1 ainda não usa).
  DELETE FROM parcelas_receber WHERE venda_id = p_venda_id;
  DELETE FROM vendas WHERE id = p_venda_id;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_venda(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.excluir_venda(uuid, text) TO authenticated;

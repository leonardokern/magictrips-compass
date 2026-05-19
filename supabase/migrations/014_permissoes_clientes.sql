-- =============================================================================
-- 014 — Permissões de clientes para Gerente e Agente
-- =============================================================================
-- Conforme estratégia incremental do roadmap V1.0: cada módulo construído
-- adiciona suas permissões aos perfis Gerente e Agente.
--
-- Administrador já tem permissão total (seed da migration 001).
-- Gerente e Agente ganham {ler, criar, editar} em clientes.
-- Excluir cliente continua restrito ao Administrador.
-- =============================================================================

-- jsonb_set é idempotente: rodar de novo não duplica.
UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{clientes}',
  jsonb_build_object(
    'ler', true,
    'criar', true,
    'editar', true,
    'excluir', false
  ),
  true
)
WHERE nome IN ('Gerente', 'Agente');

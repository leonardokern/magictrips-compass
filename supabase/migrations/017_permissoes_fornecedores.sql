-- =============================================================================
-- 017 — Permissões fornecedores
-- =============================================================================
-- Gerente + Agente ganham fornecedores:{ler}.
-- Criar/editar/excluir continua restrito ao Administrador.
--
-- Nota: a RLS de fornecedores permite INSERT por qualquer usuário autenticado
-- (policy fornecedores_insert_autenticado da migration 013) — isso é usado
-- pelo fluxo "Outros" da venda no futuro, quando agente pode cadastrar
-- fornecedor inline. A página dedicada /fornecedores continua restrita.
-- =============================================================================

UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{fornecedores}',
  jsonb_build_object(
    'ler', true,
    'criar', false,
    'editar', false,
    'excluir', false
  ),
  true
)
WHERE nome IN ('Gerente', 'Agente');

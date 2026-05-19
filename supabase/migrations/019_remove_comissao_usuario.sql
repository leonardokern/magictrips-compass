-- =============================================================================
-- 019 — Remove comissao_percentual de usuarios + permissões do módulo comissoes
-- =============================================================================
-- A comissão deixa de ser por usuário. Passa a ser uma matriz
-- empresa × origem definida em comissoes_regras (migration 018).
--
-- Permissões iniciais:
--   Administrador → tudo (seed da migration 001)
--   Gerente      → ler + editar (precisa ajustar percentuais)
--   Agente       → nenhuma (não vê comissões)
-- =============================================================================

ALTER TABLE usuarios DROP COLUMN IF EXISTS comissao_percentual;

-- Atualiza Administrador (acrescenta o novo módulo)
UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{comissoes}',
  jsonb_build_object('ler', true, 'criar', true, 'editar', true, 'excluir', true),
  true
)
WHERE nome = 'Administrador';

-- Gerente: ler + editar
UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{comissoes}',
  jsonb_build_object('ler', true, 'criar', false, 'editar', true, 'excluir', false),
  true
)
WHERE nome = 'Gerente';

-- Agente: sem permissão (jsonb_set não é necessário — ausência = false)
UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{comissoes}',
  jsonb_build_object('ler', false, 'criar', false, 'editar', false, 'excluir', false),
  true
)
WHERE nome = 'Agente';

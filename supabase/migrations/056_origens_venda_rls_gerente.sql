-- =============================================================================
-- 056 — Origens de venda: RLS de escrita também para Gerente
-- =============================================================================
-- Mesmo padrão da migration 055 (cartoes): a policy `origens_venda_admin`
-- (migration 027) restringia INSERT/UPDATE/DELETE só a Administrador.
-- Gerente é quem opera o catálogo de origens (parte da gestão de Comissões),
-- então deve poder editar.
--
-- Origens é um catálogo GLOBAL (não tem empresa_id), por isso o filtro é
-- apenas pelo papel do usuário.
--
-- Defesa em profundidade: o Server Action checa `can(user, ...)` antes do banco.
-- =============================================================================

DROP POLICY IF EXISTS origens_venda_admin ON origens_venda;

CREATE POLICY origens_venda_write ON origens_venda
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

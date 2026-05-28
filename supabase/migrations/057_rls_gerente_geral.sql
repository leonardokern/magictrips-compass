-- =============================================================================
-- 057 — RLS: abre Gerente nas tabelas onde o JSONB do perfil já permite
-- =============================================================================
-- Auditoria pós-correção de cartões (055) e origens_venda (056): várias outras
-- tabelas seguem o mesmo padrão herdado das migrations 012/021 — escrita
-- restrita ao Administrador no Postgres, apesar do JSONB do perfil Gerente
-- conceder full CRUD. O resultado é UPDATE silencioso (0 rows affected) que
-- aparenta sucesso na UI.
--
-- Esta migration alinha:
--   - perfis_acesso         (Gerente tem perfis:{ler,criar,editar,excluir})
--   - perfis_comissoes      (Gerente tem comissoes:{ler,editar})
--   - usuarios              (Gerente tem usuarios:{ler,criar,editar,excluir})
--   - usuarios_empresas     (vinculação usada na edição de usuário)
--   - fornecedores          (Gerente tem fornecedores:{ler,criar,editar,excluir})
--   - fornecedor_tipos_produto (mesma família de fornecedores)
--
-- NÃO mexe nas tabelas que devem permanecer Admin Master only:
--   - empresas            (gestão de empresas no schema)
--   - feature_flags       (controle de plataforma)
--   - integration_logs    (auditoria de integrações)
--   - clientes_delete     (filosofia "inativar > excluir" — só Admin força)
--   - lembretes_admin_delete (Gerente já dispensa os próprios via update_self)
--   - audit_logs          (imutável, RLS bloqueia tudo exceto SELECT)
--
-- Defesa em profundidade: Server Actions continuam checando `can()` antes de
-- chamar o banco — RLS é segunda camada.
-- =============================================================================

-- ── perfis_acesso ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS perfis_admin_write ON perfis_acesso;
CREATE POLICY perfis_write ON perfis_acesso
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ── perfis_comissoes ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS perfis_comissoes_admin ON perfis_comissoes;
CREATE POLICY perfis_comissoes_write ON perfis_comissoes
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ── usuarios ────────────────────────────────────────────────────────────────
-- usuarios_self_update permanece (qualquer usuário edita seu próprio perfil).
DROP POLICY IF EXISTS usuarios_admin_write ON usuarios;
CREATE POLICY usuarios_write ON usuarios
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ── usuarios_empresas ───────────────────────────────────────────────────────
-- SELECT expande pra Gerente ver linhas de quem compartilha empresa com ele;
-- WRITE abre pra Gerente (já filtrado pelo Server Action por empresa).
DROP POLICY IF EXISTS usuarios_empresas_select ON usuarios_empresas;
CREATE POLICY usuarios_empresas_select ON usuarios_empresas
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_administrador()
    OR (is_gerente() AND compartilham_empresa(usuario_id))
  );

DROP POLICY IF EXISTS usuarios_empresas_admin_write ON usuarios_empresas;
CREATE POLICY usuarios_empresas_write ON usuarios_empresas
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ── fornecedores ────────────────────────────────────────────────────────────
-- Mantém `fornecedores_insert_autenticado` (inline create durante venda).
DROP POLICY IF EXISTS fornecedores_admin_write ON fornecedores;
CREATE POLICY fornecedores_write ON fornecedores
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ── fornecedor_tipos_produto ────────────────────────────────────────────────
DROP POLICY IF EXISTS ftp_admin_write ON fornecedor_tipos_produto;
CREATE POLICY ftp_write ON fornecedor_tipos_produto
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- =============================================================================
-- 022 — Atualizar helpers RLS pra multi-empresa
-- =============================================================================
-- app_user_empresa_id() (singular) foi dropada na migration 021. Aqui criamos:
--   - app_user_empresas() — retorna uuid[] com TODAS as empresas do usuário
--   - mesma_empresa(uuid) — agora checa se o id está no array
--
-- Também recriamos as policies que foram dropadas em cascade:
--   - usuarios_select (usava empresa_id direto)
--   - empresas_select (usava app_user_empresa_id direto)
-- =============================================================================

-- app_user_empresas: array de UUIDs das empresas do usuário autenticado
CREATE OR REPLACE FUNCTION app_user_empresas()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(ue.empresa_id),
    ARRAY[]::uuid[]
  )
  FROM usuarios u
  LEFT JOIN usuarios_empresas ue ON ue.usuario_id = u.id
  WHERE u.id = auth.uid()
    AND u.ativo = true;
$$;

REVOKE EXECUTE ON FUNCTION app_user_empresas() FROM anon, public;
GRANT EXECUTE ON FUNCTION app_user_empresas() TO authenticated, service_role;

COMMENT ON FUNCTION app_user_empresas IS 'Array de empresa_ids que o usuário autenticado pode acessar. Vazio se desativado.';

-- Atualiza mesma_empresa pra checar inclusão no array
CREATE OR REPLACE FUNCTION mesma_empresa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    is_administrador()
    OR p_empresa_id = ANY(app_user_empresas());
$$;

REVOKE EXECUTE ON FUNCTION mesma_empresa(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION mesma_empresa(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Recriar policies dropadas
-- ---------------------------------------------------------------------------

-- usuarios_select: Administrador vê todos; demais veem só si mesmos +
-- colegas das empresas que compartilham
DROP POLICY IF EXISTS usuarios_select ON usuarios;

CREATE POLICY usuarios_select ON usuarios
  FOR SELECT TO authenticated
  USING (
    is_administrador()
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM usuarios_empresas ue
      WHERE ue.usuario_id = usuarios.id
        AND ue.empresa_id = ANY(app_user_empresas())
    )
  );

-- empresas_select: Administrador vê todas; demais veem só as suas
DROP POLICY IF EXISTS empresas_select ON empresas;

CREATE POLICY empresas_select ON empresas
  FOR SELECT TO authenticated
  USING (
    is_administrador()
    OR id = ANY(app_user_empresas())
  );

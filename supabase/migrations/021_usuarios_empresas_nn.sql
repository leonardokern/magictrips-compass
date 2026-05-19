-- =============================================================================
-- 021 — Multi-empresa por usuário (N:N usuarios_empresas)
-- =============================================================================
-- Substitui o modelo anterior onde:
--   - empresa_id = NULL significava "Admin Master vê todas"
--   - empresa_id = X significava "usuário pertence a uma única empresa"
--
-- Agora:
--   - Cada usuário tem 1+ empresas em usuarios_empresas
--   - "Admin Master" deixa de ser caso especial — é apenas um Administrador
--     com TODAS as empresas marcadas
--
-- Migração de dados:
--   - Usuários com empresa_id=NULL (atual Admin Master) → 1 row por empresa
--     ativa em usuarios_empresas
--   - Usuários com empresa_id=X → 1 row (esse usuário só vê essa empresa)
-- =============================================================================

CREATE TABLE usuarios_empresas (
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, empresa_id)
);

COMMENT ON TABLE usuarios_empresas IS 'N:N — empresas que um usuário pode visualizar/operar.';

CREATE INDEX idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id);
CREATE INDEX idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);

-- ---------------------------------------------------------------------------
-- RLS — leitura: usuário vê suas próprias empresas + administrador vê todas
-- Escrita: só Administrador (via RPC criar_usuario_admin) ou direto via
-- service_role.
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_empresas_select ON usuarios_empresas
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR is_administrador()
  );

CREATE POLICY usuarios_empresas_admin_write ON usuarios_empresas
  FOR ALL TO authenticated
  USING (is_administrador())
  WITH CHECK (is_administrador());

-- ---------------------------------------------------------------------------
-- Migração de dados
-- ---------------------------------------------------------------------------
-- Para cada usuário com empresa_id=NULL, criar N rows (uma por empresa ativa)
INSERT INTO usuarios_empresas (usuario_id, empresa_id)
SELECT u.id, e.id
FROM usuarios u
CROSS JOIN empresas e
WHERE u.empresa_id IS NULL
  AND e.ativo = true;

-- Para cada usuário com empresa_id setado, criar 1 row
INSERT INTO usuarios_empresas (usuario_id, empresa_id)
SELECT id, empresa_id
FROM usuarios
WHERE empresa_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Drop a coluna empresa_id de usuarios (não usada mais)
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios DROP COLUMN empresa_id;

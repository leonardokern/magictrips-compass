-- =============================================================================
-- 026 — Tipo de perfil (operação / agente) + overrides de comissão por perfil
-- =============================================================================
-- Novos conceitos:
--   • perfis_acesso.tipo: 'operacao' ou 'agente'
--     - 'operacao' → empresa_id obrigatoriamente NULL (cross-empresa).
--                    Usuários escolhem quais empresas têm acesso.
--     - 'agente'   → empresa_id NOT NULL (scoped à empresa do perfil).
--                    Usuário fica restrito àquela empresa única.
--   • perfis_comissoes: tabela de overrides por perfil (somente para agente).
--     Só armazena valores DIFERENTES do default de comissoes_regras (empresa).
--     Lookup com fallback: se não existir linha, usa comissoes_regras.
-- =============================================================================

-- 1. Coluna tipo
ALTER TABLE perfis_acesso
ADD COLUMN IF NOT EXISTS tipo text;

UPDATE perfis_acesso
SET tipo = CASE
  WHEN empresa_id IS NULL THEN 'operacao'
  ELSE 'agente'
END
WHERE tipo IS NULL;

ALTER TABLE perfis_acesso
ALTER COLUMN tipo SET NOT NULL;

ALTER TABLE perfis_acesso
ADD CONSTRAINT perfis_acesso_tipo_check CHECK (tipo IN ('operacao', 'agente'));

-- Operação SEMPRE cross-empresa; Agente SEMPRE scoped a uma empresa.
ALTER TABLE perfis_acesso
ADD CONSTRAINT perfis_acesso_tipo_escopo_check CHECK (
  (tipo = 'agente' AND empresa_id IS NOT NULL)
  OR (tipo = 'operacao' AND empresa_id IS NULL)
);

CREATE INDEX IF NOT EXISTS perfis_acesso_tipo_idx ON perfis_acesso(tipo);

-- 2. Tabela de overrides de comissão (somente perfis tipo='agente')
CREATE TABLE IF NOT EXISTS perfis_comissoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id   uuid NOT NULL REFERENCES perfis_acesso(id) ON DELETE CASCADE,
  origem      text NOT NULL,
  percentual  numeric(5, 2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  observacao  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (perfil_id, origem)
);

CREATE INDEX IF NOT EXISTS perfis_comissoes_perfil_id_idx ON perfis_comissoes(perfil_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_perfis_comissoes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfis_comissoes_updated_at ON perfis_comissoes;
CREATE TRIGGER trg_perfis_comissoes_updated_at
BEFORE UPDATE ON perfis_comissoes
FOR EACH ROW EXECUTE FUNCTION trg_perfis_comissoes_set_updated_at();

-- 3. Garante consistência: override só pode existir pra perfis tipo='agente'
CREATE OR REPLACE FUNCTION enforce_override_apenas_para_agente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
BEGIN
  SELECT tipo INTO v_tipo FROM perfis_acesso WHERE id = NEW.perfil_id;
  IF v_tipo IS DISTINCT FROM 'agente' THEN
    RAISE EXCEPTION 'Overrides de comissão só se aplicam a perfis tipo=agente.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfis_comissoes_validate_tipo ON perfis_comissoes;
CREATE TRIGGER trg_perfis_comissoes_validate_tipo
BEFORE INSERT OR UPDATE ON perfis_comissoes
FOR EACH ROW EXECUTE FUNCTION enforce_override_apenas_para_agente();

-- 4. RLS
ALTER TABLE perfis_comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS perfis_comissoes_select ON perfis_comissoes;
CREATE POLICY perfis_comissoes_select ON perfis_comissoes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS perfis_comissoes_admin ON perfis_comissoes;
CREATE POLICY perfis_comissoes_admin ON perfis_comissoes
FOR ALL TO authenticated
USING (is_administrador())
WITH CHECK (is_administrador());

-- 5. RPC pra resolver a comissão efetiva (override OR fallback empresa)
-- Útil pra cálculos downstream e pra UI saber o valor efetivo.
CREATE OR REPLACE FUNCTION comissao_efetiva_perfil(
  p_perfil_id uuid,
  p_origem    text
) RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override   numeric;
  v_empresa_id uuid;
  v_default    numeric;
BEGIN
  -- 1. Tenta override do perfil
  SELECT percentual INTO v_override
  FROM perfis_comissoes
  WHERE perfil_id = p_perfil_id AND origem = p_origem;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  -- 2. Cai no default da empresa do perfil
  SELECT empresa_id INTO v_empresa_id FROM perfis_acesso WHERE id = p_perfil_id;
  IF v_empresa_id IS NULL THEN
    RETURN NULL; -- perfil cross-empresa não tem comissão fixa
  END IF;

  SELECT percentual INTO v_default
  FROM comissoes_regras
  WHERE empresa_id = v_empresa_id AND origem = p_origem;

  RETURN v_default;
END;
$$;

REVOKE EXECUTE ON FUNCTION comissao_efetiva_perfil FROM anon;
GRANT EXECUTE ON FUNCTION comissao_efetiva_perfil TO authenticated, service_role;

-- =============================================================================
-- 027 — Catálogo de origens de venda + FK refactor
-- =============================================================================
-- Substitui o `origem text` redundante em comissoes_regras e perfis_comissoes
-- por uma tabela catálogo `origens_venda` com FK. Permite renomear/excluir/criar
-- origens via UI sem mexer no schema.
-- =============================================================================

CREATE TABLE IF NOT EXISTS origens_venda (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL UNIQUE,
  ativo       boolean NOT NULL DEFAULT true,
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION trg_origens_venda_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_origens_venda_updated_at ON origens_venda;
CREATE TRIGGER trg_origens_venda_updated_at
BEFORE UPDATE ON origens_venda
FOR EACH ROW EXECUTE FUNCTION trg_origens_venda_set_updated_at();

-- Seed a partir das origens já existentes em comissoes_regras
INSERT INTO origens_venda (nome, ordem)
SELECT DISTINCT origem, 0 FROM comissoes_regras
ON CONFLICT (nome) DO NOTHING;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nome) - 1 AS r FROM origens_venda
)
UPDATE origens_venda ov SET ordem = ranked.r FROM ranked WHERE ov.id = ranked.id;

ALTER TABLE origens_venda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS origens_venda_select ON origens_venda;
CREATE POLICY origens_venda_select ON origens_venda
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS origens_venda_admin ON origens_venda;
CREATE POLICY origens_venda_admin ON origens_venda
FOR ALL TO authenticated
USING (is_administrador())
WITH CHECK (is_administrador());

-- FK em comissoes_regras
ALTER TABLE comissoes_regras
ADD COLUMN IF NOT EXISTS origem_id uuid REFERENCES origens_venda(id) ON DELETE CASCADE;

UPDATE comissoes_regras cr
SET origem_id = ov.id
FROM origens_venda ov
WHERE ov.nome = cr.origem AND cr.origem_id IS NULL;

ALTER TABLE comissoes_regras ALTER COLUMN origem_id SET NOT NULL;
ALTER TABLE comissoes_regras DROP CONSTRAINT IF EXISTS comissoes_regras_empresa_id_origem_key;
ALTER TABLE comissoes_regras
ADD CONSTRAINT comissoes_regras_empresa_origem_unique UNIQUE (empresa_id, origem_id);
ALTER TABLE comissoes_regras DROP COLUMN IF EXISTS origem;
CREATE INDEX IF NOT EXISTS comissoes_regras_origem_id_idx ON comissoes_regras(origem_id);

-- FK em perfis_comissoes
ALTER TABLE perfis_comissoes
ADD COLUMN IF NOT EXISTS origem_id uuid REFERENCES origens_venda(id) ON DELETE CASCADE;

UPDATE perfis_comissoes pc
SET origem_id = ov.id
FROM origens_venda ov
WHERE ov.nome = pc.origem AND pc.origem_id IS NULL;

ALTER TABLE perfis_comissoes ALTER COLUMN origem_id SET NOT NULL;
ALTER TABLE perfis_comissoes DROP CONSTRAINT IF EXISTS perfis_comissoes_perfil_id_origem_key;
ALTER TABLE perfis_comissoes
ADD CONSTRAINT perfis_comissoes_perfil_origem_unique UNIQUE (perfil_id, origem_id);
ALTER TABLE perfis_comissoes DROP COLUMN IF EXISTS origem;
CREATE INDEX IF NOT EXISTS perfis_comissoes_origem_id_idx ON perfis_comissoes(origem_id);

-- comissao_efetiva_perfil agora aceita origem_id
DROP FUNCTION IF EXISTS comissao_efetiva_perfil(uuid, text);
DROP FUNCTION IF EXISTS comissao_efetiva_perfil(uuid, uuid);

CREATE OR REPLACE FUNCTION comissao_efetiva_perfil(
  p_perfil_id uuid,
  p_origem_id uuid
) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_override numeric; v_empresa_id uuid; v_default numeric;
BEGIN
  SELECT percentual INTO v_override
  FROM perfis_comissoes
  WHERE perfil_id = p_perfil_id AND origem_id = p_origem_id;
  IF FOUND THEN RETURN v_override; END IF;

  SELECT empresa_id INTO v_empresa_id FROM perfis_acesso WHERE id = p_perfil_id;
  IF v_empresa_id IS NULL THEN RETURN NULL; END IF;

  SELECT percentual INTO v_default
  FROM comissoes_regras
  WHERE empresa_id = v_empresa_id AND origem_id = p_origem_id;
  RETURN v_default;
END;
$$;

REVOKE EXECUTE ON FUNCTION comissao_efetiva_perfil FROM anon;
GRANT EXECUTE ON FUNCTION comissao_efetiva_perfil TO authenticated, service_role;

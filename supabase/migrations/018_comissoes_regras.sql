-- =============================================================================
-- 018 — Matriz de comissões (empresa × origem → percentual)
-- =============================================================================
-- A comissão do vendedor é calculada a partir desta matriz no momento da
-- aprovação da venda. Cada empresa tem regras próprias:
--
--   Magic Trips:
--     30% — leads gerados pela empresa (tráfego pago, LP, chat, redes, etc.)
--     40% — indicações gerais, carteira comum, Cliente Antigo, Parceiros
--     50% — Lead Próprio do Agente (relacionamento pessoal sem custo)
--
--   Del Mondo:
--     12% — para todas as origens (regra única da Jéssica)
--
-- O campo vendas.comissao_vendedor permanece existindo — o admin pode
-- sobrescrever pontualmente em "exceções administrativas".
-- =============================================================================

CREATE TABLE comissoes_regras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  origem      text NOT NULL,
  percentual  numeric(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  observacao  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_comissao_empresa_origem UNIQUE (empresa_id, origem),
  CONSTRAINT chk_comissao_origem_valida CHECK (origem IN (
    'Cliente Antigo',
    'Tráfego Pago',
    'Remarketing',
    'Landing Page',
    'Chat Online',
    'Redes Sociais',
    'Indicação de Cliente',
    'Indicação dos Sócios',
    'Lead Próprio do Agente',
    'Parceiros',
    'Outros'
  ))
);

COMMENT ON TABLE comissoes_regras IS
  'Matriz de comissão padrão (empresa × origem do lead). Editável por Administrador e Gerente.';

CREATE INDEX idx_comissoes_empresa ON comissoes_regras(empresa_id);

CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON comissoes_regras
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — leitura para todos os autenticados (precisam saber o % na hora da venda),
-- escrita apenas Administrador e Gerente.
-- ---------------------------------------------------------------------------
ALTER TABLE comissoes_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY comissoes_select ON comissoes_regras
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY comissoes_admin_gerente_write ON comissoes_regras
  FOR ALL TO authenticated
  USING (is_administrador() OR is_gerente())
  WITH CHECK (is_administrador() OR is_gerente());

-- ---------------------------------------------------------------------------
-- Seed: Magic Trips (régua 30/40/50)
-- ---------------------------------------------------------------------------
INSERT INTO comissoes_regras (empresa_id, origem, percentual, observacao)
SELECT
  e.id,
  v.origem,
  v.percentual,
  v.observacao
FROM empresas e
CROSS JOIN (VALUES
  ('Tráfego Pago',           30.00, 'Lead online pago — empresa'),
  ('Remarketing',            30.00, 'Lead online pago — empresa'),
  ('Landing Page',           30.00, 'Lead online — empresa'),
  ('Chat Online',            30.00, 'Lead online — empresa'),
  ('Redes Sociais',          30.00, 'Lead online — empresa'),
  ('Cliente Antigo',         40.00, 'Carteira / recorrência'),
  ('Indicação de Cliente',   40.00, 'Indicação geral'),
  ('Indicação dos Sócios',   40.00, 'Indicação geral'),
  ('Parceiros',              40.00, 'Indicação via parceiro'),
  ('Outros',                 40.00, 'Default'),
  ('Lead Próprio do Agente', 50.00, 'Relacionamento pessoal, sem custo pra empresa')
) AS v(origem, percentual, observacao)
WHERE e.slug = 'magic-trips';

-- ---------------------------------------------------------------------------
-- Seed: Del Mondo (12% fixo em todas as origens)
-- ---------------------------------------------------------------------------
INSERT INTO comissoes_regras (empresa_id, origem, percentual, observacao)
SELECT
  e.id,
  v.origem,
  12.00,
  'Regra Del Mondo — 12% fixo'
FROM empresas e
CROSS JOIN (VALUES
  ('Cliente Antigo'),
  ('Tráfego Pago'),
  ('Remarketing'),
  ('Landing Page'),
  ('Chat Online'),
  ('Redes Sociais'),
  ('Indicação de Cliente'),
  ('Indicação dos Sócios'),
  ('Lead Próprio do Agente'),
  ('Parceiros'),
  ('Outros')
) AS v(origem)
WHERE e.slug = 'del-mondo';

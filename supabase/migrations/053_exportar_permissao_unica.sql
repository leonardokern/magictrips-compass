-- =============================================================================
-- 053 — Exportações: permissão única (sem distinção CSV vs Excel)
-- =============================================================================
-- A UI de perfis passou a tratar "exportar" como booleano (ou tem ou não tem
-- acesso a exportações). A granularidade por formato (csv/excel) foi removida
-- do catálogo em lib/constants/permissoes.ts.
--
-- Esta migration normaliza o JSONB `permissoes` dos perfis existentes:
--   - Se permissoes->'exportar' tinha csv=true OU excel=true → vira {ver: true}
--   - Caso contrário                                          → vira {ver: false}
--
-- Perfis que não tinham a chave 'exportar' não são tocados (continuam sem ela;
-- o frontend trata ausência como false via `can()`).
-- =============================================================================

UPDATE perfis_acesso
SET permissoes = jsonb_set(
  permissoes,
  '{exportar}',
  jsonb_build_object(
    'ver',
    COALESCE((permissoes->'exportar'->>'csv')::boolean, false)
      OR COALESCE((permissoes->'exportar'->>'excel')::boolean, false)
  ),
  true
)
WHERE permissoes ? 'exportar';

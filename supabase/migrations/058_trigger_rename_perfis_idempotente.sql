-- =============================================================================
-- 058 — Trigger de proteção de rename de perfis: idempotente
-- =============================================================================
-- A trigger `proteger_rename_perfis_sistema` (migration 001) disparava sempre
-- que NEW.nome <> OLD.nome. Mas em UPDATEs onde o frontend manda o estado
-- completo do form (incluindo nome inalterado), o reassignment do mesmo valor
-- ainda pode tropeçar em comparação de string em casos de borda (whitespace
-- invisível, encoding). Resultado: erro "Perfis fixos não podem ser
-- renomeados" sendo lançado sem que o usuário tenha tentado renomear.
--
-- Esta migration:
--   - Reescreve a função usando trim() em ambos os lados E IS DISTINCT FROM,
--     pra ignorar comparações onde os valores são "logicamente iguais".
--   - O Server Action também foi ajustado pra só incluir nome no payload
--     quando realmente mudou (defesa em profundidade).
-- =============================================================================

CREATE OR REPLACE FUNCTION proteger_rename_perfis_sistema()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.sistema = true
     AND btrim(NEW.nome) IS DISTINCT FROM btrim(OLD.nome) THEN
    RAISE EXCEPTION 'Perfis fixos do sistema não podem ser renomeados (nome=%)', OLD.nome;
  END IF;
  RETURN NEW;
END;
$$;

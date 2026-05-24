-- Migração 041: corrige RLS de usuarios para Gerentes/Agentes
-- =============================================================
-- Problema: a policy `usuarios_select` usa EXISTS (SELECT 1 FROM usuarios_empresas ...)
-- para verificar se dois usuários compartilham empresa. Mas a RLS de `usuarios_empresas`
-- só permite ver o próprio vínculo (usuario_id = auth.uid()), então o EXISTS sempre
-- retorna false para registros de outros usuários — Gerentes não conseguem ver o nome
-- dos Agentes em joins (ex.: lista de vendas).
--
-- Solução: helper SECURITY DEFINER `compartilham_empresa(uuid)` que executa como
-- superusuário e verifica o vínculo corretamente. A policy de `usuarios` passa a
-- usar esta função, eliminando a dependência circular de RLS.

-- ── 1. Cria helper SECURITY DEFINER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compartilham_empresa(p_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios_empresas ue
    WHERE ue.usuario_id = p_usuario_id
      AND ue.empresa_id = ANY(app_user_empresas())
  );
$$;

-- ── 2. Recria policy usuarios_select usando o helper ─────────────────────────
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;

CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT
  USING (
    is_administrador()
    OR (id = auth.uid())
    OR compartilham_empresa(id)
  );

-- =============================================================================
-- 024 — Perfis multi-empresa + Agentes segmentados por empresa
-- =============================================================================
-- Mudanças:
-- 1. Nova coluna perfis_acesso.multi_empresa — true SÓ pra Administrador/Gerente.
-- 2. Drop do perfil genérico "Agente" (0 usuários hoje) e seed dos perfis
--    "Agente Magic Trips" e "Agente Del Mondo" com as mesmas permissões.
-- 3. Trigger em usuarios_empresas que bloqueia múltiplas empresas pra perfis
--    onde multi_empresa = false.
-- 4. RPCs criar_usuario_admin / atualizar_empresas_usuario validam a regra
--    antes de inserir.
-- =============================================================================

-- 1. Coluna multi_empresa em perfis_acesso (default false → novos perfis seguros)
ALTER TABLE perfis_acesso
ADD COLUMN IF NOT EXISTS multi_empresa boolean NOT NULL DEFAULT false;

-- 2. Marca Administrador e Gerente como multi-empresa
UPDATE perfis_acesso
SET multi_empresa = true
WHERE nome IN ('Administrador', 'Gerente');

-- 3. Cria os dois novos perfis clonando as permissões do Agente genérico ANTES de deletá-lo
INSERT INTO perfis_acesso (nome, sistema, ativo, permissoes, multi_empresa)
SELECT 'Agente Magic Trips', true, true, permissoes, false
FROM perfis_acesso
WHERE nome = 'Agente'
ON CONFLICT DO NOTHING;

INSERT INTO perfis_acesso (nome, sistema, ativo, permissoes, multi_empresa)
SELECT 'Agente Del Mondo', true, true, permissoes, false
FROM perfis_acesso
WHERE nome = 'Agente'
ON CONFLICT DO NOTHING;

-- 4. Remove o Agente genérico (0 usuários atribuídos).
-- Tira sistema=true antes pra contornar a trigger proteger_perfis_sistema().
UPDATE perfis_acesso SET sistema = false WHERE nome = 'Agente';
DELETE FROM perfis_acesso WHERE nome = 'Agente';

-- 5. Trigger pra impedir múltiplas empresas em perfis não-multi
CREATE OR REPLACE FUNCTION enforce_single_empresa_se_perfil_nao_multi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pode_multi boolean;
  v_qtd integer;
BEGIN
  SELECT p.multi_empresa
  INTO v_pode_multi
  FROM usuarios u
  JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = NEW.usuario_id;

  -- Se o perfil permite multi (Admin/Gerente), libera
  IF v_pode_multi THEN
    RETURN NEW;
  END IF;

  -- Conta linhas pré-existentes (no UPDATE, exclui a própria linha)
  SELECT COUNT(*)
  INTO v_qtd
  FROM usuarios_empresas
  WHERE usuario_id = NEW.usuario_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_qtd >= 1 THEN
    RAISE EXCEPTION 'O perfil deste usuário permite vínculo com apenas uma empresa.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_empresas_validate_multi ON usuarios_empresas;
CREATE TRIGGER trg_usuarios_empresas_validate_multi
BEFORE INSERT OR UPDATE ON usuarios_empresas
FOR EACH ROW EXECUTE FUNCTION enforce_single_empresa_se_perfil_nao_multi();

-- 6. RPCs atualizadas com validação preliminar (mensagem amigável antes do trigger)
DROP FUNCTION IF EXISTS criar_usuario_admin(text, text, text, uuid, uuid[], text);

CREATE OR REPLACE FUNCTION criar_usuario_admin(
  p_email       text,
  p_senha       text,
  p_nome        text,
  p_perfil_id   uuid,
  p_empresa_ids uuid[],
  p_iniciais    text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := gen_random_uuid();
  v_empresa_id  uuid;
  v_pode_multi  boolean;
BEGIN
  IF NOT is_administrador() THEN
    RAISE EXCEPTION 'Apenas o Administrador pode criar usuários.' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(p_email, '')) < 3 THEN
    RAISE EXCEPTION 'E-mail inválido.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_senha, '')) < 8 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 8 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF p_empresa_ids IS NULL OR array_length(p_empresa_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma empresa.' USING ERRCODE = '22023';
  END IF;

  SELECT multi_empresa INTO v_pode_multi FROM perfis_acesso WHERE id = p_perfil_id;
  IF v_pode_multi IS NULL THEN
    RAISE EXCEPTION 'Perfil inválido.' USING ERRCODE = '23503';
  END IF;
  IF NOT v_pode_multi AND array_length(p_empresa_ids, 1) > 1 THEN
    RAISE EXCEPTION 'Este perfil permite vínculo com apenas uma empresa.' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT unnest(p_empresa_ids) AS eid
    EXCEPT
    SELECT id FROM empresas WHERE ativo = true
  ) THEN
    RAISE EXCEPTION 'Uma ou mais empresas selecionadas são inválidas.' USING ERRCODE = '23503';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated',
    lower(p_email),
    crypt(p_senha, gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'iniciais', p_iniciais),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(p_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now()
  );

  INSERT INTO usuarios (
    id, nome, email, perfil_id, iniciais, ativo, force_password_change
  ) VALUES (
    v_user_id, p_nome, lower(p_email), p_perfil_id, p_iniciais, true, true
  );

  FOREACH v_empresa_id IN ARRAY p_empresa_ids LOOP
    INSERT INTO usuarios_empresas (usuario_id, empresa_id)
    VALUES (v_user_id, v_empresa_id);
  END LOOP;

  INSERT INTO audit_logs (
    usuario_id, empresa_id, acao, entidade, entidade_id, dados_depois
  ) VALUES (
    auth.uid(), p_empresa_ids[1], 'criar', 'usuario', v_user_id,
    jsonb_build_object(
      'nome', p_nome, 'email', lower(p_email),
      'perfil_id', p_perfil_id, 'empresa_ids', p_empresa_ids
    )
  );

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION criar_usuario_admin FROM anon, public;
GRANT EXECUTE ON FUNCTION criar_usuario_admin TO authenticated, service_role;

-- atualizar_empresas_usuario: agora valida contra o perfil corrente
CREATE OR REPLACE FUNCTION atualizar_empresas_usuario(
  p_user_id     uuid,
  p_empresa_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_pode_multi boolean;
BEGIN
  IF NOT is_administrador() THEN
    RAISE EXCEPTION 'Apenas o Administrador pode alterar empresas de um usuário.'
      USING ERRCODE = '42501';
  END IF;
  IF p_empresa_ids IS NULL OR array_length(p_empresa_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma empresa.' USING ERRCODE = '22023';
  END IF;

  SELECT p.multi_empresa
  INTO v_pode_multi
  FROM usuarios u
  JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = p_user_id;

  IF v_pode_multi IS NULL THEN
    RAISE EXCEPTION 'Usuário inválido.' USING ERRCODE = '23503';
  END IF;
  IF NOT v_pode_multi AND array_length(p_empresa_ids, 1) > 1 THEN
    RAISE EXCEPTION 'O perfil deste usuário permite vínculo com apenas uma empresa.'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT unnest(p_empresa_ids) AS eid
    EXCEPT
    SELECT id FROM empresas WHERE ativo = true
  ) THEN
    RAISE EXCEPTION 'Uma ou mais empresas selecionadas são inválidas.' USING ERRCODE = '23503';
  END IF;

  DELETE FROM usuarios_empresas WHERE usuario_id = p_user_id;

  FOREACH v_empresa_id IN ARRAY p_empresa_ids LOOP
    INSERT INTO usuarios_empresas (usuario_id, empresa_id)
    VALUES (p_user_id, v_empresa_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION atualizar_empresas_usuario FROM anon, public;
GRANT EXECUTE ON FUNCTION atualizar_empresas_usuario TO authenticated, service_role;

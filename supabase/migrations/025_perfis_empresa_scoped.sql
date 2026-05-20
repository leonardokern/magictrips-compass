-- =============================================================================
-- 025 — Perfis vinculados a uma empresa específica (substitui multi_empresa)
-- =============================================================================
-- Substitui o flag boolean `multi_empresa` por `empresa_id` (uuid nullable).
--   NULL  → perfil atua em todas as empresas (Administrador, Gerente)
--   UUID  → perfil atua em uma empresa específica (Agente MT, Agente DM)
--
-- A regra fica mais forte do que antes: agora os usuários com perfil scoped a
-- uma empresa só podem ter vínculo com ESSA empresa, não qualquer uma.
-- =============================================================================

-- 1. Coluna empresa_id
ALTER TABLE perfis_acesso
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS perfis_acesso_empresa_id_idx ON perfis_acesso(empresa_id);

-- 2. Mapeia os seeds existentes
UPDATE perfis_acesso
SET empresa_id = (SELECT id FROM empresas WHERE slug = 'magic-trips')
WHERE nome = 'Agente Magic Trips';

UPDATE perfis_acesso
SET empresa_id = (SELECT id FROM empresas WHERE slug = 'del-mondo')
WHERE nome = 'Agente Del Mondo';

-- Admin e Gerente ficam com empresa_id = NULL (atuam em todas)

-- 3. Drop da coluna multi_empresa (substituída por empresa_id IS NULL)
ALTER TABLE perfis_acesso DROP COLUMN IF EXISTS multi_empresa;

-- 4. Trigger renomeado/atualizado: empresas precisam bater com a do perfil
DROP TRIGGER IF EXISTS trg_usuarios_empresas_validate_multi ON usuarios_empresas;
DROP FUNCTION IF EXISTS enforce_single_empresa_se_perfil_nao_multi();

CREATE OR REPLACE FUNCTION enforce_empresa_matches_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil_empresa uuid;
  v_qtd integer;
BEGIN
  SELECT p.empresa_id
  INTO v_perfil_empresa
  FROM usuarios u
  JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = NEW.usuario_id;

  -- Perfil sem empresa fixa (Admin/Gerente) → libera qualquer combinação
  IF v_perfil_empresa IS NULL THEN
    RETURN NEW;
  END IF;

  -- Perfil scoped: a empresa do vínculo precisa ser a do perfil
  IF NEW.empresa_id <> v_perfil_empresa THEN
    RAISE EXCEPTION 'Este perfil atua apenas em uma empresa específica; selecione essa empresa.'
      USING ERRCODE = '23514';
  END IF;

  -- E o usuário só pode ter UMA empresa
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

CREATE TRIGGER trg_usuarios_empresas_validate_perfil
BEFORE INSERT OR UPDATE ON usuarios_empresas
FOR EACH ROW EXECUTE FUNCTION enforce_empresa_matches_perfil();

-- 5. RPCs atualizadas
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
  v_user_id        uuid := gen_random_uuid();
  v_empresa_id     uuid;
  v_perfil_empresa uuid;
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

  SELECT empresa_id INTO v_perfil_empresa FROM perfis_acesso WHERE id = p_perfil_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inválido.' USING ERRCODE = '23503';
  END IF;

  IF v_perfil_empresa IS NOT NULL THEN
    -- Perfil scoped: empresa_ids deve ser exatamente [empresa_id do perfil]
    IF array_length(p_empresa_ids, 1) <> 1 OR p_empresa_ids[1] <> v_perfil_empresa THEN
      RAISE EXCEPTION 'Este perfil atua apenas em uma empresa específica.' USING ERRCODE = '23514';
    END IF;
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

CREATE OR REPLACE FUNCTION atualizar_empresas_usuario(
  p_user_id     uuid,
  p_empresa_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id     uuid;
  v_perfil_empresa uuid;
BEGIN
  IF NOT is_administrador() THEN
    RAISE EXCEPTION 'Apenas o Administrador pode alterar empresas de um usuário.'
      USING ERRCODE = '42501';
  END IF;
  IF p_empresa_ids IS NULL OR array_length(p_empresa_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma empresa.' USING ERRCODE = '22023';
  END IF;

  SELECT p.empresa_id
  INTO v_perfil_empresa
  FROM usuarios u
  JOIN perfis_acesso p ON p.id = u.perfil_id
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário inválido.' USING ERRCODE = '23503';
  END IF;

  IF v_perfil_empresa IS NOT NULL THEN
    IF array_length(p_empresa_ids, 1) <> 1 OR p_empresa_ids[1] <> v_perfil_empresa THEN
      RAISE EXCEPTION 'Este perfil atua apenas em uma empresa específica.' USING ERRCODE = '23514';
    END IF;
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

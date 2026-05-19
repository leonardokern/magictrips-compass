-- =============================================================================
-- 023 — RPC criar_usuario_admin com p_empresa_ids[]
-- =============================================================================
-- Agora o usuário recebe um array de empresas ao ser criado, ao invés de
-- uma única (ou NULL). A regra "Administrador pode não ter empresa" sai —
-- todos têm 1+ empresas (Admin Master = Administrador com todas marcadas).
-- =============================================================================

DROP FUNCTION IF EXISTS criar_usuario_admin(text, text, text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION criar_usuario_admin(
  p_email     text,
  p_senha     text,
  p_nome      text,
  p_perfil_id uuid,
  p_empresa_ids uuid[],
  p_iniciais  text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_empresa_id uuid;
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
  IF NOT EXISTS (SELECT 1 FROM perfis_acesso WHERE id = p_perfil_id) THEN
    RAISE EXCEPTION 'Perfil inválido.' USING ERRCODE = '23503';
  END IF;
  -- Verifica que todas as empresas existem e estão ativas
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

  -- 1. auth.users
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

  -- 2. auth.identities
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

  -- 3. public.usuarios (sem empresa_id agora)
  INSERT INTO usuarios (
    id, nome, email, perfil_id, iniciais, ativo, force_password_change
  ) VALUES (
    v_user_id, p_nome, lower(p_email), p_perfil_id, p_iniciais, true, true
  );

  -- 4. usuarios_empresas — N linhas
  FOREACH v_empresa_id IN ARRAY p_empresa_ids LOOP
    INSERT INTO usuarios_empresas (usuario_id, empresa_id)
    VALUES (v_user_id, v_empresa_id);
  END LOOP;

  -- Audit
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

-- ---------------------------------------------------------------------------
-- atualizar_empresas_usuario — usado pelo updateUsuario do Server Action
-- ---------------------------------------------------------------------------
-- Substitui completamente o conjunto de empresas do usuário pelo array passado.
-- (Apaga as atuais e insere as novas em uma transação.)
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
BEGIN
  IF NOT is_administrador() THEN
    RAISE EXCEPTION 'Apenas o Administrador pode alterar empresas de um usuário.'
      USING ERRCODE = '42501';
  END IF;
  IF p_empresa_ids IS NULL OR array_length(p_empresa_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma empresa.' USING ERRCODE = '22023';
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

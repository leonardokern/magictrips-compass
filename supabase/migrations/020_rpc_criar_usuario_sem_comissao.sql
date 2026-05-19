-- =============================================================================
-- 020 — Atualiza RPC criar_usuario_admin (remove p_comissao_percentual)
-- =============================================================================
-- A coluna usuarios.comissao_percentual foi removida na migration 019. Agora
-- a comissão vem da matriz comissoes_regras. Atualiza a RPC para refletir.
-- =============================================================================

DROP FUNCTION IF EXISTS criar_usuario_admin(text, text, text, uuid, uuid, text, numeric);

CREATE OR REPLACE FUNCTION criar_usuario_admin(
  p_email     text,
  p_senha     text,
  p_nome      text,
  p_perfil_id uuid,
  p_empresa_id uuid,
  p_iniciais  text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := gen_random_uuid();
  v_perfil_nome text;
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

  SELECT nome INTO v_perfil_nome FROM perfis_acesso WHERE id = p_perfil_id;
  IF v_perfil_nome IS NULL THEN
    RAISE EXCEPTION 'Perfil inválido.' USING ERRCODE = '23503';
  END IF;

  IF v_perfil_nome <> 'Administrador' AND p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuários com perfil % devem ter uma empresa.', v_perfil_nome
      USING ERRCODE = '23502';
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
    id, nome, email, perfil_id, empresa_id, iniciais,
    ativo, force_password_change
  ) VALUES (
    v_user_id, p_nome, lower(p_email), p_perfil_id, p_empresa_id, p_iniciais,
    true, true
  );

  INSERT INTO audit_logs (
    usuario_id, empresa_id, acao, entidade, entidade_id, dados_depois
  ) VALUES (
    auth.uid(), p_empresa_id, 'criar', 'usuario', v_user_id,
    jsonb_build_object(
      'nome', p_nome, 'email', lower(p_email),
      'perfil_id', p_perfil_id, 'empresa_id', p_empresa_id
    )
  );

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION criar_usuario_admin FROM anon, public;
GRANT EXECUTE ON FUNCTION criar_usuario_admin TO authenticated, service_role;

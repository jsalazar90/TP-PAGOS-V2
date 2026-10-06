-- ==============================================================================
-- JT PAGOS / TP PAGOS - SCRIPT DE SEGURIDAD CRÍTICA P0
-- Cifrado de Contraseñas con Bcrypt (pgcrypto) y Funciones de Autenticación
-- Seguras en el Backend (Zero Password Exposure en el Cliente)
-- ==============================================================================

-- 1. Habilitar la extensión criptográfica oficial de PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Migrar de forma transparente todas las contraseñas en texto plano a Bcrypt Hash
-- (Si ya están en formato bcrypt $2..., las conserva intactas)
UPDATE public.profiles
SET password = crypt(password, gen_salt('bf', 10)),
    updated_at = NOW()
WHERE password IS NOT NULL 
  AND password NOT LIKE '$2%';

-- Asignar valor por defecto hash para nuevos usuarios si no se especifica
ALTER TABLE public.profiles 
ALTER COLUMN password SET DEFAULT crypt('1234', gen_salt('bf', 10));

-- 3. FUNCIÓN RPC: AUTENTICACIÓN SEGURA EN EL SERVIDOR
-- Verifica credenciales en el motor de base de datos y retorna el perfil
-- SIN EXPONER jamás la contraseña ni el hash al cliente.
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_matched BOOLEAN := false;
BEGIN
  -- Buscar usuario por username o email (case-insensitive)
  SELECT id, username, email, full_name, role, is_active, password, created_at
  INTO v_user
  FROM public.profiles
  WHERE LOWER(TRIM(username)) = LOWER(TRIM(p_username))
     OR LOWER(TRIM(email)) = LOWER(TRIM(p_username))
     OR LOWER(TRIM(email)) = LOWER(TRIM(p_username) || '@tppagos.com')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '⚠️ Usuario no encontrado. Por favor verifica tu nombre de usuario o solicita tu registro al Administrador.');
  END IF;

  IF NOT v_user.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', '⚠️ Tu cuenta de usuario se encuentra inactiva. Contacta al Administrador.');
  END IF;

  -- Verificación criptográfica segura
  IF v_user.password LIKE '$2%' THEN
    -- Contraseña con hash Bcrypt
    v_matched := (v_user.password = crypt(p_password, v_user.password));
  ELSE
    -- Compatibilidad con contraseñas que hayan quedado en texto plano
    v_matched := (v_user.password = p_password);
    -- Migrar inmediatamente a Bcrypt en caso de coincidencia
    IF v_matched THEN
      UPDATE public.profiles
      SET password = crypt(p_password, gen_salt('bf', 10)),
          updated_at = NOW()
      WHERE id = v_user.id;
    END IF;
  END IF;

  IF NOT v_matched THEN
    RETURN jsonb_build_object('success', false, 'error', '⚠️ Contraseña incorrecta. Por favor verifica tu contraseña e intenta nuevamente.');
  END IF;

  -- Retornar ÚNICAMENTE los campos de perfil público y sesión (SIN contraseña)
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'email', v_user.email,
      'full_name', v_user.full_name,
      'role', v_user.role,
      'is_active', v_user.is_active,
      'created_at', v_user.created_at
    )
  );
END;
$$;

-- 4. FUNCIÓN RPC: ACTUALIZACIÓN SEGURA DE CONTRASEÑA
-- Hashea la contraseña con Bcrypt en el servidor antes de guardarla
CREATE OR REPLACE FUNCTION public.update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

-- 5. FUNCIÓN RPC: CREACIÓN DE USUARIO CON CONTRASEÑA HASHEADA
CREATE OR REPLACE FUNCTION public.create_user_with_password(
  p_username TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  INSERT INTO public.profiles (
    username,
    email,
    full_name,
    role,
    password,
    is_active
  )
  VALUES (
    LOWER(TRIM(p_username)),
    LOWER(TRIM(p_email)),
    TRIM(p_full_name),
    p_role::public.user_role,
    crypt(COALESCE(NULLIF(TRIM(p_password), ''), '1234'), gen_salt('bf', 10)),
    true
  )
  RETURNING id, username, email, full_name, role, is_active, created_at INTO v_user;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'username', v_user.username,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'is_active', v_user.is_active,
    'created_at', v_user.created_at
  );
END;
$$;

-- 6. ASIGNAR PERMISOS DE EJECUCIÓN A ROLES ANÓNIMOS Y AUTENTICADOS
GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_with_password(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

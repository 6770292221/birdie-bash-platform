-- Ensure pgcrypto for password hashing
create extension if not exists pgcrypto;

-- Create trigger to populate public.profiles for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed mock users (admin and user) if they don't already exist
DO $$
DECLARE
  inst_id uuid;
  existing_admin uuid;
  existing_user uuid;
  new_admin_id uuid := gen_random_uuid();
  new_user_id uuid := gen_random_uuid();
BEGIN
  SELECT id INTO inst_id FROM auth.instances LIMIT 1;

  -- Check if users already exist
  SELECT id INTO existing_admin FROM auth.users WHERE email = 'admin@badminton.com' LIMIT 1;
  SELECT id INTO existing_user FROM auth.users WHERE email = 'user@badminton.com' LIMIT 1;

  -- Create admin if missing
  IF existing_admin IS NULL THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (
      new_admin_id,
      inst_id,
      'admin@badminton.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      jsonb_build_object('name','ผู้ดูแลระบบ'),
      now(),
      now()
    );

    -- Ensure profile with admin role
    INSERT INTO public.profiles (id, name, role)
    VALUES (new_admin_id, 'ผู้ดูแลระบบ', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name;
  END IF;

  -- Create user if missing
  IF existing_user IS NULL THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (
      new_user_id,
      inst_id,
      'user@badminton.com',
      crypt('user123', gen_salt('bf')),
      now(),
      jsonb_build_object('name','ผู้ใช้ทั่วไป'),
      now(),
      now()
    );

    -- Ensure profile with user role
    INSERT INTO public.profiles (id, name, role)
    VALUES (new_user_id, 'ผู้ใช้ทั่วไป', 'user')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name;
  END IF;

  -- If they already existed, still make sure profiles are present with correct roles
  IF existing_admin IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, role)
    VALUES (existing_admin, 'ผู้ดูแลระบบ', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'ผู้ดูแลระบบ';
  END IF;

  IF existing_user IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, role)
    VALUES (existing_user, 'ผู้ใช้ทั่วไป', 'user')
    ON CONFLICT (id) DO UPDATE SET role = 'user', name = 'ผู้ใช้ทั่วไป';
  END IF;
END $$;
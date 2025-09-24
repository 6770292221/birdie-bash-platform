-- Insert mock admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@badminton.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"name": "ผู้ดูแลระบบ"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insert mock regular user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'user@badminton.com',
  crypt('user123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"name": "ผู้ใช้ทั่วไป"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding profiles (admin)
INSERT INTO public.profiles (
  id,
  name,
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'ผู้ดูแลระบบ',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Insert corresponding profiles (user)
INSERT INTO public.profiles (
  id,
  name,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'ผู้ใช้ทั่วไป',
  'user'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
-- Insert mock users that match the authentication context
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES 
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@badminton.com',
  '$2a$10$B8UbiUkNEUnITZdshfRJy.EIJ8YXU9Vb8/VJKYrzMKs9v1yzV0RJi', -- hashed 'admin123'
  now(),
  now(),
  now(),
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'user@badminton.com', 
  '$2a$10$B8UbiUkNEUnITZdshfRJy.EIJ8YXU9Vb8/VJKYrzMKs9v1yzV0RJi', -- hashed 'user123'
  now(),
  now(),
  now(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding profiles for the mock users
INSERT INTO public.profiles (id, name, role)
VALUES 
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ผู้ดูแลระบบ',
  'admin'
),
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'ผู้ใช้ทั่วไป', 
  'user'
)
ON CONFLICT (id) DO NOTHING;
-- Insert corresponding profiles for the mock users with proper UUIDs
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
-- Fix UUID mismatch - update profiles to use correct UUIDs from AuthContext
UPDATE public.profiles 
SET id = 'bc235d14-40db-4bd7-82d6-edeb0a19c48e'::uuid
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

UPDATE public.profiles 
SET id = 'b2a84508-41dd-4644-9881-8d5e8587e067'::uuid  
WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;

-- Also insert the profiles with correct UUIDs if they don't exist
INSERT INTO public.profiles (id, name, role)
VALUES 
(
  'bc235d14-40db-4bd7-82d6-edeb0a19c48e'::uuid,
  'ผู้ดูแลระบบ',
  'admin'
),
(
  'b2a84508-41dd-4644-9881-8d5e8587e067'::uuid,
  'ผู้ใช้ทั่วไป', 
  'user'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;
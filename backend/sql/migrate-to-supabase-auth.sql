-- Migración desde el schema antiguo al nuevo con Supabase Auth
-- Ejecutar en el SQL Editor de Supabase

-- Paso 1: Alterar tabla students para agregar user_id
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE;
-- NOT NULL se pondrá después de migrar los usuarios

-- Crear índice para user_id
CREATE INDEX IF NOT EXISTS students_user_id_idx ON students (user_id);

-- Paso 2: Eliminar columnas obsoletas de students (password_hash ya no se usa con Supabase Auth)
ALTER TABLE students DROP COLUMN IF EXISTS password_hash;

-- Paso 3: Crear tabla admin_users con user_id (si no existe con esa estructura)
-- Primero renombrar la tabla vieja
ALTER TABLE admin_users RENAME TO admin_users_old;

-- Crear tabla nueva con user_id
CREATE TABLE admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Crear índice
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users (user_id);

-- Paso 4: Activar RLS en todas las tablas (si no estaba activo)
ALTER TABLE admin_users enable row level security;
ALTER TABLE teachers enable row level security;
ALTER TABLE students enable row level security;
ALTER TABLE reports enable row level security;
ALTER TABLE report_evidences enable row level security;

-- Paso 5: Eliminar policies viejas si existen
DROP POLICY IF EXISTS "Maestros públicos" ON teachers;
DROP POLICY IF EXISTS "Admin puede crear maestros" ON teachers;
DROP POLICY IF EXISTS "Admin puede actualizar maestros" ON teachers;
DROP POLICY IF EXISTS "Admin puede eliminar maestros" ON teachers;
DROP POLICY IF EXISTS "Estudiantes ven su propio perfil" ON students;
DROP POLICY IF EXISTS "Admin ve todos los estudiantes" ON students;
DROP POLICY IF EXISTS "Solo usuario propio puede actualizar" ON students;
DROP POLICY IF EXISTS "Admins ven otros admins" ON admin_users;
DROP POLICY IF EXISTS "Admin puede crear admins" ON admin_users;
DROP POLICY IF EXISTS "Estudiantes ven sus reportes" ON reports;
DROP POLICY IF EXISTS "Admin ve todos los reportes" ON reports;
DROP POLICY IF EXISTS "Estudiantes crean reportes" ON reports;
DROP POLICY IF EXISTS "Admin puede actualizar reportes" ON reports;
DROP POLICY IF EXISTS "Estudiantes ven sus evidencias" ON report_evidences;
DROP POLICY IF EXISTS "Admin ve todas las evidencias" ON report_evidences;
DROP POLICY IF EXISTS "Estudiantes crean evidencias" ON report_evidences;

-- Paso 6: Crear nuevas RLS policies

-- teachers: lectura pública, escritura solo admin
CREATE POLICY "Maestros públicos" ON teachers FOR SELECT USING (true);
CREATE POLICY "Admin puede crear maestros" ON teachers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin puede actualizar maestros" ON teachers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin puede eliminar maestros" ON teachers FOR DELETE USING (auth.role() = 'authenticated');

-- students: cada usuario solo ve su propio registro
CREATE POLICY "Estudiantes ven su propio perfil" ON students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin ve todos los estudiantes" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Solo usuario propio puede actualizar" ON students FOR UPDATE USING (auth.uid() = user_id);

-- admin_users: solo admin puede ver/editar
CREATE POLICY "Admins ven otros admins" ON admin_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Admin puede crear admins" ON admin_users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);

-- reports: estudiantes ven solo sus reportes, admin ve todos
CREATE POLICY "Estudiantes ven sus reportes" ON reports FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Admin ve todos los reportes" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Estudiantes crean reportes" ON reports FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Admin puede actualizar reportes" ON reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);

-- report_evidences: estudiantes ven evidencias de sus reportes, admin todas
CREATE POLICY "Estudiantes ven sus evidencias" ON report_evidences FOR SELECT USING (
  report_id IN (SELECT id FROM reports WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid()))
);
CREATE POLICY "Admin ve todas las evidencias" ON report_evidences FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Estudiantes crean evidencias" ON report_evidences FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  report_id IN (SELECT id FROM reports WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid()))
);

-- Paso 7: Limpiar tabla vieja de admin_users (después de migrar manualmente los admins)
-- DROP TABLE IF EXISTS admin_users_old;

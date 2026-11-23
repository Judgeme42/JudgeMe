-- Fix RLS policies para evitar recursion en admin_users
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar policies problemáticas
DROP POLICY IF EXISTS "Admins ven otros admins" ON admin_users;
DROP POLICY IF EXISTS "Admin ve todos los estudiantes" ON students;
DROP POLICY IF EXISTS "Admin ve todos los reportes" ON reports;
DROP POLICY IF EXISTS "Admin ve todas las evidencias" ON report_evidences;

-- Crear función auxiliar para verificar si es admin (evita recursion)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Recrear policies usando la función auxiliar

-- students
CREATE POLICY "Admin ve todos los estudiantes" ON students FOR SELECT USING (is_admin());

-- reports
CREATE POLICY "Admin ve todos los reportes" ON reports FOR SELECT USING (is_admin());

-- report_evidences
CREATE POLICY "Admin ve todas las evidencias" ON report_evidences FOR SELECT USING (is_admin());

-- admin_users
CREATE POLICY "Admins ven otros admins" ON admin_users FOR SELECT USING (is_admin());
CREATE POLICY "Admin puede crear admins" ON admin_users FOR INSERT WITH CHECK (is_admin());

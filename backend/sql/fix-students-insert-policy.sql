-- Fix: registro de estudiantes con Supabase Auth
-- Ejecutar en el SQL Editor de Supabase
--
-- Soluciona dos problemas:
-- 1. La tabla students no tenía política INSERT (error RLS)
-- 2. Si Supabase pide confirmar email, el usuario no tiene sesión
--    y no puede insertar su perfil manualmente.
--    El trigger crea el perfil automáticamente al crear la cuenta.

-- ============================================================
-- 1. Política INSERT (fallback para inserts directos con sesión)
-- ============================================================
DROP POLICY IF EXISTS "Estudiantes crean su perfil" ON students;

CREATE POLICY "Estudiantes crean su perfil" ON students
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. Trigger: crear perfil de estudiante automáticamente
--    al registrarse en Supabase Auth con metadata user_type='student'
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_student() RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'user_type' = 'student' THEN
    INSERT INTO public.students (user_id, student_number, full_name)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'student_number',
      NEW.raw_user_meta_data->>'student_number'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_student ON auth.users;
CREATE TRIGGER on_auth_user_created_student
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();

-- ============================================================
-- 3. Función para verificar si una matrícula ya existe
--    (los estudiantes no pueden ver otras matrículas por RLS,
--    así que usamos SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_student_number(p_number text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE student_number = p_number
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_student_number(text) TO anon, authenticated;

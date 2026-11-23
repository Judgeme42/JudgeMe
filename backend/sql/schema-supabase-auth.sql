-- Ejecutar en el SQL Editor de Supabase.
-- Migración a Supabase Auth - ya no se manejan contraseñas propias.

-- Habilitar extensiones necesarias
create extension if not exists "pgcrypto";

-- Tabla de maestros (sin cambios)
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  program_code text not null,
  program_label text not null,
  subject text not null,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de estudiantes - ahora usa Supabase Auth
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  student_number text not null unique,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de administradores - también usa Supabase Auth
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabla de reportes (sin cambios en estructura)
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers (id) on delete restrict,
  student_id uuid references students (id) on delete set null,
  motive text not null,
  description text not null,
  is_anonymous boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de evidencias (sin cambios)
create table if not exists report_evidences (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists reports_teacher_id_idx on reports (teacher_id);
create index if not exists reports_status_idx on reports (status);
create index if not exists teachers_program_code_idx on teachers (program_code);
create index if not exists report_evidences_report_id_idx on report_evidences (report_id);
create index if not exists students_user_id_idx on students (user_id);
create index if not exists admin_users_user_id_idx on admin_users (user_id);

-- Activar RLS
alter table teachers enable row level security;
alter table students enable row level security;
alter table admin_users enable row level security;
alter table reports enable row level security;
alter table report_evidences enable row level security;

-- POLICIES RLS

-- teachers: lectura pública, escritura solo admin
create policy "Maestros públicos" on teachers for select using (true);
create policy "Admin puede crear maestros" on teachers for insert with check (auth.role() = 'authenticated');
create policy "Admin puede actualizar maestros" on teachers for update using (auth.role() = 'authenticated');
create policy "Admin puede eliminar maestros" on teachers for delete using (auth.role() = 'authenticated');

-- students: cada usuario solo ve su propio registro
create policy "Estudiantes ven su propio perfil" on students for select using (auth.uid() = user_id);
create policy "Admin ve todos los estudiantes" on students for select using (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);
create policy "Solo usuario propio puede actualizar" on students for update using (auth.uid() = user_id);

-- admin_users: solo admin puede ver/editar
create policy "Admins ven otros admins" on admin_users for select using (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);
create policy "Admin puede crear admins" on admin_users for insert with check (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);

-- reports: estudiantes ven solo sus reportes, admin ve todos
create policy "Estudiantes ven sus reportes" on reports for select using (
  student_id in (select id from students where user_id = auth.uid())
);
create policy "Admin ve todos los reportes" on reports for select using (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);
create policy "Estudiantes crean reportes" on reports for insert with check (
  auth.role() = 'authenticated' and
  student_id in (select id from students where user_id = auth.uid())
);
create policy "Admin puede actualizar reportes" on reports for update using (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);

-- report_evidences: estudiantes ven evidencias de sus reportes, admin todas
create policy "Estudiantes ven sus evidencias" on report_evidences for select using (
  report_id in (select id from reports where student_id in (select id from students where user_id = auth.uid()))
);
create policy "Admin ve todas las evidencias" on report_evidences for select using (
  exists (select 1 from admin_users where user_id = auth.uid() and is_active = true)
);
create policy "Estudiantes crean evidencias" on report_evidences for insert with check (
  auth.role() = 'authenticated' and
  report_id in (select id from reports where student_id in (select id from students where user_id = auth.uid()))
);

-- Ejecutar en el SQL Editor de Supabase.
-- Contraseñas: se guardan ya cifradas con bcrypt desde Node.js (nunca en texto plano).

create extension if not exists "pgcrypto";

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists reports_teacher_id_idx on reports (teacher_id);
create index if not exists reports_status_idx on reports (status);
create index if not exists teachers_program_code_idx on teachers (program_code);

-- El backend usa la service_role key y no pasa por RLS.
-- Aun así se deja RLS activo para bloquear acceso anónimo desde el cliente de Supabase.
alter table admin_users enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table reports enable row level security;

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSchema() {
  console.log("Leyendo archivo schema.sql...");
  const fs = require("fs");
  const sqlContent = fs.readFileSync("./sql/schema.sql", "utf-8");

  console.log("Intentando ejecutar schema SQL...");
  console.log("NOTA: Para ejecutar SQL raw en Supabase, necesitas:");
  console.log("1. Ir a Supabase.com → tu proyecto → SQL Editor");
  console.log("2. Copiar y pegar el contenido de backend/sql/schema.sql");
  console.log("3. Ejecutar el SQL");

  console.log("\nAlternativa: Crear tablas usando el cliente de Supabase...");

  // Crear tablas una por una
  const tables = [
    {
      name: "admin_users",
      columns: `
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        full_name text not null,
        password_hash text not null,
        role text not null default 'admin' check (role in ('admin', 'staff')),
        is_active boolean not null default true,
        created_at timestamptz not null default now()
      `
    },
    {
      name: "teachers",
      columns: `
        id uuid primary key default gen_random_uuid(),
        full_name text not null,
        program_code text not null,
        program_label text not null,
        subject text not null,
        bio text,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      `
    },
    {
      name: "reports",
      columns: `
        id uuid primary key default gen_random_uuid(),
        teacher_id uuid not null references teachers (id) on delete restrict,
        motive text not null,
        description text not null,
        is_anonymous boolean not null default false,
        status text not null default 'pending' check (status in ('pending', 'in_review', 'resolved', 'dismissed')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      `
    }
  ];

  for (const table of tables) {
    console.log(`\nCreando tabla ${table.name}...`);
    // Nota: Supabase client no puede crear tablas directamente
    // Necesitamos usar SQL Editor de Supabase
    console.log(`  CREATE TABLE ${table.name} (${table.columns})`);
  }

  console.log("\n\nRESUMEN:");
  console.log("El cliente de Supabase no puede ejecutar DDL (CREATE TABLE).");
  console.log("Por favor, ejecuta el archivo backend/sql/schema.sql en el SQL Editor de Supabase.");
}

setupSchema().catch(console.error);

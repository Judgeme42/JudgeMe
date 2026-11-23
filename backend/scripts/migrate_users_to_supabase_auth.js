// Script para migrar estudiantes existentes a Supabase Auth
// Ejecutar: node backend/scripts/migrate_users_to_supabase_auth.js

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateStudents() {
  console.log("Obteniendo estudiantes sin user_id...");

  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .is("user_id", null);

  if (error) {
    console.error("Error al obtener estudiantes:", error.message);
    return;
  }

  if (!students || students.length === 0) {
    console.log("No hay estudiantes por migrar.");
    return;
  }

  console.log(`Se encontraron ${students.length} estudiantes por migrar.`);

  for (const student of students) {
    try {
      console.log(`Migrando estudiante: ${student.student_number} (${student.email})...`);

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: student.email,
        password: "temporal123", // Contraseña temporal, el usuario deberá cambiarla
        email_confirm: true,
      });

      if (authError) {
        console.error(`Error al crear usuario para ${student.student_number}:`, authError.message);
        continue;
      }

      // Actualizar el registro en students con el user_id
      const { error: updateError } = await supabase
        .from("students")
        .update({ user_id: authData.user.id })
        .eq("id", student.id);

      if (updateError) {
        console.error(`Error al actualizar student ${student.student_number}:`, updateError.message);
        continue;
      }

      console.log(`✓ Estudiante ${student.student_number} migrado exitosamente`);
    } catch (err) {
      console.error(`Error al migrar ${student.student_number}:`, err.message);
    }
  }

  console.log("Migración de estudiantes completada.");
}

async function migrateAdmins() {
  console.log("\nObteniendo admins desde tabla vieja...");

  const { data: adminsOld, error } = await supabase
    .from("admin_users_old")
    .select("*");

  if (error) {
    console.log("No hay tabla admin_users_old o error:", error.message);
    return;
  }

  if (!adminsOld || adminsOld.length === 0) {
    console.log("No hay admins por migrar.");
    return;
  }

  console.log(`Se encontraron ${adminsOld.length} admins por migrar.`);

  for (const admin of adminsOld) {
    try {
      console.log(`Migrando admin: ${admin.email}...`);

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: "temporal123",
        email_confirm: true,
      });

      if (authError) {
        console.error(`Error al crear usuario para ${admin.email}:`, authError.message);
        continue;
      }

      // Crear registro en nueva tabla admin_users
      const { error: insertError } = await supabase
        .from("admin_users")
        .insert({
          user_id: authData.user.id,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role,
          is_active: admin.is_active,
        });

      if (insertError) {
        console.error(`Error al insertar admin ${admin.email}:`, insertError.message);
        continue;
      }

      console.log(`✓ Admin ${admin.email} migrado exitosamente`);
    } catch (err) {
      console.error(`Error al migrar ${admin.email}:`, err.message);
    }
  }

  console.log("Migración de admins completada.");
}

async function main() {
  console.log("Iniciando migración de usuarios a Supabase Auth...");
  await migrateStudents();
  await migrateAdmins();
  console.log("\nMigración completa.");
}

main().catch(console.error);

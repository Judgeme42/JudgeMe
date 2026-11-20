require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || "Administrador";

  if (!email || !password) {
    console.log("Uso: node create_admin.js <email> <password> [nombre_completo]");
    console.log("Ejemplo: node create_admin.js admin@uach.mx MiPassword123 'Admin FCA'");
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("La contraseña debe tener al menos 8 caracteres");
    process.exit(1);
  }

  console.log(`Creando usuario administrador: ${email}`);

  // Verificar si ya existe
  const { data: existing, error: checkError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (checkError) {
    console.error("Error al verificar usuario:", checkError.message);
    process.exit(1);
  }

  if (existing) {
    console.log("Ya existe un usuario con este email");
    process.exit(1);
  }

  // Hashear contraseña
  const passwordHash = await bcrypt.hash(password, 12);

  // Insertar usuario admin
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: email.toLowerCase(),
      full_name: fullName,
      password_hash: passwordHash,
      role: "admin",
      is_active: true,
    })
    .select("id, email, full_name, role")
    .single();

  if (error) {
    console.error("Error al crear usuario:", error.message);
    process.exit(1);
  }

  console.log("✓ Usuario administrador creado exitosamente:");
  console.log(`  Email: ${data.email}`);
  console.log(`  Nombre: ${data.full_name}`);
  console.log(`  Rol: ${data.role}`);
}

createAdminUser().catch(console.error);

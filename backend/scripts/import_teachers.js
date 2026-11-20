require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importTeachers() {
  console.log("Leyendo archivo SQL...");
  const fs = require("fs");
  const sqlContent = fs.readFileSync(
    "./sql/seed-teachers-pdf.sql",
    "utf-8"
  );

  // Separar las sentencias INSERT individuales
  const statements = sqlContent
    .split("INSERT INTO teachers")
    .filter((s) => s.trim())
    .map((s) => "INSERT INTO teachers" + s.trim());

  console.log(`Se encontraron ${statements.length} sentencias SQL`);

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      // Extraer valores del INSERT
      const match = statement.match(/VALUES \(([^)]+)\)/);
      if (match) {
        const values = match[1].split(", ").map((v) => v.trim().replace(/^'(.*)'$/, "$1"));
        const [full_name, program_code, program_label, subject, bio, is_active] = values;

        const { error: directError } = await supabase
          .from("teachers")
          .insert({
            full_name,
            program_code,
            program_label,
            subject,
            bio,
            is_active: is_active === "true" || is_active === true,
          });

        if (directError) {
          console.error(`Error al insertar ${full_name}: ${directError.message}`);
          errorCount++;
        } else {
          console.log(`✓ Insertado: ${full_name}`);
          successCount++;
        }
      } else {
        console.error(`Error: No se pudo parsear la sentencia`);
        errorCount++;
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nResumen:`);
  console.log(`  Éxitos: ${successCount}`);
  console.log(`  Errores: ${errorCount}`);
}

importTeachers().catch(console.error);

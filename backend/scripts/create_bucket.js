require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createStorageBucket() {
  console.log("Creando bucket de evidencias en Supabase Storage...");

  const { data, error } = await supabase.storage.createBucket("report-evidences", {
    public: false, // Privado, solo accesible con autenticación
    allowedMimeTypes: [
      "image/*",
      "audio/*",
      "video/*",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    fileSizeLimit: 10485760, // 10MB máximo por archivo
  });

  if (error) {
    console.error("Error al crear bucket:", error.message);
    process.exit(1);
  }

  console.log("✓ Bucket creado exitosamente:");
  console.log(`  Nombre: report-evidences`);
  console.log(`  Público: No`);
  console.log(`  Tipos permitidos: imágenes, audio, video, PDF, documentos`);
  console.log(`  Tamaño máximo: 10MB por archivo`);
}

createStorageBucket().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Leer datos del JSON
const jsonPath = path.join(__dirname, '..', '..', 'teachers_update.json');
const teachersData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Función para asignar programa basándose en la materia
function getProgramCode(subject) {
  const subjectLower = subject.toLowerCase();

  if (subjectLower.includes('contab') || subjectLower.includes('fiscal')) {
    return 'CP';
  }
  if (subjectLower.includes('admin') || subjectLower.includes('empresa') || subjectLower.includes('negocio')) {
    return 'LAE';
  }
  if (subjectLower.includes('financ') || subjectLower.includes('invers')) {
    return 'LAF';
  }
  if (subjectLower.includes('inteligencia') || subjectLower.includes('datos')) {
    return 'LIN';
  }
  if (subjectLower.includes('internacional') || subjectLower.includes('global')) {
    return 'LNI';
  }
  if (subjectLower.includes('publica') || subjectLower.includes('gobierno')) {
    return 'LAGP';
  }

  return 'GEN';
}

function getProgramLabel(code) {
  const labels = {
    'CP': 'Contador Público',
    'LAE': 'Administración de Empresas',
    'LAF': 'Administración Financiera',
    'LIN': 'Inteligencia de Negocios',
    'LNI': 'Negocios Internacionales',
    'LAGP': 'Administración y Gestión Pública',
    'GEN': 'General',
  };
  return labels[code] || 'General';
}

async function updateTeachers() {
  console.log(`Actualizando ${teachersData.length} maestros...`);

  // Primero eliminar todos los reportes (para evitar constraint de llave foránea)
  console.log('Eliminando reportes existentes...');
  const { error: deleteReportsError } = await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteReportsError) {
    console.error('Error al eliminar reportes:', deleteReportsError.message);
    return;
  }
  console.log('Reportes eliminados.');

  // Luego eliminar evidencias de reportes
  console.log('Eliminando evidencias...');
  const { error: deleteEvidencesError } = await supabase.from('report_evidences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteEvidencesError) {
    console.error('Error al eliminar evidencias:', deleteEvidencesError.message);
    return;
  }
  console.log('Evidencias eliminadas.');

  // Finalmente eliminar todos los maestros existentes
  console.log('Eliminando maestros existentes...');
  const { error: deleteError } = await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    console.error('Error al eliminar maestros:', deleteError.message);
    return;
  }
  console.log('Maestros existentes eliminados.');

  // Insertar nuevos maestros
  const teachersToInsert = teachersData.map((t) => {
    const programCode = getProgramCode(t.Materia);
    return {
      full_name: t.Nombre,
      subject: t.Materia,
      program_code: programCode,
      program_label: getProgramLabel(programCode),
      bio: 'Docente de la FCA UACH',
      is_active: true,
    };
  });

  console.log(`Insertando ${teachersToInsert.length} nuevos maestros...`);

  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < teachersToInsert.length; i += batchSize) {
    const batch = teachersToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('teachers').insert(batch);

    if (error) {
      console.error(`Error en lote ${i / batchSize + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`✓ Lote ${i / batchSize + 1} insertado (${successCount}/${teachersToInsert.length})`);
    }
  }

  console.log(`\nActualización completada:`);
  console.log(`✓ Exitosos: ${successCount}`);
  console.log(`✗ Errores: ${errorCount}`);
}

updateTeachers().catch(console.error);

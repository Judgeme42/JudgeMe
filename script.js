const teachers = [
  {
    name: "Mtra. Laura Espinoza Ríos",
    program: "CP",
    programLabel: "Contador Público",
    subject: "Contabilidad intermedia",
    bio: "Coordina prácticas de auditoría y estados financieros con enfoque en ética profesional.",
  },
  {
    name: "Dr. Héctor Salinas Corral",
    program: "LAE",
    programLabel: "Administración de Empresas",
    subject: "Dirección estratégica",
    bio: "Acompaña proyectos de planeación y liderazgo en organizaciones locales.",
  },
  {
    name: "Mtro. Iván Terrazas Núñez",
    program: "LAF",
    programLabel: "Administración Financiera",
    subject: "Mercados de capitales",
    bio: "Imparte análisis de riesgo e inversión con casos del norte de México.",
  },
  {
    name: "Dra. Camila Ortega Prado",
    program: "LIN",
    programLabel: "Inteligencia de Negocios",
    subject: "Visualización de datos",
    bio: "Integra tableros y analítica para la toma de decisiones en pymes.",
  },
  {
    name: "Mtra. Sofía Villalobos Mora",
    program: "LNI",
    programLabel: "Negocios Internacionales",
    subject: "Comercio exterior",
    bio: "Trabaja tratados comerciales y logística transfronteriza.",
  },
  {
    name: "Mtro. Diego Armendáriz Peña",
    program: "LAGP",
    programLabel: "Administración y Gestión Pública",
    subject: "Políticas públicas",
    bio: "Enfoca la gestión municipal y la evaluación de programas sociales.",
  },
  {
    name: "Mtra. Paola Chávez Luján",
    program: "CP",
    programLabel: "Contador Público",
    subject: "Impuestos I",
    bio: "Explica ISR e IVA con talleres de declaración y cumplimiento fiscal.",
  },
  {
    name: "Dr. Ernesto Quiñones Beltrán",
    program: "LAE",
    programLabel: "Administración de Empresas",
    subject: "Comportamiento organizacional",
    bio: "Facilita dinámicas de equipos, clima laboral y cultura organizacional.",
  },
  {
    name: "Mtra. Regina Acosta Fierro",
    program: "LAF",
    programLabel: "Administración Financiera",
    subject: "Finanzas corporativas",
    bio: "Aplica valuación de empresas y estructura de capital en proyectos reales.",
  },
  {
    name: "Mtro. Bruno Maldonado Sáenz",
    program: "LIN",
    programLabel: "Inteligencia de Negocios",
    subject: "Minería de datos",
    bio: "Introduce SQL, Python y modelos descriptivos para analítica de negocios.",
  },
  {
    name: "Dra. Natalia Herrera Campos",
    program: "LNI",
    programLabel: "Negocios Internacionales",
    subject: "Negociación intercultural",
    bio: "Prepara simulaciones de negociación con socios de EUA y Asia.",
  },
  {
    name: "Mtro. Saúl Montes Carreón",
    program: "LAGP",
    programLabel: "Administración y Gestión Pública",
    subject: "Transparencia y rendición de cuentas",
    bio: "Revisa marcos de transparencia y acceso a la información pública.",
  },
];

const grid = document.getElementById("teacher-grid");
const search = document.getElementById("search");
const programFilter = document.getElementById("program-filter");
const resultsMeta = document.getElementById("results-meta");
const emptyState = document.getElementById("empty-state");
const modal = document.getElementById("report-modal");
const modalTeacher = document.getElementById("modal-teacher");
const form = document.getElementById("report-form");
const toast = document.getElementById("toast");

let selectedTeacher = "";

function initials(name) {
  return name
    .replace(/^Mtr[ao]\.\s|^Dr[a]?\.\s/i, "")
    .split(" ")
    .filter((part) => !["de", "del", "la", "los"].includes(part.toLowerCase()))
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function render() {
  const query = search.value.trim().toLowerCase();
  const program = programFilter.value;
  const filtered = teachers.filter((teacher) => {
    const matchesProgram = program === "todos" || teacher.program === program;
    const haystack = `${teacher.name} ${teacher.subject} ${teacher.programLabel}`.toLowerCase();
    return matchesProgram && haystack.includes(query);
  });

  grid.innerHTML = filtered
    .map(
      (teacher) => `
      <article class="card">
        <div class="card-top">
          <div class="avatar" aria-hidden="true">${initials(teacher.name)}</div>
          <div>
            <h3>${teacher.name}</h3>
            <p class="meta">${teacher.subject}</p>
          </div>
        </div>
        <div class="tags">
          <span class="tag">${teacher.program}</span>
          <span class="tag">${teacher.programLabel}</span>
        </div>
        <p>${teacher.bio}</p>
        <button class="btn btn-primary" type="button" data-teacher="${teacher.name}">
          Levantar reporte
        </button>
      </article>
    `
    )
    .join("");

  resultsMeta.textContent = `${filtered.length} maestro${filtered.length === 1 ? "" : "s"} en el directorio`;
  emptyState.hidden = filtered.length > 0;
}

function openModal(name) {
  selectedTeacher = name;
  modalTeacher.textContent = name;
  form.reset();
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-teacher]");
  if (!button) return;
  openModal(button.dataset.teacher);
});

modal.addEventListener("click", (event) => {
  if (event.target.dataset.close !== undefined) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const anonymous = data.get("anonimo") ? "anónimo" : "identificado (simulado)";
  closeModal();
  showToast(
    `Reporte de prueba sobre ${selectedTeacher} (${anonymous}). En el prototipo no se guarda nada.`
  );
});

search.addEventListener("input", render);
programFilter.addEventListener("change", render);

render();

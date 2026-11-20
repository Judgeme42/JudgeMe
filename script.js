const API_URL = "http://localhost:3001";

// DOM Elements
const authScreen = document.getElementById("auth-screen");
const mainContent = document.getElementById("main-content");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

const grid = document.getElementById("teacher-grid");
const search = document.getElementById("search");
const programFilter = document.getElementById("program-filter");
const resultsMeta = document.getElementById("results-meta");
const emptyState = document.getElementById("empty-state");
const modal = document.getElementById("report-modal");
const modalTeacher = document.getElementById("modal-teacher");
const form = document.getElementById("report-form");
const toast = document.getElementById("toast");

let teachers = [];
let selectedTeacher = "";
let currentStudent = null;
let authToken = null;

// Auth tabs
const authTabs = document.querySelectorAll(".auth-tab");
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const tabName = tab.dataset.tab;
    if (tabName === "login") {
      loginForm.hidden = false;
      registerForm.hidden = true;
    } else {
      loginForm.hidden = true;
      registerForm.hidden = false;
    }
  });
});

// Login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const response = await fetch(`${API_URL}/api/students/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentNumber: formData.get("studentNumber"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al iniciar sesión");
    }

    currentStudent = data.student;
    authToken = data.token;
    localStorage.setItem("studentToken", authToken);
    localStorage.setItem("studentData", JSON.stringify(currentStudent));

    showMainContent();
  } catch (error) {
    showToast(error.message);
  }
});

// Register
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  if (formData.get("password") !== formData.get("confirmPassword")) {
    showToast("Las contraseñas no coinciden");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/students/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentNumber: formData.get("studentNumber"),
        email: formData.get("email"),
        fullName: formData.get("fullName"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al registrarse");
    }

    showToast("Cuenta creada exitosamente. Ahora puedes iniciar sesión.");

    // Cambiar a tab de login
    authTabs[0].click();
    loginForm.elements.studentNumber.value = formData.get("studentNumber");
  } catch (error) {
    showToast(error.message);
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("studentToken");
  localStorage.removeItem("studentData");
  currentStudent = null;
  authToken = null;
  location.reload();
});

// Check if user is already logged in
function checkAuth() {
  const token = localStorage.getItem("studentToken");
  const studentData = localStorage.getItem("studentData");

  if (token && studentData) {
    authToken = token;
    currentStudent = JSON.parse(studentData);
    showMainContent();
  }
}

// Show main content after auth
async function showMainContent() {
  authScreen.hidden = true;
  mainContent.hidden = false;

  userInfo.textContent = `${currentStudent.fullName} (${currentStudent.studentNumber})`;

  await loadTeachers();
}

// Load teachers from API
async function loadTeachers() {
  try {
    const response = await fetch(`${API_URL}/api/teachers`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al cargar maestros");
    }

    teachers = data.teachers.map((t) => ({
      id: t.id,
      name: t.fullName,
      program: t.programCode,
      programLabel: t.programLabel,
      subject: t.subject,
      bio: t.bio || "Docente de la FCA UACH",
    }));

    document.getElementById("teacher-count").textContent = teachers.length;
    render();
  } catch (error) {
    showToast(`Error: ${error.message}`);
  }
}

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

    if (!matchesProgram) return false;

    if (!query) return true;

    // Búsqueda flexible: dividir la consulta en palabras y verificar que cada palabra aparezca en cualquier parte del nombre
    const queryWords = query.split(/\s+/).filter((w) => w.length > 0);
    const haystack = `${teacher.name} ${teacher.subject} ${teacher.programLabel}`.toLowerCase();
    const nameWords = teacher.name.toLowerCase().split(/\s+/);

    // Cada palabra de la consulta debe aparecer en el haystack (nombre completo, materia o programa)
    return queryWords.every((word) => haystack.includes(word));
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
        <button class="btn btn-primary" type="button" data-teacher="${teacher.id}">
          Levantar reporte
        </button>
      </article>
    `
    )
    .join("");

  resultsMeta.textContent = `${filtered.length} maestro${filtered.length === 1 ? "" : "s"} en el directorio`;
  emptyState.hidden = filtered.length > 0;
}

function openModal(teacherId) {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) return;

  selectedTeacher = teacherId;
  modalTeacher.textContent = teacher.name;
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  try {
    const response = await fetch(`${API_URL}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        teacherId: selectedTeacher,
        motive: formData.get("motivo"),
        description: formData.get("descripcion"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al enviar reporte");
    }

    closeModal();
    showToast("Reporte enviado exitosamente. Será revisado por la administración.");
  } catch (error) {
    showToast(error.message);
  }
});

search.addEventListener("input", render);
programFilter.addEventListener("change", render);

// Initialize
checkAuth();

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ddgsdfuidrjkvuukgzgb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wiMDd6PNZvhl4sejjWSw9Q_BoHot8Ma";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
let authScreen, mainContent, logoutBtn, userInfo;
let grid, search, subjectInput, resultsMeta, emptyState, modal, modalTeacher, form, toast;

let teachers = [];
let selectedTeacher = "";
let currentUser = null;
let showAllTeachers = false;

document.addEventListener('DOMContentLoaded', () => {
  authScreen = document.getElementById("auth-screen");
  mainContent = document.getElementById("main-content");
  logoutBtn = document.getElementById("logout-btn");
  userInfo = document.getElementById("user-info");

  grid = document.getElementById("teacher-grid");
  search = document.getElementById("search");
  subjectInput = document.getElementById("subject-filter");
  resultsMeta = document.getElementById("results-meta");
  emptyState = document.getElementById("empty-state");
  modal = document.getElementById("report-modal");
  modalTeacher = document.getElementById("modal-teacher");
  form = document.getElementById("report-form");
  toast = document.getElementById("toast");

  // Event listeners
  modal.addEventListener("click", (event) => {
    if (event.target.dataset.close !== undefined) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-teacher]");
    if (!button) return;
    openModal(button.dataset.teacher);
  });

  search.addEventListener("input", render);
  subjectInput.addEventListener("input", render);
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const motive = formData.get("motive");
    const description = formData.get("description");

    if (description.length < 20) {
      showToast("La descripción debe tener al menos 20 caracteres");
      return;
    }

    const files = formData.getAll("evidences");
    if (files.length === 0 || (files.length === 1 && files[0].size === 0)) {
      showToast("Debes adjuntar al menos una evidencia");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) {
        showToast(`El archivo ${file.name} excede 10MB`);
        return;
      }
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const limitCheck = await fetch(
        `${window.SUPABASE_URL}/functions/v1/rapid-handler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: session.user.id }),
        }
      );

      const limitData = await limitCheck.json();

      if (!limitData.canCreate) {
        showToast(`Has alcanzado el límite de 2 reportes por semana. Ya tienes ${limitData.currentCount}.`);
        return;
      }

      const { data: report, error: reportError } = await supabaseClient
        .from("reports")
        .insert({
          teacher_id: selectedTeacher,
          student_id: currentUser.id,
          motive,
          description,
          is_anonymous: true,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      for (const file of files) {
        const fileName = `${report.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("report-evidences")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Error al subir archivo:", uploadError);
          continue;
        }

        const { data: urlData } = supabaseClient.storage
          .from("report-evidences")
          .getPublicUrl(fileName);

        await supabaseClient.from("report_evidences").insert({
          report_id: report.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: fileName,
        });
      }

      closeModal();
      showToast("Reporte enviado exitosamente. Será revisado por la administración.");
    } catch (error) {
      showToast(error.message || "Error al enviar reporte");
    }
  });

  // Initialize
  checkAuth();
});

// Verificar autenticación al cargar
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const { data: student, error } = await supabaseClient
    .from("students")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  if (error || !student) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = student;
  userInfo.textContent = `${currentUser.full_name} (${currentUser.student_number})`;

  await loadTeachers();
}

// Load teachers from Supabase
async function loadTeachers() {
  try {
    const { data, error } = await supabaseClient
      .from("teachers")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    teachers = data.map((t) => ({
      id: t.id,
      name: t.full_name,
      program: t.program_code,
      programLabel: t.program_label,
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
  const subjectFilter = subjectInput.value.trim().toLowerCase();

  const filtered = teachers.filter((teacher) => {
    // Búsqueda por nombre
    if (query) {
      const queryWords = query.split(/\s+/).filter((w) => w.length > 0);
      const nameHaystack = teacher.name.toLowerCase();
      const nameMatches = queryWords.every((word) => nameHaystack.includes(word));
      if (!nameMatches) return false;
    }

    // Búsqueda por materia
    if (subjectFilter) {
      const subjectWords = subjectFilter.split(/\s+/).filter((w) => w.length > 0);
      const subjectHaystack = teacher.subject.toLowerCase();
      const subjectMatches = subjectWords.every((word) => subjectHaystack.includes(word));
      if (!subjectMatches) return false;
    }

    return true;
  });

  // Si no hay búsqueda ni filtro, mostrar solo 6 maestros
  const teachersToShow = (query || subjectFilter) ? filtered : filtered.slice(0, 6);

  grid.innerHTML = teachersToShow
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

  resultsMeta.textContent = filtered.length > 6 && !(query || subjectFilter)
    ? `Mostrando 6 de ${filtered.length} maestros. Usa el buscador para ver más.`
    : `${filtered.length} maestro${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}`;
  emptyState.hidden = filtered.length > 0;
}

function openModal(teacherId) {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) return;

  selectedTeacher = teacherId;
  modalTeacher.textContent = teacher.name;

  const teacherIdInput = document.createElement("input");
  teacherIdInput.type = "hidden";
  teacherIdInput.name = "teacherId";
  teacherIdInput.value = teacherId;

  const existingInput = form.querySelector('input[name="teacherId"]');
  if (existingInput) existingInput.remove();

  form.appendChild(teacherIdInput);

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
    toast.hidden = false;
  }, 3200);
}

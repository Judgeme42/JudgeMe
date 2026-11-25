import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ddgsdfuidrjkvuukgzgb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wiMDd6PNZvhl4sejjWSw9Q_BoHot8Ma";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
let userInfo, logoutBtn, searchReports, statusFilter, reportsList;
let totalReportsEl, pendingReportsEl, resolvedReportsEl;
let detailModal, detailContent, toast;

let reports = [];
let currentAdmin = null;

// Session timeout (2 hours)
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
let sessionTimeoutId = null;
let lastActivity = Date.now();

document.addEventListener('DOMContentLoaded', () => {
  userInfo = document.getElementById("user-info");
  logoutBtn = document.getElementById("logout-btn");
  searchReports = document.getElementById("search-reports");
  statusFilter = document.getElementById("status-filter");
  reportsList = document.getElementById("reports-list");
  totalReportsEl = document.getElementById("total-reports");
  pendingReportsEl = document.getElementById("pending-reports");
  resolvedReportsEl = document.getElementById("resolved-reports");
  detailModal = document.getElementById("report-detail-modal");
  detailContent = document.getElementById("report-detail-content");
  toast = document.getElementById("toast");

  // Event listeners
  detailModal.addEventListener("click", (event) => {
    if (event.target.dataset.close !== undefined) closeDetailModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !detailModal.hidden) closeDetailModal();
  });

  searchReports.addEventListener("input", renderReports);
  statusFilter.addEventListener("change", renderReports);
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  // Session timeout management
  startSessionTimeout();
  setupActivityListeners();

  // Initialize
  checkAuth();
});

// Verificar autenticación y rol de admin
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // Verificar si es admin
  const { data: admin, error } = await supabaseClient
    .from("admin_users")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !admin) {
    window.location.href = 'index.html';
    return;
  }

  currentAdmin = admin;
  userInfo.textContent = admin.email;

  await loadReports();
}

// Load all reports from Supabase
async function loadReports() {
  try {
    const { data, error } = await supabaseClient
      .from("reports")
      .select(`
        id,
        motive,
        description,
        status,
        created_at,
        teachers (
          full_name,
          subject
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    reports = data;
    updateStats();
    renderReports();
  } catch (error) {
    showToast(`Error: ${error.message}`);
  }
}

function updateStats() {
  totalReportsEl.textContent = reports.length;
  pendingReportsEl.textContent = reports.filter(r => r.status === 'pending').length;
  resolvedReportsEl.textContent = reports.filter(r => r.status === 'resolved').length;
}

function renderReports() {
  const query = searchReports.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = reports.filter((report) => {
    // Filtro por estado
    if (status !== "todos" && report.status !== status) return false;

    // Búsqueda por texto
    if (query) {
      const queryWords = query.split(/\s+/).filter((w) => w.length > 0);
      const haystack = `${report.teachers?.full_name || ""} ${report.motive} ${report.description}`.toLowerCase();
      const matches = queryWords.every((word) => haystack.includes(word));
      if (!matches) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    reportsList.innerHTML = '<p class="empty">No hay reportes que coincidan con tu búsqueda.</p>';
    return;
  }

  reportsList.innerHTML = filtered.map((report) => {
    const teacherName = report.teachers?.full_name || "Docente desconocido";
    const date = new Date(report.created_at).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isResolved = report.status === 'resolved';
    const statusClass = isResolved ? 'status-resolved' : 'status-pending';
    const statusText = isResolved ? 'Atendido' : 'Pendiente';

    return `
      <div class="report-card">
        <div class="report-header">
          <div>
            <h3>${teacherName}</h3>
          </div>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="report-body">
          <p class="report-motive">${report.motive}</p>
          <p class="report-description">${report.description}</p>
          <p class="report-date">${date}</p>
        </div>
        <div class="report-actions">
          <button class="btn btn-primary btn-small" onclick="viewReportDetails('${report.id}')">
            Ver Detalles
          </button>
          ${report.status === 'pending' ? `
            <button class="btn btn-ghost btn-small" onclick="markAsResolved('${report.id}')">
              Marcar como Atendido
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function viewReportDetails(reportId) {
  detailContent.innerHTML = '<p class="loading">Cargando detalles...</p>';
  detailModal.hidden = false;
  document.body.style.overflow = "hidden";

  try {
    const { data: report, error } = await supabaseClient
      .from("reports")
      .select(`
        id,
        motive,
        description,
        status,
        created_at,
        teachers (
          full_name,
          subject
        )
      `)
      .eq("id", reportId)
      .single();

    if (error) throw error;

    // Cargar evidencias
    const { data: evidences, error: evidencesError } = await supabaseClient
      .from("report_evidences")
      .select("*")
      .eq("report_id", reportId);

    if (evidencesError) throw evidencesError;

    const teacherName = report.teachers?.full_name || "Docente desconocido";
    const date = new Date(report.created_at).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const evidencesHtml = evidences && evidences.length > 0
      ? `
        <div class="evidences-section">
          <h4>Evidencias (${evidences.length})</h4>
          <div class="evidences-grid">
            ${evidences.map(ev => evidenceCard(ev)).join('')}
          </div>
        </div>
      `
      : '<p class="empty">No hay evidencias adjuntas.</p>';

    detailContent.innerHTML = `
      <div class="report-detail">
        <div class="detail-section">
          <h4>Docente</h4>
          <p><strong>${teacherName}</strong></p>
        </div>

        <div class="detail-section">
          <h4>Motivo</h4>
          <p>${report.motive}</p>
        </div>

        <div class="detail-section">
          <h4>Descripción</h4>
          <p>${report.description}</p>
        </div>

        <div class="detail-section">
          <h4>Fecha</h4>
          <p>${date}</p>
        </div>

        <div class="detail-section">
          <h4>Estado</h4>
          <span class="status-badge ${report.status === 'resolved' ? 'status-resolved' : 'status-pending'}">
            ${report.status === 'resolved' ? 'Atendido' : 'Pendiente'}
          </span>
        </div>

        ${evidencesHtml}
      </div>
    `;
  } catch (error) {
    detailContent.innerHTML = `<p class="error">Error al cargar detalles: ${error.message}</p>`;
  }
}

function evidenceCard(ev) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/report-evidences/${ev.file_path}`;
  const mime = (ev.file_type || "").toLowerCase();
  const ext = (ev.file_name || "").split(".").pop().toLowerCase();

  let preview = "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
    preview = `<a href="${url}" target="_blank" rel="noopener"><img class="evidence-preview-img" src="${url}" alt="${ev.file_name}" loading="lazy" /></a>`;
  } else if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "webm"].includes(ext)) {
    preview = `<audio class="evidence-preview-media" controls preload="metadata" src="${url}"></audio>`;
  } else if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    preview = `<video class="evidence-preview-media" controls preload="metadata" src="${url}"></video>`;
  } else if (mime === "application/pdf" || ext === "pdf") {
    preview = `<iframe class="evidence-preview-pdf" src="${url}" title="${ev.file_name}" loading="lazy"></iframe>`;
  } else {
    preview = `<div class="evidence-preview-file">📄<span>${ext.toUpperCase() || "ARCHIVO"}</span></div>`;
  }

  return `
    <div class="evidence-item">
      ${preview}
      <p class="evidence-name" title="${ev.file_name}">${ev.file_name}</p>
      <p class="evidence-size">${ev.file_size ? (ev.file_size / 1024 / 1024).toFixed(2) + " MB" : ""}</p>
      <div class="evidence-actions">
        <a href="${url}" target="_blank" rel="noopener" class="btn btn-ghost btn-small">Ver</a>
        <a href="${url}" download="${ev.file_name}" class="btn btn-primary btn-small">Descargar</a>
      </div>
    </div>
  `;
}

async function markAsResolved(reportId) {
  try {
    const { error } = await supabaseClient
      .from("reports")
      .update({ status: 'resolved' })
      .eq("id", reportId);

    if (error) throw error;

    showToast("Reporte marcado como atendido.");
    await loadReports();
  } catch (error) {
    showToast(`Error: ${error.message}`);
  }
}

function closeDetailModal() {
  detailModal.hidden = true;
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

// Session timeout functions
function startSessionTimeout() {
  resetSessionTimeout();
}

function resetSessionTimeout() {
  clearTimeout(sessionTimeoutId);
  sessionTimeoutId = setTimeout(() => {
    showToast("Sesión expirada por inactividad. Inicia sesión nuevamente.");
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }, SESSION_TIMEOUT);
}

function setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  events.forEach(event => {
    document.addEventListener(event, () => {
      lastActivity = Date.now();
      resetSessionTimeout();
    }, true);
  });

  // Check session expiry every minute
  setInterval(() => {
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      clearTimeout(sessionTimeoutId);
      showToast("Sesión expirada por inactividad. Inicia sesión nuevamente.");
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  }, 60000); // Check every minute
}

// Make functions available globally for onclick
window.viewReportDetails = viewReportDetails;
window.markAsResolved = markAsResolved;

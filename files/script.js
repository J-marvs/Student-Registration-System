// ── Config ────────────────────────────────────────────────────
const API = "https://student-registration-system-production-8afb.up.railway.app/";

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ""; }, 3000);
}

// ── Tab switching ─────────────────────────────────────────────
const TABS = ["students","enroll","courses","audit"];
function showTab(name) {
  TABS.forEach(t => {
    document.getElementById("tab-" + t).classList.toggle("hidden", t !== name);
  });
  document.querySelectorAll("nav button").forEach((b, i) => {
    b.classList.toggle("active", TABS[i] === name);
  });
  if (name === "enroll")  { loadEnrollments(); loadStudentSelect(); loadCourseSelect(); }
  if (name === "courses") loadCourses();
  if (name === "audit")   loadAudit();
}

// ── API helpers ───────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...opts
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (e) {
    toast(e.message, "error");
    throw e;
  }
}

// ── Status check ──────────────────────────────────────────────
async function checkStatus() {
  try {
    await fetch(API + "/departments");
    document.getElementById("api-status").textContent = "● Connected";
    document.getElementById("api-status").style.color = "#6ee7b7";
  } catch {
    document.getElementById("api-status").textContent = "● Offline – start app.py";
    document.getElementById("api-status").style.color = "#fca5a5";
  }
}

// ══════════════════════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════════════════════
async function loadStudents() {
  const rows = await apiFetch("/students");
  const tb = document.getElementById("student-table");
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px;text-align:center">No students found.</td></tr>'; return; }
  tb.innerHTML = rows.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td><b>${s.student_no}</b></td>
      <td>${s.first_name} ${s.last_name}</td>
      <td>${s.email}</td>
      <td>${s.dept_name || "—"}</td>
      <td><span class="badge ${s.status==="Active"?"badge-green":s.status==="Graduated"?"badge-blue":"badge-yellow"}">${s.status}</span></td>
      <td class="flex">
        <button class="btn btn-warn btn-sm" onclick='editStudent(${JSON.stringify(s)})'>✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.student_id},'${s.first_name} ${s.last_name}')">🗑️</button>
      </td>
    </tr>`).join("");
}

async function loadDeptSelect() {
  const depts = await apiFetch("/departments");
  const sel = document.getElementById("s-dept");
  sel.innerHTML = '<option value="">— Select —</option>' +
    depts.map(d => `<option value="${d.department_id}">${d.dept_name}</option>`).join("");
}

async function saveStudent() {
  const id = document.getElementById("s-id").value;
  const body = {
    student_no:    document.getElementById("s-no").value.trim(),
    first_name:    document.getElementById("s-fname").value.trim(),
    last_name:     document.getElementById("s-lname").value.trim(),
    email:         document.getElementById("s-email").value.trim(),
    birthdate:     document.getElementById("s-bdate").value,
    department_id: document.getElementById("s-dept").value,
    status:        document.getElementById("s-status").value,
  };
  if (!body.student_no || !body.first_name || !body.last_name || !body.email || !body.department_id) {
    toast("Please fill in all required fields.", "error"); return;
  }
  if (id) {
    await apiFetch("/students/" + id, { method: "PUT", body: JSON.stringify(body) });
    toast("Student updated!");
  } else {
    await apiFetch("/students", { method: "POST", body: JSON.stringify(body) });
    toast("Student added!");
  }
  clearStudentForm();
  loadStudents();
}

function editStudent(s) {
  document.getElementById("s-id").value    = s.student_id;
  document.getElementById("s-no").value    = s.student_no;
  document.getElementById("s-fname").value = s.first_name;
  document.getElementById("s-lname").value = s.last_name;
  document.getElementById("s-email").value = s.email;
  document.getElementById("s-bdate").value = s.birthdate || "";
  document.getElementById("s-dept").value  = s.department_id || "";
  document.getElementById("s-status").value= s.status;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  await apiFetch("/students/" + id, { method: "DELETE" });
  toast("Student deleted.", "error");
  loadStudents();
}

function clearStudentForm() {
  ["s-id","s-no","s-fname","s-lname","s-email","s-bdate"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("s-dept").value   = "";
  document.getElementById("s-status").value = "Active";
}

// ══════════════════════════════════════════════════════════════
// ENROLLMENTS
// ══════════════════════════════════════════════════════════════
async function loadStudentSelect() {
  const rows = await apiFetch("/students");
  const sel = document.getElementById("e-student");
  sel.innerHTML = '<option value="">— Select Student —</option>' +
    rows.map(s => `<option value="${s.student_id}">${s.student_no} – ${s.first_name} ${s.last_name}</option>`).join("");
}

async function loadCourseSelect() {
  const rows = await apiFetch("/courses");
  const sel = document.getElementById("e-course");
  sel.innerHTML = '<option value="">— Select Course —</option>' +
    rows.map(c => `<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join("");
}

async function loadEnrollments() {
  const rows = await apiFetch("/enrollments");
  const tb = document.getElementById("enroll-table");
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px;text-align:center">No enrollments.</td></tr>'; return; }
  tb.innerHTML = rows.map((e, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${e.student_no}<br><small class="text-muted">${e.student_name}</small></td>
      <td>${e.course_code}<br><small class="text-muted">${e.course_name}</small></td>
      <td>${e.semester}</td>
      <td>${e.school_year}</td>
      <td><small>${e.enrolled_at}</small></td>
      <td><button class="btn btn-danger btn-sm" onclick="dropEnrollment(${e.enrollment_id})">Drop</button></td>
    </tr>`).join("");
}

async function enrollStudent() {
  const body = {
    student_id:  document.getElementById("e-student").value,
    course_id:   document.getElementById("e-course").value,
    semester:    document.getElementById("e-sem").value,
    school_year: document.getElementById("e-sy").value.trim(),
  };
  if (!body.student_id || !body.course_id || !body.school_year) {
    toast("Fill in all enrollment fields.", "error"); return;
  }
  await apiFetch("/enrollments", { method: "POST", body: JSON.stringify(body) });
  toast("Enrolled successfully!");
  loadEnrollments();
}

async function dropEnrollment(id) {
  if (!confirm("Drop this enrollment?")) return;
  await apiFetch("/enrollments/" + id, { method: "DELETE" });
  toast("Enrollment dropped.", "error");
  loadEnrollments();
}

// ══════════════════════════════════════════════════════════════
// COURSES
// ══════════════════════════════════════════════════════════════
async function loadCourses() {
  const rows = await apiFetch("/courses");
  const tb = document.getElementById("course-table");
  tb.innerHTML = rows.map((c, i) => `
    <tr>
      <td>${i+1}</td>
      <td><b>${c.course_code}</b></td>
      <td>${c.course_name}</td>
      <td><span class="badge badge-blue">${c.units} u</span></td>
      <td>${c.dept_name || "—"}</td>
    </tr>`).join("");
}

// ══════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════
async function loadAudit() {
  const rows = await apiFetch("/audit");
  const tb = document.getElementById("audit-table");
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px;text-align:center">No log entries.</td></tr>'; return; }
  tb.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td><span class="badge ${r.action==="INSERT"?"badge-green":r.action==="DELETE"?"badge-red":"badge-yellow"}">${r.action}</span></td>
      <td>${r.table_name}</td>
      <td>${r.record_id}</td>
      <td>${r.description}</td>
      <td><small>${r.created_at}</small></td>
    </tr>`).join("");
}

// ── Init ──────────────────────────────────────────────────────
checkStatus();
loadDeptSelect();
loadStudents();

const STORAGE_KEY = "tasky_tasks";
const PROFILE_KEY = "tasky_profile";
const SUBJECT_KEY = "tasky_subjects";

const defaultSubjects = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Biologi",
  "Kimia",
  "Fisika",
  "Informatika",
  "Sejarah",
  "Geografi",
  "Ekonomi",
  "Sosiologi",
  "Pendidikan Pancasila",
  "PJOK",
  "Seni Budaya",
  "Agama",
  "Bahasa Jawa"
];

let tasks = loadData(STORAGE_KEY, []);
let subjects = loadData(SUBJECT_KEY, defaultSubjects);
let calendarDate = new Date();
let selectedDate = getToday();

const $ = id => document.getElementById(id);

function loadData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(SUBJECT_KEY, JSON.stringify(subjects));
    localStorage.setItem(PROFILE_KEY, localStorage.getItem(PROFILE_KEY) || "");
  } catch {
    showToast("Penyimpanan penuh atau tidak tersedia.");
  }
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function deadlineValue(task) {
  return new Date(`${task.deadlineDate}T${task.deadlineTime || "23:59"}:00`).getTime();
}

function isOverdue(task) {
  return !task.completed && deadlineValue(task) < Date.now();
}

function countdown(task) {
  const diff = deadlineValue(task) - Date.now();

  if (task.completed) return "Tugas sudah selesai";
  if (diff < 0) return "Deadline sudah terlewat";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days} hari ${hours} jam lagi`;
  if (hours > 0) return `${hours} jam ${minutes} menit lagi`;
  return `${minutes} menit lagi`;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function sortedTasks(list = tasks) {
  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return deadlineValue(a) - deadlineValue(b);
  });
}

// NAVIGASI
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  if (pageId === "kalender") renderCalendar();
  if (pageId === "tugas") renderTasks();
  if (pageId === "beranda") renderDashboard();
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

// MATA PELAJARAN
function renderSubjects() {
  $("taskSubject").innerHTML =
    '<option value="">Pilih mata pelajaran</option>' +
    subjects.map(subject =>
      `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`
    ).join("");
}

$("addSubject").addEventListener("click", () => {
  const name = prompt("Masukkan nama mata pelajaran baru:");

  if (!name || !name.trim()) return;

  const subject = name.trim();

  if (subjects.some(s => s.toLowerCase() === subject.toLowerCase())) {
    showToast("Mata pelajaran sudah tersedia.");
    return;
  }

  subjects.push(subject);
  saveData();
  renderSubjects();
  $("taskSubject").value = subject;
  showToast("Mata pelajaran berhasil ditambahkan.");
});

// FORM TUGAS
$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("taskId").value;

  const task = {
    id: id || makeId(),
    title: $("taskName").value.trim(),
    subject: $("taskSubject").value,
    description: $("taskDescription").value.trim(),
    assignedDate: $("assignedDate").value,
    deadlineDate: $("deadlineDate").value,
    deadlineTime: $("deadlineTime").value,
    priority: $("taskPriority").value,
    completed: false,
    checklist: [],
    createdAt: new Date().toISOString()
  };

  if (!task.title || !task.subject || !task.deadlineDate || !task.deadlineTime) {
    showToast("Lengkapi data tugas terlebih dahulu.");
    return;
  }

  const deadline = deadlineValue(task);

  if (!Number.isFinite(deadline)) {
    showToast("Tanggal atau jam deadline tidak valid.");
    return;
  }

  if (id) {
    const oldTask = tasks.find(item => item.id === id);

    if (oldTask) {
      task.completed = oldTask.completed;
      task.checklist = oldTask.checklist || [];
      task.createdAt = oldTask.createdAt;
    }

    tasks = tasks.map(item => item.id === id ? task : item);
    showToast("Tugas berhasil diperbarui.");
  } else {
    tasks.push(task);
    showToast("Tugas berhasil disimpan.");
  }

  saveData();
  resetForm();
  renderAll();
  showPage("tugas");
});

function resetForm() {
  $("taskForm").reset();
  $("taskId").value = "";
  $("formTitle").textContent = "Tambah Tugas ✏️";
  $("saveTaskButton").textContent = "Simpan Tugas";
  $("cancelEdit").hidden = true;
}

$("cancelEdit").addEventListener("click", resetForm);

function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  showPage("tambah");
  $("taskId").value = task.id;
  $("taskName").value = task.title;
  $("taskSubject").value = task.subject;
  $("taskDescription").value = task.description;
  $("assignedDate").value = task.assignedDate || "";
  $("deadlineDate").value = task.deadlineDate;
  $("deadlineTime").value = task.deadlineTime;
  $("taskPriority").value = task.priority;

  $("formTitle").textContent = "Edit Tugas";
  $("saveTaskButton").textContent = "Simpan Perubahan";
  $("cancelEdit").hidden = false;
}

function deleteTask(id) {
  const confirmed = confirm("Apakah kamu yakin ingin menghapus tugas ini?");

  if (!confirmed) return;

  tasks = tasks.filter(task => task.id !== id);
  saveData();
  renderAll();
  showToast("Tugas berhasil dihapus.");
}

function toggleComplete(id) {
  tasks = tasks.map(task =>
    task.id === id ? {...task, completed: !task.completed} : task
  );

  saveData();
  renderAll();
}

function priorityLabel(priority) {
  return {
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi"
  }[priority] || "Sedang";
}

// TAMPILAN KARTU TUGAS
function taskCard(task) {
  const priority = task.priority || "sedang";
  const checklist = task.checklist || [];

  const checked = checklist.filter(item => item.done).length;

  return `
    <article class="task-card ${task.completed ? "completed" : ""}">
      <div class="task-top">
        <div>
          <h4>${escapeHTML(task.title)}</h4>
          <p>${escapeHTML(task.subject)}</p>
        </div>
        <span class="badge ${priority}">
          ${priorityLabel(priority)}
        </span>
      </div>

      <p>${escapeHTML(task.description || "Tidak ada deskripsi")}</p>

      <div class="task-meta">
        <span class="badge">📅 ${formatDate(task.deadlineDate)}</span>
        <span class="badge">🕒 ${escapeHTML(task.deadlineTime || "23:59")}</span>
        ${isOverdue(task) ? '<span class="badge high">Terlambat</span>' : ""}
        ${task.completed ? '<span class="badge low">Selesai</span>' : ""}
      </div>

      <div class="countdown">${countdown(task)}</div>

      <div class="checklist">
        <strong>Checklist (${checked}/${checklist.length})</strong>

        ${checklist.map((item, index) => `
          <label>
            <input type="checkbox"
              data-check-task="${task.id}"
              data-check-index="${index}"
              ${item.done ? "checked" : ""}>
            <span>${escapeHTML(item.text)}</span>
          </label>
        `).join("")}

        <div class="checklist-add">
          <input type="text"
            id="check-${task.id}"
            placeholder="Tambah langkah pengerjaan...">
          <button data-add-check="${task.id}">+</button>
        </div>
      </div>

      <div class="task-actions">
        <button data-complete="${task.id}">
          ${task.completed ? "Batalkan selesai" : "Tandai selesai"}
        </button>
        <button data-edit="${task.id}">Edit</button>
        <button class="delete-button" data-delete="${task.id}">Hapus</button>
      </div>
    </article>
  `;
}

function renderTaskList(container, list) {
  container.innerHTML = list.length
    ? sortedTasks(list).map(taskCard).join("")
    : '<div class="empty-state">♡<br><br>Belum ada tugas di sini.</div>';
}

// EVENT DELEGATION
document.addEventListener("click", event => {
  const target = event.target.closest("button");

  if (!target) return;

  if (target.dataset.complete) toggleComplete(target.dataset.complete);
  if (target.dataset.edit) editTask(target.dataset.edit);
  if (target.dataset.delete) deleteTask(target.dataset.delete);

  if (target.dataset.addCheck) {
    const id = target.dataset.addCheck;
    const input = $(`check-${id}`);
    const text = input.value.trim();

    if (!text) return;

    tasks = tasks.map(task =>
      task.id === id
        ? {...task, checklist: [...(task.checklist || []), {text, done: false}]}
        : task
    );

    saveData();
    renderAll();
    showToast("Checklist ditambahkan.");
  }
});

document.addEventListener("change", event => {
  const input = event.target;

  if (input.dataset.checkTask) {
    const id = input.dataset.checkTask;
    const index = Number(input.dataset.checkIndex);

    tasks = tasks.map(task => {
      if (task.id !== id) return task;

      const checklist = [...(task.checklist || [])];
      checklist[index] = {...checklist[index], done: input.checked};

      return {...task, checklist};
    });

    saveData();
    renderAll();
  }
});

// DASHBOARD
function renderDashboard() {
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.filter(task => !task.completed).length;
  const overdue = tasks.filter(isOverdue).length;

  $("totalTasks").textContent = tasks.length;
  $("completedTasks").textContent = completed;
  $("pendingTasks").textContent = pending;
  $("overdueTasks").textContent = overdue;

  const progress = tasks.length
    ? Math.round(completed / tasks.length * 100)
    : 0;

  $("progressText").textContent = `${progress}%`;
  $("progressBar").style.width = `${progress}%`;

  renderTaskList(
    $("upcomingTasks"),
    sortedTasks(tasks.filter(task => !task.completed)).slice(0, 3)
  );

  $("todayDate").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// PENCARIAN DAN FILTER
function renderTasks() {
  const search = $("searchTask").value.toLowerCase();
  const status = $("filterStatus").value;
  const priority = $("filterPriority").value;

  const filtered = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      task.subject.toLowerCase().includes(search);

    const matchesStatus =
      status === "semua" ||
      (status === "selesai" && task.completed) ||
      (status === "belum" && !task.completed && !isOverdue(task)) ||
      (status === "terlambat" && isOverdue(task));

    const matchesPriority =
      priority === "semua" || task.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  renderTaskList($("allTasks"), filtered);
}

$("searchTask").addEventListener("input", renderTasks);
$("filterStatus").addEventListener("change", renderTasks);
$("filterPriority").addEventListener("change", renderTasks);

// KALENDER
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("monthTitle").textContent = calendarDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  let html = weekdays.map(day =>
    `<div class="calendar-day weekday">${day}</div>`
  ).join("");

  for (let i = 0; i < firstDay; i++) {
    html += '<div></div>';
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const hasTask = tasks.some(task =>
      task.deadlineDate === date
    );

    const classes = [
      "calendar-day",
      hasTask ? "has-task" : "",
      date === selectedDate ? "selected" : "",
      date === getToday() ? "today" : ""
    ].filter(Boolean).join(" ");

    html += `<button class="${classes}" data-date="${date}">${day}</button>`;
  }

  $("calendarGrid").innerHTML = html;
  renderSelectedDateTasks();
}

function renderSelectedDateTasks() {
  const selected = tasks.filter(task => task.deadlineDate === selectedDate);
  renderTaskList($("selectedDateTasks"), selected);
}

$("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

$("calendarGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-date]");
  if (!button) return;

  selectedDate = button.dataset.date;
  renderCalendar();
});

// PROFIL
function renderProfile() {
  const name = localStorage.getItem(PROFILE_KEY) || "";
  $("userName").value = name;
  $("greetingName").textContent = name || "Pelajar";
}

$("saveName").addEventListener("click", () => {
  const name = $("userName").value.trim();

  if (!name) {
    showToast("Masukkan nama panggilan terlebih dahulu.");
    return;
  }

  localStorage.setItem(PROFILE_KEY, name);
  renderProfile();
  showToast("Nama berhasil disimpan.");
});

// BACKUP
$("exportData").addEventListener("click", () => {
  const backup = {
    app: "Tasky",
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    subjects,
    profile: localStorage.getItem(PROFILE_KEY) || ""
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    {type: "application/json"}
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "tasky-backup.json";
  link.click();

  URL.revokeObjectURL(url);
  showToast("Backup berhasil dibuat.");
});

$("importData").addEventListener("click", async () => {
  const file = $("importFile").files[0];

  if (!file) {
    showToast("Pilih file backup terlebih dahulu.");
    return;
  }

  try {
    const data = JSON.parse(await file.text());

    if (
      data.app !== "Tasky" ||
      !Array.isArray(data.tasks) ||
      !Array.isArray(data.subjects) ||
      !data.tasks.every(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.subject === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(task.deadlineDate) &&
        ["rendah", "sedang", "tinggi"].includes(task.priority) &&
        typeof task.completed === "boolean" &&
        Array.isArray(task.checklist)
      ) ||
      !data.subjects.every(s => typeof s === "string")
    ) {
      throw new Error("Format backup tidak sesuai.");
    }

    if (!confirm("Data saat ini akan diganti dengan data backup. Lanjutkan?")) return;

    tasks = data.tasks;
    subjects = data.subjects;
    localStorage.setItem(PROFILE_KEY, String(data.profile || "").slice(0, 30));

    saveData();
    renderAll();
    renderProfile();
    showToast("Data berhasil dipulihkan.");
  } catch (error) {
    showToast("File backup tidak valid atau rusak.");
  }
});

// STATUS INTERNET
function updateConnection() {
  $("connectionStatus").textContent =
    navigator.onLine ? "● Online" : "● Offline";

  $("connectionStatus").style.color =
    navigator.onLine ? "#65a989" : "#d68a65";
}

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

// SERVICE WORKER
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Service Worker:", error));
  });
}

// REFRESH HITUNG MUNDUR
function renderAll() {
  renderDashboard();
  renderTasks();
  renderCalendar();
}

function initialize() {
  renderSubjects();
  renderProfile();
  updateConnection();
  renderAll();
}

initialize();

setInterval(() => {
  renderDashboard();
  renderTasks();

  if ($("kalender").classList.contains("active")) {
    renderCalendar();
  }
}, 60000);

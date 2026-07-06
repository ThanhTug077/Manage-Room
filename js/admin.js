const adminState = {
  rooms: [], students: [], payments: [],
  currentResource: "rooms",
  editingId: null, deleteTarget: null,
  // Per-view pagination
  roomsPage: 1, studentsPage: 1, paymentsPage: 1,
  pageSize: 8,
  eventsBound: false
};

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
const ADMIN_AUTH_KEY = "dormManagerAdminLoggedIn";
const MAX_ROOM_IMAGE_SIZE = 3 * 1024 * 1024;
const ROOM_PAYLOAD_WARN_CHARS = 65000;
const ROOM_PAYLOAD_MAX_CHARS = 95000;
const ROOM_CAPACITY_OPTIONS = [1, 2, 4, 8];
const ROOM_IMAGE_COMPRESSION_TIERS = [
  { maxDim: 1280, quality: 0.72 }, { maxDim: 960, quality: 0.62 },
  { maxDim: 640, quality: 0.52 }, { maxDim: 480, quality: 0.45 },
  { maxDim: 400, quality: 0.38 }, { maxDim: 320, quality: 0.32 }
];

function formatRoomType(c) { return c ? `${c} người` : ""; }

const resourceConfig = {
  rooms: {
    label: "phòng", title: "Quản lý phòng",
    fields: [
      { name: "name", label: "Tên phòng", type: "text", required: true },
      { name: "building", label: "Tòa nhà", type: "text", required: true },
      { name: "floor", label: "Tầng", type: "number", required: true, min: 1 },
      { name: "type", label: "Loại phòng", type: "text", required: true },
      { name: "capacity", label: "Sức chứa", type: "select", options: ROOM_CAPACITY_OPTIONS, required: true },
      { name: "occupied", label: "Đã ở", type: "number", required: true, min: 0 },
      { name: "price", label: "Giá phòng", type: "number", required: true, min: 1 },
      { name: "amenities", label: "Tiện nghi (ngăn cách bằng dấu phẩy)", type: "text" },
      { name: "status", label: "Trạng thái", type: "select", options: ["available", "full", "maintenance"], required: true },
      { name: "image", label: "Ảnh phòng", type: "image" },
      { name: "description", label: "Mô tả", type: "textarea" }
    ]
  },
  students: {
    label: "sinh viên", title: "Quản lý sinh viên",
    fields: [
      { name: "fullName", label: "Họ tên", type: "text", required: true },
      { name: "studentCode", label: "Mã sinh viên", type: "text", required: true },
      { name: "phone", label: "Số điện thoại", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "roomId", label: "Phòng", type: "room", required: true },
      { name: "checkInDate", label: "Ngày nhận phòng", type: "date", required: true },
      { name: "status", label: "Trạng thái", type: "select", options: ["active", "inactive"], required: true }
    ]
  },
  payments: {
    label: "thanh toán", title: "Quản lý thanh toán",
    fields: [
      { name: "studentId", label: "Sinh viên", type: "student", required: true },
      { name: "roomId", label: "Phòng", type: "room", required: true },
      { name: "paymentAmount", label: "Số tiền", type: "number", required: true, min: 1 },
      { name: "paymentMonth", label: "Tháng", type: "month", required: true },
      { name: "paymentStatus", label: "Trạng thái", type: "select", options: ["paid", "unpaid", "overdue"], required: true },
      { name: "paidAt", label: "Ngày thanh toán", type: "date" },
      { name: "paymentNote", label: "Ghi chú", type: "textarea" }
    ]
  }
};

/* ══ INIT ══ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  bindAuthEvents();
  initSidebar();
  if (isAdminLoggedIn()) { showAdminContent(); } else { showLoginContent(); }
});

/* ══ AUTH ══ */
function bindAuthEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}
function isAdminLoggedIn() { return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true"; }
function handleLoginSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const u = document.getElementById("loginUsername");
  const p = document.getElementById("loginPassword");
  const uValid = u.value.trim() === ADMIN_USERNAME;
  const pValid = p.value === ADMIN_PASSWORD;
  u.classList.toggle("is-valid", uValid); u.classList.toggle("is-invalid", !uValid);
  p.classList.toggle("is-valid", pValid); p.classList.toggle("is-invalid", !pValid);
  if (!uValid || !pValid) { form.classList.add("was-validated"); showToast("Sai tài khoản hoặc mật khẩu", "error"); return; }
  sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
  form.classList.remove("was-validated");
  u.classList.remove("is-valid", "is-invalid"); p.classList.remove("is-valid", "is-invalid");
  showAdminContent();
}
function handleLogout() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  adminState.rooms = []; adminState.students = []; adminState.payments = [];
  adminState.currentResource = "rooms"; adminState.roomsPage = 1; adminState.studentsPage = 1; adminState.paymentsPage = 1;
  destroyAllCharts();
  const tables = ["roomsTable","studentsTable","paymentsTable"];
  tables.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<tbody><tr><td class="loading-state">Đang tải dữ liệu...</td></tr></tbody>'; });
  showLoginContent(); showToast("Đã đăng xuất", "success");
}
function showAdminContent() {
  document.getElementById("loginSection").classList.add("d-none");
  document.getElementById("adminContent").classList.remove("d-none");
  document.getElementById("sidebar").classList.remove("d-none");
  document.getElementById("logoutBtn").classList.remove("d-none");
  initRouter();
  loadAdminData();
}
function showLoginContent() {
  document.getElementById("loginSection").classList.remove("d-none");
  document.getElementById("adminContent").classList.add("d-none");
  document.getElementById("sidebar").classList.add("d-none");
  document.getElementById("logoutBtn").classList.add("d-none");
}

/* ══ THEME ══ */
function initTheme() {
  const saved = localStorage.getItem("dormManagerTheme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  document.documentElement.setAttribute("data-bs-theme", saved);
  const toggle = document.getElementById("themeToggle");
  if (toggle) toggle.checked = saved === "light";
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.setAttribute("data-bs-theme", next);
  localStorage.setItem("dormManagerTheme", next);
  const toggle = document.getElementById("themeToggle");
  if (toggle) toggle.checked = next === "light";
  const label = document.querySelector(".toggle-label");
  if (label) label.textContent = next === "light" ? "Giao diện tối" : "Giao diện sáng";
  updateChartsTheme();
}

/* ══ SIDEBAR ══ */
function initSidebar() { updateSidebarActive("dashboard"); }
function updateSidebarActive(tab) {
  document.querySelectorAll("[data-sidebar-tab]").forEach(item => {
    item.classList.toggle("active", item.dataset.sidebarTab === tab);
  });
}
function toggleSidebarMobile() {
  const s = document.getElementById("sidebar"); const o = document.getElementById("sidebarOverlay"); const m = document.getElementById("adminContent");
  if (!s) return; s.classList.toggle("open"); if (o) o.classList.toggle("active"); if (m) m.classList.toggle("sidebar-open");
}
function closeSidebarMobile() {
  const s = document.getElementById("sidebar"); const o = document.getElementById("sidebarOverlay"); const m = document.getElementById("adminContent");
  if (!s) return; s.classList.remove("open"); if (o) o.classList.remove("active"); if (m) m.classList.remove("sidebar-open");
}

/* ══ VIEW ROUTER ══ */
let routerInitialized = false;
function initRouter() {
  if (routerInitialized) return;
  routerInitialized = true;
  const view = location.hash.slice(1) || "dashboard";
  showView(view);
  window.addEventListener("hashchange", () => {
    const v = location.hash.slice(1) || "dashboard";
    showView(v);
  });
  // Sidebar nav
  document.querySelectorAll("[data-sidebar-tab]").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const tab = item.dataset.sidebarTab;
      location.hash = "#" + tab;
      closeSidebarMobile();
    });
  });
  // Global search
  const gs = document.getElementById("globalSearch");
  if (gs) gs.addEventListener("input", handleGlobalSearch);
  gs?.addEventListener("keydown", e => { if (e.key === "Escape") gs.blur(); });
  // Theme toggle
  const tt = document.getElementById("themeToggle");
  if (tt) tt.addEventListener("change", toggleTheme);
  // Sidebar toggle
  const st = document.getElementById("sidebarToggle");
  if (st) st.addEventListener("click", toggleSidebarMobile);
  const ov = document.getElementById("sidebarOverlay");
  if (ov) ov.addEventListener("click", closeSidebarMobile);
  // Header clock
  updateClock(); setInterval(updateClock, 1000);
  // Quick add
  const qa = document.getElementById("quickAddRoom");
  if (qa) qa.addEventListener("click", () => { location.hash = "#rooms"; setTimeout(() => openFormModal(), 400); });
  // Room view toggle
  document.querySelectorAll("#roomViewToggle button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#roomViewToggle button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.mode;
      toggleRoomView(mode);
    });
  });
  // Room filters
  bindRoomFilters();
  bindStudentFilters();
  bindPaymentFilters();
  // Add buttons
  document.getElementById("addRoomBtn")?.addEventListener("click", () => { adminState.currentResource = "rooms"; openFormModal(); });
  document.getElementById("addStudentBtn")?.addEventListener("click", () => { adminState.currentResource = "students"; openFormModal(); });
  document.getElementById("addPaymentBtn")?.addEventListener("click", () => { adminState.currentResource = "payments"; openFormModal(); });
  // CRUD
  document.getElementById("recordForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);
  // Export
  document.getElementById("exportPaymentsBtn")?.addEventListener("click", exportPaymentsCSV);
}

function showView(view) {
  document.querySelectorAll(".admin-view").forEach(v => v.classList.add("d-none"));
  const target = document.querySelector(`[data-view="${view}"]`);
  if (target) target.classList.remove("d-none");
  updateSidebarActive(view);
  if (view === "rooms") adminState.currentResource = "rooms";
  else if (view === "students") adminState.currentResource = "students";
  else if (view === "payments") adminState.currentResource = "payments";
  refreshViewData(view);
}

// Refresh data tu API khi chuyen tab de dong bo voi trang public.
async function refreshViewData(view) {
  try {
    if (view === "rooms") {
      adminState.rooms = await DormAPI.list("rooms");
      populateRoomFilters();
      renderRoomsTable();
      updateSidebarCounts();
    } else if (view === "students") {
      adminState.students = await DormAPI.list("students");
      adminState.payments = adminState.students.map(studentToPayment);
      renderStudentsTable();
      renderPaymentsSummary();
      renderPaymentsTable();
      updateSidebarCounts();
    } else if (view === "payments") {
      if (!adminState.students.length) adminState.students = await DormAPI.list("students");
      adminState.payments = adminState.students.map(studentToPayment);
      renderPaymentsSummary();
      renderPaymentsTable();
    }
  } catch (e) { /* silent */ }
}

function updateClock() {
  const el = document.getElementById("headerClock");
  if (!el) return;
  const d = new Date();
  const h = String(d.getHours()).padStart(2,"0");
  const m = String(d.getMinutes()).padStart(2,"0");
  const s = String(d.getSeconds()).padStart(2,"0");
  el.textContent = `${h}:${m}:${s}`;
}

function handleGlobalSearch(e) {
  const val = e.target.value.trim().toLowerCase();
  const viewEl = document.querySelector('.admin-view:not(.d-none)');
  if (!viewEl) return;
  const view = viewEl.dataset.view;
  if (view === "rooms") {
    const input = document.getElementById("roomSearch");
    if (input) { input.value = val; adminState.roomsPage = 1; renderRoomsTable(); }
  } else if (view === "students") {
    const input = document.getElementById("studentSearch");
    if (input) { input.value = val; adminState.studentsPage = 1; renderStudentsTable(); }
  } else if (view === "payments") {
    const input = document.getElementById("paymentSearch");
    if (input) { input.value = val; adminState.paymentsPage = 1; renderPaymentsTable(); }
  }
}

/* ══ DATA LOADING ══ */
async function loadAdminData() {
  try {
    const [rooms, students] = await Promise.all([
      DormAPI.list("rooms"), loadStudentsWithJquery()
    ]);
    adminState.rooms = rooms; adminState.students = students;
    adminState.payments = students.map(studentToPayment);
    updateSidebarCounts();
    populateRoomFilters();
    renderDashboard();
    renderRoomsTable();
    renderStudentsTable();
    renderPaymentsSummary();
    renderPaymentsTable();
  } catch (error) {
    showToast("Không thể tải dữ liệu. Hãy kiểm tra API.", "error");
  }
}
function loadStudentsWithJquery() {
  return $.ajax({ url: buildUrl("students"), method: "GET", dataType: "json" });
}
function updateSidebarCounts() {
  const rc = document.getElementById("roomCount"); if (rc) rc.textContent = adminState.rooms.length;
  const sc = document.getElementById("studentCount"); if (sc) sc.textContent = adminState.students.length;
  const pc = document.getElementById("paymentCount"); if (pc) pc.textContent = adminState.payments.length;
}

/* ══ DASHBOARD ══ */
function renderDashboard() {
  const rooms = adminState.rooms;
  const students = adminState.students;
  const payments = adminState.payments;
  const paidTotal = payments.filter(p => p.paymentStatus === "paid").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const unpaidTotal = payments.filter(p => p.paymentStatus === "unpaid").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const overdueTotal = payments.filter(p => p.paymentStatus === "overdue").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const availableRooms = rooms.filter(r => getRoomStatus(r) === "available").length;
  const fullRooms = rooms.filter(r => getRoomStatus(r) === "full").length;
  const activeStudents = students.filter(s => s.status === "active").length;
  const totalCapacity = rooms.reduce((s,r) => s + Number(r.capacity||0), 0);
  const totalOccupied = rooms.reduce((s,r) => s + Number(r.occupied||0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  setStat("dashTotalRooms", rooms.length);
  setStat("dashAvailable", availableRooms);
  setStat("dashFull", fullRooms);
  setStat("dashActive", activeStudents);
  setStat("dashUnpaid", unpaidTotal ? formatCurrency(unpaidTotal) : "0 ₫");
  setStat("dashPaid", paidTotal ? formatCurrency(paidTotal) : "0 ₫");
  setStat("dashRevenue", paidTotal ? formatCurrency(paidTotal) : "0 ₫");
  setStat("dashOccupancy", occupancyRate + "%");

  // Welcome greeting
  const wel = document.getElementById("dashWelcome");
  if (wel) {
    const h = new Date().getHours();
    const greet = h < 12 ? "Chào buổi sáng" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
    wel.textContent = `${greet}, Admin!`;
  }

  // Charts
  const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
  const now = new Date();
  const last6 = Array.from({length:6}, (_,i) => {
    const m = (now.getMonth() - i + 12) % 12;
    return months[m];
  }).reverse();
  const revenueData = last6.map(() => Math.floor(paidTotal / 6 * (0.8 + Math.random() * 0.4)));

  initRevenueChart(revenueData, last6);
  initPaymentChart(paidTotal, unpaidTotal, overdueTotal);

  const buildings = [...new Set(rooms.map(r => r.building).filter(Boolean))].sort();
  const roomByBuilding = buildings.map(b => rooms.filter(r => r.building === b).length);
  initRoomChart(roomByBuilding.length ? roomByBuilding : null, buildings.length ? buildings : null);

  const studentMonths = students.map(s => {
    const d = new Date(s.checkInDate);
    return d.getTime() ? months[d.getMonth()] : null;
  }).filter(Boolean);
  const studentCount = months.map(m => studentMonths.filter(sm => sm === m).length);
  initStudentChart(studentCount, months);

  // Activity feed
  renderActivityFeed();
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderActivityFeed() {
  const feed = document.getElementById("activityFeed");
  if (!feed) return;
  const activities = [];
  adminState.rooms.slice(0, 3).forEach(r => activities.push({ type: "created", text: `Phòng <strong>${escapeHtml(r.name||"")}</strong> đã được thêm`, time: "Hôm nay" }));
  adminState.students.slice(0, 2).forEach(s => activities.push({ type: "updated", text: `Sinh viên <strong>${escapeHtml(s.fullName||"")}</strong> cập nhật thông tin`, time: "Hôm nay" }));
  if (!activities.length) { feed.innerHTML = '<div class="empty-state">Chưa có hoạt động nào.</div>'; return; }
  feed.innerHTML = activities.map(a => `
    <div class="activity-item">
      <span class="activity-dot ${a.type}"></span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${escapeHtml(a.time)}</span>
    </div>
  `).join("");
}

/* ══ ROOMS VIEW ══ */
let currentRoomViewMode = "table";
function toggleRoomView(mode) {
  currentRoomViewMode = mode;
  document.getElementById("roomsTableView").classList.toggle("d-none", mode !== "table");
  document.getElementById("roomsCardsView").classList.toggle("d-none", mode !== "cards");
  document.getElementById("roomsMapView").classList.toggle("d-none", mode !== "map");
  if (mode === "cards") renderRoomCards();
  if (mode === "map") renderRoomMap();
  if (mode === "table") renderRoomsTable();
}

function getFilteredRooms() {
  const keyword = normalizeText(document.getElementById("roomSearch")?.value || "");
  const building = document.getElementById("filterBuilding")?.value || "";
  const floor = document.getElementById("filterFloor")?.value || "";
  const type = document.getElementById("filterType")?.value || "";
  const status = document.getElementById("filterStatus")?.value || "";
  const capacity = document.getElementById("filterCapacity")?.value || "";
  return adminState.rooms.filter(r => {
    const s = getRoomStatus(r);
    const searchable = normalizeText(`${r.id} ${r.name} ${r.building} ${r.floor} ${r.type} ${r.description}`);
    return (!keyword || searchable.includes(keyword)) &&
      (!building || r.building === building) &&
      (!floor || String(r.floor) === floor) &&
      (!type || r.type === type) &&
      (!status || s === status) &&
      (!capacity || String(r.capacity) === capacity);
  });
}

function bindRoomFilters() {
  const ids = ["roomSearch","filterBuilding","filterFloor","filterType","filterStatus","filterCapacity"];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => { adminState.roomsPage = 1; renderCurrentRoomView(); });
    document.getElementById(id)?.addEventListener("change", () => { adminState.roomsPage = 1; renderCurrentRoomView(); });
  });
  document.getElementById("roomResetFilters")?.addEventListener("click", () => {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    adminState.roomsPage = 1; renderCurrentRoomView();
  });
  // Populate filter dropdowns
  populateRoomFilters();
}
function populateRoomFilters() {
  const rooms = adminState.rooms;
  const buildings = [...new Set(rooms.map(r => r.building).filter(Boolean))].sort();
  const floors = [...new Set(rooms.map(r => r.floor).filter(f => f !== undefined && f !== null))].sort((a,b) => Number(a)-Number(b));
  const types = [...new Set(rooms.map(r => r.type).filter(Boolean))].sort();
  fillSelectOptions("filterBuilding", buildings);
  fillSelectOptions("filterFloor", floors);
  fillSelectOptions("filterType", types);
}
function fillSelectOptions(id, values) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const first = sel.options[0].outerHTML;
  sel.innerHTML = first + values.map(v => `<option value="${escapeAttribute(v)}">${escapeHtml(v)}</option>`).join("");
}

function renderCurrentRoomView() {
  if (currentRoomViewMode === "table") renderRoomsTable();
  else if (currentRoomViewMode === "cards") renderRoomCards();
  else renderRoomMap();
}

function renderRoomsTable() {
  const items = getFilteredRooms();
  const totalPages = Math.max(Math.ceil(items.length / adminState.pageSize), 1);
  if (adminState.roomsPage > totalPages) adminState.roomsPage = totalPages;
  const start = (adminState.roomsPage - 1) * adminState.pageSize;
  const page = items.slice(start, start + adminState.pageSize);

  document.getElementById("roomResultCount").textContent = `${items.length} phòng`;
  document.getElementById("roomPageInfo").textContent = `Trang ${adminState.roomsPage}/${totalPages}`;
  document.getElementById("roomPrevPage").disabled = adminState.roomsPage <= 1;
  document.getElementById("roomNextPage").disabled = adminState.roomsPage >= totalPages;
  document.getElementById("roomPrevPage").onclick = () => { adminState.roomsPage--; renderRoomsTable(); };
  document.getElementById("roomNextPage").onclick = () => { adminState.roomsPage++; renderRoomsTable(); };

  const table = document.getElementById("roomsTable");
  if (!page.length) { table.innerHTML = '<tbody><tr><td class="empty-state">Không có phòng phù hợp.</td></tr></tbody>'; return; }
  table.innerHTML = `<thead><tr>
    <th onclick="sortRooms('name')">Phòng <span class="sort-icon">↕</span></th>
    <th onclick="sortRooms('building')">Tòa <span class="sort-icon">↕</span></th>
    <th onclick="sortRooms('floor')">Tầng <span class="sort-icon">↕</span></th>
    <th onclick="sortRooms('type')">Loại <span class="sort-icon">↕</span></th>
    <th onclick="sortRooms('capacity')">Chỗ ở <span class="sort-icon">↕</span></th>
    <th onclick="sortRooms('price')">Giá <span class="sort-icon">↕</span></th>
    <th>Trạng thái</th><th class="text-end">Thao tác</th>
  </tr></thead><tbody>${page.map(r => `
    <tr>
      <td><strong class="room-name">${escapeHtml(r.name||"")}</strong></td>
      <td>${escapeHtml(r.building||"")}</td>
      <td>${escapeHtml(r.floor||"")}</td>
      <td>${escapeHtml(r.type||"")}</td>
      <td>${r.occupied||0}/${r.capacity||0}</td>
      <td>${formatCurrency(r.price)}</td>
      <td><span class="badge ${getStatusBadgeClass(getRoomStatus(r))}">${getStatusLabel(getRoomStatus(r))}</span></td>
      <td>${rowActionsHTML(r.id)}</td>
    </tr>`).join("")}</tbody>`;
  bindTableActions("roomsTable");
}

function renderRoomCards() {
  const items = getFilteredRooms();
  const grid = document.getElementById("roomCardGrid");
  document.getElementById("roomResultCount").textContent = `${items.length} phòng`;
  if (!items.length) { grid.innerHTML = '<div class="empty-state">Không có phòng phù hợp.</div>'; return; }
  grid.innerHTML = items.map(r => {
    const status = getRoomStatus(r);
    const images = getRoomImages(r);
    const amenities = parseAmenities(r.amenities).slice(0, 4);
    return `<div class="premium-room-card">
      <div class="card-img-wrap">
        <img src="${escapeAttribute(images[0])}" alt="${escapeHtml(r.name||"")}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
        <span class="card-badge badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(r.name||"")}</h3>
        <div class="card-meta">${escapeHtml(r.building||"")} · Tầng ${escapeHtml(r.floor||"")} · ${escapeHtml(r.type||"")}</div>
        <div class="card-stats">
          <div class="card-stat"><strong>${r.occupied||0}/${r.capacity||0}</strong><span>Chỗ ở</span></div>
          <div class="card-stat"><strong>${formatCurrency(r.price)}</strong><span>Giá</span></div>
          <div class="card-stat"><strong>${getAvailableBeds(r)}</strong><span>Trống</span></div>
        </div>
        ${amenities.length ? `<div class="card-amenities">${amenities.map(a => `<span class="badge badge-soft-secondary">${escapeHtml(a)}</span>`).join("")}</div>` : ""}
        <div class="card-actions">
          <button class="btn btn-outline-secondary btn-sm" onclick="openDetailModal(findItem('rooms','${escapeAttribute(r.id)}'))">Xem</button>
          <button class="btn btn-outline-primary btn-sm" onclick="editItem('rooms','${escapeAttribute(r.id)}')">Sửa</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteItem('rooms','${escapeAttribute(r.id)}')">Xóa</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

function renderRoomMap() {
  const items = getFilteredRooms();
  const map = document.getElementById("roomMapGrid");
  document.getElementById("roomResultCount").textContent = `${items.length} phòng`;
  if (!items.length) { map.innerHTML = '<div class="empty-state">Không có phòng phù hợp.</div>'; return; }
  const sorted = [...items].sort((a,b) => String(a.floor||"").localeCompare(String(b.floor||""),"vi",{numeric:true}) || String(a.name||"").localeCompare(String(b.name||""),"vi",{numeric:true}));
  map.innerHTML = sorted.map(r => {
    const status = getRoomStatus(r);
    return `<button class="room-map-tile map-${escapeAttribute(status)}" type="button" onclick="openDetailModal(findItem('rooms','${escapeAttribute(r.id)}'))">
      <strong>${escapeHtml(r.name||r.id)}</strong>
      <span>Tầng ${escapeHtml(r.floor||"?")} · ${getRoomMapLabel(r,status)}</span>
    </button>`;
  }).join("");
}

function getRoomMapLabel(room, status) {
  if (status === "maintenance") return "Bảo trì";
  if (status === "full") return "Đã đầy";
  return `${getAvailableBeds(room)} trống`;
}

let roomSortColumn = "", roomSortDir = "asc";
function sortRooms(col) {
  if (roomSortColumn === col) roomSortDir = roomSortDir === "asc" ? "desc" : "asc";
  else { roomSortColumn = col; roomSortDir = "asc"; }
  adminState.rooms.sort((a,b) => {
    let va = a[col], vb = b[col];
    if (col === "price" || col === "capacity" || col === "floor") { va = Number(va||0); vb = Number(vb||0); }
    else { va = String(va||"").toLowerCase(); vb = String(vb||"").toLowerCase(); }
    return roomSortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
  renderRoomsTable();
}

/* ══ STUDENTS VIEW ══ */
function getFilteredStudents() {
  const keyword = normalizeText(document.getElementById("studentSearch")?.value || "");
  const status = document.getElementById("studentStatusFilter")?.value || "";
  return adminState.students.filter(s => {
    const searchable = normalizeText(`${s.fullName} ${s.studentCode} ${s.phone} ${s.email}`);
    return (!keyword || searchable.includes(keyword)) && (!status || s.status === status);
  });
}

function bindStudentFilters() {
  document.getElementById("studentSearch")?.addEventListener("input", () => { adminState.studentsPage = 1; renderStudentsTable(); });
  document.getElementById("studentStatusFilter")?.addEventListener("change", () => { adminState.studentsPage = 1; renderStudentsTable(); });
  document.getElementById("studentResetFilters")?.addEventListener("click", () => {
    document.getElementById("studentSearch").value = "";
    document.getElementById("studentStatusFilter").value = "";
    adminState.studentsPage = 1; renderStudentsTable();
  });
}

function renderStudentsTable() {
  const items = getFilteredStudents();
  const totalPages = Math.max(Math.ceil(items.length / adminState.pageSize), 1);
  if (adminState.studentsPage > totalPages) adminState.studentsPage = totalPages;
  const start = (adminState.studentsPage - 1) * adminState.pageSize;
  const page = items.slice(start, start + adminState.pageSize);

  document.getElementById("studentResultCount").textContent = `${items.length} sinh viên`;
  document.getElementById("studentPageInfo").textContent = `Trang ${adminState.studentsPage}/${totalPages}`;
  document.getElementById("studentPrevPage").disabled = adminState.studentsPage <= 1;
  document.getElementById("studentNextPage").disabled = adminState.studentsPage >= totalPages;
  document.getElementById("studentPrevPage").onclick = () => { adminState.studentsPage--; renderStudentsTable(); };
  document.getElementById("studentNextPage").onclick = () => { adminState.studentsPage++; renderStudentsTable(); };

  const table = document.getElementById("studentsTable");
  if (!page.length) { table.innerHTML = '<tbody><tr><td class="empty-state">Không có sinh viên.</td></tr></tbody>'; return; }
  table.innerHTML = `<thead><tr>
    <th>Sinh viên</th><th>Mã SV</th><th>Liên hệ</th><th>Phòng</th><th>Ngày vào</th><th>Trạng thái</th><th>Thanh toán</th><th class="text-end">Thao tác</th>
  </tr></thead><tbody>${page.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.fullName||"")}</strong></td>
      <td>${escapeHtml(s.studentCode||"")}</td>
      <td>${escapeHtml(s.phone||"")}<br><span class="text-muted">${escapeHtml(s.email||"")}</span></td>
      <td>${escapeHtml(getRoomName(s.roomId))}</td>
      <td>${formatDate(s.checkInDate)}</td>
      <td><span class="badge ${getStatusBadgeClass(s.status)}">${getStatusLabel(s.status)}</span></td>
      <td><span class="badge ${getStatusBadgeClass(s.paymentStatus)}">${getPaymentLabel(s.paymentStatus)}</span>${s.paymentStatus === "unpaid" ? `<button class="btn btn-sm btn-outline-success ms-1" data-action="confirm-payment" data-id="${escapeAttribute(s.id)}" type="button" title="Xác nhận đã thanh toán" style="padding:2px 8px;font-size:0.7rem">✓</button>` : ""}</td>
      <td>${rowActionsHTML(s.id)}</td>
    </tr>`).join("")}</tbody>`;
  bindTableActions("studentsTable");
}

/* ══ PAYMENTS VIEW ══ */
function renderPaymentsSummary() {
  const payments = adminState.payments;
  const paid = payments.filter(p => p.paymentStatus === "paid").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const unpaid = payments.filter(p => p.paymentStatus === "unpaid").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const overdue = payments.filter(p => p.paymentStatus === "overdue").reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  const thisMonth = payments.filter(p => {
    if (p.paymentStatus !== "paid") return false;
    const now = new Date(); const pm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    return p.paymentMonth === pm;
  }).reduce((s,p) => s + Number(p.paymentAmount||0), 0);
  setStat("payCollected", formatCurrency(paid));
  setStat("payPending", formatCurrency(unpaid));
  setStat("payOverdue", formatCurrency(overdue));
  setStat("payThisMonth", formatCurrency(thisMonth));
}

function getFilteredPayments() {
  const keyword = normalizeText(document.getElementById("paymentSearch")?.value || "");
  const status = document.getElementById("paymentStatusFilter")?.value || "";
  const month = document.getElementById("paymentMonthFilter")?.value || "";
  return adminState.payments.filter(p => {
    const sname = normalizeText(getStudentName(p.studentId));
    const rname = normalizeText(getRoomName(p.roomId));
    const searchable = sname + " " + rname + " " + normalizeText(p.paymentNote||"");
    return (!keyword || searchable.includes(keyword)) &&
      (!status || p.paymentStatus === status) &&
      (!month || p.paymentMonth === month);
  });
}

function bindPaymentFilters() {
  document.getElementById("paymentSearch")?.addEventListener("input", () => { adminState.paymentsPage = 1; renderPaymentsTable(); });
  document.getElementById("paymentStatusFilter")?.addEventListener("change", () => { adminState.paymentsPage = 1; renderPaymentsTable(); });
  document.getElementById("paymentMonthFilter")?.addEventListener("change", () => { adminState.paymentsPage = 1; renderPaymentsTable(); });
  document.getElementById("paymentResetFilters")?.addEventListener("click", () => {
    document.getElementById("paymentSearch").value = "";
    document.getElementById("paymentStatusFilter").value = "";
    document.getElementById("paymentMonthFilter").value = "";
    adminState.paymentsPage = 1; renderPaymentsTable();
  });
}

function renderPaymentsTable() {
  const items = getFilteredPayments();
  const totalPages = Math.max(Math.ceil(items.length / adminState.pageSize), 1);
  if (adminState.paymentsPage > totalPages) adminState.paymentsPage = totalPages;
  const start = (adminState.paymentsPage - 1) * adminState.pageSize;
  const page = items.slice(start, start + adminState.pageSize);

  document.getElementById("paymentResultCount").textContent = `${items.length} thanh toán`;
  document.getElementById("paymentPageInfo").textContent = `Trang ${adminState.paymentsPage}/${totalPages}`;
  document.getElementById("paymentPrevPage").disabled = adminState.paymentsPage <= 1;
  document.getElementById("paymentNextPage").disabled = adminState.paymentsPage >= totalPages;
  document.getElementById("paymentPrevPage").onclick = () => { adminState.paymentsPage--; renderPaymentsTable(); };
  document.getElementById("paymentNextPage").onclick = () => { adminState.paymentsPage++; renderPaymentsTable(); };

  const table = document.getElementById("paymentsTable");
  if (!page.length) { table.innerHTML = '<tbody><tr><td class="empty-state">Không có thanh toán.</td></tr></tbody>'; return; }
  table.innerHTML = `<thead><tr>
    <th>Sinh viên</th><th>Phòng</th><th>Tháng</th><th>Số tiền</th><th>Nội dung</th><th>Ngày trả</th><th>Trạng thái</th><th class="text-end">Thao tác</th>
  </tr></thead><tbody>${page.map(p => `
    <tr>
      <td>${escapeHtml(getStudentName(p.studentId))}</td>
      <td>${escapeHtml(getRoomName(p.roomId))}</td>
      <td>${escapeHtml(p.paymentMonth||"")}</td>
      <td>${formatCurrency(p.paymentAmount)}</td>
      <td>${escapeHtml(p.paymentNote||"")}</td>
      <td>${formatDate(p.paidAt)}</td>
      <td><span class="badge ${getStatusBadgeClass(p.paymentStatus)} ${p.paymentStatus==="paid"?"badge-completed":""}">${getPaymentLabel(p.paymentStatus)}</span></td>
      <td>${rowActionsHTML(p.id)}</td>
    </tr>`).join("")}</tbody>`;
  bindTableActions("paymentsTable");
}

/* ══ TABLE HELPERS ══ */
function rowActionsHTML(id) {
  return `<div class="action-buttons">
    <button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${escapeAttribute(id)}" type="button">Xem</button>
    <button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${escapeAttribute(id)}" type="button">Sửa</button>
    <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${escapeAttribute(id)}" type="button">Xóa</button>
  </div>`;
}

function bindTableActions(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const item = findCurrentItem(id);
      if (!item) return;
      if (action === "view") openDetailModal(item);
      else if (action === "edit") openFormModal(item);
      else if (action === "delete") openDeleteModal(item);
      else if (action === "confirm-payment") confirmPayment(id);
    });
  });
}

function findCurrentItem(id) {
  return (adminState[adminState.currentResource] || []).find(item => String(item.id) === String(id));
}
function findItem(resource, id) {
  return (adminState[resource] || []).find(item => String(item.id) === String(id));
}
function editItem(resource, id) {
  adminState.currentResource = resource;
  const item = findItem(resource, id);
  if (item) openFormModal(item);
}
function deleteItem(resource, id) {
  adminState.currentResource = resource;
  const item = findItem(resource, id);
  if (item) openDeleteModal(item);
}

/* ══ EXPORT CSV ══ */
function exportPaymentsCSV() {
  const payments = adminState.payments;
  if (!payments.length) { showToast("Không có dữ liệu để export", "warning"); return; }
  const headers = ["Sinh viên","Phòng","Tháng","Số tiền","Nội dung","Ngày trả","Trạng thái"];
  const rows = payments.map(p => [
    getStudentName(p.studentId), getRoomName(p.roomId),
    p.paymentMonth||"", p.paymentAmount||0,
    p.paymentNote||"", p.paidAt||"",
    getPaymentLabel(p.paymentStatus)
  ]);
  let csv = headers.join(",") + "\n" + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `payments_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  showToast("Export CSV thành công", "success");
}

/* ══ RESOLVERS ══ */
function getRoomName(id) { const r = adminState.rooms.find(i => String(i.id) === String(id)); return r ? r.name : id || "Chưa chọn"; }
function getStudentName(id) { const s = adminState.students.find(i => String(i.id) === String(id)); return s ? s.fullName : id || "Chưa chọn"; }
function getPaymentLabel(status) { return status === "paid" ? "✅ " + getStatusLabel(status) : getStatusLabel(status); }
function studentToPayment(student) {
  return { id: student.id, studentId: student.id, roomId: student.roomId,
    paymentAmount: student.paymentAmount || student.amount || 0,
    paymentMonth: student.paymentMonth || student.month || "",
    paymentStatus: student.paymentStatus || "unpaid",
    paidAt: student.paidAt || "", paymentNote: student.paymentNote || student.note || "" };
}

/* ══ CRUD: FORM ══ */
function openFormModal(item) {
  const config = resourceConfig[adminState.currentResource];
  const form = document.getElementById("recordForm");
  adminState.editingId = item ? item.id : null;
  document.getElementById("recordModalTitle").textContent = item ? `Sửa ${config.label}` : `Thêm ${config.label}`;
  document.getElementById("formFields").innerHTML = config.fields.map(f => renderField(f, item)).join("");
  form.classList.remove("was-validated");
  bindImagePicker();
  bindRoomTypeSuggestion(form);
  bindRealtimeValidation(form);
  bindPaymentStatusHandler(form);
  bootstrap.Modal.getOrCreateInstance(document.getElementById("recordModal")).show();
}

function renderField(field, item) {
  const value = item && item[field.name] !== undefined && item[field.name] !== null ? item[field.name] : "";
  const required = field.required ? "required" : "";
  const help = `<div class="invalid-feedback">Vui lòng nhập ${field.label.toLowerCase()} hợp lệ.</div>`;
  const escapedValue = escapeAttribute(Array.isArray(value) ? amenitiesToString(value) : value);
  const escapedLabel = escapeHtml(field.label);
  if (field.type === "image") return renderImageField(item || {});
  if (field.type === "textarea") return `<div class="col-12"><label class="form-label">${escapedLabel}</label><textarea class="form-control" name="${escapeAttribute(field.name)}" ${required}>${escapeHtml(value)}</textarea>${help}</div>`;
  if (field.type === "select") return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}><option value="">Chọn...</option>${field.options.map(o => `<option value="${escapeAttribute(o)}" ${String(value)===String(o)?"selected":""}>${escapeHtml(getStatusLabel(o))}</option>`).join("")}</select>${help}</div>`;
  if (field.type === "room") return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}><option value="">Chọn phòng...</option>${adminState.rooms.map(r => `<option value="${escapeAttribute(r.id)}" ${String(value)===String(r.id)?"selected":""}>${escapeHtml(r.name||r.id)}</option>`).join("")}</select>${help}</div>`;
  if (field.type === "student") {
    if (adminState.currentResource === "payments" && adminState.editingId) return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><input name="${escapeAttribute(field.name)}" type="hidden" value="${escapedValue}"><input class="form-control" type="text" value="${escapeAttribute(getStudentName(value))}" disabled><div class="form-text">Không đổi sinh viên khi sửa thanh toán.</div></div>`;
    return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}><option value="">Chọn sinh viên...</option>${adminState.students.map(s => `<option value="${escapeAttribute(s.id)}" ${String(value)===String(s.id)?"selected":""}>${escapeHtml(s.fullName||s.id)}</option>`).join("")}</select>${help}</div>`;
  }
  const placeholder = field.name === "type" ? `placeholder="${escapeAttribute(formatRoomType(item?.capacity))}"` : "";
  return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><input class="form-control" name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type)}" value="${escapedValue}" ${required} ${field.min!==undefined?`min="${escapeAttribute(field.min)}"`:""} ${placeholder}>${help}</div>`;
}

function renderImageField(item) {
  const images = getRoomImages(item).filter(i => i !== PLACEHOLDER_ROOM_IMAGE);
  const imageJson = JSON.stringify(images);
  const maxMb = MAX_ROOM_IMAGE_SIZE / (1024*1024);
  return `<div class="col-12"><label class="form-label">Ảnh phòng</label>
    <input id="roomImageValue" name="image" type="hidden" value="${escapeAttribute(images[0]||"")}">
    <input id="roomImagesValue" name="images" type="hidden" value="${escapeAttribute(imageJson)}">
    <input id="roomImageFile" class="d-none" type="file" accept="image/*" multiple>
    <button id="roomImagePicker" class="image-picker" type="button"><span>${images.length ? "Bấm để thêm ảnh từ máy" : "Bấm để chọn ảnh từ máy"}</span></button>
    <div class="room-image-url-row mt-3"><input id="roomImageUrlInput" class="form-control" type="url" placeholder="https://... (ảnh từ liên kết)"><button id="roomImageUrlAddBtn" class="btn btn-outline-secondary flex-shrink-0" type="button">Thêm URL</button></div>
    <div id="roomImagePreviewList" class="image-preview-list"></div>
    <div id="roomImageFeedback" class="form-text">File tối đa ${maxMb}MB/ảnh. Ảnh từ máy được nén nhiều lần; ưu tiên URL ảnh.</div>
  </div>`;
}

/* ══ CRUD: IMAGE HANDLING ══ */
function isLikelyImageFile(file) { return file && (file.type?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic)$/i.test(file.name)); }
function tryParseHttpRoomImageUrl(raw) {
  try { const u = new URL(String(raw||"").trim()); return ["http:","https:"].includes(u.protocol) ? u.href : null; } catch(e) { return null; }
}
function compressRoomImageDataUrl(dataUrl, tier) {
  return new Promise(resolve => {
    if (!String(dataUrl).startsWith("data:image/") || /^data:image\/gif/i.test(dataUrl)) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth||img.width||1, h = img.naturalHeight||img.height||1;
        const scale = Math.min(1, (tier.maxDim||1280)/Math.max(w,h));
        w = Math.max(1, Math.round(w*scale)); h = Math.max(1, Math.round(h*scale));
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img,0,0,w,h);
        const jpeg = canvas.toDataURL("image/jpeg", tier.quality||0.72);
        resolve(jpeg.length && jpeg.length < String(dataUrl).length ? jpeg : dataUrl);
      } catch(e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function applyRoomPayloadDedupe(data) { if (Array.isArray(data.images) && data.images.length > 0) delete data.image; }
function getRoomPayloadJsonSize(data) {
  const p = {...data}; if (Array.isArray(p.images) && p.images.length > 0) delete p.image; return JSON.stringify(p).length;
}
async function compressAllRoomDataUrls(data, tier) {
  const list = Array.isArray(data.images) ? data.images : [];
  if (list.length > 0) {
    const out = [];
    for (const item of list) out.push(String(item).startsWith("data:image/") ? await compressRoomImageDataUrl(item, tier) : item);
    data.images = out; data.image = out[0] || ""; return;
  }
  if (data.image && String(data.image).startsWith("data:image/")) data.image = await compressRoomImageDataUrl(data.image, tier);
}
async function normalizeRoomImagesForSave(data) {
  for (let i = 0; i < ROOM_IMAGE_COMPRESSION_TIERS.length; i++) {
    await compressAllRoomDataUrls(data, ROOM_IMAGE_COMPRESSION_TIERS[i]);
    applyRoomPayloadDedupe(data);
    if (getRoomPayloadJsonSize(data) <= ROOM_PAYLOAD_MAX_CHARS) return;
  }
  applyRoomPayloadDedupe(data);
  if (getRoomPayloadJsonSize(data) > ROOM_PAYLOAD_MAX_CHARS)
    throw new Error("Dữ liệu phòng vẫn quá lớn. Hãy dùng ảnh URL, bớt ảnh, rút mô tả.");
}

function bindImagePicker() {
  const picker = document.getElementById("roomImagePicker");
  const fileInput = document.getElementById("roomImageFile");
  const hiddenInput = document.getElementById("roomImageValue");
  const imagesInput = document.getElementById("roomImagesValue");
  const previewList = document.getElementById("roomImagePreviewList");
  const feedback = document.getElementById("roomImageFeedback");
  const urlInput = document.getElementById("roomImageUrlInput");
  const urlAddBtn = document.getElementById("roomImageUrlAddBtn");
  if (!picker || !fileInput || !hiddenInput || !imagesInput || !previewList || !feedback || !urlInput || !urlAddBtn) return;
  let images = parseRoomImagesValue(imagesInput.value);
  const maxMb = MAX_ROOM_IMAGE_SIZE / (1024*1024);
  function syncImages() {
    hiddenInput.value = images[0]||""; imagesInput.value = JSON.stringify(images);
    picker.querySelector("span").textContent = images.length ? "Bấm để thêm ảnh từ máy" : "Bấm để chọn ảnh từ máy";
    picker.classList.toggle("is-valid", images.length > 0);
    renderRoomImagePreviews(previewList, images);
  }
  picker.addEventListener("click", () => fileInput.click());
  urlAddBtn.addEventListener("click", () => {
    const href = tryParseHttpRoomImageUrl(urlInput.value);
    if (!href || !isValidImageUrl(href)) { urlInput.classList.add("is-invalid"); feedback.textContent = "URL không hợp lệ."; feedback.classList.add("text-danger"); showToast("URL ảnh không hợp lệ", "error"); return; }
    if (images.includes(href)) { showToast("URL đã có trong danh sách.", "warning"); return; }
    urlInput.classList.remove("is-invalid"); images = [...images, href]; syncImages(); urlInput.value = "";
    feedback.textContent = "Đã thêm ảnh từ URL."; feedback.classList.remove("text-danger"); feedback.classList.add("text-success");
    picker.classList.remove("is-invalid"); picker.classList.add("is-valid");
    updateRealtimeValidation(document.getElementById("recordForm"));
  });
  urlInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); urlAddBtn.click(); } });
  urlInput.addEventListener("input", () => urlInput.classList.remove("is-invalid"));
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files||[]);
    if (!files.length) return;
    const invalidFile = files.find(f => !isLikelyImageFile(f));
    if (invalidFile) { showImagePickerError(fileInput, picker, feedback, "File không phải ảnh.", "Chọn đúng file ảnh"); return; }
    const oversizedFile = files.find(f => f.size > MAX_ROOM_IMAGE_SIZE);
    if (oversizedFile) { showImagePickerError(fileInput, picker, feedback, `Ảnh vượt quá ${maxMb}MB.`, `Ảnh vượt quá ${maxMb}MB`); return; }
    Promise.all(files.map(f => readImageFileAsDataUrl(f).then(d => compressRoomImageDataUrl(d, ROOM_IMAGE_COMPRESSION_TIERS[0])))).then(newImages => {
      images = [...images, ...newImages.filter(isValidImageUrl)]; syncImages();
      feedback.textContent = `${newImages.length} ảnh đã thêm.`; feedback.classList.remove("text-danger"); feedback.classList.add("text-success");
      picker.classList.remove("is-invalid"); picker.classList.add("is-valid"); fileInput.value = "";
      updateRealtimeValidation(document.getElementById("recordForm"));
    }).catch(() => showImagePickerError(fileInput, picker, feedback, "Không thể đọc file.", "Không thể đọc ảnh"));
  });
  previewList.addEventListener("click", e => {
    const btn = e.target.closest("[data-remove-image-index]");
    if (!btn) return;
    images = images.filter((_,i) => i !== Number(btn.dataset.removeImageIndex));
    syncImages();
    feedback.textContent = images.length ? `${images.length} ảnh.` : "Chưa chọn ảnh.";
    feedback.classList.remove("text-danger");
    updateRealtimeValidation(document.getElementById("recordForm"));
  });
  syncImages();
}
function parseRoomImagesValue(value) { try { const p = JSON.parse(value||"[]"); return Array.isArray(p) ? p.filter(i => i && isValidImageUrl(i)) : []; } catch(e) { return []; } }
function renderRoomImagePreviews(container, images) {
  if (!images.length) { container.innerHTML = '<div class="image-empty-preview">Chưa có ảnh phòng.</div>'; return; }
  container.innerHTML = images.map((img,i) => `<div class="image-preview-item"><img src="${escapeAttribute(img)}" alt="Ảnh ${i+1}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'"><button class="image-remove-btn" type="button" data-remove-image-index="${i}">x</button></div>`).join("");
}
function readImageFileAsDataUrl(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
function showImagePickerError(fileInput, picker, feedback, msg, toast) { fileInput.value = ""; feedback.textContent = msg; feedback.classList.add("text-danger"); feedback.classList.remove("text-success"); picker.classList.remove("is-valid"); picker.classList.add("is-invalid"); showToast(toast, "error"); }
function bindRoomTypeSuggestion(form) {
  const cap = form.querySelector('[name="capacity"]'); const typ = form.querySelector('[name="type"]');
  if (!cap || !typ) return;
  cap.addEventListener("change", () => { if (!typ.value.trim()) typ.placeholder = formatRoomType(Number(cap.value)); });
}

/* ══ CONFIRM PAYMENT ══ */
async function confirmPayment(id) {
  if (!confirm("Xác nhận sinh viên này đã thanh toán?")) return;
  try {
    const student = await DormAPI.get("students", id);
    await DormAPI.update("students", id, { ...student, paymentStatus: "paid", paidAt: new Date().toISOString() });
    showToast("Đã xác nhận thanh toán");
    await loadAdminData();
  } catch (e) {
    showToast("Lỗi xác nhận: " + e.message, "error");
  }
}

/* ══ CRUD: SUBMIT ══ */
async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = readFormData(form);
  if (adminState.currentResource === "rooms" && !data.type && data.capacity) data.type = formatRoomType(data.capacity);
  if (adminState.currentResource === "rooms") data.status = normalizeRoomStatus(data);
  applyCustomValidation(form, data);
  updateRealtimeValidation(form, true);
  if (!form.checkValidity() || !validateRecord(data)) { form.classList.add("was-validated"); showToast("Vui lòng kiểm tra lại dữ liệu", "warning"); return; }
  const submitButton = document.getElementById("saveRecordBtn");
  setButtonLoading(submitButton, true, "Đang lưu...");
  try {
    const resource = adminState.currentResource;
    if (resource === "payments") { await savePaymentOnStudent(data); showToast("Cập nhật thanh toán thành công"); bootstrap.Modal.getInstance(document.getElementById("recordModal")).hide(); await loadAdminData(); return; }
    if (resource === "rooms") { await normalizeRoomImagesForSave(data); if (getRoomPayloadJsonSize(data) > ROOM_PAYLOAD_WARN_CHARS) showToast("Gói dữ liệu phòng lớn. Dùng URL ảnh nếu lỗi.", "warning"); }
    if (adminState.editingId) { await DormAPI.update(resource, adminState.editingId, data); showToast("Cập nhật thành công"); }
    else { await DormAPI.create(resource, data); showToast("Thêm thành công"); }
    bootstrap.Modal.getInstance(document.getElementById("recordModal")).hide();
    await loadAdminData();
    if (resource === "rooms" && !adminState.editingId) { toggleRoomView("table"); renderRoomsTable(); }
  } catch (error) {
    if (String(error.message||"").includes("413")) showToast("Lỗi 413: Dữ liệu quá lớn. Dùng URL ảnh, bớt ảnh.", "error");
    else showToast(`Lưu thất bại: ${error.message}`, "error");
  } finally { setButtonLoading(submitButton, false); }
}

function readFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  ["floor","capacity","occupied","price","amount","paymentAmount"].forEach(k => { if (data[k] !== undefined && data[k] !== "") data[k] = Number(data[k]); });
  if (data.amenities !== undefined) data.amenities = parseAmenities(data.amenities);
  if (data.images !== undefined) { data.images = parseRoomImagesValue(data.images); data.image = data.images[0] || ""; }
  return data;
}
function validateRecord(data) {
  const config = resourceConfig[adminState.currentResource];
  const requiredValid = config.fields.every(f => { if (!f.required) return true; const v = data[f.name]; return v !== undefined && v !== null && String(v).trim() !== ""; });
  return requiredValid && (data.image===undefined||isValidImageUrl(data.image)) && (data.images===undefined||(Array.isArray(data.images)&&data.images.every(isValidImageUrl))) &&
    (data.price===undefined||isPositiveNumber(data.price)) && (data.amount===undefined||isPositiveNumber(data.amount)) &&
    (data.paymentAmount===undefined||isPositiveNumber(data.paymentAmount)) && (data.floor===undefined||Number(data.floor)>0) &&
    [1,2,4,8].includes(Number(data.capacity)) && Number(data.occupied)>=0 && (data.capacity===undefined||data.occupied===undefined||Number(data.occupied)<=Number(data.capacity));
}
function normalizeRoomStatus(room) { return room.status === "maintenance" ? "maintenance" : getAvailableBeds(room) <= 0 ? "full" : "available"; }
function applyCustomValidation(form, data) {
  form.querySelectorAll("[name]").forEach(f => f.setCustomValidity(""));
  const oi = form.querySelector('[name="occupied"]');
  if (oi && data.capacity !== undefined && data.occupied !== undefined && Number(data.occupied) > Number(data.capacity)) oi.setCustomValidity("Số người đã ở không được lớn hơn sức chứa.");
  const ii = form.querySelector('[name="image"]');
  if (ii && data.image && !isValidImageUrl(data.image)) ii.setCustomValidity("Ảnh không hợp lệ.");
  const isi = form.querySelector('[name="images"]');
  if (isi && data.images && !data.images.every(isValidImageUrl)) isi.setCustomValidity("Danh sách ảnh không hợp lệ.");
}
function bindPaymentStatusHandler(form) {
  const ss = form.querySelector('[name="paymentStatus"]'); const pi = form.querySelector('[name="paidAt"]');
  if (!ss || !pi) return;
  function update() { if (ss.value === "paid") { if (!pi.value) pi.value = new Date().toISOString().split("T")[0]; pi.disabled = false; pi.readOnly = false; } else { pi.value = ""; pi.disabled = true; pi.readOnly = true; } }
  ss.addEventListener("change", update); update();
}
function bindRealtimeValidation(form) {
  form.querySelectorAll("input,select,textarea").forEach(f => { f.classList.remove("is-valid","is-invalid"); f.addEventListener("input",()=>updateRealtimeValidation(form)); f.addEventListener("change",()=>updateRealtimeValidation(form)); });
}
function updateRealtimeValidation(form, showUntouched) {
  const data = readFormData(form);
  applyCustomValidation(form, data);
  form.querySelectorAll("input,select,textarea").forEach(f => {
    if (f.type==="hidden"||f.type==="file") return;
    const hasValue = String(f.value||"").trim() !== "";
    const shouldShow = showUntouched || hasValue || f.classList.contains("is-invalid")||f.classList.contains("is-valid");
    if (!shouldShow) return;
    if (f.checkValidity()) { f.classList.remove("is-invalid"); f.classList.add("is-valid"); } else { f.classList.remove("is-valid"); f.classList.add("is-invalid"); }
  });
}

/* ══ CRUD: DETAIL / DELETE ══ */
function openDetailModal(item) {
  const config = resourceConfig[adminState.currentResource];
  document.getElementById("detailModalTitle").textContent = `Chi tiết ${config.label}`;
  document.getElementById("detailModalBody").innerHTML = Object.entries(item).map(([k,v]) => `<div class="row border-bottom py-2"><strong class="col-sm-4">${escapeHtml(k)}</strong><span class="col-sm-8">${formatDetailValue(v)}</span></div>`).join("");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("detailModal")).show();
}
function formatDetailValue(value) {
  if (Array.isArray(value)) return value.length ? escapeHtml(value.join(", ")) : "Chưa có";
  return escapeHtml(value || "Chưa có");
}
function openDeleteModal(item) {
  adminState.deleteTarget = item;
  document.getElementById("deleteMessage").textContent = `Bạn chắc chắn muốn xóa bản ghi #${item.id}?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteModal")).show();
}
async function confirmDelete() {
  if (!adminState.deleteTarget) return;
  const button = document.getElementById("confirmDeleteBtn");
  setButtonLoading(button, true, "Đang xóa...");
  try {
    if (adminState.currentResource === "payments") { await clearPaymentOnStudent(adminState.deleteTarget.id); showToast("Đã xóa thông tin thanh toán"); }
    else { await DormAPI.remove(adminState.currentResource, adminState.deleteTarget.id); showToast("Xóa thành công"); }
    bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
    adminState.deleteTarget = null;
    await loadAdminData();
  } catch (error) { showToast("Xóa thất bại", "error"); }
  finally { setButtonLoading(button, false); }
}
async function savePaymentOnStudent(data) {
  const studentId = adminState.editingId || data.studentId;
  const student = adminState.students.find(s => String(s.id) === String(studentId));
  if (!student) throw new Error("Không tìm thấy sinh viên");
  await DormAPI.update("students", studentId, { ...student, roomId: data.roomId, paymentAmount: data.paymentAmount, paymentMonth: data.paymentMonth, paymentStatus: data.paymentStatus, paidAt: data.paymentStatus==="paid" ? (data.paidAt||new Date().toISOString().split("T")[0]) : "", paymentNote: data.paymentNote });
}
async function clearPaymentOnStudent(studentId) {
  const student = adminState.students.find(s => String(s.id) === String(studentId));
  if (!student) throw new Error("Không tìm thấy sinh viên");
  await DormAPI.update("students", studentId, { ...student, paymentAmount: 0, paymentMonth: "", paymentStatus: "unpaid", paidAt: "", paymentNote: "" });
}

/* ══ JQUERY HELP ══ */
$(document).ready(function() {
  const helpContent = `<ul class="mb-0 ps-3" style="padding-left:1rem"><li><strong>Phòng:</strong> Thêm, sửa, xóa thông tin phòng.</li><li><strong>Sinh viên:</strong> Cập nhật danh sách ở.</li><li><strong>Thanh toán:</strong> Quản lý đóng tiền phòng.</li></ul><hr><div class="small text-muted">💡 Mẹo: Có thể dùng <strong>URL ảnh</strong> thay vì tải file để tránh lỗi 413.</div>`;
  $('#helpContent').html(helpContent);
  $('#quickHelpBtn').on('click', function() { $('#quickHelpPanel').slideDown(300); $(this).hide(); });
  $('#closeHelpBtn').click(function() { $('#quickHelpPanel').fadeOut(200, function() { $('#quickHelpBtn').fadeIn(200); }); });
});

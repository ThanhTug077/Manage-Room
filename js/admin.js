// State cua trang admin: luu du lieu, tab hien tai, ban ghi dang sua/xoa va phan trang.
const adminState = {
  rooms: [],
  students: [],
  payments: [],
  currentResource: "rooms",
  editingId: null,
  deleteTarget: null,
  page: 1,
  pageSize: 6
};

// Tai khoan demo client-side. Khi lam san pham that can thay bang xac thuc tren server.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
const ADMIN_AUTH_KEY = "dormManagerAdminLoggedIn";
const MAX_ROOM_IMAGE_SIZE = 3 * 1024 * 1024;
/** Uoc luong JSON phong sau khi bo trung image/images[0] — canh bao truoc khi sat gioi han MockAPI */
const ROOM_PAYLOAD_WARN_CHARS = 65000;
/** Neu sau nen van vuot, khong goi API (MockAPI thuong tra 413) */
const ROOM_PAYLOAD_MAX_CHARS = 95000;
const ROOM_CAPACITY_OPTIONS = [1, 2, 4, 8];

const ROOM_IMAGE_COMPRESSION_TIERS = [
  { maxDim: 1280, quality: 0.72 },
  { maxDim: 960, quality: 0.62 },
  { maxDim: 640, quality: 0.52 },
  { maxDim: 480, quality: 0.45 },
  { maxDim: 400, quality: 0.38 },
  { maxDim: 320, quality: 0.32 }
];

// Tao ten loai phong tu suc chua, vi du 4 -> "4 nguoi".
function formatRoomType(capacity) {
  return capacity ? `${capacity} người` : "";
}

// Cau hinh form dong cho tung tab quan tri: phong, sinh vien va thanh toan.
const resourceConfig = {
  rooms: {
    label: "phòng",
    title: "Quản lý phòng",
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
    label: "sinh viên",
    title: "Quản lý sinh viên",
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
    label: "thanh toán",
    title: "Quản lý thanh toán",
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

// Khoi dong trang admin: bind login/logout va hien dashboard neu da dang nhap trong session.
document.addEventListener("DOMContentLoaded", () => {
  bindAuthEvents();
  if (isAdminLoggedIn()) {
    showAdminContent();
  } else {
    showLoginContent();
  }
});

// Gan su kien dang nhap va dang xuat.
function bindAuthEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}

// Session chi ton tai trong tab hien tai, phu hop cho demo client-side.
function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

// Kiem tra thong tin dang nhap demo va hien loi truc tiep tren input neu sai.
function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const usernameValid = usernameInput.value.trim() === ADMIN_USERNAME;
  const passwordValid = passwordInput.value === ADMIN_PASSWORD;

  usernameInput.classList.toggle("is-valid", usernameValid);
  usernameInput.classList.toggle("is-invalid", !usernameValid);
  passwordInput.classList.toggle("is-valid", passwordValid);
  passwordInput.classList.toggle("is-invalid", !passwordValid);

  if (!usernameValid || !passwordValid) {
    form.classList.add("was-validated");
    showToast("Sai tài khoản hoặc mật khẩu", "error");
    return;
  }

  sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
  form.reset();
  form.classList.remove("was-validated");
  usernameInput.classList.remove("is-valid", "is-invalid");
  passwordInput.classList.remove("is-valid", "is-invalid");
  showAdminContent();
}

// Dang xuat: xoa session, reset du lieu trong state va quay ve man hinh login.
function handleLogout() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  adminState.rooms = [];
  adminState.students = [];
  adminState.payments = [];
  adminState.currentResource = "rooms";
  adminState.page = 1;
  document.getElementById("adminTable").innerHTML = `<tbody><tr><td class="loading-state">Đang tải dữ liệu...</td></tr></tbody>`;
  showLoginContent();
  showToast("Đã đăng xuất", "success");
}

// Hien khu vuc admin, bind cac su kien CRUD va tai du lieu tu API.
function showAdminContent() {
  document.getElementById("loginSection").classList.add("d-none");
  document.getElementById("adminContent").classList.remove("d-none");
  document.getElementById("logoutBtn").classList.remove("d-none");
  bindAdminEvents();
  loadAdminData();
}

// Hien form login va an dashboard admin.
function showLoginContent() {
  document.getElementById("loginSection").classList.remove("d-none");
  document.getElementById("adminContent").classList.add("d-none");
  document.getElementById("logoutBtn").classList.add("d-none");
}

// Bind su kien cho tab, nut them/sua/xoa, tim kiem va phan trang; chi bind mot lan.
function bindAdminEvents() {
  if (adminState.eventsBound) return;
  adminState.eventsBound = true;
  document.querySelectorAll("[data-resource-tab]").forEach((button) => {
    button.addEventListener("click", () => switchResource(button.dataset.resourceTab));
  });

  document.getElementById("addRecordBtn").addEventListener("click", () => openFormModal());
  document.getElementById("recordForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);
  document.getElementById("prevPageBtn").addEventListener("click", () => changePage(-1));
  document.getElementById("nextPageBtn").addEventListener("click", () => changePage(1));
  document.getElementById("adminSearch").addEventListener("input", () => {
    adminState.page = 1;
    renderAdminTable();
  });
}

// Tai rooms va students; payments duoc suy ra tu cac field thanh toan trong tung student.
async function loadAdminData() {
  try {
    const [rooms, students] = await Promise.all([
      DormAPI.list("rooms"),
      loadStudentsWithJquery()
    ]);

    adminState.rooms = rooms;
    adminState.students = students;
    adminState.payments = students.map(studentToPayment);
    renderDashboard();
    renderAdminTable();
  } catch (error) {
    showToast("Không thể tải dữ liệu. Hãy kiểm tra API_BASE_URL trong js/api.js.", "error");
    renderAdminTable();
  }
}

// Vi du dung jQuery Ajax de doc students theo yeu cau cua project.
function loadStudentsWithJquery() {
  return $.ajax({
    url: buildUrl("students"),
    method: "GET",
    dataType: "json"
  });
}

// Doi tab quan tri va render lai bang theo resource moi.
function switchResource(resource) {
  adminState.currentResource = resource;
  adminState.page = 1;
  document.querySelectorAll("[data-resource-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.resourceTab === resource);
  });
  renderAdminTable();
}

// Tinh cac so lieu tong quan tren dashboard.
function renderDashboard() {
  const paidTotal = adminState.payments
    .filter((payment) => payment.paymentStatus === "paid")
    .reduce((sum, payment) => sum + Number(payment.paymentAmount || 0), 0);
  const availableRooms = adminState.rooms.filter((room) => getRoomStatus(room) === "available").length;
  const activeStudents = adminState.students.filter((student) => student.status === "active").length;

  document.getElementById("totalRooms").textContent = adminState.rooms.length;
  document.getElementById("availableRooms").textContent = availableRooms;
  document.getElementById("activeStudents").textContent = activeStudents;
  document.getElementById("paidTotal").textContent = formatCurrency(paidTotal);
}

// Loc du lieu bang admin bang cach tim tren JSON cua moi ban ghi.
function getFilteredAdminItems() {
  const keyword = normalizeText(document.getElementById("adminSearch").value);
  const items = adminState[adminState.currentResource] || [];
  if (!keyword) return items;
  return items.filter((item) => normalizeText(JSON.stringify(item)).includes(keyword));
}

// Render bang hien tai, gom title, nut them, thong tin trang va cac nut thao tac.
function renderAdminTable() {
  const resource = adminState.currentResource;
  const config = resourceConfig[resource];
  const items = getFilteredAdminItems();
  const start = (adminState.page - 1) * adminState.pageSize;
  const pageItems = items.slice(start, start + adminState.pageSize);
  const totalPages = Math.max(Math.ceil(items.length / adminState.pageSize), 1);

  document.getElementById("tableTitle").textContent = config.title;
  document.getElementById("addRecordBtn").textContent = `Thêm ${config.label}`;
  document.getElementById("pageInfo").textContent = `Trang ${adminState.page}/${totalPages}`;
  document.getElementById("prevPageBtn").disabled = adminState.page <= 1;
  document.getElementById("nextPageBtn").disabled = adminState.page >= totalPages;

  const table = document.getElementById("adminTable");
  if (!pageItems.length) {
    table.innerHTML = `<tbody><tr><td class="empty-state">Không có dữ liệu ${config.label}.</td></tr></tbody>`;
    return;
  }

  table.innerHTML = renderTableMarkup(resource, pageItems);
  table.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleRowAction(button.dataset.action, button.dataset.id));
  });
}

// Tao HTML bang theo tung resource; du lieu dong duoc escape truoc khi chen vao DOM.
function renderTableMarkup(resource, items) {
  if (resource === "rooms") {
    return `<thead><tr><th>Phòng</th><th>Tòa</th><th>Tầng</th><th>Loại</th><th>Chỗ ở</th><th>Giá</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
      <tbody>${items.map((room) => rowActions(room, `
        <td><strong>${escapeHtml(room.name || "")}</strong></td>
        <td>${escapeHtml(room.building || "")}</td>
        <td>${escapeHtml(room.floor || "")}</td>
        <td>${escapeHtml(room.type || "")}</td>
        <td>${room.occupied || 0}/${room.capacity || 0}</td>
        <td>${formatCurrency(room.price)}</td>
        <td><span class="badge ${getStatusBadgeClass(getRoomStatus(room))}">${getStatusLabel(getRoomStatus(room))}</span></td>
      `)).join("")}</tbody>`;
  }

  if (resource === "students") {
    return `<thead><tr><th>Sinh viên</th><th>Mã SV</th><th>Liên hệ</th><th>Phòng</th><th>Ngày vào</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
      <tbody>${items.map((student) => rowActions(student, `
        <td><strong>${escapeHtml(student.fullName || "")}</strong></td>
        <td>${escapeHtml(student.studentCode || "")}</td>
        <td>${escapeHtml(student.phone || "")}<br><span class="text-muted">${escapeHtml(student.email || "")}</span></td>
        <td>${escapeHtml(getRoomName(student.roomId))}</td>
        <td>${formatDate(student.checkInDate)}</td>
        <td><span class="badge ${getStatusBadgeClass(student.status)}">${getStatusLabel(student.status)}</span></td>
      `)).join("")}</tbody>`;
  }

  return `<thead><tr><th>Sinh viên</th><th>Phòng</th><th>Tháng</th><th>Số tiền</th><th>Nội dung CK</th><th>Ngày trả</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
    <tbody>${items.map((payment) => rowActions(payment, `
      <td>${escapeHtml(getStudentName(payment.studentId))}</td>
      <td>${escapeHtml(getRoomName(payment.roomId))}</td>
      <td>${escapeHtml(payment.paymentMonth || "")}</td>
      <td>${formatCurrency(payment.paymentAmount)}</td>
      <td>${escapeHtml(payment.paymentNote || "")}</td>
      <td>${formatDate(payment.paidAt)}</td>
      <td><span class="badge ${getStatusBadgeClass(payment.paymentStatus)}">${getStatusLabel(payment.paymentStatus)}</span></td>
    `)).join("")}</tbody>`;
}

// Tao cum nut thao tac cho moi dong bang.
function rowActions(item, cells) {
  return `<tr>${cells}<td><div class="action-buttons">
    <button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${escapeAttribute(item.id)}" type="button">Xem</button>
    <button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${escapeAttribute(item.id)}" type="button">Sửa</button>
    <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${escapeAttribute(item.id)}" type="button">Xóa</button>
  </div></td></tr>`;
}

// Dieu phoi hanh dong tren dong bang sang modal phu hop.
function handleRowAction(action, id) {
  const item = findCurrentItem(id);
  if (!item) return;
  if (action === "view") openDetailModal(item);
  if (action === "edit") openFormModal(item);
  if (action === "delete") openDeleteModal(item);
}

// Modal xem chi tiet hien toan bo field cua ban ghi.
function openDetailModal(item) {
  const config = resourceConfig[adminState.currentResource];
  document.getElementById("detailModalTitle").textContent = `Chi tiết ${config.label}`;
  document.getElementById("detailModalBody").innerHTML = Object.entries(item)
    .map(([key, value]) => `<div class="row border-bottom py-2"><strong class="col-sm-4">${escapeHtml(key)}</strong><span class="col-sm-8">${formatDetailValue(value)}</span></div>`)
    .join("");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("detailModal")).show();
}

// Mo form them/sua va render cac field theo resourceConfig.
function openFormModal(item = null) {
  const config = resourceConfig[adminState.currentResource];
  const form = document.getElementById("recordForm");
  adminState.editingId = item ? item.id : null;
  document.getElementById("recordModalTitle").textContent = item ? `Sửa ${config.label}` : `Thêm ${config.label}`;
  document.getElementById("formFields").innerHTML = config.fields.map((field) => renderField(field, item)).join("");
  form.classList.remove("was-validated");
  bindImagePicker();
  bindRoomTypeSuggestion(form);
  bindRealtimeValidation(form);
  bootstrap.Modal.getOrCreateInstance(document.getElementById("recordModal")).show();
}

// Render mot field cua form dong, gom cac kieu dac biet nhu room, student va image.
function renderField(field, item) {
  const value = item && item[field.name] !== undefined && item[field.name] !== null ? item[field.name] : "";
  const required = field.required ? "required" : "";
  const help = `<div class="invalid-feedback">Vui lòng nhập ${field.label.toLowerCase()} hợp lệ.</div>`;
  const escapedValue = escapeAttribute(Array.isArray(value) ? amenitiesToString(value) : value);
  const escapedLabel = escapeHtml(field.label);

  if (field.type === "image") {
    return renderImageField(item || {});
  }

  if (field.type === "textarea") {
    return `<div class="col-12"><label class="form-label">${escapedLabel}</label><textarea class="form-control" name="${escapeAttribute(field.name)}" ${required}>${escapeHtml(value)}</textarea>${help}</div>`;
  }

  if (field.type === "select") {
    return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}>
      <option value="">Chọn...</option>${field.options.map((option) => `<option value="${escapeAttribute(option)}" ${String(value) === String(option) ? "selected" : ""}>${escapeHtml(getStatusLabel(option))}</option>`).join("")}
    </select>${help}</div>`;
  }

  if (field.type === "room") {
    return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}>
      <option value="">Chọn phòng...</option>${adminState.rooms.map((room) => `<option value="${escapeAttribute(room.id)}" ${String(value) === String(room.id) ? "selected" : ""}>${escapeHtml(room.name || room.id)}</option>`).join("")}
    </select>${help}</div>`;
  }

  if (field.type === "student") {
    if (adminState.currentResource === "payments" && adminState.editingId) {
      return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label>
        <input name="${escapeAttribute(field.name)}" type="hidden" value="${escapedValue}">
        <input class="form-control" type="text" value="${escapeAttribute(getStudentName(value))}" disabled>
        <div class="form-text">Không đổi sinh viên khi sửa thanh toán hiện có.</div>
      </div>`;
    }

    return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><select class="form-select" name="${escapeAttribute(field.name)}" ${required}>
      <option value="">Chọn sinh viên...</option>${adminState.students.map((student) => `<option value="${escapeAttribute(student.id)}" ${String(value) === String(student.id) ? "selected" : ""}>${escapeHtml(student.fullName || student.id)}</option>`).join("")}
    </select>${help}</div>`;
  }

  const placeholder = field.name === "type" ? `placeholder="${escapeAttribute(formatRoomType(item?.capacity))}"` : "";
  return `<div class="col-md-6"><label class="form-label">${escapedLabel}</label><input class="form-control" name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type)}" value="${escapedValue}" ${required} ${field.min !== undefined ? `min="${escapeAttribute(field.min)}"` : ""} ${placeholder}>${help}</div>`;
}

// Field anh phong: nhieu anh (file + URL), preview thumbnail, anh base64 se duoc nen truoc khi luu.
function renderImageField(item) {
  const images = getRoomImages(item).filter((image) => image !== PLACEHOLDER_ROOM_IMAGE);
  const imageJson = JSON.stringify(images);
  const hasImage = images.length > 0;
  const maxMb = MAX_ROOM_IMAGE_SIZE / (1024 * 1024);

  return `<div class="col-12">
    <label class="form-label">Ảnh phòng</label>
    <input id="roomImageValue" name="image" type="hidden" value="${escapeAttribute(images[0] || "")}">
    <input id="roomImagesValue" name="images" type="hidden" value="${escapeAttribute(imageJson)}">
    <input id="roomImageFile" class="d-none" type="file" accept="image/*" multiple>
    <button id="roomImagePicker" class="image-picker" type="button">
      <span>${hasImage ? "Bấm để thêm ảnh từ máy" : "Bấm để chọn ảnh từ máy"}</span>
    </button>
    <div class="room-image-url-row mt-3">
      <input id="roomImageUrlInput" class="form-control" type="url" inputmode="url" autocomplete="off" placeholder="https://... (ảnh từ liên kết)">
      <button id="roomImageUrlAddBtn" class="btn btn-outline-secondary flex-shrink-0" type="button">Thêm URL</button>
    </div>
    <div id="roomImagePreviewList" class="image-preview-list"></div>
    <div id="roomImageFeedback" class="form-text">File tối đa ${maxMb}MB/ảnh. Ảnh từ máy được nén nhiều lần để tránh lỗi 413; ưu tiên URL ảnh (https) nếu vẫn không lưu được.</div>
  </div>`;
}

function isLikelyImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|heif)$/.test(name);
}

function tryParseHttpRoomImageUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.href;
  } catch (error) {
    return null;
  }
}

function compressRoomImageDataUrl(dataUrl, tier = {}) {
  const maxDim = tier.maxDim ?? 1280;
  const quality = tier.quality ?? 0.72;
  return new Promise((resolve) => {
    if (!String(dataUrl).startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }
    if (/^data:image\/gif/i.test(dataUrl)) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || 1;
        let h = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        resolve(jpeg.length && jpeg.length < String(dataUrl).length ? jpeg : dataUrl);
      } catch (error) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Bo field image khi da co images — giam nua chuoi trung images[0] trong JSON. */
function applyRoomPayloadDedupe(data) {
  if (Array.isArray(data.images) && data.images.length > 0) {
    delete data.image;
  }
}

function getRoomPayloadJsonSize(data) {
  const payload = { ...data };
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    delete payload.image;
  }
  return JSON.stringify(payload).length;
}

async function compressAllRoomDataUrls(data, tier) {
  const list = Array.isArray(data.images) ? data.images : [];
  if (list.length > 0) {
    const out = [];
    for (const item of list) {
      out.push(
        String(item).startsWith("data:image/")
          ? await compressRoomImageDataUrl(item, tier)
          : item
      );
    }
    data.images = out;
    data.image = out[0] || "";
    return;
  }
  if (data.image && String(data.image).startsWith("data:image/")) {
    data.image = await compressRoomImageDataUrl(data.image, tier);
  }
}

async function normalizeRoomImagesForSave(data) {
  for (let i = 0; i < ROOM_IMAGE_COMPRESSION_TIERS.length; i += 1) {
    await compressAllRoomDataUrls(data, ROOM_IMAGE_COMPRESSION_TIERS[i]);
    applyRoomPayloadDedupe(data);
    if (getRoomPayloadJsonSize(data) <= ROOM_PAYLOAD_MAX_CHARS) {
      return;
    }
  }
  applyRoomPayloadDedupe(data);
  if (getRoomPayloadJsonSize(data) > ROOM_PAYLOAD_MAX_CHARS) {
    throw new Error(
      "Dữ liệu phòng vẫn quá lớn để gửi API (giới hạn MockAPI). Hãy dùng ảnh URL (https), bớt số ảnh, rút mô tả, hoặc đổi ảnh GIF nặng sang URL."
    );
  }
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
  const maxMb = MAX_ROOM_IMAGE_SIZE / (1024 * 1024);

  function syncImages() {
    hiddenInput.value = images[0] || "";
    imagesInput.value = JSON.stringify(images);
    picker.querySelector("span").textContent = images.length ? "Bấm để thêm ảnh từ máy" : "Bấm để chọn ảnh từ máy";
    picker.classList.toggle("is-valid", images.length > 0);
    renderRoomImagePreviews(previewList, images);
  }

  picker.addEventListener("click", () => fileInput.click());

  urlAddBtn.addEventListener("click", () => {
    const href = tryParseHttpRoomImageUrl(urlInput.value);
    if (!href || !isValidImageUrl(href)) {
      urlInput.classList.add("is-invalid");
      feedback.textContent = "Nhập URL ảnh hợp lệ (http hoặc https).";
      feedback.classList.add("text-danger");
      feedback.classList.remove("text-success");
      showToast("URL ảnh không hợp lệ", "error");
      return;
    }
    if (images.includes(href)) {
      showToast("URL này đã có trong danh sách ảnh.", "warning");
      return;
    }
    urlInput.classList.remove("is-invalid");
    images = [...images, href];
    syncImages();
    urlInput.value = "";
    feedback.textContent = "Đã thêm ảnh từ URL.";
    feedback.classList.remove("text-danger");
    feedback.classList.add("text-success");
    picker.classList.remove("is-invalid");
    picker.classList.add("is-valid");
    updateRealtimeValidation(document.getElementById("recordForm"));
  });

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      urlAddBtn.click();
    }
  });

  urlInput.addEventListener("input", () => urlInput.classList.remove("is-invalid"));

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    const invalidFile = files.find((file) => !isLikelyImageFile(file));
    if (invalidFile) {
      showImagePickerError(fileInput, picker, feedback, "Một file đã chọn không được nhận dạng là ảnh.", "Vui lòng chọn đúng file ảnh");
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_ROOM_IMAGE_SIZE);
    if (oversizedFile) {
      showImagePickerError(
        fileInput,
        picker,
        feedback,
        `Ảnh vượt quá ${maxMb}MB. Hãy chọn file nhỏ hơn, dùng URL, hoặc nén ảnh trước.`,
        `Ảnh vượt quá ${maxMb}MB`
      );
      return;
    }

    Promise.all(
      files.map((file) =>
        readImageFileAsDataUrl(file).then((dataUrl) => compressRoomImageDataUrl(dataUrl, ROOM_IMAGE_COMPRESSION_TIERS[0]))
      )
    )
      .then((newImages) => {
        images = [...images, ...newImages.filter(isValidImageUrl)];
        syncImages();
        feedback.textContent = `${newImages.length} ảnh đã thêm (đã nén nếu là ảnh từ máy).`;
        feedback.classList.remove("text-danger");
        feedback.classList.add("text-success");
        picker.classList.remove("is-invalid");
        picker.classList.add("is-valid");
        fileInput.value = "";
        updateRealtimeValidation(document.getElementById("recordForm"));
      })
      .catch(() => {
        showImagePickerError(fileInput, picker, feedback, "Không thể đọc file ảnh đã chọn.", "Không thể đọc ảnh");
      });
  });

  previewList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-image-index]");
    if (!removeButton) return;
    images = images.filter((_, index) => index !== Number(removeButton.dataset.removeImageIndex));
    syncImages();
    feedback.textContent = images.length ? `${images.length} ảnh đang được chọn.` : "Chưa chọn ảnh phòng.";
    feedback.classList.remove("text-danger");
    updateRealtimeValidation(document.getElementById("recordForm"));
  });

  syncImages();
}

function parseRoomImagesValue(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((image) => image && isValidImageUrl(image)) : [];
  } catch (error) {
    return [];
  }
}

function renderRoomImagePreviews(container, images) {
  if (!images.length) {
    container.innerHTML = `<div class="image-empty-preview">Chưa có ảnh phòng.</div>`;
    return;
  }

  container.innerHTML = images.map((image, index) => `
    <div class="image-preview-item">
      <img src="${escapeAttribute(image)}" alt="Ảnh phòng ${index + 1}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
      <button class="image-remove-btn" type="button" data-remove-image-index="${index}" aria-label="Xóa anh">x</button>
    </div>
  `).join("");
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function showImagePickerError(fileInput, picker, feedback, message, toastMessage) {
  fileInput.value = "";
  feedback.textContent = message;
  feedback.classList.add("text-danger");
  feedback.classList.remove("text-success");
  picker.classList.remove("is-valid");
  picker.classList.add("is-invalid");
  showToast(toastMessage, "error");
}

// Neu nguoi dung chon suc chua nhung chua nhap loai phong, goi y placeholder tu suc chua.
function bindRoomTypeSuggestion(form) {
  const capacityField = form.querySelector('[name="capacity"]');
  const typeField = form.querySelector('[name="type"]');
  if (!capacityField || !typeField) return;

  capacityField.addEventListener("change", () => {
    const value = capacityField.value;
    if (!typeField.value.trim()) {
      typeField.placeholder = formatRoomType(Number(value));
    }
  });
}

// Xu ly submit form admin: doc du lieu, validate, luu len API va reload bang.
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = readFormData(form);
  if (adminState.currentResource === "rooms" && !data.type && data.capacity) {
    data.type = formatRoomType(data.capacity);
  }
  if (adminState.currentResource === "rooms") {
    data.status = normalizeRoomStatus(data);
  }
  applyCustomValidation(form, data);
  updateRealtimeValidation(form, true);

  if (!form.checkValidity() || !validateRecord(data)) {
    form.classList.add("was-validated");
    showToast("Vui lòng kiểm tra lại dữ liệu trong form", "warning");
    return;
  }

  const submitButton = document.getElementById("saveRecordBtn");
  setButtonLoading(submitButton, true, "Đang lưu...");

  try {
    const resource = adminState.currentResource;
    if (resource === "payments") {
      await savePaymentOnStudent(data);
      showToast("Cập nhật thanh toán thành công");
      bootstrap.Modal.getInstance(document.getElementById("recordModal")).hide();
      await loadAdminData();
      return;
    }

    if (resource === "rooms") {
      await normalizeRoomImagesForSave(data);
      const payloadEstimate = getRoomPayloadJsonSize(data);
      if (payloadEstimate > ROOM_PAYLOAD_WARN_CHARS) {
        showToast(
          "Gói dữ liệu phòng vẫn khá lớn. Nếu lưu thất bại (413), hãy chỉ dùng URL ảnh (https) hoặc bớt ảnh/base64.",
          "warning"
        );
      }
    }

    const isCreatingRoom = resource === "rooms" && !adminState.editingId;

    if (adminState.editingId) {
      await DormAPI.update(resource, adminState.editingId, data);
      showToast("Cập nhật dữ liệu thành công");
    } else {
      await DormAPI.create(resource, data);
      showToast("Thêm dữ liệu thành công");
    }

    bootstrap.Modal.getInstance(document.getElementById("recordModal")).hide();
    await loadAdminData();
    if (isCreatingRoom) {
      showLatestRoomList();
    }
  } catch (error) {
    const detail = String(error.message || "");
    if (detail.includes("413")) {
      showToast(
        "Lưu thất bại: API báo dữ liệu quá lớn (413). Hãy dùng ảnh URL (https), bớt số ảnh hoặc rút mô tả; tránh nhiều ảnh base64 cùng lúc.",
        "error"
      );
    } else {
      showToast(`Lưu dữ liệu thất bại: ${detail}`, "error");
    }
  } finally {
    setButtonLoading(submitButton, false);
  }
}

// Chuyen FormData thanh object va ep cac truong so ve Number.
function readFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  ["floor", "capacity", "occupied", "price", "amount", "paymentAmount"].forEach((key) => {
    if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]);
  });
  if (data.amenities !== undefined) data.amenities = parseAmenities(data.amenities);
  if (data.images !== undefined) {
    data.images = parseRoomImagesValue(data.images);
    data.image = data.images[0] || "";
  }
  return data;
}

// Validate nghiep vu: anh hop le, so duong, suc chua thuoc danh sach cho phep va occupied khong vuot capacity.
function validateRecord(data) {
  const config = resourceConfig[adminState.currentResource];
  const requiredValid = config.fields.every((field) => {
    if (!field.required) return true;
    const value = data[field.name];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
  const imageValid = data.image === undefined || isValidImageUrl(data.image);
  const imagesValid = data.images === undefined || (Array.isArray(data.images) && data.images.every(isValidImageUrl));
  const moneyValid = data.price === undefined || isPositiveNumber(data.price);
  const amountValid = data.amount === undefined || isPositiveNumber(data.amount);
  const paymentAmountValid = data.paymentAmount === undefined || isPositiveNumber(data.paymentAmount);
  const floorValid = data.floor === undefined || Number(data.floor) > 0;
  const allowedCapacities = [1, 2, 4, 8];
  const capacityValid = data.capacity === undefined || allowedCapacities.includes(Number(data.capacity));
  const occupiedValid = data.occupied === undefined || Number(data.occupied) >= 0;
  const bedCountValid = data.capacity === undefined || data.occupied === undefined || Number(data.occupied) <= Number(data.capacity);
  return requiredValid && imageValid && imagesValid && moneyValid && amountValid && paymentAmountValid && floorValid && capacityValid && occupiedValid && bedCountValid;
}

// Tu dong chuan hoa trang thai phong tu occupied/capacity, rieng maintenance duoc giu nguyen.
function normalizeRoomStatus(room) {
  if (room.status === "maintenance") return "maintenance";
  return getAvailableBeds(room) <= 0 ? "full" : "available";
}

// Gan loi custom cho cac rule ma HTML5 validation khong tu dien ta du.
function applyCustomValidation(form, data) {
  form.querySelectorAll("[name]").forEach((field) => field.setCustomValidity(""));

  const occupiedInput = form.querySelector('[name="occupied"]');
  if (occupiedInput && data.capacity !== undefined && data.occupied !== undefined && Number(data.occupied) > Number(data.capacity)) {
    occupiedInput.setCustomValidity("Số người đã ở không được lớn hơn sức chứa.");
  }

  const imageInput = form.querySelector('[name="image"]');
  if (imageInput && data.image && !isValidImageUrl(data.image)) {
    imageInput.setCustomValidity("Ảnh không hợp lệ.");
  }
  const imagesInput = form.querySelector('[name="images"]');
  if (imagesInput && data.images && !data.images.every(isValidImageUrl)) {
    imagesInput.setCustomValidity("Danh sach anh khong hop le.");
  }
}

// Bat validate realtime cho form moi render.
function bindRealtimeValidation(form) {
  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.classList.remove("is-valid", "is-invalid");
    field.addEventListener("input", () => updateRealtimeValidation(form));
    field.addEventListener("change", () => updateRealtimeValidation(form));
  });
}

// Cap nhat class is-valid/is-invalid de hien feedback cho nguoi dung.
function updateRealtimeValidation(form, showUntouched = false) {
  const data = readFormData(form);
  applyCustomValidation(form, data);

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.type === "hidden" || field.type === "file") return;

    const hasValue = String(field.value || "").trim() !== "";
    const shouldShow = showUntouched || hasValue || field.classList.contains("is-invalid") || field.classList.contains("is-valid");
    if (!shouldShow) return;

    if (field.checkValidity()) {
      field.classList.remove("is-invalid");
      field.classList.add("is-valid");
    } else {
      field.classList.remove("is-valid");
      field.classList.add("is-invalid");
    }
  });
}

// Sau khi them phong moi, dua bang ve tab rooms va trang cuoi.
function showLatestRoomList() {
  const searchInput = document.getElementById("adminSearch");
  if (searchInput) searchInput.value = "";

  adminState.currentResource = "rooms";
  document.querySelectorAll("[data-resource-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.resourceTab === "rooms");
  });

  adminState.page = Math.max(Math.ceil(adminState.rooms.length / adminState.pageSize), 1);
  renderAdminTable();
}

// Mo modal xac nhan xoa va luu ban ghi muc tieu vao state.
function openDeleteModal(item) {
  adminState.deleteTarget = item;
  document.getElementById("deleteMessage").textContent = `Bạn chắc chắn muốn xóa bản ghi #${item.id}?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteModal")).show();
}

// Xoa ban ghi; payments khong co resource rieng nen chi reset field thanh toan tren student.
async function confirmDelete() {
  if (!adminState.deleteTarget) return;
  const button = document.getElementById("confirmDeleteBtn");
  setButtonLoading(button, true, "Đang xóa...");

  try {
    if (adminState.currentResource === "payments") {
      await clearPaymentOnStudent(adminState.deleteTarget.id);
      showToast("Đã xóa thông tin thanh toán");
      bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
      adminState.deleteTarget = null;
      await loadAdminData();
      return;
    }

    await DormAPI.remove(adminState.currentResource, adminState.deleteTarget.id);
    showToast("Xóa dữ liệu thành công");
    bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
    adminState.deleteTarget = null;
    await loadAdminData();
  } catch (error) {
    showToast("Xóa dữ liệu thất bại", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

// Doi trang bang admin theo offset -1 hoac +1.
function changePage(offset) {
  adminState.page += offset;
  renderAdminTable();
}

// Tim ban ghi theo tab hien tai.
function findCurrentItem(id) {
  return (adminState[adminState.currentResource] || []).find((item) => String(item.id) === String(id));
}

// Format gia tri trong modal chi tiet, dong thoi escape gia tri lay tu API.
function formatDetailValue(value) {
  if (Array.isArray(value)) return value.length ? escapeHtml(value.join(", ")) : "Chưa có";
  if (value === 0) return "0";
  return escapeHtml(value || "Chưa có");
}

// Doi roomId sang ten phong de bang de doc hon.
function getRoomName(id) {
  const room = adminState.rooms.find((item) => String(item.id) === String(id));
  return room ? room.name : id || "Chưa chọn";
}

// Doi studentId sang ten sinh vien trong bang thanh toan.
function getStudentName(id) {
  const student = adminState.students.find((item) => String(item.id) === String(id));
  return student ? student.fullName : id || "Chưa chọn";
}

// Tao dong payment tu student vi MockAPI dang luu payment trong resource students.
function studentToPayment(student) {
  return {
    id: student.id,
    studentId: student.id,
    roomId: student.roomId,
    paymentAmount: student.paymentAmount || student.amount || 0,
    paymentMonth: student.paymentMonth || student.month || "",
    paymentStatus: student.paymentStatus || "unpaid",
    paidAt: student.paidAt || "",
    paymentNote: student.paymentNote || student.note || ""
  };
}

// Cap nhat thanh toan bang cach update cac field payment tren student tuong ung.
async function savePaymentOnStudent(data) {
  const studentId = adminState.editingId || data.studentId;
  const student = adminState.students.find((item) => String(item.id) === String(studentId));
  if (!student) {
    throw new Error("Không tìm thấy sinh viên");
  }

  const paidAt = data.paymentStatus === "paid"
    ? (data.paidAt || new Date().toISOString().split("T")[0])
    : "";

  const payload = {
    ...student,
    roomId: data.roomId,
    paymentAmount: data.paymentAmount,
    paymentMonth: data.paymentMonth,
    paymentStatus: data.paymentStatus,
    paidAt,
    paymentNote: data.paymentNote
  };

  await DormAPI.update("students", studentId, payload);
}

// Xoa thong tin thanh toan bang cach dua cac field payment ve mac dinh tren student.
async function clearPaymentOnStudent(studentId) {
  const student = adminState.students.find((item) => String(item.id) === String(studentId));
  if (!student) {
    throw new Error("Không tìm thấy sinh viên");
  }

  await DormAPI.update("students", studentId, {
    ...student,
    paymentAmount: 0,
    paymentMonth: "",
    paymentStatus: "unpaid",
    paidAt: "",
    paymentNote: ""
  });
}

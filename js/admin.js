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

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
const ADMIN_AUTH_KEY = "dormManagerAdminLoggedIn";
const MAX_ROOM_IMAGE_SIZE = 1024 * 1024;
const ROOM_CAPACITY_OPTIONS = [1, 2, 4, 8];

function formatRoomType(capacity) {
  return capacity ? `${capacity} người` : "";
}

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

document.addEventListener("DOMContentLoaded", () => {
  bindAuthEvents();
  if (tryLoginFromUrl()) return;
  if (isAdminLoggedIn()) {
    showAdminContent();
  } else {
    showLoginContent();
  }
});

function tryLoginFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username") || "";
  const password = params.get("password") || "";
  if (!username || !password) return false;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
    showAdminContent();
    return true;
  }
  return false;
}

function bindAuthEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

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

function showAdminContent() {
  document.getElementById("loginSection").classList.add("d-none");
  document.getElementById("adminContent").classList.remove("d-none");
  document.getElementById("logoutBtn").classList.remove("d-none");
  bindAdminEvents();
  loadAdminData();
}

function showLoginContent() {
  document.getElementById("loginSection").classList.remove("d-none");
  document.getElementById("adminContent").classList.add("d-none");
  document.getElementById("logoutBtn").classList.add("d-none");
}

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

function loadStudentsWithJquery() {
  return $.ajax({
    url: buildUrl("students"),
    method: "GET",
    dataType: "json"
  });
}

function switchResource(resource) {
  adminState.currentResource = resource;
  adminState.page = 1;
  document.querySelectorAll("[data-resource-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.resourceTab === resource);
  });
  renderAdminTable();
}

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

function getFilteredAdminItems() {
  const keyword = normalizeText(document.getElementById("adminSearch").value);
  const items = adminState[adminState.currentResource] || [];
  if (!keyword) return items;
  return items.filter((item) => normalizeText(JSON.stringify(item)).includes(keyword));
}

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

function renderTableMarkup(resource, items) {
  if (resource === "rooms") {
    return `<thead><tr><th>Phòng</th><th>Tòa</th><th>Tầng</th><th>Loại</th><th>Chỗ ở</th><th>Giá</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
      <tbody>${items.map((room) => rowActions(room, `
        <td><strong>${room.name || ""}</strong></td>
        <td>${room.building || ""}</td>
        <td>${room.floor || ""}</td>
        <td>${room.type || ""}</td>
        <td>${room.occupied || 0}/${room.capacity || 0}</td>
        <td>${formatCurrency(room.price)}</td>
        <td><span class="badge ${getStatusBadgeClass(getRoomStatus(room))}">${getStatusLabel(getRoomStatus(room))}</span></td>
      `)).join("")}</tbody>`;
  }

  if (resource === "students") {
    return `<thead><tr><th>Sinh viên</th><th>Mã SV</th><th>Liên hệ</th><th>Phòng</th><th>Ngày vào</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
      <tbody>${items.map((student) => rowActions(student, `
        <td><strong>${student.fullName || ""}</strong></td>
        <td>${student.studentCode || ""}</td>
        <td>${student.phone || ""}<br><span class="text-muted">${student.email || ""}</span></td>
        <td>${getRoomName(student.roomId)}</td>
        <td>${formatDate(student.checkInDate)}</td>
        <td><span class="badge ${getStatusBadgeClass(student.status)}">${getStatusLabel(student.status)}</span></td>
      `)).join("")}</tbody>`;
  }

  return `<thead><tr><th>Sinh viên</th><th>Phòng</th><th>Tháng</th><th>Số tiền</th><th>Nội dung CK</th><th>Ngày trả</th><th>Trạng thái</th><th class="text-end">Thao tác</th></tr></thead>
    <tbody>${items.map((payment) => rowActions(payment, `
      <td>${getStudentName(payment.studentId)}</td>
      <td>${getRoomName(payment.roomId)}</td>
      <td>${payment.paymentMonth || ""}</td>
      <td>${formatCurrency(payment.paymentAmount)}</td>
      <td>${payment.paymentNote || ""}</td>
      <td>${formatDate(payment.paidAt)}</td>
      <td><span class="badge ${getStatusBadgeClass(payment.paymentStatus)}">${getStatusLabel(payment.paymentStatus)}</span></td>
    `)).join("")}</tbody>`;
}

function rowActions(item, cells) {
  return `<tr>${cells}<td><div class="action-buttons">
    <button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${item.id}" type="button">Xem</button>
    <button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${item.id}" type="button">Sửa</button>
    <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${item.id}" type="button">Xóa</button>
  </div></td></tr>`;
}

function handleRowAction(action, id) {
  const item = findCurrentItem(id);
  if (!item) return;
  if (action === "view") openDetailModal(item);
  if (action === "edit") openFormModal(item);
  if (action === "delete") openDeleteModal(item);
}

function openDetailModal(item) {
  const config = resourceConfig[adminState.currentResource];
  document.getElementById("detailModalTitle").textContent = `Chi tiết ${config.label}`;
  document.getElementById("detailModalBody").innerHTML = Object.entries(item)
    .map(([key, value]) => `<div class="row border-bottom py-2"><strong class="col-sm-4">${key}</strong><span class="col-sm-8">${formatDetailValue(value)}</span></div>`)
    .join("");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("detailModal")).show();
}

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

function renderField(field, item) {
  const value = item && item[field.name] !== undefined && item[field.name] !== null ? item[field.name] : "";
  const required = field.required ? "required" : "";
  const help = `<div class="invalid-feedback">Vui lòng nhập ${field.label.toLowerCase()} hợp lệ.</div>`;

  if (field.type === "image") {
    return renderImageField(value);
  }

  if (field.type === "textarea") {
    return `<div class="col-12"><label class="form-label">${field.label}</label><textarea class="form-control" name="${field.name}" ${required}>${value}</textarea>${help}</div>`;
  }

  if (field.type === "select") {
    return `<div class="col-md-6"><label class="form-label">${field.label}</label><select class="form-select" name="${field.name}" ${required}>
      <option value="">Chọn...</option>${field.options.map((option) => `<option value="${option}" ${String(value) === String(option) ? "selected" : ""}>${getStatusLabel(option)}</option>`).join("")}
    </select>${help}</div>`;
  }

  if (field.type === "room") {
    return `<div class="col-md-6"><label class="form-label">${field.label}</label><select class="form-select" name="${field.name}" ${required}>
      <option value="">Chọn phòng...</option>${adminState.rooms.map((room) => `<option value="${room.id}" ${String(value) === String(room.id) ? "selected" : ""}>${room.name || room.id}</option>`).join("")}
    </select>${help}</div>`;
  }

  if (field.type === "student") {
    return `<div class="col-md-6"><label class="form-label">${field.label}</label><select class="form-select" name="${field.name}" ${required}>
      <option value="">Chọn sinh viên...</option>${adminState.students.map((student) => `<option value="${student.id}" ${String(value) === String(student.id) ? "selected" : ""}>${student.fullName || student.id}</option>`).join("")}
    </select>${help}</div>`;
  }

  const placeholder = field.name === "type" ? `placeholder="${formatRoomType(item?.capacity)}"` : "";
  return `<div class="col-md-6"><label class="form-label">${field.label}</label><input class="form-control" name="${field.name}" type="${field.type}" value="${value}" ${required} ${field.min !== undefined ? `min="${field.min}"` : ""} ${placeholder}>${help}</div>`;
}

function renderImageField(value) {
  const preview = value || PLACEHOLDER_ROOM_IMAGE;
  const hasImage = Boolean(value);

  return `<div class="col-12">
    <label class="form-label">Ảnh phòng</label>
    <input id="roomImageValue" name="image" type="hidden" value="${value || ""}">
    <input id="roomImageFile" class="d-none" type="file" accept="image/*">
    <button id="roomImagePicker" class="image-picker" type="button">
      <img id="roomImagePreview" src="${preview}" alt="Ảnh phòng" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
      <span>${hasImage ? "Bấm để đổi ảnh" : "Bấm để chọn ảnh từ máy"}</span>
    </button>
    <div id="roomImageFeedback" class="form-text">Chỉ chọn file ảnh, dung lượng tối đa 1MB.</div>
  </div>`;
}

function bindImagePicker() {
  const picker = document.getElementById("roomImagePicker");
  const fileInput = document.getElementById("roomImageFile");
  const hiddenInput = document.getElementById("roomImageValue");
  const preview = document.getElementById("roomImagePreview");
  const feedback = document.getElementById("roomImageFeedback");

  if (!picker || !fileInput || !hiddenInput || !preview || !feedback) return;

  picker.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      fileInput.value = "";
      feedback.textContent = "File đã chọn không phải là ảnh.";
      feedback.classList.add("text-danger");
      picker.classList.remove("is-valid");
      picker.classList.add("is-invalid");
      showToast("Vui lòng chọn đúng file ảnh", "error");
      return;
    }

    if (file.size > MAX_ROOM_IMAGE_SIZE) {
      fileInput.value = "";
      feedback.textContent = "Ảnh vượt quá 1MB. Hãy chọn ảnh nhỏ hơn.";
      feedback.classList.add("text-danger");
      picker.classList.remove("is-valid");
      picker.classList.add("is-invalid");
      showToast("Ảnh vượt quá dung lượng 1MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      hiddenInput.value = reader.result;
      preview.src = reader.result;
      picker.querySelector("span").textContent = "Bấm để đổi ảnh";
      feedback.textContent = `${file.name} đã được chọn.`;
      feedback.classList.remove("text-danger");
      feedback.classList.add("text-success");
      picker.classList.remove("is-invalid");
      picker.classList.add("is-valid");
    });
    reader.readAsDataURL(file);
  });
}

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

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = readFormData(form);
  if (adminState.currentResource === "rooms" && !data.type && data.capacity) {
    data.type = formatRoomType(data.capacity);
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
    showToast(`Lưu dữ liệu thất bại: ${error.message}`, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function readFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  ["floor", "capacity", "occupied", "price", "amount", "paymentAmount"].forEach((key) => {
    if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]);
  });
  if (data.amenities !== undefined) data.amenities = parseAmenities(data.amenities);
  return data;
}

function validateRecord(data) {
  const config = resourceConfig[adminState.currentResource];
  const requiredValid = config.fields.every((field) => {
    if (!field.required) return true;
    const value = data[field.name];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
  const imageValid = data.image === undefined || isValidImageUrl(data.image);
  const moneyValid = data.price === undefined || isPositiveNumber(data.price);
  const amountValid = data.amount === undefined || isPositiveNumber(data.amount);
  const paymentAmountValid = data.paymentAmount === undefined || isPositiveNumber(data.paymentAmount);
  const floorValid = data.floor === undefined || Number(data.floor) > 0;
  const allowedCapacities = [1, 2, 4, 8];
  const capacityValid = data.capacity === undefined || allowedCapacities.includes(Number(data.capacity));
  const occupiedValid = data.occupied === undefined || Number(data.occupied) >= 0;
  const bedCountValid = data.capacity === undefined || data.occupied === undefined || Number(data.occupied) <= Number(data.capacity);
  return requiredValid && imageValid && moneyValid && amountValid && paymentAmountValid && floorValid && capacityValid && occupiedValid && bedCountValid;
}

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
}

function bindRealtimeValidation(form) {
  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.classList.remove("is-valid", "is-invalid");
    field.addEventListener("input", () => updateRealtimeValidation(form));
    field.addEventListener("change", () => updateRealtimeValidation(form));
  });
}

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

function changePage(offset) {
  adminState.page += offset;
  renderAdminTable();
}

function findCurrentItem(id) {
  return (adminState[adminState.currentResource] || []).find((item) => String(item.id) === String(id));
}

function formatDetailValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Chưa có";
  if (value === 0) return "0";
  return value || "Chưa có";
}

function getRoomName(id) {
  const room = adminState.rooms.find((item) => String(item.id) === String(id));
  return room ? room.name : id || "Chưa chọn";
}

function getStudentName(id) {
  const student = adminState.students.find((item) => String(item.id) === String(id));
  return student ? student.fullName : id || "Chưa chọn";
}

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

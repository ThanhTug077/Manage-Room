// State rieng cua trang public: danh sach phong, phong dang chon va cac bo loc hien tai.
const publicState = {
  rooms: [],
  selectedRoomId: null,
  filters: {
    keyword: "",
    building: "",
    floor: "",
    type: "",
    status: "",
    amenity: ""
  }
};

// Khi DOM san sang, gan su kien cho form/bo loc va tai du lieu phong tu API.
document.addEventListener("DOMContentLoaded", () => {
  bindPublicEvents();
  loadPublicRooms();
});

// Gan cac su kien nguoi dung: tim kiem, loc, reset bo loc va gui form dang ky.
function bindPublicEvents() {
  document.getElementById("searchInput").addEventListener("input", (event) => {
    publicState.filters.keyword = event.target.value;
    renderPublicRooms();
  });

  ["buildingFilter", "floorFilter", "typeFilter", "statusFilter", "amenityFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (event) => {
      const key = id.replace("Filter", "");
      publicState.filters[key] = event.target.value;
      renderPublicRooms();
    });
  });

  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    publicState.filters = { keyword: "", building: "", floor: "", type: "", status: "", amenity: "" };
    document.getElementById("publicFilters").reset();
    renderPublicRooms();
  });

  document.getElementById("registerForm").addEventListener("submit", handleRegisterSubmit);
}

// Tai danh sach phong cho trang public, sau do do du lieu vao bo loc va render UI.
async function loadPublicRooms() {
  const list = document.getElementById("roomList");
  const map = document.getElementById("roomMap");
  // YÊU CẦU 2: Xử lý trạng thái loading (Skeleton) khi chờ API
  list.innerHTML = Array(6).fill(0).map(() => `<div class="col-12 col-md-6 col-xl-4"><div class="room-card"><div class="skeleton-box" style="height: 200px"></div><div class="card-body"><div class="skeleton-box w-75 mb-3"></div><div class="skeleton-box w-50 mb-2"></div><div class="skeleton-box w-100"></div></div></div></div>`).join("");
  map.innerHTML = `<div style="display:flex; flex-wrap:wrap; gap:10px; width: 100%">` + Array(8).fill(0).map(() => `<div class="skeleton-box" style="height: 90px; width: 160px; border-radius: 20px;"></div>`).join("") + `</div>`;

  try {
    publicState.rooms = await DormAPI.list("rooms");
    populateFilterOptions(publicState.rooms);
    renderPublicRooms();
  } catch (error) {
    list.innerHTML = `<div class="col-12 empty-state">Không thể tải dữ liệu phòng. Hãy kiểm tra API_BASE_URL trong js/api.js.</div>`;
    map.innerHTML = `<div class="empty-state">Không thể tải sơ đồ phòng.</div>`;
    showToast("Tải danh sách phòng thất bại", "error");
  }
}

// Tao danh sach option cho cac bo loc dua tren du lieu phong thuc te tu API.
function populateFilterOptions(rooms) {
  fillSelect("buildingFilter", uniqueValues(rooms, "building"));
  fillSelect("floorFilter", uniqueValues(rooms, "floor"));
  fillSelect("typeFilter", uniqueValues(rooms, "type"));

  const amenities = [...new Set(rooms.flatMap((room) => parseAmenities(room.amenities)))].sort();
  fillSelect("amenityFilter", amenities);
}

// Lay cac gia tri khong trung lap cua mot field, sap xep than thien voi so phong/tang.
// YÊU CẦU 1: Tự định nghĩa ít nhất 3 hàm có tham số và giá trị trả về (Hàm 1)
function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter((value) => value !== undefined && value !== null && value !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b), "vi", { numeric: true }));
}

// Ghi lai option cua select va escape du lieu de tranh HTML tu API chen vao DOM.
function fillSelect(id, values) {
  const select = document.getElementById(id);
  const firstOption = select.options[0].outerHTML;
  select.innerHTML = firstOption + values.map((value) => {
    const escapedValue = escapeAttribute(value);
    return `<option value="${escapedValue}">${escapeHtml(value)}</option>`;
  }).join("");
}

// YÊU CẦU 1: Tự định nghĩa ít nhất 3 hàm có tham số và giá trị trả về (Hàm 2)
function getFilteredRooms() {
  const result = [];
  const keyword = normalizeText(publicState.filters.keyword);

  // YÊU CẦU 1: Sử dụng cấu trúc điều khiển (for, if)
  for (let i = 0; i < publicState.rooms.length; i++) {
    const room = publicState.rooms[i];
    const status = getRoomStatus(room);
    const amenities = parseAmenities(room.amenities);
    const searchable = normalizeText(`${room.id} ${room.name} ${room.building} ${room.floor} ${room.type} ${room.description}`);

    const isMatch = (!keyword || searchable.includes(keyword)) &&
      (!publicState.filters.building || room.building === publicState.filters.building) &&
      (!publicState.filters.floor || String(room.floor) === String(publicState.filters.floor)) &&
      (!publicState.filters.type || room.type === publicState.filters.type) &&
      (!publicState.filters.status || status === publicState.filters.status) &&
      (!publicState.filters.amenity || amenities.includes(publicState.filters.amenity));

    if (isMatch) {
      result.push(room);
    }
  }
  return result;
}

// Render lai ca so do phong va danh sach card moi khi du lieu/bo loc thay doi.
function renderPublicRooms() {
  const list = document.getElementById("roomList");
  const rooms = getFilteredRooms();
  document.getElementById("resultCount").textContent = `${rooms.length} phòng`;
  renderRoomMap(rooms);

  if (!rooms.length) {
    list.innerHTML = `<div class="col-12 empty-state">Không có phòng phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  list.innerHTML = rooms.map(renderRoomCard).join("");
  list.querySelectorAll("[data-room-id]").forEach((button) => {
    button.addEventListener("click", () => openRoomModal(button.dataset.roomId));
  });
}

// Render so do phong dang nut bam, moi o co mau va nhan theo trang thai phong.
function renderRoomMap(rooms) {
  const map = document.getElementById("roomMap");
  if (!rooms.length) {
    map.innerHTML = `<div class="empty-state">Không có phòng phù hợp để hiển thị sơ đồ.</div>`;
    return;
  }

  const sortedRooms = [...rooms].sort((a, b) => {
    const floorCompare = String(a.floor || "").localeCompare(String(b.floor || ""), "vi", { numeric: true });
    if (floorCompare !== 0) return floorCompare;
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "vi", { numeric: true });
  });

  map.innerHTML = sortedRooms.map((room) => {
    const status = getRoomStatus(room);
    const mapLabel = getRoomMapLabel(room, status);
    return `<button class="room-map-tile map-${escapeAttribute(status)}" type="button" data-room-map-id="${escapeAttribute(room.id)}">
      <strong>${escapeHtml(room.name || `Phòng ${room.id}`)}</strong>
      <span>Tầng ${escapeHtml(room.floor || "?")} · ${mapLabel}</span>
    </button>`;
  }).join("");

  map.querySelectorAll("[data-room-map-id]").forEach((button) => {
    button.addEventListener("click", () => openRoomModal(button.dataset.roomMapId));
  });
}

// YÊU CẦU 1: Tự định nghĩa ít nhất 3 hàm có tham số và giá trị trả về (Hàm 3)
function renderRoomCard(room) {
  const status = getRoomStatus(room);
  const amenities = parseAmenities(room.amenities).slice(0, 4);
  const roomName = room.name || "Phòng chưa đặt tên";

  return `<div class="col-12 col-md-6 col-xl-4">
    <article class="room-card">
      ${renderRoomCarousel(room, `room-card-carousel-${room.id}`, "room-card-carousel")}
      <div class="card-body p-3">
        <div class="d-flex justify-content-between gap-2 mb-2">
          <h2 class="h5 mb-0">${escapeHtml(roomName)}</h2>
          <span class="badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        </div>
        <div class="room-meta mb-2">${escapeHtml(room.building || "Chưa rõ tòa")} · Tầng ${escapeHtml(room.floor || "?")} · ${escapeHtml(room.type || "Chưa rõ loại")}</div>
        <p class="mb-3">${escapeHtml(room.description || "Phòng ký túc xá tiện nghi cho sinh viên.")}</p>
        <div class="amenity-list mb-3">${amenities.map((item) => `<span class="badge badge-soft-secondary">${escapeHtml(item)}</span>`).join("")}</div>
        <div class="mt-auto d-flex align-items-center justify-content-between gap-3">
          <div>
            <strong>${formatCurrency(room.price)}</strong>
            <div class="room-meta">${getAvailableBeds(room)} giường trống / ${room.capacity || 0}</div>
          </div>
          <button class="btn btn-success" type="button" data-room-id="${escapeAttribute(room.id)}">Chi tiết</button>
        </div>
      </div>
    </article>
  </div>`;
}

// Mo modal chi tiet phong, dong thoi quyet dinh co cho dang ky hay khong.
function openRoomModal(roomId) {
  const room = publicState.rooms.find((item) => String(item.id) === String(roomId));
  if (!room) return;

  publicState.selectedRoomId = room.id;
  const status = getRoomStatus(room);
  const canRegister = status === "available" && getAvailableBeds(room) > 0;
  document.getElementById("roomModalTitle").textContent = room.name || "Chi tiết phòng";
  document.getElementById("roomModalBody").innerHTML = `<div class="row g-3">
    <div class="col-md-5">
      ${renderRoomCarousel(room, `room-modal-carousel-${room.id}`, "room-modal-carousel")}
    </div>
    <div class="col-md-7">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        <span class="badge badge-soft-secondary">${escapeHtml(room.building || "Chưa rõ tòa")}</span>
        <span class="badge badge-soft-secondary">Tầng ${escapeHtml(room.floor || "?")}</span>
        <span class="badge badge-soft-secondary">${escapeHtml(room.type || "Chưa rõ loại")}</span>
      </div>
      <p>${escapeHtml(room.description || "Chưa có mô tả chi tiết.")}</p>
      <dl class="row mb-3">
        <dt class="col-sm-5">Giá phòng</dt><dd class="col-sm-7">${formatCurrency(room.price)}</dd>
        <dt class="col-sm-5">Sức chứa</dt><dd class="col-sm-7">${room.occupied || 0}/${room.capacity || 0} sinh viên</dd>
        <dt class="col-sm-5">Giường trống</dt><dd class="col-sm-7">${getAvailableBeds(room)}</dd>
        <dt class="col-sm-5">Tiện nghi</dt><dd class="col-sm-7">${escapeHtml(amenitiesToString(room.amenities) || "Chưa cập nhật")}</dd>
      </dl>
      <button id="openRegisterBtn" class="btn btn-success w-100 mt-2" type="button" ${canRegister ? "" : "disabled"}>Đăng ký phòng ngay</button>
    </div>
  </div>`;

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("roomModal"));
  modal.show();
  document.getElementById("openRegisterBtn").addEventListener("click", () => openRegisterModal(room.id));
}

function renderRoomCarousel(room, carouselId, className = "") {
  const images = getRoomImages(room);
  const safeId = escapeAttribute(String(carouselId).replace(/[^a-zA-Z0-9_-]/g, "-"));
  const controls = images.length > 1 ? `
    <button class="carousel-control-prev room-carousel-control" type="button" data-bs-target="#${safeId}" data-bs-slide="prev" aria-label="Anh truoc">
      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
    </button>
    <button class="carousel-control-next room-carousel-control" type="button" data-bs-target="#${safeId}" data-bs-slide="next" aria-label="Anh tiep theo">
      <span class="carousel-control-next-icon" aria-hidden="true"></span>
    </button>
  ` : "";

  return `<div id="${safeId}" class="carousel slide room-carousel ${className}" data-bs-ride="false">
    <div class="carousel-inner">
      ${images.map((image, index) => `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
          <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.name || "Phong ky tuc xa")} ${index + 1}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
        </div>
      `).join("")}
    </div>
    ${controls}
  </div>`;
}

// Mo form dang ky va gan roomId an de submit dung phong da chon.
function openRegisterModal(roomId) {
  const room = publicState.rooms.find((item) => String(item.id) === String(roomId));
  if (!room) return;

  publicState.selectedRoomId = room.id;
  document.getElementById("registerRoomId").value = room.id;
  document.getElementById("registerModalTitle").textContent = `Đăng ký ${room.name || `phòng ${room.id}`}`;
  const form = document.getElementById("registerForm");
  form.reset();
  form.classList.remove("was-validated");
  document.getElementById("registerRoomId").value = room.id;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("roomModal")).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("registerModal")).show();
}

// Xu ly dang ky phong: validate form, kiem tra lai phong tren API, tao student va cap nhat occupied/status.
async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    showToast("Vui lòng nhập đủ thông tin đăng ký", "warning");
    return;
  }

  const submitButton = document.getElementById("submitRegisterBtn");
  const data = Object.fromEntries(new FormData(form).entries());
  const room = publicState.rooms.find((item) => String(item.id) === String(data.roomId));

  if (!room) {
    showToast("Không tìm thấy phòng đăng ký", "error");
    return;
  }

  setButtonLoading(submitButton, true, "Đang gửi...");
  try {
    const latestRoom = await DormAPI.get("rooms", data.roomId);
    const latestStatus = getRoomStatus(latestRoom);
    if (latestStatus !== "available" || getAvailableBeds(latestRoom) <= 0) {
      showToast("Phòng này hiện không còn chỗ trống", "warning");
      await loadPublicRooms();
      return;
    }

    const price = Number(latestRoom.price || 0);
    const capacity = Number(latestRoom.capacity || 1);
    const paymentAmount = Math.ceil(price / Math.max(capacity, 1));
    const paymentMonth = getCurrentPaymentMonth();
    const paymentNote = buildPaymentNote(data.studentCode || "", latestRoom.name || latestRoom.id || "", paymentMonth);

    const payload = {
      ...data,
      status: "active",
      paymentAmount,
      paymentMonth,
      paymentStatus: "unpaid",
      paidAt: "",
      paymentNote
    };

    await DormAPI.create("students", payload);
    const nextOccupied = Number(latestRoom.occupied || 0) + 1;
    const nextStatus = nextOccupied >= Number(latestRoom.capacity || 0) ? "full" : "available";
    await DormAPI.update("rooms", latestRoom.id, {
      ...latestRoom,
      occupied: nextOccupied,
      status: latestRoom.status === "maintenance" ? "maintenance" : nextStatus
    });
    publicState.rooms = publicState.rooms.map((item) => (
      String(item.id) === String(latestRoom.id)
        ? { ...item, occupied: nextOccupied, status: latestRoom.status === "maintenance" ? "maintenance" : nextStatus }
        : item
    ));
    renderPublicRooms();
    bootstrap.Modal.getInstance(document.getElementById("registerModal")).hide();
    form.reset();
    form.classList.remove("was-validated");
    showToast("Đăng ký thành công! Hãy quét mã QR để thanh toán.", "success");
    openQRModal(paymentAmount, paymentNote, data.fullName, data.studentCode, latestRoom.name || latestRoom.id);
  } catch (error) {
    showToast(`Đăng ký thất bại: ${error.message}`, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

// Hien modal QR sau khi dang ky thanh cong, kem thong tin sinh vien va noi dung chuyen khoan.
function openQRModal(amount, note, fullName, studentCode, roomName) {
  const qrUrl = getTransferQRCodeUrl(amount, note);
  document.getElementById("qrImage").src = qrUrl;
  document.getElementById("qrModalTitle").textContent = "Mã QR thanh toán";
  document.getElementById("qrNote").innerHTML = `
    <div><strong>Họ tên:</strong> ${escapeHtml(fullName || "Chưa có")}</div>
    <div><strong>Mã SV:</strong> ${escapeHtml(studentCode || "Chưa có")}</div>
    <div><strong>Phòng:</strong> ${escapeHtml(roomName || "Chưa có")}</div>
    <div class="mt-2">${buildTransferInstruction(amount, note)}</div>
  `;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("qrModal")).show();
}

// Bao ve src anh phong: chi dung URL hop le, neu khong thi fallback sang anh mac dinh.
function getSafeRoomImage(value) {
  return value && isValidImageUrl(value) ? escapeAttribute(value) : PLACEHOLDER_ROOM_IMAGE;
}

// Tao nhan ngan cho o so do: con trong, da day hoac bao tri.
function getRoomMapLabel(room, status) {
  if (status === "maintenance") return "Bảo trì";
  if (status === "full") return "Đã đầy";
  return `${getAvailableBeds(room)} trống`;
}

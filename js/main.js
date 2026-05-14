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

document.addEventListener("DOMContentLoaded", () => {
  bindPublicEvents();
  loadPublicRooms();
});

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

async function loadPublicRooms() {
  const list = document.getElementById("roomList");
  const map = document.getElementById("roomMap");
  list.innerHTML = `<div class="col-12 loading-state"><div class="spinner-border text-success mb-3"></div><div>Đang tải danh sách phòng...</div></div>`;
  map.innerHTML = `<div class="loading-state">Đang tải sơ đồ phòng...</div>`;

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

function populateFilterOptions(rooms) {
  fillSelect("buildingFilter", uniqueValues(rooms, "building"));
  fillSelect("floorFilter", uniqueValues(rooms, "floor"));
  fillSelect("typeFilter", uniqueValues(rooms, "type"));

  const amenities = [...new Set(rooms.flatMap((room) => parseAmenities(room.amenities)))].sort();
  fillSelect("amenityFilter", amenities);
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter((value) => value !== undefined && value !== null && value !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b), "vi", { numeric: true }));
}

function fillSelect(id, values) {
  const select = document.getElementById(id);
  const firstOption = select.options[0].outerHTML;
  select.innerHTML = firstOption + values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function getFilteredRooms() {
  return publicState.rooms.filter((room) => {
    const status = getRoomStatus(room);
    const amenities = parseAmenities(room.amenities);
    const keyword = normalizeText(publicState.filters.keyword);
    const searchable = normalizeText(`${room.id} ${room.name} ${room.building} ${room.floor} ${room.type} ${room.description}`);

    return (
      (!keyword || searchable.includes(keyword)) &&
      (!publicState.filters.building || room.building === publicState.filters.building) &&
      (!publicState.filters.floor || String(room.floor) === String(publicState.filters.floor)) &&
      (!publicState.filters.type || room.type === publicState.filters.type) &&
      (!publicState.filters.status || status === publicState.filters.status) &&
      (!publicState.filters.amenity || amenities.includes(publicState.filters.amenity))
    );
  });
}

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
    return `<button class="room-map-tile map-${status}" type="button" data-room-map-id="${room.id}">
      <strong>${room.name || `Phòng ${room.id}`}</strong>
      <span>Tầng ${room.floor || "?"} · ${getAvailableBeds(room)} trống</span>
    </button>`;
  }).join("");

  map.querySelectorAll("[data-room-map-id]").forEach((button) => {
    button.addEventListener("click", () => openRoomModal(button.dataset.roomMapId));
  });
}

function renderRoomCard(room) {
  const status = getRoomStatus(room);
  const image = room.image || PLACEHOLDER_ROOM_IMAGE;
  const amenities = parseAmenities(room.amenities).slice(0, 4);

  return `<div class="col-12 col-md-6 col-xl-4">
    <article class="room-card">
      <img src="${image}" alt="${room.name || "Phòng ký túc xá"}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between gap-2 mb-2">
          <h2 class="h5 mb-0">${room.name || "Phòng chưa đặt tên"}</h2>
          <span class="badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        </div>
        <div class="room-meta mb-2">${room.building || "Chưa rõ tòa"} · Tầng ${room.floor || "?"} · ${room.type || "Chưa rõ loại"}</div>
        <p class="mb-3">${room.description || "Phòng ký túc xá nhiều tiện ích cho sinh viên."}</p>
        <div class="amenity-list mb-3">${amenities.map((item) => `<span class="badge text-bg-light">${item}</span>`).join("")}</div>
        <div class="mt-auto d-flex align-items-center justify-content-between gap-3">
          <div>
            <strong>${formatCurrency(room.price)}</strong>
            <div class="room-meta">${getAvailableBeds(room)} giường trống / ${room.capacity || 0}</div>
          </div>
          <button class="btn btn-success" type="button" data-room-id="${room.id}">Chi tiết</button>
        </div>
      </div>
    </article>
  </div>`;
}

function openRoomModal(roomId) {
  const room = publicState.rooms.find((item) => String(item.id) === String(roomId));
  if (!room) return;

  publicState.selectedRoomId = room.id;
  const status = getRoomStatus(room);
  const canRegister = status === "available" && getAvailableBeds(room) > 0;
  document.getElementById("roomModalTitle").textContent = room.name || "Chi tiết phòng";
  document.getElementById("roomModalBody").innerHTML = `<div class="row g-3">
    <div class="col-md-5">
      <img class="modal-img" src="${room.image || PLACEHOLDER_ROOM_IMAGE}" alt="${room.name || "Phòng ký túc xá"}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
    </div>
    <div class="col-md-7">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
        <span class="badge text-bg-light">${room.building || "Chưa rõ tòa"}</span>
        <span class="badge text-bg-light">Tầng ${room.floor || "?"}</span>
        <span class="badge text-bg-light">${room.type || "Chưa rõ loại"}</span>
      </div>
      <p>${room.description || "Chưa có mô tả chi tiết."}</p>
      <dl class="row mb-3">
        <dt class="col-sm-5">Giá phòng</dt><dd class="col-sm-7">${formatCurrency(room.price)}</dd>
        <dt class="col-sm-5">Sức chứa</dt><dd class="col-sm-7">${room.occupied || 0}/${room.capacity || 0} sinh viên</dd>
        <dt class="col-sm-5">Giường trống</dt><dd class="col-sm-7">${getAvailableBeds(room)}</dd>
        <dt class="col-sm-5">Tiện nghi</dt><dd class="col-sm-7">${amenitiesToString(room.amenities) || "Chưa cập nhật"}</dd>
      </dl>
      <button id="openRegisterBtn" class="btn btn-success" type="button" ${canRegister ? "" : "disabled"}>Đăng ký phòng</button>
    </div>
  </div>`;

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("roomModal"));
  modal.show();
  document.getElementById("openRegisterBtn").addEventListener("click", () => openRegisterModal(room.id));
}

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

  const price = Number(room.price || 0);
  const capacity = Number(room.capacity || 1);
  const paymentAmount = Math.ceil(price / Math.max(capacity, 1));
  const paymentMonth = getCurrentPaymentMonth();
  const paymentNote = buildPaymentNote(data.studentCode || "", room.name || room.id || "", paymentMonth);

  const payload = {
    ...data,
    status: "active",
    paymentAmount,
    paymentMonth,
    paymentStatus: "unpaid",
    paidAt: "",
    paymentNote
  };

  setButtonLoading(submitButton, true, "Đang gửi...");
  try {
    await DormAPI.create("students", payload);
    bootstrap.Modal.getInstance(document.getElementById("registerModal")).hide();
    form.reset();
    form.classList.remove("was-validated");
    showToast("Đăng ký thành công! Hãy quét mã QR để thanh toán.", "success");
    openQRModal(paymentAmount, paymentNote, data.fullName, data.studentCode, room.name || room.id);
  } catch (error) {
    showToast(`Đăng ký thất bại: ${error.message}`, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function openQRModal(amount, note, fullName, studentCode, roomName) {
  const qrUrl = getTransferQRCodeUrl(amount, note);
  document.getElementById("qrImage").src = qrUrl;
  document.getElementById("qrModalTitle").textContent = "Mã QR thanh toán";
  document.getElementById("qrNote").innerHTML = `
    <div><strong>Họ tên:</strong> ${fullName || "Chưa có"}</div>
    <div><strong>Mã SV:</strong> ${studentCode || "Chưa có"}</div>
    <div><strong>Phòng:</strong> ${roomName || "Chưa có"}</div>
    <div class="mt-2">${buildTransferInstruction(amount, note)}</div>
  `;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("qrModal")).show();
}
